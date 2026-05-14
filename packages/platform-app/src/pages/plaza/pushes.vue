<script setup lang="ts">
/**
 * PA · 选品广场推送记录
 *
 * 对接 plazaService.pushes：GET /api/v1/p/plaza/pushes?status&page&pageSize
 * 与 plaza/push.vue（创建推送）联动，让平台能复盘已发布的推送。
 *
 * 字段映射（PlazaPush 模型无 title 字段）：
 *   title      → pushText 或第一个 tag 或 "广场推送"
 *   type       → targetType: product / factory
 *   target     → positions[] join " / "（推送位置；audience 作为副信息）
 *   publishedAt→ scheduledStart（计划上线时间，更贴近"发布时间"语义）
 *   status     → draft / pending / active / offline / ended
 */
import { ref, computed, onMounted } from 'vue'
import { plazaService } from '../../services'
import type { PlazaPushRow } from '../../services'
import { formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type StatusTab = 'all' | 'draft' | 'pending' | 'active' | 'offline' | 'ended'

const STATUS_META: Record<string, { label: string; tint: string }> = {
  draft: { label: '草稿', tint: '#86909C' },
  pending: { label: '待审', tint: '#FAAD14' },
  active: { label: '生效中', tint: '#52C41A' },
  offline: { label: '已下线', tint: '#A855F7' },
  ended: { label: '已结束', tint: '#1296DB' },
}

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '生效中' },
  { key: 'pending', label: '待审' },
  { key: 'draft', label: '草稿' },
  { key: 'ended', label: '已结束' },
  { key: 'offline', label: '已下线' },
]

const tab = ref<StatusTab>('all')
const list = ref<PlazaPushRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const noMore = ref(false)

async function load(reset = false) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    list.value = []
    noMore.value = false
  }
  if (noMore.value) return

  loading.value = true
  try {
    const params: { status?: string; page: number; pageSize: number } = {
      page: page.value,
      pageSize,
    }
    if (tab.value !== 'all') params.status = tab.value
    const res = await plazaService.pushes(params)
    const rows = res?.list ?? []
    list.value = page.value === 1 ? rows : [...list.value, ...rows]
    total.value = res?.total ?? list.value.length
    if (rows.length < pageSize) noMore.value = true
    else page.value += 1
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(k: StatusTab) {
  if (tab.value === k) return
  tab.value = k
  load(true)
}

function titleOf(row: PlazaPushRow): string {
  if (row.pushText && row.pushText.trim()) return row.pushText.trim()
  if (row.tags && row.tags.length > 0) return row.tags[0]
  return '广场推送 #' + row.id.slice(-6)
}

function targetCount(row: PlazaPushRow): number {
  return row.targetType === 'product' ? row.productIds.length : row.factoryIds.length
}

function goCreate() {
  uni.navigateTo({ url: '/pages/plaza/push' })
}

const totalLabel = computed(() => (tab.value === 'all' ? `共 ${total.value} 条` : `${total.value} 条 ${STATUS_META[tab.value]?.label || ''}`))

onMounted(() => load(true))

function onScrollToLower() {
  load(false)
}
</script>

<template>
  <view class="page">
    <NavBar title="广场推送记录" right-icon="plus" @right="goCreate" />

    <!-- 状态 tab -->
    <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
      <view class="tabs">
        <view
          v-for="t in TABS"
          :key="t.key"
          :class="['tab', tab === t.key ? 'active' : '']"
          @click="switchTab(t.key)"
        >
          <text>{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="total-bar">
      <text>{{ totalLabel }}</text>
    </view>

    <scroll-view scroll-y class="scroll" @scrolltolower="onScrollToLower">
      <view v-for="row in list" :key="row.id" class="card">
        <view class="card-head">
          <text class="title">{{ titleOf(row) }}</text>
          <view
            class="status"
            :style="{
              color: STATUS_META[row.status]?.tint || '#86909C',
              background: (STATUS_META[row.status]?.tint || '#86909C') + '14',
            }"
          >
            {{ STATUS_META[row.status]?.label || row.status }}
          </view>
        </view>

        <view class="meta">
          <view class="meta-row">
            <view class="type-chip" :class="row.targetType">
              {{ row.targetType === 'product' ? '商品推送' : '厂家推送' }}
            </view>
            <text class="count">×{{ targetCount(row) }}</text>
          </view>
          <view class="meta-row" v-if="row.positions && row.positions.length > 0">
            <Icon name="location-pin" :size="22" color="var(--text-tertiary)" />
            <text class="ellipsis">{{ row.positions.join(' / ') }}</text>
          </view>
          <view class="meta-row">
            <Icon name="clock" :size="22" color="var(--text-tertiary)" />
            <text>
              {{ formatDate(row.scheduledStart) }}
              → {{ formatDate(row.scheduledEnd) }}
            </text>
          </view>
        </view>

        <view class="ft">
          <view class="stat-chip">
            <Icon name="eye" :size="22" color="var(--text-tertiary)" />
            <text>{{ row.impressions }} 曝光</text>
          </view>
          <view class="stat-chip">
            <Icon name="tag" :size="22" color="var(--text-tertiary)" />
            <text>{{ row.clicks }} 点击</text>
          </view>
          <view class="stat-chip" v-if="row.weight">
            <Icon name="star" :size="22" color="var(--text-tertiary)" />
            <text>权重 {{ row.weight }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">加载中…</view>
      <view v-else-if="noMore && list.length > 0" class="no-more">— 没有更多了 —</view>

      <EmptyState
        v-if="!loading && list.length === 0"
        title="暂无推送记录"
        :desc="tab === 'all' ? '点击右上角 + 立刻发起一次推送' : '当前筛选下无记录，切换其它状态看看'"
        icon="biz-plaza"
      />
      <view style="height: 40rpx" />
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
.tabs-scroll {
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
  white-space: nowrap;
}
.tabs {
  display: inline-flex;
  padding: 8rpx 16rpx;
  gap: 4rpx;
}
.tab {
  flex: 0 0 auto;
  padding: 14rpx 22rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  border-radius: 12rpx;
  &.active {
    color: #fff;
    background: var(--brand-gradient);
    font-weight: 700;
  }
}
.total-bar {
  padding: 12rpx 24rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
  box-sizing: border-box;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  .title {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  min-width: 0;
  .ellipsis {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    font-family: var(--font-family-base);
    color: var(--text-primary);
    font-weight: 700;
  }
}
.type-chip {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  font-weight: 700;
  &.product { background: rgba(255, 77, 45, 0.1); color: #FF4D2D; }
  &.factory { background: rgba(18, 150, 219, 0.1); color: #1296DB; }
}
.ft {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 12rpx;
}
.stat-chip {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
}
.loading,
.no-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
</style>
