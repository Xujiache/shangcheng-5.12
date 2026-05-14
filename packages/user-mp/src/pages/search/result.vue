<script setup lang="ts">
/**
 * 搜索结果页
 *
 * - 顶部搜索框（仍可改词重搜）+ 商品/店铺 Tab
 * - 商品 tab：两列瀑布流（复用首页/分类页同款 wf-card）
 * - 店铺 tab：店铺卡片列表
 * - 下拉加载下一页
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productService, shopService } from '../../services'
import type { Product } from '@jiujiu/shared/types'
import type { SearchShop } from '../../services'
import Icon from '../../components/icon/icon.vue'

type Tab = 'product' | 'shop'

const keyword = ref('')
const tab = ref<Tab>('product')

const products = ref<Product[]>([])
const shops = ref<SearchShop[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const PAGE_SIZE = 12

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

async function search(reset = true) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    hasMore.value = true
    if (tab.value === 'product') products.value = []
    else shops.value = []
  }
  loading.value = true
  try {
    if (tab.value === 'product') {
      const result = await productService.list({
        keyword: keyword.value,
        page: page.value,
        pageSize: PAGE_SIZE,
      })
      products.value = reset ? result.list : [...products.value, ...result.list]
      // 优先用后端 hasMore；后端没返时按本页数量兜底判断
      hasMore.value = result.hasMore ?? (result.list?.length ?? 0) >= PAGE_SIZE
    } else {
      const result = await shopService.search({
        keyword: keyword.value,
        page: page.value,
        pageSize: PAGE_SIZE,
      })
      shops.value = reset ? result.list : [...shops.value, ...result.list]
      hasMore.value = result.hasMore ?? (result.list?.length ?? 0) >= PAGE_SIZE
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '搜索失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  await search(false)
}

function changeTab(t: Tab) {
  if (tab.value === t) return
  tab.value = t
  search(true)
}

function back() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/tabbar/home/index' }) })
}

function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` })
}

function goShop(s: SearchShop) {
  // 厂家详情用商家端的；用户端简化：弹该厂家的商品列表，跳商品搜索
  uni.navigateTo({ url: `/pages/search/result?keyword=${encodeURIComponent(s.name)}&tab=product` })
}

function imgHeightOf(i: number): number {
  const variants = [280, 360, 240, 320, 300, 360]
  return variants[i % variants.length]
}

const colLeft = computed(() => products.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => products.value.filter((_, i) => i % 2 === 1))

onLoad((opts) => {
  const o = (opts || {}) as { keyword?: string; tab?: string }
  keyword.value = decodeURIComponent(o.keyword || '')
  tab.value = (o.tab === 'shop' ? 'shop' : 'product') as Tab
})

onMounted(() => {
  if (keyword.value) search(true)
})
</script>

<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight }" />

    <view class="search-bar">
      <view class="back" @click="back">
        <Icon name="chevron-left" :size="36" color="#1d2129" />
      </view>
      <view class="input-wrap">
        <Icon name="search" :size="28" color="#86909c" />
        <input
          v-model="keyword"
          class="input"
          placeholder="搜索商品 / 店铺"
          placeholder-class="ph"
          confirm-type="search"
          @confirm="search(true)"
        />
        <view v-if="keyword" class="clear" @click="keyword = ''">
          <Icon name="close-circle" :size="28" color="#c9cdd4" :fill="true" />
        </view>
      </view>
      <view class="search-btn" @click="search(true)">搜索</view>
    </view>

    <view class="tabs">
      <view :class="['tab', tab === 'product' && 'active']" @click="changeTab('product')">
        <text>商品</text>
        <view v-if="tab === 'product'" class="indicator" />
      </view>
      <view :class="['tab', tab === 'shop' && 'active']" @click="changeTab('shop')">
        <text>店铺</text>
        <view v-if="tab === 'shop'" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" @scrolltolower="loadMore" :lower-threshold="200">
      <!-- 商品 tab：两列瀑布流 -->
      <view v-if="tab === 'product'">
        <view v-if="!loading && products.length === 0" class="empty">
          <text>未找到相关商品</text>
          <text class="empty-sub">换个关键词试试</text>
        </view>
        <view v-else class="waterfall">
          <view class="col">
            <view v-for="(p, i) in colLeft" :key="p.id" class="wf-card" @click="goDetail(p)">
              <image
                :src="p.images?.[0]"
                mode="aspectFill"
                class="wf-img"
                :style="{ height: imgHeightOf(i * 2) + 'rpx' }"
              />
              <view class="wf-info">
                <text class="wf-name">{{ p.name }}</text>
                <text class="wf-price">¥{{ p.priceRetailMin }}</text>
              </view>
            </view>
          </view>
          <view class="col">
            <view v-for="(p, i) in colRight" :key="p.id" class="wf-card" @click="goDetail(p)">
              <image
                :src="p.images?.[0]"
                mode="aspectFill"
                class="wf-img"
                :style="{ height: imgHeightOf(i * 2 + 1) + 'rpx' }"
              />
              <view class="wf-info">
                <text class="wf-name">{{ p.name }}</text>
                <text class="wf-price">¥{{ p.priceRetailMin }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 店铺 tab -->
      <view v-else>
        <view v-if="!loading && shops.length === 0" class="empty">
          <text>未找到相关店铺</text>
          <text class="empty-sub">换个关键词试试</text>
        </view>
        <view v-else class="shop-list">
          <view v-for="s in shops" :key="s.id" class="shop-card" @click="goShop(s)">
            <view class="shop-logo">
              <text>{{ s.name.charAt(0) }}</text>
            </view>
            <view class="shop-info">
              <view class="shop-name-row">
                <text class="shop-name">{{ s.name }}</text>
                <view class="shop-type" :class="s.type">
                  {{ s.type === 'factory' ? '厂家' : '门店' }}
                </view>
              </view>
              <view class="shop-meta">
                <Icon name="location" :size="22" color="#86909c" />
                <text>{{ s.region }}</text>
              </view>
              <view class="shop-cats" v-if="s.categories?.length">
                <text v-for="c in s.categories.slice(0, 3)" :key="c" class="cat-tag">
                  {{ c }}
                </text>
              </view>
            </view>
            <Icon name="chevron-right" :size="28" color="#c9cdd4" />
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="loadmore">加载中…</view>
      <view v-else-if="!hasMore && (products.length > 0 || shops.length > 0)" class="loadmore"
        >没有更多了</view
      >
      <view style="height: 32rpx" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}
.status {
  background: #fff;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  .back {
    width: 56rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10rpx;
    height: 64rpx;
    padding: 0 20rpx;
    background: #f5f6f8;
    border-radius: 999rpx;
    .input {
      flex: 1;
      height: 100%;
      font-size: 28rpx;
      color: #1d2129;
    }
    .ph {
      color: #c9cdd4;
    }
    .clear {
      display: flex;
      align-items: center;
      padding: 4rpx;
    }
  }
  .search-btn {
    padding: 0 16rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 28rpx;
    color: #ff4d2d;
    font-weight: 600;
  }
}
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #f2f3f5;
}
.tab {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #86909c;
  position: relative;
  &.active {
    color: #ff4d2d;
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 56rpx;
    height: 6rpx;
    background: linear-gradient(90deg, #ff7a4e, #ff4d2d);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  padding-top: 16rpx;
}

/* 瀑布流 */
.waterfall {
  padding: 0 16rpx;
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
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.wf-img {
  width: 100%;
  background: #f5f6f8;
}
.wf-info {
  padding: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.wf-name {
  font-size: 24rpx;
  color: #1d2129;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.wf-price {
  font-size: 28rpx;
  font-weight: 800;
  color: #ff4d2d;
}

/* 店铺卡片 */
.shop-list {
  padding: 12rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.shop-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active {
    transform: scale(0.99);
  }
}
.shop-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  text {
    font-size: 40rpx;
    font-weight: 900;
    color: #fff;
  }
}
.shop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.shop-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  .shop-name {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 700;
    color: #1d2129;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.shop-type {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
  &.factory {
    background: rgba(255, 77, 45, 0.1);
    color: #ff4d2d;
  }
  &.store {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }
}
.shop-meta {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #86909c;
}
.shop-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 4rpx;
  .cat-tag {
    padding: 2rpx 12rpx;
    background: #f5f6f8;
    border-radius: 6rpx;
    font-size: 20rpx;
    color: #4e5969;
  }
}

.empty {
  padding: 120rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  color: #86909c;
  .empty-sub {
    font-size: 22rpx;
    color: #c9cdd4;
  }
}
.loadmore {
  text-align: center;
  padding: 24rpx 0;
  font-size: 22rpx;
  color: #c9cdd4;
}
</style>
