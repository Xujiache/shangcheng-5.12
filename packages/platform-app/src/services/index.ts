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
export interface SubscriptionStatusOverview {
  yearly: number
  monthly: number
  trial: number
  expiringSoon: number
}
export const memberService = {
  plans() {
    return http.get<MemberPlan[]>('/api/v1/p/member-plans')
  },
  savePlan(dto: Partial<MemberPlan>) {
    return http.post<{ ok: boolean }>('/api/v1/p/member-plans', dto as unknown as Record<string, unknown>)
  },
  deletePlan(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/member-plans/${id}`)
  },
  /** 新商家通用试用天数(0=关闭),走 SystemConfig 全局配置 */
  async trialDays(): Promise<number> {
    try {
      const r = await http.get<{ days: number }>('/api/v1/p/member-plans/trial-days')
      return typeof r?.days === 'number' ? r.days : 30
    } catch {
      return 30
    }
  },
  saveTrialDays(days: number) {
    return http.put<{ ok: boolean; days: number }>('/api/v1/p/member-plans/trial-days', { days })
  },
  payOrders(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<unknown>>('/api/v1/p/member-pay-orders', params)
  },
  /**
   * 订阅状态概览（聚合所有套餐的 subscriptions）
   *
   * 因后端目前只暴露按 planId 查询订阅，这里前端把所有 active 套餐遍历一遍
   * 累加聚合（套餐数量通常很少，开销可接受）。
   * 若后端补 /p/membership/overview 一把梭接口，则替换为该接口即可。
   */
  async statusOverview(): Promise<SubscriptionStatusOverview> {
    const all = await http.get<MemberPlan[]>('/api/v1/p/member-plans').catch(() => [] as MemberPlan[])
    if (!Array.isArray(all) || all.length === 0) {
      return { yearly: 0, monthly: 0, trial: 0, expiringSoon: 0 }
    }
    const now = Date.now()
    let yearly = 0
    let monthly = 0
    let trial = 0
    let expiringSoon = 0
    await Promise.all(
      all.map(async (p) => {
        try {
          const subs = (await http.get<any[]>(
            `/api/v1/p/member-plans/${p.id}/subscriptions`,
          )) as Array<{ status?: string; endAt?: string }>
          if (!Array.isArray(subs)) return
          for (const s of subs) {
            if (s.status === 'trial') trial += 1
            else if (s.status === 'active') {
              if (p.period === 'yearly') yearly += 1
              else if (p.period === 'monthly') monthly += 1
              if (s.endAt) {
                const ms = new Date(s.endAt).getTime() - now
                if (ms > 0 && ms <= 7 * 86400_000) expiringSoon += 1
              }
            }
          }
        } catch {
          /* 单个套餐失败忽略，继续下一个 */
        }
      }),
    )
    return { yearly, monthly, trial, expiringSoon }
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
