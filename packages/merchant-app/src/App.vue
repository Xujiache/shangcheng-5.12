<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'
import { checkAppUpdate } from './composables/useAppUpdate'

onLaunch(() => {
  const userStore = useUserStore()
  userStore.hydrate()
  // uni.hideTabBar 在非 tabBar 页（如 onLaunch 落在 /pages/auth/login）会 reject
  // 旧 try/catch 抓不到 promise 拒绝。这里同时提供 fail 回调 + catch 兜底，控制台不再有
  // "hideTabBar:fail not TabBar page" 噪音。
  try {
    const ret: any = uni.hideTabBar({ animation: false, fail: () => {} })
    if (ret && typeof ret.catch === 'function') ret.catch(() => {})
  } catch {
    /* ignore */
  }
  // 关键修复：直接读 storage 判断，不依赖 pinia computed
  // (pinia computed 在同一微任务内未必更新，会导致刚 hydrate 完读到 false → 误跳登录页)
  let loggedIn = false
  try {
    loggedIn = !!uni.getStorageSync('jiujiu_token')
  } catch {
    loggedIn = false
  }
  if (!loggedIn) {
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 0)
  }
  // 启动 2.5s 后静默检查更新（让首页先稳定渲染）
  setTimeout(() => {
    checkAppUpdate('merchant', { silent: true })
  }, 2500)
})

onShow(() => {
  // 进入前台时再校验一次（被踢登录情况）：同样直接读 storage
  let token = ''
  try {
    token = uni.getStorageSync('jiujiu_token') || ''
  } catch {
    token = ''
  }
  if (!token) {
    // 当前若已经在登录页则不重复跳
    const pages = getCurrentPages()
    const top = pages[pages.length - 1]
    if (top && !top.route?.includes('pages/auth/')) {
      uni.reLaunch({ url: '/pages/auth/login' })
    }
  }
})
</script>

<style lang="scss">
/* 引入 design tokens CSS 变量 */
@import '@jiujiu/shared/tokens.css';

page {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
}

/* H5：隐藏 uni 默认 tabBar（自定义 TabBar 接管） */
.uni-tabbar,
.uni-tabbar-bottom,
.uni-tabbar-top,
.uni-tabbar-border,
uni-tabbar {
  display: none !important;
}
/* 框架默认会给 body 加 .uni-app--showtabbar 留 50px 空位，自定义 TabBar 接管后清掉 */
.uni-app--showtabbar uni-page-wrapper {
  bottom: 0 !important;
}
</style>
