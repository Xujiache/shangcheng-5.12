/**
 * 平台端认证服务
 */
import { http } from '../utils/request'
import type { UserSession } from '@jiujiu/shared/types'

export interface AdminLoginPayload {
  username: string
  password: string
}

export const platformAuthService = {
  adminLogin(payload: AdminLoginPayload) {
    return http.post<UserSession & { token?: string }>(
      '/api/v1/auth/admin-login',
      payload as unknown as Record<string, unknown>,
    )
  },
  userInfo() {
    return http.get<unknown>('/api/v1/auth/user-info')
  },
  logout() {
    // 带上 refreshToken，后端据此把该 token 加入吊销名单（仅清本地不够：泄露的 refresh token 仍可换新 access）
    return http.post<{ ok: boolean }>('/api/v1/auth/logout', {
      refreshToken: uni.getStorageSync('jiujiu_admin_refresh_token') || '',
    })
  },
  refresh(refreshToken: string) {
    return http.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/v1/auth/refresh',
      { refreshToken },
    )
  },
  sendSmsCode(phone: string) {
    return http.post<{ ok: boolean }>('/api/v1/auth/sms-code', { phone })
  },
  changePassword(payload: { oldPassword: string; newPassword: string }) {
    return http.post<{ ok: boolean }>('/api/v1/auth/change-password', payload as unknown as Record<string, unknown>)
  },
  changePhone(payload: { oldSmsCode?: string; newPhone: string; newSmsCode: string }) {
    return http.post<{ ok: boolean; phone: string }>('/api/v1/auth/change-phone', payload as unknown as Record<string, unknown>)
  },
}
