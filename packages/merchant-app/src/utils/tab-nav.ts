/**
 * 一级导航工具 —— 统一使用 reLaunch
 *
 * 为什么需要：
 *   - 双 APP 已删除 DCloud 原生 tabBar，只保留共享悬浮导航
 *   - App-plus 的透明原生 tab layer 会在 switchTab 后拦截后续触摸
 *   - reLaunch 同时清理一级页面返回栈，行为与原生主导航一致
 *
 * 用法:
 *   import { safeSwitchTab, safeBackOrHome } from '@/utils/tab-nav'
 *   safeSwitchTab('/pages/tabbar/home/index')
 *   safeBackOrHome()  // navigateBack,失败则跳首页
 */

/**
 * 安全切换到 tabBar 页面,失败自动 reLaunch
 * @param url tabBar 页面路径(以 /pages/tabbar/ 开头)
 * @param onSuccess 可选成功回调
 */
export function safeSwitchTab(url: string, onSuccess?: () => void): void {
  uni.reLaunch({
    url,
    success: () => onSuccess?.(),
  })
}

/**
 * 安全返回上一页,如果没有上一页则跳到 home tab
 * @param homePath 首页路径,默认 /pages/tabbar/home/index
 */
export function safeBackOrHome(homePath = '/pages/tabbar/home/index'): void {
  uni.navigateBack({
    delta: 1,
    fail: () => safeSwitchTab(homePath),
  })
}

/**
 * switchTab 无法携带 query，首页待办通过一个短时、一次性的意图把筛选条件交给目标 Tab。
 * 消费成功或过期都会删除，避免用户下次正常进入时仍停留在旧筛选。
 */
const TAB_FILTER_INTENT_KEY = 'merchant_tab_filter_intent'
const TAB_FILTER_INTENT_TTL = 30_000

export type TabFilterTarget = 'order' | 'product'

interface TabFilterIntent {
  target: TabFilterTarget
  value: string
  createdAt: number
}

export function setTabFilterIntent(target: TabFilterTarget, value: string): void {
  const intent: TabFilterIntent = { target, value, createdAt: Date.now() }
  uni.setStorageSync(TAB_FILTER_INTENT_KEY, JSON.stringify(intent))
}

export function consumeTabFilterIntent(target: TabFilterTarget): string | null {
  try {
    const raw = uni.getStorageSync(TAB_FILTER_INTENT_KEY)
    if (!raw) return null
    const intent = JSON.parse(String(raw)) as Partial<TabFilterIntent>
    const expired =
      typeof intent.createdAt !== 'number' || Date.now() - intent.createdAt > TAB_FILTER_INTENT_TTL
    if (expired) {
      uni.removeStorageSync(TAB_FILTER_INTENT_KEY)
      return null
    }
    if (intent.target !== target || typeof intent.value !== 'string') return null
    uni.removeStorageSync(TAB_FILTER_INTENT_KEY)
    return intent.value
  } catch {
    uni.removeStorageSync(TAB_FILTER_INTENT_KEY)
    return null
  }
}
