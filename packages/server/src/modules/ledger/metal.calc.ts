import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import type { MetalQuoteItemDto } from './dto/metal-quote.dto'
import { METAL_MATERIALS, normalizeMetalConfig } from './metal.config'
import specTable from './metal-spec-table.json'

type SpecRow = { shape: string; model: string; aliases: string[]; thicknessMm?: number; kgPerM: number }
const rows: SpecRow[] = specTable
const keys = new Set(['lengthMm', 'widthMm', 'thicknessMm', 'quantity', 'model', 'lengthM',
  'outerLengthMm', 'outerWidthMm', 'diameterMm', 'heightMm', 'webThicknessMm',
  'flangeThicknessMm', 'lipMm', 'areaMm2'])
const fail = (message: string): never => { throw new BizException(BizCode.INVALID_PARAMS, message) }
const rounded = (value: number, digits: number) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits

function number(raw: number | string | undefined, name: string, maximum = 1_000_000): number {
  if (raw === undefined || raw === '' || raw === null) return 0
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > maximum) fail(`${name}超出允许范围`)
  return value
}

function normalized(model: string): string {
  return model.normalize('NFKC').toUpperCase().replace(/\s+/g, '')
    .replace(/[×X]/g, '*').replace(/^∠/, '').replace(/^L(?=\d+\*)/, '')
}

export function calculateMetalQuoteItem(item: MetalQuoteItemDto, config: ReturnType<typeof normalizeMetalConfig>) {
  const material = METAL_MATERIALS.find(candidate => candidate.id === item.materialId)
  if (!material || material.category !== item.category)
    throw new BizException(BizCode.INVALID_PARAMS, '材质与类别不匹配')
  const spec = item.spec
  if (!spec || typeof spec !== 'object' || Array.isArray(spec) || Object.keys(spec).length > 16) fail('规格无效')
  for (const [key, value] of Object.entries(spec)) {
    if (!keys.has(key) || (typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && value.length > 80)) fail('规格字段无效')
  }
  const d = (key: string, maximum?: number) => number(spec[key], key, maximum)
  const density = number(item.density, '密度', 30)
  const rawFactor = number(item.quoteFactor, '报价系数', 100)
  if (density < 0.01 || rawFactor < 0.01) fail('密度或报价系数无效')
  const factor = rounded(rawFactor, 2)
  const fee = number(item.processingFeeFen, '加工费', 999_999_900)
  if (!Number.isInteger(fee)) fail('加工费必须为整数分')
  const shape = material.category === 'section'
    ? material.id.includes('.al.') ? 'aluminum'
      : material.id.includes('.ss.') ? item.sectionShape || 'angle'
        : material.id.split('.').pop()!
    : ''
  const quantity = material.category === 'plate' ? d('quantity', 100_000) : d('lengthM', 100_000)
  if (material.category === 'plate' && !Number.isInteger(quantity)) fail('张数必须为整数')
  let unit = 0
  if (material.category === 'plate') unit = d('lengthMm') * d('widthMm') * d('thicknessMm') * density / 1e6
  else if (material.category === 'flatBar') unit = d('widthMm') * d('thicknessMm') * density / 1000
  else if (material.category === 'roundBar') unit = Math.PI * d('diameterMm') ** 2 / 4 * density / 1000
  else if (material.category === 'roundTube') {
    const diameter = d('diameterMm'), wall = d('thicknessMm')
    if (wall * 2 > diameter) fail('壁厚不能超过外径的一半')
    unit = Math.PI * (diameter - wall) * wall * density / 1000
  } else if (material.category === 'squareTube') {
    const length = d('outerLengthMm'), width = d('outerWidthMm'), wall = d('thicknessMm')
    if (wall * 2 > Math.min(length, width)) fail('壁厚不能超过最短边的一半')
    unit = (length + width - 2 * wall) * 2 * wall * density / 1000
  } else {
    const model = String(spec.model || '')
    const key = normalized(model)
    const row = (rows as SpecRow[]).find(candidate => candidate.shape === shape &&
      [candidate.model, ...candidate.aliases].some(alias => normalized(alias) === key))
    if (row) {
      unit = row.kgPerM * density / (shape === 'aluminum' ? 2.7 : 7.85)
      const actual = d('thicknessMm')
      if (actual && row.thicknessMm && Math.abs(actual - row.thicknessMm) > 0.0001)
        unit *= actual / row.thicknessMm
    } else if (item.estimateSection) {
      const t = d('thicknessMm'), width = d('widthMm')
      if (shape === 'aluminum') unit = d('areaMm2') * density / 1000
      else if (shape === 'angle') {
        const side = width || number(model.split('*')[0], '边宽')
        unit = Math.max(0, t * (2 * side - t) * density / 1000)
      } else {
        const flange = d('flangeThicknessMm') || t, web = d('webThicknessMm') || t
        const lip = shape === 'cpurlin' ? d('lipMm') : 0
        unit = Math.max(0, (2 * width * flange + Math.max(0, d('heightMm') - 2 * flange) * web + 2 * lip * t) * density / 1000)
      }
    } else fail('型号未收录，请先选择已收录规格或估算')
  }
  const weight = unit * quantity
  const amountFen = Math.round(weight / 1000 * config.prices[material.id] * factor * 100) + fee
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1e9 ||
    !Number.isSafeInteger(amountFen) || amountFen > 2_147_483_647) fail('报价结果超出范围')
  return {
    materialId: material.id, category: material.category, spec, density,
    tonPriceFen: config.prices[material.id] * 100, quoteFactor: factor,
    processingFeeFen: fee, weightKg: rounded(weight, 6), amountFen,
    ...(item.sectionShape ? { sectionShape: shape } : {}),
    ...(item.estimateSection ? { estimateSection: true } : {}),
  }
}
