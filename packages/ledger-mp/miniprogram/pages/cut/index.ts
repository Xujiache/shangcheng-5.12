import { cutApi } from '../../api/index'
import { optimizeCutting } from '../../utils/cutting'

// 切割清单行的稳定 key：删除中间行时避免 wx:key 失配导致输入框内容串行
let pieceUid = 0
const newPiece = () => ({ _k: ++pieceUid, lengthStr: '', qtyStr: '' })

// 任一输入变更立即作废上次结果：陈旧的下料方案比没有方案更危险（照旧切会切错料）
const RESET_RESULT = { summary: null as any, barsView: [] as any[], oversizeText: '' }

Page({
  data: {
    checking: true,
    loadError: false, // 网络/加载失败：区别于"试用到期付费墙"
    allowed: false,
    mode: '', // free / member / trial / expired
    trialDaysLeft: 0,
    gateReason: '优化下料试用已结束，开通会员后继续使用',
    stockLengthStr: '6000',
    kerfStr: '5',
    pieces: [newPiece()] as any[],
    summary: null as any,
    barsView: [] as any[],
    oversizeText: '',
  },

  onLoad() {
    this.checkAccess()
  },

  async checkAccess() {
    try {
      const a: any = await cutApi.access()
      this.setData({
        checking: false,
        loadError: false,
        allowed: !!a.allowed,
        mode: a.mode || '',
        trialDaysLeft: a.trialDaysLeft || 0,
        gateReason: a.reason || '优化下料试用已结束，开通会员后继续使用',
      })
    } catch (e) {
      // 加载失败单独成态（带重试），不复用付费墙，避免把网络抖动误导成"需付费"
      this.setData({ checking: false, loadError: true })
    }
  },
  retry() {
    this.setData({ checking: true, loadError: false }, () => this.checkAccess())
  },

  onStock(e: any) {
    this.setData({ stockLengthStr: e.detail.value, ...RESET_RESULT })
  },
  onKerf(e: any) {
    this.setData({ kerfStr: e.detail.value, ...RESET_RESULT })
  },
  onLen(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], lengthStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT })
  },
  onQty(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], qtyStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT })
  },
  addPiece() {
    this.setData({ pieces: [...this.data.pieces, newPiece()], ...RESET_RESULT })
  },
  delPiece(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = this.data.pieces.filter((_: any, j: number) => j !== i)
    this.setData({ pieces: p.length ? p : [newPiece()], ...RESET_RESULT })
  },

  compute() {
    const stock = Math.round(Number(this.data.stockLengthStr) || 0)
    const kerf = Math.max(0, Math.round(Number(this.data.kerfStr) || 0))
    if (stock <= 0) {
      wx.showToast({ title: '请填写整根料长', icon: 'none' })
      return
    }
    const pieces = this.data.pieces
      .map((p: any) => ({
        length: Math.round(Number(p.lengthStr) || 0),
        qty: Math.round(Number(p.qtyStr) || 0),
      }))
      .filter((p: any) => p.length > 0 && p.qty > 0)
    if (!pieces.length) {
      wx.showToast({ title: '请填写段长和数量', icon: 'none' })
      return
    }
    // 防止误填超大数量导致主线程同步卡死（一维下料按件展开后是 O(n²) 级）
    const totalSeg = pieces.reduce((s: number, p: any) => s + p.qty, 0)
    if (totalSeg > 5000) {
      wx.showToast({ title: '段数过多（上限 5000），请核对数量', icon: 'none' })
      return
    }
    const r = optimizeCutting(stock, pieces, kerf)
    const barsView = r.bars.map((b, i) => ({
      idx: i + 1,
      cutsText: b.cuts.join(' + '),
      count: b.cuts.length,
      waste: b.waste,
    }))
    this.setData({
      summary: {
        barCount: r.barCount,
        util: (r.utilization * 100).toFixed(1),
        totalWaste: r.totalWaste,
        totalPieces: r.totalPieces,
      },
      barsView,
      oversizeText: r.oversize.length ? `${r.oversize.length} 段超过整根料长，已忽略` : '',
    })
  },

  toMember() {
    wx.navigateTo({ url: '/pages/membership/index' })
  },
})
