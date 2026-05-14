<script setup lang="ts">
/**
 * MA-14 · 门店列表
 *
 * 顶部统计 + Tab + 门店卡（等级 + 授权状态 + 联系/授权操作）
 */
import { ref, computed, onMounted } from 'vue'
import { storeService } from '../../services/store'
import type { Store } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

type Tab = 'all' | 'active' | 'pending' | 'cancelled'

const tab = ref<Tab>('all')
const keyword = ref('')
const list = ref<Store[]>([])
const loading = ref(false)

const TABS = computed(() => [
  { key: 'all' as Tab, label: '全部', badge: list.value.length },
  { key: 'active' as Tab, label: '已授权' },
  { key: 'pending' as Tab, label: '待审核' },
  { key: 'cancelled' as Tab, label: '已取消' },
])

const stats = computed(() => ({
  total: list.value.length,
  active: list.value.filter((s) => s.status === 'active').length,
  pending: list.value.filter((s) => s.status === 'pending').length,
}))

const STATUS_LABEL: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  active: { text: '已授权', tone: 'success' },
  pending: { text: '待审核', tone: 'warning' },
  cancelled: { text: '已取消', tone: 'default' },
}

const LEVEL_COLOR: Record<string, string> = {
  A: 'linear-gradient(135deg, #FFD89B, #FF8845)',
  B: 'linear-gradient(135deg, #C7E8FF, #6BB6FF)',
  C: 'linear-gradient(135deg, #E0E0E0, #B0B0B0)',
}

const filtered = computed(() => {
  let res = list.value
  if (tab.value !== 'all') res = res.filter((s) => s.status === tab.value)
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    res = res.filter((s) => s.name.toLowerCase().includes(kw) || s.contact.includes(keyword.value))
  }
  return res
})

async function load() {
  loading.value = true
  try {
    const data = await storeService.list({ pageSize: 30 })
    list.value = data.list
  } finally {
    loading.value = false
  }
}

function goAuth(s: Store) {
  uni.navigateTo({ url: `/pages/store/auth?id=${s.id}&name=${encodeURIComponent(s.name)}&level=${s.level}` })
}
function callStore(s: Store) {
  uni.makePhoneCall({ phoneNumber: s.phone })
}
/**
 * 通过门店申请
 *
 * 后端目前无 PUT /m/stores/:id 也无 /approve 端点，门店"启用"通过设置授权有效期落地：
 *   POST /m/stores/:id/auth { level, authValidFrom, authValidTo, ... }
 * 设置成功后：
 *   1) 后端把 authValidFrom / authValidTo / level / authConfig 写到 Store 表
 *   2) 前端乐观更新 s.status = 'active' 让 UI 立刻反映
 *
 * 注意：Store.status 列在数据库不会被 saveAuth 改写（后端未支持），
 *      所以列表下次拉取仍可能是 'pending' —— 这是当前后端能力的真实情况，
 *      不在 merchant-app 修复范围内（只允许动 merchant-app/src）。
 */
function approve(s: Store) {
  uni.showModal({
    title: '通过门店申请',
    content: `通过「${s.name}」入驻申请，将颁发 ${s.level || 'A'} 级 1 年授权。`,
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '审核中…', mask: true })
      try {
        const now = new Date()
        const to = new Date(now)
        to.setFullYear(to.getFullYear() + 1)
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        await storeService.saveAuth(s.id, {
          level: (s.level || 'A') as 'A' | 'B' | 'C',
          visiblePriceTiers: ['retail', 'wholesale'],
          productPolicies: [],
          authValidFrom: fmt(now),
          authValidTo: fmt(to),
        })
        s.status = 'active'
        s.authValidFrom = fmt(now)
        s.authValidTo = fmt(to)
        uni.hideLoading()
        uni.showToast({ title: '已通过' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}
/**
 * 驳回门店申请
 *
 * 由于无后端"软驳回"路径，按用户指示走删除门店（DELETE /m/stores/:id）。
 * 删除后从列表本地移除。
 */
function reject(s: Store) {
  uni.showModal({
    title: '驳回申请（将删除门店）',
    editable: true,
    placeholderText: '请填写驳回理由（仅本地记录）',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '处理中…', mask: true })
      try {
        await storeService.remove(s.id)
        const idx = list.value.findIndex((x) => x.id === s.id)
        if (idx >= 0) list.value.splice(idx, 1)
        uni.hideLoading()
        uni.showToast({ title: '已驳回' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="门店管理" right-text="邀请" />

    <!-- 顶部统计 -->
    <view class="hero">
      <view class="hero-stat">
        <text class="hero-value">{{ stats.total }}</text>
        <text class="hero-label">合作门店</text>
      </view>
      <view class="divider" />
      <view class="hero-stat">
        <text class="hero-value">{{ stats.active }}</text>
        <text class="hero-label">已授权</text>
      </view>
      <view class="divider" />
      <view class="hero-stat">
        <text class="hero-value">{{ stats.pending }}</text>
        <text class="hero-label">待审核</text>
      </view>
    </view>

    <!-- 搜索 + Tab -->
    <view class="header">
      <view class="search-wrap">
        <Icon name="search" :size="32" color="var(--text-tertiary)" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索门店名称 / 联系人"
        />
      </view>
      <Tabs v-model="tab" :items="TABS" variant="underline" />
    </view>

    <!-- 列表 -->
    <view class="list">
      <view v-for="s in filtered" :key="s.id" class="card">
        <view class="card-head">
          <view :class="['level-badge']" :style="{ background: LEVEL_COLOR[s.level] }">
            <text class="level-text">{{ s.level }}</text>
          </view>
          <view class="store-info">
            <text class="store-name">{{ s.name }}</text>
            <view class="store-meta">
              <view class="meta-region">
                <Icon name="location" :size="22" color="var(--text-tertiary)" />
                <text>{{ s.region }}</text>
              </view>
              <StatusTag :text="STATUS_LABEL[s.status].text" :tone="STATUS_LABEL[s.status].tone" />
            </view>
          </view>
        </view>

        <view class="card-body">
          <view class="row">
            <text class="row-label">联系人</text>
            <text class="row-value">{{ s.contact }} · {{ s.phone }}</text>
          </view>
          <view class="row">
            <text class="row-label">地址</text>
            <text class="row-value">{{ s.address }}</text>
          </view>
          <view v-if="s.status === 'active'" class="row">
            <text class="row-label">授权有效期</text>
            <text class="row-value">{{ s.authValidFrom }} ~ {{ s.authValidTo }}</text>
          </view>
        </view>

        <view class="card-actions">
          <view v-if="s.status === 'pending'" class="action ghost" @click="reject(s)">驳回</view>
          <view v-if="s.status === 'pending'" class="action primary" @click="approve(s)">通过</view>
          <view v-if="s.status === 'active'" class="action ghost" @click="callStore(s)">
            <Icon name="phone" :size="24" color="var(--text-primary)" />
            <text>联系</text>
          </view>
          <view v-if="s.status === 'active'" class="action primary" @click="goAuth(s)">授权设置</view>
          <view v-if="s.status === 'cancelled'" class="action ghost">查看记录</view>
        </view>
      </view>

      <EmptyState v-if="!loading && filtered.length === 0" title="暂无门店" desc="可邀请门店或调整筛选条件" />
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
}
.hero {
  background: var(--brand-gradient);
  color: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  display: flex;
  align-items: center;
  .hero-stat {
    flex: 1;
    text-align: center;
    .hero-value {
      font-size: 48rpx;
      font-weight: 700;
      font-family: var(--font-family-base);
    }
    .hero-label {
      display: block;
      margin-top: 4rpx;
      font-size: 22rpx;
      opacity: 0.9;
    }
  }
  .divider {
    width: 2rpx;
    height: 56rpx;
    background: rgba(255,255,255,0.3);
  }
}
.header {
  background: var(--bg-card);
  padding: 16rpx 24rpx 0;
  position: sticky;
  top: 0;
  z-index: 5;
}
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  padding: 0 16rpx 0 20rpx;
  height: 72rpx;
  margin-bottom: 12rpx;
  .search-input { flex: 1; height: 100%; font-size: 26rpx; }
}
.list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card-head {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.level-badge {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  text-align: center;
  line-height: 80rpx;
  flex-shrink: 0;
  .level-text {
    font-size: 40rpx;
    font-weight: 800;
    color: #fff;
    font-family: var(--font-family-base);
  }
}
.store-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}
.store-name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.store-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  .meta-region {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.card-body {
  padding: 16rpx 0;
  border-top: 1rpx dashed var(--border-light);
  border-bottom: 1rpx dashed var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.row {
  display: flex;
  font-size: 24rpx;
  gap: 16rpx;
  .row-label { width: 140rpx; color: var(--text-tertiary); }
  .row-value { flex: 1; color: var(--text-primary); }
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  .action {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 12rpx 28rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    font-weight: 600;
    &.ghost { background: var(--bg-hover); color: var(--text-primary); }
    &.primary {
      background: var(--brand-gradient);
      color: #fff;
      box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
    }
  }
}
.safe-bottom { height: 40rpx; }
</style>
