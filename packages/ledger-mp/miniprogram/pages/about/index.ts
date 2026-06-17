import { authApi } from '../../api/index'
import { getLogo, setLogo } from '../../utils/store'

const FALLBACK_VERSION = '1.0.2'

// 实时版本：优先 app.globalData.version（onLaunch 已取平台真实版本），再退 getAccountInfoSync，最后兜底常量
function readVersion(): string {
  const app = getApp<IAppOption>()
  if (app && app.globalData && app.globalData.version) return app.globalData.version
  try {
    return wx.getAccountInfoSync().miniProgram.version || FALLBACK_VERSION
  } catch (e) {
    return FALLBACK_VERSION
  }
}

Page({
  data: {
    appVersion: FALLBACK_VERSION,
    logoUrl: getLogo(),
  },
  onLoad() {
    this.setData({ appVersion: readVersion(), logoUrl: getLogo() })
    // 拉取最新 LOGO（管理后台可配），成功则更新并缓存
    authApi
      .config()
      .then((c: any) => {
        const url = (c && c.logoUrl) || ''
        if (url) {
          this.setData({ logoUrl: url })
          setLogo(url)
        }
      })
      .catch(() => {})
  },
  toDoc(e: any) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/doc/index?key=' + key })
  },
  toFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' })
  },
  toChangelog() {
    wx.navigateTo({ url: '/pages/changelog/index' })
  },
  // 检查更新：微信平台真实更新流程（onCheckForUpdate → 自动下载 → onUpdateReady → applyUpdate）
  onCheckUpdate() {
    const version = this.data.appVersion
    const mgr = wx.getUpdateManager ? wx.getUpdateManager() : null
    if (!mgr) {
      wx.showToast({ title: `当前版本 v${version}`, icon: 'none' })
      return
    }
    wx.showLoading({ title: '检查更新中…', mask: true })
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      wx.hideLoading()
      fn()
    }
    mgr.onCheckForUpdate((res) => {
      if (!res.hasUpdate) {
        done(() => wx.showToast({ title: `当前版本 v${version}，已是最新`, icon: 'none' }))
      }
      // 有更新：微信自动下载，等待 onUpdateReady / onUpdateFailed
    })
    mgr.onUpdateReady(() => {
      done(() =>
        wx.showModal({
          title: '发现新版本',
          content: '新版本已下载，重启后即可生效。',
          confirmText: '立即重启',
          success: (r) => {
            if (r.confirm) mgr.applyUpdate()
          },
        }),
      )
    })
    mgr.onUpdateFailed(() =>
      done(() => wx.showToast({ title: '更新下载失败，请稍后重试', icon: 'none' })),
    )
    // 兜底：onCheckForUpdate 可能在冷启动时已触发过（此处注册不到回调），3s 后给出版本提示，避免 loading 卡死
    setTimeout(
      () => done(() => wx.showToast({ title: `当前版本 v${version}`, icon: 'none' })),
      3000,
    )
  },
})
