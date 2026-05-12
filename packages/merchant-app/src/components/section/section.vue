<script setup lang="ts">
/**
 * 卡片式分区容器（标题 + 内容）
 */
import Icon from '../icon/icon.vue'

withDefaults(
  defineProps<{
    title?: string
    action?: string
    sub?: string
    flush?: boolean
  }>(),
  {
    title: '',
    action: '',
    sub: '',
    flush: false,
  },
)

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <view :class="['section', flush ? 'flush' : '']">
    <view v-if="title" class="section-head">
      <view class="title-wrap">
        <text class="title">{{ title }}</text>
        <text v-if="sub" class="sub">{{ sub }}</text>
      </view>
      <view v-if="action" class="action" @click="emit('action')">
        <text class="action-text">{{ action }}</text>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
    </view>
    <view :class="['section-body', flush ? '' : 'padded']">
      <slot />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.section {
  background: var(--bg-card);
  border-radius: 16rpx;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  &.flush { background: transparent; box-shadow: none; }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 24rpx 16rpx;
    .title-wrap {
      display: flex;
      align-items: baseline;
      gap: 12rpx;
      .title {
        font-size: 28rpx;
        font-weight: 700;
        color: var(--text-primary);
      }
      .sub {
        font-size: 22rpx;
        color: var(--text-tertiary);
      }
    }
    .action {
      display: flex;
      align-items: center;
      gap: 4rpx;
      .action-text {
        font-size: 22rpx;
        color: var(--text-tertiary);
      }
      .arrow {
        font-size: 22rpx;
        color: var(--text-tertiary);
      }
    }
  }
  .section-body.padded {
    padding: 0 24rpx 24rpx;
  }
}
</style>
