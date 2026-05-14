<script setup lang="ts">
/**
 * 分享 APP（商家版）
 *
 * 内容：APK 直链（来自 appService.getLatest('merchant')） + 自动生成 QR 图 +
 *      复制链接 / 系统分享 / 保存图片 三个动作
 *
 * QR 图通过公开服务即时生成（无第三方 SDK 依赖）：
 *   https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=<encoded url>
 */
import { ref, computed, onMounted } from 'vue'
import { appService, type AppRelease } from '../../services/app'
import { useStatusBar } from '../../composables/useStatusBar'
import Icon from '../../components/icon/icon.vue'
import { safeBackOrHome } from '../../utils/tab-nav'

const { heroPaddingTop } = useStatusBar(24)

const release = ref<AppRelease | null>(null)

async function load() {
  release.value = await appService.getLatest('merchant')
}
onMounted(load)

const downloadUrl = computed(() => release.value?.url || '')
const version = computed(() => release.value?.version || '--')
const qrUrl = computed(() => {
  if (!downloadUrl.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=0&data=${encodeURIComponent(downloadUrl.value)}`
})

function copyLink() {
  if (!downloadUrl.value) return
  uni.setClipboardData({
    data: downloadUrl.value,
    success: () => uni.showToast({ title: '已复制下载链接', icon: 'success' }),
  })
}

function systemShare() {
  if (!downloadUrl.value) return
  try {
    // App-plus：调起系统分享面板
    if (typeof uni.shareWithSystem === 'function') {
      uni.shareWithSystem({
        type: 'text',
        summary: `点击下载安装：${version.value}`,
        href: downloadUrl.value,
        success: () => uni.showToast({ title: '已唤起系统分享', icon: 'none' }),
        fail: (e: any) => uni.showToast({ title: e?.errMsg || '分享失败', icon: 'none' }),
      })
    } else {
      copyLink()
    }
  } catch {
    copyLink()
  }
}

function saveQr() {
  if (!qrUrl.value) return
  uni.downloadFile({
    url: qrUrl.value,
    success: (r) => {
      if (r.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: (e) => uni.showToast({ title: e?.errMsg || '保存失败', icon: 'none' }),
        })
      }
    },
    fail: () => uni.showToast({ title: '二维码下载失败', icon: 'none' }),
  })
}

function goBack() {
  safeBackOrHome('/pages/tabbar/me/index')
}
</script>

<template>
  <view class="page">
    <view class="hero" :style="{ paddingTop: heroPaddingTop }">
      <view class="hero-top">
        <view class="back-btn" @click="goBack">
          <Icon name="back" :size="32" color="#fff" />
        </view>
        <text class="hero-title">分享 APP</text>
        <view class="back-btn placeholder" />
      </view>
      <text class="hero-sub">扫码或复制链接，让朋友直接下载商家版</text>
    </view>

    <view class="card">
      <view class="qr-wrap">
        <image v-if="qrUrl" class="qr" :src="qrUrl" mode="aspectFit" />
        <view v-else class="qr placeholder">
          <text>加载二维码…</text>
        </view>
      </view>
      <text class="brand">经纬科技 · 商家版</text>
      <text class="version">当前版本 v{{ version }}</text>
      <view class="url-row">
        <text class="url-text" :user-select="true">{{ downloadUrl }}</text>
      </view>
    </view>

    <view class="actions">
      <view class="action-btn primary" @click="copyLink">
        <Icon name="doc" :size="36" color="#fff" />
        <text>复制链接</text>
      </view>
      <view class="action-btn" @click="systemShare">
        <Icon name="share" :size="36" color="#FF4D2D" />
        <text>系统分享</text>
      </view>
      <view class="action-btn" @click="saveQr">
        <Icon name="image-plus" :size="36" color="#FF4D2D" />
        <text>保存二维码</text>
      </view>
    </view>

    <view class="tip">
      <Icon name="info" :size="28" color="#86909c" />
      <text class="tip-text">
        分享给好友后，对方使用浏览器扫码或点击链接即可下载 APK 安装包。 iOS
        暂不支持自动安装，建议引导对方前往 App Store。
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 48rpx;
}
.hero {
  background:
    radial-gradient(120% 80% at 100% 0%, #ff8a5e 0%, transparent 60%),
    linear-gradient(160deg, #ff6b45 0%, #ff4d2d 50%, #e63a1f 100%);
  padding: 0 32rpx 80rpx;
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-btn.placeholder {
  background: transparent;
  border-color: transparent;
}
.hero-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
}
.hero-sub {
  display: block;
  margin-top: 24rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  text-align: center;
}

.card {
  margin: -48rpx 28rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 36rpx 32rpx 28rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  position: relative;
  z-index: 2;
}
.qr-wrap {
  width: 360rpx;
  height: 360rpx;
  background: #fff6f1;
  border: 2rpx solid #ffe0cd;
  border-radius: 20rpx;
  padding: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr {
  width: 100%;
  height: 100%;
}
.qr.placeholder {
  color: #c9cdd4;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 1rpx;
  margin-top: 8rpx;
}
.version {
  font-size: 22rpx;
  color: #86909c;
  font-family: 'SF Mono', Consolas, monospace;
}
.url-row {
  width: 100%;
  background: #f7f8fa;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  margin-top: 4rpx;
}
.url-text {
  font-size: 22rpx;
  color: #4e5969;
  word-break: break-all;
  line-height: 1.5;
}

.actions {
  margin: 24rpx 28rpx 0;
  display: flex;
  gap: 14rpx;
}
.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0;
  background: #fff;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #4e5969;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.15s;
  &:active {
    transform: scale(0.96);
  }
}
.action-btn.primary {
  background: linear-gradient(135deg, #ff6b45, #ff4d2d);
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(255, 77, 45, 0.32);
}

.tip {
  margin: 24rpx 28rpx 0;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.tip-text {
  flex: 1;
  font-size: 22rpx;
  color: #86909c;
  line-height: 1.6;
}
</style>
