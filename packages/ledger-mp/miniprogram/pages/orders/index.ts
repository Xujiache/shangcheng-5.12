import { orderApi } from '../../api/index'
import { yuan } from '../../utils/format'

const SEG_DEF: Array<[string, string]> = [
  ['profile', 'c1'],
  ['glass', 'c2'],
  ['hardware', 'c3'],
  ['labor', 'c4'],
  ['screen', 'c5'],
]

Page({
  data: {
    keyword: '',
    sort: 'date',
    sorts: [
      { value: 'date', label: '最新' },
      { value: 'profit', label: '利润' },
    ],
    list: [] as any[],
    summary: { count: 0, profit: '¥0', avg: '¥0' },
    loading: true,
  },

  _t: 0 as any,

  onShow() {
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.setData({ selected: 1 })
    this.load()
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },
  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    clearTimeout(this._t)
    this._t = setTimeout(() => this.load(), 300)
  },
  onSort(e: any) {
    this.setData({ sort: e.detail.value }, () => this.load())
  },

  async load(done?: () => void) {
    try {
      const res: any = await orderApi.list({
        customer: this.data.keyword,
        sort: this.data.sort,
        pageSize: 200,
      })
      const list = (res.list || []).map((o: any) => {
        const cost = o.cost || 1
        const parts: Array<[string, string, number]> = SEG_DEF.map(
          ([k, c]) => [k, c, o.costs ? o.costs[k] || 0 : 0] as [string, string, number],
        )
        parts.push(['extras', 'c6', o.extrasTotal || 0])
        const segs = parts
          .filter((p) => p[2] > 0)
          .map((p) => ({ k: p[0], color: p[1], w: Math.round((p[2] / cost) * 100) }))
        return {
          id: o.id,
          customer: o.customer,
          date: o.date,
          profitText: yuan(o.profit),
          totalText: yuan(o.total),
          marginPct: Math.round((o.margin || 0) * 100),
          segs,
        }
      })
      const s = res.summary || {}
      this.setData({
        list,
        summary: { count: s.count || 0, profit: yuan(s.profit || 0), avg: yuan(s.avgProfit || 0) },
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
    } finally {
      if (done) done()
    }
  },

  toDetail(e: any) {
    wx.navigateTo({ url: '/pages/order-detail/index?id=' + e.currentTarget.dataset.id })
  },
  toCustomers() {
    wx.navigateTo({ url: '/pages/customers/index' })
  },
})
