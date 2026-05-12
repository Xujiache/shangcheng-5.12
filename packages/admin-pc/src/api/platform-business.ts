/**
 * 平台 PC 业务接口（Mock 实现 · S5）
 *
 * 复用 @jiujiu/shared 的 mock 工厂，补本地 fallback。
 * 接真后端时按注释路径替换 http 调用。
 */
import {
  genMerchant,
  genMerchants,
  genOrder,
  genOrders,
  genProduct,
  genProducts,
  genPlazaCard,
  genPlazaPush,
  genAdSlot,
  genAdCreative,
  genFeatureFlags,
  genPlatformDashboard,
  genWithdraw,
  placeholderImage,
  chineseName,
  chinaPhone,
  faker
} from '@jiujiu/shared/mock'
import type {
  Merchant,
  Order,
  Product,
  PlazaProductCard,
  PlazaPush,
  AdSlot,
  AdCreative,
  MemberPlan,
  FeatureFlag,
  PlatformDashboard
} from '@jiujiu/shared/types'
import { genId } from '@jiujiu/shared/utils'
import {
  getAllPlans as msGetAll,
  savePlan as msSave,
  removePlan as msRemove,
  getAllSubscriptions as msGetSubs,
  getSubscriptionsByPlan as msGetSubsByPlan,
  getPayments as msGetPayments,
  updatePaymentStatus as msUpdatePay,
  type PaymentRecord
} from './member-service'

const delay = <T>(data: T, ms = 200): Promise<T> =>
  new Promise((r) => setTimeout(() => r(data), ms))

/* ============ 1. Dashboard ============ */
// GET /api/v1/p/dashboard
let DASH_CACHE: PlatformDashboard | null = null
export function fetchPlatformDashboard() {
  if (!DASH_CACHE) DASH_CACHE = genPlatformDashboard()
  return delay(DASH_CACHE)
}

/* ============ 2. 商户列表 ============ */
// GET /api/v1/p/merchants
const MERCHANTS_CACHE: Merchant[] = genMerchants(40)

export interface PlatformMerchantsParams {
  tab?: 'all' | 'factory' | 'store' | 'disabled'
  keyword?: string
}

export function fetchPlatformMerchants(params: PlatformMerchantsParams = {}) {
  let list = MERCHANTS_CACHE.filter((m) => m.status !== 'pending')
  if (params.tab === 'factory') list = list.filter((m) => m.type === 'factory' && m.status !== 'disabled')
  else if (params.tab === 'store') list = list.filter((m) => m.type === 'store' && m.status !== 'disabled')
  else if (params.tab === 'disabled') list = list.filter((m) => m.status === 'disabled')
  else list = list.filter((m) => m.status !== 'disabled' || params.tab === 'all' ? m.status !== 'pending' : true)
  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter((m) => m.name.toLowerCase().includes(kw) || m.contact.includes(params.keyword!))
  }
  return delay(list)
}

export function pauseMerchant(id: string) {
  const m = MERCHANTS_CACHE.find((x) => x.id === id)
  if (m) m.status = 'disabled'
  return delay({ ok: true })
}
export function resumeMerchant(id: string) {
  const m = MERCHANTS_CACHE.find((x) => x.id === id)
  if (m) m.status = 'active'
  return delay({ ok: true })
}

/* ============ 3. 平台订单 ============ */
// GET /api/v1/p/orders
const ORDERS_CACHE: Order[] = genOrders(60)
export function fetchPlatformOrders() {
  return delay(ORDERS_CACHE)
}

/* ============ 4. 数据中心 ============ */
// GET /api/v1/p/stats?period=
export type StatsPeriod = 'today' | 'week' | 'month' | 'year'

export interface PlatformStats {
  period: StatsPeriod
  trend: { date: string; value: number }[]
  categoryBars: { category: string; sales: number }[]
  memberPlanDist: { yearly: number; monthly: number; trial: number }
}

export function fetchPlatformStats(period: StatsPeriod = 'week') {
  const len = period === 'today' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12
  const labelFor = (i: number) => {
    if (period === 'today') return `${i}时`
    if (period === 'week') return ['一', '二', '三', '四', '五', '六', '日'][i]
    if (period === 'month') return `${i + 1}日`
    return `${i + 1}月`
  }
  const cats = ['家具', '灯具', '布艺', '厨卫', '摆件', '建材', '家电']
  return delay<PlatformStats>({
    period,
    trend: Array.from({ length: len }).map((_, i) => ({
      date: labelFor(i),
      value: faker.number.int({ min: 30, max: 200 })
    })),
    categoryBars: cats.map((c) => ({ category: c, sales: faker.number.int({ min: 200, max: 2000 }) })),
    memberPlanDist: { yearly: 128, monthly: 86, trial: 54 }
  })
}

/* ============ 5. 商户审核 ============ */
// GET/POST /api/v1/p/audit/merchants
const MERCHANT_AUDITS: Merchant[] = [
  ...Array.from({ length: 8 }).map(() => ({ ...genMerchant(), status: 'pending' as const })),
  ...Array.from({ length: 6 }).map(() => ({ ...genMerchant(), status: 'active' as const })),
  ...Array.from({ length: 4 }).map(() => ({
    ...genMerchant(),
    status: 'rejected' as Merchant['status'],
    rejectReason: faker.helpers.arrayElement(['资质不全', '主体信息不符', '经营范围超出', '联系方式无效'])
  }))
]

export function fetchMerchantAudits() {
  return delay(MERCHANT_AUDITS)
}
export function approveMerchant(id: string) {
  const m = MERCHANT_AUDITS.find((x) => x.id === id)
  if (m) m.status = 'active'
  return delay({ ok: true })
}
export function rejectMerchant(id: string, reason: string) {
  const m = MERCHANT_AUDITS.find((x) => x.id === id)
  if (m) {
    m.status = 'rejected'
    ;(m as Merchant).rejectReason = reason
  }
  return delay({ ok: true })
}

/* ============ 6. 商品审核 ============ */
// GET/POST /api/v1/p/audit/products
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

const PRODUCT_AUDITS: AuditProduct[] = (() => {
  const cats = ['餐桌', '沙发', '床', '茶几', '椅子', '书柜', '灯具', '布艺']
  const merchants = ['经纬科技', '佛山家具批发', '南方睡眠科技', '岩板工厂', '创智办公']
  const statuses: AuditProduct['status'][] = [
    'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
    'auto_approved', 'auto_approved', 'auto_approved', 'auto_approved',
    'rejected', 'rejected', 'rejected'
  ]
  return Array.from({ length: 30 }).map((_, i) => ({
    id: genId(),
    name: `${faker.helpers.arrayElement(['北欧', '日式', '现代', '简约', '中式'])}${faker.helpers.arrayElement(cats)} ${faker.helpers.arrayElement(['A款', 'B款', 'C款'])}`,
    image: placeholderImage(600, 600),
    category: faker.helpers.arrayElement(cats),
    merchant: faker.helpers.arrayElement(merchants),
    price: faker.number.int({ min: 199, max: 9999 }),
    submittedAt: new Date(Date.now() - i * 86400000).toISOString(),
    status: statuses[i % statuses.length],
    rejectReason: undefined
  }))
})()

export interface ProductAuditConfig {
  autoApprove: boolean
  conditions: { key: string; label: string; enabled: boolean }[]
  samplingRate: number
}

let AUDIT_CFG: ProductAuditConfig = {
  autoApprove: true,
  conditions: [
    { key: 'top-merchant', label: '商户信用 A 级', enabled: true },
    { key: 'cat-exists', label: '类目已通过相同商品', enabled: true },
    { key: 'price-normal', label: '价格在类目正常区间内', enabled: false },
    { key: 'image-clear', label: '主图清晰且无水印', enabled: true }
  ],
  samplingRate: 10
}

export function fetchProductAudits() {
  return delay(PRODUCT_AUDITS)
}
export function fetchProductAuditConfig() {
  return delay(AUDIT_CFG)
}
export function saveProductAuditConfig(cfg: Partial<ProductAuditConfig>) {
  AUDIT_CFG = { ...AUDIT_CFG, ...cfg }
  return delay({ ok: true })
}
export function approveProduct(id: string) {
  const p = PRODUCT_AUDITS.find((x) => x.id === id)
  if (p) p.status = 'auto_approved'
  return delay({ ok: true })
}
export function rejectProduct(id: string, reason: string) {
  const p = PRODUCT_AUDITS.find((x) => x.id === id)
  if (p) {
    p.status = 'rejected'
    p.rejectReason = reason
  }
  return delay({ ok: true })
}

/* ============ 7. 广告管理 ============ */
// GET /api/v1/p/ads/slots · /creatives
const AD_SLOTS: AdSlot[] = Array.from({ length: 5 }).map(() => genAdSlot())
const AD_CREATIVES: AdCreative[] = AD_SLOTS.flatMap((s) =>
  Array.from({ length: 4 }).map(() => genAdCreative(s.id))
)

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

export function fetchAdSlots() {
  const list: AdSlotVM[] = AD_SLOTS.map((s, i) => ({
    id: s.id,
    name: s.name,
    target: s.target as AdSlotVM['target'],
    status: (['active', 'active', 'paused', 'ended', 'draft'] as const)[i % 5],
    creativeCount: AD_CREATIVES.filter((c) => c.slotId === s.id).length,
    ctr: faker.number.float({ min: 1.2, max: 12.5, fractionDigits: 1 }),
    impressions: faker.number.int({ min: 5000, max: 200000 }),
    preview: placeholderImage(300, 120)
  }))
  return delay(list)
}

export function fetchAdCreatives(slotId?: string) {
  const list = slotId ? AD_CREATIVES.filter((c) => c.slotId === slotId) : AD_CREATIVES
  return delay(list)
}

/* ============ 8. 选品广场 ============ */
// GET /api/v1/p/plaza/products · /pushes
const PLAZA_ITEMS = Array.from({ length: 25 }).map(() => {
  const card = genPlazaCard()
  return {
    ...card,
    status: faker.helpers.arrayElement(['pushing', 'pushing', 'pending', 'offline'] as const),
    agencyCount: faker.number.int({ min: 0, max: 200 })
  }
})

const PLAZA_PUSHES: PlazaPush[] = Array.from({ length: 12 }).map(() => genPlazaPush())

export type PlazaItem = (typeof PLAZA_ITEMS)[number]

export function fetchPlatformPlaza(tab: 'products' | 'factories' | 'records' = 'products') {
  if (tab === 'records') return delay(PLAZA_PUSHES)
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
  PLAZA_PUSHES.unshift({
    ...genPlazaPush(),
    target: payload.target as PlazaPush['target']
  } as PlazaPush)
  return delay({ ok: true, pushedCount: payload.productIds.length })
}

/* ============ 9. 会员套餐（走 member-service 真生效） ============ */

export function fetchPlatformMemberPlans() {
  return msGetAll()
}
export function savePlatformMemberPlan(plan: Partial<MemberPlan>) {
  return msSave(plan)
}
export function removePlatformMemberPlan(id: string) {
  return msRemove(id)
}
export function fetchPlanSubscriptions(planId: string) {
  return msGetSubsByPlan(planId)
}
export function fetchAllSubscriptions() {
  return msGetSubs()
}

/* ============ 10. 缴费订单（走 member-service 真生效） ============ */
export type PayOrderItem = PaymentRecord

export function fetchMemberPayOrders() {
  return msGetPayments()
}
export function approvePayRefund(id: string) {
  return msUpdatePay(id, 'refunded')
}
export function rejectPayRefund(id: string) {
  return msUpdatePay(id, 'paid')
}

/* ============ 11. 权限管理 ============ */
// GET/POST /api/v1/p/admins · /roles
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

const ROLES: AdminRole[] = [
  { id: 'r-1', name: '超级管理员', desc: '拥有所有权限', permissions: ['*'], builtIn: true },
  { id: 'r-2', name: '运营经理', desc: '商户/订单/营销管理', permissions: ['merchant:*', 'order:read', 'ad:*'] },
  { id: 'r-3', name: '审核员', desc: '商户与商品审核', permissions: ['audit:*'] },
  { id: 'r-4', name: '客服', desc: '处理售后与会员', permissions: ['order:read', 'member:read'] },
  { id: 'r-5', name: '财务', desc: '订单财务核对、提现审核', permissions: ['order:read', 'finance:*'] }
]

const ADMINS: AdminUser[] = Array.from({ length: 8 }).map((_, i) => ({
  id: 'a-' + (i + 1),
  nickname: chineseName(),
  username: 'admin_' + faker.string.alpha({ length: 6, casing: 'lower' }),
  role: ROLES[i % ROLES.length].name,
  avatar: placeholderImage(60, 60),
  status: i === 6 ? 'paused' : 'active',
  lastLoginAt: new Date(Date.now() - i * 86400000 * 2).toISOString()
}))

export function fetchAdminRoles() {
  return delay(ROLES)
}
export function fetchAdminUsers() {
  return delay(ADMINS)
}
export function saveAdminRole(role: Partial<AdminRole> & { id?: string }) {
  if (role.id) {
    const r = ROLES.find((x) => x.id === role.id)
    if (r) Object.assign(r, role)
  } else {
    ROLES.push({
      id: 'r-' + (ROLES.length + 1),
      name: role.name || '新角色',
      desc: role.desc || '',
      permissions: role.permissions || []
    })
  }
  return delay({ ok: true })
}
export function removeAdminRole(id: string) {
  const i = ROLES.findIndex((r) => r.id === id)
  if (i >= 0 && !ROLES[i].builtIn) ROLES.splice(i, 1)
  return delay({ ok: true })
}
export function saveAdminUser(user: Partial<AdminUser> & { id?: string }) {
  if (user.id) {
    const u = ADMINS.find((x) => x.id === user.id)
    if (u) Object.assign(u, user)
  } else {
    ADMINS.push({
      id: 'a-' + (ADMINS.length + 1),
      nickname: user.nickname || '新管理员',
      username: user.username || 'new_admin',
      role: user.role || '客服',
      avatar: placeholderImage(60, 60),
      status: 'active',
      lastLoginAt: new Date().toISOString()
    })
  }
  return delay({ ok: true })
}
export function toggleAdminUser(id: string) {
  const u = ADMINS.find((x) => x.id === id)
  if (u) u.status = u.status === 'active' ? 'paused' : 'active'
  return delay({ ok: true })
}
export function removeAdminUser(id: string) {
  const i = ADMINS.findIndex((x) => x.id === id)
  if (i >= 0) ADMINS.splice(i, 1)
  return delay({ ok: true })
}

/* ============ 12. 系统设置 ============ */
// GET/POST /api/v1/p/system/settings
export interface SystemSettings {
  site: { name: string; logo: string; icp: string }
  payment: { wechat: boolean; alipay: boolean; balance: boolean }
  logistics: { providers: string[]; defaultFreight: number }
  service: { phone: string; email: string; workTime: string }
  security: { passwordPolicy: 'strict' | 'normal' | 'loose'; ipWhitelist: string[] }
  business: { registerLimit: number; commissionRate: number }
}

let SYSTEM_SETTINGS: SystemSettings = {
  site: { name: '经纬科技', logo: 'https://picsum.photos/seed/logo/120/120', icp: '京ICP备2026000001号-1' },
  payment: { wechat: true, alipay: true, balance: false },
  logistics: { providers: ['顺丰', '京东', '中通', '圆通'], defaultFreight: 12 },
  service: { phone: '400-666-9999', email: 'service@jiujiu.com', workTime: '09:00 - 21:00' },
  security: { passwordPolicy: 'strict', ipWhitelist: ['127.0.0.1'] },
  business: { registerLimit: 500, commissionRate: 2 }
}

export function fetchSystemSettings() {
  return delay({ ...SYSTEM_SETTINGS })
}
export function saveSystemSettings(s: Partial<SystemSettings>) {
  SYSTEM_SETTINGS = { ...SYSTEM_SETTINGS, ...s } as SystemSettings
  return delay({ ok: true })
}

/* ============ 13. 功能开关 ============ */
// GET/POST /api/v1/p/feature-flags
const FLAGS: FeatureFlag[] = genFeatureFlags()

export interface GrayscaleConfig {
  audience: 'all' | 'factory' | 'store' | 'specific'
  percent: number
  rule: 'random' | 'whitelist' | 'level'
}

let GRAYSCALE: GrayscaleConfig = { audience: 'all', percent: 30, rule: 'random' }

export function fetchFeatureFlags() {
  return delay(FLAGS)
}
export function toggleFeatureFlag(key: string) {
  const f = FLAGS.find((x) => x.key === key)
  if (f) f.defaultEnabled = !f.defaultEnabled
  return delay({ ok: true })
}
export function fetchGrayscale() {
  return delay({ ...GRAYSCALE })
}
export function saveGrayscale(cfg: GrayscaleConfig) {
  GRAYSCALE = cfg
  return delay({ ok: true })
}
export function resetFeatureFlags() {
  FLAGS.forEach((f) => {
    if (f.key === 'home.booking' || f.key === 'menu.marketing_groupbuy') f.defaultEnabled = false
    else f.defaultEnabled = true
  })
  return delay({ ok: true })
}
