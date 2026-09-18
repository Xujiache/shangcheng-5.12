<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'
import { checkAppUpdate } from './composables/useAppUpdate'
import { appTheme } from './theme'
import { useMessage, useToast } from 'wot-design-uni'
import { bindWotFeedback } from '@jiujiu/shared'

// 反馈桥接属于增强能力，不能阻断 App 根实例创建。部分旧 Android WebView
// 在组件库上下文尚未建立时会拒绝 provide/inject，失败时页面仍可正常启动。
try {
  bindWotFeedback({ toast: useToast('global'), message: useMessage('global') })
} catch (error) {
  console.error('[startup] Wot feedback bridge unavailable', error)
}

const TOKEN_KEY = 'jiujiu_token'
const REFRESH_KEY = 'jiujiu_refresh_token'

function hasStoredSession(): boolean {
  try {
    return !!(uni.getStorageSync(TOKEN_KEY) || uni.getStorageSync(REFRESH_KEY))
  } catch {
    return false
  }
}

function isPublicRoute(route: string): boolean {
  return route.includes('pages/startup/') || route.includes('pages/auth/') || route.includes('pages/update/')
}

function currentRoute(): string {
  try {
    const pages = getCurrentPages()
    return pages[pages.length - 1]?.route || ''
  } catch {
    return ''
  }
}

let foregroundCheckTimer: ReturnType<typeof setTimeout> | null = null
let pollingTimer: ReturnType<typeof setInterval> | null = null
let lastAutomaticCheckAt = 0
const FOREGROUND_MIN_INTERVAL = 60_000
const POLLING_INTERVAL = 15 * 60_000

async function runAutomaticUpdateCheck(source: 'foreground' | 'poll') {
  const route = currentRoute()
  if (route.includes('pages/startup/') || route.includes('pages/update/')) return
  const now = Date.now()
  if (now - lastAutomaticCheckAt < FOREGROUND_MIN_INTERVAL) return
  lastAutomaticCheckAt = now
  const result = await checkAppUpdate('merchant', { silent: true, source })
  if (result === 'blocked' && !currentRoute().includes('pages/startup/')) {
    uni.reLaunch({ url: '/pages/startup/index' })
  }
}

function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer)
  pollingTimer = setInterval(() => void runAutomaticUpdateCheck('poll'), POLLING_INTERVAL)
}

function scheduleForegroundUpdateCheck() {
  if (foregroundCheckTimer) clearTimeout(foregroundCheckTimer)
  foregroundCheckTimer = setTimeout(async () => {
    foregroundCheckTimer = null
    await runAutomaticUpdateCheck('foreground')
  }, 500)
}

onLaunch(() => {
  const userStore = useUserStore()
  userStore.hydrate()
})

onShow(() => {
  appTheme.refreshSystemTheme()
  // 启动、登录和注册页面均为公开页；只保护真正的商家私有页面。
  // 网络故障不会进入这里清理会话，只有请求层收到明确鉴权失效才会登出。
  const route = currentRoute()
  if (route && !isPublicRoute(route) && !hasStoredSession()) {
    uni.reLaunch({ url: '/pages/auth/login' })
  }
  scheduleForegroundUpdateCheck()
  startPolling()
})

onHide(() => {
  if (foregroundCheckTimer) clearTimeout(foregroundCheckTimer)
  foregroundCheckTimer = null
  if (pollingTimer) clearInterval(pollingTimer)
  pollingTimer = null
})
</script>

<style lang="scss">
/* 引入 design tokens CSS 变量 */
@import '@jiujiu/shared/tokens.css';
@import '@jiujiu/shared/wot-overrides.scss';

page {
  background: var(--environment-gradient, var(--bg-page));
  color: var(--text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
}

.wot-theme-dark page,
.wot-theme-dark {
  color-scheme: dark;
}

</style>
