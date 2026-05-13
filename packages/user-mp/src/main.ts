import './utils/mpCryptoPolyfill'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// #ifdef MP-WEIXIN
import { installMpWebSocketPolyfill } from './utils/mpWebSocketPolyfill'
installMpWebSocketPolyfill()
// #endif

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
