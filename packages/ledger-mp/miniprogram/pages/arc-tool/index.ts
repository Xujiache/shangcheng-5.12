import { MotionPage } from '../../utils/page-transition'
import {
  initialMembershipAccess,
  membershipAccessView,
  verifyMembershipAccess,
} from '../../utils/membership-access'

type Key = 'r' | 'chord' | 'arc' | 'height' | 'angle'
type Values = Record<Key, string>
type Arc = {
  r: number
  chord: number
  arc: number
  height: number
  angle: number
  sectorArea: number
  segmentArea: number
}

const ORDER: Key[] = ['r', 'chord', 'arc', 'height', 'angle']
const PI = Math.PI
const EPS = 1e-7
const emptyValues = (): Values => ({ r: '', chord: '', arc: '', height: '', angle: '' })

function fmt(n: number, unit = '') {
  if (!isFinite(n)) return '-'
  const rounded = Math.round(n * 1000) / 1000
  return (
    String(
      Number.isInteger(rounded)
        ? rounded
        : rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''),
    ) + unit
  )
}

function parsePositive(v: string) {
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : undefined
}

function bisect(fn: (x: number) => number, low: number, high: number) {
  let lo = low
  let hi = high
  let flo = fn(lo)
  const fhi = fn(hi)
  if (Math.abs(flo) < 1e-9) return lo
  if (Math.abs(fhi) < 1e-9) return hi
  if (flo * fhi > 0) throw new Error('参数组合无法计算')
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const fm = fn(mid)
    if (Math.abs(fm) < 1e-9) return mid
    if (flo * fm <= 0) {
      hi = mid
    } else {
      lo = mid
      flo = fm
    }
  }
  return (lo + hi) / 2
}

function finish(r: number, theta: number): Arc {
  if (!(r > 0) || !(theta > 0) || theta >= PI + 1e-5) throw new Error('参数不构成有效圆弧')
  const chord = 2 * r * Math.sin(theta / 2)
  const arc = r * theta
  const height = r * (1 - Math.cos(theta / 2))
  const sectorArea = (r * r * theta) / 2
  const segmentArea = (r * r * (theta - Math.sin(theta))) / 2
  return { r, chord, arc, height, angle: (theta * 180) / PI, sectorArea, segmentArea }
}

function solve(raw: Partial<Record<Key, number>>): Arc {
  const r = raw.r
  const c = raw.chord
  const l = raw.arc
  const h = raw.height
  const deg = raw.angle
  const t = deg ? (deg * PI) / 180 : undefined

  if (r && t) return finish(r, t)
  if (r && c) {
    if (c > 2 * r) throw new Error('弦长不能大于直径')
    return finish(r, 2 * Math.asin(c / (2 * r)))
  }
  if (r && l) return finish(r, l / r)
  if (r && h) {
    if (h >= r) throw new Error('拱高需小于半径')
    return finish(r, 2 * Math.acos(1 - h / r))
  }
  if (c && t) return finish(c / (2 * Math.sin(t / 2)), t)
  if (l && t) return finish(l / t, t)
  if (h && t) return finish(h / (1 - Math.cos(t / 2)), t)
  if (c && h)
    return finish((c * c) / (8 * h) + h / 2, 2 * Math.asin(c / (2 * ((c * c) / (8 * h) + h / 2))))
  if (c && l) {
    if (l < c) throw new Error('弧长不能小于弦长')
    const ratio = l / c
    const theta = bisect((x) => x / (2 * Math.sin(x / 2)) - ratio, EPS, PI - EPS)
    return finish(l / theta, theta)
  }
  if (l && h) {
    const ratio = h / l
    if (ratio >= 1 / PI) throw new Error('拱高与弧长不匹配')
    const theta = bisect((x) => (1 - Math.cos(x / 2)) / x - ratio, EPS, PI - EPS)
    return finish(l / theta, theta)
  }
  throw new Error('参数组合无法计算')
}

MotionPage({
  _accessSeq: 0,
  data: {
    ...initialMembershipAccess(),
    values: emptyValues(),
    resultRows: [] as Array<{ label: string; value: string }>,
  },
  onShow() {
    this.checkAccess()
  },
  async checkAccess() {
    const seq = (this._accessSeq = (this._accessSeq || 0) + 1)
    const initial = initialMembershipAccess()
    this.setData(initial)
    if (initial.accessState === 'guest') {
      this.setData({ values: emptyValues(), resultRows: [] })
      return
    }
    const state = await verifyMembershipAccess()
    if (seq !== this._accessSeq) return
    const patch: Record<string, any> = membershipAccessView(state)
    if (state !== 'active') {
      patch.values = emptyValues()
      patch.resultRows = []
    }
    this.setData(patch)
  },
  openAccess() {
    if (this.data.accessState === 'checking') {
      wx.showToast({ title: '正在校验会员状态', icon: 'none' })
      return
    }
    if (this.data.accessState === 'error') {
      this.checkAccess()
      return
    }
    this.checkAccess()
  },
  ensureAccess(): boolean {
    return !!this.data.canUse
  },
  onInput(e: any) {
    if (!this.ensureAccess()) return
    const key = e.currentTarget.dataset.key as Key
    this.setData({ ['values.' + key]: e.detail.value })
  },
  calc() {
    if (!this.ensureAccess()) return
    const vals = this.data.values as Values
    const selected = ORDER.filter((k) => String(vals[k]).trim()).slice(0, 2)
    if (selected.length < 2) {
      wx.showToast({ title: '请至少输入 2 个参数', icon: 'none' })
      return
    }
    const input: Partial<Record<Key, number>> = {}
    for (const k of selected) {
      const n = parsePositive(vals[k])
      if (n === undefined) {
        wx.showToast({ title: '参数必须大于 0', icon: 'none' })
        return
      }
      input[k] = n
    }
    try {
      const r = solve(input)
      this.setData({
        resultRows: [
          { label: '半径', value: fmt(r.r) },
          { label: '弦长 AC', value: fmt(r.chord) },
          { label: '弧长 ABC', value: fmt(r.arc) },
          { label: '拱高 BD', value: fmt(r.height) },
          { label: '角 a', value: fmt(r.angle, '°') },
          { label: '扇形面积', value: fmt(r.sectorArea) },
          { label: '弓形面积', value: fmt(r.segmentArea) },
        ],
      })
    } catch (e: any) {
      wx.showToast({ title: e?.message || '参数组合无法计算', icon: 'none' })
    }
  },
  clear() {
    if (!this.ensureAccess()) return
    this.setData({
      values: emptyValues(),
      resultRows: [],
    })
  },
})

export {}
