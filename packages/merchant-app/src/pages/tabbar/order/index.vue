<script setup lang="ts">
/**
 * MA-08 · 订单列表
 *
 * 搜索 + 5 状态 Tab + 订单卡 + 状态化操作 + 下拉刷新
 */
import { ref, computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { orderService } from '../../../services/order'
import type { Order, OrderStatus } from '@jiujiu/shared/types'
import Tabs from '../../../components/tabs/tabs.vue'
import OrderCard from '../../../components/order-card/order-card.vue'
import EmptyState from '../../../components/empty-state/empty-state.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

type Tab = 'all' | OrderStatus

const tab = ref<Tab>('pending_shipment')
const keyword = ref('')
const list = ref<Order[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)

const TABS = computed(() => [
  { key: 'all' as Tab, label: '全部', badge: total.value },
  { key: 'pending_payment' as Tab, label: '待付款' },
  { key: 'pending_shipment' as Tab, label: '待发货' },
  { key: 'shipped' as Tab, label: '已发货' },
  { key: 'completed' as Tab, label: '已完成' },
  { key: 'after_sale' as Tab, label: '售后' },
])

async function load(reset = false) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 1
    list.value = []
    hasMore.value = true
  }
  try {
    const data = await orderService.list({
      page: page.value,
      pageSize: 15,
      status: tab.value === 'all' ? undefined : tab.value,
      keyword: keyword.value || undefined,
    })
    list.value = reset ? data.list : [...list.value, ...data.list]
    total.value = data.total
    hasMore.value = !!data.hasMore
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function onTabChange() {
  load(true)
}

function onSearch() {
  load(true)
}

function onAction(action: string, order: Order) {
  if (action === 'detail') {
    uni.navigateTo({ url: `/pages/order/detail?id=${order.id}` })
  } else if (action === 'ship') {
    showShipDialog(order)
  } else if (action === 'tracking') {
    uni.showModal({
      title: '物流信息',
      content: `${order.trackingCompany ?? '顺丰'}\n${order.trackingNumber ?? 'SF' + Date.now()}`,
      showCancel: false,
    })
  } else if (action === 'refund') {
    uni.navigateTo({ url: `/pages/order/aftersale?orderId=${order.id}` })
  }
}

function showShipDialog(order: Order) {
  uni.showModal({
    title: '填写物流单号',
    editable: true,
    placeholderText: '请输入运单号',
    success: async (r) => {
      if (r.confirm && r.content) {
        await orderService.ship(order.id, { company: '顺丰', trackingNumber: r.content })
        uni.showToast({ title: '已发货' })
        load(true)
      }
    },
  })
}

function goDetail(order: Order) {
  uni.navigateTo({ url: `/pages/order/detail?id=${order.id}` })
}

onMounted(() => load(true))
onShow(() => {
  if (list.value.length > 0) load(true)
})
onPullDownRefresh(() => load(true))
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="title-row">
        <text class="page-title">订单管理</text>
        <text class="page-sub">共 {{ total }} 笔</text>
      </view>
      <view class="search-wrap">
        <Icon name="search" :size="32" color="var(--text-tertiary)" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索订单号 / 客户姓名 / 手机号"
          confirm-type="search"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="clear" @click="keyword = ''; onSearch()">
          <Icon name="close" :size="24" color="var(--text-tertiary)" />
        </view>
      </view>
      <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
        <view class="tabs-inline">
          <view
            v-for="t in TABS"
            :key="t.key"
            :class="['tab-item', tab === t.key && 'active']"
            @click="tab = t.key; onTabChange()"
          >
            <text class="tab-text">{{ t.label }}</text>
            <text v-if="t.badge && t.badge > 0" class="tab-badge">{{ t.badge > 99 ? '99+' : t.badge }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="list">
      <OrderCard
        v-for="o in list"
        :key="o.id"
        :order="o"
        show-customer
        @click="goDetail"
        @action="onAction"
      />
      <EmptyState v-if="!loading && list.length === 0" title="暂无订单" desc="切换标签或调整搜索条件" />
      <view v-if="hasMore && list.length > 0" class="loadmore" @click="page++; load()">
        加载更多 ›
      </view>
      <view v-else-if="list.length > 0" class="end">— 没有更多了 —</view>
    </view>

    <view class="safe-bottom" />

    <TabBar current="order" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-card);
  padding: 16rpx 24rpx 0;
  box-shadow: var(--shadow-sm);
}
.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 12rpx;
  .page-title {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .page-sub {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  padding: 0 16rpx 0 20rpx;
  height: 72rpx;
  .search-input {
    flex: 1;
    height: 100%;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .clear { padding: 4rpx; }
}
/* 直接内联 Tab 实现，避开 scroll-view + 组件 flex 冲突 */
.tabs-scroll {
  margin-top: 8rpx;
  border-bottom: 1rpx solid var(--border-light);
  width: 100%;
  white-space: nowrap;
  &::-webkit-scrollbar { display: none; }
}
.tabs-inline {
  display: inline-flex;
  gap: 8rpx;
  padding-right: 24rpx;
}
.tab-item {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 18rpx 18rpx 16rpx;
  position: relative;
  .tab-text {
    font-size: 26rpx;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .tab-badge {
    min-width: 28rpx;
    height: 28rpx;
    padding: 0 8rpx;
    border-radius: 999rpx;
    background: var(--status-error);
    color: #fff;
    font-size: 18rpx;
    line-height: 28rpx;
    text-align: center;
    font-family: var(--font-family-base);
  }
  &.active {
    .tab-text {
      color: var(--brand-primary);
      font-weight: 700;
    }
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 40rpx;
      height: 4rpx;
      border-radius: 2rpx;
      background: var(--brand-primary);
    }
  }
}
.list {
  padding: 16rpx 24rpx;
}
.loadmore {
  padding: 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--brand-primary);
}
.end {
  padding: 24rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.safe-bottom { height: 40rpx; }
</style>
