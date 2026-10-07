export type HomePeriod = 'day' | 'month' | 'year'

export interface HomePeriodOption {
  value: HomePeriod
  label: string
}

export interface HomeBucket {
  label: string
  profit: number
  revenue: number
  cost: number
  count: number
}

export interface HomeCostSlice {
  key: string
  name: string
  value: number
}

export interface HomeTopOrder {
  id: string
  customer: string
  date: string
  profit: number
  margin: number
}

export interface HomeSeriesResponse {
  buckets?: HomeBucket[]
}

export interface HomeOverviewResponse {
  costSlices?: HomeCostSlice[]
  topOrders?: HomeTopOrder[]
  goalProgress?: { monthly?: number }
  goal?: { monthly?: number } | null
  cost?: number
  monthProfit?: number
}

export interface HomeStatsViewModel {
  periodLabel: string
  seriesTitle: string
  profitBars: Array<{ label: string; value: number }>
  countBars: Array<{ label: string; value: number }>
  donut: Array<{ value: number; color: string }>
  legend: Array<{ name: string; color: string; value: string; pct: number }>
  tops: Array<{ id: string; customer: string; date: string; profit: string; margin: number }>
  profitBare: string
  revenueText: string
  costText: string
  donutCostText: string
  count: number
  avgText: string
  monthProfitText: string
  goalTargetText: string
  goalPct: number
}

export const HOME_PERIODS: HomePeriodOption[] = [
  { value: 'day', label: '日' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

const PERIOD_LABEL: Record<HomePeriod, string> = { day: '今日', month: '本月', year: '本年' }
const COST_COLORS: Record<string, string> = {
  profile: 'c1',
  glass: 'c2',
  hardware: 'c3',
  labor: 'c4',
  screen: 'c5',
  extras: 'c6',
}
const EMPTY_BUCKET: HomeBucket = { label: '', profit: 0, revenue: 0, cost: 0, count: 0 }

export function homeSeriesTitle(period: HomePeriod, year: number): string {
  if (period === 'day') return '本月每日'
  if (period === 'year') return '近 5 年'
  return `${year} 年各月`
}

export function homePeriodLabel(period: HomePeriod): string {
  return PERIOD_LABEL[period] || '本年'
}

export function currentHomeBucket(
  period: HomePeriod,
  buckets: HomeBucket[],
  now: Date = new Date(),
): HomeBucket {
  const index =
    period === 'day' ? now.getDate() - 1 : period === 'year' ? buckets.length - 1 : now.getMonth()
  return buckets[index] || EMPTY_BUCKET
}

export function buildHomeStatsViewModel(input: {
  series: HomeSeriesResponse
  overview: HomeOverviewResponse
  period: HomePeriod
  year: number
  formatMoney: (value: number) => string
  formatProfit: (value: number) => string
}): HomeStatsViewModel {
  const { series, overview, period, year, formatMoney, formatProfit } = input
  const buckets = Array.isArray(series.buckets) ? series.buckets : []
  const profitBars = buckets.map((bucket) => ({ label: bucket.label, value: bucket.profit }))
  const countBars = buckets.map((bucket) => ({ label: bucket.label, value: bucket.count }))
  const current = currentHomeBucket(period, buckets)
  const currentAverage = current.count ? Math.round(current.profit / current.count) : 0

  const slices = Array.isArray(overview.costSlices) ? overview.costSlices : []
  const totalCost = slices.reduce((sum, slice) => sum + slice.value, 0) || 1
  const donut = slices.map((slice) => ({
    value: slice.value,
    color: COST_COLORS[slice.key] || 'c6',
  }))
  const legend = slices.map((slice) => ({
    name: slice.name,
    color: COST_COLORS[slice.key] || 'c6',
    value: formatMoney(slice.value),
    pct: Math.round((slice.value / totalCost) * 100),
  }))
  const tops = (Array.isArray(overview.topOrders) ? overview.topOrders : []).map((order) => ({
    id: order.id,
    customer: order.customer,
    date: order.date,
    profit: formatMoney(order.profit),
    margin: Math.round((order.margin || 0) * 100),
  }))
  const goalProgress = overview.goalProgress ? overview.goalProgress.monthly : 0

  return {
    periodLabel: homePeriodLabel(period),
    seriesTitle: homeSeriesTitle(period, year),
    profitBars,
    countBars,
    donut,
    legend,
    tops,
    profitBare: formatProfit(current.profit || 0),
    revenueText: formatMoney(current.revenue || 0),
    costText: formatMoney(current.cost || 0),
    donutCostText: formatMoney(overview.cost || 0),
    count: current.count || 0,
    avgText: formatMoney(currentAverage),
    monthProfitText: formatMoney(overview.monthProfit || 0),
    goalTargetText:
      overview.goal && overview.goal.monthly ? formatMoney(overview.goal.monthly) : '未设',
    goalPct: Math.min(100, Math.round((goalProgress || 0) * 100)),
  }
}
