<script setup lang="ts">
/**
 * 状态标签：订单状态 / 审核状态 / 会员状态 / 通用
 */
withDefaults(
  defineProps<{
    text: string
    /** primary / success / warning / error / info / default */
    tone?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' | 'highlight'
    size?: 'sm' | 'md'
    fill?: boolean
  }>(),
  {
    tone: 'default',
    size: 'sm',
    fill: false,
  },
)
</script>

<template>
  <view :class="['tag', `tone-${tone}`, `size-${size}`, fill ? 'fill' : 'ghost']">
    <text class="tag-text">{{ text }}</text>
  </view>
</template>

<style lang="scss" scoped>
.tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999rpx;
  padding: 0 12rpx;
  border: 1rpx solid transparent;
  white-space: nowrap;

  &.size-sm {
    height: 32rpx;
    .tag-text { font-size: 20rpx; line-height: 1; }
  }
  &.size-md {
    height: 40rpx;
    padding: 0 16rpx;
    .tag-text { font-size: 22rpx; line-height: 1; }
  }

  &.tone-primary { &.fill { background: var(--brand-primary); .tag-text { color: #fff; } } &.ghost { background: var(--brand-primary-ghost); border-color: var(--brand-primary); .tag-text { color: var(--brand-primary); } } }
  &.tone-success { &.fill { background: var(--status-success); .tag-text { color: #fff; } } &.ghost { background: var(--status-success-bg); border-color: var(--status-success); .tag-text { color: var(--status-success); } } }
  &.tone-warning { &.fill { background: var(--status-warning); .tag-text { color: #fff; } } &.ghost { background: var(--status-warning-bg); border-color: var(--status-warning); .tag-text { color: var(--status-warning); } } }
  &.tone-error { &.fill { background: var(--status-error); .tag-text { color: #fff; } } &.ghost { background: var(--status-error-bg); border-color: var(--status-error); .tag-text { color: var(--status-error); } } }
  &.tone-info { &.fill { background: var(--status-info); .tag-text { color: #fff; } } &.ghost { background: var(--status-info-bg); border-color: var(--status-info); .tag-text { color: var(--status-info); } } }
  &.tone-highlight { &.fill { background: var(--status-highlight); .tag-text { color: var(--text-primary); } } &.ghost { background: var(--status-highlight-bg); border-color: var(--status-highlight); .tag-text { color: var(--text-primary); } } }
  &.tone-default { &.fill { background: var(--bg-hover); .tag-text { color: var(--text-secondary); } } &.ghost { background: var(--bg-card); border-color: var(--border-default); .tag-text { color: var(--text-secondary); } } }
}
</style>
