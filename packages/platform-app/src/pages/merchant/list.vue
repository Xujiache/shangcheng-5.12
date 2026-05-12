<script setup lang="ts">
/**
 * 商户列表 · 非 tabbar 入口
 * 来自其他屏的 navigateTo，统一跳到 tabbar 入口
 */
import { onLoad } from '@dcloudio/uni-app'

onLoad(() => {
  uni.switchTab({ url: '/pages/tabbar/merchant/index' })
})
</script>
<template>
  <view class="empty">跳转中…</view>
</template>
<style lang="scss" scoped>
.empty {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  color: var(--text-tertiary);
  font-size: 24rpx;
}
</style>
