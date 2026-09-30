import { getCurrentLedgerAccountId } from '../store'
import { MetalInput } from './calc'
import { MATERIAL_BY_ID } from '../../subpackages/metal/data/materials'

export interface MetalQuoteDraftItem {
  materialId: string
  category: string
  spec: Record<string, number | string>
  density: number
  quoteFactor: number
  processingFeeFen: number
  sectionShape?: string
  estimateSection?: boolean
}

const key = () => `ledger_metal_quote_v1:${getCurrentLedgerAccountId() || 'guest'}`

export function readMetalQuoteDraft(): MetalQuoteDraftItem[] {
  try {
    const value = wx.getStorageSync(key())
    return Array.isArray(value) ? value.slice(0, 200) : []
  } catch { return [] }
}

export function writeMetalQuoteDraft(items: MetalQuoteDraftItem[]) {
  wx.setStorageSync(key(), items.slice(0, 200))
}

export function addMetalQuoteItem(input: MetalInput): boolean {
  const material = MATERIAL_BY_ID.get(input.materialId)
  if (!material) return false
  const current = readMetalQuoteDraft()
  if (current.length >= 200) return false
  const item: MetalQuoteDraftItem = {
    materialId: material.id, category: material.category,
    spec: input.dimensions, density: Number(input.density ?? material.density),
    quoteFactor: Math.round(Number(input.quoteFactor ?? 1) * 100) / 100,
    processingFeeFen: Math.round(Number(input.processingFeeYuan || 0) * 100),
    ...(input.sectionShape ? { sectionShape: input.sectionShape } : {}),
    ...(input.estimateSection ? { estimateSection: true } : {}),
  }
  current.push(item)
  writeMetalQuoteDraft(current)
  return true
}

export function metalCsvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function metalCsv(rows: Array<Array<unknown>>): string {
  return '\uFEFF' + rows.map(row => row.map(metalCsvCell).join(',')).join('\r\n') + '\r\n'
}
