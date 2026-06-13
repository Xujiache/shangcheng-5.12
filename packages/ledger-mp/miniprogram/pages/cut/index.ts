import { cutApi, cutPlanApi } from '../../api/index'
import { optimizeCutting } from '../../utils/cutting'
import { optimizeNesting, NestResult } from '../../utils/nesting'

// 切割清单行的稳定 key：删除中间行时避免 wx:key 失配导致输入框内容串行
let pieceUid = 0
// 一维行：段长 × 数量；二维行：宽 × 高 × 数量（共用 _k，按 material 取用对应字段）
const newPiece = () => ({ _k: ++pieceUid, lengthStr: '', qtyStr: '', wStr: '', hStr: '' })

// 任一输入变更立即作废上次结果：陈旧的下料方案比没有方案更危险（照旧切会切错料）
const RESET_RESULT = {
  summary: null as any,
  barsView: [] as any[], // 一维：切割方案行
  sheetsView: [] as any[], // 二维：各原片排料（含 placements 供画布绘制）
  oversizeText: '',
  canvasReady: false, // 结果画布是否已绘制（控制「保存为图片」可用）
}

// 材料元信息：标签 + 计量单位（用于摘要展示与方案标题）
const MATERIALS: Record<string, { name: string; unit: string; is2d: boolean }> = {
  profile: { name: '型材', unit: '段', is2d: false },
  glass: { name: '玻璃', unit: '块', is2d: true },
  board: { name: '板材', unit: '块', is2d: true },
}

Page({
  data: {
    checking: true,
    loadError: false, // 网络/加载失败：区别于"试用到期付费墙"
    allowed: false,
    mode: '', // free / member / trial / expired
    trialDaysLeft: 0,
    gateReason: '优化下料试用已结束，开通会员后继续使用',

    // 材料切换：型材=一维，玻璃/板材=二维
    material: 'profile',
    materialOptions: [
      { value: 'profile', label: '型材' },
      { value: 'glass', label: '玻璃' },
      { value: 'board', label: '板材' },
    ],
    is2d: false,
    unit: '段',

    // 一维参数
    stockLengthStr: '6000',
    kerfStr: '5',
    // 二维参数
    sheetWStr: '2440',
    sheetHStr: '1220',
    kerf2Str: '5',

    pieces: [newPiece()] as any[],

    // 结果
    summary: null as any,
    barsView: [] as any[],
    sheetsView: [] as any[],
    oversizeText: '',
    canvasReady: false,
    canvasH: 200, // 结果画布 CSS 高度（按内容动态算出后回写）
    saving2img: false, // 导出图片中（防抖）

    // 云端历史
    showHistory: false,
    historyLoading: false,
    historyError: false,
    historyList: [] as any[],
    savingPlan: false, // 保存方案中（防抖）
  },

  // 当前结果缓存（用于画布绘制与保存方案重算入参，不进 data 避免 setData 冗余）
  _nest: null as NestResult | null,
  _cut: null as any,

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

  // ── 材料切换 ────────────────────────────────────────────────────────────────
  onMaterial(e: any) {
    const material = e.detail.value
    if (material === this.data.material) return
    const meta = MATERIALS[material] || MATERIALS.profile
    this._nest = null
    this._cut = null
    // 切材料即作废陈旧结果，并把清单重置为一行（一维/二维字段不通用，避免脏数据误算）
    this.setData({
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      pieces: [newPiece()],
      ...RESET_RESULT,
    })
  },

  // ── 一维参数 ────────────────────────────────────────────────────────────────
  onStock(e: any) {
    this.setData({ stockLengthStr: e.detail.value, ...RESET_RESULT })
  },
  onKerf(e: any) {
    this.setData({ kerfStr: e.detail.value, ...RESET_RESULT })
  },
  // ── 二维参数 ────────────────────────────────────────────────────────────────
  onSheetW(e: any) {
    this.setData({ sheetWStr: e.detail.value, ...RESET_RESULT })
  },
  onSheetH(e: any) {
    this.setData({ sheetHStr: e.detail.value, ...RESET_RESULT })
  },
  onKerf2(e: any) {
    this.setData({ kerf2Str: e.detail.value, ...RESET_RESULT })
  },

  // ── 清单行（一维 段长/数量；二维 宽/高/数量）─────────────────────────────────
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
  onW(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], wStr: e.detail.value }
    this.setData({ pieces: p, ...RESET_RESULT })
  },
  onH(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], hStr: e.detail.value }
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

  // ── 计算（按 material 分流）─────────────────────────────────────────────────
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
    // 防止误填超大数量导致主线程同步卡死（一维下料按件展开后是 O(n²) 级）
    const totalSeg = pieces.reduce((s: number, p: any) => s + p.qty, 0)
    if (totalSeg > 5000) {
      wx.showToast({ title: '段数过多（上限 5000），请核对数量', icon: 'none' })
      return
    }
    const r = optimizeCutting(stock, pieces, kerf)
    this._cut = r
    this._nest = null
    const barsView = r.bars.map((b, i) => ({
      idx: i + 1,
      cutsText: b.cuts.join(' + '),
      count: b.cuts.length,
      waste: b.waste,
    }))
    this.setData(
      {
        summary: {
          count: r.barCount, // 用料根数
          util: (r.utilization * 100).toFixed(1),
          extra: r.totalWaste, // 损耗 mm
          totalPieces: r.totalPieces,
        },
        barsView,
        sheetsView: [],
        oversizeText: r.oversize.length ? `${r.oversize.length} 段超过整根料长，已忽略` : '',
        canvasReady: false,
      },
      () => this.drawResult(),
    )
  },

  compute2d() {
    const sheetW = Math.round(Number(this.data.sheetWStr) || 0)
    const sheetH = Math.round(Number(this.data.sheetHStr) || 0)
    const kerf = Math.max(0, Math.round(Number(this.data.kerf2Str) || 0))
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
    // 与算法 MAX_PLACED 对齐：超 2000 件直接拒算，避免主线程套料卡死
    const totalQty = pieces.reduce((s: number, p: any) => s + p.qty, 0)
    if (totalQty > 2000) {
      wx.showToast({ title: '总块数过多（上限 2000），请核对数量', icon: 'none' })
      return
    }
    const r = optimizeNesting(sheetW, sheetH, pieces, kerf)
    this._nest = r
    this._cut = null
    const oversizeCount = r.oversize.reduce((s, o) => s + o.qty, 0)
    // sheetsView 仅承载展示用的轻量信息，placements 留给画布绘制（不进列表渲染）
    const sheetsView = r.sheets.map((s, i) => ({
      idx: i + 1,
      count: s.placements.length,
      util: r.totalArea ? ((s.usedArea / (r.sheetW * r.sheetH)) * 100).toFixed(1) : '0.0',
    }))
    this.setData(
      {
        summary: {
          count: r.sheetCount, // 用料块数
          util: (r.utilization * 100).toFixed(1),
          extra: oversizeCount, // 超尺寸件数
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

  // ── 结果画布绘制（type="2d" + dpr，沿用 lz-donut 取节点写法）──────────────────
  // 二维：每张原片画矩形排料图（含锯路、尺寸标签）；一维：把各根料画成水平条形。
  drawResult() {
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
        // 画布 CSS 高度按内容算出后回写 data，再绘制（避免内容被裁切）
        const cssH = this._nest ? this.measureNestHeight(cssW) : this.measureBarsHeight(cssW)
        this.setData({ canvasH: cssH }, () => {
          canvas.width = Math.round(cssW * dpr)
          canvas.height = Math.round(cssH * dpr)
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, cssW, cssH)
          if (this._nest) this.paintNest(ctx, cssW)
          else if (this._cut) this.paintBars(ctx, cssW)
          this.setData({ canvasReady: true })
        })
      })
  },

  // 二维：估算画布总高 = 每张原片按比例缩放后高度 + 标题/间距累加。
  measureNestHeight(cssW: number): number {
    const r = this._nest!
    const pad = 12
    const inner = cssW - pad * 2
    const scale = r.sheetW > 0 ? inner / r.sheetW : 1
    const sheetDrawH = Math.max(40, Math.round(r.sheetH * scale))
    const perSheet = 22 /*标题*/ + sheetDrawH + 14 /*间距*/
    return pad * 2 + r.sheets.length * perSheet
  },
  // 一维：每根料一条，固定行高累加。
  measureBarsHeight(cssW: number): number {
    const r = this._cut
    const pad = 12
    const rowH = 46 // 条形 28 + 标题/间距 18
    return pad * 2 + (r.bars.length || 1) * rowH
  },

  // 二维排料图：每张原片画外框 + 各 Placement 矩形（薄荷绿填充 + 尺寸标签）。
  paintNest(ctx: any, cssW: number) {
    const r = this._nest!
    const pad = 12
    const inner = cssW - pad * 2
    const scale = r.sheetW > 0 ? inner / r.sheetW : 1
    const sheetDrawH = Math.max(40, Math.round(r.sheetH * scale))
    let y = pad
    r.sheets.forEach((sheet, si) => {
      // 标题
      ctx.fillStyle = '#5C6B64'
      ctx.font = '12px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(`原片 ${si + 1}`, pad, y)
      y += 22
      const ox = pad
      const oy = y
      // 原片外框
      ctx.fillStyle = '#F3F8F5'
      ctx.fillRect(ox, oy, inner, sheetDrawH)
      ctx.strokeStyle = '#C5D6CD'
      ctx.lineWidth = 1
      ctx.strokeRect(ox, oy, inner, sheetDrawH)
      // 各工件
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
        // 尺寸标签：仅在矩形够大时绘制，避免文字溢出重叠
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

  // 一维条形图：每根料一条，按 stockLength 等比缩放，依次画各段（含锯缝间隙）。
  paintBars(ctx: any, cssW: number) {
    const r = this._cut
    const pad = 12
    const inner = cssW - pad * 2
    const L = r.stockLength || 1
    const scale = inner / L
    const barH = 28
    const rowH = 46
    let y = pad
    r.bars.forEach((bar: any, bi: number) => {
      ctx.fillStyle = '#5C6B64'
      ctx.font = '12px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(`第 ${bi + 1} 根 · 余料 ${bar.waste}mm`, pad, y)
      y += 16
      // 整根底框
      ctx.fillStyle = '#F3F8F5'
      ctx.fillRect(pad, y, inner, barH)
      ctx.strokeStyle = '#C5D6CD'
      ctx.lineWidth = 1
      ctx.strokeRect(pad, y, inner, barH)
      // 各段
      let cx = pad
      bar.cuts.forEach((len: number, ci: number) => {
        if (ci > 0) cx += r.kerf * scale // 锯缝间隙
        const w = Math.max(1, len * scale)
        ctx.fillStyle = 'rgba(14,124,102,0.16)'
        ctx.fillRect(cx, y, w, barH)
        ctx.strokeStyle = '#0E7C66'
        ctx.lineWidth = 1
        ctx.strokeRect(cx, y, w, barH)
        if (w > 28) {
          ctx.fillStyle = '#0E7C66'
          ctx.font = '10px sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${len}`, cx + 3, y + barH / 2)
          ctx.textBaseline = 'top'
        }
        cx += w
      })
      y = pad + (bi + 1) * rowH
    })
  },

  // ── 导出图片：canvasToTempFilePath → 相册（处理授权）──────────────────────────
  saveImage() {
    if (this.data.saving2img || !this.data.canvasReady) return
    this.setData({ saving2img: true })
    const q = this.createSelectorQuery()
    q.select('#cutcv')
      .fields({ node: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ saving2img: false })
          wx.showToast({ title: '画布未就绪', icon: 'none' })
          return
        }
        wx.canvasToTempFilePath({
          canvas: res[0].node,
          success: (r) => this.persistImage(r.tempFilePath),
          fail: () => {
            this.setData({ saving2img: false })
            wx.showToast({ title: '生成图片失败', icon: 'none' })
          },
        })
      })
  },
  // 落盘到相册：先查授权，缺权限走 authorize / 拒绝引导去设置页。
  persistImage(filePath: string) {
    const doSave = () => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          this.setData({ saving2img: false })
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: () => {
          this.setData({ saving2img: false })
          wx.showToast({ title: '保存失败', icon: 'none' })
        },
      })
    }
    wx.getSetting({
      success: (s) => {
        if (s.authSetting['scope.writePhotosAlbum']) {
          doSave()
        } else if (s.authSetting['scope.writePhotosAlbum'] === false) {
          // 之前拒绝过：authorize 不再弹窗，引导去设置页打开
          wx.showModal({
            title: '需要相册权限',
            content: '保存图片需开启相册权限，请在设置中打开后重试',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) wx.openSetting({})
              this.setData({ saving2img: false })
            },
            fail: () => this.setData({ saving2img: false }),
          })
        } else {
          // 从未授权：拉起授权弹窗
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: doSave,
            fail: () => {
              this.setData({ saving2img: false })
              wx.showToast({ title: '未授权相册', icon: 'none' })
            },
          })
        }
      },
      fail: () => {
        this.setData({ saving2img: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      },
    })
  },

  // ── 云端历史：保存当前方案 ───────────────────────────────────────────────────
  savePlan() {
    if (this.data.savingPlan) return
    if (!this.data.summary) {
      wx.showToast({ title: '请先优化出结果再保存', icon: 'none' })
      return
    }
    const material = this.data.material
    const meta = MATERIALS[material] || MATERIALS.profile
    // input：可重算的完整入参（一维/二维结构不同），与后端 contract 对齐
    let input: any
    if (this.data.is2d) {
      input = {
        sheetW: Math.round(Number(this.data.sheetWStr) || 0),
        sheetH: Math.round(Number(this.data.sheetHStr) || 0),
        kerf: Math.max(0, Math.round(Number(this.data.kerf2Str) || 0)),
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
      count: s.totalPieces, // 件数（展示用）
      util: Number((Number(s.util) / 100).toFixed(4)), // 0..1（s.util 为百分比字符串）
      units: meta.unit,
    }
    // 自动标题：材料 + 日期 + 件数（用方案标识，无需用户手填）
    const d = new Date()
    const mm = `${d.getMonth() + 1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    const title = `${meta.name}${mm}${dd} · ${s.totalPieces}${meta.unit}`.slice(0, 40)

    this.setData({ savingPlan: true })
    cutPlanApi
      .create({ title, material, input, summary })
      .then(() => {
        this.setData({ savingPlan: false })
        wx.showToast({ title: '已保存', icon: 'success' })
        // 若历史面板开着，刷新一下
        if (this.data.showHistory) this.fetchHistory()
      })
      .catch(() => {
        this.setData({ savingPlan: false })
        // 错误 toast 由 request() 统一弹出
      })
  },

  // ── 云端历史：底部面板 ──────────────────────────────────────────────────────
  openHistory() {
    this.setData({ showHistory: true })
    // 每次打开都拉最新：保存方案在面板关闭时进行，仅靠"列表为空才拉"会看到旧快照。
    // fetchHistory 只置 loading、不清空 historyList，旧列表在加载期间仍可见，无闪烁。
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
        this.setData({ historyLoading: false, historyList: list })
      })
      .catch(() => {
        this.setData({ historyLoading: false, historyError: true })
      })
  },
  retryHistory() {
    this.fetchHistory()
  },

  // 载入历史方案：回填 material + 入参，关闭面板后自动重算。
  loadPlan(e: any) {
    const id = e.currentTarget.dataset.id
    const row = this.data.historyList.find((r: any) => r.id === id)
    if (!row) return
    const material = row.material
    const meta = MATERIALS[material] || MATERIALS.profile
    const input = row.input || {}
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      showHistory: false,
      ...RESET_RESULT,
    }
    if (meta.is2d) {
      set.sheetWStr = String(input.sheetW || '')
      set.sheetHStr = String(input.sheetH || '')
      set.kerf2Str = String(input.kerf != null ? input.kerf : '')
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
    this._cut = null
    this.setData(set, () => this.compute())
  },

  // 删除历史方案：二次确认 → remove → 重新拉取列表。
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
            wx.showToast({ title: '已删除', icon: 'success' })
            this.fetchHistory()
          })
          .catch(() => {
            // 错误 toast 由 request() 统一弹出
          })
      },
    })
  },

  // 摘要日期：ISO → M月D日（列表展示用）
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
