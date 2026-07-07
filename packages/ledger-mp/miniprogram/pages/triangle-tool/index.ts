type Key = 'a' | 'b' | 'c' | 'A' | 'B' | 'C'
type Values = Record<Key, string>
type Tri = Partial<Record<Key, number>>

const ORDER: Key[] = ['a', 'b', 'c', 'A', 'B', 'C']
const EPS = 1e-8

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI
const sinD = (d: number) => Math.sin(toRad(d))
const cosD = (d: number) => Math.cos(toRad(d))
const asinD = (v: number) => toDeg(Math.asin(Math.max(-1, Math.min(1, v))))
const acosD = (v: number) => toDeg(Math.acos(Math.max(-1, Math.min(1, v))))

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

function sideByLawOfSines(side: number, sideAngle: number, targetAngle: number) {
  return (side * sinD(targetAngle)) / sinD(sideAngle)
}

function solve(input: Tri): Tri & { h: number; area: number } {
  const t: Tri = { ...input }
  for (let i = 0; i < 8; i++) {
    if (t.A && t.B && !t.C) t.C = 180 - t.A - t.B
    if (t.A && t.C && !t.B) t.B = 180 - t.A - t.C
    if (t.B && t.C && !t.A) t.A = 180 - t.B - t.C

    if (t.a && t.b && t.c) {
      t.A = acosD((t.b * t.b + t.c * t.c - t.a * t.a) / (2 * t.b * t.c))
      t.B = acosD((t.a * t.a + t.c * t.c - t.b * t.b) / (2 * t.a * t.c))
      t.C = 180 - t.A - t.B
    }

    if (t.a && t.b && t.C && !t.c)
      t.c = Math.sqrt(t.a * t.a + t.b * t.b - 2 * t.a * t.b * cosD(t.C))
    if (t.a && t.c && t.B && !t.b)
      t.b = Math.sqrt(t.a * t.a + t.c * t.c - 2 * t.a * t.c * cosD(t.B))
    if (t.b && t.c && t.A && !t.a)
      t.a = Math.sqrt(t.b * t.b + t.c * t.c - 2 * t.b * t.c * cosD(t.A))

    if (t.A && t.B && t.C) {
      if (t.a && !t.b) t.b = sideByLawOfSines(t.a, t.A, t.B)
      if (t.a && !t.c) t.c = sideByLawOfSines(t.a, t.A, t.C)
      if (t.b && !t.a) t.a = sideByLawOfSines(t.b, t.B, t.A)
      if (t.b && !t.c) t.c = sideByLawOfSines(t.b, t.B, t.C)
      if (t.c && !t.a) t.a = sideByLawOfSines(t.c, t.C, t.A)
      if (t.c && !t.b) t.b = sideByLawOfSines(t.c, t.C, t.B)
    }

    if (t.a && t.A) {
      if (t.b && !t.B) t.B = asinD((t.b * sinD(t.A)) / t.a)
      if (t.c && !t.C) t.C = asinD((t.c * sinD(t.A)) / t.a)
    }
    if (t.b && t.B) {
      if (t.a && !t.A) t.A = asinD((t.a * sinD(t.B)) / t.b)
      if (t.c && !t.C) t.C = asinD((t.c * sinD(t.B)) / t.b)
    }
    if (t.c && t.C) {
      if (t.a && !t.A) t.A = asinD((t.a * sinD(t.C)) / t.c)
      if (t.b && !t.B) t.B = asinD((t.b * sinD(t.C)) / t.c)
    }
  }

  if (!t.a || !t.b || !t.c || !t.A || !t.B || !t.C) throw new Error('参数组合无法计算')
  if (t.A <= 0 || t.B <= 0 || t.C <= 0 || Math.abs(t.A + t.B + t.C - 180) > 0.01) {
    throw new Error('角度不构成三角形')
  }
  if (t.a + t.b <= t.c + EPS || t.a + t.c <= t.b + EPS || t.b + t.c <= t.a + EPS) {
    throw new Error('边长不构成三角形')
  }
  const p = (t.a + t.b + t.c) / 2
  const area = Math.sqrt(Math.max(0, p * (p - t.a) * (p - t.b) * (p - t.c)))
  return { ...t, h: (2 * area) / t.b, area }
}

Page({
  data: {
    values: { a: '', b: '', c: '', A: '', B: '', C: '' } as Values,
    resultRows: [] as Array<{ label: string; value: string }>,
  },
  onInput(e: any) {
    const key = e.currentTarget.dataset.key as Key
    this.setData({ ['values.' + key]: e.detail.value })
  },
  calc() {
    const vals = this.data.values as Values
    const selected = ORDER.filter((k) => String(vals[k]).trim()).slice(0, 3)
    if (selected.length < 3) {
      wx.showToast({ title: '请至少输入 3 个参数', icon: 'none' })
      return
    }
    if (selected.every((k) => k === 'A' || k === 'B' || k === 'C')) {
      wx.showToast({ title: '不能只输入 3 个角', icon: 'none' })
      return
    }
    const input: Tri = {}
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
          { label: 'a 边长', value: fmt(r.a!) },
          { label: 'b 边长', value: fmt(r.b!) },
          { label: 'c 边长', value: fmt(r.c!) },
          { label: 'A 角度', value: fmt(r.A!, '°') },
          { label: 'B 角度', value: fmt(r.B!, '°') },
          { label: 'C 角度', value: fmt(r.C!, '°') },
          { label: '高 h', value: fmt(r.h) },
          { label: '面积', value: fmt(r.area) },
        ],
      })
    } catch (e: any) {
      wx.showToast({ title: e?.message || '参数组合无法计算', icon: 'none' })
    }
  },
  clear() {
    this.setData({
      values: { a: '', b: '', c: '', A: '', B: '', C: '' },
      resultRows: [],
    })
  },
})

export {}
