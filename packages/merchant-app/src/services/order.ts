/**
 * 订单 / 售后 服务
 */
import { http } from '../utils/request'
import type { Order, Refund, Pagination, ParsedAddress } from '@jiujiu/shared/types'

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
