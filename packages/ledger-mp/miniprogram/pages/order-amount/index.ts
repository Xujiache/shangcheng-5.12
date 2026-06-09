import { yuan } from '../../utils/format'

Page({
  data: {
    totalStr: '',
    extraStr: '',
    revenueText: '¥0',
  },

  onLoad(opt: any) {
    const total = Math.max(0, Math.round(Number(opt && opt.total) || 0))
    const extra = Math.max(0, Math.round(Number(opt && opt.extra) || 0))
    this.setData(
      { totalStr: total ? String(total) : '', extraStr: extra ? String(extra) : '' },
      () => this.calc(),
    )
  },

  onTotal(e: any) {
    this.setData({ totalStr: e.detail.value }, () => this.calc())
  },
  onExtra(e: any) {
    this.setData({ extraStr: e.detail.value }, () => this.calc())
  },
  calc() {
    const t = Math.max(0, Math.round(Number(this.data.totalStr) || 0))
    const x = Math.max(0, Math.round(Number(this.data.extraStr) || 0))
    this.setData({ revenueText: yuan(t + x) })
  },

  confirm() {
    const total = Math.max(0, Math.round(Number(this.data.totalStr) || 0))
    const extraIncome = Math.max(0, Math.round(Number(this.data.extraStr) || 0))
    // 回写给订单编辑页（其 onShow 读取并填入），与新增客户回填同一套机制
    wx.setStorageSync('ledger_pending_amount', { total, extraIncome })
    wx.navigateBack()
  },
})
