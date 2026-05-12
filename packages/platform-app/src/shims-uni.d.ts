/**
 * uni-app 模板严格性 shim（同 merchant-app）
 */
declare module 'vue' {
  interface ComponentCustomProperties {
    uni: typeof uni
  }
}
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    uni: typeof uni
  }
}

declare global {
  interface Event {
    detail?: any
  }
}

export {}
