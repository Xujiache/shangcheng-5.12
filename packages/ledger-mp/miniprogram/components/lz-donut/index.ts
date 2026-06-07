import { resolveColor } from '../../utils/icons'

Component({
  properties: {
    data: { type: Array, value: [] as Array<{ value: number; color: string }> },
    size: { type: Number, value: 160 },
    thickness: { type: Number, value: 22 },
  },
  lifetimes: {
    ready() {
      this.draw()
    },
  },
  observers: {
    'data, size, thickness'() {
      this.draw()
    },
  },
  methods: {
    draw() {
      const q = this.createSelectorQuery()
      q.select('#dn')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          const size = this.data.size as number
          let dpr = 2
          try {
            dpr =
              (wx.getWindowInfo
                ? wx.getWindowInfo().pixelRatio
                : wx.getSystemInfoSync().pixelRatio) || 2
          } catch (e) {
            dpr = 2
          }
          canvas.width = size * dpr
          canvas.height = size * dpr
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, size, size)

          const data = (this.data.data || []).filter((d: any) => Number(d.value) > 0)
          const total = data.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 1
          const th = this.data.thickness as number
          const r = (size - th) / 2
          const cx = size / 2
          const cy = size / 2

          // 轨道
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.strokeStyle = '#ECEFED'
          ctx.lineWidth = th
          ctx.stroke()

          // 各段
          let start = -Math.PI / 2
          data.forEach((d: any) => {
            const ang = (Number(d.value) / total) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r, start, start + ang)
            ctx.strokeStyle = resolveColor(d.color)
            ctx.lineWidth = th
            ctx.stroke()
            start += ang
          })
        })
    },
  },
})
