<!-- 商家 PC · 售后处理（S3-T7）-->
<template>
  <div class="mp-aftersale">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">售后处理</h2>
        <p class="mt-1 text-sm text-g-500">
          共 {{ list.length }} 单 · 待处理 <b class="text-primary">{{ countOf('pending') }}</b> 单
        </p>
      </div>
      <ElButton :icon="Refresh" @click="loadData" plain>刷新</ElButton>
    </div>

    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="status">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="`${t.label} (${countOf(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never" v-loading="loading">
      <ElTable :data="filteredList" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="售后单号" width="180">
          <template #default="{ row }">
            <div class="font-medium">{{ row.no }}</div>
            <div class="text-xs text-g-500 mt-1">{{ formatRelative(row.createdAt) }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="售后类型" width="120">
          <template #default="{ row }">
            <ElTag :type="row.type === 'refund_only' ? 'info' : 'warning'" size="small">
              {{ row.type === 'refund_only' ? '仅退款' : '退货退款' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="申请原因" min-width="200">
          <template #default="{ row }">
            <div>{{ row.reason }}</div>
            <div class="text-xs text-g-500 mt-1 line-clamp-1">{{ row.description }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="申请金额" width="120">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.applyAmount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton text type="primary" size="small" @click="openDetail(row)">详情</ElButton>
            <template v-if="row.status === 'pending'">
              <ElDivider direction="vertical" />
              <ElButton text type="success" size="small" @click="onAgree(row)">同意</ElButton>
              <ElDivider direction="vertical" />
              <ElButton text type="danger" size="small" @click="onReject(row)">拒绝</ElButton>
            </template>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailOpen" :size="500" :with-header="false">
      <div v-if="current" class="mp-detail">
        <div class="mp-detail__head">
          <div>
            <div class="text-lg font-semibold">{{ current.no }}</div>
            <div class="text-xs text-g-500 mt-1">关联订单 {{ current.orderId.slice(0, 8) }}</div>
          </div>
          <ElTag :type="statusTypeOf(current.status)">{{ statusLabelOf(current.status) }}</ElTag>
        </div>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">售后信息</h4>
          <ElDescriptions :column="1" size="small" border>
            <ElDescriptionsItem label="类型">
              {{ current.type === 'refund_only' ? '仅退款' : '退货退款' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="原因">{{ current.reason }}</ElDescriptionsItem>
            <ElDescriptionsItem label="详细描述">{{ current.description || '无' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="申请金额">
              <span class="text-primary font-semibold">¥{{ current.applyAmount }}</span>
            </ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>

        <ElCard shadow="never" class="mp-detail__card" v-if="current.evidence?.length">
          <h4 class="m-0 mb-3 text-sm text-g-700">凭证</h4>
          <div class="flex gap-2 flex-wrap">
            <ElImage
              v-for="(e, i) in current.evidence"
              :key="i"
              :src="e"
              fit="cover"
              :preview-src-list="current.evidence"
              style="width: 80px; height: 80px; border-radius: 6px"
            />
          </div>
        </ElCard>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">处理时间轴</h4>
          <ElTimeline>
            <ElTimelineItem :timestamp="formatDateTime(current.createdAt)" placement="top">
              <h4 class="m-0">用户发起申请</h4>
              <p class="text-xs text-g-500 mt-1">{{ current.reason }}</p>
            </ElTimelineItem>
            <ElTimelineItem
              v-if="current.status !== 'pending'"
              :timestamp="formatDateTime(current.updatedAt)"
              :type="current.status === 'agreed' ? 'success' : 'danger'"
              placement="top"
            >
              <h4 class="m-0">商家{{ current.status === 'agreed' ? '同意' : '拒绝' }}</h4>
              <p class="text-xs text-g-500 mt-1">{{ current.merchantReply || '—' }}</p>
            </ElTimelineItem>
            <ElTimelineItem
              v-if="current.status === 'completed'"
              :timestamp="formatDateTime(current.completedAt!)"
              type="success"
              placement="top"
            >
              <h4 class="m-0">退款完成</h4>
            </ElTimelineItem>
          </ElTimeline>
        </ElCard>

        <div class="mp-detail__footer">
          <ElButton @click="detailOpen = false">关闭</ElButton>
          <template v-if="current.status === 'pending'">
            <ElButton type="danger" plain @click="onReject(current)">拒绝</ElButton>
            <ElButton type="primary" @click="onAgree(current)">同意退款</ElButton>
          </template>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { fetchAftersaleList, reviewRefund } from '@/api/merchant-business'
  import type { Refund, RefundStatus } from '@jiujiu/shared/types'
  import { formatDateTime, formatRelative } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantAftersale' })

  const tabs: { label: string; value: RefundStatus | 'all' }[] = [
    { label: '全部', value: 'all' },
    { label: '待处理', value: 'pending' },
    { label: '已同意', value: 'agreed' },
    { label: '已拒绝', value: 'rejected' },
    { label: '处理中', value: 'in_progress' },
    { label: '已完成', value: 'completed' }
  ]

  const status = ref<RefundStatus | 'all'>('all')
  const loading = ref(false)
  const list = ref<Refund[]>([])
  const detailOpen = ref(false)
  const current = ref<Refund>()

  const filteredList = computed(() => {
    if (status.value === 'all') return list.value
    return list.value.filter((r) => r.status === status.value)
  })

  function countOf(s: RefundStatus | 'all') {
    if (s === 'all') return list.value.length
    return list.value.filter((r) => r.status === s).length
  }

  function statusTypeOf(s: RefundStatus) {
    return (
      {
        pending: 'warning',
        agreed: 'success',
        rejected: 'danger',
        in_progress: 'primary',
        completed: 'info'
      } as Record<RefundStatus, 'warning' | 'success' | 'danger' | 'primary' | 'info'>
    )[s]
  }

  function statusLabelOf(s: RefundStatus) {
    return (
      {
        pending: '待处理',
        agreed: '已同意',
        rejected: '已拒绝',
        in_progress: '处理中',
        completed: '已完成'
      } as Record<RefundStatus, string>
    )[s]
  }

  function openDetail(r: Refund) {
    current.value = r
    detailOpen.value = true
  }

  async function onAgree(r: Refund) {
    try {
      const { value } = await ElMessageBox.prompt('请输入处理意见（可选）', '同意退款', {
        confirmButtonText: '确认同意',
        cancelButtonText: '取消',
        inputType: 'textarea'
      })
      await reviewRefund(r.id, 'agreed', value || '')
      r.status = 'agreed'
      r.merchantReply = value || ''
      ElMessage.success('已同意退款')
      detailOpen.value = false
    } catch {
      /* cancel */
    }
  }

  async function onReject(r: Refund) {
    try {
      const { value } = await ElMessageBox.prompt('拒绝原因', '拒绝退款', {
        confirmButtonText: '确认拒绝',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValidator: (v) => (v && v.length >= 3) || '拒绝原因至少 3 个字符'
      })
      await reviewRefund(r.id, 'rejected', value)
      r.status = 'rejected'
      r.merchantReply = value
      ElMessage.success('已拒绝')
      detailOpen.value = false
    } catch {
      /* cancel */
    }
  }

  async function loadData() {
    loading.value = true
    try {
      list.value = await fetchAftersaleList()
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-aftersale {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .mp-detail {
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-detail__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .mp-detail__card {
    border-radius: 10px;
    background: #fafbfc;

    :deep(.el-card__body) {
      padding: 14px 16px;
    }
  }

  .mp-detail__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 6px;
  }
</style>
