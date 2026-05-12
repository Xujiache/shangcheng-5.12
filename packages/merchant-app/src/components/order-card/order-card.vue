<script setup lang="ts">
/**
 * 订单卡片
 */
import { computed } from 'vue'
import { formatPrice, formatDateTime } from '@jiujiu/shared/utils'
import StatusTag from '../status-tag/status-tag.vue'
import type { Order, OrderStatus } from '@jiujiu/shared/types'

const props = defineProps<{
  order: Order
  showCustomer?: boolean
}>()

defineEmits<{
  (e: 'click', order: Order): void
  (e: 'action', action: string, order: Order): void
}>()

const STATUS_MAP: Record<OrderStatus, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  pending_payment: { text: '待付款', tone: 'warning' },
  pending_shipment: { text: '待发货', tone: 'primary' },
  shipped: { text: '已发货', tone: 'info' },
  completed: { text: '已完成', tone: 'success' },
  cancelled: { text: '已取消', tone: 'default' },
  after_sale: { text: '售后中', tone: 'error' },
  refunded: { text: '已退款', tone: 'default' },
}

const statusInfo = computed(() => STATUS_MAP[props.order.status])
const firstItem = computed(() => props.order.items?.[0])
const itemCount = computed(() => props.order.items?.length ?? 0)
</script>

<template>
  <view class="order-card" @click="$emit('click', order)">
    <view class="head">
      <view class="head-left">
        <text class="no">{{ order.no }}</text>
        <text v-if="showCustomer" class="customer">· {{ order.address.name }}</text>
      </view>
      <StatusTag :text="statusInfo.text" :tone="statusInfo.tone" />
    </view>

    <view v-if="firstItem" class="item">
      <image class="item-img" :src="firstItem.productImage" mode="aspectFill" />
      <view class="item-info">
        <text class="item-name">{{ firstItem.productName }}</text>
        <text class="item-spec">{{ firstItem.specsLabel }} · ×{{ firstItem.quantity }}</text>
        <text v-if="itemCount > 1" class="more">共 {{ itemCount }} 件商品</text>
      </view>
      <view class="item-price">
        <text class="price">{{ formatPrice(order.payAmount) }}</text>
        <text class="time">{{ formatDateTime(order.createdAt).slice(5, 16) }}</text>
      </view>
    </view>

    <view class="actions">
      <slot name="actions" :order="order" :status="order.status">
        <view class="btn" @click.stop="$emit('action', 'detail', order)">详情</view>
        <view v-if="order.status === 'pending_shipment'" class="btn primary" @click.stop="$emit('action', 'ship', order)">发货</view>
        <view v-if="order.status === 'shipped'" class="btn" @click.stop="$emit('action', 'tracking', order)">查物流</view>
        <view v-if="order.status === 'after_sale'" class="btn" @click.stop="$emit('action', 'refund', order)">处理售后</view>
      </slot>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.order-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx dashed var(--border-light);
    .head-left { display: flex; align-items: center; gap: 8rpx; }
    .no {
      font-size: 24rpx;
      color: var(--text-secondary);
      font-family: var(--font-family-base);
    }
    .customer {
      font-size: 24rpx;
      color: var(--text-tertiary);
    }
  }

  .item {
    display: flex;
    gap: 16rpx;
    .item-img {
      width: 120rpx;
      height: 120rpx;
      flex: 0 0 120rpx;
      border-radius: 8rpx;
      background: var(--bg-hover);
    }
    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6rpx;
      min-width: 0;
      .item-name {
        font-size: 28rpx;
        font-weight: 500;
        color: var(--text-primary);
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
      .item-spec {
        font-size: 22rpx;
        color: var(--text-tertiary);
      }
      .more {
        font-size: 22rpx;
        color: var(--text-tertiary);
        margin-top: 4rpx;
      }
    }
    .item-price {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6rpx;
      .price {
        font-size: 30rpx;
        font-weight: 700;
        color: var(--brand-primary);
      }
      .time {
        font-size: 20rpx;
        color: var(--text-tertiary);
      }
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12rpx;
    margin-top: 20rpx;
    padding-top: 16rpx;
    border-top: 1rpx dashed var(--border-light);
    .btn {
      padding: 8rpx 24rpx;
      border-radius: 999rpx;
      border: 1rpx solid var(--border-default);
      font-size: 24rpx;
      color: var(--text-primary);
      background: var(--bg-card);
      &.primary {
        background: var(--brand-primary);
        border-color: var(--brand-primary);
        color: #fff;
      }
    }
  }
}
</style>
