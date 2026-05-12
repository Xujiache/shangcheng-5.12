import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerMockRoutes, mockRoutes } from '@jiujiu/shared/mock'
import { useUserStore } from './store/user'

const MOCK_FLAG = import.meta.env.VITE_USE_MOCK as string | undefined

// 开发期默认启用 mock；生产预览可通过 VITE_USE_MOCK=true 显式开启
if (MOCK_FLAG === 'true' || (import.meta.env.DEV && MOCK_FLAG !== 'false')) {
  registerMockRoutes(mockRoutes)
}

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 恢复本地登录状态
  const userStore = useUserStore(pinia)
  userStore.hydrate()

  return { app }
}
