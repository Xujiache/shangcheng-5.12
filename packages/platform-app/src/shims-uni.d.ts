/**
 * uni-app 模板严格性 shim（同 merchant-app）
 */
import type { AppFeedbackState, AppNavigationController, AppThemeController } from '@jiujiu/shared'

declare module 'vue' {
  interface ComponentCustomProperties {
    uni: typeof uni
    $jwTheme: AppThemeController
    $jwNav: AppNavigationController
    $jwIcon: (name: unknown) => string
    $jwTagType: (tone: unknown) => 'default' | 'primary' | 'success' | 'warning' | 'danger'
    $jwFeedbackState: AppFeedbackState
  }
}
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    uni: typeof uni
    $jwTheme: AppThemeController
    $jwNav: AppNavigationController
    $jwIcon: (name: unknown) => string
    $jwTagType: (tone: unknown) => 'default' | 'primary' | 'success' | 'warning' | 'danger'
    $jwFeedbackState: AppFeedbackState
  }
}

declare global {
  interface Event {
    detail?: any
  }
}

export {}
