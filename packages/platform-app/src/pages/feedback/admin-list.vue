<script setup lang="ts">
/**
 * PA · 反馈队列(运营查看)
 *
 * 后端 PlatformController:
 *   GET /api/v1/p/feedback?type=&status=&page=&pageSize=
 *
 * 内容来源:用户/管理员通过 `pages/feedback/index.vue` 表单提交的反馈记录,
 * 后端 SystemConfig key='feedback:<id>' 落库。本页提供按 类型 / 状态 分类筛选浏览。
 *
 * 严格按"零假数据"原则:接口失败显示空态 + 重试,不渲染任何默认/演示数据。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  feedbackService,
  type FeedbackDto,
  type FeedbackRow,
  type FeedbackStatus,
} from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TypeFilter = FeedbackDto['type'] | 'all'
type StatusFilter = FeedbackStatus | 'all'

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'suggestion', label: '功能建议' },
  { key: 'bug', label: 'Bug' },
  { key: 'experience', label: '体验' },
  { key: 'other', label: '其他' },
]

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部状态' },
  { key: 'open', label: '待处理' },
  { key: 'handling', label: '处理中' },
  { key: 'closed', label: '已关闭' },
]

const TYPE_META: Record<FeedbackDto['type'], { label: string; tint: string; icon: string }> = {
  suggestion: { label: '功能建议', tint: '#1296DB', icon: 'sparkles' },
  bug: { label: 'Bug 反馈', tint: '#FF3B30', icon: 'info' },
  experience: { label: '体验问题', tint: '#FF7A45', icon: 'heart' },
  other: { label: '其他', tint: '#86909C', icon: 'message' },
}

const STATUS_META: Record<FeedbackStatus, { label: string; tint: string }> = {
  open: { label: '待处理', tint: '#FF4D2D' },
  handling: { label: '处理中', tint: '#FAAD14' },
  closed: { label: '已关闭', tint: '#86909C' },
}

const typeFilter = ref<TypeFilter>('all')
const statusFilter = ref<StatusFilter>('all')
const list = ref<FeedbackRow[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const res = await feedbackService.list({
      type: typeFilter.value,
      status: statusFilter.value,
      page: 1,
      pageSize: 50,
    })
    list.value = res?.list ?? []
    total.value = res?.total ?? 0
  } catch (e) {
    console.error('feedbackService.list failed', e)
    list.value = []
    total.value = 0
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function onTypeChange(k: TypeFilter) {
  if (typeFilter.value === k) return
  typeFilter.value = k
  load()
}

function onStatusChange(k: StatusFilter) {
  if (statusFilter.value === k) return
  statusFilter.value = k
  load()
}

function relTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function openDetail(item: FeedbackRow) {
  const contactLine = item.contact ? `\n联系方式: ${item.contact}` : ''
  const imgLine = item.images && item.images.length ? `\n截图: ${item.images.length} 张` : ''
  uni.showModal({
    title: `${TYPE_META[item.type]?.label || item.type} · ${STATUS_META[item.status]?.label || item.status}`,
    content: `${item.content}${contactLine}${imgLine}\n\n提交时间: ${new Date(item.createdAt).toLocaleString()}`,
    showCancel: false,
    confirmText: '关闭',
  })
}

function previewImages(item: FeedbackRow, idx = 0) {
  if (!item.images || item.images.length === 0) return
  uni.previewImage({
    urls: item.images,
    current: item.images[idx],
  })
}

const headerSummary = computed(() => {
  const openCount = list.value.filter((f) => f.status === 'open').length
  return `共 ${total.value} 条 · 待处理 ${openCount}`
})

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <NavBar title="反馈队列" />

    <!-- 类型 tab -->
    <scroll-view scroll-x class="type-scroll" :show-scrollbar="false">
      <view class="type-tabs">
        <view
          v-for="t in TYPE_TABS"
          :key="t.key"
          :class="['type-tab', typeFilter === t.key ? 'active' : '']"
          @click="onTypeChange(t.key)"
        >
          <text>{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 状态 tab -->
    <view class="status-tabs">
      <view
        v-for="s in STATUS_TABS"
        :key="s.key"
        :class="['status-tab', statusFilter === s.key ? 'active' : '']"
        @click="onStatusChange(s.key)"
      >
        {{ s.label }}
      </view>
    </view>

    <!-- 汇总 -->
    <view class="summary">
      <Icon name="message" :size="24" color="var(--brand-primary)" />
      <text>{{ headerSummary }}</text>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="loading" class="state">加载中…</view>

      <view v-else-if="loadError" class="state-wrap">
        <EmptyState icon="message" title="加载失败" desc="请检查网络后重试" />
        <view class="retry-btn" @click="load">
          <Icon name="refresh" :size="24" color="#FF4D2D" />
          <text>点击重试</text>
        </view>
      </view>

      <view v-else-if="list.length === 0" class="state-wrap">
        <EmptyState icon="message" title="暂无反馈" desc="商家或用户提交反馈后会在这里展示" />
      </view>

      <view v-else class="list">
        <view v-for="f in list" :key="f.id" class="card" @click="openDetail(f)">
          <view class="card-head">
            <view
              class="type-tag"
              :style="{
                color: TYPE_META[f.type]?.tint || '#86909C',
                background: (TYPE_META[f.type]?.tint || '#86909C') + '14',
              }"
            >
              <Icon
                :name="TYPE_META[f.type]?.icon || 'message'"
                :size="20"
                :color="TYPE_META[f.type]?.tint || '#86909C'"
              />
              <text>{{ TYPE_META[f.type]?.label || f.type }}</text>
            </view>
            <view
              class="status-tag"
              :style="{
                color: STATUS_META[f.status]?.tint || '#86909C',
                background: (STATUS_META[f.status]?.tint || '#86909C') + '14',
              }"
            >
              {{ STATUS_META[f.status]?.label || f.status }}
            </view>
          </view>
          <text class="content">{{ f.content }}</text>
          <view v-if="f.images && f.images.length" class="img-row">
            <image
              v-for="(url, i) in f.images.slice(0, 3)"
              :key="url + i"
              :src="url"
              mode="aspectFill"
              class="thumb"
              @click.stop="previewImages(f, i)"
            />
            <view v-if="f.images.length > 3" class="thumb more">+{{ f.images.length - 3 }}</view>
          </view>
          <view class="foot">
            <view class="contact">
              <Icon v-if="f.contact" name="user" :size="20" color="var(--text-tertiary)" />
              <text v-if="f.contact">{{ f.contact }}</text>
            </view>
            <view class="time">
              <Icon name="clock" :size="20" color="var(--text-tertiary)" />
              <text>{{ relTime(f.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.type-scroll {
  background: var(--bg-card);
  white-space: nowrap;
  border-bottom: 1rpx solid var(--border-light);
}
.type-tabs {
  display: inline-flex;
  padding: 12rpx 16rpx;
  gap: 8rpx;
}
.type-tab {
  flex: 0 0 auto;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  border-radius: 12rpx;
  &.active {
    color: #fff;
    background: var(--brand-gradient);
    font-weight: 700;
  }
}

.status-tabs {
  display: flex;
  background: var(--bg-card);
  padding: 0 16rpx 12rpx;
  gap: 8rpx;
  border-bottom: 1rpx solid var(--border-light);
}
.status-tab {
  padding: 8rpx 20rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
  background: var(--bg-page);
  border-radius: 999rpx;
  &.active {
    background: rgba(255, 77, 45, 0.1);
    color: var(--brand-primary);
    font-weight: 700;
  }
}

.summary {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: rgba(255, 77, 45, 0.04);
  font-size: 22rpx;
  color: var(--text-secondary);
}

.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx 32rpx;
  box-sizing: border-box;
}

.state {
  padding: 96rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-tertiary);
}
.state-wrap {
  padding: 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 32rpx;
  background: rgba(255, 77, 45, 0.08);
  border: 1rpx solid rgba(255, 77, 45, 0.3);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--brand-primary);
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  .type-tag {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
  .status-tag {
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.content {
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.img-row {
  display: flex;
  gap: 8rpx;
}
.thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: var(--bg-page);
  &.more {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    font-size: 24rpx;
    font-weight: 700;
  }
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8rpx;
  border-top: 1rpx dashed var(--border-light);
  font-size: 20rpx;
  color: var(--text-tertiary);
  .contact,
  .time {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }
}
</style>
