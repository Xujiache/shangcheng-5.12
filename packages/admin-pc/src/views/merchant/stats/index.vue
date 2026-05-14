<!-- 商家 PC · 数据中心（S3.5-T2）-->
<template>
  <div class="mp-stats">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">数据中心</h2>
        <p class="mt-1 text-sm text-g-500">业务多维度分析 · 实时数据</p>
      </div>
      <div class="flex gap-2 items-center">
        <ElRadioGroup v-model="period" @change="load">
          <ElRadioButton value="today">今日</ElRadioButton>
          <ElRadioButton value="week">本周</ElRadioButton>
          <ElRadioButton value="month">本月</ElRadioButton>
          <ElRadioButton value="year">本年</ElRadioButton>
        </ElRadioGroup>
        <ElButton :icon="Download" plain @click="exportCsv">导出</ElButton>
      </div>
    </div>

    <!-- KPI -->
    <div class="mp-kpi-row">
      <ArtStatsCard
        v-for="(k, i) in kpis"
        :key="i"
        :title="k.title"
        :count="k.count"
        :description="k.desc"
        :icon="k.icon"
        :iconStyle="k.iconStyle"
        :decimals="k.decimals"
        separator=","
      />
    </div>

    <!-- 趋势 -->
    <ElCard shadow="hover" class="mp-card">
      <template #header>
        <div class="mp-card__title">
          <span>销售趋势</span>
          <span class="text-xs text-g-500">{{ periodLabel }}</span>
        </div>
      </template>
      <ArtLineChart
        v-if="trend"
        height="320px"
        :data="trendChartData"
        :x-axis-data="trendXAxis"
        show-area-color
      />
    </ElCard>

    <!-- 两栏 -->
    <div class="mp-grid-2">
      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title"><span>热销 Top10</span></div>
        </template>
        <ArtHBarChart
          v-if="trend?.topProducts.length"
          height="360px"
          :data="trend.topProducts.slice(0, 10).map((p) => p.sales)"
          :y-axis-data="trend.topProducts.slice(0, 10).map((p) => trunc(p.name))"
        />
      </ElCard>

      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title"><span>类目销售占比</span></div>
        </template>
        <ArtRingChart v-if="categoryData.length" height="360px" :data="categoryData" />
      </ElCard>
    </div>

    <div class="mp-grid-2">
      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title"><span>新老客户对比</span></div>
        </template>
        <ArtRingChart v-if="customerData.length" height="280px" :data="customerData" />
      </ElCard>

      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title"><span>类目销量柱状</span></div>
        </template>
        <ArtBarChart
          v-if="trend?.categoryBars.length"
          height="280px"
          :data="trend.categoryBars.map((c) => c.sales)"
          :x-axis-data="trend.categoryBars.map((c) => c.category)"
        />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchMerchantDashboard, type DashboardData } from '@/api/merchant-business'
  import type { MerchantStats } from '@jiujiu/shared/types'
  import { Download } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'MerchantStats' })

  const period = ref<MerchantStats['period']>('week')
  const stats = ref<DashboardData['stats']>()
  const trend = ref<DashboardData['trend']>()

  const periodLabel = computed(
    () =>
      ({ today: '今日 24 小时', week: '最近 7 天', month: '最近 30 天', year: '最近 12 个月' })[
        period.value
      ]
  )

  const kpis = computed(() => {
    const t = stats.value?.today
    if (!t) return []
    const fmt = (n: number) => `${n >= 0 ? '↑' : '↓'} ${Math.abs(n)}% 较上一周期`
    return [
      {
        title: '销售额',
        count: t.sales,
        decimals: 0,
        desc: fmt(t.salesDelta),
        icon: 'ri:money-cny-circle-line',
        iconStyle: 'bg-[#FF4D2D]'
      },
      {
        title: '订单数',
        count: t.orders,
        decimals: 0,
        desc: fmt(t.ordersDelta),
        icon: 'ri:shopping-bag-3-line',
        iconStyle: 'bg-[#3B82F6]'
      },
      {
        title: '客单价',
        count: Math.round(t.sales / Math.max(t.orders, 1)),
        decimals: 0,
        desc: '环比 +3%',
        icon: 'ri:line-chart-fill',
        iconStyle: 'bg-[#10B981]'
      },
      {
        title: '新增客户',
        count: t.newCustomers,
        decimals: 0,
        desc: fmt(t.newCustomersDelta),
        icon: 'ri:user-add-line',
        iconStyle: 'bg-[#A855F7]'
      }
    ]
  })

  const trendChartData = computed(() => {
    if (!trend.value) return []
    return [{ name: '销售额', data: trend.value.salesTrend.map((p) => p.value) }]
  })

  const trendXAxis = computed(() => trend.value?.salesTrend.map((p) => p.date) || [])

  const categoryData = computed(
    () => trend.value?.categoryBars.map((c) => ({ name: c.category, value: c.sales })) || []
  )

  const customerData = computed(() => {
    if (!trend.value) return []
    const { newRatio, oldRatio } = trend.value.customerAnalysis
    return [
      { name: '新客户', value: Math.round(newRatio * 100) },
      { name: '老客户', value: Math.round(oldRatio * 100) }
    ]
  })

  function trunc(s: string) {
    return s.length > 12 ? s.slice(0, 12) + '...' : s
  }

  /**
   * 前端 CSV 导出
   *
   * 直接基于已经拉到的 dashboard / trend 数据拼装，Blob + URL.createObjectURL
   * 触发下载；参照 `views/platform/data-center/index.vue` 已有方案，避免引入
   * 新依赖。包含核心 KPI / 趋势 / 类目 / 热销 / 新老客户分布五块业务字段。
   */
  function exportCsv() {
    if (!stats.value || !trend.value) {
      ElMessage.warning('数据加载中，请稍候')
      return
    }
    const t = stats.value.today
    const rows: string[][] = []
    rows.push(['经纬科技 · 商家数据报表'])
    rows.push(['导出周期', periodLabel.value])
    rows.push(['导出时间', new Date().toLocaleString('zh-CN')])
    rows.push([])
    rows.push(['核心指标'])
    rows.push(['销售额', String(t.sales), fmtDelta(t.salesDelta)])
    rows.push(['订单数', String(t.orders), fmtDelta(t.ordersDelta)])
    rows.push(['客单价', String(Math.round(t.sales / Math.max(t.orders, 1)))])
    rows.push(['新增客户', String(t.newCustomers), fmtDelta(t.newCustomersDelta)])
    rows.push([])
    rows.push(['销售趋势', '销售额'])
    trend.value.salesTrend.forEach((p) => rows.push([p.date, String(p.value)]))
    rows.push([])
    rows.push(['热销 Top10', '销量'])
    trend.value.topProducts.slice(0, 10).forEach((p) => rows.push([p.name, String(p.sales)]))
    rows.push([])
    rows.push(['类目销售', '销量'])
    trend.value.categoryBars.forEach((c) => rows.push([c.category, String(c.sales)]))
    rows.push([])
    rows.push(['新老客户对比', '占比'])
    const ca = trend.value.customerAnalysis
    rows.push(['新客户', Math.round(ca.newRatio * 100) + '%'])
    rows.push(['老客户', Math.round(ca.oldRatio * 100) + '%'])

    const csv =
      '\ufeff' +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `merchant-stats-${period.value}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${rows.length} 行数据`)
  }

  function fmtDelta(n: number) {
    return `${n >= 0 ? '+' : '-'}${Math.abs(n)}%`
  }

  async function load() {
    const d = await fetchMerchantDashboard(period.value)
    stats.value = d.stats
    trend.value = d.trend
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-stats {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .mp-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (width <= 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .mp-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    @media (width <= 1100px) {
      grid-template-columns: 1fr;
    }
  }

  .mp-card {
    border-radius: 12px;
  }

  .mp-card__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 15px;
    font-weight: 600;
  }
</style>
