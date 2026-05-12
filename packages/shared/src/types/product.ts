/**
 * 商品 / SKU / 分类
 */
import type { BaseEntity, ID } from './common'

/** 分类 */
export interface Category extends BaseEntity {
  parentId: ID | null
  name: string
  icon?: string
  sort: number
  type: 'platform' | 'merchant'
  merchantId?: ID
  children?: Category[]
}

/** 商品状态 */
export type ProductStatus = 'draft' | 'auditing' | 'active' | 'offline' | 'rejected'

/** 商品 */
export interface Product extends BaseEntity {
  merchantId: ID
  /** 平台分类 ID */
  categoryId: ID
  /** 厂家自定义分类（可选） */
  merchantCategoryId?: ID
  name: string
  description?: string
  /** 主图 + 详情图 */
  images: string[]
  /** 富文本详情 */
  detailHtml?: string
  tags: string[]
  /** 价格区间（来自 SKU 聚合） */
  priceRetailMin: number
  priceRetailMax: number
  priceWholesaleMin?: number
  priceWholesaleMax?: number
  priceMemberMin?: number
  priceMemberMax?: number
  status: ProductStatus
  /** 库存总和 */
  totalStock: number
  /** 销量 */
  sales: number
  /** 评论数 */
  commentCount: number
  /** 物流方式 */
  shipping: ('factory' | 'local' | 'pickup')[]
  /** 价格显示规则 */
  priceDisplayRules: PriceDisplayRule
  rejectReason?: string
  autoApproved?: boolean
}

/** 价格显示规则（每商品独立配置）*/
export interface PriceDisplayRule {
  /** 未登录是否显示 */
  guestVisible: boolean
  /** 普通客户显示什么 */
  customerTier: 'retail' | 'hidden'
  /** 已授权门店显示什么 */
  storeTier: 'wholesale' | 'retail'
  /** 会员显示什么 */
  memberTier: 'member' | 'retail'
}

/** SKU */
export interface SKU extends BaseEntity {
  productId: ID
  /** 规格组合，如 {size:"1.4m", color:"橡木"} */
  specs: Record<string, string>
  /** 规格摘要 */
  specsLabel: string
  priceWholesale: number
  priceRetail: number
  priceMember: number
  stock: number
  /** 是否上架（单 SKU 控制） */
  active: boolean
}

/** 门店代理商品关系 */
export interface StoreProductAgent extends BaseEntity {
  storeId: ID
  productId: ID
  /** 加价百分比 */
  markupPercent: number
  /** 价格自动同步开关 */
  autoSyncPrice: boolean
  status: 'pending' | 'active' | 'cancelled'
}

/** 收藏 */
export interface Favorite extends BaseEntity {
  userId: ID
  productId: ID
}

/** 购物车 */
export interface CartItem extends BaseEntity {
  userId: ID
  skuId: ID
  quantity: number
  /** 关联 product 信息（前端展示用） */
  product?: Product
  sku?: SKU
}

/** 添加商品 DTO */
export interface ProductCreateDto {
  categoryId: ID
  merchantCategoryId?: ID
  name: string
  description?: string
  images: string[]
  detailHtml?: string
  tags: string[]
  shipping: ('factory' | 'local' | 'pickup')[]
  priceDisplayRules: PriceDisplayRule
  skus: Omit<SKU, keyof BaseEntity | 'productId'>[]
}
