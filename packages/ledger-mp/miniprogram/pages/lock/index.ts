import { logout, setBioVerified } from '../../utils/store'

Page({
  data: {
    verifying: false,
    supported: true, // 设备是否支持指纹/面容；不支持时换诚实文案并把退出登录作为主出口
  },

  _autoStarted: false,

  onShow() {
    // 首次展示自动拉起验证；取消后由「点击验证」按钮重试
    if (this._autoStarted) return
    this._autoStarted = true
    // 先探测设备能力（同隐私页 checkSoter）：不支持时别让用户陷入「请重试」死循环
    this.checkSoter().then((ok) => {
      this.setData({ supported: ok })
      if (ok) this.verify()
    })
  },

  /** 设备是否支持指纹 / 面容（同 pages/privacy） */
  checkSoter(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.checkIsSupportSoterAuthentication({
        success: (r) =>
          resolve((r.supportMode || []).some((m) => m === 'fingerPrint' || m === 'facial')),
        fail: () => resolve(false),
      })
    })
  },

  verify() {
    if (this.data.verifying || !this.data.supported) return
    this.setData({ verifying: true })
    wx.startSoterAuthentication({
      requestAuthModes: ['fingerPrint', 'facial'],
      challenge: 'ledger-lock',
      success: () => {
        setBioVerified(true)
        // 深链冷启动也统一落到首页（解锁前的目标页不恢复）
        wx.reLaunch({ url: '/pages/home/index' })
      },
      fail: (e: any) => {
        // 90001/90002/90003 设备/方式不支持、90011 未录入：重试永远不会成功，换诚实出口
        const c = e && e.errCode
        if (c === 90001 || c === 90002 || c === 90003 || c === 90011) {
          this.setData({ supported: false })
          return
        }
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
