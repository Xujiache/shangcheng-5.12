/**
 * 会员套餐 · 真生效服务（Mock + localStorage 持久化）
 *
 * 数据流：
 *   平台端编辑套餐 ──→ localStorage(jj_member_state) ──→ 商家端读取
 *                                ↑
 *               商家端订阅/配额消耗 ──── 同一 key 持久化
 *
 * 当前商家：从 admin-pc 的 userStore 派生（demo 账号 merchant@demo → demo-merchant-001）
 *
 * 接真后端时：把 load/save 换成 GET/POST `/api/v1/member/*`，逻辑不变
 */
import type { MemberPlan } from '@jiujiu/shared/types'
import { genMemberPlans } from '@jiujiu/shared/mock'

const STORAGE_KEY = 'jj_member_state_v1'

/* ============ 类型 ============ */

export interface Subscription {
  merchantId: string
  merchantName: string
  planId: string
  planCode: string
  planName: string
  planType: MemberPlan['type']
  price: number
  startAt: string
  endAt: string
  totalDays: number
  autoRenew: boolean
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  subscribedAt: string
}

export interface UsageQuota {
  merchantId: string
  /** 限额快照（订阅时从 plan.constraints 拷贝） */
  limits: {
    pushSlots: number
    bannerLimit: number
    impressionLimit: number
    weightLimit: number
  }
  /** 已用 */
  used: {
    pushSlots: number
    bannerLimit: number
    impressionLimit: number
  }
  /** 本月计数起点（曝光月度重置） */
  monthStart: string
}

export interface PaymentRecord {
  id: string
  no: string
  merchantId: string
  merchantName: string
  planId: string
  planName: string
  planType: MemberPlan['type']
  amount: number
  status: 'paid' | 'pending' | 'refunding' | 'refunded'
  payMethod: 'wechat' | 'alipay' | 'balance'
  paidAt: string | null
  createdAt: string
}

interface MemberState {
  plans: MemberPlan[]
  subscriptions: Record<string, Subscription>
  quotas: Record<string, UsageQuota>
  payments: PaymentRecord[]
}

/* ============ 持久化 ============ */

const DEMO_MERCHANTS = [
  { id: 'demo-merchant-001', name: '经纬科技（北京·三里屯）' },
  { id: 'demo-merchant-002', name: '佛山顺德龙江家具厂' },
  { id: 'demo-merchant-003', name: '上海陆家嘴体验店' },
  { id: 'demo-merchant-004', name: '广州天河旗舰店' },
  { id: 'demo-merchant-005', name: '南方睡眠科技工厂' },
  { id: 'demo-merchant-006', name: '岩板工厂直营' }
]

function defaultState(): MemberState {
  const plans = genMemberPlans()
  const now = Date.now()
  const planBasic = plans.find((p) => p.code === 'yearly')!
  const planAdPro = plans.find((p) => p.code === 'ad_pro')!
  const planAdBasic = plans.find((p) => p.code === 'ad_basic')!

  // 给当前 demo 商家预订阅一个套餐
  const subs: Record<string, Subscription> = {}
  const quotas: Record<string, UsageQuota> = {}
  const payments: PaymentRecord[] = []

  // demo-merchant-001 订阅 年费会员 + 进阶推广包
  const sub1: Subscription = {
    merchantId: 'demo-merchant-001',
    merchantName: DEMO_MERCHANTS[0].name,
    planId: planBasic.id,
    planCode: planBasic.code,
    planName: planBasic.name,
    planType: 'basic',
    price: planBasic.price,
    startAt: new Date(now - 85 * 86400000).toISOString(),
    endAt: new Date(now + 280 * 86400000).toISOString(),
    totalDays: 365,
    autoRenew: true,
    status: 'active',
    subscribedAt: new Date(now - 85 * 86400000).toISOString()
  }
  subs['demo-merchant-001'] = sub1
  quotas['demo-merchant-001'] = {
    merchantId: 'demo-merchant-001',
    limits: {
      pushSlots: planAdPro.constraints?.pushSlots ?? 20,
      bannerLimit: planAdPro.constraints?.bannerLimit ?? 2,
      impressionLimit: planAdPro.constraints?.impressionLimit ?? 300000,
      weightLimit: planAdPro.constraints?.weightLimit ?? 85
    },
    used: { pushSlots: 7, bannerLimit: 1, impressionLimit: 168400 },
    monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  }

  // 其余商家分别订阅不同套餐 + 缴费历史
  const subPatterns: { idx: number; plan: MemberPlan; offsetDays: number }[] = [
    { idx: 1, plan: planAdBasic, offsetDays: -40 },
    { idx: 2, plan: planBasic, offsetDays: -120 },
    { idx: 3, plan: planAdPro, offsetDays: -15 },
    { idx: 4, plan: plans.find((p) => p.code === 'monthly')!, offsetDays: -20 }
  ]
  subPatterns.forEach(({ idx, plan, offsetDays }) => {
    const m = DEMO_MERCHANTS[idx]
    const totalDays =
      plan.period === 'yearly' ? 365 : plan.period === 'monthly' ? 30 : plan.period === 'weekly' ? 7 : 1
    subs[m.id] = {
      merchantId: m.id,
      merchantName: m.name,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      planType: plan.type,
      price: plan.price,
      startAt: new Date(now + offsetDays * 86400000).toISOString(),
      endAt: new Date(now + (offsetDays + totalDays) * 86400000).toISOString(),
      totalDays,
      autoRenew: idx % 2 === 0,
      status: 'active',
      subscribedAt: new Date(now + offsetDays * 86400000).toISOString()
    }
    if (plan.constraints) {
      quotas[m.id] = {
        merchantId: m.id,
        limits: {
          pushSlots: plan.constraints.pushSlots ?? 0,
          bannerLimit: plan.constraints.bannerLimit ?? 0,
          impressionLimit: plan.constraints.impressionLimit ?? 0,
          weightLimit: plan.constraints.weightLimit ?? 0
        },
        used: {
          pushSlots: Math.floor((plan.constraints.pushSlots ?? 0) * 0.4),
          bannerLimit: Math.floor((plan.constraints.bannerLimit ?? 0) * 0.3),
          impressionLimit: Math.floor((plan.constraints.impressionLimit ?? 0) * 0.5)
        },
        monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      }
    }
  })

  // 缴费记录
  const merchants = Object.values(subs)
  merchants.forEach((s, i) => {
    payments.push({
      id: 'pay-' + (i + 1),
      no: 'P' + Date.now().toString().slice(-9) + i.toString().padStart(2, '0'),
      merchantId: s.merchantId,
      merchantName: s.merchantName,
      planId: s.planId,
      planName: s.planName,
      planType: s.planType,
      amount: s.price,
      status: 'paid',
      payMethod: (['wechat', 'alipay', 'balance'] as const)[i % 3],
      paidAt: s.subscribedAt,
      createdAt: s.subscribedAt
    })
  })
  // 加几个不同状态的样本
  payments.push({
    id: 'pay-pending-1',
    no: 'P' + Date.now().toString().slice(-9) + '90',
    merchantId: DEMO_MERCHANTS[5].id,
    merchantName: DEMO_MERCHANTS[5].name,
    planId: planAdBasic.id,
    planName: planAdBasic.name,
    planType: 'ad',
    amount: planAdBasic.price,
    status: 'pending',
    payMethod: 'wechat',
    paidAt: null,
    createdAt: new Date(now - 86400000).toISOString()
  })
  payments.push({
    id: 'pay-refund-1',
    no: 'P' + Date.now().toString().slice(-9) + '91',
    merchantId: DEMO_MERCHANTS[3].id,
    merchantName: DEMO_MERCHANTS[3].name,
    planId: planAdPro.id,
    planName: planAdPro.name,
    planType: 'ad',
    amount: planAdPro.price,
    status: 'refunding',
    payMethod: 'alipay',
    paidAt: new Date(now - 5 * 86400000).toISOString(),
    createdAt: new Date(now - 5 * 86400000).toISOString()
  })

  return { plans, subscriptions: subs, quotas, payments }
}

let memCache: MemberState | null = null

function load(): MemberState {
  if (memCache) return memCache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      memCache = JSON.parse(raw)
      return memCache!
    }
  } catch {
    /* ignore */
  }
  memCache = defaultState()
  save(memCache)
  return memCache
}

function save(state: MemberState): void {
  memCache = state
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota exceeded - 忽略，内存缓存仍可用 */
  }
}

const delay = <T>(data: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), ms))

/* ============ 当前商家身份 ============ */

/**
 * 当前商家 ID：从 localStorage 中的 admin_pc_mock_active_user 派生
 * - merchant@demo / super@demo → demo-merchant-001
 * - 其他 → demo-merchant-001（fallback）
 */
export function getCurrentMerchantId(): string {
  return 'demo-merchant-001'
}
export function getCurrentMerchantName(): string {
  return DEMO_MERCHANTS[0].name
}

export function listDemoMerchants() {
  return DEMO_MERCHANTS.slice()
}

/* ============ 套餐 CRUD ============ */

export function getAllPlans(): Promise<MemberPlan[]> {
  return delay(load().plans)
}

export function savePlan(plan: Partial<MemberPlan> & { id?: string }): Promise<{ ok: true; plan: MemberPlan }> {
  const state = load()
  if (plan.id) {
    const idx = state.plans.findIndex((p) => p.id === plan.id)
    if (idx >= 0) {
      state.plans[idx] = {
        ...state.plans[idx],
        ...plan,
        updatedAt: new Date().toISOString()
      } as MemberPlan
      // 联动：所有已订阅该套餐的商家，刷新限额（用最新 constraints）
      const updated = state.plans[idx]
      Object.values(state.subscriptions).forEach((sub) => {
        if (sub.planId === updated.id && updated.constraints) {
          const q = state.quotas[sub.merchantId]
          if (q) {
            q.limits = {
              pushSlots: updated.constraints.pushSlots ?? q.limits.pushSlots,
              bannerLimit: updated.constraints.bannerLimit ?? q.limits.bannerLimit,
              impressionLimit: updated.constraints.impressionLimit ?? q.limits.impressionLimit,
              weightLimit: updated.constraints.weightLimit ?? q.limits.weightLimit
            }
          }
          sub.price = updated.price
          sub.planName = updated.name
        }
      })
      save(state)
      return delay({ ok: true as const, plan: state.plans[idx] })
    }
  }
  const now = new Date().toISOString()
  const created: MemberPlan = {
    id: 'p-' + Date.now(),
    sort: state.plans.length + 1,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    rights: [],
    ...plan
  } as MemberPlan
  state.plans.push(created)
  save(state)
  return delay({ ok: true as const, plan: created })
}

export function removePlan(id: string): Promise<{ ok: true }> {
  const state = load()
  state.plans = state.plans.filter((p) => p.id !== id)
  save(state)
  return delay({ ok: true as const })
}

/* ============ 订阅 ============ */

export function getCurrentSubscription(merchantId?: string): Promise<Subscription | null> {
  const state = load()
  const mid = merchantId || getCurrentMerchantId()
  return delay(state.subscriptions[mid] || null)
}

export function getAllSubscriptions(): Promise<Subscription[]> {
  return delay(Object.values(load().subscriptions))
}

export function getSubscriptionsByPlan(planId: string): Promise<Subscription[]> {
  return delay(Object.values(load().subscriptions).filter((s) => s.planId === planId))
}

export interface SubscribeInput {
  planId: string
  merchantId?: string
  payMethod?: 'wechat' | 'alipay' | 'balance'
}

export function subscribePlan(input: SubscribeInput): Promise<{ ok: true; subscription: Subscription }> {
  const state = load()
  const plan = state.plans.find((p) => p.id === input.planId)
  if (!plan) return Promise.reject(new Error('套餐不存在'))
  const mid = input.merchantId || getCurrentMerchantId()
  const merchantName = mid === 'demo-merchant-001' ? getCurrentMerchantName() : DEMO_MERCHANTS.find((m) => m.id === mid)?.name || '未知商家'
  const now = new Date()
  const totalDays =
    plan.period === 'yearly' ? 365 : plan.period === 'monthly' ? 30 : plan.period === 'weekly' ? 7 : 1
  const endAt = new Date(now.getTime() + totalDays * 86400000)

  const sub: Subscription = {
    merchantId: mid,
    merchantName,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    planType: plan.type,
    price: plan.price,
    startAt: now.toISOString(),
    endAt: endAt.toISOString(),
    totalDays,
    autoRenew: false,
    status: 'active',
    subscribedAt: now.toISOString()
  }
  state.subscriptions[mid] = sub

  // 拷贝限额到配额
  if (plan.constraints) {
    state.quotas[mid] = {
      merchantId: mid,
      limits: {
        pushSlots: plan.constraints.pushSlots ?? 0,
        bannerLimit: plan.constraints.bannerLimit ?? 0,
        impressionLimit: plan.constraints.impressionLimit ?? 0,
        weightLimit: plan.constraints.weightLimit ?? 0
      },
      used: { pushSlots: 0, bannerLimit: 0, impressionLimit: 0 },
      monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }
  }

  // 记一条缴费
  state.payments.unshift({
    id: 'pay-' + Date.now(),
    no: 'P' + Date.now().toString().slice(-12),
    merchantId: mid,
    merchantName,
    planId: plan.id,
    planName: plan.name,
    planType: plan.type,
    amount: plan.price,
    status: 'paid',
    payMethod: input.payMethod || 'wechat',
    paidAt: now.toISOString(),
    createdAt: now.toISOString()
  })

  save(state)
  return delay({ ok: true as const, subscription: sub })
}

export function cancelSubscription(merchantId?: string): Promise<{ ok: true }> {
  const state = load()
  const mid = merchantId || getCurrentMerchantId()
  const sub = state.subscriptions[mid]
  if (sub) {
    sub.status = 'cancelled'
    sub.autoRenew = false
  }
  save(state)
  return delay({ ok: true as const })
}

export function setAutoRenew(merchantId: string, autoRenew: boolean): Promise<{ ok: true }> {
  const state = load()
  const sub = state.subscriptions[merchantId]
  if (sub) sub.autoRenew = autoRenew
  save(state)
  return delay({ ok: true as const })
}

/* ============ 配额 ============ */

export function getQuota(merchantId?: string): Promise<UsageQuota | null> {
  const state = load()
  const mid = merchantId || getCurrentMerchantId()
  // 月度自动重置（曝光）
  const q = state.quotas[mid]
  if (q) {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    if (q.monthStart !== thisMonthStart) {
      q.used.impressionLimit = 0
      q.monthStart = thisMonthStart
      save(state)
    }
  }
  return delay(q || null)
}

export type QuotaKey = 'pushSlots' | 'bannerLimit' | 'impressionLimit'

/**
 * 消耗配额：返回 ok=true 表示成功扣减；返回 ok=false 表示超限
 * 如果该商家未配置限额（无 ad 套餐），则不限制，返回 ok=true，used 不变
 */
export function useQuota(
  key: QuotaKey,
  count = 1,
  merchantId?: string
): Promise<{ ok: boolean; reason?: string; quota?: UsageQuota }> {
  const state = load()
  const mid = merchantId || getCurrentMerchantId()
  const q = state.quotas[mid]
  if (!q) {
    // 未购买推广套餐，不限制
    return delay({ ok: true as const })
  }
  const limit = q.limits[key]
  if (limit && q.used[key] + count > limit) {
    return delay({
      ok: false,
      reason: `${quotaLabelOf(key)} 已达上限 (${q.used[key]}/${limit})，请升级套餐`,
      quota: q
    })
  }
  q.used[key] += count
  save(state)
  return delay({ ok: true as const, quota: q })
}

export function releaseQuota(key: QuotaKey, count = 1, merchantId?: string): Promise<{ ok: true; quota?: UsageQuota }> {
  const state = load()
  const mid = merchantId || getCurrentMerchantId()
  const q = state.quotas[mid]
  if (q) {
    q.used[key] = Math.max(0, q.used[key] - count)
    save(state)
    return delay({ ok: true as const, quota: q })
  }
  return delay({ ok: true as const })
}

export function quotaLabelOf(k: QuotaKey): string {
  return ({ pushSlots: '选品广场推送位', bannerLimit: '首屏 Banner', impressionLimit: '月曝光' } as const)[k]
}

/* ============ 缴费记录 ============ */

export function getPayments(filter?: { merchantId?: string; status?: PaymentRecord['status'] }): Promise<PaymentRecord[]> {
  let list = load().payments.slice()
  if (filter?.merchantId) list = list.filter((p) => p.merchantId === filter.merchantId)
  if (filter?.status) list = list.filter((p) => p.status === filter.status)
  list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  return delay(list)
}

export function updatePaymentStatus(id: string, status: PaymentRecord['status']): Promise<{ ok: true }> {
  const state = load()
  const p = state.payments.find((x) => x.id === id)
  if (p) p.status = status
  save(state)
  return delay({ ok: true as const })
}

/* ============ 反馈到商家 (Notice) ============ */

export interface MembershipNotice {
  level: 'info' | 'warning' | 'danger'
  title: string
  desc: string
  cta?: { label: string; to: string }
}

/**
 * 商家 dashboard 顶部用：根据订阅 + 配额自动生成提醒
 */
export async function getMembershipNotices(merchantId?: string): Promise<MembershipNotice[]> {
  const sub = await getCurrentSubscription(merchantId)
  const q = await getQuota(merchantId)
  const notices: MembershipNotice[] = []

  if (!sub) {
    notices.push({
      level: 'info',
      title: '尚未订阅会员',
      desc: '订阅会员后可解锁选品广场推送、Banner、专属客服等功能',
      cta: { label: '查看套餐', to: '/merchant/member' }
    })
    return notices
  }

  // 到期提醒
  const remainingMs = new Date(sub.endAt).getTime() - Date.now()
  const remainingDays = Math.ceil(remainingMs / 86400000)
  if (remainingDays <= 0) {
    notices.push({
      level: 'danger',
      title: '套餐已过期',
      desc: `「${sub.planName}」已于 ${sub.endAt.slice(0, 10)} 到期，请尽快续订`,
      cta: { label: '立即续订', to: '/merchant/member' }
    })
  } else if (remainingDays <= 7) {
    notices.push({
      level: 'warning',
      title: `套餐 ${remainingDays} 天后到期`,
      desc: `「${sub.planName}」将于 ${sub.endAt.slice(0, 10)} 到期${sub.autoRenew ? '（已开启自动续订）' : '，请及时续订'}`,
      cta: { label: sub.autoRenew ? '查看' : '立即续订', to: '/merchant/member' }
    })
  } else if (remainingDays <= 30) {
    notices.push({
      level: 'info',
      title: `套餐 ${remainingDays} 天后到期`,
      desc: `「${sub.planName}」临近到期${sub.autoRenew ? '，已开启自动续订' : ''}`,
      cta: { label: '管理', to: '/merchant/member' }
    })
  }

  // 配额提醒
  if (q) {
    ;(['pushSlots', 'bannerLimit', 'impressionLimit'] as QuotaKey[]).forEach((k) => {
      const limit = q.limits[k]
      const used = q.used[k]
      if (limit > 0 && limit < 99999) {
        const ratio = used / limit
        if (ratio >= 1) {
          notices.push({
            level: 'danger',
            title: `${quotaLabelOf(k)} 已用尽`,
            desc: `当前 ${used}/${limit}，已达上限`,
            cta: { label: '升级套餐', to: '/merchant/member' }
          })
        } else if (ratio >= 0.8) {
          notices.push({
            level: 'warning',
            title: `${quotaLabelOf(k)} 已用 ${Math.floor(ratio * 100)}%`,
            desc: `当前 ${used}/${limit}，接近上限`,
            cta: { label: '升级套餐', to: '/merchant/member' }
          })
        }
      }
    })
  }

  return notices
}

/* ============ 调试/重置 ============ */

export function resetMemberState(): void {
  memCache = null
  localStorage.removeItem(STORAGE_KEY)
}
