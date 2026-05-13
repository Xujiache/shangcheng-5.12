<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useAdminStore } from './store/admin'
import { checkAppUpdate } from './composables/useAppUpdate'

function hideNativeTabBar(): void {
  try {
    Promise.resolve(uni.hideTabBar({ animation: false })).catch(() => {})
  } catch {
    /* ignore */
  }
}

onLaunch(() => {
  const adminStore = useAdminStore()
  adminStore.hydrate()
  hideNativeTabBar()
  if (!adminStore.isLogin) {
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 0)
  }
  // 启动 2.5s 后静默检查更新（不阻塞首屏）
  setTimeout(() => { checkAppUpdate('platform', { silent: true }) }, 2500)
})

onShow(() => {
  const adminStore = useAdminStore()
  if (!adminStore.accessToken) {
    const pages = getCurrentPages()
    const top = pages[pages.length - 1] as any
    const route = top?.route || ''
    if (route && !route.includes('pages/auth/')) {
      uni.reLaunch({ url: '/pages/auth/login' })
    }
  }
})
</script>

<style lang="scss">
@import '@jiujiu/shared/tokens.css';

page {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
}

::-webkit-scrollbar {
  display: none;
}

/* H5：隐藏默认 tabBar，自定义 TabBar 接管 */
.uni-tabbar,
.uni-tabbar-bottom {
  display: none !important;
}
</style>
