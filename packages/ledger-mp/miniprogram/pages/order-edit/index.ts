import { customerApi, meApi, orderApi, settingApi } from '../../api/index'
import { yuan } from '../../utils/format'
import { EXTRA_TYPES, profitOf, marginOf } from '../../utils/calc'
import { hasActiveMembership, requireMembership, setMembership } from '../../utils/store'
import {
  CostCategory,
  cacheCostCategories,
  createCostCategoryId,
  nextCostColor,
  readCostCategories,
} from '../../utils/cost-categories'

const LEGACY_COSTS = [
  { key: 'profile', name: '型材' },
  { key: 'glass', name: '玻璃' },
  { key: 'hardware', name: '配件' },
  { key: 'labor', name: '人工' },
  { key: 'screen', name: '纱窗' },
]
const LEGACY_FIELD: Record<string, string> = {
  profile: 'costProfile',
  glass: 'costGlass',
  hardware: 'costHardware',
  labor: 'costLabor',
  screen: 'costScreen',
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 列表行 wx:key 用的页内唯一键（仅前端用，不进 API 载荷）
let seq = 0
const uid = () => 'k' + ++seq

function mergeCostRows(categories: CostCategory[], raw: any, legacyCosts: any = {}) {
  const source = Array.isArray(raw)
    ? raw.map((item: any) => ({
        ...item,
        id: String(item?.id || ''),
        name: String(item?.name || '').slice(0, 20),
        amount: Math.max(0, Math.round(Number(item?.amount) || 0)),
        amountStr:
          item?.amountStr !== undefined
            ? String(item.amountStr)
            : item?.amount
              ? String(Math.max(0, Math.round(Number(item.amount) || 0)))
              : '',
      }))
    : []
  const used = new Set<number>()
  const configured = categories.map((category) => {
    let found = source.findIndex((item: any, index: number) => {
      if (used.has(index)) return false
      return item.id === category.id
    })
    if (found < 0) {
      found = source.findIndex((item: any, index: number) => {
        if (used.has(index) || item.id) return false
        return item.name === category.name
      })
    }
    if (found >= 0) used.add(found)
    const existing = found >= 0 ? source[found] : null
    const legacy = Math.max(0, Math.round(Number(legacyCosts?.[category.id]) || 0))
    const amount = (existing?.amount || 0) + legacy
    return {
      _k: existing?._k || uid(),
      id: category.id,
      name: category.name,
      color: category.color,
      amount,
      amountStr: amount ? String(amount) : '',
      isTemplate: true,
      legacyKey: LEGACY_FIELD[category.id] ? category.id : '',
    }
  })

  const extras = source
    .filter(
      (item: any, index: number) =>
        !used.has(index) && (!item.isTemplate || Math.max(0, Number(item.amount) || 0) > 0),
    )
    .map((item: any, index: number) => ({
      _k: item._k || uid(),
      id: item.id || createCostCategoryId(),
      name: item.name,
      color: item.color || nextCostColor(categories.length + index),
      amount: item.amount,
      amountStr: item.amountStr,
      isTemplate: false,
      legacyKey: item.legacyKey || '',
    }))

  // 当前模板中已删除的旧固定分类仍保留有金额的行，避免旧订单成本丢失。
  LEGACY_COSTS.forEach((legacy, index) => {
    if (categories.some((category) => category.id === legacy.key)) return
    const amount = Math.max(0, Math.round(Number(legacyCosts?.[legacy.key]) || 0))
    if (!amount) return
    extras.push({
      _k: uid(),
      id: `legacy-${legacy.key}`,
      name: legacy.name,
      color: nextCostColor(categories.length + extras.length + index),
      amount,
      amountStr: String(amount),
      isTemplate: false,
      legacyKey: legacy.key,
    })
  })
  return [...configured, ...extras].slice(0, 50)
}

/**
 * “恢复门窗默认”从当前编辑器返回时专用：只使用当前订单已经显示的成本行。
 * 不再以 legacyCosts 或任何其它订单为来源补行，避免恢复默认误把历史成本带回来。
 */
function resetCurrentCostRows(categories: CostCategory[], raw: any) {
  const source = Array.isArray(raw) ? raw : []
  const used = new Set<number>()
  return categories.map((category) => {
    let index = source.findIndex((item: any, i: number) => !used.has(i) && item?.id === category.id)
    if (index < 0) {
      index = source.findIndex(
        (item: any, i: number) => !used.has(i) && !item?.id && item?.name === category.name,
      )
    }
    if (index >= 0) used.add(index)
    const current = index >= 0 ? source[index] : null
    const amount = Math.max(0, Math.round(Number(current?.amount) || 0))
    return {
      _k: current?._k || uid(),
      id: category.id,
      name: category.name,
      color: category.color,
      amount,
      amountStr: amount ? String(amount) : '',
      isTemplate: true,
      legacyKey: LEGACY_FIELD[category.id] ? category.id : '',
    }
  })
}

Page({
  data: {
    editing: false,
    id: '',
    customerId: null as string | null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerNote: '',
    date: today(),
    total: 0,
    received: 0,
    // 总价/收款的原始输入串（无明细时可在本页直接编辑；输入中不回写、失焦归一防光标跳）
    totalStr: '',
    receivedStr: '',
    costs: { profile: 0, glass: 0, hardware: 0, labor: 0, screen: 0 } as any,
    costCategories: readCostCategories() as CostCategory[],
    extras: [] as any[],
    customCosts: [] as any[],
    items: [] as any[],
    discount: 0,
    recycle: 0,
    deposit: 0,
    note: '',
    profitText: '¥0',
    profitNeg: false,
    marginPct: '0.0',
    canSave: false,
    saving: false,
    loadError: false,
    unpaid: 0,
    extraTypes: EXTRA_TYPES,
  },

  _openingItems: false, // toAmount 防双击锁，onShow 返回时解除

  onLoad(opt: any) {
    // 强制 reLaunch（401/登出）可能残留上次会话的中转 key，先清掉避免污染本次编辑
    try {
      wx.removeStorageSync('ledger_order_money_out')
      wx.removeStorageSync('ledger_pending_customer')
    } catch (e) {
      /* ignore */
    }
    if (opt.id) {
      this.setData({ editing: true, id: opt.id })
      this.loadOrder()
    } else {
      const categories = readCostCategories()
      this.setData({
        costCategories: categories,
        customCosts: mergeCostRows(categories, []),
      })
      this.loadCostCategoryTemplates()
      // 从客户页「再来一单」带入：id + 名字一起，真正关联到该客户（仅传名字会变成游离订单）
      if (opt.prefillCustomer) {
        const customerId = opt.prefillCustomerId || null
        this.setData(
          {
            customerId,
            customerName: decodeURIComponent(opt.prefillCustomer),
          },
          () => {
            if (customerId) this.loadCustomerProfile(customerId)
            this.refresh()
          },
        )
      } else {
        this.refresh()
      }
    }
  },
  onShow() {
    this._openingItems = false // 从明细页/客户页返回，解除 toAmount 防双击锁
    // 管理分类页从“编辑此订单”进入时，优先消费一次性的本单结果。
    // 恢复默认仅重置当前表单行，不会读取、更不会写回其它历史订单。
    const categoryResult = wx.getStorageSync('ledger_order_cost_categories_out')
    if (categoryResult) {
      wx.removeStorageSync('ledger_order_cost_categories_out')
      const categories = Array.isArray(categoryResult.categories)
        ? (categoryResult.categories as CostCategory[])
        : readCostCategories()
      this.setData(
        {
          costCategories: categories,
          customCosts: categoryResult.resetCurrentOrder
            ? resetCurrentCostRows(categories, this.data.customCosts)
            : mergeCostRows(categories, this.data.customCosts),
        },
        () => this.refresh(),
      )
    }
    const cachedCategories = readCostCategories()
    const currentIds = this.data.costCategories.map(
      (item: CostCategory) => `${item.id}:${item.name}`,
    )
    const cachedIds = cachedCategories.map((item) => `${item.id}:${item.name}`)
    if (!categoryResult && currentIds.join('|') !== cachedIds.join('|')) {
      this.setData(
        {
          costCategories: cachedCategories,
          customCosts: mergeCostRows(cachedCategories, this.data.customCosts),
        },
        () => this.refresh(),
      )
    }
    const p = wx.getStorageSync('ledger_pending_customer')
    if (p && p.name) {
      wx.removeStorageSync('ledger_pending_customer')
      // 清空选择器缓存：刚新增的客户要能在下次打开选择器时出现
      this.setData(
        {
          customerId: p.id || null,
          customerName: p.name,
          customerPhone: p.phone || '',
          customerAddress: p.address || '',
          customerNote: p.note || '',
        },
        () => {
          if (p.id && p.phone === undefined && p.address === undefined && p.note === undefined)
            this.loadCustomerProfile(p.id)
          this.refresh()
        },
      )
    }
    // 从「报价明细」页返回，回填 明细/总价/优惠/定金/收款/备注
    const m = wx.getStorageSync('ledger_order_money_out')
    if (m) {
      wx.removeStorageSync('ledger_order_money_out')
      const total = Math.max(0, Math.round(Number(m.total) || 0))
      const received = Math.max(0, Math.round(Number(m.received) || 0))
      this.setData(
        {
          items: m.items || [],
          discount: Math.max(0, Math.round(Number(m.discount) || 0)),
          recycle: Math.max(0, Math.round(Number(m.recycle) || 0)),
          deposit: Math.max(0, Math.round(Number(m.deposit) || 0)),
          total,
          received,
          totalStr: total ? String(total) : '',
          receivedStr: received ? String(received) : '',
          note: m.note !== undefined ? m.note : this.data.note,
        },
        () => this.refresh(),
      )
    }
  },

  // 点击「报价明细」→ 门窗报价明细编辑器；带入当前明细/金额，返回由 onShow 回填
  toAmount() {
    // 防双击连开两个明细页：第二个实例读不到已被消费的 IN 键会以空数据覆盖
    if (this._openingItems) return
    this._openingItems = true
    wx.setStorageSync('ledger_order_money_in', {
      items: this.data.items,
      total: this.data.total, // 无明细订单依赖此值兜底，明细页不得凭空清零
      discount: this.data.discount,
      recycle: this.data.recycle,
      deposit: this.data.deposit,
      received: this.data.received,
      note: this.data.note,
    })
    wx.navigateTo({ url: '/pages/order-items/index' })
  },

  async loadOrder() {
    try {
      const [o, categories]: [any, CostCategory[]] = await Promise.all([
        orderApi.get(this.data.id),
        this.fetchCostCategories(),
      ])
      this.setData(
        {
          customerId: o.customerId || null,
          customerName: o.customer,
          customerPhone: '',
          customerAddress: '',
          customerNote: '',
          date: o.date,
          total: o.total,
          costs: {
            profile: 0,
            glass: 0,
            hardware: 0,
            labor: 0,
            screen: 0,
          },
          costCategories: categories,
          extras: (o.extras || []).map((e: any) => ({
            _k: uid(),
            type: e.type,
            amount: e.amount,
            amountStr: e.amount ? String(e.amount) : '',
            typeIdx: Math.max(0, EXTRA_TYPES.indexOf(e.type)),
          })),
          customCosts: mergeCostRows(categories, o.customCosts || [], o.costs || {}),
          items: o.items || [],
          discount: o.discount || 0,
          recycle: o.recycle || 0,
          deposit: o.deposit || 0,
          received: o.received || 0,
          totalStr: o.total ? String(o.total) : '',
          receivedStr: o.received ? String(o.received) : '',
          note: o.note || '',
        },
        () => {
          this.refresh()
          if (o.customerId) this.loadCustomerProfile(o.customerId)
        },
      )
    } catch (e) {
      // 编辑态加载失败不能渲染空表单：保存空表单会把真实订单清零，改为展示重试卡
      this.setData({ loadError: true })
    }
  },
  async fetchCostCategories(): Promise<CostCategory[]> {
    try {
      const settings: any = await settingApi.get()
      return cacheCostCategories(settings.costCategories)
    } catch {
      return readCostCategories()
    }
  },
  async loadCostCategoryTemplates() {
    const categories = await this.fetchCostCategories()
    this.setData(
      {
        costCategories: categories,
        customCosts: mergeCostRows(categories, this.data.customCosts),
      },
      () => this.refresh(),
    )
  },
  manageCostCategories() {
    wx.navigateTo({ url: '/pages/cost-categories/index?fromOrder=1' })
  },
  retryLoad() {
    this.setData({ loadError: false })
    this.loadOrder()
  },
  async loadCustomerProfile(id: string) {
    try {
      const c: any = await customerApi.get(id)
      if (this.data.customerId !== id) return
      this.setData(
        {
          customerName: c.name || this.data.customerName,
          customerPhone: c.phone || '',
          customerAddress: c.address || '',
          customerNote: c.note || '',
        },
        () => this.refresh(),
      )
    } catch (e) {
      // 客户档案加载失败不阻断订单编辑，订单仍保留 customerName 快照。
    }
  },

  refresh() {
    const { costs, extras, total, received, customCosts, deposit } = this.data
    const profit = profitOf(total, costs, extras, customCosts)
    const margin = marginOf(total, costs, extras, customCosts)
    this.setData({
      unpaid: Math.max(0, total - deposit - received), // 与明细页/后端同口径：未收 = 总价 − 定金 − 收款
      profitText: yuan(profit),
      profitNeg: profit < 0,
      marginPct: (margin * 100).toFixed(1),
      canSave: !!String(this.data.customerName).trim() && total > 0,
    })
  },

  onDate(e: any) {
    this.setData({ date: e.detail.value })
  },
  // 无明细订单：总价在本页直接输入（有明细时此输入框不渲染，总价由明细算）
  onTotalInput(e: any) {
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    this.setData({ total: v, totalStr: e.detail.value }, () => this.refresh())
  },
  onTotalBlur(e: any) {
    const s = String(e.detail.value || '').trim()
    this.setData({ totalStr: s ? String(this.data.total) : '' })
  },
  // 收款：本页直接输入，仅影响未收（未收 = 总价 − 定金 − 收款）
  onReceivedInput(e: any) {
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    this.setData({ received: v, receivedStr: e.detail.value }, () => this.refresh())
  },
  onReceivedBlur(e: any) {
    const s = String(e.detail.value || '').trim()
    this.setData({ receivedStr: s ? String(this.data.received) : '' })
  },
  onNote(e: any) {
    this.setData({ note: e.detail.value })
  },
  onCustomerName(e: any) {
    this.setData({ customerName: String(e.detail.value).slice(0, 40) }, () => this.refresh())
  },
  onCustomerPhone(e: any) {
    this.setData({ customerPhone: String(e.detail.value).slice(0, 20) })
  },
  onCustomerAddress(e: any) {
    this.setData({ customerAddress: String(e.detail.value).slice(0, 120) })
  },
  onCustomerNote(e: any) {
    this.setData({ customerNote: String(e.detail.value).slice(0, 200) })
  },
  addExtra() {
    // 后端 sanitizeExtras 截断 50 条，前端同口径拦截
    if (this.data.extras.length >= 50) {
      wx.showToast({ title: '最多 50 项开销', icon: 'none' })
      return
    }
    this.setData({
      extras: [
        ...this.data.extras,
        { _k: uid(), type: '卖旧门窗', amount: 0, amountStr: '', typeIdx: 0 },
      ],
    })
  },
  onExtraType(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const idx = Number(e.detail.value)
    const ex = [...this.data.extras]
    ex[i] = { ...ex[i], type: EXTRA_TYPES[idx], typeIdx: idx }
    this.setData({ extras: ex })
  },
  onExtraAmt(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    const ex = [...this.data.extras]
    ex[i] = { ...ex[i], amount: v, amountStr: e.detail.value }
    this.setData({ extras: ex }, () => this.refresh())
  },
  onExtraAmtBlur(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const s = String(e.detail.value || '').trim()
    const ex = [...this.data.extras]
    if (!ex[i]) return // 行已删除后迟到的 blur，忽略
    ex[i] = { ...ex[i], amountStr: s ? String(ex[i].amount || 0) : '' }
    this.setData({ extras: ex })
  },
  delExtra(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    this.setData({ extras: this.data.extras.filter((_: any, j: number) => j !== i) }, () =>
      this.refresh(),
    )
  },

  // ── 通用成本项：常用分类来自账号设置，也允许本单临时添加 ──
  addCustomCost() {
    // 后端 sanitizeCustomCosts 截断 20 条，前端同口径拦截
    if (this.data.customCosts.length >= 50) {
      wx.showToast({ title: '每个订单最多 50 项成本', icon: 'none' })
      return
    }
    this.setData({
      customCosts: [
        ...this.data.customCosts,
        {
          _k: uid(),
          id: createCostCategoryId(),
          name: '',
          color: nextCostColor(this.data.customCosts.length),
          amount: 0,
          amountStr: '',
          isTemplate: false,
        },
      ],
    })
  },
  onCustomName(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const cc = [...this.data.customCosts]
    cc[i] = { ...cc[i], name: String(e.detail.value).slice(0, 20) }
    this.setData({ customCosts: cc })
  },
  onCustomAmt(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    const cc = [...this.data.customCosts]
    cc[i] = { ...cc[i], amount: v, amountStr: e.detail.value }
    this.setData({ customCosts: cc }, () => this.refresh())
  },
  onCustomAmtBlur(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const s = String(e.detail.value || '').trim()
    const cc = [...this.data.customCosts]
    if (!cc[i]) return // 行已删除后迟到的 blur，忽略
    cc[i] = { ...cc[i], amountStr: s ? String(cc[i].amount || 0) : '' }
    this.setData({ customCosts: cc })
  },
  delCustomCost(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    this.setData(
      { customCosts: this.data.customCosts.filter((_: any, j: number) => j !== i) },
      () => this.refresh(),
    )
  },

  onCancel() {
    if (this.data.saving) return // 保存成功后的延时返回期间再点取消会连退两页
    wx.navigateBack()
  },
  async syncCustomerProfile() {
    const name = String(this.data.customerName || '').trim()
    const phone = String(this.data.customerPhone || '').trim()
    const address = String(this.data.customerAddress || '').trim()
    const note = String(this.data.customerNote || '').trim()
    if (!name) return { customerId: null as string | null, customerName: '' }

    const data = { name, phone, address, note }
    if (this.data.customerId) {
      const c: any = await customerApi.update(this.data.customerId, data)
      return { customerId: c.id as string, customerName: c.name || name }
    }

    if (phone || address || note) {
      const ensured: any = await customerApi.ensureByName(name)
      const c: any = await customerApi.update(ensured.id, data)
      return { customerId: c.id as string, customerName: c.name || name }
    }

    return { customerId: null as string | null, customerName: name }
  },
  async save() {
    if (this.data.saving) return
    if (!this.data.canSave) {
      // 缺必填项时给出具体指引，避免点保存毫无反应
      if (!String(this.data.customerName).trim()) {
        wx.showToast({ title: '请填写客户姓名', icon: 'none' })
      } else {
        wx.showToast({ title: '请点「报价明细」录入明细或总价', icon: 'none' })
      }
      return
    }
    try {
      const membership = (await meApi.refreshMembership()) as MembershipStatus
      setMembership(membership)
      if (!hasActiveMembership(membership)) {
        requireMembership(
          this.data.editing
            ? '会员已到期，历史订单可以查看和预览，但暂不能修改。'
            : '会员已到期，历史订单仍可查看，但新增订单需要续费。',
        )
        return
      }
    } catch (e) {
      // 状态校验失败时不开放写操作，request 层已提示具体网络错误。
      return
    }
    this.setData({ saving: true })
    const {
      editing,
      id,
      date,
      total,
      received,
      extras,
      customCosts,
      items,
      discount,
      recycle,
      deposit,
      note,
    } = this.data
    const payloadCosts: any = {
      costProfile: 0,
      costGlass: 0,
      costHardware: 0,
      costLabor: 0,
      costScreen: 0,
    }
    customCosts.forEach((item: any) => {
      if (!item.legacyKey || !LEGACY_FIELD[item.legacyKey]) return
      payloadCosts[LEGACY_FIELD[item.legacyKey]] =
        (payloadCosts[LEGACY_FIELD[item.legacyKey]] || 0) +
        Math.max(0, Math.round(Number(item.amount) || 0))
    })
    try {
      const syncedCustomer = await this.syncCustomerProfile()
      this.setData({
        customerId: syncedCustomer.customerId,
        customerName: syncedCustomer.customerName,
      })
      const payload = {
        customerId: syncedCustomer.customerId || undefined,
        customerName: syncedCustomer.customerName,
        date,
        total,
        received,
        ...payloadCosts,
        extras: extras.map((e: any) => ({ type: e.type, amount: e.amount })),
        customCosts: customCosts
          .filter((c: any) => !c.legacyKey)
          .map((c: any) => ({
            id: c.id,
            color: c.color,
            name: c.name,
            amount: c.amount,
          })),
        items,
        discount,
        recycle,
        deposit,
        note,
      }
      if (editing) await orderApi.update(id, payload)
      else await orderApi.create(payload)
      wx.showToast({ title: editing ? '已保存' : '已记账', icon: 'success' })
      // 成功后不重置 saving，保持按钮禁用直到返回，避免重复提交
      setTimeout(() => wx.navigateBack(), 500)
    } catch (e) {
      this.setData({ saving: false }) // 失败允许重试
    }
  },
})
