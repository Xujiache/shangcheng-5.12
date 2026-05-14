/**
 * 认证相关接口
 *
 * 仅连接真实后端（/api/v1/auth/admin-login + /api/v1/auth/user-info）。
 * 不再保留任何 mock 账号兜底；所有账号 / 角色信息均来自后端。
 */
import request from '@/utils/http'

/** 登录 */
export function fetchLogin(params: Api.Auth.LoginParams): Promise<Api.Auth.LoginResponse> {
  return request
    .post<{ accessToken: string; refreshToken: string; token?: string }>({
      url: '/api/v1/auth/admin-login',
      data: { username: params.userName, userName: params.userName, password: params.password }
    })
    .then((res) => ({
      token: (res.token || res.accessToken) as string,
      refreshToken: res.refreshToken
    }))
}

/** 获取用户信息 */
export function fetchGetUserInfo(): Promise<Api.Auth.UserInfo> {
  return request.get<Api.Auth.UserInfo>({ url: '/api/v1/auth/user-info' })
}
