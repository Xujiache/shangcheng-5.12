<script setup lang="ts">
/**
 * UM-01 · 用户端首页（瀑布流）
 *
 * 顶部店铺头 + 搜索条 + 平台广告轮播 + 4 入口 + 瀑布流 · 为你推荐
 * 完全按 原型图/user-mini.jsx::UM_Home 还原
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../../store/user'
import { useCartStore } from '../../../store/cart'
import { productService, bannerService, favoriteService } from '../../../services'
import type { Banner } from '../../../services'
import type { Product } from '@jiujiu/shared/types'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const userStore = useUserStore()
const cartStore = useCartStore()

const banners = ref<Banner[]>([])
const products = ref<Product[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const PAGE_SIZE = 10
const bannerIndex = ref(0)
// productId → favoriteRowId（删除时要传后端 row id）
const favoriteRowMap = ref<Map<string, string>>(new Map())
const favoriteIds = computed(() => new Set(favoriteRowMap.value.keys()))

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
    /* 拉失败不阻塞首页渲染 */
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
  // 乐观更新：先改本地，失败再回滚
  if (existingRow) {
    m.delete(p.id)
    favoriteRowMap.value = m
    try {
      await favoriteService.remove(existingRow)
      uni.showToast({ title: '已取消收藏', icon: 'none', duration: 1000 })
    } catch (err: any) {
      // 回滚
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
      // 拉一次，把临时 id 换成真 id（购物车页那边只看 list 接口结果）
      await loadFavorites()
    } catch (err: any) {
      // 回滚
      m.delete(p.id)
      favoriteRowMap.value = new Map(m)
      uni.showToast({ title: err?.message || '收藏失败', icon: 'none' })
    }
  }
}
function isFavorited(p: Product): boolean {
  return favoriteIds.value.has(p.id)
}

const QUICK_ENTRIES = [
  { key: 'new', icon: 'sparkles', label: '新品', tint: '#FF4D2D' },
  { key: 'hot', icon: 'flag', label: '热销', tint: '#FF7A45' },
  { key: 'promo', icon: 'lightning', label: '活动', tint: '#FFB300' },
  { key: 'vip', icon: 'crown', label: '会员', tint: '#A855F7' },
]

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

async function load() {
  loading.value = true
  try {
    const [bannerList, productList] = await Promise.all([
      bannerService.list(),
      productService.list({ pageSize: 20 }),
    ])
    banners.value = bannerList
    products.value = productList.list
  } finally {
    loading.value = false
  }
}

function goSearch() {
  uni.showToast({ title: '搜索 · 待实现', icon: 'none' })
}
function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` })
}
function goEntry(key: string) {
  uni.navigateTo({ url: `/pages/channel/index?key=${key}` })
}
function goBanner(link: string) {
  if (!link) return
  if (link.startsWith('/pages/')) uni.navigateTo({ url: link })
  else uni.showToast({ title: link, icon: 'none' })
}
function goShopHome() {
  uni.showToast({ title: '经纬科技', icon: 'none' })
}
function onBannerChange(e: any) {
  bannerIndex.value = e.detail.current
}
function onAddCart(p: Product) {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  cartStore.add({
    productId: p.id,
    skuId: p.id + '-default',
    name: p.name,
    spec: '默认规格',
    image: p.images?.[0] ?? '',
    price: p.priceRetailMin,
  })
  uni.showToast({ title: '已加入购物车', icon: 'success' })
}

/** 价格可见性：未登录 + guestVisible=false → 隐藏 */
function priceVisibleOf(p: Product): boolean {
  if (userStore.isLogin) return true
  return !!p.priceDisplayRules?.guestVisible
}

/** 瀑布流：奇偶不同高 */
function imgHeightOf(i: number): number {
  const variants = [320, 380, 280, 360, 300, 400]
  return variants[i % variants.length]
}

/** 左右两列拆分（小程序不支持 column-count） */
const colLeft = computed(() => products.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => products.value.filter((_, i) => i % 2 === 1))

onMounted(() => {
  load()
  loadFavorites()
})
onShow(() => {
  cartStore.hydrate()
  loadFavorites()
})
</script>

<template>
  <view class="page">
    <!-- 店铺顶部条（自定义状态栏） -->
    <view class="shop-header" :style="{ paddingTop: statusBarHeight }">
      <view class="shop-row" @click="goShopHome">
        <view class="shop-avatar">
          <text class="letter">L</text>
        </view>
        <text class="shop-name">经纬科技</text>
        <view class="shop-more">
          <Icon name="more-h" :size="36" color="var(--text-secondary)" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :show-scrollbar="false">
      <!-- 搜索条 -->
      <view class="search-bar" @click="goSearch">
        <Icon name="search" :size="36" color="var(--text-tertiary)" />
        <text class="placeholder">搜索商品 / 店铺</text>
      </view>

      <!-- 平台广告轮播 -->
      <view class="banner-wrap">
        <swiper
          class="banner"
          :indicator-dots="false"
          :autoplay="true"
          :interval="4000"
          :circular="true"
          @change="onBannerChange"
        >
          <swiper-item v-for="(b, i) in banners" :key="b.id" @click="goBanner(b.link ?? '')">
            <image :src="b.image" mode="aspectFill" class="banner-img" />
            <view class="banner-title">{{ b.title }}</view>
          </swiper-item>
        </swiper>
        <view class="dots">
          <view
            v-for="(b, i) in banners"
            :key="b.id"
            :class="['dot', i === bannerIndex ? 'active' : '']"
          />
        </view>
      </view>

      <!-- 4 快捷入口 -->
      <view class="entries">
        <view v-for="e in QUICK_ENTRIES" :key="e.key" class="entry" @click="goEntry(e.key)">
          <view class="entry-icon" :style="{ background: `${e.tint}18`, color: e.tint }">
            <Icon :name="e.icon" :size="44" :color="e.tint" />
          </view>
          <text class="entry-label">{{ e.label }}</text>
        </view>
      </view>

      <!-- 瀑布流 -->
      <view class="section-title">
        <text class="title">瀑布流 · 为你推荐</text>
        <text class="sub">猜你喜欢</text>
      </view>

      <view class="waterfall">
        <view class="col">
          <view
            v-for="(p, i) in colLeft"
            :key="p.id"
            class="wf-card"
            @click="goDetail(p)"
          >
            <view class="wf-img-wrap">
              <image :src="p.images?.[0]" mode="aspectFill" class="wf-img" :style="{ height: imgHeightOf(i * 2) + 'rpx' }" />
              <view class="wf-fav" :class="{ active: isFavorited(p) }" @click.stop="toggleFavorite(p, $event)">
                <Icon :name="isFavorited(p) ? 'heart' : 'heart'" :size="28" :color="isFavorited(p) ? '#FF3B30' : '#fff'" :fill="isFavorited(p)" :stroke="2" />
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
          <view
            v-for="(p, i) in colRight"
            :key="p.id"
            class="wf-card"
            @click="goDetail(p)"
          >
            <view class="wf-img-wrap">
              <image :src="p.images?.[0]" mode="aspectFill" class="wf-img" :style="{ height: imgHeightOf(i * 2 + 1) + 'rpx' }" />
              <view class="wf-fav" :class="{ active: isFavorited(p) }" @click.stop="toggleFavorite(p, $event)">
                <Icon name="heart" :size="28" :color="isFavorited(p) ? '#FF3B30' : '#fff'" :fill="isFavorited(p)" :stroke="2" />
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

      <view class="bottom-tip">— 已经到底了 —</view>
      <view style="height: 160rpx;" />
    </scroll-view>

    <TabBar current="home" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}
.shop-header {
  background: var(--bg-card);
  border-bottom: 1rpx dashed var(--border-light);
  .shop-row {
    height: 80rpx;
    padding: 0 24rpx;
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
  .shop-avatar {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: $brand-gradient;
    display: flex;
    align-items: center;
    justify-content: center;
    .letter { color: #fff; font-weight: 800; font-size: 28rpx; }
  }
  .shop-name {
    flex: 1;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
}
.scroll {
  flex: 1;
  height: 0;
}
.search-bar {
  margin: 16rpx 24rpx 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 72rpx;
  background: var(--bg-card);
  border-radius: 999rpx;
  box-shadow: $shadow-sm;
  .placeholder {
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
}
.banner-wrap {
  margin: 16rpx 24rpx 0;
  position: relative;
}
.banner {
  height: 280rpx;
  border-radius: 20rpx;
  overflow: hidden;
  .banner-img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .banner-title {
    position: absolute;
    left: 24rpx;
    bottom: 24rpx;
    color: #fff;
    font-size: 26rpx;
    font-weight: 600;
    text-shadow: 0 1rpx 2rpx rgba(0,0,0,.4);
    max-width: 70%;
  }
}
.dots {
  position: absolute;
  bottom: 16rpx;
  right: 24rpx;
  display: flex;
  gap: 6rpx;
  .dot {
    width: 12rpx;
    height: 6rpx;
    background: rgba(255,255,255,0.5);
    border-radius: 3rpx;
    transition: width .3s;
    &.active {
      width: 24rpx;
      background: #fff;
    }
  }
}
.entries {
  margin: 24rpx 24rpx 0;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  box-shadow: $shadow-sm;
  .entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    .entry-icon {
      width: 80rpx;
      height: 80rpx;
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .entry-label {
      font-size: 24rpx;
      color: var(--text-primary);
    }
  }
}
.section-title {
  padding: 24rpx 24rpx 16rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  .title {
    font-size: 30rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .sub {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
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
  top: 12rpx;
  right: 12rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4rpx);
  transition: transform 0.2s;
  &.active {
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 2rpx 8rpx rgba(255, 59, 48, 0.3);
  }
  &:active {
    transform: scale(0.85);
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
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
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
