/**
 * 客户管理 / 佣金 服务
 *
 * 提现处理已下沉到平台端(/p/withdraws);商家端的 /m/withdraws/:id/review
 * 与 /m/withdraws/:id/reject 已在后端标记 @deprecated。本端不再保留提现审核
 * 入口及对应 withdrawService —— 商家不应自审提现。
 */
import { http } from '../utils/request'
import type { Pagination } from '@jiujiu/shared/types'

export interface MerchantCustomer {
  id: string
  nickname: string
  avatar: string
  phone: string
  /** 客户类型 */
  kind: 'normal' | 'promoter' | 'member'
  /** 价格层级 */
  priceTier: 'retail' | 'wholesale' | 'member'
  orderCount: number
  totalSpent: number
  lastOrderAt: string
  priceAuthorized: boolean
  commissionEnabled: boolean
  groupTag: string
}

export const customerService = {
  list(params: { kind?: string; keyword?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<MerchantCustomer>>('/api/v1/m/customers', params)
  },
  setPriceTier(id: string, priceTier: string) {
    return http.post<{ ok: boolean }>(`/api/v1/m/customers/${id}/price-tier`, { priceTier })
  },
  authorize(id: string, on: boolean) {
    return http.post<{ ok: boolean }>(`/api/v1/m/customers/${id}/authorize`, { on })
  },
}

export interface CommissionRuleDefault {
  level1Percent: number
  level2Percent: number
  visibleToPromoter: boolean
  allowOffline: boolean
  enabled: boolean
}
export interface ProductCommissionRule {
  productId: string
  productName: string
  productImage: string
  level1Percent: number
  level2Percent: number
}
export interface CommissionRuleBundle {
  default: CommissionRuleDefault
  productRules: ProductCommissionRule[]
}

export const commissionService = {
  getRules() {
    return http.get<CommissionRuleBundle>('/api/v1/m/commission/rules')
  },
  saveRules(data: Partial<CommissionRuleBundle>) {
    return http.post<{ ok: boolean }>('/api/v1/m/commission/rules', data as Record<string, unknown>)
  },
}
