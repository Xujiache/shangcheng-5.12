/**
 * 商家端功能开关 · 灰度发布
 */
import type { BaseEntity, ID } from './common'

/** 开关分组 */
export type FeatureFlagGroup =
  | 'home_entry' // 首页快捷入口
  | 'role_button' // 角色按钮
  | 'side_menu' // 侧边/二级菜单

/** 适用商户类型 */
export type FeatureFlagAudience = 'all' | 'factory' | 'store' | 'specific'

/** 功能开关 */
export interface FeatureFlag extends BaseEntity {
  /** 唯一 key */
  key: string
  /** 显示名 */
  label: string
  /** 图标 */
  icon?: string
  group: FeatureFlagGroup
  /** 是否默认启用 */
  defaultEnabled: boolean
  /** 适用对象 */
  audience: FeatureFlagAudience
  /** 当 audience=specific 时指定的商户列表 */
  specificMerchantIds?: ID[]
  /** 灰度比例 0-100 */
  grayPercent: number
  /** 灰度白名单 */
  grayWhitelist?: ID[]
  /** 生效时间（立即/定时） */
  scheduledAt?: string
  /** 特殊标记：常开、HOT、仅厂家可见 等 */
  badge?: string
  /** 业务说明 */
  description?: string
  sort: number
}

/** 商户级别的开关覆盖（手动开关单一商户） */
export interface MerchantFeatureOverride extends BaseEntity {
  merchantId: ID
  flagKey: string
  enabled: boolean
  reason?: string
}

/** 商家端拉取的开关（已计算过灰度后的结果） */
export interface ResolvedFeatureFlags {
  homeEntry: Record<string, boolean>
  roleButton: Record<string, boolean>
  sideMenu: Record<string, boolean>
}

/** 功能开关编辑 DTO */
export interface FeatureFlagUpdateDto {
  defaultEnabled: boolean
  audience: FeatureFlagAudience
  specificMerchantIds?: ID[]
  grayPercent: number
  grayWhitelist?: ID[]
  scheduledAt?: string
}
