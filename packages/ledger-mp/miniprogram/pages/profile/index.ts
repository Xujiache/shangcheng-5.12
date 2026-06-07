import { meApi } from '../../api/index'
import { fmtDate } from '../../utils/format'
import { logout } from '../../utils/store'

Page({
  data: {
    nickname: '门窗店主',
    phoneMask: '',
    avatarChar: '门',
    memberActive: false,
    memberText: '未开通会员',
    memberSub: '点击开通，解锁全部功能',
    rows: [
      { icon: 'shield', label: '账户安全', page: '/pages/account-security/index' },
      { icon: 'bell', label: '通知提醒', page: '/pages/notifications/index' },
      { icon: 'lock', label: '隐私设置', page: '/pages/privacy/index' },
      { icon: 'info', label: '关于门窗利账', page: '/pages/about/index' },
    ],
  },

  onShow() {
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.setData({ selected: 3 })
    this.load()
  },

  async load() {
    try {
      const u: any = await meApi.me()
      const phone = u.phone || ''
      const m = u.membership || {}
      this.setData({
        nickname: u.nickname || '门窗店主',
        avatarChar: (u.nickname || '门').slice(-1),
        phoneMask: phone.length === 11 ? phone.slice(0, 3) + ' **** ' + phone.slice(7) : phone,
        memberActive: !!m.active,
        memberText: m.active ? '门窗利账 会员' : m.expired ? '会员已过期' : '未开通会员',
        memberSub: m.active
          ? `有效期至 ${fmtDate(m.expiresAt)} · 剩 ${m.daysLeft} 天`
          : m.expired
            ? '续费后恢复使用'
            : '点击开通，解锁全部功能',
      })
    } catch (e) {
      /* handled */
    }
  },

  toEdit() {
    wx.navigateTo({ url: '/pages/edit-profile/index' })
  },
  toMembership() {
    wx.navigateTo({ url: '/pages/membership/index' })
  },
  toRow(e: any) {
    wx.navigateTo({ url: e.currentTarget.dataset.page })
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      success: (r) => {
        if (r.confirm) logout()
      },
    })
  },
})
