<!-- 平台 PC · 平台订单（S5-T3）-->
<template>
  <div class="pf-order">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">平台订单</h2>
        <p class="mt-1 text-sm text-g-500">全平台订单监控 · 售后投诉</p>
      </div>
      <div class="flex gap-2">
        <ElInput
          v-model="keyword"
          placeholder="搜索单号 / 收货人"
          clearable
          style="width: 240px"
          :prefix-icon="Search"
        />
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <!-- 顶部 4 KPI -->
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

    <!-- Tab -->
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

    <!-- 表 -->
    <ElCard shadow="never">
      <ElTable
        :data="filtered"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn label="订单号" prop="no" width="200" />
        <ElTableColumn label="收货人" width="160">
          <template #default="{ row }">
            <div>{{ row.address?.name }}</div>
            <div class="text-xs text-g-500">{{ row.address?.phone }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="商品" min-width="180">
          <template #default="{ row }">{{ row.items?.length || 0 }} 件商品</template>
        </ElTableColumn>
        <ElTableColumn label="金额" width="140" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">{{ formatPrice(row.payAmount) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status) as any" size="small">{{
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

    <!-- 详情 -->
    <ElDrawer v-model="detailOpen" :size="540" :with-header="false">
      <div v-if="current" class="pf-detail">
        <div class="pf-detail__head">
          <div>
            <h3 class="m-0">订单详情</h3>
            <div class="text-xs text-g-500 mt-1">{{ current.no }}</div>
          </div>
          <ElTag :type="statusTypeOf(current.status) as any">{{
            statusLabelOf(current.status)
          }}</ElTag>
        </div>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="收货人"
            >{{ current.address?.name }} · {{ current.address?.phone }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="收货地址">{{ current.address?.detail }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商品总数"
            >{{ current.items?.length || 0 }} 件</ElDescriptionsItem
          >
          <ElDescriptionsItem label="商品金额">{{
            formatPrice(current.totalAmount || 0)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="运费">{{
            formatPrice(current.shippingFee || 0)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="实付">
            <span class="text-primary font-semibold">{{ formatPrice(current.payAmount) }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="支付时间">{{
            current.paidAt ? formatDateTime(current.paidAt) : '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="发货时间">{{
            current.shippedAt ? formatDateTime(current.shippedAt) : '—'
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { fetchPlatformOrders } from '@/api/platform-business'
  import type { Order, OrderStatus } from '@jiujiu/shared/types'
  import { formatPrice, formatWan, formatDateTime } from '@jiujiu/shared/utils'
  import { Refresh, Search } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformOrderList' })

  type TabKey = 'all' | OrderStatus

  const tabs: { label: string; value: TabKey }[] = [
    { label: '全部', value: 'all' },
    { label: '待付款', value: 'pending_payment' },
    { label: '待发货', value: 'pending_shipment' },
    { label: '待收货', value: 'shipped' },
    { label: '售后', value: 'after_sale' },
    { label: '已完成', value: 'completed' }
  ]

  const tab = ref<TabKey>('all')
  const keyword = ref('')
  const orders = ref<Order[]>([])
  const detailOpen = ref(false)
  const current = ref<Order>()

  const filtered = computed(() => {
    let res = orders.value
    if (tab.value !== 'all') res = res.filter((o) => o.status === tab.value)
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      res = res.filter(
        (o) => o.no.toLowerCase().includes(kw) || (o.address?.name || '').includes(keyword.value)
      )
    }
    return res
  })

  const kpiCards = computed(() => {
    const gmv = orders.value
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + o.payAmount, 0)
    return [
      {
        key: 'total',
        icon: 'ri:bill-line',
        label: '订单总数',
        value: orders.value.length,
        color: '#FF4D2D'
      },
      {
        key: 'gmv',
        icon: 'ri:money-cny-circle-line',
        label: '累计 GMV',
        value: `¥${formatWan(gmv)}`,
        color: '#10B981'
      },
      {
        key: 'today',
        icon: 'ri:calendar-line',
        label: '今日订单',
        value: orders.value.length,
        color: '#3B82F6'
      },
      {
        key: 'after',
        icon: 'ri:customer-service-2-line',
        label: '售后投诉',
        value: orders.value.filter((o) => o.status === 'after_sale').length,
        color: '#F56C6C'
      }
    ]
  })

  function countOf(t: TabKey) {
    if (t === 'all') return orders.value.length
    return orders.value.filter((o) => o.status === t).length
  }

  function statusTypeOf(s: OrderStatus) {
    const map: Record<string, string> = {
      pending_payment: 'warning',
      pending_shipment: 'primary',
      shipped: 'primary',
      completed: 'success',
      cancelled: 'info',
      after_sale: 'danger',
      refunded: 'info'
    }
    return map[s] || 'info'
  }
  function statusLabelOf(s: OrderStatus) {
    const map: Record<string, string> = {
      pending_payment: '待付款',
      pending_shipment: '待发货',
      shipped: '待收货',
      completed: '已完成',
      cancelled: '已取消',
      after_sale: '售后中',
      refunded: '已退款'
    }
    return map[s] || s
  }

  function openDetail(o: Order) {
    current.value = o
    detailOpen.value = true
  }

  async function load() {
    orders.value = await fetchPlatformOrders()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-order {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .text-g-500 {
    color: #6b7280;
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
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    color: var(--art-gray-800, #1f2937);
  }

  .pf-kpi__label {
    margin-top: 4px;
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
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

  .pf-detail__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
</style>
