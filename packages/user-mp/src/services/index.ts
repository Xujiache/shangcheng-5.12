/**
 * 用户端服务聚合
 */
import { http } from '../utils/request'
import type { Product, Category, Pagination, UserSession, Order } from '@jiujiu/shared/types'

// ============ 商品 ============
export const productService = {
  list(params: { keyword?: string; categoryId?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Product>>('/api/v1/u/products', params)
  },
  detail(id: string, options?: { silent?: boolean }) {
    return http.get<Product & { skus: any[] }>(`/api/v1/u/products/${id}`, undefined, options)
  },
}

// ============ 分类 ============
export const categoryService = {
  list() {
    return http.get<Category[]>('/api/v1/u/categories')
  },
}

// ============ 订单 ============
export const orderService = {
  list(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Order>>('/api/v1/u/orders', params)
  },
  detail(id: string) {
    return http.get<Order>(`/api/v1/u/orders/${id}`)
  },
  create(dto: Record<string, unknown>) {
    return http.post<{ orderId: string; orderNo: string; payAmount: number }>('/api/v1/u/orders', dto)
  },
  pay(id: string, method: string) {
    return http.post<{
      ok: boolean
      mockPaid?: boolean
      miniPay?: {
        appId: string
        timeStamp: string
        nonceStr: string
        package: string
        signType: 'RSA' | 'MD5'
        paySign: string
      }
    }>(`/api/v1/u/orders/${id}/pay`, { method })
  },
  confirm(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/u/orders/${id}/confirm`)
  },
  cancel(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/u/orders/${id}/cancel`)
  },
  urge(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/u/orders/${id}/urge`)
  },
}

// ============ 横幅 ============
export interface Banner {
  id: string
  image: string
  title: string
  link?: string
}
export const bannerService = {
  list() {
    return http.get<Banner[]>('/api/v1/u/banners')
  },
}

// ============ 地址 ============
export interface Address {
  id: string
  name: string
  phone: string
  region: string
  detail: string
  isDefault: boolean
}
export const addressService = {
  list() {
    return http.get<Address[]>('/api/v1/u/addresses')
  },
  defaultAddress() {
    return http.get<Address>('/api/v1/u/addresses/default')
  },
  create(data: Partial<Address>) {
    return http.post<Address>('/api/v1/u/addresses', data as Record<string, unknown>)
  },
  update(id: string, data: Partial<Address>) {
    return http.put<Address>(`/api/v1/u/addresses/${id}`, data as Record<string, unknown>)
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/u/addresses/${id}`)
  },
}

// ============ 收藏 ============
export interface Favorite {
  id: string
  productId: string
  name: string
  image: string
  price: number
}
export const favoriteService = {
  list() {
    return http.get<Favorite[]>('/api/v1/u/favorites')
  },
  add(productId: string) {
    return http.post<{ ok: boolean }>('/api/v1/u/favorites', { productId })
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/u/favorites/${id}`)
  },
}

/** 优惠券（用户端可领取/可用列表）—— 走 /u/coupons，禁止跨域调 /m/* */
export const couponService = {
  list() {
    return http.get<{ list: Coupon[]; total: number }>('/api/v1/u/coupons')
  },
}

export interface Coupon {
  id: string
  name: string
  type: 'fullReduce' | 'discount' | 'fixed'
  amount?: number
  discountPercent?: number
  threshold?: number
  stock: number
  validFrom: string
  validTo: string
  status: string
}

// ============ 预约量尺 ============
export interface Booking {
  name: string
  phone: string
  address: string
  appointAt: string
  space: string
  remark?: string
}
export const bookingService = {
  submit(dto: Booking) {
    return http.post<{ ok: boolean; ticketId: string }>('/api/v1/u/booking', dto as unknown as Record<string, unknown>)
  },
}

// ============ 推广分佣 ============
export const promoteService = {
  summary() {
    return http.get<{ total: number; thisMonth: number; pending: number; people: number; orderCount: number; conversion: number }>('/api/v1/u/promote/summary')
  },
  orders() {
    return http.get<Pagination<{ id: string; orderNo: string; amount: number; createdAt: string }>>('/api/v1/u/promote/orders')
  },
}

// ============ 门店地图 ============
export interface NearbyStore {
  id: string
  name: string
  address: string
  distance: number
  phone: string
  lat: number
  lng: number
}
export const storeMapService = {
  nearby() {
    return http.get<NearbyStore[]>('/api/v1/u/stores/nearby')
  },
}

// ============ 入驻 ============
export const merchantApplyService = {
  submit(dto: Record<string, unknown>) {
    return http.post<{ ok: boolean; applyId: string }>('/api/v1/u/merchant-apply', dto)
  },
}

// ============ 认证 ============
export const authService = {
  wechatLogin(payload?: { code?: string }) {
    return http.post<UserSession>('/api/v1/auth/wechat-login', payload ?? {})
  },
  phoneLogin(payload: { phone: string; code: string }) {
    return http.post<UserSession>('/api/v1/auth/phone-login', payload)
  },
  sendSmsCode(phone: string) {
    return http.post<{ ok: boolean }>('/api/v1/auth/sms-code', { phone })
  },
}
