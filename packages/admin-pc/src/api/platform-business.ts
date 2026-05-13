/**
 * 平台 PC 业务接口（已对接 /api/v1/p/* 真后端）
 *
 * 个别后端缺失的子功能（如灰度、配置详情等）仍保留 mock，并标 TODO。
 */
import {
  genPlazaCard,
  genPlazaPush,
  genAdSlot,
  genAdCreative,
  genFeatureFlags,
  placeholderImage,
  faker
} from '@jiujiu/shared/mock'
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

const delay = <T>(data: T, ms = 200): Promise<T> =>
  new Promise((r) => setTimeout(() => r(data), ms))

/* ============ 1. Dashboard ============ */
export function fetchPlatformDashboard() {
  return request.get<PlatformDashboard>({ url: '/api/v1/p/dashboard' })
}

/* ============ 2. 商户列表 ============ */
export interface PlatformMerchantsParams {
  tab?: 'all' | 'factory' | 'store' | 'disabled'
  keyword?: string
}

export function fetchPlatformMerchants(params: PlatformMerchantsParams = {}) {
  return request.get<Merchant[]>({ url: '/api/v1/p/merchants', params })
}

export function pauseMerchant(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/merchants/${id}/pause` })
}
export function resumeMerchant(id: string) {
  return request.post<{ ok: boolean }>({ url: `/api/v1/p/merchants/${id}/resume` })
}

/* ============ 3. 平台订单 ============ */
export function fetchPlatformOrders() {
  return request.get<Order[]>({ url: '/api/v1/p/orders' })
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
export function fetchMerchantAudits() {
  return request.get<Merchant[]>({ url: '/api/v1/p/audit/merchants' })
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

export function fetchProductAudits() {
  return request.get<AuditProduct[]>({ url: '/api/v1/p/audit/products' })
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

// shape-adapted: 后端返回 AdSlot[]；前端聚合 creative 数量 + 演示用 CTR/曝光
export async function fetchAdSlots() {
  const [slots, creatives] = await Promise.all([
    request.get<AdSlot[]>({ url: '/api/v1/p/ads/slots' }),
    request.get<AdCreative[]>({ url: '/api/v1/p/ads/creatives' })
  ])
  const safeSlots = Array.isArray(slots) ? slots : []
  const safeCreatives = Array.isArray(creatives) ? creatives : []
  const list: AdSlotVM[] = safeSlots.map((s, i) => ({
    id: s.id,
    name: s.name,
    target: (s.target ?? 'customer') as AdSlotVM['target'],
    status: (['active', 'active', 'paused', 'ended', 'draft'] as const)[i % 5],
    creativeCount: safeCreatives.filter((c) => c.slotId === s.id).length,
    // TODO: no backend equivalent — CTR/曝光 暂用 mock
    ctr: faker.number.float({ min: 1.2, max: 12.5, fractionDigits: 1 }),
    impressions: faker.number.int({ min: 5000, max: 200000 }),
    preview: placeholderImage(300, 120)
  }))
  return list
}

export function fetchAdCreatives(slotId?: string) {
  return request.get<AdCreative[]>({
    url: '/api/v1/p/ads/creatives',
    params: slotId ? { slotId } : {}
  })
}

/* ============ 8. 选品广场 ============ */
// TODO: no backend equivalent — 选品广场商品/工厂列表后端无对应路由，保留 mock
const PLAZA_ITEMS = Array.from({ length: 25 }).map(() => {
  const card = genPlazaCard()
  return {
    ...card,
    status: faker.helpers.arrayElement(['pushing', 'pushing', 'pending', 'offline'] as const),
    agencyCount: faker.number.int({ min: 0, max: 200 })
  }
})

export type PlazaItem = (typeof PLAZA_ITEMS)[number]

export async function fetchPlatformPlaza(tab: 'products' | 'factories' | 'records' = 'products') {
  if (tab === 'records') {
    return request.get<PlazaPush[]>({ url: '/api/v1/p/plaza/pushes' })
  }
  // TODO: no backend equivalent — products / factories 仍返回 mock
  return delay(PLAZA_ITEMS)
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

export function fetchPlatformMemberPlans() {
  return request.get<MemberPlan[]>({ url: '/api/v1/p/member-plans' })
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
  // TODO: no backend equivalent — 后端只暴露按 planId 查询；这里回退到 member-service
  return msGetSubs()
}

/* ============ 10. 缴费订单 ============ */
export type PayOrderItem = PaymentRecord

export function fetchMemberPayOrders() {
  return request.get<PayOrderItem[]>({ url: '/api/v1/p/member-pay-orders' })
}
export function approvePayRefund(id: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/member-pay-orders/${id}/approve-refund`
  })
}
export function rejectPayRefund(id: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/member-pay-orders/${id}/reject-refund`,
    data: { reason: '' }
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

export function fetchAdminRoles() {
  return request.get<AdminRole[]>({ url: '/api/v1/p/roles' })
}
export function fetchAdminUsers() {
  return request.get<AdminUser[]>({ url: '/api/v1/p/admins' })
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
export interface SystemSettings {
  site: { name: string; logo: string; icp: string }
  payment: { wechat: boolean; alipay: boolean; balance: boolean }
  logistics: { providers: string[]; defaultFreight: number }
  service: { phone: string; email: string; workTime: string }
  security: { passwordPolicy: 'strict' | 'normal' | 'loose'; ipWhitelist: string[] }
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

/* ============ 12.1 法律协议（用户协议 / 隐私政策 / 信息收集清单） ============ */
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

/* ============ 12b. APP 发布管理（#7 软件自更新）============ */
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

export function fetchAppReleases(platform?: AppPlatformKind) {
  return request.get<AppReleaseRow[]>({
    url: '/api/v1/p/app-releases',
    params: platform ? { platform } : {}
  })
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

  const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || ''
  const token = localStorage.getItem('accessToken') || ''
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', baseUrl + '/api/v1/p/app-releases')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText)
        if (r?.code === 0) resolve(r.data)
        else reject(new Error(r?.message || `HTTP ${xhr.status}`))
      } catch (e: any) {
        reject(new Error(e?.message || 'upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('网络错误'))
    xhr.send(fd)
  })
}

/* ============ 13. 功能开关 ============ */
export interface GrayscaleConfig {
  audience: 'all' | 'factory' | 'store' | 'specific'
  percent: number
  rule: 'random' | 'whitelist' | 'level'
}

export function fetchFeatureFlags() {
  return request
    .get<FeatureFlag[]>({ url: '/api/v1/p/feature-flags' })
    .catch(() => genFeatureFlags())
}
export function toggleFeatureFlag(key: string) {
  // shape-adapted: 前端按 key 调用；后端用 :id（同一字段），同时透传 enabled=true 由后端取反或前端无关心
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/feature-flags/${key}/toggle`,
    data: {}
  })
}
export function fetchGrayscale() {
  return request.get<GrayscaleConfig>({ url: '/api/v1/p/feature-flags/gray' })
}
export function saveGrayscale(cfg: GrayscaleConfig) {
  return request.post<{ ok: boolean }>({
    url: '/api/v1/p/feature-flags/gray',
    data: cfg
  })
}
export function resetFeatureFlags() {
  return request.post<{ ok: boolean }>({ url: '/api/v1/p/feature-flags/reset' })
}
