/**
 * 平台端服务聚合
 */
import { http } from '../utils/request'
import type {
  Merchant,
  Product,
  Pagination,
  MemberPlan,
  FeatureFlag,
  PlatformDashboard,
} from '@jiujiu/shared/types'

// 认证逻辑统一走 packages/platform-app/src/services/auth.ts 的 platformAuthService

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
  list(
    params: {
      type?: string
      status?: string
      keyword?: string
      page?: number
      pageSize?: number
    } = {},
  ) {
    return http.get<Pagination<Merchant>>('/api/v1/p/merchants', params)
  },
  auditList(params: { status?: string; page?: number; pageSize?: number } = {}) {
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
    return http.post<{ ok: boolean }>(
      '/api/v1/p/audit/products/config',
      config as unknown as Record<string, unknown>,
    )
  },
  approve(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/products/${id}/approve`)
  },
  reject(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/products/${id}/reject`, { reason })
  },
  /**
   * 抽检审查（针对已自动通过/已上架商品):
   * - passed=true → 通过抽检（仅留痕,不影响上架状态）
   * - passed=false → 抽检不通过（后端会自动下架并记录原因）
   * 对应后端路由 POST /api/v1/p/audit/products/:id/sample-check
   */
  sampleCheck(id: string, passed: boolean, reason?: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/audit/products/${id}/sample-check`, {
      passed,
      reason,
    })
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
export interface PlazaPushRow {
  id: string
  productIds: string[]
  factoryIds: string[]
  targetType: 'product' | 'factory'
  positions: string[]
  tags: string[]
  audience: string
  scheduledStart: string
  scheduledEnd: string
  weight: number
  suggestMarkupMin?: number | null
  suggestMarkupMax?: number | null
  suggestCommission?: number | null
  pushText?: string | null
  status: 'draft' | 'pending' | 'active' | 'offline' | 'ended'
  impressions: number
  clicks: number
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}
export const plazaService = {
  pushes(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<PlazaPushRow>>('/api/v1/p/plaza/pushes', params)
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
    return http.post<{ ok: boolean }>(
      '/api/v1/p/member-plans',
      dto as unknown as Record<string, unknown>,
    )
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
    const all = await http
      .get<MemberPlan[]>('/api/v1/p/member-plans')
      .catch(() => [] as MemberPlan[])
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
export interface FeatureFlagCreateDto {
  key: string
  label: string
  group: 'home_entry' | 'role_button' | 'side_menu'
  audience: 'all' | 'factory' | 'store' | 'specific'
  defaultEnabled: boolean
}
export const featureFlagService = {
  list() {
    return http.get<FeatureFlag[]>('/api/v1/p/feature-flags')
  },
  toggle(id: string, enabled: boolean) {
    return http.post<{ ok: boolean }>(`/api/v1/p/feature-flags/${id}/toggle`, { enabled })
  },
  create(dto: FeatureFlagCreateDto) {
    return http.post<{ ok: boolean; id?: string }>(
      '/api/v1/p/feature-flags',
      dto as unknown as Record<string, unknown>,
    )
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/feature-flags/${id}`)
  },
  reset() {
    return http.post<{ ok: boolean }>('/api/v1/p/feature-flags/reset')
  },
}

// ============ 权限管理 ============
/**
 * 状态字面量与后端 prisma.user.status 对齐：
 *   - 'active'    可登录
 *   - 'disabled'  已停用（toggleAdmin 与 'active' 互翻）
 * 历史前端用过 'paused'，已统一改为 'disabled'，避免接口写回时被服务端忽略
 */
export interface AdminUser {
  id: string
  nickname: string
  username: string
  role: string
  avatar?: string
  status: 'active' | 'disabled'
  lastLoginAt?: string
}
export interface AdminRole {
  id: string
  name: string
  desc: string
  permissions: string[]
}
/**
 * 解包后端可能返回的「数组」或「分页对象」两种形态。
 * 后端 `/p/admins` `/p/roles` 已升级为分页 `{list,total,page,pageSize}`，
 * 旧实现可能仍返数组，统一在此处适配。
 */
function unwrapList<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && Array.isArray(raw.list)) return raw.list as T[]
  if (raw && Array.isArray(raw.records)) return raw.records as T[]
  if (raw && Array.isArray(raw.items)) return raw.items as T[]
  return []
}

export const permissionService = {
  async admins() {
    const raw = await http.get<any>('/api/v1/p/admins', { pageSize: 100 })
    return unwrapList<AdminUser>(raw)
  },
  async roles() {
    const raw = await http.get<any>('/api/v1/p/roles', { pageSize: 100 })
    return unwrapList<AdminRole>(raw)
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

// ============ 法律协议（用户协议 / 隐私 / 个人信息收集清单） ============
/**
 * 与后端 LegalAdminController 对齐：
 *   GET  /api/v1/p/legal/agreements
 *   PUT  /api/v1/p/legal/agreements   body: LegalAgreements
 * 公开读取（端上弹窗）走 /api/v1/u/agreements（同一 service.list()）。
 */
export interface LegalAgreementSection {
  title: string
  updatedAt: string
  body: string
}
export interface LegalAgreements {
  user: LegalAgreementSection
  privacy: LegalAgreementSection
  collect: LegalAgreementSection
}
export const legalService = {
  get() {
    return http.get<LegalAgreements>('/api/v1/p/legal/agreements')
  },
  save(payload: LegalAgreements) {
    return http.put<{ ok: boolean }>(
      '/api/v1/p/legal/agreements',
      payload as unknown as Record<string, unknown>,
    )
  },
}

// ============ APP 发布管理（自更新） ============
/**
 * 后端 AppReleaseController：
 *   GET    /api/v1/p/app-releases?platform=merchant|platform
 *   DELETE /api/v1/p/app-releases/:id
 *   POST   /api/v1/p/app-releases   (multipart, PC 端上传)
 * 移动端这里仅做"列出 + 删除"，上传走 admin-pc。
 */
export type AppReleasePlatform = 'merchant' | 'platform'
export interface AppRelease {
  id: string
  platform: AppReleasePlatform
  version: string
  versionCode: number
  url: string
  size: number
  changelog: string
  force: boolean
  publishedAt: string
  createdById?: string | null
}
export const appReleaseService = {
  list(platform?: AppReleasePlatform) {
    return http.get<AppRelease[]>('/api/v1/p/app-releases', platform ? { platform } : undefined)
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/app-releases/${id}`)
  },
}

// ============ 系统设置 ============
/**
 * 与 admin-pc 后台共用同一 SystemConfig 记录（key=system_settings）。
 *
 * business 子段字段名严格对齐后端 platform.service.ts::systemSettings DEFAULT：
 *   - newMerchantAutoApprove   新商家自动审核
 *   - newProductAutoApprove    新商品自动审核
 *   - platformCommissionRate   平台抽佣比例（%）
 *   - withdrawMinAmount        提现门槛（元）
 *
 * TODO: "注册商家上限"目前后端未持久化字段，admin-pc 与 platform-app 都暂未保存。
 *       如要启用，需要后端在 business 块新增 registerLimit + 注册流程中校验。
 */
export interface SystemSettings {
  site: { name: string; logo: string; icp: string }
  payment: { wechat: boolean; alipay: boolean; balance: boolean }
  logistics: { providers: string[]; defaultFreight: number }
  service: { phone: string; email: string; workTime: string }
  security: { passwordPolicy: string; ipWhitelist: string[] }
  business?: {
    newMerchantAutoApprove?: boolean
    newProductAutoApprove?: boolean
    platformCommissionRate?: number
    withdrawMinAmount?: number
  }
}
export const systemService = {
  settings() {
    return http.get<SystemSettings>('/api/v1/p/system/settings')
  },
  saveSettings(dto: Partial<SystemSettings>) {
    return http.post<{ ok: boolean }>(
      '/api/v1/p/system/settings',
      dto as unknown as Record<string, unknown>,
    )
  },
}
