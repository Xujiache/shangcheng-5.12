Component({
  data: {
    selected: 0,
    tabs: [
      { url: '/pages/home/index' },
      { url: '/pages/orders/index' },
      { url: '/pages/reports/index' },
      { url: '/pages/profile/index' },
    ],
  },
  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      const url = this.data.tabs[index].url
      wx.switchTab({ url })
    },
    onAdd() {
      wx.navigateTo({ url: '/pages/order-edit/index' })
    },
  },
})
