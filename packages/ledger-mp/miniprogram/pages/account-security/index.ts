import { getUser } from '../../utils/store'

Page({
  data: {
    accountCode: '—',
  },

  onShow() {
    const u = getUser()
    this.setData({ accountCode: (u && u.accountCode) || '—' })
  },
  toDelete() {
    wx.navigateTo({ url: '/pages/delete-account/index' })
  },
})
