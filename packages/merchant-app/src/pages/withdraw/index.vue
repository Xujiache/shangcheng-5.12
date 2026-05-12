<script setup lang="ts">
/**
 * MA-13 · 提现处理（核心交互）
 *
 * Tab + 提现单列表 + 详情浮层（调整金额 −/+ + 备注 + 快捷标签 + 通过/拒绝）
 */
import { ref, computed, onMounted, watch } from 'vue'
import { withdrawService } from '../../services/customer'
import type { Withdraw } from '@jiujiu/shared/types'
import { formatPrice, formatDateTime } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

type Tab = 'all' | 'pending' | 'approved' | 'rejected' | 'paid'

const tab = ref<Tab>('pending')
const list = ref<Withdraw[]>([])
const loading = ref(false)
const total = ref(0)

const TABS = computed(() => [
  { key: 'all' as Tab, label: '全部', badge: total.value },
  { key: 'pending' as Tab, label: '待处理' },
  { key: 'approved' as Tab, label: '已通过' },
  { key: 'paid' as Tab, label: '已打款' },
  { key: 'rejected' as Tab, label: '已驳回' },
])

const STATUS_LABEL: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  pending: { text: '待处理', tone: 'warning' },
  approved: { text: '已通过', tone: 'success' },
  rejected: { text: '已驳回', tone: 'error' },
  paid: { text: '已打款', tone: 'primary' },
  failed: { text: '失败', tone: 'error' },
}

// 详情浮层 / 调整
const showSheet = ref(false)
const current = ref<Withdraw | null>(null)
const actualAmount = ref<number>(0)
const remark = ref('')
const remarkTags = ref<Set<string>>(new Set())

const QUICK_TAGS = [
  { tag: '扣减税费', deltaPct: -3 },
  { tag: '非订单佣金', deltaPct: -100 },
  { tag: '客户违规', deltaPct: -50 },
  { tag: '尾差圆整', deltaPct: 0 },
  { tag: '保留 1 元手续费', deltaPct: 0, fixed: -1 },
]

const applyAmount = computed(() => Number(current.value?.applyAmount ?? 0))
const diff = computed(() => Math.round((actualAmount.value - applyAmount.value) * 100) / 100)

async function load() {
  loading.value = true
  try {
    const data = await withdrawService.list({
      status: tab.value === 'all' ? undefined : tab.value,
      pageSize: 30,
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function openSheet(w: Withdraw) {
  current.value = w
  actualAmount.value = Number(w.actualAmount || w.applyAmount)
  remark.value = w.remark || ''
  remarkTags.value = new Set(w.remarkTags || [])
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
  current.value = null
}

function adjust(delta: number) {
  const next = Math.max(0, Math.round((actualAmount.value + delta) * 100) / 100)
  actualAmount.value = next
}

function applyQuickTag(t: { tag: string; deltaPct: number; fixed?: number }) {
  const has = remarkTags.value.has(t.tag)
  const tags = new Set(remarkTags.value)
  if (has) {
    tags.delete(t.tag)
    // 标签复位时不自动撤销金额 —— 由人工调整
  } else {
    tags.add(t.tag)
    // 应用金额：deltaPct 是相对申请额的扣减；fixed 直接加减
    if (t.deltaPct !== 0) {
      actualAmount.value = Math.max(0, Math.round((applyAmount.value * (1 + t.deltaPct / 100)) * 100) / 100)
    }
    if (t.fixed) {
      actualAmount.value = Math.max(0, Math.round((actualAmount.value + t.fixed) * 100) / 100)
    }
  }
  remarkTags.value = tags
}

async function approve() {
  if (!current.value) return
  if (actualAmount.value > applyAmount.value) {
    const ok = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '确认',
        content: `实际金额 ${formatPrice(actualAmount.value)} 大于申请额 ${formatPrice(applyAmount.value)}，确定通过？`,
        success: (r) => resolve(r.confirm),
      })
    })
    if (!ok) return
  }
  await withdrawService.review(current.value.id, {
    actualAmount: actualAmount.value,
    remark: remark.value,
    remarkTags: Array.from(remarkTags.value),
  })
  uni.showToast({ title: '已通过', icon: 'success' })
  closeSheet()
  load()
}

function rejectCurrent() {
  if (!current.value) return
  uni.showModal({
    title: '驳回提现',
    editable: true,
    placeholderText: '请填写驳回理由',
    success: async (r) => {
      if (r.confirm && r.content && current.value) {
        await withdrawService.reject(current.value.id, r.content)
        uni.showToast({ title: '已驳回' })
        closeSheet()
        load()
      }
    },
  })
}

watch(tab, load)
onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="提现处理" />

    <view class="header">
      <Tabs v-model="tab" :items="TABS" variant="underline" @change="load" />
    </view>

    <view class="list">
      <view v-for="w in list" :key="w.id" class="card" @click="openSheet(w)">
        <view class="card-head">
          <view class="card-head-left">
            <text class="card-no">{{ w.no }}</text>
            <StatusTag :text="`${w.method === 'wechat' ? '微信' : w.method === 'alipay' ? '支付宝' : '银行卡'}`" tone="info" />
          </view>
          <StatusTag :text="STATUS_LABEL[w.status]?.text || w.status" :tone="STATUS_LABEL[w.status]?.tone || 'default'" fill />
        </view>
        <view class="card-body">
          <view class="amount-row">
            <view class="amount-block">
              <text class="a-label">申请金额</text>
              <text class="a-value primary">{{ formatPrice(w.applyAmount) }}</text>
            </view>
            <view class="arrow">→</view>
            <view class="amount-block">
              <text class="a-label">实际金额</text>
              <text class="a-value">{{ formatPrice(w.actualAmount) }}</text>
            </view>
          </view>
          <view class="meta">
            <text class="meta-time">{{ formatDateTime(w.createdAt) }}</text>
            <text v-if="w.status === 'pending'" class="meta-cta">处理 ›</text>
          </view>
          <view v-if="w.remarkTags?.length" class="tag-row">
            <text v-for="t in w.remarkTags" :key="t" class="t-tag">{{ t }}</text>
          </view>
        </view>
      </view>

      <EmptyState v-if="!loading && list.length === 0" title="暂无提现申请" desc="切换标签查看其他状态" />
    </view>

    <view class="safe-bottom" />

    <!-- 处理浮层 -->
    <view v-if="showSheet && current" class="mask" @click="closeSheet">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <view class="sheet-head-info">
            <text class="sheet-title">提现处理</text>
            <text class="sheet-sub">{{ current.no }}</text>
          </view>
          <text class="close" @click="closeSheet">✕</text>
        </view>

        <!-- 申请金额展示 -->
        <view class="apply-block">
          <text class="apply-label">客户申请提现</text>
          <text class="apply-amount">{{ formatPrice(applyAmount) }}</text>
        </view>

        <!-- 调整面板（核心交互） -->
        <view class="adjust-block">
          <text class="adjust-label">实际转账金额</text>
          <view class="adjust-row">
            <view class="step minus" @click="adjust(-1)">
              <Icon name="minus" :size="44" color="var(--status-error)" />
            </view>
            <view class="amount-input-wrap">
              <text class="symbol">¥</text>
              <input
                v-model.number="actualAmount"
                class="amount-input"
                type="digit"
                placeholder="0.00"
              />
            </view>
            <view class="step plus" @click="adjust(1)">
              <Icon name="plus" :size="44" color="var(--status-success)" />
            </view>
          </view>
          <view class="quick-adjust">
            <view class="qa" @click="adjust(-10)">−10</view>
            <view class="qa" @click="adjust(-1)">−1</view>
            <view class="qa" @click="adjust(-0.1)">−0.1</view>
            <view class="qa" @click="adjust(0.1)">＋0.1</view>
            <view class="qa" @click="adjust(1)">＋1</view>
            <view class="qa" @click="adjust(10)">＋10</view>
          </view>
          <view class="diff-row" v-if="diff !== 0">
            <text class="diff-label">差额</text>
            <text :class="['diff-value', diff > 0 ? 'up' : 'down']">
              {{ diff > 0 ? '+' : '' }}{{ formatPrice(diff) }}
            </text>
          </view>
        </view>

        <!-- 快捷标签 -->
        <view class="tags-block">
          <text class="block-label">备注标签 · 点击应用金额</text>
          <view class="tags">
            <view
              v-for="t in QUICK_TAGS"
              :key="t.tag"
              :class="['tag-pill', { active: remarkTags.has(t.tag) }]"
              @click="applyQuickTag(t)"
            >
              {{ t.tag }}
              <text v-if="t.deltaPct !== 0" class="tag-delta">
                {{ t.deltaPct > 0 ? '+' : '' }}{{ t.deltaPct }}%
              </text>
              <text v-else-if="t.fixed" class="tag-delta">
                {{ t.fixed > 0 ? '+' : '' }}{{ t.fixed }}元
              </text>
            </view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="remark-block">
          <text class="block-label">备注（客户可见）</text>
          <textarea
            v-model="remark"
            class="remark-input"
            placeholder="可填写：金额调整说明 / 打款时间 / 凭证号等"
            maxlength="100"
          />
          <text class="remark-count">{{ remark.length }} / 100</text>
        </view>

        <!-- 操作 -->
        <view class="sheet-actions">
          <view class="action-btn ghost" @click="rejectCurrent">驳回</view>
          <view class="action-btn primary" @click="approve">
            通过 · 打款 {{ formatPrice(actualAmount) }}
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
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 5;
  border-bottom: 1rpx solid var(--border-light);
  overflow-x: auto;
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
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  .card-head-left {
    display: flex;
    align-items: center;
    gap: 12rpx;
    .card-no { font-size: 24rpx; color: var(--text-secondary); font-family: var(--font-family-base); }
  }
}
.card-body {
  padding-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.amount-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.amount-block {
  flex: 1;
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 16rpx;
  text-align: center;
  .a-label { font-size: 20rpx; color: var(--text-tertiary); }
  .a-value {
    display: block;
    margin-top: 4rpx;
    font-size: 32rpx;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-family-base);
    &.primary { color: var(--brand-primary); }
  }
}
.arrow {
  font-size: 28rpx;
  color: var(--text-tertiary);
}
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 22rpx;
  .meta-time { color: var(--text-tertiary); }
  .meta-cta { color: var(--brand-primary); font-weight: 600; }
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  .t-tag {
    padding: 2rpx 8rpx;
    background: var(--bg-hover);
    border-radius: 4rpx;
    font-size: 18rpx;
    color: var(--text-secondary);
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
  max-height: 90vh;
  overflow-y: auto;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid var(--border-light);
  .sheet-head-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .sheet-title { font-size: 32rpx; font-weight: 700; color: var(--text-primary); }
    .sheet-sub { font-size: 22rpx; color: var(--text-tertiary); font-family: var(--font-family-base); }
  }
  .close { font-size: 28rpx; color: var(--text-tertiary); }
}
.apply-block {
  margin-top: 24rpx;
  padding: 24rpx;
  background: var(--brand-primary-ghost);
  border-radius: 16rpx;
  text-align: center;
  .apply-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .apply-amount {
    display: block;
    margin-top: 8rpx;
    font-size: 48rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
}
.adjust-block {
  margin-top: 16rpx;
  background: var(--bg-page);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.adjust-label {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-primary);
}
.adjust-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}
.step {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.amount-input-wrap {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4rpx;
  .symbol {
    font-size: 28rpx;
    color: var(--brand-primary);
    font-weight: 700;
  }
}
.amount-input {
  text-align: center;
  font-size: 56rpx;
  font-weight: 700;
  color: var(--brand-primary);
  background: transparent;
  font-family: var(--font-family-base);
}
.quick-adjust {
  display: flex;
  gap: 8rpx;
}
.qa {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  background: var(--bg-card);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: var(--text-primary);
  font-weight: 600;
}
.diff-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  .diff-label { font-size: 22rpx; color: var(--text-tertiary); }
  .diff-value {
    font-size: 26rpx;
    font-weight: 700;
    &.up { color: var(--status-success); }
    &.down { color: var(--status-error); }
  }
}
.tags-block, .remark-block {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.block-label {
  font-size: 24rpx;
  color: var(--text-secondary);
  font-weight: 600;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.tag-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 22rpx;
  border: 1rpx solid transparent;
  .tag-delta {
    font-size: 20rpx;
    color: var(--status-error);
    margin-left: 2rpx;
  }
  &.active {
    background: var(--brand-primary-ghost);
    color: var(--brand-primary);
    border-color: var(--brand-primary);
    .tag-delta { color: var(--brand-primary); }
  }
}
.remark-block {
  position: relative;
}
.remark-input {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 24rpx;
  color: var(--text-primary);
  line-height: 1.5;
}
.remark-count {
  align-self: flex-end;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.sheet-actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}
.action-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 999rpx;
  text-align: center;
  line-height: 96rpx;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost {
    flex: 0 0 200rpx;
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.4);
  }
}
.safe-bottom { height: 40rpx; }
</style>
