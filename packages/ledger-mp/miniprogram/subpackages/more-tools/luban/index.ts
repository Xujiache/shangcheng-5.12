import { MotionPage } from '../../../utils/page-transition'
import {
  goToLogin,
  getCurrentLedgerAccountId,
  isLoggedIn,
  requireLogin,
} from '../../../utils/store'
import { lookupLength, nearbyAuspicious } from '../utils/luban'
import { reportToolEvent } from '../../../utils/tool-events'
import { toolShare, toolShareTimeline } from '../utils/tool-share'

const units = ['mm', 'cm', 'm']
const rules = [
  { id: 'yang', label: '文公尺 · 429 mm / 周期' },
  { id: 'yin', label: '丁兰尺 · 388 mm / 周期' },
]
const fmt = (n: number) => String(Number(n.toFixed(3)))
const scaledText = (mm: number, unit: string) =>
  fmt(mm / (unit === 'm' ? 1000 : unit === 'cm' ? 10 : 1))
const storageKey = (id: string) => 'ledger_luban_records_v1:' + id
type CellView = { key: string; group: string; name: string; good: boolean }
type Saved = {
  id: string
  size: number
  note: string
  time: number
  display: string
  mode?: 'single' | 'door'
  widthMm?: number
  heightMm?: number
  ruleIndex?: number
  requireBoth?: boolean
  tolerance?: string
}

function cellsAt(lengthMm: number, id: 'yang' | 'yin') {
  const cellWidthMm = id === 'yang' ? 429 / 32 : 388 / 40
  const firstIndex = Math.floor(lengthMm / cellWidthMm) - 8
  const cells: CellView[] = []
  for (let i = 0; i < 17; i++) {
    const index = firstIndex + i
    const middle = (index + 0.5) * cellWidthMm
    const hit = middle > 0 ? lookupLength(fmt(middle), 'mm', id) : null
    cells.push({
      key: String(index),
      group: hit?.ok ? hit.group.name : '',
      name: hit?.ok ? hit.item.name : '',
      good: !!hit?.ok && hit.group.auspicious,
    })
  }
  return {
    cells,
    width: Number((cellWidthMm * 4).toFixed(3)),
    offset: Number((-(lengthMm - firstIndex * cellWidthMm) * 4).toFixed(3)),
  }
}

MotionPage({
  _opened: false,
  _drag: null as { x: number; y: number; value: number } | null,
  data: {
    authorized: false,
    mode: 'single',
    activePart: 'width',
    units,
    unitIndex: 0,
    rules,
    ruleIndex: 0,
    lengthInput: '1975',
    lengthMm: 1975,
    widthMm: 1975,
    heightMm: 2100,
    yangCells: [] as CellView[],
    yinCells: [] as CellView[],
    yangCellWidth: 0,
    yinCellWidth: 0,
    yangOffset: 0,
    yinOffset: 0,
    yangGroup: '',
    yangItem: '',
    yinGroup: '',
    yinItem: '',
    yangGood: false,
    yinGood: false,
    steps: [-20, -10, -5, 5, 10, 20],
    ranges: [30, 100, 300],
    tolerance: '30',
    requireBoth: false,
    searched: false,
    suggestions: [] as Array<{ targetMm: number; summary: string }>,
    records: [] as Saved[],
    showJump: false,
    error: '',
  },
  onLoad() {
    this.updateLength(1975, false)
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) {
      requireLogin('登录后可免费使用鲁班尺。')
      return
    }
    if (!this._opened) {
      this._opened = true
      reportToolEvent('luban', 'open')
    }
    const accountId = getCurrentLedgerAccountId()
    if (accountId) {
      try {
        const records = wx.getStorageSync(storageKey(accountId))
        if (Array.isArray(records))
          this.setData({
            records: records.slice(0, 10).map((record: Saved) => ({
              ...record,
              display:
                record.mode === 'door' && record.widthMm && record.heightMm
                  ? `${record.widthMm} × ${record.heightMm} mm`
                  : `${record.size} mm`,
            })),
          })
      } catch {
        /* 本机记录不可读不影响尺格 */
      }
    }
  },
  onShareAppMessage() {
    return toolShare('luban')
  },
  onShareTimeline() {
    return toolShareTimeline('luban')
  },
  login() {
    goToLogin()
  },
  updateLength(lengthMm: number, showJump = true) {
    if (!Number.isFinite(lengthMm) || lengthMm <= 0 || lengthMm > 100000) {
      this.setData({ error: '请输入大于 0 且不超过 100 米的尺寸' })
      return
    }
    const mm = Number(lengthMm.toFixed(3))
    const yang = lookupLength(mm, 'mm', 'yang')
    const yin = lookupLength(mm, 'mm', 'yin')
    if (!yang.ok || !yin.ok) {
      this.setData({ error: '尺寸无效，请检查输入精度' })
      return
    }
    const yangTrack = cellsAt(mm, 'yang')
    const yinTrack = cellsAt(mm, 'yin')
    const patch: Record<string, any> = {
      lengthMm: mm,
      lengthInput: scaledText(mm, units[this.data.unitIndex]),
      yangCells: yangTrack.cells,
      yinCells: yinTrack.cells,
      yangCellWidth: yangTrack.width,
      yinCellWidth: yinTrack.width,
      yangOffset: yangTrack.offset,
      yinOffset: yinTrack.offset,
      yangGroup: yang.group.name,
      yangItem: yang.item.name,
      yangGood: yang.group.auspicious,
      yinGroup: yin.group.name,
      yinItem: yin.item.name,
      yinGood: yin.group.auspicious,
      searched: false,
      suggestions: [],
      showJump,
      error: '',
    }
    if (this.data.mode === 'door')
      patch[this.data.activePart === 'width' ? 'widthMm' : 'heightMm'] = mm
    this.setData(patch)
  },
  onLengthInput(event: any) {
    const value = String(event.detail.value || '')
    const hit = lookupLength(value, units[this.data.unitIndex])
    if (!hit.ok) {
      this.setData({ lengthInput: value, error: hit.error, showJump: false })
      return
    }
    this.updateLength(hit.lengthMm)
  },
  changeUnit(event: any) {
    const unitIndex = Number(event.detail.value)
    if (!Number.isInteger(unitIndex) || !units[unitIndex]) return
    this.setData({ unitIndex, lengthInput: scaledText(this.data.lengthMm, units[unitIndex]) })
  },
  changeRule(event: any) {
    const ruleIndex = Number(event.detail.value)
    if (rules[ruleIndex]) this.setData({ ruleIndex })
  },
  changeMode(event: any) {
    const mode = String(event.currentTarget.dataset.mode)
    if (mode !== 'single' && mode !== 'door') return
    this.setData({ mode, activePart: 'width' }, () => {
      if (mode === 'door') this.updateLength(this.data.widthMm, false)
    })
  },
  selectPart(event: any) {
    const part = String(event.currentTarget.dataset.part)
    if (part !== 'width' && part !== 'height') return
    this.setData({ activePart: part }, () =>
      this.updateLength(part === 'width' ? this.data.widthMm : this.data.heightMm, false),
    )
  },
  step(event: any) {
    if (this.data.error) return
    const delta = Number(event.currentTarget.dataset.step)
    this.updateLength(Math.max(0.001, Math.min(100000, this.data.lengthMm + delta)))
  },
  startDrag(event: any) {
    if (this.data.error) return
    const touch = event.touches?.[0]
    if (touch) this._drag = { x: touch.clientX, y: touch.clientY, value: this.data.lengthMm }
  },
  moveDrag(event: any) {
    const touch = event.touches?.[0]
    const drag = this._drag
    if (!touch || !drag) return
    const dx = touch.clientX - drag.x
    const dy = touch.clientY - drag.y
    if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(dy)) return
    this.updateLength(Math.max(0.001, Math.min(100000, drag.value - dx / 4)), false)
  },
  endDrag() {
    this._drag = null
    if (!this.data.error) this.setData({ showJump: true })
  },
  onTolerance(event: any) {
    this.setData({ tolerance: String(event.detail.value || '') })
  },
  chooseRange(event: any) {
    this.setData({ tolerance: String(event.currentTarget.dataset.range) })
  },
  onBothChange(event: any) {
    this.setData({ requireBoth: !!event.detail.value })
  },
  findNearby() {
    if (this.data.error) return
    const tolerance = Number(this.data.tolerance)
    const result = nearbyAuspicious(this.data.lengthMm, rules[this.data.ruleIndex].id, {
      toleranceMm: tolerance,
      limit: 8,
      requireBoth: this.data.requireBoth,
    })
    if (!result.ok || !result.items) {
      wx.showToast({ title: result.error || '查找失败', icon: 'none' })
      return
    }
    this.setData({
      searched: true,
      showJump: true,
      suggestions: result.items.map((item) => ({
        targetMm: item.targetMm,
        summary: `文公 ${item.yang.group.name} · 丁兰 ${item.yin.group.name}`,
      })),
    })
  },
  applySuggestion(event: any) {
    this.updateLength(Number(event.currentTarget.dataset.size), false)
  },
  jumpToResult() {
    wx.pageScrollTo({ selector: '#luban-result', duration: 280 })
    this.setData({ showJump: false })
  },
  copyResult() {
    if (this.data.error) return
    wx.setClipboardData({
      data: `${this.data.lengthMm} mm｜文公尺：${this.data.yangGroup}·${this.data.yangItem}；丁兰尺：${this.data.yinGroup}·${this.data.yinItem}`,
      success: () => {
        reportToolEvent('luban', 'success')
        wx.showToast({ title: '已复制', icon: 'success' })
      },
      fail: () => {
        reportToolEvent('luban', 'failure')
        wx.showToast({ title: '复制失败', icon: 'none' })
      },
    })
  },
  saveRecord() {
    if (this.data.error) return
    const accountId = getCurrentLedgerAccountId()
    if (!accountId) {
      wx.showToast({ title: '请重新登录', icon: 'none' })
      return
    }
    wx.showModal({
      title: '保存尺寸',
      editable: true,
      placeholderText: '备注（可不填）',
      success: (result) => {
        if (!result.confirm) return
        const record: Saved = {
          id: String(Date.now()),
          size: this.data.lengthMm,
          note:
            String(result.content || '')
              .trim()
              .slice(0, 40) || `${this.data.lengthMm} mm`,
          time: Date.now(),
          display:
            this.data.mode === 'door'
              ? `${this.data.widthMm} × ${this.data.heightMm} mm`
              : `${this.data.lengthMm} mm`,
          mode: this.data.mode as 'single' | 'door',
          widthMm: this.data.widthMm,
          heightMm: this.data.heightMm,
          ruleIndex: this.data.ruleIndex,
          requireBoth: this.data.requireBoth,
          tolerance: this.data.tolerance,
        }
        const records = [record, ...this.data.records].slice(0, 10)
        try {
          wx.setStorageSync(storageKey(accountId), records)
          this.setData({ records })
          reportToolEvent('luban', 'success')
          wx.showToast({ title: '已保存到本机', icon: 'success' })
        } catch {
          reportToolEvent('luban', 'failure')
          wx.showToast({ title: '本机保存失败', icon: 'none' })
        }
      },
    })
  },
  restoreRecord(event: any) {
    const record = this.data.records.find((item) => item.id === event.currentTarget.dataset.id)
    if (!record) return
    const mode = record.mode === 'door' ? 'door' : 'single'
    this.setData(
      {
        mode,
        activePart: 'width',
        widthMm: record.widthMm || record.size,
        heightMm: record.heightMm || this.data.heightMm,
        ruleIndex: rules[record.ruleIndex || 0] ? record.ruleIndex || 0 : 0,
        requireBoth: !!record.requireBoth,
        tolerance: record.tolerance || '30',
      },
      () => this.updateLength(mode === 'door' ? record.widthMm || record.size : record.size, true),
    )
  },
})
