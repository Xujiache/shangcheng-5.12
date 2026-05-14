/**
 * 会员套餐 · 接口适配层
 *
 * 平台端：CRUD 走 /api/v1/p/member-plans · /api/v1/p/member-pay-orders
 * 商户端：订阅/配额/缴费 走 /api/v1/m/membership/*
 *
 * 商家身份完全由后端 JWT 识别，前端不再保留任何 demo 商家映射。
 * 通知聚合优先取后端 /m/membership/notices；失败时本地依据 订阅+配额 拼装。
 */
import type { MemberPlan } from '@jiujiu/shared/types'
import request from '@/utils/http'
import { useUserStore } from '@/store/modules/user'

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

/* ============ 当前商家身份 ============ */

/**
 * 当前商家 ID：后端通过 JWT 自动识别，前端不再硬编码 demo 值。
 * 优先取 user store 中的 userId（登录后由 /api/v1/auth/user-info 写入），缺失时返回空字符串
 * （由后端 JWT 兜底，避免任何 mock 业务身份泄露）。
 */
export function getCurrentMerchantId(): string {
  try {
    const id = useUserStore().info?.userId
    return id != null ? String(id) : ''
  } catch {
    return ''
  }
}

/**
 * 当前商家展示名：从 user store info 读取 nickName / userName，避免使用 demo 占位名。
 */
export function getCurrentMerchantName(): string {
  try {
    const info = useUserStore().info as Partial<{ nickName: string; userName: string }>
    return info?.nickName || info?.userName || ''
  } catch {
    return ''
  }
}

/* ============ 套餐 CRUD ============ */

export function getAllPlans(): Promise<MemberPlan[]> {
  return request.get<MemberPlan[]>({ url: '/api/v1/p/member-plans' })
}

export function savePlan(
  plan: Partial<MemberPlan> & { id?: string }
): Promise<{ ok: true; plan: MemberPlan }> {
  // shape-adapted: 后端 POST /p/member-plans 同时处理新增/更新（按是否带 id 分支）
  return request
    .post<{ plan: MemberPlan } | MemberPlan>({
      url: '/api/v1/p/member-plans',
      data: plan
    })
    .then((res) => {
      const p = (res as any)?.plan ?? (res as MemberPlan)
      return { ok: true as const, plan: p as MemberPlan }
    })
}

export function removePlan(id: string): Promise<{ ok: true }> {
  return request
    .del<{ ok?: boolean }>({ url: `/api/v1/p/member-plans/${id}` })
    .then(() => ({ ok: true as const }))
}

/* ============ 订阅 ============ */

export function getCurrentSubscription(_merchantId?: string): Promise<Subscription | null> {
  // 商户端：当前登录商户的订阅（merchantId 由后端从 JWT 提取）
  return request
    .get<Subscription | null>({ url: '/api/v1/m/membership' })
    .catch(() => null)
}

export function getAllSubscriptions(): Promise<Subscription[]> {
  // TODO: no backend equivalent — 后端只暴露按 planId 查询；这里返回空数组占位
  return Promise.resolve([])
}

export function getSubscriptionsByPlan(planId: string): Promise<Subscription[]> {
  return request.get<Subscription[]>({
    url: `/api/v1/p/member-plans/${planId}/subscriptions`
  })
}

export interface SubscribeInput {
  planId: string
  merchantId?: string
  payMethod?: 'wechat' | 'alipay' | 'balance'
}

export interface SubscribeResponse {
  ok: true
  /** 非生产 + wxpay 未配齐 → mockPaid=true 已直接激活（仅本地预览） */
  mockPaid?: boolean
  /** 真实下单：支付单号，前端可轮询 paymentStatus(no) 查到账 */
  paymentNo?: string
  recordId?: string
  /** 真实下单：微信小程序 JSAPI 调起参数；admin-pc 在 PC Web 上无法直接使用，
   *  但需要返回让上层判断"请去手机商家 APP 完成支付" */
  miniPay?: {
    appId: string
    timeStamp: string
    nonceStr: string
    package: string
    signType: 'RSA' | 'MD5'
    paySign: string
  }
}

export function subscribePlan(input: SubscribeInput): Promise<SubscribeResponse> {
  return request
    .post<SubscribeResponse>({
      url: '/api/v1/m/membership/subscribe',
      data: { planId: input.planId, payMethod: input.payMethod }
    })
    .then((res) => ({
      ok: true as const,
      mockPaid: res?.mockPaid ?? false,
      paymentNo: res?.paymentNo,
      recordId: res?.recordId,
      miniPay: res?.miniPay
    }))
}

/** 轮询支付状态 —— 与 merchant-app 共用同一后端 */
export interface MembershipPaymentStatus {
  id: string
  no: string
  planName: string
  amount: number
  status: 'pending' | 'paid' | 'refunding' | 'refunded' | 'failed'
  paidAt?: string
  createdAt: string
}

export function getMembershipPaymentStatus(no: string): Promise<MembershipPaymentStatus> {
  return request.get<MembershipPaymentStatus>({
    url: `/api/v1/m/membership/payments/${no}/status`
  })
}

export function cancelSubscription(_merchantId?: string): Promise<{ ok: true }> {
  return request
    .post<{ ok?: boolean }>({ url: '/api/v1/m/membership/cancel' })
    .then(() => ({ ok: true as const }))
}

export function setAutoRenew(_merchantId: string, autoRenew: boolean): Promise<{ ok: true }> {
  return request
    .post<{ ok?: boolean }>({
      url: '/api/v1/m/membership/auto-renew',
      data: { autoRenew }
    })
    .then(() => ({ ok: true as const }))
}

/* ============ 配额 ============ */

export function getQuota(_merchantId?: string): Promise<UsageQuota | null> {
  return request
    .get<UsageQuota | null>({ url: '/api/v1/m/membership/quota' })
    .catch(() => null)
}

export type QuotaKey = 'pushSlots' | 'bannerLimit' | 'impressionLimit'

export function useQuota(
  key: QuotaKey,
  count = 1,
  _merchantId?: string
): Promise<{ ok: boolean; reason?: string; quota?: UsageQuota }> {
  return request
    .post<{ ok: boolean; reason?: string; quota?: UsageQuota }>({
      url: '/api/v1/m/membership/quota/use',
      data: { key, count }
    })
    .catch(() => ({ ok: false, reason: '配额接口不可用' }))
}

export function releaseQuota(
  key: QuotaKey,
  count = 1,
  _merchantId?: string
): Promise<{ ok: true; quota?: UsageQuota }> {
  return request
    .post<{ quota?: UsageQuota }>({
      url: '/api/v1/m/membership/quota/release',
      data: { key, count }
    })
    .then((res) => ({ ok: true as const, quota: res?.quota }))
    .catch(() => ({ ok: true as const }))
}

export function quotaLabelOf(k: QuotaKey): string {
  return ({ pushSlots: '选品广场推送位', bannerLimit: '首屏 Banner', impressionLimit: '月曝光' } as const)[k]
}

/* ============ 缴费记录 ============ */

export function getPayments(filter?: {
  merchantId?: string
  status?: PaymentRecord['status']
}): Promise<PaymentRecord[]> {
  // 平台端列表（带过滤参数）；后端忽略未识别参数即可
  return request.get<PaymentRecord[]>({
    url: '/api/v1/p/member-pay-orders',
    params: filter || {}
  })
}

export function updatePaymentStatus(
  id: string,
  status: PaymentRecord['status']
): Promise<{ ok: true }> {
  return request
    .request<{ ok?: boolean }>({
      url: `/api/v1/p/member-pay-orders/${id}/status`,
      method: 'PATCH',
      data: { status }
    })
    .then(() => ({ ok: true as const }))
}

/* ============ 反馈到商家 (Notice) ============ */

export interface MembershipNotice {
  level: 'info' | 'warning' | 'danger'
  title: string
  desc: string
  cta?: { label: string; to: string }
}

/**
 * 商家 dashboard 顶部用：优先取后端聚合结果；失败则前端依据订阅+配额本地拼装。
 */
export async function getMembershipNotices(merchantId?: string): Promise<MembershipNotice[]> {
  try {
    const list = await request.get<MembershipNotice[]>({
      url: '/api/v1/m/membership/notices'
    })
    if (Array.isArray(list)) return list
  } catch {
    /* 回退本地计算 */
  }

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
  // TODO: no backend equivalent — 后端不需要本地状态清理
  try {
    localStorage.removeItem('jj_member_state_v1')
  } catch {
    /* ignore */
  }
}
