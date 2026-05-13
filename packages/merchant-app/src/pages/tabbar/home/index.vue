<script setup lang="ts">
/**
 * MA-01 · 商家 APP 首页
 *
 * 对应原型 MA_Home：数据卡 + 快捷入口 + 选品广场入口卡 + 本周销售柱图 + 待办
 * 产品级高保真：暖橙渐变 + 卡片层叠 + 数据动画
 */
import { ref, onMounted, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { dashboardService } from '../../../services/dashboard'
import { profileService, type MerchantProfile } from '../../../services/profile'
import { useFeatureFlagStore } from '../../../store'
import { formatPrice, formatWan } from '@jiujiu/shared/utils'
import type { MerchantDashboard } from '@jiujiu/shared/types'
import StatCard from '../../../components/stat-card/stat-card.vue'
import Section from '../../../components/section/section.vue'
import BarChart from '../../../components/bar-chart/bar-chart.vue'
import StatusTag from '../../../components/status-tag/status-tag.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'
import { useHideNativeTabBar } from '../../../composables/useHideNativeTabBar'
import { useStatusBar } from '../../../composables/useStatusBar'

useHideNativeTabBar()
const { heroPaddingTop } = useStatusBar(16)

const dashboard = ref<MerchantDashboard | null>(null)
const profile = ref<MerchantProfile | null>(null)
const loading = ref(true)
const flagStore = useFeatureFlagStore()

const brandName = computed(() => profile.value?.shopName || '经纬科技 · 商家版')
const brandAvatar = computed(() => profile.value?.avatar || '')

async function loadProfile() {
  try {
    profile.value = await profileService.get()
  } catch {
    // 失败时降级到默认文案
  }
}

/** 主入口（最多 7 个 + 一个"更多"，刚好两行 4×2） */
const CORE_ENTRIES = [
  { key: 'product', icon: 'biz-product', label: '商品', to: '/pages/tabbar/product/index', tint: 'orange' },
  { key: 'order', icon: 'biz-order', label: '订单', to: '/pages/tabbar/order/index', tint: 'blue' },
  { key: 'customer', icon: 'biz-customer', label: '客户', to: '/pages/customer/index', tint: 'green' },
  { key: 'stats', icon: 'biz-stats', label: '数据', to: '/pages/tabbar/stats/index', tint: 'purple' },
  { key: 'chat', icon: 'biz-chat', label: '客服', to: '/pages/chat/index', tint: 'pink' },
  { key: 'marketing', icon: 'biz-marketing', label: '营销', to: '/pages/marketing/index', tint: 'yellow' },
  { key: 'store', icon: 'biz-store', label: '门店', to: '/pages/store/index', tint: 'cyan' },
]

/** 进入"更多"弹层的扩展入口 */
const EXTRA_ENTRIES = [
  { key: 'category', icon: 'biz-product', label: '分类管理', to: '/pages/product/category' },
  { key: 'agency', icon: 'tag', label: '代理商品', to: '/pages/product/agency-list' },
  { key: 'price-rule', icon: 'wallet', label: '价格规则', to: '/pages/shop/price-rule' },
  { key: 'staff', icon: 'biz-staff', label: '员工', to: '/pages/staff/index' },
]

const visibleCore = computed(() =>
  CORE_ENTRIES.filter((e) => flagStore.isHomeEntryEnabled(e.key)),
)
const visibleExtras = computed(() =>
  EXTRA_ENTRIES.filter((e) => flagStore.isHomeEntryEnabled(e.key)),
)

const totalTodos = computed(() => {
  if (!dashboard.value) return 0
  const t = dashboard.value.todos
  return (t.pendingShipment ?? 0) + (t.pendingRefund ?? 0) + (t.pendingStoreAuth ?? 0) + (t.pendingStaff ?? 0)
})

async function loadData() {
  loading.value = true
  try {
    dashboard.value = await dashboardService.getDashboard()
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

function goPlaza() {
  uni.navigateTo({ url: '/pages/plaza/index' })
}

function goNotif() {
  uni.showToast({ title: '消息中心', icon: 'none' })
}

function goEntry(to: string) {
  if (to.startsWith('/pages/tabbar/')) {
    uni.switchTab({ url: to })
  } else {
    uni.navigateTo({ url: to })
  }
}

function openMore() {
  const list = visibleExtras.value
  if (list.length === 0) {
    uni.showToast({ title: '暂无更多入口', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: list.map((e) => e.label),
    success: (r) => {
      const target = list[r.tapIndex]
      if (target) goEntry(target.to)
    },
  })
}

onMounted(() => {
  flagStore.fetchFlags()
  loadData()
  loadProfile()
})

onShow(() => {
  loadData()
  // 每次回到首页都拉一次资料（保证 profile 编辑后立即更新头部）
  loadProfile()
})
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header" :style="{ paddingTop: heroPaddingTop }">
      <view class="header-inner">
        <view class="brand">
          <view class="avatar">
            <image v-if="brandAvatar" :src="brandAvatar" class="avatar-img" mode="aspectFill" />
            <text v-else>{{ brandName.slice(0, 1) }}</text>
          </view>
          <view class="brand-info">
            <text class="brand-name">{{ brandName }}</text>
            <text class="brand-sub">VIP · 年费 · 剩余 287 天</text>
          </view>
        </view>
        <view class="notif" @click="goNotif">
          <Icon name="bell" :size="36" color="#fff" />
          <view v-if="totalTodos > 0" class="notif-badge">{{ totalTodos }}</view>
        </view>
      </view>
    </view>

    <view v-if="dashboard" class="body">
      <!-- 今日数据三宫格 -->
      <view class="stat-row">
        <StatCard
          label="今日订单"
          :value="dashboard.today.orders"
          :delta="`${dashboard.today.ordersDelta >= 0 ? '+' : ''}${dashboard.today.ordersDelta}%`"
          :trend="dashboard.today.ordersDelta >= 0 ? 'up' : 'down'"
        />
        <StatCard
          label="新客户"
          :value="dashboard.today.newCustomers"
          :delta="`${dashboard.today.newCustomersDelta >= 0 ? '+' : ''}${dashboard.today.newCustomersDelta}`"
          :trend="dashboard.today.newCustomersDelta >= 0 ? 'up' : 'down'"
        />
        <StatCard
          label="销售额"
          :value="formatWan(dashboard.today.sales)"
          :delta="`${dashboard.today.salesDelta >= 0 ? '+' : ''}${dashboard.today.salesDelta}%`"
          :trend="dashboard.today.salesDelta >= 0 ? 'up' : 'down'"
          accent
        />
      </view>

      <!-- 快捷入口（4×2 网格，最后一格固定为"更多"） -->
      <Section title="快捷入口">
        <view class="entry-grid">
          <view
            v-for="entry in visibleCore"
            :key="entry.key"
            class="entry-item"
            @click="goEntry(entry.to)"
          >
            <view class="entry-icon" :class="`tint-${entry.tint}`">
              <Icon :name="entry.icon" :size="40" color="#fff" :fill="true" />
            </view>
            <text class="entry-label">{{ entry.label }}</text>
          </view>
          <view v-if="visibleExtras.length > 0" class="entry-item" @click="openMore">
            <view class="entry-icon tint-gray">
              <Icon name="more-h" :size="40" color="#fff" />
            </view>
            <text class="entry-label">更多</text>
          </view>
        </view>
      </Section>

      <!-- 选品广场入口卡 -->
      <view class="plaza-card" @click="goPlaza">
        <view class="plaza-head">
          <view class="plaza-info">
            <view class="plaza-title-row">
              <view class="plaza-icon-wrap">
                <Icon name="biz-plaza" :size="36" color="var(--brand-primary)" />
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
        <scroll-view scroll-x class="plaza-scroll" :show-scrollbar="false">
          <view
            v-for="item in dashboard.plazaHighlights"
            :key="item.productId"
            class="plaza-item"
          >
            <image class="plaza-img" :src="item.productImage" mode="aspectFill" />
            <text class="plaza-price">{{ formatPrice(item.price) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 本周销售柱图 -->
      <Section title="本周销售" action="查看详情" @action="goEntry('/pages/tabbar/stats/index')">
        <BarChart
          :data="dashboard.weekSales"
          :labels="weekLabels"
          :height="200"
          :highlight-index="dashboard.weekSales.indexOf(Math.max(...dashboard.weekSales))"
        />
      </Section>

      <!-- 待办 -->
      <Section :title="`待办 · ${totalTodos}`">
        <view class="todo-list">
          <view class="todo-item" @click="uni.switchTab({ url: '/pages/tabbar/order/index' })">
            <view class="dot dot-primary"></view>
            <text class="todo-text">{{ dashboard.todos.pendingShipment }} 笔订单待发货</text>
            <Icon name="forward" :size="24" color="var(--text-tertiary)" />
          </view>
          <view class="todo-item" @click="uni.navigateTo({ url: '/pages/order/aftersale' })">
            <view class="dot dot-warning"></view>
            <text class="todo-text">{{ dashboard.todos.pendingRefund }} 笔退款待处理</text>
            <Icon name="forward" :size="24" color="var(--text-tertiary)" />
          </view>
          <view class="todo-item" @click="uni.navigateTo({ url: '/pages/store/index' })">
            <view class="dot dot-info"></view>
            <text class="todo-text">{{ dashboard.todos.pendingStoreAuth }} 个门店授权申请</text>
            <Icon name="forward" :size="24" color="var(--text-tertiary)" />
          </view>
        </view>
      </Section>

      <view class="safe-bottom" />
    </view>
    <view v-else-if="loading" class="loading">
      <text>加载中…</text>
    </view>

    <TabBar current="home" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
}

.header {
  background: var(--brand-gradient);
  /* padding-top 由内联 heroPaddingTop 注入（状态栏 + 16rpx） */
  padding: 0 32rpx 32rpx;
  .header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 16rpx;
    .avatar {
      width: 72rpx;
      height: 72rpx;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      backdrop-filter: blur(10rpx);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 36rpx;
      font-weight: 700;
      overflow: hidden;
      .avatar-img { width: 100%; height: 100%; }
    }
    .brand-info { display: flex; flex-direction: column; }
    .brand-name {
      font-size: 30rpx;
      font-weight: 700;
      color: #fff;
    }
    .brand-sub {
      margin-top: 4rpx;
      font-size: 20rpx;
      color: rgba(255,255,255,0.85);
    }
  }
  .notif {
    position: relative;
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    .notif-icon { font-size: 32rpx; }
    .notif-badge {
      position: absolute;
      top: -4rpx;
      right: -4rpx;
      min-width: 32rpx;
      height: 32rpx;
      padding: 0 8rpx;
      border-radius: 999rpx;
      background: var(--status-highlight);
      color: var(--text-primary);
      font-size: 20rpx;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2rpx solid #fff;
    }
  }
}

.body {
  margin-top: -32rpx;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.stat-row {
  display: flex;
  gap: 16rpx;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28rpx 16rpx;
  padding: 12rpx 0 4rpx;
}
.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  transition: transform 0.15s;
  &:active { transform: scale(0.94); }
}
.entry-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.08);
}
.entry-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  font-weight: 500;
}
/* tint 配色：每格独立渐变 + 同色阴影 */
.tint-orange  { background: linear-gradient(135deg, #FF8A65, #FF5722); box-shadow: 0 8rpx 16rpx rgba(255, 87, 34, 0.28); }
.tint-blue    { background: linear-gradient(135deg, #4FC3F7, #1E88E5); box-shadow: 0 8rpx 16rpx rgba(30, 136, 229, 0.28); }
.tint-green   { background: linear-gradient(135deg, #81C784, #43A047); box-shadow: 0 8rpx 16rpx rgba(67, 160, 71, 0.28); }
.tint-purple  { background: linear-gradient(135deg, #BA68C8, #8E24AA); box-shadow: 0 8rpx 16rpx rgba(142, 36, 170, 0.28); }
.tint-pink    { background: linear-gradient(135deg, #F06292, #E91E63); box-shadow: 0 8rpx 16rpx rgba(233, 30, 99, 0.28); }
.tint-yellow  { background: linear-gradient(135deg, #FFD54F, #FFA000); box-shadow: 0 8rpx 16rpx rgba(255, 160, 0, 0.28); }
.tint-cyan    { background: linear-gradient(135deg, #4DD0E1, #00838F); box-shadow: 0 8rpx 16rpx rgba(0, 131, 143, 0.28); }
.tint-gray    { background: linear-gradient(135deg, #B0BEC5, #607D8B); box-shadow: 0 8rpx 16rpx rgba(96, 125, 139, 0.24); }

.plaza-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-md);
  border: 2rpx solid var(--brand-primary-ghost);
  background-image: linear-gradient(135deg, rgba(255,77,45,0.04), transparent);
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .plaza-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .plaza-info { flex: 1; }
  .plaza-title-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    .plaza-icon-wrap {
      width: 56rpx;
      height: 56rpx;
      border-radius: 12rpx;
      background: var(--brand-primary-ghost);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .plaza-title {
      font-size: 30rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
  }
  .plaza-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .plaza-cta {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 12rpx 24rpx;
    background: var(--brand-primary);
    color: #fff;
    border-radius: 999rpx;
    font-size: 24rpx;
    .arrow { font-size: 24rpx; }
  }

  .plaza-scroll {
    white-space: nowrap;
  }
  .plaza-item {
    display: inline-flex;
    flex-direction: column;
    width: 140rpx;
    margin-right: 12rpx;
    border-radius: 12rpx;
    overflow: hidden;
    background: var(--bg-hover);
    .plaza-img {
      width: 100%;
      height: 140rpx;
    }
    .plaza-price {
      padding: 8rpx;
      font-size: 22rpx;
      font-weight: 700;
      color: var(--brand-primary);
      text-align: center;
    }
  }
}

.todo-list {
  display: flex;
  flex-direction: column;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    &.dot-primary { background: var(--brand-primary); }
    &.dot-warning { background: var(--status-warning); }
    &.dot-info { background: var(--status-info); }
  }
  .todo-text {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .todo-arrow {
    color: var(--text-tertiary);
    font-size: 26rpx;
  }
}

.loading {
  padding: 200rpx 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 24rpx;
}

.safe-bottom {
  height: 40rpx;
}
</style>
