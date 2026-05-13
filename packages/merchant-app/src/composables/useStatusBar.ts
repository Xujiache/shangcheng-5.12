import { computed } from 'vue'

/**
 * 状态栏（顶部时间 / 电量 / 信号条）真实高度（px 字符串）。
 *
 * pages.json 里 navigationStyle=custom 之后，整页占满屏幕，
 * 系统状态栏会盖住页面顶部内容；任何自定义 Hero / 顶栏
 * 都需要把该高度叠加到顶部 padding 上才能避让。
 *
 * 用法：
 *   const { statusBarPx, heroPaddingTop } = useStatusBar(60)
 *   <view class="hero" :style="{ paddingTop: heroPaddingTop }">
 */
export function useStatusBar(extraRpx = 0) {
  const statusBarPx = computed(() => {
    try {
      const sys = uni.getSystemInfoSync()
      return (sys.statusBarHeight ?? 0) + 'px'
    } catch {
      return '0px'
    }
  })

  const heroPaddingTop = computed(() =>
    extraRpx > 0 ? `calc(${statusBarPx.value} + ${extraRpx}rpx)` : statusBarPx.value,
  )

  return { statusBarPx, heroPaddingTop }
}
