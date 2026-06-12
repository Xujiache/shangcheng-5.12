import { authApi, meApi } from '../../api/index'
import { setAuth, setUser, getUser, getToken, getBioLock, getBioVerified } from '../../utils/store'

interface LoginData {
  mode: string
  modes: Array<{ value: string; label: string }>
  phone: string
  pwd: string
  code: string
  showPwd: boolean
  sent: number
  loading: boolean
  canLogin: boolean
  checking: boolean
  allowRegister: boolean
}

Page({
  data: {
    mode: 'password',
    modes: [
      { value: 'password', label: '密码登录' },
      { value: 'code', label: '验证码登录' },
    ],
    phone: '',
    pwd: '',
    code: '',
    showPwd: false,
    sent: 0,
    loading: false,
    canLogin: false,
    // 默认进入"校验中"占位：有 token 时静默登录期间不露出表单，避免每次启动闪登录页
    checking: true,
    allowRegister: true,
  } as LoginData,

  _timer: 0 as any,

  onLoad() {
    // 管理端关闭自助注册时隐藏「立即注册」入口（接口失败按开放兜底）
    authApi
      .config()
      .then((c: any) => this.setData({ allowRegister: !c || c.allowSelfRegister !== false }))
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

  refreshCanLogin() {
    const d = this.data
    const phoneOk = d.phone.length === 11
    const canLogin =
      d.mode === 'password' ? phoneOk && d.pwd.length >= 6 : phoneOk && d.code.length === 6
    this.setData({ canLogin })
  },
  onModeChange(e: any) {
    this.setData({ mode: e.detail.value }, () => this.refreshCanLogin())
  },
  onPhone(e: any) {
    this.setData({ phone: String(e.detail.value).replace(/[^\d]/g, '').slice(0, 11) }, () =>
      this.refreshCanLogin(),
    )
  },
  onPwd(e: any) {
    this.setData({ pwd: String(e.detail.value).slice(0, 20) }, () => this.refreshCanLogin())
  },
  onCode(e: any) {
    this.setData({ code: String(e.detail.value).replace(/\D/g, '').slice(0, 6) }, () =>
      this.refreshCanLogin(),
    )
  },
  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd })
  },
  onForgot() {
    wx.showToast({ title: '请用验证码登录后重置，或联系管理员', icon: 'none' })
  },
  onWechat() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.login({
      success: (r) => {
        if (!r.code) {
          this.setData({ loading: false })
          wx.showToast({ title: '微信授权失败', icon: 'none' })
          return
        }
        authApi
          .wechatLogin(r.code)
          .then((res: any) => {
            setAuth(res.token, res.user)
            // 成功后不重置 loading：跳转前防重复点击
            this.routeAfterLogin(res.membership || (res.user && res.user.membership))
          })
          .catch((e: any) => {
            this.setData({ loading: false })
            wx.showModal({
              title: '微信未绑定',
              content:
                (e && e.message) ||
                '请先用手机号登录，在「我的 → 账户安全」绑定微信后再用微信登录。',
              showCancel: false,
              confirmText: '我知道了',
            })
          })
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '微信授权失败', icon: 'none' })
      },
    })
  },
  onDoc(e: any) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/doc/index?key=' + key })
  },
  toRegister() {
    wx.navigateTo({ url: '/pages/register/index' })
  },

  async getCode() {
    if (this.data.phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (this.data.sent > 0) return
    try {
      await authApi.smsCode(this.data.phone)
      wx.showToast({ title: '验证码已发送', icon: 'none' })
      this.startCountdown()
    } catch (e) {
      /* toast handled in request */
    }
  },
  startCountdown() {
    this.setData({ sent: 60 })
    this._timer = setInterval(() => {
      const s = this.data.sent - 1
      if (s <= 0) {
        clearInterval(this._timer)
        this.setData({ sent: 0 })
      } else {
        this.setData({ sent: s })
      }
    }, 1000)
  },

  async doLogin() {
    if (!this.data.canLogin || this.data.loading) return
    this.setData({ loading: true })
    try {
      const res =
        this.data.mode === 'password'
          ? await authApi.login(this.data.phone, this.data.pwd)
          : await authApi.smsLogin(this.data.phone, this.data.code)
      setAuth(res.token, res.user)
      // 成功后不重置 loading：跳转前防重复点击
      this.routeAfterLogin(res.membership || (res.user && res.user.membership))
    } catch (e) {
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
      const cur = getCurrentPages().pop()
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
  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },
})
