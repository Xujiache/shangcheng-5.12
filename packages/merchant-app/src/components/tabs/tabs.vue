<script setup lang="ts">
/**
 * 通用 Tab 组件（暖橙下划线）
 * - 支持 capsule / underline 两种风格
 */
interface TabItem {
  key: string
  label: string
  /** 数量徽章 */
  badge?: number
}

withDefaults(
  defineProps<{
    items: TabItem[]
    modelValue: string
    variant?: 'underline' | 'capsule'
    fill?: boolean
  }>(),
  {
    variant: 'underline',
    fill: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

function pick(key: string) {
  emit('update:modelValue', key)
  emit('change', key)
}
</script>

<template>
  <view :class="['tabs', `variant-${variant}`, fill ? 'fill' : '']">
    <view
      v-for="it in items"
      :key="it.key"
      :class="['tab', { active: modelValue === it.key }]"
      @click="pick(it.key)"
    >
      <text class="tab-text">{{ it.label }}</text>
      <text v-if="it.badge && it.badge > 0" class="tab-badge">{{ it.badge > 99 ? '99+' : it.badge }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tabs {
  display: flex;
  gap: 8rpx;
  &.fill { width: 100%; }
  &.fill .tab { flex: 1; justify-content: center; }

  .tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 16rpx 24rpx;
    .tab-text {
      font-size: 26rpx;
      color: var(--text-secondary);
    }
    .tab-badge {
      min-width: 28rpx;
      height: 28rpx;
      padding: 0 8rpx;
      border-radius: 999rpx;
      background: var(--status-error);
      color: #fff;
      font-size: 18rpx;
      text-align: center;
      line-height: 28rpx;
    }
  }

  &.variant-underline .tab.active {
    .tab-text {
      color: var(--brand-primary);
      font-weight: 700;
    }
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 40rpx;
      height: 4rpx;
      border-radius: 2rpx;
      background: var(--brand-primary);
    }
  }
  &.variant-capsule .tab {
    border-radius: 999rpx;
    background: var(--bg-hover);
    &.active {
      background: var(--brand-primary);
      .tab-text { color: #fff; font-weight: 700; }
    }
  }
}
</style>
