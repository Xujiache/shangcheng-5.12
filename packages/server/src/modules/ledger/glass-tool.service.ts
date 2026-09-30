import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { GlassEstimateDto, GlassGapDto } from './dto/glass-estimate.dto'
import { GlassWeightDto } from './dto/glass-weight.dto'

const SCRIPT = join(__dirname, 'glass-engine.py')
const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

function normalize(input: GlassEstimateDto) {
  const isLayered = input.panes !== undefined || input.gaps !== undefined
  const legacyFields = ['type', 'outerMm', 'innerMm', 'gapMm', 'gas', 'coating', 'emissivity', 'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm'] as const
  if (isLayered && legacyFields.some(field => input[field] !== undefined)) throw new BadRequestException('逐层参数与旧版双层参数不能混用')
  if (!isLayered && !['none', 'surface2', 'surface3'].includes(input.coating || '')) throw new BadRequestException('请选择镀膜位置')
  if (!isLayered && input.coating !== 'none' && !inRange(input.emissivity, 0.01, 0.84)) throw new BadRequestException('镀膜表面发射率须为 0.01–0.84')
  const panes = isLayered ? input.panes : [
    { thicknessMm: input.outerMm, frontEmissivity: 0.84, backEmissivity: input.coating === 'surface2' ? input.emissivity : 0.84 },
    { thicknessMm: input.innerMm, frontEmissivity: input.coating === 'surface3' ? input.emissivity : 0.84, backEmissivity: 0.84 },
  ]
  const gaps = isLayered ? input.gaps : [{
    type: input.type, thicknessMm: input.gapMm, gas: input.gas,
    vacuumPressurePa: input.vacuumPressurePa, pillarDiameterMm: input.pillarDiameterMm, pillarPitchMm: input.pillarPitchMm,
  }]
  if (!Array.isArray(panes) || panes.length < 2 || panes.length > 20 || !Array.isArray(gaps) || gaps.length !== panes.length - 1) {
    throw new BadRequestException('支持 2–20 片玻璃，腔体数必须比玻璃片数少 1')
  }
  const normalizedPanes = panes.map((pane, index) => {
    if (!pane || !inRange(pane.thicknessMm, 2, 25)) throw new BadRequestException(`第 ${index + 1} 片玻璃厚度须为 2–25 mm`)
    const frontEmissivity = pane.frontEmissivity === undefined ? 0.84 : pane.frontEmissivity
    const backEmissivity = pane.backEmissivity === undefined ? 0.84 : pane.backEmissivity
    if (!inRange(frontEmissivity, 0.01, 0.84) || !inRange(backEmissivity, 0.01, 0.84)) throw new BadRequestException(`第 ${index + 1} 片表面发射率须为 0.01–0.84`)
    return { thicknessMm: pane.thicknessMm, frontEmissivity, backEmissivity }
  })
  const normalizedGaps = gaps.map((gap, index): GlassGapDto => {
    if (!gap || !['hollow', 'vacuum'].includes(gap.type || '')) throw new BadRequestException(`请选择第 ${index + 1} 腔类型`)
    if (gap.type === 'hollow') {
      if (!inRange(gap.thicknessMm, 4, 30) || !['air', 'argon'].includes(gap.gas || '')) throw new BadRequestException(`第 ${index + 1} 中空腔须为 4–30 mm，并选择填充气体`)
      return { type: 'hollow', thicknessMm: gap.thicknessMm, gas: gap.gas }
    }
    if (!inRange(gap.thicknessMm, 0.1, 1) || !inRange(gap.vacuumPressurePa, 0.001, 100) || !inRange(gap.pillarDiameterMm, 0.1, 1) || !inRange(gap.pillarPitchMm, 10, 50)) {
      throw new BadRequestException(`第 ${index + 1} 真空腔参数不完整或超出范围`)
    }
    if (gap.pillarDiameterMm >= gap.pillarPitchMm) throw new BadRequestException('支撑柱直径必须小于间距')
    return { type: 'vacuum', thicknessMm: gap.thicknessMm, vacuumPressurePa: gap.vacuumPressurePa, pillarDiameterMm: gap.pillarDiameterMm, pillarPitchMm: gap.pillarPitchMm }
  })
  const outsideH = input.outsideH === undefined ? 25 : input.outsideH
  const insideH = input.insideH === undefined ? 7.7 : input.insideH
  if (!inRange(outsideH, 5, 50) || !inRange(insideH, 2, 20)) throw new BadRequestException('室外系数须为 5–50，室内系数须为 2–20 W/(m²·K)')
  return { panes: normalizedPanes, gaps: normalizedGaps, outsideH, insideH }
}

@Injectable()
export class GlassToolService {
  async estimate(input: GlassEstimateDto) {
    const normalized = normalize(input)
    const hasVacuum = normalized.gaps.some(gap => gap.type === 'vacuum')
    const result = await new Promise<{ uValue: number }>((resolve, reject) => {
      const child = spawn(process.env.LEDGER_GLASS_PYTHON || 'python3', [SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => child.kill('SIGKILL'), 15_000)
      child.stdin.on('error', () => { /* spawn error is handled by child.on('error') */ })
      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); if (stdout.length > 4096) child.kill('SIGKILL') })
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); if (stderr.length > 4096) child.kill('SIGKILL') })
      child.on('error', reject)
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code !== 0) return reject(new Error(stderr || 'glass engine failed'))
        try { resolve(JSON.parse(stdout)) } catch { reject(new Error('glass engine returned invalid output')) }
      })
      child.stdin.end(JSON.stringify(normalized))
    }).catch(() => { throw new ServiceUnavailableException('玻璃计算引擎暂不可用，请稍后重试') })
    if (!Number.isFinite(result.uValue) || result.uValue <= 0 || result.uValue > 20) {
      throw new ServiceUnavailableException('玻璃计算引擎返回无效结果')
    }
    return {
      uValue: result.uValue,
      unit: 'W/(m²·K)',
      region: 'center-of-glazing',
      model: hasVacuum ? 'pyWinCalc 3.6.2 · 真空支撑柱模型' : 'pyWinCalc 3.6.2 · ISO 15099',
      modelVersion: 'pywincalc-3.6.2',
      conditions: {
        outsideAirC: 0,
        insideAirC: 20,
        outsideH: normalized.outsideH,
        insideH: normalized.insideH,
        solarIrradiance: 0,
        tiltDegrees: 90,
        glassConductivity: 1,
        glassOpticalData: 'generic clear glass; U calculation uses thermal/IR data',
        pillarConductivity: hasVacuum ? 20 : undefined,
        pillarGrid: hasVacuum ? 'square' : undefined,
      },
      input: { ...input, ...normalized },
    }
  }

  weight(input: GlassWeightDto) {
    if (!inRange(input.heightMm, 0.001, 100000) || !inRange(input.widthMm, 0.001, 100000)) throw new BadRequestException('请填写有效的高度和宽度，单位 mm')
    if (!Array.isArray(input.thicknessesMm) || input.thicknessesMm.length < 1 || input.thicknessesMm.length > 20 || Array.from(input.thicknessesMm).some(value => !inRange(value, 0.1, 100))) throw new BadRequestException('支持 1–20 层玻璃，每层厚度须为 0.1–100 mm')
    const clean = (value: number) => Number(value.toPrecision(15))
    const areaM2 = clean(input.heightMm * input.widthMm / 1_000_000)
    const totalThicknessMm = clean(input.thicknessesMm.reduce((sum, value) => sum + value, 0))
    const densityCoefficient = 2.5
    return {
      weightKg: clean(areaM2 * totalThicknessMm * densityCoefficient),
      areaM2, totalThicknessMm, weightPerM2: clean(totalThicknessMm * densityCoefficient),
      layerWeightsKg: input.thicknessesMm.map(value => clean(areaM2 * value * densityCoefficient)),
      densityCoefficient, unit: 'kg', input,
    }
  }
}
