<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'

onLaunch(() => {
  const userStore = useUserStore()
  userStore.hydrate()
  try { uni.hideTabBar({ animation: false }) } catch { /* ignore */ }
  if (!userStore.isLogin) {
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 0)
  }
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
.uni-tabbar-bottom {
  display: none !important;
}
</style>
