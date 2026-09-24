<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
/**
 * MA-11 · 客户管理
 *
 * Tab(全部/分佣客户/会员/普通) + 搜索 + 客户卡 + 价格授权开关 + 价格层级选择
 */
import { ref, computed, onMounted } from 'vue'
import { customerService } from '../../services/customer'
import type { MerchantCustomer } from '../../services/customer'
import { formatPrice, formatRelative, maskPhone } from '@jiujiu/shared/utils'
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

const TIER_LABEL: Record<
  string,
  { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  wholesale: { text: '批发价', tone: 'success' },
  member: { text: '会员价', tone: 'primary' },
  retail: { text: '零售价', tone: 'default' },
}

const KIND_LABEL: Record<
  string,
  { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  promoter: { text: '分佣', tone: 'warning' },
  member: { text: '会员', tone: 'primary' },
  normal: { text: '普通', tone: 'default' },
}

const showTierPicker = ref<MerchantCustomer | null>(null)

async function load() {
  loading.value = true
  try {
    // 'all' tab 不传 kind,后端按缺省返回全量;其他 tab(promoter/member/normal)
    // 透传给后端做服务端过滤(避免本地切 tab 仅过滤当前页造成翻页错位)
    const data = await customerService.list({
      kind: tab.value === 'all' ? undefined : tab.value,
      keyword: keyword.value || undefined,
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function toggleAuth(c: MerchantCustomer) {
  c.priceAuthorized = !c.priceAuthorized
  await customerService.authorize(c.id, c.priceAuthorized)
  appFeedback.showToast({ title: c.priceAuthorized ? '已授权' : '已取消授权' })
}

function openTierPicker(c: MerchantCustomer) {
  showTierPicker.value = c
}

async function pickTier(tier: 'retail' | 'wholesale' | 'member') {
  if (!showTierPicker.value) return
  showTierPicker.value.priceTier = tier
  await customerService.setPriceTier(showTierPicker.value.id, tier)
  appFeedback.showToast({ title: '已更新' })
  showTierPicker.value = null
}

function callCustomer(c: MerchantCustomer) {
  uni.makePhoneCall({ phoneNumber: c.phone })
}

onMounted(load)
</script>

<template>
  <wd-config-provider
    :theme="$jwTheme.resolvedTheme"
    :theme-vars="$jwTheme.themeVars"
    custom-class="jw-theme-root"
  >
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />
    <view class="page">
      <wd-navbar
        title="客户管理"
        @click-left="$jwNav.back()"
        left-arrow
        fixed
        placeholder
        safe-area-inset-top
        custom-class="jw-glass-navbar"
      />

      <view class="header">
        <view class="search-wrap">
          <wd-icon :name="$jwIcon('search')" size="16px" color="var(--text-tertiary)" />
          <wd-input
            no-border
            v-model="keyword"
            class="search-input"
            placeholder="搜索昵称 / 手机号"
            confirm-type="search"
            @confirm="load"
          />
        </view>
        <wd-tabs v-model="tab" @change="load" color="var(--brand-primary)">
          <wd-tab
            v-for="item in TABS"
            :key="item.key"
            :name="item.key"
            :title="item.label"
            :badge-props="(item as any).badge ? { value: (item as any).badge, max: 99 } : undefined"
          />
        </wd-tabs>
      </view>

      <view class="list">
        <view v-for="c in list" :key="c.id" class="card">
          <view class="card-head">
            <image class="avatar" :src="c.avatar" mode="aspectFill" />
            <view class="head-info">
              <view class="name-row">
                <text class="name">{{ c.nickname }}</text>
                <wd-tag :type="$jwTagType(KIND_LABEL[c.kind].tone)" :plain="true" round>{{
                  KIND_LABEL[c.kind].text
                }}</wd-tag>
                <wd-tag v-if="c.groupTag" :type="$jwTagType('info')" :plain="true" round>{{
                  c.groupTag
                }}</wd-tag>
              </view>
              <text class="phone">{{ maskPhone(c.phone) }}</text>
            </view>
            <view class="phone-call" @click="callCustomer(c)">
              <wd-icon :name="$jwIcon('phone')" size="16px" color="var(--brand-primary)" />
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
              <text class="stat-value">{{
                c.lastOrderAt ? formatRelative(c.lastOrderAt) : '—'
              }}</text>
              <text class="stat-label">最近下单</text>
            </view>
          </view>

          <view class="card-foot">
            <view class="foot-left">
              <text class="foot-label">价格层级</text>
              <view class="tier-pill" @click="openTierPicker(c)">
                <wd-tag :type="$jwTagType(TIER_LABEL[c.priceTier].tone)" :plain="false" round>{{
                  TIER_LABEL[c.priceTier].text
                }}</wd-tag>

                <text class="caret">›</text>
              </view>
            </view>
            <view class="foot-right">
              <text class="foot-label">价格授权</text>
              <wd-switch
                :model-value="c.priceAuthorized"
                active-color="var(--brand-primary)"
                @change="toggleAuth(c)"
              />
            </view>
          </view>
        </view>

        <wd-status-tip
          v-if="!loading && list.length === 0"
          image="content"
          :tip="['暂无客户', '切换标签或调整搜索'].filter(Boolean).join(' · ')"
        />
      </view>

      <view class="safe-bottom" />

      <!-- 价格层级选择 -->
      <wd-popup
        :model-value="!!showTierPicker"
        position="bottom"
        custom-class="sheet"
        safe-area-inset-bottom
        root-portal
        @close="showTierPicker = null"
      >
        <view v-if="showTierPicker" class="sheet-content">
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
                {{
                  t === 'retail'
                    ? '默认零售价'
                    : t === 'wholesale'
                      ? '批发价（已授权门店）'
                      : '会员价'
                }}
              </text>
              <text v-if="showTierPicker.priceTier === t" class="opt-tick">✓</text>
            </view>
          </view>
        </view>
      </wd-popup>
    </view>
  </wd-config-provider>
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
  .search-input {
    flex: 1;
    height: 100%;
    font-size: 26rpx;
  }
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
      .name {
        font-size: 28rpx;
        font-weight: 700;
        color: var(--text-primary);
      }
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
  .foot-left,
  .foot-right {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  .foot-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .tier-pill {
    display: flex;
    align-items: center;
    gap: 4rpx;
    .caret {
      font-size: 24rpx;
      color: var(--text-tertiary);
    }
  }
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
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
  .opt-title {
    font-size: 28rpx;
    font-weight: 600;
    color: var(--text-primary);
  }
  .opt-desc {
    margin-top: 4rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .opt-tick {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    color: var(--brand-primary);
    font-size: 32rpx;
    font-weight: 700;
  }
}
.safe-bottom {
  height: 40rpx;
}
</style>
