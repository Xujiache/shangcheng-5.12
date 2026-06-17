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
    selectedKey: '', // 用户点选的套餐
    ctaText: '开通会员',
    payEnabled: false, // 服务端微信支付就绪：true=直接付款开通；false=回退留言找管理员
    paying: false,
  },

  _loaded: false, // 是否成功加载过：刷新失败时保留已展示内容，不退回重试卡

  onLoad(opt: any) {
    this.setData({ gate: opt.gate === '1' })
    this.load()
  },
  onShow() {
    if (!this.data.loading) this.load()
  },

  async load(fresh = false) {
    try {
      const res: any = fresh ? await meApi.refreshMembership() : await meApi.membership()
      this.applyMembership(res)
    } catch (e) {
      // 首次失败显示重试卡；刷新失败保留已有内容（request 层已 toast）
      this.setData({ loading: false, loadError: !this._loaded })
    }
  },
  applyMembership(res: any) {
    const m: MembershipStatus = res
    const rawPlans = res.plans && res.plans.length ? res.plans : PLAN_FALLBACK
    const plans = rawPlans.map((p: any) => {
      const isFree = (Number(String(p.price).replace(/[^\d.]/g, '')) || 0) <= 0
      return {
        ...p,
        durLabel: p.perpetual ? '永久' : p.days + ' 天',
        isFree,
        claimed: !!p.trial && !!m.trialClaimed, // 体验卡(限领1次)：已领过则置「已领取」
      }
    })
    const plan = plans.find((p: any) => p.key === m.lastPlanKey)
    const planLabel = m.never ? '门窗利账 会员' : plan ? plan.label : '门窗利账 会员'
    const statusText = m.perpetual
      ? '永久会员'
      : m.active
        ? '会员有效'
        : m.expired
          ? '会员已过期'
          : '尚未开通会员'
    this._loaded = true
    this.setData({
      m,
      plans,
      planLabel,
      statusText,
      payEnabled: !!res.payEnabled,
      expiresLabel: fmtDate(m.expiresAt),
      ctaText: this.data.selectedKey
        ? this.ctaForKey(this.data.selectedKey, m, plans)
        : m.perpetual
          ? '永久会员 · 已开通'
          : m.active
            ? '续费会员'
            : '开通会员',
      loading: false,
      loadError: false,
    })
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  // 点选套餐：触感反馈 + 选中态 + 同步底部按钮（付费仍由后台开通，选择会带入留言）
  onPickPlan(e: any) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.selectedKey) return
    // 触感反馈（低版本基础库忽略 type，加 fail 兜底避免报错）
    wx.vibrateShort({ type: 'light', fail: () => {} })
    this.setData({ selectedKey: key, ctaText: this.ctaForKey(key, this.data.m, this.data.plans) })
  },
  ctaForKey(key: string, m: any, plans: any[]) {
    const plan = (plans || this.data.plans).find((p: any) => p.key === key)
    if (!plan) return m && m.active ? '续费会员' : '开通会员'
    if (plan.trial && m && m.trialClaimed) return '体验卡已领取'
    if (plan.isFree) return '免费领取 ' + plan.label
    return (m && m.active ? '续费 ' : '开通 ') + plan.label + ' ' + plan.price
  },

  // 领取体验卡（一次性，免费套餐专用，不走支付）
  async claimTrial() {
    if (this.data.m && this.data.m.trialClaimed) {
      wx.showToast({ title: '体验卡仅限领取一次', icon: 'none' })
      return
    }
    if (this.data.paying) return
    this.setData({ paying: true })
    wx.showLoading({ title: '领取中…', mask: true })
    try {
      const res: any = await meApi.claimTrial()
      wx.hideLoading()
      this.applyMembership(res)
      wx.showToast({ title: '体验卡已领取', icon: 'success' })
    } catch (e) {
      wx.hideLoading()
      // request 层已 toast 具体原因（已领过 / 已永久 / 未配置）
    } finally {
      this.setData({ paying: false })
    }
  },

  onRenew() {
    const sel = this.data.plans.find((p: any) => p.key === this.data.selectedKey)
    // 已是永久会员：无需再开通
    if (this.data.m && this.data.m.perpetual) {
      wx.showToast({ title: '您已是永久会员', icon: 'none' })
      return
    }
    // 体验卡限领1次：已领过 → 拦截（后端也会拒，这里提前提示）
    if (sel && (sel as any).trial && this.data.m && this.data.m.trialClaimed) {
      wx.showToast({ title: '体验卡仅限一次，您已领取', icon: 'none' })
      return
    }
    // 免费体验卡 → 一次性领取（不走支付）；付费体验卡走支付（后端拦一次性）
    if (sel && (sel as any).isFree) {
      this.claimTrial()
      return
    }
    // 微信支付就绪 → 用户直接付款全自动开通
    if (this.data.payEnabled) {
      this.payNow()
      return
    }
    // 回退：微信支付未配置 → 留言找管理员（原逻辑）
    const plan = this.data.plans.find((p: any) => p.key === this.data.selectedKey)
    const content = plan
      ? '您选择了「' +
        plan.label +
        '」（' +
        plan.price +
        ' · ' +
        plan.days +
        ' 天）。会员由管理员后台开通/续费，可在「意见反馈」留下手机号与想开通的套餐，管理员会与您联系。'
      : '会员由管理员后台开通/续费，可在「意见反馈」中留下手机号，管理员会与您联系。'
    wx.showModal({
      title: '会员开通',
      content,
      confirmText: '去留言',
      cancelText: '我知道了',
      success: (r) => {
        if (r.confirm) wx.navigateTo({ url: '/pages/feedback/index' })
      },
      // 弹窗期间管理员可能已开通，关闭后刷新状态
      complete: () => this.load(),
    })
  },

  // ── 在线支付开通（payEnabled）：选套餐 → 微信支付 → 回调自动开通 ──
  async payNow() {
    const key = this.data.selectedKey
    const plan = this.data.plans.find((p: any) => p.key === key)
    if (!plan) {
      wx.showToast({ title: '请先选择套餐', icon: 'none' })
      return
    }
    if (this.data.paying) return
    this.setData({ paying: true })
    let payParams: any
    try {
      // 拿 wx.login code（未绑定微信的用户用它换 openid；已绑定的服务端忽略）
      const code = await this.wxLogin()
      wx.showLoading({ title: '发起支付…', mask: true })
      payParams = await meApi.createMembershipPay(key, code)
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      this.setData({ paying: false })
      return // 下单失败：wx.login 失败 / request 层已 toast
    }
    try {
      await this.requestPayment(payParams)
    } catch (e: any) {
      this.setData({ paying: false })
      // 用户主动取消不提示，其余提示支付未完成
      if (!(e && e.errMsg && /cancel/i.test(e.errMsg))) {
        wx.showToast({ title: '支付未完成', icon: 'none' })
      }
      return
    }
    // 支付成功 → 会员由微信回调异步开通，轮询刷新状态
    wx.showLoading({ title: '开通中…', mask: true })
    await this.pollMembership()
    wx.hideLoading()
    this.setData({ paying: false })
    if (this.data.m && this.data.m.active) {
      wx.showToast({ title: '会员已开通', icon: 'success' })
    } else {
      wx.showToast({ title: '支付成功，开通处理中', icon: 'none' })
    }
  },
  wxLogin(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.login({ success: (r) => resolve(r.code || ''), fail: reject })
    })
  },
  requestPayment(p: any): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: p.timeStamp,
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType || 'RSA',
        paySign: p.paySign,
        success: () => resolve(),
        fail: reject,
      } as any)
    })
  },
  // 微信回调异步开通：轮询会员状态，命中 active 即停（最多 ~6s）
  async pollMembership() {
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      try {
        const res: any = await meApi.refreshMembership()
        this.applyMembership(res)
        if (res && res.active) return
      } catch (e) {
        /* 继续重试 */
      }
    }
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
