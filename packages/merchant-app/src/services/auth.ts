/**
 * 商家端认证服务
 *
 * - merchantPasswordLogin：商家手机号/密码登录
 * - merchantSmsLogin：商家短信登录（只登录已有用户）
 * - phoneLogin：注册阶段验证手机号（保留自动创建普通用户的兼容流程）
 * - sendSmsCode：发送短信验证码
 * - merchantApply：商家入驻申请（需先登录）
 */
import { http } from '../utils/request'
import type { UserSession } from '@jiujiu/shared/types'

export interface MerchantPasswordLoginPayload {
  phone: string
  password: string
}

export interface PhoneLoginPayload {
  phone: string
  code: string
}

export interface MerchantApplication {
  status: 'pending' | 'active' | 'rejected' | 'disabled'
  name: string
  type: 'factory' | 'store'
  rejectReason?: string | null
}

export type MerchantLoginSession = UserSession & {
  merchantApplication: MerchantApplication | null
  user: UserSession['user'] & { hasPassword?: boolean }
}

export interface MerchantApplyPayload {
  type: 'factory' | 'store'
  name: string
  legalName: string
  creditCode: string
  legalRep: string
  contact: string
  contactPhone: string
  region: string
  address: string
  businessLicense?: string
  qualifications?: string[]
  categories?: string[]
  password?: string
}

export const authService = {
  merchantPasswordLogin(payload: MerchantPasswordLoginPayload) {
    return http.post<MerchantLoginSession>(
      '/api/v1/auth/merchant-password-login',
      payload as unknown as Record<string, unknown>,
      { silent: true },
    )
  },
  merchantSmsLogin(payload: PhoneLoginPayload) {
    return http.post<MerchantLoginSession>(
      '/api/v1/auth/merchant-sms-login',
      payload as unknown as Record<string, unknown>,
      { silent: true },
    )
  },
  phoneLogin(payload: PhoneLoginPayload) {
    return http.post<UserSession>(
      '/api/v1/auth/phone-login',
      payload as unknown as Record<string, unknown>,
    )
  },
  sendSmsCode(phone: string, scene: 'login' | 'register' | 'reset' = 'login') {
    return http.post<{ ok: boolean }>('/api/v1/auth/sms-code', { phone, scene })
  },
  merchantApply(payload: MerchantApplyPayload) {
    return http.post<{ ok: boolean; applyId: string }>(
      '/api/v1/u/merchant-apply',
      payload as unknown as Record<string, unknown>,
    )
  },
  refresh(refreshToken: string) {
    return http.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/v1/auth/refresh',
      { refreshToken },
    )
  },
  logout() {
    // 带上 refreshToken，后端据此把该 token 加入吊销名单（仅清本地不够：泄露的 refresh token 仍可换新 access）
    return http.post<{ ok: boolean }>('/api/v1/auth/logout', {
      refreshToken: uni.getStorageSync('jiujiu_refresh_token') || '',
    })
  },
  userInfo() {
    return http.get<unknown>('/api/v1/auth/user-info')
  },
  changePassword(payload: { oldPassword: string; newPassword: string }) {
    return http.post<{ ok: boolean }>(
      '/api/v1/auth/change-password',
      payload as unknown as Record<string, unknown>,
    )
  },
  changePhone(payload: { oldSmsCode?: string; newPhone: string; newSmsCode: string }) {
    return http.post<{ ok: boolean; phone: string }>(
      '/api/v1/auth/change-phone',
      payload as unknown as Record<string, unknown>,
    )
  },
}
