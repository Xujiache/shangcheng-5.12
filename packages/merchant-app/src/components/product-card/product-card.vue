<script setup lang="ts">
/**
 * 商品卡片（用于商品列表、选品广场等场景）
 */
import { computed } from 'vue'
import { formatPrice } from '@jiujiu/shared/utils'
import StatusTag from '../status-tag/status-tag.vue'

const props = withDefaults(
  defineProps<{
    image: string
    name: string
    sku?: string
    /** 主显示价（已根据角色规则计算好）*/
    price: number
    /** 价格类型，用于颜色标识 */
    priceTier?: 'retail' | 'wholesale' | 'member' | 'original'
    /** 库存 */
    stock?: number
    /** 状态标签 */
    statusText?: string
    statusTone?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default'
    /** 平台推送角标 */
    platformPushed?: boolean
    /** 显示样式 */
    layout?: 'horizontal' | 'vertical'
    selectable?: boolean
    selected?: boolean
  }>(),
  {
    sku: '',
    priceTier: 'retail',
    stock: undefined,
    statusText: '',
    statusTone: 'default',
    platformPushed: false,
    layout: 'horizontal',
    selectable: false,
    selected: false,
  },
)

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'toggle'): void
}>()

const priceColor = computed(() => {
  const map = {
    retail: 'var(--price-retail)',
    wholesale: 'var(--price-wholesale)',
    member: 'var(--price-member)',
    original: 'var(--price-original)',
  }
  return map[props.priceTier]
})
</script>

<template>
  <view :class="['product-card', `layout-${layout}`]" @click="emit('click')">
    <view v-if="selectable" class="checkbox" @click.stop="emit('toggle')">
      <text>{{ selected ? '●' : '○' }}</text>
    </view>
    <view class="image-wrap">
      <image class="image" :src="image" mode="aspectFill" />
      <view v-if="platformPushed" class="badge-platform">平台推送</view>
    </view>
    <view class="info">
      <view class="head">
        <text class="name">{{ name }}</text>
        <StatusTag v-if="statusText" :text="statusText" :tone="statusTone" />
      </view>
      <text v-if="sku" class="sku">编号 {{ sku }}</text>
      <view class="foot">
        <text class="price" :style="{ color: priceColor }">{{ formatPrice(price) }}</text>
        <text v-if="stock !== undefined" class="stock">库存 {{ stock }}</text>
      </view>
      <slot name="action" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.product-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 16rpx;
  display: flex;
  gap: 16rpx;
  box-shadow: var(--shadow-sm);
  &.layout-vertical {
    flex-direction: column;
    padding: 12rpx;
    .image-wrap { width: 100%; height: 280rpx; }
  }

  .checkbox {
    display: flex;
    align-items: center;
    padding-right: 8rpx;
    text { font-size: 36rpx; color: var(--text-tertiary); }
  }
  .image-wrap {
    flex: 0 0 160rpx;
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    overflow: hidden;
    position: relative;
    background: var(--bg-hover);
    .image { width: 100%; height: 100%; }
    .badge-platform {
      position: absolute;
      top: 8rpx;
      left: 8rpx;
      background: var(--brand-primary);
      color: #fff;
      font-size: 18rpx;
      padding: 2rpx 8rpx;
      border-radius: 6rpx;
    }
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8rpx;
      .name {
        font-size: 26rpx;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
        word-break: break-all;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }
    .sku {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
    .foot {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .price {
        font-size: 32rpx;
        font-weight: 700;
        font-family: var(--font-family-base);
      }
      .stock {
        font-size: 22rpx;
        color: var(--text-tertiary);
      }
    }
  }
}
</style>
