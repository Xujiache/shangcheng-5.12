import { TOKEN_KEY } from './config'
import { getBioLock, getBioVerified } from './utils/store'

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
  onShow() {
    // 生物解锁闸门：每次冷启动校验一次（解锁后 bioVerified 置位不再拦）。
    // 未登录不锁（登录流程不受影响）；深链进入的页面解锁后统一落到首页。
    if (getBioVerified() || !getBioLock() || !this.globalData.token) return
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    // 已在锁屏页时不重复 reLaunch，避免验证弹窗切前台触发循环
    if (cur && cur.route === 'pages/lock/index') return
    wx.reLaunch({ url: '/pages/lock/index' })
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
