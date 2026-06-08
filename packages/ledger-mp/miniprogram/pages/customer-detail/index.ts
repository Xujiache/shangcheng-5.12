import { customerApi } from '../../api/index'
import { yuan } from '../../utils/format'

Page({
  data: {
    id: '',
    c: null as any,
    initial: '·',
    orders: [] as any[],
    profitText: '¥0',
    marginPct: 0,
  },

  onLoad(opt: any) {
    this.setData({ id: opt.id || '' })
  },
  onShow() {
    if (this.data.id) this.load()
  },

  async load() {
    try {
      const c: any = await customerApi.get(this.data.id)
      const orders = (c.orders || []).map((o: any) => ({
        id: o.id,
        date: o.date,
        totalText: yuan(o.total),
        profitText: yuan(o.profit),
      }))
      this.setData({
        c,
        initial: (c.name || '·').slice(-1),
        orders,
        profitText: yuan(c.profit),
        marginPct: Math.round((c.margin || 0) * 100),
      })
    } catch (e) {
      /* handled */
    }
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
