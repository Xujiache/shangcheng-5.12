/**
 * 选品广场 · 推送 / 代理
 */
import type { BaseEntity, ID } from './common'

/** 推送对象类型 */
export type PlazaPushTargetType = 'product' | 'factory'

/** 推送位置 */
export type PlazaPushPosition =
  | 'merchant_app_home_entry' // 商家 APP 首页入口
  | 'plaza_top_banner' // 广场首屏 Banner
  | 'category_top' // 分类首屏
  | 'plaza_feed' // 广场 feed 流

/** 推送状态 */
export type PlazaPushStatus = 'draft' | 'pending' | 'active' | 'offline' | 'ended'

/** 推送实体 */
export interface PlazaPush extends BaseEntity {
  /** 商品 ID（推送商品时） */
  productIds?: ID[]
  /** 厂家 ID（推送厂家时） */
  factoryIds?: ID[]
  targetType: PlazaPushTargetType
  positions: PlazaPushPosition[]
  /** 标签（🔥本周热推 / 新品 / 厂家直供 / 高佣金 / 限时 / 自定义） */
  tags: string[]
  /** 投放对象 */
  audience: {
    type: 'all' | 'region' | 'level'
    regions?: string[]
    levels?: ('A' | 'B' | 'C')[]
  }
  scheduledStart: string
  scheduledEnd: string
  /** 排序权重 0-99 */
  weight: number
  /** 建议加价区间 */
  suggestMarkupMin?: number
  suggestMarkupMax?: number
  /** 建议佣金 % */
  suggestCommission?: number
  /** 推送语 */
  pushText?: string
  status: PlazaPushStatus
  /** 数据统计 */
  stats?: {
    impressions: number
    clicks: number
    agencyApplies: number
    deals: number
  }
}

/** 新建推送 DTO */
export interface PlazaPushCreateDto {
  targetType: PlazaPushTargetType
  productIds?: ID[]
  factoryIds?: ID[]
  positions: PlazaPushPosition[]
  tags: string[]
  audience: PlazaPush['audience']
  scheduledStart: string
  scheduledEnd: string
  weight: number
  suggestMarkupMin?: number
  suggestMarkupMax?: number
  suggestCommission?: number
  pushText?: string
}

/** 代理申请 DTO */
export interface AgencyApplyDto {
  productIds: ID[]
  /** 统一加价 % */
  markupPercent: number
  /** 价格自动同步 */
  autoSyncPrice: boolean
  /** 申请留言 */
  message?: string
}

/** 选品广场卡片（商家 APP 列表项） */
export interface PlazaProductCard {
  productId: ID
  productName: string
  productImage: string
  /** 厂家名 */
  factoryName: string
  factoryId: ID
  /** 起价 */
  startPrice: number
  /** 已代理数 */
  agencyCount: number
  tags: string[]
  /** 是否平台推送 */
  isPlatformPushed: boolean
  suggestMarkupMin?: number
  suggestMarkupMax?: number
  suggestCommission?: number
}
