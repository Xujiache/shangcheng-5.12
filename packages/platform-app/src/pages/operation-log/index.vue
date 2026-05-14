<script setup lang="ts">
/**
 * PA · 操作日志
 *
 * 对接后端 PlatformController.auditRecords():
 *   GET /api/v1/p/audit/records?type=&status=&targetId=&page=&pageSize=
 *
 * 复用已有的 AuditRecord 表 — 记录商家/商品审核全流转(approve/reject/auto/sample-check)。
 * 这里给平台管理员一个集中查询入口,支持类型 + 状态过滤。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { auditLogService } from '../../services'
import type { AuditRecord, AuditRecordType, AuditRecordStatus } from '../../services'
import { formatDateTime } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TypeFilter = AuditRecordType | 'all'
type StatusFilter = AuditRecordStatus | 'all'

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'merchant', label: '商家' },
  { key: 'product', label: '商品' },
]
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'approved', label: '通过' },
  { key: 'rejected', label: '拒绝' },
  { key: 'auto_approved', label: '自动通过' },
  { key: 'sample_check', label: '抽检' },
]

const typeFilter = ref<TypeFilter>('all')
const statusFilter = ref<StatusFilter>('all')

const list = ref<AuditRecord[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = computed(() => list.value.length < total.value)

async function load(reset = true) {
  if (reset) {
    page.value = 1
    list.value = []
  }
  loading.value = true
  try {
    const res = await auditLogService.list({
      type: typeFilter.value,
      status: statusFilter.value,
      page: page.value,
      pageSize,
    })
    const rows = res?.list || []
    if (reset) list.value = rows
    else list.value = [...list.value, ...rows]
    total.value = res?.total ?? list.value.length
  } catch (e: any) {
    if (reset) {
      list.value = []
      total.value = 0
    }
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value += 1
  load(false)
}

watch([typeFilter, statusFilter], () => {
  load(true)
})

function typeLabel(t: string): string {
  if (t === 'merchant') return '商家'
  if (t === 'product') return '商品'
  return t || '其他'
}

function statusLabel(s: string): string {
  switch (s) {
    case 'approved':
      return '通过'
    case 'rejected':
      return '拒绝'
    case 'auto_approved':
      return '自动通过'
    case 'sample_check':
      return '抽检'
    case 'pending':
      return '待审'
    default:
      return s || '—'
  }
}

function statusClass(s: string): string {
  switch (s) {
    case 'approved':
    case 'auto_approved':
      return 'ok'
    case 'rejected':
      return 'bad'
    case 'sample_check':
      return 'warn'
    case 'pending':
      return 'pending'
    default:
      return 'gray'
  }
}

function copy(text: string) {
  if (!text) return
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制', icon: 'success', duration: 600 }),
  })
}

onMounted(() => load(true))
</script>

<template>
  <view class="page">
    <NavBar title="操作日志" right-icon="refresh" @right="load(true)" />

    <!-- 类型筛选 -->
    <view class="filter-card">
      <view class="filter-label">类型</view>
      <view class="seg-group">
        <view
          v-for="t in TYPE_TABS"
          :key="t.key"
          :class="['seg', typeFilter === t.key ? 'active' : '']"
          @click="typeFilter = t.key"
        >
          {{ t.label }}
        </view>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-card">
      <view class="filter-label">状态</view>
      <scroll-view scroll-x class="status-scroll">
        <view class="seg-group">
          <view
            v-for="t in STATUS_TABS"
            :key="t.key"
            :class="['seg', statusFilter === t.key ? 'active' : '']"
            @click="statusFilter = t.key"
          >
            {{ t.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="scroll" @scrolltolower="loadMore">
      <view class="section-head">
        <text class="section-title">日志列表</text>
        <text class="section-count">共 {{ total }} 条</text>
      </view>

      <view v-for="r in list" :key="r.id" class="row">
        <view class="row-head">
          <view :class="['type-chip', 'type-' + r.type]">{{ typeLabel(r.type) }}</view>
          <view :class="['status-chip', statusClass(r.status)]">{{ statusLabel(r.status) }}</view>
          <text class="time">{{ formatDateTime(r.reviewedAt || r.createdAt) }}</text>
        </view>

        <view class="row-line">
          <text class="line-label">目标 ID</text>
          <text class="line-value mono" @click="copy(r.targetId)">{{ r.targetId }}</text>
        </view>

        <view class="row-line">
          <text class="line-label">操作人</text>
          <text class="line-value">
            {{ r.auditor ? r.auditor.nickname || r.auditor.username : '系统(自动)' }}
          </text>
        </view>

        <view v-if="r.reason" class="row-line reason-line">
          <text class="line-label">原因</text>
          <text class="line-value">{{ r.reason }}</text>
        </view>

        <view class="row-tags">
          <view v-if="r.autoApproved" class="tag">自动通过</view>
          <view v-if="r.sampleChecked" class="tag warn">已抽检</view>
        </view>
      </view>

      <EmptyState
        v-if="!loading && list.length === 0"
        title="暂无操作日志"
        desc="审核 / 抽检 / 自动通过等动作会在这里留痕"
        icon="doc"
      />

      <view v-if="loading && list.length > 0" class="loading-tip">加载中…</view>
      <view v-else-if="!hasMore && list.length > 0" class="loading-tip">— 已经到底了 —</view>
      <view style="height: 60rpx" />
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

.filter-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 12rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  box-shadow: var(--shadow-sm);
  .filter-label {
    flex-shrink: 0;
    font-size: 24rpx;
    color: var(--text-tertiary);
    font-weight: 700;
  }
}
.status-scroll {
  flex: 1;
  white-space: nowrap;
}
.seg-group {
  display: flex;
  gap: 8rpx;
}
.seg {
  padding: 8rpx 20rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  &.active {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
    color: #fff;
    font-weight: 700;
  }
}

.scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
  box-sizing: border-box;
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 16rpx 4rpx;
  .section-title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .section-count {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}

.row {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.row-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .time {
    flex: 1;
    text-align: right;
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.type-chip {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  font-weight: 800;
  &.type-merchant {
    background: rgba(82, 196, 26, 0.12);
    color: #52c41a;
  }
  &.type-product {
    background: rgba(255, 122, 69, 0.12);
    color: #ff7a45;
  }
}
.status-chip {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
  &.ok {
    background: rgba(82, 196, 26, 0.12);
    color: #52c41a;
  }
  &.bad {
    background: rgba(255, 59, 48, 0.12);
    color: #ff3b30;
  }
  &.warn {
    background: rgba(250, 173, 20, 0.12);
    color: #faad14;
  }
  &.pending {
    background: rgba(255, 77, 45, 0.12);
    color: var(--brand-primary);
  }
  &.gray {
    background: var(--bg-page);
    color: var(--text-tertiary);
  }
}
.row-line {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  &.reason-line {
    padding: 10rpx 12rpx;
    background: rgba(255, 59, 48, 0.04);
    border-radius: 8rpx;
  }
  .line-label {
    flex-shrink: 0;
    width: 120rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .line-value {
    flex: 1;
    min-width: 0;
    font-size: 24rpx;
    color: var(--text-primary);
    line-height: 1.55;
    word-break: break-all;
    &.mono {
      font-family: var(--font-family-base);
      font-size: 22rpx;
    }
  }
}
.row-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}
.tag {
  padding: 2rpx 12rpx;
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  &.warn {
    background: rgba(250, 173, 20, 0.1);
    color: #faad14;
  }
}

.loading-tip {
  text-align: center;
  padding: 24rpx 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
</style>
