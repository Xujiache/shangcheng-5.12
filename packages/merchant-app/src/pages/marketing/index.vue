<script setup lang="ts">
/**
 * MA-18 · 营销中心
 *
 * 3 大工具入口（优惠券/限时购/团购）+ 优惠券概览 + 优惠券表
 *
 * Wave5 升级：优惠券完整 CRUD（创建 / 编辑 / 启停 / 复制 / 删除）真落库。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { marketingService } from '../../services/store'
import type { MarketingCoupon, MarketingCouponDto, MarketingOverview } from '../../services/store'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

const overview = ref<MarketingOverview | null>(null)
const couponTab = ref<'all' | 'active' | 'pending' | 'ended'>('active')
const coupons = ref<MarketingCoupon[]>([])
const loading = ref(false)

const COUPON_TABS = computed(() => [
  { key: 'all' as const, label: '全部', badge: coupons.value.length },
  { key: 'active' as const, label: '进行中' },
  { key: 'pending' as const, label: '未开始' },
  { key: 'ended' as const, label: '已结束' },
])

const STATUS_LABEL: Record<
  string,
  { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  active: { text: '进行中', tone: 'success' },
  pending: { text: '草稿', tone: 'info' },
  paused: { text: '已暂停', tone: 'warning' },
  ended: { text: '已结束', tone: 'default' },
}

/**
 * 工具入口
 *
 * 当前只接入"优惠券"这一项可完整 CRUD 的工具(见下方 createCoupon/editCoupon 流程)。
 * 限时购/团购虽然后端 overview 会返回总数,但商家端没有对应详情页 / 创建页 / 编辑页,
 * 留卡片会产生"点击没反应"的死按钮,按修复要求 P1-13 整张卡删除,
 * 不留架空 UI,等后端 + 页面齐套再加回来。
 */
const TOOLS = [
  {
    key: 'coupon',
    icon: 'tag',
    label: '优惠券',
    desc: '满减/折扣/固定金额',
    accent: '#FF4D2D',
    countLabel: '进行中',
    count: () => overview.value?.coupons.active ?? 0,
  },
]

async function loadOverview() {
  overview.value = await marketingService.overview()
}
async function loadCoupons() {
  loading.value = true
  try {
    const data = await marketingService.couponList({ status: couponTab.value, pageSize: 20 })
    coupons.value = data.list
  } finally {
    loading.value = false
  }
}

function couponValueText(c: MarketingCoupon) {
  if (c.type === 'fullReduce') return `满${c.threshold}减${c.amount}`
  if (c.type === 'discount') return `${(c.discountPercent ?? 0) / 10}折`
  if (c.type === 'fixed') return `${formatPrice(c.amount ?? 0)}券`
  return ''
}

function couponBigValue(c: MarketingCoupon) {
  if (c.type === 'fullReduce') return c.amount
  if (c.type === 'discount') return ((c.discountPercent ?? 0) / 10).toFixed(1)
  if (c.type === 'fixed') return c.amount
  return 0
}

function couponBigUnit(c: MarketingCoupon) {
  if (c.type === 'discount') return '折'
  return '元'
}

/* ============ 优惠券 CRUD 表单 ============ */

const COUPON_TYPES: { value: MarketingCoupon['type']; label: string; desc: string }[] = [
  { value: 'fullReduce', label: '满减券', desc: '满 X 减 Y' },
  { value: 'discount', label: '折扣券', desc: 'X 折优惠' },
  { value: 'fixed', label: '固定金额', desc: '无门槛立减' },
]

interface CouponForm {
  id: string | null
  name: string
  type: MarketingCoupon['type']
  amount: number
  discountPercent: number
  threshold: number
  stock: number
  validFrom: string
  validTo: string
  perUserLimit: number
}

function defaultForm(): CouponForm {
  const today = new Date()
  const monthLater = new Date(today.getTime() + 30 * 24 * 3600 * 1000)
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return {
    id: null,
    name: '',
    type: 'fullReduce',
    amount: 10,
    discountPercent: 90,
    threshold: 100,
    stock: 100,
    validFrom: ymd(today),
    validTo: ymd(monthLater),
    perUserLimit: 1,
  }
}

const formVisible = ref(false)
const form = reactive<CouponForm>(defaultForm())
const formSaving = ref(false)

function openCreate() {
  Object.assign(form, defaultForm())
  formVisible.value = true
}

function openEdit(c: MarketingCoupon) {
  Object.assign(form, {
    id: c.id,
    name: c.name,
    type: c.type,
    amount: c.amount ?? 0,
    discountPercent: c.discountPercent ?? 90,
    threshold: c.threshold ?? 0,
    stock: c.stock ?? 0,
    validFrom: (c.validFrom || '').slice(0, 10),
    validTo: (c.validTo || '').slice(0, 10),
    perUserLimit: c.perUserLimit ?? 1,
  } as CouponForm)
  formVisible.value = true
}

function closeForm() {
  if (formSaving.value) return
  formVisible.value = false
}

function pickType(t: MarketingCoupon['type']) {
  form.type = t
}

function onDateFrom(e: any) {
  form.validFrom = e.detail.value
}
function onDateTo(e: any) {
  form.validTo = e.detail.value
}

function validateForm(): string | null {
  if (!form.name.trim()) return '请填写优惠券名称'
  if (form.type === 'fullReduce') {
    if (!(form.amount > 0)) return '请填写优惠金额'
    if (!(form.threshold > 0)) return '请填写使用门槛'
    if (form.amount >= form.threshold) return '优惠金额需小于门槛'
  } else if (form.type === 'discount') {
    if (!(form.discountPercent > 0 && form.discountPercent < 100)) return '折扣需在 1~99 之间'
  } else if (form.type === 'fixed') {
    if (!(form.amount > 0)) return '请填写券面值'
  }
  if (!(form.stock > 0)) return '请填写发行量'
  if (!form.validFrom || !form.validTo) return '请选择有效期'
  if (form.validFrom > form.validTo) return '结束日期需晚于开始日期'
  return null
}

async function submitForm() {
  const err = validateForm()
  if (err) {
    uni.showToast({ title: err, icon: 'none' })
    return
  }
  const dto: MarketingCouponDto = {
    name: form.name.trim(),
    type: form.type,
    stock: Number(form.stock),
    validFrom: form.validFrom,
    validTo: form.validTo,
    perUserLimit: Number(form.perUserLimit) || 1,
    scope: 'all',
  }
  if (form.type === 'fullReduce') {
    dto.amount = Number(form.amount)
    dto.threshold = Number(form.threshold)
  } else if (form.type === 'discount') {
    dto.discountPercent = Number(form.discountPercent)
  } else if (form.type === 'fixed') {
    dto.amount = Number(form.amount)
  }
  formSaving.value = true
  try {
    if (form.id) {
      await marketingService.updateCoupon(form.id, dto)
      uni.showToast({ title: '已更新', icon: 'success' })
    } else {
      await marketingService.createCoupon(dto)
      uni.showToast({ title: '已创建', icon: 'success' })
    }
    formVisible.value = false
    await Promise.all([loadOverview(), loadCoupons()])
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    formSaving.value = false
  }
}

function createCoupon() {
  openCreate()
}

/** 列表项点击 → 行动菜单（编辑 / 启停 / 复制 / 删除） */
function manageCoupon(c: MarketingCoupon) {
  const togglable = c.status === 'active' || c.status === 'paused'
  const items: string[] = ['编辑']
  if (togglable) items.push(c.status === 'active' ? '暂停' : '启用')
  items.push('复制为新券', '删除')
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const label = items[res.tapIndex]
      if (label === '编辑') openEdit(c)
      else if (label === '暂停' || label === '启用') toggleCouponStatus(c)
      else if (label === '复制为新券') duplicateCoupon(c)
      else if (label === '删除') confirmRemove(c)
    },
  })
}

async function toggleCouponStatus(c: MarketingCoupon) {
  const nextActive = c.status !== 'active'
  try {
    await marketingService.toggleCoupon(c.id, nextActive)
    uni.showToast({ title: nextActive ? '已启用' : '已暂停', icon: 'success' })
    await Promise.all([loadOverview(), loadCoupons()])
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

function duplicateCoupon(c: MarketingCoupon) {
  Object.assign(form, {
    id: null,
    name: `${c.name} 副本`,
    type: c.type,
    amount: c.amount ?? 0,
    discountPercent: c.discountPercent ?? 90,
    threshold: c.threshold ?? 0,
    stock: c.stock ?? 0,
    validFrom: (c.validFrom || '').slice(0, 10) || defaultForm().validFrom,
    validTo: (c.validTo || '').slice(0, 10) || defaultForm().validTo,
    perUserLimit: c.perUserLimit ?? 1,
  } as CouponForm)
  formVisible.value = true
}

function confirmRemove(c: MarketingCoupon) {
  uni.showModal({
    title: '删除优惠券',
    content: `确认删除「${c.name}」？已领取的券不会自动撤销，但不再发放。`,
    confirmText: '删除',
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await marketingService.removeCoupon(c.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await Promise.all([loadOverview(), loadCoupons()])
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

onMounted(() => {
  loadOverview()
  loadCoupons()
})
</script>

<template>
  <view class="page">
    <NavBar title="营销中心" right-text="数据" />

    <!-- 工具入口 -->
    <view class="tools">
      <view
        v-for="t in TOOLS"
        :key="t.key"
        class="tool-card"
        :style="{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}DD)` }"
      >
        <view class="tool-icon">
          <Icon :name="t.icon" :size="48" color="#fff" />
        </view>
        <view class="tool-info">
          <text class="tool-label">{{ t.label }}</text>
          <text class="tool-desc">{{ t.desc }}</text>
        </view>
        <view class="tool-count">
          <text class="count-value">{{ t.count() }}</text>
          <text class="count-label">{{ t.countLabel }}</text>
        </view>
      </view>
    </view>

    <!-- 概览三宫格 - 仅保留有可点击工具的优惠券统计 -->
    <view v-if="overview" class="stats">
      <view class="stat">
        <text class="stat-value">{{ overview.coupons.total }}</text>
        <text class="stat-label">优惠券总数</text>
      </view>
      <view class="stat">
        <text class="stat-value">{{ overview.coupons.active }}</text>
        <text class="stat-label">进行中</text>
      </view>
      <view class="stat">
        <text class="stat-value">{{ overview.coupons.totalReceived }}</text>
        <text class="stat-label">已被领取</text>
      </view>
    </view>

    <!-- 优惠券列表 -->
    <Section title="我的优惠券" action="创建" @action="createCoupon">
      <template #default>
        <Tabs v-model="couponTab" :items="COUPON_TABS" variant="underline" @change="loadCoupons" />
        <view class="coupon-list">
          <view
            v-for="c in coupons"
            :key="c.id"
            :class="['coupon', `t-${c.status}`]"
            @click="manageCoupon(c)"
          >
            <view class="cp-left">
              <view class="cp-amount">
                <text class="cp-num">{{ couponBigValue(c) }}</text>
                <text class="cp-unit">{{ couponBigUnit(c) }}</text>
              </view>
              <text class="cp-thresh">{{ c.threshold ? `满 ${c.threshold} 可用` : '无门槛' }}</text>
            </view>
            <view class="cp-divider">
              <view class="cp-dot" v-for="i in 6" :key="i"></view>
            </view>
            <view class="cp-right">
              <view class="cp-head">
                <text class="cp-name">{{ c.name }}</text>
                <StatusTag
                  :text="STATUS_LABEL[c.status].text"
                  :tone="STATUS_LABEL[c.status].tone"
                />
              </view>
              <text class="cp-type">{{ couponValueText(c) }}</text>
              <view class="cp-stats">
                <text>领 {{ c.received }} / {{ c.stock }}</text>
                <text>用 {{ c.used }}</text>
              </view>
              <text v-if="c.validFrom" class="cp-valid"
                >{{ formatDate(c.validFrom) }} ~ {{ formatDate(c.validTo) }}</text
              >
            </view>
          </view>
          <EmptyState
            v-if="!loading && coupons.length === 0"
            title="暂无优惠券"
            desc="点击右上角创建"
          />
        </view>
      </template>
    </Section>

    <view class="safe-bottom" />

    <!-- 优惠券 创建 / 编辑 弹窗 -->
    <view v-if="formVisible" class="cp-mask" @click="closeForm">
      <view class="cp-sheet" @click.stop>
        <view class="cp-head">
          <text class="cp-title">{{ form.id ? '编辑优惠券' : '创建优惠券' }}</text>
          <text class="cp-close" @click="closeForm">✕</text>
        </view>

        <scroll-view scroll-y class="cp-scroll">
          <!-- 类型 -->
          <view class="cp-block">
            <text class="cp-label">类型</text>
            <view class="cp-type-grid">
              <view
                v-for="t in COUPON_TYPES"
                :key="t.value"
                :class="['cp-type', { active: form.type === t.value }]"
                @click="pickType(t.value)"
              >
                <text class="t-label">{{ t.label }}</text>
                <text class="t-desc">{{ t.desc }}</text>
              </view>
            </view>
          </view>

          <!-- 名称 -->
          <view class="cp-row">
            <text class="row-label required">名称</text>
            <input
              v-model="form.name"
              class="row-input"
              placeholder="如 春节满 200 减 30"
              maxlength="30"
            />
          </view>

          <!-- 满减 -->
          <template v-if="form.type === 'fullReduce'">
            <view class="cp-row">
              <text class="row-label required">满</text>
              <input
                v-model.number="form.threshold"
                type="digit"
                class="row-input"
                placeholder="使用门槛"
              />
              <text class="row-suffix">元可用</text>
            </view>
            <view class="cp-row">
              <text class="row-label required">减</text>
              <input
                v-model.number="form.amount"
                type="digit"
                class="row-input"
                placeholder="优惠金额"
              />
              <text class="row-suffix">元</text>
            </view>
          </template>

          <!-- 折扣 -->
          <template v-else-if="form.type === 'discount'">
            <view class="cp-row">
              <text class="row-label required">折扣</text>
              <input
                v-model.number="form.discountPercent"
                type="digit"
                class="row-input"
                placeholder="1-99"
              />
              <text class="row-suffix">% 优惠（90 = 9 折）</text>
            </view>
          </template>

          <!-- 固定金额 -->
          <template v-else>
            <view class="cp-row">
              <text class="row-label required">面值</text>
              <input
                v-model.number="form.amount"
                type="digit"
                class="row-input"
                placeholder="券面金额"
              />
              <text class="row-suffix">元</text>
            </view>
          </template>

          <!-- 发行量 -->
          <view class="cp-row">
            <text class="row-label required">发行量</text>
            <input
              v-model.number="form.stock"
              type="number"
              class="row-input"
              placeholder="总发行数"
            />
            <text class="row-suffix">张</text>
          </view>

          <!-- 每人限领 -->
          <view class="cp-row">
            <text class="row-label">每人限领</text>
            <input
              v-model.number="form.perUserLimit"
              type="number"
              class="row-input"
              placeholder="默认 1 张"
            />
            <text class="row-suffix">张</text>
          </view>

          <!-- 有效期 -->
          <view class="cp-row">
            <text class="row-label required">开始日期</text>
            <picker
              mode="date"
              :value="form.validFrom"
              @change="onDateFrom"
              class="row-input picker"
            >
              <view class="picker-text">{{ form.validFrom || '请选择' }}</view>
            </picker>
          </view>
          <view class="cp-row">
            <text class="row-label required">结束日期</text>
            <picker mode="date" :value="form.validTo" @change="onDateTo" class="row-input picker">
              <view class="picker-text">{{ form.validTo || '请选择' }}</view>
            </picker>
          </view>
        </scroll-view>

        <view class="cp-footer">
          <view class="cp-btn ghost" @click="closeForm">取消</view>
          <view :class="['cp-btn primary', formSaving ? 'disabled' : '']" @click="submitForm">
            {{ formSaving ? '保存中…' : form.id ? '保存修改' : '创建' }}
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
.tools {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.tool-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  .tool-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .tool-label {
      font-size: 30rpx;
      font-weight: 700;
    }
    .tool-desc {
      font-size: 22rpx;
      opacity: 0.85;
    }
  }
  .tool-count {
    text-align: right;
    .count-value {
      display: block;
      font-size: 40rpx;
      font-weight: 700;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .count-label {
      font-size: 20rpx;
      opacity: 0.85;
    }
  }
}
.stats {
  margin: 0 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  box-shadow: var(--shadow-sm);
}
.stat {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .stat-value {
    font-size: 30rpx;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
  .stat-label {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-top: 16rpx;
}
.coupon {
  display: flex;
  align-items: stretch;
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  position: relative;
  &.t-ended {
    opacity: 0.55;
    filter: grayscale(0.3);
  }
}
.cp-left {
  width: 200rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  color: #fff;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .cp-amount {
    display: flex;
    align-items: baseline;
    .cp-num {
      font-size: 56rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .cp-unit {
      font-size: 22rpx;
      margin-left: 4rpx;
    }
  }
  .cp-thresh {
    font-size: 18rpx;
    opacity: 0.9;
  }
}
.cp-divider {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 8rpx 0;
  background: var(--bg-card);
  position: relative;
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    background: var(--bg-page);
  }
  &::before {
    top: -12rpx;
  }
  &::after {
    bottom: -12rpx;
  }
  .cp-dot {
    width: 4rpx;
    height: 4rpx;
    border-radius: 50%;
    background: var(--border-default);
    margin: 4rpx 8rpx;
  }
}
.cp-right {
  flex: 1;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .cp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8rpx;
    .cp-name {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .cp-type {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
  }
  .cp-stats {
    display: flex;
    gap: 16rpx;
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .cp-valid {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.safe-bottom {
  height: 40rpx;
}

/* ============ 优惠券 创建/编辑 弹窗 ============ */
.cp-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.cp-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.cp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 24rpx 12rpx;
  border-bottom: 1rpx solid var(--border-light);
  .cp-title {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .cp-close {
    font-size: 32rpx;
    color: var(--text-tertiary);
    padding: 0 8rpx;
  }
}
.cp-scroll {
  flex: 1;
  padding: 16rpx 24rpx;
  max-height: 60vh;
}
.cp-block {
  margin-bottom: 16rpx;
  .cp-label {
    display: block;
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-bottom: 12rpx;
  }
}
.cp-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.cp-type {
  padding: 16rpx 12rpx;
  background: var(--bg-page);
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  &.active {
    border-color: var(--brand-primary);
    background: rgba(255, 77, 45, 0.06);
  }
  .t-label {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .t-desc {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.cp-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--border-light);
  &:last-of-type {
    border-bottom: none;
  }
  .row-label {
    width: 160rpx;
    flex-shrink: 0;
    font-size: 26rpx;
    color: var(--text-secondary);
    &.required::before {
      content: '*';
      color: var(--status-error, #ff3b30);
      margin-right: 4rpx;
    }
  }
  .row-input {
    flex: 1;
    background: var(--bg-page);
    border-radius: 8rpx;
    padding: 12rpx 16rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    min-width: 0;
    &.picker {
      padding: 0;
    }
    .picker-text {
      padding: 12rpx 16rpx;
      font-size: 26rpx;
      color: var(--text-primary);
    }
  }
  .row-suffix {
    flex-shrink: 0;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.cp-footer {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04);
  .cp-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 999rpx;
    text-align: center;
    line-height: 80rpx;
    font-size: 28rpx;
    font-weight: 700;
    &.ghost {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    &.primary {
      background: var(--brand-gradient);
      color: #fff;
    }
    &.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }
}
</style>
