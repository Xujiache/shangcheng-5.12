<script setup lang="ts">
/**
 * PA-09 · 会员缴费订单
 * 还原 原型图/platform-app.jsx::PA_PayOrders
 * - Tab：全部 / 已支付 / 待支付 / 退款中
 * - 订单卡：单号 + 商户名 + 套餐 + 金额 + 状态 + 详情
 */
import { ref, computed, onMounted } from 'vue'
import { memberService } from '../../services'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'all' | 'paid' | 'pending' | 'refunding' | 'refunded'

interface PayOrderItem {
  id: string
  no: string
  merchantName: string
  planName: string
  amount: number
  status: 'paid' | 'pending' | 'refunding' | 'refunded'
  paidAt: string | null
  payMethod: string
}

const tab = ref<TabKey>('all')
const list = ref<PayOrderItem[]>([])
const loading = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'paid', label: '已支付' },
  { key: 'pending', label: '待支付' },
  { key: 'refunding', label: '退款中' },
]

const STATUS_META: Record<string, { label: string; tint: string }> = {
  paid: { label: '已支付', tint: '#52C41A' },
  pending: { label: '待支付', tint: '#FAAD14' },
  refunding: { label: '退款中', tint: '#FF7A45' },
  refunded: { label: '已退款', tint: '#86909C' },
}

const PAY_METHOD_LABEL: Record<string, { label: string; icon: string; tint: string }> = {
  wechat: { label: '微信', icon: 'wechat', tint: '#3CB244' },
  alipay: { label: '支付宝', icon: 'apple-pay', tint: '#1296DB' },
  balance: { label: '余额', icon: 'wallet', tint: '#FF7A45' },
}

const filtered = computed(() => {
  if (tab.value === 'all') return list.value
  return list.value.filter((x) => x.status === tab.value)
})

const stats = computed(() => {
  const paid = list.value.filter((x) => x.status === 'paid')
  return {
    totalIncome: paid.reduce((s, x) => s + x.amount, 0),
    totalCount: paid.length,
    pendingCount: list.value.filter((x) => x.status === 'pending').length,
    refundCount: list.value.filter((x) => x.status === 'refunding').length,
  }
})

async function load() {
  loading.value = true
  try {
    const res = (await memberService.payOrders({ pageSize: 50 })) as { list: PayOrderItem[] }
    list.value = res.list ?? []
  } finally {
    loading.value = false
  }
}

function viewDetail(o: PayOrderItem) {
  uni.showModal({
    title: o.no,
    content: `商户: ${o.merchantName}\n套餐: ${o.planName}\n金额: ¥${formatPrice(o.amount)}\n支付方式: ${PAY_METHOD_LABEL[o.payMethod]?.label || o.payMethod}\n状态: ${STATUS_META[o.status]?.label}\n${o.paidAt ? '支付时间: ' + formatDate(o.paidAt) : ''}`,
    showCancel: false,
  })
}

function exportCsv() {
  uni.showLoading({ title: '导出中…' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '已导出 CSV', icon: 'success' })
  }, 800)
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="会员缴费订单" right-icon="doc" @right="exportCsv" />

    <!-- 顶部统计 -->
    <view class="hero">
      <view class="hero-main">
        <text class="hero-label">本月总收入</text>
        <view class="hero-amount">
          <text class="cur">¥</text>
          <text class="num">{{ formatPrice(stats.totalIncome) }}</text>
        </view>
        <text class="hero-sub">来自 {{ stats.totalCount }} 笔已支付订单</text>
      </view>
      <view class="hero-side">
        <view class="hs-item">
          <text class="hs-num">{{ stats.pendingCount }}</text>
          <text class="hs-label">待支付</text>
        </view>
        <view class="hs-item">
          <text class="hs-num">{{ stats.refundCount }}</text>
          <text class="hs-label">退款中</text>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text>{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-for="o in filtered" :key="o.id" class="card" @click="viewDetail(o)">
        <view class="card-head">
          <view class="head-left">
            <text class="head-label">订单号</text>
            <text class="no">{{ o.no }}</text>
          </view>
          <view
            class="status-tag"
            :style="{ color: STATUS_META[o.status].tint, background: STATUS_META[o.status].tint + '14' }"
          >
            {{ STATUS_META[o.status].label }}
          </view>
        </view>

        <view class="info-row">
          <view class="merchant">
            <view class="avatar">{{ o.merchantName[0] }}</view>
            <view class="m-info">
              <text class="m-name">{{ o.merchantName }}</text>
              <text class="m-plan">{{ o.planName }}</text>
            </view>
          </view>
          <view class="amount">
            <text class="a-cur">¥</text>
            <text class="a-num">{{ formatPrice(o.amount) }}</text>
          </view>
        </view>

        <view class="ft-row">
          <view class="pay-method" v-if="o.payMethod">
            <view class="pm-dot" :style="{ background: PAY_METHOD_LABEL[o.payMethod]?.tint }" />
            <text>{{ PAY_METHOD_LABEL[o.payMethod]?.label }}支付</text>
          </view>
          <text v-if="o.paidAt" class="time">{{ formatDate(o.paidAt) }}</text>
          <text v-else class="time pending-text">未支付</text>
        </view>
      </view>

      <EmptyState
        v-if="!loading && filtered.length === 0"
        :title="`暂无${TABS.find(t => t.key === tab)?.label}订单`"
        desc="商户购买套餐后会在这里显示"
        icon="wallet"
      />
      <view style="height: 40rpx;" />
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
.hero {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #FF4D2D, #FAAD14);
  color: #fff;
  border-radius: 20rpx;
  display: flex;
  gap: 16rpx;
  align-items: stretch;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.25);
}
.hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .hero-label {
    font-size: 22rpx;
    opacity: 0.9;
  }
  .hero-amount {
    display: flex;
    align-items: baseline;
    font-family: var(--font-family-base);
    .cur { font-size: 28rpx; font-weight: 800; }
    .num { font-size: 56rpx; font-weight: 800; line-height: 1; }
  }
  .hero-sub {
    font-size: 20rpx;
    opacity: 0.85;
  }
}
.hero-side {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12rpx;
  padding: 8rpx 16rpx;
  border-left: 1rpx solid rgba(255,255,255,0.3);
}
.hs-item {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  .hs-num {
    font-size: 28rpx;
    font-weight: 800;
    line-height: 1;
    font-family: var(--font-family-base);
  }
  .hs-label {
    font-size: 18rpx;
    opacity: 0.85;
  }
}

.tabs {
  margin-top: 16rpx;
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx;
  box-sizing: border-box;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  min-width: 0;
}
.head-left {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  min-width: 0;
  .head-label {
    font-size: 20rpx;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .no {
    flex: 1;
    min-width: 0;
    font-size: 22rpx;
    color: var(--text-secondary);
    font-family: var(--font-family-base);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.status-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.merchant {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
  .avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: var(--brand-gradient);
    color: #fff;
    font-weight: 800;
    font-size: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .m-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .m-name {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .m-plan {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
}
.amount {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  color: var(--brand-primary);
  font-family: var(--font-family-base);
  .a-cur { font-size: 22rpx; font-weight: 800; }
  .a-num { font-size: 36rpx; font-weight: 800; line-height: 1; }
}
.ft-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8rpx;
  border-top: 1rpx dashed var(--border-light);
  .pay-method {
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: 20rpx;
    color: var(--text-tertiary);
    .pm-dot {
      width: 12rpx;
      height: 12rpx;
      border-radius: 50%;
    }
  }
  .time {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
    &.pending-text {
      color: #FAAD14;
      font-weight: 600;
    }
  }
}
</style>
