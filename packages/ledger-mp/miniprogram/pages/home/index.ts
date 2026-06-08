import { statsApi, notificationApi } from '../../api/index'
import { yuan } from '../../utils/format'

const COLORMAP: Record<string, string> = {
  profile: 'c1',
  glass: 'c2',
  hardware: 'c3',
  labor: 'c4',
  screen: 'c5',
  extras: 'c6',
}
// 选中维度对应的 KPI 汇总口径文案
const PERIOD_LABEL: Record<string, string> = { day: '本月', month: '本年', year: '近 5 年' }

Page({
  data: {
    hdPad: 30, // 顶部留白 = 状态栏高度 + 10
    period: 'month',
    periods: [
      { value: 'day', label: '日' },
      { value: 'month', label: '月' },
      { value: 'year', label: '年' },
    ],
    periodLabel: '本年',
    seriesTitle: '各月',
    loading: true,
    unread: false,
    ovYear: new Date().getFullYear(),
    donut: [] as any[],
    legend: [] as any[],
    profitBars: [] as any[],
    countBars: [] as any[],
    tops: [] as any[],
    profitBare: '0',
    revenueText: '¥0',
    costText: '¥0',
    donutCostText: '¥0',
    count: 0,
    avgText: '¥0',
    monthProfitText: '¥0',
    goalTargetText: '未设',
    goalPct: 0,
  },

  onShow() {
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.setData({ selected: 0 })
    this.setData({ hdPad: (getApp<IAppOption>()?.globalData?.statusBarHeight || 20) + 10 })
    this.load()
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },
  onPeriod(e: any) {
    this.setData({ period: e.detail.value }, () => this.load())
  },

  async load(done?: () => void) {
    const period = this.data.period
    try {
      // series → KPI 汇总 + 单量/利润图表；overview(本月) → 成本环图 + 目标 + 高利润
      const [sr, ov]: any[] = await Promise.all([
        statsApi.series(period),
        statsApi.overview('month'),
      ])
      const sm = sr.summary || {}
      const buckets = sr.buckets || []
      const profitBars = buckets.map((b: any) => ({ label: b.label, value: b.profit }))
      const countBars = buckets.map((b: any) => ({ label: b.label, value: b.count }))

      const slices = ov.costSlices || []
      const totalCost = slices.reduce((s: number, x: any) => s + x.value, 0) || 1
      const donut = slices.map((s: any) => ({ value: s.value, color: COLORMAP[s.key] || 'c6' }))
      const legend = slices.map((s: any) => ({
        name: s.name,
        color: COLORMAP[s.key] || 'c6',
        value: yuan(s.value),
        pct: Math.round((s.value / totalCost) * 100),
      }))
      const tops = (ov.topOrders || []).map((o: any) => ({
        id: o.id,
        customer: o.customer,
        date: o.date,
        profit: yuan(o.profit),
        margin: Math.round((o.margin || 0) * 100),
      }))
      const gp = ov.goalProgress ? ov.goalProgress.monthly : 0
      const Y = this.data.ovYear
      const seriesTitle =
        period === 'day' ? '本月每日' : period === 'year' ? '近 5 年' : `${Y} 年各月`

      this.setData({
        periodLabel: PERIOD_LABEL[period] || '本年',
        seriesTitle,
        profitBars,
        countBars,
        donut,
        legend,
        tops,
        profitBare: yuan(sm.profit || 0, true),
        revenueText: yuan(sm.revenue || 0),
        costText: yuan(sm.cost || 0),
        donutCostText: yuan(ov.cost || 0),
        count: sm.count || 0,
        avgText: yuan(sm.avgProfit || 0),
        monthProfitText: yuan(ov.monthProfit || 0),
        goalTargetText: ov.goal && ov.goal.monthly ? yuan(ov.goal.monthly) : '未设',
        goalPct: Math.min(100, Math.round((gp || 0) * 100)),
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
    } finally {
      if (done) done()
    }
    this.loadUnread()
  },

  async loadUnread() {
    try {
      const r: any = await notificationApi.unreadCount()
      this.setData({ unread: (r?.count || 0) > 0 })
    } catch (e) {
      /* 静默：红点不是关键路径 */
    }
  },

  toCost() {
    wx.navigateTo({ url: '/pages/cost-analysis/index' })
  },
  toGoal() {
    wx.navigateTo({ url: '/pages/goal/index' })
  },
  toMsg() {
    wx.navigateTo({ url: '/pages/message-center/index' })
  },
  toOrder(e: any) {
    wx.navigateTo({ url: '/pages/order-detail/index?id=' + e.currentTarget.dataset.id })
  },
})
