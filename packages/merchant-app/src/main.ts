import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useUserStore } from './store/user'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 恢复本地登录状态
  const userStore = useUserStore(pinia)
  userStore.hydrate()

  return { app }
}
