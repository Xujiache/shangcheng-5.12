/**
 * 订单 / 售后 服务
 */
import { http } from '../utils/request'
import type { Order, Refund, Pagination, ParsedAddress } from '@jiujiu/shared/types'

/** 订单分享字段白名单 */
export type ShareField = 'basics' | 'customer' | 'pricing' | 'items' | 'extra'

export interface OrderShareConfig {
  orderId: string
  merchantId: string
  visibleFields: ShareField[]
  expiresAt: string | null
  intro?: string
  viewCount: number
  revoked: boolean
  createdAt: string
}

export interface CreateShareResult {
  shareCode: string
  orderNo: string
  expiresAt: string | null
  visibleFields: ShareField[]
  intro?: string
}

export const orderService = {
  list(params: { status?: string; keyword?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Order>>('/api/v1/m/orders', params)
  },
  detail(id: string) {
    return http.get<Order>(`/api/v1/m/orders/${id}`)
  },
  ship(id: string, data: { company: string; trackingNumber: string }) {
    return http.post<{ ok: boolean }>(`/api/v1/m/orders/${id}/ship`, data)
  },
  parseAddress(text: string) {
    return http.post<ParsedAddress>('/api/v1/m/orders/parse-address', { text })
  },

  /**
   * 创建/重建订单分享链接
   * @param id 订单 id
   * @param dto.visibleFields 5 个字段勾选(basics/customer/pricing/items/extra)
   * @param dto.expiresInDays 0 = 永久,>0 = N 天后过期
   * @param dto.intro 微信分享卡片自定义简介(40 字内)
   */
  createShare(
    id: string,
    dto: {
      visibleFields: ShareField[]
      expiresInDays?: number
      intro?: string
    },
  ) {
    return http.post<CreateShareResult>(`/api/v1/m/orders/${id}/share`, dto as any)
  },

  /** 查询该订单当前生效的分享(编辑表单回显用) */
  getCurrentShare(id: string) {
    return http.get<{ shareCode: string; config: OrderShareConfig } | null>(
      `/api/v1/m/orders/${id}/share/current`,
    )
  },

  /** 商家提前撤销分享,链接立即失效 */
  revokeShare(id: string) {
    return http.post<{ ok: boolean; revoked: boolean }>(`/api/v1/m/orders/${id}/share/revoke`)
  },
}

export const refundService = {
  list(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Refund>>('/api/v1/m/refunds', params)
  },
  agree(id: string, refundAmount?: number) {
    return http.post<{ ok: boolean }>(`/api/v1/m/refunds/${id}/agree`, { refundAmount })
  },
  reject(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/m/refunds/${id}/reject`, { reason })
  },
}
