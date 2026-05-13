<script setup lang="ts">
/**
 * 折线图（canvas 实现）
 *
 * 历史背景：早期版本用内联 <svg>，在 H5 可渲染但 App-plus 的 webview 解析后
 * 不会调用 createElementNS，导致 svg/path/circle 一律变成空元素 → 图表空白。
 * 改成 <canvas> + uni.createCanvasContext 后三端（H5 / App / MP）一致。
 */
import { computed, onMounted, watch, getCurrentInstance, ref, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    data: number[]
    labels?: string[]
    height?: number
    color?: string
    fillColor?: string
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

const canvasId = 'lc-' + Math.random().toString(36).slice(2, 9)
const inst = getCurrentInstance()
const canvasWidthPx = ref(300)
const canvasHeightPx = computed(() => props.height / 2)

const max = computed(() => Math.max(...props.data, 1))
const min = computed(() => Math.min(...props.data, 0))
const maxIdx = computed(() => props.data.indexOf(max.value))

const displayLabels = computed(() => {
  if (!props.sparseLabels) return props.labels
  const n = props.labels.length
  if (n <= 7) return props.labels
  return props.labels.map((l, i) => {
    if (i === 0 || i === n - 1 || i === Math.floor(n / 2) || i === maxIdx.value) return l
    return ''
  })
})

function measure(): Promise<number> {
  return new Promise((resolve) => {
    try {
      const q = uni.createSelectorQuery().in(inst as any)
      q.select('#wrap-' + canvasId).boundingClientRect((r: any) => {
        if (r && r.width) resolve(r.width)
        else resolve(canvasWidthPx.value)
      }).exec()
    } catch {
      resolve(canvasWidthPx.value)
    }
  })
}

function draw() {
  if (!props.data.length) return
  const ctx = uni.createCanvasContext(canvasId, inst as any)
  const W = canvasWidthPx.value
  const H = canvasHeightPx.value
  const PAD_X = 12
  const PAD_Y = 16

  ctx.clearRect(0, 0, W, H)
  const range = Math.max(max.value - min.value, 1)
  const stepX = (W - PAD_X * 2) / Math.max(props.data.length - 1, 1)
  const points = props.data.map((v, i) => ({
    x: PAD_X + i * stepX,
    y: H - PAD_Y - ((v - min.value) / range) * (H - PAD_Y * 2),
    v,
  }))

  // 填充渐变
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, props.fillColor)
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.lineTo(points[points.length - 1].x, H - PAD_Y)
  ctx.lineTo(points[0].x, H - PAD_Y)
  ctx.closePath()
  ctx.setFillStyle(grad as any)
  ctx.fill()

  // 折线
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.setStrokeStyle(props.color)
  ctx.setLineWidth(2)
  ctx.setLineJoin('round')
  ctx.setLineCap('round')
  ctx.stroke()

  // 最高点圆 + 数值
  if (maxIdx.value >= 0) {
    const p = points[maxIdx.value]
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.setFillStyle(props.color)
    ctx.fill()
    ctx.setStrokeStyle('#fff')
    ctx.setLineWidth(2)
    ctx.stroke()
    ctx.setFillStyle(props.color)
    ctx.setFontSize(11)
    ctx.setTextAlign('center')
    ctx.fillText(String(props.data[maxIdx.value]), p.x, p.y - 8)
  }

  ctx.draw()
}

async function refresh() {
  await nextTick()
  const w = await measure()
  if (w > 0) canvasWidthPx.value = Math.floor(w)
  draw()
}

onMounted(refresh)
watch(() => props.data, refresh, { deep: true })
</script>

<template>
  <view class="line-chart" :style="{ height: height + 'rpx' }">
    <view :id="'wrap-' + canvasId" class="canvas-wrap" :style="{ height: canvasHeightPx + 'px' }">
      <canvas
        :canvas-id="canvasId"
        :id="canvasId"
        :style="{ width: canvasWidthPx + 'px', height: canvasHeightPx + 'px' }"
      />
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
}
.canvas-wrap {
  width: 100%;
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
</style>
