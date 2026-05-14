/**
 * tab 导航工具 —— switchTab 的统一封装,带 reLaunch fallback
 *
 * 为什么需要：
 *   - uni.switchTab 仅在 pages.json 注册了 tabBar 时可用
 *   - 当 pages.json 删除 tabBar 字段或目标页不在 tabBar list 中,switchTab 会 fail
 *   - 防御性做法:fail 时回退到 uni.reLaunch,保证导航永远成功
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
  uni.switchTab({
    url,
    success: () => onSuccess?.(),
    fail: () => {
      uni.reLaunch({ url })
      onSuccess?.()
    },
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
