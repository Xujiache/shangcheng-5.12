/**
 * 商家 / 门店 / 员工
 */
import type { BaseEntity, ID } from './common'

/** 商家类型 */
export type MerchantType = 'factory' | 'store'

/** 商家状态 */
export type MerchantStatus = 'pending' | 'active' | 'rejected' | 'disabled'

/** 商家等级 */
export type MerchantLevel = 'A' | 'B' | 'C'

/** 商家信用 */
export type CreditLevel = 'A' | 'B' | 'C' | 'D'

/** 商家实体 */
export interface Merchant extends BaseEntity {
  userId: ID
  type: MerchantType
  name: string
  /** 主体公司名 */
  legalName: string
  /** 统一社会信用代码 */
  creditCode: string
  /** 法人 */
  legalRep: string
  contact: string
  contactPhone: string
  region: string
  address: string
  businessLicense: string
  qualifications: string[]
  /** 经营品类 */
  categories: string[]
  status: MerchantStatus
  level?: MerchantLevel
  credit?: CreditLevel
  /** 历史驳回率 */
  rejectRate?: number
  /** 累计 GMV */
  totalGmv?: number
  /** 试用结束 */
  trialEndAt?: string
  rejectReason?: string
}

/** 商家入驻申请 */
export interface MerchantApplyDto {
  type: MerchantType
  legalName: string
  creditCode: string
  legalRep: string
  contact: string
  contactPhone: string
  region: string
  address: string
  businessLicense: string
  qualifications: string[]
  categories: string[]
}

/** 门店 */
export interface Store extends BaseEntity {
  merchantId: ID
  name: string
  contact: string
  phone: string
  region: string
  address: string
  longitude?: number
  latitude?: number
  level: MerchantLevel
  status: 'active' | 'pending' | 'cancelled'
  /** 授权有效期 */
  authValidFrom?: string
  authValidTo?: string
}

/** 门店授权配置 */
export interface StoreAuth {
  storeId: ID
  level: MerchantLevel
  /** 可见价格类型 */
  visiblePriceTiers: PriceTier[]
  /** 可上架商品 + 加价规则 */
  productPolicies: {
    categoryId: ID
    enabled: boolean
    markupPercent: number
  }[]
  authValidFrom: string
  authValidTo: string
}

/** 员工 */
export interface Staff extends BaseEntity {
  merchantId: ID
  name: string
  phone: string
  role: 'sales' | 'cs' | 'manager'
  status: 'active' | 'left'
  permissions: string[]
  /** 当月业绩 */
  monthlyPerformance?: number
}

/** 价格分级 */
export type PriceTier = 'wholesale' | 'retail' | 'member' | 'original'

/** 客户价格权限 */
export interface CustomerPriceTier {
  userId: ID
  merchantId: ID
  visiblePriceTiers: PriceTier[]
  /** 是否分佣客户 */
  promoter: boolean
}

/** 店铺装修配置 */
export interface ShopDecorate {
  merchantId: ID
  themeColor: string
  fontStyle: 'modern' | 'elegant' | 'playful' | 'minimal'
  banners: { image: string; link?: string }[]
  productLayout: 'waterfall' | 'twoColumn' | 'singleLarge'
}
