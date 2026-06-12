import { svgIcon } from '../../utils/icons'

Component({
  options: { virtualHost: true },
  properties: {
    name: { type: String, value: '' },
    size: { type: Number, value: 22 },
    color: { type: String, value: 'text' },
    stroke: { type: Number, value: 1.8 },
  },
  data: { src: '' },
  observers: {
    'name, color, size, stroke'(name: string, color: string, size: number, stroke: number) {
      this.applySrc(name, color, size, stroke)
    },
  },
  lifetimes: {
    // 兜底：属性全为默认值时多字段观察器不会触发；已与观察器结果一致时跳过 setData
    attached() {
      const { name, color, size, stroke } = this.properties
      this.applySrc(name as string, color as string, size as number, stroke as number)
    },
  },
  methods: {
    applySrc(name: string, color: string, size: number, stroke: number) {
      const src = svgIcon(name, color, size, stroke)
      if (src !== this.data.src) this.setData({ src })
    },
  },
})
