<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onShow, onUnload } from '@dcloudio/uni-app'
import { chatService, type ChatSessionItem } from '../../services/store'
import { useUserStore } from '../../store'
import { useChatSocket } from '../../composables/useChatSocket'

type SessionTab = 'all' | 'unread'

const userStore = useUserStore()
const socket = useChatSocket(userStore.accessToken || '', 'merchant')
const tab = ref<SessionTab>('all')
const keyword = ref('')
const sessions = ref<ChatSessionItem[]>([])
const loading = ref(true)
const failed = ref(false)
let socketBound = false

const unreadTotal = computed(() =>
  sessions.value.reduce((sum, item) => sum + Math.max(0, item.unreadCount || 0), 0),
)

const visibleSessions = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return sessions.value.filter((item) => {
    if (tab.value === 'unread' && item.unreadCount <= 0) return false
    if (!query) return true
    return (
      item.userName.toLowerCase().includes(query) ||
      String(item.lastMessage?.content || '')
        .toLowerCase()
        .includes(query)
    )
  })
})

function preview(item: ChatSessionItem) {
  if (!item.lastMessage) return '暂无消息'
  if (item.lastMessage.type === 'image') return '[图片]'
  if (item.lastMessage.type === 'system') return item.lastMessage.content || '[系统消息]'
  return item.lastMessage.content || '[消息]'
}

function formatSessionTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()}`
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

async function load(showSkeleton = false) {
  if (showSkeleton) loading.value = true
  failed.value = false
  try {
    sessions.value = await chatService.sessions()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function openSession(item: ChatSessionItem) {
  uni.navigateTo({ url: `/pages/chat/index?sessionId=${encodeURIComponent(item.id)}` })
}

function handleRealtime(payload: any) {
  const sessionId = String(payload?.sessionId || payload?.message?.sessionId || '')
  const message = payload?.message
  if (!sessionId || !message) return
  const index = sessions.value.findIndex((item) => item.id === sessionId)
  if (index < 0) {
    load(false)
    return
  }
  const current = sessions.value[index]
  const updated: ChatSessionItem = {
    ...current,
    lastMessageAt: message.createdAt || new Date().toISOString(),
    lastMessage: {
      content: String(message.content || ''),
      type: String(message.type || 'text'),
      sender: message.sender === 'merchant' ? 'merchant' : 'user',
      createdAt: message.createdAt || new Date().toISOString(),
    },
    unreadCount:
      message.sender === 'user' ? Math.max(0, current.unreadCount || 0) + 1 : current.unreadCount,
  }
  sessions.value.splice(index, 1)
  sessions.value.unshift(updated)
}

async function bindSocket() {
  if (socketBound || !userStore.accessToken) return
  socketBound = true
  socket.on('chat:message', handleRealtime)
  try {
    await socket.connect()
  } catch {
    // 列表仍可通过下拉刷新使用，长连接失败不阻断页面。
  }
}

onLoad((options) => {
  tab.value = (options as { tab?: string })?.tab === 'unread' ? 'unread' : 'all'
})

onShow(() => {
  load(true)
  bindSocket()
})

onPullDownRefresh(() => load(false))

onUnload(() => {
  if (!socketBound) return
  socket.off('chat:message', handleRealtime)
  socketBound = false
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
    <wd-navbar title="客户消息"  @click-left="$jwNav.back()" left-arrow fixed placeholder safe-area-inset-top custom-class="jw-glass-navbar" />

    <view class="toolbar">
      <view class="tabs">
        <view :class="['tab', { active: tab === 'all' }]" @click="tab = 'all'">全部</view>
        <view :class="['tab', { active: tab === 'unread' }]" @click="tab = 'unread'">
          未读
          <text v-if="unreadTotal" class="tab-count">{{ unreadTotal > 99 ? '99+' : unreadTotal }}</text>
        </view>
      </view>
      <view class="search-box">
        <wd-icon :name="$jwIcon('search')" size="15px" color="#86909C"  />
        <wd-input no-border
          v-model="keyword"
          class="search-input"
          placeholder="搜索客户或最近消息"
          confirm-type="search"
         />
        <view v-if="keyword" class="search-clear" @click="keyword = ''">
          <wd-icon :name="$jwIcon('close')" size="12px" color="#86909C"  />
        </view>
      </view>
    </view>

    <view v-if="loading" class="session-list skeleton-list">
      <view v-for="n in 6" :key="n" class="session-row skeleton-row">
        <view class="skeleton avatar-skeleton" />
        <view class="skeleton-lines">
          <view class="skeleton name-skeleton" />
          <view class="skeleton text-skeleton" />
        </view>
      </view>
    </view>

    <view v-else-if="failed" class="state-wrap">
      <wd-status-tip  image="content" :tip="['消息加载失败', '请检查网络后重试'].filter(Boolean).join(' · ')" />
      <view class="retry" @click="load(true)">重新加载</view>
    </view>

    <view v-else-if="visibleSessions.length" class="session-list">
      <view
        v-for="item in visibleSessions"
        :key="item.id"
        class="session-row"
        @click="openSession(item)"
      >
        <view class="avatar-wrap">
          <image v-if="item.userAvatar" :src="item.userAvatar" class="avatar-img" mode="aspectFill" />
          <view v-else class="avatar-fallback">{{ item.userName.slice(0, 1) || '客' }}</view>
          <view :class="['presence', { online: item.online }]" />
        </view>
        <view class="session-main">
          <view class="session-head">
            <view class="name-line">
              <text class="user-name">{{ item.userName || '未命名客户' }}</text>
              <text v-if="item.status === 'closed'" class="closed-tag">已关闭</text>
            </view>
            <text class="session-time">{{ formatSessionTime(item.lastMessageAt) }}</text>
          </view>
          <view class="session-foot">
            <text class="last-message">{{ preview(item) }}</text>
            <text v-if="item.unreadCount > 0" class="unread-badge">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
          <text class="online-label">{{ item.online ? '在线' : '离线' }}</text>
        </view>
      </view>
    </view>

    <view v-else class="state-wrap">
      <wd-status-tip
       image="content" :tip="[keyword ? '没有找到相关会话' : tab === 'unread' ? '没有未读消息' : '暂无客户消息', keyword ? '换个关键词试试' : '客户发来咨询后会显示在这里'].filter(Boolean).join(' · ')" />
    </view>
  </view>

  </wd-config-provider>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-page); }
.toolbar { position: sticky; top: 0; z-index: 10; padding: 0 24rpx 20rpx; background: var(--bg-card); border-bottom: 1rpx solid #f0f1f3; }
.tabs { height: 76rpx; display: flex; align-items: center; gap: 48rpx; }
.tab { position: relative; height: 76rpx; line-height: 76rpx; color: #646a73; font-size: 28rpx; }
.tab.active { color: #1f2329; font-weight: 600; }
.tab.active::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 36rpx; height: 5rpx; border-radius: 5rpx; background: #ff4d2d; transform: translateX(-50%); }
.tab-count { margin-left: 6rpx; font-size: 20rpx; color: #ff4d2d; }
.search-box { height: 68rpx; padding: 0 20rpx; display: flex; align-items: center; gap: 12rpx; background: var(--bg-page); border-radius: 12rpx; }
.search-input { flex: 1; height: 68rpx; font-size: 26rpx; color: #1f2329; }
.search-clear { padding: 10rpx; }
.session-list { margin-top: 16rpx; background: var(--bg-card); }
.session-row { display: flex; gap: 20rpx; padding: 28rpx 24rpx 24rpx; min-height: 116rpx; }
.session-row + .session-row .session-main { border-top: 1rpx solid #f0f1f3; }
.avatar-wrap { position: relative; width: 92rpx; height: 92rpx; flex: 0 0 92rpx; }
.avatar-img, .avatar-fallback { width: 92rpx; height: 92rpx; border-radius: 16rpx; }
.avatar-fallback { display: flex; align-items: center; justify-content: center; background: #e8edf2; color: #5f6b77; font-size: 32rpx; font-weight: 600; }
.presence { position: absolute; right: -4rpx; bottom: -4rpx; width: 20rpx; height: 20rpx; border: 4rpx solid #fff; border-radius: 50%; background: #c9cdd4; }
.presence.online { background: #00b578; }
.session-main { position: relative; flex: 1; min-width: 0; padding-top: 2rpx; }
.session-head, .session-foot, .name-line { display: flex; align-items: center; }
.session-head { justify-content: space-between; gap: 16rpx; }
.name-line { min-width: 0; gap: 10rpx; }
.user-name { max-width: 330rpx; color: #1f2329; font-size: 29rpx; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.closed-tag { flex-shrink: 0; padding: 2rpx 8rpx; border-radius: 5rpx; background: #f2f3f5; color: var(--text-tertiary); font-size: 19rpx; }
.session-time { color: #a2a7b0; font-size: 21rpx; flex-shrink: 0; }
.session-foot { margin-top: 14rpx; justify-content: space-between; gap: 16rpx; }
.last-message { flex: 1; color: var(--text-tertiary); font-size: 25rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unread-badge { min-width: 32rpx; height: 32rpx; padding: 0 7rpx; border-radius: 18rpx; background: #ff4d2d; color: #fff; font-size: 19rpx; line-height: 32rpx; text-align: center; box-sizing: border-box; }
.online-label { position: absolute; left: 0; top: 77rpx; color: #a2a7b0; font-size: 19rpx; display: none; }
.state-wrap { padding-top: 80rpx; text-align: center; }
.retry { display: inline-flex; align-items: center; justify-content: center; min-width: 176rpx; height: 68rpx; border: 1rpx solid #ff4d2d; border-radius: 34rpx; color: #ff4d2d; font-size: 25rpx; }
.skeleton-row { align-items: center; }
.skeleton { background: linear-gradient(90deg, #f1f2f4 25%, #f8f8f9 37%, #f1f2f4 63%); background-size: 400% 100%; animation: shimmer 1.3s ease infinite; }
.avatar-skeleton { width: 92rpx; height: 92rpx; border-radius: 16rpx; flex-shrink: 0; }
.skeleton-lines { flex: 1; }
.name-skeleton { width: 34%; height: 28rpx; border-radius: 6rpx; }
.text-skeleton { width: 72%; height: 24rpx; margin-top: 20rpx; border-radius: 6rpx; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
</style>
