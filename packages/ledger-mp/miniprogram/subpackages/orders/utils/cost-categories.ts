export interface CostCategory {
  id: string
  name: string
  color: string
}

export const DEFAULT_COST_CATEGORIES: CostCategory[] = [
  { id: 'profile', name: '型材', color: 'c1' },
  { id: 'glass', name: '玻璃', color: 'c2' },
  { id: 'hardware', name: '配件', color: 'c3' },
  { id: 'labor', name: '人工', color: 'c4' },
  { id: 'screen', name: '纱窗', color: 'c5' },
]

export const COST_CATEGORY_STORAGE_KEY = 'ledger_cost_categories'
const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']

export function normalizeCostCategories(raw: any): CostCategory[] {
  if (!Array.isArray(raw) || !raw.length) return DEFAULT_COST_CATEGORIES.map((x) => ({ ...x }))
  const seen = new Set<string>()
  const list = raw
    .slice(0, 20)
    .map((item: any, index: number) => {
      const fallbackId = `cost-${index + 1}`
      const id =
        String(item?.id || fallbackId)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 40) || fallbackId
      return {
        id,
        name: String(item?.name || '')
          .trim()
          .slice(0, 20),
        color: COLORS.includes(String(item?.color))
          ? String(item.color)
          : COLORS[index % COLORS.length],
      }
    })
    .filter((item: CostCategory) => {
      if (!item.name || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  return list.length ? list : DEFAULT_COST_CATEGORIES.map((x) => ({ ...x }))
}

export function readCostCategories(): CostCategory[] {
  try {
    return normalizeCostCategories(wx.getStorageSync(COST_CATEGORY_STORAGE_KEY))
  } catch {
    return DEFAULT_COST_CATEGORIES.map((x) => ({ ...x }))
  }
}

export function cacheCostCategories(raw: any): CostCategory[] {
  const categories = normalizeCostCategories(raw)
  try {
    wx.setStorageSync(COST_CATEGORY_STORAGE_KEY, categories)
  } catch {
    /* 本地缓存失败不影响服务端配置和本次使用。 */
  }
  return categories
}

export function createCostCategoryId(): string {
  return `cost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function nextCostColor(index: number): string {
  return COLORS[index % COLORS.length]
}
