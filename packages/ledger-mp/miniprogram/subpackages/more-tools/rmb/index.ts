import { MotionPage } from '../../../utils/page-transition'
import { goToLogin, isLoggedIn, requireLogin } from '../../../utils/store'
import { toRmbUppercase } from '../../../utils/more-tools/amount-date'
import { reportToolEvent } from '../../../utils/tool-events'

MotionPage({
  _opened: false,
  data: {
    authorized: false,
    amount: '',
    normalized: '',
    uppercase: '',
    error: '',
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) requireLogin('登录后可免费使用人民币大小写转换。')
    else if (!this._opened) { this._opened = true; reportToolEvent('rmb', 'open') }
  },
  login() {
    goToLogin()
  },
  onAmount(event: any) {
    if (!this.data.authorized) return
    const amount = String(event.detail.value || '').trim()
    const result = amount ? toRmbUppercase(amount) : null
    this.setData({
      amount,
      normalized: result?.ok ? result.normalized : '',
      uppercase: result?.ok ? result.uppercase : '',
      error: result && !result.ok ? result.error : '',
    })
  },
  clearAmount() {
    this.setData({ amount: '', normalized: '', uppercase: '', error: '' })
  },
  copyResult() {
    if (!this.data.authorized || !this.data.uppercase) return
    wx.setClipboardData({
      data: this.data.uppercase,
      success: () => { reportToolEvent('rmb', 'success'); wx.showToast({ title: '已复制', icon: 'success' }) },
      fail: () => { reportToolEvent('rmb', 'failure'); wx.showToast({ title: '复制失败，请长按结果复制', icon: 'none' }) },
    })
  },
})
