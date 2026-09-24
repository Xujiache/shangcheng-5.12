<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref } from 'vue'
import type { ChatUiMessage } from './types'

type ImageLayout = 'landscape' | 'portrait' | 'square'
interface ImageDisplayMeta {
  layout: ImageLayout
  loaded: boolean
}
type GroupedItem =
  | { kind: 'time'; id: string; label: string }
  | { kind: 'message'; id: string; message: ChatUiMessage }

const props = withDefaults(
  defineProps<{
    messages: ChatUiMessage[]
    loadingOlder?: boolean
    hasMore?: boolean
    userName?: string
    userAvatar?: string
    shopName?: string
    shopAvatar?: string
  }>(),
  {
    loadingOlder: false,
    hasMore: false,
    userName: '客户',
    userAvatar: '',
    shopName: '商家客服',
    shopAvatar: '',
  },
)

const emit = defineEmits<{
  (event: 'load-older'): void
  (event: 'retry', message: ChatUiMessage): void
  (event: 'dismiss-composer'): void
  (event: 'near-bottom-change', value: boolean): void
}>()

const instance = getCurrentInstance()
const scrollIntoView = ref('')
const scrollWithAnimation = ref(true)
const viewportHeight = ref(0)
const nearBottom = ref(true)
const imageErrors = ref<Record<string, boolean>>({})
const imageDisplay = ref<Record<string, ImageDisplayMeta>>({})

const groupedMessages = computed<GroupedItem[]>(() => {
  const result: GroupedItem[] = []
  let previousTime = 0
  props.messages.forEach((message, index) => {
    const timestamp = new Date(message.createdAt).getTime()
    if (index === 0 || !previousTime || timestamp - previousTime >= 10 * 60 * 1000) {
      result.push({
        kind: 'time',
        id: `time-${message.id}`,
        label: formatMessageTime(message.createdAt),
      })
    }
    result.push({ kind: 'message', id: message.id, message })
    previousTime = timestamp
  })
  return result
})

const lastMerchantId = computed(() => {
  for (let index = props.messages.length - 1; index >= 0; index -= 1) {
    if (props.messages[index].sender === 'merchant') return props.messages[index].id
  }
  return ''
})

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  if (date.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  if (date.getFullYear() === now.getFullYear())
    return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

function messageText(message: ChatUiMessage) {
  return message.content || '[暂不支持的消息]'
}

function imageSource(message: ChatUiMessage) {
  return message._localPath || message.content
}

function imageLayout(messageId: string): ImageLayout {
  return imageDisplay.value[messageId]?.layout || 'square'
}

function classifyImage(width: number, height: number): ImageLayout {
  if (!width || !height) return 'square'
  const ratio = width / height
  if (ratio >= 1.2) return 'landscape'
  if (ratio <= 0.8) return 'portrait'
  return 'square'
}

function handleImageLoad(event: any, message: ChatUiMessage) {
  const width = Number(event?.detail?.width || event?.detail?.naturalWidth || 0)
  const height = Number(event?.detail?.height || event?.detail?.naturalHeight || 0)
  const shouldStayAtBottom = nearBottom.value || Boolean(message._status)
  imageDisplay.value = {
    ...imageDisplay.value,
    [message.id]: { layout: classifyImage(width, height), loaded: true },
  }
  if (shouldStayAtBottom) nextTick(() => scrollToBottom(false))
}

function handleImageError(messageId: string) {
  imageErrors.value = { ...imageErrors.value, [messageId]: true }
  imageDisplay.value = {
    ...imageDisplay.value,
    [messageId]: { layout: imageLayout(messageId), loaded: true },
  }
}

function previewImage(message: ChatUiMessage) {
  const url = imageSource(message)
  if (url) uni.previewImage({ urls: [url], current: url })
}

function measureViewport() {
  nextTick(() => {
    try {
      const query = uni.createSelectorQuery().in(instance as any)
      query
        .select('.chat-message-list')
        .boundingClientRect((rect: any) => {
          viewportHeight.value = Number(rect?.height || 0)
        })
        .exec()
    } catch {
      viewportHeight.value = 0
    }
  })
}

function handleScroll(event: any) {
  const scrollTop = Number(event?.detail?.scrollTop || 0)
  const scrollHeight = Number(event?.detail?.scrollHeight || 0)
  if (!scrollHeight || !viewportHeight.value) return
  const nextValue = scrollHeight - scrollTop - viewportHeight.value <= 120
  if (nextValue !== nearBottom.value) {
    nearBottom.value = nextValue
    emit('near-bottom-change', nextValue)
  }
}

function scrollToMessage(messageId: string, animated = true) {
  if (!messageId) return
  scrollWithAnimation.value = animated
  scrollIntoView.value = ''
  nextTick(() => {
    scrollIntoView.value = `msg-${messageId}`
    if (!animated)
      setTimeout(() => {
        scrollWithAnimation.value = true
      }, 80)
  })
}

function scrollToBottom(animated = true) {
  const last = props.messages[props.messages.length - 1]
  if (!last) return
  nearBottom.value = true
  emit('near-bottom-change', true)
  scrollToMessage(last.id, animated)
}

function isNearBottom() {
  return nearBottom.value
}

onMounted(measureViewport)

defineExpose({ scrollToBottom, scrollToMessage, isNearBottom, measureViewport })
</script>

<template>
  <scroll-view
    scroll-y
    class="chat-message-list"
    :scroll-into-view="scrollIntoView"
    :scroll-with-animation="scrollWithAnimation"
    upper-threshold="80"
    @scrolltoupper="emit('load-older')"
    @scroll="handleScroll"
    @click="emit('dismiss-composer')"
  >
    <view class="message-list-inner">
      <view v-if="loadingOlder" class="history-tip">正在加载更早消息…</view>
      <view v-else-if="hasMore" class="history-tip">上滑加载更早消息</view>
      <view v-else-if="messages.length" class="history-tip">没有更早消息了</view>

      <template v-for="item in groupedMessages" :key="item.id">
        <view v-if="item.kind === 'time'" class="time-divider">{{ item.label }}</view>

        <view
          v-else-if="item.message.sender === 'system' || item.message.type === 'system'"
          :id="`msg-${item.message.id}`"
          class="system-message"
          >{{ messageText(item.message) }}</view
        >

        <view
          v-else
          :id="`msg-${item.message.id}`"
          :class="['message-row', item.message.sender === 'merchant' ? 'merchant' : 'customer']"
        >
          <view class="avatar-wrap">
            <image
              v-if="item.message.sender === 'merchant' ? shopAvatar : userAvatar"
              :src="item.message.sender === 'merchant' ? shopAvatar : userAvatar"
              class="avatar-img"
              mode="aspectFill"
            />
            <view v-else class="avatar-fallback">{{
              item.message.sender === 'merchant'
                ? shopName.slice(0, 1)
                : userName.slice(0, 1) || '客'
            }}</view>
          </view>

          <view class="bubble-column">
            <view
              v-if="item.message.type === 'image'"
              :class="['image-bubble', `image-${imageLayout(item.message.id)}`]"
              @click.stop="previewImage(item.message)"
            >
              <view v-if="!imageDisplay[item.message.id]?.loaded" class="image-skeleton" />
              <image
                v-if="!imageErrors[item.message.id]"
                :src="imageSource(item.message)"
                :class="['message-image', { loaded: imageDisplay[item.message.id]?.loaded }]"
                mode="aspectFill"
                @load="handleImageLoad($event, item.message)"
                @error="handleImageError(item.message.id)"
              />
              <view v-else class="image-failed">
                <wd-icon :name="$jwIcon('image-plus')" size="19px" color="#A2A7B0" />
                <text>图片加载失败</text>
              </view>
            </view>
            <view v-else class="text-bubble"
              ><text selectable>{{ messageText(item.message) }}</text></view
            >

            <view
              v-if="item.message.sender === 'merchant' && item.message.id === lastMerchantId"
              class="send-state"
            >
              <text v-if="item.message._status === 'sending'">发送中</text>
              <text
                v-else-if="item.message._status === 'failed'"
                class="send-failed"
                @click.stop="emit('retry', item.message)"
                >发送失败，点击重试</text
              >
              <text v-else>{{ item.message.read ? '已读' : '未读' }}</text>
            </view>
          </view>
        </view>
      </template>

      <view v-if="!messages.length" class="empty-chat">
        <wd-status-tip
          image="content"
          :tip="['还没有消息', '可以主动向客户发送问候'].filter(Boolean).join(' · ')"
        />
      </view>
    </view>
  </scroll-view>
</template>

<style lang="scss" scoped>
.chat-message-list {
  flex: 1;
  min-height: 0;
  background: #f1f3f5;
}
.message-list-inner {
  padding: 20rpx 24rpx 36rpx;
}
.history-tip {
  padding: 8rpx 0 18rpx;
  color: #a2a7b0;
  font-size: 20rpx;
  text-align: center;
}
.time-divider {
  width: fit-content;
  margin: 18rpx auto 24rpx;
  padding: 4rpx 13rpx;
  border-radius: 8rpx;
  color: #a2a7b0;
  background: rgba(255, 255, 255, 0.62);
  font-size: 20rpx;
}
.system-message {
  width: fit-content;
  max-width: 82%;
  margin: 18rpx auto 26rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.72);
  font-size: 21rpx;
  line-height: 1.5;
  text-align: center;
}
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.message-row.merchant {
  flex-direction: row-reverse;
}
.avatar-wrap {
  width: 70rpx;
  height: 70rpx;
  flex: 0 0 70rpx;
}
.avatar-img,
.avatar-fallback {
  width: 70rpx;
  height: 70rpx;
  border-radius: 12rpx;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #d9e1e7;
  color: #5f6b77;
  font-size: 25rpx;
  font-weight: 600;
}
.merchant .avatar-fallback {
  background: #fff0eb;
  color: #ff4d2d;
}
.bubble-column {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.merchant .bubble-column {
  align-items: flex-end;
}
.text-bubble {
  padding: 17rpx 21rpx;
  border-radius: 6rpx 18rpx 18rpx;
  background: var(--bg-card);
  color: #1f2329;
  font-size: 27rpx;
  line-height: 1.55;
  word-break: break-all;
}
.merchant .text-bubble {
  border-radius: 18rpx 6rpx 18rpx 18rpx;
  background: #ff5b3d;
  color: #fff;
}
.image-bubble {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
  border-radius: 14rpx;
  background: #e5e6eb;
}
.image-bubble.image-landscape {
  width: 300rpx;
  height: 200rpx;
}
.image-bubble.image-portrait {
  width: 210rpx;
  height: 300rpx;
}
.image-bubble.image-square {
  width: 260rpx;
  height: 260rpx;
}
.message-image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.16s ease;
}
.message-image.loaded {
  opacity: 1;
}
.image-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, #e7e9ec 20%, #f5f6f7 42%, #e7e9ec 64%);
  background-size: 220% 100%;
  animation: shimmer 1.25s ease-in-out infinite;
}
.image-failed {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: var(--text-tertiary);
  background: #eef0f2;
  font-size: 21rpx;
}
.send-state {
  margin-top: 8rpx;
  color: #a2a7b0;
  font-size: 19rpx;
}
.send-failed {
  color: #f53f3f;
}
.empty-chat {
  padding-top: 130rpx;
}
@keyframes shimmer {
  to {
    background-position-x: -220%;
  }
}
</style>
