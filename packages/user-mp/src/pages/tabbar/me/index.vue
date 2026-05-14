<script setup lang="ts">
/**
 * UM-08 · 我的（未登录 / 已登录）
 * 还原 原型图/user-mini.jsx::UM_Me_Logout
 * - 头部：未登录显示 "微信登录" 按钮，已登录显示昵称 + 头像 + 等级
 * - 我的订单四宫格（待付款/待发货/待收货/售后）
 * - 6 个功能入口（预约量尺/推广分佣/门店地址/分享/商家入驻/设置）
 */
import { computed } from 'vue'
import { onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useUserStore } from '../../../store/user'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const userStore = useUserStore()

// 进入"我的" tab 时主动拉一次最新资料 + 建 WS 订阅（多端同步）
onShow(() => {
  if (userStore.isLogin) {
    userStore.refreshFromServer()
    userStore.connectProfileSync()
  }
})

// 微信分享：分享给好友 / 朋友圈
// 入口：右下角「分享小程序」TOOL_ENTRY 已改为 button[open-type="share"]
onShareAppMessage(() => ({
  title: '经纬科技商城 · 优质家居一站购齐',
  path: '/pages/tabbar/home/index',
  imageUrl: '',
}))
onShareTimeline(() => ({
  title: '经纬科技商城 · 优质家居一站购齐',
  query: '',
}))

function goEditProfile() {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  uni.navigateTo({ url: '/pages/me/edit' })
}

const ORDER_ENTRIES = [
  { key: 'pending_payment', icon: 'wallet', label: '待付款', tint: '#FF4D2D' },
  { key: 'pending_shipment', icon: 'package', label: '待发货', tint: '#FF7A45' },
  { key: 'shipped', icon: 'truck', label: '待收货', tint: '#A855F7' },
  { key: 'after_sale', icon: 'help', label: '售后', tint: '#52C41A' },
]

const TOOL_ENTRIES = [
  { key: 'favorite', icon: 'star', label: '我的收藏', to: '/pages/favorite/list', auth: true },
  { key: 'coupon', icon: 'discount', label: '领券中心', to: '/pages/coupon/center' },
  { key: 'address', icon: 'location', label: '收货地址', to: '/pages/address/list', auth: true },
  { key: 'book', icon: 'ruler', label: '预约量尺', to: '/pages/booking/index' },
  { key: 'promote', icon: 'discount', label: '推广分佣', to: '/pages/promote/index' },
  { key: 'stores', icon: 'location-pin', label: '附近门店', to: '/pages/store/list' },
  { key: 'map', icon: 'location-pin', label: '门店地图', to: '/pages/store/map' },
  { key: 'share', icon: 'share', label: '分享小程序', to: '' },
  { key: 'apply', icon: 'home-shop', label: '商家入驻', to: '/pages/merchant/apply' },
  { key: 'settings', icon: 'gear', label: '设置', to: '' },
]

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goOrder(status: string) {
  if (!userStore.isLogin) return goLogin()
  uni.navigateTo({ url: `/pages/order/list?status=${status}` })
}

function goEntry(item: (typeof TOOL_ENTRIES)[number]) {
  if ((item as any).auth && !userStore.isLogin) {
    return goLogin()
  }
  if (item.key === 'share') {
    // 分享走 button[open-type="share"] → 触发 onShareAppMessage；这里只在 H5 / App 端兜底
    // #ifndef MP-WEIXIN
    uni.showActionSheet({
      itemList: ['复制小程序链接', '取消'],
      success: (r) => {
        if (r.tapIndex === 0) {
          uni.setClipboardData({
            data: 'https://ewsn.top',
            success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
          })
        }
      },
    })
    // #endif
    return
  }
  if (item.key === 'settings') {
    uni.showActionSheet({
      itemList: ['账号管理', '消息通知', '清除缓存', '关于我们'],
      success: (r) => {
        uni.showToast({
          title: ['账号管理', '消息通知', '清除缓存', '关于我们'][r.tapIndex],
          icon: 'none',
        })
      },
    })
    return
  }
  if (item.to) uni.navigateTo({ url: item.to })
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出当前账号？',
    success: (r) => {
      if (r.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    },
  })
}

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

function goAllOrders() {
  if (!userStore.isLogin) return goLogin()
  uni.navigateTo({ url: '/pages/order/list' })
}
</script>

<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight }" />

    <view class="hero" @click="goEditProfile">
      <view class="avatar-wrap">
        <image
          v-if="userStore.isLogin && userStore.avatar"
          :src="userStore.avatar"
          class="avatar-img"
        />
        <view v-else class="avatar-placeholder">
          <text class="qmark">?</text>
        </view>
      </view>
      <view class="hero-info">
        <text class="nick">{{ userStore.isLogin ? userStore.nickname : '未登录' }}</text>
        <text class="sub">{{
          userStore.isLogin ? '点击编辑个人信息' : '微信一键登录可查看零售价'
        }}</text>
        <view v-if="!userStore.isLogin" class="login-btn" @click.stop="goLogin">
          <Icon name="wechat" :size="28" color="#fff" />
          <text>微信登录</text>
        </view>
        <view v-else class="logout-btn" @click.stop="logout">
          <text>退出登录</text>
        </view>
      </view>
      <Icon
        v-if="userStore.isLogin"
        name="chevron-right"
        :size="32"
        color="rgba(255,255,255,0.7)"
      />
    </view>

    <view class="card">
      <view class="card-head">
        <text class="title">我的订单</text>
        <text class="action" @click="goAllOrders">全部订单 ›</text>
      </view>
      <view class="order-grid">
        <view v-for="o in ORDER_ENTRIES" :key="o.key" class="order-cell" @click="goOrder(o.key)">
          <view class="order-icon" :style="{ background: `${o.tint}18`, color: o.tint }">
            <Icon :name="o.icon" :size="40" :color="o.tint" />
          </view>
          <text class="order-label">{{ o.label }}</text>
        </view>
      </view>
    </view>

    <view class="card tool-card">
      <template v-for="(t, i) in TOOL_ENTRIES" :key="t.key">
        <!-- 分享条目：用 button[open-type="share"] 才能触发微信原生分享面板 -->
        <button
          v-if="t.key === 'share'"
          class="tool-row tool-row-btn"
          :class="{ 'with-divider': i < TOOL_ENTRIES.length - 1 }"
          open-type="share"
          @click="goEntry(t)"
        >
          <view class="tool-icon">
            <Icon :name="t.icon" :size="36" color="var(--brand-primary)" />
          </view>
          <text class="tool-label">{{ t.label }}</text>
          <Icon name="chevron-right" :size="32" color="var(--text-tertiary)" />
        </button>
        <view
          v-else
          class="tool-row"
          :class="{ 'with-divider': i < TOOL_ENTRIES.length - 1 }"
          @click="goEntry(t)"
        >
          <view class="tool-icon">
            <Icon :name="t.icon" :size="36" color="var(--brand-primary)" />
          </view>
          <text class="tool-label">{{ t.label }}</text>
          <Icon name="chevron-right" :size="32" color="var(--text-tertiary)" />
        </view>
      </template>
    </view>

    <view style="height: 160rpx" />

    <TabBar current="me" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.status {
  position: relative;
  z-index: 0;
  background: $brand-gradient;
}
.hero {
  // mp-weixin 里只有 .card 有 z-index 还不够；hero 也必须显式设低层级，
  // 否则它会覆盖被 -32rpx 拉上来的 card 顶部
  position: relative;
  z-index: 0;
  background: $brand-gradient;
  padding: 24rpx 32rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  color: #fff;
  .avatar-wrap {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.2);
    border: 4rpx solid rgba(255, 255, 255, 0.5);
    .avatar-img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      .qmark {
        color: #fff;
        font-size: 64rpx;
        font-weight: 800;
        opacity: 0.9;
      }
    }
  }
  .hero-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .nick {
      font-size: 36rpx;
      font-weight: 800;
    }
    .sub {
      font-size: 22rpx;
      opacity: 0.9;
    }
  }
  .login-btn,
  .logout-btn {
    margin-top: 8rpx;
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 999rpx;
    font-size: 24rpx;
    font-weight: 600;
    align-self: flex-start;
  }
}
.card {
  // mp-weixin 里负 margin 浮出：hero 已显式 z-index:0，card 设 z-index:2 强制覆盖
  position: relative;
  z-index: 2;
  margin: -32rpx 24rpx 16rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: $shadow-md;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .action {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.order-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.order-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  .order-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .order-label {
    font-size: 22rpx;
    color: var(--text-primary);
  }
}
.tool-card {
  margin: 16rpx 24rpx;
  padding: 0 24rpx;
}
.tool-row {
  display: flex;
  align-items: center;
  height: 96rpx;
  gap: 16rpx;
  &.with-divider {
    border-bottom: 1rpx dashed var(--border-light);
  }
  .tool-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 16rpx;
    background: rgba(255, 77, 45, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-label {
    flex: 1;
    font-size: 28rpx;
    color: var(--text-primary);
  }
}
/* button[open-type=share] 默认有圆角、灰底、1rpx 边框、padding，要清除让它跟 view 同视觉 */
.tool-row-btn {
  width: 100%;
  margin: 0;
  padding: 0;
  border: none !important;
  background: transparent !important;
  text-align: left;
  line-height: inherit;
  font-size: inherit;
  color: inherit;
  &::after {
    border: none !important;
  }
  &:active {
    background: rgba(0, 0, 0, 0.04) !important;
  }
}
</style>
