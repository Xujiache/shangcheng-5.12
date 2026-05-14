<script setup lang="ts">
/**
 * PA · 售后/退款审核列表
 *
 * 后端预期接口(Agent E 需补全 PlatformController):
 *   GET    /api/v1/p/refunds?status=&merchantId=&page=&pageSize=
 *   POST   /api/v1/p/refunds/:id/agree
 *   POST   /api/v1/p/refunds/:id/reject
 *
 * 接口未就绪期间(后端 404 / 500)严格按"零假数据"原则显示空态 + 重试,
 * 不渲染任何兜底/演示数据。首页 dashboard.todos.complaints 即为待此页处理的退款数。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  refundService,
  type RefundRow,
  type RefundStatus,
} from '../../services'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'all' | RefundStatus

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待处理' },
  { key: 'agreed', label: '已同意' },
  { key: 'in_progress', label: '处理中' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '已驳回' },
  { key: 'all', label: '全部' },
]

const STATUS_META: Record<RefundStatus, { label: string; tint: string }> = {
  pending: { label: '待审核', tint: '#FF4D2D' },
  agreed: { label: '已同意', tint: '#52C41A' },
  in_progress: { label: '退款中', tint: '#FAAD14' },
  completed: { label: '已完成', tint: '#86909C' },
  rejected: { label: '已驳回', tint: '#FF3B30' },
}

const TYPE_LABEL: Record<RefundRow['type'], string> = {
  refund_only: '仅退款',
  refund_with_return: '退货退款',
}

const tab = ref<TabKey>('pending')
const list = ref<RefundRow[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(false)
const errorMsg = ref('')

async function load() {
  loading.value = true
  loadError.value = false
  errorMsg.value = ''
  try {
    const res = await refundService.list({
      status: tab.value,
      page: 1,
      pageSize: 50,
    })
    list.value = res?.list ?? []
    total.value = res?.total ?? 0
  } catch (e: any) {
    console.error('refundService.list failed', e)
    list.value = []
    total.value = 0
    loadError.value = true
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

watch(tab, () => load())

function viewDetail(r: RefundRow) {
  const lines: string[] = [
    `订单号: ${r.orderNo || r.orderId}`,
    `用户: ${r.userName || r.userId}`,
    `商家: ${r.merchantName || r.merchantId}`,
    `类型: ${TYPE_LABEL[r.type] || r.type}`,
    `原因: ${r.reason}`,
    r.description ? `描述: ${r.description}` : '',
    `申请金额: ¥${formatPrice(r.applyAmount)}`,
    typeof r.refundAmount === 'number'
      ? `实际退款: ¥${formatPrice(r.refundAmount)}`
      : '',
    `提交时间: ${formatDate(r.createdAt)}`,
    r.merchantReply ? `\n商家回复: ${r.merchantReply}` : '',
  ].filter(Boolean)
  uni.showModal({
    title: r.no,
    content: lines.join('\n'),
    showCancel: false,
    confirmText: '关闭',
  })
}

async function approve(r: RefundRow) {
  uni.showModal({
    title: '同意退款',
    content: `同意退款 ${r.no} ?\n申请金额 ¥${formatPrice(r.applyAmount)}`,
    success: async (m) => {
      if (!m.confirm) return
      try {
        await refundService.agree(r.id, r.applyAmount)
        uni.showToast({ title: '已同意', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

function reject(r: RefundRow) {
  uni.showModal({
    title: '驳回退款',
    content: '请填写驳回原因(将同步至商家与用户)',
    editable: true,
    placeholderText: '如:商品已使用 / 超出退货期 / 凭证不足',
    confirmColor: '#FF3B30',
    success: async (m) => {
      if (!m.confirm) return
      const reason = (m.content || '').trim()
      if (!reason) {
        uni.showToast({ title: '请填写原因', icon: 'none' })
        return
      }
      try {
        await refundService.reject(r.id, reason)
        uni.showToast({ title: '已驳回', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

const pendingCount = computed(() => list.value.filter((r) => r.status === 'pending').length)

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <NavBar title="售后/退款审核" />

    <!-- Tab -->
    <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
      <view class="tabs">
        <view
          v-for="t in TABS"
          :key="t.key"
          :class="['tab', tab === t.key ? 'active' : '']"
          @click="tab = t.key"
        >
          <text>{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="summary">
      <Icon name="info" :size="24" color="var(--brand-primary)" />
      <text>共 {{ total }} 条 · 当前页待处理 {{ pendingCount }} 条</text>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="loading" class="state">加载中…</view>

      <view v-else-if="loadError" class="state-wrap">
        <EmptyState
          icon="biz-order"
          title="加载失败"
          :desc="errorMsg || '请检查网络后重试'"
        />
        <text class="state-hint">
          若后端 `/p/refunds` 接口尚未实现,请联系平台技术(Agent E)补全。
        </text>
        <view class="retry-btn" @click="load">
          <Icon name="refresh" :size="24" color="#FF4D2D" />
          <text>点击重试</text>
        </view>
      </view>

      <view v-else-if="list.length === 0" class="state-wrap">
        <EmptyState icon="biz-order" title="暂无退款申请" desc="该分类下还没有售后单" />
      </view>

      <view v-else class="list">
        <view v-for="r in list" :key="r.id" class="card" @click="viewDetail(r)">
          <view class="card-head">
            <text class="no">{{ r.no }}</text>
            <view
              class="status"
              :style="{
                color: STATUS_META[r.status]?.tint,
                background: (STATUS_META[r.status]?.tint || '#86909C') + '14',
              }"
            >
              {{ STATUS_META[r.status]?.label || r.status }}
            </view>
          </view>
          <view class="info">
            <view class="info-row">
              <Icon name="user" :size="22" color="var(--text-tertiary)" />
              <text>{{ r.userName || r.userId }} · {{ r.merchantName || r.merchantId }}</text>
            </view>
            <view class="info-row">
              <Icon name="package" :size="22" color="var(--text-tertiary)" />
              <text>{{ TYPE_LABEL[r.type] || r.type }} · {{ r.reason }}</text>
            </view>
          </view>
          <view class="ft">
            <text class="time">{{ formatDate(r.createdAt) }}</text>
            <view class="amount">
              <text class="cur">¥</text>
              <text class="num">{{ formatPrice(r.applyAmount) }}</text>
            </view>
          </view>
          <view v-if="r.status === 'pending'" class="actions">
            <view class="btn ghost" @click.stop="reject(r)">驳回</view>
            <view class="btn primary" @click.stop="approve(r)">同意</view>
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

.tabs-scroll {
  background: var(--bg-card);
  white-space: nowrap;
  border-bottom: 1rpx solid var(--border-light);
}
.tabs {
  display: inline-flex;
  padding: 12rpx 16rpx;
  gap: 8rpx;
}
.tab {
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
  padding: 48rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.state-hint {
  font-size: 20rpx;
  color: var(--text-tertiary);
  text-align: center;
  padding: 0 24rpx;
  line-height: 1.5;
}
.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
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
  gap: 12rpx;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
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
  .no {
    flex: 1;
    min-width: 0;
    font-size: 24rpx;
    color: var(--text-secondary);
    font-family: var(--font-family-base);
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
.info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .info-row {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.ft {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8rpx;
  border-top: 1rpx dashed var(--border-light);
  .time {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
  .amount {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    .cur {
      font-size: 22rpx;
      font-weight: 800;
    }
    .num {
      font-size: 32rpx;
      font-weight: 800;
      line-height: 1;
    }
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding-top: 8rpx;
  border-top: 1rpx dashed var(--border-light);
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
</style>
