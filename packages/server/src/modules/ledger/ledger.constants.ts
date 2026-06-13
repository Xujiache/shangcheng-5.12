// 门窗利账 · 领域常量 + 会员派生算法 + 利润计算（纯函数，无 DI，App/后台共用）
import { customAlphabet } from 'nanoid'

/** 邀请码生成器（去易混字符 B/I/O/0/1，8 位大写+数字）。App/后台统一来源，避免重复定义漂移。 */
export const genLedgerInviteCode = customAlphabet('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

/** 套餐 → 天数。custom 走自定义天数，不在此表。 */
export const LEDGER_PLAN_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

/** 会员套餐（key 唯一标识；price 仅展示，App 内无支付）。后台可在配置中改。 */
export interface LedgerPlan {
  key: string
  label: string
  days: number
  price: string
}

/** 套餐展示元数据默认值（后台未改时用这套；与设计 MEMBER_PLANS 对齐）。 */
export const LEDGER_PLANS: LedgerPlan[] = [
  { key: 'day', label: '体验卡', days: 1, price: '¥1' },
  { key: 'week', label: '周卡', days: 7, price: '¥9' },
  { key: 'month', label: '月卡', days: 30, price: '¥29' },
  { key: 'quarter', label: '季卡', days: 90, price: '¥79' },
  { key: 'year', label: '年卡', days: 365, price: '¥268' },
]

/** 清洗后台传入的套餐数组：逐项收口 + 去重 key + 上限 20；非法/空则回落默认。 */
export function normalizeLedgerPlans(raw: any): LedgerPlan[] {
  if (!Array.isArray(raw)) return LEDGER_PLANS
  const seen = new Set<string>()
  const cleaned = raw
    .slice(0, 20)
    .map((p: any) => ({
      key: String(p?.key ?? '')
        .trim()
        .slice(0, 20),
      label: String(p?.label ?? '')
        .trim()
        .slice(0, 20),
      days: Math.min(3650, Math.max(1, Math.round(Number(p?.days) || 0))),
      price: String(p?.price ?? '')
        .trim()
        .slice(0, 20),
    }))
    .filter((p) => p.key && p.label && p.days > 0 && !seen.has(p.key) && seen.add(p.key))
  return cleaned.length ? cleaned : LEDGER_PLANS
}

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
  /** 每个邀请人最多奖励多少个被邀请人（反刷量上限）；0=不限 */
  inviteMaxRewarded: 50,
  cutTrialDays: 7,
  cutRequireMembership: true,
  /** 会员套餐（后台可编辑；App /l/membership 与后台授予按此天数）*/
  plans: LEDGER_PLANS as LedgerPlan[],
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
    inviteMaxRewarded: num(
      r.inviteMaxRewarded,
      LEDGER_CONFIG_DEFAULTS.inviteMaxRewarded,
      0,
      100000,
    ),
    cutTrialDays: num(r.cutTrialDays, LEDGER_CONFIG_DEFAULTS.cutTrialDays, 0, 3650),
    cutRequireMembership: bool(r.cutRequireMembership, LEDGER_CONFIG_DEFAULTS.cutRequireMembership),
    plans: normalizeLedgerPlans(r.plans),
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

// ── 门窗报价明细（订单编辑器）：产品项 + 尺寸 → 面积 → 小计 → 金额 → 总价 ──
export interface OrderSize {
  w: number // 宽 mm
  h: number // 高 mm
  notes?: string[] // 多条备注（清洗后必为数组；每条 ≤30 字、≤50 条）
  /** @deprecated 旧单单条备注；读取时并入 notes，不再写入 */
  note?: string
}
export interface OrderItem {
  name: string
  note: string
  baseArea: number // 起算面积 ㎡（单条尺寸面积不足时按此计）
  unitPrice: number // 单价 元
  qty: number // 无尺寸时的数量/面积（手填）
  sizes: OrderSize[]
  subtotal?: number | null // 手动改写的小计（元）；null/缺省 = 按 计费量×单价 自动算
}
/** 尺寸备注清洗：兼容新 notes 数组与旧单 note 单串；逐条 trim+≤30 字、丢空、≤50 条 */
function sanitizeSizeNotes(s: any): string[] {
  const raw = Array.isArray(s?.notes)
    ? s.notes
    : s?.note !== undefined && s?.note !== null && s?.note !== ''
      ? [s.note]
      : []
  return raw
    .slice(0, 50)
    .map((t: any) =>
      String(t ?? '')
        .trim()
        .slice(0, 30),
    )
    .filter((t: string) => t.length > 0)
}
export function sanitizeOrderItems(raw: unknown): OrderItem[] {
  if (!Array.isArray(raw)) return []
  return (
    raw
      .slice(0, 100)
      .map((it: any) => {
        const sizes: OrderSize[] = Array.isArray(it?.sizes)
          ? it.sizes
              .slice(0, 100)
              .map((s: any) => ({
                w: Math.max(0, Math.round(Number(s?.w) || 0)),
                h: Math.max(0, Math.round(Number(s?.h) || 0)),
                notes: sanitizeSizeNotes(s),
              }))
              .filter((s: OrderSize) => s.w > 0 && s.h > 0)
          : []
        // 小计手动改写：传了 subtotal（数字）即覆盖「计费量×单价」；null/空 = 自动算
        const hasSub = it?.subtotal !== null && it?.subtotal !== undefined && it?.subtotal !== ''
        const subtotal = hasSub ? Math.max(0, Math.round(Number(it?.subtotal) || 0)) : null
        return {
          name: String(it?.name ?? '')
            .trim()
            .slice(0, 40),
          note: String(it?.note ?? '')
            .trim()
            .slice(0, 30),
          baseArea: Math.max(0, Number(it?.baseArea) || 0),
          unitPrice: Math.max(0, Math.round(Number(it?.unitPrice) || 0)),
          qty: Math.max(0, Number(it?.qty) || 0),
          sizes,
          subtotal,
        }
      })
      // 名称非强制：只要填了 名称/尺寸/数量/单价/小计 任一就视为有效明细（仅丢真正的空行）。
      // 门窗下单常只填尺寸+单价不起名，强制名称会导致漏算金额 + 退出丢数据。
      .filter(
        (it) =>
          it.name || it.sizes.length > 0 || it.qty > 0 || it.unitPrice > 0 || it.subtotal != null,
      )
  )
}
function sizeArea(s: OrderSize, baseArea: number): number {
  return Math.max((s.w * s.h) / 1_000_000, baseArea || 0)
}
/** 计费量：有尺寸=各尺寸面积之和(按起算兜底)；无尺寸=手填数量 */
export function itemBillingQty(it: OrderItem): number {
  if (it.sizes && it.sizes.length) {
    return it.sizes.reduce((sum, s) => sum + sizeArea(s, it.baseArea), 0)
  }
  return it.qty || 0
}
export function itemSubtotal(it: OrderItem): number {
  // 手动改写的小计优先（门窗常按整窗议价/抹零，与 计费量×单价 解耦）
  if (it.subtotal != null) return Math.max(0, Math.round(it.subtotal))
  return Math.round(itemBillingQty(it) * (it.unitPrice || 0))
}
/** 金额 = Σ各项小计 */
export function orderItemsAmount(items: unknown): number {
  return sanitizeOrderItems(items).reduce((s, it) => s + itemSubtotal(it), 0)
}
/** 总价 = 金额 − 优惠（≥0） */
export function orderTotalFromItems(items: unknown, discount: number): number {
  return Math.max(0, orderItemsAmount(items) - Math.max(0, Math.round(discount || 0)))
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
  costProfile: number
  costGlass: number
  costHardware: number
  costLabor: number
  costScreen: number
  extras: unknown
  customCosts?: unknown
}): number {
  // 利润 = 总价 − 总成本（收款/定金属收付跟踪，不进利润；额外收入已废弃）
  return (o.total || 0) - totalCost(o)
}

/** 营收 = 总价 */
export function revenueOf(o: { total: number }): number {
  return o.total || 0
}

export function marginOf(o: Parameters<typeof profitOf>[0]): number {
  const revenue = revenueOf(o)
  return revenue ? profitOf(o) / revenue : 0
}
