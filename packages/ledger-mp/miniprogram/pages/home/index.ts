import { statsApi, notificationApi, adApi, changelogApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount, getFxMode, glassCardStyle } from '../../utils/store'
import { makeShareCover } from '../../utils/share-cover'

const COLORMAP: Record<string, string> = {
  profile: 'c1',
  glass: 'c2',
  hardware: 'c3',
  labor: 'c4',
  screen: 'c5',
  extras: 'c6',
}
// 头部大数对应的「当前周期」文案：日=今日 / 月=本月 / 年=本年（与所选单位一致）
const PERIOD_LABEL: Record<string, string> = { day: '今日', month: '本月', year: '本年' }

Page({
  _cover: '',
  data: {
    glassCard: glassCardStyle(), // 卡片玻璃通透度（随设置滑块，onShow 刷新）
    hdPad: 30, // 顶部留白 = 状态栏高度 + 10
    hdRight: 18, // 右侧留白：动态避让微信原生胶囊（onShow 计算）
    fxMax: false, // 性能模式：开启 hero 触摸流光（每帧 setData，默认关）
    tlx: 0,
    tly: 0,
    tlShow: false,
    period: 'month',
    periods: [
      { value: 'day', label: '日' },
      { value: 'month', label: '月' },
      { value: 'year', label: '年' },
    ],
    periodLabel: '本年',
    seriesTitle: '各月',
    loading: true,
    loadError: false, // 网络/加载失败：区别于"暂无数据"空态
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
    ads: [] as any[],
    clogShow: false,
    clog: null as any,
  },

  onReady() {
    this.genCover()
  },
  genCover() {
    if (this._cover) return
    makeShareCover(this, '#shareCover', {
      title: '门窗人的记账利器',
      subtitle: '记账 · 算利润 · 优化下料',
    }).then((p) => (this._cover = p))
  },
  onShow() {
    this.setData({ glassCard: glassCardStyle() }) // 按「玻璃通透度」刷新卡片
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.selectTab ? tb.selectTab(0) : tb.setData({ selected: 0 })
    const sb = getApp<IAppOption>()?.globalData?.statusBarHeight || 20
    let hdRight = 18
    try {
      // 让右上角铃铛避让到原生胶囊（··· ⊙）左侧，避免被遮挡
      const cap = wx.getMenuButtonBoundingClientRect()
      const ww = wx.getWindowInfo().windowWidth
      hdRight = Math.max(18, ww - cap.left + 8)
    } catch (e) {
      /* 旧基础库兜底用默认 18 */
    }
    this.setData({ hdPad: sb + 10, hdRight, fxMax: getFxMode() === 'max' })
    this.load()
    this.loadAds()
    this.maybeShowChangelog()
  },
  // 新版本首开弹更新日志：按当前版本定向，每版本只弹一次
  maybeShowChangelog() {
    if ((this as any)._clogChecked) return
    ;(this as any)._clogChecked = true
    let v = ''
    try {
      v = wx.getAccountInfoSync().miniProgram.version || ''
    } catch (e) {
      /* dev/无版本号则不弹 */
    }
    if (!v) return
    const key = 'ledger_clog_seen_' + v
    if (wx.getStorageSync(key)) return
    changelogApi
      .byVersion(v)
      .then((c: any) => {
        if (c && c.version) {
          this.setData({
            clog: {
              version: c.version,
              title: c.title,
              lines: String(c.content || '')
                .split('\n')
                .filter((x: string) => x.trim()),
            },
            clogShow: true,
          })
          wx.setStorageSync(key, 1)
        }
      })
      .catch(() => {})
  },
  closeChangelog() {
    this.setData({ clogShow: false })
  },
  noopClog() {},
  // 性能模式触摸流光：光晕跟随手指（仅 max；每帧 setData）
  onHeroTouchStart(e: any) {
    if (!this.data.fxMax) return
    this.createSelectorQuery()
      .select('.home__hero')
      .boundingClientRect((r: any) => {
        if (!r) return
        ;(this as any)._heroRect = r
        this.moveLight(e)
        this.setData({ tlShow: true })
      })
      .exec()
  },
  onHeroTouchMove(e: any) {
    if (this.data.fxMax) this.moveLight(e)
  },
  onHeroTouchEnd() {
    if (this.data.tlShow) this.setData({ tlShow: false })
  },
  moveLight(e: any) {
    const r = (this as any)._heroRect
    const t = e.touches && e.touches[0]
    if (!r || !t) return
    this.setData({ tlx: t.clientX - r.left, tly: t.clientY - r.top })
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },
  onPeriod(e: any) {
    this.setData({ period: e.detail.value }, () => this.load())
  },

  async load(done?: () => void) {
    // 序号守卫：日/月/年 可被快速连点，慢的旧响应不允许覆盖新数据
    const seq = ((this as any)._seq = (((this as any)._seq as number) || 0) + 1)
    const period = this.data.period
    const hide = getHideAmount()
    const money = (v: number) => (hide ? maskMoney(v) : yuan(v))
    try {
      // series → KPI 汇总 + 单量/利润图表；overview(本月) → 成本环图 + 目标 + 高利润
      const [sr, ov]: any[] = await Promise.all([
        statsApi.series(period),
        statsApi.overview('month'),
      ])
      if (seq !== (this as any)._seq) return
      const buckets = sr.buckets || []
      const profitBars = buckets.map((b: any) => ({ label: b.label, value: b.profit }))
      const countBars = buckets.map((b: any) => ({ label: b.label, value: b.count }))
      // 头部大数取「当前周期」那一个桶（今日/本月/本年），而非所有桶求和——
      // 否则选日显示整月、选月显示整年、选年显示近5年，与所选单位不符。
      // 趋势柱仍展示完整序列（本月每日 / 本年各月 / 近5年）作为背景对比。
      const now = new Date()
      const curIdx =
        period === 'day'
          ? now.getDate() - 1 // 当月第 N 天
          : period === 'year'
            ? buckets.length - 1 // 近5年的最后一个 = 今年
            : now.getMonth() // 今年第 N 月（0 起）
      const cur: any = buckets[curIdx] || { profit: 0, revenue: 0, cost: 0, count: 0 }
      const curAvg = cur.count ? Math.round(cur.profit / cur.count) : 0

      const slices = ov.costSlices || []
      const totalCost = slices.reduce((s: number, x: any) => s + x.value, 0) || 1
      const donut = slices.map((s: any) => ({ value: s.value, color: COLORMAP[s.key] || 'c6' }))
      const legend = slices.map((s: any) => ({
        name: s.name,
        color: COLORMAP[s.key] || 'c6',
        value: money(s.value),
        pct: Math.round((s.value / totalCost) * 100),
      }))
      const tops = (ov.topOrders || []).map((o: any) => ({
        id: o.id,
        customer: o.customer,
        date: o.date,
        profit: money(o.profit),
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
        profitBare: hide ? maskMoney(cur.profit || 0) : yuan(cur.profit || 0, true),
        revenueText: money(cur.revenue || 0),
        costText: money(cur.cost || 0),
        donutCostText: money(ov.cost || 0),
        count: cur.count || 0,
        avgText: money(curAvg),
        monthProfitText: money(ov.monthProfit || 0),
        goalTargetText: ov.goal && ov.goal.monthly ? money(ov.goal.monthly) : '未设',
        goalPct: Math.min(100, Math.round((gp || 0) * 100)),
        loading: false,
        loadError: false,
      })
      ;(this as any)._loaded = true
    } catch (e) {
      if (seq !== (this as any)._seq) return
      // 屏上已有数据时刷新失败只 toast（request 层已弹），不把整屏换成重试卡；
      // 首次加载失败才进错误态（带重试），不渲染"暂无…"空态，避免误导成没有数据
      this.setData({ loading: false, loadError: !(this as any)._loaded })
    } finally {
      if (done) done()
    }
    this.loadUnread()
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  async loadUnread() {
    try {
      const r: any = await notificationApi.unreadCount()
      this.setData({ unread: (r?.count || 0) > 0 })
    } catch (e) {
      /* 静默：红点不是关键路径 */
    }
  },

  async loadAds() {
    try {
      const ads: any = await adApi.list()
      this.setData({ ads: Array.isArray(ads) ? ads : [] })
    } catch (e) {
      /* 静默：广告非关键路径 */
    }
  },
  onAd(e: any) {
    const link = e.currentTarget.dataset.link
    // 仅支持站内页面跳转（外链需 webview 业务域名，暂不处理）
    if (!link || typeof link !== 'string' || link.indexOf('/pages/') !== 0) return
    // tabBar 页只能用 switchTab；navigateTo 跳 tabBar 会静默失败
    const TABS = [
      '/pages/home/index',
      '/pages/orders/index',
      '/pages/reports/index',
      '/pages/profile/index',
    ]
    const path = link.split('?')[0]
    if (TABS.indexOf(path) >= 0) {
      wx.switchTab({ url: path })
    } else {
      wx.navigateTo({
        url: link,
        fail: () => wx.showToast({ title: '无法打开该页面', icon: 'none' }),
      })
    }
  },
  toCut() {
    wx.navigateTo({ url: '/pages/cut/index' })
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
  // 开启「转发给朋友」/「分享到朋友圈」
  onShareAppMessage() {
    return {
      title: '我在用「门窗利账」记账算利润，门窗人的记账利器',
      path: '/pages/register/index',
      imageUrl: this._cover || undefined,
    }
  },
  onShareTimeline() {
    return { title: '门窗利账 · 门窗人的记账利器', imageUrl: this._cover || undefined }
  },
})
