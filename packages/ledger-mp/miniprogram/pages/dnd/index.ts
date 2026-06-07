Page({
  data: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },

  onToggle() {
    this.setData({ enabled: !this.data.enabled })
  },
  onStart(e: any) {
    this.setData({ start: e.detail.value })
  },
  onEnd(e: any) {
    this.setData({ end: e.detail.value })
  },
})
