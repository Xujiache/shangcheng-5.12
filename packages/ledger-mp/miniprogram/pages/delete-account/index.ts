import { feedbackApi } from '../../api/index'
import { getUser } from '../../utils/store'

Page({
  data: {
    agree: false,
    submitting: false,
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
      content:
        '注销为不可逆操作，账号及全部数据将被永久删除。提交后管理员核实身份即处理，确定继续吗？',
      confirmText: '确认注销',
      confirmColor: '#C8442B',
      success: async (r) => {
        if (!r.confirm || this.data.submitting) return
        this.setData({ submitting: true })
        try {
          const u = getUser()
          await feedbackApi.submit({
            type: 'delete_account',
            content: '【账户注销申请】用户申请注销账号' + (u ? `（${u.phone}）` : ''),
          })
          wx.showModal({
            title: '申请已提交',
            content: '注销申请已提交，管理员将在核实身份后为您处理。如需撤回请联系管理员。',
            showCancel: false,
            confirmText: '我知道了',
            success: () => wx.navigateBack(),
          })
        } catch (e) {
          /* toast handled in request */
        } finally {
          this.setData({ submitting: false })
        }
      },
    })
  },
})
