<script setup lang="ts">
/**
 * PA · 订单分享数据
 *
 * 原本入口为「复制 admin-pc URL + 引导用户去 PC 端」,本页改为原生承接。
 *
 * 后端：
 *   GET /api/v1/p/order-shares       → 分页列表（orderShareService.list）
 *   GET /api/v1/p/order-shares/stats → KPI / 7 日趋势 / TopN（orderShareService.stats）
 *
 * 来源底层为 SystemConfig (key 'order_share:*'),数据较稀疏,
 * 单页 20 条 + Top10 商家足以覆盖现阶段全部使用场景。
 */
import { ref, computed, onMounted } from 'vue'
import { orderShareService, type OrderShareRow, type OrderShareStats } from '../../services'
import type { Pagination } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

const FIELD_LABELS: Record<string, string> = {
  basics: '订单基础',
  customer: '客户信息',
  pricing: '价格明细',
  items: '商品清单',
  extra: '附加信息',
}

const stats = ref<OrderShareStats | null>(null)
const list = ref<OrderShareRow[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loadingStats = ref(true)
const loadingList = ref(true)
const loadingMore = ref(false)
const errorMsg = ref('')

const KPI_CARDS = computed(() => {
  const s = stats.value
  return [
    {
      key: 'total',
      label: '总分享数',
      value: s ? s.totalShares : 0,
      icon: 'share',
      tint: '#FF4D2D',
      tintSoft: 'rgba(255, 77, 45, 0.10)',
    },
    {
      key: 'views',
      label: '总浏览数',
      value: s ? s.totalViews : 0,
      icon: 'eye',
      tint: '#1296DB',
      tintSoft: 'rgba(18, 150, 219, 0.10)',
    },
    {
      key: 'active',
      label: '活跃分享',
      value: s ? s.active : 0,
      icon: 'check-circle',
      tint: '#52C41A',
      tintSoft: 'rgba(82, 196, 26, 0.10)',
    },
    {
      key: 'inactive',
      label: '撤销 + 过期',
      value: s ? s.revoked + s.expired : 0,
      icon: 'close-circle',
      tint: '#86909C',
      tintSoft: 'rgba(134, 144, 156, 0.10)',
    },
  ]
})

const trend = computed(() => {
  const data = stats.value?.trend ?? []
  if (data.length < 2) return null
  const totalCount = data.reduce((s, d) => s + d.count, 0)
  if (totalCount <= 0) return null

  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 100 / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * w
    const y = 28 - (d.count / max) * 22
    return { x: +x.toFixed(2), y: +y.toFixed(2), v: d.count, date: d.date }
  })
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},32 ${line} ${points[points.length - 1].x},32`
  return { total: totalCount, line, area, points }
})

function shareStatusOf(row: OrderShareRow): { label: string; tint: string; bg: string } {
  if (row.revoked) return { label: '已撤销', tint: '#86909C', bg: 'rgba(134, 144, 156, 0.12)' }
  if (row.expired) return { label: '已过期', tint: '#FAAD14', bg: 'rgba(250, 173, 20, 0.12)' }
  return { label: '活跃中', tint: '#52C41A', bg: 'rgba(82, 196, 26, 0.12)' }
}

function expiresLabel(iso: string | null): string {
  if (!iso) return '永久'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function createdLabel(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const d = new Date(t)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadStats() {
  loadingStats.value = true
  try {
    stats.value = await orderShareService.stats()
  } catch (e: any) {
    errorMsg.value = e?.message || '统计加载失败'
  } finally {
    loadingStats.value = false
  }
}

async function loadList(reset = true) {
  if (reset) {
    page.value = 1
    list.value = []
    loadingList.value = true
  } else {
    loadingMore.value = true
  }
  try {
    const res = (await orderShareService.list({
      page: page.value,
      pageSize,
    })) as Pagination<OrderShareRow>
    const rows = res?.list ?? []
    total.value = res?.total ?? rows.length
    list.value = reset ? rows : [...list.value, ...rows]
  } catch (e: any) {
    if (reset) errorMsg.value = e?.message || '列表加载失败'
  } finally {
    loadingList.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || list.value.length >= total.value) return
  page.value += 1
  loadList(false)
}

function onCopyShareUrl(row: OrderShareRow) {
  if (!row.shareUrl) {
    uni.showToast({ title: '链接不存在', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: row.shareUrl,
    success: () => uni.showToast({ title: '分享链接已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

function onClickRow(row: OrderShareRow) {
  const visible = (row.visibleFields || []).map((f) => FIELD_LABELS[f] || f).join('、') || '—'
  uni.showActionSheet({
    itemList: ['复制分享链接', '查看链接全文'],
    success: (r) => {
      if (r.tapIndex === 0) onCopyShareUrl(row)
      else if (r.tapIndex === 1) {
        uni.showModal({
          title: row.orderNo || row.orderId,
          content: `商家：${row.merchantName}\n可见字段：${visible}\n浏览次数：${row.viewCount}\n过期：${expiresLabel(row.expiresAt)}\n链接：${row.shareUrl}`,
          showCancel: false,
          confirmText: '关闭',
        })
      }
    },
  })
}

async function refresh() {
  errorMsg.value = ''
  await Promise.all([loadStats(), loadList(true)])
}

onMounted(refresh)
</script>

<template>
  <view class="page">
    <NavBar title="订单分享数据" rightIcon="refresh" @right="refresh" />

    <scroll-view scroll-y class="scroll" @scrolltolower="loadMore">
      <!-- KPI 4 卡 -->
      <view class="kpi-grid">
        <view
          v-for="c in KPI_CARDS"
          :key="c.key"
          class="kpi-card"
          :style="{ background: c.tintSoft }"
        >
          <view class="kpi-icon" :style="{ background: c.tint }">
            <Icon :name="c.icon" :size="28" color="#fff" />
          </view>
          <text class="kpi-label">{{ c.label }}</text>
          <text class="kpi-value" :style="{ color: c.tint }">{{ c.value }}</text>
        </view>
      </view>

      <!-- 7 日趋势 -->
      <view v-if="trend" class="trend-card">
        <view class="trend-head">
          <text class="trend-title">近 7 日新建分享</text>
          <text class="trend-meta">合计 {{ trend.total }} 个</text>
        </view>
        <view class="mini-line-wrap">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" class="mini-svg">
            <defs>
              <linearGradient id="ss-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FF4D2D" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#FF4D2D" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="ss-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#FF7A45" />
                <stop offset="100%" stop-color="#FF4D2D" />
              </linearGradient>
            </defs>
            <polygon :points="trend.area" fill="url(#ss-g)" />
            <polyline
              :points="trend.line"
              fill="none"
              stroke="url(#ss-line)"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in trend.points"
              :key="i"
              :cx="p.x"
              :cy="p.y"
              r="0.85"
              fill="#FF4D2D"
            />
          </svg>
        </view>
        <view class="trend-x">
          <text v-for="(p, i) in trend.points" :key="i">{{ p.date }}</text>
        </view>
      </view>

      <!-- Top 商家 -->
      <view v-if="stats && stats.topMerchants && stats.topMerchants.length" class="top-card">
        <view class="block-head">
          <Icon name="crown" :size="28" color="#FAAD14" />
          <text class="block-title">分享 Top 商家</text>
          <text class="block-meta">TOP {{ stats.topMerchants.length }}</text>
        </view>
        <view class="top-list">
          <view v-for="(m, i) in stats.topMerchants" :key="m.merchantId" class="top-row">
            <view :class="['rank', i < 3 ? 'gold' : '']">{{ i + 1 }}</view>
            <text class="top-name">{{ m.name }}</text>
            <view class="top-nums">
              <text class="num-share">{{ m.shareCount }} 次分享</text>
              <text class="num-view">{{ m.viewCount }} 浏览</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 列表 -->
      <view class="list-card">
        <view class="block-head">
          <Icon name="share" :size="28" color="var(--brand-primary)" />
          <text class="block-title">分享明细</text>
          <text class="block-meta">{{ total }} 条</text>
        </view>

        <view v-if="loadingList" class="loading">
          <text>加载中…</text>
        </view>

        <view v-else-if="errorMsg" class="err-block">
          <Icon name="info" :size="56" color="#FF7A45" />
          <text class="err-title">加载失败</text>
          <text class="err-msg">{{ errorMsg }}</text>
          <view class="err-btn" @click="refresh">点击重试</view>
        </view>

        <view v-else-if="list.length === 0" class="empty-wrap">
          <EmptyState
            icon="share"
            title="暂无分享记录"
            desc="商家通过 merchant-app 发起订单分享后,数据将出现在这里"
          />
        </view>

        <view v-else class="rows">
          <view v-for="row in list" :key="row.shareCode" class="row" @click="onClickRow(row)">
            <view class="r-top">
              <text class="r-no">{{ row.orderNo || row.orderId }}</text>
              <view
                class="r-status"
                :style="{ background: shareStatusOf(row).bg, color: shareStatusOf(row).tint }"
              >
                {{ shareStatusOf(row).label }}
              </view>
            </view>
            <view class="r-merchant">
              <Icon name="home-shop" :size="22" color="var(--text-tertiary)" />
              <text>{{ row.merchantName }}</text>
            </view>
            <view v-if="row.visibleFields && row.visibleFields.length" class="r-tags">
              <view v-for="f in row.visibleFields" :key="f" class="tag">
                {{ FIELD_LABELS[f] || f }}
              </view>
            </view>
            <view class="r-foot">
              <view class="r-foot-item">
                <Icon name="eye" :size="20" color="var(--text-tertiary)" />
                <text>{{ row.viewCount }} 浏览</text>
              </view>
              <view class="r-foot-item">
                <Icon name="clock" :size="20" color="var(--text-tertiary)" />
                <text>过期 {{ expiresLabel(row.expiresAt) }}</text>
              </view>
              <view class="r-foot-item">
                <Icon name="calendar" :size="20" color="var(--text-tertiary)" />
                <text>{{ createdLabel(row.createdAt) }}</text>
              </view>
            </view>
            <view class="r-actions" @click.stop="onCopyShareUrl(row)">
              <Icon name="share" :size="22" color="var(--brand-primary)" />
              <text>复制分享链接</text>
            </view>
          </view>

          <view v-if="loadingMore" class="loading-more">加载更多…</view>
          <view v-else-if="list.length >= total" class="end-tip">
            — 已显示全部 {{ total }} 条 —
          </view>
        </view>
      </view>

      <view style="height: 48rpx" />
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
  padding: 16rpx 24rpx 32rpx;
  box-sizing: border-box;
}

/* === KPI 4 卡 === */
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.kpi-card {
  position: relative;
  padding: 24rpx 24rpx 20rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  box-shadow: 0 4rpx 14rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid rgba(15, 23, 42, 0.02);
  &:active {
    transform: scale(0.98);
  }
}
.kpi-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}
.kpi-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 4rpx;
}
.kpi-value {
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1.1;
  font-family: var(--font-family-base);
  letter-spacing: 0.5rpx;
}

/* === 趋势卡 === */
.trend-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
}
.trend-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12rpx;
  .trend-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .trend-meta {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 700;
    font-family: var(--font-family-base);
  }
}
.mini-line-wrap {
  height: 80rpx;
  width: 100%;
  filter: drop-shadow(0 4rpx 8rpx rgba(255, 77, 45, 0.15));
}
.mini-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.trend-x {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
  font-size: 18rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
}

/* === 通用块头 === */
.block-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 0 16rpx;
  .block-title {
    flex: 1;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .block-meta {
    font-size: 22rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}

/* === Top 商家 === */
.top-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx 4rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
}
.top-list {
  display: flex;
  flex-direction: column;
}
.top-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  &:not(:last-child) {
    border-bottom: 1rpx solid var(--border-light);
  }
  .rank {
    flex-shrink: 0;
    width: 44rpx;
    height: 44rpx;
    border-radius: 12rpx;
    background: var(--bg-page);
    color: var(--text-tertiary);
    font-size: 24rpx;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-family-base);
    &.gold {
      background: linear-gradient(135deg, #faad14, #f59e0b);
      color: #fff;
      box-shadow: 0 4rpx 12rpx rgba(245, 158, 11, 0.32);
    }
  }
  .top-name {
    flex: 1;
    font-size: 26rpx;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .top-nums {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    .num-share {
      font-size: 24rpx;
      font-weight: 700;
      color: var(--brand-primary);
      font-family: var(--font-family-base);
    }
    .num-view {
      font-size: 20rpx;
      color: var(--text-tertiary);
      font-family: var(--font-family-base);
    }
  }
}

/* === 分享明细列表 === */
.list-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  box-shadow: var(--shadow-sm);
}
.loading,
.loading-more,
.end-tip {
  padding: 32rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.err-block {
  padding: 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  .err-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .err-msg {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .err-btn {
    margin-top: 12rpx;
    padding: 12rpx 40rpx;
    border-radius: 999rpx;
    background: var(--brand-gradient);
    color: #fff;
    font-size: 24rpx;
    font-weight: 700;
  }
}
.empty-wrap {
  padding: 32rpx 0;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.row {
  background: var(--bg-page);
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  &:active {
    background: #f0f1f3;
  }
}
.r-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .r-no {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-family-base);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
  }
  .r-status {
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.r-merchant {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  font-weight: 500;
}
.r-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  .tag {
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
    background: rgba(18, 150, 219, 0.1);
    color: #1296db;
    font-size: 20rpx;
    font-weight: 600;
  }
}
.r-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-top: 4rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 12rpx;
  .r-foot-item {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 20rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}
.r-actions {
  margin-top: 4rpx;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 77, 45, 0.08);
  font-size: 22rpx;
  color: var(--brand-primary);
  font-weight: 600;
}
</style>
