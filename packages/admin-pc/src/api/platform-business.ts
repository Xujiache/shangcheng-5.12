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
import { useUserStore } from '@/store/modules/user'
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
export async function fetchPlatformMerchants(
  params: PlatformMerchantsParams = {}
): Promise<Merchant[]> {
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
  topMerchants?: { merchantId: string; name: string; type: string; region: string; sales: number }[]
}

export async function fetchPlatformStats(period: StatsPeriod = 'week'): Promise<PlatformStats> {
  const raw = await request.get<any>({ url: '/api/v1/p/stats', params: { period } })
  // 后端实际返回 { period, salesTrend, topMerchants }，与视图期望的 trend/categoryBars/memberPlanDist
  // 字段名不一致；此处做契约适配并对缺失数据兜底，避免 data-center 页 `undefined.length` 崩溃。
  return {
    period: (raw?.period as StatsPeriod) ?? period,
    trend: Array.isArray(raw?.trend)
      ? raw.trend
      : Array.isArray(raw?.salesTrend)
        ? raw.salesTrend
        : [],
    categoryBars: Array.isArray(raw?.categoryBars) ? raw.categoryBars : [],
    memberPlanDist: raw?.memberPlanDist ?? { yearly: 0, monthly: 0, trial: 0 },
    topMerchants: Array.isArray(raw?.topMerchants) ? raw.topMerchants : []
  }
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

/* ============ 5.5 审核日志（商家/商品流转记录） ============ */
/**
 * 审核日志条目
 *
 * 对齐后端 `platform.service.ts#auditRecords` 返回结构。
 * 后端实际通过 `auditor: { id, username, nickname }` 字段挂关联人摘要，
 * 此处把它打平成 `actorId` + `actorName` 方便表格列直接绑定；
 * 同时保留 `actor` 嵌套字段供详情场景使用。
 */
export interface AuditRecord {
  id: string
  type: 'merchant' | 'product'
  targetId: string
  status: 'approved' | 'rejected' | 'pending' | 'auto_approved' | 'sample_check'
  reason?: string | null
  actorId?: string | null
  actorName?: string | null
  createdAt: string
  reviewedAt?: string | null
  autoApproved?: boolean
  sampleChecked?: boolean
  actor?: { id: string; username: string | null; nickname: string } | null
}

export interface AuditRecordsPage {
  list: AuditRecord[]
  total: number
  page: number
  pageSize: number
}

/**
 * 平台审核日志分页查询
 *
 * 后端：GET /api/v1/p/audit/records
 * 支持过滤：type / status / targetId；分页 page / pageSize。
 * 失败时返回空分页，让页面进入空态。
 */
export async function fetchAuditRecords(params?: {
  type?: string
  status?: string
  targetId?: string
  page?: number
  pageSize?: number
}): Promise<AuditRecordsPage> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/audit/records',
      params: params || {}
    })
    const rawList: any[] = Array.isArray(resp?.list) ? resp.list : Array.isArray(resp) ? resp : []
    const list: AuditRecord[] = rawList.map((r) => ({
      id: r.id,
      type: r.type,
      targetId: r.targetId,
      status: r.status,
      reason: r.reason ?? null,
      actorId: r.auditor?.id ?? r.auditorId ?? null,
      actorName: r.auditor?.nickname || r.auditor?.username || null,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt ?? null,
      autoApproved: !!r.autoApproved,
      sampleChecked: !!r.sampleChecked,
      actor: r.auditor ?? null
    }))
    return {
      list,
      total: typeof resp?.total === 'number' ? resp.total : list.length,
      page: typeof resp?.page === 'number' ? resp.page : (params?.page ?? 1),
      pageSize: typeof resp?.pageSize === 'number' ? resp.pageSize : (params?.pageSize ?? 20)
    }
  } catch {
    return { list: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 }
  }
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

/**
 * 平台商品审核列表。
 *
 * 后端 Product 模型的真实 status enum 是 `auditing / active / offline / rejected`
 * (见 server/prisma/schema.prisma + merchant.service.createProduct L334)。
 * 但平台审核视图按 `pending / auto_approved / rejected` 三种 TabKey 渲染,
 * 客户端 filter `p.status === tab.value` 必然把 `auditing` 漏掉 —— 这就是
 * "商家提交了但审核中 tab 完全空白"的根因。
 *
 * 这里在适配层把 `auditing` 归一化成 `pending`,后端不动、视图不动。
 * 平铺 merchant.name → merchantName,image 取 images[0],submittedAt 兜底 createdAt。
 */
export async function fetchProductAudits(): Promise<AuditProduct[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/audit/products',
      params: { pageSize: 100 }
    })
    const raw = unwrapPage<any>(resp)
    return raw.map(
      (p): AuditProduct => ({
        id: p.id,
        name: p.name || '',
        image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '',
        category: p.category?.name || p.categoryName || '',
        merchant:
          (typeof p.merchant === 'object' ? p.merchant?.name : p.merchant) ||
          p.merchantName ||
          '',
        price: Number(p.priceRetailMin ?? p.price ?? 0),
        submittedAt: p.submittedAt || p.createdAt || '',
        // 关键归一化:DB schema 用 'auditing',视图 TabKey 用 'pending'
        status: p.status === 'auditing' ? 'pending' : p.status,
        rejectReason: p.rejectReason ?? undefined
      })
    )
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

/* ---- 广告位 CRUD ---- */
/**
 * 后端 `platform.controller.ts` 已暴露 POST/PUT/DELETE `ads/slots` 完整链路：
 * 创建 / 更新 / 暂停 / 删除都走同一入口；status: 'paused' / 'active' 切换由调用方决定。
 * 这里只透传 payload，view 层负责拼装 DTO（名称 / 投放对象 / 预览图 / 状态等）。
 */
export function createAdSlot(payload: {
  name: string
  target: AdSlotVM['target']
  preview?: string
  status?: AdSlotVM['status']
}) {
  return request.post<AdSlot>({ url: '/api/v1/p/ads/slots', data: payload })
}

export function updateAdSlot(
  id: string,
  payload: Partial<{
    name: string
    target: AdSlotVM['target']
    preview: string
    status: AdSlotVM['status']
  }>
) {
  return request.put<AdSlot>({
    url: `/api/v1/p/ads/slots/${encodeURIComponent(id)}`,
    data: payload
  })
}

export function deleteAdSlot(id: string) {
  return request.del<{ ok: boolean }>({
    url: `/api/v1/p/ads/slots/${encodeURIComponent(id)}`
  })
}

/* ---- 创意 CRUD ---- */
/**
 * 后端 `platform.controller.ts` 已暴露 POST/PUT/DELETE `ads/creatives`；
 * 新建创意会进入 status='pending' 队列等待审核。view 层提交后应 reload 列表，
 * 避免本地 unshift 导致字段 / ID 与后端错位。
 */
export function createAdCreative(payload: {
  slotId: string
  title: string
  image?: string
  link?: string
  startAt?: string
  endAt?: string
  budget?: number
  priority?: number
}) {
  return request.post<AdCreative>({ url: '/api/v1/p/ads/creatives', data: payload })
}

export function updateAdCreative(
  id: string,
  payload: Partial<{
    title: string
    image: string
    link: string
    startAt: string
    endAt: string
    budget: number
    status: 'active' | 'paused' | 'pending'
    priority: number
  }>
) {
  return request.put<AdCreative>({
    url: `/api/v1/p/ads/creatives/${encodeURIComponent(id)}`,
    data: payload
  })
}

export function deleteAdCreative(id: string) {
  return request.del<{ ok: boolean }>({
    url: `/api/v1/p/ads/creatives/${encodeURIComponent(id)}`
  })
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
 * tab 取值：
 *   - products: 调 /p/plaza/products，返回商品适配后的 PlazaItem[]
 *   - factories: 调 /p/plaza/factories，返回厂家适配后的 PlazaItem[]
 *     （后端返回 Merchant 数组，前端按 id/name/logo 映射成卡片样式；
 *      厂家本身无 price / agencyCount，对应字段置空让 UI 进入空态展示）
 *   - records: 调 /p/plaza/pushes，返回推送记录 PlazaPush[]
 *
 * 任一 tab 接口失败时返回空数组，让页面进入空态。
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
  if (tab === 'factories') {
    try {
      const raw = await request.get<any>({ url: '/api/v1/p/plaza/factories' })
      const list = unwrapPage<any>(raw)
      // Merchant → PlazaItem 适配：厂家没有 price / agencyCount，UI 上对应位置显示 0 即可
      return list.map(
        (m: any): PlazaItem => ({
          id: m.id || '',
          name: m.name || '',
          image: m.logo || m.image || '',
          factory: m.name || '',
          price: 0,
          status: (m.status === 'active' ? 'pushing' : 'pending') as PlazaItem['status'],
          agencyCount: typeof m.agencyCount === 'number' ? m.agencyCount : 0,
          tag: m.type === 'factory' ? '厂家' : m.type
        })
      )
    } catch {
      return []
    }
  }
  try {
    const raw = await request.get<any>({
      url: '/api/v1/p/plaza/products',
      params: { tab }
    })
    // 后端返回分页对象 { list, total, ... }，必须 unwrap；之前用 Array.isArray 判定恒 false 导致列表恒空。
    const list = unwrapPage<any>(raw)
    return list.map(
      (r: any): PlazaItem => ({
        id: r.id || r.productId || '',
        name: r.name || r.productName || '',
        image: r.image || r.productImage || '',
        factory: r.factory || r.factoryName || '',
        price:
          typeof r.price === 'number'
            ? r.price
            : typeof r.startPrice === 'number'
              ? r.startPrice
              : 0,
        status: (r.status as PlazaItem['status']) || 'pending',
        agencyCount: typeof r.agencyCount === 'number' ? r.agencyCount : 0,
        tag: r.tag || (Array.isArray(r.tags) ? r.tags[0] : undefined)
      })
    )
  } catch {
    return []
  }
}

/**
 * 新建广场推送 DTO
 *
 * 字段对齐 Prisma `PlazaPush` 模型与 shared `PlazaPushCreateDto`：
 *   - targetType / productIds / factoryIds: 推送目标（商品 or 厂家）
 *   - positions / tags / audience: 投放位置 / 标签 / 受众（audience 当前为字符串）
 *   - scheduledStart / scheduledEnd: 投放时段（ISO 字符串，后端会 new Date 解析）
 *   - weight: 权重 0-99
 *   - pushText: 推送语
 *
 * 旧字段 `target / startAt / endAt / remark / productIds`(仅) 与后端 schema 不对齐，
 * 会被 Prisma 直接忽略 → 落库后无投放对象 / 时段，相当于「成功创建但什么都不会推」。
 */
export interface PushPayload {
  targetType: 'product' | 'factory'
  productIds?: string[]
  factoryIds?: string[]
  positions: string[]
  tags: string[]
  audience: string
  scheduledStart: string
  scheduledEnd: string
  weight: number
  pushText?: string
}

/**
 * 创建广场推送
 *
 * 后端 `POST /p/plaza/pushes` 直接返回 PlazaPush 记录（不返回 pushedCount）。
 * 调用方应基于 productIds.length / factoryIds.length 自己提示数量。
 */
export function pushPlaza(payload: PushPayload) {
  return request.post<PlazaPush>({
    url: '/api/v1/p/plaza/pushes',
    data: payload
  })
}

/**
 * 抽检商品
 *
 * 后端 `POST /p/audit/products/:id/sample-check`：把"自动通过"的商品
 * 加入人工抽检队列。失败时调用方 catch 后给出错误提示。
 */
export function sampleCheckProduct(id: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/audit/products/${encodeURIComponent(id)}/sample-check`
  })
}

/**
 * 切换广场商品上下架状态
 *
 * 后端 `PATCH /p/plaza/products/:id/online` 接收 `{ online: boolean }`，
 * 返回 `{ ok, productId, online }`。failed 时调用方 catch 后回滚 UI 状态，避免
 * 列表显示已上架但 DB 还是 offline。
 *
 * 注意：之前传 `{ on }` 是字段名错误（后端按 `online` 解析），
 * 导致后端永远收不到目标状态、默认行为不可预期。
 */
export function setPlazaProductOnline(id: string, online: boolean) {
  return request.request<{ ok: boolean; productId: string; online: boolean }>({
    url: `/api/v1/p/plaza/products/${encodeURIComponent(id)}/online`,
    method: 'PATCH',
    data: { online }
  })
}

/* ============ 9. 会员套餐 ============ */

export async function fetchPlatformMemberPlans(): Promise<MemberPlan[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/member-plans',
      params: { pageSize: 100 }
    })
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
    data: { days }
  })
}
/**
 * 新建 / 更新会员套餐
 *
 * 后端 `POST /p/member-plans` 直接返回更新后的 MemberPlan 实体（带真实 cuid）。
 * 旧实现给的返回类型 `{ ok, plan }` 与后端形态不符，导致调用方拿不到真实 id 兜
 * 底 fallback 到本地伪 id（如 `'p-' + Date.now()`），后续基于此 id 的 edit/toggle/
 * delete 全部 500。
 *
 * 这里统一 unwrap：兼容裸 MemberPlan / `{plan}` / `{data}` 三种历史形态，返回
 * `{ ok, plan }` 给上层使用，确保 plan.id 永远是后端 cuid。
 */
export async function savePlatformMemberPlan(
  plan: Partial<MemberPlan>
): Promise<{ ok: boolean; plan: MemberPlan }> {
  const resp = await request.post<any>({
    url: '/api/v1/p/member-plans',
    data: plan
  })
  const persisted: MemberPlan = (resp as any)?.plan ?? (resp as any)?.data ?? (resp as MemberPlan)
  return { ok: true, plan: persisted }
}
export function removePlatformMemberPlan(id: string) {
  return request.del<{ ok: boolean }>({ url: `/api/v1/p/member-plans/${id}` })
}
export function fetchPlanSubscriptions(planId: string) {
  return request
    .get<unknown[]>({ url: `/api/v1/p/member-plans/${planId}/subscriptions` })
    .catch(() => msGetSubsByPlan(planId)) as ReturnType<typeof msGetSubsByPlan>
}
/**
 * 平台层"全部订阅商家"列表
 *
 * 后端当前只暴露 `GET /p/member-plans/:planId/subscriptions`（按 planId 查），
 * **没有** 跨套餐的 `GET /p/subscriptions` 接口。
 *
 * TODO(backend): 等 Agent E 实现 `GET /p/subscriptions` 后，把这里改成 request.get。
 * 在那之前调用方应自行处理"功能筹备中"的空态，避免显示"0 条"误导运营。
 *
 * 调用方约定：catch 到 NotImplementedError 时收起订阅总览区，
 * 不要把空数组当成"真的没人订阅"。
 */
export class SubscriptionsNotImplementedError extends Error {
  readonly code = 'SUBSCRIPTIONS_NOT_IMPLEMENTED'
  constructor() {
    super('后端尚未实现 /p/subscriptions 全量查询接口')
    this.name = 'SubscriptionsNotImplementedError'
  }
}

export function fetchAllSubscriptions(): Promise<never> {
  return Promise.reject(new SubscriptionsNotImplementedError())
}

// 强引用一下，避免 tree-shaking 把 msGetSubs 误删（后续接入后可能恢复使用）
void msGetSubs

/* ============ 9.5 平台提现审核 ============ */

/**
 * 平台提现审核记录
 *
 * 对齐后端 `platform.service.withdrawsList` 返回的字段；只取页面要用的子集，
 * 其余字段（如商户原始名称 / 关联订单）按需后续扩展。
 */
export interface PlatformWithdrawItem {
  id: string
  merchantId: string
  merchantName?: string
  /** 提现金额 */
  amount: number
  method: 'wechat' | 'bank' | 'alipay'
  account: string
  /** pending=待审核 / approved=已通过 / rejected=已驳回 / paid=已打款 */
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  remark?: string | null
  rejectReason?: string | null
  transactionId?: string | null
  createdAt: string
  reviewedAt?: string | null
  paidAt?: string | null
}

export interface PlatformWithdrawsPage {
  list: PlatformWithdrawItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 平台提现审核分页
 *
 * 后端：`GET /api/v1/p/withdraws`，支持 status / merchantId 过滤 + 分页。
 * 失败时返回空分页，让页面进入空态。
 */
export async function fetchPlatformWithdraws(params?: {
  status?: 'pending' | 'approved' | 'rejected' | 'paid'
  merchantId?: string
  page?: number
  pageSize?: number
}): Promise<PlatformWithdrawsPage> {
  const query: Record<string, unknown> = {}
  if (params?.status) query.status = params.status
  if (params?.merchantId) query.merchantId = params.merchantId
  query.page = params?.page ?? 1
  query.pageSize = params?.pageSize ?? 20
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/withdraws', params: query })
    const rawList: any[] = Array.isArray(resp?.list) ? resp.list : Array.isArray(resp) ? resp : []
    return {
      list: rawList.map(
        (r: any): PlatformWithdrawItem => ({
          id: r.id,
          merchantId: r.merchantId || r.merchant?.id || '',
          merchantName: r.merchant?.name || r.merchantName,
          amount: Number(r.amount ?? r.applyAmount ?? 0),
          method: (r.method as PlatformWithdrawItem['method']) || 'wechat',
          account: r.account || '',
          status: (r.status as PlatformWithdrawItem['status']) || 'pending',
          remark: r.remark ?? null,
          rejectReason: r.rejectReason ?? null,
          transactionId: r.transactionId ?? null,
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt ?? null,
          paidAt: r.paidAt ?? null
        })
      ),
      total: typeof resp?.total === 'number' ? resp.total : rawList.length,
      page: typeof resp?.page === 'number' ? resp.page : (params?.page ?? 1),
      pageSize: typeof resp?.pageSize === 'number' ? resp.pageSize : (params?.pageSize ?? 20)
    }
  } catch {
    return { list: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 }
  }
}

/** 通过提现申请 */
export function approvePlatformWithdraw(id: string, remark?: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/withdraws/${encodeURIComponent(id)}/approve`,
    data: { remark: remark || '' }
  })
}

/** 驳回提现申请（必填理由） */
export function rejectPlatformWithdraw(id: string, reason: string) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/withdraws/${encodeURIComponent(id)}/reject`,
    data: { reason }
  })
}

/** 已通过的提现 → 标记打款完成（带流水号便于对账） */
export function markPlatformWithdrawPaid(
  id: string,
  payload: { transactionId?: string; remark?: string }
) {
  return request.post<{ ok: boolean }>({
    url: `/api/v1/p/withdraws/${encodeURIComponent(id)}/mark-paid`,
    data: payload
  })
}

/* ============ 10. 缴费订单 ============ */
export type PayOrderItem = PaymentRecord

export async function fetchMemberPayOrders(): Promise<PayOrderItem[]> {
  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/member-pay-orders',
      params: { pageSize: 100 }
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
 *   - business 子结构按后端 default 形态对齐：
 *       newMerchantAutoApprove / newProductAutoApprove / platformCommissionRate /
 *       withdrawMinAmount。旧字段 `registerLimit` / `commissionRate` 在后端 default
 *       对象里根本不存在，提交后落库被忽略 + 下次拉取又被默认值覆盖，形成"保存看似
 *       成功、刷新还是旧值"的死循环。
 */
export interface PaymentChannelConfig {
  enabled: boolean
}
export interface PasswordPolicyConfig {
  minLength: number
  requireUppercase: boolean
}
export interface BusinessSettings {
  newMerchantAutoApprove: boolean
  newProductAutoApprove: boolean
  platformCommissionRate: number
  withdrawMinAmount: number
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
  business: BusinessSettings
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
  // token 由 Pinia（持久化）管理，不在裸 localStorage['accessToken'] 里；之前取错 key 恒为空 → 上传 401。
  const token = useUserStore().accessToken || ''
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

/* ============ 14. 订单分享数据看板 ============ */
/**
 * 订单分享条目
 *
 * 与后端 `platform.service.ts#orderShares` 单条返回结构对齐。
 * - visibleFields: 可见字段白名单（basics / customer / pricing / items / extra）
 * - expiresAt: null = 永久；ISO 字符串 = 到期时间
 * - viewCount: 累计访问次数（异步累加，可能轻微延迟）
 * - revoked: 商家主动撤销；expired: 当前时间已 > expiresAt
 * - shareUrl: 后端拼好的完整 H5 分享链接（与 share-sheet 复制出来的一致）
 */
export interface OrderShare {
  shareCode: string
  orderId: string
  orderNo?: string | null
  merchantId: string
  merchantName?: string
  visibleFields: string[]
  expiresAt: string | null
  intro?: string
  viewCount: number
  revoked: boolean
  expired: boolean
  createdAt: string
  shareUrl?: string
}

export interface OrderSharesPage {
  list: OrderShare[]
  total: number
  page: number
  pageSize: number
}

export interface OrderSharesStats {
  totalShares: number
  totalViews: number
  active: number
  revoked: number
  expired: number
  trend: { date: string; count: number }[]
  topMerchants: { merchantId: string; name: string; shareCount: number; viewCount: number }[]
}

/**
 * 订单分享分页列表
 *
 * 后端：GET /api/v1/p/order-shares
 * 支持过滤：merchantId / revoked / startDate / endDate；分页 page / pageSize。
 * 失败时返回空分页，让页面进入空态。
 */
export async function fetchOrderShares(params?: {
  merchantId?: string
  revoked?: boolean
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<OrderSharesPage> {
  const query: Record<string, unknown> = {}
  if (params?.merchantId) query.merchantId = params.merchantId
  // 后端用字符串 'true'/'false' 也兼容；这里显式传 boolean 以走 query parser
  if (typeof params?.revoked === 'boolean') query.revoked = params.revoked
  if (params?.startDate) query.startDate = params.startDate
  if (params?.endDate) query.endDate = params.endDate
  if (params?.page) query.page = params.page
  if (params?.pageSize) query.pageSize = params.pageSize

  try {
    const resp = await request.get<any>({
      url: '/api/v1/p/order-shares',
      params: query
    })
    const rawList: any[] = Array.isArray(resp?.list) ? resp.list : Array.isArray(resp) ? resp : []
    return {
      list: rawList as OrderShare[],
      total: typeof resp?.total === 'number' ? resp.total : rawList.length,
      page: typeof resp?.page === 'number' ? resp.page : (params?.page ?? 1),
      pageSize: typeof resp?.pageSize === 'number' ? resp.pageSize : (params?.pageSize ?? 20)
    }
  } catch {
    return { list: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 }
  }
}

/**
 * 订单分享聚合统计
 *
 * 后端：GET /api/v1/p/order-shares/stats
 * 用于 KPI 卡 + 近 7 日趋势 + TopN 商户面板。
 * 接口失败时返回零值结构，避免页面 undefined 崩溃。
 */
export async function fetchOrderSharesStats(): Promise<OrderSharesStats> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/order-shares/stats' })
    return {
      totalShares: Number(resp?.totalShares || 0),
      totalViews: Number(resp?.totalViews || 0),
      active: Number(resp?.active || 0),
      revoked: Number(resp?.revoked || 0),
      expired: Number(resp?.expired || 0),
      trend: Array.isArray(resp?.trend) ? resp.trend : [],
      topMerchants: Array.isArray(resp?.topMerchants) ? resp.topMerchants : []
    }
  } catch {
    return {
      totalShares: 0,
      totalViews: 0,
      active: 0,
      revoked: 0,
      expired: 0,
      trend: [],
      topMerchants: []
    }
  }
}
