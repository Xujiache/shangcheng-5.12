/**
 * 营销 · 优惠券 / 限时购 / 团购
 */
import type { BaseEntity, ID } from './common'

/** 优惠券类型 */
export type CouponType = 'fullReduce' | 'discount' | 'fixed'

/** 优惠券状态 */
export type CouponStatus = 'pending' | 'active' | 'paused' | 'ended'

/** 优惠券 */
export interface Coupon extends BaseEntity {
  merchantId: ID
  name: string
  type: CouponType
  /** 面额（满减/固定金额） */
  amount?: number
  /** 折扣（0-100，仅 type=discount） */
  discountPercent?: number
  /** 使用门槛 */
  threshold?: number
  /** 库存 */
  stock: number
  /** 已领 */
  received: number
  /** 已用 */
  used: number
  validFrom: string
  validTo: string
  /** 限领次数（per user） */
  perUserLimit: number
  /** 适用范围 */
  scope: 'all' | 'category' | 'product'
  scopeIds?: ID[]
  status: CouponStatus
}

/** 限时购 */
export interface FlashSale extends BaseEntity {
  merchantId: ID
  productId: ID
  skuId?: ID
  price: number
  stock: number
  sold: number
  startAt: string
  endAt: string
  status: CouponStatus
}

/** 团购 */
export interface GroupBuy extends BaseEntity {
  merchantId: ID
  productId: ID
  skuId?: ID
  /** 成团人数 */
  groupSize: number
  price: number
  /** 团购有效期（小时） */
  validHours: number
  status: CouponStatus
}

/** 量尺预约 */
export interface Booking extends BaseEntity {
  userId: ID
  contactName: string
  contactPhone: string
  address: string
  scheduledAt: string
  /** 空间类型 */
  spaceTypes: string[]
  remark?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  merchantId?: ID
  assignedStaffId?: ID
}
