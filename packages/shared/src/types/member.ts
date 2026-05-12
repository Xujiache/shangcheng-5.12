/**
 * 会员套餐 / 广告推送套餐 / 增值单项 / 缴费订单
 */
import type { BaseEntity, ID } from './common'

/** 套餐类型 */
export type MemberPlanType = 'basic' | 'ad' | 'addon'

/** 套餐周期 */
export type MemberPlanPeriod = 'monthly' | 'yearly' | 'weekly' | 'daily' | 'oneoff'

/** 套餐 */
export interface MemberPlan extends BaseEntity {
  type: MemberPlanType
  code: string
  name: string
  price: number
  /** 原价（展示删除线用） */
  originalPrice?: number
  period: MemberPlanPeriod
  /** 周期数（如 12 个月） */
  periodCount?: number
  /** 是否最热 */
  hot?: boolean
  /** 权益列表（rich text 或结构化） */
  rights: string[]
  /** 限制条件（仅广告推送套餐） */
  constraints?: {
    pushSlots?: number // 推送位数
    weightLimit?: number // 权重上限
    bannerLimit?: number // 首屏 Banner 数
    impressionLimit?: number // 月曝光上限
  }
  /** 试用天数（仅基础套餐） */
  trialDays?: number
  status: 'active' | 'disabled'
  sort: number
}

/** 商家订阅记录（基础套餐） */
export interface MerchantMembership extends BaseEntity {
  merchantId: ID
  planId: ID
  planCode: string
  startAt: string
  endAt: string
  /** 状态 */
  status: 'trial' | 'active' | 'expired'
  autoRenew?: boolean
}

/** 商家广告推送套餐订阅 */
export interface MerchantAdPlan extends BaseEntity {
  merchantId: ID
  planId: ID
  planCode: string
  startAt: string
  endAt: string
  status: 'active' | 'expired'
  /** 本期已使用 */
  usage?: {
    usedSlots: number
    usedBanners: number
    usedImpressions: number
  }
}

/** 缴费订单 */
export interface PayOrder extends BaseEntity {
  no: string
  merchantId: ID
  planId: ID
  planName: string
  planType: MemberPlanType
  amount: number
  paymentMethod: 'wechat' | 'bank'
  status: 'pending' | 'paid' | 'refunding' | 'refunded' | 'failed'
  paidAt?: string
}

/** 订阅套餐 DTO */
export interface SubscribePlanDto {
  planId: ID
  /** 自动续费 */
  autoRenew?: boolean
}
