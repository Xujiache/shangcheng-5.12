<script setup lang="ts">
/**
 * 折线图（SVG，无外部依赖）
 * - 支持渐变填充
 * - 自动 X 轴 label / Y 轴最大值
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    data: number[]
    labels?: string[]
    height?: number
    color?: string
    fillColor?: string
    /** 仅显示首末/最大点的标签，避免 X 轴拥挤 */
    sparseLabels?: boolean
  }>(),
  {
    labels: () => [],
    height: 240,
    color: '#FF4D2D',
    fillColor: 'rgba(255,77,45,0.18)',
    sparseLabels: true,
  },
)

const W = 600
const H = 200
const PAD_X = 24
const PAD_Y = 24

const max = computed(() => Math.max(...props.data, 1))
const min = computed(() => Math.min(...props.data, 0))

const points = computed(() => {
  if (props.data.length === 0) return [] as Array<{ x: number; y: number; v: number }>
  const range = Math.max(max.value - min.value, 1)
  const stepX = (W - PAD_X * 2) / Math.max(props.data.length - 1, 1)
  return props.data.map((v, i) => ({
    x: PAD_X + i * stepX,
    y: H - PAD_Y - ((v - min.value) / range) * (H - PAD_Y * 2),
    v,
  }))
})

const linePath = computed(() => points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '))
const fillPath = computed(() => {
  if (points.value.length === 0) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L${last.x},${H - PAD_Y} L${first.x},${H - PAD_Y} Z`
})

const maxIdx = computed(() => props.data.indexOf(max.value))

const displayLabels = computed(() => {
  if (!props.sparseLabels) return props.labels
  const n = props.labels.length
  if (n <= 7) return props.labels
  // 仅展示首 / 中 / 末 + 最大点
  return props.labels.map((l, i) => {
    if (i === 0 || i === n - 1 || i === Math.floor(n / 2) || i === maxIdx.value) return l
    return ''
  })
})
</script>

<template>
  <view class="line-chart" :style="{ height: height + 'rpx' }">
    <view class="svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" width="100%" :height="height / 2">
        <defs>
          <linearGradient :id="`lc-grad-${color}`" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" :stop-color="fillColor" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path :d="fillPath" :fill="`url(#lc-grad-${color})`" stroke="none" />
        <path :d="linePath" :stroke="color" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
        <circle
          v-for="(p, i) in points"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          :r="i === maxIdx ? 5 : 0"
          :fill="color"
          stroke="#fff"
          stroke-width="2"
        />
        <text
          v-if="points.length"
          :x="points[maxIdx].x"
          :y="points[maxIdx].y - 10"
          font-size="14"
          text-anchor="middle"
          :fill="color"
          font-weight="700"
        >
          {{ data[maxIdx] }}
        </text>
      </svg>
    </view>
    <view v-if="displayLabels.length" class="labels">
      <text v-for="(l, i) in displayLabels" :key="i" class="label">{{ l }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.line-chart {
  display: flex;
  flex-direction: column;
  .svg-wrap {
    flex: 1;
    width: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
  }
  .labels {
    display: flex;
    margin-top: 8rpx;
    padding: 0 12rpx;
    .label {
      flex: 1;
      text-align: center;
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
}
</style>
