import { getUser } from '../../utils/store'

function mask(phone: string): string {
  if (!phone || phone.length < 7) return phone || '—'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

Page({
  data: {
    maskedPhone: '—',
  },

  onShow() {
    const u = getUser()
    this.setData({ maskedPhone: mask(u ? u.phone : '') })
  },

  toPhone() {
    wx.navigateTo({ url: '/pages/phone-bind/index' })
  },
  toWechat() {
    wx.navigateTo({ url: '/pages/wechat-bind/index' })
  },
  toPassword() {
    wx.navigateTo({ url: '/pages/password/index' })
  },
  toDelete() {
    wx.navigateTo({ url: '/pages/delete-account/index' })
  },
})
