<script setup lang="ts">
/**
 * UM-我的优惠券
 *
 * 入口：我的 → "我的优惠券"
 * 接口：GET /api/v1/u/my-coupons
 *
 * Tab 三态：未使用 / 已使用 / 已过期
 *   - 未使用：可用倒计时 + "去使用"跳商品列表
 *   - 已使用：灰底显示使用时间
 *   - 已过期：灰底显示过期时间
 *
 * 与领券中心(/pages/coupon/center)的差异：
 *   center 是"可领取的券池"，my 是"我已经领到手的券记录"。
 *   不要在 my 页面再放领取按钮——领取统一去 center。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { couponService } from '../../services'
import type { MyCoupon } from '../../services'
import { useUserStore } from '../../store/user'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import { safeSwitchTab } from '../../utils/tab-nav'

type TabKey = 'unused' | 'used' | 'expired'

const userStore = useUserStore()
const tab = ref<TabKey>('unused')
const loading = ref(false)
const coupons = ref<MyCoupon[]>([])

const TABS: { key: TabKey; label: string }[] = [
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
]

const filteredCoupons = computed(() => coupons.value.filter((c) => c.status === tab.value))

async function load() {
  if (!userStore.isLogin) {
    coupons.value = []
    return
  }
  loading.value = true
  try {
    const list = await couponService.my()
    coupons.value = Array.isArray(list) ? list : []
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(k: TabKey) {
  if (tab.value === k) return
  tab.value = k
}

function couponAmountText(c: MyCoupon): string {
  if (c.type === 'discount' && c.discountPercent != null) {
    return `${(c.discountPercent * 10).toFixed(1)}折`
  }
  return `¥${c.amount ?? 0}`
}
function couponAmountUnit(c: MyCoupon): string {
  return c.type === 'discount' ? '' : '元'
}
function couponThresholdText(c: MyCoupon): string {
  if (c.threshold && c.threshold > 0) return `满 ${c.threshold} 可用`
  return '无门槛'
}
function formatDateRange(c: MyCoupon): string {
  const from = (c.validFrom || '').slice(0, 10).replace(/-/g, '/')
  const to = (c.validTo || '').slice(0, 10).replace(/-/g, '/')
  if (!from && !to) return '长期有效'
  return `${from} ~ ${to}`
}
function formatUsedAt(c: MyCoupon): string {
  if (!c.usedAt) return ''
  const d = (c.usedAt || '').slice(0, 16).replace('T', ' ')
  return d
}

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}
function goShop() {
  safeSwitchTab('/pages/tabbar/home/index')
}
function goCenter() {
  uni.navigateTo({ url: '/pages/coupon/center' })
}

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <NavBar title="我的优惠券" />

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="switchTab(t.key)"
      >
        <text class="tab-label">{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="!userStore.isLogin" class="login-hint" @click="goLogin">
        <text>登录后查看我的优惠券 ›</text>
      </view>

      <view v-else-if="filteredCoupons.length > 0" class="coupon-list">
        <view
          v-for="c in filteredCoupons"
          :key="c.no"
          :class="['coupon', c.status !== 'unused' ? 'dim' : '']"
        >
          <view class="left">
            <text class="amount">{{ couponAmountText(c) }}</text>
            <text v-if="couponAmountUnit(c)" class="unit">{{ couponAmountUnit(c) }}</text>
            <text class="thresh">{{ couponThresholdText(c) }}</text>
          </view>
          <view class="dashed" />
          <view class="right">
            <view class="meta">
              <text class="name">{{ c.name }}</text>
              <text class="time">{{ formatDateRange(c) }}</text>
              <text v-if="c.status === 'used'" class="sub">已使用 {{ formatUsedAt(c) }}</text>
              <text v-else-if="c.status === 'expired'" class="sub">已过期</text>
            </view>
            <view v-if="c.status === 'unused'" class="use-btn" @click="goShop">去使用</view>
            <view v-else class="stamp">{{
              c.status === 'used' ? '已使用' : '已过期'
            }}</view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-wrap">
        <EmptyState
          :title="tab === 'unused' ? '暂无可用优惠券' : tab === 'used' ? '没有使用记录' : '暂无过期券'"
          :desc="tab === 'unused' ? '先去领券中心领几张吧' : ''"
          icon="discount"
        />
        <view v-if="tab === 'unused'" class="empty-btn" @click="goCenter">领券中心</view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}
.scroll {
  flex: 1;
  height: 0;
}
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40rpx;
    height: 6rpx;
    background: $brand-gradient;
    border-radius: 6rpx 6rpx 0 0;
  }
}

.login-hint {
  margin: 24rpx;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  text-align: center;
  color: var(--brand-primary);
  font-size: 26rpx;
}

.coupon-list {
  padding: 16rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.coupon {
  display: flex;
  align-items: stretch;
  height: 200rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
  position: relative;
  &.dim {
    opacity: 0.6;
  }
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 220rpx;
    width: 24rpx;
    height: 24rpx;
    background: var(--bg-page);
    border-radius: 50%;
    z-index: 2;
  }
  &::before {
    top: -12rpx;
  }
  &::after {
    bottom: -12rpx;
  }
}
.left {
  width: 220rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx;
  gap: 4rpx;
  .amount {
    font-size: 60rpx;
    font-weight: 800;
    line-height: 1;
    font-family: $font-family-base;
  }
  .unit {
    font-size: 22rpx;
    margin-top: -6rpx;
    opacity: 0.9;
  }
  .thresh {
    margin-top: 8rpx;
    padding: 4rpx 14rpx;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
  }
}
.dashed {
  width: 1rpx;
  background-image: linear-gradient(
    180deg,
    transparent 0%,
    transparent 50%,
    var(--border-default) 50%,
    var(--border-default) 100%
  );
  background-size: 1rpx 14rpx;
}
.right {
  flex: 1;
  padding: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  .meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    .name {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .time {
      font-size: 20rpx;
      color: var(--text-tertiary);
      font-family: $font-family-base;
    }
    .sub {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
}
.use-btn {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
}
.stamp {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  background: var(--bg-page);
  color: var(--text-tertiary);
  border-radius: 999rpx;
  font-size: 20rpx;
}

.empty-wrap {
  padding: 60rpx 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.empty-btn {
  margin-top: 8rpx;
  padding: 14rpx 40rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
