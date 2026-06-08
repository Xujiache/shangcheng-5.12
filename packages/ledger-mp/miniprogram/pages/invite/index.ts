import { inviteApi } from '../../api/index'

Page({
  data: {
    loading: true,
    inviteCode: '',
    invitedCount: 0,
    rewardDays: 7,
  },

  onLoad() {
    this.load()
  },

  async load() {
    try {
      const r: any = await inviteApi.get()
      this.setData({
        loading: false,
        inviteCode: r.inviteCode || '',
        invitedCount: r.invitedCount || 0,
        rewardDays: r.rewardDays || 7,
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  copyCode() {
    if (!this.data.inviteCode) return
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'none' }),
    })
  },

  onShareAppMessage() {
    return {
      title: `我在用「门窗利账」记账算利润，注册就送 ${this.data.rewardDays} 天会员`,
      path: `/pages/register/index?invite=${this.data.inviteCode}`,
    }
  },
})
