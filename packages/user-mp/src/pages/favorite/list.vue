<script setup lang="ts">
/**
 * UM-收藏 · 我的收藏完整列表
 *
 * 入口：购物车页"查看全部 ›" / 我的页"我的收藏"
 *
 * - 调 favoriteService.list() 拉收藏（与购物车页同一接口，保持口径一致）
 * - 卡片：商品图 + 名 + 价 + 移除按钮
 * - 点击卡片跳商品详情
 * - 长按 / "移除"按钮调 favoriteService.remove(id) + 乐观更新 + 失败回滚
 * - 空态引导回首页
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { favoriteService, productService } from '../../services'
import type { Favorite } from '../../services'
import { useUserStore } from '../../store/user'
import { useCartStore } from '../../store/cart'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'
import { safeSwitchTab } from '../../utils/tab-nav'

const userStore = useUserStore()
const cartStore = useCartStore()

const favorites = ref<Favorite[]>([])
const loading = ref(false)
const removing = ref<Record<string, boolean>>({})

async function load() {
  if (!userStore.isLogin) return
  loading.value = true
  try {
    favorites.value = await favoriteService.list()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goDetail(f: Favorite) {
  uni.navigateTo({ url: `/pages/product/detail?id=${f.productId}` })
}

async function removeOne(f: Favorite) {
  if (removing.value[f.id]) return
  removing.value[f.id] = true
  const snapshot = favorites.value
  favorites.value = favorites.value.filter((x) => x.id !== f.id)
  try {
    await favoriteService.remove(f.id)
    uni.showToast({ title: '已取消收藏', icon: 'none', duration: 1000 })
  } catch (e: any) {
    favorites.value = snapshot
    uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
  } finally {
    removing.value[f.id] = false
  }
}

function confirmRemove(f: Favorite) {
  uni.showModal({
    title: '取消收藏',
    content: `从收藏中移除「${f.name}」？`,
    success: (r) => {
      if (r.confirm) removeOne(f)
    },
  })
}

async function addToCart(f: Favorite) {
  try {
    uni.showLoading({ title: '加购中…', mask: true })
    const detail = await productService.detail(f.productId, { silent: true })
    const firstSku = detail?.skus?.[0]
    if (!firstSku?.id) {
      uni.hideLoading()
      uni.showToast({ title: '该商品暂无可用规格', icon: 'none' })
      return
    }
    await cartStore.addCart({
      productId: f.productId,
      skuId: firstSku.id,
      name: f.name,
      spec: firstSku.specsLabel || '默认规格',
      image: f.image,
      price: Number(firstSku.priceRetail ?? f.price) || f.price,
    })
    uni.hideLoading()
    if ((detail?.skus?.length ?? 0) > 1) {
      uni.showToast({ title: '已按默认规格加购，可在详情页切换', icon: 'none', duration: 1500 })
    } else {
      uni.showToast({ title: '已加入购物车', icon: 'success' })
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '加购失败', icon: 'none' })
  }
}

function goHome() {
  safeSwitchTab('/pages/tabbar/home/index')
}

onMounted(load)
onShow(load)
</script>

<template>
  <view class="page">
    <NavBar title="我的收藏" />

    <view v-if="!userStore.isLogin" class="state">
      <EmptyState title="登录后查看收藏" desc="登录后可同步多端收藏夹" icon="lock" />
      <view class="state-btn" @click="goLogin">微信登录</view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <view class="head">
        <text class="count">共 {{ favorites.length }} 件商品</text>
        <text v-if="favorites.length > 0" class="tip">长按卡片可移除</text>
      </view>

      <view v-if="favorites.length > 0" class="list">
        <view
          v-for="f in favorites"
          :key="f.id"
          class="fav-card"
          @click="goDetail(f)"
          @longpress="confirmRemove(f)"
        >
          <image :src="f.image" mode="aspectFill" class="fav-img" />
          <view class="fav-info">
            <text class="fav-name">{{ f.name }}</text>
            <view class="fav-row">
              <text class="fav-price">¥ {{ f.price }}</text>
            </view>
            <view class="fav-actions" @click.stop>
              <view class="act ghost" @click="confirmRemove(f)">
                <Icon name="close" :size="22" color="var(--text-secondary)" />
                <text>移除</text>
              </view>
              <view class="act primary" @click="addToCart(f)">
                <Icon name="cart" :size="22" color="#fff" />
                <text>加购</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-wrap">
        <EmptyState title="还没有收藏商品" desc="去首页逛逛，遇到喜欢的就收藏吧" icon="star" />
        <view class="state-btn" @click="goHome">去首页</view>
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
}
.scroll {
  flex: 1;
  height: 0;
}

.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 80rpx 32rpx;
}
.state-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
}

.head {
  padding: 16rpx 24rpx 8rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  .count {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .tip {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}

.list {
  padding: 8rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.fav-card {
  display: flex;
  gap: 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 16rpx;
  box-shadow: $shadow-sm;
  align-items: stretch;
}
.fav-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  background: var(--bg-page);
  flex-shrink: 0;
}
.fav-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.fav-name {
  font-size: 28rpx;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.fav-price {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--brand-primary);
  font-family: $font-family-base;
}
.fav-actions {
  margin-top: auto;
  display: flex;
  gap: 12rpx;
  justify-content: flex-end;
  .act {
    flex: 1;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    &.ghost {
      background: var(--bg-page);
      color: var(--text-secondary);
      border: 1rpx solid var(--border-default);
    }
    &.primary {
      background: $brand-gradient;
      color: #fff;
      box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
    }
  }
}

.empty-wrap {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
</style>
