<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useAdminStore } from './store/admin'
import { checkAppUpdate } from './composables/useAppUpdate'

const ADMIN_TOKEN_KEY = 'jiujiu_admin_token'

function readLoggedInFromStorage(): boolean {
  try {
    return !!uni.getStorageSync(ADMIN_TOKEN_KEY)
  } catch {
    return false
  }
}

onLaunch(() => {
  const adminStore = useAdminStore()
  adminStore.hydrate()
  // 关键修复：直接读 storage 判断登录态，不依赖 pinia computed
  // 原因：pinia 的 computed isLogin 在 hydrate 完成后的同一微任务内
  // 不一定立刻读到 token 的新值,会导致刚 hydrate 完仍判定未登录,
  // 进而错误地 reLaunch 到登录页（issue: 打包后无法记住登录）
  if (!readLoggedInFromStorage()) {
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 0)
  }
  setTimeout(() => {
    checkAppUpdate('platform', { silent: true })
  }, 2500)
})

onShow(() => {
  if (!readLoggedInFromStorage()) {
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

.uni-tabbar,
.uni-tabbar-bottom {
  display: none !important;
}
</style>
