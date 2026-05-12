<!-- 平台 PC · 数据驾驶舱（S5-T1）-->
<template>
  <div class="pf-dashboard">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">数据驾驶舱</h2>
        <p class="mt-1 text-sm text-g-500">平台总览 · 实时数据 · 待办处理</p>
      </div>
      <ElButton :icon="Refresh" @click="load" plain>刷新</ElButton>
    </div>

    <!-- KPI 4 卡 -->
    <div class="pf-kpi-row">
      <ArtStatsCard
        v-for="k in kpis"
        :key="k.title"
        :title="k.title"
        :count="k.count"
        :description="k.desc"
        :icon="k.icon"
        :iconStyle="k.iconStyle"
        separator=","
      />
    </div>

    <!-- 注册趋势 -->
    <ElCard shadow="hover" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span>近 14 日新用户注册</span>
          <span class="text-xs text-g-500">合计 {{ totalReg }} 人</span>
        </div>
      </template>
      <ArtLineChart
        v-if="trendData.length"
        height="280px"
        :data="trendData"
        :x-axis-data="trendXAxis"
        show-area-color
      />
    </ElCard>

    <div class="pf-grid-2">
      <!-- 待办 -->
      <ElCard shadow="hover" class="pf-card pf-todo">
        <template #header>
          <div class="pf-card__title">
            <span><ArtSvgIcon icon="ri:flashlight-line" class="text-primary" /> 待办</span>
            <ElTag size="small" type="danger">{{ totalTodos }}</ElTag>
          </div>
        </template>
        <div class="pf-todo__list">
          <div v-for="t in todoList" :key="t.key" class="pf-todo__row" @click="onTodo(t)">
            <div class="pf-todo__icon" :style="{ background: t.tint + '18', color: t.tint }">
              <ArtSvgIcon :icon="t.icon" />
            </div>
            <span class="flex-1">{{ t.label }}</span>
            <ElBadge v-if="t.count > 0" :value="t.count" :max="99" type="primary" />
            <span v-else class="text-xs text-g-500">已清空</span>
            <ArtSvgIcon icon="ri:arrow-right-s-line" class="text-g-400" />
          </div>
        </div>
      </ElCard>

      <!-- 快捷入口 -->
      <ElCard shadow="hover" class="pf-card">
        <template #header><div class="pf-card__title"><span>快捷入口</span></div></template>
        <div class="pf-entries">
          <div v-for="e in entries" :key="e.key" class="pf-entry" @click="go(e.to)">
            <div class="pf-entry__icon" :style="{ background: e.tint + '18', color: e.tint }">
              <ArtSvgIcon :icon="e.icon" />
            </div>
            <span class="pf-entry__label">{{ e.label }}</span>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchPlatformDashboard } from '@/api/platform-business'
  import type { PlatformDashboard } from '@jiujiu/shared/types'
  import { Refresh } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { useRouter } from 'vue-router'

  defineOptions({ name: 'PlatformDashboard' })

  const router = useRouter()
  const data = ref<PlatformDashboard>()

  const kpis = computed(() => {
    const o = data.value?.overview
    return [
      { title: '商户总数', count: o?.merchants ?? 0, desc: `今日 +${o?.merchantsDelta ?? 0}`, icon: 'ri:store-2-line', iconStyle: { color: '#FF4D2D', backgroundColor: '#FF4D2D18' } },
      { title: '订单总数', count: o?.orders ?? 0, desc: `今日 +${o?.ordersDelta ?? 0}`, icon: 'ri:bill-line', iconStyle: { color: '#FF7A45', backgroundColor: '#FF7A4518' } },
      { title: '平台 GMV', count: o?.gmv ?? 0, desc: `+${o?.gmvDelta ?? 0}%`, icon: 'ri:money-cny-circle-line', iconStyle: { color: '#10B981', backgroundColor: '#10B98118' } },
      { title: '用户总数', count: o?.users ?? 0, desc: `今日 +${o?.usersDelta ?? 0}`, icon: 'ri:user-3-line', iconStyle: { color: '#A855F7', backgroundColor: '#A855F718' } }
    ]
  })

  const trend14 = computed(() => data.value?.registrationTrend?.slice(-14) || [])
  const trendData = computed(() => trend14.value.map((d) => d.value))
  const trendXAxis = computed(() => trend14.value.map((d) => d.date.slice(5)))
  const totalReg = computed(() => trend14.value.reduce((s, x) => s + x.value, 0))

  const todoList = computed(() => {
    const t = data.value?.todos
    return [
      { key: 'merchant', icon: 'ri:store-2-line', label: '待审核商户', count: t?.pendingMerchants ?? 0, tint: '#FF4D2D', to: '/platform/audit/merchant' },
      { key: 'product', icon: 'ri:price-tag-2-line', label: '待审核商品', count: t?.pendingProducts ?? 0, tint: '#FF7A45', to: '/platform/audit/product' },
      { key: 'ad', icon: 'ri:advertisement-line', label: '广告创意待审', count: t?.pendingAds ?? 0, tint: '#FAAD14', to: '/platform/ad' },
      { key: 'complaint', icon: 'ri:customer-service-2-line', label: '售后投诉', count: t?.complaints ?? 0, tint: '#F56C6C', to: '/platform/order/list' },
      { key: 'withdraw', icon: 'ri:wallet-line', label: '待审核提现', count: t?.pendingWithdraws ?? 0, tint: '#A855F7', to: '/platform/member/orders' }
    ]
  })
  const totalTodos = computed(() => todoList.value.reduce((s, x) => s + x.count, 0))

  const entries = [
    { key: 'merchant', icon: 'ri:store-2-line', label: '商户', tint: '#FF4D2D', to: '/platform/merchant/list' },
    { key: 'audit-product', icon: 'ri:price-tag-2-line', label: '商品审核', tint: '#FF7A45', to: '/platform/audit/product' },
    { key: 'ad', icon: 'ri:advertisement-line', label: '广告', tint: '#FAAD14', to: '/platform/ad' },
    { key: 'plaza', icon: 'ri:store-3-line', label: '选品广场', tint: '#10B981', to: '/platform/plaza' },
    { key: 'member', icon: 'ri:vip-crown-2-line', label: '会员', tint: '#A855F7', to: '/platform/member/plan' },
    { key: 'flag', icon: 'ri:toggle-line', label: '功能开关', tint: '#3B82F6', to: '/platform/feature-flag' },
    { key: 'perm', icon: 'ri:shield-user-line', label: '权限', tint: '#86909C', to: '/platform/permission' },
    { key: 'system', icon: 'ri:settings-3-line', label: '系统', tint: '#0EA5E9', to: '/platform/system' }
  ]

  function onTodo(t: (typeof todoList.value)[number]) {
    if (t.count === 0) {
      ElMessage.info(t.label + ' · 暂无待处理')
      return
    }
    router.push(t.to)
  }

  function go(to: string) {
    router.push(to)
  }

  async function load() {
    data.value = await fetchPlatformDashboard()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-dashboard {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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

    .text-primary {
      color: var(--el-color-primary, #ff4d2d);
    }
  }

  .pf-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  /* 待办 */
  .pf-todo__list {
    display: flex;
    flex-direction: column;
  }

  .pf-todo__row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 4px;
    cursor: pointer;
    border-bottom: 1px dashed var(--art-border-color, #e5e7eb);
    transition: background 0.18s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--art-bg-hover, #fafbfc);
    }
  }

  .pf-todo__icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  /* 快捷入口 */
  .pf-entries {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (max-width: 700px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .pf-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 6px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.18s;

    &:hover {
      background: rgba(255, 77, 45, 0.04);
      transform: translateY(-2px);
    }
  }

  .pf-entry__icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }

  .pf-entry__label {
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .text-g-400 {
    color: #9ca3af;
  }
  .text-g-500 {
    color: #6b7280;
  }
</style>
