/**
 * 商家 PC 业务接口
 *
 * 全部对接 NestJS 后端 `/api/v1/m/*`，不再保留任何 mock / faker / 假数据 fallback。
 * 当后端无对应接口或调用失败时，统一返回空数组 / 默认空对象，让页面进入空态展示。
 *
 * 后端分页接口统一返回 `{ list, total, page, pageSize }`，
 * 此处统一在函数内 unwrap 成数组，保持消费方 `View.vue` 现有签名不变。
 */
import request from '@/utils/http'
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

/** 后端分页响应解包 */
interface PageResp<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore?: boolean
}
/**
 * 与 `platform-business.ts#unwrapPage` 行为对齐：
 * 兼容 `{list}` / `{items}` / `{records}` / 裸数组 / 空值五种形态，
 * 避免不同后端控制器返回字段名差异时静默返回空数组的"以为没数据"错觉。
 */
function unwrapList<T>(resp: any): T[] {
  if (!resp) return []
  if (Array.isArray(resp)) return resp as T[]
  if (Array.isArray(resp.list)) return resp.list as T[]
  if (Array.isArray(resp.items)) return resp.items as T[]
  if (Array.isArray(resp.records)) return resp.records as T[]
  return []
}

/* ========== 文件上传 ========== */

/**
 * 文件上传响应（与后端 `files.service.ts#upload` 对齐）
 *
 * 返回字段：
 *   - url:      可公开访问的最终 URL（如 OSS / 七牛 / S3 直链）
 *   - key:      存储 key（删除 / 后续运维使用）
 *   - size:     字节数
 *   - mimeType: 上传时的 MIME，便于前端二次校验
 */
export interface UploadedFileInfo {
  url: string
  key: string
  size?: number
  mimeType?: string
}

/**
 * 上传单张图片到后端 `/api/v1/files/upload`
 *
 * 之前商品 add 页直接用 `URL.createObjectURL(file)` 生成 blob: 链接塞进
 * `form.images`，提交时把这些临时链接传给后端 → 服务器拿到的是
 * `blob:http://localhost:.../xxx` 字符串，落库后 C 端无法回显（404）。
 *
 * 该 helper 走 multipart/form-data：FormData 内 axios 不会被 http 拦截器误塞
 * Content-Type=application/json（参见 utils/http/index.ts L87 的 FormData 短路），
 * 边界值由浏览器自动添加，无需手动设置 `Content-Type: multipart/form-data`。
 *
 * @param file    `<input type=file>` 拿到的 File 对象
 * @param bizType 业务分类（落库写到 UploadedFile.bizType，用于资源回收 / 隔离）
 */
export async function uploadImage(file: File, bizType = 'product'): Promise<UploadedFileInfo> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('bizType', bizType)
  const res = await request.post<UploadedFileInfo>({
    url: '/api/v1/files/upload',
    data: fd
  })
  return res
}

/* ========== Dashboard ========== */

export interface DashboardData {
  stats: MerchantDashboard
  trend: MerchantStats
}

export async function fetchMerchantDashboard(period: MerchantStats['period'] = 'week') {
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
  const resp = await request.get<PageResp<Product>>({
    url: '/api/v1/m/products',
    params: { ...params, pageSize: 100 }
  })
  return unwrapList<Product>(resp)
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
    .then((r) => ({ ok: r.ok, removed: r.affected ?? ids.length }))
}

/**
 * 新建商品
 *
 * 后端 `POST /m/products` 入参对应 `ProductCreateDto` + 可选 `status`：
 * - 默认 status='auditing'（提交审核），saveDraft 场景调用方应显式传 'draft'
 * - skus 由前端组装为 `{specs, specsLabel, priceWholesale, priceRetail, priceMember, stock, active}` 数组
 */
export function createMerchantProduct(payload: any) {
  return request.post<Product>({
    url: '/api/v1/m/products',
    data: payload
  })
}

/**
 * 更新商品
 *
 * 后端 `PUT /m/products/:id` 在 Wave3 中已修复为「同步更新 SKU 矩阵」：
 *   - 调用方应在 payload.skus 数组中带上每个 SKU 的 id（编辑现有行）或不带 id（新行）
 *   - 后端会按 id diff 出 update / create / delete 三集，避免编辑后旧 SKU 残留
 * 调用方禁止把 SKU 拆成独立的 sku 接口请求，统一在 update 时透传完整 skus 数组。
 */
export function updateMerchantProduct(id: string, payload: any) {
  return request.put<Product>({
    url: `/api/v1/m/products/${encodeURIComponent(id)}`,
    data: payload
  })
}

/**
 * 获取商品详情（编辑商品页回填用）
 *
 * 后端 `GET /m/products/:id` 直接返回 Product 实体 + skus 数组，
 * 字段含 categoryId / images / name / description / status / skus[]+specs/specsLabel/价格/库存/active
 * 以及按尺寸定价的 pricingMode / pricePerSqm / minLength / minWidth / maxLength / maxWidth / baseFee / sizeUnit
 *
 * 失败时返回 null，由调用方决定空态展示策略（避免静默把页面留在空表单导致提交"新建")。
 */
export async function fetchMerchantProductDetail(id: string): Promise<any | null> {
  try {
    return await request.get<any>({ url: `/api/v1/m/products/${encodeURIComponent(id)}` })
  } catch {
    return null
  }
}

/* ========== 分类 ========== */

/**
 * 商家自定义分类列表
 *
 * 后端 `/m/categories` 默认返回当前商家的自定义分类树（type=merchant）。
 * 兼容直接返回数组或 buildPage 分页对象两种形态；接口未实现 / 失败时返回空数组。
 */
export async function fetchMerchantCategories(): Promise<Category[]> {
  try {
    const resp = await request.get<PageResp<Category> | Category[]>({
      url: '/api/v1/m/categories'
    })
    return unwrapList<Category>(resp)
  } catch {
    return []
  }
}

/**
 * 平台分类（merchant 视角只读引用）
 *
 * 后端 `merchant.controller.ts#categories` 接受 `type=platform` query；
 * 兼容直接返回数组或 buildPage 分页对象；接口未实现 / 失败时返回空数组（本地兜底）。
 */
export async function fetchPlatformCategoriesForMerchant(): Promise<Category[]> {
  try {
    const resp = await request.get<PageResp<Category> | Category[]>({
      url: '/api/v1/m/categories',
      params: { type: 'platform' }
    })
    return unwrapList<Category>(resp)
  } catch {
    return []
  }
}

export function saveMerchantCategories(list: Category[]) {
  return request.put<{ ok: boolean }>({
    url: '/api/v1/m/categories',
    data: { list }
  })
}

/* ========== 代理商品 ========== */

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

export async function fetchAgencyApplications(): Promise<AgencyApplication[]> {
  try {
    return await request.get<AgencyApplication[]>({
      url: '/api/v1/m/plaza/applications'
    })
  } catch {
    return []
  }
}

export function updateAgencyApplication(
  id: string,
  patch: Partial<Pick<AgencyApplication, 'myRetailPrice' | 'markupRatio' | 'status'>>
) {
  return request.request<{ ok: boolean }>({
    url: `/api/v1/m/plaza/applications/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: patch
  })
}

export function cancelAgencyApplication(id: string) {
  return request.del<{ ok: boolean }>({
    url: `/api/v1/m/plaza/applications/${encodeURIComponent(id)}`
  })
}

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function saveAgencyApplications(_list: AgencyApplication[]): void {
  // No-op — per-row save replaced this batch write.
}

/* ========== 订单 ========== */

export interface OrderQuery {
  status?: OrderStatus | 'all'
  keyword?: string
}

export async function fetchMerchantOrders(params: OrderQuery = {}) {
  const resp = await request.get<PageResp<Order>>({
    url: '/api/v1/m/orders',
    params: { ...params, pageSize: 100 }
  })
  return unwrapList<Order>(resp)
}

/**
 * 单个订单的发货项（与后端 `m/orders/batch-ship` DTO 一致）
 *
 * 之前实现固定 `company: '默认快递' + trackingNumber: 'TR' + Date.now()`，
 * 等同于在数据库里写入"完全无法对接物流系统"的假单号。
 * 现要求调用方必须真实采集 company / trackingNumber 后再调用。
 */
export interface ShipItem {
  id: string
  company: string
  trackingNumber: string
}

/**
 * 批量发货
 *
 * @param items 每单的发货信息（订单 ID + 快递公司 + 真实运单号）
 * 调用方必须先在 UI 上让用户为每单填写公司 + 单号，禁止内部伪造。
 */
export async function shipOrders(items: ShipItem[]) {
  if (!items || items.length === 0) {
    throw new Error('请至少选择一单需要发货的订单')
  }
  const invalid = items.find(
    (it) => !it.id || !it.company?.trim() || !it.trackingNumber?.trim()
  )
  if (invalid) {
    throw new Error('请填写完整的快递公司与运单号后再发货')
  }
  const r = await request.post<{ ok: boolean; count: number }>({
    url: '/api/v1/m/orders/batch-ship',
    data: { items }
  })
  return { ok: r.ok, shipped: r.count ?? items.length }
}

/* ========== 售后 ========== */

export async function fetchAftersaleList() {
  const resp = await request.get<PageResp<Refund>>({
    url: '/api/v1/m/aftersales',
    params: { pageSize: 100 }
  })
  return unwrapList<Refund>(resp)
}

export function reviewRefund(refundId: string, action: 'agreed' | 'rejected', remark?: string) {
  const backendAction = action === 'agreed' ? 'agree' : 'reject'
  return request.post<{ ok: boolean }>({
    url: `/api/v1/m/aftersales/${refundId}/review`,
    data: { action: backendAction, reason: remark }
  })
}

/* ========== 客户 ========== */

export interface CustomerTier {
  key: 'all' | 'normal' | 'vip' | 'blacklist'
  label: string
}

/**
 * VIP 判定
 *
 * 后端 `merchant.service.listCustomers` 把每个客户的"价格档位"通过 `priceTier`
 * 字段返回（来自 SystemConfig 的商家级配置）。member / agency 都视为 VIP，
 * 旧实现 `kind === 'member'` 永远为 false（映射时已丢弃 kind 字段，且后端
 * 也没有 `kind=member` 这个值），属于死路径。
 */
function isVip(u: User & { priceTier?: string }): boolean {
  const tier = u.priceTier
  return tier === 'member' || tier === 'agency'
}

/**
 * 切换客户黑名单状态
 *
 * 后端 `PATCH /m/customers/:id/blacklist` 接收 `{ on: boolean }`，返回
 * `{ ok, blocked }`。failed 时由调用方 catch 后回滚 UI 状态（避免列表显示
 * 已加入但 DB 没改）。
 */
export function setCustomerBlacklist(id: string, on: boolean) {
  return request.request<{ ok: boolean; blocked: boolean }>({
    url: `/api/v1/m/customers/${encodeURIComponent(id)}/blacklist`,
    method: 'PATCH',
    data: { on }
  })
}

export async function fetchCustomers(tier: CustomerTier['key'] = 'all') {
  // 后端 customers 字段为 {id, avatar, nickname, phone, kind, priceTier, priceAuthorized, blocked}
  // 缺少 User 必填的 role/status/createdAt 字段，因此映射时补齐默认值
  // 并保留 priceTier / kind / priceAuthorized / blocked 用于 VIP 与黑名单判定。
  //
  // 旧实现固定 `status: 'active'`，导致 tier='blacklist' 过滤永远空：
  // 后端有 blocked 标记但前端从未读取。修复方式：根据 blocked 字段把 status
  // 映射成 active / disabled，保持上层 (User.status === 'disabled') 黑名单判定有效。
  try {
    const resp = await request.get<PageResp<any>>({
      url: '/api/v1/m/customers',
      params: { pageSize: 100 }
    })
    const raw = unwrapList<any>(resp)
    let list: (User & {
      priceTier?: string
      kind?: string
      priceAuthorized?: boolean
      blocked?: boolean
    })[] = raw.map((u: any) => ({
      id: u.id,
      nickname: u.nickname ?? '',
      avatar: u.avatar ?? '',
      phone: u.phone,
      role: u.kind === 'promoter' ? 'promoter' : 'customer',
      status: u.blocked ? 'disabled' : 'active',
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
      priceTier: u.priceTier,
      kind: u.kind,
      priceAuthorized: u.priceAuthorized,
      blocked: !!u.blocked
    }))
    if (tier === 'vip') list = list.filter(isVip)
    else if (tier === 'normal') list = list.filter((u) => !isVip(u) && !u.blocked)
    else if (tier === 'blacklist') list = list.filter((u) => u.blocked === true)
    return list as User[]
  } catch {
    return []
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

/**
 * 营销活动列表
 *
 * 主接口：`/api/v1/m/marketing/activities`（后端工程师正在实现）。
 * 接口未实现 / 失败时本地兜底返回空数组，页面进入空态；
 * 如需展示真实业务概要可后续替换为 `marketing/overview` + `marketing/coupons` 聚合。
 */
export async function fetchMarketingActivities(): Promise<MarketingActivity[]> {
  try {
    const resp = await request.get<PageResp<MarketingActivity> | MarketingActivity[]>({
      url: '/api/v1/m/marketing/activities',
      params: { pageSize: 100 }
    })
    return unwrapList<MarketingActivity>(resp)
  } catch {
    return []
  }
}

/**
 * 优惠券新建 / 更新 / 删除 / 启停
 *
 * 对接后端 `/api/v1/m/marketing/coupons` 一组 REST 接口（后端工程师正在落地）。
 * - 新建 / 编辑共用同一 payload，编辑场景需要走 PUT 携带 :id
 * - toggle 接口接受 `{active: boolean}`，启停状态走单独路径避免与编辑混淆
 *
 * 接口缺失时由调用方 catch 后回滚 UI 状态。
 */
export interface CouponPayload {
  type: MarketingActivity['type']
  title: string
  description?: string
  startAt?: string
  endAt?: string
  status?: MarketingActivity['status']
}

export function createCoupon(payload: CouponPayload) {
  return request.post<MarketingActivity>({
    url: '/api/v1/m/marketing/coupons',
    data: payload
  })
}

export function updateCoupon(id: string, payload: Partial<CouponPayload>) {
  return request.put<MarketingActivity>({
    url: `/api/v1/m/marketing/coupons/${encodeURIComponent(id)}`,
    data: payload
  })
}

export function deleteCoupon(id: string) {
  return request.del<{ ok: boolean }>({
    url: `/api/v1/m/marketing/coupons/${encodeURIComponent(id)}`
  })
}

export function toggleCoupon(id: string, active: boolean) {
  return request.post<{ ok: boolean; status: MarketingActivity['status'] }>({
    url: `/api/v1/m/marketing/coupons/${encodeURIComponent(id)}/toggle`,
    data: { active }
  })
}

/* ========== 选品广场 ========== */

export async function fetchPlazaCards() {
  // 后端 /m/plaza/products 返回分页结构，items 已对齐 PlazaProductCard
  try {
    const resp = await request.get<PageResp<PlazaProductCard>>({
      url: '/api/v1/m/plaza/products',
      params: { pageSize: 60 }
    })
    return unwrapList<PlazaProductCard>(resp)
  } catch {
    return []
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
  // 完全依赖后端真实数据，字段缺失时使用空字符串占位（让前端显示"暂无"）
  const empty: FactoryDetail = {
    factoryId,
    factoryName: '',
    factoryLogo: '',
    rating: 0,
    yearsInBusiness: 0,
    description: '',
    certifications: [],
    contact: {
      contactName: '',
      contactPhone: '',
      wechat: '',
      email: '',
      address: '',
      workTime: ''
    },
    cards: []
  }

  try {
    const f = await request.get<any>({ url: `/api/v1/m/plaza/factories/${factoryId}` })
    if (!f) return empty
    return {
      factoryId: f.id || factoryId,
      factoryName: f.name || '',
      factoryLogo: f.logo || '',
      rating: typeof f.rating === 'number' ? f.rating : 0,
      yearsInBusiness: typeof f.yearsInBusiness === 'number' ? f.yearsInBusiness : 0,
      description: f.desc || f.description || '',
      certifications: Array.isArray(f.qualifications)
        ? f.qualifications.map((q: any) => q.name || '').filter(Boolean)
        : Array.isArray(f.certifications)
          ? f.certifications
          : [],
      contact: {
        contactName: f.contact?.contactName || f.contactName || '',
        contactPhone: f.contact?.phone || f.contact?.contactPhone || f.contactPhone || '',
        wechat: f.contact?.wechat || '',
        email: f.contact?.email || '',
        address: f.contact?.address || f.address || '',
        workTime: f.contact?.workTime || ''
      },
      cards: Array.isArray(f.cards) ? f.cards : []
    }
  } catch {
    return empty
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
  return unwrapList<StoreItem>(resp)
}

export async function saveStore(s: StoreItem) {
  // 后端实际同时实现了 POST /m/stores（创建）与 PUT /m/stores/:id（更新）。
  // 之前的实现一律走 POST，导致编辑场景产生重复门店或更新被吞，编辑面板返回后
  // 列表依然是旧数据。这里按 id 走分支：有 id 时走 PUT，新增走 POST。
  if (s.id) {
    await request.put<{ ok: boolean } | StoreItem>({
      url: `/api/v1/m/stores/${encodeURIComponent(s.id)}`,
      data: s
    })
  } else {
    await request.post<{ ok: boolean } | StoreItem>({
      url: '/api/v1/m/stores',
      data: s
    })
  }
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
  return unwrapList<StaffItem>(resp)
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

/**
 * 新店铺首次进入装修页时，提供的可编辑默认模块骨架。
 * 不是 mock 数据，是真实业务的默认配置——商家可以增/删/改后保存。
 */
const DECORATE_INITIAL: DecorateModule[] = [
  { id: 'm-1', type: 'banner', title: '顶部 Banner 轮播', visible: true, config: { height: 360 } },
  { id: 'm-2', type: 'category', title: '分类导航', visible: true, config: { columns: 5 } },
  { id: 'm-3', type: 'coupon', title: '优惠券领取', visible: true, config: { autoLoad: true } },
  { id: 'm-4', type: 'hot', title: '热销爆款', visible: true, config: { limit: 6 } },
  { id: 'm-5', type: 'new', title: '新品上架', visible: true, config: { limit: 6 } },
  { id: 'm-6', type: 'product-list', title: '为你推荐', visible: true, config: { algorithm: 'cf' } }
]

export async function fetchDecorate(): Promise<DecorateModule[]> {
  // 后端 `ShopDecorate` 是单条记录（modules JSON 字段），unwrap modules 数组
  try {
    const d = await request.get<any>({ url: '/api/v1/m/shop/decorate' })
    if (Array.isArray(d?.modules) && d.modules.length) return d.modules
    if (Array.isArray(d) && d.length) return d
  } catch {
    /* fall through */
  }
  // 首次进入或后端无配置：返回默认空模板骨架供商家编辑
  return [...DECORATE_INITIAL]
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
  // 后端字段 {id, userId, userName, userAvatar, lastMessageAt, unreadCount, status}
  try {
    const raw = await request.get<any[]>({ url: '/api/v1/m/chat/sessions' })
    return (raw || []).map(
      (s: any): ChatSession => ({
        id: s.id,
        customerId: s.userId || s.customerId || '',
        customerName: s.userName || s.customerName || '客户',
        customerAvatar: s.userAvatar || s.customerAvatar || '',
        // 后端返回的是对象 { content, type, sender, createdAt } 或 null（也兼容旧的字符串形态）
        lastMessage: typeof s.lastMessage === 'string' ? s.lastMessage : s.lastMessage?.content || '',
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
  // 后端 ChatMessage 用 {id, sessionId, sender, type, content, createdAt}
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
  // 后端返回的 ChatMessage 仍是 {sender, content, createdAt}
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
  level1Percent: 0,
  level2Percent: 0,
  visibleToPromoter: false,
  allowOffline: false,
  enabled: false
}

export async function fetchCommissionConfig(): Promise<CommissionConfig> {
  // 后端返回 { default, productRules }，此处只取 default
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
  // 后端接 { default, productRules } 结构
  await request.post<{ ok: boolean }>({
    url: '/api/v1/m/commission/rules',
    data: { default: cfg }
  })
  return { ok: true }
}

/**
 * 佣金历史明细列表
 *
 * 主接口：`/api/v1/m/commission/history`（后端工程师正在实现）。
 * 接口未实现 / 失败时本地兜底返回空数组，页面进入空态；
 * 退路：可在调用方使用 `fetchCommissionConfig`（`/m/commission/rules`）
 * 仅展示分佣规则、跳过明细列表。
 */
export async function fetchCommissionHistory(): Promise<Commission[]> {
  try {
    const resp = await request.get<PageResp<Commission> | Commission[]>({
      url: '/api/v1/m/commission/history',
      params: { pageSize: 100 }
    })
    return unwrapList<Commission>(resp)
  } catch {
    return []
  }
}

const EMPTY_PROMOTE_SUMMARY: PromoteSummary = {
  totalCommission: 0,
  monthCommission: 0,
  pendingCommission: 0,
  promotedUsers: 0,
  promotedOrders: 0,
  conversionRate: 0
}

export async function fetchPromoteSummary(): Promise<PromoteSummary> {
  // 后端字段名比 PromoteSummary 少时，缺失字段用 0 兜底
  try {
    const r = await request.get<Partial<PromoteSummary>>({ url: '/api/v1/m/promote-summary' })
    return { ...EMPTY_PROMOTE_SUMMARY, ...(r || {}) }
  } catch {
    return { ...EMPTY_PROMOTE_SUMMARY }
  }
}

/* ========== 提现 ========== */

export async function fetchBalance() {
  // 后端 {total, available, frozen, withdrawn} → 旧字段 {available, pending, totalWithdrawn}
  try {
    const r = await request.get<{
      total: number
      available: number
      frozen: number
      withdrawn: number
    }>({
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
  return unwrapList<Withdraw>(resp)
}

export interface WithdrawApply {
  applyAmount: number
  method: 'wechat' | 'bank' | 'alipay'
  account: string
}

export async function applyWithdraw(dto: WithdrawApply) {
  // 后端 createWithdraw 接 { amount, method, account }
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

/* ========== 会员 ========== */

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
