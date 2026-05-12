/**
 * 系统设置 / 权限管理
 */
import type { BaseEntity, ID } from './common'

/** 角色 */
export interface Role extends BaseEntity {
  code: string
  name: string
  description?: string
  /** 权限矩阵 */
  permissions: PermissionMatrix
  isSystem?: boolean
  memberCount: number
}

/** 权限矩阵 */
export type PermissionMatrix = Record<string, PermissionActions>

/** 单模块的可执行操作 */
export interface PermissionActions {
  view: boolean
  edit: boolean
  audit: boolean
  delete: boolean
}

/** 管理员 */
export interface AdminUser extends BaseEntity {
  username: string
  name: string
  phone?: string
  email?: string
  avatar?: string
  roleId: ID
  roleName?: string
  status: 'active' | 'disabled'
  lastLoginAt?: string
}

/** 系统配置 */
export interface SystemConfig {
  platformName: string
  platformLogo?: string
  merchantLimit: number
  trialDays: number
  servicePhone: string
  platformCommissionPercent: number
  /** 厂家/门店按钮开关常开 */
  merchantButtonAlwaysOn: boolean
}

/** 支付配置 */
export interface PaymentConfig {
  wechat: {
    enabled: boolean
    appId?: string
    mchId?: string
    apiKey?: string
  }
  alipay?: { enabled: boolean }
  balance: { enabled: boolean }
}

/** 短信配置 */
export interface SmsConfig {
  enabled: boolean
  provider: 'aliyun' | 'tencent'
  accessKey?: string
  accessSecret?: string
  signName?: string
  templates: Record<string, string>
}

/** 物流配置 */
export interface ShippingConfig {
  providers: ('sf' | 'jd' | 'yto' | 'sto' | 'custom')[]
  defaultProvider?: string
}

/** OSS 配置 */
export interface StorageConfig {
  provider: 'minio' | 'aliyun-oss' | 'tencent-cos'
  endpoint?: string
  region?: string
  bucket?: string
  accessKey?: string
  secretKey?: string
  publicUrl?: string
}
