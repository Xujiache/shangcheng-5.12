<script setup lang="ts">
/**
 * PA · 工单管理
 *
 * 对接后端 PlatformController:
 *   GET  /api/v1/p/tickets?status=&priority=
 *   POST /api/v1/p/tickets/:id/handle  { reply, status }
 *
 * 后端用 SystemConfig key='ticket:<id>' 兜底,无需独立表迁移。
 *
 * 状态流转:
 *   open(待处理) → handling(处理中) → closed(已关闭)
 *
 * 关闭工单要求至少填一段回复,避免空工单堆积。
 */
import { ref, computed, onMounted } from 'vue'
import { ticketService } from '../../services'
import type { Ticket, TicketStatus, TicketPriority } from '../../services'
import { formatDateTime } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = TicketStatus | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '待处理' },
  { key: 'handling', label: '处理中' },
  { key: 'closed', label: '已关闭' },
]

const tab = ref<TabKey>('all')
const list = ref<Ticket[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20

const filtered = computed(() => list.value)

async function load() {
  loading.value = true
  try {
    const res = await ticketService.list({
      status: tab.value,
      page: page.value,
      pageSize,
    })
    list.value = res?.list || []
    total.value = res?.total ?? list.value.length
  } catch (e: any) {
    list.value = []
    total.value = 0
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(k: TabKey) {
  if (tab.value === k) return
  tab.value = k
  page.value = 1
  load()
}

// ========== 处理工单 ==========
const handleOpen = ref(false)
const handling = ref(false)
const current = ref<Ticket | null>(null)
const replyText = ref('')
const targetStatus = ref<TicketStatus>('handling')

function openHandle(t: Ticket) {
  current.value = t
  replyText.value = t.reply || ''
  // 默认下一步状态:open→handling, handling→closed, closed→closed (覆盖回复)
  if (t.status === 'open') targetStatus.value = 'handling'
  else if (t.status === 'handling') targetStatus.value = 'closed'
  else targetStatus.value = 'closed'
  handleOpen.value = true
}

function closeHandle() {
  if (handling.value) return
  handleOpen.value = false
  current.value = null
  replyText.value = ''
}

async function submitHandle() {
  if (!current.value) return
  if (targetStatus.value === 'closed' && !replyText.value.trim()) {
    uni.showToast({ title: '关闭前请填写回复', icon: 'none' })
    return
  }
  handling.value = true
  try {
    await ticketService.handle(current.value.id, {
      reply: replyText.value.trim(),
      status: targetStatus.value,
    })
    uni.showToast({ title: '已处理', icon: 'success' })
    handleOpen.value = false
    current.value = null
    replyText.value = ''
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '处理失败', icon: 'none' })
  } finally {
    handling.value = false
  }
}

function statusLabel(s: TicketStatus): string {
  return s === 'open' ? '待处理' : s === 'handling' ? '处理中' : '已关闭'
}
function priorityLabel(p: TicketPriority): string {
  return p === 'high' ? '高' : p === 'low' ? '低' : '中'
}

function setTargetStatus(s: TicketStatus) {
  if (handling.value) return
  targetStatus.value = s
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="工单管理" right-icon="refresh" @right="load" />

    <!-- 状态 Tab -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="switchTab(t.key)"
      >
        <text class="tab-label">{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view class="section-head">
        <text class="section-title">{{ TABS.find((t) => t.key === tab)?.label }}工单</text>
        <text class="section-count">共 {{ total }} 条</text>
      </view>

      <view v-for="t in filtered" :key="t.id" class="card" @click="openHandle(t)">
        <view class="card-head">
          <view :class="['priority-tag', 'p-' + t.priority]">{{ priorityLabel(t.priority) }}</view>
          <text class="title">{{ t.title }}</text>
          <view :class="['status-tag', 's-' + t.status]">{{ statusLabel(t.status) }}</view>
        </view>

        <text class="content">{{ t.content || '(无正文)' }}</text>

        <view class="meta-row">
          <view class="meta-chip">
            <Icon name="user" :size="22" color="var(--text-tertiary)" />
            <text>{{ t.fromUserName }}</text>
          </view>
          <view class="meta-chip">
            <Icon name="clock" :size="22" color="var(--text-tertiary)" />
            <text>{{ formatDateTime(t.createdAt) }}</text>
          </view>
        </view>

        <view v-if="t.reply" class="reply-block">
          <text class="reply-label">回复</text>
          <text class="reply-text">{{ t.reply }}</text>
        </view>
      </view>

      <EmptyState
        v-if="!loading && filtered.length === 0"
        :title="`暂无${TABS.find((t) => t.key === tab)?.label}工单`"
        desc="新工单由用户端 / 商家端提交后会出现在这里"
        icon="message"
      />
      <view style="height: 80rpx" />
    </scroll-view>

    <!-- 处理 Sheet -->
    <view v-if="handleOpen && current" class="sheet-mask" @click="closeHandle">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">处理工单</text>
          <view class="sheet-close" @click="closeHandle">
            <Icon name="close" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>

        <scroll-view scroll-y class="sheet-body">
          <view class="info-card">
            <text class="info-title">{{ current.title }}</text>
            <text class="info-meta"
              >{{ current.fromUserName }} · {{ formatDateTime(current.createdAt) }}</text
            >
            <text class="info-content">{{ current.content || '(无正文)' }}</text>
          </view>

          <view class="field">
            <text class="field-label">回复内容</text>
            <textarea
              v-model="replyText"
              class="field-textarea"
              placeholder="请输入回复内容(关闭工单时必填)"
              maxlength="500"
              auto-height
              :disabled="handling"
            />
          </view>

          <view class="field">
            <text class="field-label">目标状态</text>
            <view class="seg-group">
              <view
                :class="['seg', targetStatus === 'open' ? 'active' : '']"
                @click="setTargetStatus('open')"
              >
                待处理
              </view>
              <view
                :class="['seg', targetStatus === 'handling' ? 'active' : '']"
                @click="setTargetStatus('handling')"
              >
                处理中
              </view>
              <view
                :class="['seg', 'closed', targetStatus === 'closed' ? 'active' : '']"
                @click="setTargetStatus('closed')"
              >
                已关闭
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="sheet-foot">
          <view :class="['sheet-btn ghost', handling ? 'disabled' : '']" @click="closeHandle"
            >取消</view
          >
          <view
            :class="['sheet-btn primary', handling ? 'disabled' : '']"
            @click="!handling && submitHandle()"
          >
            {{ handling ? '提交中…' : '提交处理' }}
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
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
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
.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .title {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.priority-tag {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
  font-weight: 800;
  &.p-high {
    background: rgba(255, 59, 48, 0.12);
    color: #ff3b30;
  }
  &.p-normal {
    background: rgba(250, 173, 20, 0.12);
    color: #faad14;
  }
  &.p-low {
    background: rgba(0, 0, 0, 0.06);
    color: var(--text-tertiary);
  }
}
.status-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
  &.s-open {
    background: rgba(255, 77, 45, 0.12);
    color: var(--brand-primary);
  }
  &.s-handling {
    background: rgba(18, 150, 219, 0.12);
    color: #1296db;
  }
  &.s-closed {
    background: rgba(82, 196, 26, 0.12);
    color: #52c41a;
  }
}
.content {
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta-row {
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
}
.reply-block {
  padding: 12rpx 16rpx;
  background: rgba(82, 196, 26, 0.06);
  border-left: 4rpx solid #52c41a;
  border-radius: 0 12rpx 12rpx 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .reply-label {
    font-size: 20rpx;
    font-weight: 800;
    color: #52c41a;
  }
  .reply-text {
    font-size: 24rpx;
    color: var(--text-secondary);
    line-height: 1.55;
  }
}

/* ========== Sheet ========== */
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
.info-card {
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .info-title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .info-meta {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .info-content {
    font-size: 24rpx;
    color: var(--text-secondary);
    line-height: 1.55;
    margin-top: 4rpx;
  }
}
.field {
  padding: 18rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
}
.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-secondary);
}
.field-textarea {
  width: 100%;
  min-height: 200rpx;
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
    background: var(--brand-primary);
    border-color: var(--brand-primary);
  }
  &.closed.active {
    background: #52c41a;
    border-color: #52c41a;
  }
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
