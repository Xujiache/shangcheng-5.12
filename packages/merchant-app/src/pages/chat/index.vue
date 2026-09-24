<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
import { nextTick, ref } from 'vue'
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app'
import ChatComposer from '../../components/chat/chat-composer.vue'
import ChatMessageList from '../../components/chat/chat-message-list.vue'
import type { ChatUiMessage } from '../../components/chat/types'
import {
  chatService,
  type ChatMessageItem,
  type ChatSessionDetail,
  type QuickReplyItem,
} from '../../services/store'
import { profileService } from '../../services/profile'
import { useUserStore } from '../../store'
import { useChatSocket } from '../../composables/useChatSocket'
import { BASE_URL } from '../../utils/request'

const userStore = useUserStore()
const socket = useChatSocket(userStore.accessToken || '', 'merchant')
const messageListRef = ref<any>(null)
const composerRef = ref<any>(null)
const sessionId = ref('')
const session = ref<ChatSessionDetail | null>(null)
const messages = ref<ChatUiMessage[]>([])
const quickReplies = ref<QuickReplyItem[]>([])
const inputText = ref('')
const shopName = ref('商家客服')
const shopAvatar = ref('')
const bottomInset = ref(0)
const loading = ref(true)
const failed = ref(false)
const loadingOlder = ref(false)
const hasMore = ref(false)
let socketBound = false

function readBottomInset() {
  try {
    const info = uni.getSystemInfoSync() as any
    const directInset = Number(info?.safeAreaInsets?.bottom || 0)
    const screenHeight = Number(info?.screenHeight || 0)
    const safeAreaBottom = Number(info?.safeArea?.bottom || 0)
    const derivedInset =
      screenHeight && safeAreaBottom ? Math.max(0, screenHeight - safeAreaBottom) : 0
    const isAndroid = String(info?.platform || '').toLowerCase() === 'android'
    bottomInset.value = Math.min(
      48,
      Math.max(0, directInset || derivedInset || (isAndroid ? 16 : 0)),
    )
  } catch {
    bottomInset.value = 0
  }
}

function dedupeAndSort(items: ChatUiMessage[]) {
  const byId = new Map<string, ChatUiMessage>()
  items.forEach((item) => byId.set(item.id, { ...(byId.get(item.id) || {}), ...item }))
  return [...byId.values()].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return timeDiff || a.id.localeCompare(b.id)
  })
}

function scrollToBottom(animated = true) {
  nextTick(() => messageListRef.value?.scrollToBottom(animated))
}

async function markCurrentRead() {
  if (!sessionId.value) return
  try {
    await chatService.markRead(sessionId.value)
    if (session.value) session.value.unreadCount = 0
    messages.value.forEach((item) => {
      if (item.sender === 'user') item.read = true
    })
  } catch {
    // 断网不清理会话；重新进入或收到消息时再次通过 HTTP 标记已读。
  }
}

async function loadInitial() {
  if (!sessionId.value) return
  loading.value = true
  failed.value = false
  try {
    const [sessionData, messageData, replyData, profile] = await Promise.all([
      chatService.session(sessionId.value),
      chatService.messages(sessionId.value, { pageSize: 30 }),
      chatService.quickReplies().catch(() => []),
      profileService.get().catch(() => null),
    ])
    session.value = sessionData
    messages.value = dedupeAndSort(messageData)
    quickReplies.value = replyData
    hasMore.value = messageData.length === 30
    if (profile) {
      shopName.value = profile.shopName || '商家客服'
      shopAvatar.value = profile.avatar || ''
    }
    await markCurrentRead()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
  if (!failed.value) {
    await nextTick()
    setTimeout(() => scrollToBottom(false), 30)
  }
}

async function loadOlder() {
  if (loadingOlder.value || !hasMore.value || !sessionId.value) return
  const first = messages.value.find((item) => !item.id.startsWith('tmp-'))
  if (!first) return
  loadingOlder.value = true
  const anchorId = first.id
  try {
    const older = await chatService.messages(sessionId.value, { cursor: first.id, pageSize: 30 })
    hasMore.value = older.length === 30
    messages.value = dedupeAndSort([...older, ...messages.value])
    await nextTick()
    messageListRef.value?.scrollToMessage(anchorId, false)
  } finally {
    loadingOlder.value = false
  }
}

function newOptimistic(type: string, content: string, localPath = ''): ChatUiMessage {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId: sessionId.value,
    sender: 'merchant',
    type,
    content,
    createdAt: new Date().toISOString(),
    read: false,
    _status: 'sending',
    _localPath: localPath || undefined,
  }
}

function settleOptimistic(tempId: string, sent: ChatMessageItem) {
  const tempIndex = messages.value.findIndex((item) => item.id === tempId)
  const serverIndex = messages.value.findIndex((item) => item.id === sent.id)
  if (serverIndex >= 0) {
    if (tempIndex >= 0 && tempIndex !== serverIndex) messages.value.splice(tempIndex, 1)
  } else if (tempIndex >= 0) {
    messages.value.splice(tempIndex, 1, sent)
  } else {
    messages.value.push(sent)
  }
  messages.value = dedupeAndSort(messages.value)
}

async function deliverText(message: ChatUiMessage) {
  message._status = 'sending'
  try {
    const sent = await chatService.send(sessionId.value, {
      type: message.type === 'quick' ? 'quick' : 'text',
      content: message.content,
    })
    settleOptimistic(message.id, sent)
  } catch {
    message._status = 'failed'
  }
}

async function sendText() {
  const content = inputText.value.trim()
  if (!content || !sessionId.value) return
  if (content.length > 1000) {
    appFeedback.showToast({ title: '消息不能超过1000字', icon: 'none' })
    return
  }
  const isQuick = quickReplies.value.some((item) => item.content === content)
  const message = newOptimistic(isQuick ? 'quick' : 'text', content)
  messages.value.push(message)
  inputText.value = ''
  await nextTick()
  scrollToBottom()
  await deliverText(message)
}

function uploadFile(path: string) {
  return new Promise<string>((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}/api/v1/files/upload`,
      filePath: path,
      name: 'file',
      formData: { bizType: 'chat' },
      header: userStore.accessToken ? { Authorization: `Bearer ${userStore.accessToken}` } : {},
      success: (response: any) => {
        try {
          const payload =
            typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          if (payload?.code === 0 && payload?.data?.url) resolve(String(payload.data.url))
          else reject(new Error(payload?.message || '图片上传失败'))
        } catch (error) {
          reject(error)
        }
      },
      fail: reject,
    })
  })
}

async function uploadAndSend(message: ChatUiMessage) {
  const path = message._localPath || message.content
  message._status = 'sending'
  try {
    const url = await uploadFile(path)
    const sent = await chatService.send(sessionId.value, { type: 'image', content: url })
    settleOptimistic(message.id, sent)
  } catch {
    message._status = 'failed'
  }
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (result) => {
      const path = (result as { tempFilePaths?: string[] }).tempFilePaths?.[0]
      if (!path) return
      const message = newOptimistic('image', path, path)
      messages.value.push(message)
      await nextTick()
      scrollToBottom()
      await uploadAndSend(message)
    },
  })
}

function retry(message: ChatUiMessage) {
  if (message._status !== 'failed') return
  if (message.type === 'image') uploadAndSend(message)
  else deliverText(message)
}

function dismissComposer() {
  composerRef.value?.dismiss()
}

function handleComposerLayout(mode: 'idle' | 'keyboard' | 'quick' | 'attachment') {
  if (mode !== 'idle') setTimeout(() => scrollToBottom(false), 30)
}

function handleIncoming(payload: any) {
  const incomingSessionId = String(payload?.sessionId || payload?.message?.sessionId || '')
  const message = (payload?.message || payload) as ChatUiMessage
  if (!message?.id || incomingSessionId !== sessionId.value) return
  if (!messages.value.some((item) => item.id === message.id)) {
    const shouldReveal = messageListRef.value?.isNearBottom?.() ?? true
    messages.value = dedupeAndSort([...messages.value, message])
    if (shouldReveal) scrollToBottom()
  }
  if (message.sender === 'user') markCurrentRead()
}

function handleRead(payload: any) {
  if (payload?.sessionId !== sessionId.value || payload?.byRole !== 'user') return
  messages.value.forEach((item) => {
    if (item.sender === 'merchant') item.read = true
  })
}

function handleAuthed() {
  if (sessionId.value) socket.join(sessionId.value)
}

async function bindSocket() {
  if (socketBound || !userStore.accessToken) return
  socketBound = true
  socket.onMessage(handleIncoming)
  socket.on('read', handleRead)
  socket.on('authed', handleAuthed)
  try {
    await socket.connect()
    socket.join(sessionId.value)
  } catch {
    // WebSocket 不可用时，HTTP 历史和发送仍然可用。
  }
}

onLoad(async (options) => {
  readBottomInset()
  const params = options as { sessionId?: string; focus?: string }
  if (!params?.sessionId) {
    const suffix = params?.focus === 'unread' ? '?tab=unread' : ''
    uni.redirectTo({ url: `/pages/chat/sessions${suffix}` })
    return
  }
  sessionId.value = params.sessionId
  await Promise.all([loadInitial(), bindSocket()])
})

onReady(() => {
  readBottomInset()
  messageListRef.value?.measureViewport?.()
})

onUnload(() => {
  if (!socketBound) return
  socket.offMessage(handleIncoming)
  socket.off('read', handleRead)
  socket.off('authed', handleAuthed)
  if (sessionId.value) socket.leave(sessionId.value)
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
    <view class="chat-page">
      <wd-navbar
        @click-left="$jwNav.back()"
        left-arrow
        fixed
        placeholder
        safe-area-inset-top
        custom-class="jw-glass-navbar"
      >
        <template #title
          ><view class="jw-navbar-title"
            ><text>{{ session?.userName || '在线客服' }}</text
            ><text class="jw-navbar-sub">{{
              session?.status === 'closed' ? '会话已关闭' : session?.online ? '在线' : '离线'
            }}</text></view
          ></template
        >
      </wd-navbar>

      <view v-if="loading" class="loading-page">
        <view class="loading-dot" />
        <text>正在加载消息</text>
      </view>

      <view v-else-if="failed" class="failed-page">
        <wd-status-tip
          image="content"
          :tip="['消息加载失败', '请检查网络后重试'].filter(Boolean).join(' · ')"
        />
        <view class="retry-button" @click="loadInitial">重新加载</view>
      </view>

      <template v-else>
        <ChatMessageList
          ref="messageListRef"
          :messages="messages"
          :loading-older="loadingOlder"
          :has-more="hasMore"
          :user-name="session?.userName || '客户'"
          :user-avatar="session?.userAvatar || ''"
          :shop-name="shopName"
          :shop-avatar="shopAvatar"
          @load-older="loadOlder"
          @retry="retry"
          @dismiss-composer="dismissComposer"
        />

        <ChatComposer
          ref="composerRef"
          v-model="inputText"
          :quick-replies="quickReplies"
          :bottom-inset="bottomInset"
          :disabled="session?.status === 'closed'"
          @send="sendText"
          @choose-image="chooseImage"
          @layout-change="handleComposerLayout"
        />
      </template>
    </view>
  </wd-config-provider>
</template>

<style lang="scss" scoped>
.chat-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f1f3f5;
}
.loading-page,
.failed-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 24rpx;
}
.loading-dot {
  width: 34rpx;
  height: 34rpx;
  margin-bottom: 18rpx;
  border: 4rpx solid #ffd5cc;
  border-top-color: #ff4d2d;
  border-radius: 50%;
  animation: rotate 0.8s linear infinite;
}
.retry-button {
  min-width: 176rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #ff4d2d;
  border-radius: 34rpx;
  color: #ff4d2d;
  font-size: 25rpx;
}
@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
