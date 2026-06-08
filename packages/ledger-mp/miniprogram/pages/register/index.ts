import { authApi } from '../../api/index'
import { setAuth } from '../../utils/store'

Page({
  data: {
    phone: '',
    pwd: '',
    pwd2: '',
    inviteCode: '',
    showPwd: false,
    loading: false,
    canReg: false,
  },

  onLoad(opt: any) {
    // 通过分享卡片冷启动进来时带邀请码
    if (opt && opt.invite) {
      this.setData({
        inviteCode: String(opt.invite).toUpperCase().replace(/\s/g, '').slice(0, 20),
      })
    }
  },

  refresh() {
    const d = this.data
    // 两次密码一致才允许提交，避免高亮按钮点击后才报错的误导
    this.setData({
      canReg: d.phone.length === 11 && d.pwd.length >= 6 && d.pwd2.length >= 6 && d.pwd === d.pwd2,
    })
  },
  onPhone(e: any) {
    this.setData({ phone: String(e.detail.value).replace(/\D/g, '').slice(0, 11) }, () =>
      this.refresh(),
    )
  },
  onPwd(e: any) {
    this.setData({ pwd: String(e.detail.value).slice(0, 20) }, () => this.refresh())
  },
  onPwd2(e: any) {
    this.setData({ pwd2: String(e.detail.value).slice(0, 20) }, () => this.refresh())
  },
  onInvite(e: any) {
    this.setData({
      inviteCode: String(e.detail.value).toUpperCase().replace(/\s/g, '').slice(0, 20),
    })
  },
  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd })
  },

  async doRegister() {
    if (!this.data.canReg || this.data.loading) return
    if (this.data.pwd !== this.data.pwd2) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const res: any = await authApi.register({
        phone: this.data.phone,
        password: this.data.pwd,
        inviteCode: this.data.inviteCode || undefined,
      })
      setAuth(res.token, res.user)
      wx.showToast({ title: '注册成功', icon: 'success' })
      const m = res.membership || (res.user && res.user.membership)
      setTimeout(() => {
        if (m && m.active) wx.switchTab({ url: '/pages/home/index' })
        else wx.reLaunch({ url: '/pages/membership/index?gate=1' })
      }, 600)
    } catch (e) {
      /* toast handled in request */
    } finally {
      this.setData({ loading: false })
    }
  },

  toLogin() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/login/index' })
  },
})
