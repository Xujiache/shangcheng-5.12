<script setup lang="ts">
/**
 * MA-20 · 选品广场
 *
 * 顶部搜索 + 3 大 Tab（商品/厂家/我的代理）+ 标签筛选 + 瀑布流 + 平台推送角标
 */
import { ref, computed, onMounted, watch } from 'vue'
import { plazaService } from '../../services/store'
import type { PlazaFactoryItem } from '../../services/store'
import { profileService } from '../../services/profile'
import { useFeatureFlagStore } from '../../store'
import type { PlazaProductCard } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'
import { useStatusBar } from '../../composables/useStatusBar'

const { heroPaddingTop } = useStatusBar(16)

type Tab = 'products' | 'factories' | 'agency'

const tab = ref<Tab>('products')
const keyword = ref('')
const products = ref<PlazaProductCard[]>([])
const factories = ref<PlazaFactoryItem[]>([])
const activeTag = ref<string>('全部')

const flagStore = useFeatureFlagStore()
const showUploadFab = computed(() => flagStore.isRoleButtonEnabled('uploadToPlaza'))

/* ===== 筛选（仅厂家 Tab 用）===== */
const REGIONS = ['全部', '辽宁', '广东', '浙江', '江苏', '山东', '福建', '上海', '北京']
const CATEGORIES = ['全部', '家具', '灯具', '布艺', '建材', '厨卫', '家电', '装饰']
const RATINGS = [
  { label: '不限', value: 0 },
  { label: '4 星以上', value: 4 },
  { label: '4.5 星以上', value: 4.5 },
]
const filterRegion = ref('全部')
const filterCategory = ref('全部')
const filterMinRating = ref(0)
const showFilterPanel = ref<'region' | 'category' | 'rating' | null>(null)

/* ===== 上传 / 可见性弹层 ===== */
const showUploadSheet = ref(false)
const showVisibilityDialog = ref(false)
const visibility = ref<'stores' | 'public'>('stores')

async function loadVisibility() {
  try {
    const data = await profileService.getPlazaVisibility()
    visibility.value = data.scope
  } catch { /* keep default */ }
}

async function setVisibility(scope: 'stores' | 'public') {
  if (visibility.value === scope) return
  try {
    await profileService.setPlazaVisibility(scope)
    visibility.value = scope
    uni.showToast({ title: scope === 'public' ? '已设为所有人可看' : '已设为仅门店可看', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  }
}

function openUpload() { showUploadSheet.value = true }
function pickUploadMyProducts() {
  showUploadSheet.value = false
  uni.navigateTo({ url: '/pages/product/add' })
}
function pickVisibilityRules() {
  showUploadSheet.value = false
  showVisibilityDialog.value = true
}

async function rateFactory(f: PlazaFactoryItem) {
  uni.showActionSheet({
    itemList: ['1 星', '2 星', '3 星', '4 星', '5 星'],
    success: async (r) => {
      const score = r.tapIndex + 1
      try {
        const res = await plazaService.rateFactory(f.id, score)
        f.rating = res.rating
        f.ratingCount = res.ratingCount
        uni.showToast({ title: `已评价 ${score} 星`, icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '评价失败', icon: 'none' })
      }
    },
  })
}

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
  const params: any = {}
  if (filterRegion.value && filterRegion.value !== '全部') params.region = filterRegion.value
  if (filterCategory.value && filterCategory.value !== '全部') params.category = filterCategory.value
  if (filterMinRating.value > 0) params.minRating = filterMinRating.value
  if (keyword.value) params.keyword = keyword.value
  factories.value = await plazaService.factories(params)
}

function pickFilter(panel: 'region' | 'category' | 'rating', value: any) {
  if (panel === 'region') filterRegion.value = value
  if (panel === 'category') filterCategory.value = value
  if (panel === 'rating') filterMinRating.value = value
  showFilterPanel.value = null
  loadFactories()
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

onMounted(() => {
  loadProducts()
  loadVisibility()
  flagStore.fetchFlags()
})
</script>

<template>
  <view class="page">
    <view class="header" :style="{ background: 'var(--brand-gradient)', paddingTop: heroPaddingTop }">
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

      <EmptyState
        v-if="filteredProducts.length === 0"
        title="暂无可代理的商品"
        desc="选品广场只显示其他厂家上架的商品。当前没有匹配项,试试调整筛选或稍后再来"
      />
    </view>

    <!-- 厂家 Tab -->
    <view v-else-if="tab === 'factories'" class="content">
      <!-- 筛选条 -->
      <view class="filter-bar">
        <view :class="['filter-chip', filterRegion !== '全部' && 'on']" @click="showFilterPanel = 'region'">
          <text>{{ filterRegion === '全部' ? '地区' : filterRegion }}</text>
          <Icon name="chevron-down" :size="18" color="var(--text-tertiary)" />
        </view>
        <view :class="['filter-chip', filterCategory !== '全部' && 'on']" @click="showFilterPanel = 'category'">
          <text>{{ filterCategory === '全部' ? '品类' : filterCategory }}</text>
          <Icon name="chevron-down" :size="18" color="var(--text-tertiary)" />
        </view>
        <view :class="['filter-chip', filterMinRating > 0 && 'on']" @click="showFilterPanel = 'rating'">
          <text>{{ filterMinRating > 0 ? `${filterMinRating}★+` : '评分' }}</text>
          <Icon name="chevron-down" :size="18" color="var(--text-tertiary)" />
        </view>
      </view>

      <view class="factory-list">
        <view v-for="f in factories" :key="f.id" class="factory-card" @click="goFactory(f.id)">
          <view class="factory-logo-wrap">
            <image v-if="f.logo" :src="f.logo" mode="aspectFill" class="factory-logo" />
            <view v-else class="factory-logo factory-logo-empty">
              <text>{{ f.name.slice(0, 1) }}</text>
            </view>
          </view>
          <view class="factory-info">
            <view class="factory-name-row">
              <text class="factory-name">{{ f.name }}</text>
              <view class="rating-pill" @click.stop="rateFactory(f)">
                <Icon name="star-fill" :size="20" color="#FFD43B" :fill="true" />
                <text>{{ (f.rating ?? 5).toFixed(1) }}</text>
                <text v-if="(f.ratingCount ?? 0) > 0" class="rating-count">({{ f.ratingCount }})</text>
              </view>
            </view>
            <view class="factory-meta">
              <Icon name="location" :size="22" color="var(--text-tertiary)" />
              <text>{{ f.region }}</text>
              <text v-if="f.categories?.length">· {{ f.categories.slice(0, 2).join(' / ') }}</text>
            </view>
            <view class="factory-stats">
              <text class="fs-item">¥{{ Math.round((f.gmv || 0) / 10000) }}<span class="fs-label">万 GMV</span></text>
              <view class="factory-rate-btn" @click.stop="rateFactory(f)">给厂家评分</view>
            </view>
          </view>
        </view>
        <EmptyState v-if="factories.length === 0" title="没找到匹配厂家" desc="试试调整筛选条件" />
      </view>
    </view>

    <!-- 我的代理 -->
    <view v-else class="content">
      <EmptyState title="暂无代理" desc="去商品 Tab 申请代理感兴趣的商品" />
    </view>

    <view class="safe-bottom" />

    <!-- 筛选下拉面板 -->
    <view v-if="showFilterPanel" class="filter-mask" @click="showFilterPanel = null">
      <view class="filter-panel" @click.stop>
        <view v-if="showFilterPanel === 'region'">
          <view class="filter-row">
            <view
              v-for="r in REGIONS"
              :key="r"
              :class="['filter-item', filterRegion === r && 'on']"
              @click="pickFilter('region', r)"
            >{{ r }}</view>
          </view>
        </view>
        <view v-else-if="showFilterPanel === 'category'">
          <view class="filter-row">
            <view
              v-for="c in CATEGORIES"
              :key="c"
              :class="['filter-item', filterCategory === c && 'on']"
              @click="pickFilter('category', c)"
            >{{ c }}</view>
          </view>
        </view>
        <view v-else-if="showFilterPanel === 'rating'">
          <view class="filter-row">
            <view
              v-for="r in RATINGS"
              :key="r.value"
              :class="['filter-item', filterMinRating === r.value && 'on']"
              @click="pickFilter('rating', r.value)"
            >{{ r.label }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 上传产品 FAB（受平台 roleButton.uploadToPlaza 控制；默认开） -->
    <view v-if="showUploadFab" class="upload-fab" @click="openUpload">
      <Icon name="plus" :size="36" color="#fff" />
      <text>上传产品</text>
    </view>

    <!-- 上传 / 规则 sheet -->
    <view v-if="showUploadSheet" class="sheet-mask" @click="showUploadSheet = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">上传产品</text>
          <text class="sheet-close" @click="showUploadSheet = false">关闭</text>
        </view>
        <view class="sheet-action" @click="pickUploadMyProducts">
          <view class="action-icon action-icon-primary">
            <Icon name="image-plus" :size="36" color="#fff" />
          </view>
          <view class="action-info">
            <text class="action-title">我的上传</text>
            <text class="action-sub">把我的商品同步到选品广场</text>
          </view>
          <Icon name="forward" :size="24" color="var(--text-tertiary)" />
        </view>
        <view class="sheet-action" @click="pickVisibilityRules">
          <view class="action-icon action-icon-ghost">
            <Icon name="eye" :size="36" color="#fff" />
          </view>
          <view class="action-info">
            <text class="action-title">产品显示规则</text>
            <text class="action-sub">当前：{{ visibility === 'public' ? '所有人可看' : '仅门店可看' }}</text>
          </view>
          <Icon name="forward" :size="24" color="var(--text-tertiary)" />
        </view>
      </view>
    </view>

    <!-- 显示规则弹层 -->
    <view v-if="showVisibilityDialog" class="sheet-mask" @click="showVisibilityDialog = false">
      <view class="vis-dialog" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">产品显示规则</text>
          <text class="sheet-close" @click="showVisibilityDialog = false">完成</text>
        </view>
        <text class="vis-hint">设置我上传到选品广场的产品对谁可见。</text>
        <view class="vis-option" :class="{ on: visibility === 'stores' }" @click="setVisibility('stores')">
          <view class="vis-radio">
            <view v-if="visibility === 'stores'" class="vis-dot" />
          </view>
          <view class="vis-info">
            <text class="vis-title">仅门店可看</text>
            <text class="vis-sub">只有审核通过的合作门店能在广场看到</text>
          </view>
        </view>
        <view class="vis-option" :class="{ on: visibility === 'public' }" @click="setVisibility('public')">
          <view class="vis-radio">
            <view v-if="visibility === 'public'" class="vis-dot" />
          </view>
          <view class="vis-info">
            <text class="vis-title">所有人可看</text>
            <text class="vis-sub">所有商家及客户都能看到（默认设置）</text>
          </view>
        </view>
      </view>
    </view>
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

/* ============ v2 新增：筛选 / 评分 / 上传 / 显示规则 ============ */
.filter-bar {
  display: flex;
  gap: 12rpx;
  padding: 8rpx 4rpx 16rpx;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 10rpx 18rpx;
  background: #fff;
  border: 1rpx solid var(--border-light);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-primary);
  &.on {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
    background: rgba(255, 77, 45, 0.06);
    font-weight: 600;
  }
}
.filter-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 90;
  display: flex;
  align-items: flex-start;
  padding-top: 320rpx;
}
.filter-panel {
  width: 100%;
  background: #fff;
  padding: 24rpx;
  border-radius: 0 0 20rpx 20rpx;
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.filter-item {
  padding: 12rpx 24rpx;
  background: #f7f8fa;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #303133;
  &.on {
    background: var(--brand-gradient);
    color: #fff;
    font-weight: 600;
  }
}

.factory-logo-wrap {
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f5f6f8;
}
.factory-logo { width: 100%; height: 100%; }
.factory-logo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  text {
    color: #fff;
    font-size: 44rpx;
    font-weight: 800;
  }
}
.rating-pill {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background: rgba(255, 212, 59, 0.14);
  color: #d4830a;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
  .rating-count { font-size: 18rpx; opacity: 0.7; font-weight: 400; }
}
.factory-rate-btn {
  margin-left: auto;
  padding: 6rpx 18rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  &:active { opacity: 0.85; }
}

.upload-fab {
  position: fixed;
  right: 32rpx;
  bottom: 56rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 28rpx;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 28rpx rgba(255, 77, 45, 0.4);
  z-index: 80;
  &:active { transform: scale(0.97); }
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 20rpx 24rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.vis-dialog {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 20rpx 24rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 4rpx 4rpx;
  .sheet-title { font-size: 32rpx; font-weight: 800; color: #1d2129; }
  .sheet-close { font-size: 26rpx; color: #ff4d2d; font-weight: 600; }
}
.sheet-action {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 20rpx 12rpx;
  border-radius: 16rpx;
  background: #f7f8fa;
  &:active { background: #ebedf0; }
}
.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.action-icon-primary { background: linear-gradient(135deg, #ff7a4e, #ff4d2d); }
.action-icon-ghost { background: linear-gradient(135deg, #5b8def, #3370ff); }
.action-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.action-title { font-size: 28rpx; font-weight: 700; color: #1d2129; }
.action-sub { font-size: 22rpx; color: #86909c; }

.vis-hint { font-size: 24rpx; color: #86909c; padding: 0 4rpx; }
.vis-option {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 16rpx;
  border-radius: 18rpx;
  background: #f7f8fa;
  border: 2rpx solid transparent;
  transition: all 0.18s;
  &.on {
    background: rgba(255, 77, 45, 0.06);
    border-color: rgba(255, 77, 45, 0.45);
  }
}
.vis-radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #c9cdd4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  flex-shrink: 0;
  .vis-dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    background: #ff4d2d;
  }
}
.vis-option.on .vis-radio { border-color: #ff4d2d; }
.vis-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.vis-title { font-size: 28rpx; font-weight: 700; color: #1d2129; }
.vis-sub { font-size: 22rpx; color: #86909c; line-height: 1.5; }
</style>
