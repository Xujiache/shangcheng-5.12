import { getUser } from '../../utils/store'

function mask(phone: string): string {
  if (!phone || phone.length < 7) return phone || '—'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

Page({
  data: {
    maskedPhone: '—',
  },

  onLoad() {
    const u = getUser()
    this.setData({ maskedPhone: mask(u ? u.phone : '') })
  },

  onContact() {
    wx.showModal({
      title: '联系管理员',
      content: '请通过门店管理员或客服核实身份后办理手机号更换，以保障您的账号安全。',
      showCancel: false,
      confirmText: '我知道了',
    })
  },
})
