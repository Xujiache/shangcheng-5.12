<script setup lang="ts">
/**
 * PA-04 · 商品审核
 * 还原 原型图/platform-app.jsx::PA_ProductAudit
 * - 顶部「自动通过 · 免审核」总开关
 * - 免审条件清单（4 条）
 * - 抽检比例
 * - Tab（待审 / 自动通过 / 已驳回）
 * - 商品卡：图 + 名 + 商户 + 类目 + 价 + 提交时间 + 操作
 */
import { ref, computed, onMounted, watch } from 'vue'
import { productAuditService } from '../../services'
import type { ProductAuditConfig } from '../../services'
import { formatDate, formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'pending' | 'auto_approved' | 'rejected'

interface AuditProduct {
  id: string
  productId: string
  name: string
  image: string
  category: string
  merchant: string
  price: number
  submittedAt: string
  status: 'pending' | 'auto_approved' | 'rejected'
}

const tab = ref<TabKey>('pending')
const list = ref<AuditProduct[]>([])
const loading = ref(false)
const config = ref<ProductAuditConfig | null>(null)
const showConfigDetail = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待审核' },
  { key: 'auto_approved', label: '自动通过' },
  { key: 'rejected', label: '已驳回' },
]

// 当前 tab 下 list 都是同状态,所以 counts.<currentTab> = list.length,
// 其他 tab 没有数据时显示空。后端不会一次返回三个 status 的 count,
// 想要全量徽章数需要单独再发 3 次请求,这里只显示当前 tab 的数字。
const counts = computed(() => ({
  pending: tab.value === 'pending' ? list.value.length : 0,
  auto_approved: tab.value === 'auto_approved' ? list.value.length : 0,
  rejected: tab.value === 'rejected' ? list.value.length : 0,
}))

// loadList 已按 status 拉取,这里直接返回整份列表。
const filtered = computed(() => list.value)

async function loadConfig() {
  try {
    config.value = await productAuditService.config()
  } catch (e) {
    console.error(e)
  }
}

/**
 * 拉取审核列表
 * - status 默认走当前 tab,可在切 tab 时由 watcher 传入对应值
 * - 后端 `/p/audit/products?status=pending` 会内部映射为 `status: 'auditing'`,
 *   其它 status 透传给 prisma 查 product 表
 */
async function loadList(status: TabKey = tab.value) {
  loading.value = true
  try {
    const res = await productAuditService.list({ status, pageSize: 50 })
    list.value = res.list as unknown as AuditProduct[]
  } finally {
    loading.value = false
  }
}

watch(tab, (next) => loadList(next))

async function toggleAutoApprove() {
  if (!config.value) return
  config.value.autoApprove = !config.value.autoApprove
  await productAuditService.saveConfig({ autoApprove: config.value.autoApprove })
  uni.showToast({ title: config.value.autoApprove ? '已开启自动通过' : '已关闭自动通过', icon: 'success' })
}

async function toggleCondition(key: string) {
  if (!config.value) return
  const c = config.value.conditions.find((x) => x.key === key)
  if (!c) return
  c.enabled = !c.enabled
  await productAuditService.saveConfig({ conditions: config.value.conditions })
}

function changeSamplingRate() {
  if (!config.value) return
  uni.showActionSheet({
    itemList: ['5% 随机抽检', '10% 随机抽检', '20% 随机抽检', '30% 随机抽检', '50% 随机抽检'],
    success: async (r) => {
      const rate = [5, 10, 20, 30, 50][r.tapIndex]
      config.value!.samplingRate = rate
      await productAuditService.saveConfig({ samplingRate: rate })
      uni.showToast({ title: `抽检比例已设置为 ${rate}%`, icon: 'success' })
    },
  })
}

function approve(p: AuditProduct) {
  uni.showModal({
    title: '通过审核',
    content: `通过「${p.name}」？通过后立即上架。`,
    success: async (r) => {
      if (r.confirm) {
        await productAuditService.approve(p.id)
        list.value = list.value.filter((x) => x.id !== p.id)
        uni.showToast({ title: '已通过', icon: 'success' })
      }
    },
  })
}

function reject(p: AuditProduct) {
  uni.showActionSheet({
    itemList: ['图片不清晰', '商品描述违规', '价格异常', '类目不符', '其他原因'],
    success: async (r) => {
      const reason = ['图片不清晰', '商品描述违规', '价格异常', '类目不符', '其他原因'][r.tapIndex]
      await productAuditService.reject(p.id, reason)
      p.status = 'rejected'
      uni.showToast({ title: '已驳回', icon: 'success' })
    },
  })
}

function spotCheck(p: AuditProduct) {
  uni.showModal({
    title: '抽检',
    content: `对「${p.name}」进行抽检审查，若发现问题可手动下架。`,
    success: (r) => {
      if (r.confirm) uni.showToast({ title: '已加入抽检队列', icon: 'success' })
    },
  })
}

function viewDetail(p: AuditProduct) {
  uni.showModal({
    title: p.name,
    content: `商户: ${p.merchant}\n类目: ${p.category}\n价格: ¥${formatPrice(p.price)}\n提交时间: ${formatDate(p.submittedAt)}`,
    showCancel: false,
  })
}

onMounted(() => {
  loadConfig()
  loadList()
})
</script>

<template>
  <view class="page">
    <NavBar title="商品审核" right-icon="gear" @right="showConfigDetail = !showConfigDetail" />

    <scroll-view scroll-y class="scroll">
      <!-- 自动通过开关 -->
      <view v-if="config" class="auto-card">
        <view class="auto-head">
          <view class="auto-title">
            <view class="auto-emoji">
              <Icon name="lightning" :size="36" color="#FF4D2D" />
            </view>
            <view class="auto-text">
              <text class="t1">自动通过 · 免审核</text>
              <text class="t2">满足条件的商品提交后无需人工审核，直接上架</text>
            </view>
          </view>
          <view :class="['toggle', config.autoApprove ? 'on' : '']" @click="toggleAutoApprove">
            <view class="thumb" />
            <text class="text">{{ config.autoApprove ? '已开启' : '关闭' }}</text>
          </view>
        </view>
      </view>

      <!-- 免审条件 -->
      <view v-if="config" class="cond-card">
        <view class="cond-head">
          <text class="title">免审条件（满足任一即可）</text>
          <text class="sub">{{ config.conditions.filter(c => c.enabled).length }} / {{ config.conditions.length }}</text>
        </view>
        <view class="cond-list">
          <view
            v-for="c in config.conditions"
            :key="c.key"
            class="cond-row"
            @click="toggleCondition(c.key)"
          >
            <view class="cond-check">
              <Icon
                v-if="c.enabled"
                name="check-circle"
                :size="36"
                color="var(--brand-primary)"
              />
              <Icon v-else name="circle" :size="36" color="var(--text-tertiary)" />
            </view>
            <text class="cond-label">{{ c.label }}</text>
            <view :class="['cond-state', c.enabled ? 'on' : 'off']">
              {{ c.enabled ? '已启用' : '未启用' }}
            </view>
          </view>
        </view>
        <view class="sampling" @click="changeSamplingRate">
          <text class="s-label">抽检比例</text>
          <view class="s-value">
            <text>{{ config.samplingRate }}% 随机抽检</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
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
          <text class="tab-label">{{ t.label }}</text>
          <text class="tab-count">{{ counts[t.key] }}</text>
          <view v-if="tab === t.key" class="indicator" />
        </view>
      </view>

      <!-- 商品卡 -->
      <view class="list">
        <view
          v-for="p in filtered"
          :key="p.id"
          class="card"
        >
          <view class="card-row">
            <image :src="p.image" mode="aspectFill" class="img" />
            <view class="info">
              <view class="info-head">
                <text class="name">{{ p.name }}</text>
                <view :class="['status-tag', p.status]">
                  {{ p.status === 'pending' ? '待审' : p.status === 'auto_approved' ? '自动通过' : '已驳回' }}
                </view>
              </view>
              <text class="meta">{{ p.merchant }} · {{ p.category }}</text>
              <view class="price-row">
                <text class="price">{{ formatPrice(p.price) }}</text>
                <text class="time">提交 {{ formatDate(p.submittedAt) }}</text>
              </view>
            </view>
          </view>
          <view class="actions">
            <view class="btn ghost" @click="viewDetail(p)">详情</view>
            <template v-if="p.status === 'auto_approved'">
              <view class="btn ghost" @click="spotCheck(p)">抽检</view>
            </template>
            <template v-else-if="p.status === 'pending'">
              <view class="btn ghost" @click="reject(p)">驳回</view>
              <view class="btn primary" @click="approve(p)">通过</view>
            </template>
          </view>
        </view>

        <EmptyState
          v-if="!loading && filtered.length === 0"
          :title="`暂无${TABS.find(t => t.key === tab)?.label}商品`"
          desc="开启自动通过可减少人工审核工作量"
          icon="package"
        />
      </view>

      <view style="height: 40rpx;" />
    </scroll-view>
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
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}

/* 自动通过开关卡 */
.auto-card {
  margin: 16rpx 24rpx 0;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, rgba(255,77,45,0.08), rgba(255,156,110,0.04));
  border: 1rpx solid rgba(255,77,45,0.2);
  border-radius: 20rpx;
}
.auto-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.auto-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.auto-emoji {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(255,77,45,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.auto-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .t1 { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
  .t2 { font-size: 20rpx; color: var(--text-tertiary); }
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx;
  background: var(--bg-card);
  border-radius: 999rpx;
  border: 1rpx solid var(--border-default);
  position: relative;
  flex-shrink: 0;
  .thumb {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: all .2s;
  }
  .text {
    padding-right: 12rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
    font-weight: 600;
  }
  &.on {
    border-color: var(--brand-primary);
    background: rgba(255,77,45,0.08);
    .thumb { background: var(--brand-primary); }
    .text { color: var(--brand-primary); }
  }
}

/* 免审条件 */
.cond-card {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  border: 1rpx dashed var(--border-default);
  box-shadow: var(--shadow-sm);
}
.cond-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .title { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
  .sub {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
    font-family: var(--font-family-base);
  }
}
.cond-list {
  display: flex;
  flex-direction: column;
}
.cond-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .cond-check { padding: 4rpx; flex-shrink: 0; }
  .cond-label {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .cond-state {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
    &.on { background: rgba(82,196,26,0.1); color: #52C41A; }
    &.off { background: var(--bg-page); color: var(--text-tertiary); }
  }
}
.sampling {
  margin-top: 16rpx;
  padding: 16rpx 0 0;
  border-top: 1rpx dashed var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  .s-label { font-size: 24rpx; color: var(--text-tertiary); }
  .s-value {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
}

/* Tab */
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
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .tab-label { font-size: 26rpx; }
  .tab-count {
    font-size: 18rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}

/* 商品列表 */
.list {
  padding: 16rpx 24rpx;
}
.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
}
.card-row {
  display: flex;
  gap: 16rpx;
  min-width: 0;
}
.img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: var(--bg-page);
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.info-head {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .status-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
    &.pending { background: rgba(255,77,45,0.12); color: var(--brand-primary); }
    &.auto_approved { background: rgba(82,196,26,0.12); color: #52C41A; }
    &.rejected { background: rgba(0,0,0,0.06); color: var(--text-tertiary); }
  }
}
.meta {
  font-size: 22rpx;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 4rpx;
  .price {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
  .time { font-size: 20rpx; color: var(--text-tertiary); }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 16rpx;
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
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
</style>
