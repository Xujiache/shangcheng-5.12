<script setup lang="ts">
/**
 * PA · APP 发布管理（自更新）
 *
 * 对接后端 AppReleaseController：
 *   GET    /api/v1/p/app-releases?platform=merchant|platform
 *   DELETE /api/v1/p/app-releases/:id
 *   POST   /api/v1/p/app-releases   (multipart, 需 PC 端走文件选择)
 *
 * 移动端只做"列出 + 删除"，APK 上传由 admin-pc 完成（涉及 50MB+ 文件 + 进度条）。
 * 端上检查更新走公开 GET /api/v1/m/app/latest，无需在此操心。
 */
import { ref, computed, onMounted } from 'vue'
import { appReleaseService } from '../../services'
import type { AppRelease, AppReleasePlatform } from '../../services'
import { formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

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

function showUploadHint() {
  uni.showModal({
    title: 'APK 上传',
    content:
      '为避免移动端处理 50MB+ 大文件，APK 上传请在 PC 后台「系统设置 · APP 发布」中进行：上传后即刻同步到本列表。',
    showCancel: false,
    confirmText: '我知道了',
  })
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

    <view class="fab" @click="showUploadHint">
      <Icon name="plus" :size="36" color="#fff" />
      <text>上传 APK</text>
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
  &.active { color: var(--brand-primary); font-weight: 700; }
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
  background: linear-gradient(135deg, #FF4D2D, #FF9C6E);
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
  .latest-platform { font-size: 22rpx; opacity: 0.9; }
}
.latest-ver {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  .ver { font-size: 56rpx; font-weight: 800; font-family: var(--font-family-base); line-height: 1; }
  .build { font-size: 22rpx; opacity: 0.85; font-family: var(--font-family-base); }
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
  .meta-item { display: flex; align-items: center; gap: 4rpx; }
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
  .section-title { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
  .section-count { font-size: 22rpx; color: var(--text-tertiary); }
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
  color: #FF3B30;
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
    color: #FF3B30;
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
  background: linear-gradient(135deg, #FF7A4E, #FF4D2D);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 28rpx rgba(255, 77, 45, 0.4);
  z-index: 80;
  &:active { transform: scale(0.97); }
}
</style>
