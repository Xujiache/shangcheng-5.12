<script setup lang="ts">
/**
 * 法律协议底部弹层（用户端）
 *
 * - 一组 type='user'|'privacy'|'collect'，按需 lazy-load /api/v1/u/agreements
 * - 内容来自后端（管理员可编辑），首次加载后会被本地缓存
 * - 滚动区域使用 scroll-view，方便在 mp-weixin / H5 / App 全端工作
 * - Markdown-lite 渲染：# / ## / ### / - / 表格 / 段落
 */
import { computed, ref, watch } from 'vue'
import { http } from '../../utils/request'
import Icon from '../icon/icon.vue'

type Kind = 'user' | 'privacy' | 'collect'

interface Section {
  title: string
  updatedAt: string
  body: string
}
interface AgreementSet {
  user: Section
  privacy: Section
  collect: Section
}

const props = defineProps<{ open: boolean; type: Kind }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const KIND_LABEL: Record<Kind, string> = {
  user: '用户协议',
  privacy: '隐私政策',
  collect: '信息收集清单',
}

const data = ref<AgreementSet | null>(null)
const loading = ref(false)
const error = ref('')

async function ensureLoaded() {
  if (data.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    data.value = await http.get<AgreementSet>('/api/v1/u/agreements', undefined, { silent: true })
  } catch (e: any) {
    error.value = e?.message || '加载失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) ensureLoaded()
  },
  { immediate: true },
)

const current = computed<Section | null>(() => (data.value ? data.value[props.type] : null))

interface Block {
  kind: 'h1' | 'h2' | 'h3' | 'li' | 'p' | 'tableRow' | 'tableSeparator' | 'tableHeader' | 'quote'
  text: string
  cells?: string[]
}

const blocks = computed<Block[]>(() => {
  const raw = current.value?.body ?? ''
  if (!raw) return []
  const lines = raw.split(/\r?\n/)
  const out: Block[] = []
  let inTable = false
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      inTable = false
      continue
    }
    if (t.startsWith('# ')) {
      out.push({ kind: 'h1', text: t.slice(2) })
      inTable = false
      continue
    }
    if (t.startsWith('## ')) {
      out.push({ kind: 'h2', text: t.slice(3) })
      inTable = false
      continue
    }
    if (t.startsWith('### ')) {
      out.push({ kind: 'h3', text: t.slice(4) })
      inTable = false
      continue
    }
    if (t.startsWith('- ')) {
      out.push({ kind: 'li', text: t.slice(2) })
      inTable = false
      continue
    }
    if (t.startsWith('> ')) {
      out.push({ kind: 'quote', text: t.slice(2) })
      inTable = false
      continue
    }
    if (t.startsWith('|') && t.endsWith('|')) {
      const cells = t
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
      const isSep = cells.every((c) => /^-{2,}$/.test(c) || /^:?-+:?$/.test(c))
      if (isSep) {
        out.push({ kind: 'tableSeparator', text: '' })
        // 上一行如果是 tableRow，重写为表头
        for (let i = out.length - 2; i >= 0; i--) {
          if (out[i].kind === 'tableRow') {
            out[i].kind = 'tableHeader'
            break
          }
          if (out[i].kind !== 'tableSeparator') break
        }
        inTable = true
        continue
      }
      out.push({ kind: inTable ? 'tableRow' : 'tableRow', text: t, cells })
      inTable = true
      continue
    }
    out.push({ kind: 'p', text: t })
    inTable = false
  }
  return out
})

function close() {
  emit('close')
}
</script>

<template>
  <view v-if="open" class="mask" @click="close">
    <view class="sheet" @click.stop>
      <view class="handle" />
      <view class="head">
        <text class="title">{{ current?.title || KIND_LABEL[type] }}</text>
        <view class="close" @click="close">
          <Icon name="close" :size="32" color="#909399" />
        </view>
      </view>
      <text v-if="current?.updatedAt" class="updated">最近更新：{{ current.updatedAt }}</text>

      <scroll-view scroll-y class="scroll" :style="{ maxHeight: 'calc(86vh - 280rpx)' }">
        <view v-if="loading" class="status-row">加载中…</view>
        <view v-else-if="error" class="status-row error">{{ error }}</view>
        <view v-else class="body">
          <template v-for="(b, i) in blocks" :key="i">
            <text v-if="b.kind === 'h1'" class="h1">{{ b.text }}</text>
            <text v-else-if="b.kind === 'h2'" class="h2">{{ b.text }}</text>
            <text v-else-if="b.kind === 'h3'" class="h3">{{ b.text }}</text>
            <view v-else-if="b.kind === 'li'" class="li">
              <view class="bullet" />
              <text class="li-text">{{ b.text }}</text>
            </view>
            <view v-else-if="b.kind === 'quote'" class="quote">
              <text>{{ b.text }}</text>
            </view>
            <view v-else-if="b.kind === 'tableHeader'" class="tr th">
              <text v-for="(c, k) in b.cells || []" :key="k" class="td">{{ c }}</text>
            </view>
            <view v-else-if="b.kind === 'tableRow'" class="tr">
              <text v-for="(c, k) in b.cells || []" :key="k" class="td">{{ c }}</text>
            </view>
            <view v-else-if="b.kind === 'tableSeparator'" class="table-sep" />
            <text v-else class="p">{{ b.text }}</text>
          </template>
        </view>
      </scroll-view>

      <view class="footer">
        <view class="btn-close" @click="close">我已知悉</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  animation: fade-in 0.18s ease-out;
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  max-height: 86vh;
  /* 关键修复：用 flex + 子元素 min-height:0；同时 scroll-view 自带内联 max-height 兜底，
     避免 mp-weixin / App 打包后 flex:1+height:0 计算失败导致 scroll-view 高度为 0 无法滑动 */
  display: flex;
  flex-direction: column;
  min-height: 0;
  animation: slide-up 0.24s ease-out;
}
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.handle {
  margin: 16rpx auto 8rpx;
  width: 76rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #ececec;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx 4rpx;
  .title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1d2129;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .close {
    padding: 8rpx;
  }
}
.updated {
  display: block;
  padding: 0 32rpx 12rpx;
  font-size: 22rpx;
  color: #86909c;
}
.scroll {
  flex: 1 1 auto;
  min-height: 0;
  /* 兜底：scroll-view 模板上还有内联 max-height: calc(86vh - 280rpx)，
     即便 flex min-height:0 在某些端不生效，也能保证有可视高度可滚动 */
  padding: 0 32rpx 16rpx;
  box-sizing: border-box;
}
.status-row {
  padding: 80rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #86909c;
  &.error {
    color: #f53f3f;
  }
}
.body {
  padding-bottom: 32rpx;
}
.h1 {
  display: block;
  font-size: 36rpx;
  font-weight: 900;
  color: #1d2129;
  margin: 24rpx 0 12rpx;
  letter-spacing: 1rpx;
}
.h2 {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #ff4d2d;
  margin: 28rpx 0 10rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #ff4d2d;
}
.h3 {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1d2129;
  margin: 20rpx 0 8rpx;
}
.p {
  display: block;
  font-size: 26rpx;
  line-height: 1.8;
  color: #4e5969;
  margin: 8rpx 0;
}
.li {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 6rpx 0 6rpx 8rpx;
  .bullet {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background: #ff4d2d;
    margin-top: 14rpx;
    flex-shrink: 0;
  }
  .li-text {
    flex: 1;
    font-size: 26rpx;
    line-height: 1.7;
    color: #4e5969;
  }
}
.quote {
  margin: 16rpx 0;
  padding: 16rpx 20rpx;
  background: #fff8f5;
  border-left: 6rpx solid #ff4d2d;
  border-radius: 0 16rpx 16rpx 0;
  text {
    font-size: 24rpx;
    color: #86909c;
    line-height: 1.7;
  }
}
.tr {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 8rpx;
  border-bottom: 1rpx solid #f2f3f5;
  .td {
    flex: 1;
    font-size: 22rpx;
    color: #4e5969;
    line-height: 1.5;
    word-break: break-all;
  }
}
.th {
  background: #fafbfc;
  border-radius: 12rpx 12rpx 0 0;
  .td {
    font-weight: 700;
    color: #1d2129;
  }
}
.table-sep {
  display: none;
}
.footer {
  padding: 16rpx 32rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f2f3f5;
}
.btn-close {
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 24rpx;
  letter-spacing: 4rpx;
  box-shadow: 0 10rpx 24rpx rgba(255, 77, 45, 0.32);
  &:active {
    transform: scale(0.98);
  }
}
</style>
