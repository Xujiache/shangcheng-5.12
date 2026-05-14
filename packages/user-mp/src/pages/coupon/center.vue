<script setup lang="ts">
/**
 * UM-领券 · 领券中心
 *
 * 入口：我的页"领券中心" / 频道页"领券"按钮
 *
 * - 调 couponService.list() 拉可领取的优惠券列表（与下单页同一数据源）
 * - 卡片：券面值 + 满减门槛 + 有效期 + 状态标签
 * - "立即领取"按钮调 couponService.claim(id)
 *   - 后端 200 → 把该券标记为"已领取"
 *   - 后端 4xx 携带"已领/重复"文案 → 当作幂等成功（仅 toast 提示）
 *   - 后端 404 / 500 → 兜底 toast，按钮恢复可点
 * - 已领取的券在本会话保留"已领取"视觉，避免重复点击
 *
 * 库存语义（与后端一致，必须严格遵守）：
 *   `stock === 0` 表示「不限量发放」，不应展示「已领完」；
 *   只有 `stock > 0 && received >= stock` 才是真已领完。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { couponService } from '../../services'
import type { Coupon } from '../../services'
import { useUserStore } from '../../store/user'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'
import { safeSwitchTab } from '../../utils/tab-nav'

const userStore = useUserStore()

const coupons = ref<Coupon[]>([])
const loading = ref(false)
const claiming = ref<Record<string, boolean>>({})
const claimedIds = ref<Set<string>>(new Set())

async function load() {
  loading.value = true
  try {
    const res = await couponService.list()
    coupons.value = res.list ?? []
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goHome() {
  safeSwitchTab('/pages/tabbar/home/index')
}

async function claim(c: Coupon) {
  if (!userStore.isLogin) {
    goLogin()
    return
  }
  if (claimedIds.value.has(c.id)) {
    uni.showToast({ title: '已领过该券', icon: 'none' })
    return
  }
  if (claiming.value[c.id]) return
  claiming.value[c.id] = true
  try {
    await couponService.claim(c.id)
    claimedIds.value.add(c.id)
    uni.showToast({ title: `领取成功「${c.name}」`, icon: 'success', duration: 1500 })
  } catch (e: any) {
    const msg = e?.message || '领取失败'
    // 后端「重复领取/超过限额」走 4xx 异常通道，前端按文案幂等吸收
    if (/already|重复|已领|限额|领取过/.test(msg)) {
      claimedIds.value.add(c.id)
      uni.showToast({ title: '该券已经领取过', icon: 'none' })
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    claiming.value[c.id] = false
  }
}

function couponAmountText(c: Coupon): string {
  if (c.type === 'discount' && c.discountPercent != null) {
    // discountPercent 0~1 区间小数（0.85 = 85 折），统一展示为 "8.5 折"
    return `${(c.discountPercent * 10).toFixed(1)}折`
  }
  return `¥${c.amount ?? 0}`
}
function couponAmountUnit(c: Coupon): string {
  return c.type === 'discount' ? '' : '元'
}
function couponThresholdText(c: Coupon): string {
  if (c.threshold && c.threshold > 0) return `满 ${c.threshold} 可用`
  return '无门槛'
}

/** 是否已被领完：stock=0 表示不限量，绝不展示「已领完」 */
function isSoldOut(c: Coupon): boolean {
  return (c.stock ?? 0) > 0 && (c.received ?? 0) >= (c.stock ?? 0)
}

function couponStatusText(c: Coupon): string {
  if (claimedIds.value.has(c.id)) return '已领取'
  if (isSoldOut(c)) return '已领完'
  return '立即领取'
}

const stockTip = computed(() =>
  coupons.value.length > 0 ? `${coupons.value.length} 张可领` : '暂无可领券',
)

function formatDateRange(c: Coupon): string {
  const from = (c.validFrom || '').slice(0, 10).replace(/-/g, '/')
  const to = (c.validTo || '').slice(0, 10).replace(/-/g, '/')
  if (!from && !to) return '长期有效'
  return `${from} ~ ${to}`
}

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <NavBar title="领券中心" />

    <view class="hero">
      <view class="hero-bg" />
      <view class="hero-info">
        <text class="hero-label">优惠不停 · 下单更省</text>
        <text class="hero-title">领券中心</text>
        <text class="hero-sub">{{ stockTip }}</text>
      </view>
      <Icon name="discount" :size="96" color="rgba(255,255,255,0.85)" />
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="!userStore.isLogin" class="login-hint" @click="goLogin">
        <Icon name="lock" :size="32" color="var(--brand-primary)" />
        <text>登录后才能领取，前往登录 ›</text>
      </view>

      <view v-if="coupons.length > 0" class="coupon-list">
        <view
          v-for="c in coupons"
          :key="c.id"
          :class="['coupon', claimedIds.has(c.id) ? 'claimed' : '']"
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
            </view>
            <view
              :class="[
                'claim-btn',
                claimedIds.has(c.id) ? 'done' : '',
                isSoldOut(c) ? 'out' : '',
              ]"
              @click="claim(c)"
            >
              <text v-if="claiming[c.id]">领取中…</text>
              <text v-else>{{ couponStatusText(c) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-wrap">
        <EmptyState title="暂无可领券" desc="活动结束或券已被领完，去首页逛逛吧" icon="discount" />
        <view class="empty-btn" @click="goHome">去首页</view>
      </view>

      <view class="rules">
        <text class="rules-title">规则说明</text>
        <text class="rules-line">· 单笔订单同类型券只能使用一张</text>
        <text class="rules-line">· 券面金额不可兑换现金</text>
        <text class="rules-line">· 售后退款后券按规则返还或失效</text>
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

/* Hero */
.hero {
  margin: 16rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  border-radius: 24rpx;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 16rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  .hero-bg {
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 220rpx;
    height: 220rpx;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 50%;
  }
  .hero-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    z-index: 1;
    .hero-label {
      font-size: 22rpx;
      opacity: 0.9;
    }
    .hero-title {
      font-size: 40rpx;
      font-weight: 800;
      letter-spacing: 1rpx;
    }
    .hero-sub {
      font-size: 22rpx;
      opacity: 0.85;
    }
  }
}

.login-hint {
  margin: 16rpx 24rpx 0;
  padding: 20rpx;
  background: rgba(255, 77, 45, 0.06);
  border: 1rpx dashed var(--brand-primary);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  color: var(--brand-primary);
  font-weight: 600;
}

/* 列表 */
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
  &.claimed {
    opacity: 0.7;
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
    gap: 8rpx;
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
  }
}
.claim-btn {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  min-width: 120rpx;
  text-align: center;
  &.done {
    background: var(--bg-page);
    color: var(--text-tertiary);
    border: 1rpx solid var(--border-default);
    box-shadow: none;
  }
  &.out {
    background: var(--bg-hover);
    color: var(--text-tertiary);
    box-shadow: none;
  }
}

.empty-wrap {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
}

.rules {
  margin: 32rpx 24rpx 0;
  padding: 20rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .rules-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4rpx;
  }
  .rules-line {
    font-size: 22rpx;
    color: var(--text-tertiary);
    line-height: 1.6;
  }
}
</style>
