<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    desc?: string
    icon?: string
  }>(),
  {
    title: '暂无数据',
    desc: '',
    icon: 'package',
  },
)
</script>

<template>
  <view class="empty-state">
    <view class="icon-wrap">
      <wd-icon :name="$jwIcon(icon)" size="48px" color="var(--text-tertiary)" />
    </view>
    <text class="title">{{ title }}</text>
    <text v-if="desc" class="desc">{{ desc }}</text>
  </view>
</template>

<style lang="scss" scoped>
.empty-state {
  padding: 96rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  .icon-wrap {
    opacity: 0.4;
  }
  .title {
    margin-top: 24rpx;
    font-size: 28rpx;
    color: var(--text-secondary);
  }
  .desc {
    margin-top: 12rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
</style>
