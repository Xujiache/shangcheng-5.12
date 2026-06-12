import { statsApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'

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
    loadError: false, // 网络/加载失败：区别于"暂无数据"空态
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

  _seq: 0,

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
    // 序号守卫：onShow/下拉可能并发触发，旧响应不得覆盖新数据
    const seq = (this._seq = (this._seq || 0) + 1)
    try {
      const res: any = await statsApi.monthly(this.data.ovYear)
      if (seq !== this._seq) return
      const series: MonthRow[] = res.series || []
      const hasData = series.some((s) => s.count > 0)
      // 隐藏金额模式：仅掩码文本金额，图表保持相对比例
      const hide = getHideAmount()
      const fmt = (n: number) => (hide ? maskMoney(n) : yuan(n))

      const months = series.map((s) => ({
        month: s.month,
        label: s.label,
        count: s.count,
        profit: s.profit,
        profitText: fmt(s.profit),
        revenueText: fmt(s.revenue),
        laborText: fmt(s.labor),
        otherText: fmt(s.otherCost),
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
        yearProfitBare: hide ? maskMoney(yearProfit) : yuan(yearProfit, true),
        count,
        avgProfitText: fmt(count ? Math.round(yearProfit / count) : 0),
        bestMonthLabel: best > 0 ? best + '月' : '—',
        yearLaborBare: hide ? maskMoney(yearLabor) : yuan(yearLabor, true),
        yearOtherText: fmt(yearOther),
        avgLaborText: fmt(count ? Math.round(yearLabor / count) : 0),
        loading: false,
        loadError: false,
      })
    } catch (e) {
      if (seq !== this._seq) return
      // 加载失败单独成态（带重试），避免把网络抖动误展示成"暂无数据"
      this.setData({ loading: false, loadError: true })
    } finally {
      if (done) done()
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },
})
