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

// ============ 数据中心（按周期统计） ============
export type StatsPeriod = 'today' | 'week' | 'month' | 'year'
export interface PlatformStats {
  period: StatsPeriod
  salesTrend: { date: string; value: number }[]
  topMerchants: { merchantId: string; name: string; type: string; region: string; sales: number }[]
}
export const statsService = {
  /**
   * GET /p/stats?period=today|week|month|year
   * 返回销售趋势 + TOP10 商家，用于数据中心页二级钻取。
   */
  get(period: StatsPeriod = 'week') {
    return http.get<PlatformStats>('/api/v1/p/stats', { period })
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
  updateSlot(id: string, dto: Partial<AdSlot> & Record<string, unknown>) {
    return http.put<AdSlot>(`/api/v1/p/ads/slots/${id}`, dto)
  },
  deleteSlot(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/ads/slots/${id}`)
  },
  deleteCreative(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/ads/creatives/${id}`)
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
  /** 全平台商品聚合（products tab） */
  products(params: { pageSize?: number } = {}) {
    return http.get<Pagination<unknown> | unknown[]>('/api/v1/p/plaza/products', params)
  },
  /** 全平台厂家列表（factories tab） */
  factories() {
    return http.get<unknown[]>('/api/v1/p/plaza/factories')
  },
  /** 平台代理申请记录（records tab） */
  records(params: { pageSize?: number } = {}) {
    return http.get<Pagination<unknown>>('/api/v1/p/plaza/records', params)
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
  /** 同意退款 */
  approveRefund(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/member-pay-orders/${id}/approve-refund`)
  },
  /** 驳回退款（需带原因） */
  rejectRefund(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/member-pay-orders/${id}/reject-refund`, {
      reason,
    })
  },
  /** 手工改单状态：paid / pending / refunding / refunded */
  updatePayStatus(id: string, status: string) {
    return http.patch<{ ok: boolean }>(`/api/v1/p/member-pay-orders/${id}/status`, { status })
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
  deleteRole(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/roles/${id}`)
  },
  deleteAdmin(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/admins/${id}`)
  },
  /** 切换管理员启用/停用状态（POST 无参，后端自动取反） */
  toggleAdmin(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/admins/${id}/toggle`)
  },
}

// ============ 系统设置 ============
/**
 * 与 admin-pc 后台共用同一 SystemConfig 记录（key=system_settings）。
 * business 子段持久化"注册商家上限"与"平台抽佣比例",前端两端透写同字段。
 */
export interface SystemSettings {
  site: { name: string; logo: string; icp: string }
  payment: { wechat: boolean; alipay: boolean; balance: boolean }
  logistics: { providers: string[]; defaultFreight: number }
  service: { phone: string; email: string; workTime: string }
  security: { passwordPolicy: string; ipWhitelist: string[] }
  business?: { registerLimit: number; commissionRate: number }
}
export const systemService = {
  settings() {
    return http.get<SystemSettings>('/api/v1/p/system/settings')
  },
  saveSettings(dto: Partial<SystemSettings>) {
    return http.post<{ ok: boolean }>('/api/v1/p/system/settings', dto as unknown as Record<string, unknown>)
  },
}
