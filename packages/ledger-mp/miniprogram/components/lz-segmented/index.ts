Component({
  properties: {
    options: { type: Array, value: [] as Array<{ value: string; label: string }> },
    value: { type: String, value: '' },
  },
  data: { idx: 0, count: 1 },
  observers: {
    'options, value'(options: Array<{ value: string }>, value: string) {
      const count = Math.max(1, (options || []).length)
      const idx = Math.max(
        0,
        (options || []).findIndex((o) => o.value === value),
      )
      this.setData({ idx: idx < 0 ? 0 : idx, count })
    },
  },
  methods: {
    pick(e: WechatMiniprogram.TouchEvent) {
      const value = e.currentTarget.dataset.value
      if (value !== this.properties.value) this.triggerEvent('change', { value })
    },
  },
})
