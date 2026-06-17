import { orderApi } from '../../api/index'
import { maskMoney, yuan } from '../../utils/format'
import { getHideAmount, glassCardStyle } from '../../utils/store'

const PAGE_SIZE = 50

const SEG_DEF: Array<[string, string]> = [
  ['profile', 'c1'],
  ['glass', 'c2'],
  ['hardware', 'c3'],
  ['labor', 'c4'],
  ['screen', 'c5'],
]

Page({
  data: {
    glassCard: glassCardStyle(), // 卡片玻璃通透度（随设置滑块，onShow 刷新）
    hdPad: 30, // 顶部留白 = 状态栏高度 + 10
    keyword: '',
    sort: 'date',
    sorts: [
      { value: 'date', label: '最新' },
      { value: 'profit', label: '利润' },
    ],
    list: [] as any[],
    summary: { count: 0, profit: '¥0', avg: '¥0' },
    loading: true,
    loadError: false, // 网络/加载失败：区别于"暂无订单"空态
    hasMore: false,
    loadingMore: false,
  },

  _t: 0 as any,
  _seq: 0, // 请求序号：搜索防抖后响应可能乱序，丢弃过期响应
  _page: 1,

  onShow() {
    this.setData({ glassCard: glassCardStyle() }) // 按「玻璃通透度」刷新卡片
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.setData({ selected: 1 })
    this.setData({ hdPad: (getApp<IAppOption>()?.globalData?.statusBarHeight || 20) + 10 })
    this.load()
  },
  onHide() {
    clearTimeout(this._t)
  },
  onUnload() {
    clearTimeout(this._t)
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },
  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    clearTimeout(this._t)
    this._t = setTimeout(() => this.load(), 300)
  },
  onSearchConfirm() {
    // 键盘「搜索」键：跳过防抖立即查
    clearTimeout(this._t)
    this.load()
  },
  clearSearch() {
    clearTimeout(this._t)
    this.setData({ keyword: '' }, () => this.load())
  },
  onSort(e: any) {
    this.setData({ sort: e.detail.value }, () => this.load())
  },

  mapList(raw: any[], hide: boolean) {
    return raw.map((o: any) => {
      const cost = o.cost || 1
      const parts: Array<[string, string, number]> = SEG_DEF.map(
        ([k, c]) => [k, c, o.costs ? o.costs[k] || 0 : 0] as [string, string, number],
      )
      // 分母 cost 含自定义成本，「其他」段需并入 customCostsTotal，否则条形图填不满
      parts.push(['extras', 'c6', (o.extrasTotal || 0) + (o.customCostsTotal || 0)])
      const segs = parts
        .filter((p) => p[2] > 0)
        .map((p) => ({ k: p[0], color: p[1], w: Math.round((p[2] / cost) * 100) }))
      return {
        id: o.id,
        customer: o.customer,
        initial:
          String(o.customer || '客')
            .trim()
            .charAt(0) || '客',
        date: o.date,
        profitText: hide ? maskMoney(o.profit) : yuan(o.profit),
        totalText: hide ? maskMoney(o.total) : yuan(o.total),
        marginPct: Math.round((o.margin || 0) * 100),
        segs,
      }
    })
  },

  async load(done?: () => void) {
    this._seq = (this._seq || 0) + 1
    const seq = this._seq
    this._page = 1
    // 屏上无内容时恢复加载态：避免上次失败后 onShow 重查期间误显「暂无订单」
    this.setData({ loadError: false, loading: !this.data.list.length })
    try {
      const res: any = await orderApi.list({
        customer: this.data.keyword,
        sort: this.data.sort,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      if (seq !== this._seq) return // 已有更新的请求在途，丢弃过期响应
      const hide = getHideAmount()
      const list = this.mapList(res.list || [], hide)
      const s = res.summary || {}
      const count = s.count || 0
      this.setData({
        list,
        summary: {
          count,
          profit: hide ? maskMoney(s.profit || 0) : yuan(s.profit || 0),
          avg: hide ? maskMoney(s.avgProfit || 0) : yuan(s.avgProfit || 0),
        },
        hasMore: list.length < count,
        loading: false,
      })
    } catch (e) {
      // 已有列表在屏时不切错误卡（request 层已 toast），也避免 loadError 悄悄卡死加载更多
      if (seq === this._seq) this.setData({ loading: false, loadError: !this.data.list.length })
    } finally {
      if (done) done()
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  async onReachBottom() {
    if (this.data.loading || this.data.loadingMore || this.data.loadError || !this.data.hasMore)
      return
    const seq = this._seq
    this.setData({ loadingMore: true })
    try {
      const res: any = await orderApi.list({
        customer: this.data.keyword,
        sort: this.data.sort,
        page: this._page + 1,
        pageSize: PAGE_SIZE,
      })
      if (seq !== this._seq) return // 期间发生过搜索/刷新，丢弃过期分页
      this._page += 1
      const fetched: any[] = res.list || []
      const seen = new Set(this.data.list.map((o: any) => o.id))
      const more = this.mapList(fetched, getHideAmount()).filter((o: any) => !seen.has(o.id))
      const list = this.data.list.concat(more)
      const s = res.summary || {}
      const count = s.count || this.data.summary.count
      this.setData({ list, hasMore: fetched.length > 0 && list.length < count })
    } catch (e) {
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      // 必须无条件复位：若被新 load() 抢先（seq 过期），守卫复位会让 loadingMore
      // 永久卡 true，onReachBottom 入口被堵死 → 加载更多本会话报废
      this.setData({ loadingMore: false })
    }
  },

  toDetail(e: any) {
    wx.navigateTo({ url: '/pages/order-detail/index?id=' + e.currentTarget.dataset.id })
  },
  toCustomers() {
    wx.navigateTo({ url: '/pages/customers/index' })
  },
})
