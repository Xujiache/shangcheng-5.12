<script setup lang="ts">
/**
 * 环形图（SVG）
 * - props.segments: [{label, value, color}]
 * - 中心展示主指标
 * - props.hideLegend: 隐藏内置图例（外部自行渲染时设 true）
 */
import { computed } from 'vue'

interface Segment {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    segments: Segment[]
    size?: number
    /** 中央主指标 */
    centerLabel?: string
    centerValue?: string
    /** 是否隐藏内置 legend（默认 false 显示） */
    hideLegend?: boolean
  }>(),
  {
    size: 220,
    centerLabel: '',
    centerValue: '',
    hideLegend: false,
  },
)

const R = 45
const C = 2 * Math.PI * R

const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0) || 1)

const arcs = computed(() => {
  let offset = 0
  return props.segments.map((seg) => {
    const ratio = seg.value / total.value
    const len = ratio * C
    const arc = {
      ...seg,
      dasharray: `${len} ${C - len}`,
      dashoffset: -offset,
      percent: Math.round(ratio * 100),
    }
    offset += len
    return arc
  })
})

/** 圆环 SVG 区块尺寸（与容器同宽，避免 svg 默认按属性 px 折半） */
const svgStyle = computed(() => ({
  width: props.size + 'rpx',
  height: props.size + 'rpx',
  transform: 'rotate(-90deg)',
}))
const containerStyle = computed(() => ({
  width: props.size + 'rpx',
}))
</script>

<template>
  <view class="donut" :style="containerStyle">
    <view class="ring-wrap" :style="{ width: size + 'rpx', height: size + 'rpx' }">
      <svg viewBox="0 0 120 120" :style="svgStyle">
        <circle cx="60" cy="60" :r="R" fill="none" stroke="#F0F1F5" stroke-width="14" />
        <circle
          v-for="(a, i) in arcs"
          :key="i"
          cx="60"
          cy="60"
          :r="R"
          fill="none"
          :stroke="a.color"
          stroke-width="14"
          :stroke-dasharray="a.dasharray"
          :stroke-dashoffset="a.dashoffset"
          stroke-linecap="butt"
        />
      </svg>
      <view v-if="centerLabel || centerValue" class="center">
        <text v-if="centerLabel" class="center-label">{{ centerLabel }}</text>
        <text v-if="centerValue" class="center-value">{{ centerValue }}</text>
      </view>
    </view>
    <view v-if="!hideLegend" class="legend">
      <view v-for="a in arcs" :key="a.label" class="legend-item">
        <view class="dot" :style="{ background: a.color }" />
        <text class="legend-text">{{ a.label }}</text>
        <text class="legend-pct">{{ a.percent }}%</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.donut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.ring-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg {
    display: block;
  }
}
.center {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  text-align: center;
  pointer-events: none;
  .center-label {
    display: block;
    font-size: 20rpx;
    color: var(--text-tertiary);
    margin-bottom: 2rpx;
  }
  .center-value {
    display: block;
    font-size: 32rpx;
    font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-family-base);
    line-height: 1;
  }
}
.legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 4rpx;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-text {
    flex: 1;
    font-size: 22rpx;
    color: var(--text-secondary);
  }
  .legend-pct {
    font-size: 22rpx;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
}
</style>
