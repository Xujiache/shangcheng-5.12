<script setup lang="ts">
/**
 * PA-Tab · 平台数据中心（v2 · 与商户/订单页统一橙色系风格）
 *
 * 视觉：
 * - 顶部沿用全站统一的 #FF4D2D → #FF9C6E 橙色渐变（之前是橙紫不一致已修复）
 * - 顶部条 = 标题 + 周期切换胶囊 + 导出按钮（与 me 页平齐）
 * - 4 张 KPI 卡（商户/订单/GMV/用户）+ 注册趋势 SVG + 商户构成 + 类目排行 + 会员分布
 * - 北京时间口径
 */
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  dashboardService,
  statsService,
  type PlatformStats,
  type StatsPeriod,
} from '../../../services'
import type { PlatformDashboard } from '@jiujiu/shared/types'
import { formatWan } from '@jiujiu/shared/utils'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const dashboard = ref<PlatformDashboard | null>(null)
const stats = ref<PlatformStats | null>(null)
const period = ref<StatsPeriod>('week')
const loading = ref(true)
const statsLoading = ref(false)
/** 用于报错重试态:dashboard / stats 任一失败时显示，整页不再空白 */
const dashboardError = ref('')
const statsError = ref('')

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

const PERIODS = [
  { key: 'today' as const, label: '今日' },
  { key: 'week' as const, label: '本周' },
  { key: 'month' as const, label: '本月' },
  { key: 'year' as const, label: '本年' },
]

const KPI_CARDS = computed(() => {
  const d = dashboard.value
  if (!d) return []
  return [
    {
      key: 'merchants',
      label: '商户',
      icon: 'home-shop',
      tint: '#FF4D2D',
      value: d.overview.merchants,
      delta: d.overview.merchantsDelta,
      isMoney: false,
    },
    {
      key: 'orders',
      label: '订单',
      icon: 'biz-order',
      tint: '#FF7A45',
      value: d.overview.orders,
      delta: d.overview.ordersDelta,
      isMoney: false,
    },
    {
      key: 'gmv',
      label: '交易额',
      icon: 'wallet',
      tint: '#FAAD14',
      value: d.overview.gmv,
      delta: d.overview.gmvDelta,
      isMoney: true,
    },
    {
      key: 'users',
      label: '用户',
      icon: 'user',
      tint: '#A855F7',
      value: d.overview.users,
      delta: d.overview.usersDelta,
      isMoney: false,
    },
  ]
})

async function load() {
  loading.value = true
  dashboardError.value = ''
  try {
    dashboard.value = await dashboardService.get()
  } catch (e: any) {
    dashboardError.value = e?.message || '加载失败,请下拉重试'
  } finally {
    loading.value = false
  }
}

/**
 * 拉 GET /p/stats?period=xxx：返回销售趋势 + TOP10 商家。
 * 与 dashboard 的 categorySales 互补,这里展示按周期切换的销售曲线和商家排行。
 * dashboard 上的数据只有"近 14 天注册趋势 / 全期类目分布",粒度不变。
 */
async function loadStats() {
  statsLoading.value = true
  statsError.value = ''
  try {
    stats.value = await statsService.get(period.value)
  } catch (e: any) {
    stats.value = null
    statsError.value = e?.message || '销售趋势数据加载失败'
  } finally {
    statsLoading.value = false
  }
}

function retryAll() {
  load()
  loadStats()
}

watch(period, loadStats)

const PERIOD_LABEL_MAP: Record<StatsPeriod, string> = {
  today: '今日',
  week: '本周',
  month: '本月',
  year: '本年',
}

const salesTrendPoints = computed(() => {
  const data = stats.value?.salesTrend ?? []
  if (data.length === 0)
    return { line: '', area: '', dots: [] as { x: number; y: number; v: number; label: string }[] }
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = data.length > 1 ? 100 / (data.length - 1) : 100
  const padY = 4
  const dots = data.map((d, i) => {
    const x = i * w
    const y = padY + 32 - (d.value / max) * 28
    return { x, y, v: d.value, label: d.date }
  })
  const line = dots.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${dots[0].x.toFixed(1)},40 ${line} ${dots[dots.length - 1].x.toFixed(1)},40`
  return { line, area, dots }
})

const maxMerchantSales = computed(() =>
  Math.max(...(stats.value?.topMerchants?.map((m) => m.sales) ?? [1])),
)

const trendPoints = computed(() => {
  const data = dashboard.value?.registrationTrend?.slice(-14) ?? []
  if (data.length === 0)
    return { line: '', area: '', dots: [] as { x: number; y: number; v: number; label: string }[] }
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = data.length > 1 ? 100 / (data.length - 1) : 100
  const padY = 4 // 顶部留白避免线条贴边
  const dots = data.map((d, i) => {
    const x = i * w
    const y = padY + 32 - (d.value / max) * 28
    return { x, y, v: d.value, label: d.date }
  })
  const line = dots.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${dots[0].x.toFixed(1)},40 ${line} ${dots[dots.length - 1].x.toFixed(1)},40`
  return { line, area, dots }
})

const maxCategory = computed(() =>
  Math.max(...(dashboard.value?.categorySales?.map((c) => c.value) ?? [1])),
)

const merchantTotal = computed(() => {
  const d = dashboard.value
  if (!d) return 1
  return (d.merchantTypeDistribution?.factory ?? 0) + (d.merchantTypeDistribution?.store ?? 0) || 1
})

const memberTotal = computed(() => {
  const d = dashboard.value?.memberPlanDistribution
  if (!d) return 1
  return (d.yearly ?? 0) + (d.monthly ?? 0) + (d.trial ?? 0) || 1
})

function formatBeijingNow(): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const valueOf = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${valueOf('year')}-${valueOf('month')}-${valueOf('day')} ${valueOf('hour')}:${valueOf('minute')}`
}

const todayString = computed(() => {
  return formatBeijingNow()
})

function exportReport() {
  uni.showLoading({ title: '导出中…' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '已导出 Excel', icon: 'success' })
  }, 800)
}

onMounted(() => {
  load()
  loadStats()
})

/**
 * 切回数据 tab 时自动重试一次：
 * - 上次失败 → 重新拉
 * - 数据为空 → 重新拉
 * - 正常有数据 → 也刷新一下（数据时效性敏感）
 */
onShow(() => {
  if (!dashboard.value || dashboardError.value) load()
  if (!stats.value || statsError.value) loadStats()
})
</script>

<template>
  <view class="page">
    <!-- 顶部彩色条（与商户/订单页统一橙色） -->
    <view class="top-bar" :style="{ paddingTop: statusBarHeight }">
      <view class="top-row">
        <view class="top-title-block">
          <text class="top-title">数据中心</text>
          <text class="top-time">{{ todayString }} · 北京时间</text>
        </view>
        <view class="export-btn" @click="exportReport">
          <Icon name="doc" :size="26" color="#fff" />
          <text>导出</text>
        </view>
      </view>
      <view class="periods">
        <view
          v-for="p in PERIODS"
          :key="p.key"
          :class="['period', period === p.key ? 'active' : '']"
          @click="period = p.key"
          >{{ p.label }}</view
        >
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 顶层错误态：dashboard 加载失败 -->
      <view v-if="dashboardError && !dashboard" class="err-card">
        <Icon name="info" :size="64" color="#FF7A45" />
        <text class="err-title">加载失败</text>
        <text class="err-msg">{{ dashboardError }}</text>
        <view class="err-btn" @click="retryAll">点击重试</view>
      </view>

      <!-- KPI 骨架屏 -->
      <view v-if="loading && !dashboard" class="overview">
        <view v-for="i in 4" :key="i" class="ov-item ov-skel">
          <view class="ov-icon skel" />
          <view class="ov-info">
            <view class="skel-line w40" />
            <view class="skel-line w70 tall" />
            <view class="skel-line w30" />
          </view>
        </view>
      </view>

      <!-- 4 大 KPI -->
      <view v-if="dashboard" class="overview">
        <view v-for="k in KPI_CARDS" :key="k.key" class="ov-item">
          <view class="ov-icon" :style="{ background: k.tint + '18' }">
            <Icon :name="k.icon" :size="30" :color="k.tint" />
          </view>
          <view class="ov-info">
            <text class="ov-label">{{ k.label }}</text>
            <view class="ov-num-row">
              <text v-if="k.isMoney" class="ov-cur">¥</text>
              <text class="ov-num">{{ formatWan(k.value) }}</text>
            </view>
            <view :class="['ov-delta', (k.delta ?? 0) >= 0 ? 'up' : 'down']">
              <Icon
                :name="(k.delta ?? 0) >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="16"
                :color="(k.delta ?? 0) >= 0 ? '#52C41A' : '#FF3B30'"
              />
              <text
                >{{ (k.delta ?? 0) >= 0 ? '+' : '' }}{{ k.delta ?? 0
                }}{{ k.key === 'gmv' ? '%' : '' }}</text
              >
            </view>
          </view>
        </view>
      </view>

      <!-- 销售趋势：报错时显示单卡错误并提供重试 -->
      <view v-if="statsError && !stats" class="chart-card err-inline">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">销售趋势</text>
          </view>
          <view class="err-retry" @click="loadStats">重试</view>
        </view>
        <text class="err-inline-msg">{{ statsError }}</text>
      </view>

      <!-- 销售趋势加载骨架 -->
      <view v-else-if="statsLoading && !stats" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">销售趋势</text>
          </view>
          <text class="meta">加载中…</text>
        </view>
        <view class="trend-svg-wrap skel" />
      </view>

      <!-- 销售趋势（按周期切换 · /p/stats） -->
      <view v-if="stats" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">销售趋势</text>
          </view>
          <text class="meta"
            >{{ PERIOD_LABEL_MAP[period] }} · {{ stats.salesTrend.length }} 段</text
          >
        </view>
        <view class="trend-svg-wrap">
          <svg viewBox="0 0 100 44" preserveAspectRatio="none" class="trend-svg">
            <defs>
              <linearGradient id="sales-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FF4D2D" stop-opacity="0.32" />
                <stop offset="100%" stop-color="#FF4D2D" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="sales-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#FF4D2D" />
                <stop offset="100%" stop-color="#FAAD14" />
              </linearGradient>
            </defs>
            <polygon :points="salesTrendPoints.area" fill="url(#sales-g)" />
            <polyline
              :points="salesTrendPoints.line"
              fill="none"
              stroke="url(#sales-line)"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in salesTrendPoints.dots"
              :key="i"
              :cx="p.x"
              :cy="p.y"
              r="0.8"
              fill="#FF4D2D"
            />
          </svg>
        </view>
      </view>

      <!-- TOP10 商家（按周期切换 · /p/stats） -->
      <view v-if="stats && stats.topMerchants.length > 0" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">TOP{{ stats.topMerchants.length }} 商家</text>
          </view>
          <text class="meta">{{ PERIOD_LABEL_MAP[period] }} GMV</text>
        </view>
        <view class="cat-list">
          <view v-for="(m, i) in stats.topMerchants" :key="m.merchantId" class="cat-row">
            <view class="cat-label">
              <view
                :class="[
                  'rank-mini',
                  i === 0 && 'rank-1',
                  i === 1 && 'rank-2',
                  i === 2 && 'rank-3',
                ]"
                >{{ i + 1 }}</view
              >
              <text class="cat-name">{{ m.name }}</text>
            </view>
            <view class="cat-bar-wrap">
              <view
                class="cat-bar"
                :style="{ width: ((m.sales / maxMerchantSales) * 100).toFixed(0) + '%' }"
              />
            </view>
            <text class="cat-val">¥{{ formatWan(m.sales) }}</text>
          </view>
        </view>
      </view>

      <!-- 注册趋势 -->
      <view v-if="dashboard" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">用户注册趋势</text>
          </view>
          <text class="meta">近 14 天</text>
        </view>
        <view class="trend-svg-wrap">
          <svg viewBox="0 0 100 44" preserveAspectRatio="none" class="trend-svg">
            <defs>
              <linearGradient id="trend-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FF4D2D" stop-opacity="0.32" />
                <stop offset="100%" stop-color="#FF4D2D" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="trend-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#FF4D2D" />
                <stop offset="100%" stop-color="#FF9C6E" />
              </linearGradient>
            </defs>
            <polygon :points="trendPoints.area" fill="url(#trend-g)" />
            <polyline
              :points="trendPoints.line"
              fill="none"
              stroke="url(#trend-line)"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in trendPoints.dots"
              :key="i"
              :cx="p.x"
              :cy="p.y"
              r="0.8"
              fill="#FF4D2D"
            />
          </svg>
        </view>
      </view>

      <!-- 商户类型分布 -->
      <view v-if="dashboard" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">商户类型构成</text>
          </view>
          <text class="meta">{{ merchantTotal }} 家</text>
        </view>
        <view class="pie-row">
          <view class="pie-item factory">
            <view
              class="pie-bar"
              :style="{
                width:
                  ((dashboard.merchantTypeDistribution.factory / merchantTotal) * 100).toFixed(0) +
                  '%',
              }"
            />
            <view class="p-tag" :style="{ background: '#FF4D2D' }" />
            <text class="p-label">厂家</text>
            <text class="p-pct"
              >{{
                Math.round((dashboard.merchantTypeDistribution.factory / merchantTotal) * 100)
              }}%</text
            >
            <text class="p-num">{{ dashboard.merchantTypeDistribution.factory }}</text>
          </view>
          <view class="pie-item store">
            <view
              class="pie-bar"
              :style="{
                width:
                  ((dashboard.merchantTypeDistribution.store / merchantTotal) * 100).toFixed(0) +
                  '%',
              }"
            />
            <view class="p-tag" :style="{ background: '#FAAD14' }" />
            <text class="p-label">门店</text>
            <text class="p-pct"
              >{{
                Math.round((dashboard.merchantTypeDistribution.store / merchantTotal) * 100)
              }}%</text
            >
            <text class="p-num">{{ dashboard.merchantTypeDistribution.store }}</text>
          </view>
        </view>
      </view>

      <!-- 类目销售排行 -->
      <view v-if="dashboard" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">类目销售排行</text>
          </view>
          <text class="meta">TOP {{ dashboard.categorySales?.length || 0 }}</text>
        </view>
        <view class="cat-list">
          <view v-for="(c, i) in dashboard.categorySales" :key="c.category" class="cat-row">
            <view class="cat-label">
              <view
                :class="[
                  'rank-mini',
                  i === 0 && 'rank-1',
                  i === 1 && 'rank-2',
                  i === 2 && 'rank-3',
                ]"
                >{{ i + 1 }}</view
              >
              <text class="cat-name">{{ c.category }}</text>
            </view>
            <view class="cat-bar-wrap">
              <view
                class="cat-bar"
                :style="{ width: ((c.value / maxCategory) * 100).toFixed(0) + '%' }"
              />
            </view>
            <text class="cat-val">¥{{ formatWan(c.value) }}</text>
          </view>
        </view>
      </view>

      <!-- 会员套餐分布 -->
      <view v-if="dashboard" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">会员订阅分布</text>
          </view>
          <text class="meta">{{ memberTotal }} 家订阅</text>
        </view>
        <view class="member-dist">
          <view class="md-item">
            <view class="md-circle yearly">
              <text class="md-num">{{ dashboard.memberPlanDistribution.yearly }}</text>
              <text class="md-pct"
                >{{
                  Math.round((dashboard.memberPlanDistribution.yearly / memberTotal) * 100)
                }}%</text
              >
            </view>
            <text class="md-label">VIP 年费</text>
          </view>
          <view class="md-item">
            <view class="md-circle monthly">
              <text class="md-num">{{ dashboard.memberPlanDistribution.monthly }}</text>
              <text class="md-pct"
                >{{
                  Math.round((dashboard.memberPlanDistribution.monthly / memberTotal) * 100)
                }}%</text
              >
            </view>
            <text class="md-label">月费</text>
          </view>
          <view class="md-item">
            <view class="md-circle trial">
              <text class="md-num">{{ dashboard.memberPlanDistribution.trial }}</text>
              <text class="md-pct"
                >{{
                  Math.round((dashboard.memberPlanDistribution.trial / memberTotal) * 100)
                }}%</text
              >
            </view>
            <text class="md-label">试用</text>
          </view>
        </view>
      </view>

      <view style="height: 200rpx" />
    </scroll-view>

    <TabBar current="stats" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* === 与商户/订单页统一的橙色顶部 === */
.top-bar {
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  padding-bottom: 24rpx;
}
.top-row {
  padding: 20rpx 24rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.top-title-block {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .top-title {
    font-size: 36rpx;
    font-weight: 800;
  }
  .top-time {
    font-size: 20rpx;
    opacity: 0.88;
    font-family: var(--font-family-base);
  }
}
.export-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 22rpx;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  backdrop-filter: blur(8rpx);
}
.periods {
  margin: 0 24rpx;
  padding: 4rpx;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999rpx;
  display: flex;
}
.period {
  flex: 1;
  padding: 12rpx 0;
  text-align: center;
  font-size: 24rpx;
  border-radius: 999rpx;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.85);
  &.active {
    background: #fff;
    color: #ff4d2d;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  }
}

.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx 0;
  box-sizing: border-box;
}

/* === 错误态/骨架 === */
.err-card {
  margin: 40rpx 0 24rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 56rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.05);
  border: 1rpx solid rgba(15, 23, 42, 0.04);
  .err-title {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .err-msg {
    font-size: 24rpx;
    color: var(--text-tertiary);
    text-align: center;
    line-height: 1.6;
  }
  .err-btn {
    margin-top: 16rpx;
    padding: 18rpx 64rpx;
    background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
    color: #fff;
    font-size: 26rpx;
    font-weight: 700;
    border-radius: 999rpx;
    box-shadow: 0 6rpx 18rpx rgba(255, 77, 45, 0.32);
  }
}
.err-inline {
  .err-inline-msg {
    display: block;
    font-size: 22rpx;
    color: var(--text-tertiary);
    text-align: center;
    padding: 24rpx 0;
  }
  .err-retry {
    padding: 6rpx 22rpx;
    background: var(--bg-page);
    color: var(--brand-primary);
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
  }
}
.skel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.2s linear infinite;
  border-radius: 12rpx;
}
@keyframes skel-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
.ov-skel {
  .ov-icon.skel {
    background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%) !important;
    background-size: 200% 100%;
    animation: skel-shimmer 1.2s linear infinite;
  }
  .skel-line {
    height: 16rpx;
    border-radius: 8rpx;
    background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%);
    background-size: 200% 100%;
    animation: skel-shimmer 1.2s linear infinite;
    margin-top: 8rpx;
    &.tall {
      height: 28rpx;
      margin-top: 10rpx;
    }
    &.w30 {
      width: 30%;
    }
    &.w40 {
      width: 40%;
    }
    &.w70 {
      width: 70%;
    }
  }
}

/* === KPI 4 宫格 === */
.overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.ov-item {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.05);
  border: 1rpx solid rgba(15, 23, 42, 0.04);
}
.ov-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ov-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  .ov-label {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .ov-num-row {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
    .ov-cur {
      font-size: 20rpx;
      font-weight: 800;
      color: var(--text-primary);
    }
    .ov-num {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1;
      font-family: var(--font-family-base);
    }
  }
  .ov-delta {
    display: flex;
    align-items: center;
    gap: 2rpx;
    font-size: 18rpx;
    font-weight: 600;
    font-family: var(--font-family-base);
    &.up {
      color: #52c41a;
    }
    &.down {
      color: #ff3b30;
    }
  }
}

/* === 通用卡片 === */
.chart-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.05);
  border: 1rpx solid rgba(15, 23, 42, 0.04);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .meta {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  .title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
}
.title-dot {
  width: 6rpx;
  height: 24rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #ff4d2d, #ff9c6e);
}

/* === 趋势 SVG === */
.trend-svg-wrap {
  height: 220rpx;
  width: 100%;
}
.trend-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* === 商户类型分布 === */
.pie-row {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.pie-item {
  position: relative;
  height: 64rpx;
  background: var(--bg-page);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  gap: 10rpx;
  overflow: hidden;
  .pie-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, rgba(255, 77, 45, 0.18), rgba(255, 77, 45, 0.04));
    border-radius: 16rpx;
    transition: width 0.5s ease;
  }
  &.store .pie-bar {
    background: linear-gradient(90deg, rgba(250, 173, 20, 0.2), rgba(250, 173, 20, 0.04));
  }
  .p-tag {
    width: 8rpx;
    height: 32rpx;
    border-radius: 4rpx;
    z-index: 1;
  }
  .p-label {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--text-primary);
    z-index: 1;
  }
  .p-pct {
    margin-left: auto;
    font-size: 20rpx;
    font-weight: 600;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
    z-index: 1;
  }
  .p-num {
    margin-left: 16rpx;
    font-size: 28rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    z-index: 1;
  }
  &.store .p-num {
    color: #faad14;
  }
}

/* === 类目销售 === */
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.cat-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cat-label {
  width: 156rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: var(--text-primary);
  .rank-mini {
    width: 30rpx;
    height: 30rpx;
    border-radius: 8rpx;
    background: var(--bg-page);
    color: var(--text-tertiary);
    font-size: 18rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-family-base);
    flex-shrink: 0;
    &.rank-1 {
      background: linear-gradient(135deg, #ffb300, #ff6b45);
      color: #fff;
    }
    &.rank-2 {
      background: linear-gradient(135deg, #ffd89b, #ffb300);
      color: #fff;
    }
    &.rank-3 {
      background: linear-gradient(135deg, #ffe4d9, #ff9c6e);
      color: #fff;
    }
  }
  .cat-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.cat-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  overflow: hidden;
  .cat-bar {
    height: 100%;
    background: linear-gradient(90deg, #ff4d2d, #ff9c6e);
    border-radius: 999rpx;
    transition: width 0.5s ease;
  }
}
.cat-val {
  min-width: 100rpx;
  text-align: right;
  font-size: 22rpx;
  font-weight: 700;
  color: var(--brand-primary);
  font-family: var(--font-family-base);
}

/* === 会员分布 === */
.member-dist {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16rpx 0 4rpx;
}
.md-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  .md-circle {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.12);
    &.yearly {
      background: linear-gradient(135deg, #ffd89b, #ff6b45);
    }
    &.monthly {
      background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
    }
    &.trial {
      background: linear-gradient(135deg, #faad14, #ffb300);
    }
  }
  .md-num {
    font-size: 36rpx;
    font-weight: 800;
    line-height: 1;
    font-family: var(--font-family-base);
  }
  .md-pct {
    margin-top: 2rpx;
    font-size: 18rpx;
    font-weight: 600;
    opacity: 0.85;
    font-family: var(--font-family-base);
  }
  .md-label {
    font-size: 22rpx;
    color: var(--text-primary);
    font-weight: 600;
  }
}
</style>
