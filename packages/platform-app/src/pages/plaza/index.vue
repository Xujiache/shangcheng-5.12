<script setup lang="ts">
/**
 * PA-06 · 选品广场推送
 * 还原 原型图/platform-app.jsx::PA_Plaza
 * - Tab：推送商品 / 推送厂家 / 推送记录
 * - 顶部 3 宫格统计
 * - 搜索 + 批量推送
 * - 商品卡：图 + 名 + 厂家 + 价格 + 标签 + 状态 + 代理数
 */
import { ref, computed, onMounted, watch } from 'vue'
import { plazaService } from '../../services'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'products' | 'factories' | 'records'

type PlazaItemStatus = 'pushing' | 'pending' | 'offline' | 'active' | 'rejected'

interface PlazaItem {
  id: string
  name: string
  factory: string
  price: number
  image: string
  tag: string
  tagTone: 'accent' | 'pop' | 'soft'
  status: PlazaItemStatus
  agencyCount: number
}

const tab = ref<TabKey>('products')
const keyword = ref('')
const loading = ref(false)
const items = ref<PlazaItem[]>([])
const selectedIds = ref<Set<string>>(new Set())
const batchMode = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'products', label: '推送商品' },
  { key: 'factories', label: '推送厂家' },
  { key: 'records', label: '推送记录' },
]

const STATUS_META: Record<string, { label: string; tint: string }> = {
  pushing: { label: '在推', tint: '#52C41A' },
  pending: { label: '待上线', tint: '#FAAD14' },
  offline: { label: '已下架', tint: '#86909C' },
  active: { label: '已上线', tint: '#52C41A' },
  rejected: { label: '已驳回', tint: '#F5222D' },
}

function statusMeta(s: string) {
  return STATUS_META[s] || STATUS_META.pending
}

const filtered = computed(() => {
  if (!keyword.value) return items.value
  const kw = keyword.value.toLowerCase()
  return items.value.filter(
    (x) => x.name.toLowerCase().includes(kw) || x.factory.toLowerCase().includes(kw),
  )
})

const stats = computed(() => ({
  pushing: items.value.filter((x) => x.status === 'pushing').length,
  factories: new Set(items.value.map((x) => x.factory)).size,
  totalAgency: items.value.reduce((s, x) => s + x.agencyCount, 0),
}))

/**
 * 三种 tab 走不同后端聚合接口：
 * - products:  /p/plaza/products   全平台已上架商品
 * - factories: /p/plaza/factories  全平台 active 工厂
 * - records:   /p/plaza/records    代理申请记录（agencyApplication）
 *
 * 三者返回结构不一致,统一适配成同一 `PlazaItem` 让卡片复用。
 */
async function load() {
  loading.value = true
  try {
    if (tab.value === 'products') {
      const res = (await plazaService.products({ pageSize: 30 })) as { list?: any[] } | any[]
      const list = Array.isArray(res) ? res : Array.isArray(res?.list) ? res!.list! : []
      items.value = list.map((x: any, i: number): PlazaItem => {
        const firstTag = x.tag || (Array.isArray(x.tags) ? x.tags[0] : '') || ''
        const rawStatus = String(x.status ?? '')
        const normStatus: PlazaItemStatus =
          rawStatus === 'active'
            ? 'pushing'
            : rawStatus === 'pushing' || rawStatus === 'pending' || rawStatus === 'offline' || rawStatus === 'rejected'
              ? (rawStatus as PlazaItemStatus)
              : 'pending'
        return {
          id: String(x.id ?? x.productId ?? `pl-${i}`),
          name: x.name || x.productName || '',
          factory: x.factory || x.factoryName || (x.merchant?.name ?? ''),
          price:
            typeof x.price === 'number'
              ? x.price
              : typeof x.startPrice === 'number'
                ? x.startPrice
                : 0,
          image: x.image || x.productImage || (x.images?.[0] ?? ''),
          tag: firstTag,
          tagTone: i % 3 === 0 ? 'pop' : 'accent',
          status: normStatus,
          agencyCount: typeof x.agencyCount === 'number' ? x.agencyCount : 0,
        }
      })
    } else if (tab.value === 'factories') {
      const list = (await plazaService.factories()) as any[]
      const arr = Array.isArray(list) ? list : []
      items.value = arr.map((x: any, i: number): PlazaItem => ({
        id: String(x.id ?? `fac-${i}`),
        name: x.name || x.legalName || '未命名厂家',
        factory: x.region || x.address || '',
        price: 0,
        image: x.logo || x.avatar || '',
        tag: x.type === 'factory' ? '厂家' : x.type,
        tagTone: 'accent',
        status: x.status === 'active' ? 'pushing' : 'offline',
        agencyCount: typeof x.agencyCount === 'number' ? x.agencyCount : 0,
      }))
    } else {
      const res = (await plazaService.records({ pageSize: 30 })) as { list?: any[] }
      const list = Array.isArray(res?.list) ? res!.list! : []
      items.value = list.map((x: any, i: number): PlazaItem => ({
        id: String(x.id ?? `rec-${i}`),
        name: x.merchant?.name || x.merchantName || '代理申请记录',
        factory: x.applicantName || x.applicantPhone || '',
        price: typeof x.expectedAmount === 'number' ? x.expectedAmount : 0,
        image: '',
        tag: x.status || '处理中',
        tagTone: 'accent',
        status:
          x.status === 'approved'
            ? 'pushing'
            : x.status === 'rejected'
              ? 'offline'
              : 'pending',
        agencyCount: 0,
      }))
    }
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(tab, () => {
  selectedIds.value = new Set()
  batchMode.value = false
  load()
})

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

function startBatch() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) selectedIds.value = new Set()
}

function batchPush() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请先勾选商品', icon: 'none' })
    return
  }
  const ids = Array.from(selectedIds.value).join(',')
  uni.navigateTo({
    url: `/pages/plaza/push?productIds=${encodeURIComponent(ids)}&count=${selectedIds.value.size}`,
  })
}

function pushOne(item: PlazaItem) {
  uni.navigateTo({ url: `/pages/plaza/push?productIds=${encodeURIComponent(item.id)}` })
}

/**
 * 平台端"下架推送"按钮：
 * 后端没有针对单个 plazaPush 的下架接口（只能整条 update 推送记录的 status,
 * 但 platform-app 没必要复刻完整推送编辑器）。这里给出明确指引而不是假装"已下架"。
 */
function offlineOne(item: PlazaItem) {
  uni.showModal({
    title: '下架推送',
    content: `下架「${item.name}」请到 admin-pc 管理后台 → 选品广场 → 推送记录，单条暂停或整条推送下线。`,
    confirmText: '我知道了',
    showCancel: false,
  })
}

function editItem(item: PlazaItem) {
  uni.showActionSheet({
    itemList: ['修改推送位置', '修改标签', '修改投放对象', '查看数据'],
    success: (r) => {
      uni.showToast({ title: ['改位置', '改标签', '改对象', '查数据'][r.tapIndex], icon: 'none' })
    },
  })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/plaza/push' })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="选品广场推送" right-icon="plus" @right="goCreate" />

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

    <scroll-view scroll-y class="scroll">
      <!-- 数据三宫格 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="s-label">在推商品</text>
          <text class="s-value">{{ stats.pushing }}</text>
        </view>
        <view class="stat-card">
          <text class="s-label">在推厂家</text>
          <text class="s-value">{{ stats.factories }}</text>
        </view>
        <view class="stat-card">
          <text class="s-label">代理申请</text>
          <text class="s-value">{{ stats.totalAgency }}</text>
        </view>
      </view>

      <!-- 搜索 + 批量 -->
      <view class="filter-bar">
        <view class="search-bar">
          <Icon name="search" :size="28" color="var(--text-tertiary)" />
          <input v-model="keyword" class="search-input" placeholder="搜索商品 / 厂家" />
        </view>
        <view
          :class="['batch-btn', batchMode ? 'on' : '']"
          @click="batchMode ? batchPush() : startBatch()"
        >
          {{ batchMode ? `推送(${selectedIds.size})` : '批量' }}
        </view>
        <view v-if="batchMode" class="cancel-btn" @click="startBatch">取消</view>
      </view>

      <!-- 列表 -->
      <view class="list">
        <view
          v-for="x in filtered"
          :key="x.id"
          class="card"
          :class="{ selected: selectedIds.has(x.id) }"
          @click="batchMode ? toggleSelect(x.id) : null"
        >
          <view class="card-body">
            <view v-if="batchMode" class="check">
              <Icon
                v-if="selectedIds.has(x.id)"
                name="check-circle"
                :size="40"
                color="var(--brand-primary)"
              />
              <Icon v-else name="circle" :size="40" color="var(--text-tertiary)" />
            </view>
            <image :src="x.image" mode="aspectFill" class="img" />
            <view class="info">
              <view class="info-head">
                <text class="name">{{ x.name }}</text>
                <view
                  class="status-tag"
                  :style="{ color: statusMeta(x.status).tint, background: statusMeta(x.status).tint + '14' }"
                >
                  {{ statusMeta(x.status).label }}
                </view>
              </view>
              <text class="factory">{{ x.factory }}</text>
              <view class="price-row">
                <text class="price">{{ formatPrice(x.price) }}</text>
                <view :class="['tag', `tone-${x.tagTone}`]">{{ x.tag }}</view>
              </view>
              <text class="agency">{{ x.agencyCount > 0 ? `代理 ${x.agencyCount}` : '—' }}</text>
            </view>
          </view>

          <view class="actions" @click.stop>
            <view class="btn ghost" @click="editItem(x)">编辑</view>
            <view
              :class="['btn', x.status === 'pushing' ? 'dark' : 'primary']"
              @click="x.status === 'pushing' ? offlineOne(x) : pushOne(x)"
            >
              {{ x.status === 'pushing' ? '下架' : '推送' }}
            </view>
          </view>
        </view>

        <EmptyState
          v-if="!loading && filtered.length === 0"
          title="暂无商品"
          desc="点击右上角创建推送"
          icon="biz-plaza"
        />
      </view>

      <view style="height: 40rpx;" />
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
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
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
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}
.stats-grid {
  margin: 16rpx 24rpx 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.stat-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  text-align: center;
  border: 1rpx dashed var(--border-default);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .s-label { font-size: 22rpx; color: var(--text-tertiary); }
  .s-value {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--brand-primary);
    line-height: 1;
    font-family: var(--font-family-base);
  }
}
.filter-bar {
  margin: 12rpx 24rpx 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 72rpx;
  background: var(--bg-card);
  border-radius: 999rpx;
  box-shadow: var(--shadow-sm);
  .search-input {
    flex: 1;
    height: 100%;
    font-size: 26rpx;
  }
}
.batch-btn {
  flex-shrink: 0;
  padding: 16rpx 28rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  &.on {
    background: var(--text-primary);
  }
}
.cancel-btn {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
  background: var(--bg-card);
  border: 1rpx solid var(--border-default);
  color: var(--text-primary);
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}
.list {
  padding: 16rpx 24rpx;
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
  transition: all .2s;
  &.selected {
    border: 2rpx solid var(--brand-primary);
    background: rgba(255,77,45,0.04);
  }
}
.card-body {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  min-width: 0;
}
.check {
  padding: 4rpx;
  flex-shrink: 0;
}
.img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: var(--bg-page);
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.info-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.factory {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  margin-top: 2rpx;
  .price {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
  .tag {
    flex-shrink: 0;
    padding: 2rpx 10rpx;
    border-radius: 999rpx;
    font-size: 18rpx;
    font-weight: 600;
    &.tone-accent { background: rgba(255,77,45,0.1); color: var(--brand-primary); }
    &.tone-pop { background: linear-gradient(90deg, #FFF4E5, #FFE4C7); color: #B25900; }
  }
}
.agency {
  font-size: 20rpx;
  color: var(--text-tertiary);
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
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
  &.dark {
    background: var(--text-primary);
    color: #fff;
  }
}
</style>
