import { TOKEN_KEY } from './config'

App<IAppOption>({
  globalData: {
    token: '',
    user: null,
    membership: null,
  },
  onLaunch() {
    this.globalData.token = wx.getStorageSync(TOKEN_KEY) || ''
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
