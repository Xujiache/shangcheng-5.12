<!-- 平台 PC · 缴费订单（S5-T10）-->
<template>
  <div class="pf-po">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">缴费订单</h2>
        <p class="mt-1 text-sm text-g-500">商家会员订阅与增值包支付记录</p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Download" plain @click="exportCsv">导出 CSV</ElButton>
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <div class="pf-kpi-row">
      <ElCard v-for="k in kpiCards" :key="k.key" shadow="hover" class="pf-kpi">
        <div class="pf-kpi__icon" :style="{ background: k.color + '18', color: k.color }">
          <ArtSvgIcon :icon="k.icon" />
        </div>
        <div>
          <div class="pf-kpi__num">{{ k.value }}</div>
          <div class="pf-kpi__label">{{ k.label }}</div>
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="`${t.label} (${countOf(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never">
      <ElTable
        :data="filtered"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn label="订单号" prop="no" width="180" />
        <ElTableColumn label="商户" prop="merchantName" min-width="160" />
        <ElTableColumn label="套餐" prop="planName" min-width="160" />
        <ElTableColumn label="金额" width="140" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.amount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="支付方式" width="120" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="payMethodTypeOf(row.payMethod)" effect="plain">
              {{ payMethodLabelOf(row.payMethod) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">{{
              statusLabelOf(row.status)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="支付时间" width="170">
          <template #default="{ row }">
            <span v-if="row.paidAt">{{ formatDateTime(row.paidAt) }}</span>
            <span v-else class="text-g-400">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDrawer v-model="detailOpen" :size="480" :with-header="false">
      <div v-if="current" class="pf-detail">
        <h3 class="m-0">{{ current.no }}</h3>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="商户">{{ current.merchantName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="套餐">{{ current.planName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="金额">
            <span class="text-primary font-semibold">¥{{ current.amount }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="支付方式">{{
            payMethodLabelOf(current.payMethod)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="statusTypeOf(current.status)" size="small">{{
              statusLabelOf(current.status)
            }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="支付时间">{{
            current.paidAt ? formatDateTime(current.paidAt) : '—'
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <div v-if="current.status === 'refunding'" class="mt-3">
          <ElButton type="danger" @click="approveRefund(current)">通过退款</ElButton>
          <ElButton plain @click="rejectRefund(current)">驳回退款</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMemberPayOrders,
    approvePayRefund,
    rejectPayRefund,
    type PayOrderItem
  } from '@/api/platform-business'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Download } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformPayOrders' })

  type TabKey = 'all' | PayOrderItem['status']

  const tabs: { label: string; value: TabKey }[] = [
    { label: '全部', value: 'all' },
    { label: '已支付', value: 'paid' },
    { label: '待支付', value: 'pending' },
    { label: '退款中', value: 'refunding' },
    { label: '已退款', value: 'refunded' }
  ]

  const tab = ref<TabKey>('all')
  const list = ref<PayOrderItem[]>([])
  const detailOpen = ref(false)
  const current = ref<PayOrderItem>()

  const filtered = computed(() => {
    if (tab.value === 'all') return list.value
    return list.value.filter((x) => x.status === tab.value)
  })

  const kpiCards = computed(() => {
    const paid = list.value.filter((x) => x.status === 'paid')
    return [
      {
        key: 'income',
        icon: 'ri:money-cny-circle-line',
        label: '总收入',
        value: '¥' + paid.reduce((s, x) => s + x.amount, 0).toLocaleString(),
        color: '#10B981'
      },
      {
        key: 'paid',
        icon: 'ri:check-double-line',
        label: '已支付',
        value: paid.length,
        color: '#FF4D2D'
      },
      {
        key: 'pending',
        icon: 'ri:time-line',
        label: '待支付',
        value: list.value.filter((x) => x.status === 'pending').length,
        color: '#FAAD14'
      },
      {
        key: 'refund',
        icon: 'ri:refund-2-line',
        label: '退款中',
        value: list.value.filter((x) => x.status === 'refunding').length,
        color: '#F56C6C'
      }
    ]
  })

  function countOf(t: TabKey) {
    if (t === 'all') return list.value.length
    return list.value.filter((x) => x.status === t).length
  }

  function statusTypeOf(s: PayOrderItem['status']) {
    return (
      { paid: 'success', pending: 'warning', refunding: 'danger', refunded: 'info' } as const
    )[s]
  }
  function statusLabelOf(s: PayOrderItem['status']) {
    return (
      { paid: '已支付', pending: '待支付', refunding: '退款中', refunded: '已退款' } as const
    )[s]
  }
  function payMethodTypeOf(m: PayOrderItem['payMethod']) {
    return ({ wechat: 'success', alipay: 'primary', balance: 'warning' } as const)[m]
  }
  function payMethodLabelOf(m: PayOrderItem['payMethod']) {
    return ({ wechat: '微信', alipay: '支付宝', balance: '余额' } as const)[m]
  }

  function openDetail(o: PayOrderItem) {
    current.value = o
    detailOpen.value = true
  }

  async function approveRefund(o: PayOrderItem) {
    await approvePayRefund(o.id)
    o.status = 'refunded'
    ElMessage.success('已通过退款')
    detailOpen.value = false
    await load()
  }
  async function rejectRefund(o: PayOrderItem) {
    let reason = ''
    try {
      const r = await ElMessageBox.prompt('请输入驳回理由（必填，将告知商家）', '驳回退款', {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '如：超过 7 天申诉期 / 已发货且签收 / 资料不全 ...',
        inputValidator: (v) => (v && v.trim().length >= 2 ? true : '请填写至少 2 个字符的理由')
      })
      reason = (r.value || '').trim()
    } catch {
      return
    }
    await rejectPayRefund(o.id, reason)
    o.status = 'paid'
    ElMessage.success('已驳回退款申请')
    detailOpen.value = false
    await load()
  }

  async function load() {
    list.value = await fetchMemberPayOrders()
  }

  function exportCsv() {
    const rows: string[][] = []
    rows.push(['订单号', '商家', '套餐', '类型', '金额', '支付方式', '状态', '支付时间'])
    filtered.value.forEach((o) => {
      rows.push([
        o.no,
        o.merchantName,
        o.planName,
        ({ basic: '会员套餐', ad: '推广套餐', addon: '增值单项' } as Record<string, string>)[
          o.planType
        ] || o.planType,
        '¥' + o.amount,
        payMethodLabelOf(o.payMethod),
        statusLabelOf(o.status),
        o.paidAt ? formatDateTime(o.paidAt) : '—'
      ])
    })
    const csv =
      '﻿' +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-pay-orders-${tab.value}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${rows.length - 1} 条缴费记录`)
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-po {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .text-g-400 {
    color: #9ca3af;
  }

  .pf-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (width <= 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .pf-kpi {
    border-radius: 12px;

    :deep(.el-card__body) {
      display: flex;
      gap: 14px;
      align-items: center;
      padding: 16px 18px;
    }
  }

  .pf-kpi__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 22px;
    border-radius: 12px;
  }

  .pf-kpi__num {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--art-gray-800, #1f2937);
  }

  .pf-kpi__label {
    margin-top: 4px;
    font-size: 12px;
    color: #6b7280;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-detail {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px;
  }
</style>
