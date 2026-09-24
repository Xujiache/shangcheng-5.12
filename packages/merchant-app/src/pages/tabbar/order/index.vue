<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
/**
 * MA-08 · 订单列表
 *
 * 搜索 + 5 状态 Tab + 订单卡 + 状态化操作 + 下拉刷新
 *
 * 实时新订单推送（P1-13）：
 *  - 接入 useMerchantNotifyStream → 监听 order:new
 *  - 收到推送后：尊重 me/settings.vue 中的「推送通知」+「新订单提醒」开关
 *    - 开启：震动 + 声音（uni.createInnerAudioContext）+ toast + 自动刷新列表
 *    - 关闭：静默插入新订单到列表（不打扰）
 *  - 后端联调：需 Backend Agent 在订单创建处 emit('order:new', orderVo)
 *    并把 merchant socket join 到 'merchant:<merchantId>' 房间
 */
import { ref, computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh, onUnload } from '@dcloudio/uni-app'
import { orderService } from '../../../services/order'
import type { Order, OrderStatus } from '@jiujiu/shared/types'
import { formatDateTime, formatPrice } from '@jiujiu/shared/utils'
import { useStatusBar } from '../../../composables/useStatusBar'
import { useUserStore } from '../../../store/user'
import {
  useMerchantNotifyStream,
  type MerchantNewOrderPayload,
} from '../../../composables/useMerchantNotifyStream'
import { consumeTabFilterIntent } from '../../../utils/tab-nav'

const { heroPaddingTop } = useStatusBar(16)
const userStore = useUserStore()
const notify = useMerchantNotifyStream(userStore.accessToken || '')

type Tab = 'all' | OrderStatus

const ORDER_STATUS: Record<
  OrderStatus,
  { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending_payment: { text: '待付款', tone: 'warning' },
  pending_shipment: { text: '待发货', tone: 'primary' },
  shipped: { text: '已发货', tone: 'info' },
  completed: { text: '已完成', tone: 'success' },
  cancelled: { text: '已取消', tone: 'default' },
  after_sale: { text: '售后中', tone: 'error' },
  refunded: { text: '已退款', tone: 'default' },
}

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

function clearSearch() {
  keyword.value = ''
  onSearch()
}

function selectTab(next: Tab) {
  tab.value = next
  onTabChange()
}

function loadMore() {
  page.value += 1
  load()
}

function applyTabIntent(): boolean {
  const next = consumeTabFilterIntent('order') as Tab | null
  const allowed: Tab[] = [
    'all',
    'pending_payment',
    'pending_shipment',
    'shipped',
    'completed',
    'after_sale',
    'cancelled',
  ]
  if (!next || !allowed.includes(next)) return false
  tab.value = next
  return true
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
    appFeedback.showModal({
      title: '物流信息',
      content: '暂无物流信息',
      showCancel: false,
    })
    return
  }
  appFeedback.showModal({
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

function onShipCompanyChange(value: string | number | Array<string | number>) {
  shipDialog.value.companyIndex = Number(Array.isArray(value) ? value[0] : value)
}

async function confirmShip() {
  const dlg = shipDialog.value
  if (!dlg.order) return
  const tracking = dlg.trackingNumber.trim()
  if (!tracking) {
    appFeedback.showToast({ title: '请输入运单号', icon: 'none' })
    return
  }
  if (!/^[A-Za-z0-9\-]{4,40}$/.test(tracking)) {
    appFeedback.showToast({ title: '运单号格式不正确', icon: 'none' })
    return
  }
  const company = SHIP_COMPANIES[dlg.companyIndex]?.name
  if (!company) {
    appFeedback.showToast({ title: '请选择快递公司', icon: 'none' })
    return
  }
  dlg.submitting = true
  appFeedback.showLoading({ title: '发货中…', mask: true })
  try {
    await orderService.ship(dlg.order.id, { company, trackingNumber: tracking })
    appFeedback.hideLoading()
    appFeedback.showToast({ title: '已发货' })
    dlg.visible = false
    dlg.order = null
    load(true)
  } catch (e: any) {
    appFeedback.hideLoading()
    appFeedback.showToast({ title: e?.message || '发货失败', icon: 'none' })
  } finally {
    dlg.submitting = false
  }
}

function goDetail(order: Order) {
  uni.navigateTo({ url: `/pages/order/detail?id=${order.id}` })
}

/**
 * 读取设置页（pages/me/settings.vue）保存的通知偏好
 * key 与 settings.vue::KEY 必须保持一致
 */
const NOTIFY_PREFS_KEY = 'merchant_settings_prefs'
function getNotifyPrefs(): { notify: boolean; notifyOrder: boolean } {
  try {
    const raw = uni.getStorageSync(NOTIFY_PREFS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { notify: p.notify ?? true, notifyOrder: p.notifyOrder ?? true }
    }
  } catch {
    /* ignore */
  }
  return { notify: true, notifyOrder: true }
}

let audioCtx: ReturnType<typeof uni.createInnerAudioContext> | null = null
function playNewOrderSound() {
  // /static/audio/new-order.mp3 是约定资源路径；若文件不存在 play() 会静默失败，不影响主流程
  try {
    if (!audioCtx) {
      audioCtx = uni.createInnerAudioContext()
      audioCtx.src = '/static/audio/new-order.mp3'
      audioCtx.autoplay = false
    }
    audioCtx.stop()
    audioCtx.play()
  } catch {
    /* 资源缺失或平台不支持，忽略 */
  }
}

function handleNewOrder(payload: MerchantNewOrderPayload) {
  if (!payload || !payload.id) return
  const prefs = getNotifyPrefs()

  // 通知开关：尊重 settings 页
  if (prefs.notify && prefs.notifyOrder) {
    try {
      uni.vibrateShort({})
    } catch {
      /* ignore */
    }
    playNewOrderSound()
    appFeedback.showToast({
      title: `新订单：${payload.no || payload.id}`,
      icon: 'none',
      duration: 1500,
    })
  }

  // 不直接 splice payload 进列表（WS 轻量 payload 缺 address / items / payAmount 等字段，
  // 强插会触发 OrderCard 渲染空指针）。改为触发当前 tab 的 load(true) 重拉。
  // 抓不到当前 tab 时（如停在「已完成」），由于新订单状态多半是 pending_shipment，
  // 只更新 total 即可，避免无意义的拉取。
  const newStatus = (payload.status as OrderStatus) || 'pending_shipment'
  if (tab.value === 'all' || tab.value === newStatus) {
    load(true)
  } else {
    total.value = total.value + 1
  }
}

onMounted(async () => {
  applyTabIntent()
  load(true)
  if (userStore.accessToken) {
    try {
      await notify.ensureConnected()
      notify.onNewOrder(handleNewOrder)
    } catch (e) {
      console.warn('[order] notify stream connect failed:', e)
    }
  }
})
onShow(() => {
  const changedByIntent = applyTabIntent()
  if (changedByIntent || list.value.length > 0) load(true)
})
onPullDownRefresh(() => load(true))
onUnload(() => {
  notify.offNewOrder(handleNewOrder)
  try {
    audioCtx?.destroy?.()
  } catch {
    /* ignore */
  }
  audioCtx = null
})
</script>

<template>
  <wd-config-provider
    :theme="$jwTheme.resolvedTheme"
    :theme-vars="$jwTheme.themeVars"
    custom-class="jw-theme-root"
  >
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />
    <view class="page">
      <view class="header" :style="{ paddingTop: heroPaddingTop }">
        <view class="title-row">
          <text class="page-title">订单管理</text>
          <text class="page-sub">共 {{ total }} 笔</text>
        </view>
        <view class="search-wrap">
          <wd-icon :name="$jwIcon('search')" size="16px" color="var(--text-tertiary)" />
          <wd-input
            no-border
            v-model="keyword"
            class="search-input"
            placeholder="搜索订单号 / 客户姓名 / 手机号"
            confirm-type="search"
            @confirm="onSearch"
          />
          <view v-if="keyword" class="clear" @click="clearSearch">
            <wd-icon :name="$jwIcon('close')" size="12px" color="var(--text-tertiary)" />
          </view>
        </view>
        <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
          <view class="tabs-inline">
            <view
              v-for="t in TABS"
              :key="t.key"
              :class="['tab-item', tab === t.key && 'active']"
              @click="selectTab(t.key)"
            >
              <text class="tab-text">{{ t.label }}</text>
              <text v-if="t.badge && t.badge > 0" class="tab-badge">{{
                t.badge > 99 ? '99+' : t.badge
              }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="list">
        <wd-card v-for="o in list" :key="o.id" custom-class="order-card" @click="goDetail(o)">
          <view class="order-head">
            <view class="order-head-left">
              <text class="order-no">{{ o.no }}</text>
              <text class="order-customer">· {{ o.address.name }}</text>
            </view>
            <wd-tag :type="$jwTagType(ORDER_STATUS[o.status].tone)" plain round>
              {{ ORDER_STATUS[o.status].text }}
            </wd-tag>
          </view>
          <view v-if="o.items?.[0]" class="order-item">
            <wd-img
              :src="o.items[0].productImage"
              width="120rpx"
              height="120rpx"
              radius="8rpx"
              mode="aspectFill"
              enable-preview
            />
            <view class="order-item-info">
              <text class="order-item-name">{{ o.items[0].productName }}</text>
              <text class="order-item-spec"
                >{{ o.items[0].specsLabel }} · ×{{ o.items[0].quantity }}</text
              >
              <text v-if="o.items.length > 1" class="order-more"
                >共 {{ o.items.length }} 件商品</text
              >
            </view>
            <view class="order-price-wrap">
              <text class="order-price">{{ formatPrice(o.payAmount) }}</text>
              <text class="order-time">{{ formatDateTime(o.createdAt).slice(5, 16) }}</text>
            </view>
          </view>
          <template #footer>
            <view class="order-actions" @click.stop>
              <wd-button size="small" plain @click="onAction('detail', o)">详情</wd-button>
              <wd-button
                v-if="o.status === 'pending_shipment'"
                size="small"
                type="primary"
                @click="onAction('ship', o)"
                >发货</wd-button
              >
              <wd-button
                v-if="o.status === 'shipped'"
                size="small"
                plain
                @click="onAction('tracking', o)"
              >
                查物流
              </wd-button>
              <wd-button
                v-if="o.status === 'after_sale'"
                size="small"
                plain
                @click="onAction('refund', o)"
              >
                处理售后
              </wd-button>
            </view>
          </template>
        </wd-card>
        <wd-status-tip
          v-if="!loading && list.length === 0"
          image="content"
          :tip="['暂无订单', '切换标签或调整搜索条件'].filter(Boolean).join(' · ')"
        />
        <view v-if="hasMore && list.length > 0" class="loadmore" @click="loadMore">
          加载更多 ›
        </view>
        <view v-else-if="list.length > 0" class="end">— 没有更多了 —</view>
      </view>

      <view class="safe-bottom" />

      <!-- 发货弹窗：快递公司下拉 + 运单号输入 -->
      <wd-popup
        v-model="shipDialog.visible"
        position="bottom"
        custom-class="ship-sheet"
        safe-area-inset-bottom
        :close-on-click-modal="!shipDialog.submitting"
        @close="closeShipDialog"
      >
        <view class="ship-head">
          <text class="ship-title">填写物流信息</text>
          <wd-icon name="close" size="20px" color="var(--text-tertiary)" @click="closeShipDialog" />
        </view>
        <view class="ship-body">
          <wd-picker
            label="快递公司"
            title="选择快递公司"
            :model-value="shipDialog.companyIndex"
            :columns="SHIP_COMPANIES.map((c, index) => ({ label: c.name, value: index }))"
            align-right
            @confirm="onShipCompanyChange($event.value)"
          />

          <view class="ship-field">
            <text class="ship-label">运单号</text>
            <wd-input
              no-border
              v-model="shipDialog.trackingNumber"
              class="ship-input"
              placeholder="请输入或粘贴运单号"
              maxlength="40"
            />
          </view>
        </view>
        <view class="ship-actions">
          <wd-button block plain :disabled="shipDialog.submitting" @click="closeShipDialog"
            >取消</wd-button
          >
          <wd-button block type="primary" :loading="shipDialog.submitting" @click="confirmShip">
            {{ shipDialog.submitting ? '提交中…' : '确认发货' }}
          </wd-button>
        </view>
      </wd-popup>

      <PrimaryLiquidTabBar flavor="merchant" active="order" />
    </view>
  </wd-config-provider>
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
  .clear {
    padding: 4rpx;
  }
}
/* 直接内联 Tab 实现，避开 scroll-view + 组件 flex 冲突 */
.tabs-scroll {
  margin-top: 8rpx;
  border-bottom: 1rpx solid var(--border-light);
  width: 100%;
  white-space: nowrap;
  &::-webkit-scrollbar {
    display: none;
  }
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
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
:deep(.order-card) {
  margin: 0;
  border: 1rpx solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}
.order-head,
.order-head-left,
.order-item,
.order-actions {
  display: flex;
  align-items: center;
}
.order-head {
  justify-content: space-between;
  gap: 16rpx;
  padding-bottom: 16rpx;
  margin-bottom: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
}
.order-head-left {
  min-width: 0;
  gap: 6rpx;
}
.order-no,
.order-customer,
.order-item-spec,
.order-more,
.order-time {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.order-item {
  align-items: flex-start;
  gap: 16rpx;
}
.order-item-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.order-item-name {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-price-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}
.order-price {
  color: var(--brand-primary);
  font-size: 30rpx;
  font-weight: 700;
}
.order-actions {
  justify-content: flex-end;
  gap: 12rpx;
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
.safe-bottom {
  height: 40rpx;
}

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
    box-shadow: 0 4rpx 12rpx rgba(255, 77, 45, 0.3);
    &.disabled {
      opacity: 0.6;
      pointer-events: none;
    }
  }
}
</style>
