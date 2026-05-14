/**
 * 平台 PC 业务接口（对接 /api/v1/p/* 真后端）
 *
 * 不再保留任何 mock / faker / 假数据 fallback。
 * 后端无对应接口或调用失败时，统一返回空数组 / 默认空对象，让页面进入空态展示。
 *
 * 后端分页接口统一返回 `{ list, total, page, pageSize }`，
 * 此处统一在函数内 unwrap 成数组，保持消费方 `View.vue` 现有签名不变。
 */
import type {
  Merchant,
  Order,
  PlazaPush,
  AdSlot,
  AdCreative,
  MemberPlan,
  FeatureFlag,
  PlatformDashboard
} from '@jiujiu/shared/types'
import request from '@/utils/http'
import {
  getAllSubscriptions as msGetSubs,
  getSubscriptionsByPlan as msGetSubsByPlan,
  type PaymentRecord
} from './member-service'

/**
 * 后端分页响应解包工具
 *
 * NestJS buildPage 返回 `{ list, total, page, pageSize, hasMore? }`，
 * 个别接口（如旧实现）可能直接返回数组；这里统一兼容两种形态。
 */
function unwrapPage<T>(resp: any): T[] {
  if (!resp) return []
  if (Array.isArray(resp)) return resp as T[]
  if (Array.isArray(resp.list)) return resp.list as T[]
  if (Array.isArray(resp.items)) return resp.items as T[]
  if (Array.isArray(resp.records)) return resp.records as T[]
  return []
}

/* ============ 1. Dashboard ============ */
export function fetchPlatformDashboard() {
  return request.get<PlatformDashboard>({ url: '/api/v1/p/dashboard' })
}

/* ============ 2. 商户列表 ============ */
export interface PlatformMerchantsParams {
  tab?: 'all' | 'factory' | 'store' | 'disabled'
  keyword?: string
}

/**
 * 平台商户列表
 *
 * 后端字段：`type` (factory/store) + `status` (active/disabled/pending) + `keyword`。
 * 前端 tab 映射规则：
 *   - all      → 不传 type/status
 *   - factory  → type=factory
 *   - store    → type=store
 *   - disabled → status=disabled
 *
 * 后端返回 buildPage 分页对象时统一 unwrap 成数组。
 */
export async function fetchPlatformMerchants(params: PlatformMerchantsParams = {}): Promise<Merchant[]> {
  // 后端 parsePage 将 pageSize 上限钳制在 100；这里同步使用 100，避免"以为拿到 200 条实际只有 100"的误解
  const query: Record<string, unknown> = { pageSize: 100 }
  if (params.keyword) query.keyword = params.keyword
  switch (params.tab) {
    case 'factory':
      query.type = 'factory'
      break
    case 'store':
      query.type = 'store'
      break
    case 'disabled':
      query.status = 'disabled'
      break
    case 'all':
    case undefined:
    default:
      break
  }
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/merchants', params: query })
    return unwrapPage<Merchant>(resp)
  } catch {
    return []
  }
}

export function pauseMerchant(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/merchants/${id}/pause` })
}
export function resumeMerchant(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/merchants/${id}/resume` })
}

/* ============ 3. 平台订单 ============ */
export async function fetchPlatformOrders(): Promise<Order[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/orders',
      params: { pageSize: 100 }
    })
    return unwrapPage<Order>(resp)
  } catch {
    return []
  }
}

/* ============ 4. 数据中心 ============ */
export type StatsPeriod = 'today' | 'week' | 'month' | 'year'

export interface PlatformStats {
  period: StatsPeriod
  trend: { date: string; value: number }[]
  categoryBars: { category: string; sales: number }[]
  memberPlanDist: { yearly: number; monthly: number; trial: number }
}

export function fetchPlatformStats(period: StatsPeriod = 'week') {
  return request.get<PlatformStats>({ url: '/api/v1/p/stats', params: { period } })
}

/* ============ 5. 商户审核 ============ */
export async function fetchMerchantAudits(): Promise<Merchant[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/audit/merchants',
      params: { pageSize: 100 }
    })
    return unwrapPage<Merchant>(resp)
  } catch {
    return []
  }
}
export function approveMerchant(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/merchants/${id}/approve` })
}
export function rejectMerchant(id: string, reason: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/merchants/${id}/reject`,
    data: { reason }
  })
}

/* ============ 6. 商品审核 ============ */
export interface AuditProduct {
  id: string
  name: string
  image: string
  category: string
  merchant: string
  price: number
  submittedAt: string
  status: 'pending' | 'auto_approved' | 'rejected'
  rejectReason?: string
}

export interface ProductAuditConfig {
  autoApprove: boolean
  conditions: { key: string; label: string; enabled: boolean }[]
  samplingRate: number
}

export async function fetchProductAudits(): Promise<AuditProduct[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/audit/products',
      params: { pageSize: 100 }
    })
    return unwrapPage<AuditProduct>(resp)
  } catch {
    return []
  }
}
export function fetchProductAuditConfig() {
  return request.get<ProductAuditConfig>({ url: '/api/v1/p/audit/products/config' })
}
export function saveProductAuditConfig(cfg: Partial<ProductAuditConfig>) {
  return request.post<{ ok: boolean }>({
    url: '/api/v1/p/audit/products/config',
    data: cfg
  })
}
export function approveProduct(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/products/${id}/approve` })
}
export function rejectProduct(id: string, reason: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/products/${id}/reject`,
    data: { reason }
  })
}

/* ============ 7. 广告管理 ============ */
export interface AdSlotVM {
  id: string
  name: string
  target: 'customer' | 'factory' | 'store'
  status: 'active' | 'paused' | 'ended' | 'draft'
  creativeCount: number
  ctr: number
  impressions: number
  preview: string
}

/**
 * 广告位列表
 *
 * 后端字段 status / ctr / impressions / preview 缺失时统一显示空值；
 * 不再使用 faker 生成"演示数据"。
 */
export async function fetchAdSlots(): Promise<AdSlotVM[]> {
  try {
    // 后端 parsePage 钳制 pageSize 上限 100；旧的 200/500 会被静默截断，
    // 导致 creativeCount 漏算。这里同步使用 100，需更多素材时调用方应改用分页 / 多次请求。
    const [slotsResp, creativesResp] = await Promise.all([
      request.get<any>({ url: '/api/v1/p/ads/slots', params: { pageSize: 100 } }),
      request.get<any>({ url: '/api/v1/p/ads/creatives', params: { pageSize: 100 } })
    ])
    const safeSlots = unwrapPage<AdSlot>(slotsResp)
    const safeCreatives = unwrapPage<AdCreative>(creativesResp)
    return safeSlots.map((s) => {
      const anyS = s as any
      return {
        id: s.id,
        name: s.name,
        target: (s.target ?? 'customer') as AdSlotVM['target'],
        status: (anyS.status as AdSlotVM['status']) ?? 'draft',
        creativeCount: safeCreatives.filter((c) => c.slotId === s.id).length,
        ctr: typeof anyS.ctr === 'number' ? anyS.ctr : 0,
        impressions: typeof anyS.impressions === 'number' ? anyS.impressions : 0,
        preview: anyS.preview || anyS.previewUrl || ''
      }
    })
  } catch {
    return []
  }
}

export async function fetchAdCreatives(slotId?: string): Promise<AdCreative[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/ads/creatives',
      params: { pageSize: 100, ...(slotId ? { slotId } : {}) }
    })
    return unwrapPage<AdCreative>(resp)
  } catch {
    return []
  }
}

/* ============ 8. 选品广场 ============ */

/**
 * 平台选品广场列表项（与现有 view 字段保持一致：id / name / image / factory / price / tag）
 * 后端返回 PlazaProductCard 时由 fetchPlatformPlaza 适配；缺字段时显示空值。
 */
export interface PlazaItem {
  id: string
  name: string
  image: string
  factory: string
  price: number
  status: 'pushing' | 'pending' | 'offline'
  agencyCount: number
  tag?: string
}

/**
 * 平台选品广场列表
 *
 * 后端未实现 products / factories 列表时返回空数组让页面进入空态。
 * records tab 对应 /p/plaza/pushes 推送记录，已有后端接口。
 */
export async function fetchPlatformPlaza(
  tab: 'products' | 'factories' | 'records' = 'products'
): Promise<PlazaItem[] | PlazaPush[]> {
  if (tab === 'records') {
    try {
      // 后端 `plazaPushes` 走 buildPage 返回 `{list, total, page, pageSize}`，
      // 旧实现按裸数组消费会拿到 undefined。统一通过 unwrapPage 兼容两种形态。
      const resp = await request.get<any>({
        url: '/api/v1/p/plaza/pushes',
        params: { pageSize: 100 }
      })
      return unwrapPage<PlazaPush>(resp)
    } catch {
      return []
    }
  }
  try {
    const raw = await request.get<any[]>({
      url: '/api/v1/p/plaza/products',
      params: { tab }
    })
    const list = Array.isArray(raw) ? raw : []
    return list.map((r: any): PlazaItem => ({
      id: r.id || r.productId || '',
      name: r.name || r.productName || '',
      image: r.image || r.productImage || '',
      factory: r.factory || r.factoryName || '',
      price: typeof r.price === 'number' ? r.price : (typeof r.startPrice === 'number' ? r.startPrice : 0),
      status: (r.status as PlazaItem['status']) || 'pending',
      agencyCount: typeof r.agencyCount === 'number' ? r.agencyCount : 0,
      tag: r.tag || (Array.isArray(r.tags) ? r.tags[0] : undefined)
    }))
  } catch {
    return []
  }
}

export interface PushPayload {
  productIds: string[]
  target: 'all' | 'factory' | 'store'
  startAt: string
  endAt: string
  weight: number
  remark?: string
}

export function pushPlaza(payload: PushPayload) {
  return request.post<{ ok: boolean; pushedCount: number }>({
    url: '/api/v1/p/plaza/pushes',
    data: payload
  })
}

/* ============ 9. 会员套餐 ============ */

export async function fetchPlatformMemberPlans(): Promise<MemberPlan[]> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/member-plans', params: { pageSize: 100 } })
    return unwrapPage<MemberPlan>(resp)
  } catch {
    return []
  }
}
export async function fetchMemberTrialDays(): Promise<number> {
  try {
    const r = await request.get<{ days: number }>({ url: '/api/v1/p/member-plans/trial-days' })
    return typeof r?.days === 'number' ? r.days : 30
  } catch {
    return 30
  }
}
export function saveMemberTrialDays(days: number) {
  return request.put<{ ok: boolean; days: number }>({
    url: '/api/v1/p/member-plans/trial-days',
    data: { days },
  })
}
export function savePlatformMemberPlan(plan: Partial<MemberPlan>) {
  return request.post<{ ok: boolean; plan: MemberPlan }>({
    url: '/api/v1/p/member-plans',
    data: plan
  })
}
export function removePlatformMemberPlan(id: string) {
  return request.del<{ ok: boolean }>({ url: `/api/v1/p/member-plans/${id}` })
}
export function fetchPlanSubscriptions(planId: string) {
  return request
    .get<unknown[]>({ url: `/api/v1/p/member-plans/${planId}/subscriptions` })
    .catch(() => msGetSubsByPlan(planId)) as ReturnType<typeof msGetSubsByPlan>
}
export function fetchAllSubscriptions() {
  // 后端只暴露按 planId 查询；这里回退到 member-service（返回 []）
  return msGetSubs()
}

/* ============ 10. 缴费订单 ============ */
export type PayOrderItem = PaymentRecord

export async function fetchMemberPayOrders(): Promise<PayOrderItem[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/member-pay-orders',
      params: { pageSize: 100 },
    })
    return unwrapPage<PayOrderItem>(resp)
  } catch {
    return []
  }
}
export function approvePayRefund(id: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/member-pay-orders/${id}/approve-refund`
  })
}

/**
 * 驳回退款申请
 *
 * @param id     退款订单 ID
 * @param reason 驳回理由（必填，由调用方在 UI 中弹框收集后传入）
 */
export function rejectPayRefund(id: string, reason: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/member-pay-orders/${id}/reject-refund`,
    data: { reason: reason || '' }
  })
}

/* ============ 11. 权限管理 ============ */
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
  builtIn?: boolean
}

export async function fetchAdminRoles(): Promise<AdminRole[]> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/roles', params: { pageSize: 100 } })
    return unwrapPage<AdminRole>(resp)
  } catch {
    return []
  }
}
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/admins', params: { pageSize: 100 } })
    return unwrapPage<AdminUser>(resp)
  } catch {
    return []
  }
}
export function saveAdminRole(role: Partial<AdminRole> & { id?: string }) {
  if (role.id) {
    return request.put<{ ok: boolean }>({
      url: `/api/v1/p/roles/${role.id}`,
      data: role
    })
  }
  return request.post<{ ok: boolean }>({ url: '/api/v1/p/roles', data: role })
}
export function removeAdminRole(id: string) {
  return request.del<{ ok: boolean }>({ url: `/api/v1/p/roles/${id}` })
}
export function saveAdminUser(user: Partial<AdminUser> & { id?: string }) {
  if (user.id) {
    return request.put<{ ok: boolean }>({
      url: `/api/v1/p/admins/${user.id}`,
      data: user
    })
  }
  return request.post<{ ok: boolean }>({ url: '/api/v1/p/admins', data: user })
}
export function toggleAdminUser(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/admins/${id}/toggle` })
}
export function removeAdminUser(id: string) {
  return request.del<{ ok: boolean }>({ url: `/api/v1/p/admins/${id}` })
}

/* ============ 12. 系统设置 ============ */
/**
 * 系统设置类型
 *
 * 对齐后端 `platform.service.ts#systemSettings` 默认形态：
 *   - payment.* 由 `{ enabled: boolean }` 对象承载（旧版误标为 boolean，会导致
 *     `v-model="form.payment.wechat"` 写入裸 boolean 后台无法持久化 enabled 状态）。
 *   - security.passwordPolicy 为 `{ minLength, requireUppercase }` 对象，
 *     旧版枚举 'strict'|'normal'|'loose' 已无法表达后端形态，前端改为两个独立字段。
 */
export interface PaymentChannelConfig {
  enabled: boolean
}
export interface PasswordPolicyConfig {
  minLength: number
  requireUppercase: boolean
}
export interface SystemSettings {
  site: { name: string; logo: string; icp: string }
  payment: {
    wechat: PaymentChannelConfig
    alipay: PaymentChannelConfig
    balance: PaymentChannelConfig
  }
  logistics: { providers: string[]; defaultFreight: number }
  service: { phone: string; email: string; workTime: string }
  security: { passwordPolicy: PasswordPolicyConfig; ipWhitelist: string[] }
  business: { registerLimit: number; commissionRate: number }
}

export function fetchSystemSettings() {
  return request.get<SystemSettings>({ url: '/api/v1/p/system/settings' })
}
export function saveSystemSettings(s: Partial<SystemSettings>) {
  return request.post<{ ok: boolean }>({
    url: '/api/v1/p/system/settings',
    data: s
  })
}

/* ============ 12.1 法律协议 ============ */
export interface LegalAgreementItem {
  title: string
  updatedAt: string
  body: string
}
export interface LegalAgreements {
  user: LegalAgreementItem
  privacy: LegalAgreementItem
  collect: LegalAgreementItem
}

export function fetchLegalAgreements() {
  return request.get<LegalAgreements>({ url: '/api/v1/p/legal/agreements' })
}
export function saveLegalAgreements(data: Partial<LegalAgreements>) {
  return request.put<{ ok: boolean }>({
    url: '/api/v1/p/legal/agreements',
    data
  })
}

/* ============ 12b. APP 发布管理 ============ */
export type AppPlatformKind = 'merchant' | 'platform'
export interface AppReleaseRow {
  id: string
  platform: AppPlatformKind
  version: string
  versionCode: number
  url: string
  size: number
  changelog: string
  force: boolean
  publishedAt: string
  createdById?: string | null
}

export async function fetchAppReleases(platform?: AppPlatformKind): Promise<AppReleaseRow[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/app-releases',
      params: { pageSize: 100, ...(platform ? { platform } : {}) }
    })
    return unwrapPage<AppReleaseRow>(resp)
  } catch {
    return []
  }
}

export function deleteAppRelease(id: string) {
  return request.del<{ ok: boolean }>({ url: `/api/v1/p/app-releases/${id}` })
}

/**
 * 上传 APK + 创建发布记录。
 * 走 multipart/form-data，使用底层 fetch（绕开 request 工具对 JSON 的强假设）。
 */
export async function uploadAppRelease(
  file: File,
  meta: {
    platform: AppPlatformKind
    version: string
    versionCode: number
    changelog?: string
    force?: boolean
  },
  onProgress?: (pct: number) => void
): Promise<AppReleaseRow> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('platform', meta.platform)
  fd.append('version', meta.version)
  fd.append('versionCode', String(meta.versionCode))
  if (meta.changelog) fd.append('changelog', meta.changelog)
  if (meta.force) fd.append('force', 'true')

  const env = (import.meta as any).env || {}
  const baseUrl = env.VITE_API_BASE_URL || env.VITE_API_URL || ''
  const token = localStorage.getItem('accessToken') || ''
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', baseUrl + '/api/v1/p/app-releases')
    if (token) {
      const tokenHeader = /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`
      xhr.setRequestHeader('Authorization', tokenHeader)
    }
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText)
        // 兼容 NestJS 标准 code===0 与旧 code===200；msg / message 任一字段都视为错误提示
        if (r?.code === 0 || r?.code === 200) resolve(r.data)
        else reject(new Error(r?.msg || r?.message || `HTTP ${xhr.status}`))
      } catch (e: any) {
        reject(new Error(e?.message || 'upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('网络错误'))
    xhr.send(fd)
  })
}

/* ============ 13. 功能开关 ============ */
/**
 * 灰度配置（与后端 `platform.service.ts#featureFlagGray` 形态对齐）
 *
 * 后端 GET /p/feature-flags/gray 返回数组，每条对应一个 FeatureFlag.key 的灰度
 * 状态；POST 时通过 `key` 字段定位要更新哪个开关。
 *
 * 旧字段 `percent` / `rule` 仅是前端 UI 概念，后端实际只关心 `grayPercent` +
 * `grayWhitelist` + `audience` + 可选 `scheduledAt`；这里把字段名对齐到后端，
 * 避免保存时"前端发了 percent 后端读不到"的死循环。
 */
export interface GrayscaleConfig {
  key: string
  label?: string
  audience: 'all' | 'factory' | 'store' | 'specific'
  grayPercent: number
  grayWhitelist: string[]
  scheduledAt?: string | null
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const flags = await request.get<FeatureFlag[]>({ url: '/api/v1/p/feature-flags' })
    return Array.isArray(flags) ? flags : []
  } catch {
    return []
  }
}
/**
 * 切换功能开关
 *
 * @param key     功能 key（与后端 FeatureFlag.id 同字段）
 * @param enabled 切换后的目标启用状态（true=启用 / false=停用）
 *                后端 toggle 接口同时接受 body.enabled 显式指定状态，
 *                避免前端"猜测当前值再取反"造成的并发竞态。
 */
export function toggleFeatureFlag(key: string, enabled: boolean) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/feature-flags/${key}/toggle`,
    data: { enabled }
  })
}
/**
 * 拉取所有 FeatureFlag 的灰度状态（数组）
 *
 * 后端返回每个 key 的灰度记录；前端按 key 查找单条编辑。接口失败时返回空数组，
 * 让页面进入空态而非崩溃。
 */
export async function fetchGrayscale(): Promise<GrayscaleConfig[]> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/feature-flags/gray' })
    if (Array.isArray(resp)) return resp as GrayscaleConfig[]
    if (resp && typeof resp === 'object' && resp.key) return [resp as GrayscaleConfig]
    return []
  } catch {
    return []
  }
}
/**
 * 保存单条灰度配置
 *
 * 后端 `setFeatureFlagGray` 通过 `dto.key` 定位 FeatureFlag，再写入 grayPercent /
 * grayWhitelist / audience / scheduledAt。调用方必须传完整 cfg（包含 key），否则
 * update 会找不到目标行而 500。
 */
export function saveGrayscale(cfg: GrayscaleConfig) {
  return request.post<{ ok: boolean }>({
    url: '/api/v1/p/feature-flags/gray',
    data: cfg
  })
}
export function resetFeatureFlags() {
  return request.post<{ ok: boolean }>({ url: '/api/v1/p/feature-flags/reset' })
}
