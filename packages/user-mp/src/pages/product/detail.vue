<script setup lang="ts">
/**
 * UM-02 · 商品详情
 * 还原 原型图/user-mini.jsx::UM_Detail
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
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
import { safeSwitchTab } from '../../utils/tab-nav'

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
      } catch {
        /* ignore */
      }
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
      safeSwitchTab('/pages/tabbar/home/index')
    }
  } catch {
    safeSwitchTab('/pages/tabbar/home/index')
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
    })[viewerTier.value],
)

/**
 * 规格组 —— 从商品真实 SKU 数据反推出每个规格名的可选值。
 * 没 SKU 数据就返回空对象(单 SKU/无规格商品),弹层会跳过规格组只显示数量。
 * 之前的硬编码 fallback `{ 尺寸: [...], 材质: [...] }` 是开发期占位,
 * 生产里会让用户看到跟商品无关的假规格,已删除。
 */
const specGroups = computed<Record<string, string[]>>(() => {
  if (!product.value?.skus?.length) return {}
  const groups: Record<string, Set<string>> = {}
  product.value.skus.forEach((sku) => {
    if (sku.active === false) return
    Object.entries(sku.specs).forEach(([k, v]) => {
      if (!groups[k]) groups[k] = new Set()
      groups[k].add(String(v))
    })
  })
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v]]))
})

/**
 * 视觉规格组判定 —— 当某规格的所有取值都能从 SKU.image 找到对应缩略图时,
 * 才升级为"图片+文字"卡片模式(对齐截图首组"圆黑把手/拉花把手"那种)。
 *
 * 设计原则:必须有真实图片才显示视觉模式。绝不用 index 1:1 映射主图这种
 * 脆弱猜测(主图顺序跟规格值顺序毫无业务关联,会显示完全错位的图)。
 * 商家未上传 SKU.image → 所有规格都降级为纯文字 chip,这是诚实的降级方案。
 */
const visualSpecKey = computed<string | null>(() => {
  if (!product.value?.skus?.length) return null
  const keys = Object.keys(specGroups.value)
  // 只考虑第一个规格组作为视觉规格组(避免多组图片堆叠);
  // 第一组的每个值都必须能从至少一条 SKU 拿到 image 才升级
  const first = keys[0]
  if (!first) return null
  const values = specGroups.value[first] || []
  if (values.length === 0) return null
  const allHaveImage = values.every((v) =>
    product.value!.skus.some(
      (sku) =>
        String((sku.specs as any)?.[first]) === v &&
        typeof (sku as any).image === 'string' &&
        (sku as any).image,
    ),
  )
  return allHaveImage ? first : null
})

/** 给视觉规格取缩略图:从匹配该规格值的首条 SKU.image 拿,严格要求 SKU 自带 image */
function thumbForSpecValue(key: string, value: string): string {
  const sku = product.value?.skus?.find(
    (s) =>
      String((s.specs as any)?.[key]) === value &&
      typeof (s as any).image === 'string' &&
      (s as any).image,
  )
  return (sku as any)?.image || ''
}

/** 已选规格的连缀描述 —— 用于 SKU 头部"已选择 xxx xxx xxx"行 */
const selectedSpecSummary = computed(() => {
  // by-size 模式专属摘要
  if (isBySize.value) {
    if (customLength.value > 0 && customWidth.value > 0) {
      return `已选 ${customLength.value}×${customWidth.value}${sizeUnit.value} · ${customArea.value} m²`
    }
    return '请输入定制尺寸'
  }
  // 标准定价模式:列出缺失的规格组
  const allKeys = Object.keys(specGroups.value)
  const missing = allKeys.filter((k) => !specSelections.value[k])
  if (missing.length > 0 && allKeys.length > 0) {
    return `请选择:${missing.join(' / ')}`
  }
  const vals = allKeys.map((k) => specSelections.value[k]).filter(Boolean)
  return vals.length > 0 ? `已选 ${vals.join(' · ')}` : '请选择规格'
})

/** SKU 弹层主按钮是否可点 —— 必须选满所有规格组(by-size 必须输入有效尺寸) */
const skuReadyToConfirm = computed(() => {
  if (isBySize.value) return sizeValid.value && customTotal.value > 0
  const allKeys = Object.keys(specGroups.value)
  // 无规格组(单 SKU 商品)直接放行
  if (allKeys.length === 0) return true
  return allKeys.every((k) => !!specSelections.value[k])
})

/** SKU 弹层主按钮文案 */
const confirmBtnLabel = computed(() => {
  if (!skuReadyToConfirm.value) {
    if (isBySize.value) return '请输入尺寸'
    const missing = Object.keys(specGroups.value).filter((k) => !specSelections.value[k])
    return missing.length > 0 ? `请选择 ${missing[0]}` : '请选择规格'
  }
  return skuMode.value === 'cart' ? '加入购物车' : '立即购买'
})

/**
 * 当前已选规格对应的真实 SKU(全部 specGroup 都选满才返回);
 * 用于 SKU 弹层 header 价格跟随选择动态变化。
 */
const selectedSku = computed(() => {
  if (!product.value?.skus?.length) return null
  const allKeys = Object.keys(specGroups.value)
  if (allKeys.length === 0) return product.value.skus[0] ?? null
  if (!allKeys.every((k) => !!specSelections.value[k])) return null
  return (
    product.value.skus.find(
      (s) =>
        s.active !== false &&
        allKeys.every((k) => String((s.specs as any)?.[k]) === specSelections.value[k]),
    ) ?? null
  )
})

/**
 * 已选 SKU 的实际单价 —— 用 displayPolicy.priceKind 选 wholesale/retail/member
 * 与商品聚合价 currentPrice 不同:这是用户即将下单的真实金额,SKU header 必须用这个。
 */
const selectedSkuPrice = computed<number | null>(() => {
  const sku = selectedSku.value
  if (!sku) return null
  const kind = displayPolicy.value.priceKind
  if (kind === 'wholesale') return Number((sku as any).priceWholesale ?? 0)
  if (kind === 'member') return Number((sku as any).priceMember ?? 0)
  return Number((sku as any).priceRetail ?? 0)
})

/** SKU 弹层头部的价格展示 —— 跟随用户已选 SKU 动态变化,而不是商品聚合价 */
const headerPriceDisplay = computed(() => {
  if (isBySize.value) {
    if (customLength.value > 0 && customWidth.value > 0 && customTotal.value > 0) {
      return { prefix: '¥', amount: customTotal.value.toFixed(2), hint: '' }
    }
    return { prefix: '', amount: '', hint: '待输入尺寸' }
  }
  // 未选满规格:显示商品聚合价让用户大概知道价位(价格不可见时直接提示)
  if (selectedSkuPrice.value === null) {
    if (!priceVisible.value) return { prefix: '', amount: '', hint: '请选择规格' }
    return { prefix: '¥', amount: String(currentPrice.value), hint: '' }
  }
  // 已选满:显示该 SKU 的真实单价
  return { prefix: '¥', amount: String(selectedSkuPrice.value), hint: '' }
})

/**
 * 物流方式文案 —— 只读 product.shipping 真实字段
 *
 * 注意:绝不在这里硬编码"48小时内发货""免运费"这类承诺,
 * 后端 schema 没有 deliveryDays/freeShipping 字段,凭空写文案=对用户撒谎。
 * 商家未来需要时效承诺,需先扩展 Product schema,再从字段读取。
 */
const shippingPromise = computed(() => {
  const map: Record<string, string> = {
    factory: '厂家直发',
    local: '本地配送',
    pickup: '门店自提',
  }
  const ways = (product.value?.shipping || []).map((s) => map[s]).filter(Boolean)
  return ways.length > 0 ? ways.join(' / ') : ''
})

/**
 * 评价列表：优先取后端 product.reviews 字段。
 * 没有 Review model 上线前显示空态，避免硬编码假评价（之前 "L***张：实物比图片好看…"
 * 是占位文案，给用户判断的时候会误导）。
 */
interface ProductReview {
  id: string
  nickname: string
  avatar?: string
  rating: number
  content: string
  createdAt?: string
}
const reviews = computed<ProductReview[]>(() => {
  const list = (product.value as any)?.reviews
  return Array.isArray(list) ? list : []
})

/**
 * 参数表：优先取后端 product.specs（Record<string,string>）；
 * 没有则展示统一空态指引"详情图查看完整参数"。
 */
interface SpecRow {
  k: string
  v: string
}
const paramRows = computed<SpecRow[]>(() => {
  const raw = (product.value as any)?.specs
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({ k, v: String(v) }))
})

/**
 * 商品详情图列表：
 * - 新版商家端把详情图独立存到 product.detailImages（最多 20 张）
 * - 老商品仅有 images（主图+轮播图），向下兼容 images.slice(1) 当作详情图展示
 */
const detailImagesList = computed<string[]>(() => {
  const p = product.value as unknown as { detailImages?: string[]; images?: string[] } | null
  if (!p) return []
  if (Array.isArray(p.detailImages) && p.detailImages.length > 0) return p.detailImages
  return (p.images ?? []).slice(1)
})

function selectSpec(group: string | number, val: string) {
  specSelections.value[String(group)] = val
}

/** 跳首页（模板直接 uni.xxx 在 vue-tsc 严格模式下不被识别，封一层） */
function goHome() {
  safeSwitchTab('/pages/tabbar/home/index')
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
      } catch {
        /* ignore */
      }
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

async function confirmSku() {
  if (!product.value) return

  // 按钮未就绪时,提示用户具体缺什么(不允许静默兜底到首个 SKU,避免下错单)
  if (!skuReadyToConfirm.value) {
    if (isBySize.value) {
      uni.showToast({
        title: sizeValid.value ? '请输入有效尺寸' : `尺寸需在 ${sizeRangeHint.value} 之间`,
        icon: 'none',
      })
      return
    }
    const missing = Object.keys(specGroups.value).filter((k) => !specSelections.value[k])
    if (missing.length > 0) {
      uni.showToast({ title: `请先选择「${missing.join('/')}」`, icon: 'none' })
      return
    }
  }

  const spec = isBySize.value
    ? `${customLength.value}×${customWidth.value} ${sizeUnit.value} · ${customArea.value} m²`
    : specLabel()

  // 严格 SKU 匹配:by-size 取首个 active SKU,标准模式取 selectedSku
  // (selectedSku 已用 active 过滤+全 spec 严格匹配;未匹配上拒单,绝不 fallback)
  let targetSku: any = null
  if (isBySize.value) {
    targetSku = product.value.skus?.find((s) => s.active !== false) ?? null
  } else {
    targetSku = selectedSku.value
  }

  if (!targetSku?.id) {
    uni.showToast({ title: '该规格组合暂时缺货', icon: 'none' })
    return
  }

  // 下单价格优先用 SKU 真实单价(跟随规格);
  // by-size 模式用 customTotal(用户输入尺寸算出的真实金额);
  // 兜底用 currentPrice(商品聚合价,但严格 selectedSku 匹配后理论不会走到)
  let orderPrice = currentPrice.value
  if (isBySize.value) {
    orderPrice = customTotal.value
  } else if (selectedSkuPrice.value !== null) {
    orderPrice = selectedSkuPrice.value
  }

  const item = {
    productId: product.value.id,
    skuId: String(targetSku.id),
    name: product.value.name,
    spec,
    // 优先用 SKU 自带的代表图(精准对应规格),没有则降级到商品主图
    image: targetSku.image || product.value.images?.[0] || '',
    price: orderPrice,
    qty: qty.value,
    merchantId: product.value.merchantId,
    // 按尺寸定价商品：透传定制尺寸，服务端据此重算成交价（避免显示价≠实付价、尺寸丢失）
    ...(isBySize.value
      ? {
          bySize: {
            length: Number(customLength.value),
            width: Number(customWidth.value),
            area: Number(customArea.value),
          },
        }
      : {}),
  }

  if (skuMode.value === 'cart') {
    // 登录态走后端 POST /u/cart；未登录态本地缓存。失败保留弹层让用户重试
    try {
      uni.showLoading({ title: '加购中…', mask: true })
      await cartStore.addCart(item)
      uni.hideLoading()
      showSku.value = false
      uni.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (e: any) {
      uni.hideLoading()
      uni.showToast({ title: e?.message || '加购失败', icon: 'none' })
    }
  } else {
    showSku.value = false
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

// 微信分享：分享给好友 / 朋友圈
// 顶部 NavBar 已有 share 图标；mp-weixin 端用户可通过右上角 ... 触发，这两个 hook 提供分享内容
onShareAppMessage(() => ({
  title: product.value?.name || '经纬科技商品',
  path: `/pages/product/detail?id=${productId.value}`,
  imageUrl: product.value?.images?.[0] || '',
}))
onShareTimeline(() => ({
  title: product.value?.name || '经纬科技商品',
  query: `id=${productId.value}`,
  imageUrl: product.value?.images?.[0] || '',
}))
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
    <NavBar
      title="商品详情"
      right-icon="share"
      bg="rgba(255,255,255,0.9)"
      color="var(--text-primary)"
      :sticky="true"
    />

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
        <view class="banner-counter"> {{ swiperIndex + 1 }} / {{ product.images.length }} </view>
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
          <TagChip
            v-for="t in product.tags?.slice(0, 4)"
            :key="t"
            :text="t"
            tone="soft"
            size="sm"
          />
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
          <text v-if="reviews.length > 0" class="action">查看全部 ›</text>
        </view>
        <template v-if="reviews.length > 0">
          <view v-for="r in reviews.slice(0, 3)" :key="r.id" class="review-item">
            <view class="reviewer">
              <image v-if="r.avatar" :src="r.avatar" class="avatar avatar-img" />
              <view v-else class="avatar">{{ (r.nickname || 'U').slice(0, 1).toUpperCase() }}</view>
              <text class="nickname">{{ r.nickname }}</text>
              <view class="stars">
                <Icon
                  v-for="i in 5"
                  :key="i"
                  name="star-fill"
                  :size="24"
                  :color="i <= (r.rating || 5) ? '#FFB300' : '#E5E6EB'"
                />
              </view>
            </view>
            <text class="content">{{ r.content }}</text>
          </view>
        </template>
        <view v-else class="review-empty">
          <Icon name="star" :size="48" color="var(--text-tertiary)" />
          <text class="empty-title">暂无评价</text>
          <text class="empty-sub">等收到货来当第一个评价的人吧～</text>
        </view>
      </view>

      <view class="section-title-block">
        <view class="line" />
        <text class="title">商品详情</text>
        <view class="line" />
      </view>
      <view class="detail-imgs">
        <image
          v-for="(img, i) in detailImagesList"
          :key="i"
          :src="img"
          mode="widthFix"
          class="detail-img"
        />
        <view v-if="paramRows.length > 0" class="param-table">
          <view class="param-row" v-for="p in paramRows" :key="p.k">
            <text class="k">{{ p.k }}</text>
            <text class="v">{{ p.v }}</text>
          </view>
        </view>
        <view v-else class="param-empty">
          <Icon name="info" :size="28" color="var(--text-tertiary)" />
          <text>商家未提供参数表，详细规格请参考上方详情图</text>
        </view>
      </view>

      <view style="height: 160rpx" />
    </scroll-view>

    <view class="action-bar">
      <view class="icon-btn" @click="toggleFav">
        <Icon
          :name="favorited ? 'star-fill' : 'star'"
          :size="40"
          :color="favorited ? '#FFB300' : 'var(--text-secondary)'"
        />
        <text>收藏</text>
      </view>
      <view class="icon-btn" @click="goChat">
        <Icon name="message" :size="40" color="var(--text-secondary)" />
        <text>客服</text>
      </view>
      <view
        class="cart-btn"
        :class="{ 'btn-disabled': !userStore.isLogin || !buyAllowedByPolicy }"
        @click="openSku('cart')"
      >
        {{ !userStore.isLogin || buyAllowedByPolicy ? '加入购物车' : '联系询价' }}
      </view>
      <view
        class="buy-btn"
        :class="{ 'btn-disabled': !userStore.isLogin || !buyAllowedByPolicy }"
        @click="openSku('buy')"
      >
        {{ !userStore.isLogin || buyAllowedByPolicy ? '立即购买' : '申请门店' }}
      </view>
    </view>

    <view v-if="showSku" class="sku-mask" @click="showSku = false">
      <view class="sku-sheet" @click.stop>
        <!-- 紧凑 sticky 头部:商品图 + 价格(+优惠券) + 已选规格摘要 -->
        <view class="sku-head">
          <image :src="product.images?.[0]" mode="aspectFill" class="sku-img" />
          <view class="sku-info">
            <view class="sku-price-row">
              <text v-if="headerPriceDisplay.prefix" class="sku-cur">{{ headerPriceDisplay.prefix }}</text>
              <text v-if="headerPriceDisplay.amount" class="sku-price">{{ headerPriceDisplay.amount }}</text>
              <text v-if="headerPriceDisplay.hint" class="sku-price-hint">{{ headerPriceDisplay.hint }}</text>
            </view>
            <text class="sku-selected">{{ selectedSpecSummary }}</text>
          </view>
          <view class="sku-close" @click="showSku = false">
            <Icon name="close" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>

        <scroll-view scroll-y class="sku-body">
          <!-- 按尺寸定价输入区 -->
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
          </template>

          <!-- 规格组:每个 key 一个 section -->
          <view v-for="(vals, key) in specGroups" :key="key" class="spec-group">
            <!-- 视觉规格组无标题,直接展示图片卡片;其他规格组保留标题 -->
            <text v-if="key !== visualSpecKey" class="group-name">{{ key }}</text>

            <!-- 视觉规格:图片+文字卡片(仅当所有规格值都有 SKU.image 时触发) -->
            <view v-if="key === visualSpecKey" class="swatch-list">
              <view
                v-for="v in vals"
                :key="v"
                :class="['swatch', specSelections[key] === v ? 'active' : '']"
                @click="selectSpec(key, v)"
              >
                <image
                  :src="thumbForSpecValue(String(key), v)"
                  mode="aspectFill"
                  class="swatch-img"
                />
                <text class="swatch-text">{{ v }}</text>
              </view>
            </view>

            <!-- 普通规格:文字 chip -->
            <view v-else class="chip-list">
              <view
                v-for="v in vals"
                :key="v"
                :class="['chip', specSelections[key] === v ? 'active' : '']"
                @click="selectSpec(key, v)"
                >{{ v }}</view
              >
            </view>
          </view>

          <!-- 数量:紧凑显示 -->
          <view class="spec-group qty-group">
            <text class="group-name">数量</text>
            <view class="qty-row">
              <view class="qty-btn" @click="changeQty(-1)">
                <Icon name="minus" :size="26" color="var(--text-primary)" />
              </view>
              <text class="qty-val">{{ qty }}</text>
              <view class="qty-btn" @click="changeQty(1)">
                <Icon name="plus" :size="26" color="var(--text-primary)" />
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- 底部:物流方式(有则展示) + 主按钮 -->
        <view class="sku-ft">
          <view v-if="shippingPromise" class="ft-promise">
            <Icon name="info" :size="20" color="var(--text-tertiary)" />
            <text>配送方式:{{ shippingPromise }}</text>
          </view>
          <view
            :class="['confirm-btn', { disabled: !skuReadyToConfirm }]"
            @click="confirmSku"
          >
            {{ confirmBtnLabel }}
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
.error-page,
.loading-page {
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
    background: linear-gradient(135deg, #ffb199, #ff6e4d);
    color: #fff;
    font-size: 72rpx;
    font-weight: 800;
    margin-bottom: 16rpx;
    box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.35);
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
  .btn-ghost,
  .btn-primary {
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
    box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.35);
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
    background: rgba(0, 0, 0, 0.5);
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
    .title {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .action {
      font-size: 22rpx;
      color: var(--brand-primary);
    }
  }
  .review-item {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    padding-bottom: 12rpx;
    border-bottom: 1rpx dashed var(--border-light);
    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
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
        overflow: hidden;
      }
      .avatar-img {
        background: var(--bg-page);
      }
      .nickname {
        font-size: 24rpx;
        color: var(--text-primary);
      }
      .stars {
        display: flex;
        gap: 2rpx;
        margin-left: auto;
      }
    }
    .content {
      font-size: 24rpx;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
  .review-empty {
    padding: 32rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    .empty-title {
      font-size: 26rpx;
      color: var(--text-secondary);
    }
    .empty-sub {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
}
.param-empty {
  margin-top: 12rpx;
  padding: 24rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.section-title-block {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 32rpx 64rpx;
  .line {
    flex: 1;
    height: 1rpx;
    background: var(--border-default);
  }
  .title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
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
    &:last-child {
      border-bottom: none;
    }
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
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
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
  .cart-btn,
  .buy-btn {
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
    background: #ffb300;
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
  background: rgba(0, 0, 0, 0.5);
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
/* SKU 头部:商品图 + 价格 + 已选规格摘要 + X */
.sku-head {
  padding: 24rpx 24rpx 20rpx;
  display: flex;
  gap: 16rpx;
  align-items: center;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
  .sku-img {
    flex-shrink: 0;
    width: 128rpx;
    height: 128rpx;
    border-radius: 12rpx;
    background: var(--bg-page);
  }
  .sku-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .sku-price-row {
      display: flex;
      align-items: baseline;
      gap: 2rpx;
      color: var(--brand-primary);
      font-family: $font-family-base;
      .sku-cur {
        font-size: 26rpx;
        font-weight: 800;
      }
      .sku-price {
        font-size: 44rpx;
        font-weight: 800;
        line-height: 1;
      }
      .sku-price-hint {
        font-size: 26rpx;
        font-weight: 600;
        color: var(--text-tertiary);
      }
    }
    .sku-selected {
      font-size: 22rpx;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-all;
    }
  }
  .sku-close {
    flex-shrink: 0;
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: var(--bg-page);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.sku-body {
  flex: 1;
  height: 0;
  padding: 0 24rpx 20rpx;
}

/* 规格组:标题 + chip/swatch 容器 */
.spec-group {
  padding: 24rpx 0 4rpx;
  .group-name {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 16rpx;
    color: var(--text-primary);
  }
  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  .chip {
    padding: 14rpx 28rpx;
    border: 2rpx solid transparent;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    background: var(--bg-page);
    line-height: 1.2;
    &.active {
      border-color: var(--brand-primary);
      background: var(--bg-card);
      color: var(--brand-primary);
      font-weight: 600;
    }
  }
}

/* 视觉型规格:图片 + 文字卡片(对齐截图首组的"圆黑把手/拉花把手"卡片) */
.swatch-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.swatch {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  background: var(--bg-page);
  overflow: hidden;
  &.active {
    border-color: var(--brand-primary);
    background: var(--bg-card);
    .swatch-text {
      color: var(--brand-primary);
      font-weight: 600;
    }
  }
  .swatch-img {
    width: 100%;
    aspect-ratio: 1;
    background: var(--bg-card);
    display: block;
  }
  .swatch-text {
    padding: 14rpx 8rpx;
    text-align: center;
    font-size: 24rpx;
    color: var(--text-primary);
    line-height: 1.2;
  }
}

/* 数量行:紧凑显示 */
.qty-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0 4rpx;
  .group-name {
    margin-bottom: 0;
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
      &:focus {
        border-color: var(--brand-primary);
      }
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
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.08), rgba(255, 156, 110, 0.04));
  border: 1rpx solid rgba(255, 77, 45, 0.2);
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
    border-color: rgba(255, 59, 48, 0.4);
    background: rgba(255, 59, 48, 0.04);
    .st-cur,
    .st-num {
      color: #ff3b30;
    }
  }
}
.size-warn {
  font-size: 22rpx;
  color: #ff3b30;
  padding: 4rpx 8rpx;
}
.qty-row {
  display: inline-flex;
  align-items: center;
  background: var(--bg-page);
  border-radius: 8rpx;
  overflow: hidden;
  .qty-btn {
    width: 60rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    &:active {
      background: rgba(0, 0, 0, 0.04);
    }
  }
  .qty-val {
    min-width: 80rpx;
    text-align: center;
    font-size: 28rpx;
    font-family: $font-family-base;
    font-weight: 600;
    line-height: 56rpx;
    background: var(--bg-card);
  }
}

/* 底部:承诺文案 + 主按钮 */
.sku-ft {
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  .ft-promise {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .confirm-btn {
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 30rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
    /* 未选满规格时的禁用态:灰底无阴影,但仍可点击触发"请先选择 xxx"提示 */
    &.disabled {
      background: var(--bg-hover);
      color: var(--text-tertiary);
      box-shadow: none;
    }
  }
}
</style>
