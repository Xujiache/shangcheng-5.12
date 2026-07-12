import { authApi, meApi } from '../../api/index'
import {
  setAuth,
  setUser,
  getUser,
  getToken,
  getBioLock,
  getBioVerified,
  getLogo,
  setLogo,
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

Page({
  data: {
    loading: false,
    // 有 token 时静默校验，避免每次启动闪登录页。
    checking: true,
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
    wx.navigateTo({ url: '/pages/doc/index?key=' + e.currentTarget.dataset.key })
  },
  onPrivacyAuthorized() {
    this.setData({ agreed: true })
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

  async onPhoneLogin(e: any) {
    if (this.data.loading || !this.ensureAgreed()) return
    const detail = e.detail || {}
    if (detail.errMsg !== 'getPhoneNumber:ok' || !detail.code) {
      wx.showToast({ title: '已取消手机号授权，也可以使用微信登录', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    let loginCode = ''
    try {
      loginCode = await getWechatLoginCode()
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '微信登录初始化失败，请重试', icon: 'none' })
      return
    }
    try {
      const res = await authApi.wechatPhoneLogin(detail.code, loginCode)
      setAuth(res.token, res.user)
      this.routeAfterLogin(res.membership || (res.user && res.user.membership))
    } catch (e) {
      this.setData({ loading: false })
    }
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
      const res = await authApi.wechatLogin(code)
      setAuth(res.token, res.user)
      this.routeAfterLogin(res.membership || (res.user && res.user.membership))
    } catch (e: any) {
      this.setData({ loading: false })
      wx.showModal({
        title: '微信登录失败',
        content: (e && e.message) || '请先使用上方“微信手机号快捷登录”，完成后即可直接微信登录。',
        showCancel: false,
        confirmText: '我知道了',
      })
    }
  },

  routeAfterLogin(m: MembershipStatus | null) {
    // 会员闸门优先：后台已建号但尚未授权会员的账号，登录后先进入会员开通页。
    if (!m || !m.active) {
      wx.reLaunch({ url: '/pages/membership/index?gate=1' })
      return
    }
    const user = getUser()
    if (user && user.mustReset) {
      wx.reLaunch({ url: '/pages/password/index?reset=1' })
      return
    }
    if (getBioLock() && !getBioVerified()) {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (!current || current.route !== 'pages/lock/index') {
        wx.reLaunch({ url: '/pages/lock/index' })
      }
      return
    }
    if (m.expiringSoon) {
      wx.showToast({ title: `会员剩 ${m.daysLeft} 天即将到期`, icon: 'none' })
      setTimeout(() => wx.switchTab({ url: '/pages/home/index' }), 800)
    } else {
      wx.switchTab({ url: '/pages/home/index' })
    }
  },
})
