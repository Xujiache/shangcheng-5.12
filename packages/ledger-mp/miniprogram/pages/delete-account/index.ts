Page({
  data: {
    agree: false,
    consequences: [
      '订单、客户与利润数据将被永久删除',
      '会员权益与剩余时长将立即失效',
      '账号注销后无法再使用本手机号登录',
      '所有云端备份将一并清除，无法找回',
    ],
  },

  toggleAgree() {
    this.setData({ agree: !this.data.agree })
  },

  onDelete() {
    if (!this.data.agree) {
      wx.showToast({ title: '请先勾选确认项', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认注销账户',
      content: '注销为不可逆操作，账号及全部数据将被永久删除。确定继续吗？',
      confirmText: '确认注销',
      confirmColor: '#C8442B',
      success: (r) => {
        if (r.confirm) {
          wx.showToast({ title: '请联系管理员注销', icon: 'none' })
        }
      },
    })
  },
})
