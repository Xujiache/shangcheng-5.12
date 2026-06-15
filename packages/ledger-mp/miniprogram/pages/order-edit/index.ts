import { orderApi, customerApi } from '../../api/index'
import { yuan } from '../../utils/format'
import { COST_CATS, EXTRA_TYPES, profitOf, marginOf } from '../../utils/calc'

const CORE = ['profile', 'glass', 'labor']
const KEYMAP: Record<string, string> = {
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

Page({
  data: {
    editing: false,
    id: '',
    customerId: null as string | null,
    customerName: '',
    date: today(),
    total: 0,
    received: 0,
    // 总价/收款的原始输入串（无明细时可在本页直接编辑；输入中不回写、失焦归一防光标跳）
    totalStr: '',
    receivedStr: '',
    costs: { profile: 0, glass: 0, hardware: 0, labor: 0, screen: 0 } as any,
    // 成本输入框的原始字符串（输入中不回写，失焦才归一，避免光标跳动）
    costStrs: { profile: '', glass: '', hardware: '', labor: '', screen: '' } as any,
    activeCats: [...CORE] as string[],
    activeCells: [] as any[],
    removedCats: [] as any[],
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
    showPicker: false,
    pickerList: [] as any[],
    pickerQ: '',
    extraTypes: EXTRA_TYPES,
    _allCustomers: [] as any[],
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
      // 从客户页「再来一单」带入：id + 名字一起，真正关联到该客户（仅传名字会变成游离订单）
      if (opt.prefillCustomer)
        this.setData({
          customerId: opt.prefillCustomerId || null,
          customerName: decodeURIComponent(opt.prefillCustomer),
        })
      this.refresh()
    }
  },
  onShow() {
    this._openingItems = false // 从明细页/客户页返回，解除 toAmount 防双击锁
    const p = wx.getStorageSync('ledger_pending_customer')
    if (p && p.name) {
      wx.removeStorageSync('ledger_pending_customer')
      // 清空选择器缓存：刚新增的客户要能在下次打开选择器时出现
      this.setData(
        { customerId: p.id || null, customerName: p.name, showPicker: false, _allCustomers: [] },
        () => this.refresh(),
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
      const o: any = await orderApi.get(this.data.id)
      const active = COST_CATS.filter((c) => (o.costs ? o.costs[c.key] || 0 : 0) > 0).map(
        (c) => c.key,
      )
      this.setData(
        {
          customerId: o.customerId || null,
          customerName: o.customer,
          date: o.date,
          total: o.total,
          costs: {
            profile: o.costs.profile,
            glass: o.costs.glass,
            hardware: o.costs.hardware,
            labor: o.costs.labor,
            screen: o.costs.screen,
          },
          costStrs: {
            profile: o.costs.profile ? String(o.costs.profile) : '',
            glass: o.costs.glass ? String(o.costs.glass) : '',
            hardware: o.costs.hardware ? String(o.costs.hardware) : '',
            labor: o.costs.labor ? String(o.costs.labor) : '',
            screen: o.costs.screen ? String(o.costs.screen) : '',
          },
          activeCats: active.length ? active : [...CORE],
          extras: (o.extras || []).map((e: any) => ({
            _k: uid(),
            type: e.type,
            amount: e.amount,
            amountStr: e.amount ? String(e.amount) : '',
            typeIdx: Math.max(0, EXTRA_TYPES.indexOf(e.type)),
          })),
          customCosts: (o.customCosts || []).map((c: any) => ({
            _k: uid(),
            name: c.name,
            amount: c.amount,
            amountStr: c.amount ? String(c.amount) : '',
          })),
          items: o.items || [],
          discount: o.discount || 0,
          recycle: o.recycle || 0,
          deposit: o.deposit || 0,
          received: o.received || 0,
          totalStr: o.total ? String(o.total) : '',
          receivedStr: o.received ? String(o.received) : '',
          note: o.note || '',
        },
        () => this.refresh(),
      )
    } catch (e) {
      // 编辑态加载失败不能渲染空表单：保存空表单会把真实订单清零，改为展示重试卡
      this.setData({ loadError: true })
    }
  },
  retryLoad() {
    this.setData({ loadError: false })
    this.loadOrder()
  },

  refresh() {
    const { costs, costStrs, activeCats, extras, total, received, customCosts, deposit } = this.data
    const activeCells = COST_CATS.filter((c) => activeCats.includes(c.key)).map((c) => ({
      key: c.key,
      name: c.name,
      color: c.color,
      valueStr: costStrs[c.key] || '',
    }))
    const removedCats = COST_CATS.filter((c) => !activeCats.includes(c.key)).map((c) => ({
      key: c.key,
      name: c.name,
      color: c.color,
    }))
    const profit = profitOf(total, costs, extras, customCosts)
    const margin = marginOf(total, costs, extras, customCosts)
    this.setData({
      activeCells,
      removedCats,
      unpaid: Math.max(0, total - deposit - received), // 与明细页/后端同口径：未收 = 总价 − 定金 − 收款
      profitText: yuan(profit),
      profitNeg: profit < 0,
      marginPct: (margin * 100).toFixed(1),
      canSave: !!String(this.data.customerName).trim() && total > 0,
    })
  },

  onCost(e: any) {
    const k = e.currentTarget.dataset.key
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    this.setData({ ['costs.' + k]: v, ['costStrs.' + k]: e.detail.value }, () => this.refresh())
  },
  onCostBlur(e: any) {
    const k = e.currentTarget.dataset.key
    const s = String(e.detail.value || '').trim()
    this.setData({ ['costStrs.' + k]: s ? String(this.data.costs[k] || 0) : '' }, () =>
      this.refresh(),
    )
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
  addCat(e: any) {
    const k = e.currentTarget.dataset.key
    if (!this.data.activeCats.includes(k))
      this.setData({ activeCats: [...this.data.activeCats, k] }, () => this.refresh())
  },
  removeCat(e: any) {
    const k = e.currentTarget.dataset.key
    this.setData(
      {
        activeCats: this.data.activeCats.filter((x) => x !== k),
        ['costs.' + k]: 0,
        ['costStrs.' + k]: '',
      },
      () => this.refresh(),
    )
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
        { _k: uid(), type: '运费', amount: 0, amountStr: '', typeIdx: 0 },
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

  // ── 自定义成本项（#5）──
  addCustomCost() {
    // 后端 sanitizeCustomCosts 截断 20 条，前端同口径拦截
    if (this.data.customCosts.length >= 20) {
      wx.showToast({ title: '最多 20 项自定义成本', icon: 'none' })
      return
    }
    this.setData({
      customCosts: [...this.data.customCosts, { _k: uid(), name: '', amount: 0, amountStr: '' }],
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

  // 点击客户行：已选客户 → 编辑其信息（fromOrder=1 让保存后名字同步回订单）；未选 → 打开选择器
  onCustomerTap() {
    if (this.data.customerId) {
      wx.navigateTo({
        url: '/pages/customer-edit/index?id=' + this.data.customerId + '&fromOrder=1',
      })
    } else {
      this.openPicker()
    }
  },

  async openPicker() {
    this.setData({ showPicker: true, pickerQ: '' })
    if (!this.data._allCustomers.length) {
      try {
        const list: any = await customerApi.list()
        this.setData({ _allCustomers: list || [] })
      } catch (e) {
        /* handled */
      }
    }
    this.filterPicker()
  },
  closePicker() {
    this.setData({ showPicker: false })
  },
  noop() {},
  onPickerSearch(e: any) {
    this.setData({ pickerQ: e.detail.value })
    this.filterPicker()
  },
  filterPicker() {
    const q = String(this.data.pickerQ).trim()
    const list = this.data._allCustomers
      .filter((c: any) => !q || (c.name || '').includes(q))
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        initial: (c.name || '·').slice(-1),
        sub: c.count > 0 ? `${c.count} 单 · 累计利润 ${yuan(c.profit)}` : c.phone || '新客户',
      }))
    this.setData({ pickerList: list })
  },
  pickCustomer(e: any) {
    const { id, name } = e.currentTarget.dataset
    this.setData({ customerId: id || null, customerName: name, showPicker: false }, () =>
      this.refresh(),
    )
  },
  newCustomer() {
    this.setData({ showPicker: false })
    wx.navigateTo({
      url:
        '/pages/customer-edit/index?fromOrder=1&name=' +
        encodeURIComponent(this.data.pickerQ || ''),
    })
  },

  onCancel() {
    if (this.data.saving) return // 保存成功后的延时返回期间再点取消会连退两页
    wx.navigateBack()
  },
  async save() {
    if (this.data.saving) return
    if (!this.data.canSave) {
      // 缺必填项时给出具体指引，避免点保存毫无反应
      if (!String(this.data.customerName).trim()) {
        wx.showToast({ title: '请先选择客户', icon: 'none' })
      } else {
        wx.showToast({ title: '请点「报价明细」录入明细或总价', icon: 'none' })
      }
      return
    }
    this.setData({ saving: true })
    const {
      editing,
      id,
      customerId,
      customerName,
      date,
      total,
      received,
      costs,
      activeCats,
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
    activeCats.forEach((k) => {
      payloadCosts[KEYMAP[k]] = costs[k] || 0
    })
    const payload = {
      customerId: customerId || undefined,
      customerName: String(customerName).trim(),
      date,
      total,
      received,
      ...payloadCosts,
      extras: extras.map((e: any) => ({ type: e.type, amount: e.amount })),
      customCosts: customCosts.map((c: any) => ({ name: c.name, amount: c.amount })),
      items,
      discount,
      recycle,
      deposit,
      note,
    }
    try {
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
