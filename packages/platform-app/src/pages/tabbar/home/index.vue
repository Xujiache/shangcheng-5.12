<script setup lang="ts">
/**
 * PA-01 · 平台首页（数据驾驶舱 · v3 重构）
 *
 * 重构目标（用户反馈"层级不好看"）：
 * - 顶部 Hero：今日新订单 + 今日 GMV 双大字（区分两项最关键指标）
 * - 平台概览：商户(蓝)/订单(橙)/GMV(金)/用户(紫) 4 张异色卡片,克制留白
 * - 注册趋势：60rpx 高的精致 mini-line,仅在有数据时显示
 * - 待办：5 项合并为一张紧凑卡,有数→红圈,无数→灰色"已清空"
 * - 快捷入口：4 大核心(商户/商品/广告/会员)用大方块代替 8 宫格
 * - 间距统一 16rpx,圆角统一 16rpx,阴影统一
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { dashboardService } from '../../../services'
import { useAdminStore } from '../../../store/admin'
import { formatWan } from '@jiujiu/shared/utils'
import type { PlatformDashboard } from '@jiujiu/shared/types'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const adminStore = useAdminStore()
const dashboard = ref<PlatformDashboard | null>(null)
const loading = ref(true)
const errorMsg = ref('')

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

/** 顶部 Hero 双大字:今日 GMV + 今日新订单 */
const heroToday = computed(() => {
  const o = dashboard.value?.overview
  return {
    gmv: o ? formatWan(o.gmv) : '--',
    gmvDelta: o?.gmvDelta ?? 0,
    orders: o ? formatWan(o.orders) : '--',
    ordersDelta: o?.ordersDelta ?? 0,
  }
})

/** 4 张异色概览卡 */
const OVERVIEW_CARDS = computed(() => {
  const o = dashboard.value?.overview
  return [
    {
      key: 'merchants',
      label: '商户总数',
      value: o ? formatWan(o.merchants) : '--',
      delta: o?.merchantsDelta ?? 0,
      tint: '#3B82F6',
      tintSoft: 'rgba(59, 130, 246, 0.10)',
      icon: 'home-shop',
    },
    {
      key: 'orders',
      label: '累计订单',
      value: o ? formatWan(o.orders) : '--',
      delta: o?.ordersDelta ?? 0,
      tint: '#FF7A45',
      tintSoft: 'rgba(255, 122, 69, 0.10)',
      icon: 'biz-order',
    },
    {
      key: 'gmv',
      label: '累计 GMV',
      value: o ? `¥${formatWan(o.gmv)}` : '--',
      delta: o?.gmvDelta ?? 0,
      tint: '#F59E0B',
      tintSoft: 'rgba(245, 158, 11, 0.12)',
      icon: 'wallet',
      isPct: true,
    },
    {
      key: 'users',
      label: '用户总数',
      value: o ? formatWan(o.users) : '--',
      delta: o?.usersDelta ?? 0,
      tint: '#A855F7',
      tintSoft: 'rgba(168, 85, 247, 0.10)',
      icon: 'user',
    },
  ]
})

const TODO_LIST = computed(() => {
  if (!dashboard.value) return []
  const t = dashboard.value.todos
  return [
    {
      key: 'merchant',
      label: '待审核商户',
      count: t.pendingMerchants,
      to: '/pages/audit/merchant',
    },
    { key: 'product', label: '待审核商品', count: t.pendingProducts, to: '/pages/audit/product' },
    { key: 'ad', label: '广告创意待审', count: t.pendingAds, to: '/pages/ad/index' },
    { key: 'complaint', label: '售后投诉', count: t.complaints, to: '/pages/tabbar/order/index' },
    { key: 'withdraw', label: '待审核提现', count: t.pendingWithdraws, to: '' },
  ]
})

const TOTAL_TODOS = computed(() => TODO_LIST.value.reduce((s, x) => s + (x.count ?? 0), 0))

/** 4 大核心快捷入口（用户要求大方块、空间呼吸） */
const QUICK_ENTRIES = [
  {
    key: 'merchant',
    icon: 'home-shop',
    label: '商户',
    desc: '入驻 / 审核 / 管理',
    tint: '#3B82F6',
    tintSoft: 'rgba(59, 130, 246, 0.10)',
    to: '/pages/tabbar/merchant/index',
  },
  {
    key: 'product',
    icon: 'package',
    label: '商品',
    desc: '审核 / 抽检',
    tint: '#FF7A45',
    tintSoft: 'rgba(255, 122, 69, 0.10)',
    to: '/pages/audit/product',
  },
  {
    key: 'ad',
    icon: 'megaphone',
    label: '广告',
    desc: '广告位 / 创意',
    tint: '#F59E0B',
    tintSoft: 'rgba(245, 158, 11, 0.10)',
    to: '/pages/ad/index',
  },
  {
    key: 'member',
    icon: 'crown',
    label: '会员',
    desc: '套餐 / 订阅',
    tint: '#A855F7',
    tintSoft: 'rgba(168, 85, 247, 0.10)',
    to: '/pages/member/index',
  },
]

/** mini line chart：仅在有 ≥ 2 个数据点且总和 > 0 时显示 */
const trend = computed(() => {
  const data = dashboard.value?.registrationTrend?.slice(-7) ?? []
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  if (data.length < 2 || total <= 0) return null

  const max = Math.max(...data.map((d) => d.value), 1)
  const w = 100 / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * w
    const y = 28 - (d.value / max) * 22
    return { x: +x.toFixed(2), y: +y.toFixed(2), v: d.value, date: d.date }
  })
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},32 ${line} ${points[points.length - 1].x},32`

  return { total, line, area, points }
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    dashboard.value = await dashboardService.get()
  } catch (e: any) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goTodo(item: (typeof TODO_LIST.value)[number]) {
  if (!item.count) {
    uni.showToast({ title: '暂无待处理', icon: 'none' })
    return
  }
  if (!item.to) {
    uni.showToast({ title: item.label + ' · 待开放', icon: 'none' })
    return
  }
  uni.navigateTo({ url: item.to })
}

function goEntry(item: (typeof QUICK_ENTRIES)[number]) {
  if (item.to.startsWith('/pages/tabbar/')) {
    uni.switchTab({ url: item.to, fail: () => uni.reLaunch({ url: item.to }) })
  } else {
    uni.navigateTo({ url: item.to })
  }
}

function goNotify() {
  uni.showToast({ title: '消息中心 · 待开放', icon: 'none' })
}

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <!-- 顶部 Hero（双大字关键指标） -->
    <view class="hero" :style="{ paddingTop: statusBarHeight }">
      <view class="hero-top">
        <view class="hero-greet">
          <text class="hello">你好,{{ adminStore.nickname }}</text>
          <text class="role">平台管理 · 经纬科技</text>
        </view>
        <view class="notify-btn" @click="goNotify">
          <Icon name="bell" :size="36" color="#fff" />
          <view v-if="TOTAL_TODOS > 0" class="notify-dot">{{
            TOTAL_TODOS > 99 ? '99+' : TOTAL_TODOS
          }}</view>
        </view>
      </view>

      <view class="hero-stats">
        <view class="hero-stat">
          <text class="hs-label">今日新订单</text>
          <view class="hs-num-row">
            <text class="hs-num">{{ heroToday.orders }}</text>
            <view
              v-if="dashboard"
              :class="['hs-delta', heroToday.ordersDelta >= 0 ? 'up' : 'down']"
            >
              <Icon
                :name="heroToday.ordersDelta >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="20"
                color="#fff"
              />
              <text>{{ heroToday.ordersDelta >= 0 ? '+' : '' }}{{ heroToday.ordersDelta }}</text>
            </view>
          </view>
        </view>
        <view class="hs-divider" />
        <view class="hero-stat">
          <text class="hs-label">今日 GMV</text>
          <view class="hs-num-row">
            <text class="hs-cur">¥</text>
            <text class="hs-num">{{ heroToday.gmv }}</text>
            <view v-if="dashboard" :class="['hs-delta', heroToday.gmvDelta >= 0 ? 'up' : 'down']">
              <Icon
                :name="heroToday.gmvDelta >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="20"
                color="#fff"
              />
              <text>{{ heroToday.gmvDelta }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 错误态：load 失败 -->
      <view v-if="errorMsg && !dashboard" class="err-block">
        <Icon name="info" :size="56" color="#FF7A45" />
        <text class="err-title">加载失败</text>
        <text class="err-msg">{{ errorMsg }}</text>
        <view class="err-btn" @click="load">点击重试</view>
      </view>

      <!-- 平台概览 4 张异色卡（克制留白） -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">平台概览</text>
          <text class="section-meta" v-if="dashboard">实时</text>
        </view>
        <view class="ov-grid">
          <view
            v-for="c in OVERVIEW_CARDS"
            :key="c.key"
            class="ov-card"
            :style="{ background: c.tintSoft }"
          >
            <view class="ov-icon-wrap" :style="{ background: c.tint }">
              <Icon :name="c.icon" :size="28" color="#fff" />
            </view>
            <text class="ov-label">{{ c.label }}</text>
            <text class="ov-value" :style="{ color: c.tint }">{{ c.value }}</text>
            <view v-if="dashboard" :class="['ov-delta', (c.delta ?? 0) >= 0 ? 'up' : 'down']">
              <Icon
                :name="(c.delta ?? 0) >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="14"
                :color="(c.delta ?? 0) >= 0 ? '#52C41A' : '#FF3B30'"
              />
              <text
                >{{ (c.delta ?? 0) >= 0 ? '+' : '' }}{{ c.delta ?? 0
                }}{{ c.isPct ? '%' : '' }}</text
              >
            </view>
          </view>
        </view>
      </view>

      <!-- mini-line chart：仅有数据时显示 -->
      <view v-if="trend" class="section trend-card">
        <view class="section-head">
          <text class="section-title">近 7 日注册趋势</text>
          <text class="trend-meta">合计 {{ trend.total }} 人</text>
        </view>
        <view class="mini-line-wrap">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" class="mini-svg">
            <defs>
              <linearGradient id="ml-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FF4D2D" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#FF4D2D" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="ml-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#FF7A45" />
                <stop offset="100%" stop-color="#FF4D2D" />
              </linearGradient>
            </defs>
            <polygon :points="trend.area" fill="url(#ml-g)" />
            <polyline
              :points="trend.line"
              fill="none"
              stroke="url(#ml-line)"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in trend.points"
              :key="i"
              :cx="p.x"
              :cy="p.y"
              r="0.85"
              fill="#FF4D2D"
            />
          </svg>
        </view>
        <view class="trend-x">
          <text v-for="(p, i) in trend.points" :key="i">{{ p.date.slice(-5) }}</text>
        </view>
      </view>

      <!-- 待办（精简紧凑卡） -->
      <view class="section todo-card">
        <view class="section-head">
          <view class="todo-head-left">
            <Icon name="lightning" :size="28" color="#FF4D2D" />
            <text class="section-title">待办事项</text>
          </view>
          <view v-if="TOTAL_TODOS > 0" class="todo-total">{{ TOTAL_TODOS }} 项</view>
          <text v-else class="todo-empty-tag">已清空</text>
        </view>
        <view class="todo-list">
          <view v-for="t in TODO_LIST" :key="t.key" class="todo-row" @click="goTodo(t)">
            <text class="todo-label">{{ t.label }}</text>
            <view v-if="t.count > 0" class="todo-badge">{{ t.count > 99 ? '99+' : t.count }}</view>
            <text v-else class="todo-clear">已清空</text>
            <Icon name="chevron-right" :size="24" color="#C9CDD4" />
          </view>
        </view>
      </view>

      <!-- 4 大核心快捷入口（大方块） -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">快捷入口</text>
        </view>
        <view class="entries-grid">
          <view
            v-for="e in QUICK_ENTRIES"
            :key="e.key"
            class="entry-card"
            :style="{ background: e.tintSoft }"
            @click="goEntry(e)"
          >
            <view class="entry-icon" :style="{ background: e.tint }">
              <Icon :name="e.icon" :size="36" color="#fff" />
            </view>
            <view class="entry-text">
              <text class="entry-label">{{ e.label }}</text>
              <text class="entry-desc">{{ e.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 200rpx" />
    </scroll-view>

    <TabBar current="home" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  overflow: hidden;
}

/* === Hero 顶部双大字 === */
.hero {
  background: linear-gradient(135deg, #ff4d2d 0%, #ff7a45 50%, #ff9c6e 100%);
  color: #fff;
  padding-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.18);
}
.hero-top {
  padding: 24rpx 32rpx 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.hero-greet {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .hello {
    font-size: 32rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
  }
  .role {
    font-size: 22rpx;
    opacity: 0.86;
  }
}
.notify-btn {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .notify-dot {
    position: absolute;
    top: -4rpx;
    right: -6rpx;
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    border-radius: 999rpx;
    background: #fff;
    color: var(--brand-primary);
    font-size: 18rpx;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid #ff4d2d;
  }
}
.hero-stats {
  margin: 0 24rpx;
  padding: 24rpx 28rpx;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(6rpx);
  -webkit-backdrop-filter: blur(6rpx);
  border-radius: 24rpx;
  display: flex;
  align-items: stretch;
  gap: 24rpx;
}
.hs-divider {
  width: 1rpx;
  background: rgba(255, 255, 255, 0.28);
  flex-shrink: 0;
}
.hero-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  .hs-label {
    font-size: 22rpx;
    opacity: 0.86;
  }
  .hs-num-row {
    display: flex;
    align-items: baseline;
    gap: 6rpx;
  }
  .hs-cur {
    font-size: 26rpx;
    font-weight: 800;
  }
  .hs-num {
    font-size: 52rpx;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: 1rpx;
    font-family: var(--font-family-base);
  }
  .hs-delta {
    display: inline-flex;
    align-items: center;
    gap: 2rpx;
    margin-left: 8rpx;
    padding: 4rpx 10rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 999rpx;
    font-size: 18rpx;
    font-weight: 700;
    font-family: var(--font-family-base);
  }
}

/* === 滚动容器 === */
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx 0;
  box-sizing: border-box;
}

/* === 通用 section === */
.section {
  margin-bottom: 16rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 4rpx 12rpx;
  .section-title {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 1rpx;
  }
  .section-meta {
    font-size: 22rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}

/* === 错误态 === */
.err-block {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.05);
  border: 1rpx solid rgba(15, 23, 42, 0.04);
  .err-title {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .err-msg {
    font-size: 22rpx;
    color: var(--text-tertiary);
    text-align: center;
  }
  .err-btn {
    margin-top: 16rpx;
    padding: 16rpx 60rpx;
    background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
    color: #fff;
    font-size: 26rpx;
    font-weight: 700;
    border-radius: 999rpx;
    box-shadow: 0 6rpx 18rpx rgba(255, 77, 45, 0.32);
  }
}

/* === 平台概览：4 张异色卡 === */
.ov-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.ov-card {
  position: relative;
  padding: 24rpx 24rpx 20rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  box-shadow: 0 4rpx 14rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid rgba(15, 23, 42, 0.02);
  overflow: hidden;
  &:active {
    transform: scale(0.98);
  }
}
.ov-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}
.ov-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  font-weight: 500;
  margin-top: 6rpx;
}
.ov-value {
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1.1;
  font-family: var(--font-family-base);
  letter-spacing: 0.5rpx;
}
.ov-delta {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
  align-self: flex-start;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  font-family: var(--font-family-base);
  background: rgba(255, 255, 255, 0.6);
  &.up {
    color: #52c41a;
  }
  &.down {
    color: #ff3b30;
  }
}

/* === mini line chart === */
.trend-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx 24rpx 16rpx;
  box-shadow: 0 4rpx 14rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid rgba(15, 23, 42, 0.02);
  .section-head {
    padding: 0 0 8rpx;
  }
  .trend-meta {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 700;
    font-family: var(--font-family-base);
  }
}
.mini-line-wrap {
  height: 60rpx;
  width: 100%;
  filter: drop-shadow(0 4rpx 8rpx rgba(255, 77, 45, 0.15));
}
.mini-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.trend-x {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
  font-size: 18rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
}

/* === 待办精简卡 === */
.todo-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 16rpx 0 8rpx;
  box-shadow: 0 4rpx 14rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid rgba(15, 23, 42, 0.02);
  .section-head {
    padding: 4rpx 24rpx 12rpx;
    border-bottom: 1rpx solid rgba(15, 23, 42, 0.05);
    .todo-head-left {
      display: flex;
      align-items: center;
      gap: 8rpx;
    }
  }
  .todo-total {
    padding: 4rpx 16rpx;
    background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
    color: #fff;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
    font-family: var(--font-family-base);
  }
  .todo-empty-tag {
    font-size: 22rpx;
    color: #86909c;
    font-weight: 600;
  }
}
.todo-list {
  display: flex;
  flex-direction: column;
}
.todo-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx 24rpx;
  &:not(:last-child) {
    border-bottom: 1rpx solid rgba(15, 23, 42, 0.04);
  }
  &:active {
    background: #fafbfc;
  }
  .todo-label {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
    font-weight: 500;
  }
  .todo-badge {
    min-width: 40rpx;
    height: 32rpx;
    padding: 0 12rpx;
    border-radius: 999rpx;
    background: linear-gradient(135deg, #ff6b45, #ff3b30);
    color: #fff;
    font-size: 20rpx;
    font-weight: 800;
    line-height: 32rpx;
    text-align: center;
    font-family: var(--font-family-base);
    box-shadow: 0 2rpx 6rpx rgba(255, 59, 48, 0.32);
  }
  .todo-clear {
    font-size: 22rpx;
    color: #c9cdd4;
    font-weight: 500;
  }
}

/* === 4 大核心快捷入口（大方块、空间呼吸） === */
.entries-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.entry-card {
  padding: 28rpx 24rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  box-shadow: 0 4rpx 14rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid rgba(15, 23, 42, 0.02);
  &:active {
    transform: scale(0.98);
  }
  .entry-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.12);
  }
  .entry-text {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  .entry-label {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 1rpx;
  }
  .entry-desc {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
</style>
