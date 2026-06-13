// 客户端利润计算（订单编辑实时预估用，与后端 ledger.constants 同口径）

export interface OrderCosts {
  profile: number
  glass: number
  hardware: number
  labor: number
  screen: number
}
export interface Extra {
  type: string
  amount: number
}

export function sanitizeExtras(raw: any): Extra[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((e) => ({
      type: String(e?.type ?? '').trim(),
      amount: Math.max(0, Math.round(Number(e?.amount) || 0)),
    }))
    .filter((e) => e.type && e.amount > 0)
}

export function extrasTotal(extras: any): number {
  return sanitizeExtras(extras).reduce((s, e) => s + e.amount, 0)
}

export interface CustomCost {
  name: string
  amount: number
}
export function sanitizeCustomCosts(raw: any): CustomCost[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((e) => ({
      name: String(e?.name ?? '').trim(),
      amount: Math.max(0, Math.round(Number(e?.amount) || 0)),
    }))
    .filter((e) => e.name && e.amount > 0)
}
export function customCostsTotal(raw: any): number {
  return sanitizeCustomCosts(raw).reduce((s, e) => s + e.amount, 0)
}

export function fixedCost(c: Partial<OrderCosts>): number {
  return (c.profile || 0) + (c.glass || 0) + (c.hardware || 0) + (c.labor || 0) + (c.screen || 0)
}

export function totalCost(c: Partial<OrderCosts>, extras: any, customCosts?: any): number {
  return fixedCost(c) + extrasTotal(extras) + customCostsTotal(customCosts)
}

// 利润 = 总价 − 总成本（收款属收付跟踪，不进利润；额外收入已废弃）
export function profitOf(
  total: number,
  c: Partial<OrderCosts>,
  extras: any,
  customCosts?: any,
): number {
  return (total || 0) - totalCost(c, extras, customCosts)
}

export function marginOf(
  total: number,
  c: Partial<OrderCosts>,
  extras: any,
  customCosts?: any,
): number {
  const revenue = total || 0
  return revenue ? profitOf(total, c, extras, customCosts) / revenue : 0
}

/** 成本分类元数据（与设计一致） */
export const COST_CATS = [
  { key: 'profile', name: '型材', color: 'c1' },
  { key: 'glass', name: '玻璃', color: 'c2' },
  { key: 'hardware', name: '配件', color: 'c3' },
  { key: 'labor', name: '人工', color: 'c4' },
  { key: 'screen', name: '纱窗', color: 'c5' },
] as const

export const EXTRA_TYPES = ['运费', '上门安装费', '油费', '测量费', '其他']
