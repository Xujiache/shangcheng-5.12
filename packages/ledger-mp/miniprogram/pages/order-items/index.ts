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
// 列表行 wx:key 用的页内唯一键（仅前端用，writeBack 重建对象时不带出）
let seq = 0
const uid = () => 'k' + ++seq
function blankNote() {
  return { _k: uid(), text: '' }
}
function blankSize() {
  return { _k: uid(), wStr: '', hStr: '', notes: [] as any[], areaText: '' }
}
function blankItem() {
  return {
    _k: uid(),
    name: '',
    note: '',
    baseAreaStr: '',
    unitPriceStr: '',
    qtyStr: '',
    subtotalStr: '', // 手动改写的小计（空 = 按 计费量×单价 自动算）
    sizes: [] as any[],
  }
}
// 尺寸备注 后端形态（notes 数组 / 旧单 note 单串）→ 页面编辑态 [{_k,text}]
function normSizeNotes(s: any): any[] {
  const raw = Array.isArray(s?.notes) ? s.notes : s?.note ? [s.note] : []
  return raw
    .map((t: any) => String(t || '').trim())
    .filter((t: string) => t)
    .map((t: string) => ({ _k: uid(), text: t }))
}
// 从后端 item 形态 → 页面编辑态
function normIn(it: any) {
  return {
    _k: uid(),
    name: it.name || '',
    note: it.note || '',
    baseAreaStr: it.baseArea ? String(it.baseArea) : '',
    unitPriceStr: it.unitPrice ? String(it.unitPrice) : '',
    qtyStr: it.qty ? String(it.qty) : '',
    // 小计改写：后端回传 number|null，非空即视为手动改写（含 0）
    subtotalStr: it.subtotal !== null && it.subtotal !== undefined ? String(it.subtotal) : '',
    sizes: Array.isArray(it.sizes)
      ? it.sizes.map((s: any) => ({
          _k: uid(),
          wStr: s.w ? String(s.w) : '',
          hStr: s.h ? String(s.h) : '',
          notes: normSizeNotes(s),
          areaText: '',
        }))
      : [],
  }
}
// 整数元输入失焦归一：非空 → 取整后的字符串，空串保持为空
function normMoneyStr(v: any): string {
  const s = String(v == null ? '' : v).trim()
  return s ? String(Math.round(num(s))) : ''
}

Page({
  data: {
    items: [] as any[],
    discountStr: '',
    depositStr: '',
    receivedStr: '',
    note: '',
    amountText: '¥0',
    totalText: '¥0',
    unpaidText: '¥0',
    depositOver: false,
  },
  // 进入时的订单总价：无具名明细时沿用此值（对齐后端「无 items 则取 dto.total」），防止清零
  _manualTotal: 0,
  _navigating: false,

  onLoad() {
    const inp: any = wx.getStorageSync(IN_KEY) || {}
    try {
      wx.removeStorageSync(IN_KEY)
    } catch (e) {
      /* ignore */
    }
    this._manualTotal = Math.max(0, Math.round(Number(inp.total) || 0))
    const items = Array.isArray(inp.items) ? inp.items.map(normIn) : []
    this.setData(
      {
        items,
        discountStr: inp.discount ? String(inp.discount) : '',
        depositStr: inp.deposit ? String(inp.deposit) : '',
        receivedStr: inp.received ? String(inp.received) : '',
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
    // 后端 sanitizeOrderItems 截断 100 条，前端同口径拦截
    if (this.data.items.length >= 100) {
      wx.showToast({ title: '最多 100 项明细', icon: 'none' })
      return
    }
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
    // 后端每项尺寸截断 100 条，前端同口径拦截
    if (items[i].sizes.length >= 100) {
      wx.showToast({ title: '最多 100 条尺寸', icon: 'none' })
      return
    }
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

  // ── 尺寸备注（每条独立、可删、可加任意多条；备注不参与计价，不触发 recalc）──
  addNote(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const si = Number(e.currentTarget.dataset.sidx)
    const items = this.data.items.slice()
    const sizes = items[i].sizes.slice()
    // 备注无业务上限，仅设 50 条防误触膨胀（与后端 sanitizeSizeNotes 同口径）
    if ((sizes[si].notes || []).length >= 50) {
      wx.showToast({ title: '最多 50 条备注', icon: 'none' })
      return
    }
    sizes[si] = { ...sizes[si], notes: [...(sizes[si].notes || []), blankNote()] }
    items[i] = { ...items[i], sizes }
    this.setData({ items })
  },
  delNote(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const si = Number(e.currentTarget.dataset.sidx)
    const ni = Number(e.currentTarget.dataset.nidx)
    const items = this.data.items.slice()
    const sizes = items[i].sizes.slice()
    sizes[si] = {
      ...sizes[si],
      notes: (sizes[si].notes || []).filter((_: any, j: number) => j !== ni),
    }
    items[i] = { ...items[i], sizes }
    this.setData({ items })
  },
  onNoteInput(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const si = Number(e.currentTarget.dataset.sidx)
    const ni = Number(e.currentTarget.dataset.nidx)
    const items = this.data.items.slice()
    const sizes = items[i].sizes.slice()
    const notes = (sizes[si].notes || []).slice()
    notes[ni] = { ...notes[ni], text: e.detail.value }
    sizes[si] = { ...sizes[si], notes }
    items[i] = { ...items[i], sizes }
    this.setData({ items })
  },

  onDiscount(e: any) {
    this.setData({ discountStr: e.detail.value }, () => this.recalc())
  },
  onDeposit(e: any) {
    this.setData({ depositStr: e.detail.value }, () => this.recalc())
  },
  onReceived(e: any) {
    this.setData({ receivedStr: e.detail.value }, () => this.recalc())
  },
  // 整数元字段（优惠/定金/收款）失焦归一显示，输入中不回写避免光标跳动
  onMoneyBlur(e: any) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: normMoneyStr(e.detail.value) })
  },
  // 单价为整数元，失焦归一；数量/起算面积允许小数，不归一
  onPriceBlur(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const items = this.data.items.slice()
    if (!items[i]) return // 行已删除后迟到的 blur，忽略，避免造出幽灵行
    items[i] = { ...items[i], unitPriceStr: normMoneyStr(e.detail.value) }
    this.setData({ items })
  },
  // 小计为整数元，失焦归一显示（空保持空=回落自动算）；recalc 同步金额/总价
  onSubtotalBlur(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const items = this.data.items.slice()
    if (!items[i]) return
    items[i] = { ...items[i], subtotalStr: normMoneyStr(e.detail.value) }
    this.setData({ items }, () => this.recalc())
  },
  onNote(e: any) {
    this.setData({ note: e.detail.value })
  },

  // ── 实时重算 ──
  recalc() {
    let amount = 0
    let contentCount = 0 // 有内容的行（名称/尺寸/数量/单价任一）
    const items = this.data.items.map((it: any) => {
      const baseArea = num(it.baseAreaStr)
      const unitPrice = Math.round(num(it.unitPriceStr))
      const sizes = it.sizes.map((s: any) => {
        const w = num(s.wStr)
        const h = num(s.hStr)
        const filled = w > 0 && h > 0
        const raw = filled ? (w * h) / 1_000_000 : 0
        const area = filled ? Math.max(raw, baseArea) : 0
        // 实量面积小于起算面积时按起算计，行内标记「(起算)」说明显示值与宽×高不一致的原因
        return { ...s, areaText: filled ? fmtArea(area) : '', clamped: filled && raw < baseArea }
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
      const autoSubtotal = Math.round(billQty * unitPrice)
      // 小计手动改写：subtotalStr 非空即覆盖自动值（含 0）；空则用 计费量×单价
      const hasOverride = String(it.subtotalStr || '').trim() !== ''
      const subtotal = hasOverride ? Math.max(0, Math.round(num(it.subtotalStr))) : autoSubtotal
      // 名称非强制：有 名称/尺寸/数量/单价/小计 任一即为有效明细，小计一律计入金额（与 writeBack/后端同口径）
      const hasContent =
        !!String(it.name || '').trim() ||
        hasSizes ||
        num(it.qtyStr) > 0 ||
        unitPrice > 0 ||
        hasOverride
      if (hasContent) contentCount++
      amount += subtotal
      return {
        ...it,
        sizes,
        hasSizes,
        qtyAutoText: fmtArea(billQty),
        // 占位显示自动算的小计；改写后若与自动值不同且自动值>0，给「自动 ¥X」对照提示
        subtotalAuto: String(autoSubtotal),
        subtotalHint:
          hasOverride && autoSubtotal > 0 && subtotal !== autoSubtotal
            ? '自动 ' + yuan(autoSubtotal)
            : '',
      }
    })
    const discount = Math.round(num(this.data.discountStr))
    const deposit = Math.round(num(this.data.depositStr))
    const received = Math.round(num(this.data.receivedStr))
    // 与后端一致：有明细时 总价=金额−优惠；无明细则沿用进入时的总价
    const total = contentCount > 0 ? Math.max(0, amount - discount) : this._manualTotal
    // 未收 = 总价 − 定金 − 收款（与后端 mapOrder 同口径）
    const unpaid = Math.max(0, total - deposit - received)
    this.setData({
      items,
      depositOver: deposit + received > total,
      amountText: yuan(amount),
      totalText: yuan(total),
      unpaidText: yuan(unpaid),
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
        // 小计改写：非空回传整数（含 0），空回传 null（后端据此决定是否覆盖）
        subtotal: String(it.subtotalStr || '').trim()
          ? Math.max(0, Math.round(num(it.subtotalStr)))
          : null,
        sizes: it.sizes
          .map((s: any) => ({
            w: Math.round(num(s.wStr)),
            h: Math.round(num(s.hStr)),
            notes: (s.notes || [])
              .map((n: any) => String(n.text || '').trim())
              .filter((t: string) => t),
          }))
          .filter((s: any) => s.w > 0 && s.h > 0),
      }))
      // 名称非强制：保留有 名称/尺寸/数量/单价/小计 任一的明细（仅丢纯空行），与 recalc/后端同口径
      .filter(
        (it: any) =>
          it.name || it.sizes.length > 0 || it.qty > 0 || it.unitPrice > 0 || it.subtotal != null,
      )
    let amount = 0
    items.forEach((it: any) => {
      // 小计改写优先（与后端 itemSubtotal 同口径）
      if (it.subtotal != null) {
        amount += it.subtotal
        return
      }
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
    const received = Math.round(num(this.data.receivedStr))
    // 与后端一致：有明细才用 金额−优惠，否则原样保留进入时的总价（防止误清零）
    const total = items.length ? Math.max(0, amount - discount) : this._manualTotal
    wx.setStorageSync(OUT_KEY, {
      items,
      discount,
      deposit,
      received,
      total,
      note: this.data.note,
    })
  },

  save() {
    if (this._navigating) return // 防快速连点触发两次 navigateBack
    this._navigating = true
    this.writeBack()
    wx.navigateBack()
  },
})
