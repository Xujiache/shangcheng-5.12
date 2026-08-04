/**
 * 价格分级工具：根据用户角色 + 商品价格显示规则，返回应显示的价格
 */
import type { PriceDisplayRule, SKU } from '../types/product'
import type { UserRole } from '../types/auth'
import type { PriceTier } from '../types/merchant'

/** 计算应展示的价格 */
export interface PriceDisplay {
  /** 是否可见 */
  visible: boolean
  /** 应该展示的价格 */
  price: number | null
  /** 价格类型（用于颜色/标签） */
  tier: PriceTier | null
  /** 兜底提示文字 */
  fallback?: string
}

/** 角色：未登录 | 普通客户 | 门店(已授权) | 会员 */
export type ViewerKind = 'guest' | 'customer' | 'store_authorized' | 'member'

/** 根据规则和角色计算应展示价格 */
export function resolveDisplayPrice(
  rule: PriceDisplayRule,
  sku: Pick<SKU, 'priceRetail' | 'priceWholesale' | 'priceMember'>,
  viewer: ViewerKind,
): PriceDisplay {
  if (viewer === 'guest') {
    return rule.guestVisible
      ? { visible: true, price: sku.priceRetail, tier: 'retail' }
      : { visible: false, price: null, tier: null, fallback: '登录可见' }
  }

  if (viewer === 'store_authorized') {
    if (rule.storeTier === 'wholesale') {
      return { visible: true, price: sku.priceWholesale, tier: 'wholesale' }
    }
    return { visible: true, price: sku.priceRetail, tier: 'retail' }
  }

  if (viewer === 'member') {
    if (rule.memberTier === 'member') {
      return { visible: true, price: sku.priceMember, tier: 'member' }
    }
    return { visible: true, price: sku.priceRetail, tier: 'retail' }
  }

  // 普通客户
  if (rule.customerTier === 'hidden') {
    return { visible: false, price: null, tier: null, fallback: '申请门店可见' }
  }
  return { visible: true, price: sku.priceRetail, tier: 'retail' }
}

/** 根据用户角色映射为 ViewerKind */
export function roleToViewer(opts: {
  role?: UserRole | null
  isAuthorizedStore?: boolean
  isMember?: boolean
}): ViewerKind {
  if (!opts.role) return 'guest'
  if (opts.role === 'store' && opts.isAuthorizedStore) return 'store_authorized'
  if (opts.isMember) return 'member'
  return 'customer'
}

/** 价格分级标签颜色映射 */
export const PRICE_TIER_COLOR: Record<PriceTier, string> = {
  retail: '#FF4D2D',
  wholesale: '#1677FF',
  member: '#722ED1',
  original: '#86909C',
}

/** 价格分级标签名 */
export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  retail: '零售价',
  wholesale: '批发价',
  member: '会员价',
  original: '原价',
}
