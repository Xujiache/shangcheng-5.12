/**
 * 商家个人信息（merchant profile）+ 店铺价格显示规则
 *
 * 路由：
 *   GET    /api/v1/m/profile
 *   PATCH  /api/v1/m/profile
 *   GET    /api/v1/m/shop/price-rule
 *   PUT    /api/v1/m/shop/price-rule
 */
import { http } from '../utils/request'

export interface MerchantProfile {
  shopName: string
  merchantNo: string
  contactName: string
  contactPhone: string
  email: string
  categories: string[]
  address: string
  description: string
  legalName?: string
  creditCode?: string
  region?: string
  level?: string
  credit?: string
  status?: string
  type?: string
}

export interface ShopPriceRule {
  guestAllow: boolean
  customerPrice: 'retail' | 'hidden'
  agencyPrice: 'wholesale' | 'retail'
  memberPrice: 'member' | 'retail'
}

export const profileService = {
  get(): Promise<MerchantProfile> {
    return http.get<MerchantProfile>('/api/v1/m/profile')
  },
  update(patch: Partial<MerchantProfile>): Promise<MerchantProfile> {
    return http.patch<MerchantProfile>('/api/v1/m/profile', patch)
  },
  getPriceRule(): Promise<ShopPriceRule> {
    return http.get<ShopPriceRule>('/api/v1/m/shop/price-rule')
  },
  setPriceRule(patch: Partial<ShopPriceRule>): Promise<ShopPriceRule> {
    return http.put<ShopPriceRule>('/api/v1/m/shop/price-rule', patch)
  },
}
