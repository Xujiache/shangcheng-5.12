<script setup lang="ts">
/**
 * PA-02 · 商户入驻审核
 * 还原 原型图/platform-app.jsx::PA_Audit
 */
import { ref, computed, onMounted, watch } from 'vue'
import { merchantService } from '../../services'
import type { Merchant, MerchantType } from '@jiujiu/shared/types'
import { formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'pending' | 'active' | 'rejected'

const tab = ref<TabKey>('pending')
const list = ref<Merchant[]>([])
const loading = ref(false)
const counts = ref<Record<TabKey, number>>({ pending: 0, active: 0, rejected: 0 })

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待审核' },
  { key: 'active', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
]

const TYPE_META: Record<MerchantType, { label: string; tint: string }> = {
  factory: { label: '厂家', tint: '#FF4D2D' },
  store: { label: '门店', tint: '#FAAD14' },
}

const filtered = computed(() => list.value)

/**
 * 待审核 tab 走专用 audit 队列接口 /p/audit/merchants（只返 status=pending，
 * 受后端 service.auditMerchants 强制约束）；已通过 / 已驳回则走通用 /p/merchants
 * 并加 status 过滤。tab 切换时重新拉数据，counts 用各 tab 返回的 pagination.total。
 */
async function load() {
  loading.value = true
  try {
    const params = { status: tab.value, page: 1, pageSize: 20 }
    const res =
      tab.value === 'pending'
        ? await merchantService.auditList(params)
        : await merchantService.list(params)
    list.value = (res?.list ?? []) as Merchant[]
    counts.value[tab.value] = typeof res?.total === 'number' ? res.total : list.value.length
  } finally {
    loading.value = false
  }
}

watch(tab, () => {
  load()
})

function viewDetail(m: Merchant) {
  uni.showModal({
    title: m.name,
    content: `主体: ${m.legalName}\n法人: ${m.legalRep}\n联系人: ${m.contact} (${m.contactPhone})\n地区: ${m.region}\n地址: ${m.address}\n经营品类: ${m.categories.join('、')}\n信用代码: ${m.creditCode}`,
    showCancel: false,
  })
}

function approve(m: Merchant) {
  uni.showModal({
    title: '通过申请',
    content: `通过「${m.name}」入驻申请，将默认授予 ${m.type === 'factory' ? 'A 级厂家' : 'B 级门店'}权限。`,
    success: async (r) => {
      if (r.confirm) {
        await merchantService.approve(m.id)
        uni.showToast({ title: '已通过', icon: 'success' })
        await load()
      }
    },
  })
}

function reject(m: Merchant) {
  uni.showModal({
    title: '驳回申请',
    editable: true,
    placeholderText: '请填写驳回理由（必填）',
    success: async (r) => {
      if (r.confirm && r.content) {
        await merchantService.reject(m.id, r.content)
        uni.showToast({ title: '已驳回', icon: 'success' })
        await load()
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="商户入驻审核" />

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text class="tab-label">{{ t.label }}</text>
        <text class="tab-count">({{ counts[t.key] }})</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view
        v-for="m in filtered"
        :key="m.id"
        class="card"
      >
        <view class="card-head">
          <view class="head-left">
            <text class="name">{{ m.name }}</text>
            <view
              class="type-tag"
              :style="{ color: TYPE_META[m.type].tint, background: TYPE_META[m.type].tint + '14' }"
            >
              {{ TYPE_META[m.type].label }}
            </view>
          </view>
          <text class="time">{{ formatDate(m.createdAt) }}</text>
        </view>

        <view class="meta-rows">
          <view class="meta">
            <Icon name="user" :size="22" color="var(--text-tertiary)" />
            <text>{{ m.contact }} · {{ m.contactPhone }}</text>
          </view>
          <view class="meta">
            <Icon name="location-pin" :size="22" color="var(--text-tertiary)" />
            <text class="ellipsis">{{ m.region }}</text>
          </view>
          <view class="meta">
            <Icon name="tag" :size="22" color="var(--text-tertiary)" />
            <text class="ellipsis">{{ m.categories.slice(0, 4).join(' / ') }}</text>
          </view>
        </view>

        <!-- 资质图 -->
        <view class="qual-row">
          <view v-for="(q, i) in m.qualifications.slice(0, 3)" :key="i" class="qual-img-wrap">
            <image :src="q" mode="aspectFill" class="qual-img" />
          </view>
          <text v-if="m.qualifications.length > 3" class="qual-more">+{{ m.qualifications.length - 3 }} 张</text>
        </view>

        <view v-if="m.status === 'rejected' && m.rejectReason" class="reject-reason">
          <Icon name="close-circle" :size="22" color="#FF3B30" />
          <text>驳回原因：{{ m.rejectReason }}</text>
        </view>

        <view class="actions">
          <view class="btn ghost" @click="viewDetail(m)">查看详情</view>
          <template v-if="m.status === 'pending'">
            <view class="btn ghost" @click="reject(m)">驳回</view>
            <view class="btn primary" @click="approve(m)">通过</view>
          </template>
        </view>
      </view>

      <EmptyState
        v-if="!loading && filtered.length === 0"
        :title="`暂无${TABS.find(t => t.key === tab)?.label}商户`"
        desc="审核进度会实时同步到首页待办"
        icon="home-shop"
      />
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
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 4rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .tab-count {
    font-size: 20rpx;
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
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx;
  box-sizing: border-box;
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
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  min-width: 0;
}
.head-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
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
  .type-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.time {
  flex-shrink: 0;
  font-size: 20rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
}
.meta-rows {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  min-width: 0;
  .ellipsis {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.qual-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.qual-img-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--bg-page);
  flex-shrink: 0;
  .qual-img { width: 100%; height: 100%; display: block; }
}
.qual-more {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.reject-reason {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 12rpx;
  background: rgba(255,59,48,0.08);
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #FF3B30;
  line-height: 1.4;
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
