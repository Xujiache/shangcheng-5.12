<script setup lang="ts">
/**
 * UM-09 · 我的订单
 * 还原 原型图/user-mini.jsx::UM_Orders
 * - 顶部 5 个状态 Tab（全部/待付款/待发货/待收货/售后）
 * - 订单卡：订单号 + 状态色块 + 商品列表 + 合计 + 操作按钮
 */
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { orderService, productService } from '../../services'
import { useCartStore } from '../../store/cart'
import type { Order } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'
import { safeSwitchTab } from '../../utils/tab-nav'

const cartStore = useCartStore()

type TabKey = 'all' | 'pending_payment' | 'pending_shipment' | 'shipped' | 'after_sale'

const tab = ref<TabKey>('all')
const orders = ref<Order[]>([])
const loading = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'pending_shipment', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'after_sale', label: '售后' },
]

/**
 * 订单状态展示元数据。
 *
 * 当前后端业务路径只把订单推进到 after_sale(售后中);"已退款"由商家端的 Refund 单独维护,
 * 不会回写到 Order.status='refunded'。所以本端**不展示** refunded 状态,避免列表出现
 * 永远不会出现的"已退款"标签误导用户(后续若后端增加退款完成回写,再补回来)。
 */
const STATUS_META: Record<string, { label: string; tint: string }> = {
  pending_payment: { label: '待付款', tint: '#FF4D2D' },
  pending_shipment: { label: '待发货', tint: '#FF7A45' },
  shipped: { label: '待收货', tint: '#A855F7' },
  completed: { label: '已完成', tint: '#52C41A' },
  cancelled: { label: '已取消', tint: '#86909C' },
  after_sale: { label: '售后中', tint: '#FAAD14' },
}

onLoad((options) => {
  const s = options?.status as TabKey | undefined
  if (s && TABS.find((t) => t.key === s)) tab.value = s
})

// 用 onShow（首次进入 + 每次从订单详情返回都会触发）拉取，确保取消/确认收货/申请售后后列表状态实时刷新
onShow(load)

async function load() {
  loading.value = true
  try {
    const res = await orderService.list({
      status: tab.value === 'all' ? undefined : tab.value,
      pageSize: 30,
    })
    orders.value = res.list
  } finally {
    loading.value = false
  }
}

function switchTab(k: TabKey) {
  if (tab.value === k) return
  tab.value = k
  load()
}

function goDetail(o: Order) {
  uni.navigateTo({ url: `/pages/order/detail?id=${o.id}` })
}

function payOrder(o: Order) {
  uni.navigateTo({ url: `/pages/order/pay?orderId=${o.id}&orderNo=${o.no}&amount=${o.payAmount}` })
}

function cancelOrder(o: Order) {
  uni.showModal({
    title: '取消订单',
    content: '确认取消该订单？',
    success: async (r) => {
      if (r.confirm) {
        await orderService.cancel(o.id)
        uni.showToast({ title: '已取消', icon: 'success' })
        load()
      }
    },
  })
}

async function urgeShip(o: Order) {
  await orderService.urge(o.id)
  uni.showToast({ title: '已提醒商家发货', icon: 'success' })
}

function confirmOrder(o: Order) {
  uni.showModal({
    title: '确认收货',
    content: '请确认已收到商品并满意',
    success: async (r) => {
      if (r.confirm) {
        await orderService.confirm(o.id)
        uni.showToast({ title: '已确认', icon: 'success' })
        load()
      }
    },
  })
}

/**
 * 申请售后：跳订单详情并附 action=refund 让详情页弹起售后类型 ActionSheet。
 * （未来如果做独立 pages/order/refund.vue 退款页，可把 action 改为 navigateTo 那个新页。）
 */
function applyAfter(o: Order) {
  uni.navigateTo({ url: `/pages/order/detail?id=${o.id}&action=refund` })
}

/**
 * 再来一单：拉订单详情，按行调 cartStore.addCart 复购。
 * - 商品已下架 / SKU 失效 → 跳过 + 提示
 * - 全部失败 → 不跳购物车，留在原页面
 * - 至少一条成功 → 跳购物车
 */
async function reorder(o: Order) {
  uni.showLoading({ title: '处理中…', mask: true })
  try {
    const detail = await orderService.detail(o.id)
    const items = detail?.items || []
    if (items.length === 0) {
      uni.hideLoading()
      uni.showToast({ title: '订单无商品可复购', icon: 'none' })
      return
    }
    let success = 0
    const skippedNames: string[] = []
    for (const it of items) {
      try {
        // 拉商品详情确认上架 + SKU 还在
        const pDetail = await productService.detail(it.productId, { silent: true })
        // 仅 active / auto_approved 可购；其余（offline/rejected/auditing/draft）一律视为不可下单跳过
        if (!pDetail || !['active', 'auto_approved'].includes((pDetail as any).status)) {
          skippedNames.push(it.productName)
          continue
        }
        const sku = (pDetail.skus || []).find((s: any) => s.id === it.skuId) || pDetail.skus?.[0]
        if (!sku?.id) {
          skippedNames.push(it.productName)
          continue
        }
        await cartStore.addCart({
          productId: it.productId,
          skuId: sku.id,
          name: it.productName,
          spec: sku.specsLabel || it.specsLabel || '默认规格',
          image: it.productImage,
          price: Number(sku.priceRetail ?? it.unitPrice) || it.unitPrice,
          qty: it.quantity,
        })
        success += 1
      } catch {
        skippedNames.push(it.productName)
      }
    }
    uni.hideLoading()
    if (success === 0) {
      uni.showToast({ title: '商品已下架或库存不足', icon: 'none', duration: 2000 })
      return
    }
    const tail = skippedNames.length > 0 ? `（${skippedNames.length} 件已下架跳过）` : ''
    uni.showToast({ title: `已加入 ${success} 件${tail}`, icon: 'success', duration: 1500 })
    setTimeout(() => safeSwitchTab('/pages/tabbar/cart/index'), 600)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

function copyOrderNo(o: Order) {
  uni.setClipboardData({
    data: o.no,
    success: () => uni.showToast({ title: '订单号已复制', icon: 'success' }),
  })
}

function totalQty(o: Order): number {
  return o.items?.reduce((s, l) => s + l.quantity, 0) ?? 0
}
</script>

<template>
  <view class="page">
    <NavBar title="我的订单" />

    <!-- 状态 Tab 栏 -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="switchTab(t.key)"
      >
        <text class="tab-label">{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o)">
        <!-- 头部：订单号 + 状态徽标 -->
        <view class="head">
          <view class="head-left" @click.stop="copyOrderNo(o)">
            <text class="head-label">订单号</text>
            <text class="head-no">{{ o.no }}</text>
            <view class="copy-btn">
              <Icon name="doc" :size="22" color="var(--text-tertiary)" />
            </view>
          </view>
          <view
            class="status-badge"
            :style="{
              color: STATUS_META[o.status]?.tint,
              background: (STATUS_META[o.status]?.tint || '#86909C') + '14',
            }"
          >
            {{ STATUS_META[o.status]?.label || o.status }}
          </view>
        </view>

        <!-- 商品列表 -->
        <view class="lines">
          <view v-for="l in (o.items || []).slice(0, 2)" :key="l.id" class="line">
            <image :src="l.productImage" mode="aspectFill" class="line-img" />
            <view class="line-info">
              <text class="line-name">{{ l.productName }}</text>
              <text class="line-spec">{{ l.specsLabel }}</text>
            </view>
            <view class="line-right">
              <text class="line-price">{{ formatPrice(l.unitPrice) }}</text>
              <text class="line-qty">×{{ l.quantity }}</text>
            </view>
          </view>
          <view v-if="(o.items?.length ?? 0) > 2" class="more-lines">
            <text>查看全部 {{ o.items!.length }} 件商品</text>
            <Icon name="chevron-down" :size="22" color="var(--text-tertiary)" />
          </view>
        </view>

        <!-- 合计 -->
        <view class="summary">
          <text class="sum-qty">共 {{ totalQty(o) }} 件</text>
          <view class="sum-amount">
            <text class="sum-label">合计</text>
            <text class="sum-cur">¥</text>
            <text class="sum-num">{{ formatPrice(o.payAmount) }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="actions" @click.stop>
          <template v-if="o.status === 'pending_payment'">
            <view class="btn ghost" @click="cancelOrder(o)">取消订单</view>
            <view class="btn primary" @click="payOrder(o)">去支付</view>
          </template>
          <template v-else-if="o.status === 'pending_shipment'">
            <view class="btn ghost" @click="goDetail(o)">查看详情</view>
            <view class="btn primary" @click="urgeShip(o)">催发货</view>
          </template>
          <template v-else-if="o.status === 'shipped'">
            <view class="btn ghost" @click="goDetail(o)">查看物流</view>
            <view class="btn primary" @click="confirmOrder(o)">确认收货</view>
          </template>
          <template v-else-if="o.status === 'completed'">
            <view class="btn ghost" @click="applyAfter(o)">申请售后</view>
            <view class="btn ghost" @click="reorder(o)">再来一单</view>
          </template>
          <template v-else>
            <view class="btn ghost" @click="goDetail(o)">查看详情</view>
          </template>
        </view>
      </view>

      <EmptyState
        v-if="!loading && orders.length === 0"
        title="暂无订单"
        desc="去首页逛逛吧"
        icon="package"
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

/* Tab 栏 */
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.02);
}
.tab {
  flex: 1;
  min-width: 0;
  padding: 24rpx 0 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  transition: color 0.2s;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .tab-label {
    display: block;
    line-height: 1;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 36rpx;
    height: 6rpx;
    background: $brand-gradient;
    border-radius: 6rpx 6rpx 0 0;
  }
}

/* 滚动区 */
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
  padding: 16rpx 24rpx;
}

/* 订单卡 */
.order-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 0;
  margin-bottom: 20rpx;
  box-shadow: $shadow-sm;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* 头部 */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx dashed var(--border-light);
  background: linear-gradient(180deg, rgba(255, 77, 45, 0.02), transparent);
  min-width: 0;
}
.head-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  overflow: hidden;
}
.head-label {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.head-no {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: var(--text-secondary);
  font-family: $font-family-base;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.copy-btn {
  flex-shrink: 0;
  padding: 4rpx;
}
.status-badge {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.2;
}

/* 商品列表 */
.lines {
  padding: 16rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.line {
  display: flex;
  gap: 16rpx;
  align-items: center;
  min-width: 0;
}
.line-img {
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: var(--bg-page);
}
.line-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.line-name {
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.line-spec {
  font-size: 22rpx;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.line-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  min-width: 100rpx;
}
.line-price {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
  font-family: $font-family-base;
}
.line-qty {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.more-lines {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
  border-top: 1rpx dashed var(--border-light);
}

/* 合计 */
.summary {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 0;
  border-top: 1rpx dashed var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  min-width: 0;
}
.sum-qty {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.sum-amount {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  flex-shrink: 0;
}
.sum-label {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.sum-cur {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--brand-primary);
  font-family: $font-family-base;
}
.sum-num {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--brand-primary);
  line-height: 1;
  font-family: $font-family-base;
}

/* 按钮 */
.actions {
  padding: 0 24rpx 20rpx;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  flex-wrap: nowrap;
  min-width: 0;
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.4;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: $brand-gradient;
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
</style>
