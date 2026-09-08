<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    tone?: 'primary' | 'accent' | 'plain' | 'soft' | 'pop' | 'gold'
    size?: 'sm' | 'md'
    selected?: boolean
  }>(),
  {
    text: '',
    tone: 'plain',
    size: 'md',
    selected: false,
  },
)
</script>

<template>
  <view :class="['tag-chip', `tone-${tone}`, `size-${size}`, selected ? 'is-selected' : '']">
    <slot>{{ text }}</slot>
  </view>
</template>

<style lang="scss" scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999rpx;
  border: 1rpx solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  &.size-sm {
    padding: 4rpx 12rpx;
    font-size: 20rpx;
  }
  &.size-md {
    padding: 8rpx 20rpx;
    font-size: 24rpx;
  }
  &.tone-primary,
  &.is-selected {
    border-color: var(--brand-primary);
    background: rgba(255, 77, 45, 0.08);
    color: var(--brand-primary);
  }
  &.tone-accent {
    background: $brand-gradient;
    border-color: transparent;
    color: #fff;
  }
  &.tone-soft {
    background: var(--bg-hover);
    border-color: transparent;
    color: var(--text-secondary);
  }
  &.tone-pop {
    border-color: #ffd89b;
    background: linear-gradient(90deg, #fff4e5, #ffe4c7);
    color: #b25900;
  }
  &.tone-gold {
    background: linear-gradient(135deg, #ffd89b, #ffb300);
    border-color: transparent;
    color: #5c2d00;
  }
}
</style>
