<script setup lang="ts">
/**
 * 店铺价格显示规则（店铺级 · 改一次全店生效）
 *
 * 与 admin-pc 的 useShopPriceVisibility 共用 localStorage key：
 *   jj_shop_price_visibility_v1
 *
 * 因为 admin-pc / merchant-app H5 / user-mp H5 都跑在同一 origin
 * (http://43.251.227.174:8083)，localStorage 自动共享。
 *
 * 改在这里设的规则 → user-mp 商品详情页立刻按身份显示对应价格。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import { profileService } from '../../services/profile'

const STORAGE_KEY = 'jj_shop_price_visibility_v1'

interface ShopPriceRule {
  guestAllow: boolean
  customerPrice: 'retail' | 'hidden'
  agencyPrice: 'wholesale' | 'retail'
  memberPrice: 'member' | 'retail'
}

const DEFAULT: ShopPriceRule = {
  guestAllow: false,
  customerPrice: 'retail',
  agencyPrice: 'wholesale',
  memberPrice: 'member',
}

const rule = ref<ShopPriceRule>({ ...DEFAULT })

function readLocalStorage(): ShopPriceRule {
  // H5 端走真 localStorage（跨 sub-app 共享）；小程序端 fallback uni storage
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULT, ...JSON.parse(raw) }
    }
  } catch {
    /* noop */
  }
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return { ...DEFAULT, ...(typeof raw === 'string' ? JSON.parse(raw) : raw) }
  } catch {
    /* noop */
  }
  return { ...DEFAULT }
}

function writeLocalStorage(v: ShopPriceRule) {
  const json = JSON.stringify(v)
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, json)
  } catch {
    /* noop */
  }
  try {
    uni.setStorageSync(STORAGE_KEY, json)
  } catch {
    /* noop */
  }
}

async function load() {
  // 先用本地缓存秒级渲染
  rule.value = readLocalStorage()
  // 然后向后端 GET 拉取（覆盖）
  try {
    const data = await profileService.getPriceRule()
    if (data) {
      rule.value = { ...DEFAULT, ...data }
      writeLocalStorage(rule.value)
    }
  } catch {
    // 后端不可达：保持本地缓存
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
function debouncedPush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    profileService.setPriceRule(rule.value).catch((e: any) => {
      console.warn('[price-rule] push to backend failed:', e?.message || e)
    })
  }, 250)
}

function persistAndToast(tierName: string) {
  writeLocalStorage(rule.value)
  debouncedPush()
  uni.showToast({ title: `${tierName} · 已保存`, icon: 'success' })
}

function resetDefault() {
  uni.showModal({
    title: '恢复默认规则',
    content:
      '将所有规则改回默认：访客禁止 / 普通客户看零售价 / 授权门店看批发价 / 会员看会员价',
    success: (r) => {
      if (r.confirm) {
        rule.value = { ...DEFAULT }
        writeLocalStorage(rule.value)
        debouncedPush()
        uni.showToast({ title: '已恢复默认', icon: 'success' })
      }
    },
  })
}

const summary = computed(() => [
  rule.value.guestAllow ? '访客 允许浏览' : '访客 禁止进入',
  `普通客户 · ${rule.value.customerPrice === 'retail' ? '零售价' : '不显示价格'}`,
  `授权门店 · ${rule.value.agencyPrice === 'wholesale' ? '批发价' : '零售价'}`,
  `会员客户 · ${rule.value.memberPrice === 'member' ? '会员价' : '零售价'}`,
])

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <NavBar title="价格显示规则" />

    <!-- 顶部说明卡 -->
    <view class="hero">
      <view class="hero-inner">
        <view class="hero-icon">
          <Icon name="tag" :size="44" color="#fff" />
        </view>
        <view class="hero-text">
          <view class="hero-title">
            价格显示规则
            <text class="hero-pill">核心</text>
          </view>
          <text class="hero-sub">
            按对方身份显示对应价格。决定客户能否看到价格、能看到什么价。
            改一次，<text class="hero-em">全店所有商品立即生效</text>。
          </text>
        </view>
      </view>
      <view class="hero-summary">
        <text v-for="s in summary" :key="s" class="hero-pill-soft">{{ s }}</text>
      </view>
    </view>

    <!-- 规则列表 -->
    <view class="card">
      <!-- 未登录访客 -->
      <view class="rule-row">
        <view class="rule-icon" style="background: rgba(156, 163, 175, 0.12); color: #9ca3af">
          <Icon name="user-line" :size="32" color="#9ca3af" />
        </view>
        <view class="rule-main">
          <text class="rule-label">未登录访客</text>
          <text class="rule-hint">未授权小程序的访客</text>
        </view>
        <switch
          :checked="rule.guestAllow"
          color="#FF4D2D"
          @change="(e: any) => { rule.guestAllow = e.detail.value; persistAndToast('未登录访客') }"
        />
      </view>

      <!-- 普通客户 -->
      <view class="rule-row">
        <view class="rule-icon" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6">
          <Icon name="biz-me" :size="32" color="#3b82f6" />
        </view>
        <view class="rule-main">
          <text class="rule-label">普通客户</text>
          <text class="rule-hint">已登录但未授权门店</text>
        </view>
        <view class="rule-pills">
          <view
            class="pill"
            :class="{ active: rule.customerPrice === 'retail' }"
            @click="() => { rule.customerPrice = 'retail'; persistAndToast('普通客户') }"
          >
            显示零售价
          </view>
          <view
            class="pill"
            :class="{ active: rule.customerPrice === 'hidden' }"
            @click="() => { rule.customerPrice = 'hidden'; persistAndToast('普通客户') }"
          >
            不显示价格
          </view>
        </view>
      </view>

      <!-- 授权门店 -->
      <view class="rule-row">
        <view class="rule-icon" style="background: rgba(255, 77, 45, 0.12); color: #ff4d2d">
          <Icon name="home-shop" :size="32" color="#ff4d2d" />
        </view>
        <view class="rule-main">
          <text class="rule-label">授权门店</text>
          <text class="rule-hint">已申请代理 / 加盟门店</text>
        </view>
        <view class="rule-pills">
          <view
            class="pill"
            :class="{ active: rule.agencyPrice === 'wholesale' }"
            @click="() => { rule.agencyPrice = 'wholesale'; persistAndToast('授权门店') }"
          >
            批发价
          </view>
          <view
            class="pill"
            :class="{ active: rule.agencyPrice === 'retail' }"
            @click="() => { rule.agencyPrice = 'retail'; persistAndToast('授权门店') }"
          >
            零售价
          </view>
        </view>
      </view>

      <!-- 会员客户 -->
      <view class="rule-row">
        <view class="rule-icon" style="background: rgba(168, 85, 247, 0.12); color: #a855f7">
          <Icon name="crown" :size="32" color="#a855f7" />
        </view>
        <view class="rule-main">
          <text class="rule-label">会员客户</text>
          <text class="rule-hint">付费 / 邀请制会员</text>
        </view>
        <view class="rule-pills">
          <view
            class="pill"
            :class="{ active: rule.memberPrice === 'member' }"
            @click="() => { rule.memberPrice = 'member'; persistAndToast('会员客户') }"
          >
            会员价
          </view>
          <view
            class="pill"
            :class="{ active: rule.memberPrice === 'retail' }"
            @click="() => { rule.memberPrice = 'retail'; persistAndToast('会员客户') }"
          >
            零售价
          </view>
        </view>
      </view>
    </view>

    <view class="reset-row" @click="resetDefault">
      <Icon name="refresh" :size="28" color="#909399" />
      <text>恢复默认规则</text>
    </view>

    <view style="height: 80rpx" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page, #f7f8fa);
}

.hero {
  margin: 16rpx 24rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #fff8f5 0%, #fffbf3 100%);
  border: 1rpx solid #fde6df;
}

.hero-inner {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.hero-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.3);
}

.hero-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hero-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.hero-pill {
  padding: 4rpx 14rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 999rpx;
  letter-spacing: 1rpx;
}

.hero-sub {
  font-size: 24rpx;
  color: #606266;
  line-height: 1.6;
}

.hero-em {
  color: #ff4d2d;
  font-weight: 700;
}

.hero-summary {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.hero-pill-soft {
  padding: 6rpx 16rpx;
  background: rgba(255, 77, 45, 0.08);
  color: #ff4d2d;
  font-size: 22rpx;
  border-radius: 999rpx;
  font-weight: 500;
}

.card {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm, 0 2rpx 8rpx rgba(0, 0, 0, 0.04));
  overflow: hidden;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f5f6f8;

  &:last-child {
    border-bottom: none;
  }
}

.rule-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rule-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.rule-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.rule-hint {
  font-size: 22rpx;
  color: #909399;
}

.rule-pills {
  display: flex;
  gap: 4rpx;
  background: #f5f6f8;
  padding: 4rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.pill {
  padding: 10rpx 20rpx;
  font-size: 22rpx;
  color: #606266;
  border-radius: 999rpx;
  transition: all 0.18s ease;

  &.active {
    background: linear-gradient(135deg, #ff4d2d, #ff7a45);
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}

.reset-row {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  color: #909399;
  box-shadow: var(--shadow-sm, 0 2rpx 8rpx rgba(0, 0, 0, 0.04));

  &:active {
    background: #fafbfc;
  }
}
</style>
