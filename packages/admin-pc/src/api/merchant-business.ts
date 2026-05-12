/**
 * 商家 PC 业务接口
 *
 * 大部分函数已切换到 NestJS 后端 `/api/v1/m/*`；
 * 个别尚未提供等价路由（如客服历史消息文本、营销活动卡片样例、代理申请草稿）
 * 暂时保留 mock / localStorage fallback，已用 `TODO` 注释标记。
 *
 * 后端分页接口统一返回 `{ list, total, page, pageSize }`，
 * 此处统一在函数内 unwrap 成数组，保持消费方 `View.vue` 现有签名不变。
 */
import request from '@/utils/http'
import {
  genUsers,
  genCommission,
  genPromoteSummary,
  genPlazaCard
} from '@jiujiu/shared/mock'
import type {
  MerchantDashboard,
  MerchantStats,
  Product,
  Category,
  Order,
  Refund,
  User,
  OrderStatus,
  Withdraw,
  Commission,
  PromoteSummary,
  PlazaProductCard
} from '@jiujiu/shared/types'
import {
  getAllPlans as msGetAllPlans,
  getCurrentSubscription as msGetSub,
  getQuota as msGetQuota,
  subscribePlan as msSubscribe,
  cancelSubscription as msCancel,
  setAutoRenew as msAutoRenew,
  useQuota as msUseQuota,
  getPayments as msPayments,
  getCurrentMerchantId,
  getMembershipNotices,
  type Subscription,
  type UsageQuota,
  type PaymentRecord,
  type MembershipNotice,
  type QuotaKey
} from './member-service'

export type { Subscription, UsageQuota, PaymentRecord, MembershipNotice, QuotaKey }

/** 本地 mock fallback 用：尚未接入真实接口的场景仍需要 200ms 模拟延时 */
const delay = <T>(data: T, ms = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms))

/** 后端分页响应解包 */
interface PageResp<T> { list: T[]; total: number; page: number; pageSize: number; hasMore?: boolean }
function unwrapList<T>(resp: PageResp<T> | T[] | undefined | null): T[] {
  if (!resp) return []
  if (Array.isArray(resp)) return resp
  return resp.list || []
}

/* ========== Dashboard ========== */

export interface DashboardData {
  stats: MerchantDashboard
  trend: MerchantStats
}

export async function fetchMerchantDashboard(period: MerchantStats['period'] = 'week') {
  // shape-adapted from backend: 后端 dashboard / stats 已直接对齐 MerchantDashboard / MerchantStats
  const [stats, trend] = await Promise.all([
    request.get<MerchantDashboard>({ url: '/api/v1/m/dashboard' }),
    request.get<MerchantStats>({ url: '/api/v1/m/stats', params: { period } })
  ])
  return { stats, trend } as DashboardData
}

/* ========== 商品 ========== */

export interface ProductQuery {
  status?: 'active' | 'sold-out' | 'pending' | 'rejected' | 'draft' | 'all'
  keyword?: string
  categoryId?: string
}

export async function fetchMerchantProducts(params: ProductQuery = {}) {
  // shape-adapted from backend: 后端返回分页对象，解包成数组保持消费端兼容
  const resp = await request.get<PageResp<Product>>({
    url: '/api/v1/m/products',
    params: { ...params, pageSize: 100 }
  })
  return unwrapList(resp)
}

export function updateProductStatus(ids: string[], status: Product['status']) {
  return request.post<{ ok: boolean; affected: number }>({
    url: '/api/v1/m/products/batch-status',
    data: { ids, status }
  })
}

export function removeProducts(ids: string[]) {
  return request
    .post<{ ok: boolean; affected: number }>({
      url: '/api/v1/m/products/batch-delete',
      data: { ids }
    })
    // shape-adapted from backend: 旧调用方读 `removed` 字段
    .then((r) => ({ ok: r.ok, removed: r.affected ?? ids.length }))
}

/* ========== 分类 ========== */

export function fetchMerchantCategories() {
  return request.get<Category[]>({ url: '/api/v1/m/categories' })
}

export function saveMerchantCategories(list: Category[]) {
  // shape-adapted from backend: PUT /m/categories 接受 { list }
  return request.put<{ ok: boolean }>({
    url: '/api/v1/m/categories',
    data: { list }
  })
}

/* ========== 代理商品 ========== */

const AGENCY_KEY = 'jiujiu_agency_applications'

export interface AgencyApplication {
  id: string
  productId: string
  productName: string
  productImage: string
  factoryId: string
  factoryName: string
  factoryPrice: number
  myRetailPrice: number
  markupRatio: number
  syncStatus: 'synced' | 'pending' | 'failed'
  status: 'pending' | 'approved' | 'rejected' | 'offline'
  appliedAt: string
}

/** 从后端拉所有代理申请（按商品展开） */
export async function fetchAgencyApplications(): Promise<AgencyApplication[]> {
  try {
    return await request.get<AgencyApplication[]>({
      url: '/api/v1/m/plaza/applications'
    })
  } catch {
    // 后端不可达时返回空列表（避免页面崩）
    return []
  }
}

/** 单条申请的字段更新（改价 / 上下架 / 取消） */
export function updateAgencyApplication(
  id: string,
  patch: Partial<Pick<AgencyApplication, 'myRetailPrice' | 'markupRatio' | 'status'>>
) {
  return request.patch<{ ok: boolean }>({
    url: `/api/v1/m/plaza/applications/${encodeURIComponent(id)}`,
    data: patch
  })
}

/** 取消（删除）一条代理申请 */
export function cancelAgencyApplication(id: string) {
  return request.del<{ ok: boolean }>({
    url: `/api/v1/m/plaza/applications/${encodeURIComponent(id)}`
  })
}

/** 创建代理申请（点"上架/一键上架" 时） */
export function createAgencyApplication(dto: {
  factoryId: string
  productIds: string[]
  markupPercent?: number
  autoSyncPrice?: boolean
  message?: string
}) {
  return request.post<{ ok: boolean; id: string; status: string }>({
    url: '/api/v1/m/plaza/agency',
    data: dto
  })
}

// kept for backward-compat with views that still call save (now a no-op,
// since each mutation goes through updateAgencyApplication individually)
export function saveAgencyApplications(_list: AgencyApplication[]): void {
  // No-op — per-row save replaced this batch write.
}

/* ========== 订单 ========== */

export interface OrderQuery {
  status?: OrderStatus | 'all'
  keyword?: string
}

export async function fetchMerchantOrders(params: OrderQuery = {}) {
  // shape-adapted from backend: 解包分页结构
  const resp = await request.get<PageResp<Order>>({
    url: '/api/v1/m/orders',
    params: { ...params, pageSize: 100 }
  })
  return unwrapList(resp)
}

export async function shipOrders(ids: string[]) {
  // shape-adapted from backend: 后端 batch-ship 接 items: { id, company, trackingNumber }[]
  const items = ids.map((id) => ({ id, company: '默认快递', trackingNumber: 'TR' + Date.now() }))
  const r = await request.post<{ ok: boolean; count: number }>({
    url: '/api/v1/m/orders/batch-ship',
    data: { items }
  })
  return { ok: r.ok, shipped: r.count ?? ids.length }
}

/* ========== 售后 ========== */

export async function fetchAftersaleList() {
  const resp = await request.get<PageResp<Refund>>({
    url: '/api/v1/m/aftersales',
    params: { pageSize: 100 }
  })
  return unwrapList(resp)
}

export function reviewRefund(refundId: string, action: 'agreed' | 'rejected', remark?: string) {
  // shape-adapted from backend: 后端 review 接 { action: 'agree'|'reject' }
  const backendAction = action === 'agreed' ? 'agree' : 'reject'
  return request.post<{ ok: boolean }>({
    url: `/api/v1/m/aftersales/${refundId}/review`,
    data: { action: backendAction, reason: remark }
  })
}

/* ========== 客户 ========== */

const CUSTOMERS_MOCK_CACHE: User[] = genUsers(40, { role: 'customer' })

export interface CustomerTier {
  key: 'all' | 'normal' | 'vip' | 'blacklist'
  label: string
}

function isVipMock(u: User): boolean {
  const code = u.id.charCodeAt(u.id.length - 1)
  return code % 4 === 0
}

export async function fetchCustomers(tier: CustomerTier['key'] = 'all') {
  // shape-adapted from backend: 后端 customers 字段为 {id, avatar, nickname, phone, kind, priceTier, priceAuthorized}
  // 缺少 User 必填的 role/status/createdAt 字段，因此映射时补齐默认值
  try {
    const resp = await request.get<PageResp<any>>({
      url: '/api/v1/m/customers',
      params: { pageSize: 100 }
    })
    const raw = unwrapList(resp)
    let list: User[] = raw.map(
      (u: any): User => ({
        id: u.id,
        nickname: u.nickname ?? '',
        avatar: u.avatar ?? '',
        phone: u.phone,
        role: u.kind === 'promoter' ? 'promoter' : 'customer',
        status: 'active',
        createdAt: u.createdAt ?? new Date().toISOString(),
        updatedAt: u.updatedAt ?? new Date().toISOString()
      })
    )
    if (!list.length) list = CUSTOMERS_MOCK_CACHE
    if (tier === 'vip') list = list.filter(isVipMock)
    else if (tier === 'normal') list = list.filter((u) => !isVipMock(u))
    else if (tier === 'blacklist') list = list.filter((u) => u.status === 'disabled')
    return list
  } catch {
    let list = CUSTOMERS_MOCK_CACHE
    if (tier === 'vip') list = list.filter(isVipMock)
    else if (tier === 'normal') list = list.filter((u) => !isVipMock(u))
    else if (tier === 'blacklist') list = list.filter((u) => u.status === 'disabled')
    return list
  }
}

/* ========== 营销活动 ========== */

export interface MarketingActivity {
  id: string
  type: 'coupon' | 'discount' | 'group' | 'seckill' | 'distribute'
  title: string
  description: string
  status: 'running' | 'paused' | 'ended' | 'draft'
  startAt: string
  endAt: string
  joinCount: number
  conversion: number
}

const MARKETING_MOCK: MarketingActivity[] = [
  {
    id: 'mk-1',
    type: 'coupon',
    title: '新人立减 20 元',
    description: '注册即送，订单满 99 可用',
    status: 'running',
    startAt: '2026-04-15',
    endAt: '2026-06-30',
    joinCount: 1245,
    conversion: 0.32
  },
  {
    id: 'mk-2',
    type: 'discount',
    title: '满 299 立减 50',
    description: '全场可用',
    status: 'running',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    joinCount: 856,
    conversion: 0.41
  },
  {
    id: 'mk-3',
    type: 'group',
    title: '3 人成团 7.5 折',
    description: '指定品类',
    status: 'paused',
    startAt: '2026-05-05',
    endAt: '2026-05-15',
    joinCount: 326,
    conversion: 0.18
  },
  {
    id: 'mk-4',
    type: 'seckill',
    title: '每日 10 点限时秒杀',
    description: '每日 100 件，先到先得',
    status: 'running',
    startAt: '2026-05-08',
    endAt: '2026-05-20',
    joinCount: 2100,
    conversion: 0.55
  },
  {
    id: 'mk-5',
    type: 'distribute',
    title: '分销返佣 8%',
    description: '邀请好友购买即可',
    status: 'draft',
    startAt: '2026-05-15',
    endAt: '2026-07-15',
    joinCount: 0,
    conversion: 0
  }
]

// TODO: no backend equivalent for activity card list (only /m/marketing/overview & /m/marketing/coupons exist)
// 后端营销聚合接口与此处展示的"营销活动卡片"字段不一致，先继续走 mock。
export function fetchMarketingActivities() {
  return delay(MARKETING_MOCK)
}

/* ========== 选品广场 ========== */

const PLAZA_CARDS_FALLBACK: PlazaProductCard[] = Array.from({ length: 30 }).map(() => genPlazaCard())

export async function fetchPlazaCards() {
  // shape-adapted from backend: 后端 /m/plaza/products 返回分页结构，items 已对齐 PlazaProductCard
  try {
    const resp = await request.get<PageResp<PlazaProductCard>>({
      url: '/api/v1/m/plaza/products',
      params: { pageSize: 60 }
    })
    const list = unwrapList(resp)
    return list.length ? list : PLAZA_CARDS_FALLBACK
  } catch {
    return PLAZA_CARDS_FALLBACK
  }
}

export interface FactoryContact {
  contactName: string
  contactPhone: string
  wechat: string
  email: string
  address: string
  workTime: string
}

export interface FactoryDetail {
  factoryId: string
  factoryName: string
  factoryLogo: string
  rating: number
  yearsInBusiness: number
  description: string
  certifications: string[]
  contact: FactoryContact
  cards: PlazaProductCard[]
}

export async function fetchFactoryDetail(factoryId: string): Promise<FactoryDetail> {
  // shape-adapted from backend: backend `plazaFactory` returns {id, name, logo, contact, qualifications, ...}
  // 不带 cards / rating / yearsInBusiness，所以补 mock 字段。
  try {
    const f = await request.get<any>({ url: `/api/v1/m/plaza/factories/${factoryId}` })
    const cards = PLAZA_CARDS_FALLBACK.filter((c) => c.factoryId === factoryId)
    return {
      factoryId: f.id || factoryId,
      factoryName: f.name || '未知工厂',
      factoryLogo:
        f.logo ||
        'https://api.dicebear.com/7.x/initials/svg?seed=' + (f.name || factoryId),
      rating: 4.7,
      yearsInBusiness: 8,
      description: f.desc || '专注品质制造，全国设有多个生产基地。',
      certifications:
        (f.qualifications || []).map((q: any) => q.name || '资质').filter(Boolean) || [],
      contact: {
        contactName: f.contact?.contactName || '联系人',
        contactPhone: f.contact?.phone || f.contact?.contactPhone || '',
        wechat: f.contact?.wechat || '',
        email: f.contact?.email || '',
        address: f.contact?.address || f.address || '',
        workTime: f.contact?.workTime || '工作日 09:00 - 18:00'
      },
      cards: cards.length ? cards : PLAZA_CARDS_FALLBACK.slice(0, 6)
    }
  } catch {
    // Fallback to local synthesis
    const cards = PLAZA_CARDS_FALLBACK.filter((c) => c.factoryId === factoryId)
    const firstCard = cards[0] || PLAZA_CARDS_FALLBACK[0]
    const seed = factoryId.charCodeAt(0) + factoryId.charCodeAt(factoryId.length - 1)
    const phoneSuffix = String(10000000 + (seed * 7919) % 89999999)
    return {
      factoryId,
      factoryName: firstCard?.factoryName || '经纬科技',
      factoryLogo: 'https://api.dicebear.com/7.x/initials/svg?seed=' + (firstCard?.factoryName || 'F'),
      rating: 4.7,
      yearsInBusiness: 8,
      description: '专注实木家具 8 年，全国设有 3 大生产基地，月产能 5000 件。',
      certifications: ['ISO9001 质量管理体系认证', 'FSC 森林管理委员会认证', '环保板材 E0 级'],
      contact: {
        contactName: ['张志强', '李明华', '王建国', '陈伟', '刘磊'][seed % 5] + ' 经理',
        contactPhone: '138' + phoneSuffix.slice(0, 8),
        wechat: 'jiujiu_' + factoryId.slice(0, 6).toLowerCase(),
        email:
          'sales@' +
          (firstCard?.factoryName?.replace(/[^a-z]/gi, '').slice(0, 6).toLowerCase() || 'factory') +
          '.com',
        address: ['广东佛山顺德区龙江工业园', '河北香河家具产业园', '江苏徐州沛县家具基地', '浙江安吉竹木家具产业带'][seed % 4],
        workTime: '工作日 09:00 - 18:00 · 周末预约'
      },
      cards: cards.length ? cards : PLAZA_CARDS_FALLBACK.slice(0, 6)
    }
  }
}

/* ========== 门店 ========== */

export interface StoreItem {
  id: string
  name: string
  address: string
  region: string
  contact: string
  phone: string
  status: 'online' | 'offline' | 'pending'
  authStatus: 'authorized' | 'unauthorized' | 'expired'
  staffCount: number
  createdAt: string
}

export async function fetchStores() {
  const resp = await request.get<PageResp<StoreItem>>({
    url: '/api/v1/m/stores',
    params: { pageSize: 100 }
  })
  return unwrapList(resp)
}

export async function saveStore(s: StoreItem) {
  // shape-adapted from backend: 后端只有 POST /m/stores 创建，无 PUT 全量更新；
  // 这里 POST 即可：新增 / 更新均路由到 createStore。
  await request.post<{ ok: boolean } | StoreItem>({
    url: '/api/v1/m/stores',
    data: s
  })
  return { ok: true }
}

export async function removeStore(id: string) {
  await request.del<{ ok: boolean }>({ url: `/api/v1/m/stores/${id}` })
  return { ok: true }
}

/* ========== 员工 ========== */

export type StaffRole = 'manager' | 'cashier' | 'sales' | 'admin'

export interface StaffItem {
  id: string
  avatar: string
  name: string
  phone: string
  role: StaffRole
  storeId: string
  storeName: string
  status: 'active' | 'left'
  performance: number
  joinedAt: string
}

export async function fetchStaff() {
  const resp = await request.get<PageResp<StaffItem>>({
    url: '/api/v1/m/staffs',
    params: { pageSize: 100 }
  })
  return unwrapList(resp)
}

export async function saveStaff(s: StaffItem) {
  if (s.id) {
    await request.put<{ ok: boolean }>({ url: `/api/v1/m/staffs/${s.id}`, data: s })
  } else {
    await request.post<{ ok: boolean }>({ url: '/api/v1/m/staffs', data: s })
  }
  return { ok: true }
}

export async function removeStaff(id: string) {
  await request.del<{ ok: boolean }>({ url: `/api/v1/m/staffs/${id}` })
  return { ok: true }
}

/* ========== 店铺装修 ========== */

export interface DecorateModule {
  id: string
  type: 'banner' | 'category' | 'hot' | 'new' | 'video' | 'product-list' | 'rich-text' | 'coupon'
  title: string
  visible: boolean
  config: Record<string, unknown>
}

const DECORATE_DEFAULT: DecorateModule[] = [
  { id: 'm-1', type: 'banner', title: '顶部 Banner 轮播', visible: true, config: { height: 360 } },
  { id: 'm-2', type: 'category', title: '分类导航', visible: true, config: { columns: 5 } },
  { id: 'm-3', type: 'coupon', title: '优惠券领取', visible: true, config: { autoLoad: true } },
  { id: 'm-4', type: 'hot', title: '热销爆款', visible: true, config: { limit: 6 } },
  { id: 'm-5', type: 'new', title: '新品上架', visible: true, config: { limit: 6 } },
  { id: 'm-6', type: 'product-list', title: '为你推荐', visible: true, config: { algorithm: 'cf' } }
]

export async function fetchDecorate(): Promise<DecorateModule[]> {
  // shape-adapted from backend: 后端 `ShopDecorate` 是单条记录（modules JSON 字段），unwrap modules 数组
  try {
    const d = await request.get<any>({ url: '/api/v1/m/shop/decorate' })
    if (Array.isArray(d?.modules) && d.modules.length) return d.modules
    if (Array.isArray(d) && d.length) return d
  } catch {
    /* fall through to default */
  }
  return [...DECORATE_DEFAULT]
}

export async function saveDecorate(modules: DecorateModule[]) {
  await request.post<{ ok: boolean }>({
    url: '/api/v1/m/shop/decorate',
    data: { modules }
  })
  return { ok: true }
}

/* ========== 在线客服 ========== */

export interface ChatSession {
  id: string
  customerId: string
  customerName: string
  customerAvatar: string
  lastMessage: string
  lastTime: string
  unread: number
  online: boolean
  tags: string[]
  totalOrders: number
  totalSpent: number
}

export interface ChatMessage {
  id: string
  sessionId: string
  from: 'customer' | 'merchant' | 'system'
  text: string
  time: string
  type?: 'text' | 'image' | 'order' | 'product'
  attachUrl?: string
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  // shape-adapted from backend: 后端字段 {id, userId, userName, userAvatar, lastMessageAt, unreadCount, status}
  try {
    const raw = await request.get<any[]>({ url: '/api/v1/m/chat/sessions' })
    return (raw || []).map(
      (s: any): ChatSession => ({
        id: s.id,
        customerId: s.userId || s.customerId || '',
        customerName: s.userName || s.customerName || '客户',
        customerAvatar:
          s.userAvatar ||
          s.customerAvatar ||
          'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.id,
        lastMessage: s.lastMessage || '',
        lastTime: s.lastMessageAt || s.lastTime || new Date().toISOString(),
        unread: s.unreadCount ?? s.unread ?? 0,
        online: s.status === 'online',
        tags: s.tags || [],
        totalOrders: s.totalOrders ?? 0,
        totalSpent: s.totalSpent ?? 0
      })
    )
  } catch {
    return []
  }
}

export async function fetchChatMessages(sessionId: string): Promise<ChatMessage[]> {
  // shape-adapted from backend: 后端 ChatMessage 用 {id, sessionId, sender, type, content, createdAt}
  try {
    const raw = await request.get<any[]>({ url: `/api/v1/m/chat/sessions/${sessionId}/messages` })
    return (raw || []).map(
      (m: any): ChatMessage => ({
        id: m.id,
        sessionId: m.sessionId,
        from: m.sender === 'merchant' ? 'merchant' : m.sender === 'system' ? 'system' : 'customer',
        text: m.content || m.text || '',
        time: m.createdAt || m.time || new Date().toISOString(),
        type: m.type || 'text',
        attachUrl: m.attachUrl
      })
    )
  } catch {
    return []
  }
}

export async function sendChatMessage(sessionId: string, text: string): Promise<ChatMessage> {
  // shape-adapted from backend: 后端返回的 ChatMessage 仍是 {sender, content, createdAt}
  const m = await request.post<any>({
    url: `/api/v1/m/chat/sessions/${sessionId}/messages`,
    data: { type: 'text', content: text }
  })
  return {
    id: m?.id || `${sessionId}-m-${Date.now()}`,
    sessionId: m?.sessionId || sessionId,
    from: 'merchant',
    text: m?.content || text,
    time: m?.createdAt || new Date().toISOString(),
    type: 'text'
  }
}

/* ========== 佣金 ========== */

export interface CommissionConfig {
  level1Percent: number
  level2Percent: number
  visibleToPromoter: boolean
  allowOffline: boolean
  enabled: boolean
}

const COMMISSION_DEFAULT: CommissionConfig = {
  level1Percent: 8,
  level2Percent: 3,
  visibleToPromoter: true,
  allowOffline: false,
  enabled: true
}

export async function fetchCommissionConfig(): Promise<CommissionConfig> {
  // shape-adapted from backend: 后端返回 { default, productRules }，此处只取 default
  try {
    const r = await request.get<{ default: CommissionConfig }>({
      url: '/api/v1/m/commission/rules'
    })
    return r?.default || COMMISSION_DEFAULT
  } catch {
    return COMMISSION_DEFAULT
  }
}

export async function saveCommissionConfig(cfg: CommissionConfig) {
  // shape-adapted from backend: 后端接 { default, productRules } 结构
  await request.post<{ ok: boolean }>({
    url: '/api/v1/m/commission/rules',
    data: { default: cfg }
  })
  return { ok: true }
}

// TODO: no backend equivalent for paginated commission history list
// 后端 /m/commissions 返回的是规则汇总，并非历史明细，先保留 mock。
export function fetchCommissionHistory(): Promise<Commission[]> {
  return delay(Array.from({ length: 20 }).map(() => genCommission()))
}

export async function fetchPromoteSummary(): Promise<PromoteSummary> {
  // shape-adapted from backend: 后端字段名比 PromoteSummary 少，缺失字段用 genPromoteSummary 兜底
  try {
    const r = await request.get<Partial<PromoteSummary>>({ url: '/api/v1/m/promote-summary' })
    return { ...genPromoteSummary(), ...(r || {}) }
  } catch {
    return genPromoteSummary()
  }
}

/* ========== 提现 ========== */

export async function fetchBalance() {
  // shape-adapted from backend: 后端 {total, available, frozen, withdrawn} → 旧字段 {available, pending, totalWithdrawn}
  try {
    const r = await request.get<{ total: number; available: number; frozen: number; withdrawn: number }>({
      url: '/api/v1/m/balance'
    })
    return {
      available: r.available || 0,
      pending: r.frozen || 0,
      totalWithdrawn: r.withdrawn || 0
    }
  } catch {
    return { available: 0, pending: 0, totalWithdrawn: 0 }
  }
}

export async function fetchWithdraws() {
  const resp = await request.get<PageResp<Withdraw>>({
    url: '/api/v1/m/withdraws',
    params: { pageSize: 100 }
  })
  return unwrapList(resp)
}

export interface WithdrawApply {
  applyAmount: number
  method: 'wechat' | 'bank' | 'alipay'
  account: string
}

export async function applyWithdraw(dto: WithdrawApply) {
  // shape-adapted from backend: 后端 createWithdraw 接 { amount, method, account }
  const item = await request.post<Withdraw>({
    url: '/api/v1/m/withdraws',
    data: {
      amount: dto.applyAmount,
      method: dto.method,
      account: dto.account
    }
  })
  return { ok: true, item }
}

/* ========== 会员（沿用 member-service 维持平台↔商家 状态同步） ========== */
//
// 注意：/api/v1/m/membership/* 真实路由存在，但 admin-pc 当前同时存在「平台编辑套餐 ↔ 商家查看套餐」的内嵌联动，
// 二者通过 member-service 的 localStorage 状态共享。直接切到后端会破坏 platform-business 的 mock 编辑流程。
// TODO: 等 platform-business 一并切到 /api/v1/p/membership/* 后再换。

export interface CurrentMembership {
  subscribed: boolean
  planId?: string
  planCode?: string
  planType?: 'basic' | 'ad' | 'addon'
  planName?: string
  expiresAt?: string
  daysRemaining?: number
  totalDays?: number
  autoRenew?: boolean
  status?: Subscription['status']
}

export async function fetchMemberPlans() {
  const all = await msGetAllPlans()
  return all
}

export async function fetchCurrentMembership(): Promise<CurrentMembership> {
  const sub = await msGetSub()
  if (!sub) return { subscribed: false }
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(sub.endAt).getTime() - Date.now()) / 86400000)
  )
  return {
    subscribed: true,
    planId: sub.planId,
    planCode: sub.planCode,
    planType: sub.planType,
    planName: sub.planName,
    expiresAt: sub.endAt.slice(0, 10),
    daysRemaining,
    totalDays: sub.totalDays,
    autoRenew: sub.autoRenew,
    status: sub.status
  }
}

export function fetchMerchantQuota() {
  return msGetQuota()
}

export function subscribeMemberPlan(
  planId: string,
  payMethod: 'wechat' | 'alipay' | 'balance' = 'wechat'
) {
  return msSubscribe({ planId, payMethod })
}

export function cancelMemberSubscription() {
  return msCancel()
}

export function setMembershipAutoRenew(autoRenew: boolean) {
  return msAutoRenew(getCurrentMerchantId(), autoRenew)
}

export function consumeQuota(key: QuotaKey, count = 1) {
  return msUseQuota(key, count)
}

export function fetchMyPayments() {
  return msPayments({ merchantId: getCurrentMerchantId() })
}

export function fetchMembershipNotices() {
  return getMembershipNotices()
}
