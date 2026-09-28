import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { GlassEstimateDto } from './dto/glass-estimate.dto'

const SCRIPT = join(__dirname, 'glass-engine.py')

@Injectable()
export class GlassToolService {
  async estimate(input: GlassEstimateDto) {
    if (input.type === 'hollow' && (input.gapMm < 4 || !input.gas)) {
      throw new BadRequestException('中空层须为 4–30 mm，并选择填充气体')
    }
    if (input.type === 'vacuum' && (input.gapMm > 1 || !input.vacuumPressurePa || !input.pillarDiameterMm || !input.pillarPitchMm)) {
      throw new BadRequestException('真空层须为 0.1–1 mm，并填写压力和支撑柱参数')
    }
    if (input.type === 'vacuum' && input.pillarDiameterMm! >= input.pillarPitchMm!) {
      throw new BadRequestException('支撑柱直径必须小于间距')
    }
    if (input.coating !== 'none' && input.emissivity == null) {
      throw new BadRequestException('请填写镀膜表面发射率')
    }
    const normalized = {
      type: input.type,
      outerMm: input.outerMm,
      innerMm: input.innerMm,
      gapMm: input.gapMm,
      gas: input.type === 'hollow' ? input.gas : undefined,
      coating: input.coating,
      emissivity: input.coating === 'none' ? undefined : input.emissivity,
      vacuumPressurePa: input.type === 'vacuum' ? input.vacuumPressurePa : undefined,
      pillarDiameterMm: input.type === 'vacuum' ? input.pillarDiameterMm : undefined,
      pillarPitchMm: input.type === 'vacuum' ? input.pillarPitchMm : undefined,
      outsideH: input.outsideH ?? 25,
      insideH: input.insideH ?? 7.7,
    }
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
      model: input.type === 'vacuum' ? 'pyWinCalc 3.6.2 · 真空支撑柱模型' : 'pyWinCalc 3.6.2 · ISO 15099',
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
        pillarConductivity: input.type === 'vacuum' ? 20 : undefined,
        pillarGrid: input.type === 'vacuum' ? 'square' : undefined,
      },
      input: normalized,
    }
  }
}
