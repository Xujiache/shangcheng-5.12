<script setup lang="ts">
/**
 * PA · APP 发布管理（自更新）
 *
 * 对接后端 AppReleaseController：
 *   GET    /api/v1/p/app-releases?platform=merchant|platform
 *   DELETE /api/v1/p/app-releases/:id
 *   POST   /api/v1/p/app-releases   (multipart, 移动端 + admin-pc 都可上传)
 *
 * 移动端可上传 ≤200MB 的 APK,超出会提示改用 PC 后台。
 * 端上检查更新走公开 GET /api/v1/m/app/latest，无需在此操心。
 */
import { ref, computed, onMounted } from 'vue'
import { appReleaseService } from '../../services'
import type { AppRelease, AppReleasePlatform } from '../../services'
import { formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import { pickApk, uploadApk } from '../../utils/upload'

const MAX_APK_SIZE_MB = 200

const PLATFORM_TABS: { key: AppReleasePlatform; label: string; tint: string }[] = [
  { key: 'merchant', label: '商家端', tint: '#FF4D2D' },
  { key: 'platform', label: '平台端', tint: '#1296DB' },
]

const tab = ref<AppReleasePlatform>('merchant')
const list = ref<AppRelease[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const rows = await appReleaseService.list(tab.value)
    list.value = Array.isArray(rows) ? rows : []
  } catch (e: any) {
    list.value = []
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(k: AppReleasePlatform) {
  if (tab.value === k) return
  tab.value = k
  load()
}

const latest = computed(() => {
  if (list.value.length === 0) return null
  return [...list.value].sort((a, b) => b.versionCode - a.versionCode)[0]
})

function formatSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

function confirmRemove(row: AppRelease) {
  uni.showModal({
    title: '删除发布',
    content: `确认删除「${row.platform === 'merchant' ? '商家端' : '平台端'} v${row.version} (build ${row.versionCode})」？\n已下载用户不受影响，但启动检查将不再推送此版本。`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await appReleaseService.remove(row.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

function copyUrl(row: AppRelease) {
  if (!row.url) return
  uni.setClipboardData({
    data: row.url,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

// =========== 上传 APK ============
const uploadOpen = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)

interface UploadForm {
  platform: AppReleasePlatform
  version: string
  versionCode: number
  changelog: string
  force: boolean
  filePath: string
  fileName: string
  fileSize: number
}
const form = ref<UploadForm>(createEmptyForm())

function createEmptyForm(): UploadForm {
  return {
    platform: tab.value,
    version: '',
    versionCode: 0,
    changelog: '',
    force: false,
    filePath: '',
    fileName: '',
    fileSize: 0,
  }
}

function openUploadSheet() {
  form.value = createEmptyForm()
  // 默认建议 versionCode = 最新 + 1,方便快速递增
  if (latest.value && latest.value.versionCode > 0) {
    form.value.versionCode = latest.value.versionCode + 1
  } else {
    form.value.versionCode = 1
  }
  uploadProgress.value = 0
  uploadOpen.value = true
}

function closeUploadSheet() {
  if (uploading.value) return
  uploadOpen.value = false
}

function setUploadPlatform(p: AppReleasePlatform) {
  if (uploading.value) return
  form.value.platform = p
}

async function chooseApk() {
  if (uploading.value) return
  try {
    const picked = await pickApk()
    const sizeMb = picked.size / 1024 / 1024
    if (picked.size > MAX_APK_SIZE_MB * 1024 * 1024) {
      uni.showModal({
        title: '文件过大',
        content: `所选文件 ${sizeMb.toFixed(1)}MB,超过移动端上传上限 ${MAX_APK_SIZE_MB}MB。\n请改用 PC 后台「APP 发布管理」上传。`,
        showCancel: false,
        confirmText: '我知道了',
      })
      return
    }
    form.value.filePath = picked.tempPath
    form.value.fileName = picked.name
    form.value.fileSize = picked.size
  } catch (e: any) {
    if (e?.message && !/cancel/i.test(e.message)) {
      uni.showToast({ title: e.message, icon: 'none' })
    }
  }
}

function validateForm(): string | null {
  if (!form.value.platform) return '请选择平台'
  if (!form.value.version || !/^\d+\.\d+\.\d+$/.test(form.value.version)) {
    return 'version 必须是 x.y.z 三段数字'
  }
  const vc = Number(form.value.versionCode)
  if (!vc || vc <= 0 || !Number.isInteger(vc)) return 'versionCode 必须是正整数'
  if (
    latest.value &&
    form.value.platform === latest.value.platform &&
    vc <= latest.value.versionCode
  ) {
    return `versionCode 必须大于线上最新版 ${latest.value.versionCode}`
  }
  if (!form.value.filePath) return '请选择 APK 文件'
  return null
}

async function submitUpload() {
  const err = validateForm()
  if (err) {
    uni.showToast({ title: err, icon: 'none' })
    return
  }
  uploading.value = true
  uploadProgress.value = 0
  try {
    await uploadApk({
      filePath: form.value.filePath,
      platform: form.value.platform,
      version: form.value.version,
      versionCode: form.value.versionCode,
      changelog: form.value.changelog,
      force: form.value.force,
      onProgress: (p) => {
        uploadProgress.value = p
      },
    })
    uni.showToast({ title: '上传成功', icon: 'success' })
    uploadOpen.value = false
    // 切到对应 tab 让列表立刻可见
    if (form.value.platform !== tab.value) {
      tab.value = form.value.platform
    }
    await load()
  } catch (e: any) {
    uni.showModal({
      title: '上传失败',
      content: e?.message || '请检查网络或 APK 文件后重试',
      showCancel: false,
    })
  } finally {
    uploading.value = false
  }
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="APP 发布管理" right-icon="refresh" @right="load" />

    <!-- 平台 tab -->
    <view class="tabs">
      <view
        v-for="t in PLATFORM_TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="switchTab(t.key)"
      >
        <text class="tab-label">{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" :style="{ background: t.tint }" />
      </view>
    </view>

    <!-- 最新版本卡 -->
    <view v-if="latest" class="latest-card">
      <view class="latest-head">
        <view class="latest-badge">最新</view>
        <text class="latest-platform">{{ tab === 'merchant' ? '商家端' : '平台端' }}</text>
      </view>
      <view class="latest-ver">
        <text class="ver">v{{ latest.version }}</text>
        <text class="build">build {{ latest.versionCode }}</text>
        <view v-if="latest.force" class="force-tag">强更</view>
      </view>
      <view class="latest-meta">
        <view class="meta-item">
          <Icon name="package" :size="22" color="rgba(255,255,255,0.85)" />
          <text>{{ formatSize(latest.size) }}</text>
        </view>
        <view class="meta-item">
          <Icon name="clock" :size="22" color="rgba(255,255,255,0.85)" />
          <text>{{ formatDate(latest.publishedAt) }}</text>
        </view>
      </view>
      <text v-if="latest.changelog" class="latest-log">{{ latest.changelog }}</text>
    </view>

    <scroll-view scroll-y class="scroll">
      <view class="section-head">
        <text class="section-title">历史版本</text>
        <text class="section-count">{{ list.length }} 个</text>
      </view>

      <view v-for="row in list" :key="row.id" class="row">
        <view class="row-head">
          <view class="row-left">
            <text class="row-ver">v{{ row.version }}</text>
            <text class="row-build">#{{ row.versionCode }}</text>
            <view v-if="row.force" class="force-tag small">强更</view>
          </view>
          <text class="row-time">{{ formatDate(row.publishedAt) }}</text>
        </view>

        <text v-if="row.changelog" class="row-log">{{ row.changelog }}</text>

        <view class="row-meta">
          <view class="meta-chip">
            <Icon name="package" :size="22" color="var(--text-tertiary)" />
            <text>{{ formatSize(row.size) }}</text>
          </view>
          <view class="meta-chip ellipsis" @click="copyUrl(row)">
            <Icon name="share" :size="22" color="var(--text-tertiary)" />
            <text class="url-text">{{ row.url || '—' }}</text>
          </view>
        </view>

        <view class="row-actions">
          <view class="btn ghost" @click="copyUrl(row)">复制链接</view>
          <view class="btn danger" @click="confirmRemove(row)">删除</view>
        </view>
      </view>

      <EmptyState
        v-if="!loading && list.length === 0"
        title="暂无发布记录"
        desc="新版本由 PC 后台上传后将出现在这里"
        icon="package"
      />
      <view style="height: 160rpx" />
    </scroll-view>

    <view class="fab" @click="openUploadSheet">
      <Icon name="plus" :size="36" color="#fff" />
      <text>上传 APK</text>
    </view>

    <!-- 上传 APK Sheet -->
    <view v-if="uploadOpen" class="sheet-mask" @click="closeUploadSheet">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">上传 APK 发布</text>
          <view class="sheet-close" @click="closeUploadSheet">
            <Icon name="close" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>

        <scroll-view scroll-y class="sheet-body">
          <!-- 平台 -->
          <view class="field">
            <text class="field-label">目标平台</text>
            <view class="seg-group">
              <view
                v-for="p in PLATFORM_TABS"
                :key="p.key"
                :class="['seg', form.platform === p.key ? 'active' : '']"
                :style="form.platform === p.key ? { background: p.tint, borderColor: p.tint } : {}"
                @click="setUploadPlatform(p.key)"
              >
                <text>{{ p.label }}</text>
              </view>
            </view>
          </view>

          <!-- version -->
          <view class="field">
            <text class="field-label">版本号 (x.y.z)</text>
            <input
              v-model="form.version"
              class="field-input"
              placeholder="例: 1.2.0"
              maxlength="20"
              :disabled="uploading"
            />
          </view>

          <!-- versionCode -->
          <view class="field">
            <text class="field-label">versionCode (递增正整数)</text>
            <input
              v-model.number="form.versionCode"
              class="field-input mono"
              type="number"
              :placeholder="latest ? `>${latest.versionCode}` : '120'"
              :disabled="uploading"
            />
            <text v-if="latest && form.platform === latest.platform" class="field-hint">
              线上最新 v{{ latest.version }} · build {{ latest.versionCode }}
            </text>
          </view>

          <!-- changelog -->
          <view class="field">
            <text class="field-label">更新说明</text>
            <textarea
              v-model="form.changelog"
              class="field-textarea"
              placeholder="本次更新内容,端上弹窗会显示给用户"
              maxlength="400"
              :disabled="uploading"
              auto-height
            />
          </view>

          <!-- force -->
          <view class="field row">
            <view class="row-left">
              <text class="field-label" style="margin-bottom: 0">强制更新</text>
              <text class="field-hint" style="margin-top: 2rpx">开启后用户无法跳过</text>
            </view>
            <view
              :class="['switch', form.force ? 'on' : '']"
              @click="!uploading && (form.force = !form.force)"
            >
              <view class="thumb" />
            </view>
          </view>

          <!-- 文件 -->
          <view class="field">
            <text class="field-label">APK 文件 (≤{{ MAX_APK_SIZE_MB }}MB)</text>
            <view class="file-picker" @click="chooseApk">
              <Icon name="package" :size="44" color="var(--brand-primary)" />
              <view class="fp-info">
                <text v-if="!form.filePath" class="fp-tip">点击选择 .apk 文件</text>
                <template v-else>
                  <text class="fp-name">{{ form.fileName }}</text>
                  <text class="fp-size">{{ formatSize(form.fileSize) }}</text>
                </template>
              </view>
              <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
            </view>
          </view>

          <!-- 进度 -->
          <view v-if="uploading" class="progress-card">
            <view class="progress-bar"
              ><view class="progress-fill" :style="{ width: uploadProgress + '%' }"
            /></view>
            <text class="progress-text">上传中 {{ uploadProgress }}%</text>
          </view>

          <view style="height: 24rpx" />
        </scroll-view>

        <view class="sheet-foot">
          <view :class="['sheet-btn ghost', uploading ? 'disabled' : '']" @click="closeUploadSheet"
            >取消</view
          >
          <view
            :class="['sheet-btn primary', uploading ? 'disabled' : '']"
            @click="!uploading && submitUpload()"
          >
            {{ uploading ? `上传中 ${uploadProgress}%` : '开始上传' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 56rpx;
    height: 6rpx;
    border-radius: 6rpx 6rpx 0 0;
  }
}

.latest-card {
  margin: 16rpx 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  box-shadow: 0 6rpx 24rpx rgba(255, 77, 45, 0.3);
}
.latest-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  .latest-badge {
    padding: 4rpx 14rpx;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
  .latest-platform {
    font-size: 22rpx;
    opacity: 0.9;
  }
}
.latest-ver {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  .ver {
    font-size: 56rpx;
    font-weight: 800;
    font-family: var(--font-family-base);
    line-height: 1;
  }
  .build {
    font-size: 22rpx;
    opacity: 0.85;
    font-family: var(--font-family-base);
  }
  .force-tag {
    align-self: center;
    margin-left: 8rpx;
    padding: 4rpx 12rpx;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 6rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.latest-meta {
  display: flex;
  gap: 24rpx;
  font-size: 22rpx;
  opacity: 0.9;
  .meta-item {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }
}
.latest-log {
  margin-top: 4rpx;
  font-size: 22rpx;
  opacity: 0.95;
  line-height: 1.5;
  max-height: 120rpx;
  overflow: hidden;
}

.scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
  box-sizing: border-box;
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 16rpx 4rpx;
  .section-title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .section-count {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.row {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.row-left {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  .row-ver {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
  .row-build {
    font-size: 22rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.force-tag.small {
  margin-left: 4rpx;
  padding: 2rpx 10rpx;
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
  border-radius: 6rpx;
  font-size: 18rpx;
  font-weight: 700;
}
.row-time {
  font-size: 20rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
}
.row-log {
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.5;
  max-height: 120rpx;
  overflow: hidden;
}
.row-meta {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.meta-chip {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
  &.ellipsis {
    flex: 1;
    min-width: 0;
    .url-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 12rpx;
}
.btn {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.danger {
    background: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
  }
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(56rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 26rpx;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 28rpx rgba(255, 77, 45, 0.4);
  z-index: 80;
  &:active {
    transform: scale(0.97);
  }
}

/* ========== 上传 Sheet ========== */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  max-height: 88vh;
  background: var(--bg-card);
  border-radius: 28rpx 28rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
}
.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx 12rpx;
  border-bottom: 1rpx solid var(--border-light);
  .sheet-title {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .sheet-close {
    padding: 8rpx;
  }
}
.sheet-body {
  flex: 1;
  height: 0;
  padding: 8rpx 24rpx 0;
}
.field {
  padding: 18rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    .row-left {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  }
}
.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-secondary);
}
.field-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.field-input {
  width: 100%;
  height: 72rpx;
  padding: 0 18rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  box-sizing: border-box;
  &.mono {
    font-family: var(--font-family-base);
  }
}
.field-textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 14rpx 18rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  box-sizing: border-box;
  line-height: 1.55;
}
.seg-group {
  display: flex;
  gap: 12rpx;
}
.seg {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  font-weight: 600;
  &.active {
    color: #fff;
  }
}
.switch {
  flex-shrink: 0;
  width: 80rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  position: relative;
  transition: all 0.2s;
  .thumb {
    position: absolute;
    top: 2rpx;
    left: 2rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: all 0.2s;
    box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.15);
  }
  &.on {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
    .thumb {
      left: 38rpx;
      background: #fff;
    }
  }
}
.file-picker {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: var(--bg-page);
  border: 1rpx dashed var(--border-default);
  border-radius: 16rpx;
  .fp-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .fp-tip {
      font-size: 26rpx;
      color: var(--text-tertiary);
    }
    .fp-name {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fp-size {
      font-size: 22rpx;
      color: var(--text-tertiary);
      font-family: var(--font-family-base);
    }
  }
}
.progress-card {
  margin-top: 16rpx;
  padding: 16rpx;
  background: rgba(255, 77, 45, 0.06);
  border-radius: 14rpx;
}
.progress-bar {
  width: 100%;
  height: 12rpx;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 12rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  border-radius: 12rpx;
  transition: width 0.2s;
}
.progress-text {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--brand-primary);
  font-family: var(--font-family-base);
  font-weight: 700;
  text-align: right;
}
.sheet-foot {
  flex-shrink: 0;
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx 24rpx;
  border-top: 1rpx solid var(--border-light);
}
.sheet-btn {
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
  &.disabled {
    opacity: 0.6;
  }
}
</style>
