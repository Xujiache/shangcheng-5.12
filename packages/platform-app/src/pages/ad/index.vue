<script setup lang="ts">
/**
 * PA-05 · 广告管理
 * 还原 原型图/platform-app.jsx::PA_Ad
 * - Tab：广告位 / 创建 / 数据
 * - 广告位卡：名称 + 状态 + 目标 + 曝光/点击 + 预览图 + 操作
 */
import { ref, computed, onMounted } from 'vue'
import { adService } from '../../services'
import type { AdSlot } from '../../services'
import { formatWan } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'slots' | 'create' | 'stats'

const tab = ref<TabKey>('slots')
const slots = ref<AdSlot[]>([])
const creatives = ref<any[]>([])
const loading = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'slots', label: '广告位' },
  { key: 'create', label: '创意' },
  { key: 'stats', label: '数据' },
]

const STATUS_META: Record<string, { label: string; tint: string }> = {
  active: { label: '进行中', tint: '#52C41A' },
  paused: { label: '已暂停', tint: '#FAAD14' },
  ended: { label: '已结束', tint: '#86909C' },
  draft: { label: '草稿', tint: '#1296DB' },
}

async function load() {
  loading.value = true
  try {
    const [slotList, creativeList] = await Promise.all([
      adService.slots(),
      adService.creatives({ pageSize: 30 }),
    ])
    slots.value = slotList
    creatives.value = (creativeList as any).list ?? []
  } finally {
    loading.value = false
  }
}

function createAd() {
  uni.showActionSheet({
    itemList: ['目标：客户（小程序）', '目标：厂家+门店（商家 APP）', '目标：仅门店', '目标：会员'],
    success: (r) => {
      uni.showToast({
        title: '创建：' + ['客户广告', '商家广告', '门店广告', '会员广告'][r.tapIndex],
        icon: 'none',
      })
    },
  })
}

function viewStats(s: AdSlot) {
  uni.showModal({
    title: s.name + ' · 数据',
    content: `曝光 ${formatWan(s.impressions)}\n点击 ${formatWan(s.impressions * (s.ctr / 100))}\n点击率 ${s.ctr}%\n创意数 ${s.creativeCount}`,
    showCancel: false,
  })
}

function editSlot(s: AdSlot) {
  uni.showActionSheet({
    itemList: ['上传新创意', '修改投放目标', '修改时段', s.status === 'paused' ? '恢复投放' : '暂停投放'],
    success: (r) => {
      uni.showToast({ title: ['上传创意', '改目标', '改时段', '暂停/恢复'][r.tapIndex], icon: 'none' })
    },
  })
}

const totalStats = computed(() => ({
  totalImpressions: slots.value.reduce((s, x) => s + x.impressions, 0),
  totalCreatives: slots.value.reduce((s, x) => s + x.creativeCount, 0),
  activeSlots: slots.value.filter((x) => x.status === 'active').length,
  avgCtr: slots.value.length > 0
    ? (slots.value.reduce((s, x) => s + x.ctr, 0) / slots.value.length).toFixed(1)
    : '0',
}))

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="广告管理" right-icon="plus" @right="createAd" />

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

    <scroll-view scroll-y class="scroll">
      <!-- 顶部统计 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.activeSlots }}</text>
          <text class="stat-label">投放中</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.totalCreatives }}</text>
          <text class="stat-label">创意数</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ formatWan(totalStats.totalImpressions) }}</text>
          <text class="stat-label">总曝光</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.avgCtr }}%</text>
          <text class="stat-label">平均 CTR</text>
        </view>
      </view>

      <!-- Tab 内容 -->
      <view v-if="tab === 'slots'" class="list">
        <view v-for="s in slots" :key="s.id" class="card">
          <view class="card-head">
            <text class="name">{{ s.name }}</text>
            <view
              class="status-tag"
              :style="{ color: STATUS_META[s.status]?.tint, background: (STATUS_META[s.status]?.tint || '#86909C') + '14' }"
            >
              {{ STATUS_META[s.status]?.label || s.status }}
            </view>
          </view>
          <view class="meta">
            <Icon name="navigation" :size="22" color="var(--text-tertiary)" />
            <text>{{ s.scene }} · 目标 {{ s.target }}</text>
          </view>

          <!-- 预览图占位 -->
          <view class="preview">
            <view class="preview-bg">
              <Icon name="megaphone" :size="56" color="rgba(255,77,45,0.3)" />
              <text class="preview-text">广告位预览 · {{ s.name }}</text>
            </view>
          </view>

          <view class="metrics">
            <view class="metric">
              <text class="m-label">曝光</text>
              <text class="m-value">{{ formatWan(s.impressions) }}</text>
            </view>
            <view class="metric">
              <text class="m-label">点击率</text>
              <text class="m-value">{{ s.ctr }}%</text>
            </view>
            <view class="metric">
              <text class="m-label">创意</text>
              <text class="m-value">{{ s.creativeCount }}</text>
            </view>
          </view>

          <view class="actions">
            <view class="btn ghost" @click="viewStats(s)">数据</view>
            <view class="btn primary" @click="editSlot(s)">编辑</view>
          </view>
        </view>

        <view class="bottom-btn" @click="createAd">
          <Icon name="plus" :size="32" color="#fff" />
          <text>创建广告位（目标：厂家 / 门店 / 客户）</text>
        </view>
      </view>

      <view v-else-if="tab === 'create'" class="list">
        <view v-for="c in creatives" :key="c.id" class="creative-card">
          <image :src="c.image" mode="aspectFill" class="creative-img" />
          <view class="creative-info">
            <text class="c-title">{{ c.title }}</text>
            <text class="c-meta">点击 {{ c.clicks }} · 曝光 {{ formatWan(c.impressions) }}</text>
            <view class="c-status" :style="{ color: STATUS_META[c.status]?.tint }">
              {{ STATUS_META[c.status]?.label }}
            </view>
          </view>
        </view>
        <EmptyState v-if="!loading && creatives.length === 0" title="暂无创意" desc="点击右上角创建" icon="image-plus" />
      </view>

      <view v-else class="list">
        <view class="big-stat-card">
          <text class="bs-title">本月广告数据</text>
          <view class="bs-grid">
            <view class="bs-item">
              <text class="bs-num">{{ formatWan(totalStats.totalImpressions) }}</text>
              <text class="bs-label">总曝光</text>
            </view>
            <view class="bs-item">
              <text class="bs-num">{{ totalStats.avgCtr }}%</text>
              <text class="bs-label">平均 CTR</text>
            </view>
          </view>
        </view>
        <view class="card">
          <text class="rank-title">各广告位曝光排行</text>
          <view v-for="(s, i) in [...slots].sort((a, b) => b.impressions - a.impressions)" :key="s.id" class="rank-row">
            <view :class="['rank-num', i < 3 ? `rank-${i + 1}` : '']">{{ i + 1 }}</view>
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-val">{{ formatWan(s.impressions) }}</text>
          </view>
        </view>
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
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  text-align: center;
  font-size: 26rpx;
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
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}
.stats-card {
  margin: 16rpx 24rpx 0;
  padding: 20rpx 16rpx;
  background: linear-gradient(135deg, #FF4D2D, #FF9C6E);
  color: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.2);
  .stat-item {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .stat-num {
      font-size: 32rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .stat-label {
      font-size: 20rpx;
      opacity: 0.9;
    }
  }
  .stat-divider {
    width: 1rpx;
    height: 48rpx;
    background: rgba(255,255,255,0.3);
  }
}
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
  gap: 12rpx;
  min-width: 0;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.meta {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.preview {
  width: 100%;
  height: 200rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255,77,45,0.08), rgba(255,156,110,0.04));
}
.preview-bg {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .preview-text {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.metrics {
  display: flex;
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 12rpx 0;
}
.metric {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  .m-label { font-size: 20rpx; color: var(--text-tertiary); }
  .m-value {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
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
.bottom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin: 16rpx 0 0;
  padding: 24rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
}

/* 创意卡 */
.creative-card {
  display: flex;
  gap: 16rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  align-items: center;
}
.creative-img {
  width: 160rpx;
  height: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: var(--bg-page);
}
.creative-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .c-title {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .c-meta {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .c-status {
    font-size: 20rpx;
    font-weight: 700;
  }
}

/* 数据 tab */
.big-stat-card {
  margin-bottom: 16rpx;
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #FF4D2D, #FAAD14);
  color: #fff;
  border-radius: 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
  .bs-title {
    font-size: 24rpx;
    opacity: 0.9;
    margin-bottom: 12rpx;
    display: block;
  }
  .bs-grid {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 64rpx;
  }
  .bs-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    .bs-num {
      font-size: 56rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .bs-label { font-size: 22rpx; opacity: 0.85; }
  }
}
.rank-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12rpx;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .rank-num {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-page);
    color: var(--text-tertiary);
    font-weight: 800;
    font-size: 24rpx;
    flex-shrink: 0;
    font-family: var(--font-family-base);
    &.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
    &.rank-2 { background: linear-gradient(135deg, #C0C0C0, #888); color: #fff; }
    &.rank-3 { background: linear-gradient(135deg, #CD7F32, #8B4513); color: #fff; }
  }
  .rank-name {
    flex: 1;
    min-width: 0;
    font-size: 26rpx;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rank-val {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    flex-shrink: 0;
  }
}
</style>
