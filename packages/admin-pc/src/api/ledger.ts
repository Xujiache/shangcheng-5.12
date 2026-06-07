/**
 * 平台 PC · 门窗利账（ledger）账号 / 会员管理接口
 *
 * 对接真后端 `/api/v1/p/ledger/*`，全部走平台 / 超管鉴权（token 由 http 包装层自动附带）。
 * http 包装层已 unwrap NestJS BaseResponse，返回的是裸 `data` payload。
 *
 * 列表接口后端统一返回 `{ list, total, page, pageSize }`；此处保留分页对象形态返回，
 * 由视图层自行驱动 ElPagination（与 platform-business.ts 中提现 / 审核日志的分页签名一致）。
 *
 * 约定：写操作（创建 / 改状态 / 重置密码 / 充值）失败时向上抛错，由视图 catch 后用
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
  phone: string
  nickname: string
  avatar: string
  status: 'active' | 'disabled'
  /** 是否要求下次登录强制改密 */
  mustReset: boolean
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

/** 创建账号返回：仅当未显式传 password 时才会带 generatedPassword（系统生成，仅返回一次） */
export type LedgerCreateResult = LedgerAccount & { generatedPassword?: string }

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

/**
 * 创建账号
 *
 * password 留空时后端自动生成并在返回值的 `generatedPassword` 字段带回（仅此一次），
 * 调用方必须把它展示给管理员复制——之后无法再取回。
 */
export function createLedgerAccount(payload: {
  phone: string
  password?: string
  nickname?: string
}) {
  return request.post<LedgerCreateResult>({ url: '/api/v1/p/ledger/users', data: payload })
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

/** 重置密码（后端生成新密码并返回，需展示给管理员） */
export function resetLedgerPassword(id: string) {
  return request.post<{ password: string }>({
    url: `/api/v1/p/ledger/users/${encodeURIComponent(id)}/reset-password`
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
