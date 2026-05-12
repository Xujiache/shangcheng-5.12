/**
 * 数据统计 / 仪表盘
 */
import type { ID } from './common'

/** 商家仪表盘 */
export interface MerchantDashboard {
  today: {
    orders: number
    ordersDelta: number
    newCustomers: number
    newCustomersDelta: number
    sales: number
    salesDelta: number
  }
  weekSales: number[]
  todos: {
    pendingShipment: number
    pendingRefund: number
    pendingStoreAuth: number
    pendingStaff?: number
  }
  plazaHighlights: {
    productId: ID
    productImage: string
    price: number
  }[]
}

/** 商家统计 · 销售趋势 */
export interface MerchantStats {
  period: 'today' | 'week' | 'month' | 'year'
  salesTrend: { date: string; value: number }[]
  topProducts: { productId: ID; name: string; sales: number }[]
  customerAnalysis: { newRatio: number; oldRatio: number }
  categoryBars: { category: string; sales: number }[]
}

/** 平台仪表盘 */
export interface PlatformDashboard {
  overview: {
    merchants: number
    merchantsDelta: number
    orders: number
    ordersDelta: number
    gmv: number
    gmvDelta: number
    users: number
    usersDelta: number
  }
  registrationTrend: { date: string; value: number }[]
  todos: {
    pendingMerchants: number
    pendingProducts: number
    pendingAds: number
    complaints: number
    pendingWithdraws: number
  }
  merchantTypeDistribution: {
    factory: number
    store: number
  }
  categorySales: { category: string; value: number }[]
  memberPlanDistribution: {
    yearly: number
    monthly: number
    trial: number
  }
}

/** 平台数据分析 · 功能使用 */
export interface FeatureUsageStats {
  feature: string
  usage: number
  coverage: number
  trend: number
}

/** 平台数据分析 · 地区分布 */
export interface RegionStats {
  region: string
  merchants: number
  gmv: number
}
