import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerMockRoutes, mockRoutes } from '@jiujiu/shared/mock'
import { userMpExtraRoutes } from './mock/extra-routes'

const MOCK_FLAG = import.meta.env.VITE_USE_MOCK as string | undefined

if (MOCK_FLAG === 'true' || (import.meta.env.DEV && MOCK_FLAG !== 'false')) {
  registerMockRoutes([...mockRoutes, ...userMpExtraRoutes])
}

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
