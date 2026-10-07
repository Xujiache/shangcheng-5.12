import { navigation, beginNavigationFeedback } from '../utils/page-transition'
import { meApi } from '../api/index'
import {
  getGlass,
  glassTabStyle,
  goToLogin,
  hasActiveMembership,
  isLoggedIn,
  requireMembership,
  setMembership,
} from '../utils/store'

// FAB 防连点：避免连续打开多个新增订单页面。
let adding = false
let switchRequestId = 0
let switchUnlockTimer: ReturnType<typeof setTimeout> | undefined
const TABS = [
  { url: '/pages/home/index' },
  { url: '/pages/orders/index' },
  { url: '/pages/reports/index' },
  { url: '/pages/profile/index' },
] as const
const TAB_SWITCH_LOCK_MS = 280
const TAB_SWITCH_FAILSAFE_MS = 1500
const ADD_LOCK_MS = 600

function currentTabIndex(): number {
  try {
    if (typeof getCurrentPages !== 'function') return -1
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const route = String((currentPage && currentPage.route) || '').replace(/^\//, '')
    return TABS.findIndex((tab) => tab.url.slice(1) === route)
  } catch {
    return -1
  }
}

Component({
  data: {
    selected: 0,
    switching: false,
    glass: true,
    barStyle: glassTabStyle(),
  },

  lifetimes: {
    attached() {
      this.refreshPrefs()
    },
    detached() {
      switchRequestId++
      if (switchUnlockTimer !== undefined) clearTimeout(switchUnlockTimer)
      switchUnlockTimer = undefined
    },
  },

  pageLifetimes: {
    show() {
      this.refreshPrefs()
      const index = currentTabIndex()
      if (index >= 0) this.syncTab(index)
    },
    hide() {
      // Each tab page owns a separate component instance. Do not carry a source page's
      // temporary switch lock into a later visit after the native route has changed.
      if (this.data.switching) {
        switchRequestId++
        if (switchUnlockTimer !== undefined) clearTimeout(switchUnlockTimer)
        switchUnlockTimer = undefined
        this.setData({ switching: false })
      }
    },
  },

  methods: {
    refreshPrefs() {
      const glass = getGlass(),
        barStyle = glassTabStyle()
      if (glass !== this.data.glass || barStyle !== this.data.barStyle) {
        this.setData({ glass, barStyle })
      }
    },

    // 选中态只由当前路由驱动，不通过跨页面的 transform 动画移动指示器。
    selectTab(index: number) {
      const selected = Math.min(TABS.length - 1, Math.max(0, Number(index)))
      if (!Number.isInteger(selected)) return
      if (selected !== this.data.selected) this.setData({ selected })
    },

    // 每个 Tab 页面有独立组件实例，onShow 时直接以真实路由同步选中态。
    syncTab(index: number) {
      const selected = Math.min(TABS.length - 1, Math.max(0, Number(index)))
      if (!Number.isInteger(selected)) return
      if (selected !== this.data.selected) this.setData({ selected })
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      if (!Number.isInteger(index) || index < 0 || index >= TABS.length) return
      const current = currentTabIndex()
      if (this.data.switching || (current >= 0 ? index === current : index === this.data.selected))
        return
      if (index > 0 && !isLoggedIn()) {
        goToLogin()
        return
      }
      const previous = current >= 0 ? current : this.data.selected
      const requestId = ++switchRequestId
      if (switchUnlockTimer !== undefined) {
        clearTimeout(switchUnlockTimer)
        switchUnlockTimer = undefined
      }
      this.setData({ switching: true })
      if (current >= 0 && current !== this.data.selected) this.syncTab(current)
      this.selectTab(index)
      const scheduleUnlock = (delay: number) => {
        if (switchUnlockTimer !== undefined) clearTimeout(switchUnlockTimer)
        switchUnlockTimer = setTimeout(() => {
          switchUnlockTimer = undefined
          if (requestId === switchRequestId) this.setData({ switching: false })
        }, delay)
      }
      scheduleUnlock(TAB_SWITCH_FAILSAFE_MS)
      try {
        navigation.switchTab({
          url: TABS[index].url,
          fail: () => {
            if (requestId !== switchRequestId) return
            this.syncTab(previous)
            this.setData({ switching: false })
          },
          complete: () => {
            if (requestId !== switchRequestId) return
            scheduleUnlock(TAB_SWITCH_LOCK_MS)
          },
        })
      } catch {
        if (requestId !== switchRequestId) return
        this.syncTab(previous)
        this.setData({ switching: false })
      }
    },

    async onAdd() {
      if (adding) return
      if (!isLoggedIn()) {
        goToLogin()
        return
      }
      adding = true
      const finishFeedback = beginNavigationFeedback()
      try {
        const membership = (await meApi.refreshMembership()) as MembershipStatus
        setMembership(membership)
        if (hasActiveMembership(membership)) {
          navigation.navigateTo({ url: '/subpackages/orders/pages/order-edit/index' })
        } else {
          requireMembership('会员已到期，历史订单仍可查看，但新增订单需要续费。')
        }
      } catch {
        // request 层已经给出网络提示；状态不明时不开放写入口。
      } finally {
        finishFeedback()
        setTimeout(() => (adding = false), ADD_LOCK_MS)
      }
    },
  },
})
