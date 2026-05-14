<script setup lang="ts">
/**
 * 商户列表 · 非 tabbar 入口（深链 / 通知 / 分享落地）
 *
 * 该路径独立于 tabbar `/pages/tabbar/merchant/index`,主要承接:
 *   - 后端推送通知里硬编码的 `/pages/merchant/list`
 *   - 外部分享/扫码进来的旧链接
 *   - 站内 navigateTo 时(避免 switchTab 限制下的兜底)
 *
 * 直接 switchTab 会让用户感到"页面闪一下就跳走"很突兀,
 * 这里做一个 3 秒倒计时 + 立即前往 + 返回首页 的友好引导页。
 */
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import Icon from '../../components/icon/icon.vue'

const countdown = ref(3)
let timer: ReturnType<typeof setInterval> | null = null

function go() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  uni.switchTab({ url: '/pages/tabbar/merchant/index' })
}

function goHome() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  uni.switchTab({ url: '/pages/tabbar/home/index' })
}

onLoad(() => {
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      go()
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <view class="page">
    <view class="card">
      <view class="icon-wrap">
        <Icon name="home-shop" :size="96" color="var(--brand-primary)" />
      </view>
      <text class="title">商户管理</text>
      <text class="desc"
        >即将为你跳转到「商户」管理中心,可在那里查看入驻商户、审批/暂停/恢复商户</text
      >
      <view class="countdown">
        <text class="num">{{ countdown }}</text>
        <text class="unit">秒后自动跳转</text>
      </view>
      <view class="actions">
        <view class="btn ghost" @click="goHome">返回首页</view>
        <view class="btn primary" @click="go">立即前往</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  box-sizing: border-box;
}
.card {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx;
  padding: 56rpx 40rpx 40rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.icon-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.12), rgba(255, 156, 110, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 77, 45, 0.25);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 16rpx rgba(255, 77, 45, 0);
  }
}
.title {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--text-primary);
}
.desc {
  font-size: 24rpx;
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.6;
  padding: 0 24rpx;
}
.countdown {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  padding: 12rpx 28rpx;
  background: rgba(255, 77, 45, 0.08);
  border-radius: 999rpx;
  .num {
    font-size: 40rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    line-height: 1;
  }
  .unit {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
  }
}
.actions {
  margin-top: 24rpx;
  width: 100%;
  display: flex;
  gap: 16rpx;
}
.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  }
}
</style>
