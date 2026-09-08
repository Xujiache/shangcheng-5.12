// Generated bitmap assets only. Unknown names never fall back to an unrelated glyph.
export const WORKBOOK_ICON_NAMES = [
  'home',
  'calendar',
  'labor',
  'project',
  'wallet',
  'profit',
  'trend',
  'back',
  'chevron',
  'arrow-down',
  'arrow-up',
  'plus',
  'minus',
  'check',
  'close',
  'search',
  'trash',
  'phone',
  'pencil',
  'shield',
  'info',
  'orders',
  'pdf',
  'download',
  'camera',
  'photo',
  'clock',
  'template',
  'reset',
  'loading',
] as const
Component({
  options: { virtualHost: true },
  properties: {
    name: { type: String, value: '' },
    size: { type: Number, value: 22 },
    color: { type: String, value: 'accent' },
    stroke: { type: Number, value: 1.8 },
  },
  data: { src: '', displaySize: 22 },
  observers: {
    'name,size'(name: string, size: number) {
      this.resolve(name, size)
    },
  },
  lifetimes: {
    attached() {
      this.resolve(this.properties.name, this.properties.size)
    },
  },
  methods: {
    resolve(name: string, size: number) {
      const valid = (WORKBOOK_ICON_NAMES as readonly string[]).includes(name)
      const src = valid ? '/assets/workbook-icons/' + name + '.png' : ''
      const displaySize = Math.max(14, Math.min(80, Number(size) || 22))
      // The property observer may run before attached. Do not enqueue the same render twice.
      if (src !== this.data.src || displaySize !== this.data.displaySize) {
        this.setData({ src, displaySize })
      }
      if (name && !valid) console.error('Missing generated workbook icon:', name)
    },
  },
})
