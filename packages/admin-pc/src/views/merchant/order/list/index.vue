<!-- 商家 PC · 订单管理（S3-T6）-->
<template>
  <div class="mp-order">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">订单管理</h2>
        <p class="mt-1 text-sm text-g-500">
          共 {{ list.length }} 单 · 总额 ¥{{ totalAmt.toLocaleString() }} · 待发货
          <b class="text-primary">{{ countOf('pending_shipment') }}</b> 单
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" @click="loadData" plain>刷新</ElButton>
        <ElButton :icon="Download" plain>导出</ElButton>
        <ElButton
          type="primary"
          :icon="Van"
          :disabled="!selectedIds.length"
          @click="onBatchShip"
        >
          批量发货 ({{ selectedIds.length }})
        </ElButton>
      </div>
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
      <div class="mp-filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索订单号 / 商品名"
          clearable
          :prefix-icon="Search"
          style="width: 320px"
        />
        <ElDatePicker
          v-model="dateRange"
          type="daterange"
          range-separator="—"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          unlink-panels
          style="width: 320px"
        />
      </div>
    </ElCard>

    <ElCard shadow="never" v-loading="loading">
      <ElTable
        :data="pagedList"
        @selection-change="onSelChange"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn type="selection" width="48" :selectable="(row) => row.status === 'pending_shipment'" />
        <ElTableColumn label="订单号" width="180">
          <template #default="{ row }">
            <div class="font-medium">{{ row.no }}</div>
            <div class="text-xs text-g-500 mt-1">{{ formatRelative(row.createdAt) }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="商品" min-width="280">
          <template #default="{ row }">
            <div class="mp-row-cell">
              <ElImage
                :src="row.items?.[0]?.productImage"
                fit="cover"
                style="width: 44px; height: 44px; border-radius: 6px"
              />
              <div class="flex-1 min-w-0">
                <div class="line-clamp-1">{{ row.items?.[0]?.productName || '—' }}</div>
                <div class="text-xs text-g-500">
                  {{ row.items?.[0]?.specsLabel }} ×{{ row.items?.[0]?.quantity }}
                  <span v-if="row.items && row.items.length > 1">
                    等 {{ row.items.length }} 件
                  </span>
                </div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="收货人" width="140">
          <template #default="{ row }">
            <div>{{ row.address?.name }}</div>
            <div class="text-xs text-g-500">{{ row.address?.phone }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="实付" width="120">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.payAmount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton text type="primary" size="small" @click="openDetail(row)">详情</ElButton>
            <ElDivider direction="vertical" />
            <ElButton
              v-if="row.status === 'pending_shipment'"
              text
              type="primary"
              size="small"
              @click="onShip(row)"
            >
              发货
            </ElButton>
            <ElButton
              v-else-if="row.status === 'shipped'"
              text
              type="primary"
              size="small"
              @click="onTrack(row)"
            >
              物流
            </ElButton>
            <ElDivider direction="vertical" />
            <ElButton text type="info" size="small">备注</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mp-pagination">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </ElCard>

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailOpen" :size="540" :with-header="false">
      <div v-if="current" class="mp-detail">
        <div class="mp-detail__head">
          <div>
            <div class="text-lg font-semibold">{{ current.no }}</div>
            <div class="text-xs text-g-500 mt-1">下单于 {{ formatDateTime(current.createdAt) }}</div>
          </div>
          <ElTag :type="statusTypeOf(current.status)">{{ statusLabelOf(current.status) }}</ElTag>
        </div>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">收货信息</h4>
          <div class="text-sm">
            <div>{{ current.address?.name }} · {{ current.address?.phone }}</div>
            <div class="text-g-500 mt-1">
              {{ current.address?.region }} {{ current.address?.detail }}
            </div>
          </div>
        </ElCard>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">商品清单</h4>
          <div v-for="item in current.items || []" :key="item.id" class="mp-detail-item">
            <ElImage :src="item.productImage" fit="cover" style="width: 56px; height: 56px; border-radius: 6px" />
            <div class="flex-1 min-w-0">
              <div class="line-clamp-1">{{ item.productName }}</div>
              <div class="text-xs text-g-500 mt-1">{{ item.specsLabel }}</div>
            </div>
            <div class="text-right">
              <div class="text-primary">¥{{ item.unitPrice }}</div>
              <div class="text-xs text-g-500 mt-1">×{{ item.quantity }}</div>
            </div>
          </div>
        </ElCard>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">金额</h4>
          <div class="mp-money-row"><span>商品总额</span><span>¥{{ current.totalAmount }}</span></div>
          <div class="mp-money-row"><span>优惠</span><span>−¥{{ current.discountAmount }}</span></div>
          <div class="mp-money-row"><span>运费</span><span>¥{{ current.shippingFee }}</span></div>
          <ElDivider />
          <div class="mp-money-row mp-money-row--total">
            <span>实付</span>
            <span class="text-primary text-lg font-semibold">¥{{ current.payAmount }}</span>
          </div>
        </ElCard>

        <ElCard shadow="never" class="mp-detail__card" v-if="current.trackingNumber">
          <h4 class="m-0 mb-3 text-sm text-g-700">物流</h4>
          <div class="text-sm">
            {{ current.trackingCompany || '默认快递' }} · {{ current.trackingNumber }}
          </div>
        </ElCard>

        <div class="mp-detail__footer">
          <ElButton @click="detailOpen = false">关闭</ElButton>
          <ElButton
            v-if="current.status === 'pending_shipment'"
            type="primary"
            @click="onShip(current)"
          >
            发货
          </ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { fetchMerchantOrders, shipOrders } from '@/api/merchant-business'
  import type { Order, OrderStatus } from '@jiujiu/shared/types'
  import { formatDateTime, formatRelative } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Download, Refresh, Search, Van } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantOrderList' })

  const tabs: { label: string; value: OrderStatus | 'all' }[] = [
    { label: '全部', value: 'all' },
    { label: '待付款', value: 'pending_payment' },
    { label: '待发货', value: 'pending_shipment' },
    { label: '已发货', value: 'shipped' },
    { label: '已完成', value: 'completed' },
    { label: '售后中', value: 'after_sale' },
    { label: '已取消', value: 'cancelled' }
  ]

  const status = ref<OrderStatus | 'all'>('all')
  const keyword = ref('')
  const dateRange = ref<[Date, Date]>()
  const page = ref(1)
  const pageSize = ref(10)
  const loading = ref(false)

  const list = ref<Order[]>([])
  const selectedIds = ref<string[]>([])
  const detailOpen = ref(false)
  const current = ref<Order>()

  const filteredList = computed(() => {
    let arr = list.value
    if (status.value !== 'all') arr = arr.filter((o) => o.status === status.value)
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      arr = arr.filter(
        (o) =>
          o.no.toLowerCase().includes(kw) ||
          (o.items || []).some((i) => i.productName?.toLowerCase().includes(kw))
      )
    }
    return arr
  })

  const pagedList = computed(() =>
    filteredList.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )

  const totalAmt = computed(() => filteredList.value.reduce((a, o) => a + o.payAmount, 0))

  function countOf(s: OrderStatus | 'all') {
    if (s === 'all') return list.value.length
    return list.value.filter((o) => o.status === s).length
  }

  function statusTypeOf(s: OrderStatus) {
    return (
      {
        pending_payment: 'warning',
        pending_shipment: 'warning',
        shipped: 'primary',
        completed: 'success',
        after_sale: 'danger',
        refunded: 'info',
        cancelled: 'info'
      } as Record<OrderStatus, 'warning' | 'primary' | 'success' | 'danger' | 'info'>
    )[s]
  }

  function statusLabelOf(s: OrderStatus) {
    return (
      {
        pending_payment: '待付款',
        pending_shipment: '待发货',
        shipped: '已发货',
        completed: '已完成',
        after_sale: '售后中',
        refunded: '已退款',
        cancelled: '已取消'
      } as Record<OrderStatus, string>
    )[s]
  }

  function onSelChange(rows: Order[]) {
    selectedIds.value = rows.map((r) => r.id)
  }

  function openDetail(o: Order) {
    current.value = o
    detailOpen.value = true
  }

  async function onShip(o: Order) {
    await shipOrders([o.id])
    o.status = 'shipped'
    ElMessage.success('已发货')
    detailOpen.value = false
  }

  async function onBatchShip() {
    try {
      await ElMessageBox.confirm(`确定批量发货 ${selectedIds.value.length} 单？`, '提示', {
        type: 'warning'
      })
      await shipOrders(selectedIds.value)
      list.value.forEach((o) => {
        if (selectedIds.value.includes(o.id) && o.status === 'pending_shipment') {
          o.status = 'shipped'
        }
      })
      ElMessage.success(`已批量发货 ${selectedIds.value.length} 单`)
      selectedIds.value = []
    } catch {
      /* cancel */
    }
  }

  function onTrack(o: Order) {
    ElMessage.info(`物流单号：${o.trackingNumber || 'SF1234567890'}`)
  }

  async function loadData() {
    loading.value = true
    try {
      list.value = await fetchMerchantOrders()
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-order {
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
  }

  .mp-toolbar :deep(.el-card__body) {
    padding: 8px 16px 12px;
  }

  .mp-filters {
    display: flex;
    gap: 12px;
    margin-top: 6px;
  }

  .mp-row-cell {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .mp-pagination {
    display: flex;
    justify-content: flex-end;
    padding: 14px 18px;
  }

  /* === 抽屉 === */

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

  .mp-detail-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;

    & + & {
      border-top: 1px dashed var(--art-border-color, #e5e7eb);
    }
  }

  .mp-money-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .mp-money-row--total {
    font-size: 14px;
    color: var(--art-gray-800, #1f2937);
  }

  .mp-detail__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 6px;
  }
</style>
