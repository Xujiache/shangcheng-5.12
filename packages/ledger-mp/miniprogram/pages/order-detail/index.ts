import { orderApi, settingApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'
import { normalizeCostCategories } from '../../utils/cost-categories'
import {
  createQuotePdf,
  createQuoteSheet,
  renderQuoteImages,
  shareOrOpenFile,
  showQuoteImageShare,
} from '../../utils/quote-export'

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
    exporting: false,
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
      const [o, settings]: [any, any] = await Promise.all([
        orderApi.get(this.data.id),
        settingApi.get().catch(() => null),
      ])
      if (seq !== this._seq) return
      // 隐藏金额模式：与客户详情同口径打码金额，比例类（利润率/成本占比/环图）不打码
      const hide = getHideAmount()
      const money = (v: number) => (hide ? maskMoney(v) : yuan(v))
      const cost = o.cost || 1
      const categoryMap = new Map(
        normalizeCostCategories(settings?.costCategories).map((item) => [item.id, item]),
      )
      const legacyCostRows = CATS.map(([k, defaultName, defaultColor]) => {
        const v = o.costs ? o.costs[k] || 0 : 0
        const configured = categoryMap.get(k)
        return {
          name: configured?.name || defaultName,
          color: configured?.color || defaultColor,
          rawValue: v,
          value: money(v),
          pct: Math.round((v / cost) * 100),
          w: Math.round((v / cost) * 100),
        }
      }).filter((row) => row.rawValue > 0)
      const customCostRows = (o.customCosts || []).map((item: any, index: number) => {
        const value = Math.max(0, Math.round(Number(item.amount) || 0))
        const color = /^c[1-6]$/.test(String(item.color || '')) ? item.color : `c${(index % 6) + 1}`
        return {
          name: item.name,
          color,
          rawValue: value,
          value: money(value),
          pct: Math.round((value / cost) * 100),
          w: Math.round((value / cost) * 100),
        }
      })
      const costRows = [...legacyCostRows, ...customCostRows]
      const donut = costRows
        .map((row) => ({ value: row.rawValue, color: row.color }))
        .filter((item) => item.value > 0)
      const extras = (o.extras || []).map((e: any, idx: number) => ({
        idx,
        type: e.type,
        amountText: money(e.amount),
      }))
      // 门窗报价明细（只读展示）：计费量/小计与后端 itemBillingQty/itemSubtotal 同口径
      const items = (o.items || []).map((it: any, idx: number) => {
        const sizes = it.sizes || []
        const billingQty = sizes.length
          ? sizes.reduce(
              (sum: number, s: any) =>
                sum +
                Math.max(((s.w || 0) * (s.h || 0)) / 1_000_000, it.baseArea || 0) *
                  Math.max(1, Math.round(Number(s.count) || 1)),
              0,
            )
          : it.qty || 0
        // 小计改写优先（与后端 itemSubtotal 同口径），否则 计费量×单价
        const subtotal =
          it.subtotal != null
            ? Math.max(0, Math.round(it.subtotal))
            : Math.round(billingQty * (it.unitPrice || 0))
        return {
          idx,
          name: it.name || `产品${idx + 1}`, // 名称非强制，未填则按序号占位，避免空行
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
      if (items.length && (o.recycle || 0) > 0)
        quoteRows.push({
          label: '回收',
          value: hide ? maskMoney(o.recycle) : '-' + yuan(o.recycle),
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
        customCosts: [],
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
  onShareQuote() {
    if (!this.data.o || this.data.exporting) return
    wx.showActionSheet({
      itemList: ['客户展示图片', '正式 PDF 报价', 'Excel 明细报价'],
      success: (result) => this.exportQuote(result.tapIndex),
    })
  },
  async exportQuote(type: number) {
    if (!this.data.o || this.data.exporting) return
    this.setData({ exporting: true })
    const labels = ['生成客户展示图…', '生成正式 PDF…', '生成 Excel 工作簿…']
    wx.showLoading({ title: labels[type] || '生成报价单…', mask: true })
    let filePath = ''
    let fileName = ''
    try {
      if (type === 0) {
        const images = await renderQuoteImages(this, '#quoteExport', this.data.o)
        if (images.length === 1) {
          const shared = await showQuoteImageShare(images[0]).catch(() => false)
          if (!shared) await this.saveQuoteImages(images)
        } else {
          await this.saveQuoteImages(images)
          wx.showToast({ title: `明细较多，已保存 ${images.length} 张图片`, icon: 'none' })
        }
      } else if (type === 1) {
        filePath = await createQuotePdf(this, '#quoteExport', this.data.o)
        fileName = '正式报价单.pdf'
      } else {
        filePath = await createQuoteSheet(this.data.o)
        fileName = '客户报价明细.xlsx'
      }
    } catch (e) {
      wx.showToast({
        title: type === 2 ? 'Excel 生成失败，请重试' : '报价单生成失败，请重试',
        icon: 'none',
      })
    } finally {
      wx.hideLoading()
      this.setData({ exporting: false })
    }
    // 生成与分享拆开：文件已经生成时，开发者工具不支持分享也不再误报为“生成失败”。
    if (!filePath) return
    try {
      await shareOrOpenFile(filePath, fileName)
    } catch (e) {
      wx.showModal({
        title: '文件已生成',
        content: '当前环境暂不支持直接分享。请使用真机打开后，从文件预览页右上角转发给客户。',
        showCancel: false,
        confirmText: '知道了',
      })
    }
  },
  saveQuoteImages(paths: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const save = async () => {
        try {
          for (const path of paths) {
            await new Promise<void>((ok, fail) =>
              wx.saveImageToPhotosAlbum({ filePath: path, success: () => ok(), fail }),
            )
          }
          resolve()
        } catch (e) {
          reject(e)
        }
      }
      wx.getSetting({
        success: (setting) => {
          if (setting.authSetting['scope.writePhotosAlbum']) return save()
          if (setting.authSetting['scope.writePhotosAlbum'] === false) {
            wx.showModal({
              title: '需要相册权限',
              content: '保存报价单图片需开启相册权限。',
              confirmText: '去设置',
              success: (result) => {
                if (result.confirm) wx.openSetting({ success: () => save(), fail: reject })
                else reject(new Error('album permission denied'))
              },
            })
            return
          }
          wx.authorize({ scope: 'scope.writePhotosAlbum', success: save, fail: reject })
        },
        fail: reject,
      })
    })
  },
})
