import {
  getGlass,
  setGlass,
  getGlassOpacity,
  setGlassOpacity,
  getFxMode,
  setFxMode,
  getLiquidTab,
  setLiquidTab,
} from '../../utils/store'

// 外观与个性化：沉浸光感开关 + 玻璃通透度 + 液态导航栏 + 特效模式（纯本地偏好，切回各页 onShow 即生效）
Page({
  data: {
    glassOn: true,
    glassOpacity: 50, // 玻璃通透度 0-100（越大越通透）
    liquidTab: true, // 液态导航栏：底部 tab 高亮块随点击滑动 + 拉伸
    fxMode: 'normal' as 'normal' | 'max',
    fxOptions: [
      { value: 'normal', label: '普通模式' },
      { value: 'max', label: '性能模式' },
    ],
  },

  onLoad() {
    this.setData({
      glassOn: getGlass(),
      glassOpacity: getGlassOpacity(),
      liquidTab: getLiquidTab(),
      fxMode: getFxMode(),
    })
  },

  onToggleLiquid() {
    const next = !this.data.liquidTab
    setLiquidTab(next)
    this.setData({ liquidTab: next })
    wx.showToast({ title: next ? '已开启液态导航栏' : '已关闭液态导航栏', icon: 'none' })
  },

  onToggleGlass() {
    const next = !this.data.glassOn
    setGlass(next)
    this.setData({ glassOn: next })
    wx.showToast({ title: next ? '已开启沉浸光感' : '已关闭沉浸光感', icon: 'none' })
  },

  onOpacityChanging(e: any) {
    this.setData({ glassOpacity: e.detail.value })
  },
  onOpacityChange(e: any) {
    const v = e.detail.value
    setGlassOpacity(v)
    this.setData({ glassOpacity: v })
    wx.showToast({ title: '玻璃通透度已调整', icon: 'none' })
  },

  onFxMode(e: any) {
    const m = e.detail.value === 'max' ? 'max' : 'normal'
    setFxMode(m)
    this.setData({ fxMode: m })
    wx.showToast({
      title: m === 'max' ? '已切到性能模式 · 全特效' : '已切到普通模式',
      icon: 'none',
    })
  },
})
