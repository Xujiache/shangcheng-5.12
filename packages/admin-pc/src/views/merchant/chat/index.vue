<!-- 商家 PC · 在线客服（S3.5-T7）-->
<template>
  <div class="mp-chat">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">在线客服</h2>
        <p class="mt-1 text-sm text-g-500">
          {{ sessions.length }} 个会话 · 待回复 <b class="text-primary">{{ totalUnread }}</b>
        </p>
      </div>
    </div>

    <div class="mp-chat__layout">
      <!-- 左：会话列表 -->
      <ElCard shadow="never" class="mp-chat__sessions">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">会话</span>
            <ElInput
              v-model="keyword"
              placeholder="搜索"
              size="small"
              style="width: 130px"
              :prefix-icon="Search"
            />
          </div>
        </template>
        <div class="mp-sessions">
          <div
            v-for="s in filteredSessions"
            :key="s.id"
            class="mp-sess"
            :class="{ active: current?.id === s.id }"
            @click="selectSession(s)"
          >
            <ElBadge :value="s.unread" :hidden="s.unread === 0" :max="99">
              <ElAvatar :src="s.customerAvatar" :size="40" />
            </ElBadge>
            <div class="flex-1 min-w-0">
              <div class="mp-sess__head">
                <span class="font-medium truncate">{{ s.customerName }}</span>
                <span v-if="s.online" class="mp-sess__dot" />
              </div>
              <div class="mp-sess__last text-xs text-g-500 line-clamp-1">{{ s.lastMessage }}</div>
            </div>
            <span class="mp-sess__time">{{ formatTime(s.lastTime) }}</span>
          </div>
        </div>
      </ElCard>

      <!-- 中：消息流 -->
      <ElCard shadow="never" class="mp-chat__main">
        <template v-if="current" #header>
          <div class="flex items-center gap-3">
            <ElAvatar :src="current.customerAvatar" :size="36" />
            <div>
              <div class="font-semibold">{{ current.customerName }}</div>
              <div class="text-xs text-g-500">
                {{ current.online ? '在线' : '离线' }}
                <span v-for="t in current.tags" :key="t" class="ml-2">
                  <ElTag size="small" type="info" effect="plain">{{ t }}</ElTag>
                </span>
              </div>
            </div>
          </div>
        </template>
        <div v-if="current" class="mp-msg-area" ref="msgAreaRef">
          <div
            v-for="m in messages"
            :key="m.id"
            class="mp-msg"
            :class="{ self: m.from === 'merchant' }"
          >
            <ElAvatar v-if="m.from === 'customer'" :src="current.customerAvatar" :size="32" />
            <div class="mp-msg__bubble">{{ m.text }}</div>
          </div>
        </div>
        <div v-if="current" class="mp-input">
          <div class="mp-quick">
            <ElTag
              v-for="q in quickReplies"
              :key="q"
              effect="plain"
              size="small"
              class="cursor-pointer"
              @click="text = q"
            >
              {{ q }}
            </ElTag>
          </div>
          <div class="mp-input__row">
            <ElInput
              v-model="text"
              type="textarea"
              :rows="3"
              placeholder="输入消息后回车发送"
              @keydown.enter.prevent="send"
              resize="none"
            />
            <ElButton type="primary" :disabled="!text.trim()" @click="send">发送</ElButton>
          </div>
        </div>
        <ElEmpty v-else description="选择左侧会话开始对话" />
      </ElCard>

      <!-- 右：客户档案 -->
      <ElCard shadow="never" class="mp-chat__profile">
        <template #header>
          <span class="font-semibold">客户档案</span>
        </template>
        <div v-if="current" class="mp-profile">
          <div class="mp-profile__hero">
            <ElAvatar :src="current.customerAvatar" :size="56" />
            <div>
              <div class="font-semibold">{{ current.customerName }}</div>
              <div class="text-xs text-g-500 mt-1">{{ current.customerId }}</div>
            </div>
          </div>
          <ElDivider />
          <div class="mp-profile__stat">
            <div>
              <div class="text-lg font-semibold">{{ current.totalOrders }}</div>
              <div class="text-xs text-g-500">订单</div>
            </div>
            <div>
              <div class="text-lg font-semibold text-primary"
                >¥{{ current.totalSpent.toLocaleString() }}</div
              >
              <div class="text-xs text-g-500">累计消费</div>
            </div>
          </div>
          <ElDivider />
          <h4 class="m-0 mb-2 text-sm text-g-700">客户标签</h4>
          <div class="flex flex-wrap gap-1">
            <ElTag v-for="t in current.tags" :key="t" effect="plain" size="small">{{ t }}</ElTag>
            <!-- TODO: 等后端 chat 标签管理接口上线后接入；当前禁用避免误导 -->
            <ElTooltip content="标签管理开发中" placement="top">
              <ElTag type="info" effect="plain" size="small" class="tag-disabled"> + 添加 </ElTag>
            </ElTooltip>
          </div>
        </div>
        <ElEmpty v-else description="选择会话查看客户档案" :image-size="60" />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchChatSessions,
    fetchChatMessages,
    sendChatMessage,
    type ChatSession,
    type ChatMessage
  } from '@/api/merchant-business'
  import { formatRelative } from '@jiujiu/shared/utils'
  import { Search } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantChat' })

  const sessions = ref<ChatSession[]>([])
  const current = ref<ChatSession>()
  const messages = ref<ChatMessage[]>([])
  const text = ref('')
  const keyword = ref('')
  const msgAreaRef = ref<HTMLElement>()

  const quickReplies = [
    '您好，请问需要什么帮助？',
    '稍等，我帮您查一下',
    '可以发图给我看看',
    '已为您下单优惠券',
    '抱歉，让您久等了'
  ]

  const totalUnread = computed(() => sessions.value.reduce((a, s) => a + s.unread, 0))

  const filteredSessions = computed(() => {
    if (!keyword.value) return sessions.value
    const kw = keyword.value.toLowerCase()
    return sessions.value.filter((s) => s.customerName.includes(kw))
  })

  function formatTime(t: string) {
    return formatRelative(t)
  }

  async function selectSession(s: ChatSession) {
    current.value = s
    s.unread = 0
    messages.value = await fetchChatMessages(s.id)
    await nextTick()
    scrollToBottom()
  }

  async function send() {
    if (!text.value.trim() || !current.value) return
    const msg = await sendChatMessage(current.value.id, text.value.trim())
    messages.value.push(msg)
    text.value = ''
    await nextTick()
    scrollToBottom()
  }

  function scrollToBottom() {
    if (msgAreaRef.value) {
      msgAreaRef.value.scrollTop = msgAreaRef.value.scrollHeight
    }
  }

  onMounted(async () => {
    sessions.value = await fetchChatSessions()
    if (sessions.value.length) await selectSession(sessions.value[0])
  })
</script>

<style scoped lang="scss">
  .mp-chat {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: calc(100vh - 100px);
    padding: 16px;
  }

  .mp-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-chat__layout {
    display: grid;
    flex: 1;
    grid-template-columns: 320px 1fr 280px;
    gap: 14px;
    min-height: 0;

    @media (width <= 1100px) {
      grid-template-columns: 280px 1fr;

      .mp-chat__profile {
        display: none;
      }
    }
  }

  .mp-chat__sessions,
  .mp-chat__main,
  .mp-chat__profile {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-radius: 12px;

    :deep(.el-card__body) {
      flex: 1;
      padding: 0;
      overflow: hidden;
    }
  }

  /* 会话列表 */
  .mp-sessions {
    height: 100%;
    overflow-y: auto;
  }

  .mp-sess {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    cursor: pointer;
    border-bottom: 1px solid var(--art-border-color, #f3f4f6);
    transition: all 0.15s;

    &:hover {
      background: var(--art-bg-color, #fafbfc);
    }

    &.active {
      background: rgb(255 77 45 / 6%);
    }
  }

  .mp-sess__head {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 14px;
  }

  .mp-sess__dot {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
  }

  .mp-sess__last {
    font-size: 12px;
  }

  .mp-sess__time {
    align-self: flex-start;
    padding-top: 2px;
    font-size: 11px;
    color: var(--art-gray-400, #9ca3af);
  }

  /* 消息区 */
  .mp-msg-area {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    overflow-y: auto;
    background: #fafbfc;
  }

  .mp-msg {
    display: flex;
    gap: 8px;
    max-width: 70%;

    &.self {
      flex-direction: row-reverse;
      align-self: flex-end;

      .mp-msg__bubble {
        color: #fff;
        background: var(--el-color-primary, #ff4d2d);
      }
    }
  }

  .mp-msg__bubble {
    padding: 10px 14px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
    background: #fff;
    border: 1px solid var(--art-border-color, #e5e7eb);
    border-radius: 12px;
  }

  /* 输入区 */
  .mp-input {
    padding: 12px 14px;
    background: #fff;
    border-top: 1px solid var(--art-border-color, #e5e7eb);
  }

  .mp-quick {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .mp-input__row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  /* 客户档案 */
  .mp-profile {
    padding: 16px;
  }

  .mp-profile__hero {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .mp-profile__stat {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    text-align: center;
  }

  .tag-disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
</style>
