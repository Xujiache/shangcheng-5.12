import { resolveColor } from '../../utils/icons'

Component({
  properties: {
    series: { type: Array, value: [] as Array<{ label: string; value: number; value2?: number }> },
    colors: { type: Array, value: ['accent'] },
    height: { type: Number, value: 150 },
    highlight: { type: Number, value: -1 },
  },
  data: {
    bars: [] as Array<{ h: number; h2: number; label: string }>,
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
      const bars = (series || []).map((s) => ({
        label: s.label,
        h: Math.max(s.value > 0 ? 2 : 0, ((Number(s.value) || 0) / safeMax) * height),
        h2: grouped
          ? Math.max((s.value2 || 0) > 0 ? 2 : 0, ((Number(s.value2) || 0) / safeMax) * height)
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
