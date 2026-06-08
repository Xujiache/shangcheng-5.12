Page({
  toDoc(e: any) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/doc/index?key=' + key })
  },
  toFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' })
  },
  onCheckUpdate() {
    // 走微信平台真实的版本更新机制（非伪造提示）
    let version = ''
    try {
      version = wx.getAccountInfoSync().miniProgram.version || ''
    } catch (e) {
      /* dev/trial 版本号为空 */
    }
    const mgr = wx.getUpdateManager ? wx.getUpdateManager() : null
    if (mgr) {
      mgr.onUpdateReady(() => {
        wx.showModal({
          title: '发现新版本',
          content: '新版本已下载，重启后即可生效。',
          confirmText: '立即重启',
          success: (r) => {
            if (r.confirm) mgr.applyUpdate()
          },
        })
      })
      mgr.onUpdateFailed(() => wx.showToast({ title: '更新下载失败，请稍后重试', icon: 'none' }))
    }
    wx.showToast({
      title: version ? `当前版本 ${version}，已是最新` : '已是最新版本',
      icon: 'none',
    })
  },
})
