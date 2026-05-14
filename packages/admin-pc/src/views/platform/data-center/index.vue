<!-- 平台 PC · 数据中心（S5-T4）-->
<template>
  <div class="pf-data">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">数据中心</h2>
        <p class="mt-1 text-sm text-g-500">平台多维度数据 · 实时趋势</p>
      </div>
      <div class="flex gap-2 items-center">
        <ElRadioGroup v-model="period" @change="load">
          <ElRadioButton value="today">今日</ElRadioButton>
          <ElRadioButton value="week">本周</ElRadioButton>
          <ElRadioButton value="month">本月</ElRadioButton>
          <ElRadioButton value="year">本年</ElRadioButton>
        </ElRadioGroup>
        <ElButton :icon="Download" plain @click="exportReport">导出</ElButton>
      </div>
    </div>

    <div class="pf-kpi-row">
      <ArtStatsCard
        v-for="k in kpis"
        :key="k.title"
        :title="k.title"
        :count="k.count"
        :description="k.desc"
        :icon="k.icon"
        :iconStyle="k.iconStyle as any"
        separator=","
      />
    </div>

    <ElCard shadow="hover" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span>趋势分析</span>
          <span class="text-xs text-g-500">{{ periodLabel }}</span>
        </div>
      </template>
      <ArtLineChart
        v-if="stats && stats.trend.length"
        height="320px"
        :data="stats.trend.map((t) => t.value)"
        :x-axis-data="stats.trend.map((t) => t.date)"
        show-area-color
      />
    </ElCard>

    <div class="pf-grid-2">
      <ElCard shadow="hover" class="pf-card">
        <template #header><div class="pf-card__title"><span>类目销售柱状</span></div></template>
        <ArtBarChart
          v-if="stats?.categoryBars.length"
          height="320px"
          :data="stats.categoryBars.map((c) => c.sales)"
          :x-axis-data="stats.categoryBars.map((c) => c.category)"
        />
      </ElCard>
      <ElCard shadow="hover" class="pf-card">
        <template #header><div class="pf-card__title"><span>会员套餐分布</span></div></template>
        <ArtRingChart
          v-if="memberData.length"
          height="320px"
          :data="memberData"
        />
      </ElCard>
    </div>

    <div class="pf-grid-2">
      <ElCard shadow="hover" class="pf-card">
        <template #header><div class="pf-card__title"><span>商户类型分布</span></div></template>
        <ArtRingChart v-if="merchantTypeData.length" height="280px" :data="merchantTypeData" />
      </ElCard>
      <ElCard shadow="hover" class="pf-card">
        <template #header><div class="pf-card__title"><span>类目销售占比</span></div></template>
        <ArtRingChart v-if="catRingData.length" height="280px" :data="catRingData" />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchPlatformDashboard,
    fetchPlatformStats,
    type StatsPeriod,
    type PlatformStats
  } from '@/api/platform-business'
  import type { PlatformDashboard } from '@jiujiu/shared/types'
  import { Download } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'PlatformDataCenter' })

  const period = ref<StatsPeriod>('week')
  const dash = ref<PlatformDashboard>()
  const stats = ref<PlatformStats>()

  const kpis = computed(() => {
    const o = dash.value?.overview
    return [
      { title: '商户总数', count: o?.merchants ?? 0, desc: `+${o?.merchantsDelta ?? 0}`, icon: 'ri:store-2-line', iconStyle: { color: '#FF4D2D', backgroundColor: '#FF4D2D18' } },
      { title: '订单总数', count: o?.orders ?? 0, desc: `+${o?.ordersDelta ?? 0}`, icon: 'ri:bill-line', iconStyle: { color: '#FF7A45', backgroundColor: '#FF7A4518' } },
      { title: '平台 GMV', count: o?.gmv ?? 0, desc: `+${o?.gmvDelta ?? 0}%`, icon: 'ri:money-cny-circle-line', iconStyle: { color: '#10B981', backgroundColor: '#10B98118' } },
      { title: '用户总数', count: o?.users ?? 0, desc: `+${o?.usersDelta ?? 0}`, icon: 'ri:user-3-line', iconStyle: { color: '#A855F7', backgroundColor: '#A855F718' } }
    ]
  })

  const periodLabel = computed(() =>
    ({ today: '今日 24 小时', week: '本周', month: '本月 30 天', year: '本年 12 月' })[period.value]
  )

  const memberData = computed(() => {
    const d = dash.value?.memberPlanDistribution
    if (!d) return []
    return [
      { name: '年费', value: d.yearly },
      { name: '月费', value: d.monthly },
      { name: '试用', value: d.trial }
    ]
  })

  const merchantTypeData = computed(() => {
    const d = dash.value?.merchantTypeDistribution
    if (!d) return []
    return [
      { name: '厂家', value: d.factory },
      { name: '门店', value: d.store }
    ]
  })

  const catRingData = computed(() => {
    const cats = dash.value?.categorySales || []
    return cats.map((c) => ({ name: c.category, value: c.value }))
  })

  function exportReport() {
    if (!stats.value || !dash.value) {
      ElMessage.warning('数据加载中，请稍候')
      return
    }
    const o = dash.value.overview
    const rows: string[][] = []
    rows.push(['经纬科技 · 平台数据报表'])
    rows.push(['导出周期', periodLabel.value])
    rows.push(['导出时间', new Date().toLocaleString('zh-CN')])
    rows.push([])
    rows.push(['核心指标'])
    rows.push(['商户总数', String(o.merchants), '+' + o.merchantsDelta])
    rows.push(['订单总数', String(o.orders), '+' + o.ordersDelta])
    rows.push(['平台 GMV', String(o.gmv), '+' + o.gmvDelta + '%'])
    rows.push(['用户总数', String(o.users), '+' + o.usersDelta])
    rows.push([])
    rows.push(['趋势分析', '数值'])
    stats.value.trend.forEach((t) => rows.push([t.date, String(t.value)]))
    rows.push([])
    rows.push(['类目销售', '销量'])
    stats.value.categoryBars.forEach((c) => rows.push([c.category, String(c.sales)]))
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `platform-stats-${period.value}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${rows.length} 行数据`)
  }

  async function load() {
    if (!dash.value) dash.value = await fetchPlatformDashboard()
    stats.value = await fetchPlatformStats(period.value)
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-data {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .pf-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .pf-card {
    border-radius: 12px;
  }

  .pf-card__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .pf-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  .text-g-500 {
    color: #6b7280;
  }
</style>
