<script setup lang="ts">
/**
 * PA · 消息中心
 *
 * 顶部铃铛入口(首页 hero.notify-btn)唯一去处。
 *
 * 数据来源 (零假数据):
 *   - 仅展示 `GET /api/v1/p/notifications` 真接口数据
 *   - 接口失败或后端尚未实现 → 显示空态 + 重试按钮,不再降级到 mock
 *
 * 已读状态:
 *   - 点击单条 → `POST /api/v1/p/notifications/:id/read` 持久化
 *   - 标记全部已读 → `POST /api/v1/p/notifications/read-all`,失败回滚 UI
 *
 * 设计要点:
 *   - 4-Tab 过滤:全部 / 系统通知 / 待办提醒 / 业务提示
 *   - 每条:彩色 icon + 标题 + 摘要 + 相对时间 + 未读红点
 *   - 点击 → uni.showModal 显示全文(轻量,不再新建 detail 页)
 */
import { ref, computed, onMounted } from 'vue'
import { notifyService, type NotifyItem, type NotifyType } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'all' | NotifyType

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系统通知' },
  { key: 'todo', label: '待办提醒' },
  { key: 'business', label: '业务提示' },
]

const TYPE_META: Record<
  NotifyType,
  { label: string; icon: string; tint: string; tintSoft: string }
> = {
  system: {
    label: '系统通知',
    icon: 'gear',
    tint: '#1296DB',
    tintSoft: 'rgba(18, 150, 219, 0.12)',
  },
  todo: {
    label: '待办提醒',
    icon: 'lightning',
    tint: '#FF4D2D',
    tintSoft: 'rgba(255, 77, 45, 0.12)',
  },
  business: {
    label: '业务提示',
    icon: 'megaphone',
    tint: '#52C41A',
    tintSoft: 'rgba(82, 196, 26, 0.12)',
  },
}

const tab = ref<TabKey>('all')
const list = ref<NotifyItem[]>([])
const loading = ref(true)
/** 后端接口失败时为 true,显示重试按钮(不再降级到演示数据) */
const loadError = ref(false)

const filteredList = computed(() => {
  if (tab.value === 'all') return list.value
  return list.value.filter((m) => m.type === tab.value)
})

const unreadCount = computed(() => list.value.filter((m) => m.unread).length)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const r = await notifyService.list()
    if (r && Array.isArray(r)) {
      list.value = r
    } else {
      // notifyService.list 已 silent catch,返回 null 即代表后端未实现 / 异常,
      // 严格按"零假数据"原则展示空态 + 重试,不填充任何演示数据。
      list.value = []
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

function relTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 单条点击:
 *   1. 立即弹出详情(用户体验优先)
 *   2. 若未读,后端调 `POST /p/notifications/:id/read` 持久化已读状态
 *   3. 后端成功后才把本地 unread 翻为 false,失败则回滚 UI 状态保证一致性
 */
async function openDetail(item: NotifyItem) {
  uni.showModal({
    title: item.title,
    content: item.content,
    showCancel: false,
    confirmText: '我知道了',
  })
  if (!item.unread) return
  const ok = await notifyService.markRead(item.id)
  if (ok) {
    item.unread = false
  }
  // 后端 silent catch 失败 → 保留未读状态,下次进来仍会高亮,不出 toast 干扰阅读
}

async function markAllRead() {
  if (unreadCount.value === 0) {
    uni.showToast({ title: '已无未读消息', icon: 'none' })
    return
  }
  uni.showLoading({ title: '处理中…' })
  const ok = await notifyService.markAllRead()
  uni.hideLoading()
  if (!ok) {
    uni.showToast({ title: '操作失败,请稍后重试', icon: 'none' })
    return
  }
  list.value.forEach((m) => {
    m.unread = false
  })
  uni.showToast({ title: '已全部标记已读', icon: 'success' })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="消息中心" />

    <!-- Tabs -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text class="tab-label">{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <!-- 顶部条：未读统计 + 标记全部已读 -->
    <view class="top-bar">
      <view class="top-left">
        <Icon name="bell" :size="28" color="var(--brand-primary)" />
        <text v-if="unreadCount > 0" class="unread-tip">{{ unreadCount }} 条未读</text>
        <text v-else class="unread-tip empty">暂无未读</text>
      </view>
      <view :class="['mark-btn', unreadCount === 0 ? 'disabled' : '']" @click="markAllRead">
        <Icon name="check" :size="24" :color="unreadCount === 0 ? '#C9CDD4' : '#FF4D2D'" />
        <text>标记全部已读</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="loading" class="loading">
        <text>加载中…</text>
      </view>

      <view v-else-if="loadError" class="empty-wrap">
        <EmptyState
          icon="bell"
          title="暂无通知"
          desc="加载失败,可能是后端通知服务暂未启用"
        />
        <view class="retry-btn" @click="load">
          <Icon name="refresh" :size="24" color="#FF4D2D" />
          <text>点击重试</text>
        </view>
      </view>

      <view v-else-if="filteredList.length === 0" class="empty-wrap">
        <EmptyState icon="bell" title="该分类下暂无消息" />
      </view>

      <view v-else class="list">
        <view
          v-for="m in filteredList"
          :key="m.id"
          :class="['msg-card', m.unread ? 'unread' : '']"
          @click="openDetail(m)"
        >
          <view class="m-icon" :style="{ background: TYPE_META[m.type].tintSoft }">
            <Icon :name="TYPE_META[m.type].icon" :size="32" :color="TYPE_META[m.type].tint" />
            <view v-if="m.unread" class="dot" />
          </view>
          <view class="m-body">
            <view class="m-head">
              <text class="m-title">{{ m.title }}</text>
              <view
                class="m-type-tag"
                :style="{ background: TYPE_META[m.type].tintSoft, color: TYPE_META[m.type].tint }"
              >
                {{ TYPE_META[m.type].label }}
              </view>
            </view>
            <text class="m-content">{{ m.content }}</text>
            <view class="m-foot">
              <Icon name="clock" :size="20" color="var(--text-tertiary)" />
              <text class="m-time">{{ relTime(m.createdAt) }}</text>
            </view>
          </view>
        </view>

        <view class="end-tip">— 已显示全部 {{ filteredList.length }} 条 —</view>
      </view>
    </scroll-view>
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

/* === Tabs === */
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
    background: var(--brand-primary);
  }
}

/* === 顶部条 === */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
  .top-left {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
  .unread-tip {
    font-size: 24rpx;
    color: var(--brand-primary);
    font-weight: 700;
    &.empty {
      color: var(--text-tertiary);
      font-weight: 500;
    }
  }
  .mark-btn {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    background: rgba(255, 77, 45, 0.08);
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
    &.disabled {
      background: #f3f4f6;
      color: #c9cdd4;
    }
  }
}

/* === 列表 === */
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx 32rpx;
  box-sizing: border-box;
}
.loading {
  padding: 96rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-tertiary);
}
.empty-wrap {
  padding: 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 32rpx;
  background: rgba(255, 77, 45, 0.08);
  border: 1rpx solid rgba(255, 77, 45, 0.3);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--brand-primary);
  font-weight: 600;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.msg-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx 24rpx 20rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  box-shadow: var(--shadow-sm);
  position: relative;
  &:active {
    transform: scale(0.99);
    background: #fafbfc;
  }
  &.unread::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 6rpx;
    background: linear-gradient(180deg, #ff7a4e, #ff4d2d);
    border-radius: 20rpx 0 0 20rpx;
  }
}
.m-icon {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .dot {
    position: absolute;
    top: 4rpx;
    right: 4rpx;
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #ff3b30;
    border: 2rpx solid #fff;
  }
}
.m-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.m-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .m-title {
    flex: 1;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .m-type-tag {
    flex-shrink: 0;
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
    font-size: 18rpx;
    font-weight: 700;
  }
}
.m-content {
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.m-foot {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;
  .m-time {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.end-tip {
  margin-top: 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
</style>
