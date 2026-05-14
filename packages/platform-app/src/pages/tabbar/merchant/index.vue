<script setup lang="ts">
/**
 * PA-03 · 商户列表（tabbar 入口）
 * 还原 原型图/platform-app.jsx::PA_MerchantList
 * - Tab（全部 / 厂家 / 门店 / 已停用）
 * - 顶部开关条（厂家&门店按钮图标显示开关）
 * - 商户卡：头像 + 名 + 类型 + 套餐 + 累计 GMV + 操作（详情/权限/停用）
 */
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { merchantService } from '../../../services'
import type { Merchant, MerchantType } from '@jiujiu/shared/types'
import { formatWan } from '@jiujiu/shared/utils'
import NavBar from '../../../components/nav-bar/nav-bar.vue'
import Icon from '../../../components/icon/icon.vue'
import EmptyState from '../../../components/empty-state/empty-state.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

type TabKey = 'all' | 'factory' | 'store' | 'disabled'

const tab = ref<TabKey>('all')
const keyword = ref('')
const list = ref<Merchant[]>([])
const loading = ref(false)
const showBtnSwitch = ref(true)

/** 概览四项徽章数:与列表分类解耦,首屏并行拉一次,操作后局部更新 */
const stats = ref({ total: 0, factory: 0, store: 0, disabled: 0 })

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'factory', label: '厂家' },
  { key: 'store', label: '门店' },
  { key: 'disabled', label: '已停用' },
]

const TYPE_META: Record<MerchantType, { label: string; tint: string }> = {
  factory: { label: '厂家', tint: '#FF4D2D' },
  store: { label: '门店', tint: '#FAAD14' },
}
// 兜底:历史脏数据 / 新枚举值会让 TYPE_META[m.type] 取到 undefined,
// 模板里 `.tint` 会让整张列表 v-for 渲染崩 → "商户管理 tab 整页空白"。
const TYPE_FALLBACK = { label: '其他', tint: '#86909C' }
function typeMetaOf(t: string | undefined | null) {
  return (t && (TYPE_META as Record<string, { label: string; tint: string }>)[t]) || TYPE_FALLBACK
}

const PLAN_LABEL: Record<string, string> = {
  yearly: 'VIP 年费',
  monthly: '月费',
  trial: '试用',
}

/**
 * 关键字本地过滤 —— type/status 已交给后端 (load 按 tab 拉对应分类),
 * 这里只做商户名/联系人模糊搜索的客户端兜底,避免每输入一个字打一次接口。
 */
const filtered = computed(() => {
  if (!keyword.value) return list.value
  const kw = keyword.value.toLowerCase()
  return list.value.filter(
    (m) => m.name.toLowerCase().includes(kw) || m.contact.includes(keyword.value),
  )
})

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

/**
 * 按当前 tab 转换为后端筛选参数:
 *   - all      → 只排除 pending(等待入驻审核的不在该 tab 显示)
 *   - factory  → type=factory & 排除 disabled
 *   - store    → type=store   & 排除 disabled
 *   - disabled → status=disabled
 *
 * 后端 `/p/merchants` 同时支持 type / status 单值查询,因此
 * "factory 且非 disabled" 用 type=factory 拉取后端默认排除 pending/disabled 的列表。
 */
function buildListParams(t: TabKey): { type?: string; status?: string; pageSize: number } {
  const base: { type?: string; status?: string; pageSize: number } = { pageSize: 50 }
  if (t === 'factory') base.type = 'factory'
  else if (t === 'store') base.type = 'store'
  else if (t === 'disabled') base.status = 'disabled'
  return base
}

async function load() {
  loading.value = true
  try {
    const res = await merchantService.list(buildListParams(tab.value))
    list.value = res.list
  } finally {
    loading.value = false
  }
}

/**
 * 并行拉 4 个状态的 total 作为概览徽章数。
 * pageSize=1 减少传输负担,不依赖后端聚合接口,与商品审核 loadCounts 同模式。
 */
async function loadStats() {
  try {
    const [total, factory, store, disabled] = await Promise.all([
      merchantService
        .list({ pageSize: 1 })
        .catch(() => ({ total: 0, list: [] }) as Awaited<ReturnType<typeof merchantService.list>>),
      merchantService
        .list({ type: 'factory', pageSize: 1 })
        .catch(() => ({ total: 0, list: [] }) as Awaited<ReturnType<typeof merchantService.list>>),
      merchantService
        .list({ type: 'store', pageSize: 1 })
        .catch(() => ({ total: 0, list: [] }) as Awaited<ReturnType<typeof merchantService.list>>),
      merchantService
        .list({ status: 'disabled', pageSize: 1 })
        .catch(() => ({ total: 0, list: [] }) as Awaited<ReturnType<typeof merchantService.list>>),
    ])
    stats.value = {
      total: total.total ?? 0,
      factory: factory.total ?? 0,
      store: store.total ?? 0,
      disabled: disabled.total ?? 0,
    }
  } catch {
    /* ignore — 徽章数失败不影响主列表 */
  }
}

watch(tab, () => {
  load()
})

function viewDetail(m: Merchant) {
  uni.showModal({
    title: m.name,
    content: `类型: ${typeMetaOf(m.type).label}\n主体: ${m.legalName || '—'}\n联系人: ${m.contact || '—'} ${m.contactPhone || ''}\n地区: ${m.region || '—'}\n累计 GMV: ¥${formatWan(m.totalGmv ?? 0)}\n信用: ${m.credit ?? 'B'}级`,
    showCancel: false,
  })
}

function togglePause(m: Merchant) {
  const isActive = m.status === 'active'
  uni.showModal({
    title: isActive ? '停用商户' : '恢复商户',
    content: isActive
      ? `停用「${m.name}」后将无法登录商家端，已上架商品下架。`
      : `恢复「${m.name}」营业。`,
    success: async (r) => {
      if (r.confirm) {
        if (isActive) {
          await merchantService.pause(m.id)
          m.status = 'disabled'
          uni.showToast({ title: '已停用', icon: 'success' })
        } else {
          await merchantService.resume(m.id)
          m.status = 'active'
          uni.showToast({ title: '已恢复', icon: 'success' })
        }
      }
    },
  })
}

function goAudit() {
  uni.navigateTo({ url: '/pages/audit/merchant' })
}

function planOf(m: Merchant): string {
  if (m.trialEndAt) return PLAN_LABEL.trial
  return Math.random() > 0.5 ? PLAN_LABEL.yearly : PLAN_LABEL.monthly
}

function avatarOf(m: Merchant): string {
  return m.name?.[0] ?? '?'
}

onMounted(() => {
  load()
  loadStats()
})
onShow(() => {
  load()
  loadStats()
})
</script>

<template>
  <view class="page">
    <!-- 顶部彩色条 -->
    <view class="top-bar" :style="{ paddingTop: statusBarHeight }">
      <view class="top-row">
        <text class="top-title">商户管理</text>
        <view class="audit-btn" @click="goAudit">
          <Icon name="check-circle" :size="28" color="#fff" />
          <text>入驻审核</text>
        </view>
      </view>
      <view class="top-stats">
        <view class="ts-item">
          <text class="ts-num">{{ stats.total }}</text>
          <text class="ts-label">商户总数</text>
        </view>
        <view class="ts-divider" />
        <view class="ts-item">
          <text class="ts-num">{{ stats.factory }}</text>
          <text class="ts-label">厂家</text>
        </view>
        <view class="ts-divider" />
        <view class="ts-item">
          <text class="ts-num">{{ stats.store }}</text>
          <text class="ts-label">门店</text>
        </view>
        <view class="ts-divider" />
        <view class="ts-item">
          <text class="ts-num">{{ stats.disabled }}</text>
          <text class="ts-label">已停用</text>
        </view>
      </view>
    </view>

    <!-- 搜索 + Tab -->
    <view class="header">
      <view class="search-bar">
        <Icon name="search" :size="32" color="var(--text-tertiary)" />
        <input v-model="keyword" class="search-input" placeholder="搜索商户名称 / 联系人" />
      </view>
      <view class="tabs">
        <view
          v-for="t in TABS"
          :key="t.key"
          :class="['tab', tab === t.key ? 'active' : '']"
          @click="tab = t.key"
        >
          <text>{{ t.label }}</text>
          <view v-if="tab === t.key" class="indicator" />
        </view>
      </view>
    </view>

    <!-- 全局功能开关条 -->
    <view class="switch-bar">
      <view class="sw-info">
        <view class="sw-dot" />
        <text class="sw-label">厂家 & 门店按钮图标 显示开关</text>
      </view>
      <view
        :class="['sw-toggle', showBtnSwitch ? 'on' : '']"
        @click="showBtnSwitch = !showBtnSwitch"
      >
        <view class="sw-thumb" />
        <text class="sw-text">{{ showBtnSwitch ? '常开' : '关闭' }}</text>
      </view>
    </view>

    <view class="body">
      <view v-for="m in filtered" :key="m.id" class="card">
        <view class="card-head">
          <view class="avatar" :style="{ background: typeMetaOf(m.type).tint }">
            <text>{{ avatarOf(m) }}</text>
          </view>
          <view class="head-info">
            <view class="head-top">
              <text class="name">{{ m.name }}</text>
              <view
                class="type-tag"
                :style="{
                  color: typeMetaOf(m.type).tint,
                  background: typeMetaOf(m.type).tint + '14',
                }"
              >
                {{ typeMetaOf(m.type).label }}
              </view>
              <view v-if="m.status === 'disabled'" class="status-tag">已停用</view>
            </view>
            <text class="meta">{{ planOf(m) }} · 累计 GMV ¥{{ formatWan(m.totalGmv ?? 0) }}</text>
            <view class="badge-row">
              <view v-if="m.credit" class="badge">信用 {{ m.credit }} 级</view>
              <view v-if="m.level" class="badge">{{ m.level }} 级商户</view>
              <view v-if="(m.rejectRate ?? 0) < 5" class="badge ok">低驳回率</view>
            </view>
          </view>
        </view>

        <view class="actions">
          <view class="btn ghost" @click="viewDetail(m)">详情</view>
          <view
            :class="['btn', m.status === 'disabled' ? 'primary' : 'dark']"
            @click="togglePause(m)"
          >
            {{ m.status === 'disabled' ? '恢复' : '停用' }}
          </view>
        </view>
      </view>

      <EmptyState
        v-if="!loading && filtered.length === 0"
        title="暂无商户"
        :desc="keyword ? '尝试其他关键词' : '该分类下还没有商户'"
        icon="home-shop"
      />
    </view>

    <TabBar current="merchant" />
  </view>
</template>

<style lang="scss" scoped>
/**
 * 自然文档流布局 —— 不用 flex column + overflow:hidden(mp/App 真包会塌陷)。
 * 顶部条用 position:sticky 吸顶,底部 TabBar 由组件自身 position:fixed 兜底。
 */
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  padding-bottom: 24rpx;
}
.top-row {
  padding: 16rpx 24rpx 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .top-title {
    font-size: 36rpx;
    font-weight: 800;
  }
  .audit-btn {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 20rpx;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
  }
}
.top-stats {
  display: flex;
  margin: 16rpx 24rpx 0;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  backdrop-filter: blur(8rpx);
  .ts-item {
    flex: 1;
    text-align: center;
    .ts-num {
      display: block;
      font-size: 32rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .ts-label {
      display: block;
      margin-top: 4rpx;
      font-size: 20rpx;
      opacity: 0.85;
    }
  }
  .ts-divider {
    width: 1rpx;
    background: rgba(255, 255, 255, 0.25);
  }
}
.header {
  background: var(--bg-card);
  padding: 16rpx 24rpx 0;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 72rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  margin-bottom: 12rpx;
  .search-input {
    flex: 1;
    height: 100%;
    font-size: 26rpx;
  }
}
.tabs {
  display: flex;
}
.tab {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
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
    width: 40rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.switch-bar {
  margin: 12rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  border: 1rpx dashed rgba(255, 77, 45, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  .sw-info {
    display: flex;
    align-items: center;
    gap: 8rpx;
    .sw-dot {
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background: #52c41a;
      box-shadow: 0 0 0 4rpx rgba(82, 196, 26, 0.2);
    }
    .sw-label {
      font-size: 24rpx;
      color: var(--text-primary);
    }
  }
  .sw-toggle {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 4rpx;
    background: var(--bg-page);
    border-radius: 999rpx;
    position: relative;
    .sw-thumb {
      width: 32rpx;
      height: 32rpx;
      border-radius: 50%;
      background: var(--text-tertiary);
      transition: all 0.2s;
    }
    .sw-text {
      padding: 0 8rpx;
      font-size: 22rpx;
      color: var(--text-tertiary);
      font-weight: 600;
    }
    &.on {
      .sw-thumb {
        background: var(--brand-primary);
      }
      .sw-text {
        color: var(--brand-primary);
      }
    }
  }
}
.body {
  padding: 16rpx 24rpx;
  box-sizing: border-box;
}
.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
}
.card-head {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  min-width: 0;
}
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  font-weight: 800;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}
.head-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.head-top {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .type-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
  .status-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-tertiary);
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
  }
}
.meta {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.badge-row {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}
.badge {
  padding: 2rpx 12rpx;
  background: var(--bg-page);
  color: var(--text-secondary);
  border-radius: 999rpx;
  font-size: 18rpx;
  &.ok {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
    font-weight: 600;
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 16rpx;
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
  &.dark {
    background: var(--text-primary);
    color: #fff;
  }
}
</style>
