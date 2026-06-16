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
    savingPlan: false,
    editingTitle: '',
  },

  _nest: null as NestResult | null,
  _cut1d: null as any,
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
    this._cut1d = r
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
    this._cut1d = null
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
    const ok2d = !!(this.data.is2d && this._nest && this._nest.sheets.length)
    const ok1d = !!(!this.data.is2d && this._cut1d && this._cut1d.bars.length)
    if (!ok2d && !ok1d) {
      wx.showToast({ title: '没有可导出的图', icon: 'none' })
      return
    }
    this.ensureAlbumPerm(() => this.exportCombined())
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
  // 把全部方案画进「一张」长图后一次性存相册（型材切割图 / 玻璃·板材排料图通用，不再逐张弹）
  exportCombined() {
    this.setData({ saving2img: true })
    const q = this.createSelectorQuery()
    q.select('#cutexport')
      .fields({ node: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ saving2img: false })
          wx.showToast({ title: '画布未就绪', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        try {
          if (this.data.is2d) this.paintNestAll(canvas, ctx)
          else this.paintProfileAll(canvas, ctx)
        } catch (e) {
          this.setData({ saving2img: false })
          wx.showToast({ title: '生成图片失败', icon: 'none' })
          return
        }
        wx.canvasToTempFilePath({
          canvas,
          success: (rr) =>
            wx.saveImageToPhotosAlbum({
              filePath: rr.tempFilePath,
              success: () => {
                this.setData({ saving2img: false })
                wx.showToast({ title: '已保存到相册', icon: 'success' })
              },
              fail: () => {
                this.setData({ saving2img: false })
                wx.showToast({ title: '保存失败', icon: 'none' })
              },
            }),
          fail: () => {
            this.setData({ saving2img: false })
            wx.showToast({ title: '生成图片失败', icon: 'none' })
          },
        })
      })
  },

  // 玻璃 / 板材：所有原片排料图竖排进一张长图
  paintNestAll(canvas: any, ctx: any) {
    const r = this._nest!
    const W = 1000
    const margin = 24
    const headH = 56
    const titleH = 30
    const gap = 16
    const inner = W - margin * 2
    const scaleX = r.sheetW > 0 ? inner / r.sheetW : 1
    const n = r.sheets.length
    const MAX_H = 4000 // 画布上限：超出按比例压缩每片高度，确保单图可完整渲染
    let drawH = Math.max(60, Math.round(r.sheetH * scaleX))
    let totalH = margin * 2 + headH + n * (titleH + drawH + gap)
    if (totalH > MAX_H) {
      const avail = MAX_H - margin * 2 - headH - n * (titleH + gap)
      drawH = Math.max(28, Math.floor(avail / Math.max(1, n)))
      totalH = margin * 2 + headH + n * (titleH + drawH + gap)
    }
    const scaleY = r.sheetH > 0 ? drawH / r.sheetH : 1
    canvas.width = W
    canvas.height = totalH
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, totalH)
    const meta = MATERIALS[this.data.material] || MATERIALS.glass
    ctx.fillStyle = '#19271F'
    ctx.font = 'bold 26px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText(`${meta.name}排料图`, margin, margin)
    ctx.fillStyle = '#5C6B64'
    ctx.font = '15px sans-serif'
    ctx.fillText(
      `整板 ${r.sheetW}×${r.sheetH}　用料 ${r.sheetCount} 块　利用率 ${(r.utilization * 100).toFixed(1)}%　已排 ${r.totalPieces} 件`,
      margin,
      margin + 32,
    )
    let y = margin + headH
    r.sheets.forEach((sheet, si) => {
      const util = ((sheet.usedArea / (r.sheetW * r.sheetH)) * 100).toFixed(1)
      ctx.fillStyle = '#19271F'
      ctx.font = 'bold 16px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(`原片 ${si + 1}/${n}　${sheet.placements.length} 块　利用率 ${util}%`, margin, y)
      const ox = margin
      const oy = y + titleH - 4
      ctx.fillStyle = '#F3F8F5'
      ctx.fillRect(ox, oy, inner, drawH)
      sheet.placements.forEach((p) => {
        const px = ox + p.x * scaleX
        const py = oy + p.y * scaleY
        const pw = Math.max(1, p.w * scaleX)
        const ph = Math.max(1, p.h * scaleY)
        ctx.fillStyle = 'rgba(14,124,102,0.16)'
        ctx.fillRect(px, py, pw, ph)
        ctx.strokeStyle = '#0E7C66'
        ctx.lineWidth = 1.5
        ctx.strokeRect(px, py, pw, ph)
        if (pw > 52 && ph > 24) {
          ctx.fillStyle = '#0E7C66'
          ctx.font = '15px sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${p.w}×${p.h}`, px + 5, py + ph / 2)
          ctx.textBaseline = 'top'
        }
      })
      ctx.strokeStyle = '#C5D6CD'
      ctx.lineWidth = 2
      ctx.strokeRect(ox, oy, inner, drawH)
      y = oy + drawH + gap
    })
  },

  // 型材：每根料一条水平条，按段长比例分段（含锯缝缝隙 + 余料），全部竖排进一张长图
  paintProfileAll(canvas: any, ctx: any) {
    const r = this._cut1d || {}
    const bars: any[] = r.bars || []
    const stock = r.stockLength || 0
    const kerf = r.kerf || 0
    const W = 1000
    const margin = 24
    const headH = 56
    const labelH = 24
    const gap = 18
    const inner = W - margin * 2
    const n = bars.length
    const MAX_H = 4000
    let barH = 34
    let totalH = margin * 2 + headH + n * (labelH + barH + gap)
    if (totalH > MAX_H) {
      const avail = MAX_H - margin * 2 - headH - n * (labelH + gap)
      barH = Math.max(14, Math.floor(avail / Math.max(1, n)))
      totalH = margin * 2 + headH + n * (labelH + barH + gap)
    }
    const scale = stock > 0 ? inner / stock : 1
    canvas.width = W
    canvas.height = totalH
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, totalH)
    ctx.fillStyle = '#19271F'
    ctx.font = 'bold 26px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText('型材切割图', margin, margin)
    ctx.fillStyle = '#5C6B64'
    ctx.font = '15px sans-serif'
    ctx.fillText(
      `整根 ${stock}mm　锯缝 ${kerf}mm　用料 ${r.barCount || n} 根　利用率 ${((r.utilization || 0) * 100).toFixed(1)}%　总段数 ${r.totalPieces || 0}`,
      margin,
      margin + 32,
    )
    let y = margin + headH
    bars.forEach((b: any, bi: number) => {
      const cuts: number[] = b.cuts || []
      ctx.fillStyle = '#19271F'
      ctx.font = 'bold 15px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(`第 ${bi + 1} 根　${cuts.length} 段　余料 ${b.waste}mm`, margin, y)
      const ox = margin
      const oy = y + labelH
      // 底板（余料浅灰底）
      ctx.fillStyle = '#F0EEE6'
      ctx.fillRect(ox, oy, inner, barH)
      // 逐段绘制（段间留锯缝缝隙）
      let cx = ox
      cuts.forEach((len: number, ci: number) => {
        if (ci > 0) {
          const kw = Math.max(0, kerf * scale)
          if (kw > 0) {
            ctx.fillStyle = '#D7DCD6'
            ctx.fillRect(cx, oy, kw, barH)
            cx += kw
          }
        }
        const sw = Math.max(2, len * scale)
        ctx.fillStyle = 'rgba(14,124,102,0.18)'
        ctx.fillRect(cx, oy, sw, barH)
        ctx.strokeStyle = '#0E7C66'
        ctx.lineWidth = 1.5
        ctx.strokeRect(cx, oy, sw, barH)
        if (sw > 38 && barH > 18) {
          ctx.fillStyle = '#0E7C66'
          ctx.font = '14px sans-serif'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${len}`, cx + 4, oy + barH / 2)
          ctx.textBaseline = 'top'
        }
        cx += sw
      })
      // 整根外框
      ctx.strokeStyle = '#C5D6CD'
      ctx.lineWidth = 2
      ctx.strokeRect(ox, oy, inner, barH)
      // 余料标注（足够宽才画）
      const wasteW = Math.max(0, (b.waste || 0) * scale)
      if (wasteW > 48 && barH > 16) {
        ctx.fillStyle = '#9A8F76'
        ctx.font = '13px sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(`余 ${b.waste}`, ox + inner - wasteW + 4, oy + barH / 2)
        ctx.textBaseline = 'top'
      }
      y = oy + barH + gap
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
