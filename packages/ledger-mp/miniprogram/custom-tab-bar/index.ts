// FAB 防连点：双击会叠开两个空白「新增订单」页，保存返回时落在第二个空表单上易重复记账
let adding = false

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
      if (adding) return
      adding = true
      wx.navigateTo({
        url: '/pages/order-edit/index',
        complete: () => setTimeout(() => (adding = false), 600),
      })
    },
  },
})
