/**
 * 商家 PC 业务接口（Mock 实现）
 *
 * 复用 @jiujiu/shared 的 mock 工厂，避免在 admin-pc 内重写数据。
 * 接真后端时，把每个函数体替换为 request.get/post 即可。
 */
import {
  genMerchantDashboard,
  genMerchantStats,
  genProducts,
  genMerchantCategories,
  genOrders,
  genRefund,
  genUsers,
  genWithdraw,
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
  CommissionRule,
  PromoteSummary,
  MemberPlan,
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

const delay = <T>(data: T, ms = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms))

/* ========== Dashboard ========== */

export interface DashboardData {
  stats: MerchantDashboard
  trend: MerchantStats
}

export function fetchMerchantDashboard(period: MerchantStats['period'] = 'week') {
  return delay<DashboardData>({
    stats: genMerchantDashboard(),
    trend: genMerchantStats(period)
  })
}

/* ========== 商品 ========== */

const PRODUCTS_CACHE: Product[] = genProducts(50, { merchantId: 'm-001' })

export interface ProductQuery {
  status?: 'active' | 'sold-out' | 'pending' | 'rejected' | 'draft' | 'all'
  keyword?: string
  categoryId?: string
}

export function fetchMerchantProducts(params: ProductQuery = {}) {
  let list = PRODUCTS_CACHE
  if (params.status && params.status !== 'all') {
    list = list.filter((p) => p.status === params.status)
  }
  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(kw))
  }
  return delay(list)
}

export function updateProductStatus(ids: string[], status: Product['status']) {
  for (const p of PRODUCTS_CACHE) {
    if (ids.includes(p.id)) p.status = status
  }
  return delay({ ok: true, affected: ids.length })
}

export function removeProducts(ids: string[]) {
  const idx = PRODUCTS_CACHE.length
  for (let i = PRODUCTS_CACHE.length - 1; i >= 0; i--) {
    if (ids.includes(PRODUCTS_CACHE[i].id)) PRODUCTS_CACHE.splice(i, 1)
  }
  return delay({ ok: true, removed: idx - PRODUCTS_CACHE.length })
}

/* ========== 分类 ========== */

const CATEGORY_KEY = 'admin_pc_merchant_categories'

function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  return genMerchantCategories('m-001', 6)
}

function saveCategories(list: Category[]) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(list))
}

export function fetchMerchantCategories() {
  return delay(loadCategories())
}

export function saveMerchantCategories(list: Category[]) {
  saveCategories(list)
  return delay({ ok: true })
}

/* ========== 代理商品 ========== */

const AGENCY_KEY = 'jiujiu_agency_applications'

export interface AgencyApplication {
  id: string
  productId: string
  productName: string
  productImage: string
  factoryName: string
  factoryPrice: number
  myRetailPrice: number
  markupRatio: number
  syncStatus: 'synced' | 'pending' | 'failed'
  status: 'pending' | 'approved' | 'rejected' | 'offline'
  appliedAt: string
}

export function fetchAgencyApplications(): Promise<AgencyApplication[]> {
  try {
    const raw = localStorage.getItem(AGENCY_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length > 0) return delay(list)
    }
  } catch {
    /* noop */
  }
  // 兜底：根据当前 PRODUCTS_CACHE 头部 8 个生成示例
  const sample: AgencyApplication[] = PRODUCTS_CACHE.slice(0, 8).map((p, i) => {
    const factoryPrice = p.priceWholesaleMin || 800
    const myRetailPrice = Math.round(factoryPrice * 1.45)
    const statusList: AgencyApplication['status'][] = [
      'pending',
      'approved',
      'approved',
      'approved',
      'rejected',
      'offline',
      'approved',
      'pending'
    ]
    return {
      id: `ag-${p.id}`,
      productId: p.id,
      productName: p.name,
      productImage: p.images?.[0] || '',
      factoryName: ['原木匠造工坊', '云端家居', '北辰木业', '锦绣布艺'][i % 4],
      factoryPrice,
      myRetailPrice,
      markupRatio: Math.round(((myRetailPrice - factoryPrice) / factoryPrice) * 100),
      syncStatus: ['synced', 'pending', 'failed'][i % 3] as AgencyApplication['syncStatus'],
      status: statusList[i],
      appliedAt: new Date(Date.now() - i * 86400000).toISOString()
    }
  })
  return delay(sample)
}

/* ========== 订单 ========== */

const ORDERS_CACHE: Order[] = genOrders(60, { merchantId: 'm-001' })

export interface OrderQuery {
  status?: OrderStatus | 'all'
  keyword?: string
}

export function fetchMerchantOrders(params: OrderQuery = {}) {
  let list = ORDERS_CACHE
  if (params.status && params.status !== 'all') {
    list = list.filter((o) => o.status === params.status)
  }
  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter(
      (o) =>
        o.no.toLowerCase().includes(kw) ||
        (o.items || []).some((i) => i.productName?.toLowerCase().includes(kw))
    )
  }
  return delay(list)
}

export function shipOrders(ids: string[]) {
  for (const o of ORDERS_CACHE) {
    if (ids.includes(o.id) && o.status === 'pending_shipment') {
      o.status = 'shipped'
      o.shippedAt = new Date().toISOString()
    }
  }
  return delay({ ok: true, shipped: ids.length })
}

/* ========== 售后 ========== */

const AFTERSALE_CACHE: Refund[] = ORDERS_CACHE.slice(0, 20).map((o) => genRefund(o.id))

export function fetchAftersaleList() {
  return delay(AFTERSALE_CACHE)
}

export function reviewRefund(refundId: string, action: 'agreed' | 'rejected', remark?: string) {
  const target = AFTERSALE_CACHE.find((r) => r.id === refundId)
  if (target) {
    target.status = action
    target.merchantReply = remark
    target.updatedAt = new Date().toISOString()
  }
  return delay({ ok: true })
}

/* ========== 客户 ========== */

const CUSTOMERS_CACHE: User[] = genUsers(40, { role: 'customer' })

export interface CustomerTier {
  key: 'all' | 'normal' | 'vip' | 'blacklist'
  label: string
}

// 模拟会员分层：取用户 id 末位 hash 决定
function isVipMock(u: User): boolean {
  const code = u.id.charCodeAt(u.id.length - 1)
  return code % 4 === 0
}

export function fetchCustomers(tier: CustomerTier['key'] = 'all') {
  let list = CUSTOMERS_CACHE
  if (tier === 'vip') list = list.filter(isVipMock)
  if (tier === 'normal') list = list.filter((u) => !isVipMock(u))
  if (tier === 'blacklist') list = list.filter((u) => u.status === 'disabled')
  return delay(list)
}

/* ========== 营销活动（轻 mock） ========== */

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

const MARKETING_CACHE: MarketingActivity[] = [
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

export function fetchMarketingActivities() {
  return delay(MARKETING_CACHE)
}

/* ========== S3.5 补齐 · 选品广场 ========== */

const PLAZA_CARDS_CACHE: PlazaProductCard[] = Array.from({ length: 30 }).map(() => genPlazaCard())

export function fetchPlazaCards() {
  return delay(PLAZA_CARDS_CACHE)
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

export function fetchFactoryDetail(factoryId: string): Promise<FactoryDetail> {
  const cards = PLAZA_CARDS_CACHE.filter((c) => c.factoryId === factoryId)
  const firstCard = cards[0] || PLAZA_CARDS_CACHE[0]
  const seed = factoryId.charCodeAt(0) + factoryId.charCodeAt(factoryId.length - 1)
  const phoneSuffix = String(10000000 + (seed * 7919) % 89999999)
  return delay({
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
      email: 'sales@' + (firstCard?.factoryName?.replace(/[^a-z]/gi, '').slice(0, 6).toLowerCase() || 'factory') + '.com',
      address: ['广东佛山顺德区龙江工业园', '河北香河家具产业园', '江苏徐州沛县家具基地', '浙江安吉竹木家具产业带'][seed % 4],
      workTime: '工作日 09:00 - 18:00 · 周末预约'
    },
    cards: cards.length ? cards : PLAZA_CARDS_CACHE.slice(0, 6)
  })
}

/* ========== S3.5 补齐 · 门店 ========== */

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

const STORE_CACHE: StoreItem[] = [
  {
    id: 's-1',
    name: '经纬科技（北京·三里屯）',
    address: '北京市朝阳区三里屯太古里南区 B1-08',
    region: '北京市',
    contact: '王经理',
    phone: '138****8888',
    status: 'online',
    authStatus: 'authorized',
    staffCount: 12,
    createdAt: '2024-08-15'
  },
  {
    id: 's-2',
    name: '经纬科技（上海·徐家汇）',
    address: '上海市徐汇区华山路 199 号港汇恒隆 5F',
    region: '上海市',
    contact: '陈店长',
    phone: '139****6666',
    status: 'online',
    authStatus: 'authorized',
    staffCount: 8,
    createdAt: '2024-11-02'
  },
  {
    id: 's-3',
    name: '经纬科技体验店（杭州·西湖银泰）',
    address: '杭州市西湖区西湖银泰城 3F',
    region: '杭州市',
    contact: '李店长',
    phone: '137****2222',
    status: 'online',
    authStatus: 'expired',
    staffCount: 5,
    createdAt: '2025-03-12'
  },
  {
    id: 's-4',
    name: '经纬科技（深圳·万象城）',
    address: '深圳市罗湖区万象城 B2',
    region: '深圳市',
    contact: '黄店长',
    phone: '136****5555',
    status: 'offline',
    authStatus: 'authorized',
    staffCount: 6,
    createdAt: '2025-06-18'
  },
  {
    id: 's-5',
    name: '经纬科技（成都·太古里）',
    address: '成都市锦江区中纱帽街 8 号',
    region: '成都市',
    contact: '张店长',
    phone: '135****9999',
    status: 'pending',
    authStatus: 'unauthorized',
    staffCount: 0,
    createdAt: '2026-04-28'
  }
]

export function fetchStores() {
  return delay(STORE_CACHE)
}

export function saveStore(s: StoreItem) {
  const i = STORE_CACHE.findIndex((x) => x.id === s.id)
  if (i >= 0) STORE_CACHE[i] = s
  else STORE_CACHE.push({ ...s, id: 's-' + Date.now() })
  return delay({ ok: true })
}

export function removeStore(id: string) {
  const i = STORE_CACHE.findIndex((x) => x.id === id)
  if (i >= 0) STORE_CACHE.splice(i, 1)
  return delay({ ok: true })
}

/* ========== S3.5 补齐 · 员工 ========== */

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

const STAFF_NAMES = ['王明亮', '陈思宇', '李大伟', '黄雯雯', '张志强', '吴美玲', '林天扬', '何婉清']
const STAFF_CACHE: StaffItem[] = STAFF_NAMES.map((name, i) => ({
  id: 'st-' + (i + 1),
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=staff${i}`,
  name,
  phone: '1' + (380000000 + i * 1234567).toString().padStart(10, '3'),
  role: (['manager', 'cashier', 'sales', 'cashier', 'sales', 'manager', 'sales', 'admin'] as const)[i],
  storeId: 's-' + ((i % 4) + 1),
  storeName: STORE_CACHE[i % 4].name,
  status: i === 7 ? 'left' : 'active',
  performance: Math.round((Math.random() * 50000 + 10000) * 100) / 100,
  joinedAt: '2025-' + String((i % 12) + 1).padStart(2, '0') + '-15'
}))

export function fetchStaff() {
  return delay(STAFF_CACHE)
}

export function saveStaff(s: StaffItem) {
  const i = STAFF_CACHE.findIndex((x) => x.id === s.id)
  if (i >= 0) STAFF_CACHE[i] = s
  else STAFF_CACHE.push({ ...s, id: 'st-' + Date.now() })
  return delay({ ok: true })
}

export function removeStaff(id: string) {
  const i = STAFF_CACHE.findIndex((x) => x.id === id)
  if (i >= 0) STAFF_CACHE.splice(i, 1)
  return delay({ ok: true })
}

/* ========== S3.5 补齐 · 店铺装修 ========== */

export interface DecorateModule {
  id: string
  type: 'banner' | 'category' | 'hot' | 'new' | 'video' | 'product-list' | 'rich-text' | 'coupon'
  title: string
  visible: boolean
  config: Record<string, unknown>
}

const DECORATE_KEY = 'admin_pc_decorate_modules'

const DECORATE_DEFAULT: DecorateModule[] = [
  { id: 'm-1', type: 'banner', title: '顶部 Banner 轮播', visible: true, config: { height: 360 } },
  { id: 'm-2', type: 'category', title: '分类导航', visible: true, config: { columns: 5 } },
  { id: 'm-3', type: 'coupon', title: '优惠券领取', visible: true, config: { autoLoad: true } },
  { id: 'm-4', type: 'hot', title: '热销爆款', visible: true, config: { limit: 6 } },
  { id: 'm-5', type: 'new', title: '新品上架', visible: true, config: { limit: 6 } },
  { id: 'm-6', type: 'product-list', title: '为你推荐', visible: true, config: { algorithm: 'cf' } }
]

export function fetchDecorate(): Promise<DecorateModule[]> {
  try {
    const raw = localStorage.getItem(DECORATE_KEY)
    if (raw) return delay(JSON.parse(raw))
  } catch {
    /* noop */
  }
  return delay([...DECORATE_DEFAULT])
}

export function saveDecorate(modules: DecorateModule[]) {
  localStorage.setItem(DECORATE_KEY, JSON.stringify(modules))
  return delay({ ok: true })
}

/* ========== S3.5 补齐 · 在线客服 ========== */

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

const CHAT_SESSIONS: ChatSession[] = Array.from({ length: 8 }).map((_, i) => ({
  id: 'c-' + (i + 1),
  customerId: 'u-' + (i + 1),
  customerName: ['张小明', '李婷婷', '王浩然', '陈静怡', '林志远', '黄思思', '吴俊豪', '何小美'][i],
  customerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=c${i}`,
  lastMessage: [
    '请问这款餐桌还有库存吗？',
    '收到了，看起来不错！',
    '能不能再便宜一点呢？',
    '什么时候发货？',
    '颜色有点差异，能换吗？',
    '感谢推荐～',
    '是定制的吗？',
    '已收到货，质量很好！'
  ][i],
  lastTime: new Date(Date.now() - i * 3600_000).toISOString(),
  unread: i < 3 ? i + 1 : 0,
  online: i < 5,
  tags: [['VIP', '复购'], ['新客'], ['犹豫期'], ['VIP'], ['流失'], ['推广员'], ['新客'], ['VIP', '高客单']][i],
  totalOrders: Math.floor(Math.random() * 30) + 1,
  totalSpent: Math.floor(Math.random() * 50000) + 1000
}))

const CHAT_MESSAGES: ChatMessage[] = CHAT_SESSIONS.flatMap((s, idx) =>
  Array.from({ length: 4 + idx }).map((_, i) => ({
    id: `${s.id}-m-${i}`,
    sessionId: s.id,
    from: (i % 2 === 0 ? 'customer' : 'merchant') as 'customer' | 'merchant',
    text:
      i === 0
        ? s.lastMessage
        : i % 2 === 0
          ? '请问' + ['还有别的颜色吗', '可以包邮吗', '有优惠券吗', '多久能到', '保修多久'][i % 5]
          : '好的，' + ['请稍等', '我帮您查看', '今天即可发货', '可以的', '感谢您的耐心'][i % 5],
    time: new Date(Date.now() - (4 + idx - i) * 600_000).toISOString(),
    type: 'text' as const
  }))
)

export function fetchChatSessions() {
  return delay(CHAT_SESSIONS)
}

export function fetchChatMessages(sessionId: string) {
  return delay(CHAT_MESSAGES.filter((m) => m.sessionId === sessionId))
}

export function sendChatMessage(sessionId: string, text: string): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: `${sessionId}-m-${Date.now()}`,
    sessionId,
    from: 'merchant',
    text,
    time: new Date().toISOString(),
    type: 'text'
  }
  CHAT_MESSAGES.push(msg)
  return delay(msg, 100)
}

/* ========== S3.5 补齐 · 佣金 ========== */

const COMMISSION_KEY = 'admin_pc_commission_rule'

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

export function fetchCommissionConfig(): Promise<CommissionConfig> {
  try {
    const raw = localStorage.getItem(COMMISSION_KEY)
    if (raw) return delay(JSON.parse(raw))
  } catch {
    /* noop */
  }
  return delay(COMMISSION_DEFAULT)
}

export function saveCommissionConfig(cfg: CommissionConfig) {
  localStorage.setItem(COMMISSION_KEY, JSON.stringify(cfg))
  return delay({ ok: true })
}

export function fetchCommissionHistory(): Promise<Commission[]> {
  return delay(Array.from({ length: 20 }).map(() => genCommission()))
}

export function fetchPromoteSummary(): Promise<PromoteSummary> {
  return delay(genPromoteSummary())
}

/* ========== S3.5 补齐 · 提现 ========== */

const WITHDRAW_CACHE: Withdraw[] = Array.from({ length: 15 }).map(() => genWithdraw())

export function fetchBalance() {
  return delay({
    available: 28560,
    pending: 4320,
    totalWithdrawn: 156000
  })
}

export function fetchWithdraws() {
  return delay(WITHDRAW_CACHE)
}

export interface WithdrawApply {
  applyAmount: number
  method: 'wechat' | 'bank' | 'alipay'
  account: string
}

export function applyWithdraw(dto: WithdrawApply) {
  const item: Withdraw = {
    ...genWithdraw(),
    no: 'WD' + Date.now(),
    applyAmount: dto.applyAmount,
    actualAmount: dto.applyAmount,
    method: dto.method,
    account: dto.account,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  WITHDRAW_CACHE.unshift(item)
  return delay({ ok: true, item })
}

/* ========== S3.5 补齐 · 会员（走 member-service 真生效） ========== */

/** 兼容旧调用：返回当前订阅的"视图模型"（保持旧字段名） */
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
  const daysRemaining = Math.max(0, Math.ceil((new Date(sub.endAt).getTime() - Date.now()) / 86400000))
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

/** 当前商家配额（推送位 / Banner / 月曝光） */
export function fetchMerchantQuota() {
  return msGetQuota()
}

/** 订阅 / 升级 / 续订（mock 支付） */
export function subscribeMemberPlan(planId: string, payMethod: 'wechat' | 'alipay' | 'balance' = 'wechat') {
  return msSubscribe({ planId, payMethod })
}

/** 取消订阅 */
export function cancelMemberSubscription() {
  return msCancel()
}

/** 切换自动续订 */
export function setMembershipAutoRenew(autoRenew: boolean) {
  return msAutoRenew(getCurrentMerchantId(), autoRenew)
}

/** 消耗配额（接到广场/营销联动） */
export function consumeQuota(key: QuotaKey, count = 1) {
  return msUseQuota(key, count)
}

/** 当前商家缴费记录 */
export function fetchMyPayments() {
  return msPayments({ merchantId: getCurrentMerchantId() })
}

/** 商家 dashboard 顶部通知（到期/超配额） */
export function fetchMembershipNotices() {
  return getMembershipNotices()
}
