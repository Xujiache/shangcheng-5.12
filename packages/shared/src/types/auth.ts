/**
 * 认证 & 授权
 */
import type { BaseEntity } from './common'

/** 角色 */
export type UserRole = 'customer' | 'promoter' | 'factory' | 'store' | 'admin'

/** 用户基本信息 */
export interface User extends BaseEntity {
  openid?: string
  unionid?: string
  phone?: string
  nickname: string
  avatar: string
  gender?: 0 | 1 | 2
  role: UserRole
  status: 'active' | 'disabled'
  /** 关联商家 ID（若为厂家/门店） */
  merchantId?: string
  /** 关联 AdminRole.id（仅平台后台 admin/platform/super-admin 账号有值） */
  adminRoleId?: string | null
  /**
   * 关联 AdminRole.name 平铺（后端 auth.toUser 序列化时 join 出来，避免前端再次查询）。
   * 仅平台后台账号有值；普通用户为 null。
   * 用途：admin-pc 用户中心、平台管理员列表、当前登录用户卡片展示角色名。
   */
  roleName?: string | null
}

/** JWT 载荷 */
export interface JwtPayload {
  sub: string // user id
  openid?: string
  role: UserRole
  merchantId?: string
  permissions?: string[]
  iat: number
  exp: number
}

/** 登录请求 */
export interface WechatLoginDto {
  code: string
  /** 加密用户信息（首次授权时携带） */
  encryptedData?: string
  iv?: string
}

export interface AdminLoginDto {
  username: string
  password: string
  captcha?: string
}

export interface PhoneLoginDto {
  phone: string
  smsCode: string
}

/** 登录响应 */
export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

/** 刷新 token */
export interface RefreshTokenDto {
  refreshToken: string
}

/** 用户会话（前端使用） */
export interface UserSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: number
}
