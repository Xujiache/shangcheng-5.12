<script setup lang="ts">
/**
 * UM-02 · 商品详情
 * 还原 原型图/user-mini.jsx::UM_Detail
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { productService, favoriteService } from '../../services'
import { useUserStore } from '../../store/user'
import { useCartStore } from '../../store/cart'
import {
  useShopPriceRule,
  pickPriceByKind,
  labelOfPriceKind,
  fetchShopPriceRuleByMerchant,
} from '../../composables/useShopPriceRule'
import type { Product, SKU } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import TagChip from '../../components/tag-chip/tag-chip.vue'

const userStore = useUserStore()
const cartStore = useCartStore()

/** 店铺级价格显示规则 + 当前查看者身份合成的显示策略 */
const { displayPolicy, viewerTier, reload: reloadShopRule } = useShopPriceRule()

const productId = ref('')
const product = ref<(Product & { skus: SKU[] }) | null>(null)
const loadFailed = ref(false)
const swiperIndex = ref(0)
const favorited = ref(false)
const favoriteRowId = ref('')
const favBusy = ref(false)

const specSelections = ref<Record<string, string>>({})

const showSku = ref(false)
const skuMode = ref<'cart' | 'buy'>('cart')
const qty = ref(1)

/* ============ 按尺寸定价（FX-5 客户端）============ */

/** 商品扩展字段读取（兼容标准 / 按尺寸两种模式）*/
const ext = computed(() => {
  const p = product.value as unknown as {
    pricingMode?: 'standard' | 'by-size'
    pricePerSqm?: number
    minLength?: number
    minWidth?: number
    maxLength?: number
    maxWidth?: number
    baseFee?: number
    sizeUnit?: 'cm' | 'm'
  } | null
  return p ?? {}
})
const isBySize = computed(() => ext.value.pricingMode === 'by-size')
const sizeUnit = computed(() => ext.value.sizeUnit ?? 'cm')

const customLength = ref(0)
const customWidth = ref(0)

/** 转 m */
function toMeter(v: number): number {
  return sizeUnit.value === 'cm' ? v / 100 : v
}

const customArea = computed(() => {
  const lm = toMeter(Number(customLength.value) || 0)
  const wm = toMeter(Number(customWidth.value) || 0)
  return Number((lm * wm).toFixed(4))
})

const customTotal = computed(() => {
  const price = ext.value.pricePerSqm ?? 0
  const base = ext.value.baseFee ?? 0
  return Number((customArea.value * price + base).toFixed(2))
})

const sizeValid = computed(() => {
  const l = Number(customLength.value) || 0
  const w = Number(customWidth.value) || 0
  const minL = ext.value.minLength ?? 0
  const minW = ext.value.minWidth ?? 0
  const maxL = ext.value.maxLength ?? 99999
  const maxW = ext.value.maxWidth ?? 99999
  return l >= minL && l <= maxL && w >= minW && w <= maxW
})

const sizeRangeHint = computed(() => {
  const minL = ext.value.minLength ?? 0
  const minW = ext.value.minWidth ?? 0
  const maxL = ext.value.maxLength ?? 0
  const maxW = ext.value.maxWidth ?? 0
  return `${minL}×${minW} ~ ${maxL}×${maxW} ${sizeUnit.value}`
})

onLoad((options) => {
  // 没有 id 直接标记加载失败，不再用默认 'p-1' 占位避免假数据
  productId.value = (options?.id || '').toString()
  if (!productId.value) loadFailed.value = true
})

onMounted(() => {
  if (productId.value) load()
  reloadShopRule()
})

// 商家可能在另一个 tab 改了店铺规则，回到本页重新读一次
onShow(() => {
  reloadShopRule()
})

async function load() {
  loadFailed.value = false
  try {
    const data = await productService.detail(productId.value, { silent: true })
    product.value = data
    // 拉商品所属店铺的价格显示规则
    if ((data as any)?.merchantId) {
      fetchShopPriceRuleByMerchant((data as any).merchantId).catch(() => {})
    }
    if (data.skus?.[0]) {
      Object.entries(data.skus[0].specs).forEach(([k, v]) => {
        specSelections.value[k] = String(v)
      })
    }
    if (isBySize.value) {
      customLength.value = ext.value.minLength ?? 100
      customWidth.value = ext.value.minWidth ?? 100
    }
    // 同步当前商品收藏态
    if (userStore.isLogin) {
      try {
        const favs = await favoriteService.list()
        const row = favs.find((f) => f.productId === productId.value)
        favorited.value = !!row
        favoriteRowId.value = row?.id || ''
      } catch { /* ignore */ }
    }
  } catch (e) {
    console.error('load product failed:', e)
    loadFailed.value = true
  }
}

function goBack() {
  try {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack({ delta: 1 })
    } else {
      uni.switchTab({ url: '/pages/tabbar/home/index' })
    }
  } catch {
    uni.switchTab({ url: '/pages/tabbar/home/index' })
  }
}

/** 是否显示价格 —— 综合店铺规则 + 查看者身份 */
const priceVisible = computed(() => displayPolicy.value.showPrice)

/** 当前应该展示的价格 */
const currentPrice = computed(() => {
  if (!product.value) return 0
  if (isBySize.value) return customTotal.value
  return pickPriceByKind(product.value, displayPolicy.value.priceKind)
})

/** 价格名（零售价 / 批发价 / 会员价 / 询价） */
const priceLabel = computed(() => labelOfPriceKind(displayPolicy.value.priceKind))

/** 是否被店铺规则禁止入店（未登录访客 + guestAllow=false） */
const blockedByShopRule = computed(() => !displayPolicy.value.allowEnter)

/** 锁定提示文案 */
const lockReason = computed(() => displayPolicy.value.lockReason)

/** 是否允许加购/购买 */
const buyAllowedByPolicy = computed(() => displayPolicy.value.allowBuy)

/** 身份徽标文案：让用户清楚当前在以什么身份看价格 */
const viewerBadge = computed(
  () =>
    ({
      guest: '访客',
      customer: '普通客户',
      agency: '授权门店',
      member: '会员客户',
    })[viewerTier.value]
)

const specGroups = computed(() => {
  if (!product.value?.skus?.length) {
    return { 尺寸: ['1.2m', '1.4m', '1.6m'], 材质: ['橡木', '胡桃木'] }
  }
  const groups: Record<string, Set<string>> = {}
  product.value.skus.forEach((sku) => {
    Object.entries(sku.specs).forEach(([k, v]) => {
      if (!groups[k]) groups[k] = new Set()
      groups[k].add(String(v))
    })
  })
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v]]))
})

function selectSpec(group: string | number, val: string) {
  specSelections.value[String(group)] = val
}

/** 跳首页（模板直接 uni.xxx 在 vue-tsc 严格模式下不被识别，封一层） */
function goHome() {
  uni.switchTab({ url: '/pages/tabbar/home/index' })
}

function openSku(mode: 'cart' | 'buy') {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  // 店铺规则禁止购买（如商家把"普通客户"设为"不显示价格"）
  if (!buyAllowedByPolicy.value) {
    uni.showModal({
      title: '暂不可购买',
      content:
        lockReason.value ||
        '商家已隐藏价格，无法直接下单。请联系客服询价，或申请成为授权门店 / 会员后查看。',
      showCancel: false,
    })
    return
  }
  skuMode.value = mode
  qty.value = 1
  showSku.value = true
}

async function toggleFav() {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  if (favBusy.value || !product.value) return
  favBusy.value = true
  try {
    if (favorited.value) {
      if (favoriteRowId.value) await favoriteService.remove(favoriteRowId.value)
      favorited.value = false
      favoriteRowId.value = ''
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      await favoriteService.add(product.value.id)
      favorited.value = true
      try {
        const favs = await favoriteService.list()
        const row = favs.find((f) => f.productId === product.value!.id)
        favoriteRowId.value = row?.id || ''
      } catch { /* ignore */ }
      uni.showToast({ title: '已收藏', icon: 'success' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    favBusy.value = false
  }
}

function goChat() {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  const mid = (product.value as any)?.merchantId || ''
  const q = mid ? `?merchantId=${encodeURIComponent(mid)}` : ''
  uni.navigateTo({ url: `/pages/chat/index${q}` })
}

function specLabel() {
  return Object.values(specSelections.value).join(' / ') || '默认规格'
}

function confirmSku() {
  if (!product.value) return
  if (isBySize.value) {
    if (!sizeValid.value) {
      uni.showToast({ title: `尺寸需在 ${sizeRangeHint.value} 之间`, icon: 'none' })
      return
    }
    if (customTotal.value <= 0) {
      uni.showToast({ title: '请输入有效尺寸', icon: 'none' })
      return
    }
  }
  const spec = isBySize.value
    ? `${customLength.value}×${customWidth.value} ${sizeUnit.value} · ${customArea.value} m²`
    : specLabel()

  // 真实 SKU 匹配（按规格找数据库 sku.id）；按尺寸定价或匹配失败回退首个 SKU
  const matchedSku = !isBySize.value && product.value.skus?.find((s) => {
    return Object.entries(specSelections.value).every(([k, v]) => String((s.specs as any)?.[k]) === v)
  })
  const realSkuId = (matchedSku && matchedSku.id) || product.value.skus?.[0]?.id || ''

  if (!realSkuId) {
    uni.showToast({ title: '该商品无可用规格', icon: 'none' })
    return
  }

  const item = {
    productId: product.value.id,
    skuId: realSkuId,
    name: product.value.name,
    spec,
    image: product.value.images?.[0] ?? '',
    price: currentPrice.value,
    qty: qty.value,
  }

  showSku.value = false

  if (skuMode.value === 'cart') {
    cartStore.add(item)
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } else {
    // 立即购买：单独存 buyNow，不污染购物车
    cartStore.setBuyNow(item)
    uni.navigateTo({ url: '/pages/order/confirm?fromSku=1' })
  }
}

function onSwiperChange(e: any) {
  swiperIndex.value = e.detail.current
}

function changeQty(delta: number) {
  const next = qty.value + delta
  if (next < 1) return
  qty.value = next
}
</script>

<template>
  <!-- 加载失败态 -->
  <view v-if="loadFailed" class="page error-page">
    <NavBar title="商品详情" :sticky="true" />
    <view class="error-wrap">
      <view class="error-icon">!</view>
      <text class="error-title">商品不存在或已下架</text>
      <text class="error-sub">该商品可能已被卖家下架，或链接已失效</text>
      <view class="error-actions">
        <view class="btn-ghost" @click="goBack">‹ 返回</view>
        <view class="btn-primary" @click="goHome">去首页逛逛</view>
      </view>
    </view>
  </view>

  <!-- 加载中 -->
  <view v-else-if="!product" class="page loading-page">
    <NavBar title="商品详情" :sticky="true" />
    <view class="loading-wrap">
      <text>加载中…</text>
    </view>
  </view>

  <!-- 正常 -->
  <view v-else class="page">
    <NavBar title="商品详情" right-icon="share" bg="rgba(255,255,255,0.9)" color="var(--text-primary)" :sticky="true" />

    <scroll-view scroll-y class="scroll">
      <view class="banner">
        <swiper
          class="banner-swiper"
          :indicator-dots="false"
          :autoplay="true"
          :interval="4000"
          :circular="true"
          @change="onSwiperChange"
        >
          <swiper-item v-for="img in product.images" :key="img">
            <image :src="img" mode="aspectFill" class="banner-img" />
          </swiper-item>
        </swiper>
        <view class="banner-counter">
          {{ swiperIndex + 1 }} / {{ product.images.length }}
        </view>
      </view>

      <view class="price-block">
        <view class="price-row">
          <text v-if="priceVisible" class="price">¥ {{ currentPrice }}</text>
          <view v-else class="price-locked">
            <Icon name="lock" :size="22" color="var(--text-tertiary)" />
            <text>{{ lockReason || '价格不可见' }}</text>
          </view>
          <TagChip :tone="priceVisible ? 'pop' : 'soft'" :text="priceLabel" size="sm" />
          <TagChip tone="soft" :text="viewerBadge" size="sm" />
        </view>
        <text class="name">{{ product.name }}</text>
        <view class="meta">
          <text>已售 {{ product.sales }}</text>
          <text>·</text>
          <text>评论 {{ product.commentCount }}</text>
          <text>·</text>
          <text>厂家直发</text>
        </view>
        <view class="tags">
          <TagChip v-for="t in product.tags?.slice(0, 4)" :key="t" :text="t" tone="soft" size="sm" />
        </view>
      </view>

      <view class="card">
        <view class="card-row" @click="openSku('cart')">
          <text class="row-label">规格</text>
          <text class="row-value">{{ specLabel() }}</text>
          <Icon name="chevron-right" :size="32" color="var(--text-tertiary)" />
        </view>
        <view class="card-divider" />
        <view class="card-row">
          <text class="row-label">配送</text>
          <text class="row-value">厂家直发 · 免运费</text>
        </view>
        <view class="card-divider" />
        <view class="card-row">
          <text class="row-label">服务</text>
          <text class="row-value">7 天无理由 · 1 年保修</text>
        </view>
      </view>

      <view class="card review">
        <view class="review-head">
          <text class="title">用户评价（{{ product.commentCount }}）</text>
          <text class="action">查看全部 ›</text>
        </view>
        <view class="review-item">
          <view class="reviewer">
            <view class="avatar">L</view>
            <text class="nickname">L***张</text>
            <view class="stars">
              <Icon v-for="i in 5" :key="i" name="star-fill" :size="24" color="#FFB300" />
            </view>
          </view>
          <text class="content">实物比图片好看，做工扎实，物流也快，很满意～</text>
        </view>
      </view>

      <view class="section-title-block">
        <view class="line" />
        <text class="title">商品详情</text>
        <view class="line" />
      </view>
      <view class="detail-imgs">
        <image
          v-for="(img, i) in product.images.slice(1)"
          :key="i"
          :src="img"
          mode="widthFix"
          class="detail-img"
        />
        <view class="param-table">
          <view class="param-row" v-for="(p, i) in [['品牌', '经纬科技'], ['材质', '橡木实木'], ['工艺', '原木手工'], ['产地', '佛山顺德']]" :key="i">
            <text class="k">{{ p[0] }}</text>
            <text class="v">{{ p[1] }}</text>
          </view>
        </view>
      </view>

      <view style="height: 160rpx;" />
    </scroll-view>

    <view class="action-bar">
      <view class="icon-btn" @click="toggleFav">
        <Icon :name="favorited ? 'star-fill' : 'star'" :size="40" :color="favorited ? '#FFB300' : 'var(--text-secondary)'" />
        <text>收藏</text>
      </view>
      <view class="icon-btn" @click="goChat">
        <Icon name="message" :size="40" color="var(--text-secondary)" />
        <text>客服</text>
      </view>
      <view
        class="cart-btn"
        :class="{ 'btn-disabled': !userStore.isLogin || !buyAllowedByPolicy }"
        @click="userStore.isLogin && openSku('cart')"
      >
        {{ !userStore.isLogin || buyAllowedByPolicy ? '加入购物车' : '联系询价' }}
      </view>
      <view
        class="buy-btn"
        :class="{ 'btn-disabled': !userStore.isLogin || !buyAllowedByPolicy }"
        @click="userStore.isLogin && openSku('buy')"
      >
        {{ !userStore.isLogin || buyAllowedByPolicy ? '立即购买' : '申请门店' }}
      </view>
    </view>

    <view v-if="showSku" class="sku-mask" @click="showSku = false">
      <view class="sku-sheet" @click.stop>
        <view class="sku-head">
          <image :src="product.images?.[0]" mode="aspectFill" class="sku-img" />
          <view class="sku-info">
            <text class="sku-price">¥ {{ currentPrice }}</text>
            <text class="sku-name">{{ product.name }}</text>
            <text class="sku-selected">已选：{{ specLabel() }}</text>
          </view>
          <view class="sku-close" @click="showSku = false">
            <Icon name="close" :size="36" color="var(--text-tertiary)" />
          </view>
        </view>
        <scroll-view scroll-y class="sku-body">
          <!-- 按尺寸定价模式 -->
          <template v-if="isBySize">
            <view class="size-block">
              <view class="size-head">
                <view class="size-tag">
                  <Icon name="ruler" :size="22" color="#fff" />
                  <text>定制尺寸</text>
                </view>
                <text class="size-hint">范围 {{ sizeRangeHint }}</text>
              </view>
              <view class="size-inputs">
                <view class="size-field">
                  <text class="sf-label">长（{{ sizeUnit }}）</text>
                  <input
                    v-model.number="customLength"
                    type="number"
                    class="sf-input"
                    :placeholder="`${ext.minLength ?? 0}`"
                  />
                </view>
                <view class="size-x">×</view>
                <view class="size-field">
                  <text class="sf-label">宽（{{ sizeUnit }}）</text>
                  <input
                    v-model.number="customWidth"
                    type="number"
                    class="sf-input"
                    :placeholder="`${ext.minWidth ?? 0}`"
                  />
                </view>
              </view>
              <view class="size-calc">
                <text class="calc-label">面积</text>
                <text class="calc-val">{{ customArea }} m²</text>
                <text class="calc-x">×</text>
                <text class="calc-val">¥{{ ext.pricePerSqm ?? 0 }}/m²</text>
                <text v-if="(ext.baseFee ?? 0) > 0" class="calc-x">+</text>
                <text v-if="(ext.baseFee ?? 0) > 0" class="calc-val">¥{{ ext.baseFee }}</text>
              </view>
              <view :class="['size-total', sizeValid ? '' : 'invalid']">
                <text class="st-label">合计</text>
                <text class="st-cur">¥</text>
                <text class="st-num">{{ customTotal.toFixed(2) }}</text>
              </view>
              <text v-if="!sizeValid && (customLength > 0 || customWidth > 0)" class="size-warn">
                ⚠ 尺寸需在 {{ sizeRangeHint }} 之间
              </text>
            </view>
            <view class="spec-group" v-if="Object.keys(specGroups).length > 0">
              <view v-for="(vals, key) in specGroups" :key="key" class="sg-block">
                <text class="group-name">{{ key }}</text>
                <view class="chip-list">
                  <view
                    v-for="v in vals"
                    :key="v"
                    :class="['chip', specSelections[key] === v ? 'active' : '']"
                    @click="selectSpec(key, v)"
                  >{{ v }}</view>
                </view>
              </view>
            </view>
          </template>

          <!-- 标准定价模式 -->
          <template v-else>
            <view v-for="(vals, key) in specGroups" :key="key" class="spec-group">
              <text class="group-name">{{ key }}</text>
              <view class="chip-list">
                <view
                  v-for="v in vals"
                  :key="v"
                  :class="['chip', specSelections[key] === v ? 'active' : '']"
                  @click="selectSpec(key, v)"
                >{{ v }}</view>
              </view>
            </view>
          </template>

          <view class="spec-group">
            <text class="group-name">数量</text>
            <view class="qty-row">
              <view class="qty-btn" @click="changeQty(-1)">
                <Icon name="minus" :size="28" color="var(--text-primary)" />
              </view>
              <text class="qty-val">{{ qty }}</text>
              <view class="qty-btn" @click="changeQty(1)">
                <Icon name="plus" :size="28" color="var(--text-primary)" />
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="sku-ft">
          <view class="confirm-btn" @click="confirmSku">
            {{ skuMode === 'cart' ? '确认加入购物车' : '立即购买' }}
          </view>
        </view>
      </view>
    </view>
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

/* 错误页 / 加载页 */
.error-page, .loading-page {
  align-items: center;
}
.error-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 48rpx;
  gap: 16rpx;
  .error-icon {
    width: 140rpx;
    height: 140rpx;
    line-height: 140rpx;
    text-align: center;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFB199, #FF6E4D);
    color: #fff;
    font-size: 72rpx;
    font-weight: 800;
    margin-bottom: 16rpx;
    box-shadow: 0 8rpx 24rpx rgba(255,77,45,0.35);
  }
  .error-title {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .error-sub {
    font-size: 24rpx;
    color: var(--text-tertiary);
    text-align: center;
    line-height: 1.6;
    margin-bottom: 16rpx;
  }
  .error-actions {
    display: flex;
    gap: 16rpx;
    margin-top: 16rpx;
  }
  .btn-ghost, .btn-primary {
    padding: 18rpx 40rpx;
    border-radius: 999rpx;
    font-size: 26rpx;
    font-weight: 600;
  }
  .btn-ghost {
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 2rpx solid var(--border-default);
  }
  .btn-primary {
    background: $brand-gradient;
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.35);
  }
}
.loading-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: var(--text-tertiary);
}
.banner {
  position: relative;
  height: 720rpx;
  background: var(--bg-page);
  .banner-swiper {
    width: 100%;
    height: 100%;
    .banner-img {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .banner-counter {
    position: absolute;
    right: 24rpx;
    bottom: 24rpx;
    background: rgba(0,0,0,0.5);
    color: #fff;
    padding: 4rpx 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
  }
}
.price-block {
  background: var(--bg-card);
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  .price-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
    .price {
      font-size: 48rpx;
      font-weight: 800;
      color: var(--brand-primary);
      font-family: $font-family-base;
    }
    .price-locked {
      display: inline-flex;
      align-items: center;
      gap: 8rpx;
      padding: 10rpx 20rpx;
      background: var(--bg-hover);
      border-radius: 12rpx;
      font-size: 24rpx;
      color: var(--text-secondary);
    }
  }
  .name {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
  }
  .meta {
    display: flex;
    gap: 8rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .tags {
    display: flex;
    gap: 8rpx;
    flex-wrap: wrap;
  }
}
.card {
  background: var(--bg-card);
  margin-top: 16rpx;
  padding: 0 24rpx;
}
.card-row {
  display: flex;
  align-items: center;
  height: 88rpx;
  gap: 16rpx;
  .row-label {
    width: 110rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
  .row-value {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
  }
}
.card-divider {
  height: 1rpx;
  background: var(--border-light);
}
.review {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  .review-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
    .action { font-size: 22rpx; color: var(--brand-primary); }
  }
  .review-item {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .reviewer {
      display: flex;
      align-items: center;
      gap: 12rpx;
      .avatar {
        width: 48rpx;
        height: 48rpx;
        border-radius: 50%;
        background: $brand-gradient;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22rpx;
        font-weight: 800;
      }
      .nickname { font-size: 24rpx; color: var(--text-primary); }
      .stars { display: flex; gap: 2rpx; margin-left: auto; }
    }
    .content { font-size: 24rpx; color: var(--text-secondary); line-height: 1.5; }
  }
}
.section-title-block {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 32rpx 64rpx;
  .line { flex: 1; height: 1rpx; background: var(--border-default); }
  .title { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
}
.detail-imgs {
  background: var(--bg-card);
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  .detail-img {
    width: 100%;
    display: block;
    border-radius: 12rpx;
  }
}
.param-table {
  margin-top: 12rpx;
  border: 1rpx solid var(--border-light);
  border-radius: 12rpx;
  overflow: hidden;
  .param-row {
    display: flex;
    border-bottom: 1rpx solid var(--border-light);
    &:last-child { border-bottom: none; }
    .k {
      width: 200rpx;
      padding: 16rpx 24rpx;
      background: var(--bg-page);
      font-size: 24rpx;
      color: var(--text-tertiary);
    }
    .v {
      flex: 1;
      padding: 16rpx 24rpx;
      font-size: 24rpx;
      color: var(--text-primary);
    }
  }
}
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-card);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);
  z-index: 50;
  .icon-btn {
    width: 80rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rpx;
    font-size: 20rpx;
    color: var(--text-secondary);
  }
  .cart-btn, .buy-btn {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
    color: #fff;
  }
  .btn-disabled {
    background: linear-gradient(135deg, #d1d5db, #9ca3af) !important;
    box-shadow: none !important;
    opacity: 0.95;
  }
  .cart-btn {
    background: #FFB300;
    border-radius: 80rpx 0 0 80rpx;
  }
  .buy-btn {
    background: $brand-gradient;
    border-radius: 0 80rpx 80rpx 0;
    margin-left: -8rpx;
  }
}
.sku-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sku-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.sku-head {
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
  border-bottom: 1rpx solid var(--border-light);
  .sku-img {
    // mp-weixin 负 margin 必须配 position+z-index 才能浮出
    position: relative;
    z-index: 1;
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    margin-top: -40rpx;
    background: var(--bg-page);
    border: 4rpx solid var(--bg-card);
  }
  .sku-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .sku-price {
      font-size: 40rpx;
      font-weight: 800;
      color: var(--brand-primary);
      font-family: $font-family-base;
    }
    .sku-name {
      font-size: 24rpx;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sku-selected {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
  .sku-close {
    padding: 8rpx;
  }
}
.sku-body {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
}
.spec-group {
  padding: 24rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  .group-name {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 16rpx;
    color: var(--text-primary);
  }
  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }
  .chip {
    padding: 12rpx 24rpx;
    border: 1rpx solid var(--border-default);
    border-radius: 999rpx;
    font-size: 24rpx;
    color: var(--text-primary);
    background: var(--bg-card);
    &.active {
      border-color: var(--brand-primary);
      background: rgba(255,77,45,0.08);
      color: var(--brand-primary);
      font-weight: 600;
    }
  }
  .sg-block {
    margin-bottom: 16rpx;
    &:last-child { margin-bottom: 0; }
  }
}

/* 按尺寸定价输入区 */
.size-block {
  padding: 24rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.size-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .size-tag {
    display: inline-flex;
    align-items: center;
    gap: 6rpx;
    padding: 6rpx 16rpx;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
  }
  .size-hint {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: $font-family-base;
  }
}
.size-inputs {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  .size-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
    .sf-label {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
    .sf-input {
      width: 100%;
      height: 88rpx;
      padding: 0 16rpx;
      background: var(--bg-page);
      border: 2rpx solid var(--border-default);
      border-radius: 12rpx;
      font-size: 32rpx;
      font-weight: 700;
      color: var(--text-primary);
      font-family: $font-family-base;
      text-align: center;
      box-sizing: border-box;
      &:focus { border-color: var(--brand-primary); }
    }
  }
  .size-x {
    padding-bottom: 16rpx;
    font-size: 32rpx;
    color: var(--text-tertiary);
    font-weight: 800;
  }
}
.size-calc {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6rpx;
  padding: 12rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  .calc-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .calc-val {
    font-size: 24rpx;
    color: var(--text-primary);
    font-family: $font-family-base;
    font-weight: 600;
  }
  .calc-x {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.size-total {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  padding: 16rpx;
  background: linear-gradient(135deg, rgba(255,77,45,0.08), rgba(255,156,110,0.04));
  border: 1rpx solid rgba(255,77,45,0.2);
  border-radius: 12rpx;
  .st-label {
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-right: auto;
  }
  .st-cur {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: $font-family-base;
  }
  .st-num {
    font-size: 48rpx;
    font-weight: 800;
    color: var(--brand-primary);
    line-height: 1;
    font-family: $font-family-base;
  }
  &.invalid {
    border-color: rgba(255,59,48,0.4);
    background: rgba(255,59,48,0.04);
    .st-cur, .st-num { color: #FF3B30; }
  }
}
.size-warn {
  font-size: 22rpx;
  color: #FF3B30;
  padding: 4rpx 8rpx;
}
.qty-row {
  display: inline-flex;
  align-items: center;
  border: 1rpx solid var(--border-default);
  border-radius: 8rpx;
  overflow: hidden;
  .qty-btn {
    width: 64rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qty-val {
    min-width: 80rpx;
    text-align: center;
    border-left: 1rpx solid var(--border-default);
    border-right: 1rpx solid var(--border-default);
    font-size: 26rpx;
    font-family: $font-family-base;
    line-height: 56rpx;
  }
}
.sku-ft {
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  .confirm-btn {
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 30rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
  }
}
</style>
