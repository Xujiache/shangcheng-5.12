<script setup lang="ts">
/**
 * MA-05 · 商品列表
 *
 * 搜索栏 + 状态 Tab + 批量选择 + 上下架/删除 + 商品卡
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { productService } from '../../../services/product'
import type { Product } from '@jiujiu/shared/types'
import Tabs from '../../../components/tabs/tabs.vue'
import ProductCard from '../../../components/product-card/product-card.vue'
import EmptyState from '../../../components/empty-state/empty-state.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'
import { useHideNativeTabBar } from '../../../composables/useHideNativeTabBar'

useHideNativeTabBar()

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

// 批量
const batchMode = ref(false)
const selected = ref<Set<string>>(new Set())
const allSelected = computed(() => list.value.length > 0 && list.value.every((p) => selected.value.has(p.id)))

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

function onSearch() {
  load(true)
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
  uni.showToast({ title: '已上架' })
  toggleBatch()
  load(true)
}
async function batchOffline() {
  if (selected.value.size === 0) return
  await productService.batchOffline(Array.from(selected.value))
  uni.showToast({ title: '已下架' })
  toggleBatch()
  load(true)
}
function batchRemove() {
  if (selected.value.size === 0) return
  uni.showModal({
    title: '删除商品',
    content: `确定删除 ${selected.value.size} 件商品？`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (r.confirm) {
        await productService.batchDelete(Array.from(selected.value))
        uni.showToast({ title: '已删除' })
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
  uni.showActionSheet({
    itemList: [
      isActive ? '下架商品' : '上架商品',
      '复制链接',
      '分享商品',
      '查看数据',
      '删除商品',
    ],
    success: async (res) => {
      if (res.tapIndex === 0) {
        if (isActive) await productService.batchOffline([p.id])
        else await productService.batchOnline([p.id])
        uni.showToast({ title: isActive ? '已下架' : '已上架', icon: 'success' })
        load(true)
      } else if (res.tapIndex === 4) {
        uni.showModal({
          title: '删除商品',
          content: `确定删除「${p.name}」？`,
          confirmColor: '#FF3B30',
          success: async (r) => {
            if (r.confirm) {
              await productService.batchDelete([p.id])
              uni.showToast({ title: '已删除', icon: 'success' })
              load(true)
            }
          },
        })
      } else {
        uni.showToast({ title: ['', '链接已复制', '分享中', '查看数据'][res.tapIndex] || '操作', icon: 'none' })
      }
    },
  })
}

function statusOf(p: Product) {
  const map: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
    active: { text: '在售', tone: 'success' },
    offline: { text: '已下架', tone: 'default' },
    auditing: { text: '审核中', tone: 'warning' },
    rejected: { text: '已驳回', tone: 'error' },
    draft: { text: '草稿', tone: 'info' },
  }
  return map[p.status] ?? map.draft
}

onMounted(() => load(true))
onShow(() => {
  if (list.value.length > 0) load(true)
})
</script>

<template>
  <view class="page">
    <!-- 顶部固定区 -->
    <view class="header">
      <view class="search-row">
        <view class="search-wrap">
          <Icon name="search" :size="32" color="var(--text-tertiary)" />
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索商品名 / 编号"
            confirm-type="search"
            @confirm="onSearch"
          />
          <view v-if="keyword" class="clear" @click="keyword = ''; onSearch()">
            <Icon name="close" :size="24" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="add-btn" @click="goAdd">
          <Icon name="plus" :size="36" color="#fff" />
        </view>
      </view>
      <Tabs
        v-model="status"
        :items="TABS"
        variant="underline"
        class="status-tabs"
        @change="onTabChange"
      />
      <view class="action-row">
        <view class="action-links">
          <view class="link" @click="goCategory">
            <Icon name="filter" :size="24" color="var(--brand-primary)" />
            <text>分类管理</text>
          </view>
          <view class="link" @click="goAgencyList">
            <Icon name="biz-plaza" :size="24" color="var(--brand-primary)" />
            <text>代理商品</text>
          </view>
          <view class="link" @click="goPriceRule">
            <Icon name="tag" :size="24" color="var(--brand-primary)" />
            <text>价格规则</text>
          </view>
        </view>
        <text class="link link-text" @click="toggleBatch">{{ batchMode ? '取消批量' : '批量操作' }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="list">
      <view v-for="p in list" :key="p.id" class="list-item">
        <ProductCard
          :image="p.images[0]"
          :name="p.name"
          :sku="p.id.slice(-6).toUpperCase()"
          :price="p.priceRetailMin"
          price-tier="retail"
          :stock="p.totalStock"
          :status-text="statusOf(p).text"
          :status-tone="statusOf(p).tone"
          :selectable="batchMode"
          :selected="selected.has(p.id)"
          @click="goDetail(p)"
          @toggle="toggle(p.id)"
        >
          <template #action>
            <view class="card-tags">
              <text v-for="t in p.tags" :key="t" class="card-tag">{{ t }}</text>
              <text class="card-sales">销量 {{ p.sales }}</text>
            </view>
            <view v-if="!batchMode" class="card-actions" @click.stop>
              <view class="card-btn edit" @click="editProduct(p, $event)">
                <Icon name="edit" :size="22" color="var(--brand-primary)" />
                <text>编辑</text>
              </view>
              <view class="card-btn more" @click="moreActions(p, $event)">
                <Icon name="more-h" :size="22" color="var(--text-secondary)" />
                <text>更多</text>
              </view>
            </view>
          </template>
        </ProductCard>
      </view>
      <EmptyState v-if="!loading && list.length === 0" title="暂无商品" desc="点击右上角 ＋ 添加" />
      <view v-if="hasMore && list.length > 0" class="loadmore" @click="page++; load()">
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

    <view class="safe-bottom" />

    <TabBar current="product" />
  </view>
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
  padding: 16rpx 24rpx 0;
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
  box-shadow: 0 4rpx 12rpx rgba(255,77,45,0.4);
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
  .link-text { font-size: 24rpx; color: var(--brand-primary); }
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
    background: var(--brand-primary-ghost, rgba(255,77,45,0.08));
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
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.06);
  gap: 16rpx;
  .select-all {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    .check { color: var(--brand-primary); font-size: 32rpx; }
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
    &.online { background: var(--status-success-bg); color: var(--status-success); }
    &.offline { background: var(--bg-hover); color: var(--text-secondary); }
    &.danger { background: var(--status-error); color: #fff; }
  }
}
.safe-bottom { height: 40rpx; }
</style>
