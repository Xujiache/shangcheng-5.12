import { goalApi, statsApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'

function clampPct(realized: number, target: number): number {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((realized / target) * 100)))
}

Page({
  data: {
    loading: true,
    loadError: false, // 网络/加载失败：失败时隐藏表单，避免把未知现有目标保存覆盖成 0
    saving: false,
    ovYear: new Date().getFullYear(),
    monthlyInput: '',
    yearlyInput: '',
    // progress
    monthProfit: 0,
    yearProfit: 0,
    monthProfitText: '¥0',
    yearProfitText: '¥0',
    monthlyText: '未设',
    yearlyText: '未设',
    monthPct: 0,
    yearPct: 0,
  },

  onLoad() {
    this.load()
  },
  onShow() {
    // 从隐私设置返回时同步「隐藏金额」开关（不重新拉取，避免覆盖编辑中的目标输入）
    if (this.data.loading || this.data.loadError) return
    const hide = getHideAmount()
    this.setData({
      monthProfitText: hide ? maskMoney(this.data.monthProfit) : yuan(this.data.monthProfit),
      yearProfitText: hide ? maskMoney(this.data.yearProfit) : yuan(this.data.yearProfit),
    })
  },

  async load() {
    try {
      const [goal, ov] = await Promise.all([
        goalApi.get() as Promise<any>,
        statsApi.overview('year') as Promise<any>,
      ])
      const monthly = (goal && goal.monthly) || 0
      const yearly = (goal && goal.yearly) || 0
      const monthProfit = (ov && ov.monthProfit) || 0
      const yearProfit = (ov && ov.yearProfit) || 0
      // 隐藏金额模式：仅掩码"已实现"展示金额；目标输入框及其镜像文案保持可编辑可见
      const hide = getHideAmount()
      this.setData({
        monthlyInput: monthly ? String(monthly) : '',
        yearlyInput: yearly ? String(yearly) : '',
        monthProfit,
        yearProfit,
        monthProfitText: hide ? maskMoney(monthProfit) : yuan(monthProfit),
        yearProfitText: hide ? maskMoney(yearProfit) : yuan(yearProfit),
        monthlyText: monthly ? yuan(monthly) : '未设',
        yearlyText: yearly ? yuan(yearly) : '未设',
        monthPct: clampPct(monthProfit, monthly),
        yearPct: clampPct(yearProfit, yearly),
        loading: false,
        loadError: false,
      })
    } catch (e) {
      // 加载失败单独成态（带重试），避免在 0 值表单上误保存覆盖现有目标
      this.setData({ loading: false, loadError: true })
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  onMonthly(e: any) {
    this.refresh(e.detail.value, this.data.yearlyInput)
  },
  onYearly(e: any) {
    this.refresh(this.data.monthlyInput, e.detail.value)
  },
  // 实时同步进度条与文案
  refresh(monthlyInput: string, yearlyInput: string) {
    const monthly = Math.max(0, Math.round(Number(monthlyInput) || 0))
    const yearly = Math.max(0, Math.round(Number(yearlyInput) || 0))
    this.setData({
      monthlyInput,
      yearlyInput,
      monthlyText: monthly ? yuan(monthly) : '未设',
      yearlyText: yearly ? yuan(yearly) : '未设',
      monthPct: clampPct(this.data.monthProfit, monthly),
      yearPct: clampPct(this.data.yearProfit, yearly),
    })
  },

  async onSave() {
    if (this.data.saving) return
    const monthly = Math.max(0, Math.round(Number(this.data.monthlyInput) || 0))
    const yearly = Math.max(0, Math.round(Number(this.data.yearlyInput) || 0))
    this.setData({ saving: true })
    try {
      await goalApi.set({ monthly, yearly })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})
