<script setup lang="ts">
/**
 * MA-10 · 售后处理
 *
 * Tab(待处理/处理中/已完成/已拒绝) + 退款单卡 + 凭证 + 操作
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { refundService } from '../../services/order'
import { formatPrice, formatDateTime } from '@jiujiu/shared/utils'
import type { Refund, RefundStatus } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type Tab = 'all' | RefundStatus

const tab = ref<Tab>('pending')
const list = ref<Refund[]>([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)

/**
 * 携带 orderId 进入时:仅展示该订单的售后单
 *
 * 由 onLoad 在 onMounted 之前同步赋值,确保第一次 load() 已经能拿到 orderId。
 */
const orderId = ref<string>('')

const TABS = computed(() => [
  { key: 'all' as Tab, label: '全部', badge: total.value },
  { key: 'pending' as Tab, label: '待处理' },
  { key: 'agreed' as Tab, label: '已同意' },
  { key: 'in_progress' as Tab, label: '处理中' },
  { key: 'completed' as Tab, label: '已完成' },
  { key: 'rejected' as Tab, label: '已拒绝' },
])

const STATUS_LABEL: Record<RefundStatus, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  pending: { text: '待处理', tone: 'warning' },
  agreed: { text: '已同意', tone: 'success' },
  rejected: { text: '已拒绝', tone: 'error' },
  in_progress: { text: '处理中', tone: 'info' },
  completed: { text: '已完成', tone: 'default' },
}

const REASON_LABEL: Record<string, 'refund_only' | 'refund_with_return'> = {
  refund_only: 'refund_only',
  refund_with_return: 'refund_with_return',
}

async function load(reset = false) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 1
    list.value = []
    hasMore.value = true
  }
  try {
    const data = await refundService.list({
      page: page.value,
      pageSize: 10,
      status: tab.value === 'all' ? undefined : tab.value,
    })
    // 后端 listRefunds 不支持按 orderId 过滤(merchant.service.ts:521 where 仅取 merchantId/status),
    // 这里本地兜底:从订单详情跳进来时,只展示该订单的售后单。
    const filtered = orderId.value ? data.list.filter((r) => r.orderId === orderId.value) : data.list
    list.value = reset ? filtered : [...list.value, ...filtered]
    total.value = orderId.value ? filtered.length : data.total
    hasMore.value = !!data.hasMore && !orderId.value
  } finally {
    loading.value = false
  }
}

function agree(r: Refund) {
  uni.showModal({
    title: '同意退款',
    content: `将退还 ${formatPrice(r.applyAmount)} 给客户，是否确认？`,
    success: async (m) => {
      if (m.confirm) {
        await refundService.agree(r.id, r.applyAmount)
        uni.showToast({ title: '已同意' })
        load(true)
      }
    },
  })
}

function reject(r: Refund) {
  uni.showModal({
    title: '拒绝退款',
    editable: true,
    placeholderText: '请填写拒绝理由（客户可见）',
    success: async (m) => {
      if (m.confirm && m.content) {
        await refundService.reject(r.id, m.content)
        uni.showToast({ title: '已拒绝' })
        load(true)
      }
    },
  })
}

function previewEvidence(imgs: string[], idx: number) {
  uni.previewImage({ urls: imgs, current: imgs[idx] })
}

onLoad((opts) => {
  // 来源:订单列表/详情页"申请售后"按钮 → /pages/order/aftersale?orderId=xxx
  // 拿到 orderId 后,列表只展示该订单的售后单(本地 filter,见 load()),分页禁用
  orderId.value = (opts as { orderId?: string })?.orderId || ''
})
onMounted(() => load(true))
</script>

<template>
  <view class="page">
    <NavBar title="售后处理" />

    <view class="header">
      <Tabs v-model="tab" :items="TABS" variant="underline" @change="load(true)" />
    </view>

    <view class="list">
      <view v-for="r in list" :key="r.id" class="refund-card">
        <view class="head">
          <view class="head-left">
            <text class="no">{{ r.no }}</text>
            <StatusTag
              :text="r.type === 'refund_with_return' ? '退货退款' : '仅退款'"
              :tone="r.type === 'refund_with_return' ? 'warning' : 'info'"
            />
          </view>
          <StatusTag :text="STATUS_LABEL[r.status].text" :tone="STATUS_LABEL[r.status].tone" fill />
        </view>

        <view class="body">
          <view class="row">
            <text class="row-label">退款原因</text>
            <text class="row-value">{{ r.reason }}</text>
          </view>
          <view v-if="r.description" class="row">
            <text class="row-label">详细说明</text>
            <text class="row-value">{{ r.description }}</text>
          </view>
          <view class="row">
            <text class="row-label">申请金额</text>
            <text class="row-value primary">{{ formatPrice(r.applyAmount) }}</text>
          </view>
          <view class="row">
            <text class="row-label">申请时间</text>
            <text class="row-value">{{ formatDateTime(r.createdAt) }}</text>
          </view>
        </view>

        <view v-if="r.evidence?.length" class="evidences">
          <text class="evidence-title">凭证</text>
          <view class="evidence-row">
            <image
              v-for="(img, i) in r.evidence"
              :key="i"
              class="evidence-img"
              :src="img"
              mode="aspectFill"
              @click="previewEvidence(r.evidence, i)"
            />
          </view>
        </view>

        <view v-if="r.status === 'pending'" class="actions">
          <view class="btn ghost" @click="reject(r)">拒绝</view>
          <view class="btn primary" @click="agree(r)">同意退款</view>
        </view>
        <view v-else-if="r.status === 'agreed' || r.status === 'in_progress'" class="actions">
          <view class="btn ghost">联系客户</view>
          <view class="btn primary">查看进度</view>
        </view>
        <view v-else class="actions">
          <view class="btn ghost">查看详情</view>
        </view>
      </view>

      <EmptyState v-if="!loading && list.length === 0" title="暂无售后单" desc="切换标签查看其他状态" />
      <view v-if="hasMore && list.length > 0" class="loadmore" @click="page++; load()">加载更多 ›</view>
      <view v-else-if="list.length > 0" class="end">— 没有更多了 —</view>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
}
.header {
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 5;
  border-bottom: 1rpx solid var(--border-light);
  overflow-x: auto;
  white-space: nowrap;
}
.list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.refund-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  .head-left {
    display: flex;
    align-items: center;
    gap: 12rpx;
    .no { font-size: 24rpx; color: var(--text-secondary); font-family: var(--font-family-base); }
  }
}
.body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.row {
  display: flex;
  gap: 16rpx;
  font-size: 24rpx;
  .row-label {
    width: 140rpx;
    color: var(--text-tertiary);
  }
  .row-value {
    flex: 1;
    color: var(--text-primary);
    &.primary { color: var(--brand-primary); font-weight: 700; font-size: 28rpx; }
  }
}
.evidences {
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 12rpx;
  .evidence-title { font-size: 22rpx; color: var(--text-tertiary); }
  .evidence-row {
    margin-top: 8rpx;
    display: flex;
    gap: 8rpx;
    .evidence-img {
      width: 120rpx;
      height: 120rpx;
      border-radius: 8rpx;
      background: var(--bg-hover);
    }
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed var(--border-light);
  .btn {
    padding: 12rpx 32rpx;
    border-radius: 999rpx;
    font-size: 26rpx;
    font-weight: 600;
    &.ghost {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    &.primary {
      background: var(--brand-gradient);
      color: #fff;
      box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
    }
  }
}
.loadmore { padding: 24rpx; text-align: center; font-size: 22rpx; color: var(--brand-primary); }
.end { padding: 24rpx; text-align: center; font-size: 20rpx; color: var(--text-tertiary); }
.safe-bottom { height: 40rpx; }
</style>
