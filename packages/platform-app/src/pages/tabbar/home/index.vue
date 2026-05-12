<script setup lang="ts">
/**
 * PA-01 · 平台首页（数据驾驶舱）
 * 还原 原型图/platform-app.jsx::PA_Home
 * - 顶部欢迎条 + 站内通知
 * - 平台概览 4 宫格（商户/订单/交易额/用户）
 * - 近 7 日注册趋势折线
 * - 待办（5 项 · 红色徽标）
 * - 4 快捷入口（商户/商品/广告/会员）
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { dashboardService } from '../../../services'
import { useAdminStore } from '../../../store/admin'
import { formatPrice, formatWan } from '@jiujiu/shared/utils'
import type { PlatformDashboard } from '@jiujiu/shared/types'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const adminStore = useAdminStore()
const dashboard = ref<PlatformDashboard | null>(null)
const loading = ref(true)

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

const TODO_LIST = computed(() => {
  if (!dashboard.value) return []
  const t = dashboard.value.todos
  return [
    { key: 'merchant', icon: 'home-shop', label: '待审核商户', count: t.pendingMerchants, tint: '#FF4D2D', to: '/pages/audit/merchant' },
    { key: 'product', icon: 'package', label: '待审核商品', count: t.pendingProducts, tint: '#FF7A45', to: '/pages/audit/product' },
    { key: 'ad', icon: 'megaphone', label: '广告创意待审', count: t.pendingAds, tint: '#FAAD14', to: '/pages/ad/index' },
    { key: 'complaint', icon: 'help', label: '售后投诉', count: t.complaints, tint: '#FF3B30', to: '/pages/tabbar/order/index' },
    { key: 'withdraw', icon: 'wallet', label: '待审核提现', count: t.pendingWithdraws, tint: '#A855F7', to: '' },
  ]
})

const QUICK_ENTRIES = [
  { key: 'merchant', icon: 'home-shop', label: '商户', tint: '#FF4D2D', to: '/pages/tabbar/merchant/index' },
  { key: 'product', icon: 'package', label: '商品', tint: '#FF7A45', to: '/pages/audit/product' },
  { key: 'ad', icon: 'megaphone', label: '广告', tint: '#FAAD14', to: '/pages/ad/index' },
  { key: 'member', icon: 'crown', label: '会员', tint: '#A855F7', to: '/pages/member/index' },
  { key: 'plaza', icon: 'gift', label: '广场', tint: '#52C41A', to: '/pages/plaza/index' },
  { key: 'feature', icon: 'gear', label: '开关', tint: '#1296DB', to: '/pages/feature-flag/index' },
  { key: 'perm', icon: 'lock', label: '权限', tint: '#86909C', to: '/pages/permission/index' },
  { key: 'system', icon: 'gear', label: '系统', tint: '#0EA5E9', to: '/pages/system/index' },
]

const TOTAL_TODOS = computed(() =>
  TODO_LIST.value.reduce((s, x) => s + (x.count ?? 0), 0),
)

/** 折线图 SVG 多项式：将注册趋势数组归一化绘制 */
const trendPolyline = computed(() => {
  const data = dashboard.value?.registrationTrend?.slice(-7) ?? []
  if (data.length === 0) return ''
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = 100 / (data.length - 1 || 1)
  return data
    .map((d, i) => {
      const x = i * w
      const y = 36 - (d.value / max) * 30
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const trendArea = computed(() => {
  const pl = trendPolyline.value
  if (!pl) return ''
  const pts = pl.split(' ')
  return `${pts[0].split(',')[0]},36 ${pl} ${pts[pts.length - 1].split(',')[0]},36`
})

async function load() {
  loading.value = true
  try {
    dashboard.value = await dashboardService.get()
  } finally {
    loading.value = false
  }
}

function goTodo(item: typeof TODO_LIST.value[number]) {
  if (item.count === 0) {
    uni.showToast({ title: '暂无待处理', icon: 'none' })
    return
  }
  if (!item.to) {
    uni.showToast({ title: item.label + ' · 待开放', icon: 'none' })
    return
  }
  uni.navigateTo({ url: item.to })
}
function goEntry(item: typeof QUICK_ENTRIES[number]) {
  if (item.to.startsWith('/pages/tabbar/')) {
    uni.switchTab({ url: item.to, fail: () => uni.navigateTo({ url: item.to }) })
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
    <!-- 渐变顶部条 -->
    <view class="top-bar" :style="{ paddingTop: statusBarHeight }">
      <view class="top-content">
        <view class="top-left">
          <text class="welcome">平台管理 · 经纬科技</text>
          <text class="sub">欢迎回来，{{ adminStore.nickname }}</text>
        </view>
        <view class="notify-btn" @click="goNotify">
          <Icon name="bell" :size="40" color="#fff" />
          <view v-if="TOTAL_TODOS > 0" class="badge">{{ TOTAL_TODOS }}</view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 平台概览 4 宫格 -->
      <view class="overview-card">
        <view class="overview-head">
          <text class="title">平台概览</text>
          <text class="action">今日 ›</text>
        </view>
        <view class="overview-grid" v-if="dashboard">
          <view class="ov-item">
            <text class="ov-label">商户</text>
            <view class="ov-value-row">
              <text class="ov-value">{{ dashboard.overview.merchants }}</text>
              <view class="ov-delta up">
                <Icon name="arrow-up" :size="18" color="#52C41A" />
                <text>+{{ dashboard.overview.merchantsDelta }}</text>
              </view>
            </view>
          </view>
          <view class="ov-item">
            <text class="ov-label">订单</text>
            <view class="ov-value-row">
              <text class="ov-value">{{ formatWan(dashboard.overview.orders) }}</text>
              <view class="ov-delta up">
                <Icon name="arrow-up" :size="18" color="#52C41A" />
                <text>+{{ dashboard.overview.ordersDelta }}</text>
              </view>
            </view>
          </view>
          <view class="ov-item">
            <text class="ov-label">交易额</text>
            <view class="ov-value-row">
              <text class="ov-value">¥{{ formatWan(dashboard.overview.gmv) }}</text>
              <view class="ov-delta up">
                <Icon name="arrow-up" :size="18" color="#52C41A" />
                <text>{{ dashboard.overview.gmvDelta }}%</text>
              </view>
            </view>
          </view>
          <view class="ov-item">
            <text class="ov-label">用户</text>
            <view class="ov-value-row">
              <text class="ov-value">{{ formatWan(dashboard.overview.users) }}</text>
              <view class="ov-delta up">
                <Icon name="arrow-up" :size="18" color="#52C41A" />
                <text>+{{ dashboard.overview.usersDelta }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 近 7 日注册趋势 -->
      <view class="trend-card" v-if="dashboard">
        <view class="trend-head">
          <text class="title">近 7 日注册趋势</text>
          <text class="meta">合计 {{ dashboard.registrationTrend.slice(-7).reduce((s, x) => s + x.value, 0) }} 人</text>
        </view>
        <view class="trend-svg-wrap">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="trend-svg">
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FF4D2D" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#FF4D2D" stop-opacity="0" />
              </linearGradient>
            </defs>
            <polygon :points="trendArea" fill="url(#g1)" />
            <polyline :points="trendPolyline" fill="none" stroke="#FF4D2D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </view>
        <view class="trend-x">
          <text v-for="(d, i) in dashboard.registrationTrend.slice(-7)" :key="i">
            {{ d.date.slice(-2) }}
          </text>
        </view>
      </view>

      <!-- 待办（高亮卡片） -->
      <view class="todo-card">
        <view class="todo-head">
          <view class="todo-title">
            <Icon name="lightning" :size="32" color="#FF4D2D" />
            <text>待办</text>
          </view>
          <view class="todo-badge">{{ TOTAL_TODOS }}</view>
        </view>
        <view class="todo-list">
          <view
            v-for="t in TODO_LIST"
            :key="t.key"
            class="todo-row"
            @click="goTodo(t)"
          >
            <view class="todo-icon" :style="{ background: t.tint + '18' }">
              <Icon :name="t.icon" :size="32" :color="t.tint" />
            </view>
            <text class="todo-label">{{ t.label }}</text>
            <view class="todo-count" v-if="t.count > 0" :style="{ background: t.tint }">
              {{ t.count }}
            </view>
            <text v-else class="todo-clear">已清空</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="entries-card">
        <text class="entries-title">快捷入口</text>
        <view class="entries-grid">
          <view
            v-for="e in QUICK_ENTRIES"
            :key="e.key"
            class="entry"
            @click="goEntry(e)"
          >
            <view class="entry-icon" :style="{ background: e.tint + '18' }">
              <Icon :name="e.icon" :size="40" :color="e.tint" />
            </view>
            <text class="entry-label">{{ e.label }}</text>
          </view>
        </view>
      </view>

      <view style="height: 160rpx;" />
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
}
.top-bar {
  background: linear-gradient(135deg, #FF4D2D, #FF9C6E);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.2);
}
.top-content {
  padding: 24rpx 32rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  .top-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .welcome {
      font-size: 36rpx;
      font-weight: 800;
      letter-spacing: 1rpx;
    }
    .sub {
      font-size: 22rpx;
      opacity: 0.9;
    }
  }
  .notify-btn {
    position: relative;
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    .badge {
      position: absolute;
      top: 4rpx;
      right: 0;
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
      box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.15);
    }
  }
}
.scroll {
  flex: 1;
  height: 0;
}

/* 概览 */
.overview-card {
  margin: -16rpx 24rpx 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-md);
}
.overview-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
  .title { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
  .action { font-size: 22rpx; color: var(--text-tertiary); }
}
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.ov-item {
  padding: 20rpx 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .ov-label { font-size: 22rpx; color: var(--text-tertiary); }
  .ov-value-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8rpx;
  }
  .ov-value {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    line-height: 1;
  }
  .ov-delta {
    display: flex;
    align-items: center;
    gap: 2rpx;
    font-size: 18rpx;
    font-weight: 600;
    &.up { color: #52C41A; }
    &.down { color: #FF3B30; }
  }
}

/* 趋势 */
.trend-card {
  margin: 0 24rpx 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
}
.trend-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12rpx;
  .title { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
  .meta {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
    font-family: var(--font-family-base);
  }
}
.trend-svg-wrap {
  height: 160rpx;
  width: 100%;
}
.trend-svg {
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

/* 待办 */
.todo-card {
  margin: 0 24rpx 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx 0 16rpx;
  border: 1rpx solid rgba(255,77,45,0.2);
  box-shadow: var(--shadow-sm);
}
.todo-head {
  padding: 0 24rpx 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx dashed var(--border-light);
  .todo-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .todo-badge {
    padding: 4rpx 16rpx;
    background: var(--brand-gradient);
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
}
.todo-list {
  display: flex;
  flex-direction: column;
}
.todo-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  &:not(:last-child) {
    border-bottom: 1rpx dashed var(--border-light);
  }
  .todo-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .todo-label {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .todo-count {
    padding: 4rpx 14rpx;
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 800;
    font-family: var(--font-family-base);
  }
  .todo-clear {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}

/* 快捷入口 */
.entries-card {
  margin: 0 24rpx 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
}
.entries-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16rpx;
  display: block;
}
.entries-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  .entry-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .entry-label {
    font-size: 22rpx;
    color: var(--text-primary);
  }
}
</style>
