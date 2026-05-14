<!--
  平台 PC · 订单分享数据看板
  ─────────────────────────────────────────────
  消费后端 `GET /api/v1/p/order-shares` + `GET /api/v1/p/order-shares/stats`，
  让平台运营回溯商家分享行为：
    - 4 张 KPI 卡（总分享 / 总浏览 / 活跃 / 已撤销）
    - 近 7 日趋势（ArtLineChart 复用平台数据中心样式）
    - 筛选（商家 / 状态 / 时间）+ ElTable 列表（含浏览数 / 过期 / 状态 / 复制链接）
    - TopN 商户面板（旁挂）
  数据存储在 SystemConfig key=`order_share:<shareCode>`，不需要建新 schema。
-->
<template>
  <div class="pf-os">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">订单分享</h2>
        <p class="mt-1 text-sm text-g-500">商家订单分享历史 · 浏览数据 · TOP 商户</p>
      </div>
      <ElButton :icon="Refresh" plain @click="reloadAll">刷新</ElButton>
    </div>

    <!-- 4 张 KPI 卡 -->
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

    <!-- 趋势 + TopN 商户 -->
    <div class="pf-grid-2">
      <ElCard shadow="hover" class="pf-card">
        <template #header>
          <div class="pf-card__title">
            <span>近 7 日分享趋势</span>
            <span class="text-xs text-g-500">按创建日期分桶</span>
          </div>
        </template>
        <ArtLineChart
          v-if="stats.trend.length"
          height="240px"
          :data="stats.trend.map((t) => t.count)"
          :x-axis-data="stats.trend.map((t) => t.date)"
          show-area-color
        />
        <div v-else class="pf-empty">暂无趋势数据</div>
      </ElCard>

      <ElCard shadow="hover" class="pf-card">
        <template #header>
          <div class="pf-card__title">
            <span>TOP 10 商户</span>
            <span class="text-xs text-g-500">综合排序：分享数 → 浏览数</span>
          </div>
        </template>
        <div v-if="stats.topMerchants.length" class="pf-top-list">
          <div v-for="(m, idx) in stats.topMerchants" :key="m.merchantId" class="pf-top-row">
            <div class="pf-top-rank" :class="rankClassOf(idx)">{{ idx + 1 }}</div>
            <div class="pf-top-name">{{ m.name }}</div>
            <div class="pf-top-metric">
              <span class="pf-top-metric__num">{{ m.shareCount }}</span>
              <span class="pf-top-metric__label">分享</span>
            </div>
            <div class="pf-top-metric">
              <span class="pf-top-metric__num">{{ m.viewCount }}</span>
              <span class="pf-top-metric__label">浏览</span>
            </div>
          </div>
        </div>
        <div v-else class="pf-empty">暂无 TOP 商户数据</div>
      </ElCard>
    </div>

    <!-- 过滤栏 -->
    <ElCard shadow="never" class="pf-toolbar">
      <ElForm :inline="true" :model="filters" @submit.prevent="onSearch">
        <ElFormItem label="商户 ID">
          <ElInput
            v-model="filters.merchantId"
            placeholder="精确匹配商家 ID"
            clearable
            style="width: 240px"
            @keyup.enter="onSearch"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect
            v-model="filters.statusKey"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="onSearch"
          >
            <ElOption label="全部" value="" />
            <ElOption label="活跃" value="active" />
            <ElOption label="已撤销" value="revoked" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="创建时间">
          <ElDatePicker
            v-model="filters.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            unlink-panels
            style="width: 280px"
            @change="onSearch"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :icon="Search" @click="onSearch">查询</ElButton>
          <ElButton :icon="RefreshLeft" @click="onReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 列表 -->
    <ElCard shadow="never">
      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无分享记录"
      >
        <ElTableColumn label="订单号" min-width="180">
          <template #default="{ row }">
            <div class="pf-mono">{{ row.orderNo || row.orderId }}</div>
            <div class="text-xs text-g-400">{{ row.shareCode }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="商户" min-width="160">
          <template #default="{ row }">
            <div>{{ row.merchantName }}</div>
            <div class="text-xs text-g-400 pf-mono">{{ row.merchantId }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="可见字段" min-width="220">
          <template #default="{ row }">
            <div class="pf-tags">
              <ElTag
                v-for="f in row.visibleFields"
                :key="f"
                size="small"
                effect="plain"
                type="info"
              >
                {{ fieldLabelOf(f) }}
              </ElTag>
              <span v-if="!row.visibleFields?.length" class="text-g-400">—</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="浏览数" width="100" align="right" prop="viewCount">
          <template #default="{ row }">
            <span class="text-primary font-semibold">{{ row.viewCount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="过期时间" width="170">
          <template #default="{ row }">
            <span v-if="row.expiresAt">{{ formatDateTime(row.expiresAt) }}</span>
            <span v-else class="text-g-400">永久</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTagOf(row)" size="small">{{ statusLabelOf(row) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="创建时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" :icon="DocumentCopy" @click="copyLink(row)">
              复制链接
            </ElButton>
            <ElButton link type="primary" :icon="View" @click="goOrder(row)">查看订单</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pf-pager">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="reloadList"
          @size-change="onSizeChange"
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Refresh, RefreshLeft, Search, DocumentCopy, View } from '@element-plus/icons-vue'
  import {
    fetchOrderShares,
    fetchOrderSharesStats,
    type OrderShare,
    type OrderSharesStats
  } from '@/api/platform-business'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'PlatformOrderShare' })

  const router = useRouter()

  // 列表
  const list = ref<OrderShare[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)

  // 过滤
  const filters = reactive<{
    merchantId: string
    statusKey: '' | 'active' | 'revoked'
    dateRange: string[] | null
  }>({
    merchantId: '',
    statusKey: '',
    dateRange: null
  })

  // 统计
  const stats = ref<OrderSharesStats>({
    totalShares: 0,
    totalViews: 0,
    active: 0,
    revoked: 0,
    expired: 0,
    trend: [],
    topMerchants: []
  })

  const kpiCards = computed(() => [
    {
      key: 'total',
      icon: 'ri:share-line',
      label: '总分享数',
      value: stats.value.totalShares,
      color: '#FF4D2D'
    },
    {
      key: 'views',
      icon: 'ri:eye-line',
      label: '总浏览数',
      value: stats.value.totalViews,
      color: '#3B82F6'
    },
    {
      key: 'active',
      icon: 'ri:checkbox-circle-line',
      label: '活跃分享',
      value: stats.value.active,
      color: '#10B981'
    },
    {
      key: 'revoked',
      icon: 'ri:close-circle-line',
      label: '已撤销 / 过期',
      value: stats.value.revoked + stats.value.expired,
      color: '#F56C6C'
    }
  ])

  function fieldLabelOf(f: string) {
    return (
      (
        {
          basics: '订单基础',
          customer: '客户信息',
          pricing: '价格明细',
          items: '商品清单',
          extra: '附加信息'
        } as Record<string, string>
      )[f] || f
    )
  }

  function statusTagOf(row: OrderShare) {
    if (row.revoked) return 'danger' as const
    if (row.expired) return 'info' as const
    return 'success' as const
  }
  function statusLabelOf(row: OrderShare) {
    if (row.revoked) return '已撤销'
    if (row.expired) return '已过期'
    return '活跃'
  }

  function rankClassOf(idx: number) {
    if (idx === 0) return 'pf-rank-1'
    if (idx === 1) return 'pf-rank-2'
    if (idx === 2) return 'pf-rank-3'
    return ''
  }

  async function reloadStats() {
    stats.value = await fetchOrderSharesStats()
  }

  async function reloadList() {
    loading.value = true
    try {
      // statusKey → revoked 参数翻译（active 仅靠 revoked=false 过滤，
      // 是否过期由前端展示层判断 row.expired 即可；后端接收 boolean）
      let revoked: boolean | undefined
      if (filters.statusKey === 'revoked') revoked = true
      else if (filters.statusKey === 'active') revoked = false

      const resp = await fetchOrderShares({
        merchantId: filters.merchantId ? filters.merchantId.trim() : undefined,
        revoked,
        startDate: filters.dateRange?.[0],
        endDate: filters.dateRange?.[1],
        page: page.value,
        pageSize: pageSize.value
      })
      list.value = resp.list
      total.value = resp.total
    } catch (e: any) {
      ElMessage.error(e?.message || '加载分享列表失败')
    } finally {
      loading.value = false
    }
  }

  async function reloadAll() {
    await Promise.all([reloadStats(), reloadList()])
  }

  function onSearch() {
    page.value = 1
    reloadList()
  }
  function onReset() {
    filters.merchantId = ''
    filters.statusKey = ''
    filters.dateRange = null
    page.value = 1
    reloadList()
  }
  function onSizeChange(size: number) {
    pageSize.value = size
    page.value = 1
    reloadList()
  }

  async function copyLink(row: OrderShare) {
    const url = row.shareUrl || ''
    if (!url) {
      ElMessage.warning('当前记录缺少分享链接')
      return
    }
    try {
      // 优先用 Clipboard API；浏览器兼容兜底再用 textarea
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      ElMessage.success('链接已复制')
    } catch {
      ElMessage.error('复制失败，请手动复制')
    }
  }

  function goOrder(row: OrderShare) {
    if (!row.orderId) return
    // 平台订单页是列表 + Drawer 模式，没有专门的详情路由；这里跳到列表并带上 keyword
    // 让运营手动点开详情。等订单详情页落地后可改为精确跳转。
    router.push({ path: '/platform/order/list', query: { keyword: row.orderNo || row.orderId } })
  }

  onMounted(reloadAll)
</script>

<style scoped lang="scss">
  .pf-os {
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

  .pf-grid-2 {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 14px;

    @media (width <= 1100px) {
      grid-template-columns: 1fr;
    }
  }

  .pf-card {
    border-radius: 12px;
  }

  .pf-card__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
  }

  .pf-empty {
    padding: 40px 0;
    font-size: 13px;
    color: #9ca3af;
    text-align: center;
  }

  .pf-top-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 240px;
    overflow-y: auto;
  }

  .pf-top-row {
    display: grid;
    grid-template-columns: 28px 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 8px 4px;
    border-bottom: 1px dashed rgb(0 0 0 / 6%);

    &:last-child {
      border-bottom: none;
    }
  }

  .pf-top-rank {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 12px;
    font-weight: 700;
    color: #9ca3af;
    background: #f3f4f6;
    border-radius: 6px;
  }

  .pf-rank-1 {
    color: #fff;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
  }

  .pf-rank-2 {
    color: #fff;
    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  }

  .pf-rank-3 {
    color: #fff;
    background: linear-gradient(135deg, #fb923c, #ea580c);
  }

  .pf-top-name {
    overflow: hidden;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pf-top-metric {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 48px;
  }

  .pf-top-metric__num {
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    color: var(--art-gray-800, #1f2937);
  }

  .pf-top-metric__label {
    margin-top: 2px;
    font-size: 11px;
    color: #9ca3af;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 12px 16px 0;
    }
  }

  .pf-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pf-mono {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 12px;
    color: var(--art-gray-700, #374151);
  }

  .pf-pager {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 4px;
  }
</style>
