import { cutPlanApi } from '../../api/index'
import { optimizeCutting } from '../../utils/cutting'
import { optimizeNesting, NestResult } from '../../utils/nesting'

const MATERIALS: Record<string, { name: string; unit: string; is2d: boolean; noKerf: boolean }> = {
  profile: { name: '型材', unit: '段', is2d: false, noKerf: false },
  glass: { name: '玻璃', unit: '块', is2d: true, noKerf: true },
  board: { name: '板材', unit: '块', is2d: true, noKerf: false },
}
const RESULT_KEY = 'ledger_cut_result'

Page({
  data: {
    material: 'profile',
    is2d: false,
    noKerf: false,
    unit: '段',
    subt: '优化方案',
    summary: null as any,
    barsView: [] as any[],
    sheetsView: [] as any[],
    oversizeText: '',
    canvasReady: false,
    canvasH: 200,
    saving2img: false,
    saveProgress: '',
    savingPlan: false,
    editingTitle: '',
  },

  _nest: null as NestResult | null,
  _input: null as any,
  _editingPlanId: '',

  onLoad() {
    let d: any = {}
    try {
      d = wx.getStorageSync(RESULT_KEY) || {}
    } catch (e) {
      d = {}
    }
    const material = MATERIALS[d.material] ? d.material : 'profile'
    const meta = MATERIALS[material]
    this._input = d.input || {}
    this._editingPlanId = d.editingPlanId || ''
    this.setData(
      {
        material,
        is2d: meta.is2d,
        noKerf: meta.noKerf,
        unit: meta.unit,
        subt: `${meta.name} · 优化方案`,
        editingTitle: d.editingTitle || '',
      },
      () => (meta.is2d ? this.compute2d() : this.compute1d()),
    )
  },

  compute1d() {
    const input = this._input || {}
    const r = optimizeCutting(input.stockLength || 0, input.pieces || [], input.kerf || 0)
    this._nest = null
    const barsView = r.bars.map((b, i) => ({
      idx: i + 1,
      cutsText: b.cuts.join(' + '),
      count: b.cuts.length,
      waste: b.waste,
    }))
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
    const input = this._input || {}
    const r = optimizeNesting(
      input.sheetW || 0,
      input.sheetH || 0,
      input.pieces || [],
      input.kerf || 0,
    )
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

  saveImages() {
    if (this.data.saving2img) return
    if (!this._nest || !this._nest.sheets.length) {
      wx.showToast({ title: '没有可导出的排料图', icon: 'none' })
      return
    }
    this.ensureAlbumPerm(() => this.exportSheetsSeq())
  },
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

  // ── 保存方案（入参来自上一页）：起名 + 继续编辑则更新、否则新建 ──
  savePlan() {
    if (this.data.savingPlan) return
    if (!this.data.summary) return
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
    const input = this._input || {}
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
        if (!editing && res && res.id) this._editingPlanId = res.id
        this.setData({ savingPlan: false, editingTitle: title })
        wx.showToast({ title: editing ? '已更新' : '已保存', icon: 'success' })
      })
      .catch(() => this.setData({ savingPlan: false }))
  },
  clearEditing() {
    this._editingPlanId = ''
    this.setData({ editingTitle: '' })
  },
  back() {
    wx.navigateBack()
  },
})
