<script setup lang="ts">
/**
 * MA-02 · 数据统计（还原原型 + 美化）
 *
 * 顶栏（含日历）+ 时段 Tab + 销售趋势折线（含日历 picker）
 * + 热销 TOP 10 + 商品分析柱图 + 客户分析环形图
 */
import { ref, onMounted, computed, watch } from 'vue'
import { dashboardService } from '../../../services/dashboard'
import { formatWan, formatPrice } from '@jiujiu/shared/utils'
import type { MerchantStats } from '@jiujiu/shared/types'
import Section from '../../../components/section/section.vue'
import Tabs from '../../../components/tabs/tabs.vue'
import LineChart from '../../../components/line-chart/line-chart.vue'
import BarChart from '../../../components/bar-chart/bar-chart.vue'
import DonutChart from '../../../components/donut-chart/donut-chart.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'
import { useHideNativeTabBar } from '../../../composables/useHideNativeTabBar'
import { useStatusBar } from '../../../composables/useStatusBar'
import { safeSwitchTab } from '../../../utils/tab-nav'

useHideNativeTabBar()
const { heroPaddingTop } = useStatusBar(24)

type Period = 'today' | 'week' | 'month' | 'year'

const period = ref<Period>('week')
const stats = ref<MerchantStats | null>(null)
const loading = ref(false)
const customDate = ref('')

const TABS = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
]

const totalSales = computed(() => stats.value?.salesTrend.reduce((s, x) => s + x.value, 0) ?? 0)
/**
 * 注意:这里聚合的是 TOP 商品的销量之和,**不是**真实的订单笔数。
 *
 * 后端 stats 接口(/api/v1/m/dashboard/stats)目前没有按周期返回订单总数,
 * 用销量当订单数会让"客单价"=销售额/订单数 失真(销量包含同一订单多件),
 * 故 P1-14 修复:
 *   - 这里改名为 topProductsSales,语义诚实
 *   - 概览卡片删掉"订单数 / 客单价"两栏,等后端补真订单聚合再加
 */
const topProductsSales = computed(
  () => stats.value?.topProducts.reduce((s, p) => s + p.sales, 0) ?? 0,
)

/**
 * 拉取统计数据
 *
 * 周期 period 来自 Tab；customDate 来自日期 picker（可选）
 *
 * watch(period) 会自动驱动重新加载；customDate 改变时由 pickDate 主动调用
 */
async function loadStats() {
  loading.value = true
  try {
    stats.value = await dashboardService.getStats(period.value, customDate.value || undefined)
  } finally {
    loading.value = false
  }
}

/** Tab 周期切换 → 重新拉数据（清掉自定义日期，避免概念冲突） */
function changePeriod(p: Period) {
  period.value = p
  customDate.value = ''
}

watch(period, loadStats)
onMounted(loadStats)

const labels = computed(() => stats.value?.salesTrend.map((s) => s.date) ?? [])
const values = computed(() => stats.value?.salesTrend.map((s) => s.value) ?? [])

const topProducts = computed(() => stats.value?.topProducts.slice(0, 10) ?? [])

const newRatio = computed(() =>
  stats.value ? Math.round(stats.value.customerAnalysis.newRatio * 100) : 0,
)

const donutSegments = computed(() => {
  if (!stats.value) return []
  return [
    { label: '新客户', value: stats.value.customerAnalysis.newRatio, color: '#FF4D2D' },
    { label: '老客户', value: stats.value.customerAnalysis.oldRatio, color: '#1F2937' },
  ]
})

const catLabels = computed(() => stats.value?.categoryBars.map((c) => c.category) ?? [])
const catValues = computed(() => stats.value?.categoryBars.map((c) => c.sales) ?? [])

/**
 * 选择某天 → 切到「今日」周期 + 把 date 作为附加 query 让后端按天过滤
 *
 * 后端 stats 接口的 query 是 any，会接受 date 字段
 * （当前实现可能仅做提示用途，但语义上必须发起一次刷新而不是只 toast）
 */
function pickDate(e: { detail: { value: string } }) {
  customDate.value = e.detail.value
  if (period.value !== 'today') {
    period.value = 'today' // 触发 watch → loadStats
  } else {
    loadStats() // 已经是 today，需要手动刷新带上新 date
  }
  uni.showToast({ title: `已查看 ${customDate.value}`, icon: 'none' })
}

function goAllProducts() {
  // 商品列表本身按 sales desc 排（后端默认），跳过去能看到完整销量排名
  safeSwitchTab('/pages/tabbar/product/index')
}

function trendDirection(idx: number) {
  if (!stats.value) return 'flat'
  const arr = stats.value.salesTrend.map((s) => s.value)
  if (arr.length < 2) return 'flat'
  const first = arr.slice(0, Math.ceil(arr.length / 2)).reduce((a, b) => a + b, 0)
  const last = arr.slice(Math.ceil(arr.length / 2)).reduce((a, b) => a + b, 0)
  if (last > first * 1.05) return 'up'
  if (last < first * 0.95) return 'down'
  return 'flat'
}
const direction = computed(() => trendDirection(0))

const periodText = computed(() =>
  period.value === 'today'
    ? '今日 24h'
    : period.value === 'week'
      ? '近 7 日'
      : period.value === 'month'
        ? '近 30 日'
        : '近 12 月',
)
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar" :style="{ paddingTop: heroPaddingTop }">
      <view class="title-row">
        <text class="page-title">数据统计</text>
        <picker mode="date" :value="customDate" @change="pickDate">
          <view class="cal-btn">
            <Icon name="calendar" :size="36" color="#fff" />
          </view>
        </picker>
      </view>
      <Tabs
        v-model="period"
        :items="TABS"
        variant="capsule"
        class="period-tabs"
        @change="(k: string) => changePeriod(k as Period)"
      />
    </view>

    <view class="body">
      <!-- 概览：白色卡片包裹 3 KPI -->
      <view v-if="stats" class="overview-card">
        <view class="overview-head">
          <text class="overview-title">{{ periodText }} 概览</text>
          <view class="overview-direction" :class="direction">
            <Icon
              :name="direction === 'down' ? 'arrow-down' : 'arrow-up'"
              :size="20"
              :color="direction === 'down' ? '#FF3B30' : '#52C41A'"
            />
            <text>{{
              direction === 'down' ? '环比下降' : direction === 'up' ? '环比上升' : '持平'
            }}</text>
          </view>
        </view>
        <view class="overview-grid">
          <view class="ov-item primary">
            <text class="ov-label">总销售额</text>
            <text class="ov-value">{{ formatPrice(totalSales) }}</text>
            <view class="ov-bar primary-bar" />
          </view>
          <view class="ov-divider" />
          <view class="ov-item">
            <text class="ov-label">TOP 商品销量</text>
            <text class="ov-value">{{ topProductsSales }}</text>
            <view class="ov-bar success-bar" />
          </view>
        </view>
      </view>

      <!-- 销售趋势 -->
      <Section title="销售趋势" :sub="periodText">
        <view class="trend-wrap">
          <LineChart v-if="values.length" :data="values" :labels="labels" :height="320" />
        </view>
      </Section>

      <!-- 热销 TOP 10 -->
      <Section title="热销商品 TOP 10" action="查看全部" @action="goAllProducts">
        <view class="top-list">
          <view v-for="(p, i) in topProducts" :key="p.productId" class="top-row">
            <view :class="['rank', i < 3 ? `rank-${i + 1}` : 'rank-rest']">
              {{ i + 1 }}
            </view>
            <view class="top-info">
              <text class="top-name">{{ p.name }}</text>
              <view class="top-bar">
                <view
                  class="top-bar-fill"
                  :style="{ width: (p.sales / (topProducts[0]?.sales || 1)) * 100 + '%' }"
                />
              </view>
            </view>
            <text class="top-sales">售 {{ p.sales }}</text>
          </view>
        </view>
      </Section>

      <!-- 商品分析 + 客户分析 双栏 -->
      <view class="duo">
        <view class="duo-card">
          <view class="duo-head">
            <text class="duo-title">商品分析</text>
            <Icon name="biz-product" :size="28" color="var(--text-tertiary)" />
          </view>
          <text class="duo-sub">分类销量分布</text>
          <view class="duo-chart">
            <BarChart :data="catValues" :labels="catLabels" :height="180" />
          </view>
        </view>
        <view class="duo-card">
          <view class="duo-head">
            <text class="duo-title">客户分析</text>
            <Icon name="biz-customer" :size="28" color="var(--text-tertiary)" />
          </view>
          <view class="customer-analysis">
            <view class="ca-donut">
              <DonutChart
                :segments="donutSegments"
                :size="160"
                center-label="新客占比"
                :center-value="`${newRatio}%`"
                :hide-legend="true"
              />
            </view>
            <view class="ca-legend">
              <view class="legend-row">
                <view class="legend-dot" style="background: #ff4d2d" />
                <text class="legend-label">新客户</text>
                <text class="legend-value">{{ newRatio }}%</text>
              </view>
              <view class="legend-row">
                <view class="legend-dot" style="background: #1f2937" />
                <text class="legend-label">老客户</text>
                <text class="legend-value">{{ 100 - newRatio }}%</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">
        <text>刷新中…</text>
      </view>
      <view class="safe-bottom" />
    </view>

    <TabBar current="stats" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.topbar {
  background: var(--brand-gradient);
  /* padding-top 由内联 heroPaddingTop 注入（状态栏 + 24rpx） */
  padding: 0 24rpx 80rpx;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      circle at 80% 20%,
      rgba(255, 255, 255, 0.18) 0%,
      transparent 50%
    );
    pointer-events: none;
  }
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
  .page-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
  }
  .cal-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.period-tabs {
  margin-top: 24rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999rpx;
  padding: 6rpx;
  position: relative;
  z-index: 1;
  /* 覆盖 Tabs 组件 capsule variant 的默认背景，避免在橘红顶图上视觉冲突 */
  :deep(.tab) {
    background: transparent !important;
    padding: 14rpx 24rpx;
    border-radius: 999rpx;
    .tab-text {
      color: rgba(255, 255, 255, 0.85);
      font-size: 26rpx;
    }
  }
  :deep(.tab.active) {
    background: #fff !important;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
    .tab-text {
      color: var(--brand-primary) !important;
      font-weight: 700;
    }
  }
}

.body {
  margin-top: -48rpx;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  position: relative;
  z-index: 2;
}
/* 整体白色概览卡 */
.overview-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 24rpx;
  box-shadow:
    0 8rpx 32rpx rgba(0, 0, 0, 0.06),
    0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.overview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  .overview-title {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .overview-direction {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
    &.up {
      background: rgba(82, 196, 26, 0.1);
      color: #52c41a;
    }
    &.down {
      background: rgba(255, 59, 48, 0.1);
      color: #ff3b30;
    }
    &.flat {
      background: rgba(134, 144, 156, 0.1);
      color: var(--text-tertiary);
    }
  }
}
.overview-grid {
  display: flex;
  align-items: stretch;
}
.ov-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 4rpx 12rpx;
  position: relative;
  min-width: 0;
  .ov-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .ov-value {
    font-size: 38rpx;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.1;
    font-family: var(--font-family-base);
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    white-space: nowrap;
  }
  &.primary .ov-value {
    background: linear-gradient(135deg, #ff6b45, #ff4d2d);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .ov-bar {
    margin-top: 4rpx;
    width: 48rpx;
    height: 6rpx;
    border-radius: 3rpx;
    &.primary-bar {
      background: linear-gradient(90deg, #ff6b45, #ff4d2d);
    }
    &.success-bar {
      background: #52c41a;
    }
    &.info-bar {
      background: #1296db;
    }
  }
}
.ov-divider {
  width: 1rpx;
  background: linear-gradient(
    180deg,
    transparent,
    var(--border-light) 30%,
    var(--border-light) 70%,
    transparent
  );
  margin: 0 4rpx;
}

/* 客户分析重构 */
.customer-analysis {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}
.ca-donut {
  flex-shrink: 0;
}
.ca-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-left: 8rpx;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .legend-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-label {
    flex: 1;
    font-size: 22rpx;
    color: var(--text-secondary);
  }
  .legend-value {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
}
.trend-wrap {
  padding-top: 8rpx;
}
.top-list {
  display: flex;
  flex-direction: column;
}
.top-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .rank {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    text-align: center;
    line-height: 48rpx;
    font-weight: 700;
    font-size: 22rpx;
    color: #fff;
    flex-shrink: 0;
    font-family: var(--font-family-base);
    &.rank-1 {
      background: linear-gradient(135deg, #ffb74d, #ff8a65);
      box-shadow: 0 4rpx 12rpx rgba(255, 138, 101, 0.35);
    }
    &.rank-2 {
      background: linear-gradient(135deg, #b0bec5, #78909c);
    }
    &.rank-3 {
      background: linear-gradient(135deg, #bcaaa4, #8d6e63);
    }
    &.rank-rest {
      background: var(--bg-page);
      color: var(--text-tertiary);
      box-shadow: inset 0 0 0 1rpx var(--border-light);
    }
  }
  .top-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
    .top-name {
      font-size: 26rpx;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .top-bar {
      height: 6rpx;
      background: var(--bg-active);
      border-radius: 999rpx;
      overflow: hidden;
    }
    .top-bar-fill {
      height: 100%;
      background: var(--brand-gradient);
      border-radius: 999rpx;
    }
  }
  .top-sales {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    min-width: 100rpx;
    text-align: right;
  }
}

.duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.duo-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.duo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .duo-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
}
.duo-sub {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.duo-chart {
  margin-top: 12rpx;
}
.duo-donut {
  margin-top: 12rpx;
  display: flex;
  justify-content: center;
}

.loading {
  text-align: center;
  padding: 24rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.safe-bottom {
  height: 80rpx;
}
</style>
