<script setup lang="ts">
/**
 * 环形图（canvas 实现）
 *
 * 之前用 SVG <circle stroke-dasharray>，在 App-plus 不渲染。
 * 改成 canvas 绘弧（ctx.arc），三端表现一致。
 */
import { computed, onMounted, watch, getCurrentInstance, nextTick } from 'vue'

interface Segment { label: string; value: number; color: string }

const props = withDefaults(
  defineProps<{
    segments: Segment[]
    size?: number
    centerLabel?: string
    centerValue?: string
    hideLegend?: boolean
  }>(),
  {
    size: 220,
    centerLabel: '',
    centerValue: '',
    hideLegend: false,
  },
)

const canvasId = 'dc-' + Math.random().toString(36).slice(2, 9)
const inst = getCurrentInstance()

const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0) || 1)
const sizePx = computed(() => Math.round(props.size / 2)) // rpx → px 粗略换算（750-design width 通常 1rpx≈0.5px）

const arcs = computed(() => {
  let acc = 0
  return props.segments.map((seg) => {
    const ratio = seg.value / total.value
    const out = {
      ...seg,
      start: acc,
      end: acc + ratio,
      percent: Math.round(ratio * 100),
    }
    acc += ratio
    return out
  })
})

function draw() {
  const ctx = uni.createCanvasContext(canvasId, inst as any)
  const px = sizePx.value
  const cx = px / 2
  const cy = px / 2
  const r = px / 2 - 12
  const lineW = Math.max(10, Math.round(px * 0.12))

  ctx.clearRect(0, 0, px, px)
  // 底环
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.setStrokeStyle('#F0F1F5')
  ctx.setLineWidth(lineW)
  ctx.stroke()

  // 各段
  for (const a of arcs.value) {
    if (a.end - a.start <= 0) continue
    ctx.beginPath()
    ctx.arc(
      cx,
      cy,
      r,
      -Math.PI / 2 + a.start * Math.PI * 2,
      -Math.PI / 2 + a.end * Math.PI * 2,
    )
    ctx.setStrokeStyle(a.color)
    ctx.setLineWidth(lineW)
    ctx.setLineCap('butt')
    ctx.stroke()
  }
  ctx.draw()
}

async function refresh() {
  await nextTick()
  draw()
}

onMounted(refresh)
watch(() => props.segments, refresh, { deep: true })
</script>

<template>
  <view class="donut" :style="{ width: size + 'rpx' }">
    <view class="ring-wrap" :style="{ width: size + 'rpx', height: size + 'rpx' }">
      <canvas
        :canvas-id="canvasId"
        :id="canvasId"
        :style="{ width: sizePx + 'px', height: sizePx + 'px' }"
      />
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
