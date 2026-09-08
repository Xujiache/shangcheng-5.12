import { MotionPage, navigation } from '../../utils/page-transition'
import { meApi, orderApi, settingApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import {
  getHideAmount,
  hasActiveMembership,
  requireMembership,
  setMembership,
} from '../../utils/store'
import { normalizeCostCategories } from '../../utils/cost-categories'
import { createQuotePdf, renderQuoteImages, shareQuoteFile } from '../../utils/quote-export'

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

MotionPage({
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
    pdfReadyToShare: false,
    pendingPdfPath: '',
    pendingPdfName: '',
    readOnly: !hasActiveMembership(),
  },
  _seq: 0,

  onLoad(opt: any) {
    this.setData({ id: opt.id || '' })
  },
  onShow() {
    this.refreshMembershipMode()
    if (this.data.id) this.load()
  },
  async refreshMembershipMode() {
    try {
      const membership = (await meApi.refreshMembership()) as MembershipStatus
      setMembership(membership)
      this.setData({ readOnly: !hasActiveMembership(membership) })
    } catch (e) {
      // 状态刷新失败不影响当前订单预览。
    }
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
    if (this.data.readOnly) {
      requireMembership('会员已到期，历史订单可以查看和预览，但暂不能修改。')
      return
    }
    navigation.navigateTo({ url: '/pages/order-edit/index?id=' + this.data.id })
  },
  onDelete() {
    if (this._deleted) return
    if (this.data.readOnly) {
      requireMembership('会员已到期，历史订单可以查看和预览，但暂不能删除。')
      return
    }
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
          setTimeout(() => navigation.navigateBack(), 500)
        } catch (e) {
          /* toast handled in request */
        }
      },
    })
  },
  toCustomer() {
    const o = this.data.o
    if (this.data.readOnly) {
      wx.showToast({ title: '只读模式下不可修改客户资料', icon: 'none' })
      return
    }
    // 点击客户直接进编辑客户信息页（返回后 onShow 会重新拉取订单，名字自动刷新）
    if (o && o.customerId)
      navigation.navigateTo({ url: '/pages/customer-edit/index?id=' + o.customerId })
  },
  onShareQuote() {
    if (!this.data.o || this.data.exporting) return
    wx.showActionSheet({
      itemList: ['报价图片（保存相册）', 'PDF转发'],
      success: (result) => this.exportQuote(result.tapIndex),
    })
  },
  async exportQuote(type: number) {
    if (!this.data.o || this.data.exporting) return
    this.setData({ exporting: true, pdfReadyToShare: false })
    const labels = ['生成图片…', '生成 PDF…']
    wx.showLoading({ title: labels[type] || '生成报价单…', mask: true })
    let filePath = ''
    let fileName = ''
    try {
      if (type === 0) {
        const images = await renderQuoteImages(this, '#quoteExport', this.data.o)
        await this.saveQuoteImages(images)
        wx.showToast({
          title: images.length > 1 ? `已保存 ${images.length} 张图片` : '图片已保存',
          icon: 'success',
        })
      } else if (type === 1) {
        filePath = await createQuotePdf(this, '#quoteExport', this.data.o)
        fileName = '正式报价单.pdf'
      }
    } catch (e) {
      console.error('[quote-export]', e)
      wx.showToast({
        title: type === 0 ? '图片生成失败，请重试' : 'PDF 生成失败，请重试',
        icon: 'none',
      })
    } finally {
      wx.hideLoading()
      this.setData({ exporting: false })
    }
    // 官方文件转发必须发生在真实 TAP 事件内，生成完成后交给用户再次点击转发。
    if (filePath && type === 1) {
      this.setData({
        pendingPdfPath: filePath,
        pendingPdfName: fileName,
        pdfReadyToShare: true,
      })
      wx.showToast({ title: 'PDF已生成，请点击转发', icon: 'none' })
    }
  },
  stopPdfShareTap() {},
  cancelPendingPdf() {
    this.setData({ pdfReadyToShare: false, pendingPdfPath: '', pendingPdfName: '' })
  },
  sharePendingPdf() {
    const path = String(this.data.pendingPdfPath || '')
    const fileName = String(this.data.pendingPdfName || '正式报价单.pdf')
    if (!path) return
    if (wx.getSystemInfoSync().platform === 'devtools') {
      this.setData({ pdfReadyToShare: false })
      wx.showModal({
        title: '请使用真机转发',
        content: '微信开发者工具不支持官方文件转发，请用手机微信打开小程序后再次点击“PDF转发”。',
        showCancel: false,
        confirmText: '知道了',
      })
      return
    }
    // 不要在调用前 await、setTimeout 或弹窗，确保 shareFileMessage 仍处于用户 TAP 手势内。
    shareQuoteFile(path, fileName)
      .then(() => {
        this.setData({ pdfReadyToShare: false, pendingPdfPath: '', pendingPdfName: '' })
        wx.showToast({ title: 'PDF已发送', icon: 'success' })
      })
      .catch((e) => {
        console.error('[quote-export] shareFileMessage', e)
        this.setData({ pdfReadyToShare: false })
        wx.showModal({
          title: 'PDF转发失败',
          content: '请使用手机微信真机运行，并点击“立即转发 PDF”完成官方文件转发。',
          showCancel: false,
          confirmText: '知道了',
        })
      })
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
