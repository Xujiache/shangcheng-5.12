import { authApi } from '../../api/index'
import { getUser, setUser } from '../../utils/store'

Page({
  data: {
    // reset 模式：管理员重置密码后强制设置新密码（无需旧密码，后端按 mustReset 放行）
    reset: false,
    oldPwd: '',
    newPwd: '',
    confirmPwd: '',
    showOld: false,
    showNew: false,
    canSave: false,
    saving: false,
  },

  onLoad(opt: any) {
    this.setData({ reset: !!(opt && opt.reset === '1') })
  },

  refreshCanSave() {
    const d = this.data
    this.setData({
      canSave:
        (d.reset || d.oldPwd.length >= 6) && d.newPwd.length >= 6 && d.confirmPwd.length >= 6,
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
    if (!d.reset && d.newPwd === d.oldPwd) {
      wx.showToast({ title: '新密码不能与当前密码相同', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      // reset 模式只传 newPassword（undefined 会被 JSON 序列化丢弃）
      await authApi.changePassword(d.reset ? undefined : d.oldPwd, d.newPwd)
      if (d.reset) {
        const u = getUser()
        if (u) {
          u.mustReset = false
          setUser(u)
        }
        wx.showToast({ title: '密码已设置', icon: 'success' })
        // 直接进首页；会员过期由首页闸门（6001）兜底
        setTimeout(() => wx.reLaunch({ url: '/pages/home/index' }), 600)
      } else {
        wx.showToast({ title: '修改成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      }
      // 成功后不重置 saving：跳转前防重复提交
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})
