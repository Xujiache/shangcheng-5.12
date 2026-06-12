import { feedbackApi } from '../../api/index'

Page({
  data: {
    content: '',
    contact: '',
    canSubmit: false,
    submitting: false,
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

  async onSubmit() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await feedbackApi.submit({
        content: this.data.content.trim(),
        contact: this.data.contact.trim() || undefined,
      })
      wx.showToast({ title: '已提交', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
      // 成功后不重置 submitting：返回前防重复提交
    } catch (e) {
      this.setData({ submitting: false })
    }
  },
})
