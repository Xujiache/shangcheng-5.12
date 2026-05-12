<script setup lang="ts">
/**
 * PA-Tab · 平台订单总览
 * 平台视角的全平台订单监控，原型未画 → 按平台风格补完
 */
import { ref, computed, onMounted } from 'vue'
import { http } from '../../../utils/request'
import type { Order } from '@jiujiu/shared/types'
import { formatPrice, formatWan, formatDate } from '@jiujiu/shared/utils'
import Icon from '../../../components/icon/icon.vue'
import EmptyState from '../../../components/empty-state/empty-state.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const orders = ref<Order[]>([])
const loading = ref(false)
const keyword = ref('')
const tab = ref<'all' | 'pending_payment' | 'pending_shipment' | 'shipped' | 'after_sale' | 'completed'>('all')

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'pending_shipment', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'after_sale', label: '售后' },
  { key: 'completed', label: '已完成' },
] as const

const STATUS_META: Record<string, { label: string; tint: string }> = {
  pending_payment: { label: '待付款', tint: '#FF4D2D' },
  pending_shipment: { label: '待发货', tint: '#FF7A45' },
  shipped: { label: '待收货', tint: '#A855F7' },
  completed: { label: '已完成', tint: '#52C41A' },
  cancelled: { label: '已取消', tint: '#86909C' },
  after_sale: { label: '售后中', tint: '#FAAD14' },
}

const filtered = computed(() => {
  let res = orders.value
  if (tab.value !== 'all') res = res.filter((o) => o.status === tab.value)
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    res = res.filter((o) => o.no.toLowerCase().includes(kw) || o.address?.name?.includes(keyword.value))
  }
  return res
})

const stats = computed(() => {
  const total = orders.value.length
  const gmv = orders.value.filter((o) => o.status === 'completed').reduce((s, o) => s + o.payAmount, 0)
  const today = orders.value.length
  return { total, gmv, today, complaint: 1 }
})

async function load() {
  loading.value = true
  try {
    // 平台端订单总览：必须走 /p/orders，/m/orders 是商家私有数据会触发 403
    const res = (await http.get('/api/v1/p/orders', { pageSize: 50 })) as { list: Order[] }
    orders.value = res.list ?? []
  } finally {
    loading.value = false
  }
}

function goDetail(o: Order) {
  uni.showModal({
    title: o.no,
    content: `收货人: ${o.address?.name}\n金额: ¥${formatPrice(o.payAmount)}\n商品: ${o.items?.length ?? 0} 件\n${o.paidAt ? '支付时间: ' + formatDate(o.paidAt) : ''}`,
    showCancel: false,
  })
}

function search() {
  // keyword 双向绑定即过滤
}

onMounted(load)
</script>

<template>
  <view class="page">
    <view class="top" :style="{ paddingTop: statusBarHeight }">
      <view class="top-title">
        <text>平台订单</text>
        <text class="meta">{{ stats.total }} 笔订单</text>
      </view>
      <view class="kpis">
        <view class="k">
          <text class="k-num">¥{{ formatWan(stats.gmv) }}</text>
          <text class="k-label">本期 GMV</text>
        </view>
        <view class="k">
          <text class="k-num">{{ stats.today }}</text>
          <text class="k-label">今日订单</text>
        </view>
        <view class="k">
          <text class="k-num">{{ stats.complaint }}</text>
          <text class="k-label">售后投诉</text>
        </view>
      </view>
    </view>

    <view class="search-wrap">
      <view class="search-bar">
        <Icon name="search" :size="32" color="var(--text-tertiary)" />
        <input v-model="keyword" class="search-input" placeholder="搜索订单号 / 收货人" />
      </view>
    </view>

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

    <scroll-view scroll-y class="scroll">
      <view v-for="o in filtered" :key="o.id" class="card" @click="goDetail(o)">
        <view class="card-head">
          <text class="no">{{ o.no }}</text>
          <view class="status" :style="{ color: STATUS_META[o.status]?.tint, background: (STATUS_META[o.status]?.tint || '#86909C') + '14' }">
            {{ STATUS_META[o.status]?.label || o.status }}
          </view>
        </view>
        <view class="info">
          <view class="addr">
            <Icon name="user" :size="22" color="var(--text-tertiary)" />
            <text>{{ o.address?.name }} · {{ o.address?.region }}</text>
          </view>
          <view class="qty">
            <Icon name="package" :size="22" color="var(--text-tertiary)" />
            <text>{{ o.items?.length ?? 0 }} 件商品</text>
          </view>
        </view>
        <view class="ft">
          <text class="time">{{ formatDate(o.createdAt) }}</text>
          <view class="amount">
            <text class="cur">¥</text>
            <text class="num">{{ formatPrice(o.payAmount) }}</text>
          </view>
        </view>
      </view>
      <EmptyState v-if="!loading && filtered.length === 0" title="暂无订单" desc="订单产生后会同步到这里" icon="biz-order" />
      <view style="height: 160rpx;" />
    </scroll-view>

    <TabBar current="order" />
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
.top {
  background: linear-gradient(135deg, #FF4D2D, #FF9C6E);
  color: #fff;
  padding-bottom: 28rpx;
}
.top-title {
  padding: 20rpx 24rpx 12rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  text {
    &:first-child { font-size: 36rpx; font-weight: 800; }
  }
  .meta { font-size: 22rpx; opacity: 0.85; }
}
.kpis {
  margin: 0 24rpx;
  padding: 16rpx;
  background: rgba(255,255,255,0.15);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  .k {
    flex: 1;
    text-align: center;
    .k-num {
      display: block;
      font-size: 30rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .k-label {
      display: block;
      margin-top: 4rpx;
      font-size: 20rpx;
      opacity: 0.85;
    }
  }
}
.search-wrap {
  padding: 12rpx 24rpx;
  background: var(--bg-card);
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 72rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  .search-input { flex: 1; height: 100%; font-size: 26rpx; }
}
.tabs-scroll {
  background: var(--bg-card);
  white-space: nowrap;
  border-bottom: 1rpx solid var(--border-light);
}
.tabs {
  display: inline-flex;
  padding: 0 16rpx;
  gap: 4rpx;
}
.tab {
  flex: 0 0 auto;
  padding: 16rpx 24rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  border-radius: 12rpx;
  &.active {
    color: #fff;
    background: var(--brand-gradient);
    font-weight: 700;
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
  .addr, .qty {
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
  .time { font-size: 20rpx; color: var(--text-tertiary); font-family: var(--font-family-base); }
  .amount {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    .cur { font-size: 22rpx; font-weight: 800; }
    .num { font-size: 32rpx; font-weight: 800; line-height: 1; }
  }
}
</style>
