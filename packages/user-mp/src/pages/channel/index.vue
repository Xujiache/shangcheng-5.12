<script setup lang="ts">
/**
 * 频道页 · 通用（新品 / 上新 / 活动 / 会员）
 * 由首页 4 个快捷按钮跳入，参数 key 决定主题和筛选规则
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productService, couponService } from '../../services'
import type { Coupon } from '../../services'
import { useUserStore } from '../../store/user'
import { useCartStore } from '../../store/cart'
import type { Product } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

type ChannelKey = 'new' | 'hot' | 'promo' | 'vip'

interface ChannelConfig {
  key: ChannelKey
  title: string
  subtitle: string
  bannerTitle: string
  bannerDesc: string
  gradient: string
  icon: string
  filterTag?: string[]
  /** 排序方式 */
  sort: 'newest' | 'sales' | 'price-asc' | 'price-desc'
  /** 顶部专属区块 */
  feature?: 'coupon' | 'member' | 'top3' | 'newest'
}

const CONFIGS: Record<ChannelKey, ChannelConfig> = {
  new: {
    key: 'new',
    title: '新品上市',
    subtitle: '本月新增 · 抢先体验',
    bannerTitle: '新品上市',
    bannerDesc: '匠心精选 · 每周更新',
    gradient: 'linear-gradient(135deg, #FF4D2D, #FF9C6E)',
    icon: 'sparkles',
    filterTag: ['新品'],
    sort: 'newest',
    feature: 'newest',
  },
  hot: {
    key: 'hot',
    title: '热销榜单',
    subtitle: '万人种草 · 销量 TOP',
    bannerTitle: '热销榜单',
    bannerDesc: '全网热销 · 实时更新',
    gradient: 'linear-gradient(135deg, #FF7A45, #FFB300)',
    icon: 'flag',
    filterTag: ['热销', '推荐'],
    sort: 'sales',
    feature: 'top3',
  },
  promo: {
    key: 'promo',
    title: '限时活动',
    subtitle: '直降到底 · 优惠满满',
    bannerTitle: '限时活动',
    bannerDesc: '叠加券更省 · 千元好物今日特价',
    gradient: 'linear-gradient(135deg, #FAAD14, #FF4D2D)',
    icon: 'lightning',
    filterTag: ['限时', '热销'],
    sort: 'price-asc',
    feature: 'coupon',
  },
  vip: {
    key: 'vip',
    title: '会员专享',
    subtitle: '会员价 · 比零售价更便宜',
    bannerTitle: '会员专享',
    bannerDesc: '开通会员 · 享 9 折零售价',
    gradient: 'linear-gradient(135deg, #A855F7, #FF4D2D)',
    icon: 'crown',
    filterTag: ['推荐'],
    sort: 'price-desc',
    feature: 'member',
  },
}

const channelKey = ref<ChannelKey>('new')
const products = ref<Product[]>([])
const loading = ref(false)
const userStore = useUserStore()
const cartStore = useCartStore()

/**
 * 活动频道顶部券位 —— 走 couponService.list() 拉真实平台券，最多展示 6 张。
 * 之前硬编码的 COUPONS 数组(满200/满1000/满500)是开发期占位，已删除：
 *   - 与真实券池 id 不匹配，点"领取"也只能跳走，给用户造成"看到却领不到"困惑
 *   - 推广员/运营调整券时前端要重新发版，违反"配置项不可硬编码"原则
 */
const channelCoupons = ref<Coupon[]>([])

const config = computed(() => CONFIGS[channelKey.value])

onLoad((options) => {
  const k = options?.key as ChannelKey
  if (k && CONFIGS[k]) channelKey.value = k
  uni.setNavigationBarTitle({ title: CONFIGS[channelKey.value].title })
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await productService.list({ pageSize: 30 })
    let list = res.list
    const cfg = config.value

    // 标签过滤
    if (cfg.filterTag?.length) {
      const matched = list.filter((p) => cfg.filterTag!.some((t) => p.tags?.includes(t)))
      // 数据池不足时降级到全量，避免空展示
      if (matched.length >= 6) list = matched
    }

    // 排序
    if (cfg.sort === 'newest') {
      list = list.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    } else if (cfg.sort === 'sales') {
      list = list.slice().sort((a, b) => b.sales - a.sales)
    } else if (cfg.sort === 'price-asc') {
      list = list.slice().sort((a, b) => a.priceRetailMin - b.priceRetailMin)
    } else if (cfg.sort === 'price-desc') {
      list = list.slice().sort((a, b) => b.priceRetailMin - a.priceRetailMin)
    }

    products.value = list
  } finally {
    loading.value = false
  }
  // 活动频道独立拉真实可领券池（失败时静默，留空态由模板处理）
  if (config.value.feature === 'coupon') {
    couponService
      .list()
      .then((r) => {
        channelCoupons.value = (r?.list || []).slice(0, 6)
      })
      .catch(() => {
        channelCoupons.value = []
      })
  }
}

/** 券面展示文案（折扣/满减/直减 三种类型统一） */
function couponAmountText(c: Coupon): string {
  if (c.type === 'discount' && c.discountPercent != null) {
    return `${(c.discountPercent * 10).toFixed(1)}折`
  }
  return `¥${c.amount ?? 0}`
}
function couponThresholdText(c: Coupon): string {
  if (c.threshold && c.threshold > 0) return `满 ${c.threshold} 可用`
  return '无门槛'
}

function priceVisibleOf(p: Product): boolean {
  if (userStore.isLogin) return true
  return !!p.priceDisplayRules?.guestVisible
}

function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` })
}

async function onAddCart(p: Product) {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  // 频道页瀑布流加购：拉详情拿真实 SKU id。
  // 多 SKU 时本期简化为取第一个；后续可改成跳详情页让用户选规格。
  try {
    uni.showLoading({ title: '加购中…', mask: true })
    const detail = await productService.detail(p.id, { silent: true })
    const firstSku = detail?.skus?.[0]
    if (!firstSku?.id) {
      uni.hideLoading()
      uni.showToast({ title: '该商品暂无可用规格，请到详情页查看', icon: 'none' })
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

/**
 * 频道页券位点击 —— 直接跳领券中心。
 * 不在频道页做实际 claim 调用，避免重复实现：领取流程统一在 /pages/coupon/center 处理
 * (那边有"已领过/库存不足/未登录"的完整异常分支与状态回显)。
 */
function receiveCoupon(_c: Coupon) {
  uni.navigateTo({ url: '/pages/coupon/center' })
}

/** 顶部"全部券"按钮 */
function goCouponCenter() {
  uni.navigateTo({ url: '/pages/coupon/center' })
}

/**
 * 开通会员：
 *   本前端目前没有会员订阅独立流程（后端用户端无 /u/member/subscribe 接口），
 *   为避免之前 setTimeout 假成功的误导，统一引导到 APP 端商家订阅页面。
 *   待后端补上 /u/member/subscribe + 微信小程序订阅签名后再接入真实支付。
 */
function openMember() {
  uni.showModal({
    title: '开通会员',
    content:
      '会员订阅暂仅支持商家 APP 端开通。请在「商家 APP · 我的 · 会员订阅」处购买月卡/年卡，或联系客服。',
    confirmText: '联系客服',
    cancelText: '我知道了',
    success: (r) => {
      if (r.confirm) {
        // 跳客服会话；如果之前没绑商家就走 ensureSession 找官方客服
        uni.navigateTo({ url: '/pages/chat/index' })
      }
    },
  })
}

/** 会员省钱：retail - member */
function memberSave(p: Product): number {
  return Math.max(0, p.priceRetailMin - (p.priceMemberMin ?? p.priceRetailMin))
}

/** TOP 3 商品（热销榜专用） */
const top3 = computed(() => products.value.slice(0, 3))
const rest = computed(() =>
  config.value.feature === 'top3' ? products.value.slice(3) : products.value,
)

const colLeft = computed(() => rest.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => rest.value.filter((_, i) => i % 2 === 1))

function imgHeightOf(i: number): number {
  const variants = [320, 380, 280, 360, 300, 400]
  return variants[i % variants.length]
}
</script>

<template>
  <view class="page">
    <NavBar :title="config.title" />

    <scroll-view scroll-y class="scroll">
      <!-- Banner -->
      <view class="banner" :style="{ background: config.gradient }">
        <view class="banner-info">
          <text class="banner-title">{{ config.bannerTitle }}</text>
          <text class="banner-desc">{{ config.bannerDesc }}</text>
        </view>
        <view class="banner-icon">
          <Icon :name="config.icon" :size="96" color="rgba(255,255,255,0.85)" />
        </view>
      </view>

      <!-- 频道专属区块 -->
      <!-- 活动：优惠券领取（真实可领券池，空态时显示"暂无可领券"） -->
      <view v-if="config.feature === 'coupon'" class="coupon-strip">
        <view class="strip-head">
          <text class="strip-title">领券中心</text>
          <text class="strip-desc">下单立省，叠加更优惠</text>
          <text class="strip-more" @click="goCouponCenter">全部券 ›</text>
        </view>
        <scroll-view
          v-if="channelCoupons.length > 0"
          scroll-x
          class="coupon-scroll"
          :show-scrollbar="false"
        >
          <view class="coupon-list">
            <view v-for="c in channelCoupons" :key="c.id" class="coupon">
              <view class="coupon-amount">
                <text v-if="c.type !== 'discount'" class="cur">¥</text>
                <text class="num">{{ couponAmountText(c) }}</text>
              </view>
              <view class="coupon-info">
                <text class="coupon-name">{{ c.name }}</text>
                <text class="coupon-thresh">{{ couponThresholdText(c) }}</text>
              </view>
              <view class="coupon-btn" @click="receiveCoupon(c)">领取</view>
            </view>
          </view>
        </scroll-view>
        <view v-else class="coupon-empty">暂无可领券，去领券中心看看 ›</view>
      </view>

      <!-- 会员入口：只保留开通入口，权益细节统一由商家 APP 端订阅页或客服解答；
           不在用户端硬编码"专属价/免运费/生日礼/优先客服"等权益，避免和商家实际权益脱节 -->
      <view v-if="config.feature === 'member'" class="member-strip">
        <view class="member-head">
          <view class="member-info">
            <view class="member-title">
              <Icon name="crown" :size="32" color="#FFB300" />
              <text>经纬科技会员</text>
            </view>
            <text class="member-desc">查看会员专享商品，下单更优惠</text>
          </view>
          <view class="member-btn" @click="openMember">了解会员</view>
        </view>
      </view>

      <!-- 热销：TOP 3 榜单 -->
      <view v-if="config.feature === 'top3' && top3.length > 0" class="top3-strip">
        <view class="strip-head">
          <text class="strip-title">销量 TOP 3</text>
          <text class="strip-desc">本周最火</text>
        </view>
        <view class="top3-list">
          <view v-for="(p, i) in top3" :key="p.id" class="top-card" @click="goDetail(p)">
            <view :class="['rank-badge', `rank-${i + 1}`]">
              <text>{{ i + 1 }}</text>
            </view>
            <image :src="p.images?.[0]" mode="aspectFill" class="top-img" />
            <view class="top-info">
              <text class="top-name">{{ p.name }}</text>
              <text class="top-sales">已售 {{ p.sales }} 件</text>
              <view class="top-row">
                <text v-if="priceVisibleOf(p)" class="top-price">¥{{ p.priceRetailMin }}</text>
                <view v-else class="top-locked">
                  <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                  <text>登录可见</text>
                </view>
                <view class="top-add" @click.stop="onAddCart(p)">
                  <Icon name="plus" :size="24" color="#fff" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 新品：本周新增数字 -->
      <view v-if="config.feature === 'newest'" class="newest-strip">
        <view class="newest-item">
          <text class="newest-num">{{ products.length }}</text>
          <text class="newest-label">本期新品</text>
        </view>
        <view class="newest-divider" />
        <view class="newest-item">
          <text class="newest-num">每周</text>
          <text class="newest-label">更新频率</text>
        </view>
        <view class="newest-divider" />
        <view class="newest-item">
          <text class="newest-num">7天</text>
          <text class="newest-label">无理由</text>
        </view>
      </view>

      <!-- 商品列表 · 瀑布流 -->
      <view class="section-title">
        <view class="line" />
        <text>{{ config.feature === 'top3' ? '更多热销' : '全部商品' }}</text>
        <view class="line" />
      </view>

      <view class="waterfall">
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
              <view class="wf-row">
                <view class="wf-price-wrap">
                  <text v-if="priceVisibleOf(p)" class="wf-price">¥{{ p.priceRetailMin }}</text>
                  <view v-else class="wf-locked">
                    <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                    <text>登录可见</text>
                  </view>
                  <text
                    v-if="config.key === 'vip' && priceVisibleOf(p) && memberSave(p) > 0"
                    class="wf-save"
                  >
                    会员省 ¥{{ memberSave(p) }}
                  </text>
                </view>
                <view class="wf-add" @click.stop="onAddCart(p)">
                  <Icon name="plus" :size="24" color="#fff" />
                </view>
              </view>
              <view class="wf-meta">
                <text>已售 {{ p.sales }}</text>
                <view v-if="p.tags?.[0]" class="wf-tag">{{ p.tags[0] }}</view>
              </view>
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
              <view class="wf-row">
                <view class="wf-price-wrap">
                  <text v-if="priceVisibleOf(p)" class="wf-price">¥{{ p.priceRetailMin }}</text>
                  <view v-else class="wf-locked">
                    <Icon name="lock" :size="18" color="var(--text-tertiary)" />
                    <text>登录可见</text>
                  </view>
                  <text
                    v-if="config.key === 'vip' && priceVisibleOf(p) && memberSave(p) > 0"
                    class="wf-save"
                  >
                    会员省 ¥{{ memberSave(p) }}
                  </text>
                </view>
                <view class="wf-add" @click.stop="onAddCart(p)">
                  <Icon name="plus" :size="24" color="#fff" />
                </view>
              </view>
              <view class="wf-meta">
                <text>已售 {{ p.sales }}</text>
                <view v-if="p.tags?.[0]" class="wf-tag">{{ p.tags[0] }}</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-tip">— 已经到底了 —</view>
      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}
.scroll {
  flex: 1;
  height: 0;
}

/* Banner */
.banner {
  margin: 16rpx 24rpx 0;
  padding: 32rpx 28rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 200rpx;
    height: 200rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
  .banner-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    z-index: 1;
    .banner-title {
      font-size: 40rpx;
      font-weight: 800;
      letter-spacing: 1rpx;
    }
    .banner-desc {
      font-size: 22rpx;
      opacity: 0.9;
    }
  }
  .banner-icon {
    z-index: 1;
  }
}

/* 优惠券条 */
.coupon-strip {
  margin: 16rpx 0 0;
  background: var(--bg-card);
  padding: 20rpx 0;
}
.strip-head {
  padding: 0 24rpx 12rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  .strip-title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .strip-desc {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .strip-more {
    margin-left: auto;
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
  }
}
.coupon-scroll {
  white-space: nowrap;
}
.coupon-empty {
  padding: 32rpx 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-tertiary);
  background: var(--bg-card);
  border-radius: 12rpx;
  margin: 0 24rpx;
}
.coupon-list {
  display: inline-flex;
  gap: 12rpx;
  padding: 0 24rpx;
}
.coupon {
  display: inline-flex;
  flex: 0 0 auto;
  width: 380rpx;
  background: linear-gradient(90deg, #ff4d2d, #ff7a45);
  color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  .coupon-amount {
    display: flex;
    align-items: baseline;
    flex-shrink: 0;
    .cur {
      font-size: 22rpx;
    }
    .num {
      font-size: 56rpx;
      font-weight: 800;
      line-height: 1;
      font-family: $font-family-base;
    }
  }
  .coupon-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
    .coupon-name {
      font-size: 24rpx;
      font-weight: 700;
    }
    .coupon-thresh {
      font-size: 20rpx;
      opacity: 0.85;
    }
  }
  .coupon-btn {
    flex-shrink: 0;
    padding: 8rpx 20rpx;
    background: #fff;
    color: var(--brand-primary);
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
  }
}

/* 会员条 */
.member-strip {
  margin: 16rpx 24rpx 0;
  background: linear-gradient(135deg, #2d1b47, #5c3d87);
  border-radius: 24rpx;
  padding: 24rpx;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(168, 85, 247, 0.3);
}
.member-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  .member-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .member-title {
      display: flex;
      align-items: center;
      gap: 8rpx;
      font-size: 30rpx;
      font-weight: 800;
    }
    .member-desc {
      font-size: 22rpx;
      opacity: 0.85;
    }
  }
  .member-btn {
    flex-shrink: 0;
    padding: 12rpx 28rpx;
    background: linear-gradient(135deg, #ffd89b, #ffb300);
    color: #5c2d00;
    border-radius: 999rpx;
    font-size: 26rpx;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(255, 179, 0, 0.4);
  }
}
.benefit-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.benefit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  .benefit-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .benefit-label {
    font-size: 22rpx;
    font-weight: 700;
  }
  .benefit-desc {
    font-size: 18rpx;
    opacity: 0.8;
    text-align: center;
  }
}

/* TOP 3 */
.top3-strip {
  margin: 16rpx 0 0;
  background: var(--bg-card);
  padding: 20rpx 0 16rpx;
}
.top3-list {
  padding: 8rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.top-card {
  position: relative;
  display: flex;
  gap: 16rpx;
  background: var(--bg-page);
  border-radius: 16rpx;
  padding: 16rpx;
  align-items: center;
  .rank-badge {
    position: absolute;
    top: 0;
    left: 0;
    width: 48rpx;
    height: 48rpx;
    border-radius: 16rpx 0 16rpx 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 24rpx;
    font-weight: 800;
    font-family: $font-family-base;
    z-index: 2;
    &.rank-1 {
      background: linear-gradient(135deg, #ffd700, #ffa500);
    }
    &.rank-2 {
      background: linear-gradient(135deg, #c0c0c0, #888);
    }
    &.rank-3 {
      background: linear-gradient(135deg, #cd7f32, #8b4513);
    }
  }
  .top-img {
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    background: var(--bg-card);
    flex-shrink: 0;
  }
  .top-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    .top-name {
      font-size: 28rpx;
      font-weight: 600;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .top-sales {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
    }
    .top-price {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--brand-primary);
      font-family: $font-family-base;
    }
    .top-locked {
      display: inline-flex;
      align-items: center;
      gap: 4rpx;
      padding: 4rpx 12rpx;
      background: var(--bg-hover);
      border-radius: 999rpx;
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
    .top-add {
      width: 48rpx;
      height: 48rpx;
      border-radius: 50%;
      background: $brand-gradient;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
    }
  }
}

/* 新品三联数据 */
.newest-strip {
  margin: 16rpx 24rpx 0;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: $shadow-sm;
}
.newest-item {
  flex: 1;
  text-align: center;
  .newest-num {
    display: block;
    font-size: 36rpx;
    font-weight: 800;
    color: var(--brand-primary);
    line-height: 1;
    font-family: $font-family-base;
  }
  .newest-label {
    display: block;
    margin-top: 4rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.newest-divider {
  width: 1rpx;
  height: 56rpx;
  background: var(--border-light);
}

/* Section 标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 32rpx 64rpx 16rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
  .line {
    flex: 1;
    height: 1rpx;
    background: var(--border-default);
  }
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
    min-width: 0;
  }
}
.wf-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
}
.wf-img {
  width: 100%;
  background: var(--bg-page);
}
.wf-info {
  padding: 12rpx 16rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
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
.wf-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4rpx;
  gap: 8rpx;
  min-width: 0;
}
.wf-price-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
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
  align-self: flex-start;
}
.wf-save {
  font-size: 18rpx;
  color: #a855f7;
  font-weight: 600;
}
.wf-add {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: $brand-gradient;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
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
