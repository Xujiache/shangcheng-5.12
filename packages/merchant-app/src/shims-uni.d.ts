/**
 * uni-app 模板严格性 shim
 *
 * vue-tsc 严格模式下，Vue 模板里直接写 `uni.xxx()` / `e.detail.value` 会报：
 *   - Property 'uni' does not exist on type 'CreateComponentPublicInstanceWithMixins<...>'
 *   - Property 'detail' does not exist on type 'Event'
 *
 * uni-app 运行时这些都合法（uni 全局可见、事件对象有 detail）。
 * 本 shim 只为让 vue-tsc 在 CI/IDE 通过，不改 runtime 行为。
 *
 * 注意：interface Event 必须 declare global，否则 module 内的扩展不 merge 到全局。
 */

// 1. 把 uni 暴露给 Vue 组件实例（模板 this 上下文）
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

// 2. 扩展 DOM Event 兼容 uni 自定义事件的 detail 字段
declare global {
  interface Event {
    /** uni-app 自定义事件附带数据（如 input.detail.value / switch.detail.value） */
    detail?: any
  }
}

export {}
