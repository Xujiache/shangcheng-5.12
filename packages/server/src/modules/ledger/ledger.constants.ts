// 门窗利账 · 领域常量 + 会员派生算法 + 利润计算（纯函数，无 DI，App/后台共用）

/** 套餐 → 天数。custom 走自定义天数，不在此表。 */
export const LEDGER_PLAN_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

/** 套餐展示元数据（与设计 MEMBER_PLANS 对齐；价格仅展示，App 内无支付）。 */
export const LEDGER_PLANS = [
  { key: 'day', label: '体验卡', days: 1, price: '¥1' },
  { key: 'week', label: '周卡', days: 7, price: '¥9' },
  { key: 'month', label: '月卡', days: 30, price: '¥29' },
  { key: 'quarter', label: '季卡', days: 90, price: '¥79' },
  { key: 'year', label: '年卡', days: 365, price: '¥268' },
]

/**
 * ledger 域全局配置默认值（存 LedgerConfig 单行 key=value，后台 admin-pc 可调）。
 * - allowSelfRegister: 是否开放 App 自助注册（#10）
 * - inviteRewardDays:  邀请成功奖励邀请人的天数（#10）
 * - cutTrialDays:      优化下料免费试用天数（#9）
 * - cutRequireMembership: 试用期后是否需要会员才能用优化下料（#9）
 */
export const LEDGER_CONFIG_DEFAULTS = {
  allowSelfRegister: true,
  inviteRewardDays: 7,
  cutTrialDays: 7,
  cutRequireMembership: true,
}
export type LedgerConfigShape = typeof LEDGER_CONFIG_DEFAULTS

/** 合并默认值 + 持久化覆盖，做类型收口（数值取整、布尔强制）。 */
export function normalizeLedgerConfig(raw: any): LedgerConfigShape {
  const r = raw && typeof raw === 'object' ? raw : {}
  const num = (v: any, d: number, min: number, max: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d
  }
  const bool = (v: any, d: boolean) => (typeof v === 'boolean' ? v : d)
  return {
    allowSelfRegister: bool(r.allowSelfRegister, LEDGER_CONFIG_DEFAULTS.allowSelfRegister),
    inviteRewardDays: num(r.inviteRewardDays, LEDGER_CONFIG_DEFAULTS.inviteRewardDays, 0, 3650),
    cutTrialDays: num(r.cutTrialDays, LEDGER_CONFIG_DEFAULTS.cutTrialDays, 0, 3650),
    cutRequireMembership: bool(r.cutRequireMembership, LEDGER_CONFIG_DEFAULTS.cutRequireMembership),
  }
}

export interface MembershipStatus {
  /** 有效（未过期且已开通） */
  active: boolean
  /** 已过期（开通过但到期） */
  expired: boolean
  /** 从未开通 */
  never: boolean
  expiresAt: string | null
  /** active 时为剩余天数（≥0，向上取整）；expired 为负；never 为 0 */
  daysLeft: number
  /** active 且剩余 ≤7 天 */
  expiringSoon: boolean
  lastPlanKey: string | null
}

const DAY_MS = 86_400_000

/** 由到期时间派生会员状态。now 注入便于测试。 */
export function deriveMembership(
  expiresAt: Date | null | undefined,
  lastPlanKey?: string | null,
  now: Date = new Date(),
): MembershipStatus {
  if (!expiresAt) {
    return {
      active: false,
      expired: false,
      never: true,
      expiresAt: null,
      daysLeft: 0,
      expiringSoon: false,
      lastPlanKey: lastPlanKey ?? null,
    }
  }
  const diff = expiresAt.getTime() - now.getTime()
  const active = diff > 0
  const daysLeft = Math.ceil(diff / DAY_MS)
  return {
    active,
    expired: !active,
    never: false,
    expiresAt: expiresAt.toISOString(),
    daysLeft,
    expiringSoon: active && daysLeft <= 7,
    lastPlanKey: lastPlanKey ?? null,
  }
}

/** 会员到期上限：今天起最多 ~10 年，避免重复叠加把到期推到不合理的远期。 */
const MAX_MEMBERSHIP_MS = 3650 * DAY_MS

/**
 * 增加会员时长（叠加）：新到期 = max(now, 当前到期) + N 天，封顶 now+10 年。
 * - 未过期：从原到期日往后续（不浪费剩余天数）
 * - 已过期/从未开通：从今天起算
 * - 负数天数（后台纠错/扣减）：只会减少时长，不受上限影响
 */
export function computeGrantExpiry(
  currentExpiresAt: Date | null | undefined,
  days: number,
  now: Date = new Date(),
): Date {
  const stillValid = !!currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
  const base = stillValid ? (currentExpiresAt as Date) : now
  const target = base.getTime() + days * DAY_MS
  const ceiling = now.getTime() + MAX_MEMBERSHIP_MS
  return new Date(Math.min(target, ceiling))
}

// ── 订单利润计算（与设计 data.jsx 口径一致）──────────────────
export interface LedgerExtra {
  type: string
  amount: number
}

/**
 * 仅保留合法的其他开销项（type 非空字符串 + amount 正数），用于落库前清洗。
 * 限制条数(≤50) + 类型名长度(≤20)，防止已登录用户注入超大数组导致行膨胀 / 统计 DoS。
 */
export function sanitizeExtras(raw: unknown): LedgerExtra[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 50)
    .map((e: any) => ({
      type: String(e?.type ?? '')
        .trim()
        .slice(0, 20),
      amount: Math.max(0, Math.round(Number(e?.amount) || 0)),
    }))
    .filter((e) => e.type && e.amount > 0)
}

export function extrasTotal(extras: unknown): number {
  return sanitizeExtras(extras).reduce((s, e) => s + e.amount, 0)
}

// ── 自定义成本项（#5）：成本明细里用户自定义名目 ──
export interface CustomCost {
  name: string
  amount: number
}
export function sanitizeCustomCosts(raw: unknown): CustomCost[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 20)
    .map((e: any) => ({
      name: String(e?.name ?? '')
        .trim()
        .slice(0, 20),
      amount: Math.max(0, Math.round(Number(e?.amount) || 0)),
    }))
    .filter((e) => e.name && e.amount > 0)
}
export function customCostsTotal(raw: unknown): number {
  return sanitizeCustomCosts(raw).reduce((s, e) => s + e.amount, 0)
}

/** 固定 5 类成本之和 */
export function fixedCost(o: {
  costProfile: number
  costGlass: number
  costHardware: number
  costLabor: number
  costScreen: number
}): number {
  return (
    (o.costProfile || 0) +
    (o.costGlass || 0) +
    (o.costHardware || 0) +
    (o.costLabor || 0) +
    (o.costScreen || 0)
  )
}

export function totalCost(o: {
  costProfile: number
  costGlass: number
  costHardware: number
  costLabor: number
  costScreen: number
  extras: unknown
  customCosts?: unknown
}): number {
  return fixedCost(o) + extrasTotal(o.extras) + customCostsTotal(o.customCosts)
}

export function profitOf(o: {
  total: number
  extraIncome?: number
  costProfile: number
  costGlass: number
  costHardware: number
  costLabor: number
  costScreen: number
  extras: unknown
  customCosts?: unknown
}): number {
  return (o.total || 0) + (o.extraIncome || 0) - totalCost(o)
}

/** 营收 = 总价 + 额外收入 */
export function revenueOf(o: { total: number; extraIncome?: number }): number {
  return (o.total || 0) + (o.extraIncome || 0)
}

export function marginOf(o: Parameters<typeof profitOf>[0]): number {
  const revenue = revenueOf(o)
  return revenue ? profitOf(o) / revenue : 0
}
