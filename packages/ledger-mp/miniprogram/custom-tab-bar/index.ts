import { getGlass, getLiquidTab, glassTabStyle } from '../utils/store'

// FAB 防连点：双击会叠开两个空白「新增订单」页，保存返回时落在第二个空表单上易重复记账
let adding = false

// 跨页共享：tabBar 每页一个实例，用模块级变量记住「当前选中 tab」与测得的几何量。
// 关键：每页实例的指示块离场即隐藏(opacity0)、入场先无动画落到「来源 tab」再淡入滑向目标，
// 用不透明度遮住「实例残留位 → 来源位」的瞬移，从而消除点击切页时的横跳。
let lastSelected = 0
let centers: number[] = [] // 4 个 tab 的中心 x（相对 .ctb__bar）
let pillW = 0 // 药丸宽度（≈ 单个 tab 宽）
let barLeft = 0 // .ctb__bar 视口左偏移，用于把 touch.clientX 换算成栏内坐标

const PRESS_SCALE = 1.42 // 按下/拖动放大：略大于导航栏胶囊（iOS26 液态玻璃手感）

Component({
  data: {
    selected: 0,
    glass: true, // 玻璃质感（毛玻璃 tabbar），随设置开关
    liquid: true, // 液态导航栏：药丸滑动/拖动/放大，随设置开关
    pressed: false, // 按下/拖动中：触发放大态样式（更强模糊 + 边缘特殊处理）
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
      // 首帧渲染完成后量取几何量，并把药丸隐藏地落到当前全局位置
      this.measureCenters(() => this.snapInvisible(lastSelected))
    },
  },
  pageLifetimes: {
    show() {
      this.refreshPrefs()
      // 入场：先隐藏地落到「来源 tab」(全局 lastSelected)，等 selectTab 再淡入滑向目标
      if (this.data.liquid) this.ensureCenters(() => this.snapInvisible(lastSelected))
    },
    hide() {
      // 离场即隐藏，避免下次入场时露出本实例上次的残留位置（横跳根因）
      if (this.data.liquid) this.ensureCenters(() => this.snapInvisible(this.data.selected))
    },
  },
  methods: {
    refreshPrefs() {
      const liquid = getLiquidTab()
      const wasLiquid = this.data.liquid
      this.setData({ glass: getGlass(), liquid, barStyle: glassTabStyle() })
      if (liquid && !wasLiquid) this.ensureCenters(() => this.snapInvisible(this.data.selected))
    },

    // 各 tab 页 onShow 调用：设选中态 + 触发药丸滑动。animateTo 延到 nextTick，
    // 确保本帧 pageLifetimes.show 的「落到来源位」先生效，再开始淡入滑动（不依赖二者触发顺序）。
    selectTab(index: number) {
      this.setData({ selected: index })
      wx.nextTick(() => this.animateTo(index))
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      wx.switchTab({ url: this.data.tabs[index].url })
    },

    onAdd() {
      if (adding) return
      adding = true
      wx.navigateTo({
        url: '/pages/order-edit/index',
        complete: () => setTimeout(() => (adding = false), 600),
      })
    },

    // ── 几何测量 ───────────────────────────────────────────
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

    // ── 样式与滑动 ─────────────────────────────────────────
    // leftDurMs>0 时 left/opacity 带过渡（淡入滑动）；=0 为即时定位。transform(缩放)恒 0.2s 过渡。
    buildStyle(centerX: number, scale: number, leftDurMs: number, opacity: number): string {
      const left = (centerX - pillW / 2).toFixed(1)
      const tr =
        leftDurMs > 0
          ? `transition:left ${leftDurMs}ms cubic-bezier(0.42,0,0.58,1),opacity ${leftDurMs}ms ease,transform 0.2s ease;`
          : 'transition:transform 0.2s ease;'
      return `left:${left}px;width:${pillW}px;opacity:${opacity};transform:scale(${scale});${tr}`
    },
    // 隐藏地落到某 tab（入场/离场用，遮住瞬移）
    snapInvisible(index: number) {
      if (centers.length !== 4 || !pillW) return
      const i = Math.min(3, Math.max(0, index))
      this.setData({ pressed: false, indStyle: this.buildStyle(centers[i], 1, 0, 0) })
    },
    animateTo(to: number) {
      if (!this.data.liquid) return
      this.ensureCenters(() => this._animate(to))
    },
    _animate(to: number) {
      if (centers.length !== 4 || !pillW) return
      const target = Math.min(3, Math.max(0, to))
      const from = lastSelected
      lastSelected = target
      // 药丸此刻在 from 处（入场已隐藏落位）→ 淡入并滑到 target；同 tab 仅淡入
      const dur = from === target ? 150 : 100 * Math.abs(target - from) + 100
      this.setData({ pressed: false, indStyle: this.buildStyle(centers[target], 1, dur, 1) })
    },

    // ── 拖动手势：跟手移动 + 按下放大 + 释放吸附最近 tab 切页 ──
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      const self = this as any
      self._dragIgnore = true
      if (!this.data.liquid || centers.length !== 4 || !pillW) return
      const relX = Number(e.touches[0].clientX) - barLeft
      // 中间 FAB（+）区域不触发拖动，避免误触
      if (Math.abs(relX - (centers[1] + centers[2]) / 2) < 40) return
      self._dragIgnore = false
      self._moved = false
      self._dragX = centers[this.data.selected]
      // 按下即放大（不切页，先给反馈）
      this.setData({ pressed: true, indStyle: this.buildStyle(self._dragX, PRESS_SCALE, 0, 1) })
    },
    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      const self = this as any
      if (self._dragIgnore || !this.data.liquid || centers.length !== 4) return
      let relX = Number(e.touches[0].clientX) - barLeft
      relX = Math.min(centers[3], Math.max(centers[0], relX)) // 夹在首/末 tab 之间
      if (Math.abs(relX - centers[this.data.selected]) > 6) self._moved = true
      self._dragX = relX
      // 跟手：left 无过渡即时跟随，scale 维持放大
      this.setData({ indStyle: this.buildStyle(relX, PRESS_SCALE, 0, 1) })
    },
    onTouchEnd() {
      const self = this as any
      if (self._dragIgnore || !this.data.liquid || centers.length !== 4) {
        self._dragIgnore = true
        return
      }
      if (!self._moved) {
        // 纯点击：缩回原位（切页交给 tab 的 bindtap）
        this.setData({
          pressed: false,
          indStyle: this.buildStyle(centers[this.data.selected], 1, 0, 1),
        })
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
        this.setData({ pressed: false, indStyle: this.buildStyle(centers[nearest], 1, 160, 1) })
        return
      }
      // 切到目标 tab：置 lastSelected=目标，使新页 selectTab 直接淡入落位（无缝），再 switchTab
      lastSelected = nearest
      this.setData({ pressed: false, indStyle: this.buildStyle(centers[nearest], 1, 140, 1) })
      wx.switchTab({ url: this.data.tabs[nearest].url })
    },
  },
})
