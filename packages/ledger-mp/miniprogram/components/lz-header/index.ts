import { getGlass } from '../../utils/store'

Component({
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    back: { type: Boolean, value: true },
    large: { type: Boolean, value: false },
  },
  data: {
    topPad: 28, // = 状态栏高度 + 8；attached 里按真实状态栏高度修正
    glass: true, // 玻璃质感（毛玻璃标题栏），随设置开关
  },
  lifetimes: {
    attached() {
      const sbh = getApp<IAppOption>()?.globalData?.statusBarHeight || 20
      this.setData({ topPad: sbh + 8, glass: getGlass() })
    },
  },
  pageLifetimes: {
    show() {
      this.setData({ glass: getGlass() })
    },
  },
  methods: {
    onBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.reLaunch({ url: '/pages/home/index' })
      }
    },
  },
})
