import { MATERIAL_BY_ID, MetalCategory } from '../data/materials'
import { lookupSpec, SectionShape } from '../data/specTable'

export type MetalDimensions = Record<string, number | string>
export interface MetalInput {
  materialId: string
  dimensions: MetalDimensions
  density?: number | string
  tonPriceYuan?: number | string
  quoteFactor?: number | string
  processingFeeYuan?: number | string
  sectionShape?: SectionShape
  estimateSection?: boolean
}
export interface MetalResult {
  category: MetalCategory
  unitWeightKg: number
  totalWeightKg: number
  amountYuan: number
  tonPriceYuan: number
  quantity: number
  unit: '张' | '米'
  method: 'formula' | 'table' | 'estimated' | 'unlisted'
  source?: string
  thicknessCorrected: boolean
}

export class MetalInputError extends Error {}

function bounded(value: number | string | undefined, maximum: number, name: string): number {
  if (value === '' || value === undefined || value === null) return 0
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  if (number < 0 || number > maximum) throw new MetalInputError(`${name}超出允许范围`)
  return number
}

function dimension(values: MetalDimensions, name: string, maximum = 1_000_000): number {
  return bounded(values[name], maximum, name)
}

function sectionShape(materialId: string, explicit?: SectionShape): SectionShape {
  if (materialId.includes('.al.')) return 'aluminum'
  if (materialId.endsWith('.angle')) return 'angle'
  if (materialId.endsWith('.channel')) return 'channel'
  if (materialId.endsWith('.ibeam')) return 'ibeam'
  if (materialId.endsWith('.hbeam')) return 'hbeam'
  if (materialId.endsWith('.cpurlin')) return 'cpurlin'
  return explicit || 'angle'
}

export function calculateMetal(input: MetalInput): MetalResult {
  const material = MATERIAL_BY_ID.get(input.materialId)
  if (!material) throw new MetalInputError('材质不存在')
  const d = input.dimensions || {}
  const rho = input.density === undefined ? material.density : bounded(input.density, 30, '密度')
  const tonPrice =
    input.tonPriceYuan === undefined
      ? material.seedTonPriceYuan
      : bounded(input.tonPriceYuan, 10_000_000, '吨价')
  const rawFactor =
    input.quoteFactor === undefined ? 1 : bounded(input.quoteFactor, 100, '报价系数')
  const factor = Math.round(rawFactor * 100) / 100
  const processing = bounded(input.processingFeeYuan, 9_999_999, '加工费')
  if (rawFactor < 0.01) throw new MetalInputError('报价系数不能小于 0.01')
  let unitWeightKg = 0
  let method: MetalResult['method'] = 'formula'
  let source: string | undefined
  let thicknessCorrected = false
  const category = material.category
  let quantity =
    category === 'plate' ? dimension(d, 'quantity', 100_000) : dimension(d, 'lengthM', 100_000)
  if (category === 'plate') {
    if (quantity && !Number.isInteger(quantity)) throw new MetalInputError('张数必须是整数')
    unitWeightKg =
      (dimension(d, 'lengthMm') * dimension(d, 'widthMm') * dimension(d, 'thicknessMm') * rho) / 1e6
  } else if (category === 'flatBar') {
    unitWeightKg = (dimension(d, 'widthMm') * dimension(d, 'thicknessMm') * rho) / 1000
  } else if (category === 'roundBar') {
    const diameter = dimension(d, 'diameterMm')
    unitWeightKg = (((Math.PI * diameter * diameter) / 4) * rho) / 1000
  } else if (category === 'roundTube') {
    const diameter = dimension(d, 'diameterMm'),
      wall = dimension(d, 'thicknessMm')
    if (wall * 2 > diameter) throw new MetalInputError('壁厚不能超过外径的一半')
    unitWeightKg = (Math.PI * (diameter - wall) * wall * rho) / 1000
  } else if (category === 'squareTube') {
    const a = dimension(d, 'outerLengthMm'),
      b = dimension(d, 'outerWidthMm'),
      wall = dimension(d, 'thicknessMm')
    if (wall * 2 > Math.min(a, b)) throw new MetalInputError('壁厚不能超过最短边的一半')
    unitWeightKg = ((a + b - 2 * wall) * 2 * wall * rho) / 1000
  } else {
    const shape = sectionShape(input.materialId, input.sectionShape)
    const model = String(d.model || '')
    const row = lookupSpec(shape, model)
    if (row) {
      method = 'table'
      source = row.source
      const actual = dimension(d, 'thicknessMm')
      const densityAdjusted = (row.kgPerM * rho) / (shape === 'aluminum' ? 2.7 : 7.85)
      if (actual && row.thicknessMm && Math.abs(actual - row.thicknessMm) > 0.0001) {
        unitWeightKg = (densityAdjusted * actual) / row.thicknessMm
        thicknessCorrected = true
      } else unitWeightKg = densityAdjusted
    } else if (input.estimateSection) {
      method = 'estimated'
      const t = dimension(d, 'thicknessMm')
      const height = dimension(d, 'heightMm')
      const width = dimension(d, 'widthMm')
      if (shape === 'aluminum') {
        unitWeightKg = (dimension(d, 'areaMm2') * rho) / 1000
      } else if (shape === 'angle') {
        const side = width || bounded(model.split('*')[0], 1_000_000, '边宽')
        unitWeightKg = Math.max(0, (t * (2 * side - t) * rho) / 1000)
      } else {
        const flange = dimension(d, 'flangeThicknessMm') || t
        const web = dimension(d, 'webThicknessMm') || t
        const lip = shape === 'cpurlin' ? dimension(d, 'lipMm') : 0
        unitWeightKg = Math.max(
          0,
          ((2 * width * flange + Math.max(0, height - 2 * flange) * web + 2 * lip * t) * rho) /
            1000,
        )
      }
    } else method = 'unlisted'
  }
  if (!Number.isFinite(unitWeightKg) || unitWeightKg > 1e12)
    throw new MetalInputError('计算结果超出范围')
  const totalWeightKg = unitWeightKg * quantity
  const amountYuan =
    (totalWeightKg / 1000) * tonPrice * factor + (unitWeightKg && quantity ? processing : 0)
  if (!Number.isFinite(amountYuan) || amountYuan > 1e12)
    throw new MetalInputError('报价结果超出范围')
  return {
    category,
    unitWeightKg,
    totalWeightKg,
    amountYuan,
    tonPriceYuan: tonPrice,
    quantity,
    unit: category === 'plate' ? '张' : '米',
    method,
    source,
    thicknessCorrected,
  }
}

export function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) value = 0
  const fixed = value.toFixed(digits)
  const [integer, fractional] = fixed.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fractional === undefined ? grouped : `${grouped}.${fractional}`
}

export function describeMetalInput(input: MetalInput): string {
  const material = MATERIAL_BY_ID.get(input.materialId)
  if (!material) return ''
  const d = input.dimensions
  const read = (key: string) => String(d[key] || '0')
  if (material.category === 'plate')
    return `${read('lengthMm')}×${read('widthMm')}×${read('thicknessMm')}mm × ${read('quantity')}张`
  if (material.category === 'section')
    return `${material.label} ${read('model')}，实厚${read('thicknessMm')}mm，长${read('lengthM')}m`
  if (material.category === 'squareTube')
    return `${read('outerLengthMm')}×${read('outerWidthMm')}×${read('thicknessMm')}mm，长${read('lengthM')}m`
  if (material.category === 'flatBar')
    return `${read('widthMm')}×${read('thicknessMm')}mm，长${read('lengthM')}m`
  if (material.category === 'roundTube')
    return `Φ${read('diameterMm')}×${read('thicknessMm')}mm，长${read('lengthM')}m`
  return `Φ${read('diameterMm')}mm，长${read('lengthM')}m`
}
