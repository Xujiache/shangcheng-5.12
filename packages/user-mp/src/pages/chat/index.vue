<script setup lang="ts">
/**
 * UM · 在线客服
 *
 * 进入：商品详情页 / 我的页 → 点"客服" → /pages/chat/index?merchantId=xxx
 * 流程：ensureSession → loadMessages → connect WS → 双向收发
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { chatService, type ChatMessage } from '../../services/chat'
import { useChatSocket } from '../../composables/useChatSocket'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const userStore = useUserStore()

const sessionId = ref('')
const merchantId = ref('')
const merchantName = ref('客服')
const messages = ref<ChatMessage[]>([])
const input = ref('')
const sending = ref(false)
const otherTyping = ref(false)
const scrollTop = ref(0)
const scrollRefreshKey = ref(0)
let sock: ReturnType<typeof useChatSocket> | null = null

onLoad((opts: any) => {
  merchantId.value = (opts?.merchantId || '').toString()
})

onMounted(async () => {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  try {
    const s = await chatService.ensureSession(merchantId.value || undefined)
    sessionId.value = s.id
    merchantId.value = s.merchantId
    // 取后端的真实商家名（官方客服 / 自营时为空，兜底"客服"）
    if (s.merchantName) merchantName.value = s.merchantName

    // 拉一次历史
    const list = await chatService.messages(s.id)
    messages.value = list
    nextTick(scrollToBottom)

    // 已读回执
    chatService.markRead(s.id).catch(() => {})

    // 接 WS
    if (userStore.accessToken) {
      sock = useChatSocket(userStore.accessToken, 'user')
      await sock.connect()
      sock.join(s.id)
      sock.onMessage(({ message }: any) => {
        messages.value.push(message)
        nextTick(scrollToBottom)
        if (message.sender !== 'user') {
          chatService.markRead(s.id).catch(() => {})
          sock?.markRead(s.id)
        }
      })
      sock.onTyping((d) => {
        if (d.sessionId !== s.id) return
        if (d.fromRole !== 'user') otherTyping.value = d.on
      })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  }
})

onShow(() => {
  if (sessionId.value) chatService.markRead(sessionId.value).catch(() => {})
})

onUnmounted(() => {
  try {
    sock?.disconnect()
  } catch {}
})

async function onSend() {
  const content = input.value.trim()
  if (!content || sending.value) return
  sending.value = true
  try {
    if (sock?.connected.value) {
      // 走 WS：消息会通过 onMessage 回调追加到 messages
      sock.send(sessionId.value, content)
    } else {
      // 兜底 HTTP（WS 未连接成功时）
      const msg = await chatService.send(sessionId.value, content)
      messages.value.push(msg)
      nextTick(scrollToBottom)
    }
    input.value = ''
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function onInput(e: any) {
  const v = e.detail?.value ?? ''
  input.value = v
  // 用 WS 发"正在输入"
  if (sock?.connected.value) {
    sock.typing(sessionId.value, v.length > 0)
  }
}

function scrollToBottom() {
  // scroll-view 通过更新 key 滚到底部（不依赖 selector-query）
  scrollRefreshKey.value++
  scrollTop.value = 999999
}

const isMine = (m: ChatMessage) => m.sender === 'user'

const senderLabel = (m: ChatMessage) =>
  m.sender === 'merchant' ? merchantName.value : m.sender === 'system' ? '系统' : '我'

const fmtTime = (s: string) => {
  try {
    const d = new Date(s)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}
</script>

<template>
  <view class="page">
    <NavBar :title="merchantName" :show-back="true" />

    <scroll-view
      :key="scrollRefreshKey"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="false"
      class="scroll"
    >
      <view class="empty" v-if="!messages.length">
        <text>没有消息，发个招呼吧～</text>
      </view>
      <view v-for="m in messages" :key="m.id" class="row" :class="{ mine: isMine(m) }">
        <view class="avatar">{{ isMine(m) ? '我' : merchantName.slice(0, 1) }}</view>
        <view class="bubble">
          <view class="sender">{{ senderLabel(m) }} · {{ fmtTime(m.createdAt) }}</view>
          <view class="content">{{ m.content }}</view>
        </view>
      </view>

      <view v-if="otherTyping" class="typing">
        <text>{{ merchantName }} 正在输入…</text>
      </view>
      <view style="height: 40rpx" />
    </scroll-view>

    <view class="composer">
      <input
        :value="input"
        @input="onInput"
        @confirm="onSend"
        confirm-type="send"
        :hold-keyboard="true"
        placeholder="输入消息…"
        class="composer-input"
      />
      <view class="send" :class="{ disabled: !input.trim() }" @click="onSend">
        <Icon name="send" :size="32" color="#fff" />
        <text>发送</text>
      </view>
    </view>
    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page, #f7f8fa);
  display: flex;
  flex-direction: column;
}

.scroll {
  flex: 1;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.empty {
  text-align: center;
  padding: 200rpx 0;
  color: #909399;
  font-size: 24rpx;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 18rpx;

  &.mine {
    flex-direction: row-reverse;
    .bubble {
      background: linear-gradient(135deg, #ff4d2d, #ff7a45);
      color: #fff;

      .sender {
        color: rgba(255, 255, 255, 0.85);
      }
    }
  }
}

.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffb088, #ff7a45);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.bubble {
  background: #fff;
  border-radius: 16rpx;
  padding: 14rpx 18rpx;
  max-width: 70%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.04);
}

.sender {
  font-size: 18rpx;
  color: #909399;
  margin-bottom: 4rpx;
}

.content {
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-word;
}

.typing {
  font-size: 22rpx;
  color: #909399;
  padding: 8rpx 16rpx;
  font-style: italic;
}

.composer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #f0f2f5;
}

.composer-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  font-size: 28rpx;
}

.send {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 24rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  transition: opacity 0.18s;

  &.disabled {
    opacity: 0.5;
  }
  &:active {
    transform: scale(0.97);
  }
}

.safe-bottom {
  height: 40rpx;
  background: #fff;
}
</style>
