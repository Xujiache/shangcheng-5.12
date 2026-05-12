<script setup lang="ts">
/**
 * UM-04 · 确认订单
 * 还原 原型图/user-mini.jsx::UM_Confirm
 * - 顶部地址卡（虚线边）
 * - 商品列表
 * - 配送/优惠券/备注
 * - 底部合计 + 提交订单
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useCartStore } from '../../store/cart'
import { addressService, orderService, couponService } from '../../services'
import type { Address, Coupon } from '../../services'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const cartStore = useCartStore()
const address = ref<Address | null>(null)
const couponDiscount = ref(0)
const selectedCouponId = ref<string>('')
const couponList = ref<Coupon[]>([])
const shippingMethod = ref<'factory' | 'local' | 'pickup'>('factory')
const remark = ref('')
const submitting = ref(false)

/** 是否来自"立即购买"（单一行）—— 不显示购物车其它已选商品 */
const fromSku = ref(false)

const SHIPPING_TEXT: Record<string, string> = {
  factory: '厂家直发',
  local: '本地配送',
  pickup: '门店自提',
}

/** 立即购买仅显示 buyNow 单行；购物车结算显示已勾选行 */
const lines = computed(() =>
  fromSku.value && cartStore.buyNow ? [cartStore.buyNow] : cartStore.selectedLines,
)
const subtotal = computed(() => lines.value.reduce((s, l) => s + l.price * l.qty, 0))
const payAmount = computed(() => Math.max(0, subtotal.value - couponDiscount.value))

onLoad((options) => {
  fromSku.value = options?.fromSku === '1' || options?.fromSku === 1 as any
  cartStore.hydrate() // 确保 buyNow 从 storage 恢复（H5 刷新场景）
})

onMounted(async () => {
  await loadInitial()
})

// 从地址选择页返回时，读取 selected address id 并刷新
onShow(async () => {
  try {
    const sid = uni.getStorageSync('jiujiu_pick_address')
    if (sid) {
      uni.removeStorageSync('jiujiu_pick_address')
      const list = await addressService.list()
      const picked = list.find((a) => a.id === sid)
      if (picked) address.value = picked
    }
  } catch { /* ignore */ }
})

async function loadInitial() {
  try {
    address.value = await addressService.defaultAddress()
  } catch { /* ignore */ }
  try {
    const r = await couponService.list()
    couponList.value = (r?.list || []).filter((c) => c.status === 'active')
  } catch { /* ignore */ }
}

/** 当前可用券（满足门槛） */
const availableCoupons = computed(() =>
  couponList.value.filter((c) => !c.threshold || subtotal.value >= c.threshold),
)
/** 当前最优券：折扣最大的一张 */
const bestCoupon = computed(() => {
  const usable = availableCoupons.value.slice()
  usable.sort((a, b) => discountOf(b, subtotal.value) - discountOf(a, subtotal.value))
  return usable[0] || null
})

function discountOf(c: Coupon, sub: number): number {
  if (c.type === 'fullReduce') return Number(c.amount || 0)
  if (c.type === 'fixed') return Number(c.amount || 0)
  if (c.type === 'discount') return Math.round((sub * (1 - (c.discountPercent || 1))) * 100) / 100
  return 0
}

function couponLabel(c: Coupon): string {
  if (c.type === 'fullReduce') return `${c.name}（满 ${c.threshold} 减 ${c.amount}）`
  if (c.type === 'fixed') return `${c.name}（直减 ${c.amount}）`
  if (c.type === 'discount') return `${c.name}（${(c.discountPercent || 1) * 10} 折）`
  return c.name
}

function chooseAddress() {
  uni.navigateTo({ url: '/pages/address/list?from=confirm' })
}

function chooseShipping() {
  uni.showActionSheet({
    itemList: ['厂家直发（默认）', '本地配送', '门店自提'],
    success: (r) => {
      shippingMethod.value = (['factory', 'local', 'pickup'] as const)[r.tapIndex]
    },
  })
}

function chooseCoupon() {
  // 构造选项：可用券 + 不使用 + 未达门槛券（灰色提示）
  const usable = availableCoupons.value
  const unavailable = couponList.value.filter((c) => c.threshold && subtotal.value < c.threshold)
  const items = [
    ...usable.map((c) => `${couponLabel(c)}  -¥${discountOf(c, subtotal.value)}`),
    ...unavailable.map((c) => `${couponLabel(c)}  ✗ 还差 ¥${c.threshold! - subtotal.value}`),
    '不使用优惠券',
  ]
  if (items.length === 1) {
    uni.showToast({ title: '当前订单暂无可用优惠券', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: items,
    success: (r) => {
      if (r.tapIndex < usable.length) {
        const c = usable[r.tapIndex]
        selectedCouponId.value = c.id
        couponDiscount.value = discountOf(c, subtotal.value)
        uni.showToast({ title: `已使用「${c.name}」-¥${couponDiscount.value}`, icon: 'success' })
      } else if (r.tapIndex >= usable.length && r.tapIndex < usable.length + unavailable.length) {
        const c = unavailable[r.tapIndex - usable.length]
        uni.showToast({ title: `未达门槛，还差 ¥${c.threshold! - subtotal.value}`, icon: 'none' })
      } else {
        selectedCouponId.value = ''
        couponDiscount.value = 0
      }
    },
  })
}

function editRemark() {
  uni.showModal({
    title: '订单备注',
    editable: true,
    placeholderText: '请输入备注（选填）',
    content: remark.value,
    success: (r) => {
      if (r.confirm) remark.value = r.content ?? ''
    },
  })
}

async function submit() {
  if (!address.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  if (lines.value.length === 0) {
    uni.showToast({ title: '没有可下单的商品', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const result = await orderService.create({
      addressId: address.value.id,
      items: lines.value.map((l) => ({ skuId: l.skuId, productId: l.productId, quantity: l.qty })),
      couponDiscount: couponDiscount.value,
      shippingMethod: shippingMethod.value,
      remark: remark.value,
    })
    // 立即购买：清 buyNow；购物车结算：清已勾选
    if (fromSku.value) cartStore.clearBuyNow()
    else cartStore.clearSelected()
    uni.redirectTo({ url: `/pages/order/pay?orderId=${result.orderId}&orderNo=${result.orderNo}&amount=${result.payAmount}` })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="确认订单" />

    <scroll-view scroll-y class="scroll">
      <!-- 地址 -->
      <view class="address-card" @click="chooseAddress">
        <view class="addr-head">
          <Icon name="location-pin" :size="32" color="var(--brand-primary)" />
          <text class="addr-title">收货地址</text>
          <text class="addr-change">{{ address ? '更换' : '选择' }} ›</text>
        </view>
        <template v-if="address">
          <view class="addr-name">
            <text class="name">{{ address.name }}</text>
            <text class="phone">{{ address.phone }}</text>
          </view>
          <text class="addr-detail">{{ address.region }} · {{ address.detail }}</text>
        </template>
        <text v-else class="addr-empty">请选择收货地址 ›</text>
      </view>

      <!-- 商品列表 -->
      <view class="goods-card">
        <view v-for="l in lines" :key="l.id" class="goods-line">
          <image :src="l.image" mode="aspectFill" class="goods-img" />
          <view class="goods-info">
            <text class="name">{{ l.name }}</text>
            <text class="spec">规格：{{ l.spec }}</text>
            <view class="row">
              <text class="price">{{ formatPrice(l.price) }}</text>
              <text class="qty">×{{ l.qty }}</text>
            </view>
          </view>
        </view>
        <view v-if="lines.length === 0" class="goods-empty">
          <text>暂无商品</text>
        </view>
      </view>

      <!-- 配送/优惠/备注 -->
      <view class="opts-card">
        <view class="opt" @click="chooseShipping">
          <text class="opt-label">配送方式</text>
          <text class="opt-value">{{ SHIPPING_TEXT[shippingMethod] }}</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
        <view class="opt-divider" />
        <view class="opt" @click="chooseCoupon">
          <text class="opt-label">优惠券</text>
          <text class="opt-value" :class="{ accent: couponDiscount > 0 }">
            {{ couponDiscount > 0 ? `-¥${couponDiscount}` : '不使用' }}
          </text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
        <view class="opt-divider" />
        <view class="opt" @click="editRemark">
          <text class="opt-label">备注</text>
          <text class="opt-value placeholder">{{ remark || '选填…' }}</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="amount-card">
        <view class="row">
          <text class="k">商品金额</text>
          <text class="v">{{ formatPrice(subtotal) }}</text>
        </view>
        <view class="row">
          <text class="k">配送费</text>
          <text class="v">免运费</text>
        </view>
        <view class="row" v-if="couponDiscount > 0">
          <text class="k">优惠券</text>
          <text class="v accent">-¥{{ couponDiscount }}</text>
        </view>
      </view>

      <view style="height: 180rpx;" />
    </scroll-view>

    <!-- 底部合计 -->
    <view class="ft">
      <view class="ft-total">
        <text class="ft-label">合计</text>
        <text class="ft-value">{{ formatPrice(payAmount) }}</text>
      </view>
      <view :class="['submit', submitting ? 'loading' : '']" @click="submit">
        {{ submitting ? '提交中…' : '提交订单' }}
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}
.scroll { flex: 1; height: 0; }

.address-card {
  margin: 24rpx;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  border: 2rpx dashed var(--brand-primary);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .addr-head {
    display: flex;
    align-items: center;
    gap: 8rpx;
    .addr-title { flex: 1; font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
    .addr-change { font-size: 24rpx; color: var(--brand-primary); }
  }
  .addr-name {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
    .name { font-size: 28rpx; font-weight: 700; }
    .phone { font-size: 26rpx; color: var(--text-secondary); }
  }
  .addr-detail { font-size: 24rpx; color: var(--text-tertiary); line-height: 1.4; }
  .addr-empty { font-size: 26rpx; color: var(--text-tertiary); }
}

.goods-card {
  margin: 0 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
}
.goods-line {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .goods-img {
    width: 140rpx;
    height: 140rpx;
    border-radius: 12rpx;
    background: var(--bg-page);
  }
  .goods-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
    .name {
      font-size: 26rpx;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--text-primary);
    }
    .spec { font-size: 22rpx; color: var(--text-tertiary); }
    .row {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .price {
        font-size: 28rpx;
        font-weight: 800;
        color: var(--brand-primary);
        font-family: $font-family-base;
      }
      .qty { font-size: 24rpx; color: var(--text-tertiary); }
    }
  }
}
.goods-empty {
  padding: 60rpx 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 24rpx;
}

.opts-card {
  margin: 16rpx 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.opt {
  height: 96rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  .opt-label { width: 160rpx; font-size: 26rpx; color: var(--text-tertiary); }
  .opt-value {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
    text-align: right;
    &.accent { color: var(--brand-primary); font-weight: 700; }
    &.placeholder { color: var(--text-tertiary); }
  }
}
.opt-divider { height: 1rpx; background: var(--border-light); }

.amount-card {
  margin: 16rpx 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 24rpx;
    .k { color: var(--text-tertiary); }
    .v { color: var(--text-primary); font-family: $font-family-base; }
    .v.accent { color: var(--brand-primary); font-weight: 700; }
  }
}

.ft {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 112rpx;
  background: var(--bg-card);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);
  .ft-total {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 8rpx;
    .ft-label { font-size: 22rpx; color: var(--text-tertiary); }
    .ft-value {
      font-size: 40rpx;
      font-weight: 800;
      color: var(--brand-primary);
      font-family: $font-family-base;
    }
  }
  .submit {
    padding: 0 48rpx;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 999rpx;
    background: $brand-gradient;
    color: #fff;
    font-size: 30rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
    &.loading { opacity: 0.7; }
  }
}
</style>
