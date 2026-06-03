<script setup lang="ts">
/**
 * UM-03 · 购物车
 * - 顶部 NavBar 编辑模式
 * - 我的收藏横滚（含取消/加购按钮）
 * - 商品行（圆勾选 + 缩略图 + 名 + 规格 + 价 + 数量步进）
 * - 底栏：全选 + 合计 + 去结算
 *
 * 还原 原型图/user-mini.jsx::UM_Cart
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '../../../store/cart'
import { useUserStore } from '../../../store/user'
import { favoriteService, productService } from '../../../services'
import type { Favorite } from '../../../services'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../../components/nav-bar/nav-bar.vue'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'
import { safeSwitchTab } from '../../../utils/tab-nav'

const cartStore = useCartStore()
const userStore = useUserStore()

const editMode = ref(false)
const favorites = ref<Favorite[]>([])

const allChecked = computed(() => cartStore.allSelected)
const lineCount = computed(() => cartStore.selectedLines.length)
const subtotal = computed(() => cartStore.subtotal)

async function load() {
  try {
    favorites.value = await favoriteService.list()
  } catch (e) {
    console.error(e)
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function toggleEdit() {
  editMode.value = !editMode.value
}

function toggleLine(id: string, val: boolean) {
  cartStore.update(id, { selected: !val })
}

function toggleAll() {
  cartStore.setAllSelected(!allChecked.value)
}

async function changeQty(id: string, delta: number) {
  const l = cartStore.lines.find((x) => x.id === id)
  if (!l) return
  const next = l.qty + delta
  if (next < 1) return
  try {
    await cartStore.updateCart(id, next)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '修改数量失败', icon: 'none' })
  }
}

async function removeFav(f: Favorite) {
  // 乐观更新 + 调真接口；失败回滚
  const snapshot = favorites.value
  favorites.value = favorites.value.filter((x) => x.id !== f.id)
  try {
    await favoriteService.remove(f.id)
    uni.showToast({ title: '已取消收藏', icon: 'none' })
  } catch (e: any) {
    favorites.value = snapshot
    uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
  }
}
async function addFavToCart(f: Favorite) {
  // 收藏卡是商品级，没有 sku；先拉详情拿第一个真实 SKU
  // 多 SKU 商品提示让用户去详情页选规格。
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

function deleteSelected() {
  if (cartStore.selectedLines.length === 0) {
    uni.showToast({ title: '请选择要删除的商品', icon: 'none' })
    return
  }
  uni.showModal({
    title: '提示',
    content: `确认删除 ${cartStore.selectedLines.length} 件商品？`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await cartStore.removeSelected()
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '部分商品删除失败', icon: 'none' })
      }
    },
  })
}

function goCheckout() {
  const selected = cartStore.selectedLines
  if (selected.length === 0) {
    uni.showToast({ title: '请先勾选商品', icon: 'none' })
    return
  }
  // 后端不支持跨商户合并下单：勾选了多个商户的商品就提前拦截，避免到确认页提交才整单失败
  const merchantIds = new Set(selected.map((l) => l.merchantId).filter(Boolean))
  if (merchantIds.size > 1) {
    uni.showToast({ title: '同一笔订单只能结算一个商家的商品，请分开勾选结算', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/order/confirm' })
}

function goAllFavorites() {
  if (!userStore.isLogin) {
    goLogin()
    return
  }
  uni.navigateTo({ url: '/pages/favorite/list' })
}

function goHome() {
  safeSwitchTab('/pages/tabbar/home/index')
}

onMounted(() => {
  cartStore.hydrate()
  cartStore.loadFromServer()
  load()
})
// 每次切到购物车 tab 都重新拉一次（收藏 + 后端购物车），
// 否则在首页 / 详情页加的收藏 / 加购不会立刻出现在 onShow 时
onShow(() => {
  cartStore.hydrate()
  cartStore.loadFromServer()
  load()
})
</script>

<template>
  <view class="page">
    <NavBar
      title="购物车"
      :show-back="false"
      :right-text="editMode ? '完成' : '编辑'"
      @right="toggleEdit"
    />

    <scroll-view scroll-y class="scroll">
      <!-- 收藏横滚（常驻 · 还原原型图）-->
      <view class="fav-block">
        <view class="fav-head">
          <view class="fav-title">
            <Icon name="star-fill" :size="28" color="#FFB300" />
            <text>我的收藏 ({{ userStore.isLogin ? favorites.length : 0 }})</text>
          </view>
          <text class="fav-action" @click="goAllFavorites">查看全部 ›</text>
        </view>

        <!-- 未登录：引导登录 -->
        <view v-if="!userStore.isLogin" class="fav-login" @click="goLogin">
          <view class="fav-login-icon">
            <Icon name="lock" :size="36" color="var(--brand-primary)" />
          </view>
          <view class="fav-login-info">
            <text class="title">登录后查看收藏商品</text>
            <text class="desc">收藏过的商品在这里一键加购</text>
          </view>
          <view class="fav-login-btn">去登录 ›</view>
        </view>

        <!-- 已登录但空 -->
        <view v-else-if="favorites.length === 0" class="fav-empty">
          <Icon name="star" :size="48" color="var(--text-tertiary)" />
          <text>还没有收藏商品，去首页逛逛吧</text>
        </view>

        <!-- 收藏列表横滚 -->
        <scroll-view v-else scroll-x class="fav-scroll" :show-scrollbar="false">
          <view class="fav-list">
            <view v-for="f in favorites" :key="f.id" class="fav-card">
              <view class="fav-img-wrap">
                <image :src="f.image" mode="aspectFill" class="fav-img" />
                <view class="fav-close" @click="removeFav(f)">
                  <Icon name="close" :size="20" color="var(--text-tertiary)" />
                </view>
              </view>
              <view class="fav-info">
                <text class="name">{{ f.name }}</text>
                <text class="price">¥{{ f.price }}</text>
              </view>
              <view class="fav-actions">
                <view class="fav-act cancel" @click="removeFav(f)">取消</view>
                <view class="fav-act add" @click="addFavToCart(f)">加购</view>
              </view>
            </view>
            <view class="fav-more" @click="goAllFavorites">
              <Icon name="chevron-right" :size="36" color="var(--text-tertiary)" />
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 商品列表 -->
      <view v-if="cartStore.lines.length > 0" class="cart-list">
        <view v-for="l in cartStore.lines" :key="l.id" class="cart-line">
          <view class="check" @click="toggleLine(l.id, l.selected)">
            <Icon
              v-if="l.selected"
              name="check-circle"
              :size="44"
              color="var(--brand-primary)"
              :fill="false"
            />
            <Icon v-else name="circle" :size="44" color="var(--text-tertiary)" />
          </view>
          <image :src="l.image" mode="aspectFill" class="thumb" />
          <view class="line-info">
            <text class="name">{{ l.name }}</text>
            <text class="spec">规格：{{ l.spec }}</text>
            <view class="row">
              <text class="price">¥ {{ formatPrice(l.price) }}</text>
              <view class="qty">
                <view class="qty-btn" @click="changeQty(l.id, -1)">
                  <Icon name="minus" :size="22" color="var(--text-primary)" />
                </view>
                <text class="qty-val">{{ l.qty }}</text>
                <view class="qty-btn" @click="changeQty(l.id, 1)">
                  <Icon name="plus" :size="22" color="var(--text-primary)" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空态（保留收藏横滚，仅展示购物车空提示）-->
      <view v-else class="empty-wrap">
        <view class="empty-icon-wrap">
          <Icon name="cart" :size="120" color="var(--text-tertiary)" />
        </view>
        <text class="empty-title">购物车空空如也</text>
        <text class="empty-desc">从上方收藏中加购，或去首页逛逛</text>
        <view class="empty-btn" @click="goHome">去逛逛</view>
      </view>

      <view style="height: 200rpx" />
    </scroll-view>

    <!-- 底栏 -->
    <view v-if="cartStore.lines.length > 0" class="ft">
      <view class="ft-check" @click="toggleAll">
        <Icon v-if="allChecked" name="check-circle" :size="44" color="var(--brand-primary)" />
        <Icon v-else name="circle" :size="44" color="var(--text-tertiary)" />
        <text class="ft-check-text">全选</text>
      </view>

      <view class="ft-total" v-if="!editMode">
        <text class="ft-label">合计</text>
        <text class="ft-value">{{ formatPrice(subtotal) }}</text>
      </view>

      <view v-if="!editMode" class="ft-btn primary" @click="goCheckout">
        去结算({{ lineCount }})
      </view>
      <view v-else class="ft-btn danger" @click="deleteSelected"> 删除({{ lineCount }}) </view>
    </view>

    <TabBar current="cart" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-page);
}
.scroll {
  flex: 1;
  height: 0;
}
.fav-block {
  background: var(--bg-card);
  padding: 16rpx 0;
  margin-bottom: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
}
.fav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 24rpx 12rpx;
  .fav-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .fav-action {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.fav-login {
  margin: 4rpx 24rpx 12rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.06), rgba(255, 179, 0, 0.06));
  border: 1rpx dashed var(--brand-primary);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  .fav-login-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(255, 77, 45, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fav-login-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .title {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .desc {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
  .fav-login-btn {
    padding: 8rpx 20rpx;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
.fav-empty {
  margin: 4rpx 24rpx 12rpx;
  padding: 32rpx 20rpx;
  background: var(--bg-page);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.fav-scroll {
  white-space: nowrap;
}
.fav-list {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 24rpx 12rpx;
}
.fav-card {
  display: inline-flex;
  flex-direction: column;
  width: 200rpx;
  background: var(--bg-card);
  border: 1rpx solid var(--border-light);
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
}
.fav-img-wrap {
  position: relative;
  height: 160rpx;
  .fav-img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .fav-close {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.1);
  }
}
.fav-info {
  padding: 8rpx 12rpx 0;
  .name {
    font-size: 22rpx;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
  .price {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: $font-family-base;
  }
}
.fav-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 8rpx;
  border-top: 1rpx solid var(--border-light);
  .fav-act {
    text-align: center;
    padding: 8rpx 0;
    font-size: 22rpx;
    &.cancel {
      color: var(--text-tertiary);
      border-right: 1rpx solid var(--border-light);
    }
    &.add {
      background: $brand-gradient;
      color: #fff;
      font-weight: 600;
    }
  }
}
.fav-more {
  display: inline-flex;
  align-items: center;
  width: 60rpx;
}
.cart-list {
  background: var(--bg-card);
  padding: 8rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.cart-line {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .check {
    padding: 4rpx;
  }
  .thumb {
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    background: var(--bg-page);
  }
  .line-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
    .name {
      font-size: 28rpx;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .spec {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6rpx;
    }
    .price {
      font-size: 30rpx;
      font-weight: 800;
      color: var(--brand-primary);
      font-family: $font-family-base;
    }
  }
}
.qty {
  display: inline-flex;
  align-items: center;
  border: 1rpx solid var(--border-default);
  border-radius: 8rpx;
  overflow: hidden;
  .qty-btn {
    width: 52rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qty-val {
    min-width: 60rpx;
    text-align: center;
    line-height: 48rpx;
    font-size: 24rpx;
    border-left: 1rpx solid var(--border-default);
    border-right: 1rpx solid var(--border-default);
    font-family: $font-family-base;
  }
}
.empty-wrap {
  padding: 60rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  .empty-icon-wrap {
    opacity: 0.35;
  }
  .empty-title {
    margin-top: 12rpx;
    font-size: 28rpx;
    color: var(--text-secondary);
  }
  .empty-desc {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .empty-btn {
    margin-top: 16rpx;
    padding: 16rpx 48rpx;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 26rpx;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
.ft {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 108rpx;
  height: 96rpx;
  padding: 0 24rpx;
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 16rpx;
  z-index: 30;
  padding-bottom: env(safe-area-inset-bottom);
}
.ft-check {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: var(--text-primary);
  .ft-check-text {
    font-size: 24rpx;
  }
}
.ft-total {
  flex: 1;
  text-align: right;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8rpx;
  .ft-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .ft-value {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: $font-family-base;
  }
}
.ft-btn {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  &.primary {
    background: $brand-gradient;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
  &.danger {
    background: #ff3b30;
  }
}
</style>
