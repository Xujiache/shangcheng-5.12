import { getGlass, getLiquidTab, glassTabStyle } from '../utils/store'

// FAB 防连点：双击会叠开两个空白「新增订单」页，保存返回时落在第二个空表单上易重复记账
let adding = false

// 跨页共享：tabBar 每页一个实例，用模块级变量记住「上一个选中 tab」与测得的各 tab 中心，
// 这样切到新页时新实例的指示块能从「来源 tab」滑向「目标 tab」，视觉上连续。
let lastSelected = 0
let centers: number[] = [] // 4 个 tab 的中心 x（相对 .ctb__bar）
let pillW = 0 // 指示块宽度（≈ 单个 tab 宽，量布局后得出）

Component({
  data: {
    selected: 0,
    glass: true, // 玻璃质感（毛玻璃 tabbar），随设置开关
    liquid: true, // 液态导航栏：选中药丸随点击滑动，随设置开关
    barStyle: glassTabStyle(), // 由「玻璃通透度」派生的 background + backdrop-filter
    indStyle: '', // 指示块定位（left/width/opacity[/transition]），运行时计算
    indSnap: false, // true=本次定位不走过渡（首次出现 / 先落到来源位）
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
    ready() {
      // 首帧渲染完成后量取各 tab 中心，并把药丸落到当前全局位置（无动画）
      this.measureCenters(() => this.snapTo(lastSelected))
    },
  },
  // 进入/切回页面即按设置刷新：玻璃开关 + 通透度 + 液态开关（设置页改完返回立即生效）
  // 注意：这里不主动 snap 药丸——滑动由各页 onShow 的 selectTab 驱动；show 若晚于
  // selectTab 触发，盲目 snap 会把进行中的滑动动画瞬间拽到终点。仅在「刚开启」时定位。
  pageLifetimes: {
    show() {
      this.refreshPrefs()
    },
  },
  methods: {
    refreshPrefs() {
      const liquid = getLiquidTab()
      const wasLiquid = this.data.liquid
      this.setData({ glass: getGlass(), liquid, barStyle: glassTabStyle() })
      // 刚把液态开关从关切到开 → 直接定位到当前 tab（避免要等下次点击才出现药丸）
      if (liquid && !wasLiquid) this.ensureCenters(() => this.snapTo(this.data.selected))
    },

    // 各 tab 页 onShow 调用：设选中态 + 触发药丸滑动（取代直接 setData({selected})）
    selectTab(index: number) {
      this.setData({ selected: index })
      this.animateTo(index)
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      const url = this.data.tabs[index].url
      wx.switchTab({ url })
    },

    onAdd() {
      if (adding) return
      adding = true
      wx.navigateTo({
        url: '/pages/order-edit/index',
        complete: () => setTimeout(() => (adding = false), 600),
      })
    },

    // ── 液态指示块（对齐 KernelSU FloatingBottomBar：恒宽药丸平移，EaseInOut，时长随距离）──
    ensureCenters(cb: () => void) {
      if (centers.length === 4 && pillW) cb()
      else this.measureCenters(cb)
    },
    measureCenters(cb?: () => void) {
      const q = this.createSelectorQuery()
      q.select('.ctb__bar').boundingClientRect()
      q.selectAll('.ctb__tab').boundingClientRect()
      q.exec((res: any) => {
        const bar = res && res[0]
        const tabs = res && res[1]
        if (!bar || !tabs || tabs.length < 4 || !tabs[0].width) return // 布局未就绪，留待下次
        centers = tabs.map((t: any) => t.left - bar.left + t.width / 2)
        pillW = Math.max(40, Math.round(tabs[0].width - 12)) // 略窄于 tab 槽，留呼吸边距
        cb && cb()
      })
    },
    // durMs>0 时带 EaseInOut 过渡（只动 left，宽度恒定 → 不拉伸）；=0 为无动画定位
    posStyle(centerX: number, durMs: number): string {
      const left = (centerX - pillW / 2).toFixed(1)
      const tr = durMs > 0 ? `transition:left ${durMs}ms cubic-bezier(0.42,0,0.58,1);` : ''
      return `left:${left}px;width:${pillW}px;opacity:1;${tr}`
    },
    // 无动画地把药丸落到某 tab（首次出现 / 切回页面对齐全局位置）
    snapTo(index: number) {
      if (!this.data.liquid || centers.length !== 4 || !pillW) return
      const i = Math.min(3, Math.max(0, index))
      this.setData({ indSnap: true, indStyle: this.posStyle(centers[i], 0) })
    },
    // 从上一个 tab 平移滑到目标 tab：恒宽药丸，时长 = 100*距离 + 100ms（同 KernelSU）
    animateTo(to: number) {
      if (!this.data.liquid) return
      this.ensureCenters(() => this._animate(to))
    },
    _animate(to: number) {
      if (centers.length !== 4 || !pillW) return
      const target = Math.min(3, Math.max(0, to))
      const prev = lastSelected
      lastSelected = target
      if (prev === target) {
        // 同位（如冷启动首页）→ 直接定位
        this.setData({ indSnap: true, indStyle: this.posStyle(centers[target], 0) })
        return
      }
      const dur = 100 * Math.abs(target - prev) + 100
      // 1) 先无动画落在来源位 → 2) 开启过渡平移到目标（不改宽度，不回弹）
      this.setData({ indSnap: true, indStyle: this.posStyle(centers[prev], 0) }, () => {
        this.setData({ indSnap: false, indStyle: this.posStyle(centers[target], dur) })
      })
    },
  },
})
