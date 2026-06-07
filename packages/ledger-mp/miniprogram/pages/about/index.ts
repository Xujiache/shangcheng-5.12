Page({
  toDoc(e: any) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/doc/index?key=' + key })
  },
  toFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' })
  },
  onCheckUpdate() {
    wx.showToast({ title: '已是最新版本', icon: 'none' })
  },
})
