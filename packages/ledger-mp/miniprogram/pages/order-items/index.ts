import { yuan } from '../../utils/format'

// 与后端 ledger.constants 同口径的门窗报价计算（mm→㎡，单条尺寸按起算面积兜底）
const IN_KEY = 'ledger_order_money_in'
const OUT_KEY = 'ledger_order_money_out'

function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}
function fmtArea(n: number): string {
  const v = Math.round((Number(n) || 0) * 100) / 100
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
function blankSize() {
  return { wStr: '', hStr: '', note: '', areaText: '' }
}
function blankItem() {
  return { name: '', note: '', baseAreaStr: '', unitPriceStr: '', qtyStr: '', sizes: [] as any[] }
}
// 从后端 item 形态 → 页面编辑态
function normIn(it: any) {
  return {
    name: it.name || '',
    note: it.note || '',
    baseAreaStr: it.baseArea ? String(it.baseArea) : '',
    unitPriceStr: it.unitPrice ? String(it.unitPrice) : '',
    qtyStr: it.qty ? String(it.qty) : '',
    sizes: Array.isArray(it.sizes)
      ? it.sizes.map((s: any) => ({
          wStr: s.w ? String(s.w) : '',
          hStr: s.h ? String(s.h) : '',
          note: s.note || '',
          areaText: '',
        }))
      : [],
  }
}

Page({
  data: {
    items: [] as any[],
    discountStr: '',
    depositStr: '',
    extraIncomeStr: '',
    note: '',
    amountText: '¥0',
    totalText: '¥0',
    unpaidText: '¥0',
    revenueText: '¥0',
  },

  onLoad() {
    const inp: any = wx.getStorageSync(IN_KEY) || {}
    try {
      wx.removeStorageSync(IN_KEY)
    } catch (e) {
      /* ignore */
    }
    const items = Array.isArray(inp.items) ? inp.items.map(normIn) : []
    this.setData(
      {
        items,
        discountStr: inp.discount ? String(inp.discount) : '',
        depositStr: inp.deposit ? String(inp.deposit) : '',
        extraIncomeStr: inp.extraIncome ? String(inp.extraIncome) : '',
        note: inp.note || '',
      },
      () => this.recalc(),
    )
  },

  onUnload() {
    // 退出即自动保存（写回订单编辑页）
    this.writeBack()
  },

  // ── 产品项 ──
  addItem() {
    this.setData({ items: [blankItem(), ...this.data.items] }, () => this.recalc())
  },
  delItem(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    this.setData({ items: this.data.items.filter((_: any, j: number) => j !== i) }, () =>
      this.recalc(),
    )
  },
  onItemInput(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const field = e.currentTarget.dataset.field
    const items = this.data.items.slice()
    items[i] = { ...items[i], [field]: e.detail.value }
    this.setData({ items }, () => this.recalc())
  },

  // ── 尺寸 ──
  addSize(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const items = this.data.items.slice()
    items[i] = { ...items[i], sizes: [...items[i].sizes, blankSize()] }
    this.setData({ items }, () => this.recalc())
  },
  delSize(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const si = Number(e.currentTarget.dataset.sidx)
    const items = this.data.items.slice()
    items[i] = { ...items[i], sizes: items[i].sizes.filter((_: any, j: number) => j !== si) }
    this.setData({ items }, () => this.recalc())
  },
  onSizeInput(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const si = Number(e.currentTarget.dataset.sidx)
    const field = e.currentTarget.dataset.field
    const items = this.data.items.slice()
    const sizes = items[i].sizes.slice()
    sizes[si] = { ...sizes[si], [field]: e.detail.value }
    items[i] = { ...items[i], sizes }
    this.setData({ items }, () => this.recalc())
  },

  onDiscount(e: any) {
    this.setData({ discountStr: e.detail.value }, () => this.recalc())
  },
  onDeposit(e: any) {
    this.setData({ depositStr: e.detail.value }, () => this.recalc())
  },
  onExtra(e: any) {
    this.setData({ extraIncomeStr: e.detail.value }, () => this.recalc())
  },
  onNote(e: any) {
    this.setData({ note: e.detail.value })
  },

  // ── 实时重算 ──
  recalc() {
    let amount = 0
    const items = this.data.items.map((it: any) => {
      const baseArea = num(it.baseAreaStr)
      const unitPrice = Math.round(num(it.unitPriceStr))
      const sizes = it.sizes.map((s: any) => {
        const w = num(s.wStr)
        const h = num(s.hStr)
        const area = w > 0 && h > 0 ? Math.max((w * h) / 1_000_000, baseArea) : 0
        return { ...s, areaText: w > 0 && h > 0 ? fmtArea(area) : '' }
      })
      const valid = sizes.filter((s: any) => num(s.wStr) > 0 && num(s.hStr) > 0)
      const hasSizes = valid.length > 0
      const billQty = hasSizes
        ? valid.reduce(
            (sum: number, s: any) =>
              sum + Math.max((num(s.wStr) * num(s.hStr)) / 1_000_000, baseArea),
            0,
          )
        : num(it.qtyStr)
      const subtotal = Math.round(billQty * unitPrice)
      amount += subtotal
      return {
        ...it,
        sizes,
        hasSizes,
        qtyAutoText: fmtArea(billQty),
        subtotalText: yuan(subtotal),
      }
    })
    const discount = Math.round(num(this.data.discountStr))
    const deposit = Math.round(num(this.data.depositStr))
    const extra = Math.round(num(this.data.extraIncomeStr))
    const total = Math.max(0, amount - discount)
    const unpaid = Math.max(0, total - deposit)
    this.setData({
      items,
      amountText: yuan(amount),
      totalText: yuan(total),
      unpaidText: yuan(unpaid),
      revenueText: yuan(total + extra),
    })
  },

  // ── 写回订单编辑页 ──
  writeBack() {
    const items = this.data.items
      .map((it: any) => ({
        name: String(it.name || '').trim(),
        note: String(it.note || '').trim(),
        baseArea: num(it.baseAreaStr),
        unitPrice: Math.round(num(it.unitPriceStr)),
        qty: num(it.qtyStr),
        sizes: it.sizes
          .map((s: any) => ({
            w: Math.round(num(s.wStr)),
            h: Math.round(num(s.hStr)),
            note: String(s.note || '').trim(),
          }))
          .filter((s: any) => s.w > 0 && s.h > 0),
      }))
      .filter((it: any) => it.name)
    let amount = 0
    items.forEach((it: any) => {
      const bq = it.sizes.length
        ? it.sizes.reduce(
            (sum: number, s: any) => sum + Math.max((s.w * s.h) / 1_000_000, it.baseArea),
            0,
          )
        : it.qty
      amount += Math.round(bq * it.unitPrice)
    })
    const discount = Math.round(num(this.data.discountStr))
    const deposit = Math.round(num(this.data.depositStr))
    const extraIncome = Math.round(num(this.data.extraIncomeStr))
    const total = Math.max(0, amount - discount)
    wx.setStorageSync(OUT_KEY, {
      items,
      discount,
      deposit,
      extraIncome,
      total,
      note: this.data.note,
    })
  },

  save() {
    this.writeBack()
    wx.navigateBack()
  },
})
