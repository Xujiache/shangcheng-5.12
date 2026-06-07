import { authApi, meApi } from '../../api/index'
import { setAuth, setUser, getToken } from '../../utils/store'

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
  } as LoginData,

  _timer: 0 as any,

  onLoad() {
    // 已登录则尝试静默进入：拉 me 判断会员状态并路由
    if (getToken()) {
      meApi
        .me()
        .then((u: any) => {
          setUser(u)
          this.routeAfterLogin(u.membership)
        })
        .catch(() => {
          /* token 失效 → 停在登录页（request 层已清 token） */
        })
    }
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
    wx.showToast({ title: '请使用手机号 + 密码登录', icon: 'none' })
  },
  onDoc(e: any) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/doc/index?key=' + key })
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
      this.routeAfterLogin(res.membership || (res.user && res.user.membership))
    } catch (e) {
      /* toast handled */
    } finally {
      this.setData({ loading: false })
    }
  },
  routeAfterLogin(m: MembershipStatus | null) {
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
