<script setup lang="ts">
/**
 * 瀑布流商品卡（用户端通用）
 * - 大图（高度可变 / 自适应）
 * - 商品名 + 价格 + 价格可见性 Tag
 */
import { computed } from 'vue'
import { formatPrice } from '@jiujiu/shared/utils'
import Icon from '../icon/icon.vue'

const props = withDefaults(
  defineProps<{
    image: string
    title: string
    priceRetail?: number
    priceVisible?: boolean
    sales?: number
    tag?: string
    /** 高度变化（瀑布流） */
    imgHeight?: number
    badge?: string
  }>(),
  {
    priceRetail: 0,
    priceVisible: true,
    sales: 0,
    tag: '',
    imgHeight: 320,
    badge: '',
  },
)

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'add'): void
}>()

const heightPx = computed(() => `${props.imgHeight}rpx`)
</script>

<template>
  <view class="pc-card" @click="emit('click')">
    <view class="pc-img" :style="{ height: heightPx }">
      <image :src="image" mode="aspectFill" class="img" />
      <view v-if="badge" class="badge">{{ badge }}</view>
    </view>
    <view class="pc-info">
      <text class="title">{{ title }}</text>
      <view class="row">
        <text v-if="priceVisible" class="price">¥ {{ formatPrice(priceRetail) }}</text>
        <view v-else class="price-locked">
          <Icon name="lock" :size="20" color="var(--text-tertiary)" />
          <text class="lock-text">登录可见</text>
        </view>
        <view class="add-btn" @click.stop="emit('add')">
          <Icon name="plus" :size="24" color="#fff" />
        </view>
      </view>
      <text v-if="sales > 0" class="sales">已售 {{ sales }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pc-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
  break-inside: avoid;
  margin-bottom: 16rpx;
}
.pc-img {
  position: relative;
  background: var(--bg-page);
  .img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .badge {
    position: absolute;
    top: 12rpx;
    left: 12rpx;
    padding: 4rpx 12rpx;
    background: $brand-gradient;
    color: #fff;
    font-size: 18rpx;
    border-radius: 999rpx;
    font-weight: 600;
  }
}
.pc-info {
  padding: 12rpx 16rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .title {
    font-size: 26rpx;
    color: var(--text-primary);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4rpx;
  }
  .price {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: $font-family-base;
  }
  .price-locked {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 12rpx;
    background: var(--bg-hover);
    border-radius: 999rpx;
    .lock-text {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
  .add-btn {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: $brand-gradient;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
  .sales {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
</style>
