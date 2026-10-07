import { MotionPage, navigation } from '../../../utils/page-transition'
import { request } from '../../../utils/request'
import { requireLogin, requireMembership } from '../../../utils/store'
import { shareQuoteFile } from '../utils/quote-export'
import { calculateMetal, describeMetalInput, fmt } from '../utils/calc'
import { MATERIAL_BY_ID } from '../data/materials'
import {
  metalCsv,
  MetalQuoteDraftItem,
  readMetalQuoteDraft,
  writeMetalQuoteDraft,
} from '../utils/quote'

interface QuoteLine extends MetalQuoteDraftItem {
  tonPriceFen?: number
  weightKg: number
  amountFen: number
}
interface SavedQuote {
  id: string
  title: string
  items: QuoteLine[]
  totalWeightKg: number
  totalAmountFen: number
  createdAt: string
}
type DisplayRow = {
  index: number
  material: string
  spec: string
  weight: string
  amount: string
  tonPrice: string
  factor: string
  fee: string
}
const specText = (item: MetalQuoteDraftItem) =>
  describeMetalInput({ materialId: item.materialId, dimensions: item.spec })
const titleOf = (id: string) => MATERIAL_BY_ID.get(id)?.label || id
const display = (items: QuoteLine[]): DisplayRow[] =>
  items.map((item, index) => ({
    index,
    material: titleOf(item.materialId),
    spec: specText(item),
    weight: fmt(item.weightKg, 3),
    amount: fmt(item.amountFen / 100, 2),
    tonPrice: fmt((item.tonPriceFen || 0) / 100, 0),
    factor: fmt(item.quoteFactor, 2),
    fee: fmt(item.processingFeeFen / 100, 2),
  }))
function wrapText(ctx: any, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const character of text) {
    if (line && ctx.measureText(line + character).width > width) {
      lines.push(line)
      line = ''
    }
    line += character
  }
  if (line) lines.push(line)
  return lines
}

MotionPage({
  _config: null as { prices: Record<string, number> } | null,
  _saved: null as SavedQuote | null,
  _quotes: [] as SavedQuote[],
  _draftTitle: '',
  _loadingQuotes: false,
  _draft: [] as MetalQuoteDraftItem[],
  data: {
    title: '',
    view: 'draft',
    rows: [] as DisplayRow[],
    saved: [] as Array<{
      id: string
      title: string
      date: string
      amount: string
      weight: string
      lineCount: number
    }>,
    totalWeight: '0.000',
    totalAmount: '0.00',
    csvPath: '',
    imagePath: '',
    busy: false,
    hasMore: false,
    savedDate: '',
    loadingQuotes: false,
    quotesError: false,
    keyboardRaised: false,
  },
  onShow() {
    if (!requireLogin('登录后可使用报价单。')) return
    this.showDraft()
    this.loadConfig()
    this.loadQuotes()
  },
  async loadConfig() {
    try {
      this._config = await request({ url: '/l/tools/metal/config', auth: false, silent: true })
      if (this.data.view === 'draft') this.showDraft()
    } catch {
      /* 离线仍可查看本机草稿；保存时以服务端价格重算。 */
    }
  },
  async loadQuotes(reset = true) {
    if (this._loadingQuotes) return
    this._loadingQuotes = true
    this.setData({ loadingQuotes: true, quotesError: false })
    try {
      const quotes = await request<SavedQuote[]>({
        url: '/l/tools/metal/quotes',
        params: { skip: reset ? 0 : this._quotes.length, take: 50 },
        silent: true,
      })
      this._quotes = reset ? quotes : [...this._quotes, ...quotes]
      this.setData({
        hasMore: quotes.length === 50,
        saved: this._quotes.map((quote) => ({
          id: quote.id,
          title: quote.title,
          date: quote.createdAt.slice(0, 10),
          amount: fmt(quote.totalAmountFen / 100, 2),
          weight: fmt(quote.totalWeightKg, 3),
          lineCount: quote.items.length,
        })),
      })
    } catch {
      this.setData({ quotesError: true })
      wx.showToast({ title: '云端报价单暂不可用', icon: 'none' })
    } finally {
      this._loadingQuotes = false
      this.setData({ loadingQuotes: false })
    }
  },
  loadMore() {
    if (this.data.hasMore) this.loadQuotes(false)
  },
  showDraft() {
    if (this.data.busy) return
    this._saved = null
    this._draft = readMetalQuoteDraft()
    const lines: QuoteLine[] = this._draft.map((item) => {
      try {
        const result = calculateMetal({
          materialId: item.materialId,
          dimensions: item.spec,
          density: item.density,
          tonPriceYuan: this._config?.prices?.[item.materialId],
          quoteFactor: item.quoteFactor,
          processingFeeYuan: item.processingFeeFen / 100,
          sectionShape: item.sectionShape as any,
          estimateSection: item.estimateSection,
        })
        return {
          ...item,
          weightKg: result.totalWeightKg,
          amountFen: Math.round(result.amountYuan * 100),
          tonPriceFen: Math.round(result.tonPriceYuan * 100),
        }
      } catch {
        return { ...item, weightKg: 0, amountFen: 0 }
      }
    })
    this.showLines('draft', lines)
    this.setData({ title: this._draftTitle })
  },
  showSavedList() {
    if (this.data.busy) return
    this._saved = null
    this.setData({ view: 'history', csvPath: '', imagePath: '' })
  },
  showLines(view: string, lines: QuoteLine[]) {
    const totalWeight = lines.reduce((sum, line) => sum + line.weightKg, 0)
    const totalAmount = lines.reduce((sum, line) => sum + line.amountFen, 0)
    this.setData({
      view,
      rows: display(lines),
      totalWeight: fmt(totalWeight, 3),
      totalAmount: fmt(totalAmount / 100, 2),
      csvPath: '',
      imagePath: '',
    })
  },
  onTitle(event: any) {
    this._draftTitle = String(event.detail.value || '')
    this.setData({ title: this._draftTitle })
  },
  onKeyboardHeight(event: WechatMiniprogram.InputKeyboardHeightChange) {
    this.setData({ keyboardRaised: event.detail.height > 0 })
  },
  removeLine(event: any) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0 || index >= this._draft.length) return
    this._draft.splice(index, 1)
    writeMetalQuoteDraft(this._draft)
    this.showDraft()
  },
  openCalculator() {
    navigation.navigateTo({ url: '/subpackages/metal/index/index' })
  },
  async saveQuote() {
    if (!requireMembership('开通会员后可保存和导出报价单。')) return
    if (!this._draft.length || this.data.busy) return
    const title = this.data.title.trim()
    if (!title) {
      wx.showToast({ title: '请填写报价单名称', icon: 'none' })
      return
    }
    this.setData({ busy: true })
    try {
      const quote = await request<SavedQuote>({
        url: '/l/tools/metal/quote',
        method: 'POST',
        data: { title, items: this._draft },
      })
      writeMetalQuoteDraft([])
      this._draft = []
      this._draftTitle = ''
      this._saved = quote
      this.showLines('saved', quote.items)
      this.setData({ title: quote.title, savedDate: quote.createdAt.slice(0, 10) })
      await this.loadQuotes()
      wx.showToast({ title: '已按后台价格保存', icon: 'success' })
    } catch {
      /* request 已显示接口错误。 */
    } finally {
      this.setData({ busy: false })
    }
  },
  openSaved(event: any) {
    if (this.data.busy) return
    const id = String(event.currentTarget.dataset.id)
    const quote = this._quotes.find((item) => item.id === id)
    if (!quote) return
    this._saved = quote
    this.showLines('saved', quote.items)
    this.setData({ title: quote.title, savedDate: quote.createdAt.slice(0, 10) })
  },
  async deleteSaved() {
    if (
      this.data.busy ||
      !this._saved ||
      !requireMembership('会员到期后可查看历史报价单，暂不能删除。')
    )
      return
    const id = this._saved.id
    wx.showModal({
      title: '删除报价单',
      content: '删除后无法恢复，确定删除？',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await request({ url: `/l/tools/metal/quotes/${id}`, method: 'DELETE' })
          this.showDraft()
          this.loadQuotes()
        } catch {
          /* request 已显示接口错误。 */
        }
      },
    })
  },
  async exportCsv() {
    if (this.data.busy || !this._saved || !requireMembership('开通会员后可导出报价单。')) return
    this.setData({ busy: true })
    let quote: SavedQuote
    try {
      quote = await request<SavedQuote>({
        url: `/l/tools/metal/quotes/${this._saved.id}/export`,
        method: 'POST',
      })
    } catch {
      this.setData({ busy: false })
      return
    }
    const rows: Array<Array<unknown>> = [
      ['报价单', quote.title],
      ['日期', quote.createdAt.slice(0, 10)],
      ['序号', '材料', '规格', '重量kg', '吨价元', '系数', '加工费元', '金额元'],
    ]
    quote.items.forEach((item, index) =>
      rows.push([
        index + 1,
        titleOf(item.materialId),
        specText(item),
        item.weightKg,
        (item.tonPriceFen || 0) / 100,
        item.quoteFactor,
        item.processingFeeFen / 100,
        item.amountFen / 100,
      ]),
    )
    rows.push(['', '合计', '', quote.totalWeightKg, '', '', '', quote.totalAmountFen / 100])
    rows.push(['提示', '理论重量与报价仅供参考，实际以过磅和供货商报价为准。'])
    const path = `${wx.env.USER_DATA_PATH}/metal-quote-${quote.id}.csv`
    try {
      await new Promise<void>((resolve, reject) => {
        wx.getFileSystemManager().writeFile({
          filePath: path,
          data: metalCsv(rows),
          encoding: 'utf8',
          success: () => resolve(),
          fail: reject,
        })
      })
      this.setData({ csvPath: path })
      wx.showToast({ title: 'CSV 已生成，点击分享', icon: 'none' })
    } catch {
      wx.showToast({ title: 'CSV 导出失败', icon: 'none' })
    } finally {
      this.setData({ busy: false })
    }
  },
  async exportImage() {
    if (this.data.busy || !this._saved || !requireMembership('开通会员后可导出报价单。')) return
    this.setData({ busy: true })
    try {
      const quote = await request<SavedQuote>({
        url: `/l/tools/metal/quotes/${this._saved.id}/export`,
        method: 'POST',
      })
      const canvas: any = await new Promise((resolve, reject) => {
        wx.createSelectorQuery()
          .in(this)
          .select('#metalQuoteCanvas')
          .fields({ node: true, size: true })
          .exec((result: any[]) => {
            if (result?.[0]?.node) resolve(result[0].node)
            else reject(new Error('画布不可用'))
          })
      })
      const width = 680
      const ctx = canvas.getContext('2d')
      ctx.font = 'bold 29px sans-serif'
      const titleLines = wrapText(ctx, quote.title, 620)
      ctx.font = '16px sans-serif'
      const renderedRows = quote.items.map((item) => ({
        item,
        specLines: wrapText(ctx, specText(item), 620),
      }))
      const headerHeight = 100 + titleLines.length * 34
      const fullHeight =
        headerHeight +
        renderedRows.reduce((sum, row) => sum + 76 + row.specLines.length * 22, 0) +
        115
      const height = Math.min(fullHeight, 4000),
        scale = height / fullHeight
      canvas.width = Math.ceil(width * scale)
      canvas.height = height
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, height)
      ctx.scale(scale, scale)
      ctx.fillStyle = '#102b25'
      ctx.font = 'bold 29px sans-serif'
      titleLines.forEach((line, index) => ctx.fillText(line, 30, 48 + index * 34))
      ctx.fillStyle = '#61736e'
      ctx.font = '17px sans-serif'
      ctx.fillText(
        '金属材料报价单 · ' + quote.createdAt.slice(0, 10),
        30,
        67 + titleLines.length * 34,
      )
      let y = headerHeight
      renderedRows.forEach(({ item, specLines }, index) => {
        ctx.fillStyle = '#19342e'
        ctx.font = 'bold 18px sans-serif'
        ctx.fillText(`${index + 1}. ${titleOf(item.materialId)}`, 30, y)
        ctx.fillStyle = '#60716d'
        ctx.font = '16px sans-serif'
        specLines.forEach((line, lineIndex) => ctx.fillText(line, 30, y + 24 + lineIndex * 22))
        const detailY = y + 24 + specLines.length * 22
        ctx.fillText(
          `重量 ${fmt(item.weightKg, 3)} kg · 吨价 ${fmt((item.tonPriceFen || 0) / 100, 0)} 元`,
          30,
          detailY,
        )
        ctx.fillText(
          `系数 ${fmt(item.quoteFactor, 2)} · 加工费 ${fmt(item.processingFeeFen / 100, 2)} 元`,
          30,
          detailY + 22,
        )
        ctx.textAlign = 'right'
        ctx.fillStyle = '#087d68'
        ctx.fillText(`¥${fmt(item.amountFen / 100, 2)}`, 650, y)
        ctx.textAlign = 'left'
        y += 76 + specLines.length * 22
      })
      ctx.fillStyle = '#102b25'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText(`合计 ${fmt(quote.totalWeightKg, 3)} kg`, 30, y + 15)
      ctx.textAlign = 'right'
      ctx.fillText(`¥${fmt(quote.totalAmountFen / 100, 2)}`, 650, y + 15)
      ctx.textAlign = 'left'
      ctx.font = '16px sans-serif'
      ctx.fillStyle = '#61736e'
      ctx.fillText('重量与报价仅供参考，实际以过磅和供货商报价为准。', 30, y + 56)
      const path: string = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath(
          {
            canvas,
            fileType: 'png',
            success: (result) => resolve(result.tempFilePath),
            fail: reject,
          },
          this,
        )
      })
      this.setData({ imagePath: path })
      wx.previewImage({ urls: [path] })
    } catch {
      wx.showToast({ title: '图片导出失败', icon: 'none' })
    } finally {
      this.setData({ busy: false })
    }
  },
  shareCsv() {
    if (this.data.csvPath && requireMembership())
      shareQuoteFile(this.data.csvPath, '金属报价单.csv').catch(() =>
        wx.showToast({ title: '分享失败', icon: 'none' }),
      )
  },
  shareImage() {
    if (this.data.imagePath && requireMembership())
      shareQuoteFile(this.data.imagePath, '金属报价单.png').catch(() =>
        wx.showToast({ title: '分享失败', icon: 'none' }),
      )
  },
})
