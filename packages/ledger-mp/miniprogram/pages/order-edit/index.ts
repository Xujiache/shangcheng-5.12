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

Page({
  data: {
    editing: false,
    id: '',
    customerId: null as string | null,
    customerName: '',
    date: today(),
    total: 0,
    totalStr: '',
    extraIncome: 0,
    extraIncomeStr: '',
    costs: { profile: 0, glass: 0, hardware: 0, labor: 0, screen: 0 } as any,
    activeCats: [...CORE] as string[],
    activeCells: [] as any[],
    removedCats: [] as any[],
    extras: [] as any[],
    customCosts: [] as any[],
    note: '',
    profitText: '¥0',
    profitNeg: false,
    marginPct: '0.0',
    canSave: false,
    saving: false,
    showPicker: false,
    pickerList: [] as any[],
    pickerQ: '',
    extraTypes: EXTRA_TYPES,
    _allCustomers: [] as any[],
  },

  onLoad(opt: any) {
    if (opt.id) {
      this.setData({ editing: true, id: opt.id })
      this.loadOrder()
    } else {
      if (opt.prefillCustomer)
        this.setData({ customerName: decodeURIComponent(opt.prefillCustomer) })
      this.refresh()
    }
  },
  onShow() {
    const p = wx.getStorageSync('ledger_pending_customer')
    if (p && p.name) {
      wx.removeStorageSync('ledger_pending_customer')
      this.setData({ customerId: p.id || null, customerName: p.name, showPicker: false }, () =>
        this.refresh(),
      )
    }
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
          totalStr: o.total ? String(o.total) : '',
          extraIncome: o.extraIncome || 0,
          extraIncomeStr: o.extraIncome ? String(o.extraIncome) : '',
          costs: {
            profile: o.costs.profile,
            glass: o.costs.glass,
            hardware: o.costs.hardware,
            labor: o.costs.labor,
            screen: o.costs.screen,
          },
          activeCats: active.length ? active : [...CORE],
          extras: (o.extras || []).map((e: any) => ({
            type: e.type,
            amount: e.amount,
            amountStr: e.amount ? String(e.amount) : '',
            typeIdx: Math.max(0, EXTRA_TYPES.indexOf(e.type)),
          })),
          customCosts: (o.customCosts || []).map((c: any) => ({
            name: c.name,
            amount: c.amount,
            amountStr: c.amount ? String(c.amount) : '',
          })),
          note: o.note || '',
        },
        () => this.refresh(),
      )
    } catch (e) {
      /* handled */
    }
  },

  refresh() {
    const { costs, activeCats, extras, total, extraIncome, customCosts } = this.data
    const activeCells = COST_CATS.filter((c) => activeCats.includes(c.key)).map((c) => ({
      key: c.key,
      name: c.name,
      color: c.color,
      valueStr: costs[c.key] ? String(costs[c.key]) : '',
    }))
    const removedCats = COST_CATS.filter((c) => !activeCats.includes(c.key)).map((c) => ({
      key: c.key,
      name: c.name,
      color: c.color,
    }))
    const profit = profitOf(total, costs, extras, extraIncome, customCosts)
    const margin = marginOf(total, costs, extras, extraIncome, customCosts)
    this.setData({
      activeCells,
      removedCats,
      profitText: yuan(profit),
      profitNeg: profit < 0,
      marginPct: (margin * 100).toFixed(1),
      canSave: !!String(this.data.customerName).trim() && total > 0,
    })
  },

  onTotal(e: any) {
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    this.setData({ total: v, totalStr: e.detail.value }, () => this.refresh())
  },
  onExtraIncome(e: any) {
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    this.setData({ extraIncome: v, extraIncomeStr: e.detail.value }, () => this.refresh())
  },
  onCost(e: any) {
    const k = e.currentTarget.dataset.key
    const v = Math.max(0, Math.round(Number(e.detail.value) || 0))
    this.setData({ ['costs.' + k]: v }, () => this.refresh())
  },
  onDate(e: any) {
    this.setData({ date: e.detail.value })
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
      { activeCats: this.data.activeCats.filter((x) => x !== k), ['costs.' + k]: 0 },
      () => this.refresh(),
    )
  },
  addExtra() {
    this.setData({
      extras: [...this.data.extras, { type: '运费', amount: 0, amountStr: '', typeIdx: 0 }],
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
  delExtra(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    this.setData({ extras: this.data.extras.filter((_: any, j: number) => j !== i) }, () =>
      this.refresh(),
    )
  },

  // ── 自定义成本项（#5）──
  addCustomCost() {
    this.setData({
      customCosts: [...this.data.customCosts, { name: '', amount: 0, amountStr: '' }],
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
  delCustomCost(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    this.setData(
      { customCosts: this.data.customCosts.filter((_: any, j: number) => j !== i) },
      () => this.refresh(),
    )
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
    wx.navigateBack()
  },
  async save() {
    if (!this.data.canSave || this.data.saving) return
    this.setData({ saving: true })
    const {
      editing,
      id,
      customerId,
      customerName,
      date,
      total,
      extraIncome,
      costs,
      activeCats,
      extras,
      customCosts,
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
      extraIncome,
      ...payloadCosts,
      extras: extras.map((e: any) => ({ type: e.type, amount: e.amount })),
      customCosts: customCosts.map((c: any) => ({ name: c.name, amount: c.amount })),
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
