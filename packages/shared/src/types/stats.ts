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
  /** 新版商家工作台；旧字段继续保留给已发布客户端。 */
  workbench: {
    /** 服务端生成时间（ISO 8601） */
    updatedAt: string
    overview: {
      /** 今日实付成交额，按 paidAt + 北京时间统计 */
      paidAmount: number
      /** 今日实付订单数 */
      paidOrders: number
      /** 今日实付订单中的去重客户数 */
      paidCustomers: number
      versusYesterday: {
        paidAmountPct: number | null
        paidOrdersPct: number | null
        paidCustomersPct: number | null
      }
    }
    trend7d: { date: string; paidAmount: number }[]
    actions: {
      pendingShipment: number
      pendingRefund: number
      unreadMessages: number
      rejectedProducts: number
      auditingProducts: number
      pendingStoreAuth: number
    }
  }
}

/** 商家统计 · 销售趋势 */
export interface MerchantStats {
  period: 'today' | 'week' | 'month' | 'year'
  /** 周期内的订单总数（真实 order 行数，不是 SKU 销量） */
  orderCount: number
  /** 周期内的销售总额（已支付订单 payAmount 之和） */
  totalSales: number
  /** 客单价 = totalSales / orderCount（0 单时为 0，前端无需再除） */
  avgOrderValue: number
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
