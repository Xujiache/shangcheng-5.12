<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '../../store/admin'
import { checkAppUpdate } from '../../composables/useAppUpdate'

const adminStore = useAdminStore()

function targetRoute() {
  adminStore.hydrate()
  return adminStore.accessToken || adminStore.refreshToken
    ? '/pages/tabbar/home/index'
    : '/pages/auth/login'
}

function enterApp() {
  const route = targetRoute()
  uni.reLaunch({
    url: route,
    success: () => {
      // 首屏先进入，更新检查在页面稳定后异步执行；网络异常不再阻塞冷启动。
      setTimeout(() => void checkAppUpdate('platform', { silent: true, source: 'startup' }), 300)
    },
  })
}

onMounted(enterApp)
</script>

<template>
  <view class="startup-page">
    <view class="grid" />
    <view class="glow glow-top" />
    <view class="glow glow-bottom" />
    <view class="content">
      <view class="logo"><text>经</text></view>
      <text class="brand">经纬科技</text>
      <text class="edition">平台管理后台</text>
      <view class="loading-row">
        <view class="spinner" />
        <text class="status">正在进入平台管理后台…</text>
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
  background: linear-gradient(155deg, #151c2c 0%, #0e1320 58%, #080b12 100%);
}
.grid {
  position: absolute;
  inset: 0;
  opacity: 0.14;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.12) 2rpx, transparent 2rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 2rpx, transparent 2rpx);
  background-size: 72rpx 72rpx;
}
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80rpx);
  background: rgba(255, 77, 45, 0.3);
}
.glow-top {
  width: 500rpx;
  height: 500rpx;
  right: -170rpx;
  top: -200rpx;
}
.glow-bottom {
  width: 420rpx;
  height: 420rpx;
  left: -190rpx;
  bottom: -140rpx;
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
  border-radius: 36rpx;
  background: linear-gradient(135deg, #ff714a 0%, #ff4d2d 100%);
  border: 2rpx solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 24rpx 64rpx rgba(255, 77, 45, 0.38);
  text {
    color: #fff;
    font-size: 76rpx;
    font-weight: 900;
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
  color: rgba(255, 255, 255, 0.56);
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
  border: 4rpx solid rgba(255, 255, 255, 0.22);
  border-top-color: #ff6944;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.status {
  color: rgba(255, 255, 255, 0.68);
  font-size: 25rpx;
}
.retry {
  margin-top: 32rpx;
  width: 300rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #ff714a, #ff4d2d);
  font-size: 28rpx;
  font-weight: 600;
  &::after {
    border: none;
  }
}
.footer {
  position: absolute;
  bottom: calc(44rpx + env(safe-area-inset-bottom));
  color: rgba(255, 255, 255, 0.3);
  font-size: 21rpx;
  letter-spacing: 2rpx;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
