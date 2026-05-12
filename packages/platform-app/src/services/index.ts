/**
 * 平台端服务聚合
 */
import { http } from '../utils/request'
import type { Merchant, Product, Pagination, UserSession, MemberPlan, FeatureFlag, PlatformDashboard } from '@jiujiu/shared/types'

// ============ 认证 ============
export const authService = {
  adminLogin(payload: { username?: string; password?: string }) {
    return http.post<UserSession>('/api/v1/auth/admin-login', payload)
  },
}

// ============ 平台仪表盘 ============
export const dashboardService = {
  get() {
    return http.get<PlatformDashboard>('/api/v1/p/dashboard')
  },
}

// ============ 商户 ============
export const merchantService = {
  list(params: { type?: string; status?: string; keyword?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Merchant>>('/api/v1/p/merchants', params)
  },
  auditList(params: { page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Merchant>>('/api/v1/p/audit/merchants', params)
  },
  approve(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/merchants/${id}/approve`)
  },
  reject(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/merchants/${id}/reject`, { reason })
  },
  pause(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/merchants/${id}/pause`)
  },
  resume(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/merchants/${id}/resume`)
  },
}

// ============ 商品审核 ============
export interface ProductAuditConfig {
  autoApprove: boolean
  conditions: { key: string; label: string; enabled: boolean }[]
  samplingRate: number
}
export const productAuditService = {
  list(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Product>>('/api/v1/p/audit/products', params)
  },
  config() {
    return http.get<ProductAuditConfig>('/api/v1/p/audit/products/config')
  },
  saveConfig(config: Partial<ProductAuditConfig>) {
    return http.post<{ ok: boolean }>('/api/v1/p/audit/products/config', config as unknown as Record<string, unknown>)
  },
  approve(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/products/${id}/approve`)
  },
  reject(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/products/${id}/reject`, { reason })
  },
}

// ============ 广告 ============
export interface AdSlot {
  id: string
  name: string
  scene: string
  target: string
  status: 'active' | 'ended' | 'paused' | 'draft'
  creativeCount: number
  ctr: number
  impressions: number
}
export const adService = {
  slots() {
    return http.get<AdSlot[]>('/api/v1/p/ads/slots')
  },
  creatives(params: { slotId?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<unknown>>('/api/v1/p/ads/creatives', params)
  },
}

// ============ 选品广场 ============
export const plazaService = {
  pushes(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<unknown>>('/api/v1/p/plaza/pushes', params)
  },
  createPush(dto: Record<string, unknown>) {
    return http.post<{ ok: boolean }>('/api/v1/p/plaza/pushes', dto)
  },
}

// ============ 会员套餐 ============
export const memberService = {
  plans() {
    return http.get<MemberPlan[]>('/api/v1/p/member-plans')
  },
  savePlan(dto: Partial<MemberPlan>) {
    return http.post<{ ok: boolean }>('/api/v1/p/member-plans', dto as unknown as Record<string, unknown>)
  },
  payOrders(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<unknown>>('/api/v1/p/member-pay-orders', params)
  },
}

// ============ 功能开关 ============
export const featureFlagService = {
  list() {
    return http.get<FeatureFlag[]>('/api/v1/p/feature-flags')
  },
  toggle(id: string, enabled: boolean) {
    return http.post<{ ok: boolean }>(`/api/v1/p/feature-flags/${id}/toggle`, { enabled })
  },
}

// ============ 权限管理 ============
export interface AdminUser {
  id: string
  nickname: string
  username: string
  role: string
  avatar?: string
  status: 'active' | 'paused'
  lastLoginAt?: string
}
export interface AdminRole {
  id: string
  name: string
  desc: string
  permissions: string[]
}
export const permissionService = {
  admins() {
    return http.get<AdminUser[]>('/api/v1/p/admins')
  },
  roles() {
    return http.get<AdminRole[]>('/api/v1/p/roles')
  },
  saveRole(dto: Partial<AdminRole>) {
    return http.post<{ ok: boolean }>('/api/v1/p/roles', dto as unknown as Record<string, unknown>)
  },
}

// ============ 系统设置 ============
export interface SystemSettings {
  site: { name: string; logo: string; icp: string }
  payment: { wechat: boolean; alipay: boolean; balance: boolean }
  logistics: { providers: string[]; defaultFreight: number }
  service: { phone: string; email: string; workTime: string }
  security: { passwordPolicy: string; ipWhitelist: string[] }
}
export const systemService = {
  settings() {
    return http.get<SystemSettings>('/api/v1/p/system/settings')
  },
  saveSettings(dto: Partial<SystemSettings>) {
    return http.post<{ ok: boolean }>('/api/v1/p/system/settings', dto as unknown as Record<string, unknown>)
  },
}
