<script setup lang="ts">
/**
 * UM-商品列表 · 全分类 / 关键词 / 商家维度
 *
 * 入口：
 *   - /pages/product/list?categoryId=xxx       分类页"查看全部"
 *   - /pages/product/list?keyword=xxx          搜索结果"看更多"
 *   - /pages/product/list?merchantId=xxx       商家主页"全部商品"
 *   - /pages/product/list?sort=sales           榜单页"按销量看更多"
 *
 * 行为：
 *   - 下拉刷新（uni.onPullDownRefresh + 自定义 stop）
 *   - 上拉加载更多
 *   - 切换排序 chip 时 reset 重拉
 *   - 卡片样式与首页瀑布流一致（左右两列）
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { productService, favoriteService } from '../../services'
import type { ProductListParams } from '../../services'
import type { Product } from '@jiujiu/shared/types'
import { useUserStore } from '../../store/user'
import { useCartStore } from '../../store/cart'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

type SortKey = 'newest' | 'sales' | 'price-asc' | 'price-desc'

const userStore = useUserStore()
const cartStore = useCartStore()

const products = ref<Product[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const PAGE_SIZE = 16

const categoryId = ref('')
const merchantId = ref('')
const keyword = ref('')
const title = ref('商品列表')
const sort = ref<SortKey>('newest')

const favoriteRowMap = ref<Map<string, string>>(new Map())
const favoriteIds = computed(() => new Set(favoriteRowMap.value.keys()))

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: '最新' },
  { key: 'sales', label: '销量' },
  { key: 'price-asc', label: '价格 ↑' },
  { key: 'price-desc', label: '价格 ↓' },
]

onLoad((options: any) => {
  categoryId.value = (options?.categoryId || '').toString()
  merchantId.value = (options?.merchantId || '').toString()
  keyword.value = (options?.keyword ? decodeURIComponent(options.keyword) : '').toString()
  const s = options?.sort as SortKey | undefined
  if (s && SORTS.find((x) => x.key === s)) sort.value = s

  if (keyword.value) title.value = `搜索：${keyword.value}`
  else if (categoryId.value) title.value = '分类商品'
  else if (merchantId.value) title.value = '店铺全部商品'
  else title.value = '商品列表'
  uni.setNavigationBarTitle({ title: title.value })
})

async function loadFavorites() {
  if (!userStore.isLogin) {
    favoriteRowMap.value = new Map()
    return
  }
  try {
    const list = await favoriteService.list()
    const m = new Map<string, string>()
    for (const f of list || []) m.set(f.productId, f.id)
    favoriteRowMap.value = m
  } catch {
    /* 拉失败不阻塞列表渲染 */
  }
}

function buildParams(p: number): ProductListParams {
  return {
    page: p,
    pageSize: PAGE_SIZE,
    keyword: keyword.value || undefined,
    categoryId: categoryId.value || undefined,
    merchantId: merchantId.value || undefined,
    sort: sort.value,
  }
}

/**
 * 加载列表。
 *
 * 排序参数直接传后端 `sort`（newest/sales/price-asc/price-desc），后端已统一支持。
 * 删除了原本的 `applyClientSort` 兜底：分页场景下客户端排序只能在「当前已加载页」
 * 内排，会出现"第 1 页按销量降序，第 2 页加载后又乱掉"的体验，比不排还糟。
 */
async function load(reset = true) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 1
    hasMore.value = true
    products.value = []
  }
  try {
    const res = await productService.list(buildParams(page.value))
    const list = res.list ?? []
    products.value = reset ? list : [...products.value, ...list]
    hasMore.value = res.hasMore ?? list.length >= PAGE_SIZE
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  loadingMore.value = true
  try {
    page.value += 1
    const res = await productService.list(buildParams(page.value))
    if ((res.list?.length ?? 0) > 0) {
      products.value = [...products.value, ...res.list]
    }
    hasMore.value = res.hasMore ?? (res.list?.length ?? 0) >= PAGE_SIZE
  } catch (e: any) {
    page.value = Math.max(1, page.value - 1)
    uni.showToast({ title: e?.message || '加载更多失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function switchSort(key: SortKey) {
  if (sort.value === key) return
  sort.value = key
  load(true)
}

function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` })
}

async function onAddCart(p: Product) {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  try {
    uni.showLoading({ title: '加购中…', mask: true })
    const detail = await productService.detail(p.id, { silent: true })
    const firstSku = detail?.skus?.[0]
    if (!firstSku?.id) {
      uni.hideLoading()
      uni.showToast({ title: '该商品暂无可用规格', icon: 'none' })
      return
    }
    await cartStore.addCart({
      productId: p.id,
      skuId: firstSku.id,
      name: p.name,
      spec: firstSku.specsLabel || '默认规格',
      image: p.images?.[0] ?? '',
      price: Number(firstSku.priceRetail ?? p.priceRetailMin) || p.priceRetailMin,
    })
    uni.hideLoading()
    uni.showToast({
      title: (detail?.skus?.length ?? 0) > 1 ? '已按默认规格加购，可在详情页切换' : '已加入购物车',
      icon: (detail?.skus?.length ?? 0) > 1 ? 'none' : 'success',
      duration: 1500,
    })
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '加购失败', icon: 'none' })
  }
}

async function toggleFavorite(p: Product, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  const m = new Map(favoriteRowMap.value)
  const existingRow = m.get(p.id)
  if (existingRow) {
    m.delete(p.id)
    favoriteRowMap.value = m
    try {
      await favoriteService.remove(existingRow)
      uni.showToast({ title: '已取消收藏', icon: 'none', duration: 1000 })
    } catch (err: any) {
      m.set(p.id, existingRow)
      favoriteRowMap.value = new Map(m)
      uni.showToast({ title: err?.message || '取消收藏失败', icon: 'none' })
    }
  } else {
    m.set(p.id, '__pending__')
    favoriteRowMap.value = m
    try {
      await favoriteService.add(p.id)
      uni.showToast({ title: '已收藏', icon: 'success', duration: 1000 })
      await loadFavorites()
    } catch (err: any) {
      m.delete(p.id)
      favoriteRowMap.value = new Map(m)
      uni.showToast({ title: err?.message || '收藏失败', icon: 'none' })
    }
  }
}
function isFavorited(p: Product): boolean {
  return favoriteIds.value.has(p.id)
}

function priceVisibleOf(p: Product): boolean {
  if (userStore.isLogin) return true
  return !!p.priceDisplayRules?.guestVisible
}

function imgHeightOf(i: number): number {
  const variants = [300, 360, 280, 340, 300, 380]
  return variants[i % variants.length]
}

const colLeft = computed(() => products.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => products.value.filter((_, i) => i % 2 === 1))

onMounted(() => {
  load()
  loadFavorites()
})

onPullDownRefresh(async () => {
  await load(true)
  await loadFavorites()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  loadMore()
})
</script>

<template>
  <view class="page">
    <NavBar :title="title" />

    <view class="filter-bar">
      <view
        v-for="s in SORTS"
        :key="s.key"
        :class="['chip', sort === s.key ? 'active' : '']"
        @click="switchSort(s.key)"
        >{{ s.label }}</view
      >
      <view class="grow" />
      <view class="count" v-if="!loading">共 {{ products.length }} 件</view>
    </view>

    <view v-if="loading && products.length === 0" class="state-loading">
      <text>加载中…</text>
    </view>

    <view v-else-if="!loading && products.length === 0" class="empty-wrap">
      <EmptyState title="暂无商品" desc="换个分类或关键词试试" icon="package" />
    </view>

    <view v-else class="waterfall">
      <view class="col">
        <view v-for="(p, i) in colLeft" :key="p.id" class="wf-card" @click="goDetail(p)">
          <view class="wf-img-wrap">
            <image
              :src="p.images?.[0]"
              mode="aspectFill"
              class="wf-img"
              :style="{ height: imgHeightOf(i * 2) + 'rpx' }"
            />
            <view
              class="wf-fav"
              :class="{ active: isFavorited(p) }"
              @click.stop="toggleFavorite(p, $event)"
            >
              <Icon
                name="heart"
                :size="26"
                :color="isFavorited(p) ? '#FF3B30' : '#fff'"
                :fill="isFavorited(p)"
                :stroke="2"
              />
            </view>
          </view>
          <view class="wf-info">
            <text class="wf-name">{{ p.name }}</text>
            <view class="wf-row">
              <text v-if="priceVisibleOf(p)" class="wf-price">¥ {{ p.priceRetailMin }}</text>
              <view v-else class="wf-locked">
                <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                <text>登录可见</text>
              </view>
              <view class="wf-add" @click.stop="onAddCart(p)">
                <Icon name="plus" :size="24" color="#fff" />
              </view>
            </view>
            <view class="wf-meta">
              <text>已售 {{ p.sales }}</text>
              <view class="wf-tag" v-if="p.tags?.[0]">{{ p.tags[0] }}</view>
            </view>
          </view>
        </view>
      </view>
      <view class="col">
        <view v-for="(p, i) in colRight" :key="p.id" class="wf-card" @click="goDetail(p)">
          <view class="wf-img-wrap">
            <image
              :src="p.images?.[0]"
              mode="aspectFill"
              class="wf-img"
              :style="{ height: imgHeightOf(i * 2 + 1) + 'rpx' }"
            />
            <view
              class="wf-fav"
              :class="{ active: isFavorited(p) }"
              @click.stop="toggleFavorite(p, $event)"
            >
              <Icon
                name="heart"
                :size="26"
                :color="isFavorited(p) ? '#FF3B30' : '#fff'"
                :fill="isFavorited(p)"
                :stroke="2"
              />
            </view>
          </view>
          <view class="wf-info">
            <text class="wf-name">{{ p.name }}</text>
            <view class="wf-row">
              <text v-if="priceVisibleOf(p)" class="wf-price">¥ {{ p.priceRetailMin }}</text>
              <view v-else class="wf-locked">
                <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                <text>登录可见</text>
              </view>
              <view class="wf-add" @click.stop="onAddCart(p)">
                <Icon name="plus" :size="24" color="#fff" />
              </view>
            </view>
            <view class="wf-meta">
              <text>已售 {{ p.sales }}</text>
              <view class="wf-tag" v-if="p.tags?.[0]">{{ p.tags[0] }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-tip">
      <text v-if="loadingMore">加载中…</text>
      <text v-else-if="!hasMore && products.length > 0">— 已经到底了 —</text>
      <text v-else-if="hasMore && products.length > 0">上拉加载更多</text>
    </view>
    <view style="height: 40rpx" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 9;
  .grow {
    flex: 1;
  }
  .count {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: $font-family-base;
  }
}
.chip {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
  background: var(--bg-page);
  &.active {
    background: $brand-gradient;
    color: #fff;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}

.state-loading {
  padding: 80rpx 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 24rpx;
}
.empty-wrap {
  padding: 40rpx 0;
}

.waterfall {
  padding: 16rpx 16rpx 0;
  display: flex;
  gap: 12rpx;
  .col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }
}
.wf-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
}
.wf-img-wrap {
  position: relative;
}
.wf-img {
  width: 100%;
  display: block;
  background: var(--bg-page);
}
.wf-fav {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4rpx);
  &.active {
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 2rpx 8rpx rgba(255, 59, 48, 0.3);
  }
}
.wf-info {
  padding: 12rpx 16rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .wf-name {
    font-size: 24rpx;
    color: var(--text-primary);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 64rpx;
  }
}
.wf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4rpx;
  .wf-price {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: $font-family-base;
  }
  .wf-locked {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 12rpx;
    background: var(--bg-hover);
    border-radius: 999rpx;
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .wf-add {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: $brand-gradient;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
.wf-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 20rpx;
  color: var(--text-tertiary);
  .wf-tag {
    padding: 2rpx 10rpx;
    border: 1rpx solid var(--brand-primary);
    color: var(--brand-primary);
    border-radius: 999rpx;
    font-size: 18rpx;
  }
}
.bottom-tip {
  text-align: center;
  font-size: 22rpx;
  color: var(--text-tertiary);
  padding: 24rpx 0;
}
</style>
