<script setup lang="ts">
/**
 * MA-15 · 门店授权设置
 *
 * 等级 + 可见价格类型 + 可上架分类 + 加价规则 + 授权有效期
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeService } from '../../services/store'
import { categoryService } from '../../services/product'
import type { Category } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'

interface ProductPolicy {
  categoryId: string
  categoryName?: string
  enabled: boolean
  markupPercent: number
}

const storeId = ref('')
const storeName = ref('')
const config = reactive<{
  level: 'A' | 'B' | 'C'
  visiblePriceTiers: ('wholesale' | 'retail' | 'member')[]
  productPolicies: ProductPolicy[]
  authValidFrom: string
  authValidTo: string
}>({
  level: 'A',
  visiblePriceTiers: ['wholesale', 'retail'],
  productPolicies: [],
  authValidFrom: '2026-05-01',
  authValidTo: '2027-05-01',
})

const LEVELS = [
  { key: 'A', label: 'A 级 · 旗舰', desc: '所有商品可上架 · 批发价 + 零售价' },
  { key: 'B', label: 'B 级 · 普通', desc: '指定分类 · 零售价' },
  { key: 'C', label: 'C 级 · 体验', desc: '少量样品 · 零售价' },
] as const

const PRICE_TIERS = [
  { key: 'wholesale', label: '批发价', color: 'var(--price-wholesale)' },
  { key: 'retail', label: '零售价', color: 'var(--price-retail)' },
  { key: 'member', label: '会员价', color: 'var(--price-member)' },
] as const

const platformCats = ref<Category[]>([])

const enabledCount = computed(() => config.productPolicies.filter((p) => p.enabled).length)
const totalCount = computed(() => config.productPolicies.length)

async function load() {
  try {
    const [auth, cats] = await Promise.all([
      storeService.getAuth(storeId.value),
      categoryService.platformList(),
    ])
    config.level = auth.level
    config.visiblePriceTiers = auth.visiblePriceTiers
    config.authValidFrom = auth.authValidFrom
    config.authValidTo = auth.authValidTo

    platformCats.value = cats
    const rootCats = cats.filter((c) => c.parentId === null)
    config.productPolicies = rootCats.map((c) => {
      const existing = auth.productPolicies.find((p) => p.categoryId === c.id)
      return {
        categoryId: c.id,
        categoryName: c.name,
        enabled: existing?.enabled ?? false,
        markupPercent: existing?.markupPercent ?? 15,
      }
    })
  } catch {
    // ignore
  }
}

function pickLevel(level: 'A' | 'B' | 'C') {
  config.level = level
  if (level === 'A') config.visiblePriceTiers = ['wholesale', 'retail']
  if (level === 'B') config.visiblePriceTiers = ['retail']
  if (level === 'C') config.visiblePriceTiers = ['retail']
}

function togglePriceTier(tier: 'wholesale' | 'retail' | 'member') {
  const has = config.visiblePriceTiers.includes(tier)
  if (has) {
    config.visiblePriceTiers = config.visiblePriceTiers.filter((t) => t !== tier)
  } else {
    config.visiblePriceTiers = [...config.visiblePriceTiers, tier]
  }
}

function togglePolicy(p: ProductPolicy) {
  p.enabled = !p.enabled
}

function adjustMarkup(p: ProductPolicy, delta: number) {
  p.markupPercent = Math.max(0, Math.min(100, p.markupPercent + delta))
}

function selectAll(on: boolean) {
  config.productPolicies.forEach((p) => (p.enabled = on))
}

function pickValidTo(e: { detail: { value: string } }) {
  config.authValidTo = e.detail.value
}

async function save() {
  await storeService.saveAuth(storeId.value, config)
  uni.showToast({ title: '已保存', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 600)
}

onLoad((opts) => {
  storeId.value = (opts as { id?: string })?.id || ''
  storeName.value = decodeURIComponent((opts as { name?: string })?.name || '门店')
  load()
})
onMounted(() => {
  if (!storeId.value) load()
})
</script>

<template>
  <view class="page">
    <NavBar :title="storeName + ' · 授权'" right-text="保存" @right="save" />

    <view class="body">
      <!-- 等级 -->
      <Section title="门店等级">
        <view class="level-list">
          <view
            v-for="l in LEVELS"
            :key="l.key"
            :class="['level-card', { active: config.level === l.key }]"
            @click="pickLevel(l.key)"
          >
            <view class="level-badge">{{ l.key }}</view>
            <view class="level-info">
              <text class="level-name">{{ l.label }}</text>
              <text class="level-desc">{{ l.desc }}</text>
            </view>
            <text v-if="config.level === l.key" class="tick">✓</text>
          </view>
        </view>
      </Section>

      <!-- 可见价格类型 -->
      <Section title="可见价格" sub="门店登录后可看到的价格类型">
        <view class="tier-row">
          <view
            v-for="t in PRICE_TIERS"
            :key="t.key"
            :class="['tier-card', { active: config.visiblePriceTiers.includes(t.key) }]"
            @click="togglePriceTier(t.key)"
          >
            <view class="tier-color" :style="{ background: t.color }" />
            <text class="tier-label">{{ t.label }}</text>
            <text class="tier-check">{{ config.visiblePriceTiers.includes(t.key) ? '✓' : '+' }}</text>
          </view>
        </view>
      </Section>

      <!-- 可上架商品 + 加价规则 -->
      <Section
        :title="`可上架商品 · ${enabledCount} / ${totalCount}`"
        :action="enabledCount === totalCount ? '取消全选' : '全选'"
        @action="selectAll(enabledCount !== totalCount)"
      >
        <view class="policy-list">
          <view v-for="p in config.productPolicies" :key="p.categoryId" class="policy-row">
            <view class="policy-left">
              <switch :checked="p.enabled" color="#FF4D2D" @change="togglePolicy(p)" style="transform: scale(0.8)" />
              <text class="policy-name" :class="{ disabled: !p.enabled }">{{ p.categoryName }}</text>
            </view>
            <view v-if="p.enabled" class="policy-markup">
              <text class="markup-label">加价</text>
              <view class="markup-step" @click="adjustMarkup(p, -5)">−</view>
              <view class="markup-value">
                <text>{{ p.markupPercent }}</text>
                <text class="unit">%</text>
              </view>
              <view class="markup-step" @click="adjustMarkup(p, 5)">＋</view>
            </view>
            <view v-else class="policy-disabled-tip">未启用</view>
          </view>
        </view>
      </Section>

      <!-- 有效期 -->
      <Section title="授权有效期">
        <view class="valid-row">
          <view class="valid-block">
            <text class="valid-label">开始</text>
            <text class="valid-value">{{ config.authValidFrom }}</text>
          </view>
          <text class="valid-arrow">→</text>
          <picker mode="date" :value="config.authValidTo" :start="config.authValidFrom" @change="pickValidTo">
            <view class="valid-block clickable">
              <text class="valid-label">结束</text>
              <text class="valid-value">{{ config.authValidTo }}</text>
            </view>
          </picker>
        </view>
        <view class="valid-tip">
          <text>到期后门店自动失去授权，可手动续期</text>
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
.body {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.level-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.level-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  &.active {
    background: var(--brand-primary-ghost);
    border-color: var(--brand-primary);
  }
  .level-badge {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: var(--brand-primary);
    color: #fff;
    text-align: center;
    line-height: 64rpx;
    font-size: 32rpx;
    font-weight: 700;
    font-family: var(--font-family-base);
  }
  .level-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .level-name { font-size: 28rpx; font-weight: 600; color: var(--text-primary); }
    .level-desc { font-size: 22rpx; color: var(--text-tertiary); }
  }
  .tick {
    color: var(--brand-primary);
    font-size: 32rpx;
    font-weight: 700;
  }
}
.tier-row {
  display: flex;
  gap: 12rpx;
}
.tier-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  position: relative;
  gap: 8rpx;
  &.active {
    background: var(--brand-primary-ghost);
    border-color: var(--brand-primary);
  }
  .tier-color {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
  }
  .tier-label {
    font-size: 24rpx;
    font-weight: 600;
    color: var(--text-primary);
  }
  .tier-check {
    position: absolute;
    top: 8rpx;
    right: 12rpx;
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
  &.active .tier-check { color: var(--brand-primary); font-weight: 700; }
}
.policy-list {
  display: flex;
  flex-direction: column;
}
.policy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
}
.policy-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  .policy-name {
    font-size: 26rpx;
    color: var(--text-primary);
    &.disabled { color: var(--text-tertiary); text-decoration: line-through; }
  }
}
.policy-markup {
  display: flex;
  align-items: center;
  gap: 12rpx;
  .markup-label { font-size: 22rpx; color: var(--text-tertiary); }
  .markup-step {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: var(--brand-primary-ghost);
    color: var(--brand-primary);
    text-align: center;
    line-height: 48rpx;
    font-size: 28rpx;
    font-weight: 700;
  }
  .markup-value {
    min-width: 72rpx;
    text-align: center;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    .unit { font-size: 20rpx; color: var(--text-tertiary); margin-left: 2rpx; }
  }
}
.policy-disabled-tip { font-size: 22rpx; color: var(--text-tertiary); }
.valid-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.valid-block {
  flex: 1;
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 16rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  &.clickable {
    background: var(--brand-primary-ghost);
    border: 1rpx solid var(--brand-primary);
  }
  .valid-label { font-size: 22rpx; color: var(--text-tertiary); }
  .valid-value {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
}
.valid-arrow {
  font-size: 28rpx;
  color: var(--text-tertiary);
}
.valid-tip {
  margin-top: 12rpx;
  padding: 12rpx;
  background: var(--status-info-bg);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
}
.safe-bottom { height: 80rpx; }
</style>
