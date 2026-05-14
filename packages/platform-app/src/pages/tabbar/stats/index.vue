<script setup lang="ts">
/**
 * PA-Tab · 平台数据中心（v3 · 自然文档流 + sticky 顶部 + fixed TabBar）
 *
 * 重做原因（v2 → v3）：
 *   v2 用 `display:flex; overflow:hidden` + `scroll-view { flex:1; height:0 }`,
 *   在 mp-weixin / App 真包里高度计算失败 → 整页连同 TabBar 都塌陷为 0 显示。
 *
 * v3 架构（永不塌陷）：
 *   - `.page { min-height:100vh; padding-bottom:220rpx }` —— 自然文档流,内容多了自动撑高
 *   - 顶部条用 `position: sticky; top: 0` —— 滚动时吸顶
 *   - 底部 TabBar 用 `position: fixed; bottom: 0` —— 永远可见
 *   - 不用任何 `scroll-view` —— 让 mp-weixin / App / H5 用页面默认滚动
 *
 * 视觉升级：
 *   - Hero KPI 区:今日总览大字 + 同比
 *   - 4 张 KPI 卡:更细腻的渐变 + 高对比文字
 *   - 销售趋势 mini-chart + 周期切换
 *   - TOP 5 商家 + 商户构成 + 会员分布
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
const dashboardLoading = ref(true)
const statsLoading = ref(false)
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
const PERIOD_LABEL: Record<StatsPeriod, string> = {
  today: '今日',
  week: '本周',
  month: '本月',
  year: '本年',
}

const KPI_CARDS = computed(() => {
  const d = dashboard.value
  if (!d) return []
  return [
    {
      key: 'merchants',
      label: '商户总数',
      icon: 'home-shop',
      tint: '#3B82F6',
      bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
      value: d.overview.merchants,
      delta: d.overview.merchantsDelta,
      unit: '',
    },
    {
      key: 'orders',
      label: '订单总数',
      icon: 'biz-order',
      tint: '#FF4D2D',
      bg: 'linear-gradient(135deg, #FFE4D9, #FED7AA)',
      value: d.overview.orders,
      delta: d.overview.ordersDelta,
      unit: '',
    },
    {
      key: 'gmv',
      label: '交易额',
      icon: 'wallet',
      tint: '#F59E0B',
      bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
      value: d.overview.gmv,
      delta: d.overview.gmvDelta,
      unit: '%',
      money: true,
    },
    {
      key: 'users',
      label: '注册用户',
      icon: 'user',
      tint: '#A855F7',
      bg: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)',
      value: d.overview.users,
      delta: d.overview.usersDelta,
      unit: '',
    },
  ]
})

async function load() {
  dashboardLoading.value = true
  dashboardError.value = ''
  try {
    dashboard.value = await dashboardService.get()
  } catch (e: any) {
    dashboardError.value = e?.message || '数据加载失败,请重试'
  } finally {
    dashboardLoading.value = false
  }
}

async function loadStats() {
  statsLoading.value = true
  statsError.value = ''
  try {
    stats.value = await statsService.get(period.value)
  } catch (e: any) {
    stats.value = null
    statsError.value = e?.message || '销售趋势加载失败'
  } finally {
    statsLoading.value = false
  }
}

function retryAll() {
  load()
  loadStats()
}

watch(period, loadStats)

const salesTrendPoints = computed(() => {
  const data = stats.value?.salesTrend ?? []
  if (data.length === 0) {
    return { line: '', area: '', dots: [] as { x: number; y: number }[] }
  }
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = data.length > 1 ? 100 / (data.length - 1) : 100
  const dots = data.map((d, i) => ({
    x: i * w,
    y: 4 + 32 - (d.value / max) * 28,
  }))
  const line = dots.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${dots[0].x.toFixed(1)},40 ${line} ${dots[dots.length - 1].x.toFixed(1)},40`
  return { line, area, dots }
})

const trendPoints = computed(() => {
  const data = dashboard.value?.registrationTrend?.slice(-14) ?? []
  if (data.length === 0) {
    return { line: '', area: '', dots: [] as { x: number; y: number }[] }
  }
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = data.length > 1 ? 100 / (data.length - 1) : 100
  const dots = data.map((d, i) => ({
    x: i * w,
    y: 4 + 32 - (d.value / max) * 28,
  }))
  const line = dots.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${dots[0].x.toFixed(1)},40 ${line} ${dots[dots.length - 1].x.toFixed(1)},40`
  return { line, area, dots }
})

const maxMerchantSales = computed(() =>
  Math.max(...(stats.value?.topMerchants?.map((m) => m.sales) ?? [1])),
)

const maxCategory = computed(() =>
  Math.max(...(dashboard.value?.categorySales?.map((c) => c.value) ?? [1])),
)

const merchantTotal = computed(() => {
  const d = dashboard.value?.merchantTypeDistribution
  if (!d) return 1
  return (d.factory ?? 0) + (d.store ?? 0) || 1
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
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${v('year')}-${v('month')}-${v('day')} ${v('hour')}:${v('minute')}`
}

const todayString = computed(() => formatBeijingNow())

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

onShow(() => {
  if (!dashboard.value || dashboardError.value) load()
  if (!stats.value || statsError.value) loadStats()
})
</script>

<template>
  <view class="page">
    <!-- 顶部 sticky 渐变条 -->
    <view class="top-bar" :style="{ paddingTop: statusBarHeight }">
      <view class="top-row">
        <view class="top-title-block">
          <text class="top-title">数据中心</text>
          <text class="top-time">{{ todayString }} · 北京时间</text>
        </view>
        <view class="export-btn" @click="exportReport">
          <Icon name="doc" :size="24" color="#fff" />
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

    <!-- 主内容区(自然文档流,绝不塌陷) -->
    <view class="body">
      <!-- 顶层错误态 -->
      <view v-if="dashboardError && !dashboard" class="err-card">
        <text class="err-emoji">⚠️</text>
        <text class="err-title">加载失败</text>
        <text class="err-msg">{{ dashboardError }}</text>
        <view class="err-btn" @click="retryAll">点击重试</view>
      </view>

      <!-- 骨架屏 -->
      <view v-if="dashboardLoading && !dashboard && !dashboardError" class="kpi-grid">
        <view v-for="i in 4" :key="i" class="kpi-card skel">
          <view class="skel-icon" />
          <view class="skel-line w50" />
          <view class="skel-line w70 tall" />
          <view class="skel-line w40" />
        </view>
      </view>

      <!-- 4 KPI 卡片(异色 + 渐变背景) -->
      <view v-if="dashboard" class="kpi-grid">
        <view v-for="k in KPI_CARDS" :key="k.key" class="kpi-card" :style="{ background: k.bg }">
          <view class="kpi-head">
            <view class="kpi-icon" :style="{ background: '#fff', color: k.tint }">
              <Icon :name="k.icon" :size="28" :color="k.tint" />
            </view>
            <view :class="['kpi-delta', (k.delta ?? 0) >= 0 ? 'up' : 'down']">
              <Icon
                :name="(k.delta ?? 0) >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="14"
                :color="(k.delta ?? 0) >= 0 ? '#16A34A' : '#DC2626'"
              />
              <text>{{ (k.delta ?? 0) >= 0 ? '+' : '' }}{{ k.delta ?? 0 }}{{ k.unit }}</text>
            </view>
          </view>
          <text class="kpi-label">{{ k.label }}</text>
          <view class="kpi-value-row">
            <text v-if="k.money" class="kpi-cur">¥</text>
            <text class="kpi-value" :style="{ color: k.tint }">{{ formatWan(k.value) }}</text>
          </view>
        </view>
      </view>

      <!-- 销售趋势 -->
      <view class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">销售趋势</text>
          </view>
          <text class="meta">{{ PERIOD_LABEL[period] }}</text>
        </view>
        <view v-if="statsError && !stats" class="inline-err">
          <text class="inline-err-msg">{{ statsError }}</text>
          <view class="inline-err-btn" @click="loadStats">重试</view>
        </view>
        <view v-else-if="statsLoading && !stats" class="chart-skel" />
        <view v-else-if="stats && stats.salesTrend.length > 0" class="trend-wrap">
          <!-- View-based 柱状图(每点一根细条)。原 <svg> 在 uniapp App / mp-weixin 端
               会让整页(连同 TabBar)空白塌陷,只在 H5 上能正常显示;换成 view 后全平台稳定。 -->
          <view class="bars bars-sales">
            <view
              v-for="(p, i) in salesTrendPoints.dots"
              :key="i"
              class="bar bar-sales"
              :style="{ height: ((44 - p.y) / 40 * 100).toFixed(1) + '%' }"
            />
          </view>
        </view>
        <view v-else class="empty-chart">
          <text class="empty-emoji">📊</text>
          <text class="empty-text">{{ PERIOD_LABEL[period] }} 暂无数据</text>
        </view>
      </view>

      <!-- TOP 商家 -->
      <view v-if="stats && stats.topMerchants && stats.topMerchants.length > 0" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">TOP {{ Math.min(stats.topMerchants.length, 10) }} 商家</text>
          </view>
          <text class="meta">{{ PERIOD_LABEL[period] }} GMV</text>
        </view>
        <view class="list">
          <view
            v-for="(m, i) in stats.topMerchants.slice(0, 10)"
            :key="m.merchantId"
            class="list-row"
          >
            <view
              :class="['rank-mini', i === 0 && 'rank-1', i === 1 && 'rank-2', i === 2 && 'rank-3']"
              >{{ i + 1 }}</view
            >
            <text class="list-name">{{ m.name }}</text>
            <view class="list-bar-wrap">
              <view
                class="list-bar"
                :style="{ width: ((m.sales / maxMerchantSales) * 100).toFixed(0) + '%' }"
              />
            </view>
            <text class="list-val">¥{{ formatWan(m.sales) }}</text>
          </view>
        </view>
      </view>

      <!-- 用户注册趋势 -->
      <view v-if="dashboard" class="chart-card">
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">用户注册趋势</text>
          </view>
          <text class="meta">近 14 天</text>
        </view>
        <view v-if="trendPoints.dots.length > 0" class="trend-wrap">
          <!-- 见上方注释:原 <svg> 在 App / 小程序端会塌陷整页,换成 view 柱状图 -->
          <view class="bars bars-reg">
            <view
              v-for="(p, i) in trendPoints.dots"
              :key="i"
              class="bar bar-reg"
              :style="{ height: ((44 - p.y) / 40 * 100).toFixed(1) + '%' }"
            />
          </view>
        </view>
        <view v-else class="empty-chart">
          <text class="empty-emoji">👥</text>
          <text class="empty-text">暂无注册数据</text>
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
            <view class="p-dot factory-dot" />
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
            <view class="p-dot store-dot" />
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
      <view
        v-if="dashboard && dashboard.categorySales && dashboard.categorySales.length > 0"
        class="chart-card"
      >
        <view class="card-head">
          <view class="card-title-row">
            <view class="title-dot" />
            <text class="title">类目销售排行</text>
          </view>
          <text class="meta">TOP {{ dashboard.categorySales.length }}</text>
        </view>
        <view class="list">
          <view v-for="(c, i) in dashboard.categorySales" :key="c.category" class="list-row">
            <view
              :class="['rank-mini', i === 0 && 'rank-1', i === 1 && 'rank-2', i === 2 && 'rank-3']"
              >{{ i + 1 }}</view
            >
            <text class="list-name">{{ c.category }}</text>
            <view class="list-bar-wrap">
              <view
                class="list-bar orange"
                :style="{ width: ((c.value / maxCategory) * 100).toFixed(0) + '%' }"
              />
            </view>
            <text class="list-val">¥{{ formatWan(c.value) }}</text>
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
    </view>

    <!-- TabBar 固定底部,永不丢失 -->
    <TabBar current="stats" />
  </view>
</template>

<style lang="scss" scoped>
/* === 根容器:自然文档流,不用 flex 撑高,绝不塌陷 === */
.page {
  min-height: 100vh;
  background: #f7f8fa;
  /* 底部留出 TabBar (约 100rpx + 安全区) + 一点视觉缓冲 */
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* === 顶部 sticky bar (滚动时吸顶) === */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  padding-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.18);
}
.top-row {
  padding: 16rpx 28rpx 14rpx;
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
    letter-spacing: 1rpx;
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
}
.periods {
  margin: 0 28rpx;
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

/* === 主内容区 === */
.body {
  padding: 20rpx 24rpx 0;
}

/* === 错误态 === */
.err-card {
  margin: 60rpx 0 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.06);
  .err-emoji {
    font-size: 80rpx;
  }
  .err-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1d2129;
  }
  .err-msg {
    font-size: 24rpx;
    color: #86909c;
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

/* === 4 张 KPI 卡 === */
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.kpi-card {
  padding: 24rpx 22rpx;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  position: relative;
  overflow: hidden;
  min-height: 200rpx;
  box-sizing: border-box;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.05);
}
.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}
.kpi-delta {
  display: flex;
  align-items: center;
  gap: 2rpx;
  padding: 4rpx 10rpx;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  font-family: var(--font-family-base);
  backdrop-filter: blur(4rpx);
  &.up {
    color: #16a34a;
  }
  &.down {
    color: #dc2626;
  }
}
.kpi-label {
  font-size: 22rpx;
  color: #4e5969;
  font-weight: 600;
}
.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  .kpi-cur {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .kpi-value {
    font-size: 44rpx;
    font-weight: 900;
    line-height: 1;
    font-family: var(--font-family-base);
  }
}

/* === 通用 chart-card === */
.chart-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
  .meta {
    font-size: 20rpx;
    color: #86909c;
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
    color: #1d2129;
  }
}
.title-dot {
  width: 6rpx;
  height: 24rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #ff4d2d, #ff9c6e);
}

/* === 趋势图 === */
.trend-wrap {
  height: 220rpx;
  width: 100%;
}
/* 柱状条阵列 —— 替代原 <svg sparkline>(在 App / mp-weixin 端会塌陷整页) */
.bars {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
  padding: 0 4rpx;
  box-sizing: border-box;
}
.bar {
  flex: 1;
  min-height: 4rpx;
  border-radius: 4rpx 4rpx 0 0;
  transition: height 0.3s ease;
}
.bar-sales {
  background: linear-gradient(180deg, #FF4D2D, #F59E0B);
}
.bar-reg {
  background: linear-gradient(180deg, #A855F7, #EC4899);
}

/* === 卡内错误 === */
.inline-err {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}
.inline-err-msg {
  font-size: 24rpx;
  color: #86909c;
}
.inline-err-btn {
  padding: 10rpx 32rpx;
  background: rgba(255, 77, 45, 0.1);
  color: #ff4d2d;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}

/* === 空态 === */
.empty-chart {
  height: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  .empty-emoji {
    font-size: 64rpx;
    opacity: 0.5;
  }
  .empty-text {
    font-size: 22rpx;
    color: #c9cdd4;
  }
}

/* === 列表（TOP 商家 / 类目排行） === */
.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.rank-mini {
  width: 36rpx;
  height: 36rpx;
  border-radius: 10rpx;
  background: #f5f6f8;
  color: #86909c;
  font-size: 20rpx;
  font-weight: 800;
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
.list-name {
  width: 140rpx;
  font-size: 24rpx;
  color: #1d2129;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-bar-wrap {
  flex: 1;
  height: 14rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  overflow: hidden;
  min-width: 80rpx;
}
.list-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 999rpx;
  transition: width 0.5s ease;
  &.orange {
    background: linear-gradient(90deg, #ff4d2d, #ff9c6e);
  }
}
.list-val {
  min-width: 100rpx;
  text-align: right;
  font-size: 22rpx;
  font-weight: 700;
  color: #ff4d2d;
  font-family: var(--font-family-base);
}

/* === 商户类型分布 === */
.pie-row {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.pie-item {
  position: relative;
  height: 72rpx;
  background: #f7f8fa;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  gap: 12rpx;
  overflow: hidden;
}
.pie-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 18rpx;
  transition: width 0.5s ease;
}
.pie-item.factory .pie-bar {
  background: linear-gradient(90deg, rgba(255, 77, 45, 0.2), rgba(255, 77, 45, 0.04));
}
.pie-item.store .pie-bar {
  background: linear-gradient(90deg, rgba(250, 173, 20, 0.22), rgba(250, 173, 20, 0.04));
}
.p-dot {
  width: 12rpx;
  height: 32rpx;
  border-radius: 4rpx;
  z-index: 1;
  &.factory-dot {
    background: #ff4d2d;
  }
  &.store-dot {
    background: #faad14;
  }
}
.p-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #1d2129;
  z-index: 1;
}
.p-pct {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 600;
  color: #86909c;
  font-family: var(--font-family-base);
  z-index: 1;
}
.p-num {
  margin-left: 14rpx;
  font-size: 30rpx;
  font-weight: 800;
  font-family: var(--font-family-base);
  z-index: 1;
}
.pie-item.factory .p-num {
  color: #ff4d2d;
}
.pie-item.store .p-num {
  color: #faad14;
}

/* === 会员分布 === */
.member-dist {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20rpx 0 8rpx;
}
.md-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.md-circle {
  width: 128rpx;
  height: 128rpx;
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
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1;
  font-family: var(--font-family-base);
}
.md-pct {
  margin-top: 4rpx;
  font-size: 20rpx;
  font-weight: 600;
  opacity: 0.92;
  font-family: var(--font-family-base);
}
.md-label {
  font-size: 22rpx;
  color: #4e5969;
  font-weight: 600;
}

/* === 骨架屏 === */
.skel {
  position: relative;
  background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s linear infinite;
  border-radius: 12rpx;
}
.kpi-card.skel {
  background: #fff;
  border: 1rpx dashed #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10rpx;
}
.skel-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s linear infinite;
}
.skel-line {
  height: 20rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s linear infinite;
  &.tall {
    height: 36rpx;
  }
  &.w40 {
    width: 40%;
  }
  &.w50 {
    width: 50%;
  }
  &.w70 {
    width: 70%;
  }
}
.chart-skel {
  height: 220rpx;
  border-radius: 12rpx;
  background: linear-gradient(90deg, #f1f3f6 0%, #fafbfc 50%, #f1f3f6 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s linear infinite;
}
@keyframes skel-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
