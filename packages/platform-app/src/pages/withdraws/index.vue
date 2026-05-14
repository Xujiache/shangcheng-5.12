<script setup lang="ts">
/**
 * 提现审核 · 平台运营人员对商家发起的提现申请做审批
 *
 * 后端 (Wave5 加的):
 *   GET    /p/withdraws?status&page&pageSize
 *   POST   /p/withdraws/:id/approve {remark}
 *   POST   /p/withdraws/:id/reject  {reason}
 *   POST   /p/withdraws/:id/mark-paid {transactionId, remark}
 *
 * 工作流:
 *   pending → approve → approved → mark-paid → paid
 *               ↘ reject → rejected (资金原路退回)
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { withdrawService, type Withdraw, type WithdrawStatus } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

type TabKey = 'pending' | 'approved' | 'paid' | 'rejected' | 'all'

const TABS: { key: TabKey; label: string; status?: WithdrawStatus }[] = [
  { key: 'pending', label: '待审核', status: 'pending' },
  { key: 'approved', label: '待打款', status: 'approved' },
  { key: 'paid', label: '已打款', status: 'paid' },
  { key: 'rejected', label: '已驳回', status: 'rejected' },
  { key: 'all', label: '全部' },
]

const tab = ref<TabKey>('pending')
const list = ref<Withdraw[]>([])
const loading = ref(true)
const errorMsg = ref('')
const total = ref(0)

const STATUS_META: Record<WithdrawStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待审核', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  approved: { label: '已通过·待打款', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  paid: { label: '已打款', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  rejected: { label: '已驳回', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: any = { page: 1, pageSize: 50 }
    if (tab.value !== 'all') {
      const def = TABS.find((t) => t.key === tab.value)
      if (def?.status) params.status = def.status
    }
    const res = await withdrawService.list(params)
    list.value = res?.list ?? []
    total.value = res?.total ?? 0
  } catch (e: any) {
    errorMsg.value = e?.message || '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}

function setTab(t: TabKey) {
  if (tab.value === t) return
  tab.value = t
  load()
}

function formatYuan(v: number | undefined | null): string {
  if (v == null) return '—'
  return `¥${Number(v).toFixed(2)}`
}

function formatDate(s: string | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 操作:审批通过
async function onApprove(row: Withdraw) {
  uni.showModal({
    title: '审批通过',
    content: `确认通过商家「${row.merchantName || row.merchantId}」的提现申请 ${formatYuan(row.amount)}?\n通过后还需"标记已打款"完成资金流转。`,
    confirmColor: '#16A34A',
    confirmText: '审批通过',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '处理中', mask: true })
      try {
        await withdrawService.approve(row.id, '平台运营审批通过')
        uni.hideLoading()
        uni.showToast({ title: '已通过', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

// 操作:驳回(强制要求填原因)
async function onReject(row: Withdraw) {
  // uni 没有原生 prompt,用一个简单 sheet:这里用 navigateTo 跳到细节页太重,直接用本地 reactive 模拟
  // 实际做法:先弹 modal 让用户编辑 reason
  uni.showModal({
    title: '驳回原因',
    content: `驳回商家「${row.merchantName || row.merchantId}」提现 ${formatYuan(row.amount)}\n请在弹出输入框中填写驳回原因`,
    confirmText: '继续',
    cancelText: '取消',
    success: (m) => {
      if (!m.confirm) return
      // mp 风格:用 uni.showModal({editable:true}) 让用户填原因(微信 / 支付宝小程序支持,H5 / App 退化)
      const modalArgs: any = {
        title: '请输入驳回原因',
        editable: true,
        placeholderText: '例如:账户信息不实 / 金额异常',
        confirmText: '提交驳回',
        confirmColor: '#DC2626',
      }
      uni.showModal({
        ...modalArgs,
        success: async (e: any) => {
          if (!e.confirm) return
          const reason = String(e.content || '').trim()
          if (!reason) {
            uni.showToast({ title: '必须填写驳回原因', icon: 'none' })
            return
          }
          uni.showLoading({ title: '驳回中', mask: true })
          try {
            await withdrawService.reject(row.id, reason)
            uni.hideLoading()
            uni.showToast({ title: '已驳回', icon: 'success' })
            await load()
          } catch (err: any) {
            uni.hideLoading()
            uni.showToast({ title: err?.message || '驳回失败', icon: 'none' })
          }
        },
      })
    },
  })
}

// 标记已打款
async function onMarkPaid(row: Withdraw) {
  uni.showModal({
    title: '标记已打款',
    content: `确认已通过线下银行/财务系统打款 ${formatYuan(row.amount)} 给商家「${row.merchantName || row.merchantId}」?\n可在弹出框填写交易流水号(可选)`,
    confirmText: '继续',
    success: (m) => {
      if (!m.confirm) return
      const modalArgs: any = {
        title: '交易流水号 (可选)',
        editable: true,
        placeholderText: '银行交易号 / 支付宝转账号 / 留空',
        confirmText: '标记已打款',
        confirmColor: '#16A34A',
      }
      uni.showModal({
        ...modalArgs,
        success: async (e: any) => {
          if (!e.confirm) return
          const transactionId = String(e.content || '').trim()
          uni.showLoading({ title: '标记中', mask: true })
          try {
            await withdrawService.markPaid(row.id, { transactionId })
            uni.hideLoading()
            uni.showToast({ title: '已标记打款', icon: 'success' })
            await load()
          } catch (err: any) {
            uni.hideLoading()
            uni.showToast({ title: err?.message || '操作失败', icon: 'none' })
          }
        },
      })
    },
  })
}

// 复制账号
function copyAccount(row: Withdraw) {
  if (!row.account) return
  uni.setClipboardData({
    data: row.account,
    success: () => uni.showToast({ title: '账号已复制', icon: 'success' }),
  })
}

onMounted(load)
onShow(() => {
  // 切回 tab 时刷新一次(运营人员可能在外部 admin-pc 操作过)
  if (list.value.length === 0 || errorMsg.value) load()
})

const tabCount = computed(() => total.value)
</script>

<template>
  <view class="page">
    <NavBar title="提现审核" />

    <!-- 状态 tab -->
    <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
      <view class="tabs">
        <view
          v-for="t in TABS"
          :key="t.key"
          :class="['tab', tab === t.key ? 'active' : '']"
          @click="setTab(t.key)"
        >
          <text>{{ t.label }}</text>
          <text v-if="tab === t.key && tabCount > 0" class="tab-count">{{ tabCount }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 加载/错误 -->
    <view v-if="loading" class="state">
      <text class="state-text">加载中…</text>
    </view>
    <view v-else-if="errorMsg" class="state error">
      <text class="state-emoji">⚠️</text>
      <text class="state-text">{{ errorMsg }}</text>
      <view class="state-btn" @click="load">重试</view>
    </view>

    <!-- 空态 -->
    <view v-else-if="list.length === 0" class="state empty">
      <text class="state-emoji">💸</text>
      <text class="state-text">暂无{{ TABS.find((t) => t.key === tab)?.label || '' }}申请</text>
    </view>

    <!-- 列表 -->
    <view v-else class="list">
      <view v-for="row in list" :key="row.id" class="card">
        <!-- 头部:状态 + 金额 -->
        <view class="card-head">
          <view
            class="status-tag"
            :style="{
              color: STATUS_META[row.status]?.color || '#86909C',
              background: STATUS_META[row.status]?.bg || 'rgba(134,144,156,0.1)',
            }"
            >{{ STATUS_META[row.status]?.label || row.status || '未知' }}</view
          >
          <view class="amount">
            <text class="amount-cur">¥</text>
            <text class="amount-num">{{ Number(row.amount).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 商家信息 -->
        <view class="info-row">
          <text class="info-label">商家</text>
          <text class="info-value">{{ row.merchantName || row.merchantId }}</text>
        </view>
        <view v-if="row.applicantName" class="info-row">
          <text class="info-label">申请人</text>
          <text class="info-value">{{ row.applicantName }}</text>
        </view>
        <view v-if="row.method" class="info-row">
          <text class="info-label">渠道</text>
          <text class="info-value">{{ row.method }}</text>
        </view>
        <view v-if="row.account" class="info-row" @click="copyAccount(row)">
          <text class="info-label">账号</text>
          <view class="account-wrap">
            <text class="info-value">{{ row.account }}</text>
            <text class="copy-tip">复制</text>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">申请时间</text>
          <text class="info-value">{{ formatDate(row.createdAt) }}</text>
        </view>
        <view v-if="row.reviewedAt" class="info-row">
          <text class="info-label">审批时间</text>
          <text class="info-value">{{ formatDate(row.reviewedAt) }}</text>
        </view>
        <view v-if="row.paidAt" class="info-row">
          <text class="info-label">打款时间</text>
          <text class="info-value">{{ formatDate(row.paidAt) }}</text>
        </view>
        <view v-if="row.reason" class="info-row reason">
          <text class="info-label">驳回原因</text>
          <text class="info-value reason-text">{{ row.reason }}</text>
        </view>
        <view v-if="row.remark" class="info-row">
          <text class="info-label">备注</text>
          <text class="info-value">{{ row.remark }}</text>
        </view>

        <!-- 操作按钮 -->
        <view v-if="row.status === 'pending'" class="actions">
          <view class="btn ghost reject" @click="onReject(row)">驳回</view>
          <view class="btn primary approve" @click="onApprove(row)">通过</view>
        </view>
        <view v-else-if="row.status === 'approved'" class="actions">
          <view class="btn primary pay" @click="onMarkPaid(row)">标记已打款</view>
        </view>
      </view>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.tabs-scroll {
  background: #fff;
  padding: 16rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  white-space: nowrap;
}
.tabs {
  display: inline-flex;
  gap: 16rpx;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 28rpx;
  background: #f7f8fa;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #4e5969;
  transition: all 0.2s;
  &.active {
    background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 4rpx 12rpx rgba(255, 77, 45, 0.3);
  }
  .tab-count {
    font-size: 20rpx;
    background: rgba(255, 255, 255, 0.3);
    padding: 2rpx 10rpx;
    border-radius: 999rpx;
  }
}

.state {
  margin-top: 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 40rpx;
  .state-emoji {
    font-size: 80rpx;
  }
  .state-text {
    font-size: 26rpx;
    color: #86909c;
  }
  .state-btn {
    margin-top: 20rpx;
    padding: 16rpx 60rpx;
    background: #ff4d2d;
    color: #fff;
    border-radius: 999rpx;
    font-size: 26rpx;
  }
}

.list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 14rpx;
  border-bottom: 1rpx dashed #f5f6f8;
}
.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
}
.amount {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  .amount-cur {
    font-size: 26rpx;
    font-weight: 700;
    color: #ff4d2d;
  }
  .amount-num {
    font-size: 40rpx;
    font-weight: 900;
    color: #ff4d2d;
    font-family: var(--font-family-base);
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8rpx 0;
  gap: 16rpx;
  &.reason {
    background: rgba(220, 38, 38, 0.04);
    padding: 12rpx;
    border-radius: 12rpx;
    margin-top: 8rpx;
  }
}
.info-label {
  font-size: 24rpx;
  color: #86909c;
  flex-shrink: 0;
  width: 140rpx;
}
.info-value {
  flex: 1;
  font-size: 24rpx;
  color: #1d2129;
  text-align: right;
  word-break: break-all;
  &.reason-text {
    color: #dc2626;
    text-align: left;
  }
}
.account-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  justify-content: flex-end;
}
.copy-tip {
  font-size: 22rpx;
  color: #ff4d2d;
  padding: 2rpx 12rpx;
  background: rgba(255, 77, 45, 0.08);
  border-radius: 8rpx;
}

.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #f5f6f8;
}
.btn {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 14rpx;
  font-size: 26rpx;
  font-weight: 700;
  transition: all 0.18s;
  &.primary {
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  }
  &.approve {
    background: linear-gradient(135deg, #34d399, #16a34a);
  }
  &.pay {
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
  }
  &.ghost {
    background: #fff;
    color: #4e5969;
    border: 1rpx solid #ebeef5;
    &.reject {
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.3);
    }
  }
  &:active {
    transform: scale(0.97);
  }
}

.safe-bottom {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
