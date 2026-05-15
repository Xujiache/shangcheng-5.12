/**
 * 商家端认证服务
 *
 * - adminLogin：用户名/密码登录
 * - phoneLogin：手机号验证码登录（自动注册）
 * - sendSmsCode：发送短信验证码
 * - merchantApply：商家入驻申请（需先登录）
 */
import { http } from '../utils/request'
import type { UserSession } from '@jiujiu/shared/types'

export interface AdminLoginPayload {
  username: string
  password: string
}

export interface PhoneLoginPayload {
  phone: string
  code: string
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
}

export const authService = {
  adminLogin(payload: AdminLoginPayload) {
    return http.post<UserSession & { token?: string }>('/api/v1/auth/admin-login', payload as unknown as Record<string, unknown>)
  },
  phoneLogin(payload: PhoneLoginPayload) {
    return http.post<UserSession>('/api/v1/auth/phone-login', payload as unknown as Record<string, unknown>)
  },
  sendSmsCode(phone: string) {
    return http.post<{ ok: boolean }>('/api/v1/auth/sms-code', { phone })
  },
  merchantApply(payload: MerchantApplyPayload) {
    return http.post<{ ok: boolean; applyId: string }>('/api/v1/u/merchant-apply', payload as unknown as Record<string, unknown>)
  },
  refresh(refreshToken: string) {
    return http.post<{ accessToken: string; refreshToken: string; expiresIn: number }>('/api/v1/auth/refresh', { refreshToken })
  },
  logout() {
    return http.post<{ ok: boolean }>('/api/v1/auth/logout', {})
  },
  userInfo() {
    return http.get<unknown>('/api/v1/auth/user-info')
  },
  changePassword(payload: { oldPassword: string; newPassword: string }) {
    return http.post<{ ok: boolean }>('/api/v1/auth/change-password', payload as unknown as Record<string, unknown>)
  },
  changePhone(payload: { oldSmsCode?: string; newPhone: string; newSmsCode: string }) {
    return http.post<{ ok: boolean; phone: string }>('/api/v1/auth/change-phone', payload as unknown as Record<string, unknown>)
  },
}
