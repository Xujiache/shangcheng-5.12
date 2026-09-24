<script setup lang="ts">
/**
 * 商家工作台首页
 *
 * 信息层级参考主流商家工作台：店铺身份 → 今日经营 → 待处理 → 常用工具 → 趋势/机会。
 * 所有数字来自真实接口；没有采集基础的访客、曝光等指标不在此展示。
 */
import { computed, onMounted, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import type { MerchantDashboard } from '@jiujiu/shared/types'
import { formatPrice, formatTime, formatWan } from '@jiujiu/shared/utils'
import { dashboardService } from '../../../services/dashboard'
import { profileService, type MerchantProfile } from '../../../services/profile'
import { memberService, type MembershipView } from '../../../services/member'
import { plazaService, type PlazaPlazaProduct } from '../../../services/store'
import { useFeatureFlagStore } from '../../../store'
import { safeSwitchTab, setTabFilterIntent } from '../../../utils/tab-nav'
import { useStatusBar } from '../../../composables/useStatusBar'
import BarChart from '../../../components/bar-chart/bar-chart.vue'
const { heroPaddingTop } = useStatusBar(16)

const flagStore = useFeatureFlagStore()
const dashboard = ref<MerchantDashboard | null>(null)
const profile = ref<MerchantProfile | null>(null)
const membership = ref<MembershipView | null>(null)
const plazaProducts = ref<PlazaPlazaProduct[]>([])
const dashboardLoading = ref(true)
const dashboardError = ref(false)
const plazaLoading = ref(true)

const shopName = computed(() => profile.value?.shopName || '经纬科技 · 商家版')
const shopAvatar = computed(() => profile.value?.avatar || '')
const merchantType = computed(() => {
  if (profile.value?.type === 'factory') return '厂家'
  if (profile.value?.type === 'store') return '门店'
  return '商家'
})

const memberLabel = computed(() => {
  const item = membership.value
  if (!item) return '未开通会员'
  if (item.status === 'trial') return `试用 · ${Math.max(0, item.remainingDays)}天`
  if (item.status === 'active')
    return `${item.plan?.name || '会员'} · ${Math.max(0, item.remainingDays)}天`
  if (item.status === 'expired') return '会员已到期'
  return '会员已取消'
})

const workbench = computed(() => dashboard.value?.workbench)
const unreadMessages = computed(() => workbench.value?.actions.unreadMessages || 0)
const updatedTime = computed(() =>
  workbench.value?.updatedAt ? formatTime(workbench.value.updatedAt) : '--:--',
)

function compactMoney(value: number): string {
  return value >= 10_000 ? `¥${formatWan(value)}` : formatPrice(value)
}

function comparisonText(value: number | null): string {
  if (value === null) return '较昨日 --'
  if (value === 0) return '较昨日持平'
  return `较昨日 ${value > 0 ? '↑' : '↓'} ${Math.abs(value).toFixed(1)}%`
}

function comparisonTone(value: number | null): string {
  if (value === null || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}

function countText(value: number): string {
  return value > 99 ? '99+' : String(value || 0)
}

function goMember() {
  uni.navigateTo({ url: '/pages/member/index' })
}

function goChat(focusUnread = false) {
  uni.navigateTo({ url: `/pages/chat/sessions${focusUnread ? '?tab=unread' : ''}` })
}

function goOrder(status: 'all' | 'pending_shipment') {
  setTabFilterIntent('order', status)
  safeSwitchTab('/pages/tabbar/order/index')
}

function goRejectedProducts() {
  setTabFilterIntent('product', 'rejected')
  safeSwitchTab('/pages/tabbar/product/index')
}

function goEntry(to: string) {
  if (to.startsWith('/pages/tabbar/')) safeSwitchTab(to)
  else uni.navigateTo({ url: to })
}

const overviewItems = computed(() => {
  const overview = workbench.value?.overview
  if (!overview) return []
  return [
    {
      key: 'amount',
      label: '实付成交额',
      value: compactMoney(overview.paidAmount),
      comparison: overview.versusYesterday.paidAmountPct,
      onClick: () => safeSwitchTab('/pages/tabbar/stats/index'),
    },
    {
      key: 'orders',
      label: '实付订单',
      value: String(overview.paidOrders),
      comparison: overview.versusYesterday.paidOrdersPct,
      onClick: () => goOrder('all'),
    },
    {
      key: 'customers',
      label: '成交客户',
      value: String(overview.paidCustomers),
      comparison: overview.versusYesterday.paidCustomersPct,
      onClick: () => uni.navigateTo({ url: '/pages/customer/index' }),
    },
  ]
})

const todoItems = computed(() => {
  const actions = workbench.value?.actions
  if (!actions) return []
  return [
    {
      key: 'shipment',
      label: '待发货',
      count: actions.pendingShipment,
      onClick: () => goOrder('pending_shipment'),
    },
    {
      key: 'refund',
      label: '退款/售后',
      count: actions.pendingRefund,
      onClick: () => uni.navigateTo({ url: '/pages/order/aftersale?status=pending' }),
    },
    {
      key: 'message',
      label: '未读消息',
      count: actions.unreadMessages,
      onClick: () => goChat(true),
    },
    {
      key: 'rejected',
      label: '商品驳回',
      count: actions.rejectedProducts,
      onClick: goRejectedProducts,
    },
    {
      key: 'store',
      label: '门店申请',
      count: actions.pendingStoreAuth,
      onClick: () => uni.navigateTo({ url: '/pages/store/index?status=pending' }),
    },
  ]
})

const pendingTotal = computed(() => todoItems.value.reduce((sum, item) => sum + item.count, 0))

const CORE_ENTRIES = [
  {
    key: 'order',
    icon: 'biz-order',
    label: '订单',
    to: '/pages/tabbar/order/index',
    tone: 'orange',
    color: '#FF4D2D',
  },
  {
    key: 'product',
    icon: 'biz-product',
    label: '商品',
    to: '/pages/tabbar/product/index',
    tone: 'blue',
    color: '#3478F6',
  },
  {
    key: 'customer',
    icon: 'biz-customer',
    label: '客户',
    to: '/pages/customer/index',
    tone: 'green',
    color: '#18A66A',
  },
  {
    key: 'stats',
    icon: 'biz-stats',
    label: '数据',
    to: '/pages/tabbar/stats/index',
    tone: 'purple',
    color: '#7A5AF8',
  },
  {
    key: 'chat',
    icon: 'biz-chat',
    label: '客服',
    to: '/pages/chat/sessions',
    tone: 'pink',
    color: '#E84D8A',
  },
  {
    key: 'marketing',
    icon: 'biz-marketing',
    label: '营销',
    to: '/pages/marketing/index',
    tone: 'amber',
    color: '#D98B00',
  },
  {
    key: 'store',
    icon: 'biz-store',
    label: '门店',
    to: '/pages/store/index',
    tone: 'cyan',
    color: '#148CA8',
  },
  {
    key: 'staff',
    icon: 'biz-staff',
    label: '员工',
    to: '/pages/staff/index',
    tone: 'teal',
    color: '#148F83',
  },
  {
    key: 'agency',
    icon: 'tag',
    label: '代理',
    to: '/pages/product/agency-list',
    tone: 'red',
    color: '#E64B4B',
  },
  {
    key: 'price-rule',
    icon: 'wallet',
    label: '价格',
    to: '/pages/shop/price-rule',
    tone: 'gray',
    color: '#646A73',
  },
] as const

const visibleEntries = computed(() =>
  CORE_ENTRIES.filter((entry) => flagStore.isHomeEntryEnabled(entry.key)),
)

const trendValues = computed(() => workbench.value?.trend7d.map((item) => item.paidAmount) || [])
const trendLabels = computed(
  () =>
    workbench.value?.trend7d.map(
      (item) => `${Number(item.date.slice(5, 7))}/${Number(item.date.slice(8, 10))}`,
    ) || [],
)
const trendTotal = computed(() => trendValues.value.reduce((sum, value) => sum + value, 0))
const trendPeakIndex = computed(() => {
  if (!trendValues.value.length) return -1
  return trendValues.value.indexOf(Math.max(...trendValues.value))
})

async function loadDashboard() {
  dashboardLoading.value = !dashboard.value
  dashboardError.value = false
  try {
    dashboard.value = await dashboardService.getDashboard()
  } catch {
    if (!dashboard.value) dashboardError.value = true
  } finally {
    dashboardLoading.value = false
  }
}

async function loadProfile() {
  try {
    profile.value = await profileService.get()
  } catch {
    // 店铺资料失败时保留默认身份，不影响工作台核心数据。
  }
}

async function loadMembership() {
  try {
    membership.value = await memberService.myMembership()
  } catch {
    membership.value = null
  }
}

async function loadPlaza() {
  plazaLoading.value = plazaProducts.value.length === 0
  try {
    const page = await plazaService.products({ page: 1, pageSize: 3 })
    plazaProducts.value = page.list
  } catch {
    plazaProducts.value = []
  } finally {
    plazaLoading.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadProfile(), loadMembership(), loadPlaza()])
  uni.stopPullDownRefresh()
}

function goPlaza() {
  uni.navigateTo({ url: '/pages/plaza/index' })
}

function goPlazaFactory(factoryId: string) {
  uni.navigateTo({ url: `/pages/plaza/factory?id=${factoryId}` })
}

onMounted(() => {
  flagStore.fetchFlags()
})

onShow(refreshAll)
onPullDownRefresh(refreshAll)
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
      <view class="topbar" :style="{ paddingTop: heroPaddingTop }">
        <view class="shop-identity">
          <view class="shop-avatar">
            <image v-if="shopAvatar" :src="shopAvatar" class="avatar-image" mode="aspectFill" />
            <text v-else class="avatar-letter">{{ shopName.slice(0, 1) }}</text>
          </view>
          <view class="shop-copy">
            <view class="shop-title-row">
              <text class="shop-name">{{ shopName }}</text>
              <view class="type-chip">{{ merchantType }}</view>
            </view>
            <view class="member-chip" @click="goMember">
              <wd-icon :name="$jwIcon('crown')" size="9px" color="#A66A16" />
              <text>{{ memberLabel }}</text>
              <wd-icon :name="$jwIcon('forward')" size="7px" color="#A66A16" />
            </view>
          </view>
        </view>
        <view class="message-button" @click="goChat(unreadMessages > 0)">
          <wd-icon :name="$jwIcon('biz-chat')" size="19px" color="#1F2329" />
          <text v-if="unreadMessages > 0" class="message-badge">{{
            countText(unreadMessages)
          }}</text>
        </view>
      </view>

      <view class="content">
        <template v-if="workbench">
          <view class="business-card">
            <view class="section-head compact">
              <view class="section-title-row">
                <text class="section-title">今日经营</text>
                <text class="data-caption">实付数据</text>
              </view>
              <view class="updated-at">
                <text>{{ updatedTime }} 更新</text>
                <wd-icon :name="$jwIcon('refresh')" size="11px" color="#86909C" />
              </view>
            </view>
            <view class="overview-grid">
              <view
                v-for="item in overviewItems"
                :key="item.key"
                class="overview-item"
                @click="item.onClick"
              >
                <text class="overview-label">{{ item.label }}</text>
                <text class="overview-value">{{ item.value }}</text>
                <text :class="['overview-compare', comparisonTone(item.comparison)]">
                  {{ comparisonText(item.comparison) }}
                </text>
              </view>
            </view>
          </view>

          <view class="todo-card">
            <view class="section-head compact">
              <view class="section-title-row">
                <text class="section-title">待处理</text>
                <text v-if="pendingTotal > 0" class="total-chip">{{
                  countText(pendingTotal)
                }}</text>
              </view>
              <text class="todo-hint">及时处理有助于提升服务体验</text>
            </view>
            <view class="todo-grid">
              <view
                v-for="item in todoItems"
                :key="item.key"
                class="todo-item"
                @click="item.onClick"
              >
                <text :class="['todo-count', item.count > 0 && 'active']">{{
                  countText(item.count)
                }}</text>
                <text class="todo-label">{{ item.label }}</text>
              </view>
            </view>
          </view>
        </template>

        <view v-else-if="dashboardLoading" class="dashboard-skeleton">
          <view class="skeleton-line title" />
          <view class="skeleton-row">
            <view v-for="index in 3" :key="index" class="skeleton-stat" />
          </view>
          <view class="skeleton-line short" />
        </view>

        <view v-else-if="dashboardError" class="dashboard-error">
          <view class="error-icon"
            ><wd-icon :name="$jwIcon('refresh')" size="17px" color="#FF4D2D"
          /></view>
          <view class="error-copy">
            <text class="error-title">经营数据加载失败</text>
            <text class="error-desc">请检查网络后重试，其他功能仍可正常使用</text>
          </view>
          <view class="retry-button" @click="loadDashboard">重试</view>
        </view>

        <view class="panel tools-panel">
          <view class="section-head">
            <text class="section-title">常用工具</text>
          </view>
          <view class="tool-grid">
            <view
              v-for="entry in visibleEntries"
              :key="entry.key"
              class="tool-item"
              @click="goEntry(entry.to)"
            >
              <view :class="['tool-icon', `tone-${entry.tone}`]">
                <wd-icon :name="$jwIcon(entry.icon)" size="19px" :color="entry.color" />
              </view>
              <text class="tool-label">{{ entry.label }}</text>
            </view>
          </view>
        </view>

        <view v-if="workbench" class="panel trend-panel">
          <view class="section-head">
            <view>
              <text class="section-title">近七日成交</text>
              <view class="trend-total-row">
                <text class="trend-total">{{ formatPrice(trendTotal) }}</text>
                <text class="trend-caption">实付成交额</text>
              </view>
            </view>
            <view class="section-action" @click="safeSwitchTab('/pages/tabbar/stats/index')">
              <text>查看数据</text>
              <wd-icon :name="$jwIcon('forward')" size="9px" color="#86909C" />
            </view>
          </view>
          <view class="chart-wrap">
            <BarChart
              :data="trendValues"
              :labels="trendLabels"
              :height="190"
              :highlight-index="trendPeakIndex"
            />
          </view>
        </view>

        <view class="panel plaza-panel">
          <view class="section-head">
            <view>
              <view class="plaza-title-row">
                <text class="section-title">选品机会</text>
                <text class="opportunity-chip">厂家直供</text>
              </view>
              <text class="section-subtitle">发现真实货源，快速扩充在售商品</text>
            </view>
            <view class="section-action" @click="goPlaza">
              <text>进入广场</text>
              <wd-icon :name="$jwIcon('forward')" size="9px" color="#86909C" />
            </view>
          </view>

          <view v-if="plazaLoading" class="plaza-skeleton-row">
            <view v-for="index in 3" :key="index" class="plaza-skeleton" />
          </view>
          <view v-else-if="plazaProducts.length" class="plaza-grid">
            <view
              v-for="product in plazaProducts"
              :key="product.productId"
              class="plaza-product"
              @click="goPlazaFactory(product.factoryId)"
            >
              <view class="product-image-wrap">
                <image
                  v-if="product.productImage"
                  :src="product.productImage"
                  class="product-image"
                  mode="aspectFill"
                />
                <view v-else class="image-empty"
                  ><wd-icon :name="$jwIcon('biz-product')" size="17px" color="#C9CDD4"
                /></view>
              </view>
              <text class="product-name">{{ product.productName }}</text>
              <text class="product-price">{{ formatPrice(product.startPrice) }}起</text>
            </view>
          </view>
          <view v-else class="plaza-empty" @click="goPlaza">
            <view class="plaza-empty-icon"
              ><wd-icon :name="$jwIcon('biz-plaza')" size="19px" color="#FF4D2D"
            /></view>
            <view class="plaza-empty-copy">
              <text class="plaza-empty-title">去选品广场看看</text>
              <text class="plaza-empty-desc">当前暂无推荐，仍可浏览全部厂家和商品</text>
            </view>
            <wd-icon :name="$jwIcon('forward')" size="11px" color="#86909C" />
          </view>
        </view>

        <view class="safe-bottom" />
      </view>

      <PrimaryLiquidTabBar flavor="merchant" active="home" />
    </view>
  </wd-config-provider>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
  color: #1f2329;
}

.topbar {
  min-height: 92rpx;
  padding-right: 28rpx;
  padding-bottom: 18rpx;
  padding-left: 28rpx;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  border-bottom: 1rpx solid #f0f1f2;
}
.shop-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.shop-avatar {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  overflow: hidden;
  background: #fff1ec;
  color: #ff4d2d;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1rpx rgba(255, 77, 45, 0.12);
}
.avatar-image {
  width: 100%;
  height: 100%;
}
.avatar-letter {
  font-size: 30rpx;
  font-weight: 700;
}
.shop-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7rpx;
}
.shop-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}
.shop-name {
  max-width: 350rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 700;
}
.type-chip {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #fff1ec;
  color: #ff4d2d;
  font-size: 19rpx;
  line-height: 30rpx;
}
.member-chip {
  align-self: flex-start;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 5rpx;
  color: #8a5a19;
  font-size: 20rpx;
  line-height: 28rpx;
}
.member-chip text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.message-button {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: var(--bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-button:active {
  background: #eef0f2;
}
.message-badge {
  position: absolute;
  top: -5rpx;
  right: -7rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  border: 3rpx solid #fff;
  border-radius: 999rpx;
  background: #ff3b30;
  color: #fff;
  font-size: 17rpx;
  line-height: 28rpx;
  text-align: center;
  box-sizing: content-box;
}
.content {
  padding: 20rpx 22rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.business-card,
.todo-card,
.panel,
.dashboard-skeleton,
.dashboard-error {
  background: var(--bg-card);
  border-radius: 22rpx;
  box-shadow: 0 3rpx 14rpx rgba(31, 35, 41, 0.035);
}
.business-card {
  padding: 24rpx 24rpx 22rpx;
}
.todo-card {
  padding: 22rpx 12rpx 18rpx;
}
.panel {
  padding: 25rpx 24rpx;
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}
.section-head.compact {
  align-items: center;
  margin: 0 4rpx 18rpx;
}
.section-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.section-title {
  font-size: 28rpx;
  line-height: 40rpx;
  font-weight: 700;
}
.section-subtitle {
  display: block;
  margin-top: 4rpx;
  color: var(--text-tertiary);
  font-size: 21rpx;
}
.data-caption,
.total-chip,
.opportunity-chip {
  padding: 2rpx 9rpx;
  border-radius: 6rpx;
  background: #fff1ec;
  color: #ff4d2d;
  font-size: 18rpx;
  line-height: 28rpx;
}
.total-chip {
  min-width: 24rpx;
  text-align: center;
}
.updated-at,
.section-action {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: var(--text-tertiary);
  font-size: 20rpx;
}
.todo-hint {
  color: #a0a5ad;
  font-size: 19rpx;
}
.overview-grid {
  display: flex;
}
.overview-item {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 4rpx 15rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7rpx;
}
.overview-item:first-child {
  padding-left: 4rpx;
}
.overview-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 11rpx;
  right: 0;
  width: 1rpx;
  height: 78rpx;
  background: #f0f1f2;
}
.overview-label {
  color: #6b7078;
  font-size: 21rpx;
}
.overview-value {
  max-width: 100%;
  color: #171a1f;
  font-size: 34rpx;
  line-height: 43rpx;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overview-compare {
  color: var(--text-tertiary);
  font-size: 18rpx;
  white-space: nowrap;
}
.overview-compare.up {
  color: #f04d2f;
}
.overview-compare.down {
  color: #00a870;
}
.overview-compare.flat {
  color: #a0a5ad;
}
.todo-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.todo-item {
  min-width: 0;
  min-height: 78rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7rpx;
}
.todo-count {
  color: #4e535b;
  font-size: 34rpx;
  line-height: 40rpx;
  font-weight: 700;
}
.todo-count.active {
  color: #ff4d2d;
}
.todo-label {
  max-width: 100%;
  color: #6b7078;
  font-size: 19rpx;
  white-space: nowrap;
}
.tool-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  row-gap: 27rpx;
}
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.tool-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 19rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tool-label {
  color: #4e535b;
  font-size: 21rpx;
}
.tone-orange {
  color: #ff4d2d;
  background: #fff0eb;
}
.tone-blue {
  color: #3478f6;
  background: #edf4ff;
}
.tone-green {
  color: #18a66a;
  background: #ecf9f3;
}
.tone-purple {
  color: #7a5af8;
  background: #f2efff;
}
.tone-pink {
  color: #e84d8a;
  background: #fff0f6;
}
.tone-amber {
  color: #d98b00;
  background: #fff6df;
}
.tone-cyan {
  color: #148ca8;
  background: #eaf8fb;
}
.tone-teal {
  color: #148f83;
  background: #eaf8f6;
}
.tone-red {
  color: #e64b4b;
  background: #fff0f0;
}
.tone-gray {
  color: #646a73;
  background: #f1f3f5;
}
.trend-total-row {
  margin-top: 6rpx;
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.trend-total {
  color: #171a1f;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 700;
}
.trend-caption {
  color: #a0a5ad;
  font-size: 19rpx;
}
.chart-wrap {
  margin: 0 -4rpx -4rpx;
}
.plaza-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.plaza-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15rpx;
}
.plaza-product {
  min-width: 0;
}
.product-image-wrap {
  width: 100%;
  height: 146rpx;
  overflow: hidden;
  border-radius: 14rpx;
  background: var(--bg-page);
}
.product-image {
  width: 100%;
  height: 100%;
}
.image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-name {
  display: block;
  margin-top: 9rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4e535b;
  font-size: 20rpx;
}
.product-price {
  display: block;
  margin-top: 5rpx;
  color: #ff4d2d;
  font-size: 21rpx;
  font-weight: 600;
}
.plaza-empty {
  min-height: 105rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.plaza-empty-icon {
  width: 70rpx;
  height: 70rpx;
  border-radius: 18rpx;
  background: #fff1ec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plaza-empty-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}
.plaza-empty-title {
  color: #1f2329;
  font-size: 23rpx;
  font-weight: 600;
}
.plaza-empty-desc {
  color: #a0a5ad;
  font-size: 19rpx;
}
.dashboard-skeleton {
  height: 310rpx;
  padding: 28rpx;
  box-sizing: border-box;
}
.skeleton-line,
.skeleton-stat,
.plaza-skeleton {
  background: linear-gradient(90deg, #f1f2f4 25%, #f8f9fa 37%, #f1f2f4 63%);
  background-size: 400% 100%;
  animation: skeleton 1.4s ease infinite;
}
.skeleton-line {
  width: 160rpx;
  height: 26rpx;
  border-radius: 8rpx;
}
.skeleton-line.short {
  width: 230rpx;
  height: 20rpx;
  margin-top: 28rpx;
}
.skeleton-row {
  display: flex;
  gap: 18rpx;
  margin-top: 34rpx;
}
.skeleton-stat {
  flex: 1;
  height: 112rpx;
  border-radius: 14rpx;
}
.plaza-skeleton-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15rpx;
}
.plaza-skeleton {
  height: 190rpx;
  border-radius: 14rpx;
}
.dashboard-error {
  min-height: 124rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 15rpx;
}
.error-icon {
  width: 62rpx;
  height: 62rpx;
  border-radius: 16rpx;
  background: #fff1ec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.error-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}
.error-title {
  color: #1f2329;
  font-size: 23rpx;
  font-weight: 600;
}
.error-desc {
  color: var(--text-tertiary);
  font-size: 19rpx;
}
.retry-button {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #ff4d2d;
  color: #fff;
  font-size: 20rpx;
}
.safe-bottom {
  height: calc(130rpx + env(safe-area-inset-bottom));
}
@keyframes skeleton {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
