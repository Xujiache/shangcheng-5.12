export interface TrendPoint {
  date: string;
  value: number;
}

export interface TopProductPoint {
  productId: string;
  name: string;
  sales: number;
}

export interface CategoryBar {
  category: string;
  sales: number;
}

export interface CustomerAnalysis {
  newRatio: number;
  oldRatio: number;
}

export interface MerchantStats {
  period: string;
  orderCount: number;
  totalSales: number;
  avgOrderValue: number;
  salesTrend: TrendPoint[];
  topProducts: TopProductPoint[];
  customerAnalysis: CustomerAnalysis;
  categoryBars: CategoryBar[];
}

// Independent ArkTS mirror of MerchantAnalytics. No shared runtime dependency.
export interface AnalyticsTrendPoint { bucketStart: string; amount: number; }
export interface AnalyticsProduct { productId: string; name: string; quantity: number; }
export interface AnalyticsCategory { categoryId: string; name: string; quantity: number; }
export interface MerchantAnalytics {
  version: number;
  period: string;
  startDate: string;
  endDate: string;
  timeZone: string;
  asOf: string;
  granularity: string;
  paidAmount: number;
  paidOrderCount: number;
  avgOrderValue: number;
  refundAmount: number;
  totalQuantity: number;
  trend: AnalyticsTrendPoint[];
  topProducts: AnalyticsProduct[];
  categories: AnalyticsCategory[];
}
export class StatsSelection {
  period: string;
  startDate: string;
  endDate: string;
  constructor(period: string = 'week', startDate: string = '', endDate: string = '') {
    this.period = period; this.startDate = startDate; this.endDate = endDate;
  }
}
export interface StatsCalendarCell { date: string; day: number; inMonth: boolean; disabled: boolean; }
