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
    return http.post<{ ok: boolean }>('/api/v1/auth/logout', {})
  },
  refresh(refreshToken: string) {
    return http.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/v1/auth/refresh',
      { refreshToken },
    )
  },
}
