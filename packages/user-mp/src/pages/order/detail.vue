<script setup lang="ts">
/**
 * UM-09a · 订单详情
 *
 * 调 GET /api/v1/u/orders/:id 拿订单全量字段（含 items / address 快照 / 价格明细 / 物流单号 / 时间节点）。
 * 入口：pages/order/list.vue 任意状态下的"查看详情"或卡片整体点击。
 */
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderService } from '../../services'
import type { Order } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(true)
const loadFailed = ref(false)
const pendingAction = ref<string>('')
const refunding = ref(false)
/** 待付款倒计时（秒），来源 order.expiresIn；没有就为 null，UI 不显示 */
const remainSeconds = ref<number | null>(null)
let expiresTimer: any = null

const STATUS_META: Record<string, { label: string; tint: string }> = {
  pending_payment: { label: '待付款', tint: '#FF4D2D' },
  pending_shipment: { label: '待发货', tint: '#FF7A45' },
  shipped: { label: '待收货', tint: '#A855F7' },
  completed: { label: '已完成', tint: '#52C41A' },
  cancelled: { label: '已取消', tint: '#86909C' },
  after_sale: { label: '售后中', tint: '#FAAD14' },
}

const totalQty = computed(() => order.value?.items?.reduce((s, l) => s + l.quantity, 0) ?? 0)

const statusMeta = computed(() =>
  order.value
    ? STATUS_META[order.value.status] || { label: order.value.status, tint: '#86909C' }
    : null,
)

onLoad((options) => {
  const id = options?.id || options?.orderId
  if (!id) {
    uni.showToast({ title: '缺少订单参数', icon: 'none' })
    return
  }
  orderId.value = id as string
  pendingAction.value = (options?.action || '').toString()
  load()
})

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    order.value = await orderService.detail(orderId.value)
    syncExpiresTimer()
    // 列表页带 action=refund 跳过来 → 加载完成后自动弹售后选择
    if (pendingAction.value === 'refund' && order.value) {
      pendingAction.value = ''
      setTimeout(() => openRefundSheet(), 200)
    }
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 同步待付款倒计时。
 * 后端在 pending_payment 状态会返回 `expiresIn`(秒),无该字段时不显示倒计时。
 */
function syncExpiresTimer() {
  if (expiresTimer) {
    clearInterval(expiresTimer)
    expiresTimer = null
  }
  const o = order.value
  if (!o || o.status !== 'pending_payment') {
    remainSeconds.value = null
    return
  }
  const seed = Number((o as any).expiresIn)
  if (!Number.isFinite(seed) || seed <= 0) {
    remainSeconds.value = null
    return
  }
  remainSeconds.value = Math.floor(seed)
  expiresTimer = setInterval(() => {
    if (remainSeconds.value == null) return
    remainSeconds.value = Math.max(0, remainSeconds.value - 1)
    if (remainSeconds.value <= 0) {
      clearInterval(expiresTimer)
      expiresTimer = null
    }
  }, 1000)
}

const expiresHint = computed(() => {
  if (remainSeconds.value == null || remainSeconds.value <= 0) return ''
  const m = Math.floor(remainSeconds.value / 60)
  const s = remainSeconds.value % 60
  return `剩余 ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} 关闭`
})

onUnmounted(() => {
  if (expiresTimer) {
    clearInterval(expiresTimer)
    expiresTimer = null
  }
})

/**
 * 售后申请。
 *
 * 调后端 `POST /u/orders/:id/refund`：受理成功后订单状态会被推到 after_sale。
 * 失败给真实错误（不再"假装受理"），让用户感知到需要重试或换通道。
 * 联系客服由用户主动选择,不再强制弹"客服会话留言"那种打折交互。
 */
function openRefundSheet() {
  const REASONS = ['退货退款', '换货', '维修', '不想要了']
  uni.showActionSheet({
    itemList: REASONS,
    success: (r) => {
      const reason = REASONS[r.tapIndex]
      submitRefund(reason)
    },
  })
}

async function submitRefund(reason: string) {
  if (!order.value || refunding.value) return
  refunding.value = true
  uni.showLoading({ title: '提交中…', mask: true })
  try {
    await orderService.refund(order.value.id, {
      reason,
      amount: Number(order.value.payAmount) || undefined,
    })
    uni.hideLoading()
    uni.showToast({ title: '售后申请已提交,等待商家处理', icon: 'success', duration: 1800 })
    setTimeout(() => load(), 400)
  } catch (e: any) {
    uni.hideLoading()
    const msg = e?.message || '提交失败'
    uni.showModal({
      title: '售后申请失败',
      content: `${msg}\n如长时间无法提交,可联系商家客服处理。`,
      confirmText: '联系客服',
      cancelText: '我知道了',
      success: (m) => {
        if (m.confirm) {
          const mid = (order.value as any)?.merchantId
          const url = mid
            ? `/pages/chat/index?merchantId=${encodeURIComponent(mid)}`
            : '/pages/chat/index'
          uni.navigateTo({ url })
        }
      },
    })
  } finally {
    refunding.value = false
  }
}

function copyNo() {
  if (!order.value) return
  uni.setClipboardData({
    data: order.value.no,
    success: () => uni.showToast({ title: '订单号已复制', icon: 'success' }),
  })
}

function copyTracking() {
  if (!order.value?.trackingNumber) return
  uni.setClipboardData({
    data: order.value.trackingNumber,
    success: () => uni.showToast({ title: '物流单号已复制', icon: 'success' }),
  })
}

async function payNow() {
  if (!order.value) return
  uni.navigateTo({
    url: `/pages/order/pay?orderId=${order.value.id}&orderNo=${order.value.no}&amount=${order.value.payAmount}`,
  })
}

async function cancelOrder() {
  if (!order.value) return
  uni.showModal({
    title: '取消订单',
    content: '确认取消该订单？',
    success: async (r) => {
      if (r.confirm) {
        await orderService.cancel(order.value!.id)
        uni.showToast({ title: '已取消', icon: 'success' })
        load()
      }
    },
  })
}

async function confirmOrder() {
  if (!order.value) return
  uni.showModal({
    title: '确认收货',
    content: '请确认已收到商品并满意',
    success: async (r) => {
      if (r.confirm) {
        await orderService.confirm(order.value!.id)
        uni.showToast({ title: '已确认', icon: 'success' })
        load()
      }
    },
  })
}

async function urgeShip() {
  if (!order.value) return
  await orderService.urge(order.value.id)
  uni.showToast({ title: '已提醒商家发货', icon: 'success' })
}
</script>

<template>
  <view class="page">
    <NavBar title="订单详情" />

    <view v-if="loading" class="state">
      <text>加载中…</text>
    </view>

    <view v-else-if="loadFailed || !order" class="state">
      <text>加载失败</text>
      <view class="retry" @click="load">重试</view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <!-- 状态条 -->
      <view
        class="status-strip"
        :style="{ background: (statusMeta?.tint || '#86909C') + '14', color: statusMeta?.tint }"
      >
        <text class="status-label">{{ statusMeta?.label }}</text>
        <text v-if="order.status === 'pending_payment' && expiresHint" class="status-sub">
          {{ expiresHint }}
        </text>
      </view>

      <!-- 地址快照 -->
      <view class="card address-card">
        <view class="card-head">
          <Icon name="location-pin" :size="28" color="var(--brand-primary)" />
          <text class="head-title">收货地址</text>
        </view>
        <view class="addr-name">
          <text class="name">{{ order.address?.name }}</text>
          <text class="phone">{{ order.address?.phone }}</text>
        </view>
        <text class="addr-detail">{{ order.address?.region }} · {{ order.address?.detail }}</text>
      </view>

      <!-- 商品列表 -->
      <view class="card">
        <view class="card-head">
          <Icon name="package" :size="28" color="var(--text-primary)" />
          <text class="head-title">商品（{{ totalQty }} 件）</text>
        </view>
        <view v-for="l in order.items || []" :key="l.id" class="line">
          <image :src="l.productImage" mode="aspectFill" class="line-img" />
          <view class="line-info">
            <text class="line-name">{{ l.productName }}</text>
            <text class="line-spec">{{ l.specsLabel }}</text>
          </view>
          <view class="line-right">
            <text class="line-price">{{ formatPrice(l.unitPrice) }}</text>
            <text class="line-qty">×{{ l.quantity }}</text>
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="card amount-card">
        <view class="row">
          <text class="k">商品总额</text>
          <text class="v">{{ formatPrice(order.totalAmount) }}</text>
        </view>
        <view class="row">
          <text class="k">配送费</text>
          <text class="v">{{
            order.shippingFee > 0 ? formatPrice(order.shippingFee) : '免运费'
          }}</text>
        </view>
        <view v-if="order.couponDiscount" class="row">
          <text class="k">优惠券</text>
          <text class="v accent">-{{ formatPrice(order.couponDiscount) }}</text>
        </view>
        <view class="row total">
          <text class="k">实付</text>
          <text class="v primary">{{ formatPrice(order.payAmount) }}</text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="card meta-card">
        <view class="meta-row" @click="copyNo">
          <text class="k">订单号</text>
          <text class="v">{{ order.no }}</text>
          <Icon name="doc" :size="22" color="var(--text-tertiary)" />
        </view>
        <view class="meta-row">
          <text class="k">下单时间</text>
          <text class="v">{{ order.createdAt }}</text>
        </view>
        <view v-if="order.paidAt" class="meta-row">
          <text class="k">付款时间</text>
          <text class="v">{{ order.paidAt }}</text>
        </view>
        <view v-if="order.shippedAt" class="meta-row">
          <text class="k">发货时间</text>
          <text class="v">{{ order.shippedAt }}</text>
        </view>
        <view v-if="order.completedAt" class="meta-row">
          <text class="k">完成时间</text>
          <text class="v">{{ order.completedAt }}</text>
        </view>
        <view v-if="order.trackingNumber" class="meta-row" @click="copyTracking">
          <text class="k">物流单号</text>
          <text class="v">
            <text v-if="order.trackingCompany">{{ order.trackingCompany }} · </text
            >{{ order.trackingNumber }}
          </text>
          <Icon name="doc" :size="22" color="var(--text-tertiary)" />
        </view>
        <view v-if="order.remark" class="meta-row">
          <text class="k">备注</text>
          <text class="v remark">{{ order.remark }}</text>
        </view>
      </view>

      <view style="height: 160rpx" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="order" class="ft">
      <template v-if="order.status === 'pending_payment'">
        <view class="btn ghost" @click="cancelOrder">取消订单</view>
        <view class="btn primary" @click="payNow">去支付</view>
      </template>
      <template v-else-if="order.status === 'pending_shipment'">
        <view class="btn primary" @click="urgeShip">催发货</view>
      </template>
      <template v-else-if="order.status === 'shipped'">
        <view class="btn ghost" @click="openRefundSheet">申请售后</view>
        <view class="btn primary" @click="confirmOrder">确认收货</view>
      </template>
      <template v-else-if="order.status === 'completed'">
        <view class="btn ghost" @click="openRefundSheet">申请售后</view>
      </template>
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
.scroll {
  flex: 1;
  height: 0;
}
.state {
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  color: var(--text-tertiary);
  font-size: 26rpx;
  .retry {
    padding: 12rpx 32rpx;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 24rpx;
  }
}
.status-strip {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .status-label {
    font-size: 36rpx;
    font-weight: 800;
  }
  .status-sub {
    font-size: 22rpx;
    opacity: 0.7;
  }
}
.card {
  margin: 16rpx 24rpx 0;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  box-shadow: $shadow-sm;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 8rpx;
  border-bottom: 1rpx dashed var(--border-light);
  .head-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
}
.address-card {
  .addr-name {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
    .name {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .phone {
      font-size: 24rpx;
      color: var(--text-secondary);
    }
  }
  .addr-detail {
    font-size: 24rpx;
    color: var(--text-tertiary);
    line-height: 1.4;
  }
}
.line {
  display: flex;
  gap: 16rpx;
  align-items: center;
  padding-top: 8rpx;
  .line-img {
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    background: var(--bg-page);
    flex-shrink: 0;
  }
  .line-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  .line-name {
    font-size: 26rpx;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .line-spec {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .line-right {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4rpx;
    .line-price {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
      font-family: $font-family-base;
    }
    .line-qty {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
}
.amount-card {
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 26rpx;
    .k {
      color: var(--text-tertiary);
    }
    .v {
      color: var(--text-primary);
      font-family: $font-family-base;
    }
    .v.accent {
      color: var(--brand-primary);
      font-weight: 700;
    }
    .v.primary {
      color: var(--brand-primary);
      font-size: 32rpx;
      font-weight: 800;
    }
    &.total {
      padding-top: 8rpx;
      border-top: 1rpx dashed var(--border-light);
    }
  }
}
.meta-card .meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 0;
  .k {
    flex-shrink: 0;
    width: 160rpx;
    font-size: 24rpx;
    color: var(--text-tertiary);
  }
  .v {
    flex: 1;
    font-size: 24rpx;
    color: var(--text-primary);
    font-family: $font-family-base;
    word-break: break-all;
  }
  .v.remark {
    font-family: inherit;
    line-height: 1.5;
  }
}
.ft {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-card);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
  z-index: 30;
}
.btn {
  padding: 16rpx 36rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: $brand-gradient;
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
</style>
