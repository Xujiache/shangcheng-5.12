import { meApi } from '../../api/index'
import { fmtDate } from '../../utils/format'
import { logout } from '../../utils/store'

const BENEFITS = [
  { icon: 'orders', t: '无限订单录入', s: '不限笔数，随时增删改' },
  { icon: 'trend', t: '经营利润报表', s: '本月 / 本季 / 全年多维分析' },
  { icon: 'user', t: '客户档案管理', s: '客户贡献榜与历史订单' },
  { icon: 'shield', t: '数据云端备份', s: '换机不丢数据，安全无忧' },
  { icon: 'target', t: '经营目标跟踪', s: '月度 / 年度利润目标提醒' },
  { icon: 'heart', t: '专属客服支持', s: '使用问题优先响应' },
]

const PLAN_FALLBACK = [
  { key: 'day', label: '体验卡', days: 1, price: '¥1' },
  { key: 'week', label: '周卡', days: 7, price: '¥9' },
  { key: 'month', label: '月卡', days: 30, price: '¥29' },
  { key: 'quarter', label: '季卡', days: 90, price: '¥79' },
  { key: 'year', label: '年卡', days: 365, price: '¥268' },
]

Page({
  data: {
    gate: false,
    loading: true,
    loadError: false, // 首次加载失败：换重试卡，避免把默认值「尚未开通会员」当真相展示
    m: {
      active: false,
      expired: false,
      never: true,
      expiresAt: null,
      daysLeft: 0,
      expiringSoon: false,
      lastPlanKey: null,
    } as MembershipStatus,
    plans: PLAN_FALLBACK,
    benefits: BENEFITS,
    planLabel: '门窗利账 会员',
    statusText: '加载中…',
    expiresLabel: '—',
  },

  _loaded: false, // 是否成功加载过：刷新失败时保留已展示内容，不退回重试卡

  onLoad(opt: any) {
    this.setData({ gate: opt.gate === '1' })
    this.load()
  },
  onShow() {
    if (!this.data.loading) this.load()
  },

  async load() {
    try {
      const res: any = await meApi.membership()
      const m: MembershipStatus = res
      const plans = res.plans && res.plans.length ? res.plans : PLAN_FALLBACK
      const plan = plans.find((p: any) => p.key === m.lastPlanKey)
      const planLabel = m.never ? '门窗利账 会员' : plan ? plan.label : '门窗利账 会员'
      const statusText = m.active ? '会员有效' : m.expired ? '会员已过期' : '尚未开通会员'
      this._loaded = true
      this.setData({
        m,
        plans,
        planLabel,
        statusText,
        expiresLabel: fmtDate(m.expiresAt),
        loading: false,
        loadError: false,
      })
    } catch (e) {
      // 首次失败显示重试卡；刷新失败保留已有内容（request 层已 toast）
      this.setData({ loading: false, loadError: !this._loaded })
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  onRenew() {
    wx.showModal({
      title: '会员开通',
      content: '会员由管理员后台开通/续费，可在「意见反馈」中留下手机号，管理员会与您联系。',
      confirmText: '去留言',
      cancelText: '我知道了',
      success: (r) => {
        if (r.confirm) wx.navigateTo({ url: '/pages/feedback/index' })
      },
      // 弹窗期间管理员可能已开通，关闭后刷新状态
      complete: () => this.load(),
    })
  },
  enterApp() {
    wx.switchTab({ url: '/pages/home/index' })
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      success: (r) => {
        if (r.confirm) logout()
      },
    })
  },
})
