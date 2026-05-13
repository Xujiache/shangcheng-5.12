<script setup lang="ts">
/**
 * MA-17 · 店铺装修（实时预览）
 *
 * 主题色 + 字体 + Banner + 商品展示风格 + 顶部 mini 手机预览
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { shopService } from '../../services/store'
import type { ShopDecorate } from '../../services/store'
import { productService } from '../../services/product'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'

interface PreviewProduct { name: string; price: number; image: string }
const previewProducts = ref<PreviewProduct[]>([])

const config = reactive<ShopDecorate>({
  merchantId: 'm-self',
  themeColor: '#FF4D2D',
  fontStyle: 'modern',
  banners: [],
  productLayout: 'waterfall',
})

const COLOR_PALETTE = [
  { value: '#FF4D2D', name: '暖橙' },
  { value: '#D93030', name: '深红' },
  { value: '#FF6B9C', name: '樱粉' },
  { value: '#8B5CF6', name: '紫色' },
  { value: '#3B82F6', name: '蓝色' },
  { value: '#10B981', name: '翡翠' },
  { value: '#F59E0B', name: '琥珀' },
  { value: '#374151', name: '深灰' },
]

const FONTS = [
  { value: 'modern', label: '现代', sample: '经纬科技', desc: '苹方 · 简洁直接' },
  { value: 'elegant', label: '雅致', sample: '经纬科技', desc: '宋体 · 典雅大气' },
  { value: 'playful', label: '俏皮', sample: '经纬科技', desc: '圆体 · 活泼亲和' },
  { value: 'minimal', label: '极简', sample: '经纬科技', desc: '细黑 · 极致简约' },
] as const

const LAYOUTS = [
  { value: 'waterfall', label: '瀑布流', desc: '双列高度自适应' },
  { value: 'twoColumn', label: '双列', desc: '双列等高' },
  { value: 'singleLarge', label: '单列大图', desc: '单列大图沉浸' },
] as const

async function load() {
  try {
    const data = await shopService.getDecorate()
    Object.assign(config, data)
  } catch {
    // ignore
  }
  try {
    const res = (await productService.list({ status: 'active', pageSize: 4 })) as any
    const list = res?.list ?? res ?? []
    previewProducts.value = list.slice(0, 4).map((p: any) => ({
      name: p.name,
      price: Number(p.priceRetailMin ?? p.priceWholesaleMin ?? 0),
      image: p.images?.[0] ?? '',
    }))
  } catch {
    previewProducts.value = []
  }
}

function pickColor(c: string) {
  config.themeColor = c
}

function pickFont(f: 'modern' | 'elegant' | 'playful' | 'minimal') {
  config.fontStyle = f
}

function pickLayout(l: 'waterfall' | 'twoColumn' | 'singleLarge') {
  config.productLayout = l
}

function addBanner() {
  uni.chooseImage({
    count: Math.max(1, 5 - config.banners.length),
    success: (res) => {
      const paths = (res as { tempFilePaths: string[] }).tempFilePaths
      config.banners = [...config.banners, ...paths.map((p) => ({ image: p }))].slice(0, 5)
    },
  })
}

function removeBanner(i: number) {
  config.banners = config.banners.filter((_, idx) => idx !== i)
}

const previewBanners = computed(() => config.banners)

const fontFamily = computed(() => ({
  modern: '"PingFang SC", "Helvetica Neue", sans-serif',
  elegant: '"Source Han Serif", "STSong", serif',
  playful: '"Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  minimal: '"PingFang HK", "Helvetica Light", sans-serif',
}[config.fontStyle]))

async function save() {
  await shopService.saveDecorate(config)
  uni.showToast({ title: '已保存', icon: 'success' })
}
async function preview() {
  uni.showToast({ title: '在客户端预览', icon: 'none' })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="店铺装修" right-text="保存" @right="save" />

    <!-- 顶部 mini 预览 -->
    <view class="preview-wrap">
      <view class="preview-phone" :style="{ '--theme': config.themeColor, fontFamily }">
        <view class="phone-status">
          <text>9:41</text>
          <text>5G</text>
        </view>
        <view class="phone-header" :style="{ background: `linear-gradient(135deg, ${config.themeColor}, ${config.themeColor}AA)` }">
          <view class="ph-name">经纬科技 · 旗舰店</view>
          <view class="ph-search">搜索商品</view>
        </view>
        <swiper
          v-if="previewBanners.length > 0"
          class="phone-banner"
          :autoplay="true"
          :indicator-dots="true"
          :indicator-color="'rgba(255,255,255,0.4)'"
          :indicator-active-color="config.themeColor"
          :interval="2500"
          :duration="500"
          :circular="true"
        >
          <swiper-item v-for="(b, i) in previewBanners" :key="i">
            <image :src="b.image" mode="aspectFill" class="banner-img" />
          </swiper-item>
        </swiper>
        <view v-else class="phone-banner phone-banner-empty">尚未添加 Banner</view>
        <view class="phone-tabs">
          <view class="ph-tab active" :style="{ color: config.themeColor }">推荐</view>
          <view class="ph-tab">新品</view>
          <view class="ph-tab">热销</view>
          <view class="ph-tab">活动</view>
        </view>
        <view :class="['phone-grid', `layout-${config.productLayout}`]">
          <view
            v-for="(p, i) in previewProducts"
            :key="i"
            class="ph-prod"
          >
            <image :src="p.image" class="ph-prod-img" mode="aspectFill" />
            <view class="ph-prod-info">
              <text class="ph-prod-name">{{ p.name }}</text>
              <text class="ph-prod-price" :style="{ color: config.themeColor }">¥{{ p.price }}</text>
            </view>
          </view>
          <view v-if="previewProducts.length === 0" class="phone-grid-empty">
            发布商品后预览将自动加载
          </view>
        </view>
      </view>
      <view class="preview-cta" @click="preview">在客户端实时预览 ›</view>
    </view>

    <view class="body">
      <!-- 主题色 -->
      <Section title="主题色" :sub="config.themeColor">
        <view class="palette">
          <view
            v-for="c in COLOR_PALETTE"
            :key="c.value"
            :class="['palette-item', { active: config.themeColor === c.value }]"
            :style="{ background: c.value }"
            @click="pickColor(c.value)"
          >
            <text v-if="config.themeColor === c.value" class="tick">✓</text>
          </view>
        </view>
      </Section>

      <!-- 字体 -->
      <Section title="字体风格">
        <view class="font-grid">
          <view
            v-for="f in FONTS"
            :key="f.value"
            :class="['font-card', { active: config.fontStyle === f.value }]"
            @click="pickFont(f.value)"
          >
            <text :class="['font-sample', `font-${f.value}`]">{{ f.sample }}</text>
            <text class="font-label">{{ f.label }}</text>
            <text class="font-desc">{{ f.desc }}</text>
          </view>
        </view>
      </Section>

      <!-- Banner -->
      <Section :title="`首页 Banner · ${config.banners.length} / 5`" sub="支持轮播">
        <view class="banner-grid">
          <view v-for="(b, i) in config.banners" :key="i" class="banner-cell">
            <image :src="b.image" class="banner-cell-img" mode="aspectFill" />
            <view class="banner-del" @click="removeBanner(i)">✕</view>
            <view v-if="i === 0" class="banner-main">首张</view>
          </view>
          <view v-if="config.banners.length < 5" class="banner-add" @click="addBanner">
            <text class="add-icon">＋</text>
            <text class="add-text">上传 Banner</text>
            <text class="add-tip">建议 750×360</text>
          </view>
        </view>
      </Section>

      <!-- 展示风格 -->
      <Section title="商品展示风格">
        <view class="layout-grid">
          <view
            v-for="l in LAYOUTS"
            :key="l.value"
            :class="['layout-card', { active: config.productLayout === l.value }]"
            @click="pickLayout(l.value)"
          >
            <view :class="['layout-mock', `mock-${l.value}`]">
              <view class="mock-block" v-for="i in (l.value === 'singleLarge' ? 2 : 4)" :key="i"></view>
            </view>
            <text class="layout-label">{{ l.label }}</text>
            <text class="layout-desc">{{ l.desc }}</text>
          </view>
        </view>
      </Section>

      <view class="safe-bottom" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.preview-wrap {
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.preview-phone {
  width: 480rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.4);
}
.phone-status {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 16rpx;
  font-size: 18rpx;
  color: #000;
  background: #fff;
}
.phone-header {
  padding: 16rpx;
  color: #fff;
  .ph-name {
    font-size: 22rpx;
    font-weight: 700;
  }
  .ph-search {
    margin-top: 8rpx;
    background: rgba(255,255,255,0.25);
    color: rgba(255,255,255,0.85);
    padding: 8rpx 12rpx;
    border-radius: 999rpx;
    font-size: 16rpx;
  }
}
.phone-banner {
  width: 100%;
  height: 160rpx;
  .banner-img { width: 100%; height: 100%; }
}
.phone-banner-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  color: #c9cdd4;
  background: #f5f7fa;
}
.phone-grid-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24rpx 8rpx;
  font-size: 18rpx;
  color: #c9cdd4;
}
.phone-tabs {
  display: flex;
  padding: 8rpx;
  gap: 8rpx;
  background: #fff;
  border-bottom: 1rpx solid #f3f4f6;
  .ph-tab {
    flex: 1;
    text-align: center;
    font-size: 16rpx;
    color: #6b7280;
    padding: 4rpx 0;
    &.active { font-weight: 700; }
  }
}
.phone-grid {
  padding: 8rpx;
  display: grid;
  gap: 8rpx;
  &.layout-waterfall, &.layout-twoColumn {
    grid-template-columns: 1fr 1fr;
  }
  &.layout-singleLarge {
    grid-template-columns: 1fr;
  }
}
.ph-prod {
  background: #f9fafb;
  border-radius: 8rpx;
  overflow: hidden;
}
.ph-prod-img {
  width: 100%;
  aspect-ratio: 1;
}
.ph-prod-info {
  padding: 4rpx 8rpx 8rpx;
  display: flex;
  flex-direction: column;
  .ph-prod-name {
    font-size: 16rpx;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ph-prod-price {
    font-size: 18rpx;
    font-weight: 700;
    margin-top: 2rpx;
  }
}
.preview-cta {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
}
.body {
  padding: 16rpx 24rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.palette {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.palette-item {
  aspect-ratio: 1;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid transparent;
  &.active {
    border-color: var(--text-primary);
  }
  .tick {
    color: #fff;
    font-size: 36rpx;
    font-weight: 700;
  }
}
.font-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.font-card {
  padding: 20rpx;
  background: var(--bg-page);
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  &.active {
    background: var(--brand-primary-ghost);
    border-color: var(--brand-primary);
  }
  .font-sample {
    font-size: 32rpx;
    color: var(--text-primary);
    &.font-modern { font-family: 'PingFang SC', sans-serif; }
    &.font-elegant { font-family: 'STSong', 'Source Han Serif', serif; }
    &.font-playful { font-family: 'Hiragino Sans GB', sans-serif; }
    &.font-minimal { font-family: 'PingFang HK', sans-serif; font-weight: 300; }
  }
  .font-label { font-size: 22rpx; color: var(--brand-primary); font-weight: 700; }
  .font-desc { font-size: 18rpx; color: var(--text-tertiary); }
}
.banner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.banner-cell, .banner-add {
  position: relative;
  aspect-ratio: 2 / 1;
  border-radius: 12rpx;
  overflow: hidden;
}
.banner-cell {
  background: var(--bg-hover);
  .banner-cell-img { width: 100%; height: 100%; }
  .banner-del {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    color: #fff;
    text-align: center;
    line-height: 40rpx;
    font-size: 22rpx;
  }
  .banner-main {
    position: absolute;
    bottom: 8rpx;
    left: 8rpx;
    padding: 2rpx 8rpx;
    background: var(--brand-primary);
    color: #fff;
    font-size: 18rpx;
    border-radius: 4rpx;
  }
}
.banner-add {
  border: 2rpx dashed var(--border-default);
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  .add-icon { font-size: 48rpx; color: var(--text-tertiary); }
  .add-text { font-size: 22rpx; color: var(--text-secondary); }
  .add-tip { font-size: 18rpx; color: var(--text-tertiary); }
}
.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.layout-card {
  padding: 16rpx;
  background: var(--bg-page);
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  &.active {
    background: var(--brand-primary-ghost);
    border-color: var(--brand-primary);
  }
  .layout-label { font-size: 24rpx; font-weight: 700; color: var(--text-primary); }
  .layout-desc { font-size: 18rpx; color: var(--text-tertiary); text-align: center; }
}
.layout-mock {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-card);
  border-radius: 8rpx;
  padding: 8rpx;
  display: grid;
  gap: 4rpx;
  &.mock-waterfall {
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr;
    .mock-block:nth-child(2) { aspect-ratio: 1 / 1.3; }
    .mock-block:nth-child(3) { aspect-ratio: 1.3 / 1; }
  }
  &.mock-twoColumn {
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr;
  }
  &.mock-singleLarge {
    grid-template-columns: 1fr;
    grid-auto-rows: 1fr;
  }
}
.mock-block {
  background: var(--bg-hover);
  border-radius: 4rpx;
}
.safe-bottom { height: 80rpx; }
</style>
