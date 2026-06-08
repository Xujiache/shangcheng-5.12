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
const PERIOD_LABEL: Record<string, string> = { month: '本月', quarter: '本季', year: '全年' }

Page({
  data: {
    hdPad: 30, // 顶部留白 = 状态栏高度 + 10
    period: 'month',
    periods: [
      { value: 'month', label: '本月' },
      { value: 'quarter', label: '本季' },
      { value: 'year', label: '全年' },
    ],
    periodLabel: '本月',
    loading: true,
    unread: false,
    ovYear: new Date().getFullYear(),
    donut: [] as any[],
    legend: [] as any[],
    trend: [] as any[],
    tops: [] as any[],
    profitBare: '0',
    revenueText: '¥0',
    costText: '¥0',
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
    this.setData({ period: e.detail.value, periodLabel: PERIOD_LABEL[e.detail.value] }, () =>
      this.load(),
    )
  },

  async load(done?: () => void) {
    try {
      const ov: any = await statsApi.overview(this.data.period)
      const slices = ov.costSlices || []
      const totalCost = slices.reduce((s: number, x: any) => s + x.value, 0) || 1
      const donut = slices.map((s: any) => ({ value: s.value, color: COLORMAP[s.key] || 'c6' }))
      const legend = slices.map((s: any) => ({
        name: s.name,
        color: COLORMAP[s.key] || 'c6',
        value: yuan(s.value),
        pct: Math.round((s.value / totalCost) * 100),
      }))
      const trend = (ov.trend || []).map((t: any) => ({ label: String(t.month), value: t.profit }))
      const tops = (ov.topOrders || []).map((o: any) => ({
        id: o.id,
        customer: o.customer,
        date: o.date,
        profit: yuan(o.profit),
        margin: Math.round((o.margin || 0) * 100),
      }))
      const gp = ov.goalProgress ? ov.goalProgress.monthly : 0
      this.setData({
        donut,
        legend,
        trend,
        tops,
        profitBare: yuan(ov.profit, true),
        revenueText: yuan(ov.revenue),
        costText: yuan(ov.cost),
        count: ov.count,
        avgText: yuan(ov.avgProfit),
        monthProfitText: yuan(ov.monthProfit),
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
