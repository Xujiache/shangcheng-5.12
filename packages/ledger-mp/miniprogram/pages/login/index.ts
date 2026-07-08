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
}

Page({
  data: {
    loading: false,
    // 默认进入"校验中"占位：有 token 时静默登录期间不露出表单，避免每次启动闪登录页
    checking: true,
    // 隐私合规：默认不勾选，用户须自行阅读后勾选同意才能登录（不得默认同意）
    agreed: false,
    logoUrl: getLogo(),
  } as LoginData,

  onLoad() {
    authApi
      .config()
      .then((c: any) => {
        this.setData({ logoUrl: (c && c.logoUrl) || '' })
        setLogo((c && c.logoUrl) || '')
      })
      .catch(() => {})
    if (!getToken()) {
      // 未登录：直接显示登录表单
      this.setData({ checking: false })
      return
    }
    // 已登录：显示"正在进入…"占位，静默拉 me 判断会员并路由；失败才回退到表单
    meApi
      .me()
      .then((u: any) => {
        setUser(u)
        this.routeAfterLogin(u.membership)
      })
      .catch(() => {
        this.setData({ checking: false })
      })
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },
  promptAgreement() {
    wx.showToast({ title: '请先阅读并勾选同意《用户协议》与《隐私政策》', icon: 'none' })
  },
  onDoc(e: any) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/doc/index?key=' + key })
  },

  async onPhoneLogin(e: any) {
    if (this.data.loading) return
    if (!this.data.agreed) {
      this.promptAgreement()
      return
    }
    const detail = e.detail || {}
    if (detail.errMsg !== 'getPhoneNumber:ok' || !detail.code) {
      wx.showToast({ title: '需要授权手机号后才能登录', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const res = await authApi.wechatPhoneLogin(detail.code)
      setAuth(res.token, res.user)
      // 成功后不重置 loading：跳转前防重复点击
      this.routeAfterLogin(res.membership || (res.user && res.user.membership))
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  routeAfterLogin(m: MembershipStatus | null) {
    // 管理员重置过密码：先强制设置新密码，再走会员路由
    const u = getUser()
    if (u && u.mustReset) {
      wx.reLaunch({ url: '/pages/password/index?reset=1' })
      return
    }
    // 静默路径未提交过凭证（setAuth 未走），开了生物锁则先过锁屏，解锁后回首页。
    // 新登录在 setAuth 里已置 bioVerified，不会进此分支。
    if (getBioLock() && !getBioVerified()) {
      // 只读栈顶，不可 pop()：修改 getCurrentPages() 返回的数组会破坏路由状态
      const pages = getCurrentPages()
      const cur = pages[pages.length - 1]
      if (!cur || cur.route !== 'pages/lock/index') {
        wx.reLaunch({ url: '/pages/lock/index' })
      }
      return
    }
    if (!m || !m.active) {
      wx.reLaunch({ url: '/pages/membership/index?gate=1' })
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
