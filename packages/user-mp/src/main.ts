import './utils/mpCryptoPolyfill'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerMockRoutes, mockRoutes } from '@jiujiu/shared/mock'
import { userMpExtraRoutes } from './mock/extra-routes'

// #ifdef MP-WEIXIN
import { installMpWebSocketPolyfill } from './utils/mpWebSocketPolyfill'
installMpWebSocketPolyfill()
// #endif

const MOCK_FLAG = import.meta.env.VITE_USE_MOCK as string | undefined
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'
const IS_LOCAL_API = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/.test(
  API_BASE_URL,
)
let forceMockForLocalMp = false
// #ifdef MP-WEIXIN
forceMockForLocalMp = IS_LOCAL_API
// #endif

if (MOCK_FLAG === 'true' || (import.meta.env.DEV && MOCK_FLAG !== 'false') || forceMockForLocalMp) {
  registerMockRoutes([...mockRoutes, ...userMpExtraRoutes])
}

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
