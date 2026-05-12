<script setup lang="ts">
/**
 * MA-11 · 客户管理
 *
 * Tab(全部/分佣客户/会员/普通) + 搜索 + 客户卡 + 价格授权开关 + 价格层级选择
 */
import { ref, computed, onMounted } from 'vue'
import { customerService } from '../../services/customer'
import type { MerchantCustomer } from '../../services/customer'
import { formatPrice, formatRelative, maskPhone } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

type Tab = 'all' | 'promoter' | 'member' | 'normal'

const tab = ref<Tab>('all')
const keyword = ref('')
const list = ref<MerchantCustomer[]>([])
const total = ref(0)
const loading = ref(false)

const TABS = computed(() => [
  { key: 'all' as Tab, label: '全部', badge: total.value },
  { key: 'promoter' as Tab, label: '分佣客户' },
  { key: 'member' as Tab, label: '会员' },
  { key: 'normal' as Tab, label: '普通客户' },
])

const TIER_LABEL: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  wholesale: { text: '批发价', tone: 'success' },
  member: { text: '会员价', tone: 'primary' },
  retail: { text: '零售价', tone: 'default' },
}

const KIND_LABEL: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  promoter: { text: '分佣', tone: 'warning' },
  member: { text: '会员', tone: 'primary' },
  normal: { text: '普通', tone: 'default' },
}

const showTierPicker = ref<MerchantCustomer | null>(null)

async function load() {
  loading.value = true
  try {
    const data = await customerService.list({ kind: tab.value, keyword: keyword.value || undefined })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function toggleAuth(c: MerchantCustomer) {
  c.priceAuthorized = !c.priceAuthorized
  await customerService.authorize(c.id, c.priceAuthorized)
  uni.showToast({ title: c.priceAuthorized ? '已授权' : '已取消授权' })
}

function openTierPicker(c: MerchantCustomer) {
  showTierPicker.value = c
}

async function pickTier(tier: 'retail' | 'wholesale' | 'member') {
  if (!showTierPicker.value) return
  showTierPicker.value.priceTier = tier
  await customerService.setPriceTier(showTierPicker.value.id, tier)
  uni.showToast({ title: '已更新' })
  showTierPicker.value = null
}

function callCustomer(c: MerchantCustomer) {
  uni.makePhoneCall({ phoneNumber: c.phone })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="客户管理" />

    <view class="header">
      <view class="search-wrap">
        <Icon name="search" :size="32" color="var(--text-tertiary)" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索昵称 / 手机号"
          confirm-type="search"
          @confirm="load"
        />
      </view>
      <Tabs v-model="tab" :items="TABS" variant="underline" @change="load" />
    </view>

    <view class="list">
      <view v-for="c in list" :key="c.id" class="card">
        <view class="card-head">
          <image class="avatar" :src="c.avatar" mode="aspectFill" />
          <view class="head-info">
            <view class="name-row">
              <text class="name">{{ c.nickname }}</text>
              <StatusTag :text="KIND_LABEL[c.kind].text" :tone="KIND_LABEL[c.kind].tone" />
              <StatusTag :text="c.groupTag" tone="info" />
            </view>
            <text class="phone">{{ maskPhone(c.phone) }}</text>
          </view>
          <view class="phone-call" @click="callCustomer(c)">
            <Icon name="phone" :size="32" color="var(--brand-primary)" />
          </view>
        </view>

        <view class="stats">
          <view class="stat">
            <text class="stat-value">{{ c.orderCount }}</text>
            <text class="stat-label">订单数</text>
          </view>
          <view class="stat">
            <text class="stat-value">{{ formatPrice(c.totalSpent) }}</text>
            <text class="stat-label">累计消费</text>
          </view>
          <view class="stat">
            <text class="stat-value">{{ c.lastOrderAt ? formatRelative(c.lastOrderAt) : '—' }}</text>
            <text class="stat-label">最近下单</text>
          </view>
        </view>

        <view class="card-foot">
          <view class="foot-left">
            <text class="foot-label">价格层级</text>
            <view class="tier-pill" @click="openTierPicker(c)">
              <StatusTag :text="TIER_LABEL[c.priceTier].text" :tone="TIER_LABEL[c.priceTier].tone" fill />
              <text class="caret">›</text>
            </view>
          </view>
          <view class="foot-right">
            <text class="foot-label">价格授权</text>
            <switch :checked="c.priceAuthorized" color="#FF4D2D" @change="toggleAuth(c)" />
          </view>
        </view>
      </view>

      <EmptyState v-if="!loading && list.length === 0" title="暂无客户" desc="切换标签或调整搜索" />
    </view>

    <view class="safe-bottom" />

    <!-- 价格层级选择 -->
    <view v-if="showTierPicker" class="mask" @click="showTierPicker = null">
      <view class="sheet" @click.stop>
        <view class="sheet-head">为「{{ showTierPicker.nickname }}」设置价格层级</view>
        <view class="sheet-options">
          <view
            v-for="t in ['retail', 'wholesale', 'member'] as const"
            :key="t"
            :class="['opt', { active: showTierPicker.priceTier === t }]"
            @click="pickTier(t)"
          >
            <text class="opt-title">{{ TIER_LABEL[t].text }}</text>
            <text class="opt-desc">
              {{ t === 'retail' ? '默认零售价' : t === 'wholesale' ? '批发价（已授权门店）' : '会员价' }}
            </text>
            <text v-if="showTierPicker.priceTier === t" class="opt-tick">✓</text>
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
  padding-bottom: 40rpx;
}
.header {
  background: var(--bg-card);
  padding: 16rpx 24rpx 0;
  position: sticky;
  top: 0;
  z-index: 5;
  box-shadow: var(--shadow-sm);
}
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  padding: 0 16rpx 0 20rpx;
  height: 72rpx;
  margin-bottom: 12rpx;
  .search-input { flex: 1; height: 100%; font-size: 26rpx; }
}
.list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  .avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: var(--bg-hover);
  }
  .head-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    .name-row {
      display: flex;
      align-items: center;
      gap: 8rpx;
      flex-wrap: wrap;
      .name { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
    }
    .phone {
      font-size: 22rpx;
      color: var(--text-tertiary);
      font-family: var(--font-family-base);
    }
  }
  .phone-call {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: var(--brand-primary-ghost);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.stats {
  display: flex;
  gap: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 16rpx;
}
.stat {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .stat-value {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
  .stat-label {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx dashed var(--border-light);
  .foot-left, .foot-right {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  .foot-label { font-size: 22rpx; color: var(--text-tertiary); }
  .tier-pill {
    display: flex;
    align-items: center;
    gap: 4rpx;
    .caret { font-size: 24rpx; color: var(--text-tertiary); }
  }
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
}
.sheet-head {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid var(--border-light);
}
.sheet-options {
  display: flex;
  flex-direction: column;
  padding-top: 16rpx;
}
.opt {
  display: flex;
  flex-direction: column;
  padding: 24rpx 16rpx;
  border-radius: 12rpx;
  position: relative;
  border: 2rpx solid transparent;
  &.active {
    background: var(--brand-primary-ghost);
    border-color: var(--brand-primary);
  }
  .opt-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary); }
  .opt-desc { margin-top: 4rpx; font-size: 22rpx; color: var(--text-tertiary); }
  .opt-tick {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    color: var(--brand-primary);
    font-size: 32rpx;
    font-weight: 700;
  }
}
.safe-bottom { height: 40rpx; }
</style>
