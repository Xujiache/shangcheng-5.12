/**
 * 门店 / 员工 / 店铺装修 / 营销 / 客服 / 选品广场 服务
 */
import { http } from '../utils/request'
import type { Store, Staff, Pagination } from '@jiujiu/shared/types'

export interface StoreAuthConfig {
  storeId: string
  level: 'A' | 'B' | 'C'
  visiblePriceTiers: ('wholesale' | 'retail' | 'member')[]
  productPolicies: { categoryId: string; enabled: boolean; markupPercent: number }[]
  authValidFrom: string
  authValidTo: string
}

export const storeService = {
  list(params: { keyword?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Store>>('/api/v1/m/stores', params)
  },
  getAuth(id: string) {
    return http.get<StoreAuthConfig>(`/api/v1/m/stores/${id}/auth`)
  },
  saveAuth(id: string, data: Partial<StoreAuthConfig>) {
    return http.post<{ ok: boolean }>(
      `/api/v1/m/stores/${id}/auth`,
      data as Record<string, unknown>,
    )
  },
  /** 删除门店（用于驳回入驻申请） */
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/m/stores/${id}`)
  },
}

export const staffService = {
  list(params: { keyword?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Staff>>('/api/v1/m/staffs', params)
  },
  create(dto: Partial<Staff>) {
    return http.post<Staff>('/api/v1/m/staffs', dto as Record<string, unknown>)
  },
  update(id: string, dto: Partial<Staff>) {
    return http.put<Staff>(`/api/v1/m/staffs/${id}`, dto as Record<string, unknown>)
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/m/staffs/${id}`)
  },
}

export interface ShopDecorate {
  merchantId: string
  themeColor: string
  fontStyle: 'modern' | 'elegant' | 'playful' | 'minimal'
  banners: { image: string; link?: string }[]
  productLayout: 'waterfall' | 'twoColumn' | 'singleLarge'
}

export const shopService = {
  getDecorate() {
    return http.get<ShopDecorate>('/api/v1/m/shop/decorate')
  },
  saveDecorate(data: ShopDecorate) {
    return http.post<ShopDecorate>(
      '/api/v1/m/shop/decorate',
      data as unknown as Record<string, unknown>,
    )
  },
}

export interface MarketingCoupon {
  id: string
  name: string
  type: 'fullReduce' | 'discount' | 'fixed'
  amount?: number
  discountPercent?: number
  threshold?: number
  stock: number
  received: number
  used: number
  validFrom: string
  validTo: string
  perUserLimit: number
  scope: 'all' | 'category' | 'product'
  status: 'pending' | 'active' | 'paused' | 'ended'
}

/** 优惠券创建/编辑 DTO（id / 统计字段由后端维护，前端不传） */
export interface MarketingCouponDto {
  name: string
  type: 'fullReduce' | 'discount' | 'fixed'
  amount?: number
  discountPercent?: number
  threshold?: number
  stock: number
  validFrom: string
  validTo: string
  perUserLimit?: number
  scope?: 'all' | 'category' | 'product'
}

/**
 * 营销概览
 *
 * 字段以后端 marketing/overview(merchant.service.ts:1205) 返回为准:
 *   coupons    = { total, active, totalReceived, totalUsed }
 *   flashSales = { total, active, planned, sold }
 *   groupBuys  = { total, active, planned, sold }
 */
export interface MarketingOverview {
  coupons: { total: number; active: number; totalReceived: number; totalUsed: number }
  flashSales: { total: number; active: number; planned: number; sold: number }
  groupBuys: { total: number; active: number; planned: number; sold: number }
}

export const marketingService = {
  overview() {
    return http.get<MarketingOverview>('/api/v1/m/marketing/overview')
  },
  couponList(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<MarketingCoupon>>('/api/v1/m/marketing/coupons', params)
  },
  createCoupon(dto: MarketingCouponDto) {
    return http.post<MarketingCoupon>(
      '/api/v1/m/marketing/coupons',
      dto as unknown as Record<string, unknown>,
    )
  },
  updateCoupon(id: string, dto: Partial<MarketingCouponDto>) {
    return http.put<MarketingCoupon>(
      `/api/v1/m/marketing/coupons/${id}`,
      dto as Record<string, unknown>,
    )
  },
  removeCoupon(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/m/marketing/coupons/${id}`)
  },
  /** 启用 / 暂停（active=true 启用，false 暂停） */
  toggleCoupon(id: string, active: boolean) {
    return http.post<{ ok: boolean; status: MarketingCoupon['status'] }>(
      `/api/v1/m/marketing/coupons/${id}/toggle`,
      { active },
    )
  },
}

/**
 * 商家会话列表项
 *
 * 字段以后端 `MerchantService.chatSessions` 返回为准:
 *   - lastMessage: 最近一条消息的简要,服务端聚合自 ChatMessage 表,会话从未发过消息时为 null
 *   - online: 客户当前是否在线,由 ChatGateway socket 房间快照判断,gateway 未就绪时回退 false
 */
export interface ChatSessionItem {
  id: string
  userId: string
  userName: string
  userAvatar: string
  lastMessage: {
    content: string
    type: string
    sender: 'user' | 'merchant'
    createdAt: string
  } | null
  lastMessageAt: string
  unreadCount: number
  status: 'open' | 'closed' | string
  online: boolean
}

export interface ChatMessageItem {
  id: string
  sessionId: string
  sender: 'user' | 'merchant' | 'system'
  type: 'text' | 'image' | 'product' | 'order' | 'system'
  content: string
  createdAt: string
  read: boolean
}

export interface QuickReplyItem {
  id: string
  label: string
  content: string
}

export const chatService = {
  sessions() {
    return http.get<ChatSessionItem[]>('/api/v1/m/chat/sessions')
  },
  messages(sessionId: string) {
    return http.get<ChatMessageItem[]>(`/api/v1/m/chat/sessions/${sessionId}/messages`)
  },
  quickReplies() {
    return http.get<QuickReplyItem[]>('/api/v1/m/chat/quick-replies')
  },
  send(sessionId: string, data: { type: string; content: string }) {
    return http.post<ChatMessageItem>(`/api/v1/m/chat/sessions/${sessionId}/messages`, data)
  },
}

export interface PlazaFactoryItem {
  id: string
  name: string
  logo: string
  region: string
  categories: string[]
  gmv: number
  rating: number
  ratingCount: number
  years?: number
  productCount?: number
  agencyCount?: number
  tags: string[]
  platformPushed?: boolean
}

export interface PlazaFactoryDetail extends PlazaFactoryItem {
  banner: string
  address: string
  monthGmv: number
  desc: string
  qualifications: { name: string; image: string }[]
  contactName: string
  contactPhone: string
  followed: boolean
}

export interface PlazaPlazaProduct {
  productId: string
  productName: string
  productImage: string
  factoryName: string
  factoryId: string
  startPrice: number
  agencyCount: number
  tags?: string[]
  isPlatformPushed?: boolean
}

export interface AgencyApplicationRow {
  id: string
  applicationId: string
  productId: string
  productName: string
  productImage: string
  factoryId: string
  factoryName: string
  factoryPrice: number
  myRetailPrice: number
  markupRatio: number
  syncStatus: 'synced' | 'pending'
  status: 'pending' | 'approved' | 'rejected' | 'offline'
  appliedAt: string
}

export const plazaService = {
  products(
    params: {
      keyword?: string
      tab?: string
      tags?: string
      factoryId?: string
      page?: number
      pageSize?: number
    } = {},
  ) {
    return http.get<Pagination<PlazaPlazaProduct>>('/api/v1/m/plaza/products', params)
  },
  factories(
    params: { region?: string; category?: string; minRating?: number; keyword?: string } = {},
  ) {
    return http.get<PlazaFactoryItem[]>('/api/v1/m/plaza/factories', params)
  },
  rateFactory(id: string, score: number) {
    return http.post<{ ok: boolean; rating: number; ratingCount: number }>(
      `/api/v1/m/plaza/factories/${id}/rate`,
      { score },
    )
  },
  factory(id: string) {
    return http.get<PlazaFactoryDetail>(`/api/v1/m/plaza/factories/${id}`)
  },
  follow(id: string, on: boolean) {
    return http.post<{ ok: boolean; followed: boolean }>(`/api/v1/m/plaza/factories/${id}/follow`, {
      on,
    })
  },
  applyAgency(data: {
    factoryId: string
    productIds: string[]
    markupPercent: number
    autoSyncPrice: boolean
    message?: string
  }) {
    return http.post<{ ok: boolean; status: string; id: string }>('/api/v1/m/plaza/agency', data)
  },
  agencyApplications(params: { status?: string } = {}) {
    return http.get<AgencyApplicationRow[]>('/api/v1/m/plaza/applications', params)
  },
  updateAgencyApplication(
    id: string,
    data: { myRetailPrice?: number; markupRatio?: number; status?: string },
  ) {
    return http.patch<{ ok: boolean }>(
      `/api/v1/m/plaza/applications/${id}`,
      data as Record<string, unknown>,
    )
  },
  cancelAgencyApplication(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/m/plaza/applications/${id}`)
  },
}
