import { MotionPage, navigation } from '../../utils/page-transition'
import { authApi, meApi } from '../../api/index'
import {
  setAuth,
  setUser,
  getToken,
  getBioLock,
  getBioVerified,
  getLogo,
  setLogo,
  getPendingInviteCode,
  clearPendingInviteCode,
} from '../../utils/store'

interface LoginData {
  loading: boolean
  checking: boolean
  agreed: boolean
  logoUrl: string
  privacyContractName: string
}

function getWechatLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => (res.code ? resolve(res.code) : reject(new Error('missing code'))),
      fail: reject,
    })
  })
}

MotionPage({
  data: {
    loading: false,
    // 仅已有 token 时显示静默校验；游客主动进入登录页时直接展示登录选项，避免闪屏。
    checking: !!getToken(),
    // 隐私合规：必须由用户主动勾选，不得默认同意。
    agreed: false,
    logoUrl: getLogo(),
    privacyContractName: '《小程序用户隐私保护指引》',
  } as LoginData,

  onLoad() {
    this.loadPrivacySetting()
    authApi
      .config()
      .then((config: any) => {
        const logoUrl = (config && config.logoUrl) || ''
        this.setData({ logoUrl })
        setLogo(logoUrl)
      })
      .catch(() => {})
    if (!getToken()) {
      this.setData({ checking: false })
      return
    }
    meApi
      .me()
      .then((user: any) => {
        setUser(user)
        this.routeAfterLogin(user.membership)
      })
      .catch(() => this.setData({ checking: false }))
  },

  loadPrivacySetting() {
    const getPrivacySetting = (wx as any).getPrivacySetting
    if (typeof getPrivacySetting !== 'function') return
    getPrivacySetting({
      success: (res: any) => {
        if (res && res.privacyContractName) {
          this.setData({ privacyContractName: res.privacyContractName })
        }
      },
    })
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },
  ensureAgreed(): boolean {
    if (this.data.agreed) return true
    wx.showToast({ title: '请先阅读并勾选同意《用户协议》与《隐私政策》', icon: 'none' })
    return false
  },
  onDoc(e: any) {
    navigation.navigateTo({ url: '/pages/doc/index?key=' + e.currentTarget.dataset.key })
  },
  continueAsGuest() {
    navigation.switchTab({ url: '/pages/home/index' })
  },
  openPrivacyContract() {
    const openPrivacyContract = (wx as any).openPrivacyContract
    if (typeof openPrivacyContract !== 'function') {
      wx.showToast({ title: '当前微信版本暂不支持查看，请升级微信', icon: 'none' })
      return
    }
    openPrivacyContract({
      fail: () => wx.showToast({ title: '隐私保护指引暂未配置，请联系管理员', icon: 'none' }),
    })
  },

  async onWechatLogin() {
    if (this.data.loading || !this.ensureAgreed()) return
    this.setData({ loading: true })
    let code = ''
    try {
      code = await getWechatLoginCode()
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '微信登录初始化失败，请重试', icon: 'none' })
      return
    }
    try {
      const res = await authApi.wechatLogin(code, getPendingInviteCode() || undefined)
      setAuth(res.token, res.user)
      clearPendingInviteCode()
      this.routeAfterLogin(res.membership || (res.user && res.user.membership), !!res.created)
    } catch (e: any) {
      this.setData({ loading: false })
      wx.showModal({
        title: '微信登录失败',
        content: (e && e.message) || '微信服务暂不可用，请稍后重试。',
        showCancel: false,
        confirmText: '我知道了',
      })
    }
  },

  routeAfterLogin(m: MembershipStatus | null, _created = false) {
    // 新微信账号由服务端/数据库自动发放 30 天会员。
    // 未开通或已到期账号也直接进入首页，不再强制跳转会员开通页。
    if (getBioLock() && !getBioVerified()) {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (!current || current.route !== 'pages/lock/index') {
        navigation.reLaunch({ url: '/pages/lock/index' })
      }
      return
    }
    if (m && m.active && m.expiringSoon) {
      wx.showToast({ title: `会员剩 ${m.daysLeft} 天即将到期`, icon: 'none' })
      setTimeout(() => navigation.switchTab({ url: '/pages/home/index' }), 800)
    } else {
      navigation.switchTab({ url: '/pages/home/index' })
    }
  },
})
