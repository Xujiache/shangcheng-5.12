/**
 * 订单 / 支付 / 售后
 */
import type { BaseEntity, ID } from './common'

/** 订单状态 */
export type OrderStatus =
  | 'pending_payment' // 待付款
  | 'pending_shipment' // 待发货
  | 'shipped' // 已发货
  | 'completed' // 已完成
  | 'cancelled' // 已取消
  | 'after_sale' // 售后中
  | 'refunded' // 已退款

/** 配送方式 */
export type ShippingMethod = 'factory' | 'local' | 'pickup'

/** 支付方式 */
export type PaymentMethod = 'wechat' | 'balance'

/** 收货地址 */
export interface Address extends BaseEntity {
  userId: ID
  name: string
  phone: string
  region: string
  detail: string
  longitude?: number
  latitude?: number
  isDefault: boolean
}

/** 订单 */
export interface Order extends BaseEntity {
  /** 订单号 */
  no: string
  userId: ID
  merchantId: ID
  status: OrderStatus
  totalAmount: number
  discountAmount: number
  shippingFee: number
  payAmount: number
  paymentMethod?: PaymentMethod
  shippingMethod: ShippingMethod
  /** 收货地址快照 */
  address: Omit<Address, keyof BaseEntity>
  remark?: string
  /** 优惠券快照 */
  couponId?: ID
  couponDiscount?: number
  /** 物流单号 */
  trackingNumber?: string
  trackingCompany?: string
  /** 时间节点 */
  paidAt?: string
  shippedAt?: string
  completedAt?: string
  cancelledAt?: string
  /** 倒计时（待付款时使用，单位秒） */
  expiresIn?: number
  items?: OrderItem[]
}

/** 订单项 */
export interface OrderItem extends BaseEntity {
  orderId: ID
  productId: ID
  skuId: ID
  /** 商品快照 */
  productName: string
  productImage: string
  specsLabel: string
  unitPrice: number
  quantity: number
}

/** 支付记录 */
export interface Payment extends BaseEntity {
  orderId: ID
  method: PaymentMethod
  amount: number
  status: 'pending' | 'success' | 'failed'
  wxTransactionId?: string
  paidAt?: string
  refundedAt?: string
  refundAmount?: number
}

/** 创建订单 DTO */
export interface OrderCreateDto {
  items: { skuId: ID; quantity: number }[]
  addressId: ID
  couponId?: ID
  remark?: string
  shippingMethod: ShippingMethod
}

/** 售后类型 */
export type RefundType = 'refund_only' | 'refund_with_return'

/** 售后状态 */
export type RefundStatus = 'pending' | 'agreed' | 'rejected' | 'in_progress' | 'completed'

/** 售后单 */
export interface Refund extends BaseEntity {
  no: string
  orderId: ID
  orderItemId: ID
  userId: ID
  merchantId: ID
  type: RefundType
  reason: string
  description?: string
  evidence: string[]
  applyAmount: number
  refundAmount?: number
  status: RefundStatus
  /** 商家处理意见 */
  merchantReply?: string
  /** 退货地址 */
  returnAddress?: string
  completedAt?: string
}

/** 售后申请 DTO */
export interface RefundCreateDto {
  orderItemId: ID
  type: RefundType
  reason: string
  description?: string
  evidence: string[]
  applyAmount: number
}

/** 一键识别地址 */
export interface ParseAddressDto {
  text: string
}

export interface ParsedAddress {
  name?: string
  phone?: string
  region?: string
  detail?: string
}
