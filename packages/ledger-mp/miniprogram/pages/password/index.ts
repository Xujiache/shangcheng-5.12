import { authApi } from '../../api/index'

Page({
  data: {
    oldPwd: '',
    newPwd: '',
    confirmPwd: '',
    showOld: false,
    showNew: false,
    canSave: false,
    saving: false,
  },

  refreshCanSave() {
    const d = this.data
    this.setData({
      canSave: d.oldPwd.length >= 6 && d.newPwd.length >= 6 && d.confirmPwd.length >= 6,
    })
  },

  onOld(e: any) {
    this.setData({ oldPwd: String(e.detail.value).slice(0, 20) }, () => this.refreshCanSave())
  },
  onNew(e: any) {
    this.setData({ newPwd: String(e.detail.value).slice(0, 20) }, () => this.refreshCanSave())
  },
  onConfirm(e: any) {
    this.setData({ confirmPwd: String(e.detail.value).slice(0, 20) }, () => this.refreshCanSave())
  },
  toggleOld() {
    this.setData({ showOld: !this.data.showOld })
  },
  toggleNew() {
    this.setData({ showNew: !this.data.showNew })
  },

  async onSave() {
    const d = this.data
    if (this.data.saving) return
    if (d.newPwd.length < 6) {
      wx.showToast({ title: '新密码至少 6 位', icon: 'none' })
      return
    }
    if (d.newPwd !== d.confirmPwd) {
      wx.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
      return
    }
    if (d.newPwd === d.oldPwd) {
      wx.showToast({ title: '新密码不能与当前密码相同', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      await authApi.changePassword(d.oldPwd, d.newPwd)
      wx.showToast({ title: '修改成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      /* toast handled in request */
    } finally {
      this.setData({ saving: false })
    }
  },
})
