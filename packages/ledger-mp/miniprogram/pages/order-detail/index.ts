import { orderApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'

const CATS: Array<[string, string, string]> = [
  ['profile', '型材', 'c1'],
  ['glass', '玻璃', 'c2'],
  ['hardware', '配件', 'c3'],
  ['labor', '人工', 'c4'],
  ['screen', '纱窗', 'c5'],
]

// ㎡/数量显示：最多 2 位小数，去尾零（与报价明细页 fmtArea 同口径）
function fmtArea(n: number): string {
  const v = Math.round((Number(n) || 0) * 100) / 100
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

Page({
  data: {
    id: '',
    o: null as any,
    loadError: false,
    donut: [] as any[],
    costRows: [] as any[],
    customCosts: [] as any[],
    extras: [] as any[],
    items: [] as any[],
    quoteRows: [] as any[],
    marginPct: 0,
    profitBare: '0',
    totalText: '¥0',
    costText: '¥0',
    extrasTotalText: '¥0',
  },
  _seq: 0,

  onLoad(opt: any) {
    this.setData({ id: opt.id || '' })
  },
  onShow() {
    if (this.data.id) this.load()
  },

  async load() {
    // 序号守卫：onShow 可连续触发，丢弃过期响应避免旧数据覆盖
    this._seq = (this._seq || 0) + 1
    const seq = this._seq
    if (this.data.loadError) this.setData({ loadError: false })
    try {
      const o: any = await orderApi.get(this.data.id)
      if (seq !== this._seq) return
      // 隐藏金额模式：与客户详情同口径打码金额，比例类（利润率/成本占比/环图）不打码
      const hide = getHideAmount()
      const money = (v: number) => (hide ? maskMoney(v) : yuan(v))
      const cost = o.cost || 1
      const costRows = CATS.map(([k, name, color]) => {
        const v = o.costs ? o.costs[k] || 0 : 0
        return {
          name,
          color,
          value: money(v),
          pct: Math.round((v / cost) * 100),
          w: Math.round((v / cost) * 100),
        }
      })
      // c6 含 其他开销 + 自定义成本，使环图比例与中心「总成本」口径一致
      const customCostsSum =
        o.customCostsTotal != null
          ? o.customCostsTotal
          : (o.customCosts || []).reduce((s: number, c: any) => s + (c.amount || 0), 0)
      const donut = [
        ...CATS.map(([k, , color]) => ({ value: o.costs ? o.costs[k] || 0 : 0, color })),
        { value: (o.extrasTotal || 0) + customCostsSum, color: 'c6' },
      ].filter((d) => d.value > 0)
      const extras = (o.extras || []).map((e: any, idx: number) => ({
        idx,
        type: e.type,
        amountText: money(e.amount),
      }))
      const customCosts = (o.customCosts || []).map((c: any, idx: number) => ({
        idx,
        name: c.name,
        amountText: money(c.amount),
      }))
      // 门窗报价明细（只读展示）：计费量/小计与后端 itemBillingQty/itemSubtotal 同口径
      const items = (o.items || []).map((it: any, idx: number) => {
        const sizes = it.sizes || []
        const billingQty = sizes.length
          ? sizes.reduce(
              (sum: number, s: any) =>
                sum + Math.max(((s.w || 0) * (s.h || 0)) / 1_000_000, it.baseArea || 0),
              0,
            )
          : it.qty || 0
        const subtotal = Math.round(billingQty * (it.unitPrice || 0))
        return {
          idx,
          name: it.name,
          spec: sizes.length
            ? `${sizes.length} 尺寸 · ${fmtArea(billingQty)}㎡`
            : `数量 ${fmtArea(it.qty || 0)}`,
          subtotalText: money(subtotal),
        }
      })
      // 报价金额行：金额(有明细) / 优惠 / 定金 / 收款 / 未收
      const quoteRows: Array<{ label: string; value: string }> = []
      if (items.length) quoteRows.push({ label: '金额（明细合计）', value: money(o.amount || 0) })
      // 优惠仅在有明细时参与计价（后端 orderTotalFromItems 才会减它），无明细不展示以免误读
      if (items.length && (o.discount || 0) > 0)
        quoteRows.push({
          label: '优惠',
          value: hide ? maskMoney(o.discount) : '-' + yuan(o.discount),
        })
      // 收付：定金/收款任一非空即展示这组（未收 = 总价 − 定金 − 收款，由后端给出）
      if ((o.deposit || 0) > 0 || (o.received || 0) > 0) {
        if ((o.deposit || 0) > 0) quoteRows.push({ label: '定金', value: money(o.deposit) })
        if ((o.received || 0) > 0) quoteRows.push({ label: '收款', value: money(o.received) })
        quoteRows.push({ label: '未收', value: money(o.unpaid || 0) })
      }
      this.setData({
        o,
        donut,
        costRows,
        customCosts,
        extras,
        items,
        quoteRows,
        marginPct: Math.round((o.margin || 0) * 100),
        profitBare: hide ? maskMoney(o.profit) : yuan(o.profit, true),
        totalText: money(o.total),
        costText: money(o.cost),
        extrasTotalText: money(o.extrasTotal || 0),
      })
    } catch (e) {
      if (seq !== this._seq) return
      // 加载失败单独成态（带重试），避免停留在空白页
      this.setData({ loadError: true })
    }
  },

  _deleted: false, // 删除成功后的 500ms 延时返回窗口内，拦住 编辑/再删 误点

  toEdit() {
    if (this._deleted) return
    wx.navigateTo({ url: '/pages/order-edit/index?id=' + this.data.id })
  },
  onDelete() {
    if (this._deleted) return
    wx.showModal({
      title: '删除订单',
      content: '删除后不可恢复，确定删除这笔订单？',
      confirmText: '删除',
      confirmColor: '#C8442B',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await orderApi.remove(this.data.id)
          this._deleted = true
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (e) {
          /* toast handled in request */
        }
      },
    })
  },
  toCustomer() {
    const o = this.data.o
    // 点击客户直接进编辑客户信息页（返回后 onShow 会重新拉取订单，名字自动刷新）
    if (o && o.customerId) wx.navigateTo({ url: '/pages/customer-edit/index?id=' + o.customerId })
  },
})
