const CANVAS_SIZE = 560

Component({
  properties: {
    visible: { type: Boolean, value: false },
    imagePath: { type: String, value: '' },
  },
  data: {
    ready: false,
    baseScale: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    imageWidth: 560,
    imageHeight: 560,
    busy: false,
  },
  observers: {
    'visible, imagePath'(visible: boolean, imagePath: string) {
      if (visible && imagePath) this.prepare(imagePath)
    },
  },
  methods: {
    prepare(path: string) {
      this.setData({ ready: false, busy: false })
      wx.getImageInfo({
        src: path,
        success: (info) => {
          const baseScale = Math.max(CANVAS_SIZE / info.width, CANVAS_SIZE / info.height)
          this.setData(
            { ready: true, imageWidth: info.width, imageHeight: info.height, baseScale, scale: baseScale, offsetX: 0, offsetY: 0 },
            () => this.draw(),
          )
        },
        fail: () => {
          wx.showToast({ title: '图片加载失败，请重试', icon: 'none' })
          this.triggerEvent('cancel')
        },
      })
    },

    clampOffset(this: any, x: number, y: number, scale?: number) {
      const info = this.data as any
      const currentScale = scale === undefined ? this.data.scale : scale
      const width = (info.imageWidth || CANVAS_SIZE) * currentScale
      const height = (info.imageHeight || CANVAS_SIZE) * currentScale
      const limitX = Math.max(0, (width - CANVAS_SIZE) / 2)
      const limitY = Math.max(0, (height - CANVAS_SIZE) / 2)
      return {
        x: Math.max(-limitX, Math.min(limitX, x)),
        y: Math.max(-limitY, Math.min(limitY, y)),
      }
    },

    draw() {
      if (!this.data.ready || !this.properties.imagePath) return
      const ctx = wx.createCanvasContext('avatarCropCanvas', this)
      const scale = this.data.scale
      const width = (this.data as any).imageWidth || CANVAS_SIZE
      const height = (this.data as any).imageHeight || CANVAS_SIZE
      const drawWidth = width * scale
      const drawHeight = height * scale
      ctx.setFillStyle('#111')
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.drawImage(
        this.properties.imagePath,
        (CANVAS_SIZE - drawWidth) / 2 + this.data.offsetX,
        (CANVAS_SIZE - drawHeight) / 2 + this.data.offsetY,
        drawWidth,
        drawHeight,
      )
      ctx.draw()
    },

    onTouchStart(e: any) {
      const touches = e.touches || []
      if (touches.length >= 2) {
        const dx = touches[0].x - touches[1].x
        const dy = touches[0].y - touches[1].y
        ;(this as any)._pinch = { distance: Math.sqrt(dx * dx + dy * dy), scale: this.data.scale }
        return
      }
      if (touches[0]) (this as any)._drag = { x: touches[0].x, y: touches[0].y }
    },

    onTouchMove(e: any) {
      const touches = e.touches || []
      if (touches.length >= 2 && (this as any)._pinch) {
        const dx = touches[0].x - touches[1].x
        const dy = touches[0].y - touches[1].y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const pinch = (this as any)._pinch
        const scale = Math.max(this.data.baseScale, Math.min(this.data.baseScale * 4, pinch.scale * distance / Math.max(1, pinch.distance)))
        const offset = this.clampOffset(this.data.offsetX, this.data.offsetY, scale)
        this.setData({ scale, offsetX: offset.x, offsetY: offset.y }, () => this.draw())
        return
      }
      const drag = (this as any)._drag
      if (!drag || !touches[0]) return
      const offset = this.clampOffset(
        this.data.offsetX + touches[0].x - drag.x,
        this.data.offsetY + touches[0].y - drag.y,
      )
      ;(this as any)._drag = { x: touches[0].x, y: touches[0].y }
      this.setData({ offsetX: offset.x, offsetY: offset.y }, () => this.draw())
    },

    onTouchEnd() {
      delete (this as any)._drag
      delete (this as any)._pinch
    },

    onReset() {
      this.setData({ scale: this.data.baseScale, offsetX: 0, offsetY: 0 }, () => this.draw())
    },

    onCancel() {
      if (!this.data.busy) this.triggerEvent('cancel')
    },

    noop() {},

    onConfirm() {
      if (!this.data.ready || this.data.busy) return
      this.setData({ busy: true })
      wx.canvasToTempFilePath({
        canvasId: 'avatarCropCanvas',
        x: 0,
        y: 0,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        destWidth: 512,
        destHeight: 512,
        fileType: 'jpg',
        quality: 0.9,
        success: (res) => this.triggerEvent('confirm', { filePath: res.tempFilePath }),
        fail: () => wx.showToast({ title: '裁剪失败，请重试', icon: 'none' }),
        complete: () => this.setData({ busy: false }),
      }, this)
    },
  },
  lifetimes: {
    ready() {
      const path = this.properties.imagePath
      if (this.properties.visible && path) this.prepare(path)
    },
  },
})
