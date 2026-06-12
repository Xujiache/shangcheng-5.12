import { customerApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'

Page({
  data: { list: [] as any[], loading: true, loadError: false },

  _seq: 0,

  onShow() {
    this.load()
  },
  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },

  async load(done?: () => void) {
    // 序号守卫：onShow/下拉可能并发触发，旧响应不得覆盖新数据
    const seq = (this._seq = (this._seq || 0) + 1)
    try {
      const arr: any = await customerApi.list()
      if (seq !== this._seq) return
      const hide = getHideAmount()
      const list = (arr || []).map((c: any) => ({
        // 订单衍生客户 id 为 null（服务端按 name 归并，name 必唯一），键退回 name 兜底
        _k: c.id || 'n:' + c.name,
        id: c.id,
        name: c.name,
        initial: (c.name || '·').slice(-1),
        profitText: hide ? maskMoney(c.profit) : yuan(c.profit),
        sub:
          c.count > 0 ? `${c.count} 单 · 利润率 ${Math.round((c.margin || 0) * 100)}%` : '暂无订单',
      }))
      this.setData({ list, loading: false, loadError: false })
    } catch (e) {
      if (seq !== this._seq) return
      // 加载失败单独成态（带重试），避免把网络抖动误展示成"暂无客户"
      this.setData({ loading: false, loadError: true })
    } finally {
      if (done) done()
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
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
