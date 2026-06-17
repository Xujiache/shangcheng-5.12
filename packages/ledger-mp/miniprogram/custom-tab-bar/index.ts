import { getGlass, glassTabBg } from '../utils/store'

// FAB 防连点：双击会叠开两个空白「新增订单」页，保存返回时落在第二个空表单上易重复记账
let adding = false

Component({
  data: {
    selected: 0,
    glass: true, // 玻璃质感（毛玻璃 tabbar），随设置开关
    barBg: glassTabBg(), // 由「玻璃通透度」派生的渐变背景（独立上下文读不到 page 变量，直接覆盖 background）
    tabs: [
      { url: '/pages/home/index' },
      { url: '/pages/orders/index' },
      { url: '/pages/reports/index' },
      { url: '/pages/profile/index' },
    ],
  },
  // 进入/切回页面即按设置刷新玻璃开关（设置页切换后返回立即生效）
  lifetimes: {
    attached() {
      this.setData({ glass: getGlass(), barBg: glassTabBg() })
    },
  },
  pageLifetimes: {
    show() {
      this.setData({ glass: getGlass(), barBg: glassTabBg() })
    },
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
