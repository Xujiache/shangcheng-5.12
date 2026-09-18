import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { appTheme } from './theme'
import { appFeedbackState, createUniNavigation, wotIconName, wotTagType } from '@jiujiu/shared'
import PrimaryLiquidTabBar from '@jiujiu/shared/primary-liquid-tabbar.vue'

const appNavigation = createUniNavigation('platform')

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  app.component('PrimaryLiquidTabBar', PrimaryLiquidTabBar)
  app.config.globalProperties.$jwTheme = appTheme
  app.config.globalProperties.$jwNav = appNavigation
  app.config.globalProperties.$jwIcon = wotIconName
  app.config.globalProperties.$jwTagType = wotTagType
  app.config.globalProperties.$jwFeedbackState = appFeedbackState
  return { app }
}
