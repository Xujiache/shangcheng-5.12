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
            : rawStatus === 'pushing' ||
                rawStatus === 'pending' ||
                rawStatus === 'offline' ||
                rawStatus === 'rejected'
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
      items.value = arr.map(
        (x: any, i: number): PlazaItem => ({
          id: String(x.id ?? `fac-${i}`),
          name: x.name || x.legalName || '未命名厂家',
          factory: x.region || x.address || '',
          price: 0,
          image: x.logo || x.avatar || '',
          tag: x.type === 'factory' ? '厂家' : x.type,
          tagTone: 'accent',
          status: x.status === 'active' ? 'pushing' : 'offline',
          agencyCount: typeof x.agencyCount === 'number' ? x.agencyCount : 0,
        }),
      )
    } else {
      const res = (await plazaService.records({ pageSize: 30 })) as { list?: any[] }
      const list = Array.isArray(res?.list) ? res!.list! : []
      items.value = list.map(
        (x: any, i: number): PlazaItem => ({
          id: String(x.id ?? `rec-${i}`),
          name: x.merchant?.name || x.merchantName || '代理申请记录',
          factory: x.applicantName || x.applicantPhone || '',
          price: typeof x.expectedAmount === 'number' ? x.expectedAmount : 0,
          image: '',
          tag: x.status || '处理中',
          tagTone: 'accent',
          status:
            x.status === 'approved' ? 'pushing' : x.status === 'rejected' ? 'offline' : 'pending',
          agencyCount: 0,
        }),
      )
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
  const isFactory = tab.value === 'factories'
  const key = isFactory ? 'factoryIds' : 'productIds'
  uni.navigateTo({
    url: `/pages/plaza/push?${key}=${encodeURIComponent(ids)}&subjectType=${isFactory ? 'factory' : 'product'}&count=${selectedIds.value.size}`,
  })
}

function pushOne(item: PlazaItem) {
  // 厂家 tab 推送时走 factoryIds + subjectType=factory，避免厂家 id 被当成 productIds
  const isFactory = tab.value === 'factories'
  const key = isFactory ? 'factoryIds' : 'productIds'
  uni.navigateTo({
    url: `/pages/plaza/push?${key}=${encodeURIComponent(item.id)}&subjectType=${isFactory ? 'factory' : 'product'}`,
  })
}

/**
 * 平台端"下架推送"按钮 —— 直接调 PATCH /p/plaza/products/:id/online {online:false},
 * 后端把状态存在 SystemConfig 兜底键 `plaza:product:${productId}`(不改 product.status,
 * 商家上下架与平台广场可见状态各自独立)。
 *
 * UI 乐观更新:点击后先把卡片 status 切到 offline,失败再回滚 + toast,
 * 避免用户看到"已下架"但实际仍在广场曝光的脱节状态。
 *
 * 仅 products tab 渲染下架按钮,因后端没有对应"下架厂家"接口;
 * 调用方(template / editItem)已保证此函数只在 products tab 触发。
 */
const togglingId = ref<string | null>(null)
async function offlineOne(item: PlazaItem) {
  if (tab.value !== 'products') return
  if (togglingId.value) return
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '下架商品',
      content: `确定要从选品广场下架「${item.name}」吗?\n下架后商家端选品广场将不再展示此商品,商家自身的商品库存/上架状态不受影响。`,
      confirmText: '确认下架',
      confirmColor: '#FF4D2D',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return
  togglingId.value = item.id
  const prevStatus = item.status
  // 乐观更新:列表里把卡片 status 改成 offline
  const idx = items.value.findIndex((x) => x.id === item.id)
  if (idx >= 0) items.value[idx] = { ...items.value[idx], status: 'offline' }
  try {
    await plazaService.setProductOnline(item.id, false)
    uni.showToast({ title: '已下架', icon: 'success' })
  } catch (e: any) {
    if (idx >= 0) items.value[idx] = { ...items.value[idx], status: prevStatus }
    uni.showToast({ title: e?.message || '下架失败,已回滚', icon: 'none' })
  } finally {
    togglingId.value = null
  }
}

/** 把已下架商品重新上架到选品广场(同接口反向). */
async function onlineOne(item: PlazaItem) {
  if (tab.value !== 'products') return
  if (togglingId.value) return
  togglingId.value = item.id
  const prevStatus = item.status
  const idx = items.value.findIndex((x) => x.id === item.id)
  if (idx >= 0) items.value[idx] = { ...items.value[idx], status: 'pushing' }
  try {
    await plazaService.setProductOnline(item.id, true)
    uni.showToast({ title: '已上架', icon: 'success' })
  } catch (e: any) {
    if (idx >= 0) items.value[idx] = { ...items.value[idx], status: prevStatus }
    uni.showToast({ title: e?.message || '上架失败,已回滚', icon: 'none' })
  } finally {
    togglingId.value = null
  }
}

/**
 * 卡片「编辑」按钮 —— 给出当前 Tab 下真实可用的快捷操作:
 *   - products: 复制商品 ID / 新建推送 / 切换上下架(广场可见性)
 *   - factories: 复制厂家 ID / 新建推送
 *   - records: 复制记录 ID(仅查看入口,详细操作走 admin-pc)
 * 不再出现「改位置/改标签」这种纯 toast 占位。
 */
function editItem(item: PlazaItem) {
  if (tab.value === 'products') {
    const isOnline = item.status === 'pushing' || item.status === 'active'
    const items_ = ['复制商品 ID', '新建推送', isOnline ? '从广场下架' : '上架到广场']
    uni.showActionSheet({
      itemList: items_,
      success: (r) => {
        if (r.tapIndex === 0) {
          uni.setClipboardData({
            data: item.id,
            success: () => uni.showToast({ title: 'ID 已复制', icon: 'success' }),
          })
        } else if (r.tapIndex === 1) {
          pushOne(item)
        } else if (r.tapIndex === 2) {
          if (isOnline) offlineOne(item)
          else onlineOne(item)
        }
      },
    })
    return
  }
  if (tab.value === 'factories') {
    uni.showActionSheet({
      itemList: ['复制厂家 ID', '新建推送'],
      success: (r) => {
        if (r.tapIndex === 0) {
          uni.setClipboardData({
            data: item.id,
            success: () => uni.showToast({ title: 'ID 已复制', icon: 'success' }),
          })
        } else if (r.tapIndex === 1) {
          pushOne(item)
        }
      },
    })
    return
  }
  // records tab
  uni.showActionSheet({
    itemList: ['复制记录 ID'],
    success: (r) => {
      if (r.tapIndex === 0) {
        uni.setClipboardData({
          data: item.id,
          success: () => uni.showToast({ title: 'ID 已复制', icon: 'success' }),
        })
      }
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
                  :style="{
                    color: statusMeta(x.status).tint,
                    background: statusMeta(x.status).tint + '14',
                  }"
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
            <!--
              动作按钮根据 tab + status 渲染,只在后端真实支持的组合上启用对应能力:

              products tab(后端有 setPlazaProductOnline 接口):
                - pushing/active → 下架(真接口,处理中禁点)
                - offline       → 上架(同接口反向) + 推送(创建广告位)
                - 其它          → 推送

              factories tab:
                - 推送(把厂家作为推送对象到 push 页)

              records tab:
                - 仅"编辑"按钮(代理申请记录是只读流水)
            -->
            <template v-if="tab === 'products'">
              <template v-if="x.status === 'offline'">
                <view
                  :class="['btn ghost', togglingId === x.id ? 'loading' : '']"
                  @click="onlineOne(x)"
                >
                  {{ togglingId === x.id ? '处理中…' : '上架' }}
                </view>
                <view class="btn primary" @click="pushOne(x)">推送</view>
              </template>
              <view
                v-else-if="x.status === 'pushing' || x.status === 'active'"
                :class="['btn dark', togglingId === x.id ? 'loading' : '']"
                @click="offlineOne(x)"
              >
                {{ togglingId === x.id ? '处理中…' : '下架' }}
              </view>
              <view v-else class="btn primary" @click="pushOne(x)">推送</view>
            </template>
            <view v-else-if="tab === 'factories'" class="btn primary" @click="pushOne(x)">
              推送
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

      <view style="height: 40rpx" />
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
  .s-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
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
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
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
  transition: all 0.2s;
  &.selected {
    border: 2rpx solid var(--brand-primary);
    background: rgba(255, 77, 45, 0.04);
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
    &.tone-accent {
      background: rgba(255, 77, 45, 0.1);
      color: var(--brand-primary);
    }
    &.tone-pop {
      background: linear-gradient(90deg, #fff4e5, #ffe4c7);
      color: #b25900;
    }
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
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
  &.dark {
    background: var(--text-primary);
    color: #fff;
  }
  &.loading {
    opacity: 0.6;
    pointer-events: none;
  }
}
</style>
