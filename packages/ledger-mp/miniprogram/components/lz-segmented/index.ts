Component({
  properties: {
    options: { type: Array, value: [] as Array<{ value: string; label: string }> },
    value: { type: String, value: '' },
  },
  data: { idx: 0, count: 1, dragging: false, dragIdx: 0 },
  observers: {
    'options, value'(options: Array<{ value: string }>, value: string) {
      const count = Math.max(1, (options || []).length)
      let idx = (options || []).findIndex((o) => o.value === value)
      if (idx < 0) idx = 0
      // 非拖拽态才把视觉指示器同步到选中项（拖拽中由 dragIdx 主导，避免回弹）
      const patch: any = { idx, count }
      if (!this.data.dragging) patch.dragIdx = idx
      this.setData(patch)
    },
  },
  lifetimes: {
    ready() {
      this._measure()
    },
  },
  methods: {
    _measure() {
      this.createSelectorQuery()
        .select('.seg')
        .boundingClientRect((r: any) => {
          if (r) (this as any)._rect = r
        })
        .exec()
    },
    _idxFromX(clientX: number): number {
      const r = (this as any)._rect
      const count = this.data.count
      if (!r || !r.width) return this.data.idx
      const raw = Math.floor(((clientX - r.left) / r.width) * count)
      return Math.min(count - 1, Math.max(0, raw))
    },
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      const t = e.touches && e.touches[0]
      if (!t) return
      const di = (this as any)._rect ? this._idxFromX(t.clientX) : this.data.idx
      this.setData({ dragging: true, dragIdx: di })
      this._measure()
    },
    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      if (!this.data.dragging) return
      const t = e.touches && e.touches[0]
      if (!t) return
      const di = this._idxFromX(t.clientX)
      if (di !== this.data.dragIdx) this.setData({ dragIdx: di })
    },
    onTouchEnd() {
      if (!this.data.dragging) return
      const di = this.data.dragIdx
      this.setData({ dragging: false })
      const opt = (this.properties.options as any[])[di]
      if (opt && opt.value !== this.properties.value) {
        this.triggerEvent('change', { value: opt.value })
      } else {
        this.setData({ dragIdx: this.data.idx })
      }
    },
  },
})
