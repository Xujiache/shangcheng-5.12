import { resolveColor } from '../../utils/icons'

// 条形数字标签：>0 才显示，≥1万用「x.x万」缩写，否则整数
function fmtBarVal(v: number): string {
  if (!(v > 0)) return ''
  if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '万'
  return String(Math.round(v))
}

Component({
  properties: {
    series: { type: Array, value: [] as Array<{ label: string; value: number; value2?: number }> },
    colors: { type: Array, value: ['accent'] },
    height: { type: Number, value: 150 },
    highlight: { type: Number, value: -1 },
  },
  data: {
    bars: [] as Array<{ idx: number; h: number; h2: number; label: string; vt: string }>,
    grouped: false,
    c1: 'var(--accent)',
    c2: 'var(--c4)',
  },
  observers: {
    'series, colors, height'(series: any[], colors: string[], height: number) {
      const grouped = (colors || []).length > 1
      let max = 0
      ;(series || []).forEach((s) => {
        max = Math.max(max, Number(s.value) || 0, grouped ? Number(s.value2) || 0 : 0)
      })
      const safeMax = max || 1
      const drawMax = Math.max(20, height - 14) // 顶部留 14px 放数字标签
      const bars = (series || []).map((s, idx) => ({
        idx,
        label: s.label,
        vt: fmtBarVal(Number(s.value) || 0),
        h: Math.max(s.value > 0 ? 2 : 0, ((Number(s.value) || 0) / safeMax) * drawMax),
        h2: grouped
          ? Math.max((s.value2 || 0) > 0 ? 2 : 0, ((Number(s.value2) || 0) / safeMax) * drawMax)
          : 0,
      }))
      this.setData({
        bars,
        grouped,
        c1: resolveColor(colors && colors[0] ? colors[0] : 'accent'),
        c2: resolveColor(colors && colors[1] ? colors[1] : 'c4'),
      })
    },
  },
  methods: {
    onSel(e: WechatMiniprogram.TouchEvent) {
      this.triggerEvent('select', { index: Number(e.currentTarget.dataset.index) })
    },
  },
})
