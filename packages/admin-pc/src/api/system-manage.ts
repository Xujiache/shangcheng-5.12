import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'

/**
 * 后端 → 前端 分页适配
 *
 * 后端 buildPage 返回 `{ list, total, page, pageSize }`；
 * 前端 `Api.Common.PaginatedResponse` 字段名为 `{ records, total, current, size }`。
 * 这里在 API 层做一次字段映射，让上层 `Api.SystemManage.UserList / RoleList`
 * 消费方无需关心后端命名约定，且对老接口（直接返回数组）也兼容。
 */
function adaptPage<T = any>(
  raw: any,
  params: { current?: number; size?: number } = {}
): Api.Common.PaginatedResponse<T> {
  const fallbackCurrent = params.current ?? 1
  const fallbackSize = params.size ?? 20
  if (!raw) {
    return { records: [], total: 0, current: fallbackCurrent, size: fallbackSize }
  }
  if (Array.isArray(raw)) {
    return { records: raw as T[], total: raw.length, current: fallbackCurrent, size: fallbackSize }
  }
  const records: T[] = Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(raw.records)
      ? raw.records
      : Array.isArray(raw.items)
        ? raw.items
        : []
  return {
    records,
    total: typeof raw.total === 'number' ? raw.total : records.length,
    current: typeof raw.page === 'number'
      ? raw.page
      : typeof raw.current === 'number'
        ? raw.current
        : fallbackCurrent,
    size: typeof raw.pageSize === 'number'
      ? raw.pageSize
      : typeof raw.size === 'number'
        ? raw.size
        : fallbackSize
  }
}

/**
 * 获取管理员列表（旧路径 /api/user/list → 新 /api/v1/p/admins）
 *
 * 后端预计返回 `{ list, total, page, pageSize }`；这里把分页字段映射成
 * 前端 PaginatedResponse 形态，并把前端 current/size 透传成后端期望的
 * page/pageSize query 参数。
 */
export async function fetchGetUserList(
  params: Api.SystemManage.UserSearchParams
): Promise<Api.SystemManage.UserList> {
  const { current, size, ...rest } = params || {}
  const raw = await request
    .get<any>({
      url: '/api/v1/p/admins',
      params: {
        ...rest,
        page: current,
        pageSize: size
      }
    })
    .catch(() => null)
  return adaptPage<Api.SystemManage.UserListItem>(raw, { current, size })
}

/**
 * 获取角色列表（旧路径 /api/role/list → 新 /api/v1/p/roles）
 *
 * 与 fetchGetUserList 同理，做后端 `{list,total,page,pageSize}` →
 * 前端 `{records,total,current,size}` 的字段适配。
 */
export async function fetchGetRoleList(
  params: Api.SystemManage.RoleSearchParams
): Promise<Api.SystemManage.RoleList> {
  const { current, size, ...rest } = params || {}
  const raw = await request
    .get<any>({
      url: '/api/v1/p/roles',
      params: {
        ...rest,
        page: current,
        pageSize: size
      }
    })
    .catch(() => null)
  return adaptPage<Api.SystemManage.RoleListItem>(raw, { current, size })
}

// 获取菜单列表（admin-pc 默认走静态菜单，无需后端动态返回）
export function fetchGetMenuList() {
  return request.get<AppRouteRecord[]>({
    url: '/api/v1/auth/menus'
  }).catch(() => [] as AppRouteRecord[])
}
