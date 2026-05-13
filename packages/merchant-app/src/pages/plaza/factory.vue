<script setup lang="ts">
/**
 * MA-21 · 厂家详情（申请代理）
 *
 * Banner + Logo + 信息 + 资质 + 商品 grid + 底部 联系/关注/申请代理
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { plazaService } from '../../services/store'
import type { PlazaFactoryDetail, PlazaPlazaProduct } from '../../services/store'
import { formatPrice, formatWan } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import Icon from '../../components/icon/icon.vue'

const factoryId = ref('')
const detail = ref<PlazaFactoryDetail | null>(null)
const products = ref<PlazaPlazaProduct[]>([])
const showAgency = ref(false)
const agencyForm = ref({
  markupPercent: 15,
  autoSyncPrice: true,
  message: '',
})

async function loadProducts() {
  if (!factoryId.value) return
  try {
    const res = await plazaService.products({ factoryId: factoryId.value, pageSize: 20 })
    products.value = (res as any)?.list ?? []
  } catch {
    products.value = []
  }
}

async function load() {
  if (!factoryId.value) return
  detail.value = await plazaService.factory(factoryId.value)
  await loadProducts()
}

async function toggleFollow() {
  if (!detail.value) return
  detail.value.followed = !detail.value.followed
  await plazaService.follow(factoryId.value, detail.value.followed)
  uni.showToast({ title: detail.value.followed ? '已关注' : '已取消关注' })
}

function callFactory() {
  if (!detail.value) return
  uni.makePhoneCall({ phoneNumber: detail.value.contactPhone })
}

function adjustMarkup(d: number) {
  agencyForm.value.markupPercent = Math.max(0, Math.min(100, agencyForm.value.markupPercent + d))
}

function openAgency() {
  agencyForm.value = { markupPercent: 15, autoSyncPrice: true, message: '' }
  showAgency.value = true
}

async function submitAgency() {
  if (products.value.length === 0) {
    uni.showToast({ title: '该厂家暂无可代理商品', icon: 'none' })
    return
  }
  const productIds = products.value.slice(0, 5).map((p) => p.productId)
  try {
    await plazaService.applyAgency({
      factoryId: factoryId.value,
      productIds,
      markupPercent: agencyForm.value.markupPercent,
      autoSyncPrice: agencyForm.value.autoSyncPrice,
      message: agencyForm.value.message,
    })
    showAgency.value = false
    uni.showToast({ title: '申请已提交', icon: 'success', duration: 1200 })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/product/agency-list?from=apply' })
    }, 1200)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  }
}

function previewQualification(images: string[], idx: number) {
  uni.previewImage({ urls: images, current: images[idx] })
}

onLoad((opts) => {
  factoryId.value = (opts as { id?: string })?.id || ''
  load()
})
onMounted(() => {
  if (!factoryId.value) load()
})
</script>

<template>
  <view class="page" v-if="detail">
    <NavBar :title="detail.name" :bg="'transparent'" class="nav-on-dark" />

    <!-- Banner + 头部 -->
    <view class="hero">
      <image :src="detail.banner" class="hero-banner" mode="aspectFill" />
      <view class="hero-mask" />
      <view class="hero-info">
        <image :src="detail.logo" class="hero-logo" />
        <view class="hero-name-row">
          <text class="hero-name">{{ detail.name }}</text>
          <view class="hero-tags">
            <StatusTag v-for="t in detail.tags" :key="t" :text="t" tone="highlight" fill />
          </view>
        </view>
        <view class="hero-meta">
          <Icon name="location" :size="24" color="rgba(255,255,255,0.85)" />
          <text>{{ detail.region }}</text>
          <text>· 经营 {{ detail.years }} 年</text>
          <text>· 已为 {{ detail.agencyCount }} 家代理</text>
        </view>
      </view>
    </view>

    <!-- 数据三宫格 -->
    <view class="stats">
      <view class="stat">
        <text class="stat-value">{{ detail.productCount }}</text>
        <text class="stat-label">在售商品</text>
      </view>
      <view class="divider" />
      <view class="stat">
        <text class="stat-value">{{ detail.agencyCount }}</text>
        <text class="stat-label">代理门店</text>
      </view>
      <view class="divider" />
      <view class="stat">
        <text class="stat-value">{{ formatWan(detail.monthGmv) }}</text>
        <text class="stat-label">月成交 GMV</text>
      </view>
    </view>

    <view class="body">
      <!-- 厂家介绍 -->
      <Section title="厂家介绍">
        <text class="desc">{{ detail.desc }}</text>
        <view class="addr-row">
          <Icon name="location" :size="28" color="var(--text-secondary)" />
          <text class="addr-text">{{ detail.address }}</text>
        </view>
      </Section>

      <!-- 资质 -->
      <Section :title="`资质证照 · ${detail.qualifications.length} 项`">
        <view class="quali-grid">
          <view
            v-for="(q, i) in detail.qualifications"
            :key="q.name"
            class="quali-cell"
            @click="previewQualification(detail.qualifications.map(x => x.image), i)"
          >
            <image :src="q.image" class="quali-img" mode="aspectFill" />
            <text class="quali-name">{{ q.name }}</text>
          </view>
        </view>
      </Section>

      <!-- 商品 grid -->
      <Section title="主推商品" action="查看全部">
        <view v-if="products.length === 0" class="empty">该厂家暂无在售商品</view>
        <view v-else class="product-grid">
          <view v-for="p in products" :key="p.productId" class="prod">
            <view class="prod-img-wrap">
              <image :src="p.productImage" class="prod-img" mode="aspectFill" />
              <view v-if="p.isPlatformPushed" class="prod-push">推送</view>
            </view>
            <text class="prod-name">{{ p.productName }}</text>
            <view class="prod-foot">
              <text class="prod-price">¥{{ p.startPrice }} 起</text>
              <text class="prod-agency">{{ p.agencyCount }} 代理</text>
            </view>
          </view>
        </view>
      </Section>

      <view class="safe-bottom" />
    </view>

    <!-- 底部固定 -->
    <view class="footer">
      <view class="f-icon-btn" @click="toggleFollow">
        <Icon
          :name="detail.followed ? 'star-fill' : 'star'"
          :size="36"
          :color="detail.followed ? '#FFAA33' : 'var(--text-secondary)'"
          :stroke="detail.followed ? 0 : 1.6"
        />
        <text class="f-icon-label">{{ detail.followed ? '已关注' : '关注' }}</text>
      </view>
      <view class="f-icon-btn" @click="callFactory">
        <Icon name="phone" :size="36" color="var(--brand-primary)" />
        <text class="f-icon-label">联系</text>
      </view>
      <view class="f-cta" @click="openAgency">申请代理</view>
    </view>

    <!-- 申请代理弹层 -->
    <view v-if="showAgency" class="mask" @click="showAgency = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">申请代理</text>
          <view class="sheet-close" @click="showAgency = false">
            <Icon name="close" :size="32" color="#909399" />
          </view>
        </view>
        <text class="sheet-sub">提交后由厂家审核，通过后即可代理其全部主推商品</text>

        <view class="sheet-section">
          <text class="sheet-label">统一加价幅度</text>
          <view class="markup-row">
            <view class="markup-step" @click="adjustMarkup(-5)">
              <Icon name="minus" :size="40" color="var(--brand-primary)" />
            </view>
            <view class="markup-value">
              <text class="num">{{ agencyForm.markupPercent }}</text>
              <text class="unit">%</text>
            </view>
            <view class="markup-step" @click="adjustMarkup(5)">
              <Icon name="plus" :size="40" color="var(--brand-primary)" />
            </view>
          </view>
          <text class="markup-tip">厂家建议 10% ~ 25%</text>
        </view>

        <view class="sheet-section">
          <view class="opt-row">
            <view class="opt-info">
              <text class="opt-name">价格自动同步</text>
              <text class="opt-desc">厂家调价时自动同步到本店</text>
            </view>
            <switch :checked="agencyForm.autoSyncPrice" color="#FF4D2D" @change="(e) => agencyForm.autoSyncPrice = e.detail.value" />
          </view>
        </view>

        <view class="sheet-section">
          <text class="sheet-label">申请留言</text>
          <textarea
            v-model="agencyForm.message"
            class="ag-textarea"
            placeholder="可填写门店情况、预计销量等 · 提升通过率"
            maxlength="120"
          />
        </view>

        <view class="sheet-footer">
          <view class="sf-btn ghost" @click="showAgency = false">取消</view>
          <view class="sf-btn primary" @click="submitAgency">提交申请</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 160rpx;
}
.nav-on-dark :deep(.title),
.nav-on-dark :deep(.back-icon) {
  color: #fff !important;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.3);
}
.nav-on-dark {
  border-bottom: none !important;
  position: absolute !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}
.hero {
  position: relative;
  height: 360rpx;
}
.hero-banner {
  width: 100%;
  height: 100%;
}
.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7));
}
.hero-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.hero-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  border: 4rpx solid #fff;
  background: #fff;
}
.hero-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  .hero-name {
    font-size: 36rpx;
    font-weight: 700;
  }
  .hero-tags {
    display: flex;
    gap: 6rpx;
  }
}
.hero-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  opacity: 0.9;
}
.stats {
  margin: -32rpx 24rpx 16rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 5;
  .stat {
    flex: 1;
    text-align: center;
    .stat-value {
      font-size: 36rpx;
      font-weight: 700;
      color: var(--brand-primary);
      font-family: var(--font-family-base);
    }
    .stat-label {
      display: block;
      margin-top: 4rpx;
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
  .divider {
    width: 2rpx;
    height: 56rpx;
    background: var(--border-light);
  }
}
.body {
  padding: 0 24rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.desc {
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}
.addr-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx;
  background: var(--bg-page);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
}
.quali-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.quali-cell {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.quali-img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8rpx;
  background: var(--bg-hover);
}
.quali-name {
  text-align: center;
  font-size: 20rpx;
  color: var(--text-secondary);
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.prod {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.prod-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
}
.prod-img { width: 100%; height: 100%; }
.prod-push {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  padding: 1rpx 6rpx;
  background: var(--brand-primary);
  color: #fff;
  font-size: 16rpx;
  border-radius: 4rpx;
}
.prod-name {
  font-size: 22rpx;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prod-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  .prod-price {
    font-size: 22rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
  .prod-agency {
    font-size: 18rpx;
    color: var(--text-tertiary);
  }
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: var(--bg-card);
  padding: 12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.06);
  gap: 16rpx;
}
.f-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  width: 96rpx;
  .f-icon-label {
    font-size: 20rpx;
    color: var(--text-secondary);
  }
}
.f-cta {
  flex: 1;
  height: 88rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  text-align: center;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.4);
}
.mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  max-height: 80vh;
  overflow-y: auto;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .sheet-title { font-size: 32rpx; font-weight: 700; color: var(--text-primary); }
  .sheet-close { font-size: 28rpx; color: var(--text-tertiary); }
}
.sheet-sub {
  font-size: 22rpx;
  color: var(--text-tertiary);
  padding: 12rpx;
  background: var(--brand-primary-ghost);
  border-radius: 8rpx;
}
.sheet-section {
  padding: 12rpx 0;
  border-bottom: 1rpx solid var(--border-light);
  &:last-of-type { border-bottom: none; }
}
.sheet-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12rpx;
}
.markup-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}
.markup-step {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--brand-primary-ghost);
  display: flex;
  align-items: center;
  justify-content: center;
}
.markup-value {
  min-width: 120rpx;
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: var(--brand-primary);
  .num {
    font-size: 56rpx;
    font-weight: 700;
    line-height: 1;
    font-family: var(--font-family-base);
  }
  .unit {
    margin-left: 4rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.markup-tip {
  display: block;
  margin-top: 8rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.opt-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  .opt-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .opt-name { font-size: 26rpx; font-weight: 600; color: var(--text-primary); }
    .opt-desc { font-size: 22rpx; color: var(--text-tertiary); }
  }
}
.ag-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 24rpx;
  color: var(--text-primary);
}
.sheet-footer {
  display: flex;
  gap: 16rpx;
  padding-top: 8rpx;
}
.sf-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  text-align: center;
  line-height: 88rpx;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost { background: var(--bg-hover); color: var(--text-primary); }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.4);
  }
}
.safe-bottom { height: 40rpx; }
</style>
