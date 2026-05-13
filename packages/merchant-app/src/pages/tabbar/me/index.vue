<script setup lang="ts">
/**
 * MA-03 · 我的（v2 · 紧凑顶部 + 后端单一真源）
 *
 * 变化：
 *   - 顶部去掉重复的 gear（设置入口移到列表里）
 *   - 头部高度收紧 48→24rpx
 *   - 店铺资料从 /api/v1/m/profile 读，不再依赖 localStorage
 *   - 每次 onShow 都重新拉一次资料；分享出去的店铺信息保持最新
 *   - 「系统设置」从 action-sheet 改为独立页面 /pages/me/settings
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../../store'
import { profileService, type MerchantProfile } from '../../../services/profile'
import StatusTag from '../../../components/status-tag/status-tag.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'
import { useHideNativeTabBar } from '../../../composables/useHideNativeTabBar'
import { useStatusBar } from '../../../composables/useStatusBar'

useHideNativeTabBar()
const { heroPaddingTop } = useStatusBar(24)

const userStore = useUserStore()

const profile = ref<MerchantProfile | null>(null)
const loading = ref(false)

async function refresh() {
  if (loading.value) return
  loading.value = true
  try {
    profile.value = await profileService.get()
  } catch {
    // ignore, keep last known
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
onShow(refresh)

const shopName = computed(() => profile.value?.shopName || '未命名店铺')
const merchantNo = computed(() => profile.value?.merchantNo || '--')
const avatar = computed(() => profile.value?.avatar || '')
const rating = computed(() => profile.value?.rating ?? 5)
const ratingCount = computed(() => profile.value?.ratingCount ?? 0)

const SETTINGS = [
  { icon: 'biz-me', label: '个人信息', action: 'profile' },
  { icon: 'share', label: '分享 APP', action: 'share' },
  { icon: 'gear', label: '系统设置', action: 'settings' },
  { icon: 'refresh', label: '检查更新', action: 'update' },
  { icon: 'biz-chat', label: '联系我们', action: 'contact' },
] as const

function goMember() {
  uni.navigateTo({ url: '/pages/member/index' })
}

function handle(action: string) {
  const map: Record<string, () => void> = {
    share: () => uni.navigateTo({ url: '/pages/me/share' }),
    profile: () => uni.navigateTo({ url: '/pages/me/profile' }),
    settings: () => uni.navigateTo({ url: '/pages/me/settings' }),
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
</script>

<template>
  <view class="page">
    <!-- 顶部：紧凑版（去掉了多余的 gear 按钮）-->
    <view class="hero" :style="{ paddingTop: heroPaddingTop }">
      <view class="hero-inner" @click="handle('profile')">
        <view class="avatar-wrap">
          <image v-if="avatar" :src="avatar" class="avatar-img" mode="aspectFill" />
          <view v-else class="avatar avatar-placeholder">
            <text>{{ shopName.slice(0, 1) }}</text>
          </view>
        </view>
        <view class="info">
          <text class="name">{{ shopName }}</text>
          <text class="merchant-no">商户号 {{ merchantNo }}</text>
          <view class="tags">
            <view class="rating-tag">
              <Icon name="star-fill" :size="22" color="#FFD43B" :fill="true" />
              <text class="rating-num">{{ rating.toFixed(1) }}</text>
              <text class="rating-count" v-if="ratingCount > 0">({{ ratingCount }})</text>
            </view>
            <StatusTag text="VIP" tone="highlight" fill />
          </view>
        </view>
        <Icon name="forward" :size="32" color="rgba(255,255,255,0.7)" />
      </view>
    </view>

    <!-- 会员卡 -->
    <view class="member-card" @click="goMember">
      <view class="member-row">
        <view class="member-left">
          <view class="m-title-row">
            <Icon name="crown" :size="32" color="#5C2A00" />
            <text class="m-title">会员开通</text>
          </view>
          <text class="m-sub">月费 ¥99 / 年费 ¥899 · 试用 30 天</text>
        </view>
        <view class="m-btn">
          <text>续费 / 升级</text>
          <Icon name="forward" :size="20" color="#FFD89B" />
        </view>
      </view>
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
            <Icon :name="it.icon" :size="36" color="var(--brand-primary)" />
          </view>
          <text class="row-label">{{ it.label }}</text>
        </view>
        <Icon name="forward" :size="22" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="logout" @click="logout"><text>退出登录</text></view>
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
  /* padding-top 由内联 heroPaddingTop 注入（状态栏 + 24rpx） */
  padding: 0 24rpx 56rpx;
}
.hero-inner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  &:active { opacity: 0.92; }
}
.avatar-wrap {
  width: 112rpx;
  height: 112rpx;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.2);
}
.avatar-img { width: 100%; height: 100%; display: block; }
.avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text {
    color: #fff;
    font-size: 48rpx;
    font-weight: 700;
  }
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .name { font-size: 34rpx; font-weight: 700; color: #fff; }
  .merchant-no {
    font-size: 22rpx;
    color: rgba(255,255,255,0.85);
    font-family: var(--font-family-base);
  }
  .tags { display: flex; gap: 8rpx; margin-top: 4rpx; flex-wrap: wrap; align-items: center; }
}
.rating-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background: rgba(255,255,255,0.22);
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #fff;
  .rating-count { font-size: 18rpx; opacity: 0.8; margin-left: 2rpx; }
}

.member-card {
  margin: -32rpx 24rpx 0;
  background: linear-gradient(135deg, #FFE8B3 0%, #FFC078 100%);
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(255,140,60,0.22);
  position: relative;
  z-index: 2;
}
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.member-left { flex: 1; }
.m-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .m-title { font-size: 28rpx; font-weight: 700; color: #5C2A00; }
}
.m-sub { display: block; margin-top: 4rpx; font-size: 22rpx; color: rgba(92,42,0,0.65); }
.m-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 10rpx 18rpx;
  background: #5C2A00;
  color: #FFD89B;
  border-radius: 999rpx;
  font-size: 22rpx;
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
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  &:last-child { border-bottom: none; }
  &:active { background: var(--bg-hover); }
}
.row-left { display: flex; align-items: center; gap: 16rpx; }
.row-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: var(--brand-primary-ghost);
  display: flex;
  align-items: center;
  justify-content: center;
}
.row-label { font-size: 28rpx; color: var(--text-primary); }

.logout {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
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
  margin-top: 24rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.safe-bottom { height: 60rpx; }
</style>
