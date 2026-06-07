import { customerApi } from '../../api/index'
import { yuan } from '../../utils/format'

Page({
  data: { list: [] as any[], loading: true },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const arr: any = await customerApi.list()
      const list = (arr || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        initial: (c.name || '·').slice(-1),
        profitText: yuan(c.profit),
        sub:
          c.count > 0 ? `${c.count} 单 · 利润率 ${Math.round((c.margin || 0) * 100)}%` : '暂无订单',
      }))
      this.setData({ list, loading: false })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  toDetail(e: any) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: '/pages/customer-detail/index?id=' + id })
    } else {
      wx.showToast({ title: '该客户由订单自动生成，暂无独立档案', icon: 'none' })
    }
  },
  toAdd() {
    wx.navigateTo({ url: '/pages/customer-edit/index' })
  },
})
