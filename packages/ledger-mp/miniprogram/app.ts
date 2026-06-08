import { TOKEN_KEY } from './config'

App<IAppOption>({
  globalData: {
    token: '',
    user: null,
    membership: null,
    statusBarHeight: 20,
  },
  onLaunch() {
    this.globalData.token = wx.getStorageSync(TOKEN_KEY) || ''
    // 真实状态栏高度：安卓 env(safe-area-inset-top) 返回 0，自定义导航必须用它做顶部留白
    try {
      this.globalData.statusBarHeight = wx.getWindowInfo().statusBarHeight || 20
    } catch (e) {
      /* 极旧基础库兜底用默认 20 */
    }
  },
  setToken(token: string) {
    this.globalData.token = token
    wx.setStorageSync(TOKEN_KEY, token)
  },
  clearAuth() {
    this.globalData.token = ''
    this.globalData.user = null
    this.globalData.membership = null
    wx.removeStorageSync(TOKEN_KEY)
  },
})
