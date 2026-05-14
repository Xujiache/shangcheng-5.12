<!-- 商家 PC · 会员开通（S3.5-T10 · 真生效版）-->
<template>
  <div class="mp-member">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">会员开通</h2>
        <p class="mt-1 text-sm text-g-500">商家会员套餐 · 解锁高级功能 · 实时配额</p>
      </div>
      <ElButton :icon="Refresh" @click="load" plain>刷新</ElButton>
    </div>

    <!-- 当前订阅状态 -->
    <ElCard shadow="never" class="mp-current" v-if="current?.subscribed">
      <div class="mp-current__head">
        <div>
          <div class="mp-current__tag">
            <ArtSvgIcon icon="ri:vip-crown-fill" /> 当前套餐
          </div>
          <div class="mp-current__name">
            {{ current.planName }}
            <ElTag size="small" :type="current.status === 'active' ? 'success' : 'warning'" class="ml-2">
              {{ statusLabelOf(current.status!) }}
            </ElTag>
          </div>
          <div class="mp-current__date">
            有效期至 <b>{{ current.expiresAt }}</b> · 剩 {{ current.daysRemaining }} / {{ current.totalDays }} 天
          </div>
        </div>
        <div class="mp-current__actions">
          <div class="text-xs text-g-500 mb-1">自动续订</div>
          <ElSwitch v-model="autoRenew" @change="onToggleAutoRenew" />
        </div>
      </div>
      <div class="mp-current__bar">
        <ElProgress
          :percentage="Math.round((current.daysRemaining! / current.totalDays!) * 100)"
          :stroke-width="14"
          :color="progressColor"
          text-inside
        />
      </div>
    </ElCard>

    <ElCard v-else shadow="never" class="mp-current mp-current--empty">
      <ElEmpty description="尚未订阅会员套餐，订阅后可解锁高级功能" :image-size="80">
        <ElButton type="primary" @click="scrollToPlans">选择套餐</ElButton>
      </ElEmpty>
    </ElCard>

    <!-- 配额用量 -->
    <ElCard shadow="never" class="mp-quota" v-if="quota">
      <template #header>
        <div class="mp-card-head">
          <div>
            <ArtSvgIcon icon="ri:line-chart-line" class="text-primary" /> 资源用量
          </div>
          <span class="text-xs text-g-500">月度曝光每月 1 日重置 · 推送位 / Banner 累计</span>
        </div>
      </template>
      <div class="mp-quota__grid">
        <div v-for="q in quotaCards" :key="q.key" class="mp-quota__cell" :class="{ danger: q.ratio >= 1, warning: q.ratio >= 0.8 && q.ratio < 1 }">
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ q.label }}</span>
            <ElTag v-if="q.ratio >= 1" type="danger" size="small">已用尽</ElTag>
            <ElTag v-else-if="q.ratio >= 0.8" type="warning" size="small">超 80%</ElTag>
            <ElTag v-else type="success" size="small">充足</ElTag>
          </div>
          <div class="mp-quota__num">
            <span class="used">{{ q.used.toLocaleString() }}</span>
            <span class="text-g-500"> / {{ q.limit > 99999 ? '不限' : q.limit.toLocaleString() }}</span>
          </div>
          <ElProgress
            :percentage="Math.min(100, Math.round(q.ratio * 100))"
            :stroke-width="8"
            :color="q.ratio >= 1 ? '#F56C6C' : q.ratio >= 0.8 ? '#E6A23C' : '#10B981'"
            :show-text="false"
          />
          <div class="text-xs text-g-500 mt-2">{{ q.hint }}</div>
        </div>
      </div>
    </ElCard>

    <ElCard v-else-if="current?.subscribed" shadow="never">
      <ElAlert
        type="info"
        :closable="false"
        show-icon
        title="当前订阅的是会员套餐，未购买推广配额"
        description="如需推送位 / Banner / 月曝光等资源，请加购推广套餐"
      />
    </ElCard>

    <!-- 套餐选择 -->
    <div class="mp-tabs" ref="plansAnchor">
      <ElRadioGroup v-model="tab" size="large">
        <ElRadioButton value="basic">会员套餐</ElRadioButton>
        <ElRadioButton value="ad">推广套餐</ElRadioButton>
        <ElRadioButton value="addon">增值单项</ElRadioButton>
      </ElRadioGroup>
    </div>

    <div class="mp-plans">
      <div
        v-for="p in filteredPlans"
        :key="p.id"
        class="mp-plan"
        :class="{ active: current?.planId === p.id, hot: p.hot }"
      >
        <div v-if="p.hot" class="mp-plan__hot">HOT 推荐</div>
        <div v-if="current?.planId === p.id" class="mp-plan__current-tag">当前订阅</div>
        <div class="mp-plan__head">
          <div class="mp-plan__name">{{ p.name }}</div>
          <div class="mp-plan__price">
            <span class="currency">¥</span>{{ p.price }}
            <small>/ {{ periodLabelOf(p.period) }}</small>
          </div>
          <div v-if="p.originalPrice" class="mp-plan__original">
            原价 <s>¥{{ p.originalPrice }}</s>
          </div>
          <div v-else-if="p.trialDays" class="mp-plan__trial">
            🎁 免费试用 {{ p.trialDays }} 天
          </div>
        </div>
        <ul class="mp-plan__rights">
          <li v-for="(r, ri) in p.rights" :key="ri">
            <ArtSvgIcon icon="ri:check-line" class="text-success" /> {{ r }}
          </li>
        </ul>
        <div v-if="p.constraints" class="mp-plan__constraints">
          <ElTag v-if="p.constraints.pushSlots !== undefined" size="small" effect="plain">
            推送位 {{ p.constraints.pushSlots > 99999 ? '不限' : p.constraints.pushSlots }}
          </ElTag>
          <ElTag v-if="p.constraints.bannerLimit !== undefined" size="small" effect="plain">
            Banner {{ p.constraints.bannerLimit > 99999 ? '不限' : p.constraints.bannerLimit }}
          </ElTag>
          <ElTag v-if="p.constraints.impressionLimit !== undefined" size="small" effect="plain">
            月曝光 {{ p.constraints.impressionLimit > 99999999 ? '不限' : (p.constraints.impressionLimit / 10000).toFixed(0) + '万' }}
          </ElTag>
        </div>
        <div class="mp-plan__cta">
          <ElButton
            v-if="current?.planId === p.id"
            type="primary"
            plain
            disabled
            class="w-full"
          >
            <ArtSvgIcon icon="ri:check-double-line" class="mr-1" /> 当前订阅
          </ElButton>
          <ElButton
            v-else
            type="primary"
            class="w-full"
            :loading="subscribing === p.id"
            @click="onSubscribe(p)"
          >
            {{ current?.subscribed ? (p.price > (current?.subscribedPrice || 0) ? '升级到此套餐' : '切换到此套餐') : '立即订阅' }}
          </ElButton>
        </div>
      </div>
    </div>

    <!-- 缴费记录 -->
    <ElCard v-if="myPayments.length" shadow="never">
      <template #header>
        <div class="mp-card-head">
          <div><ArtSvgIcon icon="ri:bill-line" class="text-primary" /> 我的缴费记录</div>
          <span class="text-xs text-g-500">共 {{ myPayments.length }} 条</span>
        </div>
      </template>
      <ElTable :data="myPayments" stripe size="small">
        <ElTableColumn label="订单号" prop="no" width="200" />
        <ElTableColumn label="套餐" prop="planName" min-width="160" />
        <ElTableColumn label="金额" width="120" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.amount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="支付方式" width="100" align="center">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ payMethodLabelOf(row.payMethod) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="payStatusTypeOf(row.status)" size="small">{{ payStatusLabelOf(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="支付时间" width="170">
          <template #default="{ row }">{{ row.paidAt ? formatDateTime(row.paidAt) : '—' }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 订阅确认 Dialog -->
    <ElDialog v-model="confirmOpen" title="确认订阅" width="420px" align-center>
      <div v-if="confirmPlan" class="mp-confirm">
        <div class="mp-confirm__title">{{ confirmPlan.name }}</div>
        <div class="mp-confirm__price">
          <span class="currency">¥</span>{{ confirmPlan.price }}
          <small>/ {{ periodLabelOf(confirmPlan.period) }}</small>
        </div>
        <ElForm label-position="top">
          <ElFormItem label="支付方式">
            <ElRadioGroup v-model="payMethod">
              <ElRadioButton value="wechat">微信</ElRadioButton>
              <ElRadioButton value="alipay">支付宝</ElRadioButton>
              <ElRadioButton value="balance">余额</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
        </ElForm>
        <ElAlert
          v-if="current?.subscribed && current.planId !== confirmPlan.id"
          type="warning"
          :closable="false"
          show-icon
          :title="`切换后将覆盖当前「${current.planName}」`"
        />
      </div>
      <template #footer>
        <ElButton @click="confirmOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="subscribing === confirmPlan?.id" @click="doSubscribe">确认支付</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMemberPlans,
    fetchCurrentMembership,
    fetchMerchantQuota,
    subscribeMemberPlan,
    setMembershipAutoRenew,
    fetchMyPayments,
    type CurrentMembership,
    type UsageQuota,
    type PaymentRecord
  } from '@/api/merchant-business'
  import { getMembershipPaymentStatus } from '@/api/member-service'
  import type { MemberPlan } from '@jiujiu/shared/types'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantMember' })

  const plans = ref<MemberPlan[]>([])
  const current = ref<CurrentMembership & { subscribedPrice?: number }>()
  const quota = ref<UsageQuota | null>(null)
  const myPayments = ref<PaymentRecord[]>([])
  const tab = ref<'basic' | 'ad' | 'addon'>('basic')
  const autoRenew = ref(false)
  const subscribing = ref<string | null>(null)
  const confirmOpen = ref(false)
  const confirmPlan = ref<MemberPlan>()
  const payMethod = ref<'wechat' | 'alipay' | 'balance'>('wechat')
  const plansAnchor = ref<HTMLElement>()

  const filteredPlans = computed(() => plans.value.filter((p) => p.type === tab.value))

  const progressColor = computed(() => {
    const d = current.value?.daysRemaining || 0
    if (d < 30) return '#F56C6C'
    if (d < 90) return '#E6A23C'
    return '#10B981'
  })

  const quotaCards = computed(() => {
    if (!quota.value) return []
    const q = quota.value
    return [
      {
        key: 'pushSlots',
        label: '选品广场推送位',
        used: q.used.pushSlots,
        limit: q.limits.pushSlots,
        ratio: q.limits.pushSlots ? q.used.pushSlots / q.limits.pushSlots : 0,
        hint: '在「选品广场」申请代理时占用，累计'
      },
      {
        key: 'bannerLimit',
        label: '首屏 Banner',
        used: q.used.bannerLimit,
        limit: q.limits.bannerLimit,
        ratio: q.limits.bannerLimit ? q.used.bannerLimit / q.limits.bannerLimit : 0,
        hint: '在「营销中心」创建首屏 Banner 活动时占用'
      },
      {
        key: 'impressionLimit',
        label: '月曝光',
        used: q.used.impressionLimit,
        limit: q.limits.impressionLimit,
        ratio: q.limits.impressionLimit ? q.used.impressionLimit / q.limits.impressionLimit : 0,
        hint: '商品页浏览 / 广告曝光 · 月度自动重置'
      }
    ]
  })

  function periodLabelOf(p: MemberPlan['period']) {
    return ({ monthly: '月', yearly: '年', weekly: '周', daily: '天', oneoff: '次' } as Record<string, string>)[p] || p
  }

  function statusLabelOf(s: NonNullable<CurrentMembership['status']>) {
    return ({ trial: '试用中', active: '生效中', expired: '已过期', cancelled: '已取消' } as const)[s]
  }

  function payStatusTypeOf(s: PaymentRecord['status']) {
    return ({ paid: 'success', pending: 'warning', refunding: 'danger', refunded: 'info' } as const)[s]
  }
  function payStatusLabelOf(s: PaymentRecord['status']) {
    return ({ paid: '已支付', pending: '待支付', refunding: '退款中', refunded: '已退款' } as const)[s]
  }
  function payMethodLabelOf(m: PaymentRecord['payMethod']) {
    return ({ wechat: '微信', alipay: '支付宝', balance: '余额' } as const)[m]
  }

  function scrollToPlans() {
    plansAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function onSubscribe(p: MemberPlan) {
    confirmPlan.value = p
    payMethod.value = 'wechat'
    confirmOpen.value = true
  }

  /**
   * 真实下单流程（admin-pc PC Web）
   *
   * admin-pc 在 PC 上无法直接调起微信 JSAPI（小程序内才能用），
   * 所以采用「PC 下单 + 提示去手机商家 APP 完成支付」的策略：
   *
   *   1. 调 subscribeMemberPlan 创建 PaymentRecord(pending) + 拿 miniPay 占位
   *   2. 若后端非生产兜底（mockPaid=true）→ 已激活，直接刷新
   *   3. 否则展示二维码/复制订单号 + 在 PC 上轮询 paymentStatus
   *      直到用户在手机商家 APP 内完成支付，状态变成 paid
   */
  async function doSubscribe() {
    if (!confirmPlan.value) return
    const plan = confirmPlan.value
    subscribing.value = plan.id
    try {
      const res = await subscribeMemberPlan(plan.id, payMethod.value)
      if (res.mockPaid) {
        ElMessage.success(`已订阅「${plan.name}」 · 支付 ¥${plan.price}`)
        confirmOpen.value = false
        await load()
        return
      }
      if (!res.paymentNo) {
        ElMessage.error('下单失败，请稍后重试')
        return
      }
      // 真实链路：admin-pc 在 PC 上无法直接调起微信 JSAPI
      // 提示用户去手机商家 APP 完成支付，同时在后台轮询状态
      ElMessage({
        type: 'warning',
        message: `订单已创建（编号 ${res.paymentNo}），请到手机商家 APP「会员中心」内完成支付`,
        duration: 4000
      })
      confirmOpen.value = false
      await pollPaymentStatus(res.paymentNo, plan.name)
    } finally {
      subscribing.value = null
    }
  }

  async function pollPaymentStatus(no: string, planName: string) {
    // 最长轮询 5 分钟（300 秒，每 3 秒一次 → 100 次）
    const start = Date.now()
    const maxMs = 5 * 60 * 1000
    while (Date.now() - start < maxMs) {
      try {
        const st = await getMembershipPaymentStatus(no)
        if (st.status === 'paid') {
          ElMessage.success(`「${planName}」 支付成功，会员已激活`)
          await load()
          return
        }
        if (st.status === 'failed' || st.status === 'refunded') {
          ElMessage.error(`支付未成功（${st.status}），请重新发起`)
          return
        }
      } catch {
        /* 单次失败忽略，下次再试 */
      }
      await new Promise((r) => setTimeout(r, 3000))
    }
    ElMessage.info('支付尚未确认，请稍后手动刷新查看会员状态')
    await load()
  }

  async function onToggleAutoRenew(v: boolean | string | number) {
    await setMembershipAutoRenew(Boolean(v))
    ElMessage.success(v ? '已开启自动续订' : '已关闭自动续订')
  }

  async function load() {
    plans.value = await fetchMemberPlans()
    const cur = await fetchCurrentMembership()
    current.value = cur
    autoRenew.value = !!cur.autoRenew
    if (cur.subscribed && cur.planId) {
      const found = plans.value.find((p) => p.id === cur.planId)
      if (found && current.value) current.value.subscribedPrice = found.price
    }
    quota.value = await fetchMerchantQuota()
    myPayments.value = await fetchMyPayments()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-member {
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
  .text-success {
    color: #10b981;
  }
  .text-g-500 {
    color: #6b7280;
  }

  .mp-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;

    > div {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  /* 当前套餐卡 */
  .mp-current {
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 77, 45, 0.06), rgba(255, 77, 45, 0.02));

    &--empty {
      background: var(--art-bg-card, #fff);
    }
  }

  .mp-current__head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 24px;
    align-items: center;
  }

  .mp-current__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 10px;
    background: rgba(255, 77, 45, 0.12);
    color: var(--el-color-primary, #ff4d2d);
    font-size: 12px;
    font-weight: 600;
  }

  .mp-current__name {
    font-size: 22px;
    font-weight: 700;
    margin: 8px 0 4px;
    color: var(--art-gray-800, #1f2937);
  }

  .mp-current__date {
    font-size: 13px;
    color: var(--art-gray-500, #6b7280);
  }

  .mp-current__actions {
    text-align: right;
  }

  .mp-current__bar {
    margin-top: 14px;
  }

  /* 配额 */
  .mp-quota__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .mp-quota__cell {
    padding: 14px 16px;
    background: #fafbfc;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &.warning {
      background: rgba(230, 162, 60, 0.06);
    }

    &.danger {
      background: rgba(245, 108, 108, 0.06);
    }
  }

  .mp-quota__num {
    font-size: 20px;
    font-weight: 700;

    .used {
      color: var(--el-color-primary, #ff4d2d);
    }
  }

  /* Tabs */
  .mp-tabs {
    display: flex;
    justify-content: center;
    padding: 8px 0;
  }

  /* 套餐网格 */
  .mp-plans {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .mp-plan {
    position: relative;
    background: #fff;
    border: 2px solid var(--art-border-color, #e5e7eb);
    border-radius: 16px;
    padding: 22px 22px 20px;
    display: flex;
    flex-direction: column;
    transition: all 0.2s;

    &.hot {
      border-color: var(--el-color-primary, #ff4d2d);
      box-shadow: 0 12px 32px -16px rgba(255, 77, 45, 0.4);
    }

    &.active {
      border-color: #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), #fff);
    }
  }

  .mp-plan__hot {
    position: absolute;
    top: -10px;
    right: 18px;
    padding: 3px 12px;
    border-radius: 10px;
    background: linear-gradient(135deg, #ff4d2d, #ff7a45);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
  }

  .mp-plan__current-tag {
    position: absolute;
    top: -10px;
    left: 18px;
    padding: 3px 12px;
    border-radius: 10px;
    background: #10b981;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
  }

  .mp-plan__name {
    font-size: 18px;
    font-weight: 700;
  }

  .mp-plan__price {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-color-primary, #ff4d2d);
    margin: 6px 0 2px;

    .currency {
      font-size: 18px;
      margin-right: 2px;
    }
    small {
      font-size: 13px;
      color: #6b7280;
      font-weight: 400;
    }
  }

  .mp-plan__original {
    font-size: 12px;
    color: #6b7280;
  }

  .mp-plan__trial {
    font-size: 12px;
    color: #f59e0b;
    font-weight: 500;
  }

  .mp-plan__rights {
    list-style: none;
    padding: 0;
    margin: 14px 0 0;
    flex: 1;

    li {
      padding: 5px 0;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--art-gray-700, #374151);
    }
  }

  .mp-plan__constraints {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
    margin-top: 8px;
  }

  .mp-plan__cta {
    margin-top: 16px;
  }

  .w-full {
    width: 100%;
  }
  .mr-1 {
    margin-right: 4px;
  }
  .ml-2 {
    margin-left: 8px;
  }
  .mb-1 {
    margin-bottom: 4px;
  }

  /* 确认 Dialog */
  .mp-confirm {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-confirm__title {
    font-size: 16px;
    font-weight: 600;
  }

  .mp-confirm__price {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-color-primary, #ff4d2d);

    .currency {
      font-size: 16px;
      margin-right: 2px;
    }

    small {
      font-size: 13px;
      color: #6b7280;
      font-weight: 400;
    }
  }
</style>
