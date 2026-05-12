<script setup lang="ts">
/**
 * 数据指标卡片
 */
withDefaults(
  defineProps<{
    label: string
    value: string | number
    delta?: string | number
    /** 趋势 */
    trend?: 'up' | 'down' | 'flat'
    accent?: boolean
  }>(),
  {
    delta: '',
    trend: 'up',
    accent: false,
  },
)
</script>

<template>
  <view :class="['stat-card', accent ? 'accent' : '']">
    <text class="label">{{ label }}</text>
    <text class="value">{{ value }}</text>
    <view v-if="delta !== ''" class="delta" :class="`trend-${trend}`">
      <text class="arrow">{{ trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—' }}</text>
      <text class="delta-value">{{ delta }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.stat-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-shadow: var(--shadow-sm);
  flex: 1;
  min-width: 0;

  &.accent {
    background: var(--brand-gradient);
    .label { color: rgba(255,255,255,0.85); }
    .value { color: #fff; }
    .delta { color: rgba(255,255,255,0.9); }
  }

  .label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .value {
    margin-top: 8rpx;
    font-size: 40rpx;
    font-weight: 700;
    color: var(--brand-primary);
    line-height: 1.2;
    font-family: var(--font-family-base);
  }
  .delta {
    margin-top: 8rpx;
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 20rpx;
    &.trend-up { color: var(--status-success); }
    &.trend-down { color: var(--status-error); }
    &.trend-flat { color: var(--text-tertiary); }
    .arrow { font-size: 22rpx; }
  }
}
</style>
