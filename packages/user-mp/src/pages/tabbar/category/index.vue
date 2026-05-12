<script setup lang="ts">
/**
 * UM-06 · 分类页
 * 还原 原型图/user-mini.jsx::UM_Cat
 * - 顶部搜索条
 * - 一级分类横滚
 * - 二级分类横滚（chip）
 * - 商品瀑布流
 */
import { ref, computed, onMounted, watch } from 'vue'
import { categoryService, productService } from '../../../services'
import { useUserStore } from '../../../store/user'
import type { Category, Product } from '@jiujiu/shared/types'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const userStore = useUserStore()
const allCats = ref<Category[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const level1Id = ref<string>('')
const level2Id = ref<string>('')
const favoriteIds = ref<Set<string>>(new Set())

const FAVORITE_KEY = 'jiujiu_favorite_ids'

function loadFavorites() {
  try {
    const raw = uni.getStorageSync(FAVORITE_KEY)
    if (raw) favoriteIds.value = new Set(JSON.parse(raw))
  } catch {}
}
function persistFavorites() {
  try {
    uni.setStorageSync(FAVORITE_KEY, JSON.stringify([...favoriteIds.value]))
  } catch {}
}
function toggleFavorite(p: Product, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  const next = new Set(favoriteIds.value)
  if (next.has(p.id)) {
    next.delete(p.id)
    uni.showToast({ title: '已取消收藏', icon: 'none', duration: 1000 })
  } else {
    next.add(p.id)
    uni.showToast({ title: '已收藏', icon: 'success', duration: 1000 })
  }
  favoriteIds.value = next
  persistFavorites()
}
function isFavorited(p: Product): boolean {
  return favoriteIds.value.has(p.id)
}

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

const level1List = computed(() => allCats.value.filter((c) => c.parentId === null))
const level2List = computed(() => {
  if (!level1Id.value) return []
  return allCats.value.filter((c) => c.parentId === level1Id.value)
})

const breadcrumb = computed(() => {
  const l1 = level1List.value.find((c) => c.id === level1Id.value)?.name ?? ''
  const l2 = level2List.value.find((c) => c.id === level2Id.value)?.name ?? '全部'
  return `${l1} / ${l2}`
})

async function loadCats() {
  try {
    allCats.value = await categoryService.list()
    level1Id.value = level1List.value[0]?.id ?? ''
    level2Id.value = level2List.value[0]?.id ?? ''
    await loadProducts()
  } catch (e) {
    console.error(e)
  }
}

async function loadProducts() {
  loading.value = true
  try {
    // 按一级分类查（演示数据中商品都挂在一级 categoryId 下）；二级 chip 仅作 UI 筛选
    const result = await productService.list({ categoryId: level1Id.value, pageSize: 30 })
    products.value = result.list
  } finally {
    loading.value = false
  }
}

watch(() => level1Id.value, () => {
  level2Id.value = level2List.value[0]?.id ?? ''
  loadProducts()
})
// 二级切换暂不重新拉（避免空列表），仅高亮当前 chip

function goSearch() {
  uni.showToast({ title: '搜索 · 待实现', icon: 'none' })
}
function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` })
}

function priceVisibleOf(p: Product): boolean {
  if (userStore.isLogin) return true
  return !!p.priceDisplayRules?.guestVisible
}

function imgHeightOf(i: number): number {
  const variants = [280, 360, 240, 320, 300, 360]
  return variants[i % variants.length]
}

const colLeft = computed(() => products.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => products.value.filter((_, i) => i % 2 === 1))

onMounted(() => {
  loadCats()
  loadFavorites()
})
</script>

<template>
  <view class="page">
    <view class="cat-header" :style="{ paddingTop: statusBarHeight }">
      <view class="search-bar" @click="goSearch">
        <Icon name="search" :size="32" color="var(--text-tertiary)" />
        <text class="placeholder">搜索商品</text>
      </view>

      <!-- 一级分类横滚 -->
      <scroll-view scroll-x class="l1-scroll" :show-scrollbar="false">
        <view class="l1-list">
          <view
            v-for="c in level1List"
            :key="c.id"
            :class="['l1-item', level1Id === c.id ? 'active' : '']"
            @click="level1Id = c.id"
          >
            <text>{{ c.name }}</text>
            <view class="dash" />
          </view>
        </view>
      </scroll-view>

      <!-- 二级分类横滚 -->
      <scroll-view scroll-x class="l2-scroll" :show-scrollbar="false">
        <view class="l2-list">
          <view
            v-for="c in level2List"
            :key="c.id"
            :class="['l2-chip', level2Id === c.id ? 'active' : '']"
            @click="level2Id = c.id"
          >
            {{ c.name }}
          </view>
          <view v-if="level2List.length === 0" class="l2-empty">暂无子分类</view>
        </view>
      </scroll-view>
    </view>

    <view class="bread">
      <text>{{ breadcrumb }}</text>
      <text class="count" v-if="!loading">共 {{ products.length }} 件</text>
    </view>

    <scroll-view scroll-y class="scroll">
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
                <Icon name="heart" :size="26" :color="isFavorited(p) ? '#FF3B30' : '#fff'" :fill="isFavorited(p)" :stroke="2" />
              </view>
            </view>
            <view class="wf-info">
              <text class="wf-name">{{ p.name }}</text>
              <view class="wf-row">
                <text v-if="priceVisibleOf(p)" class="wf-price">¥{{ p.priceRetailMin }}</text>
                <view v-else class="wf-locked">
                  <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                  <text>登录可见</text>
                </view>
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
                <Icon name="heart" :size="26" :color="isFavorited(p) ? '#FF3B30' : '#fff'" :fill="isFavorited(p)" :stroke="2" />
              </view>
            </view>
            <view class="wf-info">
              <text class="wf-name">{{ p.name }}</text>
              <view class="wf-row">
                <text v-if="priceVisibleOf(p)" class="wf-price">¥{{ p.priceRetailMin }}</text>
                <view v-else class="wf-locked">
                  <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                  <text>登录可见</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-if="!loading && products.length === 0" class="empty">该分类暂无商品</view>
      <view style="height: 160rpx;" />
    </scroll-view>

    <TabBar current="category" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-page);
}
.cat-header {
  background: var(--bg-card);
  z-index: 10;
}
.search-bar {
  margin: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 64rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  .placeholder { font-size: 26rpx; color: var(--text-tertiary); }
}

.l1-scroll {
  white-space: nowrap;
  border-bottom: 1rpx solid var(--border-light);
}
.l1-list {
  display: inline-flex;
  padding: 0 24rpx;
  gap: 36rpx;
}
.l1-item {
  flex: 0 0 auto;
  height: 72rpx;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  font-size: 26rpx;
  color: var(--text-primary);
  position: relative;
  padding: 0 4rpx;
  .dash { height: 4rpx; }
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
    .dash {
      width: 32rpx;
      height: 4rpx;
      background: var(--brand-primary);
      border-radius: 4rpx;
      margin-top: 4rpx;
    }
  }
}

.l2-scroll {
  white-space: nowrap;
  background: var(--bg-page);
}
.l2-list {
  display: inline-flex;
  padding: 16rpx 24rpx;
  gap: 12rpx;
}
.l2-chip {
  flex: 0 0 auto;
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1rpx solid var(--border-default);
  border-radius: 999rpx;
  &.active {
    background: var(--brand-gradient);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
}
.l2-empty {
  padding: 8rpx 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
}

.bread {
  padding: 16rpx 24rpx 0;
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-primary);
  .count { font-size: 20rpx; font-weight: 400; color: var(--text-tertiary); }
}

.scroll { flex: 1; height: 0; padding-top: 16rpx; }
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
  box-shadow: var(--shadow-sm);
}
.wf-img-wrap {
  position: relative;
}
.wf-img {
  width: 100%;
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
  padding: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.wf-name {
  font-size: 24rpx;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.wf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wf-price {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--brand-primary);
  font-family: var(--font-family-base);
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
.empty {
  text-align: center;
  padding: 48rpx 0;
  color: var(--text-tertiary);
  font-size: 24rpx;
}
</style>
