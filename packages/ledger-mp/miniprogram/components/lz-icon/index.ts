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
      this.setData({ src: svgIcon(name, color, size, stroke) })
    },
  },
  lifetimes: {
    attached() {
      const { name, color, size, stroke } = this.properties
      this.setData({ src: svgIcon(name, color as string, size, stroke) })
    },
  },
})
