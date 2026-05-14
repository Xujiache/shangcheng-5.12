<script setup lang="ts">
/**
 * UM-05 · 支付
 * 还原 原型图/user-mini.jsx::UM_Pay
 * - 顶部大金额展示 + 倒计时(来自 order.expiresAt/expiresIn，无该字段不显示)
 * - 支付方式选择(当前仅微信小程序原生支付)
 * - 立即支付：严格走微信 invoke + 回调，绝不本地"假装支付成功"
 *
 * 关键修复：
 *   - P0-9：删除 mockPaid 直接当成功的兜底分支（开发态后端若仍返 mockPaid 由后端自身负责
 *           推订单状态，前端永远等真实微信支付回调）
 *   - P1-18：倒计时改用 order.expiresAt / expiresIn（后端真实剩余时间），不再硬编码 15 分钟
 *   - P1-19：用户协议跳转改为 AgreementSheet 真协议（拉 /api/v1/u/agreements）
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderService } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import AgreementSheet from '../../components/agreement-sheet/agreement-sheet.vue'
import { safeSwitchTab } from '../../utils/tab-nav'

const orderId = ref('')
const orderNo = ref('')
const amount = ref(0)
const method = ref<'wechat'>('wechat')
/** 剩余支付秒数：null = 未知（不显示倒计时） */
const seconds = ref<number | null>(null)
const paying = ref(false)
const showAgreement = ref(false)
let timer: any = null

onLoad((options) => {
  orderId.value = options?.orderId ?? ''
  orderNo.value = options?.orderNo ?? ''
  amount.value = Number(options?.amount ?? 0)
  if (!orderId.value) {
    uni.showToast({ title: '订单信息缺失', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1200)
    return
  }
  loadExpires()
})

/**
 * 拉订单详情，按后端 expiresIn(秒) 或 expiresAt(ISO) 算剩余时间。
 * 字段缺失 → 不显示倒计时(让用户自己看订单列表里的关单时间)。
 */
async function loadExpires() {
  try {
    const o: any = await orderService.detail(orderId.value)
    let left: number | null = null
    if (Number.isFinite(Number(o?.expiresIn))) {
      left = Math.max(0, Math.floor(Number(o.expiresIn)))
    } else if (o?.expiresAt) {
      const diff = Math.floor((new Date(o.expiresAt).getTime() - Date.now()) / 1000)
      if (Number.isFinite(diff)) left = Math.max(0, diff)
    }
    if (left == null || left <= 0) {
      seconds.value = null
      return
    }
    seconds.value = left
    startTimer()
  } catch {
    seconds.value = null
  }
}

function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (seconds.value == null) return
    seconds.value -= 1
    if (seconds.value <= 0) {
      clearInterval(timer)
      timer = null
      uni.showModal({
        title: '支付超时',
        content: '订单已被关闭',
        showCancel: false,
        success: () => safeSwitchTab('/pages/tabbar/me/index'),
      })
    }
  }, 1000)
}

onMounted(() => {
  // 倒计时由 loadExpires() 在拿到 expiresIn 后启动
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

const timeStr = computed(() => {
  if (seconds.value == null) return ''
  const m = Math.floor(seconds.value / 60)
  const s = seconds.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const METHODS = [
  {
    key: 'wechat',
    icon: 'wechat',
    label: '微信支付',
    desc: '微信小程序内原生支付',
    tint: '#3CB244',
  },
]

/**
 * 用户端只走微信小程序内原生支付：
 *   1. 后端 POST /api/v1/u/orders/:id/pay 返回 miniPay
 *   2. uni.requestPayment(miniPay) 调起微信支付
 *   3. 微信回调 /api/v1/payments/wechat/notify 真正标订单已付
 *
 * 严禁任何"前端识别到 mockPaid 直接当支付成功"的逻辑（P0-9）：
 *   订单状态必须由后端基于真实支付/真实回调推进，
 *   前端唯一可信的"成功"信号是 uni.requestPayment 的 success 回调。
 */
async function pay() {
  if (!orderId.value) {
    uni.showToast({ title: '订单信息缺失', icon: 'none' })
    return
  }
  paying.value = true
  uni.showLoading({ title: '支付中…', mask: true })
  try {
    const resp: any = await orderService.pay(orderId.value, method.value)
    uni.hideLoading()

    if (!resp?.miniPay) {
      uni.showToast({ title: '支付参数缺失，请稍后重试', icon: 'none' })
      return
    }

    const mp = resp.miniPay
    // @ts-ignore — uni 平台 API
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: mp.timeStamp,
      nonceStr: mp.nonceStr,
      package: mp.package,
      signType: mp.signType || 'RSA',
      paySign: mp.paySign,
      success: () => {
        uni.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(
          () => uni.redirectTo({ url: '/pages/order/list?status=pending_shipment' }),
          1200,
        )
      },
      fail: (err: any) => {
        const msg = err?.errMsg?.includes('cancel') ? '已取消支付' : '支付失败'
        uni.showToast({ title: msg, icon: 'none' })
      },
    })
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

function goAgreement() {
  showAgreement.value = true
}
</script>

<template>
  <view class="page">
    <NavBar title="支付" />

    <view class="hero">
      <text class="hero-label">订单金额</text>
      <view class="hero-amount">
        <text class="cur">¥</text>
        <text class="num">{{ amount.toFixed(2) }}</text>
      </view>
      <view v-if="timeStr" class="hero-time">
        <Icon name="clock" :size="24" color="var(--text-tertiary)" />
        <text>剩余支付时间 {{ timeStr }}</text>
      </view>
      <text v-if="orderNo" class="hero-order">订单号 {{ orderNo }}</text>
    </view>

    <view class="methods">
      <view
        v-for="m in METHODS"
        :key="m.key"
        :class="['method', method === m.key ? 'active' : '']"
        @click="method = m.key as any"
      >
        <view class="method-icon" :style="{ background: m.tint }">
          <Icon :name="m.icon" :size="36" color="#fff" />
        </view>
        <view class="method-info">
          <text class="method-label">{{ m.label }}</text>
          <text v-if="m.desc" class="method-desc">{{ m.desc }}</text>
        </view>
        <view class="method-radio">
          <Icon
            v-if="method === m.key"
            name="check-circle"
            :size="40"
            color="var(--brand-primary)"
          />
          <Icon v-else name="circle" :size="40" color="var(--text-tertiary)" />
        </view>
      </view>
    </view>

    <view class="pay-btn-wrap">
      <view :class="['pay-btn', paying ? 'loading' : '']" @click="pay">
        {{ paying ? '支付中…' : '立即支付' }}
      </view>
      <view class="agree">
        开通付款即同意
        <text class="link" @click="goAgreement">《用户协议》</text>
      </view>
    </view>

    <!-- 用户协议弹层(拉 /api/v1/u/agreements 真协议正文,本地不再 toast 占位) -->
    <AgreementSheet :open="showAgreement" type="user" @close="showAgreement = false" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}
.hero {
  padding: 48rpx 32rpx 56rpx;
  background: var(--bg-card);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  .hero-label {
    font-size: 24rpx;
    color: var(--text-tertiary);
  }
  .hero-amount {
    display: flex;
    align-items: baseline;
    color: var(--brand-primary);
    font-family: $font-family-base;
    .cur {
      font-size: 36rpx;
      font-weight: 800;
    }
    .num {
      font-size: 80rpx;
      font-weight: 800;
      line-height: 1;
    }
  }
  .hero-time {
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .hero-order {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: $font-family-base;
  }
}
.methods {
  margin: 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
}
.method {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  &.active {
    background: rgba(255, 77, 45, 0.04);
  }
  .method-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .method-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .method-label {
      font-size: 28rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
    .method-desc {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
}
.pay-btn-wrap {
  margin: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.pay-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 32rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  &.loading {
    opacity: 0.7;
  }
}
.agree {
  font-size: 20rpx;
  color: var(--text-tertiary);
  .link {
    color: var(--brand-primary);
  }
}
</style>
