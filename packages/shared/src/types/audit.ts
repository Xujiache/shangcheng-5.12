/**
 * 审核（商户 / 商品）+ 自动免审规则
 */
import type { BaseEntity, ID } from './common'

/** 审核对象 */
export type AuditTargetType = 'merchant' | 'product'

/** 审核状态 */
export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'sample_check'

/** 审核记录 */
export interface AuditRecord extends BaseEntity {
  type: AuditTargetType
  targetId: ID
  status: AuditStatus
  auditorId?: ID
  reason?: string
  /** 是否自动免审通过 */
  autoApproved?: boolean
  /** 是否被抽检 */
  sampleChecked?: boolean
  reviewedAt?: string
}

/** 商品自动免审规则配置 */
export interface AutoApproveRule {
  /** 全局开关 */
  enabled: boolean
  /** 条件（满足任一） */
  conditions: {
    vipYearly: boolean
    creditAGteA: boolean
    rejectRateBelow5: boolean
    onlyCategories?: ID[] // 仅指定品类（null = 全部品类）
  }
  /** 抽检比例 0-100 */
  sampleCheckPercent: number
}

/** 入驻审核 DTO */
export interface MerchantAuditDto {
  approved: boolean
  reason?: string
}

/** 商品审核 DTO */
export interface ProductAuditDto {
  approved: boolean
  reason?: string
}
