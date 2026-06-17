<!-- 平台 PC · 工作台首页（待办 + 快捷入口；详细数据见 数据中心） -->
<template>
  <div class="pf-dashboard">
    <!-- 顶部欢迎条 -->
    <div class="pf-hero">
      <div class="pf-hero__bg" />
      <div class="pf-hero__content">
        <div>
          <h2 class="pf-hero__title">{{ greeting }}，欢迎回来 👋</h2>
          <p class="pf-hero__sub">
            待办 <b class="pf-hero__num">{{ totalTodos }}</b> 项 · 详细数据请前往
            <a class="pf-hero__link" @click="go('/platform/data-center')">数据中心</a>
          </p>
        </div>
        <div class="pf-hero__date">
          <div class="pf-hero__weekday">{{ today.weekday }}</div>
          <div class="pf-hero__day">{{ today.day }}</div>
          <div class="pf-hero__month">{{ today.month }}月 · {{ today.year }}</div>
        </div>
      </div>
    </div>

    <div class="pf-grid-2">
      <!-- 待办 -->
      <ElCard shadow="never" class="pf-card pf-todo-card" v-loading="loading">
        <template #header>
          <div class="pf-card__title">
            <span class="pf-card__title-text">
              <ArtSvgIcon icon="ri:flashlight-fill" class="pf-card__title-icon" />
              待办处理
            </span>
            <ElTag v-if="totalTodos > 0" size="small" type="danger" round>
              {{ totalTodos }} 项待处理
            </ElTag>
            <ElTag v-else size="small" type="success" round>全部处理完毕</ElTag>
          </div>
        </template>
        <div class="pf-todo__list">
          <div
            v-for="t in todoList"
            :key="t.key"
            class="pf-todo__row"
            :class="{ 'pf-todo__row--empty': t.count === 0 }"
            @click="onTodo(t)"
          >
            <div class="pf-todo__icon" :style="{ background: t.tint + '18', color: t.tint }">
              <ArtSvgIcon :icon="t.icon" />
            </div>
            <div class="pf-todo__body">
              <div class="pf-todo__label">{{ t.label }}</div>
              <div class="pf-todo__desc">{{ t.desc }}</div>
            </div>
            <div class="pf-todo__count">
              <ElBadge v-if="t.count > 0" :value="t.count" :max="99" type="primary" />
              <span v-else class="pf-todo__empty">— 已清空</span>
            </div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" class="pf-todo__arrow" />
          </div>
        </div>
      </ElCard>

      <!-- 快捷入口 -->
      <ElCard shadow="never" class="pf-card pf-entries-card">
        <template #header>
          <div class="pf-card__title">
            <span class="pf-card__title-text">
              <ArtSvgIcon icon="ri:apps-2-fill" class="pf-card__title-icon" />
              快捷入口
            </span>
            <span class="text-xs text-g-500">{{ entries.length }} 个常用功能</span>
          </div>
        </template>
        <div class="pf-entries">
          <div
            v-for="e in entries"
            :key="e.key"
            class="pf-entry"
            :style="{ '--entry-tint': e.tint }"
            @click="go(e.to)"
          >
            <div
              class="pf-entry__icon"
              :style="{ background: `linear-gradient(135deg, ${e.tint}, ${e.tint}cc)` }"
            >
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
  import { ElMessage } from 'element-plus'
  import { useRouter } from 'vue-router'

  defineOptions({ name: 'PlatformDashboard' })

  const router = useRouter()
  const data = ref<PlatformDashboard>()
  const loading = ref(false)

  /* ====== 顶部 hero ====== */
  const now = new Date()
  const greeting = computed(() => {
    const h = now.getHours()
    if (h < 6) return '深夜好'
    if (h < 12) return '早上好'
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

  /* ====== 待办 ====== */
  const todoList = computed(() => {
    const t = data.value?.todos
    return [
      {
        key: 'merchant',
        icon: 'ri:store-2-line',
        label: '待审核商户',
        desc: '新入驻的厂家 / 门店',
        count: t?.pendingMerchants ?? 0,
        tint: '#FF4D2D',
        to: '/platform/audit/merchant'
      },
      {
        key: 'product',
        icon: 'ri:price-tag-2-line',
        label: '待审核商品',
        desc: '上架前需平台审核的商品',
        count: t?.pendingProducts ?? 0,
        tint: '#FF7A45',
        to: '/platform/audit/product'
      },
      {
        key: 'ad',
        icon: 'ri:advertisement-line',
        label: '广告创意待审',
        desc: '商家投放的广告物料',
        count: t?.pendingAds ?? 0,
        tint: '#FAAD14',
        to: '/platform/ad'
      },
      {
        key: 'complaint',
        icon: 'ri:customer-service-2-line',
        label: '售后投诉',
        desc: '需要平台介入的售后单',
        count: t?.complaints ?? 0,
        tint: '#F56C6C',
        to: '/platform/order/list'
      },
      {
        key: 'withdraw',
        icon: 'ri:wallet-line',
        label: '待审核提现',
        desc: '商家 / 推广员的提现申请',
        count: t?.pendingWithdraws ?? 0,
        tint: '#A855F7',
        to: '/platform/withdraws'
      }
    ]
  })
  const totalTodos = computed(() => todoList.value.reduce((s, x) => s + x.count, 0))

  /* ====== 快捷入口 ====== */
  const entries = [
    {
      key: 'merchant',
      icon: 'ri:store-2-line',
      label: '商户管理',
      tint: '#FF4D2D',
      to: '/platform/merchant/list'
    },
    {
      key: 'audit-merchant',
      icon: 'ri:checkbox-multiple-line',
      label: '商户审核',
      tint: '#F5365C',
      to: '/platform/audit/merchant'
    },
    {
      key: 'audit-product',
      icon: 'ri:price-tag-2-line',
      label: '商品审核',
      tint: '#FF7A45',
      to: '/platform/audit/product'
    },
    {
      key: 'order',
      icon: 'ri:file-list-3-line',
      label: '订单管理',
      tint: '#3B82F6',
      to: '/platform/order/list'
    },
    {
      key: 'ad',
      icon: 'ri:advertisement-line',
      label: '广告管理',
      tint: '#FAAD14',
      to: '/platform/ad'
    },
    {
      key: 'plaza',
      icon: 'ri:store-3-line',
      label: '选品广场',
      tint: '#10B981',
      to: '/platform/plaza'
    },
    {
      key: 'member',
      icon: 'ri:vip-crown-2-line',
      label: '会员套餐',
      tint: '#A855F7',
      to: '/platform/member/plan'
    },
    {
      key: 'pay-orders',
      icon: 'ri:secure-payment-line',
      label: '会员支付',
      tint: '#06B6D4',
      to: '/platform/member/orders'
    },
    {
      key: 'flag',
      icon: 'ri:toggle-line',
      label: '功能开关',
      tint: '#8B5CF6',
      to: '/platform/feature-flag'
    },
    {
      key: 'perm',
      icon: 'ri:shield-user-line',
      label: '权限管理',
      tint: '#86909C',
      to: '/platform/permission'
    },
    {
      key: 'system',
      icon: 'ri:settings-3-line',
      label: '系统设置',
      tint: '#0EA5E9',
      to: '/platform/system'
    },
    {
      key: 'data',
      icon: 'ri:bar-chart-2-line',
      label: '数据中心',
      tint: '#22C55E',
      to: '/platform/data-center'
    }
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
    loading.value = true
    try {
      data.value = await fetchPlatformDashboard()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-dashboard {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  /* ============ 顶部 hero 条 ============ */
  .pf-hero {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 120px;
    overflow: hidden;
    color: #fff;
    background: linear-gradient(135deg, #ff4d2d 0%, #ff7a45 60%, #faad14 100%);
    border-radius: 16px;

    &__bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 88% 30%, rgb(255 255 255 / 18%) 0%, transparent 32%),
        radial-gradient(circle at 12% 75%, rgb(255 255 255 / 12%) 0%, transparent 28%);
    }

    &__content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
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
      margin: 0 4px;
      font-size: 16px;
      font-weight: 700;
    }

    &__link {
      margin-left: 4px;
      color: #fff;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }

    &__date {
      line-height: 1.1;
      text-align: right;
    }

    &__weekday {
      font-size: 13px;
      opacity: 0.85;
    }

    &__day {
      margin: 2px 0;
      font-size: 42px;
      font-weight: 700;
      letter-spacing: -1px;
    }

    &__month {
      font-size: 12px;
      opacity: 0.85;
    }
  }

  /* ============ Card 通用 ============ */
  .pf-card {
    border: 1px solid #f0f1f3;
    border-radius: 14px;

    :deep(.el-card__header) {
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f5f6f8;
    }

    :deep(.el-card__body) {
      padding: 12px 8px;
    }
  }

  .pf-card__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pf-card__title-text {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
  }

  .pf-card__title-icon {
    font-size: 18px;
    color: var(--el-color-primary, #ff4d2d);
  }

  /* ============ 双栏 ============ */
  .pf-grid-2 {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 16px;

    @media (width <= 1100px) {
      grid-template-columns: 1fr;
    }
  }

  /* ============ 待办 ============ */
  .pf-todo__list {
    display: flex;
    flex-direction: column;
    padding: 0 4px;
  }

  .pf-todo__row {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 14px 12px;
    cursor: pointer;
    border-bottom: 1px dashed #f0f0f0;
    border-radius: 10px;
    transition: all 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: linear-gradient(90deg, rgb(255 77 45 / 6%), transparent);
      transform: translateX(2px);
    }

    &--empty {
      opacity: 0.55;

      &:hover {
        background: rgb(0 0 0 / 2%);
        transform: none;
      }
    }
  }

  .pf-todo__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 20px;
    border-radius: 12px;
  }

  .pf-todo__body {
    flex: 1;
    min-width: 0;
  }

  .pf-todo__label {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .pf-todo__desc {
    margin-top: 2px;
    font-size: 12px;
    color: #909399;
  }

  .pf-todo__count {
    min-width: 64px;
    padding-right: 8px;
    text-align: right;
  }

  .pf-todo__empty {
    font-size: 12px;
    color: #c0c4cc;
  }

  .pf-todo__arrow {
    flex-shrink: 0;
    font-size: 18px;
    color: #c0c4cc;
  }

  /* ============ 快捷入口 ============ */
  .pf-entries {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 8px 4px 4px;

    @media (width <= 700px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pf-entry {
    --entry-tint: #ff4d2d;

    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    padding: 18px 6px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.22s ease;

    &:hover {
      background: color-mix(in srgb, var(--entry-tint) 6%, transparent);
      transform: translateY(-3px);

      .pf-entry__icon {
        box-shadow: 0 8px 18px color-mix(in srgb, var(--entry-tint) 35%, transparent);
        transform: scale(1.08) rotate(-3deg);
      }
    }
  }

  .pf-entry__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    font-size: 26px;
    color: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 10px rgb(0 0 0 / 8%);
    transition: all 0.25s ease;
  }

  .pf-entry__label {
    font-size: 13px;
    font-weight: 500;
    color: #303133;
  }

  .text-g-500 {
    color: #909399;
  }
</style>
