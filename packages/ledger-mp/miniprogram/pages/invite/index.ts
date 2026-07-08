import { inviteApi } from '../../api/index'
import { makeShareCover } from '../../utils/share-cover'

Page({
  _cover: '',
  data: {
    loading: true,
    loadError: false,
    inviteCode: '',
    invitedCount: 0,
    rewardDays: 7,
    allowSelfRegister: false,
  },

  onLoad() {
    this.load()
  },

  async load() {
    try {
      const r: any = await inviteApi.get()
      this.setData({
        loading: false,
        loadError: false,
        inviteCode: r.inviteCode || '',
        invitedCount: r.invitedCount || 0,
        rewardDays: r.rewardDays || 7,
        allowSelfRegister: false,
      })
      this.genCover()
    } catch (e) {
      // 加载失败单独成态（带重试）：空邀请码下"复制/分享"看似可用实际无效，必须挡住
      this.setData({ loading: false, loadError: true })
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  copyCode() {
    if (!this.data.inviteCode) {
      wx.showToast({ title: '邀请码加载失败，请重试', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
    })
  },

  genCover() {
    if (this._cover) return
    makeShareCover(this, '#shareCover', {
      title: '门窗利账 · 门窗人的记账利器',
      subtitle: '门窗人的记账利器',
      code: this.data.inviteCode || '',
    }).then((p) => (this._cover = p))
  },
  onShareAppMessage() {
    return {
      title: '我在用「门窗利账」记账算利润，门窗人的记账利器',
      path: '/pages/login/index',
      imageUrl: this._cover || undefined,
    }
  },
  onShareTimeline() {
    return {
      title: '门窗利账 · 门窗人的记账利器',
      imageUrl: this._cover || undefined,
    }
  },
})
