import { getGlass, getLiquidTab, glassTabStyle } from '../utils/store'

// FAB 防连点：避免连续打开多个新增订单页面。
let adding = false

Component({
  data: {
    selected: -1,
    glass: true,
    liquid: true,
    barStyle: glassTabStyle(),
    tabs: [
      { url: '/pages/home/index' },
      { url: '/pages/orders/index' },
      { url: '/pages/reports/index' },
      { url: '/pages/profile/index' },
    ],
  },

  lifetimes: {
    attached() {
      this.refreshPrefs()
    },
  },

  pageLifetimes: {
    show() {
      this.refreshPrefs()
    },
  },

  methods: {
    refreshPrefs() {
      this.setData({
        glass: getGlass(),
        liquid: getLiquidTab(),
        barStyle: glassTabStyle(),
      })
    },

    // 各 Tab 页在 onShow 中同步当前位置。高亮只在本槽位淡入，
    // 不再跨页面共享坐标或依赖 touchend 回收放大状态。
    selectTab(index: number) {
      const selected = Math.min(3, Math.max(0, Number(index)))
      if (selected !== this.data.selected) this.setData({ selected })
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      if (!Number.isInteger(index) || index < 0 || index >= this.data.tabs.length) return
      if (index === this.data.selected) return
      wx.switchTab({ url: this.data.tabs[index].url })
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
