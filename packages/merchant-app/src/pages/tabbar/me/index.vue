<script setup lang="ts">
/**
 * MA-03 · 我的（还原原型图）
 *
 * 头部：头像 + 店名 + 商户号 + Tag(VIP·年费 / 剩余 287 天)
 * 会员卡：月费 ¥99 / 年费 ¥899 · 试用 30 天 + 续费 CTA
 * 设置列表：分享 / 个人信息 / 系统设置 / 检查更新 / 联系我们
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../../store'
import StatusTag from '../../../components/status-tag/status-tag.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const userStore = useUserStore()

const merchant = ref({
  shopName: '经纬科技',
  merchantNo: 'M10283',
  vip: '年费',
  daysLeft: 287,
})

/** 从 profile 编辑页持久化的字段中同步显示（店名 / 商户号） */
function syncFromProfile() {
  try {
    const raw = uni.getStorageSync('merchant_profile')
    if (!raw) return
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (data?.shopName) merchant.value.shopName = data.shopName
    if (data?.merchantNo) merchant.value.merchantNo = data.merchantNo
  } catch {
    // ignore
  }
}

onMounted(syncFromProfile)
// 每次回到本页都重新读一次（profile 页改完返回时刷新展示）
onShow(syncFromProfile)

const SETTINGS = [
  { icon: 'share', label: '分享小程序', action: 'share' },
  { icon: 'biz-me', label: '个人信息', action: 'profile' },
  { icon: 'gear', label: '系统设置', action: 'settings' },
  { icon: 'refresh', label: '检查更新', action: 'update' },
  { icon: 'biz-chat', label: '联系我们', action: 'contact' },
] as const

function goMember() {
  uni.navigateTo({ url: '/pages/member/index' })
}

function handle(action: string) {
  const map: Record<string, () => void> = {
    share: () =>
      uni.showActionSheet({
        itemList: ['复制小程序链接', '生成海报', '分享给好友'],
        success: (r) =>
          uni.showToast({
            title: ['已复制链接', '海报已生成', '已唤起分享'][r.tapIndex],
            icon: 'success',
          }),
      }),
    profile: () => uni.navigateTo({ url: '/pages/me/profile' }),
    settings: () =>
      uni.showActionSheet({
        itemList: ['清除缓存', '推送通知', '夜间模式', '语言切换'],
        success: (r) =>
          uni.showToast({
            title: ['已清理 3.2 MB', '推送已开启', '已切换夜间', '已切换 English'][r.tapIndex],
          }),
      }),
    update: () => {
      uni.showLoading({ title: '检查中…' })
      setTimeout(() => {
        uni.hideLoading()
        uni.showToast({ title: '已是最新版本 v0.1.0', icon: 'success' })
      }, 800)
    },
    contact: () =>
      uni.showModal({
        title: '联系我们',
        content: '客服电话：400-888-9988\n邮箱：support@jiujiu.com\n工作日 9:00 - 18:00',
        confirmText: '拨打',
        success: (r) => {
          if (r.confirm) uni.makePhoneCall({ phoneNumber: '4008889988' })
        },
      }),
  }
  map[action]?.()
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 500)
      }
    },
  })
}

const trialDaysProgress = computed(() => Math.round((merchant.value.daysLeft / 365) * 100))
</script>

<template>
  <view class="page">
    <!-- 顶部：头像 + 店名 + 商户号 + tags -->
    <view class="hero">
      <view class="hero-inner">
        <view class="avatar">{{ merchant.shopName.slice(0, 1) }}</view>
        <view class="info">
          <text class="name">{{ merchant.shopName }}</text>
          <text class="merchant-no">商户号 {{ merchant.merchantNo }}</text>
          <view class="tags">
            <StatusTag :text="`VIP · ${merchant.vip}`" tone="highlight" fill />
            <StatusTag :text="`剩余 ${merchant.daysLeft} 天`" tone="default" />
          </view>
        </view>
        <view class="gear" @click="handle('settings')">
          <Icon name="gear" :size="44" color="rgba(255,255,255,0.9)" />
        </view>
      </view>
    </view>

    <!-- 会员开通卡片 -->
    <view class="member-card" @click="goMember">
      <view class="member-row">
        <view class="member-left">
          <view class="m-title-row">
            <Icon name="crown" :size="36" color="#5C2A00" />
            <text class="m-title">会员开通</text>
          </view>
          <text class="m-sub">月费 ¥99 / 年费 ¥899 · 试用 30 天</text>
        </view>
        <view class="m-btn">
          <text>续费 / 升级</text>
          <Icon name="forward" :size="24" color="#FFD89B" />
        </view>
      </view>
      <view class="progress">
        <view class="progress-fill" :style="{ width: trialDaysProgress + '%' }" />
      </view>
      <text class="m-progress-text">年度会员剩余 {{ merchant.daysLeft }} / 365 天</text>
    </view>

    <!-- 设置列表 -->
    <view class="settings">
      <view
        v-for="it in SETTINGS"
        :key="it.label"
        class="setting-row"
        @click="handle(it.action)"
      >
        <view class="row-left">
          <view class="row-icon-wrap">
            <Icon :name="it.icon" :size="40" color="var(--brand-primary)" />
          </view>
          <text class="row-label">{{ it.label }}</text>
        </view>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="logout" @click="logout">
      <text>退出登录</text>
    </view>

    <view class="version">v0.1.0 · 经纬科技 · 商家版</view>
    <view class="safe-bottom" />

    <TabBar current="me" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.hero {
  background: var(--brand-gradient);
  padding: 48rpx 24rpx 80rpx;
}
.hero-inner {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 4rpx solid rgba(255,255,255,0.4);
  color: #fff;
  text-align: center;
  line-height: 120rpx;
  font-size: 56rpx;
  font-weight: 700;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .name {
    font-size: 36rpx;
    font-weight: 700;
    color: #fff;
  }
  .merchant-no {
    font-size: 22rpx;
    color: rgba(255,255,255,0.85);
    font-family: var(--font-family-base);
  }
  .tags {
    display: flex;
    gap: 8rpx;
    margin-top: 4rpx;
    flex-wrap: wrap;
  }
}
.gear {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-card {
  margin: -48rpx 24rpx 0;
  background: linear-gradient(135deg, #FFE8B3 0%, #FFC078 100%);
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(255,140,60,0.25);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  position: relative;
  z-index: 2;
}
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.member-left {
  flex: 1;
}
.m-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .m-title { font-size: 30rpx; font-weight: 700; color: #5C2A00; }
}
.m-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(92,42,0,0.65);
}
.m-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 20rpx;
  background: #5C2A00;
  color: #FFD89B;
  border-radius: 999rpx;
  font-size: 22rpx;
}
.progress {
  height: 10rpx;
  background: rgba(92,42,0,0.12);
  border-radius: 999rpx;
  overflow: hidden;
  .progress-fill {
    height: 100%;
    background: linear-gradient(to right, #5C2A00, #8D4500);
    border-radius: 999rpx;
  }
}
.m-progress-text {
  font-size: 20rpx;
  color: rgba(92,42,0,0.65);
}

.settings {
  margin: 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  &:last-child { border-bottom: none; }
  &:active { background: var(--bg-hover); }
}
.row-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.row-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: var(--brand-primary-ghost);
  display: flex;
  align-items: center;
  justify-content: center;
}
.row-label {
  font-size: 28rpx;
  color: var(--text-primary);
}

.logout {
  margin: 16rpx 24rpx 0;
  padding: 28rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  text-align: center;
  font-size: 28rpx;
  color: var(--status-error);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  &:active { background: rgba(255,77,45,0.04); }
}
.version {
  margin-top: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.safe-bottom { height: 60rpx; }
</style>
