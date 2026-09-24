<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
import { computed, ref } from 'vue'
import GlassSurface from '@jiujiu/shared/glass-surface.vue'
import { onBackPress, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { appService } from '../../services/app'
import {
  dismissUpdateForSession,
  formatUpdateBytes,
  readRuntimeVersion,
  readUpdateContext,
  type UpdateContext,
} from '../../composables/useAppUpdate'

type UpdateStage = 'loading' | 'available' | 'downloading' | 'permission' | 'installing' | 'error'

const context = ref<UpdateContext | null>(null)
const stage = ref<UpdateStage>('loading')
const progress = ref(0)
const downloadedBytes = ref(0)
const totalBytes = ref(0)
const errorMessage = ref('')
const localFilePath = ref('')
const waitingPermission = ref(false)
let downloadTask: any = null

const latest = computed(() => context.value?.latest || null)
const force = computed(() => !!latest.value?.force)
const progressText = computed(() => {
  const downloaded = formatUpdateBytes(downloadedBytes.value)
  const total = formatUpdateBytes(totalBytes.value || latest.value?.size || 0)
  return `${downloaded} / ${total}`
})

function fallbackRoute() {
  if (context.value?.nextRoute) return context.value.nextRoute
  const route = context.value?.returnRoute || ''
  if (route && !route.includes('/pages/startup/') && !route.includes('/pages/update/')) return route
  try {
    return uni.getStorageSync('jiujiu_token') || uni.getStorageSync('jiujiu_refresh_token')
      ? '/pages/tabbar/home/index'
      : '/pages/auth/login'
  } catch {
    return '/pages/auth/login'
  }
}

function leaveUpdateCenter() {
  if (force.value || !latest.value) return
  if (stage.value === 'downloading') cancelDownload(false)
  dismissUpdateForSession(latest.value.versionCode)
  if (context.value?.nextRoute) {
    uni.reLaunch({ url: fallbackRoute() })
    return
  }
  uni.navigateBack({ fail: () => uni.reLaunch({ url: fallbackRoute() }) })
}

async function loadContext() {
  stage.value = 'loading'
  errorMessage.value = ''
  const saved = readUpdateContext()
  if (saved) {
    context.value = saved
    totalBytes.value = saved.latest.size || 0
    stage.value = 'available'
    return
  }
  try {
    const release = await appService.getLatest('merchant')
    const runtime = readRuntimeVersion()
    if (!release?.url || release.versionCode <= runtime.versionCode) {
      appFeedback.showToast({ title: '当前已是最新版本', icon: 'success' })
      setTimeout(
        () => uni.navigateBack({ fail: () => uni.reLaunch({ url: fallbackRoute() }) }),
        500,
      )
      return
    }
    context.value = {
      platform: 'merchant',
      latest: release,
      runtime,
      source: 'manual',
      returnRoute: '/pages/tabbar/me/index',
      createdAt: Date.now(),
    }
    totalBytes.value = release.size || 0
    stage.value = 'available'
  } catch (error: any) {
    errorMessage.value = error?.message || '暂时无法获取版本信息，请检查网络后重试。'
    stage.value = 'error'
  }
}

function canRequestPackageInstalls(): boolean | null {
  try {
    const p = plus as any
    if (!p?.android) return null
    const Build = p.android.importClass('android.os.Build')
    const sdk = Number(Build?.VERSION?.SDK_INT || 0)
    if (sdk < 26) return true
    const activity = p.android.runtimeMainActivity()
    const manager = activity.getPackageManager()
    p.android.importClass(manager)
    return !!manager.canRequestPackageInstalls()
  } catch {
    return null
  }
}

function openInstallPermissionSettings() {
  try {
    const p = plus as any
    const activity = p.android.runtimeMainActivity()
    const Intent = p.android.importClass('android.content.Intent')
    const Uri = p.android.importClass('android.net.Uri')
    const intent = new Intent('android.settings.MANAGE_UNKNOWN_APP_SOURCES')
    intent.setData(Uri.parse(`package:${activity.getPackageName()}`))
    waitingPermission.value = true
    activity.startActivity(intent)
  } catch {
    waitingPermission.value = false
    installLocalApk()
  }
}

function installLocalApk() {
  if (!localFilePath.value) {
    errorMessage.value = '安装包文件不存在，请重新下载。'
    stage.value = 'error'
    return
  }
  const permission = canRequestPackageInstalls()
  if (permission === false) {
    stage.value = 'permission'
    return
  }
  try {
    if (typeof plus === 'undefined' || !plus?.runtime) throw new Error('当前环境不支持安装 APK')
    stage.value = 'installing'
    plus.runtime.install(
      localFilePath.value,
      { force: false },
      () => {
        stage.value = 'installing'
      },
      (error: any) => {
        const message = error?.message || '无法调起系统安装器'
        if (/permission|unknown|安装未知|授权/i.test(message)) {
          stage.value = 'permission'
        } else {
          errorMessage.value = message
          stage.value = 'error'
        }
      },
    )
  } catch (error: any) {
    errorMessage.value = error?.message || '无法调起系统安装器'
    stage.value = 'error'
  }
}

function startDownload() {
  const release = latest.value
  if (!release?.url || stage.value === 'downloading') return
  try {
    if (typeof plus === 'undefined' || !plus?.downloader)
      throw new Error('当前环境不支持应用内下载')
    progress.value = 0
    downloadedBytes.value = 0
    totalBytes.value = release.size || 0
    errorMessage.value = ''
    localFilePath.value = ''
    stage.value = 'downloading'
    const fileName = `_downloads/jingwei-merchant-${release.versionCode}.apk`
    downloadTask = plus.downloader.createDownload(
      release.url,
      { method: 'GET', filename: fileName, timeout: 120, retry: 3 },
      (download: any, status: number) => {
        downloadTask = null
        if (status !== 200 || !download?.filename) {
          errorMessage.value = `下载失败（HTTP ${status || '未知'}），请重试。`
          stage.value = 'error'
          return
        }
        const actualSize = Number(download.downloadedSize || download.totalSize || 0)
        if (release.size > 0 && actualSize > 0 && actualSize !== release.size) {
          errorMessage.value = '安装包大小校验失败，请重新下载。'
          stage.value = 'error'
          return
        }
        progress.value = 100
        downloadedBytes.value = actualSize || release.size
        localFilePath.value = download.filename
        installLocalApk()
      },
    )
    downloadTask.addEventListener('statechanged', (download: any) => {
      if (Number(download.downloadedSize) >= 0)
        downloadedBytes.value = Number(download.downloadedSize)
      if (Number(download.totalSize) > 0) totalBytes.value = Number(download.totalSize)
      const total = totalBytes.value || release.size
      if (total > 0)
        progress.value = Math.min(99, Math.round((downloadedBytes.value / total) * 100))
    })
    downloadTask.start()
  } catch (error: any) {
    downloadTask = null
    errorMessage.value = error?.message || '下载失败，请检查网络后重试。'
    stage.value = 'error'
  }
}

function cancelDownload(showToast = true) {
  try {
    downloadTask?.abort?.()
  } catch {
    // ignore
  }
  downloadTask = null
  progress.value = 0
  downloadedBytes.value = 0
  stage.value = 'available'
  if (showToast) appFeedback.showToast({ title: '已取消下载', icon: 'none' })
}

function retry() {
  if (localFilePath.value) installLocalApk()
  else startDownload()
}

function browserDownload() {
  const url = latest.value?.url
  if (!url) return
  try {
    if (typeof plus !== 'undefined' && plus?.runtime?.openURL) {
      plus.runtime.openURL(url)
      return
    }
  } catch {
    // H5 fallback
  }
  if (typeof window !== 'undefined') window.open(url, '_blank')
}

onLoad(loadContext)

onShow(() => {
  if (!waitingPermission.value) return
  waitingPermission.value = false
  setTimeout(() => {
    if (canRequestPackageInstalls() === true) installLocalApk()
    else stage.value = 'permission'
  }, 350)
})

onBackPress(() => {
  if (force.value) return true
  if (latest.value) dismissUpdateForSession(latest.value.versionCode)
  if (stage.value === 'downloading') cancelDownload(false)
  if (context.value?.nextRoute) {
    uni.reLaunch({ url: fallbackRoute() })
    return true
  }
  return false
})

onUnload(() => {
  try {
    downloadTask?.abort?.()
  } catch {
    // ignore
  }
  downloadTask = null
})
</script>

<template>
  <wd-config-provider
    :theme="$jwTheme.resolvedTheme"
    :theme-vars="$jwTheme.themeVars"
    custom-class="jw-theme-root"
  >
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />
    <view class="page">
      <view class="top-glow" />
      <view
        v-if="!force && stage !== 'downloading' && stage !== 'installing'"
        class="close"
        @click="leaveUpdateCenter"
      >
        <wd-icon :name="$jwIcon('close')" size="17px" color="#4E5969" />
      </view>

      <view class="hero">
        <view class="rocket"
          ><wd-icon :name="$jwIcon('arrow-up')" size="31px" color="#FFFFFF"
        /></view>
        <text class="eyebrow">经纬科技 · 商家版</text>
        <text class="title">{{ force ? '必须更新后继续使用' : '发现新版本' }}</text>
        <text class="subtitle">更稳定、更清晰的移动工作台体验</text>
      </view>

      <GlassSurface class="card" variant="card" effect="auto">
        <view v-if="stage === 'loading'" class="center-state">
          <view class="spinner" />
          <text>正在获取版本信息…</text>
        </view>

        <template v-else-if="context && latest">
          <view class="version-row">
            <view class="version-block">
              <text class="version-label">当前版本</text>
              <text class="version-value old">v{{ context.runtime.version }}</text>
              <text class="build">Build {{ context.runtime.versionCode }}</text>
            </view>
            <view class="version-arrow"
              ><wd-icon :name="$jwIcon('arrow-right')" size="18px" color="#FF4D2D"
            /></view>
            <view class="version-block right">
              <text class="version-label">最新版本</text>
              <text class="version-value">v{{ latest.version }}</text>
              <text class="build">Build {{ latest.versionCode }}</text>
            </view>
          </view>

          <view class="meta-row">
            <text>{{ formatUpdateBytes(latest.size) }}</text>
            <text class="dot">·</text>
            <text>{{ new Date(latest.publishedAt).toLocaleDateString() }}</text>
            <text v-if="latest.force" class="force-tag">强制更新</text>
          </view>

          <view class="notes">
            <text class="notes-title">本次更新</text>
            <text class="notes-content">{{ latest.changelog || '功能优化与稳定性提升' }}</text>
          </view>

          <view v-if="stage === 'downloading'" class="progress-panel">
            <view class="progress-head"
              ><text>正在下载安装包</text><text>{{ progress }}%</text></view
            >
            <view class="progress-track"
              ><view class="progress-fill" :style="{ width: `${progress}%` }"
            /></view>
            <text class="progress-size">{{ progressText }}</text>
          </view>

          <view v-else-if="stage === 'permission'" class="notice warning">
            <text class="notice-title">需要安装授权</text>
            <text>请允许经纬科技安装未知来源应用，授权后会继续打开系统安装器。</text>
          </view>

          <view v-else-if="stage === 'installing'" class="notice success">
            <text class="notice-title">正在打开系统安装器</text>
            <text>请在系统页面确认安装，安装完成后重新打开 APP。</text>
          </view>

          <view v-else-if="stage === 'error'" class="notice error">
            <text class="notice-title">更新没有完成</text>
            <text>{{ errorMessage }}</text>
          </view>

          <view class="actions">
            <wd-button
              v-if="stage === 'available'"
              class="primary"
              @click="startDownload"
              type="primary"
              size="large"
              block
              >立即更新</wd-button
            >
            <wd-button
              v-else-if="stage === 'downloading' && !force"
              class="secondary"
              @click="cancelDownload(true)"
              type="default"
              plain
              size="large"
              block
              >取消下载</wd-button
            >
            <wd-button
              v-else-if="stage === 'permission'"
              class="primary"
              @click="openInstallPermissionSettings"
              type="primary"
              size="large"
              block
              >去授权并安装</wd-button
            >
            <wd-button
              v-else-if="stage === 'installing'"
              class="primary"
              @click="installLocalApk"
              type="primary"
              size="large"
              block
              >再次打开安装器</wd-button
            >
            <wd-button
              v-else-if="stage === 'error'"
              class="primary"
              @click="retry"
              type="primary"
              size="large"
              block
              >重新尝试</wd-button
            >
            <wd-button
              v-if="stage === 'error' || stage === 'permission'"
              class="link-button"
              @click="browserDownload"
              type="default"
              plain
              size="large"
              block
              >使用浏览器下载</wd-button
            >
            <wd-button
              v-if="!force && (stage === 'available' || stage === 'error')"
              class="later"
              @click="leaveUpdateCenter"
              type="default"
              plain
              size="large"
              block
              >稍后更新</wd-button
            >
          </view>
        </template>

        <view v-else class="center-state">
          <text class="error-title">版本信息获取失败</text>
          <text>{{ errorMessage }}</text>
          <wd-button class="primary compact" @click="loadContext" type="primary" size="small" block
            >重新检查</wd-button
          >
        </view>
      </GlassSurface>

      <text class="security">HTTPS 安全下载 · 正式签名安装包</text>
    </view>
  </wd-config-provider>
</template>

<style lang="scss" scoped>
.page {
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  padding: calc(70rpx + var(--status-bar-height, 0px)) 30rpx 50rpx;
  background: var(--bg-page);
}
.top-glow {
  position: absolute;
  top: -260rpx;
  left: -160rpx;
  width: 1080rpx;
  height: 700rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7a52, #ff4d2d 58%, #df3219);
}
.close {
  position: absolute;
  z-index: 5;
  right: 28rpx;
  top: calc(26rpx + var(--status-bar-height, 0px));
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}
.hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
}
.rocket {
  width: 116rpx;
  height: 116rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.38);
  box-shadow: 0 20rpx 50rpx rgba(140, 35, 12, 0.28);
}
.eyebrow {
  margin-top: 24rpx;
  font-size: 21rpx;
  opacity: 0.76;
  letter-spacing: 3rpx;
}
.title {
  margin-top: 12rpx;
  font-size: 42rpx;
  font-weight: 800;
}
.subtitle {
  margin-top: 10rpx;
  font-size: 23rpx;
  opacity: 0.8;
}
.card {
  position: relative;
  z-index: 2;
  margin-top: 42rpx;
  min-height: 660rpx;
  padding: 38rpx 34rpx 34rpx;
  border-radius: 30rpx;
  background: var(--bg-card);
  box-shadow: 0 20rpx 60rpx rgba(35, 39, 47, 0.12);
}
.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.version-block {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.version-block.right {
  align-items: flex-end;
}
.version-label {
  color: var(--text-tertiary);
  font-size: 21rpx;
}
.version-value {
  margin-top: 8rpx;
  color: #ff4d2d;
  font-size: 38rpx;
  font-weight: 800;
}
.version-value.old {
  color: var(--text-secondary);
}
.build {
  margin-top: 5rpx;
  color: #a2a7b0;
  font-size: 19rpx;
}
.version-arrow {
  width: 70rpx;
  display: flex;
  justify-content: center;
}
.meta-row {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  color: var(--text-tertiary);
  font-size: 21rpx;
}
.dot {
  color: var(--text-disabled);
}
.force-tag {
  margin-left: 6rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #fff0eb;
  color: #ff4d2d;
}
.notes {
  margin-top: 30rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}
.notes-title {
  color: #1f2329;
  font-size: 27rpx;
  font-weight: 700;
}
.notes-content {
  margin-top: 16rpx;
  color: var(--text-secondary);
  font-size: 24rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}
.progress-panel {
  margin-top: 28rpx;
}
.progress-head {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 23rpx;
}
.progress-track {
  height: 14rpx;
  margin-top: 16rpx;
  overflow: hidden;
  border-radius: 7rpx;
  background: #f0f1f3;
}
.progress-fill {
  height: 100%;
  border-radius: 7rpx;
  background: linear-gradient(90deg, #ff7a52, #ff4d2d);
  transition: width 0.2s;
}
.progress-size {
  display: block;
  margin-top: 10rpx;
  color: #a2a7b0;
  font-size: 20rpx;
  text-align: right;
}
.notice {
  margin-top: 26rpx;
  padding: 22rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 9rpx;
  border-radius: 16rpx;
  color: #646a73;
  font-size: 22rpx;
  line-height: 1.55;
}
.notice-title {
  font-size: 24rpx;
  font-weight: 700;
}
.notice.warning {
  background: #fff7e8;
  color: #8d5d11;
}
.notice.success {
  background: #e8fff5;
  color: #087a55;
}
.notice.error {
  background: #fff0f0;
  color: #a72a2a;
}
.actions {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
button::after {
  border: none;
}
.primary,
.secondary,
.later,
.link-button {
  width: 100%;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  font-size: 27rpx;
}
.primary {
  color: #fff;
  background: linear-gradient(135deg, #ff714a, #ff4d2d);
  box-shadow: 0 12rpx 28rpx rgba(255, 77, 45, 0.25);
}
.primary.compact {
  width: 260rpx;
  margin-top: 28rpx;
}
.secondary {
  color: #ff4d2d;
  background: #fff0eb;
}
.later {
  color: var(--text-tertiary);
  background: transparent;
}
.link-button {
  color: #ff4d2d;
  background: var(--bg-card);
  border: 1rpx solid #ffd1c7;
}
.center-state {
  min-height: 590rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  color: var(--text-tertiary);
  font-size: 24rpx;
  text-align: center;
}
.spinner {
  width: 40rpx;
  height: 40rpx;
  border: 5rpx solid #ffd5cc;
  border-top-color: #ff4d2d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.error-title {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
}
.security {
  position: relative;
  z-index: 2;
  display: block;
  margin-top: 28rpx;
  color: #a2a7b0;
  font-size: 20rpx;
  text-align: center;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
