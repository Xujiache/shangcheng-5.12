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

/** 发送短信验证码（用于修改手机号） */
export function sendSmsCode(phone: string) {
  return request.post<{ ok: boolean }>({
    url: '/api/v1/auth/sms-code',
    data: { phone }
  })
}

/** 修改密码 */
export function changePassword(payload: { oldPassword: string; newPassword: string }) {
  return request.post<{ ok: boolean }>({
    url: '/api/v1/auth/change-password',
    data: payload
  })
}

/** 修改手机号（含原手机 + 新手机双码） */
export function changePhone(payload: {
  oldSmsCode?: string
  newPhone: string
  newSmsCode: string
}) {
  return request.post<{ ok: boolean; phone: string }>({
    url: '/api/v1/auth/change-phone',
    data: payload
  })
}
