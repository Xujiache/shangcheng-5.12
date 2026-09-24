export type AppFlavor = 'merchant' | 'platform'

const TAB_ROUTES: Record<AppFlavor, Record<string, string>> = {
  merchant: {
    home: '/pages/tabbar/home/index',
    product: '/pages/tabbar/product/index',
    order: '/pages/tabbar/order/index',
    stats: '/pages/tabbar/stats/index',
    me: '/pages/tabbar/me/index',
  },
  platform: {
    home: '/pages/tabbar/home/index',
    merchant: '/pages/tabbar/merchant/index',
    order: '/pages/tabbar/order/index',
    stats: '/pages/tabbar/stats/index',
    me: '/pages/tabbar/me/index',
  },
}

export function createUniNavigation(flavor: AppFlavor) {
  const uniApi = (globalThis as typeof globalThis & { uni?: any }).uni
  const home = TAB_ROUTES[flavor].home
  return {
    back(fallback = home) {
      uniApi?.navigateBack?.({
        delta: 1,
        fail: () =>
          uniApi?.switchTab?.({ url: fallback, fail: () => uniApi?.reLaunch?.({ url: fallback }) }),
      })
    },
    switchTab(keyOrRoute: string) {
      const url = TAB_ROUTES[flavor][keyOrRoute] ?? keyOrRoute
      if (!url) return
      // 双 APP 使用独立的悬浮导航，不再注册 DCloud 原生 tabBar。
      // 这里必须直接 reLaunch；App-plus 的 switchTab 会重新激活透明的原生
      // tab layer，虽然看不见，却会拦截 WebView 自定义导航的后续触摸。
      uniApi?.reLaunch?.({ url })
    },
  }
}

export type AppNavigationController = ReturnType<typeof createUniNavigation>
