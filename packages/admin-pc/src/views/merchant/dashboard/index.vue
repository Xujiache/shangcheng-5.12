<!-- 商家 PC · 数据概览（S3-T1） -->
<template>
  <div class="mp-dashboard">
    <!-- 顶部欢迎条 + 周期切换 -->
    <div class="mp-dashboard__top">
      <div>
        <h2 class="m-0 text-xl font-semibold">{{ greetingText }}，王老板 👋</h2>
        <p class="mt-1 text-sm text-g-500">
          今天 · 销售 ¥{{ stats?.today.sales.toLocaleString() }}，订单 {{ stats?.today.orders }} 单
        </p>
      </div>
      <ElRadioGroup v-model="period" size="default" @change="loadData">
        <ElRadioButton value="today">今日</ElRadioButton>
        <ElRadioButton value="week">本周</ElRadioButton>
        <ElRadioButton value="month">本月</ElRadioButton>
        <ElRadioButton value="year">本年</ElRadioButton>
      </ElRadioGroup>
    </div>

    <!-- 会员状态反馈条 -->
    <div v-if="notices.length" class="mp-notices">
      <ElAlert
        v-for="(n, i) in notices"
        :key="i"
        :type="n.level === 'danger' ? 'error' : n.level"
        :closable="false"
        show-icon
        :title="n.title"
        :description="n.desc"
      >
        <template #default>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="font-medium">{{ n.title }}</div>
              <div class="text-xs">{{ n.desc }}</div>
            </div>
            <ElButton v-if="n.cta" size="small" :type="n.level === 'danger' ? 'danger' : 'primary'" plain @click="$router.push(n.cta.to)">
              {{ n.cta.label }}
            </ElButton>
          </div>
        </template>
      </ElAlert>
    </div>

    <!-- KPI 4 卡 -->
    <div class="mp-kpi-row">
      <ArtStatsCard
        v-for="(item, i) in kpiList"
        :key="i"
        :title="item.title"
        :count="item.count"
        :description="item.desc"
        :icon="item.icon"
        :iconStyle="item.iconStyle"
        :separator="item.separator || ','"
        :decimals="item.decimals"
      />
    </div>

    <!-- 主图表区 -->
    <div class="mp-grid-2">
      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title">
            <span>销售趋势</span>
            <span class="text-xs text-g-500">最近 {{ trendLabel }}</span>
          </div>
        </template>
        <ArtLineChart
          v-if="trend"
          height="280px"
          :data="trendChartData"
          :x-axis-data="trendXAxis"
          show-area-color
        />
      </ElCard>

      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title">
            <span>类目销售占比</span>
            <span class="text-xs text-g-500">{{ trendLabel }}</span>
          </div>
        </template>
        <ArtRingChart
          v-if="categoryRingData.length"
          height="280px"
          :data="categoryRingData"
        />
      </ElCard>
    </div>

    <!-- 第二行：商品 Top + 待办 -->
    <div class="mp-grid-2">
      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title">
            <span>热销商品 Top 10</span>
            <ElLink type="primary" :underline="false" @click="goToList">查看全部</ElLink>
          </div>
        </template>
        <ArtHBarChart
          v-if="topProductData.length"
          height="320px"
          :data="topProductData.map((p) => p.value)"
          :y-axis-data="topProductData.map((p) => p.name)"
        />
      </ElCard>

      <ElCard shadow="hover" class="mp-card">
        <template #header>
          <div class="mp-card__title">
            <span>待办事项</span>
            <ElBadge :value="totalTodos" class="todo-badge" :hidden="totalTodos === 0" />
          </div>
        </template>
        <div class="mp-todos">
          <div
            v-for="todo in todoList"
            :key="todo.key"
            class="mp-todo-item"
            @click="goTodo(todo.key)"
          >
            <div class="mp-todo-icon" :style="{ background: todo.color }">
              <ArtSvgIcon :icon="todo.icon" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="mp-todo-label">{{ todo.label }}</div>
              <div class="text-xs text-g-500 mt-1">{{ todo.subLabel }}</div>
            </div>
            <div class="mp-todo-count" :class="{ zero: todo.count === 0 }">
              {{ todo.count }}
            </div>
          </div>
        </div>
      </ElCard>
    </div>

    <!-- 快捷入口 -->
    <ElCard shadow="hover" class="mp-card">
      <template #header>
        <div class="mp-card__title">
          <span>常用入口</span>
        </div>
      </template>
      <div class="mp-quick-row">
        <div
          v-for="q in quickEntries"
          :key="q.path"
          class="mp-quick"
          @click="router.push(q.path)"
        >
          <div class="mp-quick__icon" :style="{ color: q.color }">
            <ArtSvgIcon :icon="q.icon" />
          </div>
          <span class="mp-quick__text">{{ q.label }}</span>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMerchantDashboard,
    fetchMembershipNotices,
    type DashboardData,
    type MembershipNotice
  } from '@/api/merchant-business'
  import type { MerchantStats } from '@jiujiu/shared/types'

  defineOptions({ name: 'MerchantDashboard' })

  const router = useRouter()

  const period = ref<MerchantStats['period']>('week')
  const stats = ref<DashboardData['stats']>()
  const trend = ref<DashboardData['trend']>()
  const notices = ref<MembershipNotice[]>([])

  const greetingText = computed(() => {
    const h = new Date().getHours()
    if (h < 6) return '凌晨好'
    if (h < 12) return '上午好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  })

  const trendLabel = computed(() =>
    period.value === 'today'
      ? '24 小时'
      : period.value === 'week'
        ? '7 天'
        : period.value === 'month'
          ? '30 天'
          : '12 月'
  )

  const kpiList = computed(() => {
    const t = stats.value?.today
    if (!t) return []
    const fmtDelta = (n: number) =>
      `${n >= 0 ? '↑' : '↓'} ${Math.abs(n)}% 较昨日`
    return [
      {
        title: '今日销售额',
        count: t.sales,
        decimals: 0,
        separator: ',',
        desc: fmtDelta(t.salesDelta),
        icon: 'ri:money-cny-circle-line',
        iconStyle: 'bg-[#FF4D2D]'
      },
      {
        title: '今日订单',
        count: t.orders,
        desc: fmtDelta(t.ordersDelta),
        icon: 'ri:shopping-bag-3-line',
        iconStyle: 'bg-[#3B82F6]'
      },
      {
        title: '新增客户',
        count: t.newCustomers,
        desc: fmtDelta(t.newCustomersDelta),
        icon: 'ri:user-add-line',
        iconStyle: 'bg-[#10B981]'
      },
      {
        title: '在售商品',
        count: 38,
        desc: '待审核 2 · 已下架 5',
        icon: 'ri:price-tag-3-line',
        iconStyle: 'bg-[#A855F7]'
      }
    ]
  })

  const trendChartData = computed(() => {
    if (!trend.value) return []
    return [
      {
        name: '销售额',
        data: trend.value.salesTrend.map((p) => p.value)
      }
    ]
  })

  const trendXAxis = computed(() => trend.value?.salesTrend.map((p) => p.date) || [])

  const categoryRingData = computed(() => {
    if (!trend.value) return []
    return trend.value.categoryBars.map((c) => ({ name: c.category, value: c.sales }))
  })

  const topProductData = computed(() => {
    if (!trend.value) return []
    return trend.value.topProducts.slice(0, 10).map((p) => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
      value: p.sales
    }))
  })

  const todoList = computed(() => {
    const t = stats.value?.todos
    if (!t) return []
    return [
      {
        key: 'shipment',
        label: '待发货订单',
        subLabel: '今天 12:00 前发货',
        icon: 'ri:truck-line',
        color: 'linear-gradient(135deg,#FF7A45,#FF4D2D)',
        count: t.pendingShipment
      },
      {
        key: 'refund',
        label: '待处理售后',
        subLabel: '7 天内必须处理',
        icon: 'ri:customer-service-2-line',
        color: 'linear-gradient(135deg,#F97316,#EA580C)',
        count: t.pendingRefund
      },
      {
        key: 'store',
        label: '门店授权待批',
        subLabel: '员工绑定中',
        icon: 'ri:store-2-line',
        color: 'linear-gradient(135deg,#6366F1,#4F46E5)',
        count: t.pendingStoreAuth
      },
      {
        key: 'plaza',
        label: '广场新推送',
        subLabel: '可代理商品',
        icon: 'ri:advertisement-line',
        color: 'linear-gradient(135deg,#10B981,#059669)',
        count: stats.value?.plazaHighlights?.length || 0
      },
      {
        key: 'review',
        label: '新评价',
        subLabel: '本周',
        icon: 'ri:chat-1-line',
        color: 'linear-gradient(135deg,#0EA5E9,#0284C7)',
        count: 12
      }
    ]
  })

  const totalTodos = computed(() => todoList.value.reduce((acc, t) => acc + (t.count || 0), 0))

  const quickEntries = [
    { label: '添加商品', icon: 'ri:add-box-line', color: '#FF4D2D', path: '/merchant/product/add' },
    { label: '订单管理', icon: 'ri:file-list-3-line', color: '#3B82F6', path: '/merchant/order/list' },
    { label: '客户管理', icon: 'ri:user-heart-line', color: '#10B981', path: '/merchant/customer' },
    { label: '营销中心', icon: 'ri:speaker-3-line', color: '#A855F7', path: '/merchant/marketing' },
    { label: '代理商品', icon: 'ri:link-m', color: '#F59E0B', path: '/merchant/product/agency' },
    { label: '分类管理', icon: 'ri:folder-3-line', color: '#06B6D4', path: '/merchant/product/category' }
  ]

  function goTodo(key: string) {
    if (key === 'shipment' || key === 'review') router.push('/merchant/order/list')
    else if (key === 'refund') router.push('/merchant/order/aftersale')
    else if (key === 'plaza') router.push('/merchant/product/agency')
    else router.push('/merchant/product/list')
  }

  function goToList() {
    router.push('/merchant/product/list')
  }

  async function loadData() {
    const data = await fetchMerchantDashboard(period.value)
    stats.value = data.stats
    trend.value = data.trend
    notices.value = await fetchMembershipNotices()
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-dashboard {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mp-dashboard__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 4px;
  }

  .mp-notices {
    display: flex;
    flex-direction: column;
    gap: 8px;

    :deep(.el-alert__description) {
      margin-top: 0;
    }
  }

  .mp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .mp-grid-2 {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 14px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  .mp-card {
    border-radius: 12px;
  }

  .mp-card__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    font-size: 15px;
    font-weight: 600;
  }

  .todo-badge :deep(.el-badge__content) {
    background: var(--el-color-primary, #ff4d2d);
  }

  .mp-todos {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mp-todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--art-bg-color, #fafbfc);
    cursor: pointer;
    transition: all 0.18s ease;

    &:hover {
      background: rgba(255, 77, 45, 0.06);
      transform: translateX(2px);
    }
  }

  .mp-todo-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    flex-shrink: 0;
  }

  .mp-todo-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--art-gray-800, #1f2937);
  }

  .mp-todo-count {
    font-size: 22px;
    font-weight: 700;
    color: var(--el-color-primary, #ff4d2d);

    &.zero {
      color: var(--art-gray-400, #9ca3af);
    }
  }

  .mp-quick-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .mp-quick {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 18px 0;
    border-radius: 12px;
    background: var(--art-bg-color, #fafbfc);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 77, 45, 0.06);
      transform: translateY(-2px);
      box-shadow: 0 6px 18px -10px rgba(255, 77, 45, 0.3);
    }
  }

  .mp-quick__icon {
    font-size: 26px;
  }

  .mp-quick__text {
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }
</style>
