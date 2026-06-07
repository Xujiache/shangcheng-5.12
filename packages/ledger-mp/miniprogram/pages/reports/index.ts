import { statsApi } from '../../api/index'
import { yuan } from '../../utils/format'

interface MonthRow {
  month: number
  label: string
  count: number
  revenue: number
  cost: number
  profit: number
  labor: number
  otherCost: number
}

Page({
  data: {
    tab: 'profit',
    tabs: [
      { value: 'profit', label: '利润统计' },
      { value: 'labor', label: '人工统计' },
    ],
    loading: true,
    sel: -1,
    ovYear: new Date().getFullYear(),
    hasData: false,
    // raw rows for the detail list
    months: [] as any[],
    // bar series
    profitBars: [] as any[],
    laborBars: [] as any[],
    // profit summary
    yearProfitBare: '0',
    count: 0,
    avgProfitText: '¥0',
    bestMonthLabel: '—',
    // labor summary
    yearLaborBare: '0',
    yearOtherText: '¥0',
    avgLaborText: '¥0',
  },

  onShow() {
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.setData({ selected: 2 })
    this.load()
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },
  onTab(e: any) {
    this.setData({ tab: e.detail.value, sel: -1 })
  },
  onSel(e: any) {
    const idx = Number(e.detail ? e.detail.index : e.currentTarget.dataset.index)
    this.setData({ sel: this.data.sel === idx ? -1 : idx })
  },

  async load(done?: () => void) {
    try {
      const res: any = await statsApi.monthly(this.data.ovYear)
      const series: MonthRow[] = res.series || []
      const hasData = series.some((s) => s.count > 0)

      const months = series.map((s) => ({
        month: s.month,
        label: s.label,
        count: s.count,
        profit: s.profit,
        profitText: yuan(s.profit),
        revenueText: yuan(s.revenue),
        laborText: yuan(s.labor),
        otherText: yuan(s.otherCost),
      }))
      const profitBars = series.map((s) => ({ label: s.label, value: s.profit }))
      const laborBars = series.map((s) => ({ label: s.label, value: s.labor, value2: s.otherCost }))

      const yearProfit = res.yearProfit || 0
      const yearLabor = res.yearLabor || 0
      const count = res.count || 0
      const yearOther = series.reduce((a, s) => a + (s.otherCost || 0), 0)

      // 最佳月份（利润最高且 > 0）
      let best = -1
      let bestVal = 0
      series.forEach((s) => {
        if (s.count > 0 && s.profit > bestVal) {
          bestVal = s.profit
          best = s.month
        }
      })

      this.setData({
        hasData,
        months,
        profitBars,
        laborBars,
        yearProfitBare: yuan(yearProfit, true),
        count,
        avgProfitText: count ? yuan(Math.round(yearProfit / count)) : '¥0',
        bestMonthLabel: best > 0 ? best + '月' : '—',
        yearLaborBare: yuan(yearLabor, true),
        yearOtherText: yuan(yearOther),
        avgLaborText: count ? yuan(Math.round(yearLabor / count)) : '¥0',
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
    } finally {
      if (done) done()
    }
  },
})
