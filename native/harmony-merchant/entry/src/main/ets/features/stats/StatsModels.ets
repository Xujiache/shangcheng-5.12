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
