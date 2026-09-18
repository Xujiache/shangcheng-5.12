import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useUserStore } from './store/user'
import { appTheme } from './theme'
import { appFeedbackState, createUniNavigation, wotIconName, wotTagType } from '@jiujiu/shared'
import PrimaryLiquidTabBar from '@jiujiu/shared/primary-liquid-tabbar.vue'

const appNavigation = createUniNavigation('merchant')

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.component('PrimaryLiquidTabBar', PrimaryLiquidTabBar)
  app.config.globalProperties.$jwTheme = appTheme
  app.config.globalProperties.$jwNav = appNavigation
  app.config.globalProperties.$jwIcon = wotIconName
  app.config.globalProperties.$jwTagType = wotTagType
  app.config.globalProperties.$jwFeedbackState = appFeedbackState

  // 恢复本地登录状态
  const userStore = useUserStore(pinia)
  userStore.hydrate()

  return { app }
}
