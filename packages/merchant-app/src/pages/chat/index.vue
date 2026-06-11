<script setup lang="ts">
/**
 * MA-19 · 在线客服（手机端 · 还原原型图）
 *
 * 顶栏：‹ 在线客服 + 客户名 · 在线 + ···
 * 主体：消息流（用户气泡左、商家气泡右）+ 时间分隔 + 快捷回复浮卡
 * 底部：＋ 工具栏 + 输入框 + 表情/发送
 *
 * 左侧"会话列表"通过顶栏 ··· 弹底切换
 *
 * 实时通信：
 *  - 接入 ChatGateway WebSocket（与用户端协议一致，见 useChatSocket）
 *  - 进页 → connect + onMessage + 默认 join 当前会话
 *  - 切会话 → leave 旧、join 新
 *  - 发消息 → 优先 socket.emit；socket 未连时回退到 HTTP（chatService.send）
 *  - 离页 → 取消监听 + leave 当前会话（不 disconnect，单例 socket 与订单通知流共享）
 */
import { ref, computed, nextTick, onMounted } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { chatService } from '../../services/store'
import type { ChatSessionItem, ChatMessageItem, QuickReplyItem } from '../../services/store'
import { formatRelative } from '@jiujiu/shared/utils'
import { BASE_URL } from '../../utils/request'
import { useUserStore } from '../../store'
import { useChatSocket } from '../../composables/useChatSocket'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const userStore = useUserStore()

// 单例 socket：与 useMerchantNotifyStream 共享同一连接
const sock = useChatSocket(userStore.accessToken || '', 'merchant')

const sessions = ref<ChatSessionItem[]>([])
const messages = ref<ChatMessageItem[]>([])
const quickReplies = ref<QuickReplyItem[]>([])
const currentSessionId = ref('')
const inputText = ref('')
const scrollIntoView = ref('')
const showSwitcher = ref(false)
const showQuick = ref(false)
const showActions = ref(false)

const current = computed(() => sessions.value.find((s) => s.id === currentSessionId.value))
const headerSub = computed(() => {
  if (!current.value) return ''
  return current.value.online ? '在线' : '离线'
})

async function loadSessions() {
  const data = await chatService.sessions()
  sessions.value = data
  if (!currentSessionId.value && data[0]) {
    await pickSession(data[0])
  }
}
async function loadQuick() {
  quickReplies.value = await chatService.quickReplies()
}

async function pickSession(s: ChatSessionItem) {
  // 切会话前先离开旧 room（避免继续收旧会话推送）
  if (currentSessionId.value && currentSessionId.value !== s.id) {
    try {
      sock.leave(currentSessionId.value)
    } catch {
      /* ignore */
    }
  }
  currentSessionId.value = s.id
  s.unreadCount = 0
  showSwitcher.value = false
  try {
    sock.join(s.id)
  } catch {
    /* ignore */
  }
  try {
    sock.markRead(s.id)
  } catch {
    /* ignore */
  }
  const data = await chatService.messages(s.id)
  messages.value = data
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  const last = messages.value[messages.value.length - 1]
  if (last) scrollIntoView.value = `msg-${last.id}`
}

/** 给消息按 10 分钟间隔插入时间分隔 */
const groupedMessages = computed(() => {
  const out: ({ kind: 'time'; ts: string; id: string } | { kind: 'msg'; m: ChatMessageItem })[] = []
  let lastTs = 0
  messages.value.forEach((m, idx) => {
    const t = new Date(m.createdAt).getTime()
    if (idx === 0 || t - lastTs > 600 * 1000) {
      const d = new Date(m.createdAt)
      out.push({
        kind: 'time',
        ts: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        id: `t-${m.id}`,
      })
    }
    out.push({ kind: 'msg', m })
    lastTs = t
  })
  return out
})

async function send() {
  if (!inputText.value.trim() || !currentSessionId.value) return
  const text = inputText.value.trim()
  inputText.value = ''
  showQuick.value = false
  showActions.value = false
  const tmpId = 'tmp-' + Date.now()
  const newMsg: ChatMessageItem = {
    id: tmpId,
    sessionId: currentSessionId.value,
    sender: 'merchant',
    type: 'text',
    content: text,
    createdAt: new Date().toISOString(),
    read: true,
  }
  messages.value = [...messages.value, newMsg]
  if (current.value)
    current.value.lastMessage = {
      content: text,
      type: 'text',
      sender: 'merchant',
      createdAt: newMsg.createdAt,
    }
  await nextTick()
  scrollToBottom()
  try {
    if (sock.connected.value) {
      // WS 已连通 → emit；服务端持久化后会以 message 事件回推（带真实 id）
      sock.send(currentSessionId.value, text, 'text')
    } else {
      // 退化：socket 暂时不可用，回退 HTTP
      await chatService.send(currentSessionId.value, { type: 'text', content: text })
    }
  } catch {
    // 失败已在 request 层 toast；保留乐观消息让用户重发
  }
}

function applyQuick(q: QuickReplyItem) {
  inputText.value = q.content
  showQuick.value = false
}

/**
 * 发图：选图 → 上传到 /api/v1/files/upload 拿到 URL → 调 chatService.send(type:'image', content:url)
 *
 * 失败时：toast + 回滚乐观消息
 */
async function sendImage() {
  showActions.value = false
  if (!currentSessionId.value) {
    uni.showToast({ title: '请先选择会话', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const path = (res as { tempFilePaths: string[] }).tempFilePaths[0]
      if (!path) return

      const tmpId = 'tmp-' + Date.now()
      const optimistic: ChatMessageItem = {
        id: tmpId,
        sessionId: currentSessionId.value,
        sender: 'merchant',
        type: 'image',
        content: path,
        createdAt: new Date().toISOString(),
        read: true,
      }
      messages.value = [...messages.value, optimistic]
      await nextTick()
      scrollToBottom()

      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const uploadRes = await new Promise<{ url: string }>((resolve, reject) => {
          uni.uploadFile({
            url: BASE_URL + '/api/v1/files/upload',
            filePath: path,
            name: 'file',
            formData: { bizType: 'chat' },
            header: userStore.accessToken
              ? { Authorization: `Bearer ${userStore.accessToken}` }
              : {},
            success: (r: any) => {
              try {
                const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
                if (data?.code === 0 && data?.data?.url) resolve({ url: data.data.url })
                else reject(new Error(data?.message || '上传失败'))
              } catch (e: any) {
                reject(e)
              }
            },
            fail: (err: any) => reject(err),
          })
        })

        const sent = await chatService.send(currentSessionId.value, {
          type: 'image',
          content: uploadRes.url,
        })

        const idx = messages.value.findIndex((m) => m.id === tmpId)
        if (idx >= 0) {
          messages.value.splice(idx, 1, { ...sent, type: 'image', content: uploadRes.url })
        }
        if (current.value)
          current.value.lastMessage = {
            content: '[图片]',
            type: 'image',
            sender: 'merchant',
            createdAt: sent.createdAt,
          }
        uni.hideLoading()
      } catch (e: any) {
        uni.hideLoading()
        const idx = messages.value.findIndex((m) => m.id === tmpId)
        if (idx >= 0) messages.value.splice(idx, 1)
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
  })
}

function previewImg(url: string) {
  uni.previewImage({ urls: [url], current: url })
}

/**
 * 监听 WS message 推送：
 *  - 网关协议为 `{ sessionId, message: ChatMessage }`（见 chat.gateway.ts:159-162）
 *  - 当前会话的对方消息 → 追加到消息流 + 滚到底
 *  - 其它会话的消息 → 更新会话列表的 lastMessage / unreadCount
 *  - 自己 echo 回来的消息 → 用 server id 替换 tmp 占位（按 sessionId+content 粗匹配）
 */
function handleIncomingMessage(payload: any) {
  if (!payload) return
  const sessionId: string | undefined = payload.sessionId ?? payload.message?.sessionId
  const msg: any = payload.message ?? payload
  if (!sessionId || !msg) return

  const target = sessions.value.find((s) => s.id === sessionId)
  if (target) {
    if (msg.content) {
      target.lastMessage = {
        content: msg.type === 'image' ? '[图片]' : String(msg.content),
        type: msg.type || 'text',
        sender: msg.sender === 'merchant' ? 'merchant' : 'user',
        createdAt: msg.createdAt || new Date().toISOString(),
      }
    }
    target.lastMessageAt = msg.createdAt || target.lastMessageAt
    if (sessionId !== currentSessionId.value) {
      target.unreadCount = (target.unreadCount || 0) + 1
    }
  }

  if (sessionId !== currentSessionId.value) return

  if (msg.sender === 'merchant') {
    const idx = [...messages.value]
      .reverse()
      .findIndex((m) => m.id?.toString().startsWith('tmp-') && m.content === msg.content)
    if (idx >= 0) {
      const realIdx = messages.value.length - 1 - idx
      messages.value.splice(realIdx, 1, { ...messages.value[realIdx], ...msg })
      return
    }
  }

  if (messages.value.some((m) => m.id === msg.id)) return

  messages.value = [...messages.value, msg]
  nextTick().then(() => scrollToBottom())
}

onMounted(async () => {
  loadSessions()
  loadQuick()
  if (userStore.accessToken) {
    try {
      await sock.connect()
      sock.onMessage(handleIncomingMessage)
    } catch (e) {
      console.warn('[chat] socket connect failed, falling back to HTTP:', e)
    }
  }
})

onUnload(() => {
  // 离页：取消监听 + 离开当前 room；不 disconnect（保留单例供订单推送复用）
  try {
    sock.offMessage(handleIncomingMessage)
  } catch {
    /* ignore */
  }
  if (currentSessionId.value) {
    try {
      sock.leave(currentSessionId.value)
    } catch {
      /* ignore */
    }
  }
})
</script>

<template>
  <view class="page">
    <NavBar
      :title="current ? current.userName : '在线客服'"
      :sub="headerSub"
      right-icon="more-h"
      @right="showSwitcher = true"
    />

    <scroll-view
      scroll-y
      class="chat-scroll"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
    >
      <view class="chat-list">
        <template v-for="item in groupedMessages">
          <view v-if="item.kind === 'time'" :key="item.id" class="time-divider">
            {{ item.ts }}
          </view>
          <view
            v-else
            :key="item.m.id"
            :id="`msg-${item.m.id}`"
            :class="['msg', `from-${item.m.sender}`]"
          >
            <view v-if="item.m.sender !== 'merchant'" class="avatar">
              {{ current?.userName.slice(-1) || '客' }}
            </view>
            <view class="bubble-wrap">
              <view :class="['bubble', `type-${item.m.type}`]">
                <text v-if="item.m.type === 'text'">{{ item.m.content }}</text>
                <image
                  v-else-if="item.m.type === 'image'"
                  :src="item.m.content"
                  class="bubble-img"
                  mode="widthFix"
                  @click="previewImg(item.m.content)"
                />
              </view>
            </view>
            <view v-if="item.m.sender === 'merchant'" class="avatar self">我</view>
          </view>
        </template>

        <!-- 快捷回复浮卡（在消息流末尾） -->
        <view v-if="showQuick" class="quick-card">
          <view class="quick-head">
            <Icon name="lightning" :size="28" color="var(--brand-primary)" />
            <text class="quick-title">快捷回复</text>
            <text class="quick-close" @click="showQuick = false">收起</text>
          </view>
          <view class="quick-list">
            <view v-for="q in quickReplies" :key="q.id" class="quick-item" @click="applyQuick(q)">
              <text class="ql">{{ q.label }}</text>
              <text class="qc">{{ q.content }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部输入栏 -->
    <view class="input-bar">
      <view
        class="ia-btn"
        @click="
          showActions = !showActions
          showQuick = false
        "
      >
        <Icon :name="showActions ? 'close' : 'plus'" :size="44" color="var(--text-secondary)" />
      </view>
      <view class="input-wrap">
        <input
          v-model="inputText"
          class="input"
          placeholder="输入消息…"
          confirm-type="send"
          @confirm="send"
          @focus="
            showActions = false
            showQuick = false
          "
        />
      </view>
      <view
        class="ia-btn"
        @click="
          showQuick = !showQuick
          showActions = false
        "
      >
        <Icon
          name="lightning"
          :size="40"
          :color="showQuick ? 'var(--brand-primary)' : 'var(--text-secondary)'"
        />
      </view>
      <view :class="['send-btn', { active: inputText.trim() }]" @click="send">发送</view>
    </view>

    <!-- 动作面板（弹起） -->
    <view v-if="showActions" class="actions-panel">
      <view class="ap-item" @click="sendImage">
        <view class="ap-icon"><Icon name="image-plus" :size="44" color="#fff" /></view>
        <text class="ap-label">图片</text>
      </view>
      <view
        class="ap-item"
        @click="
          uni.showToast({ title: '商品已发送', icon: 'success' })
          showActions = false
        "
      >
        <view class="ap-icon" style="background: #3b82f6"
          ><Icon name="biz-product" :size="44" color="#fff"
        /></view>
        <text class="ap-label">商品</text>
      </view>
      <view
        class="ap-item"
        @click="
          uni.showToast({ title: '订单已发送', icon: 'success' })
          showActions = false
        "
      >
        <view class="ap-icon" style="background: #10b981"
          ><Icon name="biz-order" :size="44" color="#fff"
        /></view>
        <text class="ap-label">订单</text>
      </view>
      <view
        class="ap-item"
        @click="
          uni.showToast({ title: '优惠券已发送', icon: 'success' })
          showActions = false
        "
      >
        <view class="ap-icon" style="background: #f59e0b"
          ><Icon name="tag" :size="44" color="#fff"
        /></view>
        <text class="ap-label">优惠券</text>
      </view>
    </view>

    <!-- 会话切换浮层 -->
    <view v-if="showSwitcher" class="switcher-mask" @click="showSwitcher = false">
      <view class="switcher" @click.stop>
        <view class="switcher-head">
          <text class="switcher-title">会话列表</text>
          <text class="switcher-close" @click="showSwitcher = false">关闭</text>
        </view>
        <scroll-view scroll-y class="switcher-scroll">
          <view
            v-for="s in sessions"
            :key="s.id"
            :class="['sw-item', { active: s.id === currentSessionId }]"
            @click="pickSession(s)"
          >
            <view class="sw-avatar-wrap">
              <view class="sw-avatar">{{ s.userName.slice(-1) }}</view>
              <view v-if="s.online" class="sw-online" />
            </view>
            <view class="sw-info">
              <view class="sw-row1">
                <text class="sw-name">{{ s.userName }}</text>
                <text class="sw-time">{{ formatRelative(s.lastMessageAt) }}</text>
              </view>
              <text class="sw-last">{{ s.lastMessage?.content || '暂无消息' }}</text>
            </view>
            <view v-if="s.unreadCount > 0" class="sw-badge">{{
              s.unreadCount > 9 ? '9+' : s.unreadCount
            }}</view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #ecedf1;
  display: flex;
  flex-direction: column;
}
.chat-scroll {
  flex: 1;
  overflow: hidden;
}
.chat-list {
  padding: 16rpx 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.time-divider {
  align-self: center;
  font-size: 20rpx;
  color: var(--text-tertiary);
  padding: 4rpx 12rpx;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 999rpx;
  margin-top: 8rpx;
}
.msg {
  display: flex;
  gap: 12rpx;
  align-items: flex-end;
  &.from-merchant {
    flex-direction: row-reverse;
    .bubble {
      background: var(--brand-primary);
      color: #fff;
      border-radius: 16rpx 16rpx 4rpx 16rpx;
    }
  }
  &.from-user .bubble {
    background: #fff;
    color: var(--text-primary);
    border-radius: 16rpx 16rpx 16rpx 4rpx;
  }
}
.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #b0bec5;
  color: #fff;
  text-align: center;
  line-height: 64rpx;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
  &.self {
    background: var(--brand-gradient);
  }
}
.bubble-wrap {
  max-width: 72%;
}
.bubble {
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  line-height: 1.5;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.04);
  word-break: break-all;
  &.type-image {
    padding: 0;
    background: transparent !important;
    box-shadow: none;
    overflow: hidden;
    border-radius: 12rpx !important;
  }
}
.bubble-img {
  width: 360rpx;
  display: block;
  border-radius: 12rpx;
}

.quick-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 16rpx 8rpx;
  margin-top: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  .quick-head {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding-bottom: 8rpx;
    border-bottom: 1rpx solid var(--border-light);
    .quick-title {
      flex: 1;
      font-size: 24rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .quick-close {
      font-size: 22rpx;
      color: var(--brand-primary);
    }
  }
  .quick-list {
    margin-top: 8rpx;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  .quick-item {
    display: flex;
    gap: 12rpx;
    padding: 12rpx 8rpx;
    border-bottom: 1rpx dashed var(--border-light);
    &:last-child {
      border-bottom: none;
    }
    &:active {
      background: var(--bg-page);
      border-radius: 8rpx;
    }
    .ql {
      flex-shrink: 0;
      padding: 2rpx 8rpx;
      background: var(--brand-primary-ghost);
      color: var(--brand-primary);
      border-radius: 4rpx;
      font-size: 20rpx;
      font-weight: 600;
      align-self: flex-start;
      margin-top: 2rpx;
    }
    .qc {
      flex: 1;
      font-size: 22rpx;
      color: var(--text-secondary);
      line-height: 1.4;
    }
  }
}

.input-bar {
  background: #fff;
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx calc(12rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid var(--border-light);
  gap: 12rpx;
  .ia-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.input-wrap {
  flex: 1;
  background: var(--bg-page);
  border-radius: 999rpx;
  padding: 0 24rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}
.input {
  flex: 1;
  height: 100%;
  font-size: 26rpx;
  color: var(--text-primary);
}
.send-btn {
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  font-size: 26rpx;
  font-weight: 700;
  &.active {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
.actions-panel {
  background: #fff;
  padding: 24rpx;
  border-top: 1rpx solid var(--border-light);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.ap-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  .ap-icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 24rpx;
    background: var(--brand-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ap-label {
    font-size: 22rpx;
    color: var(--text-secondary);
  }
}

.switcher-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.switcher {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  .switcher-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx;
    border-bottom: 1rpx solid var(--border-light);
    .switcher-title {
      font-size: 30rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .switcher-close {
      font-size: 26rpx;
      color: var(--brand-primary);
    }
  }
  .switcher-scroll {
    flex: 1;
    overflow-y: auto;
  }
}
.sw-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  position: relative;
  &.active {
    background: var(--brand-primary-ghost);
  }
}
.sw-avatar-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
.sw-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #b0bec5;
  color: #fff;
  text-align: center;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.sw-online {
  position: absolute;
  bottom: 2rpx;
  right: 2rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--status-success);
  border: 2rpx solid #fff;
}
.sw-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.sw-row1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  .sw-name {
    font-size: 28rpx;
    font-weight: 600;
    color: var(--text-primary);
  }
  .sw-time {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.sw-last {
  font-size: 22rpx;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sw-badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: var(--status-error);
  color: #fff;
  font-size: 20rpx;
  text-align: center;
  line-height: 32rpx;
  margin-left: 8rpx;
}
</style>
