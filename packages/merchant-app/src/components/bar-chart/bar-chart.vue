<script setup lang="ts">
/**
 * 简易柱状图（无需引入图表库）
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    data: number[]
    labels?: string[]
    /** 高亮某一列 */
    highlightIndex?: number
    height?: number
    color?: string
    accentColor?: string
  }>(),
  {
    labels: () => [],
    highlightIndex: -1,
    height: 120,
    color: 'var(--bg-active)',
    accentColor: 'var(--brand-primary)',
  },
)

const max = computed(() => Math.max(...props.data, 1))
</script>

<template>
  <view class="bar-chart" :style="{ height: height + 'rpx' }">
    <view class="bars">
      <view
        v-for="(v, i) in data"
        :key="i"
        class="bar"
        :style="{
          height: ((v / max) * 100) + '%',
          background: i === highlightIndex ? accentColor : color,
        }"
      >
        <view class="bar-value">{{ v }}</view>
      </view>
    </view>
    <view v-if="labels.length" class="labels">
      <text v-for="(l, i) in labels" :key="i" class="label">{{ l }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bar-chart {
  display: flex;
  flex-direction: column;
  .bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 12rpx;
    padding: 8rpx 0;
  }
  .bar {
    flex: 1;
    min-height: 8rpx;
    border-radius: 8rpx 8rpx 0 0;
    position: relative;
    transition: height 0.3s;
    .bar-value {
      position: absolute;
      top: -28rpx;
      left: 50%;
      transform: translateX(-50%);
      font-size: 18rpx;
      color: var(--text-tertiary);
      opacity: 0;
      transition: opacity 0.2s;
    }
    &:hover .bar-value { opacity: 1; }
  }
  .labels {
    display: flex;
    margin-top: 8rpx;
    .label {
      flex: 1;
      text-align: center;
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
}
</style>
