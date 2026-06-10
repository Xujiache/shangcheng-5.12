<script setup lang="ts">
/**
 * MA-04 · 会员套餐开通（v2 · 真实下单 + 剩余天数 + 当前订阅）
 *
 * - 顶部展示当前订阅状态（剩余天数 / 进度条 / 即将过期警告）
 * - 月费/年费切换 + 权益对比
 * - 真实支付：POST /api/v1/m/membership/subscribe
 */
import { ref, computed, onMounted } from 'vue'
import { memberService, type MembershipView } from '../../services/member'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import type { MemberPlan } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'

const plans = ref<MemberPlan[]>([])
const currentMembership = ref<MembershipView | null>(null)
const loading = ref(true)
const subscribing = ref(false)
const selectedCode = ref<'monthly' | 'yearly'>('yearly')

/** 支付状态轮询配置：30s 总时长，1.5s 间隔（约 20 次） */
const PAY_POLL_TOTAL_MS = 30 * 1000
const PAY_POLL_INTERVAL_MS = 1500

/** 最近一次发起的支付单号，用于超时后用户主动「刷新状态」 */
const pendingPaymentNo = ref<string>('')
const pendingActionLabel = ref<string>('开通')
const showRefreshBtn = ref(false)

const basicPlans = computed(() => plans.value.filter((p) => p.type === 'basic'))
const adPlans = computed(() => plans.value.filter((p) => p.type === 'ad'))
const addonPlans = computed(() => plans.value.filter((p) => p.type === 'addon'))

const selected = computed(() => basicPlans.value.find((p) => p.code === selectedCode.value))

const ALL_RIGHTS = [
  { key: 'product', label: '商品管理 / 上架', monthly: true, yearly: true },
  { key: 'store', label: '门店申请授权', monthly: true, yearly: true },
  { key: 'staff', label: '销售员授权', monthly: true, yearly: true },
  { key: 'customer', label: '客户授权 / 价格分级', monthly: true, yearly: true },
  { key: 'export', label: '数据导出', monthly: false, yearly: true },
  { key: 'marketing', label: '营销中心', monthly: false, yearly: true },
  { key: 'service', label: '专属客服', monthly: false, yearly: true },
  { key: 'priority', label: '审核优先级', monthly: false, yearly: true },
]

async function load() {
  loading.value = true
  try {
    const [planList, membership] = await Promise.all([
      memberService.getPlans(),
      memberService.myMembership().catch(() => null),
    ])
    plans.value = planList
    currentMembership.value = membership
  } finally {
    loading.value = false
  }
}

function pickPlan(code: 'monthly' | 'yearly') {
  selectedCode.value = code
}

/**
 * 真实下单 + 调起微信支付 + 回调激活
 *
 * 流程：
 *   1. 后端 subscribe() 创建 PaymentRecord(pending) + 返回 miniPay 参数
 *   2. 前端 uni.requestPayment(miniPay) 调起微信支付
 *   3. 微信回调 /payments/wechat/notify → 后端 activateMembership(recordId)
 *   4. 前端轮询 paymentStatus 直到 status='paid' 才算成功
 */
/**
 * 轮询支付状态：默认 30 秒（PAY_POLL_TOTAL_MS），1.5 秒/次（PAY_POLL_INTERVAL_MS），约 20 次。
 *
 * 返回：
 *   - 'paid'    支付成功
 *   - 'failed'  支付失败 / 已退款（终态）
 *   - 'timeout' 轮询窗口耗尽仍未到终态
 */
async function pollPaymentStatus(
  paymentNo: string,
  totalMs = PAY_POLL_TOTAL_MS,
  intervalMs = PAY_POLL_INTERVAL_MS,
): Promise<'paid' | 'failed' | 'timeout'> {
  const t0 = Date.now()
  while (Date.now() - t0 < totalMs) {
    try {
      const st = await memberService.paymentStatus(paymentNo)
      if (st.status === 'paid') return 'paid'
      if (st.status === 'failed' || st.status === 'refunded') return 'failed'
    } catch {
      /* 单次失败忽略，下次再试 */
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return 'timeout'
}

/**
 * 用户主动「刷新状态」：再走一遍轮询窗口（30s）
 *
 * 仅当上次支付走到了 timeout 才会显示该入口（showRefreshBtn=true）
 */
async function refreshPayStatus() {
  if (!pendingPaymentNo.value || subscribing.value) return
  subscribing.value = true
  uni.showLoading({ title: '查询支付状态…', mask: true })
  try {
    const result = await pollPaymentStatus(pendingPaymentNo.value)
    uni.hideLoading()
    if (result === 'paid') {
      uni.showToast({ title: pendingActionLabel.value + '成功', icon: 'success' })
      showRefreshBtn.value = false
      pendingPaymentNo.value = ''
      await load()
    } else if (result === 'failed') {
      uni.showToast({ title: '支付未成功，请重试', icon: 'none' })
      showRefreshBtn.value = false
      pendingPaymentNo.value = ''
    } else {
      uni.showToast({
        title: '仍未确认到账，请稍后再试或联系客服',
        icon: 'none',
        duration: 2500,
      })
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '查询失败', icon: 'none' })
  } finally {
    subscribing.value = false
  }
}

async function doRealPay(plan: MemberPlan, actionLabel: string) {
  if (subscribing.value) return
  subscribing.value = true
  uni.showLoading({ title: '调起支付…', mask: true })

  try {
    const res = await memberService.subscribe(plan.id, 'wechat')
    uni.hideLoading()

    if (!res.ok) {
      uni.showToast({ title: actionLabel + '失败，请稍后重试', icon: 'none' })
      return
    }

    // 真实链路：调起微信支付
    if (!res.miniPay) {
      uni.showToast({ title: '支付参数缺失', icon: 'none' })
      return
    }

    const mp = res.miniPay
    await new Promise<void>((resolve, reject) => {
      // @ts-ignore — uni 平台 API
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: mp.timeStamp,
        nonceStr: mp.nonceStr,
        package: mp.package,
        signType: mp.signType || 'RSA',
        paySign: mp.paySign,
        success: () => resolve(),
        fail: (err: any) => reject(err),
      })
    })

    // 微信成功回调只是说明用户点了"已支付"，是否真正到账要靠后端微信回调
    // 30 秒轮询窗口（1.5s 一次，约 20 次）—— 超时给"刷新状态"按钮，用户可主动再查一轮
    pendingPaymentNo.value = res.paymentNo
    pendingActionLabel.value = actionLabel
    showRefreshBtn.value = false
    uni.showLoading({ title: '确认支付状态…', mask: true })
    const result = await pollPaymentStatus(res.paymentNo)
    uni.hideLoading()

    if (result === 'paid') {
      uni.showToast({ title: actionLabel + '成功', icon: 'success' })
      pendingPaymentNo.value = ''
      showRefreshBtn.value = false
    } else if (result === 'failed') {
      uni.showToast({ title: '支付未成功，请重试', icon: 'none' })
      pendingPaymentNo.value = ''
      showRefreshBtn.value = false
    } else {
      uni.showToast({
        title: '支付已发起，请稍后点击"刷新状态"查看',
        icon: 'none',
        duration: 2500,
      })
      showRefreshBtn.value = true
    }
    await load()
  } catch (e: any) {
    uni.hideLoading()
    const msg = e?.errMsg?.includes('cancel') ? '已取消支付' : e?.message || '支付失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    subscribing.value = false
  }
}

async function subscribe() {
  if (!selected.value || subscribing.value) return
  const plan = selected.value
  uni.showModal({
    title: '确认开通',
    content: `开通${plan.name}，应付 ${formatPrice(plan.price)}`,
    confirmText: '立即支付',
    success: (r) => {
      if (r.confirm) void doRealPay(plan, '开通')
    },
  })
}

async function buyAddon(p: MemberPlan) {
  if (subscribing.value) return
  uni.showModal({
    title: '购买增值',
    content: `购买「${p.name}」\n应付 ${formatPrice(p.price)}`,
    confirmText: '立即支付',
    success: (r) => {
      if (r.confirm) void doRealPay(p, '购买')
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="开通会员" :bg="'transparent'" class="nav-on-dark" />

    <view class="header">
      <text class="hero-title">解锁全部经营能力</text>
      <text class="hero-sub">商品 · 客户 · 门店 · 数据 · 营销 一站式管理</text>
    </view>

    <view class="body">
      <!-- 当前订阅状态卡 -->
      <view
        v-if="currentMembership"
        :class="['membership-card', currentMembership.expiringSoon && 'warning']"
      >
        <view class="mc-head">
          <view class="mc-tag">
            <text>{{ currentMembership.status === 'trial' ? '试用中' : '已开通' }}</text>
          </view>
          <text class="mc-name">{{ currentMembership.plan?.name || '会员套餐' }}</text>
        </view>
        <view class="mc-days">
          <text class="mc-num">{{ Math.max(0, currentMembership.remainingDays) }}</text>
          <text class="mc-unit">天</text>
          <text class="mc-label">剩余</text>
        </view>
        <view class="mc-progress">
          <view class="mc-bar" :style="{ width: currentMembership.usedPercent + '%' }" />
        </view>
        <view class="mc-meta">
          <text>开始 {{ formatDate(currentMembership.startAt) }}</text>
          <text>到期 {{ formatDate(currentMembership.endAt) }}</text>
        </view>
        <view v-if="currentMembership.expiringSoon" class="mc-warning">
          ⚠️ 即将到期，请尽快续费以免影响经营
        </view>
      </view>

      <!-- 支付状态轮询超时 → 让用户主动再查一轮 -->
      <view v-if="showRefreshBtn" class="pay-refresh">
        <text class="pay-refresh-tip">支付已发起但暂未确认到账</text>
        <view class="pay-refresh-btn" @click="refreshPayStatus">刷新状态</view>
      </view>
      <!-- 基础套餐：月费 / 年费 -->
      <view class="plans">
        <view
          v-for="p in basicPlans"
          :key="p.id"
          :class="['plan-card', { active: selectedCode === p.code, hot: p.hot }]"
          @click="pickPlan(p.code as 'monthly' | 'yearly')"
        >
          <view v-if="p.hot" class="hot-badge">最划算</view>
          <view class="plan-head">
            <text class="plan-name">{{ p.name }}</text>
            <text v-if="p.originalPrice" class="plan-original">¥{{ p.originalPrice }}</text>
          </view>
          <view class="plan-price">
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ p.price }}</text>
            <text class="price-unit">/{{ p.period === 'monthly' ? '月' : '年' }}</text>
          </view>
          <text class="plan-tip">{{
            p.code === 'yearly' ? '日均不到 2.5 元' : '7 天无理由可退'
          }}</text>
          <view class="radio">
            <text>{{ selectedCode === p.code ? '●' : '○' }}</text>
          </view>
        </view>
      </view>

      <!-- 权益对比 -->
      <view class="section">
        <text class="section-title">权益对比</text>
        <view class="compare-table">
          <view class="compare-row compare-head">
            <text class="col-name">权益</text>
            <text class="col-cell">月费</text>
            <text class="col-cell highlight">年费</text>
          </view>
          <view v-for="r in ALL_RIGHTS" :key="r.key" class="compare-row">
            <text class="col-name">{{ r.label }}</text>
            <text class="col-cell">{{ r.monthly ? '✓' : '—' }}</text>
            <text class="col-cell highlight">{{ r.yearly ? '✓' : '—' }}</text>
          </view>
        </view>
      </view>

      <!-- 推广套餐 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">广告推广套餐</text>
          <text class="section-sub">选品广场曝光提升 · 与基础会员独立计费</text>
        </view>
        <view class="ad-grid">
          <view
            v-for="p in adPlans"
            :key="p.id"
            :class="['ad-card', { hot: p.hot }]"
            @click="buyAddon(p)"
          >
            <view v-if="p.hot" class="ad-hot">HOT</view>
            <text class="ad-name">{{ p.name }}</text>
            <view class="ad-price">
              <text class="ad-symbol">¥</text>
              <text class="ad-value">{{ p.price }}</text>
              <text class="ad-unit">/{{ p.period === 'monthly' ? '月' : '年' }}</text>
            </view>
            <view class="ad-rights">
              <text v-for="(r, i) in p.rights" :key="i" class="ad-right">• {{ r }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 增值单项 -->
      <view class="section">
        <text class="section-title">增值单项</text>
        <view class="addon-list">
          <view v-for="p in addonPlans" :key="p.id" class="addon-row" @click="buyAddon(p)">
            <view class="addon-info">
              <text class="addon-name">{{ p.name }}</text>
              <text class="addon-desc">{{ p.rights[0] }}</text>
            </view>
            <view class="addon-action">
              <text class="addon-price">{{ formatPrice(p.price) }}</text>
              <StatusTag text="购买" tone="primary" fill />
            </view>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </view>

    <!-- 底部 CTA -->
    <view class="footer" v-if="selected">
      <view class="footer-meta">
        <text class="f-price">{{ formatPrice(selected.price) }}</text>
        <text class="f-unit">/{{ selected.period === 'monthly' ? '月' : '年' }}</text>
        <text v-if="selected.originalPrice" class="f-original"
          >原价 ¥{{ selected.originalPrice }}</text
        >
      </view>
      <view class="footer-btn" @click="subscribe">
        <text>立即开通</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 160rpx;
}
.nav-on-dark :deep(.title),
.nav-on-dark :deep(.back-icon) {
  color: #ffd89b !important;
}
.nav-on-dark {
  border-bottom: none !important;
}
.header {
  padding: 32rpx 32rpx 80rpx;
  background: linear-gradient(135deg, #5c2a00, #2a1100);
  color: #ffd89b;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .hero-title {
    font-size: 40rpx;
    font-weight: 700;
  }
  .hero-sub {
    font-size: 24rpx;
    opacity: 0.85;
  }
}
.body {
  margin-top: -48rpx;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 当前订阅状态卡 */
.membership-card {
  background: linear-gradient(135deg, #fffceb, #fff7dd);
  border: 2rpx solid rgba(255, 195, 0, 0.35);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 153, 0, 0.1);
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    inset: -40rpx -40rpx auto auto;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(255, 195, 0, 0.18), transparent 70%);
  }
  &.warning {
    background: linear-gradient(135deg, #fff1ec, #ffe4d9);
    border-color: rgba(255, 77, 45, 0.4);
  }
}
.mc-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  position: relative;
  z-index: 1;
}
.mc-tag {
  padding: 4rpx 14rpx;
  background: linear-gradient(135deg, #ffb300, #ff6b45);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 999rpx;
}
.mc-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #4a2200;
}
.mc-days {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  position: relative;
  z-index: 1;
  .mc-num {
    font-size: 72rpx;
    font-weight: 800;
    color: #c2410c;
    line-height: 1;
    font-family: var(--font-family-base);
  }
  .mc-unit {
    font-size: 28rpx;
    font-weight: 700;
    color: #c2410c;
  }
  .mc-label {
    margin-left: 12rpx;
    font-size: 22rpx;
    color: #8c6500;
  }
}
.mc-progress {
  margin-top: 16rpx;
  height: 10rpx;
  background: rgba(255, 195, 0, 0.18);
  border-radius: 999rpx;
  overflow: hidden;
  position: relative;
  z-index: 1;
  .mc-bar {
    height: 100%;
    background: linear-gradient(90deg, #ffb300, #ff6b45);
    border-radius: 999rpx;
    transition: width 0.3s ease;
  }
}
.mc-meta {
  margin-top: 12rpx;
  display: flex;
  justify-content: space-between;
  font-size: 20rpx;
  color: #8c6500;
  font-family: var(--font-family-base);
  position: relative;
  z-index: 1;
}
.mc-warning {
  margin-top: 12rpx;
  padding: 8rpx 16rpx;
  background: rgba(255, 77, 45, 0.1);
  border-radius: 10rpx;
  font-size: 22rpx;
  color: #c2410c;
  font-weight: 600;
  position: relative;
  z-index: 1;
}
.pay-refresh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #fff7e6, #ffe7ba);
  border: 2rpx solid #ffb91a;
  border-radius: 16rpx;
  .pay-refresh-tip {
    flex: 1;
    font-size: 24rpx;
    color: #c2410c;
    font-weight: 600;
  }
  .pay-refresh-btn {
    padding: 12rpx 24rpx;
    background: var(--brand-gradient);
    color: #fff;
    border-radius: 999rpx;
    font-size: 24rpx;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
.plans {
  display: flex;
  gap: 16rpx;
}
.plan-card {
  flex: 1;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  position: relative;
  border: 2rpx solid transparent;
  box-shadow: var(--shadow-sm);
  &.active {
    border-color: var(--brand-primary);
    background: linear-gradient(135deg, #fff7f4, #fff);
    box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.18);
  }
  &.hot::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20rpx;
    pointer-events: none;
    border: 2rpx solid rgba(255, 77, 45, 0.3);
  }
  .hot-badge {
    position: absolute;
    top: -16rpx;
    right: 16rpx;
    padding: 4rpx 12rpx;
    background: var(--brand-primary);
    color: #fff;
    font-size: 20rpx;
    border-radius: 12rpx 12rpx 12rpx 0;
  }
  .plan-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    .plan-name {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .plan-original {
      font-size: 22rpx;
      color: var(--text-tertiary);
      text-decoration: line-through;
    }
  }
  .plan-price {
    margin-top: 16rpx;
    display: flex;
    align-items: baseline;
    color: var(--brand-primary);
    .price-symbol {
      font-size: 24rpx;
      font-weight: 600;
    }
    .price-value {
      font-size: 56rpx;
      font-weight: 700;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .price-unit {
      font-size: 22rpx;
      color: var(--text-tertiary);
      margin-left: 4rpx;
    }
  }
  .plan-tip {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .radio {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    width: 36rpx;
    height: 36rpx;
    text-align: center;
    line-height: 36rpx;
    color: var(--brand-primary);
    font-size: 32rpx;
  }
}
.section {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  .section-title {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .section-head {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    margin-bottom: 16rpx;
    .section-sub {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
}
.compare-table {
  margin-top: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid var(--border-light);
}
.compare-row {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  &.compare-head {
    background: var(--bg-hover);
    .col-name {
      font-weight: 700;
      color: var(--text-primary);
    }
    .col-cell {
      font-weight: 700;
      color: var(--text-primary);
    }
  }
  .col-name {
    flex: 1;
    font-size: 24rpx;
    color: var(--text-secondary);
  }
  .col-cell {
    width: 120rpx;
    text-align: center;
    font-size: 26rpx;
    color: var(--text-tertiary);
    &.highlight {
      color: var(--brand-primary);
      font-weight: 700;
    }
  }
}
.ad-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.ad-card {
  background: linear-gradient(135deg, #fff7f4, #fff);
  border: 2rpx solid var(--brand-primary-ghost);
  border-radius: 16rpx;
  padding: 20rpx;
  position: relative;
  &.hot {
    border-color: var(--brand-primary);
  }
  .ad-hot {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
    padding: 2rpx 12rpx;
    background: var(--brand-primary);
    color: #fff;
    font-size: 18rpx;
    border-radius: 8rpx;
  }
  .ad-name {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .ad-price {
    margin-top: 12rpx;
    display: flex;
    align-items: baseline;
    color: var(--brand-primary);
    .ad-symbol {
      font-size: 22rpx;
    }
    .ad-value {
      font-size: 40rpx;
      font-weight: 700;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .ad-unit {
      margin-left: 4rpx;
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
  .ad-rights {
    margin-top: 12rpx;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .ad-right {
      font-size: 20rpx;
      color: var(--text-secondary);
    }
  }
}
.addon-list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
}
.addon-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .addon-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .addon-name {
      font-size: 26rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
    .addon-desc {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
  .addon-action {
    display: flex;
    align-items: center;
    gap: 12rpx;
    .addon-price {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--brand-primary);
    }
  }
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.06);
  gap: 16rpx;
  .footer-meta {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 4rpx;
    .f-price {
      font-size: 36rpx;
      font-weight: 700;
      color: var(--brand-primary);
      font-family: var(--font-family-base);
    }
    .f-unit {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
    .f-original {
      margin-left: 12rpx;
      font-size: 22rpx;
      color: var(--text-tertiary);
      text-decoration: line-through;
    }
  }
  .footer-btn {
    flex: 0 0 240rpx;
    height: 88rpx;
    background: var(--brand-gradient);
    border-radius: 999rpx;
    color: #fff;
    font-size: 30rpx;
    font-weight: 700;
    text-align: center;
    line-height: 88rpx;
    box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.4);
  }
}
.safe-bottom {
  height: 40rpx;
}
</style>
