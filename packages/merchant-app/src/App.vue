<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'
import { checkAppUpdate } from './composables/useAppUpdate'

onLaunch(() => {
  const userStore = useUserStore()
  userStore.hydrate()
  try { uni.hideTabBar({ animation: false }) } catch { /* ignore */ }
  if (!userStore.isLogin) {
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 0)
  }
  // 启动 2.5s 后静默检查更新（让首页先稳定渲染）
  setTimeout(() => { checkAppUpdate('merchant', { silent: true }) }, 2500)
})

onShow(() => {
  // 进入前台时再校验一次（被踢登录情况）
  const userStore = useUserStore()
  if (!userStore.accessToken) {
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
