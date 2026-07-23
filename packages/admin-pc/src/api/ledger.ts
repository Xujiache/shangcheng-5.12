/**
 * 平台 PC · 门窗利账（ledger）账号 / 会员管理接口
 *
 * 对接真后端 `/api/v1/p/ledger/*`，全部走平台 / 超管鉴权（token 由 http 包装层自动附带）。
 * http 包装层已 unwrap NestJS BaseResponse，返回的是裸 `data` payload。
 *
 * 列表接口后端统一返回 `{ list, total, page, pageSize }`；此处保留分页对象形态返回，
 * 由视图层自行驱动 ElPagination（与 platform-business.ts 中提现 / 审核日志的分页签名一致）。
 *
 * 约定：写操作（改状态 / 充值 / 通知）失败时向上抛错，由视图 catch 后用
 * ElMessage 提示；读操作失败兜底空分页 / 空数组，让页面进入空态而非崩溃。
 */
import request from '@/utils/http'

/* ============ 类型定义 ============ */

/** 会员套餐 key（与后端 grant 接口的 planKey 枚举对齐） */
export type LedgerPlanKey = 'day' | 'week' | 'month' | 'quarter' | 'year'

/**
 * 账号会员状态（后端在 User 上聚合派生）
 *
 * - active: 会员是否有效（未过期且已开通）
 * - expired: 是否已过期
 * - never: 是否从未开通
 * - expiresAt: 到期日（ISO 字符串）；never 时为 null
 * - daysLeft: 剩余天数（已过期为 0 / 负）
 * - expiringSoon: 是否临近到期（后端判定）
 * - lastPlanKey: 最近一次充值使用的套餐 key
 */
export interface LedgerMembership {
  active: boolean
  expired: boolean
  never: boolean
  expiresAt: string | null
  daysLeft: number
  expiringSoon: boolean
  lastPlanKey: string | null
}

/** 门窗利账账号 */
export interface LedgerAccount {
  id: string
  /** 由内部用户 ID 派生的 8 位展示编号，用于客服/会员开通时识别账号 */
  accountCode: string
  wechatLinked: boolean
  nickname: string
  avatar: string
  status: 'active' | 'disabled'
  lastLoginAt: string | null
  createdAt: string
  membership: LedgerMembership
}

/** 会员变更记录条目 */
export interface LedgerMembershipLog {
  /** 本次增减的天数（+/-） */
  deltaDays: number
  planKey: string | null
  beforeAt: string | null
  afterAt: string | null
  note: string | null
  createdAt: string
}

/** 分页响应 */
export interface LedgerAccountsPage {
  list: LedgerAccount[]
  total: number
  page: number
  pageSize: number
}

/** 充值返回 */
export interface LedgerGrantResult {
  membership: LedgerMembership
  /** 本次实际增加的天数 */
  deltaDays: number
}

/** 套餐预设（用于充值弹窗的快捷按钮） */
export const LEDGER_PLANS: { key: LedgerPlanKey; label: string; days: number }[] = [
  { key: 'day', label: '体验卡', days: 1 },
  { key: 'week', label: '周卡', days: 7 },
  { key: 'month', label: '月卡', days: 30 },
  { key: 'quarter', label: '季卡', days: 90 },
  { key: 'year', label: '年卡', days: 365 }
]

/* ============ 接口 ============ */

/** 账号列表（关键词 / 状态过滤 + 分页） */
export async function fetchLedgerAccounts(params?: {
  keyword?: string
  status?: 'active' | 'disabled'
  page?: number
  pageSize?: number
}): Promise<LedgerAccountsPage> {
  const query: Record<string, unknown> = {}
  if (params?.keyword) query.keyword = params.keyword
  if (params?.status) query.status = params.status
  query.page = params?.page ?? 1
  query.pageSize = params?.pageSize ?? 20
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/ledger/users', params: query })
    const rawList: any[] = Array.isArray(resp?.list) ? resp.list : Array.isArray(resp) ? resp : []
    return {
      list: rawList as LedgerAccount[],
      total: typeof resp?.total === 'number' ? resp.total : rawList.length,
      page: typeof resp?.page === 'number' ? resp.page : (params?.page ?? 1),
      pageSize: typeof resp?.pageSize === 'number' ? resp.pageSize : (params?.pageSize ?? 20)
    }
  } catch {
    return { list: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 }
  }
}

/** 更新账号（启用 / 停用 · 改昵称） */
export function updateLedgerAccount(
  id: string,
  payload: { status?: 'active' | 'disabled'; nickname?: string }
) {
  // 后端为 PATCH；http 包装层无 patch 快捷方法，统一走 request.request 显式指定 method。
  return request.request<LedgerAccount>({
    url: `/api/v1/p/ledger/users/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: payload
  })
}

/**
 * 增加会员时长（充值）
 *
 * planKey ∈ day|week|month|quarter|year，或自定义整数 days；**days 优先于 planKey**。
 * 该操作为「累加」：新到期 = max(now, 当前到期) + N 天。
 */
export function grantLedgerMembership(
  id: string,
  payload: { planKey?: LedgerPlanKey; days?: number; note?: string }
) {
  return request.post<LedgerGrantResult>({
    url: `/api/v1/p/ledger/users/${encodeURIComponent(id)}/membership/grant`,
    data: payload
  })
}

/** 会员变更记录 */
export async function fetchLedgerMembershipLogs(id: string): Promise<LedgerMembershipLog[]> {
  try {
    const resp = await request.get<any>({
      url: `/api/v1/p/ledger/users/${encodeURIComponent(id)}/membership/logs`
    })
    return Array.isArray(resp) ? (resp as LedgerMembershipLog[]) : []
  } catch {
    return []
  }
}

/** 向某账号推送一条应用内通知（落库后小程序消息中心可见） */
export function pushLedgerNotification(
  id: string,
  payload: { title: string; body: string; type?: string }
) {
  return request.post<{ id: string; ok: boolean }>({
    url: `/api/v1/p/ledger/users/${encodeURIComponent(id)}/notify`,
    data: payload
  })
}

/* ============ 意见反馈 ============ */

/** 反馈类型 */
export type LedgerFeedbackType = 'general' | 'delete_account'

/** 意见反馈条目（后端联表带出提交人账号编号 / 昵称） */
export interface LedgerFeedback {
  id: string
  userId: string
  accountCode: string
  nickname: string
  type: LedgerFeedbackType | string
  content: string
  contact: string | null
  status: 'open' | 'resolved'
  reply: string | null
  images?: string[]
  createdAt: string
}

export interface LedgerFeedbackPage {
  list: LedgerFeedback[]
  total: number
  page: number
  pageSize: number
}

/** 反馈列表（状态 / 类型 / 关键词过滤 + 分页） */
export async function fetchLedgerFeedback(params?: {
  status?: 'open' | 'resolved'
  type?: string
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<LedgerFeedbackPage> {
  const query: Record<string, unknown> = {}
  if (params?.status) query.status = params.status
  if (params?.type) query.type = params.type
  if (params?.keyword) query.keyword = params.keyword
  query.page = params?.page ?? 1
  query.pageSize = params?.pageSize ?? 20
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/ledger/feedback', params: query })
    const rawList: any[] = Array.isArray(resp?.list) ? resp.list : Array.isArray(resp) ? resp : []
    return {
      list: rawList as LedgerFeedback[],
      total: typeof resp?.total === 'number' ? resp.total : rawList.length,
      page: typeof resp?.page === 'number' ? resp.page : (params?.page ?? 1),
      pageSize: typeof resp?.pageSize === 'number' ? resp.pageSize : (params?.pageSize ?? 20)
    }
  } catch {
    return { list: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 }
  }
}

/** 处理反馈（标记状态 / 回复备注） */
export function updateLedgerFeedback(
  id: string,
  payload: { status?: 'open' | 'resolved'; reply?: string }
) {
  return request.request<{ id: string; status: string; reply: string | null }>({
    url: `/api/v1/p/ledger/feedback/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: payload
  })
}

/* ============ 首页广告（#2）============ */

/** 首页广告 banner */
export interface LedgerAd {
  id: string
  title: string | null
  image: string
  link: string | null
  sort: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** 广告列表（后台返回全部，含未启用） */
export async function fetchLedgerAds(): Promise<LedgerAd[]> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/ledger/ads' })
    return Array.isArray(resp) ? (resp as LedgerAd[]) : []
  } catch {
    return []
  }
}

export function createLedgerAd(payload: {
  image: string
  title?: string
  link?: string
  sort?: number
  enabled?: boolean
}) {
  return request.post<LedgerAd>({ url: '/api/v1/p/ledger/ads', data: payload })
}

export function updateLedgerAd(
  id: string,
  payload: Partial<{ image: string; title: string; link: string; sort: number; enabled: boolean }>
) {
  return request.request<LedgerAd>({
    url: `/api/v1/p/ledger/ads/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: payload
  })
}

export function deleteLedgerAd(id: string) {
  return request.request<{ ok: boolean }>({
    url: `/api/v1/p/ledger/ads/${encodeURIComponent(id)}`,
    method: 'DELETE'
  })
}

/**
 * 上传广告图片到对象存储，返回公网 URL（复用通用 /api/v1/files/upload，走 MinIO）。
 * FormData 由浏览器自动设边界，http 拦截器对 FormData 短路不会误塞 application/json。
 */
/* ============ AI 生图（#7 后台生成广告图，gpt-image-2）============ */
export function generateLedgerAiImage(payload: {
  prompt: string
  size?: string
  quality?: string
}) {
  return request.post<{ done: boolean; url: string | null; taskId: string | null }>({
    url: '/api/v1/p/ledger/ai/image',
    data: payload
  })
}
export function ledgerAiImageStatus(taskId: string) {
  return request.get<{
    done: boolean
    state: string
    progress: string
    url: string
    error: string
  }>({
    url: '/api/v1/p/ledger/ai/image/status',
    params: { taskId }
  })
}
export function adoptLedgerAiImage(url: string) {
  return request.post<{ url: string }>({ url: '/api/v1/p/ledger/ai/image/adopt', data: { url } })
}

export async function uploadLedgerImage(file: File): Promise<{ url: string; key: string }> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('bizType', 'ledger-ad')
  return request.post<{ url: string; key: string }>({ url: '/api/v1/files/upload', data: fd })
}

/* ============ 功能配置（#9 优化下料 / #10 邀请）============ */

/** ledger 全局功能配置 */
/** 会员套餐（price 仅展示，App 内无支付） */
export interface LedgerPlan {
  key: string
  label: string
  days: number
  price: string
  /** true=永久会员（开通后不过期；days 仅展示） */
  perpetual?: boolean
  /** true=体验卡：每账号限领/限购一次 */
  trial?: boolean
}

const DEFAULT_LEDGER_PLANS: LedgerPlan[] = [
  { key: 'day', label: '体验卡', days: 1, price: '¥1' },
  { key: 'week', label: '周卡', days: 7, price: '¥9' },
  { key: 'month', label: '月卡', days: 30, price: '¥29' },
  { key: 'quarter', label: '季卡', days: 90, price: '¥79' },
  { key: 'year', label: '年卡', days: 365, price: '¥268' }
]

export interface LedgerConfig {
  /** 邀请成功奖励邀请人的天数 */
  inviteRewardDays: number
  /** 单个邀请人最多奖励多少个被邀请人（0=不限） */
  inviteMaxRewarded: number
  /** 会员套餐（后台可编辑） */
  plans: LedgerPlan[]
}

const DEFAULT_LEDGER_CONFIG: LedgerConfig = {
  inviteRewardDays: 7,
  inviteMaxRewarded: 50,
  plans: DEFAULT_LEDGER_PLANS
}

export async function fetchLedgerConfig(): Promise<LedgerConfig> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/ledger/config' })
    if (!resp || typeof resp !== 'object') return { ...DEFAULT_LEDGER_CONFIG }
    return {
      inviteRewardDays: Number(resp.inviteRewardDays ?? DEFAULT_LEDGER_CONFIG.inviteRewardDays),
      inviteMaxRewarded: Number(resp.inviteMaxRewarded ?? DEFAULT_LEDGER_CONFIG.inviteMaxRewarded),
      plans: Array.isArray(resp.plans) && resp.plans.length ? resp.plans : DEFAULT_LEDGER_PLANS
    }
  } catch {
    return { ...DEFAULT_LEDGER_CONFIG }
  }
}

export function updateLedgerConfig(payload: Partial<LedgerConfig>) {
  return request.request<LedgerConfig>({
    url: '/api/v1/p/ledger/config',
    method: 'PUT',
    data: payload
  })
}

/* ============ 邀请统计（#10）============ */

export interface LedgerInviteRow {
  inviterId: string
  accountCode: string
  nickname: string
  inviteCode: string
  invitedCount: number
}

export interface LedgerInviteStats {
  totalUsers: number
  invitedUsers: number
  list: LedgerInviteRow[]
}

export async function fetchLedgerInviteStats(): Promise<LedgerInviteStats> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/ledger/invite-stats' })
    return {
      totalUsers: Number(resp?.totalUsers || 0),
      invitedUsers: Number(resp?.invitedUsers || 0),
      list: Array.isArray(resp?.list) ? (resp.list as LedgerInviteRow[]) : []
    }
  } catch {
    return { totalUsers: 0, invitedUsers: 0, list: [] }
  }
}

/* ============ 更新日志（版本日志）============ */
export interface LedgerChangelog {
  id: string
  version: string
  title: string
  content: string
  published: boolean
  createdAt: string
  updatedAt: string
}
export async function fetchLedgerChangelogs(): Promise<LedgerChangelog[]> {
  try {
    const resp = await request.get<any>({ url: '/api/v1/p/ledger/changelogs' })
    return Array.isArray(resp) ? resp : []
  } catch {
    return []
  }
}
export function createLedgerChangelog(payload: {
  version: string
  title: string
  content: string
  published?: boolean
}) {
  return request.post<LedgerChangelog>({ url: '/api/v1/p/ledger/changelogs', data: payload })
}
export function updateLedgerChangelog(
  id: string,
  payload: Partial<{ version: string; title: string; content: string; published: boolean }>
) {
  return request.request<LedgerChangelog>({
    url: `/api/v1/p/ledger/changelogs/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: payload
  })
}
export function deleteLedgerChangelog(id: string) {
  return request.request<{ ok: boolean }>({
    url: `/api/v1/p/ledger/changelogs/${encodeURIComponent(id)}`,
    method: 'DELETE'
  })
}
