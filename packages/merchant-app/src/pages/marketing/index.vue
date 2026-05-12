<script setup lang="ts">
/**
 * MA-18 · 营销中心
 *
 * 3 大工具入口（优惠券/限时购/团购）+ 优惠券概览 + 优惠券表
 */
import { ref, computed, onMounted } from 'vue'
import { marketingService } from '../../services/store'
import type { MarketingCoupon, MarketingOverview } from '../../services/store'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

const overview = ref<MarketingOverview | null>(null)
const couponTab = ref<'all' | 'active' | 'pending' | 'ended'>('active')
const coupons = ref<MarketingCoupon[]>([])
const loading = ref(false)

const COUPON_TABS = computed(() => [
  { key: 'all' as const, label: '全部', badge: coupons.value.length },
  { key: 'active' as const, label: '进行中' },
  { key: 'pending' as const, label: '未开始' },
  { key: 'ended' as const, label: '已结束' },
])

const STATUS_LABEL: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  active: { text: '进行中', tone: 'success' },
  pending: { text: '草稿', tone: 'info' },
  paused: { text: '已暂停', tone: 'warning' },
  ended: { text: '已结束', tone: 'default' },
}

const TOOLS = [
  { key: 'coupon', icon: 'tag', label: '优惠券', desc: '满减/折扣/固定金额', accent: '#FF4D2D', count: () => overview.value?.coupons.active ?? 0 },
  { key: 'flash', icon: 'lightning', label: '限时购', desc: '指定时段超低价', accent: '#FF7A45', count: () => overview.value?.flashSales.active ?? 0 },
  { key: 'group', icon: 'biz-customer', label: '团购', desc: '成团享更低价', accent: '#FF9C6E', count: () => overview.value?.groupBuys.active ?? 0 },
]

async function loadOverview() {
  overview.value = await marketingService.overview()
}
async function loadCoupons() {
  loading.value = true
  try {
    const data = await marketingService.couponList({ status: couponTab.value, pageSize: 20 })
    coupons.value = data.list
  } finally {
    loading.value = false
  }
}

function couponValueText(c: MarketingCoupon) {
  if (c.type === 'fullReduce') return `满${c.threshold}减${c.amount}`
  if (c.type === 'discount') return `${(c.discountPercent ?? 0) / 10}折`
  if (c.type === 'fixed') return `${formatPrice(c.amount ?? 0)}券`
  return ''
}

function couponBigValue(c: MarketingCoupon) {
  if (c.type === 'fullReduce') return c.amount
  if (c.type === 'discount') return ((c.discountPercent ?? 0) / 10).toFixed(1)
  if (c.type === 'fixed') return c.amount
  return 0
}

function couponBigUnit(c: MarketingCoupon) {
  if (c.type === 'discount') return '折'
  return '元'
}

function createCoupon() {
  uni.showToast({ title: '创建优惠券', icon: 'none' })
}

function manageCoupon(c: MarketingCoupon) {
  uni.showActionSheet({
    itemList: ['编辑', '暂停', '复制', '删除'],
    success: (res) => {
      uni.showToast({ title: `${['编辑', '暂停', '复制', '删除'][res.tapIndex]} · ${c.name}`, icon: 'none' })
    },
  })
}

onMounted(() => {
  loadOverview()
  loadCoupons()
})
</script>

<template>
  <view class="page">
    <NavBar title="营销中心" right-text="数据" />

    <!-- 工具入口 -->
    <view class="tools">
      <view
        v-for="t in TOOLS"
        :key="t.key"
        class="tool-card"
        :style="{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}DD)` }"
      >
        <view class="tool-icon">
          <Icon :name="t.icon" :size="48" color="#fff" />
        </view>
        <view class="tool-info">
          <text class="tool-label">{{ t.label }}</text>
          <text class="tool-desc">{{ t.desc }}</text>
        </view>
        <view class="tool-count">
          <text class="count-value">{{ t.count() }}</text>
          <text class="count-label">进行中</text>
        </view>
      </view>
    </view>

    <!-- 概览四宫格 -->
    <view v-if="overview" class="stats">
      <view class="stat">
        <text class="stat-value">{{ overview.coupons.totalReceived }}</text>
        <text class="stat-label">优惠券领取</text>
      </view>
      <view class="stat">
        <text class="stat-value">{{ overview.coupons.totalUsed }}</text>
        <text class="stat-label">已使用</text>
      </view>
      <view class="stat">
        <text class="stat-value">{{ overview.flashSales.sold }}</text>
        <text class="stat-label">限时购销量</text>
      </view>
      <view class="stat">
        <text class="stat-value">{{ overview.groupBuys.totalGroups }}</text>
        <text class="stat-label">已成团</text>
      </view>
    </view>

    <!-- 优惠券列表 -->
    <Section title="我的优惠券" action="创建" @action="createCoupon">
      <template #default>
        <Tabs v-model="couponTab" :items="COUPON_TABS" variant="underline" @change="loadCoupons" />
        <view class="coupon-list">
          <view v-for="c in coupons" :key="c.id" :class="['coupon', `t-${c.status}`]" @click="manageCoupon(c)">
            <view class="cp-left">
              <view class="cp-amount">
                <text class="cp-num">{{ couponBigValue(c) }}</text>
                <text class="cp-unit">{{ couponBigUnit(c) }}</text>
              </view>
              <text class="cp-thresh">{{ c.threshold ? `满 ${c.threshold} 可用` : '无门槛' }}</text>
            </view>
            <view class="cp-divider">
              <view class="cp-dot" v-for="i in 6" :key="i"></view>
            </view>
            <view class="cp-right">
              <view class="cp-head">
                <text class="cp-name">{{ c.name }}</text>
                <StatusTag :text="STATUS_LABEL[c.status].text" :tone="STATUS_LABEL[c.status].tone" />
              </view>
              <text class="cp-type">{{ couponValueText(c) }}</text>
              <view class="cp-stats">
                <text>领 {{ c.received }} / {{ c.stock }}</text>
                <text>用 {{ c.used }}</text>
              </view>
              <text v-if="c.validFrom" class="cp-valid">{{ formatDate(c.validFrom) }} ~ {{ formatDate(c.validTo) }}</text>
            </view>
          </view>
          <EmptyState v-if="!loading && coupons.length === 0" title="暂无优惠券" desc="点击右上角创建" />
        </view>
      </template>
    </Section>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
}
.tools {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.tool-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.08);
  .tool-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    background: rgba(255,255,255,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .tool-label { font-size: 30rpx; font-weight: 700; }
    .tool-desc { font-size: 22rpx; opacity: 0.85; }
  }
  .tool-count {
    text-align: right;
    .count-value {
      display: block;
      font-size: 40rpx;
      font-weight: 700;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .count-label { font-size: 20rpx; opacity: 0.85; }
  }
}
.stats {
  margin: 0 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  box-shadow: var(--shadow-sm);
}
.stat {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .stat-value {
    font-size: 30rpx;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
  .stat-label {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-top: 16rpx;
}
.coupon {
  display: flex;
  align-items: stretch;
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  position: relative;
  &.t-ended {
    opacity: 0.55;
    filter: grayscale(0.3);
  }
}
.cp-left {
  width: 200rpx;
  background: linear-gradient(135deg, #FF4D2D, #FF7A45);
  color: #fff;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .cp-amount {
    display: flex;
    align-items: baseline;
    .cp-num {
      font-size: 56rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .cp-unit {
      font-size: 22rpx;
      margin-left: 4rpx;
    }
  }
  .cp-thresh { font-size: 18rpx; opacity: 0.9; }
}
.cp-divider {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 8rpx 0;
  background: var(--bg-card);
  position: relative;
  &::before, &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    background: var(--bg-page);
  }
  &::before { top: -12rpx; }
  &::after { bottom: -12rpx; }
  .cp-dot {
    width: 4rpx;
    height: 4rpx;
    border-radius: 50%;
    background: var(--border-default);
    margin: 4rpx 8rpx;
  }
}
.cp-right {
  flex: 1;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .cp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8rpx;
    .cp-name {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .cp-type {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
  }
  .cp-stats {
    display: flex;
    gap: 16rpx;
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .cp-valid {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.safe-bottom { height: 40rpx; }
</style>
