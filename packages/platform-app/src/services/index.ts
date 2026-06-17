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
  /**
   * 商品审核列表。
   *
   * 后端 Product.status enum 是 `auditing / active / offline / rejected`(prisma schema 真值),
   * 但 audit 视图的 TabKey 是 `pending / active / rejected`,模板里 `v-if="p.status === 'pending'"`
   * 永远不会匹配 DB 的 'auditing' → 渲染空白 + 操作按钮失踪。
   *
   * 这里在 service 层把 `auditing → pending` 归一化,后端不动、视图不动,
   * 与 admin-pc 同名函数的归一化保持一致。
   */
  async list(params: { status?: string; page?: number; pageSize?: number } = {}) {
    const res = await http.get<Pagination<Product>>('/api/v1/p/audit/products', params)
    if (res && Array.isArray((res as any).list)) {
      ;(res as any).list = (res as any).list.map((p: any) => ({
        ...p,
        status: p?.status === 'auditing' ? 'pending' : p?.status,
      }))
    }
    return res
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
/**
 * AdSlot 前端视图模型。
 *
 * 注意:后端 prisma AdSlot 模型现有字段是 code/name/scene/target/position/size/sort/unitPrice/enabled/status,
 * `preview` / `startAt` / `endAt` 在后端模型中**当前没有**,
 * 调用 createSlot/updateSlot 时已在前端 sanitize,
 * 不会把未识别字段透传到 prisma 触发 ValidationError。
 *
 * - preview 暂存方案:走 SystemConfig 兜底(business.adSlotMeta),不污染 AdSlot 表
 * - startAt/endAt 同上(广告位维度的投放时段配置)
 * - 后端如果以后给 AdSlot 加字段,把 SLOT_PRISMA_FIELDS 白名单扩一下即可
 */
export interface AdSlot {
  id: string
  name: string
  scene: string
  target: string
  status: 'active' | 'ended' | 'paused' | 'draft'
  creativeCount: number
  ctr: number
  impressions: number
  /** 客户端补全字段, 来自 SystemConfig 兜底 */
  preview?: string
  startAt?: string
  endAt?: string
}

export interface AdCreativeRow {
  id: string
  slotId: string
  title: string
  image?: string
  link?: string
  startAt?: string
  endAt?: string
  budget?: number
  spent?: number
  impressions: number
  clicks: number
  status: 'active' | 'paused' | 'ended' | 'pending' | 'rejected'
  priority?: number
}

export type CreateAdSlotDto = {
  name: string
  target?: string
  scene?: string
  status?: AdSlot['status']
  position?: string
  preview?: string
  startAt?: string
  endAt?: string
}
export type UpdateAdSlotDto = Partial<CreateAdSlotDto>
export type CreateAdCreativeDto = {
  slotId: string
  title: string
  image?: string
  link?: string
  startAt?: string
  endAt?: string
  budget?: number
  priority?: number
  status?: AdCreativeRow['status']
}
export type UpdateAdCreativeDto = Partial<Omit<CreateAdCreativeDto, 'slotId'>>

/** AdSlot 后端 prisma 字段白名单, 用于过滤 dto 防 ValidationError */
const SLOT_PRISMA_FIELDS = [
  'name',
  'code',
  'scene',
  'target',
  'position',
  'size',
  'sort',
  'unitPrice',
  'enabled',
  'status',
] as const

/** AdCreative 后端 prisma 字段白名单 */
const CREATIVE_PRISMA_FIELDS = [
  'slotId',
  'title',
  'image',
  'video',
  'link',
  'startAt',
  'endAt',
  'budget',
  'priority',
  'status',
] as const

function pickAdFields<K extends string>(dto: any, allow: readonly K[]): Record<K, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of allow) {
    if (dto?.[k] !== undefined && dto[k] !== null && dto[k] !== '') {
      out[k] = dto[k]
    }
  }
  return out as Record<K, unknown>
}

/**
 * SystemConfig 兜底存储: 广告位的 preview / startAt / endAt
 *
 * 后端 platform.service systemSettings 用的是 SystemConfig.key='system_settings',
 * 我们这里复用同一个机制, 把 ad slot meta 挂在 system_settings.business.adSlotMeta 下,
 * 不污染主表 schema。读取走 systemService.settings(), 写走 systemService.saveSettings()。
 *
 * TODO(Agent E - 后端): 等 Agent E 在 prisma AdSlot 主表加 preview / startAt / endAt 三列
 * (以及对应的 platform controller PATCH 路由)后, 本文件 loadSlotMetaMap / saveSlotMetaMap
 * 这两个 helper 即可删除, 调用点改成直接 PATCH /p/ads/slots/:id 单字段更新, 不再需要
 * "读出整张 system_settings → 合并 business.adSlotMeta → 写回"这种重补丁。
 * 详见审查报告 P3-17。
 */
type SlotMetaEntry = { preview?: string; startAt?: string; endAt?: string }
async function loadSlotMetaMap(): Promise<Record<string, SlotMetaEntry>> {
  try {
    const s = await http.get<any>('/api/v1/p/system/settings', undefined, { silent: true })
    return (s?.business?.adSlotMeta as Record<string, SlotMetaEntry>) || {}
  } catch {
    return {}
  }
}

async function saveSlotMetaMap(map: Record<string, SlotMetaEntry>) {
  // 读 → 合并 → 写, 避免覆盖 business 块的其它字段(commissionRate / withdrawMinAmount 等)
  let current: any = {}
  try {
    current = (await http.get<any>('/api/v1/p/system/settings')) || {}
  } catch {
    current = {}
  }
  const next = {
    ...current,
    business: {
      ...(current.business || {}),
      adSlotMeta: map,
    },
  }
  return http.post<{ ok: boolean }>('/api/v1/p/system/settings', next)
}

export const adService = {
  /**
   * 拉广告位列表 + 合并 SystemConfig 里的 preview / startAt / endAt 兜底字段。
   * 在调用方看 slots[i].preview 等就跟原生字段一样, 无需关心后端是否落库。
   */
  async slots(): Promise<AdSlot[]> {
    const [list, metaMap] = await Promise.all([
      http.get<AdSlot[]>('/api/v1/p/ads/slots'),
      loadSlotMetaMap(),
    ])
    if (!Array.isArray(list)) return []
    return list.map((s) => ({
      ...s,
      preview: metaMap[s.id]?.preview || (s as any).preview || '',
      startAt: metaMap[s.id]?.startAt || (s as any).startAt || '',
      endAt: metaMap[s.id]?.endAt || (s as any).endAt || '',
    }))
  },
  creatives(params: { slotId?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<AdCreativeRow>>('/api/v1/p/ads/creatives', params)
  },
  /**
   * 新建广告位:
   * - code 必填且唯一, 自动生成: slot_<ts>
   * - status 默认 draft
   * - preview / startAt / endAt 走 SystemConfig 兜底落库, 不进 AdSlot 表
   */
  async createSlot(dto: CreateAdSlotDto): Promise<AdSlot> {
    const code = `slot_${Date.now()}`
    const corePayload = {
      ...pickAdFields({ ...dto, status: dto.status || 'draft', code }, SLOT_PRISMA_FIELDS),
    }
    const created = await http.post<AdSlot>('/api/v1/p/ads/slots', corePayload)
    const slotId = (created as any)?.id
    if (slotId && (dto.preview || dto.startAt || dto.endAt)) {
      const map = await loadSlotMetaMap()
      map[slotId] = {
        preview: dto.preview || '',
        startAt: dto.startAt || '',
        endAt: dto.endAt || '',
      }
      await saveSlotMetaMap(map).catch(() => {
        // 兜底存失败不影响主流程, 已经创建成功了
      })
    }
    return created
  },
  /**
   * 改广告位:
   * - 主表字段(name/target/status/scene/...)走 PUT /p/ads/slots/:id
   * - preview / startAt / endAt 走 SystemConfig 同步
   */
  async updateSlot(id: string, dto: UpdateAdSlotDto): Promise<AdSlot> {
    const core = pickAdFields(dto, SLOT_PRISMA_FIELDS)
    let result: any = null
    if (Object.keys(core).length > 0) {
      result = await http.put<AdSlot>(`/api/v1/p/ads/slots/${id}`, core)
    }
    if (dto.preview !== undefined || dto.startAt !== undefined || dto.endAt !== undefined) {
      const map = await loadSlotMetaMap()
      map[id] = {
        ...(map[id] || {}),
        ...(dto.preview !== undefined ? { preview: dto.preview } : {}),
        ...(dto.startAt !== undefined ? { startAt: dto.startAt } : {}),
        ...(dto.endAt !== undefined ? { endAt: dto.endAt } : {}),
      }
      await saveSlotMetaMap(map).catch(() => {})
    }
    return result as AdSlot
  },
  deleteSlot(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/ads/slots/${id}`)
  },
  createCreative(dto: CreateAdCreativeDto) {
    const payload = pickAdFields(
      {
        ...dto,
        status: dto.status || 'active',
        priority: typeof dto.priority === 'number' ? dto.priority : 50,
        startAt: dto.startAt || new Date().toISOString().slice(0, 10),
        endAt: dto.endAt || new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
      },
      CREATIVE_PRISMA_FIELDS,
    )
    return http.post<AdCreativeRow>('/api/v1/p/ads/creatives', payload)
  },
  updateCreative(id: string, dto: UpdateAdCreativeDto) {
    return http.put<AdCreativeRow>(
      `/api/v1/p/ads/creatives/${id}`,
      pickAdFields(dto, CREATIVE_PRISMA_FIELDS),
    )
  },
  deleteCreative(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/ads/creatives/${id}`)
  },
  /**
   * 广告创意审核通过(pending → active)
   *
   * 后端理想接口: `POST /api/v1/p/ads/creatives/:id/approve` —— **当前未实现**,
   * 需 Agent E 在 PlatformController 补对应路由 + 落审计记录。
   *
   * 接口未就绪期间,本方法暂走 updateCreative({status:'active'}) 实现等价语义,
   * console.warn 提示后端待补,避免后续 PR 漏改。
   */
  async approveCreative(id: string) {
    try {
      return await http.post<{ ok: boolean }>(
        `/api/v1/p/ads/creatives/${encodeURIComponent(id)}/approve`,
        undefined,
        { silent: true },
      )
    } catch {
      // eslint-disable-next-line no-console -- Agent E 待补 approve 路由的明确提示
      console.warn(
        '[adService.approveCreative] 后端 /p/ads/creatives/:id/approve 未实现,降级使用 updateCreative({status:"active"})。请在后端 PlatformController 补 approve/reject 路由后移除该 fallback。',
      )
      return adService.updateCreative(id, { status: 'active' })
    }
  },
  /**
   * 广告创意审核驳回(pending → rejected)
   * 与 approveCreative 同模式:理想接口 `POST /p/ads/creatives/:id/reject`(body: { reason }),
   * 当前后端未实现 → 降级为 updateCreative({status:'rejected'})。
   */
  async rejectCreative(id: string, _reason: string) {
    try {
      return await http.post<{ ok: boolean }>(
        `/api/v1/p/ads/creatives/${encodeURIComponent(id)}/reject`,
        { reason: _reason },
        { silent: true },
      )
    } catch {
      // eslint-disable-next-line no-console -- Agent E 待补 reject 路由的明确提示
      console.warn(
        '[adService.rejectCreative] 后端 /p/ads/creatives/:id/reject 未实现,降级使用 updateCreative({status:"rejected"})。请在后端 PlatformController 补 approve/reject 路由后移除该 fallback。',
      )
      return adService.updateCreative(id, { status: 'rejected' })
    }
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
  /** 全平台商品聚合（products tab）
   *
   * 后端 `plazaProductsAll` 默认拉 `status='active'` 商品(已通过审核且未下架),
   * include 了 merchant 关联,这正是平台端"新建推送 → 选商品"需要的源。
   */
  products(params: { page?: number; pageSize?: number; keyword?: string } = {}) {
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
  /**
   * 平台维度控制商品在选品广场是否展示 —— 不动 product.status,
   * 走 SystemConfig 兜底键 `plaza:product:${productId}`。
   *
   * 对应后端 PATCH /api/v1/p/plaza/products/:id/online,
   * body `{ online: boolean }`,失败时调用方应回滚 UI 状态。
   */
  setProductOnline(productId: string, online: boolean) {
    return http.patch<{ ok: boolean; status?: string }>(
      `/api/v1/p/plaza/products/${encodeURIComponent(productId)}/online`,
      { online },
    )
  },
}

// ============ 会员套餐 ============
export interface SubscriptionStatusOverview {
  yearly: number
  monthly: number
  trial: number
  expiringSoon: number
}
/**
 * 套餐订阅商家行 —— 由后端 `planSubscriptions` 扁平化输出:
 *   - merchantName / planName / planType / price 已 flatten 到顶层
 *   - subscribedAt 即 createdAt,totalDays 由 endAt-startAt 计算
 *   - status ∈ trial/active/expired (与 MerchantMembership 一致)
 */
export interface PlanSubscriptionRow {
  id: string
  merchantId: string
  planId: string
  planCode: string
  planName: string
  planType: string
  merchantName: string
  price: number
  startAt: string
  endAt: string
  status: 'trial' | 'active' | 'expired'
  autoRenew?: boolean
  totalDays: number
  subscribedAt: string
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
  /** 查询某套餐当前所有订阅商家(用于套餐详情展开行) */
  planSubscriptions(planId: string) {
    return http.get<PlanSubscriptionRow[]>(`/api/v1/p/member-plans/${planId}/subscriptions`)
  },
  /**
   * 新商家通用试用天数(0=关闭),走 SystemConfig 全局配置
   *
   * 调用接口 GET /api/v1/p/member-plans/trial-days 返回 { days }。
   * 若后端尚未配置(响应体没有 days 字段),返回 null,调用方应展示
   * "暂无配置"提示,严禁回退到任何硬编码默认值(历史曾默认 30 天导致误导)。
   */
  async trialDays(): Promise<number | null> {
    const r = await http.get<{ days?: number }>('/api/v1/p/member-plans/trial-days')
    return typeof r?.days === 'number' ? r.days : null
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
  /**
   * user 表上固定的 user.role 字段(super-admin / admin / platform 等),
   * 与 AdminRole 表中可自定义的角色名(roleName)不是一回事。
   */
  role: string
  /**
   * 关联 AdminRole.name —— 后端 listAdmins 通过 include: { adminRole: true } 注入,
   * 用于在 UI 上展示该管理员所属的可配置角色名(运营经理/审核员/客服/…)。
   *
   * 权限管理页角色成员数比对必须用这个字段,而不是 user.role(后者只会是
   * 'admin' / 'platform' / 'super-admin' 三种固定字面量,与角色表 name 无关)。
   */
  roleName?: string
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

/** 角色创建/编辑 DTO, 与 admin-pc saveAdminRole 字段对齐 */
export interface AdminRoleDto {
  id?: string
  name: string
  desc?: string
  permissions: string[]
}

/** 管理员创建/编辑 DTO, 与后端 createAdmin/updateAdmin 字段对齐 */
export interface AdminUserDto {
  id?: string
  username: string
  nickname?: string
  email?: string
  phone?: string
  /** prisma user.role 字段, 取值: super-admin / admin / platform */
  role: string
  /** 新建管理员必填, 至少 8 位; 修改管理员忽略 */
  password?: string
  avatar?: string
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
  /**
   * 新建/更新角色
   * - 后端 saveRole 看 dto.id: 有就 update, 无就 create
   * - 也兼容显式 PUT /p/roles/:id 通道(updateRole)
   */
  saveRole(dto: AdminRoleDto) {
    return http.post<AdminRole>('/api/v1/p/roles', dto as unknown as Record<string, unknown>)
  },
  updateRole(id: string, dto: Partial<AdminRoleDto>) {
    return http.put<AdminRole>(`/api/v1/p/roles/${id}`, dto as unknown as Record<string, unknown>)
  },
  deleteRole(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/p/roles/${id}`)
  },
  /**
   * 新建管理员: POST /p/admins
   *
   * 后端校验:
   *   - username / password 必填
   *   - password 至少 8 位
   *   - role 仅 admin/platform/super-admin, super-admin 仅 super-admin 调用方可指派
   */
  createAdminUser(dto: AdminUserDto) {
    return http.post<{ id: string; username: string }>(
      '/api/v1/p/admins',
      dto as unknown as Record<string, unknown>,
    )
  },
  /**
   * 修改管理员: PUT /p/admins/:id
   *
   * 服务端二次过滤 ADMIN_UPDATABLE_FIELDS:
   *   username / phone / email / nickname / avatar / role / status
   */
  updateAdminUser(id: string, dto: Partial<AdminUserDto>) {
    return http.put<{ ok: boolean; updated: boolean }>(
      `/api/v1/p/admins/${id}`,
      dto as unknown as Record<string, unknown>,
    )
  },
  /**
   * 统一保存接口(创建/更新自动分流)
   * - id 存在 → updateAdminUser
   * - 否则 → createAdminUser
   * UI 调用方表单填完直接 saveAdminUser(form), 不用判断模式
   */
  saveAdminUser(dto: AdminUserDto) {
    if (dto.id) {
      const { id, ...rest } = dto
      return this.updateAdminUser(id, rest)
    }
    return this.createAdminUser(dto)
  },
  /**
   * 超管重置管理员密码: POST /p/admins/:id/reset-password
   *
   * 后端鉴权: 仅 super-admin 可调, 不可重置自己 / 其它 super-admin / 普通客户
   * 后端校验: 密码至少 8 位
   */
  resetAdminPassword(id: string, newPassword: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/admins/${id}/reset-password`, {
      password: newPassword,
    })
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

// ============ 订单分享数据 ============
/**
 * 平台后台 · 订单分享统计与列表
 *
 * 后端: packages/server/src/modules/platform/platform.controller.ts
 *   GET /api/v1/p/order-shares       → Pagination<OrderShareRow>
 *   GET /api/v1/p/order-shares/stats → OrderShareStats
 *
 * 数据底层来自 SystemConfig (key 前缀 'order_share:'),由 merchant-app
 * `POST /m/orders/:id/share` 生成。前端可见字段 visibleFields ⊂
 * ['basics','customer','pricing','items','extra']。
 */
export interface OrderShareRow {
  shareCode: string
  orderId: string
  orderNo: string | null
  merchantId: string
  merchantName: string
  visibleFields: string[]
  expiresAt: string | null
  intro: string
  viewCount: number
  revoked: boolean
  expired: boolean
  createdAt: string
  shareUrl: string
}
export interface OrderShareStats {
  totalShares: number
  totalViews: number
  active: number
  revoked: number
  expired: number
  trend: { date: string; count: number }[]
  topMerchants: { merchantId: string; name: string; shareCount: number; viewCount: number }[]
}
export const orderShareService = {
  list(
    params: {
      page?: number
      pageSize?: number
      merchantId?: string
      revoked?: boolean
      startDate?: string
      endDate?: string
    } = {},
  ) {
    return http.get<Pagination<OrderShareRow>>('/api/v1/p/order-shares', params)
  },
  stats() {
    return http.get<OrderShareStats>('/api/v1/p/order-shares/stats')
  },
}

// ============ 消息中心 ============
/**
 * 平台消息中心 —— 已对接后端真接口,无任何 mock/兜底数据:
 *   GET  /api/v1/p/notifications              拉列表
 *   POST /api/v1/p/notifications/read-all     标记全部已读
 *   POST /api/v1/p/notifications/:id/read     标记单条已读
 *
 * list 接口失败返回 null,调用方据此显示空态 + 重试,严禁切换到任何演示数据。
 */
export type NotifyType = 'system' | 'todo' | 'business'
export interface NotifyItem {
  id: string
  type: NotifyType
  title: string
  content: string
  unread: boolean
  createdAt: string
}
export const notifyService = {
  async list(): Promise<NotifyItem[] | null> {
    try {
      const r = await http.get<{ list?: NotifyItem[] } | NotifyItem[]>(
        '/api/v1/p/notifications',
        undefined,
        { silent: true },
      )
      if (Array.isArray(r)) return r
      if (r && Array.isArray((r as any).list)) return (r as any).list
      return null
    } catch {
      return null
    }
  },
  async markAllRead(): Promise<boolean> {
    try {
      await http.post<{ ok: boolean }>('/api/v1/p/notifications/read-all', undefined, {
        silent: true,
      })
      return true
    } catch {
      return false
    }
  },
  /**
   * 标记单条通知已读 —— 对应后端 `POST /p/notifications/:id/read`,
   * 在通知详情打开时调用,失败 silent 返回 false,调用方据此决定是否更新本地状态。
   */
  async markRead(id: string): Promise<boolean> {
    try {
      await http.post<{ ok: boolean }>(
        `/api/v1/p/notifications/${encodeURIComponent(id)}/read`,
        undefined,
        { silent: true },
      )
      return true
    } catch {
      return false
    }
  },
}

// ============ 反馈 ============
/**
 * 平台反馈 —— 与后端 PlatformController.feedback() 对齐:
 *   POST /api/v1/p/feedback                                    提交反馈(用户/管理员均可)
 *   GET  /api/v1/p/feedback?type=&status=&page=&pageSize=     查询反馈队列(运营查看)
 *
 * 提交接口 silent 标志开启:接口失败由调用方落 storage 兜底保留用户输入,
 * 队列查询失败抛出由调用方显示空态 + 重试。
 *
 * 反馈类型 —— 严格对齐后端 platform.service.submitFeedback validTypes:
 *   'suggestion' | 'bug' | 'experience' | 'other'
 * 历史前端用过 'feature',提交后被后端静默改成 'other' 导致归类错乱,已统一为 'suggestion'。
 */
export interface FeedbackDto {
  type: 'suggestion' | 'bug' | 'experience' | 'other'
  content: string
  contact?: string
  images?: string[]
}
export type FeedbackStatus = 'open' | 'handling' | 'closed'
export interface FeedbackRow {
  id: string
  type: FeedbackDto['type']
  content: string
  contact?: string
  images?: string[]
  fromUserId: string | null
  status: FeedbackStatus
  createdAt: string
}
export const feedbackService = {
  submit(dto: FeedbackDto) {
    return http.post<{ ok: boolean; id?: string }>(
      '/api/v1/p/feedback',
      dto as unknown as Record<string, unknown>,
      { silent: true },
    )
  },
  list(
    params: {
      type?: FeedbackDto['type'] | 'all'
      status?: FeedbackStatus | 'all'
      page?: number
      pageSize?: number
    } = {},
  ) {
    // 'all' → undefined,后端会忽略 falsy 字段
    const q: Record<string, unknown> = {}
    if (params.type && params.type !== 'all') q.type = params.type
    if (params.status && params.status !== 'all') q.status = params.status
    if (params.page) q.page = params.page
    if (params.pageSize) q.pageSize = params.pageSize
    return http.get<Pagination<FeedbackRow>>('/api/v1/p/feedback', q)
  },
}

// ============ 工单系统 ============
/**
 * 与后端 PlatformController.tickets() 对齐：
 *   GET    /api/v1/p/tickets?status=&priority=&page=&pageSize=
 *   GET    /api/v1/p/tickets/handled-count
 *   GET    /api/v1/p/tickets/pending-count
 *   POST   /api/v1/p/tickets               (创建)
 *   POST   /api/v1/p/tickets/:id/handle    (处理:回复 + 改状态)
 *
 * 后端用 SystemConfig key='ticket:<id>' 兜底存储,无需独立 Ticket 表 migration。
 */
export type TicketStatus = 'open' | 'handling' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high'
export interface Ticket {
  id: string
  title: string
  content: string
  fromUserId: string | null
  fromUserName: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  handledBy: string | null
  handledAt: string | null
  reply: string
}
export const ticketService = {
  list(
    params: {
      status?: TicketStatus | 'all'
      priority?: TicketPriority | 'all'
      keyword?: string
      page?: number
      pageSize?: number
    } = {},
  ) {
    return http.get<Pagination<Ticket>>('/api/v1/p/tickets', params)
  },
  async pendingCount(): Promise<number> {
    try {
      const r = await http.get<{ count: number }>('/api/v1/p/tickets/pending-count', undefined, {
        silent: true,
      })
      return typeof r?.count === 'number' ? r.count : 0
    } catch {
      return 0
    }
  },
  async handledCount(): Promise<number> {
    try {
      const r = await http.get<{ count: number }>('/api/v1/p/tickets/handled-count', undefined, {
        silent: true,
      })
      return typeof r?.count === 'number' ? r.count : 0
    } catch {
      return 0
    }
  },
  handle(id: string, dto: { reply?: string; status?: TicketStatus }) {
    return http.post<{ ok: boolean; ticket: Ticket }>(
      `/api/v1/p/tickets/${id}/handle`,
      dto as unknown as Record<string, unknown>,
    )
  },
  create(dto: {
    title: string
    content: string
    priority?: TicketPriority
    fromUserName?: string
  }) {
    return http.post<Ticket>('/api/v1/p/tickets', dto as unknown as Record<string, unknown>)
  },
}

// ============ 售后/退款审核（平台维度) ============
/**
 * 平台维度的售后/退款审核 —— 对应 prisma.Refund 表，后端已实现：
 *   GET    /api/v1/p/refunds?status=&merchantId=&page=&pageSize=   (platform.controller refunds)
 *   POST   /api/v1/p/refunds/:id/agree      (refundAmount?)        (agreeRefund)
 *   POST   /api/v1/p/refunds/:id/reject     (reason)               (rejectRefundPlat)
 *
 * 同意全额退款会真调微信退款并把 Order.status 回写 refunded（见 platform.service）。
 * 调用方仍应对空数据显示空态，严禁渲染任何假数据。
 */
export type RefundStatus = 'pending' | 'agreed' | 'rejected' | 'in_progress' | 'completed'
export interface RefundRow {
  id: string
  no: string
  orderId: string
  orderNo?: string
  userId: string
  userName?: string
  merchantId: string
  merchantName?: string
  type: 'refund_only' | 'refund_with_return'
  reason: string
  description?: string
  evidence: string[]
  applyAmount: number
  refundAmount?: number | null
  status: RefundStatus
  merchantReply?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}
export const refundService = {
  list(
    params: {
      status?: RefundStatus | 'all'
      merchantId?: string
      page?: number
      pageSize?: number
    } = {},
  ) {
    const q: Record<string, unknown> = {}
    if (params.status && params.status !== 'all') q.status = params.status
    if (params.merchantId) q.merchantId = params.merchantId
    if (params.page) q.page = params.page
    if (params.pageSize) q.pageSize = params.pageSize
    return http.get<Pagination<RefundRow>>('/api/v1/p/refunds', q)
  },
  agree(id: string, refundAmount?: number) {
    return http.post<{ ok: boolean }>(`/api/v1/p/refunds/${encodeURIComponent(id)}/agree`, {
      refundAmount,
    })
  },
  reject(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/refunds/${encodeURIComponent(id)}/reject`, {
      reason,
    })
  },
}

// ============ 提现审核 (平台后端 Wave5 加的 /p/withdraws 系列接口) ============
export type WithdrawStatus = 'pending' | 'approved' | 'rejected' | 'paid'
export interface Withdraw {
  id: string
  merchantId: string
  merchantName?: string
  applicantName?: string
  amount: number
  method?: string // bank / alipay / wechat
  account?: string
  status: WithdrawStatus
  remark?: string
  reason?: string
  reviewerId?: string
  reviewedAt?: string
  paidAt?: string
  createdAt: string
}

export const withdrawService = {
  list(params?: {
    status?: WithdrawStatus | 'all'
    merchantId?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) {
    return http.get<{
      list: Withdraw[]
      total: number
      page: number
      pageSize: number
      hasMore?: boolean
    }>('/api/v1/p/withdraws', params)
  },
  approve(id: string, remark?: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/withdraws/${encodeURIComponent(id)}/approve`, {
      remark,
    })
  },
  reject(id: string, reason: string) {
    return http.post<{ ok: boolean }>(`/api/v1/p/withdraws/${encodeURIComponent(id)}/reject`, {
      reason,
    })
  },
  markPaid(id: string, body: { transactionId?: string; remark?: string }) {
    return http.post<{ ok: boolean }>(
      `/api/v1/p/withdraws/${encodeURIComponent(id)}/mark-paid`,
      body,
    )
  },
}

// ============ 操作日志 ============
/**
 * 与后端 PlatformController.auditRecords() 对齐：
 *   GET /api/v1/p/audit/records?type=merchant|product&status=&targetId=&page=&pageSize=
 *
 * 用于平台后台「操作日志」页面 — 查询所有审核流转记录。
 */
export type AuditRecordType = 'merchant' | 'product'
export type AuditRecordStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'auto_approved'
  | 'sample_check'
export interface AuditRecord {
  id: string
  type: AuditRecordType
  targetId: string
  status: AuditRecordStatus
  reason: string | null
  autoApproved: boolean
  sampleChecked: boolean
  reviewedAt: string | null
  createdAt: string
  auditor: { id: string; username: string | null; nickname: string } | null
}
export const auditLogService = {
  list(
    params: {
      type?: AuditRecordType | 'all'
      status?: AuditRecordStatus | 'all'
      targetId?: string
      page?: number
      pageSize?: number
    } = {},
  ) {
    // 把 'all' 翻成 undefined,避免后端把字面量当查询条件
    const q: Record<string, unknown> = {}
    if (params.type && params.type !== 'all') q.type = params.type
    if (params.status && params.status !== 'all') q.status = params.status
    if (params.targetId) q.targetId = params.targetId
    if (params.page) q.page = params.page
    if (params.pageSize) q.pageSize = params.pageSize
    return http.get<Pagination<AuditRecord>>('/api/v1/p/audit/records', q)
  },
}

// ============ 系统设置 ============
/**
 * 与 admin-pc 后台共用同一 SystemConfig 记录（key=system_settings）。
 *
 * 字段形态严格对齐后端 platform.service.ts::systemSettings DEFAULT:
 *   - payment.*           {enabled: boolean}  对象,不要写裸 boolean(admin-pc 形态)
 *   - security.passwordPolicy {minLength: number, requireUppercase: boolean}
 *   - business.*          四项:newMerchantAutoApprove / newProductAutoApprove /
 *                         platformCommissionRate(%) / withdrawMinAmount(元)
 *
 * 兼容历史：旧 platform-app 曾写过 `payment.wechat: true` 这种裸 boolean,
 * 读取端需要做 normalize(见 system/index.vue#normalizeSettings)。
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
