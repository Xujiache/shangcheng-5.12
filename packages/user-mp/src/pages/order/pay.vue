<script setup lang="ts">
/**
 * UM-05 · 支付
 * 还原 原型图/user-mini.jsx::UM_Pay
 * - 顶部大金额展示 + 倒计时
 * - 支付方式选择（微信支付 / 余额）
 * - 立即支付
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderService } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import { safeSwitchTab } from '../../utils/tab-nav'

const orderId = ref('')
const orderNo = ref('')
const amount = ref(0)
// 仅保留微信内的微信原生支付
const method = ref<'wechat'>('wechat')
const seconds = ref(15 * 60)
const paying = ref(false)
let timer: any

onLoad((options) => {
  orderId.value = options?.orderId ?? ''
  orderNo.value = options?.orderNo ?? ''
  amount.value = Number(options?.amount ?? 0)
  if (!orderId.value) {
    // 没拿到 orderId，禁止用户点支付（旧版会兜底 'o-mock' 进入支付）
    uni.showToast({ title: '订单信息缺失', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1200)
  }
})

onMounted(() => {
  timer = setInterval(() => {
    seconds.value--
    if (seconds.value <= 0) {
      clearInterval(timer)
      uni.showModal({
        title: '支付超时',
        content: '订单已被关闭',
        showCancel: false,
        success: () => safeSwitchTab('/pages/tabbar/me/index'),
      })
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const timeStr = computed(() => {
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
 * 注：生产环境 mockPaid 永远不会出现；该字段仅在后端商户号未配齐的开发联调阶段会返回。
 * 客户端仍然兼容性识别，避免开发态卡死。
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

    if (resp?.mockPaid) {
      uni.showToast({ title: '支付成功', icon: 'success' })
      setTimeout(() => uni.redirectTo({ url: '/pages/order/list?status=pending_shipment' }), 1200)
      return
    }

    if (resp?.miniPay) {
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
    } else {
      uni.showToast({ title: '支付参数缺失', icon: 'none' })
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

function goAgreement() {
  uni.showToast({ title: '《用户协议》', icon: 'none' })
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
      <view class="hero-time">
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
