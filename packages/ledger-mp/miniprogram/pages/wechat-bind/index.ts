import { authApi, meApi } from '../../api/index'

Page({
  data: {
    bound: false,
    password: '',
    submitting: false,
    loaded: false,
  },

  onShow() {
    // 拉最新绑定状态（me 返回 wxBound）
    meApi
      .me()
      .then((u: any) => this.setData({ bound: !!u.wxBound, loaded: true }))
      .catch(() => this.setData({ loaded: true }))
  },

  onPwd(e: any) {
    this.setData({ password: String(e.detail.value).slice(0, 20) })
  },

  onBind() {
    const pwd = this.data.password.trim()
    if (pwd.length < 6) {
      wx.showToast({ title: '请输入登录密码', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    wx.login({
      success: (r) => {
        if (!r.code) {
          this.setData({ submitting: false })
          wx.showToast({ title: '微信授权失败', icon: 'none' })
          return
        }
        authApi
          .bindWechat(r.code, pwd)
          .then(() => {
            this.setData({ bound: true, password: '' })
            wx.showToast({ title: '微信已绑定', icon: 'success' })
          })
          .catch(() => {
            /* toast handled in request */
          })
          .finally(() => this.setData({ submitting: false }))
      },
      fail: () => {
        this.setData({ submitting: false })
        wx.showToast({ title: '微信授权失败', icon: 'none' })
      },
    })
  },

  onUnbind() {
    const pwd = this.data.password.trim()
    if (pwd.length < 6) {
      wx.showToast({ title: '请输入登录密码', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    wx.showModal({
      title: '解绑微信',
      content: '解绑后将无法用微信一键登录，确定继续？',
      confirmText: '解绑',
      success: (r) => {
        if (!r.confirm) return
        this.setData({ submitting: true })
        authApi
          .unbindWechat(pwd)
          .then(() => {
            this.setData({ bound: false, password: '' })
            wx.showToast({ title: '已解绑', icon: 'success' })
          })
          .catch(() => {
            /* toast handled in request */
          })
          .finally(() => this.setData({ submitting: false }))
      },
    })
  },
})
