import { meApi } from '../../api/index'
import { fmtDate } from '../../utils/format'
import { getUser, setUser, logout } from '../../utils/store'

Page({
  data: {
    topSpace: 38, // 顶部留白 = 状态栏高度 + 18
    nickname: '门窗店主',
    phoneMask: '',
    avatarChar: '门',
    avatarUrl: '', // 上传的头像图片 URL；有则显示图片，否则显示字母头像
    memberActive: false,
    memberText: '未开通会员',
    memberSub: '点击开通，解锁全部功能',
    rows: [
      { icon: 'gift', label: '邀请好友得会员', page: '/pages/invite/index' },
      { icon: 'shield', label: '账户安全', page: '/pages/account-security/index' },
      { icon: 'bell', label: '通知提醒', page: '/pages/notifications/index' },
      { icon: 'lock', label: '隐私设置', page: '/pages/privacy/index' },
      { icon: 'info', label: '关于门窗利账', page: '/pages/about/index' },
    ],
  },

  onShow() {
    const tb: any = (this as any).getTabBar && (this as any).getTabBar()
    if (tb) tb.setData({ selected: 3 })
    this.setData({ topSpace: (getApp<IAppOption>()?.globalData?.statusBarHeight || 20) + 18 })
    this.load()
  },

  applyUser(u: any) {
    if (!u) return
    const phone = u.phone || ''
    const m = u.membership || {}
    this.setData({
      nickname: u.nickname || '门窗店主',
      avatarChar: (u.nickname || '门').slice(-1),
      avatarUrl: u.avatar && /^https?:\/\//.test(u.avatar) ? u.avatar : '',
      phoneMask: phone.length === 11 ? phone.slice(0, 3) + ' **** ' + phone.slice(7) : phone,
      memberActive: !!m.active,
      memberText: m.active ? '门窗利账 会员' : m.expired ? '会员已过期' : '未开通会员',
      memberSub: m.active
        ? `有效期至 ${fmtDate(m.expiresAt)} · 剩 ${m.daysLeft} 天`
        : m.expired
          ? '续费后恢复使用'
          : '点击开通，解锁全部功能',
    })
  },

  async load() {
    // 先用登录时缓存的真实用户立即渲染，避免 me() 未返回/失败时闪现"未开通"默认值
    this.applyUser(getUser())
    try {
      const u: any = await meApi.me()
      setUser(u)
      this.applyUser(u)
    } catch (e) {
      /* me() 失败则保留缓存兜底显示 */
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
