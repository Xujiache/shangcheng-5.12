import { onShow } from '@dcloudio/uni-app'

/**
 * 强制隐藏 uni-app App / MP 平台的原生 tabBar。
 *
 * 背景：pages.json 配置了 tabBar.custom=true 后，
 *   - mp-weixin 会自动隐藏原生 tabBar（由微信框架处理）
 *   - H5 在 App.vue 里用 CSS（.uni-tabbar { display: none }）兜底
 *   - App-plus 原生 tabBar 是 native UI 控件，CSS 管不到；
 *     而 onLaunch 阶段还没进入 tab 页，hideTabBar 调用过早会失效。
 *
 * 解决：每个 tab 页 onShow 时再调一次，保证原生条永远是隐藏的，
 *      避免与自定义 <TabBar /> 同时出现"两条底部导航栏"。
 */
export function useHideNativeTabBar() {
  onShow(() => {
    try {
      uni.hideTabBar({ animation: false })
    } catch {
      /* ignore — 个别平台没有该 API */
    }
  })
}
