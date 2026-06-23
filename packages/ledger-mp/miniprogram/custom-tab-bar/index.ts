import { getGlass, getLiquidTab, glassTabStyle } from '../utils/store'

// FAB 防连点：双击会叠开两个空白「新增订单」页，保存返回时落在第二个空表单上易重复记账
let adding = false

// 跨页共享：tabBar 每页一个实例，用模块级变量记住「上一个选中 tab」与测得的几何量，
// 这样切到新页时新实例的药丸能从「来源 tab」滑向「目标 tab」，视觉上连续。
let lastSelected = 0
let centers: number[] = [] // 4 个 tab 的中心 x（相对 .ctb__bar）
let pillW = 0 // 药丸宽度（≈ 单个 tab 宽）
let barLeft = 0 // .ctb__bar 视口左偏移，用于把 touch.clientX 换算成栏内坐标

const PRESS_SCALE = 1.18 // 按下/拖动时药丸放大（iOS26 液态玻璃手感）

Component({
  data: {
    selected: 0,
    glass: true, // 玻璃质感（毛玻璃 tabbar），随设置开关
    liquid: true, // 液态导航栏：药丸滑动/拖动/放大，随设置开关
    barStyle: glassTabStyle(), // 由「玻璃通透度」派生的 background + backdrop-filter
    indStyle: '', // 药丸定位（left/width/opacity/transform/transition），运行时计算
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
      // 首帧渲染完成后量取几何量，并把药丸落到当前全局位置（无动画）
      this.measureCenters(() => this.snapTo(lastSelected))
    },
  },
  // 进入/切回页面即按设置刷新。注意：这里不主动 snap——滑动由各页 onShow 的 selectTab 驱动；
  // show 若晚于 selectTab 触发，盲目 snap 会把进行中的滑动动画瞬间拽到终点。仅「刚开启」时定位。
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

    // ── 液态药丸：几何测量 ─────────────────────────────────────
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
        barLeft = bar.left
        centers = tabs.map((t: any) => t.left - bar.left + t.width / 2)
        pillW = Math.max(40, Math.round(tabs[0].width - 12)) // 略窄于 tab 槽，留呼吸边距
        cb && cb()
      })
    },

    // ── 液态药丸：样式与滑动 ───────────────────────────────────
    // leftDurMs>0 时 left 带 EaseInOut 过渡；transform(缩放)恒定 0.2s 过渡。
    buildStyle(centerX: number, scale: number, leftDurMs: number): string {
      const left = (centerX - pillW / 2).toFixed(1)
      const tr =
        leftDurMs > 0
          ? `transition:left ${leftDurMs}ms cubic-bezier(0.42,0,0.58,1),transform 0.2s ease;`
          : 'transition:transform 0.2s ease;'
      return `left:${left}px;width:${pillW}px;opacity:1;transform:scale(${scale});${tr}`
    },
    snapTo(index: number) {
      if (!this.data.liquid || centers.length !== 4 || !pillW) return
      const i = Math.min(3, Math.max(0, index))
      this.setData({ indStyle: this.buildStyle(centers[i], 1, 0) })
    },
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
        this.setData({ indStyle: this.buildStyle(centers[target], 1, 0) })
        return
      }
      const dur = 100 * Math.abs(target - prev) + 100 // 距离越远滑越久（同 KernelSU）
      // 1) 先无动画落在来源位 → 2) 开启过渡平移到目标（恒宽不拉伸）
      this.setData({ indStyle: this.buildStyle(centers[prev], 1, 0) }, () => {
        this.setData({ indStyle: this.buildStyle(centers[target], 1, dur) })
      })
    },

    // ── 液态药丸：拖动手势（跟手移动 + 按下放大 + 释放吸附最近 tab 切页）──
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      const self = this as any
      self._dragIgnore = true
      if (!this.data.liquid || centers.length !== 4 || !pillW) return
      const relX = Number(e.touches[0].clientX) - barLeft
      // 中间 FAB（+）区域不触发拖动，避免误触
      const fabCenter = (centers[1] + centers[2]) / 2
      if (Math.abs(relX - fabCenter) < 40) return
      self._dragIgnore = false
      self._moved = false
      self._dragX = centers[this.data.selected]
      // 按下即放大（不切页，先给反馈）
      this.setData({ indStyle: this.buildStyle(self._dragX, PRESS_SCALE, 0) })
    },
    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      const self = this as any
      if (self._dragIgnore || !this.data.liquid || centers.length !== 4) return
      let relX = Number(e.touches[0].clientX) - barLeft
      relX = Math.min(centers[3], Math.max(centers[0], relX)) // 夹在首/末 tab 之间
      if (Math.abs(relX - centers[this.data.selected]) > 6) self._moved = true
      self._dragX = relX
      // 跟手：left 无过渡即时跟随，scale 维持放大
      this.setData({ indStyle: this.buildStyle(relX, PRESS_SCALE, 0) })
    },
    onTouchEnd() {
      const self = this as any
      if (self._dragIgnore || !this.data.liquid || centers.length !== 4) {
        self._dragIgnore = true
        return
      }
      if (!self._moved) {
        // 纯点击：缩回原位，切页交给 tab 的 bindtap
        this.setData({ indStyle: this.buildStyle(centers[this.data.selected], 1, 0) })
        return
      }
      // 拖动结束：吸附到最近 tab
      let nearest = 0
      let best = Infinity
      for (let i = 0; i < 4; i++) {
        const d = Math.abs(self._dragX - centers[i])
        if (d < best) {
          best = d
          nearest = i
        }
      }
      if (nearest === this.data.selected) {
        // 回到当前 tab：滑回 + 缩回，不切页
        this.setData({ indStyle: this.buildStyle(centers[nearest], 1, 160) })
        return
      }
      // 切到目标 tab：置 lastSelected=目标，使新页 selectTab 直接落位（无缝），再 switchTab
      lastSelected = nearest
      this.setData({ indStyle: this.buildStyle(centers[nearest], 1, 140) })
      wx.switchTab({ url: this.data.tabs[nearest].url })
    },
  },
})
