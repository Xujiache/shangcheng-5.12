import { navigation, beginNavigationFeedback } from '../utils/page-transition'
import { meApi } from '../api/index'
import {
  getGlass,
  getLiquidTab,
  glassTabStyle,
  goToLogin,
  hasActiveMembership,
  isLoggedIn,
  requireMembership,
  setMembership,
} from '../utils/store'

// FAB 防连点：避免连续打开多个新增订单页面。
let adding = false
const INDICATOR_OFFSETS = ['0%', '100%', 'calc(200% + 58px)', 'calc(300% + 58px)']
const TAB_SWITCH_LOCK_MS = 280

Component({
  data: {
    selected: 0,
    indicatorStyle: 'transform: translate3d(0, 0, 0);',
    switching: false,
    glass: true,
    liquid: true,
    barStyle: glassTabStyle(),
    tabs: [
      { url: '/pages/home/index' },
      { url: '/pages/orders/index' },
      { url: '/pages/reports/index' },
      { url: '/pages/profile/index' },
    ],
  },

  lifetimes: {
    attached() {
      this.refreshPrefs()
    },
  },

  pageLifetimes: {
    show() {
      this.refreshPrefs()
    },
  },

  methods: {
    refreshPrefs() {
      this.setData({
        glass: getGlass(),
        liquid: getLiquidTab(),
        barStyle: glassTabStyle(),
      })
    },

    // 各 Tab 页在 onShow 中同步当前位置，共享指示器沿轨道平移。
    selectTab(index: number) {
      const selected = Math.min(3, Math.max(0, Number(index)))
      if (selected !== this.data.selected) {
        this.setData({
          selected,
          indicatorStyle: `transform: translateX(${INDICATOR_OFFSETS[selected]});`,
        })
      }
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      if (!Number.isInteger(index) || index < 0 || index >= this.data.tabs.length) return
      if (this.data.switching || index === this.data.selected) return
      if (index > 0 && !isLoggedIn()) {
        goToLogin()
        return
      }
      const previous = this.data.selected
      this.setData({ switching: true })
      this.selectTab(index)
      navigation.switchTab({
        url: this.data.tabs[index].url,
        fail: () => {
          this.selectTab(previous)
          this.setData({ switching: false })
        },
        complete: () => {
          setTimeout(() => this.setData({ switching: false }), TAB_SWITCH_LOCK_MS)
        },
      })
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
        if (!hasActiveMembership(membership)) {
          requireMembership('会员已到期，历史订单仍可查看，但新增订单需要续费。')
          return
        }
        navigation.navigateTo({ url: '/pages/order-edit/index' })
      } catch (e) {
        // request 层已经给出网络提示；状态不明时不开放写入口。
      } finally {
        finishFeedback()
        setTimeout(() => (adding = false), 600)
      }
    },
  },
})
