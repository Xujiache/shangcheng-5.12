import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'

// 获取管理员列表（旧路径 /api/user/list → 新 /api/v1/p/admins）
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/v1/p/admins',
    params
  })
}

// 获取角色列表（旧路径 /api/role/list → 新 /api/v1/p/roles）
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<Api.SystemManage.RoleList>({
    url: '/api/v1/p/roles',
    params
  })
}

// 获取菜单列表（admin-pc 默认走静态菜单，无需后端动态返回）
export function fetchGetMenuList() {
  return request.get<AppRouteRecord[]>({
    url: '/api/v1/auth/menus'
  }).catch(() => [] as AppRouteRecord[])
}
