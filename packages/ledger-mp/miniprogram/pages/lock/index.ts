import { logout, setBioVerified } from '../../utils/store'

Page({
  data: {
    verifying: false,
  },

  _autoStarted: false,

  onShow() {
    // 首次展示自动拉起验证；取消后由「点击验证」按钮重试
    if (this._autoStarted) return
    this._autoStarted = true
    this.verify()
  },

  verify() {
    if (this.data.verifying) return
    this.setData({ verifying: true })
    wx.startSoterAuthentication({
      requestAuthModes: ['fingerPrint', 'facial'],
      challenge: 'ledger-lock',
      success: () => {
        setBioVerified(true)
        // 深链冷启动也统一落到首页（解锁前的目标页不恢复）
        wx.reLaunch({ url: '/pages/home/index' })
      },
      fail: () => {
        wx.showToast({ title: '验证未通过，请重试', icon: 'none' })
      },
      complete: () => this.setData({ verifying: false }),
    })
  },

  onRetry() {
    this.verify()
  },

  // 兜底出口：传感器异常时也能退出账号回到登录页，避免被锁死
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
