<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    desc?: string
    action?: string
    sticky?: boolean
  }>(),
  {
    title: '',
    desc: '',
    action: '',
    sticky: false,
  },
)
const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <view :class="['section', sticky ? 'sticky' : '']">
    <view v-if="title || action" class="section-head">
      <view class="head-left">
        <text class="title">{{ title }}</text>
        <text v-if="desc" class="desc">{{ desc }}</text>
      </view>
      <text v-if="action" class="action" @click="emit('action')">{{ action }} ›</text>
    </view>
    <view class="section-body">
      <slot />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.section {
  background: var(--bg-card);
  margin: 16rpx 0;
  &.sticky {
    position: sticky;
    top: 88rpx;
    z-index: 8;
  }
}
.section-head {
  padding: 24rpx 32rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .head-left { display: flex; flex-direction: column; gap: 4rpx; }
  .title { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
  .desc { font-size: 22rpx; color: var(--text-tertiary); }
  .action {
    font-size: 24rpx;
    color: var(--brand-primary);
    padding: 6rpx;
  }
}
.section-body { padding: 8rpx 32rpx 24rpx; }
</style>
