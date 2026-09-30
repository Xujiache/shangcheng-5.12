import materials from './metal-materials.json'

export interface MetalConfig {
  updatedAt: string
  prices: Record<string, number>
  densities: Record<string, number>
  priceMode: Record<string, 'live' | 'estimate'>
  defaults: { quoteFactor: number; processingFeeFen: number }
}

export const METAL_MATERIALS = materials
const ids = new Set(materials.map((item) => item.id))

function entries(raw: unknown): [string, unknown][] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.entries(raw).slice(0, 200).filter(([id]) => ids.has(id))
}

function numberIn(raw: unknown, fallback: number, min: number, max: number, digits = 0): number {
  if (raw === null || raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  const factor = 10 ** digits
  return Math.round(Math.min(max, Math.max(min, value)) * factor) / factor
}

export function normalizeMetalConfig(raw: unknown): MetalConfig {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const rawPrices = new Map(entries(value.prices))
  const rawDensities = new Map(entries(value.densities))
  const rawModes = new Map(entries(value.priceMode))
  const prices: Record<string, number> = {}
  const densities: Record<string, number> = {}
  const priceMode: Record<string, 'live' | 'estimate'> = {}
  for (const material of materials) {
    prices[material.id] = numberIn(rawPrices.get(material.id), material.seedTonPriceYuan, 0, 10_000_000)
    densities[material.id] = numberIn(rawDensities.get(material.id), material.density, 0.01, 30, 3)
    const mode = rawModes.get(material.id)
    priceMode[material.id] = mode === 'live' || mode === 'estimate' ? mode : material.priceMode as 'live' | 'estimate'
  }
  const defaults = value.defaults && typeof value.defaults === 'object' && !Array.isArray(value.defaults)
    ? value.defaults as Record<string, unknown> : {}
  const timestamp = typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt))
    ? new Date(value.updatedAt).toISOString() : ''
  return {
    updatedAt: timestamp,
    prices, densities, priceMode,
    defaults: {
      quoteFactor: numberIn(defaults.quoteFactor, 1, 0.01, 100, 2),
      processingFeeFen: numberIn(defaults.processingFeeFen, 0, 0, 999_999_900),
    },
  }
}
