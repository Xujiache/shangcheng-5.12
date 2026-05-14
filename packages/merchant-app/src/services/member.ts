/**
 * 会员套餐服务（v2 · 接入真实后端 + 自动算剩余天数）
 *
 * 后端端点：
 *  - GET  /api/v1/m/membership/plans       套餐列表
 *  - GET  /api/v1/m/membership             当前订阅（含 plan）
 *  - GET  /api/v1/m/membership/quota       本月配额
 *  - GET  /api/v1/m/membership/payments    历史支付记录
 *  - GET  /api/v1/m/membership/notices     额度告警
 *  - POST /api/v1/m/membership/subscribe   订阅 {planId, payMethod}
 *  - POST /api/v1/m/membership/cancel      取消订阅
 *  - POST /api/v1/m/membership/auto-renew  自动续费 {autoRenew}
 */
import { http } from '../utils/request'
import type { MemberPlan } from '@jiujiu/shared/types'
import { daysUntil, daysBetween, nowBeijing } from '@jiujiu/shared/utils'

export interface MembershipInfo {
  id: string
  merchantId: string
  planId: string
  planCode: string
  startAt: string
  endAt: string
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  autoRenew: boolean
  plan?: MemberPlan
}

export interface MembershipView extends MembershipInfo {
  /** 剩余天数（北京时间口径，<=0 为过期/今日到期） */
  remainingDays: number
  /** 套餐总天数 */
  totalDays: number
  /** 用过百分比 0-100 */
  usedPercent: number
  /** 是否即将过期（7 天内） */
  expiringSoon: boolean
}

export interface UsageQuota {
  id: string
  merchantId: string
  periodStart: string
  periodEnd: string
  pushSlotsLimit: number
  pushSlotsUsed: number
  bannerLimit: number
  bannerUsed: number
  impressionLimit: number
  impressionUsed: number
}

export interface PaymentRecord {
  id: string
  no: string
  planName: string
  planType: string
  amount: number
  paymentMethod: string
  status: 'pending' | 'paid' | 'refunded' | 'failed'
  paidAt?: string
  createdAt: string
}

/** subscribe() 返回值 —— 真实下单链路 */
export interface SubscribeResult {
  ok: boolean
  /** 非生产 + wxpay 未配齐 → mockPaid=true 已直接激活；否则需要走真实支付 */
  mockPaid?: boolean
  /** 支付单号（用于轮询状态） */
  paymentNo: string
  /** PaymentRecord id */
  recordId: string
  /** 微信小程序 uni.requestPayment 所需的全部字段（mockPaid=true 时不返回） */
  miniPay?: {
    appId: string
    timeStamp: string
    nonceStr: string
    package: string
    signType: 'RSA' | 'MD5'
    paySign: string
  }
}

export interface PaymentStatusVO {
  id: string
  no: string
  planName: string
  amount: number
  status: 'pending' | 'paid' | 'refunding' | 'refunded' | 'failed'
  paidAt?: string
  createdAt: string
}

export const memberService = {
  /** 拉取会员/广告/增值 全套餐 */
  getPlans() {
    return http.get<MemberPlan[]>('/api/v1/m/membership/plans')
  },

  /** 当前订阅信息（含计算后的剩余天数 / 进度等视图字段） */
  async myMembership(): Promise<MembershipView | null> {
    const m = await http.get<MembershipInfo | null>('/api/v1/m/membership')
    if (!m) return null
    const remainingDays = daysUntil(m.endAt)
    const totalDays = daysBetween(m.startAt, m.endAt)
    const usedDays = Math.max(0, totalDays - Math.max(0, remainingDays))
    const usedPercent = totalDays > 0 ? Math.min(100, Math.round((usedDays / totalDays) * 100)) : 0
    return {
      ...m,
      remainingDays,
      totalDays,
      usedPercent,
      expiringSoon: remainingDays > 0 && remainingDays <= 7,
    }
  },

  /** 本月配额使用情况 */
  quota() {
    return http.get<UsageQuota>('/api/v1/m/membership/quota')
  },

  /** 支付历史 */
  payments() {
    return http.get<PaymentRecord[]>('/api/v1/m/membership/payments')
  },

  /** 配额告警 */
  notices() {
    return http.get<{ type: string; text: string; link?: string }[]>('/api/v1/m/membership/notices')
  },

  /** 创建订阅订单：后端会写 PaymentRecord(pending) 并返回 wxpay miniPay 参数 */
  subscribe(planId: string, payMethod: 'wechat' | 'alipay' | 'balance' = 'wechat') {
    return http.post<SubscribeResult>('/api/v1/m/membership/subscribe', { planId, payMethod })
  },

  /** 轮询某笔订单是否已被微信回调激活（真实下单链路用） */
  paymentStatus(no: string) {
    return http.get<PaymentStatusVO>(`/api/v1/m/membership/payments/${no}/status`)
  },

  /** 取消订阅 */
  cancel() {
    return http.post<{ ok: boolean }>('/api/v1/m/membership/cancel')
  },

  /** 切换自动续费 */
  setAutoRenew(autoRenew: boolean) {
    return http.post<{ ok: boolean }>('/api/v1/m/membership/auto-renew', { autoRenew })
  },
}
