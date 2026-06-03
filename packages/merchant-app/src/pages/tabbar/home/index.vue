<script setup lang="ts">
/**
 * MA-01 · 商家 APP 首页（Wave5 重构 · 立体化）
 *
 * 视觉策略：
 *   - Hero 暖橙渐变 + 3 个柔光圆斑 + VIP 胶囊
 *   - 浮起的"今日数据"卡（白卡 3 指标），与 Hero 重叠出层级
 *   - 快捷入口由 Section 卡片包裹，10 个图标在两行 5 列网格内，每个有独立色彩 + 高光
 *   - 选品广场卡保留 + 优化层级（背景渐变 + HOT 标 + 横滑商品图）
 *   - 本周销售：增加"周总额 / 周订单"小指标条 + BarChart
 *   - 待办列表：彩色头像式 icon + 数量徽标，0 项灰显
 *
 * 严格保持原有：3 个 KPI、10 个快捷入口、选品广场、周销售、4 类待办（待发货 / 退款 / 门店授权 / 员工）、
 *               TabBar、loading 占位、profile/membership/dashboard 三条数据拉取。
 */
import { ref, onMounted, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { dashboardService } from '../../../services/dashboard'
import { profileService, type MerchantProfile } from '../../../services/profile'
import { memberService, type MembershipView } from '../../../services/member'
import { useFeatureFlagStore } from '../../../store'
import { formatPrice, formatWan } from '@jiujiu/shared/utils'
import type { MerchantDashboard } from '@jiujiu/shared/types'
import Section from '../../../components/section/section.vue'
import BarChart from '../../../components/bar-chart/bar-chart.vue'
import StatusTag from '../../../components/status-tag/status-tag.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'
import { useHideNativeTabBar } from '../../../composables/useHideNativeTabBar'
import { useStatusBar } from '../../../composables/useStatusBar'
import { safeSwitchTab } from '../../../utils/tab-nav'

useHideNativeTabBar()
const { heroPaddingTop } = useStatusBar(20)

const dashboard = ref<MerchantDashboard | null>(null)
const profile = ref<MerchantProfile | null>(null)
const membership = ref<MembershipView | null>(null)
// 三宫格当前高亮项（0=订单 / 1=新客户 / 2=销售额）默认高亮销售额
const activeStat = ref<0 | 1 | 2>(2)
const loading = ref(true)
const loadError = ref(false)
const flagStore = useFeatureFlagStore()

const brandName = computed(() => profile.value?.shopName || '经纬科技 · 商家版')
const brandAvatar = computed(() => profile.value?.avatar || '')

/**
 * VIP 副标题（来源 memberService.myMembership()）
 *   - 试用中:    "VIP · 试用 · 剩余 N 天"
 *   - 已开通:    "VIP · {套餐名} · 剩余 N 天"
 *   - 已过期:    "会员已过期 · 点击续费"
 *   - 已取消:    "会员已取消"
 *   - 未开通:    "尚未开通 · 点击查看套餐"
 */
const membershipSub = computed(() => {
  const m = membership.value
  if (!m) return '尚未开通 · 点击查看套餐'
  const planName = m.plan?.name || '会员套餐'
  const remaining = Math.max(0, m.remainingDays)
  if (m.status === 'expired') return '会员已过期 · 点击续费'
  if (m.status === 'cancelled') return '会员已取消'
  if (m.status === 'trial') return `VIP · 试用 · 剩余 ${remaining} 天`
  return `VIP · ${planName} · 剩余 ${remaining} 天`
})

const isVipActive = computed(() => {
  const s = membership.value?.status
  return s === 'active' || s === 'trial'
})

async function loadProfile() {
  try {
    profile.value = await profileService.get()
  } catch {
    /* 失败保留默认文案 */
  }
}

async function loadMembership() {
  try {
    membership.value = await memberService.myMembership()
  } catch {
    membership.value = null
  }
}

function goMember() {
  uni.navigateTo({ url: '/pages/member/index' })
}

/** 主入口：10 个槽位（一行 5 个，两行） */
const CORE_ENTRIES = [
  { key: 'product', icon: 'biz-product', label: '商品', to: '/pages/tabbar/product/index', tint: 'orange' },
  { key: 'order', icon: 'biz-order', label: '订单', to: '/pages/tabbar/order/index', tint: 'blue' },
  { key: 'customer', icon: 'biz-customer', label: '客户', to: '/pages/customer/index', tint: 'green' },
  { key: 'stats', icon: 'biz-stats', label: '数据', to: '/pages/tabbar/stats/index', tint: 'purple' },
  { key: 'chat', icon: 'biz-chat', label: '客服', to: '/pages/chat/index', tint: 'pink' },
  { key: 'marketing', icon: 'biz-marketing', label: '营销', to: '/pages/marketing/index', tint: 'yellow' },
  { key: 'store', icon: 'biz-store', label: '门店', to: '/pages/store/index', tint: 'cyan' },
  { key: 'staff', icon: 'biz-staff', label: '员工', to: '/pages/staff/index', tint: 'teal' },
  { key: 'agency', icon: 'tag', label: '代理', to: '/pages/product/agency-list', tint: 'red' },
  { key: 'price-rule', icon: 'wallet', label: '价格', to: '/pages/shop/price-rule', tint: 'gray' },
]

const visibleCore = computed(() => CORE_ENTRIES.filter((e) => flagStore.isHomeEntryEnabled(e.key)))

const totalTodos = computed(() => {
  if (!dashboard.value) return 0
  const t = dashboard.value.todos
  return (
    (t.pendingShipment ?? 0) +
    (t.pendingRefund ?? 0) +
    (t.pendingStoreAuth ?? 0) +
    (t.pendingStaff ?? 0)
  )
})

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    dashboard.value = await dashboardService.getDashboard()
  } catch {
    // 拉取失败（网络/无权限等）→ 标记错误态，模板展示「加载失败 + 重试」，避免正文整块空白
    if (!dashboard.value) loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 后端 dashboard.weekSales 是「今天往前 7 天滚动」的数组，
 *  所以标签必须按"今天的星期几"逆向计算，不能写死 一二三四五六日 */
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']
const weekLabels = computed(() => {
  const now = new Date()
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400_000)
    return WEEKDAY[d.getDay()]
  })
})

/** 周销售小指标（与 BarChart 并列）：本周累计 + 峰值 */
const weekTotal = computed(() =>
  (dashboard.value?.weekSales || []).reduce((s, v) => s + v, 0),
)
const weekPeak = computed(() => Math.max(0, ...(dashboard.value?.weekSales || [])))

function goPlaza() {
  uni.navigateTo({ url: '/pages/plaza/index' })
}

function goEntry(to: string) {
  if (to.startsWith('/pages/tabbar/')) {
    safeSwitchTab(to)
  } else {
    uni.navigateTo({ url: to })
  }
}

function goPendingOrder() {
  safeSwitchTab('/pages/tabbar/order/index')
}

/** 4 类待办（顺序与 dashboard.todos 字段映射保持一致） */
const todoItems = computed(() => {
  const t = dashboard.value?.todos
  if (!t) return []
  return [
    {
      key: 'shipment',
      icon: 'biz-order',
      tint: 'orange',
      count: t.pendingShipment ?? 0,
      label: '订单待发货',
      onClick: goPendingOrder,
    },
    {
      key: 'refund',
      icon: 'biz-aftersale',
      tint: 'red',
      count: t.pendingRefund ?? 0,
      label: '退款待处理',
      onClick: () => uni.navigateTo({ url: '/pages/order/aftersale' }),
    },
    {
      key: 'store-auth',
      icon: 'biz-store',
      tint: 'blue',
      count: t.pendingStoreAuth ?? 0,
      label: '门店授权申请',
      onClick: () => uni.navigateTo({ url: '/pages/store/index' }),
    },
    {
      key: 'staff',
      icon: 'biz-staff',
      tint: 'green',
      count: t.pendingStaff ?? 0,
      label: '员工待入职',
      onClick: () => uni.navigateTo({ url: '/pages/staff/index' }),
    },
  ]
})

onMounted(() => {
  // 仅一次性初始化放这里；数据加载统一交给 onShow（首次进入也会触发），
  // 避免 onMounted 与 onShow 在首帧重复拉取 dashboard/profile/membership。
  flagStore.fetchFlags()
})

onShow(() => {
  loadData()
  loadProfile()
  loadMembership()
})
</script>

<template>
  <view class="page">
    <!-- Hero：暖橙渐变 + 圆斑 + 品牌 + VIP 胶囊 -->
    <view class="hero" :style="{ paddingTop: heroPaddingTop }">
      <view class="hero-blob blob-1" />
      <view class="hero-blob blob-2" />
      <view class="hero-blob blob-3" />
      <view class="hero-content">
        <view class="brand">
          <view class="avatar">
            <image v-if="brandAvatar" :src="brandAvatar" class="avatar-img" mode="aspectFill" />
            <text v-else class="avatar-text">{{ brandName.slice(0, 1) }}</text>
          </view>
          <view class="brand-info">
            <text class="brand-name">{{ brandName }}</text>
            <view :class="['membership-pill', isVipActive && 'active']" @click="goMember">
              <view class="crown-wrap">
                <Icon name="crown" :size="20" color="#FFE082" />
              </view>
              <text class="membership-text">{{ membershipSub }}</text>
              <Icon name="forward" :size="18" color="rgba(255,255,255,0.85)" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="dashboard" class="body">
      <!-- 今日数据浮起卡：3 KPI 共面，点哪个哪个高亮 -->
      <view class="kpi-card">
        <view class="kpi-head">
          <text class="kpi-head-title">今日数据</text>
          <text class="kpi-head-date">{{ new Date().getMonth() + 1 }}/{{ new Date().getDate() }}</text>
        </view>
        <view class="kpi-row">
          <view
            :class="['kpi-cell', activeStat === 0 && 'active']"
            @click="activeStat = 0"
          >
            <text class="kpi-label">今日订单</text>
            <text class="kpi-value">{{ dashboard.today.orders }}</text>
            <view
              class="kpi-delta"
              :class="dashboard.today.ordersDelta >= 0 ? 'up' : 'down'"
            >
              <Icon
                :name="dashboard.today.ordersDelta >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="16"
                :color="dashboard.today.ordersDelta >= 0 ? '#00b578' : '#ff3b30'"
              />
              <text>{{ Math.abs(dashboard.today.ordersDelta) }}</text>
            </view>
          </view>
          <view class="kpi-divider" />
          <view
            :class="['kpi-cell', activeStat === 1 && 'active']"
            @click="activeStat = 1"
          >
            <text class="kpi-label">新客户</text>
            <text class="kpi-value">{{ dashboard.today.newCustomers }}</text>
            <view
              class="kpi-delta"
              :class="dashboard.today.newCustomersDelta >= 0 ? 'up' : 'down'"
            >
              <Icon
                :name="dashboard.today.newCustomersDelta >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="16"
                :color="dashboard.today.newCustomersDelta >= 0 ? '#00b578' : '#ff3b30'"
              />
              <text>{{ Math.abs(dashboard.today.newCustomersDelta) }}</text>
            </view>
          </view>
          <view class="kpi-divider" />
          <view
            :class="['kpi-cell', activeStat === 2 && 'active']"
            @click="activeStat = 2"
          >
            <text class="kpi-label">销售额</text>
            <text class="kpi-value">{{ formatWan(dashboard.today.sales) }}</text>
            <view
              class="kpi-delta"
              :class="dashboard.today.salesDelta >= 0 ? 'up' : 'down'"
            >
              <Icon
                :name="dashboard.today.salesDelta >= 0 ? 'arrow-up' : 'arrow-down'"
                :size="16"
                :color="dashboard.today.salesDelta >= 0 ? '#00b578' : '#ff3b30'"
              />
              <text>¥{{ Math.abs(dashboard.today.salesDelta) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="block">
        <view class="block-head">
          <text class="block-title">快捷入口</text>
        </view>
        <view class="entry-grid">
          <view
            v-for="entry in visibleCore"
            :key="entry.key"
            class="entry-item"
            @click="goEntry(entry.to)"
          >
            <view class="entry-icon" :class="`tint-${entry.tint}`">
              <Icon :name="entry.icon" :size="36" color="#fff" :fill="false" :stroke="2" />
            </view>
            <text class="entry-label">{{ entry.label }}</text>
          </view>
        </view>
      </view>

      <!-- 选品广场入口卡 -->
      <view class="plaza-card" @click="goPlaza">
        <view class="plaza-bg-blob" />
        <view class="plaza-head">
          <view class="plaza-info">
            <view class="plaza-title-row">
              <view class="plaza-icon-wrap">
                <Icon name="biz-plaza" :size="36" color="#FF4D2D" />
              </view>
              <text class="plaza-title">选品广场</text>
              <StatusTag text="HOT" tone="primary" fill />
            </view>
            <text class="plaza-sub">平台精选 · 厂家直推 · 一键代理</text>
          </view>
          <view class="plaza-cta">
            <text>进入</text>
            <Icon name="forward" :size="20" color="#fff" />
          </view>
        </view>
        <scroll-view
          v-if="dashboard.plazaHighlights && dashboard.plazaHighlights.length"
          scroll-x
          class="plaza-scroll"
          :show-scrollbar="false"
        >
          <view v-for="item in dashboard.plazaHighlights" :key="item.productId" class="plaza-item">
            <image class="plaza-img" :src="item.productImage" mode="aspectFill" />
            <text class="plaza-price">{{ formatPrice(item.price) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 本周销售：小指标条 + 柱图 -->
      <view class="block">
        <view class="block-head">
          <text class="block-title">本周销售</text>
          <view class="block-action" @click="goEntry('/pages/tabbar/stats/index')">
            <text>查看详情</text>
            <Icon name="forward" :size="20" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="week-mini">
          <view class="week-mini-cell">
            <text class="week-mini-label">本周累计</text>
            <text class="week-mini-value">{{ formatPrice(weekTotal) }}</text>
          </view>
          <view class="week-mini-divider" />
          <view class="week-mini-cell">
            <text class="week-mini-label">日均</text>
            <text class="week-mini-value">{{ formatPrice(Math.round(weekTotal / 7)) }}</text>
          </view>
          <view class="week-mini-divider" />
          <view class="week-mini-cell">
            <text class="week-mini-label">峰值</text>
            <text class="week-mini-value">{{ formatPrice(weekPeak) }}</text>
          </view>
        </view>
        <view class="week-chart-wrap">
          <BarChart
            :data="dashboard.weekSales"
            :labels="weekLabels"
            :height="200"
            :highlight-index="dashboard.weekSales.indexOf(weekPeak)"
          />
        </view>
      </view>

      <!-- 待办（彩色卡片化） -->
      <view class="block">
        <view class="block-head">
          <text class="block-title">待办</text>
          <view :class="['todo-badge', totalTodos > 0 && 'has']">{{ totalTodos }}</view>
        </view>
        <view class="todo-grid">
          <view
            v-for="t in todoItems"
            :key="t.key"
            :class="['todo-card', t.count === 0 && 'empty']"
            @click="t.onClick"
          >
            <view :class="['todo-icon', `tint-${t.tint}`]">
              <Icon :name="t.icon" :size="32" color="#fff" :stroke="2" />
            </view>
            <view class="todo-text-wrap">
              <text class="todo-count">{{ t.count }}</text>
              <text class="todo-label">{{ t.label }}</text>
            </view>
            <Icon name="forward" :size="22" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </view>
    <view v-else-if="loading" class="loading">
      <text>加载中…</text>
    </view>
    <view v-else-if="loadError" class="loading">
      <text style="color: var(--text-tertiary)">加载失败，请检查网络后重试</text>
      <view
        style="
          margin-top: 16rpx;
          padding: 12rpx 32rpx;
          background: #ff4d2d;
          color: #fff;
          border-radius: 999rpx;
          font-size: 26rpx;
        "
        @click="loadData"
        >点击重试</view
      >
    </view>

    <TabBar current="home" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff3ee 0%, #f7f8fa 320rpx);
  padding-bottom: 40rpx;
}

/* ============ HERO ============ */
.hero {
  position: relative;
  padding: 0 32rpx 96rpx;
  background:
    radial-gradient(140% 80% at 100% 0%, #ff8a5e 0%, transparent 60%),
    radial-gradient(120% 80% at 0% 100%, #ff3b1f 0%, transparent 50%),
    linear-gradient(160deg, #ff6b45 0%, #ff4d2d 50%, #e63a1f 100%);
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  overflow: hidden;
}
.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(56rpx);
  opacity: 0.55;
  pointer-events: none;
}
.blob-1 { width: 320rpx; height: 320rpx; background: #ffd6c5; top: 30rpx; right: -90rpx; }
.blob-2 { width: 240rpx; height: 240rpx; background: #ffeede; top: 160rpx; left: -60rpx; opacity: 0.4; }
.blob-3 { width: 360rpx; height: 360rpx; background: #ff8a5e; bottom: -160rpx; right: 30%; opacity: 0.35; }

.hero-content {
  position: relative;
  z-index: 1;
}
.brand {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.12), inset 0 0 0 2rpx rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  .avatar-img { width: 100%; height: 100%; }
  .avatar-text { font-weight: 800; }
}
.brand-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.brand-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}
.membership-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx 6rpx 8rpx;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(8rpx);
  border-radius: 999rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.95);
  align-self: flex-start;
  max-width: 100%;
  &.active {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.32), rgba(255, 152, 0, 0.32));
  }
}
.crown-wrap {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.membership-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============ BODY ============ */
.body {
  margin-top: -72rpx;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  position: relative;
  z-index: 2;
}

/* ============ KPI 浮起卡 ============ */
.kpi-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 28rpx;
  box-shadow: 0 16rpx 40rpx rgba(229, 60, 31, 0.16), 0 4rpx 12rpx rgba(15, 23, 42, 0.04);
  position: relative;
}
.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.kpi-head-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #1f2329;
}
.kpi-head-date {
  font-size: 22rpx;
  color: #86909c;
}
.kpi-row {
  display: flex;
  align-items: stretch;
  gap: 0;
}
.kpi-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 14rpx 16rpx;
  border-radius: 18rpx;
  transition: all 0.18s;
  &:active {
    transform: scale(0.96);
  }
  &.active {
    background: linear-gradient(135deg, #ff6b45 0%, #ff4d2d 100%);
    box-shadow: 0 8rpx 20rpx rgba(255, 77, 45, 0.36);
    .kpi-label { color: rgba(255, 255, 255, 0.86); }
    .kpi-value { color: #fff; }
    .kpi-delta { color: rgba(255, 255, 255, 0.95); background: rgba(255, 255, 255, 0.16); }
    .kpi-delta.up text,
    .kpi-delta.down text { color: #fff; }
  }
}
.kpi-divider {
  width: 1rpx;
  background: linear-gradient(180deg, transparent, #ebedf0 30%, #ebedf0 70%, transparent);
  margin: 8rpx 0;
}
.kpi-label {
  font-size: 22rpx;
  color: #86909c;
  letter-spacing: 0.5rpx;
}
.kpi-value {
  margin-top: 6rpx;
  font-size: 44rpx;
  font-weight: 800;
  color: #1f2329;
  font-feature-settings: 'tnum';
}
.kpi-delta {
  margin-top: 6rpx;
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  background: rgba(0, 181, 120, 0.08);
  &.up text { color: #00b578; }
  &.down {
    background: rgba(255, 59, 48, 0.08);
    text { color: #ff3b30; }
  }
}

/* ============ Section block ============ */
.block {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(15, 23, 42, 0.04);
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.block-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2329;
  position: relative;
  padding-left: 16rpx;
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 26rpx;
    border-radius: 3rpx;
    background: linear-gradient(180deg, #ff6b45, #ff4d2d);
  }
}
.block-action {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #86909c;
}

/* ============ 快捷入口 ============ */
.entry-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 28rpx 0;
  padding: 4rpx 0;
}
.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  transition: transform 0.15s;
  &:active { transform: scale(0.92); }
}
.entry-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 2rpx;
    border-radius: 24rpx;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 55%);
    pointer-events: none;
  }
}
.entry-label {
  font-size: 22rpx;
  color: #4e5969;
  font-weight: 500;
}
/* tint 配色：每格独立渐变 + 同色阴影 */
.tint-orange { background: linear-gradient(135deg, #ffb088, #ff5722); box-shadow: 0 8rpx 18rpx rgba(255, 87, 34, 0.32); }
.tint-blue   { background: linear-gradient(135deg, #7fd0fa, #1e88e5); box-shadow: 0 8rpx 18rpx rgba(30, 136, 229, 0.32); }
.tint-green  { background: linear-gradient(135deg, #a6dda8, #43a047); box-shadow: 0 8rpx 18rpx rgba(67, 160, 71, 0.32); }
.tint-purple { background: linear-gradient(135deg, #ce93d8, #8e24aa); box-shadow: 0 8rpx 18rpx rgba(142, 36, 170, 0.32); }
.tint-pink   { background: linear-gradient(135deg, #f48fb1, #e91e63); box-shadow: 0 8rpx 18rpx rgba(233, 30, 99, 0.32); }
.tint-yellow { background: linear-gradient(135deg, #ffe082, #ffa000); box-shadow: 0 8rpx 18rpx rgba(255, 160, 0, 0.32); }
.tint-cyan   { background: linear-gradient(135deg, #80deea, #00838f); box-shadow: 0 8rpx 18rpx rgba(0, 131, 143, 0.32); }
.tint-teal   { background: linear-gradient(135deg, #80cbc4, #00897b); box-shadow: 0 8rpx 18rpx rgba(0, 137, 123, 0.32); }
.tint-red    { background: linear-gradient(135deg, #ef9a9a, #e53935); box-shadow: 0 8rpx 18rpx rgba(229, 57, 53, 0.32); }
.tint-gray   { background: linear-gradient(135deg, #cfd8dc, #607d8b); box-shadow: 0 8rpx 18rpx rgba(96, 125, 139, 0.3); }

/* ============ 选品广场 ============ */
.plaza-card {
  position: relative;
  border-radius: 24rpx;
  padding: 24rpx;
  background:
    linear-gradient(135deg, #fff0eb 0%, #ffffff 60%),
    #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(229, 60, 31, 0.10);
  border: 2rpx solid rgba(255, 77, 45, 0.16);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.plaza-bg-blob {
  position: absolute;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 138, 94, 0.35) 0%, transparent 70%);
  top: -60rpx;
  right: -40rpx;
  filter: blur(20rpx);
}
.plaza-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}
.plaza-info { flex: 1; }
.plaza-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.plaza-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #fff, #ffe7df);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 77, 45, 0.18);
}
.plaza-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2329;
}
.plaza-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #86909c;
  padding-left: 76rpx;
}
.plaza-cta {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 22rpx;
  background: linear-gradient(135deg, #ff6b45, #ff4d2d);
  color: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(255, 77, 45, 0.36);
  flex-shrink: 0;
}
.plaza-scroll {
  white-space: nowrap;
  position: relative;
}
.plaza-item {
  display: inline-flex;
  flex-direction: column;
  width: 150rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.06);
}
.plaza-img {
  width: 100%;
  height: 150rpx;
}
.plaza-price {
  padding: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #ff4d2d;
  text-align: center;
}

/* ============ 本周销售小指标 ============ */
.week-mini {
  display: flex;
  align-items: stretch;
  padding: 18rpx 0;
  margin-bottom: 12rpx;
  background: linear-gradient(135deg, #fafafa, #ffffff);
  border-radius: 16rpx;
}
.week-mini-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.week-mini-label {
  font-size: 22rpx;
  color: #86909c;
}
.week-mini-value {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2329;
  font-feature-settings: 'tnum';
}
.week-mini-divider {
  width: 1rpx;
  margin: 6rpx 0;
  background: linear-gradient(180deg, transparent, #ebedf0 30%, #ebedf0 70%, transparent);
}
.week-chart-wrap {
  padding: 8rpx 0;
}

/* ============ 待办 ============ */
.todo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: #ebedf0;
  color: #86909c;
  font-size: 22rpx;
  font-weight: 700;
  &.has {
    background: linear-gradient(135deg, #ff6b45, #ff4d2d);
    color: #fff;
    box-shadow: 0 4rpx 10rpx rgba(255, 77, 45, 0.32);
  }
}
.todo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14rpx;
}
.todo-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 18rpx;
  background: linear-gradient(135deg, #ffffff, #fafafa);
  border-radius: 18rpx;
  border: 1rpx solid #f2f3f5;
  transition: transform 0.15s;
  &:active { transform: scale(0.98); }
  &.empty {
    background: #fafafa;
    .todo-count { color: #c9cdd4; }
    .todo-icon { opacity: 0.5; }
  }
}
.todo-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 2rpx;
    border-radius: 16rpx;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 55%);
    pointer-events: none;
  }
}
.todo-text-wrap {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.todo-count {
  font-size: 32rpx;
  font-weight: 800;
  color: #1f2329;
  font-feature-settings: 'tnum';
}
.todo-label {
  font-size: 26rpx;
  color: #4e5969;
}

.loading {
  padding: 200rpx 0;
  text-align: center;
  color: #86909c;
  font-size: 24rpx;
}

.safe-bottom {
  height: 40rpx;
}
</style>
