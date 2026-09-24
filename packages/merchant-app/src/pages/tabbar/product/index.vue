<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
/**
 * MA-05 · 商品列表
 *
 * 搜索栏 + 状态 Tab + 批量选择 + 上下架/删除 + 商品卡
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { productService } from '../../../services/product'
import type { Product } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import { useStatusBar } from '../../../composables/useStatusBar'
import { consumeTabFilterIntent } from '../../../utils/tab-nav'

const { heroPaddingTop } = useStatusBar(16)

type Status = 'all' | 'active' | 'offline' | 'auditing' | 'rejected'

const status = ref<Status>('all')
const keyword = ref('')
const list = ref<Product[]>([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)

const TABS = computed(() => [
  { key: 'all' as Status, label: '全部', badge: total.value },
  { key: 'active' as Status, label: '在售' },
  { key: 'offline' as Status, label: '已下架' },
  { key: 'auditing' as Status, label: '审核中' },
  { key: 'rejected' as Status, label: '已驳回' },
])
const STATUS_OPTIONS = computed(() =>
  TABS.value.map((item) => ({
    value: item.key,
    payload: {
      label: item.key === 'all' && item.badge ? `${item.label} ${item.badge}` : item.label,
    },
  })),
)

// 批量
const batchMode = ref(false)
const selected = ref<Set<string>>(new Set())
const allSelected = computed(
  () => list.value.length > 0 && list.value.every((p) => selected.value.has(p.id)),
)

async function load(reset = false) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 1
    list.value = []
    hasMore.value = true
  }
  try {
    const data = await productService.list({
      page: page.value,
      pageSize: 20,
      status: status.value === 'all' ? undefined : status.value,
      keyword: keyword.value || undefined,
    })
    list.value = reset ? data.list : [...list.value, ...data.list]
    total.value = data.total
    hasMore.value = data.list.length === 20 && list.value.length < data.total
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  load(true)
}

function onStatusChange(value: string | number) {
  status.value = String(value) as Status
  onTabChange()
}

function onSearch() {
  load(true)
}

function clearSearch() {
  keyword.value = ''
  onSearch()
}

function loadMore() {
  page.value += 1
  load()
}

function applyTabIntent(): boolean {
  const next = consumeTabFilterIntent('product') as Status | null
  const allowed: Status[] = ['all', 'active', 'offline', 'auditing', 'rejected']
  if (!next || !allowed.includes(next)) return false
  status.value = next
  return true
}

function toggleBatch() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) selected.value.clear()
}

function toggle(id: string) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selected.value = s
}

function selectAll() {
  if (allSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(list.value.map((p) => p.id))
  }
}

async function batchOnline() {
  if (selected.value.size === 0) return
  await productService.batchOnline(Array.from(selected.value))
  appFeedback.showToast({ title: '已上架' })
  toggleBatch()
  load(true)
}
async function batchOffline() {
  if (selected.value.size === 0) return
  await productService.batchOffline(Array.from(selected.value))
  appFeedback.showToast({ title: '已下架' })
  toggleBatch()
  load(true)
}
function batchRemove() {
  if (selected.value.size === 0) return
  appFeedback.showModal({
    title: '删除商品',
    content: `确定删除 ${selected.value.size} 件商品？`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (r.confirm) {
        await productService.batchDelete(Array.from(selected.value))
        appFeedback.showToast({ title: '已删除' })
        toggleBatch()
        load(true)
      }
    },
  })
}

function goAdd() {
  uni.navigateTo({ url: '/pages/product/add' })
}
function goCategory() {
  uni.navigateTo({ url: '/pages/product/category' })
}
function goAgencyList() {
  uni.navigateTo({ url: '/pages/product/agency-list' })
}
function goPriceRule() {
  uni.navigateTo({ url: '/pages/shop/price-rule' })
}
function goDetail(p: Product) {
  if (batchMode.value) {
    toggle(p.id)
    return
  }
  uni.navigateTo({ url: `/pages/product/add?id=${p.id}` })
}
function editProduct(p: Product, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  uni.navigateTo({ url: `/pages/product/add?id=${p.id}` })
}
function moreActions(p: Product, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  const isActive = p.status === 'active'
  appFeedback.showActionSheet({
    itemList: [isActive ? '下架商品' : '上架商品', '复制链接', '分享商品', '查看数据', '删除商品'],
    success: async (res) => {
      if (res.tapIndex === 0) {
        if (isActive) await productService.batchOffline([p.id])
        else await productService.batchOnline([p.id])
        appFeedback.showToast({ title: isActive ? '已下架' : '已上架', icon: 'success' })
        load(true)
      } else if (res.tapIndex === 4) {
        appFeedback.showModal({
          title: '删除商品',
          content: `确定删除「${p.name}」？`,
          confirmColor: '#FF3B30',
          success: async (r) => {
            if (r.confirm) {
              await productService.batchDelete([p.id])
              appFeedback.showToast({ title: '已删除', icon: 'success' })
              load(true)
            }
          },
        })
      } else {
        appFeedback.showToast({
          title: ['', '链接已复制', '分享中', '查看数据'][res.tapIndex] || '操作',
          icon: 'none',
        })
      }
    },
  })
}

function statusOf(p: Product) {
  const map: Record<
    string,
    { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }
  > = {
    active: { text: '在售', tone: 'success' },
    offline: { text: '已下架', tone: 'default' },
    auditing: { text: '审核中', tone: 'warning' },
    rejected: { text: '已驳回', tone: 'error' },
    draft: { text: '草稿', tone: 'info' },
  }
  return map[p.status] ?? map.draft
}

onMounted(() => {
  applyTabIntent()
  load(true)
})
onShow(() => {
  const changedByIntent = applyTabIntent()
  if (changedByIntent || list.value.length > 0) load(true)
})
</script>

<template>
  <wd-config-provider
    :theme="$jwTheme.resolvedTheme"
    :theme-vars="$jwTheme.themeVars"
    custom-class="jw-theme-root"
  >
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />
    <view class="page">
      <!--
      固定导航优先挂载，避免商品异步列表插入大量节点后 App-vue 的事件映射发生偏移。
      底部空间由页面末尾的 primary-nav-spacer 单独预留。
    -->
      <PrimaryLiquidTabBar flavor="merchant" active="product" :reserve-space="false" />

      <!-- 顶部固定区 -->
      <view class="header" :style="{ paddingTop: heroPaddingTop }">
        <view class="search-row">
          <view class="search-wrap">
            <wd-icon :name="$jwIcon('search')" size="16px" color="var(--text-tertiary)" />
            <wd-input
              no-border
              v-model="keyword"
              class="search-input"
              placeholder="搜索商品名 / 编号"
              confirm-type="search"
              @confirm="onSearch"
            />
            <view v-if="keyword" class="clear" @click="clearSearch">
              <wd-icon :name="$jwIcon('close')" size="12px" color="var(--text-tertiary)" />
            </view>
          </view>
          <view class="add-btn" @click="goAdd">
            <wd-icon :name="$jwIcon('plus')" size="18px" color="#fff" />
          </view>
        </view>
        <wd-segmented
          :value="status"
          :options="STATUS_OPTIONS"
          class="status-tabs"
          size="small"
          @change="onStatusChange($event.value)"
        >
          <template #label="{ option }">{{ option.payload?.label }}</template>
        </wd-segmented>
        <view class="action-row">
          <view class="action-links">
            <view class="link" @click="goCategory">
              <wd-icon :name="$jwIcon('filter')" size="12px" color="var(--brand-primary)" />
              <text>分类管理</text>
            </view>
            <view class="link" @click="goAgencyList">
              <wd-icon :name="$jwIcon('biz-plaza')" size="12px" color="var(--brand-primary)" />
              <text>代理商品</text>
            </view>
            <view class="link" @click="goPriceRule">
              <wd-icon :name="$jwIcon('tag')" size="12px" color="var(--brand-primary)" />
              <text>价格规则</text>
            </view>
          </view>
          <text class="link link-text" @click="toggleBatch">{{
            batchMode ? '取消批量' : '批量操作'
          }}</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="list">
        <wd-card v-for="p in list" :key="p.id" custom-class="product-card" @click="goDetail(p)">
          <view class="product-main">
            <wd-checkbox
              v-if="batchMode"
              :model-value="selected.has(p.id)"
              shape="circle"
              @click.stop="toggle(p.id)"
            />
            <wd-img
              :src="p.images[0]"
              width="160rpx"
              height="160rpx"
              radius="12rpx"
              mode="aspectFill"
              enable-preview
            />
            <view class="product-info">
              <view class="product-head">
                <text class="product-name">{{ p.name }}</text>
                <wd-tag :type="$jwTagType(statusOf(p).tone)" plain round>{{
                  statusOf(p).text
                }}</wd-tag>
              </view>
              <text class="product-sku">编号 {{ p.id.slice(-6).toUpperCase() }}</text>
              <view class="product-price-row">
                <text class="product-price">{{ formatPrice(p.priceRetailMin) }}</text>
                <text class="product-stock">库存 {{ p.totalStock }}</text>
              </view>
              <view class="card-tags">
                <wd-tag v-for="t in p.tags" :key="t" type="primary" plain>{{ t }}</wd-tag>
                <text class="card-sales">销量 {{ p.sales }}</text>
              </view>
            </view>
          </view>
          <template v-if="!batchMode" #footer>
            <view class="card-actions" @click.stop>
              <wd-button size="small" plain icon="edit" @click="editProduct(p, $event)"
                >编辑</wd-button
              >
              <wd-button size="small" plain icon="more" @click="moreActions(p, $event)"
                >更多</wd-button
              >
            </view>
          </template>
        </wd-card>
        <wd-status-tip
          v-if="!loading && list.length === 0"
          image="content"
          :tip="['暂无商品', '点击右上角 ＋ 添加'].filter(Boolean).join(' · ')"
        />
        <view v-if="hasMore && list.length > 0" class="loadmore" @click="loadMore">
          <text>加载更多 ›</text>
        </view>
        <view v-else-if="list.length > 0" class="end">— 没有更多了 —</view>
      </view>

      <!-- 批量操作栏 -->
      <view v-if="batchMode" class="batch-bar">
        <view class="select-all" @click="selectAll">
          <text class="check">{{ allSelected ? '●' : '○' }}</text>
          <text>全选 ({{ selected.size }})</text>
        </view>
        <view class="batch-actions">
          <view class="batch-btn online" @click="batchOnline">上架</view>
          <view class="batch-btn offline" @click="batchOffline">下架</view>
          <view class="batch-btn danger" @click="batchRemove">删除</view>
        </view>
      </view>

      <view class="primary-nav-spacer" />
    </view>
  </wd-config-provider>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 120rpx;
}
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-card);
  /* padding-top 由内联 heroPaddingTop 注入（状态栏 + 16rpx） */
  padding: 0 24rpx 0;
  box-shadow: var(--shadow-sm);
}
.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.search-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  padding: 0 16rpx 0 20rpx;
  height: 72rpx;
  .search-input {
    flex: 1;
    height: 100%;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .clear {
    padding: 4rpx;
  }
}
.add-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 40rpx;
  font-weight: 700;
  text-align: center;
  line-height: 72rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 77, 45, 0.4);
}
.status-tabs {
  margin-top: 8rpx;
  border-bottom: 1rpx solid var(--border-light);
}
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  .action-links {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }
  .link {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 24rpx;
    color: var(--brand-primary);
  }
  .link-text {
    font-size: 24rpx;
    color: var(--brand-primary);
  }
}
.card-actions {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}
.card-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  &.edit {
    background: var(--brand-primary-ghost, rgba(255, 77, 45, 0.08));
    color: var(--brand-primary);
  }
  &.more {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
}
.list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
:deep(.product-card) {
  margin: 0;
  border: 1rpx solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}
.product-main,
.product-head,
.product-price-row {
  display: flex;
  align-items: center;
}
.product-main {
  align-items: flex-start;
  gap: 16rpx;
}
.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.product-head,
.product-price-row {
  justify-content: space-between;
  gap: 12rpx;
}
.product-name {
  min-width: 0;
  flex: 1;
  color: var(--text-primary);
  font-size: 27rpx;
  font-weight: 600;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.product-sku,
.product-stock {
  color: var(--text-tertiary);
  font-size: 22rpx;
}
.product-price {
  color: var(--price-retail);
  font-size: 32rpx;
  font-weight: 700;
}
.card-tags {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: center;
  .card-tag {
    padding: 2rpx 8rpx;
    background: var(--brand-primary-ghost);
    color: var(--brand-primary);
    font-size: 18rpx;
    border-radius: 6rpx;
  }
  .card-sales {
    margin-left: auto;
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.loadmore {
  padding: 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--brand-primary);
}
.end {
  padding: 24rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(80px + env(safe-area-inset-bottom));
  z-index: 700;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.06);
  gap: 16rpx;
  .select-all {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    .check {
      color: var(--brand-primary);
      font-size: 32rpx;
    }
  }
  .batch-actions {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    gap: 12rpx;
  }
  .batch-btn {
    padding: 12rpx 24rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    font-weight: 600;
    &.online {
      background: var(--status-success-bg);
      color: var(--status-success);
    }
    &.offline {
      background: var(--bg-hover);
      color: var(--text-secondary);
    }
    &.danger {
      background: var(--status-error);
      color: #fff;
    }
  }
}
.primary-nav-spacer {
  height: calc(80px + env(safe-area-inset-bottom));
  pointer-events: none;
}
</style>
