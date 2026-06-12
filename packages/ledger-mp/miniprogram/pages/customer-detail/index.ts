import { customerApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'

Page({
  data: {
    id: '',
    c: null as any,
    loadError: false,
    initial: '·',
    orders: [] as any[],
    profitText: '¥0',
    marginPct: 0,
  },

  _seq: 0,

  onLoad(opt: any) {
    this.setData({ id: opt.id || '' })
  },
  onShow() {
    if (this.data.id) this.load()
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },

  async load(done?: () => void) {
    // 序号守卫：onShow/下拉可能并发触发，旧响应不得覆盖新数据
    const seq = (this._seq = (this._seq || 0) + 1)
    try {
      const c: any = await customerApi.get(this.data.id)
      if (seq !== this._seq) return
      const hide = getHideAmount()
      const orders = (c.orders || []).map((o: any) => ({
        id: o.id,
        date: o.date,
        totalText: hide ? maskMoney(o.total) : yuan(o.total),
        profitText: hide ? maskMoney(o.profit) : yuan(o.profit),
      }))
      this.setData({
        c,
        loadError: false,
        initial: (c.name || '·').slice(-1),
        orders,
        profitText: hide ? maskMoney(c.profit) : yuan(c.profit),
        marginPct: Math.round((c.margin || 0) * 100),
      })
    } catch (e) {
      if (seq !== this._seq) return
      // 加载失败单独成态（带重试），避免 c 为空时整页空白
      this.setData({ loadError: true })
    } finally {
      if (done) done()
    }
  },
  retry() {
    this.setData({ loadError: false }, () => this.load())
  },

  copyPhone() {
    const phone = this.data.c && this.data.c.phone
    if (!phone) return
    wx.setClipboardData({
      data: phone,
      success: () => wx.showToast({ title: '号码已复制', icon: 'none' }),
    })
  },
  toEdit() {
    wx.navigateTo({ url: '/pages/customer-edit/index?id=' + this.data.id })
  },
  reorder() {
    const name = this.data.c ? this.data.c.name : ''
    wx.navigateTo({ url: '/pages/order-edit/index?prefillCustomer=' + encodeURIComponent(name) })
  },
  toOrder(e: any) {
    wx.navigateTo({ url: '/pages/order-detail/index?id=' + e.currentTarget.dataset.id })
  },
})
