import { MotionPage } from '../../../utils/page-transition'
import { meApi } from '../../../api/index'
import {
  goToLogin,
  getCurrentLedgerAccountId,
  isLoggedIn,
  requireLogin,
  setUser,
} from '../../../utils/store'
import { dateCountdown } from '../utils/amount-date'
import {
  calculateRetirement,
  RetirementCategory,
  RetirementProfile,
  WorkType,
} from '../utils/retirement'
import {
  clearAccountRetirementProfile,
  loadAccountRetirementProfile,
  saveAccountRetirementProfile,
  wxRetirementStorage,
} from '../utils/retirement-storage'
import { reportToolEvent } from '../../../utils/tool-events'
import { toolShare, toolShareTimeline } from '../utils/tool-share'

const categories: Array<{ value: RetirementCategory; label: string }> = [
  { value: 'male', label: '男职工' },
  { value: 'female50', label: '原 50 周岁女职工' },
  { value: 'female55', label: '原 55 周岁女职工' },
  { value: 'unknown', label: '类别待确认' },
]
const workTypes: Array<{ value: WorkType; label: string }> = [
  { value: 'standard', label: '普通岗位' },
  { value: 'special', label: '特殊工种或特殊退休' },
]
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

MotionPage({
  _opened: false,
  data: {
    authorized: false,
    hasProfile: false,
    editing: true,
    calculated: false,
    todayMonth: today().slice(0, 7),
    draftBirthMonth: '',
    categoryIndex: 0,
    workIndex: 0,
    categories,
    workTypes,
    error: '',
    retirementYear: '',
    retirementMonth: '',
    ageText: '',
    years: 0,
    months: 0,
    days: 0,
    totalDays: 0,
    reached: false,
    birthMonthText: '',
    categoryText: '',
    workText: '',
    reviewReason: '',
  },
  async onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) {
      requireLogin('登录后可免费使用退休倒计时。')
      return
    }
    if (!this._opened) {
      this._opened = true
      reportToolEvent('retire', 'open')
    }
    let accountId = getCurrentLedgerAccountId()
    if (!accountId) {
      try {
        const user = (await meApi.me()) as LedgerUserInfo
        setUser(user)
        accountId = user.id
      } catch {
        this.setData({ error: '请联网确认登录账号后重试' })
        return
      }
    }
    const saved = loadAccountRetirementProfile(wxRetirementStorage(), accountId, today())
    if (saved.profile) this.display(saved.profile, false)
    else if (saved.issue) this.setData({ error: '本机资料无法读取，请重新填写' })
  },
  onShareAppMessage() {
    return toolShare('retire')
  },
  onShareTimeline() {
    return toolShareTimeline('retire')
  },
  login() {
    goToLogin()
  },
  display(profile: RetirementProfile, editing: boolean) {
    const result = calculateRetirement(profile, today())
    const countdown =
      result.ok && result.status === 'calculated'
        ? dateCountdown(result.countdownDate, today())
        : null
    const categoryIndex = categories.findIndex((item) => item.value === profile.category)
    const workIndex = workTypes.findIndex((item) => item.value === profile.workType)
    this.setData({
      hasProfile: true,
      editing,
      calculated: result.ok && result.status === 'calculated',
      draftBirthMonth: profile.birthMonth,
      categoryIndex: Math.max(0, categoryIndex),
      workIndex: Math.max(0, workIndex),
      birthMonthText: profile.birthMonth.replace('-', ' 年 ') + ' 月',
      categoryText: categories[Math.max(0, categoryIndex)].label,
      workText: workTypes[Math.max(0, workIndex)].label,
      retirementYear:
        result.ok && result.status === 'calculated' ? result.retirementMonth.slice(0, 4) : '',
      retirementMonth:
        result.ok && result.status === 'calculated'
          ? String(Number(result.retirementMonth.slice(5)))
          : '',
      ageText:
        result.ok && result.status === 'calculated'
          ? `${result.ageYears} 岁 ${result.ageMonths} 个月`
          : '',
      years: countdown?.ok ? countdown.years : 0,
      months: countdown?.ok ? countdown.months : 0,
      days: countdown?.ok ? countdown.days : 0,
      totalDays: countdown?.ok ? countdown.totalDays : 0,
      reached: countdown?.ok ? countdown.reached : false,
      reviewReason:
        result.ok && result.status === 'needs-review'
          ? result.reasonCode === 'special-work'
            ? '特殊工种的退休时间需按实际认定结果确定。'
            : '请先确认适用的女职工类别。'
          : '',
      error: '',
    })
  },
  onBirthMonth(event: any) {
    this.setData({ draftBirthMonth: String(event.detail.value), error: '' })
  },
  onCategory(event: any) {
    this.setData({ categoryIndex: Number(event.detail.value), error: '' })
  },
  onWorkType(event: any) {
    this.setData({ workIndex: Number(event.detail.value), error: '' })
  },
  saveProfile() {
    const accountId = getCurrentLedgerAccountId()
    if (!accountId) {
      this.setData({ error: '请联网确认登录账号后重试' })
      return
    }
    const profile: RetirementProfile = {
      birthMonth: this.data.draftBirthMonth,
      category: categories[this.data.categoryIndex].value,
      workType: workTypes[this.data.workIndex].value,
    }
    const saved = saveAccountRetirementProfile(wxRetirementStorage(), accountId, profile, today())
    if (!saved.ok) {
      this.setData({ error: saved.error || '保存失败' })
      reportToolEvent('retire', 'failure')
      return
    }
    this.display(profile, false)
    const result = calculateRetirement(profile, today())
    if (result.ok && result.status === 'calculated') reportToolEvent('retire', 'success')
  },
  editProfile() {
    this.setData({ editing: true })
  },
  cancelEdit() {
    const accountId = getCurrentLedgerAccountId()
    if (!accountId) return
    const saved = loadAccountRetirementProfile(wxRetirementStorage(), accountId, today())
    if (saved.profile) this.display(saved.profile, false)
  },
  clearProfile() {
    wx.showModal({
      title: '清除本机资料',
      content: '清除后，下次使用需重新填写出生年月和职工类别。',
      success: (result) => {
        if (!result.confirm) return
        const accountId = getCurrentLedgerAccountId()
        if (!accountId) return
        const cleared = clearAccountRetirementProfile(wxRetirementStorage(), accountId)
        if (!cleared.ok) {
          wx.showToast({ title: cleared.error || '清除失败', icon: 'none' })
          return
        }
        this.setData({
          hasProfile: false,
          editing: true,
          calculated: false,
          draftBirthMonth: '',
          categoryIndex: 0,
          workIndex: 0,
        })
      },
    })
  },
})
