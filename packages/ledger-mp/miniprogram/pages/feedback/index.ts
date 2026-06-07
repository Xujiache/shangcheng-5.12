Page({
  data: {
    content: '',
    contact: '',
    canSubmit: false,
  },

  refreshCanSubmit() {
    this.setData({ canSubmit: this.data.content.trim().length > 0 })
  },

  onContent(e: any) {
    this.setData({ content: String(e.detail.value).slice(0, 500) }, () => this.refreshCanSubmit())
  },
  onContact(e: any) {
    this.setData({ contact: String(e.detail.value).slice(0, 40) })
  },

  onSubmit() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' })
      return
    }
    wx.showToast({ title: '已提交', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  },
})
