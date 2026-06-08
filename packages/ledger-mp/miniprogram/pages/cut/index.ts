import { cutApi } from '../../api/index'
import { optimizeCutting } from '../../utils/cutting'

Page({
  data: {
    checking: true,
    allowed: false,
    mode: '', // free / member / trial / expired
    trialDaysLeft: 0,
    gateReason: '优化下料试用已结束，开通会员后继续使用',
    stockLengthStr: '6000',
    kerfStr: '5',
    pieces: [{ lengthStr: '', qtyStr: '' }] as any[],
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
        allowed: !!a.allowed,
        mode: a.mode || '',
        trialDaysLeft: a.trialDaysLeft || 0,
        gateReason: a.reason || '优化下料试用已结束，开通会员后继续使用',
      })
    } catch (e) {
      this.setData({ checking: false, allowed: false, gateReason: '加载失败，请重试' })
    }
  },

  onStock(e: any) {
    this.setData({ stockLengthStr: e.detail.value })
  },
  onKerf(e: any) {
    this.setData({ kerfStr: e.detail.value })
  },
  onLen(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], lengthStr: e.detail.value }
    this.setData({ pieces: p })
  },
  onQty(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], qtyStr: e.detail.value }
    this.setData({ pieces: p })
  },
  addPiece() {
    this.setData({ pieces: [...this.data.pieces, { lengthStr: '', qtyStr: '' }] })
  },
  delPiece(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = this.data.pieces.filter((_: any, j: number) => j !== i)
    this.setData({ pieces: p.length ? p : [{ lengthStr: '', qtyStr: '' }] })
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
