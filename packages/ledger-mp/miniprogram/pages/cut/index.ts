import { cutApi, cutPlanApi } from '../../api/index'
import { optimizeCutting } from '../../utils/cutting'
import { optimizeNesting, NestResult } from '../../utils/nesting'

// 切割清单行的稳定 key：删除中间行时避免 wx:key 失配导致输入框内容串行
let pieceUid = 0
const newPiece = () => ({ _k: ++pieceUid, lengthStr: '', qtyStr: '', wStr: '', hStr: '' })

// 任一输入变更立即作废上次结果：陈旧的下料方案比没有方案更危险（照旧切会切错料）
const RESET_RESULT = {
  summary: null as any,
  barsView: [] as any[],
  sheetsView: [] as any[],
  oversizeText: '',
  canvasReady: false,
}

// 材料元信息：is2d 维度；noKerf=玻璃不留锯缝；hasImage=仅二维出排料图（型材只给方案）
const MATERIALS: Record<
  string,
  { name: string; unit: string; is2d: boolean; noKerf: boolean; hasImage: boolean }
> = {
  profile: { name: '型材', unit: '段', is2d: false, noKerf: false, hasImage: false },
  glass: { name: '玻璃', unit: '块', is2d: true, noKerf: true, hasImage: true },
  board: { name: '板材', unit: '块', is2d: true, noKerf: false, hasImage: true },
}

// 各材料默认参数（玻璃 2100×1650 不留锯缝；板材 2440×1220 留 5；型材 6000 留 5）
function defaultDraft(material: string): any {
  if (material === 'glass')
    return { sheetWStr: '2100', sheetHStr: '1650', kerf2Str: '0', pieces: [newPiece()] }
  if (material === 'board')
    return { sheetWStr: '2440', sheetHStr: '1220', kerf2Str: '5', pieces: [newPiece()] }
  return { stockLengthStr: '6000', kerfStr: '5', pieces: [newPiece()] }
}

const DRAFT_KEY = 'ledger_cut_draft_v1' // 输入自动保存（按材料分别留存，切换/离开页面不丢）

Page({
  data: {
    checking: true,
    loadError: false,
    allowed: false,
    mode: '',
    trialDaysLeft: 0,
    gateReason: '优化下料试用已结束，开通会员后继续使用',

    material: 'profile',
    materialOptions: [
      { value: 'profile', label: '型材' },
      { value: 'glass', label: '玻璃' },
      { value: 'board', label: '板材' },
    ],
    is2d: false,
    unit: '段',
    noKerf: false, // 玻璃：不留锯缝（隐藏锯缝输入）
    hasImage: false, // 二维才出排料图 / 可保存图片

    stockLengthStr: '6000',
    kerfStr: '5',
    sheetWStr: '2440',
    sheetHStr: '1220',
    kerf2Str: '5',

    pieces: [newPiece()] as any[],

    summary: null as any,
    barsView: [] as any[],
    sheetsView: [] as any[],
    oversizeText: '',
    canvasReady: false,
    canvasH: 200,
    saving2img: false,
    saveProgress: '',

    showHistory: false,
    historyLoading: false,
    historyError: false,
    historyList: [] as any[],
    matHistory: [] as any[], // 当前材料的历史方案（内联展示用）
    savingPlan: false,

    editingTitle: '', // 非空=正在继续编辑这个历史方案（保存即更新，不产生重复）
  },

  _nest: null as NestResult | null,
  _drafts: {} as Record<string, any>, // 各材料输入草稿（内存镜像，配合 storage 自动保存）
  _editingPlanId: '', // 从历史载入的方案 id：保存时更新该方案而非新建
  _saveTimer: null as any,

  onLoad() {
    this.restoreDrafts()
    this.checkAccess()
  },
  onHide() {
    this.flushDrafts() // 离开页面立刻落盘，防丢
  },
  onUnload() {
    this.flushDrafts()
  },

  // ── 输入自动保存（按材料）────────────────────────────────────────────────
  restoreDrafts() {
    let saved: any = {}
    try {
      saved = wx.getStorageSync(DRAFT_KEY) || {}
    } catch (e) {
      saved = {}
    }
    const drafts = (saved && saved.drafts) || {}
    this._drafts = {
      profile: drafts.profile || defaultDraft('profile'),
      glass: drafts.glass || defaultDraft('glass'),
      board: drafts.board || defaultDraft('board'),
    }
    const material = saved && MATERIALS[saved.material] ? saved.material : 'profile'
    const meta = MATERIALS[material]
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      noKerf: meta.noKerf,
      hasImage: meta.hasImage,
    }
    Object.assign(set, this.draftToFields(material, this._drafts[material]))
    this.setData(set)
  },
  // 草稿对象 → data 字段
  draftToFields(material: string, draft: any): any {
    const meta = MATERIALS[material]
    const pieces =
      Array.isArray(draft.pieces) && draft.pieces.length
        ? draft.pieces.map((p: any) => ({
            _k: ++pieceUid,
            lengthStr: p.lengthStr || '',
            qtyStr: p.qtyStr || '',
            wStr: p.wStr || '',
            hStr: p.hStr || '',
          }))
        : [newPiece()]
    if (meta.is2d) {
      return {
        sheetWStr: draft.sheetWStr || '',
        sheetHStr: draft.sheetHStr || '',
        kerf2Str: draft.kerf2Str != null ? String(draft.kerf2Str) : '',
        pieces,
      }
    }
    return { stockLengthStr: draft.stockLengthStr || '', kerfStr: draft.kerfStr || '', pieces }
  },
  // 当前 data 里该材料的输入 → 草稿对象
  snapshot(material: string): any {
    const meta = MATERIALS[material]
    const pieces = this.data.pieces.map((p: any) => ({
      lengthStr: p.lengthStr,
      qtyStr: p.qtyStr,
      wStr: p.wStr,
      hStr: p.hStr,
    }))
    if (meta.is2d) {
      return {
        sheetWStr: this.data.sheetWStr,
        sheetHStr: this.data.sheetHStr,
        kerf2Str: this.data.kerf2Str,
        pieces,
      }
    }
    return { stockLengthStr: this.data.stockLengthStr, kerfStr: this.data.kerfStr, pieces }
  },
  // 输入变更后调用：更新内存草稿 + 防抖落盘
  autosave() {
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => this.flushDrafts(), 500)
  },
  flushDrafts() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
      this._saveTimer = null
    }
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    try {
      wx.setStorageSync(DRAFT_KEY, { material: this.data.material, drafts: this._drafts })
    } catch (e) {
      /* ignore */
    }
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
      if (a.allowed) this.fetchHistory() // 拉历史填充内联「历史方案」
    } catch (e) {
      this.setData({ checking: false, loadError: true })
    }
  },
  retry() {
    this.setData({ checking: true, loadError: false }, () => this.checkAccess())
  },

  // ── 材料切换：存当前草稿 → 取目标草稿（含各材料默认），输入不丢 ──
  onMaterial(e: any) {
    const material = e.detail.value
    if (material === this.data.material) return
    this._drafts[this.data.material] = this.snapshot(this.data.material) // 先存旧材料
    const meta = MATERIALS[material] || MATERIALS.profile
    const draft = this._drafts[material] || defaultDraft(material)
    this._nest = null
    this._editingPlanId = ''
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      noKerf: meta.noKerf,
      hasImage: meta.hasImage,
      editingTitle: '',
      ...RESET_RESULT,
    }
    Object.assign(set, this.draftToFields(material, draft))
    set.matHistory = this.data.historyList.filter((r: any) => r.material === material)
    this.setData(set, () => this.flushDrafts())
  },

  // ── 参数输入（变更即作废结果 + 自动保存）──
  onStock(e: any) {
    this.setData({ stockLengthStr: e.detail.value, ...RESET_RESULT }, () => this.autosave())
  },
  onKerf(e: any) {
    this.setData({ kerfStr: e.detail.value, ...RESET_RESULT }, () => this.autosave())
  },
  onSheetW(e: any) {
    this.setData({ sheetWStr: e.detail.value, ...RESET_RESULT }, () => this.autosave())
  },
  onSheetH(e: any) {
    this.setData({ sheetHStr: e.detail.value, ...RESET_RESULT }, () => this.autosave())
  },
  onKerf2(e: any) {
    this.setData({ kerf2Str: e.detail.value, ...RESET_RESULT }, () => this.autosave())
  },

  // ── 清单行（一维 段长/数量；二维 宽/高/数量）──
  onLen(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], lengthStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT }, () => this.autosave())
  },
  onQty(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], qtyStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT }, () => this.autosave())
  },
  onW(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], wStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT }, () => this.autosave())
  },
  onH(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], hStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT }, () => this.autosave())
  },
  addPiece() {
    this.setData({ pieces: [...this.data.pieces, newPiece()], ...RESET_RESULT }, () =>
      this.autosave(),
    )
  },
  delPiece(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = this.data.pieces.filter((_: any, j: number) => j !== i)
    this.setData({ pieces: p.length ? p : [newPiece()], ...RESET_RESULT }, () => this.autosave())
  },

  // ── 计算 ──
  compute() {
    if (this.data.is2d) this.compute2d()
    else this.compute1d()
  },

  compute1d() {
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
    const totalSeg = pieces.reduce((s: number, p: any) => s + p.qty, 0)
    if (totalSeg > 5000) {
      wx.showToast({ title: '段数过多（上限 5000），请核对数量', icon: 'none' })
      return
    }
    const r = optimizeCutting(stock, pieces, kerf)
    this._nest = null
    const barsView = r.bars.map((b, i) => ({
      idx: i + 1,
      cutsText: b.cuts.join(' + '),
      count: b.cuts.length,
      waste: b.waste,
    }))
    // 型材只给文字方案，不画排料图（canvasReady 恒 false）
    this.setData({
      summary: {
        count: r.barCount,
        util: (r.utilization * 100).toFixed(1),
        extra: r.totalWaste,
        totalPieces: r.totalPieces,
      },
      barsView,
      sheetsView: [],
      oversizeText: r.oversize.length ? `${r.oversize.length} 段超过整根料长，已忽略` : '',
      canvasReady: false,
    })
  },

  compute2d() {
    const sheetW = Math.round(Number(this.data.sheetWStr) || 0)
    const sheetH = Math.round(Number(this.data.sheetHStr) || 0)
    // 玻璃不留锯缝：noKerf 时强制 0（输入框已隐藏）
    const kerf = this.data.noKerf ? 0 : Math.max(0, Math.round(Number(this.data.kerf2Str) || 0))
    if (sheetW <= 0 || sheetH <= 0) {
      wx.showToast({ title: '请填写整板宽和高', icon: 'none' })
      return
    }
    const pieces = this.data.pieces
      .map((p: any) => ({
        w: Math.round(Number(p.wStr) || 0),
        h: Math.round(Number(p.hStr) || 0),
        qty: Math.round(Number(p.qtyStr) || 0),
      }))
      .filter((p: any) => p.w > 0 && p.h > 0 && p.qty > 0)
    if (!pieces.length) {
      wx.showToast({ title: '请填写宽、高和数量', icon: 'none' })
      return
    }
    const totalQty = pieces.reduce((s: number, p: any) => s + p.qty, 0)
    if (totalQty > 2000) {
      wx.showToast({ title: '总块数过多（上限 2000），请核对数量', icon: 'none' })
      return
    }
    const r = optimizeNesting(sheetW, sheetH, pieces, kerf)
    this._nest = r
    const oversizeCount = r.oversize.reduce((s, o) => s + o.qty, 0)
    const sheetsView = r.sheets.map((s, i) => ({
      idx: i + 1,
      count: s.placements.length,
      util: r.totalArea ? ((s.usedArea / (r.sheetW * r.sheetH)) * 100).toFixed(1) : '0.0',
    }))
    this.setData(
      {
        summary: {
          count: r.sheetCount,
          util: (r.utilization * 100).toFixed(1),
          extra: oversizeCount,
          totalPieces: r.totalPieces,
        },
        barsView: [],
        sheetsView,
        oversizeText: oversizeCount ? `${oversizeCount} 块超过整板尺寸，无法套料（已忽略）` : '',
        canvasReady: false,
      },
      () => this.drawResult(),
    )
  },

  // ── 排料图（仅二维；型材不画）──
  drawResult() {
    if (!this._nest) return
    const q = this.createSelectorQuery()
    q.select('#cutcv')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const cssW = res[0].width || 320
        let dpr = 2
        try {
          dpr =
            (wx.getWindowInfo
              ? wx.getWindowInfo().pixelRatio
              : wx.getSystemInfoSync().pixelRatio) || 2
        } catch (e) {
          dpr = 2
        }
        const cssH = this.measureNestHeight(cssW)
        this.setData({ canvasH: cssH }, () => {
          canvas.width = Math.round(cssW * dpr)
          canvas.height = Math.round(cssH * dpr)
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, cssW, cssH)
          this.paintNest(ctx, cssW)
          this.setData({ canvasReady: true })
        })
      })
  },

  measureNestHeight(cssW: number): number {
    const r = this._nest!
    const pad = 12
    const inner = cssW - pad * 2
    const scale = r.sheetW > 0 ? inner / r.sheetW : 1
    const sheetDrawH = Math.max(40, Math.round(r.sheetH * scale))
    const perSheet = 22 + sheetDrawH + 14
    return pad * 2 + r.sheets.length * perSheet
  },

  paintNest(ctx: any, cssW: number) {
    const r = this._nest!
    const pad = 12
    const inner = cssW - pad * 2
    const scale = r.sheetW > 0 ? inner / r.sheetW : 1
    const sheetDrawH = Math.max(40, Math.round(r.sheetH * scale))
    let y = pad
    r.sheets.forEach((sheet, si) => {
      ctx.fillStyle = '#5C6B64'
      ctx.font = '12px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(`原片 ${si + 1}`, pad, y)
      y += 22
      const ox = pad
      const oy = y
      ctx.fillStyle = '#F3F8F5'
      ctx.fillRect(ox, oy, inner, sheetDrawH)
      ctx.strokeStyle = '#C5D6CD'
      ctx.lineWidth = 1
      ctx.strokeRect(ox, oy, inner, sheetDrawH)
      sheet.placements.forEach((p) => {
        const px = ox + p.x * scale
        const py = oy + p.y * scale
        const pw = Math.max(1, p.w * scale)
        const ph = Math.max(1, p.h * scale)
        ctx.fillStyle = 'rgba(14,124,102,0.16)'
        ctx.fillRect(px, py, pw, ph)
        ctx.strokeStyle = '#0E7C66'
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, pw, ph)
        if (pw > 34 && ph > 16) {
          ctx.fillStyle = '#0E7C66'
          ctx.font = '10px sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${p.w}×${p.h}`, px + 3, py + ph / 2)
          ctx.textBaseline = 'top'
        }
      })
      y = oy + sheetDrawH + 14
    })
  },

  // ── 导出图片：每张原片单独一张，逐张存相册（不再拼长图）──
  saveImages() {
    if (this.data.saving2img) return
    if (!this._nest || !this._nest.sheets.length) {
      wx.showToast({ title: '请先优化出结果', icon: 'none' })
      return
    }
    this.ensureAlbumPerm(() => this.exportSheetsSeq())
  },
  // 相册权限：已授权直接回调；拒绝过引导设置页；从未授权拉起授权弹窗
  ensureAlbumPerm(onOk: () => void) {
    wx.getSetting({
      success: (s) => {
        if (s.authSetting['scope.writePhotosAlbum']) {
          onOk()
        } else if (s.authSetting['scope.writePhotosAlbum'] === false) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存图片需开启相册权限，请在设置中打开后重试',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) wx.openSetting({})
            },
          })
        } else {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: onOk,
            fail: () => wx.showToast({ title: '未授权相册', icon: 'none' }),
          })
        }
      },
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    })
  },
  // 逐张导出：用屏幕外 on-tree 画布 #cutexport 逐张原片绘制 → 存相册（不影响上方预览、无闪烁）
  exportSheetsSeq() {
    const total = this._nest!.sheets.length
    this.setData({ saving2img: true, saveProgress: `1/${total}` })
    const q = this.createSelectorQuery()
    q.select('#cutexport')
      .fields({ node: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ saving2img: false, saveProgress: '' })
          wx.showToast({ title: '画布未就绪', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        let i = 0
        let ok = 0
        const next = () => {
          if (i >= total) {
            this.setData({ saving2img: false, saveProgress: '' })
            wx.showToast({
              title: ok === total ? `已保存 ${total} 张到相册` : `已保存 ${ok}/${total}`,
              icon: ok ? 'success' : 'none',
            })
            return
          }
          this.setData({ saveProgress: `${i + 1}/${total}` })
          this.paintExportSheet(canvas, ctx, i)
          wx.canvasToTempFilePath({
            canvas,
            success: (rr) =>
              wx.saveImageToPhotosAlbum({
                filePath: rr.tempFilePath,
                success: () => {
                  ok++
                  i++
                  next()
                },
                fail: () => {
                  i++
                  next()
                },
              }),
            fail: () => {
              i++
              next()
            },
          })
        }
        next()
      })
  },
  // 把第 idx 张原片单独画满 #cutexport（导出分辨率 1000 宽）
  paintExportSheet(canvas: any, ctx: any, idx: number) {
    const r = this._nest!
    const sheet = r.sheets[idx]
    const W = 1000
    const margin = 24
    const titleH = 40
    const inner = W - margin * 2
    const scale = r.sheetW > 0 ? inner / r.sheetW : 1
    const drawH = Math.max(60, Math.round(r.sheetH * scale))
    const H = margin * 2 + titleH + drawH
    canvas.width = W
    canvas.height = H
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#19271F'
    ctx.font = 'bold 22px sans-serif'
    ctx.textBaseline = 'top'
    const util = ((sheet.usedArea / (r.sheetW * r.sheetH)) * 100).toFixed(1)
    ctx.fillText(
      `原片 ${idx + 1}/${r.sheets.length}   ${r.sheetW}×${r.sheetH}   利用率 ${util}%`,
      margin,
      margin,
    )
    const ox = margin
    const oy = margin + titleH
    ctx.fillStyle = '#F3F8F5'
    ctx.fillRect(ox, oy, inner, drawH)
    ctx.strokeStyle = '#C5D6CD'
    ctx.lineWidth = 2
    ctx.strokeRect(ox, oy, inner, drawH)
    sheet.placements.forEach((p) => {
      const px = ox + p.x * scale
      const py = oy + p.y * scale
      const pw = Math.max(1, p.w * scale)
      const ph = Math.max(1, p.h * scale)
      ctx.fillStyle = 'rgba(14,124,102,0.16)'
      ctx.fillRect(px, py, pw, ph)
      ctx.strokeStyle = '#0E7C66'
      ctx.lineWidth = 1.5
      ctx.strokeRect(px, py, pw, ph)
      if (pw > 52 && ph > 24) {
        ctx.fillStyle = '#0E7C66'
        ctx.font = '16px sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${p.w}×${p.h}`, px + 5, py + ph / 2)
        ctx.textBaseline = 'top'
      }
    })
  },

  // ── 保存方案：弹窗起名 + 继续编辑则更新、否则新建 ──
  savePlan() {
    if (this.data.savingPlan) return
    if (!this.data.summary) {
      wx.showToast({ title: '请先优化出结果再保存', icon: 'none' })
      return
    }
    const meta = MATERIALS[this.data.material] || MATERIALS.profile
    const s = this.data.summary
    const d = new Date()
    const mm = `${d.getMonth() + 1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    const def = this.data.editingTitle || `${meta.name}${mm}${dd} · ${s.totalPieces}${meta.unit}`
    wx.showModal({
      title: this._editingPlanId ? '更新方案' : '保存方案',
      editable: true,
      placeholderText: '给方案起个名字',
      content: def,
      confirmText: '保存',
      success: (m) => {
        if (!m.confirm) return
        const title = String(m.content || '')
          .trim()
          .slice(0, 40)
        this.doSavePlan(title || def)
      },
    })
  },
  doSavePlan(title: string) {
    const material = this.data.material
    const meta = MATERIALS[material] || MATERIALS.profile
    let input: any
    if (this.data.is2d) {
      input = {
        sheetW: Math.round(Number(this.data.sheetWStr) || 0),
        sheetH: Math.round(Number(this.data.sheetHStr) || 0),
        kerf: this.data.noKerf ? 0 : Math.max(0, Math.round(Number(this.data.kerf2Str) || 0)),
        pieces: this.data.pieces
          .map((p: any) => ({
            w: Math.round(Number(p.wStr) || 0),
            h: Math.round(Number(p.hStr) || 0),
            qty: Math.round(Number(p.qtyStr) || 0),
          }))
          .filter((p: any) => p.w > 0 && p.h > 0 && p.qty > 0),
      }
    } else {
      input = {
        stockLength: Math.round(Number(this.data.stockLengthStr) || 0),
        kerf: Math.max(0, Math.round(Number(this.data.kerfStr) || 0)),
        pieces: this.data.pieces
          .map((p: any) => ({
            length: Math.round(Number(p.lengthStr) || 0),
            qty: Math.round(Number(p.qtyStr) || 0),
          }))
          .filter((p: any) => p.length > 0 && p.qty > 0),
      }
    }
    const s = this.data.summary
    const summary = {
      material,
      count: s.totalPieces,
      util: Number((Number(s.util) / 100).toFixed(4)),
      units: meta.unit,
    }
    const editing = this._editingPlanId
    this.setData({ savingPlan: true })
    const req = editing
      ? cutPlanApi.update(editing, { title, material, input, summary })
      : cutPlanApi.create({ title, material, input, summary })
    req
      .then((res: any) => {
        // 新建成功后转为「编辑该方案」，再次保存即更新，避免重复堆历史
        if (!editing && res && res.id) this._editingPlanId = res.id
        this.setData({ savingPlan: false, editingTitle: title })
        wx.showToast({ title: editing ? '已更新' : '已保存', icon: 'success' })
        this.fetchHistory()
      })
      .catch(() => this.setData({ savingPlan: false }))
  },
  // 退出「继续编辑」：下次保存按新建处理
  clearEditing() {
    this._editingPlanId = ''
    this.setData({ editingTitle: '' })
  },

  // ── 云端历史 ──
  openHistory() {
    this.setData({ showHistory: true })
    this.fetchHistory()
  },
  closeHistory() {
    this.setData({ showHistory: false })
  },
  noop() {},

  fetchHistory() {
    this.setData({ historyLoading: true, historyError: false })
    cutPlanApi
      .list()
      .then((rows: any) => {
        const list = (rows || []).map((r: any) => {
          const meta = MATERIALS[r.material] || MATERIALS.profile
          const sm = r.summary || {}
          const util = sm.util != null ? (Number(sm.util) * 100).toFixed(1) : '0.0'
          return {
            id: r.id,
            title: r.title,
            material: r.material,
            materialName: meta.name,
            input: r.input,
            desc: `${meta.name} · ${sm.count || 0}${sm.units || meta.unit} · 利用率 ${util}%`,
            date: this.fmtDate(r.updatedAt),
          }
        })
        this.setData({
          historyLoading: false,
          historyList: list,
          matHistory: list.filter((r: any) => r.material === this.data.material),
        })
      })
      .catch(() => {
        this.setData({ historyLoading: false, historyError: true })
      })
  },
  retryHistory() {
    this.fetchHistory()
  },

  // 载入历史方案：先存当前草稿，再回填 material + 入参，关闭面板后自动重算
  loadPlan(e: any) {
    const id = e.currentTarget.dataset.id
    const row = this.data.historyList.find((r: any) => r.id === id)
    if (!row) return
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    const material = row.material
    const meta = MATERIALS[material] || MATERIALS.profile
    const input = row.input || {}
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      noKerf: meta.noKerf,
      hasImage: meta.hasImage,
      showHistory: false,
      editingTitle: row.title || '',
      ...RESET_RESULT,
    }
    if (meta.is2d) {
      set.sheetWStr = String(input.sheetW || '')
      set.sheetHStr = String(input.sheetH || '')
      set.kerf2Str = String(input.kerf != null ? input.kerf : meta.noKerf ? 0 : '')
      const ps = Array.isArray(input.pieces) ? input.pieces : []
      set.pieces = ps.length
        ? ps.map((p: any) => ({
            _k: ++pieceUid,
            lengthStr: '',
            qtyStr: String(p.qty || ''),
            wStr: String(p.w || ''),
            hStr: String(p.h || ''),
          }))
        : [newPiece()]
    } else {
      set.stockLengthStr = String(input.stockLength || '')
      set.kerfStr = String(input.kerf != null ? input.kerf : '')
      const ps = Array.isArray(input.pieces) ? input.pieces : []
      set.pieces = ps.length
        ? ps.map((p: any) => ({
            _k: ++pieceUid,
            lengthStr: String(p.length || ''),
            qtyStr: String(p.qty || ''),
            wStr: '',
            hStr: '',
          }))
        : [newPiece()]
    }
    this._nest = null
    this._editingPlanId = id
    set.matHistory = this.data.historyList.filter((r: any) => r.material === material)
    this.setData(set, () => {
      this.compute()
      this.flushDrafts()
    })
  },

  delPlan(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除方案',
      content: '删除后无法恢复，确认删除该方案？',
      confirmColor: '#C8442B',
      success: (m) => {
        if (!m.confirm) return
        cutPlanApi
          .remove(id)
          .then(() => {
            // 删的正是当前在编辑的方案 → 退出编辑态
            if (this._editingPlanId === id) this.clearEditing()
            wx.showToast({ title: '已删除', icon: 'success' })
            this.fetchHistory()
          })
          .catch(() => {})
      },
    })
  },

  fmtDate(iso?: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  toMember() {
    wx.navigateTo({ url: '/pages/membership/index' })
  },
})
