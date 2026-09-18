<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { checkAppUpdate } from '../../composables/useAppUpdate'

const userStore = useUserStore()

function targetRoute() {
  userStore.hydrate()
  return userStore.accessToken || userStore.refreshToken
    ? '/pages/tabbar/home/index'
    : '/pages/auth/login'
}

function enterApp() {
  const route = targetRoute()
  uni.reLaunch({
    url: route,
    success: () => {
      // 首屏先进入，更新检查在页面稳定后异步执行；网络异常不再阻塞冷启动。
      setTimeout(() => void checkAppUpdate('merchant', { silent: true, source: 'startup' }), 300)
    },
  })
}

onMounted(enterApp)
</script>

<template>
  <view class="startup-page">
    <view class="glow glow-top" />
    <view class="glow glow-bottom" />
    <view class="content">
      <view class="logo"><text>经</text></view>
      <text class="brand">经纬科技</text>
      <text class="edition">商家工作台</text>
      <view class="loading-row">
        <view class="spinner" />
        <text class="status">正在进入商家工作台…</text>
      </view>
    </view>
    <text class="footer">安全恢复会话</text>
  </view>
</template>

<style scoped lang="scss">
.startup-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(155deg, #ff7048 0%, #ff4d2d 48%, #dd351b 100%);
}
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70rpx);
  background: rgba(255, 239, 215, 0.36);
}
.glow-top {
  width: 480rpx;
  height: 480rpx;
  right: -160rpx;
  top: -180rpx;
}
.glow-bottom {
  width: 400rpx;
  height: 400rpx;
  left: -170rpx;
  bottom: -120rpx;
}
.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 60rpx;
}
.logo {
  width: 152rpx;
  height: 152rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 38rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 2rpx solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 24rpx 56rpx rgba(110, 27, 10, 0.28);
  text {
    font-size: 76rpx;
    font-weight: 900;
    color: #ff4d2d;
  }
}
.brand {
  margin-top: 36rpx;
  color: #fff;
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
}
.edition {
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 25rpx;
  letter-spacing: 5rpx;
}
.loading-row {
  min-height: 48rpx;
  margin-top: 72rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.spinner {
  width: 28rpx;
  height: 28rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.32);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.status {
  color: rgba(255, 255, 255, 0.88);
  font-size: 25rpx;
}
.retry {
  margin-top: 32rpx;
  width: 300rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.7);
  color: #ff4d2d;
  background: var(--bg-card);
  font-size: 28rpx;
  font-weight: 600;
  &::after {
    border: none;
  }
}
.footer {
  position: absolute;
  bottom: calc(44rpx + env(safe-area-inset-bottom));
  color: rgba(255, 255, 255, 0.55);
  font-size: 21rpx;
  letter-spacing: 2rpx;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
