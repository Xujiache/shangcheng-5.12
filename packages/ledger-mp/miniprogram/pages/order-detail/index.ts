import { orderApi } from '../../api/index'
import { yuan } from '../../utils/format'

const CATS: Array<[string, string, string]> = [
  ['profile', '型材', 'c1'],
  ['glass', '玻璃', 'c2'],
  ['hardware', '配件', 'c3'],
  ['labor', '人工', 'c4'],
  ['screen', '纱窗', 'c5'],
]

Page({
  data: {
    id: '',
    o: null as any,
    donut: [] as any[],
    costRows: [] as any[],
    extras: [] as any[],
    marginPct: 0,
    profitBare: '0',
    totalText: '¥0',
    costText: '¥0',
    extrasTotalText: '¥0',
    extraIncomeText: '¥0',
    hasExtraIncome: false,
  },

  onLoad(opt: any) {
    this.setData({ id: opt.id || '' })
  },
  onShow() {
    if (this.data.id) this.load()
  },

  async load() {
    try {
      const o: any = await orderApi.get(this.data.id)
      const cost = o.cost || 1
      const costRows = CATS.map(([k, name, color]) => {
        const v = o.costs ? o.costs[k] || 0 : 0
        return {
          name,
          color,
          value: yuan(v),
          pct: Math.round((v / cost) * 100),
          w: Math.round((v / cost) * 100),
        }
      })
      const donut = [
        ...CATS.map(([k, , color]) => ({ value: o.costs ? o.costs[k] || 0 : 0, color })),
        { value: o.extrasTotal || 0, color: 'c6' },
      ].filter((d) => d.value > 0)
      const extras = (o.extras || []).map((e: any) => ({
        type: e.type,
        amountText: yuan(e.amount),
      }))
      this.setData({
        o,
        donut,
        costRows,
        extras,
        marginPct: Math.round((o.margin || 0) * 100),
        profitBare: yuan(o.profit, true),
        totalText: yuan(o.total),
        costText: yuan(o.cost),
        extrasTotalText: yuan(o.extrasTotal || 0),
        extraIncomeText: yuan(o.extraIncome || 0),
        hasExtraIncome: (o.extraIncome || 0) > 0,
      })
    } catch (e) {
      /* handled */
    }
  },

  toEdit() {
    wx.navigateTo({ url: '/pages/order-edit/index?id=' + this.data.id })
  },
  onDelete() {
    wx.showModal({
      title: '删除订单',
      content: '删除后不可恢复，确定删除这笔订单？',
      confirmText: '删除',
      confirmColor: '#C8442B',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await orderApi.remove(this.data.id)
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
    if (o && o.customerId) wx.navigateTo({ url: '/pages/customer-detail/index?id=' + o.customerId })
  },
})
