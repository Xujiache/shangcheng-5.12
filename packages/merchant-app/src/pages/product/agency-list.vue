<script setup lang="ts">
/**
 * FX-1 · 代理商品列表
 *
 * 商家从选品广场申请代理后跳转到此页面，统一管理已申请的商品
 * 数据全部来自后端 /api/v1/m/plaza/applications，状态变更走 PATCH/DELETE
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import { plazaService } from '../../services/store'
import type { AgencyApplicationRow } from '../../services/store'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type Status = 'all' | 'pending' | 'approved' | 'rejected' | 'offline'

interface AgencyApp {
  id: string
  applicationId: string
  productId: string
  productName: string
  productImage: string
  factoryId: string
  factoryName: string
  startPrice: number
  retailPrice: number
  markupPercent: number
  autoSyncPrice: boolean
  status: 'pending' | 'approved' | 'rejected' | 'offline'
  appliedAt: string
}

const tab = ref<Status>('all')
const list = ref<AgencyApp[]>([])
const loading = ref(false)
const fromApply = ref(false)
const showSuccessHint = ref(false)

const TABS: { key: Status; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: 'offline', label: '已下架' },
]

const STATUS_META: Record<string, { label: string; tint: string }> = {
  pending: { label: '待审核', tint: '#FAAD14' },
  approved: { label: '已通过', tint: '#52C41A' },
  rejected: { label: '已驳回', tint: '#FF3B30' },
  offline: { label: '已下架', tint: '#86909C' },
}

const filtered = computed(() => {
  if (tab.value === 'all') return list.value
  return list.value.filter((x) => x.status === tab.value)
})

const stats = computed(() => ({
  total: list.value.length,
  pending: list.value.filter((x) => x.status === 'pending').length,
  approved: list.value.filter((x) => x.status === 'approved').length,
  byFactory: new Set(list.value.map((x) => x.factoryId)).size,
}))

function normalize(row: AgencyApplicationRow): AgencyApp {
  return {
    id: row.id,
    applicationId: row.applicationId,
    productId: row.productId,
    productName: row.productName,
    productImage: row.productImage,
    factoryId: row.factoryId,
    factoryName: row.factoryName,
    startPrice: row.factoryPrice,
    retailPrice: row.myRetailPrice,
    markupPercent: row.markupRatio,
    autoSyncPrice: row.syncStatus === 'synced',
    status: row.status,
    appliedAt: row.appliedAt,
  }
}

async function loadAgencyApps() {
  if (loading.value) return
  loading.value = true
  try {
    const rows = await plazaService.agencyApplications()
    list.value = (rows || []).map(normalize)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onLoad((opts) => {
  fromApply.value = (opts as { from?: string })?.from === 'apply'
  if (fromApply.value) showSuccessHint.value = true
})
onMounted(loadAgencyApps)
onShow(loadAgencyApps)

function goPlaza() {
  uni.switchTab({ url: '/pages/tabbar/home/index', fail: () => uni.navigateTo({ url: '/pages/plaza/index' }) })
  setTimeout(() => uni.navigateTo({ url: '/pages/plaza/index' }), 100)
}

function gotoDetail(a: AgencyApp) {
  uni.navigateTo({ url: `/pages/plaza/factory?id=${a.factoryId}` })
}

/* ====== 加价弹窗：% 加价率 / ¥ 固定金额 两种模式 ====== */
const markupDialog = ref<{
  open: boolean
  target: AgencyApp | null
  mode: 'ratio' | 'amount'
  valueStr: string
}>({ open: false, target: null, mode: 'ratio', valueStr: '30' })

const markupParsedValue = computed(() => {
  const n = Number(markupDialog.value.valueStr)
  return Number.isFinite(n) && n >= 0 ? n : 0
})

const markupPreview = computed(() => {
  const t = markupDialog.value.target
  if (!t) return null
  const v = markupParsedValue.value
  if (markupDialog.value.mode === 'ratio') {
    return {
      newRetail: Math.round(t.startPrice * (1 + v / 100)),
      derivedRatio: v,
    }
  }
  return {
    newRetail: t.startPrice + v,
    derivedRatio: t.startPrice > 0 ? Math.round((v / t.startPrice) * 100) : 0,
  }
})

function adjustMarkup(a: AgencyApp) {
  markupDialog.value = {
    open: true,
    target: a,
    mode: 'ratio',
    valueStr: String(a.markupPercent || 30),
  }
}

function closeMarkupDialog() {
  markupDialog.value.open = false
  markupDialog.value.target = null
}

async function confirmMarkup() {
  const t = markupDialog.value.target
  if (!t) return closeMarkupDialog()
  const v = markupParsedValue.value
  let newRatio = v
  let newRetail = t.retailPrice
  if (markupDialog.value.mode === 'ratio') {
    newRetail = Math.round(t.startPrice * (1 + v / 100))
  } else {
    newRetail = t.startPrice + v
    newRatio = t.startPrice > 0 ? Math.round((v / t.startPrice) * 100) : 0
  }
  try {
    await plazaService.updateAgencyApplication(t.applicationId, {
      markupRatio: newRatio,
      myRetailPrice: newRetail,
    })
    t.markupPercent = newRatio
    t.retailPrice = newRetail
    closeMarkupDialog()
    uni.showToast({
      title:
        markupDialog.value.mode === 'ratio'
          ? `加价率 +${newRatio}% · ¥${newRetail}`
          : `加价 ¥${v} · ¥${newRetail}`,
      icon: 'success',
    })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  }
}

function takeOffline(a: AgencyApp) {
  uni.showModal({
    title: '下架代理',
    content: `下架「${a.productName}」？该商品将从店铺中下架。`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await plazaService.updateAgencyApplication(a.applicationId, { status: 'offline' })
        a.status = 'offline'
        uni.showToast({ title: '已下架', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

async function relaunch(a: AgencyApp) {
  try {
    await plazaService.updateAgencyApplication(a.applicationId, { status: 'approved' })
    a.status = 'approved'
    uni.showToast({ title: '已重新上架', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

function cancelApply(a: AgencyApp) {
  uni.showModal({
    title: '取消申请',
    content: `取消对「${a.productName}」的代理申请？`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await plazaService.cancelAgencyApplication(a.applicationId)
        list.value = list.value.filter((x) => x.applicationId !== a.applicationId)
        uni.showToast({ title: '已取消', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

function goEditProduct(a: AgencyApp) {
  uni.navigateTo({ url: `/pages/product/add?id=${a.productId}&agency=1` })
}
</script>

<template>
  <view class="page">
    <NavBar title="代理商品" />

    <!-- 申请成功提示条 -->
    <view v-if="showSuccessHint" class="success-banner">
      <view class="sb-icon">
        <Icon name="check-circle" :size="36" color="#fff" :fill="true" />
      </view>
      <view class="sb-info">
        <text class="sb-title">代理申请已提交</text>
        <text class="sb-desc">厂家审核通过后，商品将出现在「已通过」中，可直接上架销售</text>
      </view>
      <view class="sb-close" @click="showSuccessHint = false">
        <Icon name="close" :size="28" color="rgba(255,255,255,0.85)" />
      </view>
    </view>

    <!-- 顶部统计 -->
    <view class="stats">
      <view class="stat">
        <text class="num">{{ stats.total }}</text>
        <text class="label">代理商品</text>
      </view>
      <view class="divider" />
      <view class="stat">
        <text class="num accent">{{ stats.pending }}</text>
        <text class="label">待审核</text>
      </view>
      <view class="divider" />
      <view class="stat">
        <text class="num success">{{ stats.approved }}</text>
        <text class="label">已通过</text>
      </view>
      <view class="divider" />
      <view class="stat">
        <text class="num">{{ stats.byFactory }}</text>
        <text class="label">合作厂家</text>
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text>{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view scroll-y class="scroll">
      <view v-for="a in filtered" :key="a.id" class="card">
        <view class="card-head" @click="gotoDetail(a)">
          <image :src="a.productImage" mode="aspectFill" class="img" />
          <view class="info">
            <view class="name-row">
              <text class="name">{{ a.productName }}</text>
              <view
                class="status"
                :style="{ color: STATUS_META[a.status].tint, background: STATUS_META[a.status].tint + '14' }"
              >
                {{ STATUS_META[a.status].label }}
              </view>
            </view>
            <view class="factory">
              <Icon name="home-shop" :size="22" color="var(--text-tertiary)" />
              <text>{{ a.factoryName }}</text>
            </view>
            <view class="price-row">
              <view class="p-item">
                <text class="p-label">出厂价</text>
                <text class="p-value">{{ formatPrice(a.startPrice) }}</text>
              </view>
              <view class="p-divider" />
              <view class="p-item">
                <text class="p-label">我的零售</text>
                <text class="p-value accent">{{ formatPrice(a.retailPrice) }}</text>
              </view>
              <view class="markup">+{{ a.markupPercent }}%</view>
            </view>
            <view class="extra-row">
              <text class="time">申请于 {{ formatDate(a.appliedAt) }}</text>
              <text v-if="a.autoSyncPrice" class="sync-tag">
                <Icon name="refresh" :size="18" color="#52C41A" />
                价格自动同步
              </text>
            </view>
          </view>
        </view>

        <view class="card-actions" @click.stop>
          <template v-if="a.status === 'pending'">
            <view class="btn ghost" @click="cancelApply(a)">取消申请</view>
            <view class="btn primary" @click="adjustMarkup(a)">调整加价</view>
          </template>
          <template v-else-if="a.status === 'approved'">
            <view class="btn ghost" @click="takeOffline(a)">下架</view>
            <view class="btn ghost" @click="adjustMarkup(a)">调整加价</view>
            <view class="btn primary" @click="goEditProduct(a)">编辑商品</view>
          </template>
          <template v-else-if="a.status === 'offline'">
            <view class="btn ghost" @click="cancelApply(a)">删除</view>
            <view class="btn primary" @click="relaunch(a)">重新上架</view>
          </template>
          <template v-else-if="a.status === 'rejected'">
            <view class="btn ghost" @click="cancelApply(a)">删除</view>
            <view class="btn primary" @click="gotoDetail(a)">查看厂家</view>
          </template>
        </view>
      </view>

      <EmptyState
        v-if="filtered.length === 0 && !loading"
        :title="tab === 'all' ? '还没有代理商品' : '当前分类暂无商品'"
        desc="去选品广场申请代理厂家商品"
      >
        <template #default>
          <view class="empty-btn" @click="goPlaza">去选品广场 ›</view>
        </template>
      </EmptyState>
      <view style="height: 40rpx;" />
    </scroll-view>

    <!-- 加价弹窗（% 加价率 / ¥ 固定金额） -->
    <view v-if="markupDialog.open" class="mk-mask" @click="closeMarkupDialog">
      <view class="mk-sheet" @click.stop>
        <view class="mk-head">
          <text class="mk-title">调整加价</text>
          <view class="mk-close" @click="closeMarkupDialog">
            <Icon name="close" :size="32" color="#909399" />
          </view>
        </view>
        <view class="mk-body">
          <view class="mk-target" v-if="markupDialog.target">
            <image :src="markupDialog.target.productImage" mode="aspectFill" class="mk-target-img" />
            <view class="mk-target-info">
              <text class="mk-target-name">{{ markupDialog.target.productName }}</text>
              <text class="mk-target-price">出厂价 ¥{{ markupDialog.target.startPrice }}</text>
            </view>
          </view>

          <view class="mk-label">加价（输入任意正数）</view>
          <view class="mk-input-row">
            <input
              v-model="markupDialog.valueStr"
              type="digit"
              class="mk-input"
              placeholder="输入加价数值"
            />
            <view class="mk-units">
              <view
                class="mk-unit"
                :class="{ active: markupDialog.mode === 'ratio' }"
                @click="markupDialog.mode = 'ratio'"
              >
                % 加价率
              </view>
              <view
                class="mk-unit"
                :class="{ active: markupDialog.mode === 'amount' }"
                @click="markupDialog.mode = 'amount'"
              >
                ¥ 固定金额
              </view>
            </view>
          </view>
          <text class="mk-hint">
            {{
              markupDialog.mode === 'ratio'
                ? '示例：输入 30 → 零售价 = 出厂价 × 1.30'
                : '示例：输入 100 → 零售价 = 出厂价 + ¥100，方便心算'
            }}
          </text>

          <view v-if="markupPreview" class="mk-preview">
            <view class="mk-preview-row">
              <text class="mk-preview-label">出厂价</text>
              <text class="mk-preview-value">¥{{ markupDialog.target?.startPrice }}</text>
            </view>
            <view class="mk-preview-arrow">↓</view>
            <view class="mk-preview-row mk-preview-row--accent">
              <text class="mk-preview-label">新零售价</text>
              <text class="mk-preview-value mk-preview-value--big">¥{{ markupPreview.newRetail }}</text>
            </view>
            <view class="mk-preview-row mk-preview-row--small">
              <text class="mk-preview-label">实际加价率</text>
              <text class="mk-preview-value">+{{ markupPreview.derivedRatio }}%</text>
            </view>
          </view>
        </view>
        <view class="mk-footer">
          <view class="mk-btn mk-btn--ghost" @click="closeMarkupDialog">取消</view>
          <view class="mk-btn mk-btn--primary" @click="confirmMarkup">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.success-banner {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #52C41A, #95E063);
  color: #fff;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(82, 196, 26, 0.25);
  animation: slide-in 0.3s ease-out;
  .sb-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sb-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .sb-title {
      font-size: 26rpx;
      font-weight: 800;
    }
    .sb-desc {
      font-size: 20rpx;
      opacity: 0.95;
      line-height: 1.4;
    }
  }
  .sb-close { padding: 4rpx; flex-shrink: 0; }
}
@keyframes slide-in {
  from { opacity: 0; transform: translateY(-12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.stats {
  margin: 16rpx 24rpx 0;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: var(--shadow-sm);
}
.stat {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .num {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
    font-family: var(--font-family-base);
    &.accent { color: #FAAD14; }
    &.success { color: #52C41A; }
  }
  .label { font-size: 20rpx; color: var(--text-tertiary); }
}
.divider {
  width: 1rpx;
  height: 48rpx;
  background: var(--border-light);
}

.tabs {
  margin-top: 16rpx;
  display: flex;
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}

.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx;
  box-sizing: border-box;
}

.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
}
.card-head {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  min-width: 0;
}
.img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: var(--bg-page);
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.factory {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 8rpx 0;
  border-top: 1rpx dashed var(--border-light);
  border-bottom: 1rpx dashed var(--border-light);
  min-width: 0;
  .p-item {
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    min-width: 0;
    .p-label {
      font-size: 18rpx;
      color: var(--text-tertiary);
    }
    .p-value {
      font-size: 26rpx;
      font-weight: 800;
      color: var(--text-primary);
      font-family: var(--font-family-base);
      &.accent { color: var(--brand-primary); }
    }
  }
  .p-divider {
    width: 1rpx;
    height: 32rpx;
    background: var(--border-light);
  }
  .markup {
    margin-left: auto;
    padding: 4rpx 12rpx;
    background: rgba(82, 196, 26, 0.1);
    color: #52C41A;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 800;
    font-family: var(--font-family-base);
  }
}
.extra-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  .time {
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
  .sync-tag {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    font-size: 18rpx;
    color: #52C41A;
    font-weight: 600;
  }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 12rpx;
}
.btn {
  flex-shrink: 0;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
}

.empty-btn {
  margin-top: 16rpx;
  padding: 16rpx 48rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  display: inline-block;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
}

/* ============ 加价弹窗 ============ */
.mk-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  animation: mk-fade-in 0.18s ease-out;
}

@keyframes mk-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mk-sheet {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  animation: mk-slide-up 0.24s ease-out;
}

@keyframes mk-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.mk-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.mk-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #303133;
}

.mk-close {
  padding: 8rpx;
}

.mk-body {
  padding: 24rpx 32rpx 16rpx;
  flex: 1;
  overflow-y: auto;
}

.mk-target {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: #fafbfc;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.mk-target-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.mk-target-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.mk-target-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mk-target-price {
  font-size: 24rpx;
  color: #909399;
}

.mk-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12rpx;
}

.mk-input-row {
  display: flex;
  gap: 0;
  align-items: stretch;
  border: 2rpx solid #e5e7eb;
  border-radius: 14rpx;
  overflow: hidden;
  background: #fff;
}

.mk-input {
  flex: 1;
  padding: 22rpx 20rpx;
  font-size: 32rpx;
  color: #303133;
  border: none;
  outline: none;
  background: transparent;
}

.mk-units {
  display: flex;
  flex-shrink: 0;
  background: #f5f6f8;
  border-left: 2rpx solid #e5e7eb;
}

.mk-unit {
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #606266;
  border-left: 1rpx solid #ebeef5;

  &:first-child {
    border-left: none;
  }

  &.active {
    background: linear-gradient(135deg, #ff4d2d, #ff7a45);
    color: #fff;
    font-weight: 600;
  }
}

.mk-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #909399;
  line-height: 1.5;
}

.mk-preview {
  margin-top: 24rpx;
  padding: 20rpx;
  background: #fafbfc;
  border: 1rpx dashed #ebeef5;
  border-radius: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.mk-preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  &--accent {
    padding: 8rpx 0;
    border-top: 1rpx dashed #e5e7eb;
    border-bottom: 1rpx dashed #e5e7eb;
  }

  &--small {
    .mk-preview-label,
    .mk-preview-value {
      font-size: 22rpx;
    }
  }
}

.mk-preview-label {
  font-size: 26rpx;
  color: #606266;
}

.mk-preview-value {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;

  &--big {
    font-size: 38rpx;
    color: #ff4d2d;
    font-weight: 700;
  }
}

.mk-preview-arrow {
  text-align: center;
  color: #c0c4cc;
  font-size: 28rpx;
  line-height: 1;
}

.mk-footer {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx 32rpx;
  border-top: 1rpx solid #f0f2f5;
}

.mk-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 600;

  &--ghost {
    background: #f5f6f8;
    color: #606266;
  }

  &--primary {
    background: linear-gradient(135deg, #ff4d2d, #ff7a45);
    color: #fff;
    box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.35);
  }

  &:active {
    transform: scale(0.97);
  }
}
</style>
