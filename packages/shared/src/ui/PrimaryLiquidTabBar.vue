<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'

type PrimaryAppFlavor = 'merchant' | 'platform'

interface PrimaryTabItem {
  key: string
  label: string
  icon: string
  route: string
}

const props = withDefaults(
  defineProps<{
    flavor: PrimaryAppFlavor
    active: string
    reserveSpace?: boolean
  }>(),
  { reserveSpace: true },
)

const MERCHANT_TABS: PrimaryTabItem[] = [
  { key: 'home', label: '首页', icon: 'home', route: '/pages/tabbar/home/index' },
  { key: 'product', label: '商品', icon: 'goods', route: '/pages/tabbar/product/index' },
  {
    key: 'order',
    label: '订单',
    icon: 'a-order-adjustmentcolumn',
    route: '/pages/tabbar/order/index',
  },
  { key: 'stats', label: '数据', icon: 'chart-bar', route: '/pages/tabbar/stats/index' },
  { key: 'me', label: '我的', icon: 'user-circle', route: '/pages/tabbar/me/index' },
]

const PLATFORM_TABS: PrimaryTabItem[] = [
  { key: 'home', label: '首页', icon: 'home', route: '/pages/tabbar/home/index' },
  { key: 'merchant', label: '商户', icon: 'shop', route: '/pages/tabbar/merchant/index' },
  {
    key: 'order',
    label: '订单',
    icon: 'a-order-adjustmentcolumn',
    route: '/pages/tabbar/order/index',
  },
  { key: 'stats', label: '数据', icon: 'chart-bar', route: '/pages/tabbar/stats/index' },
  { key: 'me', label: '我的', icon: 'user-circle', route: '/pages/tabbar/me/index' },
]

const instance = getCurrentInstance()
const tabs = computed(() => (props.flavor === 'merchant' ? MERCHANT_TABS : PLATFORM_TABS))
const activeIndex = computed(() => {
  const index = tabs.value.findIndex((item) => item.key === props.active)
  return index < 0 ? 0 : index
})

const visualIndex = ref(activeIndex.value)
const safeBottom = ref(0)
const barWidth = ref(0)
const pressed = ref(false)
const dragging = ref(false)
const velocity = ref(0)
let startX = 0
let lastX = 0
let lastAt = 0
let startIndex = 0
let lastNavigationAt = 0

const indicatorPositionStyle = computed(() => ({
  transform: `translate3d(${visualIndex.value * 100}%, 0, 0)`,
  transition: dragging.value ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
}))

const indicatorShapeStyle = computed(() => {
  const baseScale = pressed.value ? 78 / 56 : 1
  const stretch = dragging.value ? Math.min(Math.abs(velocity.value) / 2400, 0.12) : 0
  return {
    transform: `scale(${baseScale + stretch}, ${baseScale - stretch * 0.35})`,
    transition: dragging.value
      ? 'transform 80ms linear'
      : 'transform 360ms cubic-bezier(0.16, 1.32, 0.3, 1)',
  }
})

const panelStyle = computed(() => {
  const fraction = Math.min(Math.abs(visualIndex.value - startIndex) / tabs.value.length, 1)
  const direction = visualIndex.value === startIndex ? 0 : Math.sign(visualIndex.value - startIndex)
  const shift = dragging.value ? direction * 4 * (1 - Math.pow(1 - fraction, 3)) : 0
  return { transform: `translate3d(${shift}px, 0, 0)` }
})

const fixedStyle = computed(() => ({ bottom: `${8 + safeBottom.value}px` }))
const placeholderStyle = computed(() => ({ height: `${80 + safeBottom.value}px` }))

function resolveSafeBottom() {
  try {
    const info =
      typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
    const direct = Number(info.safeAreaInsets?.bottom || 0)
    const derived = Math.max(0, Number(info.screenHeight || 0) - Number(info.safeArea?.bottom || 0))
    safeBottom.value = Math.min(48, Math.max(direct, derived))
  } catch {
    safeBottom.value = 0
  }
}

function measureBar() {
  nextTick(() => {
    try {
      uni
        .createSelectorQuery()
        .in(instance?.proxy)
        .select('.jw-primary-tabbar__panel')
        .boundingClientRect((rect) => {
          if (rect && !Array.isArray(rect)) barWidth.value = Number(rect.width || 0)
        })
        .exec()
    } catch {
      barWidth.value = 0
    }
  })
}

function touchX(event: any): number {
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  return Number(touch?.clientX ?? touch?.pageX ?? 0)
}

function navigateTo(index: number) {
  const targetIndex = Math.max(0, Math.min(tabs.value.length - 1, index))
  const target = tabs.value[targetIndex]
  if (!target || target.key === props.active) {
    visualIndex.value = activeIndex.value
    return
  }

  // App-vue 会在 reLaunch 时销毁页面级定时器；不能用“定时器解锁”的布尔值，
  // 否则首跳后锁可能永久保留，表现为商品页上的导航全部失效。
  const now = Date.now()
  if (now - lastNavigationAt < 280) return
  lastNavigationAt = now
  visualIndex.value = targetIndex

  // 原生 tabBar 已彻底移除；一级页面使用 reLaunch，避免 App-plus 的透明
  // native tab layer 在 switchTab 后继续拦截自定义导航的触摸事件。
  uni.reLaunch({
    url: target.route,
    fail: () => {
      lastNavigationAt = 0
      visualIndex.value = activeIndex.value
    },
  })
}

function onTouchStart(event: any) {
  const x = touchX(event)
  startX = x
  lastX = x
  lastAt = Date.now()
  startIndex = activeIndex.value
  visualIndex.value = startIndex
  velocity.value = 0
  dragging.value = false
  pressed.value = true
}

function onTouchMove(event: any) {
  const x = touchX(event)
  const delta = x - startX
  if (Math.abs(delta) < 4 && !dragging.value) return

  dragging.value = true
  const now = Date.now()
  const elapsed = Math.max(1, now - lastAt)
  velocity.value = ((x - lastX) / elapsed) * 1000
  lastX = x
  lastAt = now

  const width =
    barWidth.value > 8 ? barWidth.value : Number(uni.getSystemInfoSync().windowWidth || 375) - 32
  const slotWidth = Math.max(1, (width - 8) / tabs.value.length)
  visualIndex.value = Math.max(0, Math.min(tabs.value.length - 1, startIndex + delta / slotWidth))
}

function finishTouch(cancelled = false) {
  const wasDragging = dragging.value
  const target = cancelled ? activeIndex.value : Math.round(visualIndex.value)
  pressed.value = false
  dragging.value = false
  velocity.value = 0
  if (wasDragging && !cancelled) navigateTo(target)
  else visualIndex.value = activeIndex.value
}

watch(activeIndex, (index) => {
  lastNavigationAt = 0
  visualIndex.value = index
})

onMounted(() => {
  resolveSafeBottom()
  measureBar()
})
</script>

<template>
  <view
    v-if="reserveSpace"
    class="jw-primary-tabbar-placeholder"
    :style="placeholderStyle"
    aria-hidden="true"
  />
  <view class="jw-primary-tabbar" :style="fixedStyle">
    <view
      class="jw-primary-tabbar__panel"
      :style="panelStyle"
      @touchstart="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend="finishTouch(false)"
      @touchcancel="finishTouch(true)"
    >
      <view class="jw-primary-tabbar__material" />
      <view class="jw-primary-tabbar__ambient" />

      <view class="jw-primary-tabbar__indicator-position" :style="indicatorPositionStyle">
        <view class="jw-primary-tabbar__indicator" :style="indicatorShapeStyle">
          <view class="jw-primary-tabbar__indicator-lens" />
          <view class="jw-primary-tabbar__indicator-highlight" />
        </view>
      </view>

      <view class="jw-primary-tabbar__items">
        <template v-for="item in tabs" :key="item.key">
          <!--
            普通点击交给 uni-app 原生 navigator 处理，避免 App-vue 某些复杂页面
            的 service/view 事件映射丢失后出现“看得到、点不动”。拖动选项仍由
            上层手势状态机调用 navigateTo，二者不会重复触发。
          -->
          <navigator
            v-if="item.key !== active"
            class="jw-primary-tabbar__item"
            :url="item.route"
            open-type="reLaunch"
            hover-class="none"
            role="tab"
            :aria-selected="false"
          >
            <wd-icon :name="item.icon" size="21px" />
            <text class="jw-primary-tabbar__label">{{ item.label }}</text>
          </navigator>
          <view v-else class="jw-primary-tabbar__item is-active" role="tab" :aria-selected="true">
            <wd-icon :name="item.icon" size="21px" />
            <text class="jw-primary-tabbar__label">{{ item.label }}</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.jw-primary-tabbar-placeholder {
  width: 100%;
  pointer-events: none;
}

.jw-primary-tabbar {
  position: fixed;
  z-index: 880;
  left: 16px;
  right: 16px;
  height: 64px;
  pointer-events: none;
}

.jw-primary-tabbar__panel {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 64px;
  overflow: hidden;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  background: rgba(248, 251, 255, 0.64);
  box-shadow:
    0 12px 32px rgba(39, 59, 87, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 0 -1px 0 rgba(80, 111, 148, 0.08);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  pointer-events: auto;
  touch-action: none;
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.jw-primary-tabbar__material,
.jw-primary-tabbar__ambient,
.jw-primary-tabbar__indicator-position,
.jw-primary-tabbar__indicator,
.jw-primary-tabbar__indicator-lens,
.jw-primary-tabbar__indicator-highlight {
  pointer-events: none;
}

.jw-primary-tabbar__material,
.jw-primary-tabbar__ambient {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.jw-primary-tabbar__material {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.06) 48%),
    radial-gradient(circle at 14% -30%, rgba(0, 136, 255, 0.18), transparent 46%);
}

.jw-primary-tabbar__ambient {
  opacity: 0.68;
  background: linear-gradient(90deg, rgba(0, 82, 217, 0.04), rgba(11, 165, 165, 0.05));
}

.jw-primary-tabbar__indicator-position {
  position: absolute;
  z-index: 1;
  top: 4px;
  left: 4px;
  width: calc((100% - 8px) / 5);
  height: 56px;
  will-change: transform;
}

.jw-primary-tabbar__indicator {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.38), rgba(0, 136, 255, 0.07)),
    rgba(0, 136, 255, 0.09);
  box-shadow:
    0 5px 14px rgba(0, 82, 217, 0.16),
    inset 0 1px 1px rgba(255, 255, 255, 0.88),
    inset 0 -5px 12px rgba(0, 82, 217, 0.08);
  backdrop-filter: blur(8px) saturate(165%);
  -webkit-backdrop-filter: blur(8px) saturate(165%);
  will-change: transform;
}

.jw-primary-tabbar__indicator-lens,
.jw-primary-tabbar__indicator-highlight {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.jw-primary-tabbar__indicator-lens {
  background:
    linear-gradient(
      90deg,
      rgba(0, 145, 255, 0.08),
      transparent 28%,
      transparent 72%,
      rgba(72, 180, 255, 0.12)
    ),
    radial-gradient(circle at 30% 12%, rgba(255, 255, 255, 0.72), transparent 42%);
}

.jw-primary-tabbar__indicator-highlight {
  inset: 1px;
  border: 1px solid rgba(255, 255, 255, 0.42);
}

.jw-primary-tabbar__items {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  height: 56px;
}

.jw-primary-tabbar__item {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-radius: 999px;
  color: #5a6b80;
  line-height: 1;
  user-select: none;
  -webkit-user-select: none;
  transition:
    color 200ms ease,
    opacity 120ms ease,
    transform 120ms ease;
}

.jw-primary-tabbar__item:active {
  opacity: 0.82;
  transform: scale(0.96);
}

.jw-primary-tabbar__item.is-active {
  color: #0052d9;
}

.jw-primary-tabbar__label {
  display: block;
  margin-top: 1px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 400;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jw-primary-tabbar__item.is-active .jw-primary-tabbar__label {
  font-weight: 600;
}

:global(.wot-theme-dark) .jw-primary-tabbar__panel {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(24, 37, 54, 0.84);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.18);
}

:global(.wot-theme-dark) .jw-primary-tabbar__material {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), transparent 52%),
    radial-gradient(circle at 14% -30%, rgba(0, 145, 255, 0.22), transparent 48%);
}

:global(.wot-theme-dark) .jw-primary-tabbar__indicator {
  border-color: rgba(255, 255, 255, 0.2);
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.16), rgba(0, 145, 255, 0.08)),
    rgba(0, 145, 255, 0.14);
  box-shadow:
    0 7px 18px rgba(0, 0, 0, 0.34),
    inset 0 1px 1px rgba(255, 255, 255, 0.24),
    inset 0 -6px 13px rgba(0, 0, 0, 0.12);
}

:global(.wot-theme-dark) .jw-primary-tabbar__item {
  color: #a9b8cc;
}

:global(.wot-theme-dark) .jw-primary-tabbar__item.is-active {
  color: #5a8df0;
}

@media (prefers-reduced-motion: reduce) {
  .jw-primary-tabbar__panel,
  .jw-primary-tabbar__indicator-position,
  .jw-primary-tabbar__indicator,
  .jw-primary-tabbar__item {
    transition: none !important;
  }
}
</style>
