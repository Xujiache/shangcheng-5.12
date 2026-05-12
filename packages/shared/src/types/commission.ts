/**
 * 佣金 / 提现
 */
import type { BaseEntity, ID } from './common'

/** 佣金规则 */
export interface CommissionRule extends BaseEntity {
  merchantId: ID
  /** 商品级别（不填则为全店通用） */
  productId?: ID
  /** 一级佣金（推广者）% */
  level1Percent: number
  /** 二级佣金（推广者的上级）% */
  level2Percent: number
  /** 是否对分佣客户可见 */
  visibleToPromoter: boolean
  /** 允许线下结算 */
  allowOffline: boolean
  enabled: boolean
}

/** 佣金记录 */
export interface Commission extends BaseEntity {
  orderId: ID
  userId: ID
  /** 一级 or 二级 */
  level: 1 | 2
  amount: number
  status: 'pending' | 'settled' | 'cancelled'
  settledAt?: string
}

/** 提现申请 */
export interface Withdraw extends BaseEntity {
  no: string
  userId: ID
  /** 申请金额 */
  applyAmount: number
  /** 实际金额（商家可调整）*/
  actualAmount: number
  /** 调整备注 */
  remark?: string
  /** 备注标签（扣减税费 / 非订单佣金 / 客户违规 / 自定义） */
  remarkTags?: string[]
  /** 提现方式 */
  method: 'wechat' | 'bank' | 'alipay'
  /** 收款账号 */
  account?: string
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'failed'
  reviewedBy?: ID
  reviewedAt?: string
  paidAt?: string
}

/** 提现申请 DTO */
export interface WithdrawApplyDto {
  amount: number
  method: 'wechat' | 'bank' | 'alipay'
  account?: string
}

/** 商家审核提现 DTO */
export interface WithdrawReviewDto {
  /** 调整后的实际金额（可与申请金额不同） */
  actualAmount: number
  remark?: string
  remarkTags?: string[]
}

/** 推广概览 */
export interface PromoteSummary {
  totalCommission: number
  monthCommission: number
  pendingCommission: number
  promotedUsers: number
  promotedOrders: number
  conversionRate: number
}
