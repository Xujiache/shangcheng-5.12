<script setup lang="ts">
/**
 * MA-20 · 选品广场
 *
 * 顶部搜索 + 3 大 Tab（商品/厂家/我的代理）+ 标签筛选 + 瀑布流 + 平台推送角标
 */
import { ref, computed, onMounted, watch } from 'vue'
import { plazaService } from '../../services/store'
import type { PlazaFactoryItem } from '../../services/store'
import type { PlazaProductCard } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

type Tab = 'products' | 'factories' | 'agency'

const tab = ref<Tab>('products')
const keyword = ref('')
const products = ref<PlazaProductCard[]>([])
const factories = ref<PlazaFactoryItem[]>([])
const activeTag = ref<string>('全部')

const TABS = [
  { key: 'products' as Tab, label: '商品' },
  { key: 'factories' as Tab, label: '厂家' },
  { key: 'agency' as Tab, label: '我的代理' },
]

const FILTER_TAGS = ['全部', '🔥本周热推', '新品', '厂家直供', '高佣金', '限时', '爆款']

const filteredProducts = computed(() => {
  let list = products.value
  if (activeTag.value !== '全部') {
    list = list.filter((p) => p.tags.includes(activeTag.value))
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter((p) => p.productName.toLowerCase().includes(kw) || p.factoryName.includes(keyword.value))
  }
  return list
})

const leftColumn = computed(() => filteredProducts.value.filter((_, i) => i % 2 === 0))
const rightColumn = computed(() => filteredProducts.value.filter((_, i) => i % 2 === 1))

async function loadProducts() {
  const data = await plazaService.products({ pageSize: 30 }) as { list: PlazaProductCard[] }
  products.value = data.list
}
async function loadFactories() {
  factories.value = await plazaService.factories()
}

function goFactory(factoryId: string) {
  uni.navigateTo({ url: `/pages/plaza/factory?id=${factoryId}` })
}

function applyAgency(p: PlazaProductCard) {
  uni.showModal({
    title: '申请代理',
    content: `申请代理「${p.productName}」？\n建议加价 ¥${p.suggestMarkupMin}~${p.suggestMarkupMax} · 佣金 ${p.suggestCommission}%`,
    confirmText: '提交申请',
    success: async (r) => {
      if (r.confirm) {
        await plazaService.applyAgency({
          factoryId: p.factoryId,
          productIds: [p.productId],
          markupPercent: p.suggestMarkupMin ?? 15,
          autoSyncPrice: true,
        })
        uni.showToast({ title: '已提交，待厂家审核', icon: 'success' })
      }
    },
  })
}

watch(tab, (v) => {
  if (v === 'factories' && factories.value.length === 0) loadFactories()
})

onMounted(loadProducts)
</script>

<template>
  <view class="page">
    <view class="header" :style="{ background: 'var(--brand-gradient)' }">
      <view class="head-row">
        <text class="head-title">选品广场</text>
        <text class="head-sub">平台精选 · 厂家直供</text>
      </view>
      <view class="search-wrap">
        <Icon name="search" :size="32" color="rgba(255,255,255,0.85)" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商品 / 厂家"
          placeholder-style="color:rgba(255,255,255,0.6)"
        />
      </view>
      <view class="tabs-row">
        <Tabs v-model="tab" :items="TABS" variant="underline" fill />
      </view>
    </view>

    <!-- 商品 Tab -->
    <view v-if="tab === 'products'" class="content">
      <scroll-view scroll-x class="tag-scroll" :show-scrollbar="false">
        <view class="tag-row">
          <view
            v-for="t in FILTER_TAGS"
            :key="t"
            :class="['tag-pill', { active: activeTag === t }]"
            @click="activeTag = t"
          >{{ t }}</view>
        </view>
      </scroll-view>

      <view class="waterfall">
        <view class="col">
          <view v-for="p in leftColumn" :key="p.productId" class="card" @click="goFactory(p.factoryId)">
            <view class="card-img-wrap">
              <image :src="p.productImage" mode="aspectFill" class="card-img" />
              <view v-if="p.isPlatformPushed" class="pushed-badge">平台推送</view>
            </view>
            <view class="card-body">
              <text class="card-name">{{ p.productName }}</text>
              <text class="card-factory">{{ p.factoryName }}</text>
              <view class="card-meta">
                <view class="meta-price">
                  <text class="symbol">¥</text>
                  <text class="value">{{ p.startPrice }}</text>
                  <text class="suffix">起</text>
                </view>
                <text class="agency-count">{{ p.agencyCount }} 家代理</text>
              </view>
              <view class="suggest-row">
                <text class="s-tag">加 ¥{{ p.suggestMarkupMin }}~{{ p.suggestMarkupMax }}</text>
                <text class="s-tag s-comm">佣 {{ p.suggestCommission }}%</text>
              </view>
              <view class="card-tags">
                <text v-for="t in p.tags" :key="t" class="card-tag">{{ t }}</text>
              </view>
              <view class="card-action" @click.stop="applyAgency(p)">申请代理</view>
            </view>
          </view>
        </view>
        <view class="col">
          <view v-for="p in rightColumn" :key="p.productId" class="card" @click="goFactory(p.factoryId)">
            <view class="card-img-wrap">
              <image :src="p.productImage" mode="aspectFill" class="card-img" />
              <view v-if="p.isPlatformPushed" class="pushed-badge">平台推送</view>
            </view>
            <view class="card-body">
              <text class="card-name">{{ p.productName }}</text>
              <text class="card-factory">{{ p.factoryName }}</text>
              <view class="card-meta">
                <view class="meta-price">
                  <text class="symbol">¥</text>
                  <text class="value">{{ p.startPrice }}</text>
                  <text class="suffix">起</text>
                </view>
                <text class="agency-count">{{ p.agencyCount }} 家代理</text>
              </view>
              <view class="suggest-row">
                <text class="s-tag">加 ¥{{ p.suggestMarkupMin }}~{{ p.suggestMarkupMax }}</text>
                <text class="s-tag s-comm">佣 {{ p.suggestCommission }}%</text>
              </view>
              <view class="card-tags">
                <text v-for="t in p.tags" :key="t" class="card-tag">{{ t }}</text>
              </view>
              <view class="card-action" @click.stop="applyAgency(p)">申请代理</view>
            </view>
          </view>
        </view>
      </view>

      <EmptyState v-if="filteredProducts.length === 0" title="暂无商品" desc="尝试调整搜索词或标签" />
    </view>

    <!-- 厂家 Tab -->
    <view v-else-if="tab === 'factories'" class="content">
      <view class="factory-list">
        <view v-for="f in factories" :key="f.id" class="factory-card" @click="goFactory(f.id)">
          <image :src="f.logo" mode="aspectFill" class="factory-logo" />
          <view class="factory-info">
            <view class="factory-name-row">
              <text class="factory-name">{{ f.name }}</text>
              <view v-if="f.platformPushed" class="pushed-mini">平台推送</view>
            </view>
            <view class="factory-meta">
              <Icon name="location" :size="22" color="var(--text-tertiary)" />
              <text>{{ f.region }}</text>
              <text>· {{ f.years }} 年</text>
            </view>
            <view class="factory-stats">
              <text class="fs-item">{{ f.productCount }} <span class="fs-label">商品</span></text>
              <text class="fs-item">{{ f.agencyCount }} <span class="fs-label">代理</span></text>
            </view>
            <view class="factory-tags">
              <text v-for="t in f.tags" :key="t" class="ftag">{{ t }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的代理 -->
    <view v-else class="content">
      <EmptyState title="暂无代理" desc="去商品 Tab 申请代理感兴趣的商品" />
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.header {
  padding: 24rpx 24rpx 0;
  color: #fff;
  .head-row {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
    .head-title { font-size: 36rpx; font-weight: 700; }
    .head-sub { font-size: 22rpx; opacity: 0.85; }
  }
  .search-wrap {
    margin-top: 16rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;
    background: rgba(255,255,255,0.25);
    border-radius: 999rpx;
    padding: 0 16rpx 0 20rpx;
    height: 72rpx;
    .search-input { flex: 1; height: 100%; font-size: 26rpx; color: #fff; }
  }
  .tabs-row {
    margin-top: 16rpx;
    :deep(.tab-text) { color: rgba(255,255,255,0.85); }
    :deep(.tab.active) {
      .tab-text { color: #fff; font-weight: 700; }
      &::after { background: #fff; }
    }
  }
}
.content {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.tag-scroll {
  white-space: nowrap;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 12rpx 8rpx;
}
.tag-row {
  display: inline-flex;
  gap: 8rpx;
  padding: 0 8rpx;
}
.tag-pill {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  background: var(--bg-page);
  color: var(--text-secondary);
  font-size: 22rpx;
  border-radius: 999rpx;
  &.active {
    background: var(--brand-primary);
    color: #fff;
    font-weight: 700;
  }
}
.waterfall {
  display: flex;
  gap: 12rpx;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.card-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}
.card-img { width: 100%; height: 100%; }
.pushed-badge {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  padding: 4rpx 10rpx;
  background: var(--brand-primary);
  color: #fff;
  font-size: 18rpx;
  border-radius: 6rpx;
  box-shadow: 0 2rpx 6rpx rgba(255,77,45,0.4);
}
.card-body {
  padding: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.card-name {
  font-size: 24rpx;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-factory {
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.card-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.meta-price {
  color: var(--brand-primary);
  font-family: var(--font-family-base);
  .symbol { font-size: 18rpx; font-weight: 600; }
  .value { font-size: 30rpx; font-weight: 700; }
  .suffix { font-size: 18rpx; color: var(--text-tertiary); margin-left: 4rpx; }
}
.agency-count {
  font-size: 18rpx;
  color: var(--text-tertiary);
}
.suggest-row {
  display: flex;
  gap: 6rpx;
  flex-wrap: wrap;
}
.s-tag {
  padding: 2rpx 6rpx;
  background: var(--brand-primary-ghost);
  color: var(--brand-primary);
  font-size: 18rpx;
  border-radius: 4rpx;
  &.s-comm {
    background: var(--status-success-bg);
    color: var(--status-success);
  }
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4rpx;
}
.card-tag {
  padding: 1rpx 6rpx;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 16rpx;
  border-radius: 4rpx;
}
.card-action {
  margin-top: 4rpx;
  padding: 8rpx 0;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  text-align: center;
  font-size: 22rpx;
  font-weight: 600;
}
.factory-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.factory-card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
  box-shadow: var(--shadow-sm);
}
.factory-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  background: var(--bg-hover);
}
.factory-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.factory-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .factory-name { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
  .pushed-mini {
    padding: 1rpx 6rpx;
    background: var(--brand-primary);
    color: #fff;
    font-size: 16rpx;
    border-radius: 4rpx;
  }
}
.factory-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.factory-stats {
  display: flex;
  gap: 16rpx;
  .fs-item {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    .fs-label {
      font-size: 18rpx;
      color: var(--text-tertiary);
      font-weight: 400;
      margin-left: 2rpx;
    }
  }
}
.factory-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  .ftag {
    padding: 2rpx 8rpx;
    background: var(--brand-primary-ghost);
    color: var(--brand-primary);
    font-size: 18rpx;
    border-radius: 4rpx;
  }
}
.safe-bottom { height: 40rpx; }
</style>
