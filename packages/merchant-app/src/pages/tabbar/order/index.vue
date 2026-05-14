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
import { useHideNativeTabBar } from '../../../composables/useHideNativeTabBar'
import { useStatusBar } from '../../../composables/useStatusBar'

useHideNativeTabBar()
const { heroPaddingTop } = useStatusBar(16)

type Tab = 'all' | OrderStatus

const tab = ref<Tab>('pending_shipment')
const keyword = ref('')
const list = ref<Order[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)

/** 常用快递公司列表（按调用频次排序） */
const SHIP_COMPANIES = [
  { code: 'SF', name: '顺丰速运' },
  { code: 'JD', name: '京东物流' },
  { code: 'ZTO', name: '中通快递' },
  { code: 'YTO', name: '圆通速递' },
  { code: 'YD', name: '韵达快递' },
  { code: 'BEST', name: '百世快递' },
  { code: 'EMS', name: '中国邮政' },
] as const

const shipDialog = ref<{
  visible: boolean
  order: Order | null
  companyIndex: number
  trackingNumber: string
  submitting: boolean
}>({
  visible: false,
  order: null,
  companyIndex: 0,
  trackingNumber: '',
  submitting: false,
})

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
    openShipDialog(order)
  } else if (action === 'tracking') {
    showTracking(order)
  } else if (action === 'refund') {
    uni.navigateTo({ url: `/pages/order/aftersale?orderId=${order.id}` })
  }
}

/**
 * 物流跟踪弹窗：缺失数据时显示"暂无物流信息"，而不是 'SF' + Date.now() 这种假占位
 */
function showTracking(order: Order) {
  const company = order.trackingCompany?.trim()
  const number = order.trackingNumber?.trim()
  if (!company && !number) {
    uni.showModal({
      title: '物流信息',
      content: '暂无物流信息',
      showCancel: false,
    })
    return
  }
  uni.showModal({
    title: '物流信息',
    content: `${company || '未知快递'}\n${number || '暂无运单号'}`,
    showCancel: false,
  })
}

/** 打开发货弹窗（快递公司下拉 + 运单号输入） */
function openShipDialog(order: Order) {
  shipDialog.value = {
    visible: true,
    order,
    companyIndex: 0,
    trackingNumber: '',
    submitting: false,
  }
}

function closeShipDialog() {
  if (shipDialog.value.submitting) return
  shipDialog.value.visible = false
  shipDialog.value.order = null
}

function onShipCompanyChange(e: { detail: { value: string | number } }) {
  shipDialog.value.companyIndex = Number(e.detail.value)
}

async function confirmShip() {
  const dlg = shipDialog.value
  if (!dlg.order) return
  const tracking = dlg.trackingNumber.trim()
  if (!tracking) {
    uni.showToast({ title: '请输入运单号', icon: 'none' })
    return
  }
  if (!/^[A-Za-z0-9\-]{4,40}$/.test(tracking)) {
    uni.showToast({ title: '运单号格式不正确', icon: 'none' })
    return
  }
  const company = SHIP_COMPANIES[dlg.companyIndex]?.name
  if (!company) {
    uni.showToast({ title: '请选择快递公司', icon: 'none' })
    return
  }
  dlg.submitting = true
  uni.showLoading({ title: '发货中…', mask: true })
  try {
    await orderService.ship(dlg.order.id, { company, trackingNumber: tracking })
    uni.hideLoading()
    uni.showToast({ title: '已发货' })
    dlg.visible = false
    dlg.order = null
    load(true)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '发货失败', icon: 'none' })
  } finally {
    dlg.submitting = false
  }
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
    <view class="header" :style="{ paddingTop: heroPaddingTop }">
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

    <!-- 发货弹窗：快递公司下拉 + 运单号输入 -->
    <view v-if="shipDialog.visible" class="ship-mask" @click="closeShipDialog">
      <view class="ship-sheet" @click.stop>
        <view class="ship-head">
          <text class="ship-title">填写物流信息</text>
          <text class="ship-close" @click="closeShipDialog">✕</text>
        </view>
        <view class="ship-body">
          <view class="ship-field">
            <text class="ship-label">快递公司</text>
            <picker
              mode="selector"
              :range="SHIP_COMPANIES.map(c => c.name)"
              :value="shipDialog.companyIndex"
              @change="onShipCompanyChange"
            >
              <view class="ship-select">
                <text>{{ SHIP_COMPANIES[shipDialog.companyIndex]?.name || '请选择' }}</text>
                <Icon name="forward" :size="24" color="var(--text-tertiary)" />
              </view>
            </picker>
          </view>
          <view class="ship-field">
            <text class="ship-label">运单号</text>
            <input
              v-model="shipDialog.trackingNumber"
              class="ship-input"
              placeholder="请输入或粘贴运单号"
              maxlength="40"
            />
          </view>
        </view>
        <view class="ship-actions">
          <view class="ship-btn ghost" @click="closeShipDialog">取消</view>
          <view
            :class="['ship-btn', 'primary', { disabled: shipDialog.submitting }]"
            @click="confirmShip"
          >
            {{ shipDialog.submitting ? '提交中…' : '确认发货' }}
          </view>
        </view>
      </view>
    </view>

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
  /* padding-top 由内联 heroPaddingTop 注入（状态栏 + 16rpx） */
  padding: 0 24rpx 0;
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

/* 发货弹窗 */
.ship-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.ship-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.ship-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--border-light);
  .ship-title {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .ship-close {
    font-size: 32rpx;
    color: var(--text-tertiary);
    padding: 0 8rpx;
  }
}
.ship-body {
  padding: 20rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.ship-field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  .ship-label {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--text-secondary);
  }
}
.ship-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: var(--bg-page);
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text-primary);
}
.ship-input {
  padding: 0 24rpx;
  height: 88rpx;
  background: var(--bg-page);
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text-primary);
}
.ship-actions {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx 0;
}
.ship-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(255,77,45,0.3);
    &.disabled {
      opacity: 0.6;
      pointer-events: none;
    }
  }
}
</style>
