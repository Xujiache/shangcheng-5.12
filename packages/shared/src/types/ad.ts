/**
 * 广告位 / 广告创意
 */
import type { BaseEntity, ID } from './common'

/** 投放目标 */
export type AdTarget = 'customer' | 'factory' | 'store' | 'all'

/** 广告位 */
export interface AdSlot extends BaseEntity {
  /** 唯一 key */
  code: string
  name: string
  target: AdTarget
  /** 位置 */
  position: string
  /** 推荐尺寸 */
  size: string
  /** 默认排序 */
  sort: number
  /** 单价（参考） */
  unitPrice?: number
  enabled: boolean
}

/** 广告创意 */
export interface AdCreative extends BaseEntity {
  slotId: ID
  /** 投放商户（平台广告位无此字段） */
  merchantId?: ID
  title: string
  image?: string
  video?: string
  link?: string
  /** 投放排期 */
  startAt: string
  endAt: string
  /** 预算 */
  budget?: number
  /** 已花费 */
  spent?: number
  /** 数据统计 */
  impressions: number
  clicks: number
  status: 'pending' | 'active' | 'paused' | 'ended' | 'rejected'
  /** 优先级（数值越大越优先） */
  priority: number
}

/** 广告创建 DTO */
export interface AdCreativeCreateDto {
  slotId: ID
  target: AdTarget
  title: string
  image?: string
  video?: string
  link?: string
  startAt: string
  endAt: string
  budget?: number
  priority?: number
}
