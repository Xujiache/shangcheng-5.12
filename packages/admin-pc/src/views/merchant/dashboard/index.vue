<!-- 商家 PC · 工作台首页（待办 + 快捷入口；详细数据见 数据中心） -->
<template>
  <div class="mp-dashboard">
    <!-- 顶部欢迎条 -->
    <div class="mp-hero">
      <div class="mp-hero__bg" />
      <div class="mp-hero__content">
        <div>
          <h2 class="mp-hero__title">{{ greetingText }}，{{ nickName }} 👋</h2>
          <p class="mp-hero__sub">
            待办 <b class="mp-hero__num">{{ totalTodos }}</b> 项 · 详细经营数据请前往
            <a class="mp-hero__link" @click="router.push('/merchant/stats')">数据中心</a>
          </p>
        </div>
        <div class="mp-hero__date">
          <div class="mp-hero__weekday">{{ today.weekday }}</div>
          <div class="mp-hero__day">{{ today.day }}</div>
          <div class="mp-hero__month">{{ today.month }}月 · {{ today.year }}</div>
        </div>
      </div>
    </div>

    <!-- 会员状态反馈条（保留：套餐到期提醒等） -->
    <div v-if="notices.length" class="mp-notices">
      <ElAlert
        v-for="(n, i) in notices"
        :key="i"
        :type="n.level === 'danger' ? 'error' : n.level"
        :closable="false"
        show-icon
      >
        <template #default>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="font-medium">{{ n.title }}</div>
              <div class="text-xs">{{ n.desc }}</div>
            </div>
            <ElButton
              v-if="n.cta"
              size="small"
              :type="n.level === 'danger' ? 'danger' : 'primary'"
              plain
              @click="router.push(n.cta.to)"
            >
              {{ n.cta.label }}
            </ElButton>
          </div>
        </template>
      </ElAlert>
    </div>

    <div class="mp-grid-2">
      <!-- 待办 -->
      <ElCard shadow="never" class="mp-card mp-todo-card" v-loading="loading">
        <template #header>
          <div class="mp-card__title">
            <span class="mp-card__title-text">
              <ArtSvgIcon icon="ri:flashlight-fill" class="mp-card__title-icon" />
              待办事项
            </span>
            <ElTag v-if="totalTodos > 0" size="small" type="danger" round>
              {{ totalTodos }} 项待处理
            </ElTag>
            <ElTag v-else size="small" type="success" round>全部处理完毕</ElTag>
          </div>
        </template>
        <div class="mp-todo__list">
          <div
            v-for="t in todoList"
            :key="t.key"
            class="mp-todo__row"
            :class="{ 'mp-todo__row--empty': t.count === 0 }"
            @click="goTodo(t.key)"
          >
            <div class="mp-todo__icon" :style="{ background: t.tint + '18', color: t.tint }">
              <ArtSvgIcon :icon="t.icon" />
            </div>
            <div class="mp-todo__body">
              <div class="mp-todo__label">{{ t.label }}</div>
              <div class="mp-todo__desc">{{ t.subLabel }}</div>
            </div>
            <div class="mp-todo__count">
              <ElBadge v-if="t.count > 0" :value="t.count" :max="99" type="primary" />
              <span v-else class="mp-todo__empty">— 已清空</span>
            </div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" class="mp-todo__arrow" />
          </div>
        </div>
      </ElCard>

      <!-- 快捷入口 -->
      <ElCard shadow="never" class="mp-card mp-entries-card">
        <template #header>
          <div class="mp-card__title">
            <span class="mp-card__title-text">
              <ArtSvgIcon icon="ri:apps-2-fill" class="mp-card__title-icon" />
              常用入口
            </span>
            <span class="text-xs text-g-500">{{ quickEntries.length }} 个常用功能</span>
          </div>
        </template>
        <div class="mp-entries">
          <div
            v-for="e in quickEntries"
            :key="e.path"
            class="mp-entry"
            :style="{ '--entry-tint': e.color }"
            @click="router.push(e.path)"
          >
            <div
              class="mp-entry__icon"
              :style="{ background: `linear-gradient(135deg, ${e.color}, ${e.color}cc)` }"
            >
              <ArtSvgIcon :icon="e.icon" />
            </div>
            <span class="mp-entry__label">{{ e.label }}</span>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMerchantDashboard,
    fetchMembershipNotices,
    type DashboardData,
    type MembershipNotice
  } from '@/api/merchant-business'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'MerchantDashboard' })

  const router = useRouter()
  const userStore = useUserStore()

  const stats = ref<DashboardData['stats']>()
  const notices = ref<MembershipNotice[]>([])
  const loading = ref(false)

  /* ====== 顶部 hero ====== */
  const now = new Date()
  const greetingText = computed(() => {
    const h = now.getHours()
    if (h < 6) return '凌晨好'
    if (h < 12) return '上午好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  })
  const today = {
    weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()],
    day: String(now.getDate()).padStart(2, '0'),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: now.getFullYear()
  }
  const nickName = computed(() => userStore.info?.nickname || userStore.info?.userName || '老板')

  /* ====== 待办 ====== */
  const todoList = computed(() => {
    const t = stats.value?.todos
    return [
      {
        key: 'shipment',
        label: '待发货订单',
        subLabel: '今天 12:00 前发货',
        icon: 'ri:truck-line',
        tint: '#FF4D2D',
        count: t?.pendingShipment ?? 0
      },
      {
        key: 'refund',
        label: '待处理售后',
        subLabel: '7 天内必须处理',
        icon: 'ri:customer-service-2-line',
        tint: '#F97316',
        count: t?.pendingRefund ?? 0
      },
      {
        key: 'store',
        label: '门店授权待批',
        subLabel: '员工绑定中',
        icon: 'ri:store-2-line',
        tint: '#6366F1',
        count: t?.pendingStoreAuth ?? 0
      },
      {
        key: 'plaza',
        label: '广场新推送',
        subLabel: '可代理商品',
        icon: 'ri:advertisement-line',
        tint: '#10B981',
        count: stats.value?.plazaHighlights?.length ?? 0
      },
      {
        key: 'review',
        label: '新评价',
        subLabel: '本周',
        icon: 'ri:chat-1-line',
        tint: '#0EA5E9',
        count: 12
      }
    ]
  })
  const totalTodos = computed(() => todoList.value.reduce((s, t) => s + (t.count || 0), 0))

  /* ====== 快捷入口 ====== */
  const quickEntries = [
    { label: '添加商品', icon: 'ri:add-box-line', color: '#FF4D2D', path: '/merchant/product/add' },
    { label: '在售商品', icon: 'ri:price-tag-3-line', color: '#FF7A45', path: '/merchant/product/list' },
    { label: '分类管理', icon: 'ri:folder-3-line', color: '#06B6D4', path: '/merchant/product/category' },
    { label: '代理厂家', icon: 'ri:store-2-line', color: '#F59E0B', path: '/merchant/product/agency' },
    { label: '选品广场', icon: 'ri:store-3-line', color: '#10B981', path: '/merchant/plaza' },
    { label: '订单管理', icon: 'ri:file-list-3-line', color: '#3B82F6', path: '/merchant/order/list' },
    { label: '售后处理', icon: 'ri:customer-service-2-line', color: '#F56C6C', path: '/merchant/order/aftersale' },
    { label: '客户管理', icon: 'ri:user-heart-line', color: '#22C55E', path: '/merchant/customer' },
    { label: '营销中心', icon: 'ri:speaker-3-line', color: '#A855F7', path: '/merchant/marketing' },
    { label: '门店管理', icon: 'ri:community-line', color: '#8B5CF6', path: '/merchant/store' },
    { label: '员工管理', icon: 'ri:team-line', color: '#7C3AED', path: '/merchant/staff' },
    { label: '佣金结算', icon: 'ri:wallet-3-line', color: '#0EA5E9', path: '/merchant/commission' },
    { label: '我的会员', icon: 'ri:vip-crown-2-line', color: '#A855F7', path: '/merchant/member' },
    { label: '数据中心', icon: 'ri:bar-chart-2-line', color: '#67C23A', path: '/merchant/stats' }
  ]

  function goTodo(key: string) {
    if (key === 'shipment' || key === 'review') router.push('/merchant/order/list')
    else if (key === 'refund') router.push('/merchant/order/aftersale')
    else if (key === 'plaza') router.push('/merchant/product/agency')
    else if (key === 'store') router.push('/merchant/store')
    else router.push('/merchant/product/list')
  }

  async function loadData() {
    loading.value = true
    try {
      const data = await fetchMerchantDashboard('today')
      stats.value = data.stats
      notices.value = await fetchMembershipNotices()
    } finally {
      loading.value = false
    }
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

  /* ============ 顶部 hero 条 ============ */
  .mp-hero {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    color: #fff;
    background: linear-gradient(135deg, #ff4d2d 0%, #ff7a45 60%, #faad14 100%);
    min-height: 120px;
    display: flex;
    align-items: center;

    &__bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 88% 30%, rgba(255, 255, 255, 0.18) 0%, transparent 32%),
        radial-gradient(circle at 12% 75%, rgba(255, 255, 255, 0.12) 0%, transparent 28%);
    }

    &__content {
      position: relative;
      z-index: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28px 32px;
    }

    &__title {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      line-height: 1.3;
    }

    &__sub {
      margin: 8px 0 0;
      font-size: 13px;
      opacity: 0.92;
    }

    &__num {
      font-size: 16px;
      font-weight: 700;
      margin: 0 4px;
    }

    &__link {
      color: #fff;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
      margin-left: 4px;

      &:hover {
        opacity: 0.85;
      }
    }

    &__date {
      text-align: right;
      line-height: 1.1;
    }

    &__weekday {
      font-size: 13px;
      opacity: 0.85;
    }

    &__day {
      font-size: 42px;
      font-weight: 700;
      letter-spacing: -1px;
      margin: 2px 0;
    }

    &__month {
      font-size: 12px;
      opacity: 0.85;
    }
  }

  .mp-notices {
    display: flex;
    flex-direction: column;
    gap: 8px;

    :deep(.el-alert__description) {
      margin-top: 0;
    }
  }

  /* ============ Card 通用 ============ */
  .mp-card {
    border-radius: 14px;
    border: 1px solid #f0f1f3;

    :deep(.el-card__header) {
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f5f6f8;
    }

    :deep(.el-card__body) {
      padding: 12px 8px;
    }
  }

  .mp-card__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mp-card__title-text {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 15px;
  }

  .mp-card__title-icon {
    color: var(--el-color-primary, #ff4d2d);
    font-size: 18px;
  }

  /* ============ 双栏 ============ */
  .mp-grid-2 {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 16px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  /* ============ 待办 ============ */
  .mp-todo__list {
    display: flex;
    flex-direction: column;
    padding: 0 4px;
  }

  .mp-todo__row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 1px dashed #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: linear-gradient(90deg, rgba(255, 77, 45, 0.06), transparent);
      transform: translateX(2px);
    }

    &--empty {
      opacity: 0.55;

      &:hover {
        transform: none;
        background: rgba(0, 0, 0, 0.02);
      }
    }
  }

  .mp-todo__icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .mp-todo__body {
    flex: 1;
    min-width: 0;
  }

  .mp-todo__label {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .mp-todo__desc {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }

  .mp-todo__count {
    min-width: 64px;
    text-align: right;
    padding-right: 8px;
  }

  .mp-todo__empty {
    font-size: 12px;
    color: #c0c4cc;
  }

  .mp-todo__arrow {
    color: #c0c4cc;
    font-size: 18px;
    flex-shrink: 0;
  }

  /* ============ 快捷入口 ============ */
  .mp-entries {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 8px 4px 4px;

    @media (max-width: 700px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .mp-entry {
    --entry-tint: #ff4d2d;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 18px 6px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.22s ease;

    &:hover {
      background: color-mix(in srgb, var(--entry-tint) 6%, transparent);
      transform: translateY(-3px);

      .mp-entry__icon {
        transform: scale(1.08) rotate(-3deg);
        box-shadow: 0 8px 18px color-mix(in srgb, var(--entry-tint) 35%, transparent);
      }
    }
  }

  .mp-entry__icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    color: #fff;
    transition: all 0.25s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  }

  .mp-entry__label {
    font-size: 13px;
    color: #303133;
    font-weight: 500;
  }

  .text-g-500 {
    color: #909399;
  }
</style>
