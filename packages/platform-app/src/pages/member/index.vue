<script setup lang="ts">
/**
 * PA-08 · 会员&推广套餐
 *
 * Tab：会员套餐 / 广告推送套餐 / 缴费订单 / 会员状态
 *
 * 编辑套餐:统一走「底部 sheet 完整表单」(取代 admin-pc 跳转 + 简陋 prompt 流程),
 *   字段:name / type / period / periodCount / price / originalPrice /
 *        rights / constraints / trialDays(仅 basic) / hot / status
 *   保存 → memberService.savePlan,删除 → memberService.deletePlan,
 *   保存/删除成功后整体 reload + 关闭 sheet。
 *
 * 套餐订阅商家:每张卡片可点击「查看订阅商家 N 个」展开内联列表,
 *   懒加载 GET /p/member-plans/:id/subscriptions(本页缓存避免重复请求)。
 *
 * 新商户试用期(全局 trialDays)与单套餐 trialDays 不同:
 *   - trialDays(全局) → SystemConfig key=member:trialDays,新商户注册自动赠送
 *   - trialDays(套餐) → 套餐自身的促销试用,加在原有计费周期前
 */
import { ref, computed, onMounted, reactive } from 'vue'
import { memberService } from '../../services'
import type { SubscriptionStatusOverview, PlanSubscriptionRow } from '../../services'
import type { MemberPlan, MemberPlanType, MemberPlanPeriod } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

type TabKey = 'basic' | 'ad' | 'pay-orders' | 'status'

const tab = ref<TabKey>('basic')
const plans = ref<MemberPlan[]>([])
const loading = ref(false)
const statusOverview = ref<SubscriptionStatusOverview>({
  yearly: 0,
  monthly: 0,
  trial: 0,
  expiringSoon: 0,
})

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '会员套餐' },
  { key: 'ad', label: '广告推送套餐' },
  { key: 'pay-orders', label: '缴费订单' },
  { key: 'status', label: '会员状态' },
]

const addonItems = computed(() =>
  plans.value
    .filter((p) => p.type === 'addon')
    .map((p) => ({
      id: p.id,
      icon: 'gift',
      label: p.name,
      price: Number(p.price),
    })),
)

const trialDays = ref(30)

const basicPlans = computed(() => plans.value.filter((p) => p.type === 'basic'))
const adPlans = computed(() => plans.value.filter((p) => p.type === 'ad'))

const planCount = computed(() => ({
  basic: basicPlans.value.length,
  ad: adPlans.value.length,
}))

async function load() {
  loading.value = true
  try {
    const [planList, td] = await Promise.all([memberService.plans(), memberService.trialDays()])
    plans.value = planList
    trialDays.value = td
    if (tab.value === 'status') {
      statusOverview.value = await memberService.statusOverview()
    }
  } finally {
    loading.value = false
  }
}

async function onTabChange(key: TabKey) {
  if (key === 'pay-orders') {
    goPayOrders()
    return
  }
  tab.value = key
  if (key === 'status' && !loading.value) {
    statusOverview.value = await memberService.statusOverview()
  }
}

// ========== 套餐编辑 sheet ==========

interface PlanDraft {
  id?: string
  type: MemberPlanType
  name: string
  price: number
  originalPrice: number | null
  period: MemberPlanPeriod
  periodCount: number
  hot: boolean
  rightsText: string
  constraints: {
    pushSlots: number
    weightLimit: number
    bannerLimit: number
    impressionLimit: number
  }
  trialDays: number
  status: 'active' | 'disabled'
}

const PERIOD_OPTIONS: { key: MemberPlanPeriod; label: string }[] = [
  { key: 'monthly', label: '月费' },
  { key: 'yearly', label: '年费' },
  { key: 'weekly', label: '周费' },
  { key: 'daily', label: '日费' },
  { key: 'oneoff', label: '单次' },
]

const PERIOD_LABEL: Record<string, string> = {
  monthly: '月',
  yearly: '年',
  weekly: '周',
  daily: '天',
  oneoff: '次',
}

const TYPE_LABEL: Record<MemberPlanType, string> = {
  basic: '会员套餐',
  ad: '广告推送套餐',
  addon: '增值单项',
}

const planSheetOpen = ref(false)
const planSheetSaving = ref(false)
const planSheetDeleting = ref(false)
const planSheetEditing = ref(false) // 是否为编辑(否=新增)

const planDraft = reactive<PlanDraft>(emptyDraft('basic'))

function emptyDraft(type: MemberPlanType): PlanDraft {
  return {
    type,
    name: '',
    price: 0,
    originalPrice: null,
    period: type === 'addon' ? 'oneoff' : 'monthly',
    periodCount: 1,
    hot: false,
    rightsText: '',
    constraints: {
      pushSlots: 0,
      weightLimit: 0,
      bannerLimit: 0,
      impressionLimit: 0,
    },
    trialDays: 0,
    status: 'active',
  }
}

function fillDraft(target: PlanDraft, src: Partial<PlanDraft>) {
  // reactive 不能直接覆盖,只能逐字段赋值
  target.id = src.id
  target.type = src.type ?? 'basic'
  target.name = src.name ?? ''
  target.price = src.price ?? 0
  target.originalPrice = src.originalPrice ?? null
  target.period = src.period ?? 'monthly'
  target.periodCount = src.periodCount ?? 1
  target.hot = !!src.hot
  target.rightsText = src.rightsText ?? ''
  const c = src.constraints || {}
  target.constraints = {
    pushSlots: c.pushSlots ?? 0,
    weightLimit: c.weightLimit ?? 0,
    bannerLimit: c.bannerLimit ?? 0,
    impressionLimit: c.impressionLimit ?? 0,
  }
  target.trialDays = src.trialDays ?? 0
  target.status = src.status ?? 'active'
}

function openCreateSheet(type: MemberPlanType) {
  fillDraft(planDraft, emptyDraft(type))
  planSheetEditing.value = false
  planSheetOpen.value = true
}

function openEditSheet(p: MemberPlan) {
  fillDraft(planDraft, {
    id: p.id,
    type: p.type,
    name: p.name,
    price: Number(p.price) || 0,
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    period: p.period,
    periodCount: p.periodCount || 1,
    hot: !!p.hot,
    rightsText: Array.isArray(p.rights) ? p.rights.join('\n') : '',
    constraints: {
      pushSlots: p.constraints?.pushSlots ?? 0,
      weightLimit: p.constraints?.weightLimit ?? 0,
      bannerLimit: p.constraints?.bannerLimit ?? 0,
      impressionLimit: p.constraints?.impressionLimit ?? 0,
    },
    trialDays: p.trialDays ?? 0,
    status: p.status,
  })
  planSheetEditing.value = true
  planSheetOpen.value = true
}

function closePlanSheet() {
  if (planSheetSaving.value || planSheetDeleting.value) return
  planSheetOpen.value = false
}

function addPlan() {
  uni.showActionSheet({
    itemList: ['新增会员套餐', '新增广告推送套餐', '新增增值单项'],
    success: (r) => {
      const type = (['basic', 'ad', 'addon'] as const)[r.tapIndex]
      openCreateSheet(type)
    },
  })
}

function validateDraft(): string | null {
  if (!planDraft.name.trim()) return '请输入套餐名'
  if (!Number.isFinite(planDraft.price) || planDraft.price < 0) return '价格非法'
  if (
    planDraft.originalPrice !== null &&
    (!Number.isFinite(planDraft.originalPrice) || planDraft.originalPrice < 0)
  ) {
    return '原价非法'
  }
  if (!Number.isFinite(planDraft.periodCount) || planDraft.periodCount < 1) return '周期数至少为 1'
  if (
    planDraft.type === 'basic' &&
    (!Number.isFinite(planDraft.trialDays) || planDraft.trialDays < 0)
  ) {
    return '试用天数不能为负'
  }
  return null
}

async function savePlanSheet() {
  if (planSheetSaving.value) return
  const err = validateDraft()
  if (err) {
    uni.showToast({ title: err, icon: 'none' })
    return
  }
  planSheetSaving.value = true
  uni.showLoading({ title: '保存中…', mask: true })
  try {
    const rights = planDraft.rightsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)
    const dto: Partial<MemberPlan> & Record<string, unknown> = {
      type: planDraft.type,
      name: planDraft.name.trim(),
      price: planDraft.price,
      period: planDraft.period,
      periodCount: planDraft.periodCount,
      hot: planDraft.hot,
      rights,
      status: planDraft.status,
    }
    if (planDraft.id) dto.id = planDraft.id
    if (planDraft.originalPrice && planDraft.originalPrice > 0) {
      dto.originalPrice = planDraft.originalPrice
    }
    if (planDraft.type === 'basic') {
      dto.trialDays = Math.max(0, Math.floor(planDraft.trialDays || 0))
    }
    // 仅当至少一个 constraint 字段 > 0 才提交,避免无关 type(basic/addon)写入空 constraints 占字段
    const c = planDraft.constraints
    const hasConstraint =
      (c.pushSlots || 0) > 0 ||
      (c.weightLimit || 0) > 0 ||
      (c.bannerLimit || 0) > 0 ||
      (c.impressionLimit || 0) > 0
    if (planDraft.type === 'ad' || hasConstraint) {
      dto.constraints = {
        pushSlots: c.pushSlots || 0,
        weightLimit: c.weightLimit || 0,
        bannerLimit: c.bannerLimit || 0,
        impressionLimit: c.impressionLimit || 0,
      }
    }
    await memberService.savePlan(dto)
    uni.hideLoading()
    uni.showToast({ title: planSheetEditing.value ? '已保存' : '已创建', icon: 'success' })
    planSheetOpen.value = false
    // 失效订阅缓存(新建的套餐还没订阅,编辑的套餐订阅人数不变,先简单全清)
    subscriptionCache.clear()
    expandedPlanId.value = null
    await load()
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    planSheetSaving.value = false
  }
}

function confirmDeletePlan() {
  if (!planDraft.id) return
  uni.showModal({
    title: '删除套餐',
    content: `确定要删除「${planDraft.name}」吗?\n删除后已订阅商家的会员状态不会被回收,但新商家无法再选购此套餐。`,
    confirmText: '确认删除',
    confirmColor: '#F5222D',
    success: async (r) => {
      if (!r.confirm || !planDraft.id) return
      planSheetDeleting.value = true
      uni.showLoading({ title: '删除中…', mask: true })
      try {
        await memberService.deletePlan(planDraft.id)
        uni.hideLoading()
        uni.showToast({ title: '已删除', icon: 'success' })
        planSheetOpen.value = false
        subscriptionCache.delete(planDraft.id)
        if (expandedPlanId.value === planDraft.id) expandedPlanId.value = null
        await load()
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      } finally {
        planSheetDeleting.value = false
      }
    },
  })
}

// ========== 订阅商家展开 ==========

const expandedPlanId = ref<string | null>(null)
const subscriptionCache = reactive(new Map<string, PlanSubscriptionRow[]>())
const subscriptionLoadingId = ref<string | null>(null)

async function toggleSubscriptions(planId: string) {
  if (expandedPlanId.value === planId) {
    expandedPlanId.value = null
    return
  }
  expandedPlanId.value = planId
  if (subscriptionCache.has(planId)) return
  subscriptionLoadingId.value = planId
  try {
    const list = await memberService.planSubscriptions(planId)
    subscriptionCache.set(planId, Array.isArray(list) ? list : [])
  } catch (e: any) {
    subscriptionCache.set(planId, [])
    uni.showToast({ title: e?.message || '加载订阅失败', icon: 'none' })
  } finally {
    subscriptionLoadingId.value = null
  }
}

function formatSubDate(s: string | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toISOString().slice(0, 10)
  } catch {
    return '—'
  }
}

const SUB_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: { label: '使用中', tone: '#52C41A' },
  trial: { label: '试用中', tone: '#1890FF' },
  expired: { label: '已过期', tone: '#86909C' },
}

// ========== 试用期(全局) ==========

function changeTrial() {
  uni.showActionSheet({
    itemList: ['7 天', '15 天', '30 天', '60 天', '关闭试用'],
    success: async (r) => {
      const days = [7, 15, 30, 60, 0][r.tapIndex]
      try {
        const res = await memberService.saveTrialDays(days)
        trialDays.value = res.days
        uni.showToast({
          title: res.days > 0 ? `已设为 ${res.days} 天` : '试用已关闭',
          icon: 'success',
        })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
      }
    },
  })
}

function goPayOrders() {
  uni.navigateTo({ url: '/pages/member/pay-orders' })
}

const planSheetTitle = computed(() => {
  const verb = planSheetEditing.value ? '编辑' : '新增'
  return `${verb}${TYPE_LABEL[planDraft.type]}`
})

const showConstraintsBlock = computed(() => planDraft.type === 'ad')
const showTrialDaysField = computed(() => planDraft.type === 'basic')

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="会员管理" right-icon="plus" @right="addPlan" />

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="onTabChange(t.key)"
      >
        <text>{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 会员套餐 -->
      <view v-if="tab === 'basic'">
        <view class="section-head">
          <text class="section-title">会员套餐(基础功能)</text>
          <text class="section-count">{{ planCount.basic }} 个套餐</text>
        </view>

        <view v-for="p in basicPlans" :key="p.id" class="plan-card basic">
          <view class="plan-head">
            <view class="plan-title">
              <text class="name">{{ p.name }}</text>
              <view v-if="p.hot" class="hot-tag">HOT</view>
            </view>
            <view :class="['status-tag', p.status === 'active' ? 'on' : 'off']">
              {{ p.status === 'active' ? '已启用' : '已停用' }}
            </view>
          </view>

          <view class="price-row">
            <text class="price-cur">¥</text>
            <text class="price-num">{{ formatPrice(p.price) }}</text>
            <text class="price-unit">/ {{ PERIOD_LABEL[p.period] || p.period }}</text>
            <text v-if="p.originalPrice" class="price-original">{{
              formatPrice(p.originalPrice)
            }}</text>
          </view>

          <view class="rights">
            <view v-for="(r, i) in p.rights" :key="i" class="r-row">
              <Icon name="check" :size="22" color="#52C41A" />
              <text>{{ r }}</text>
            </view>
          </view>

          <view class="actions">
            <view class="link-btn" @click="toggleSubscriptions(p.id)">
              <text>{{ expandedPlanId === p.id ? '收起订阅商家' : '查看订阅商家' }}</text>
              <Icon
                :name="expandedPlanId === p.id ? 'chevron-up' : 'chevron-down'"
                :size="22"
                color="var(--text-tertiary)"
              />
            </view>
            <view class="btn ghost" @click="openEditSheet(p)">编辑</view>
          </view>

          <!-- 订阅商家展开区 -->
          <view v-if="expandedPlanId === p.id" class="sub-list">
            <view v-if="subscriptionLoadingId === p.id" class="sub-empty">加载中…</view>
            <view v-else-if="!subscriptionCache.get(p.id)?.length" class="sub-empty">
              暂无商家订阅
            </view>
            <view v-else class="sub-rows">
              <view class="sub-head-row">
                <text class="sub-col name">商家</text>
                <text class="sub-col status">状态</text>
                <text class="sub-col date">到期</text>
              </view>
              <view v-for="s in subscriptionCache.get(p.id)" :key="s.id" class="sub-row">
                <text class="sub-col name">{{ s.merchantName || '—' }}</text>
                <text
                  class="sub-col status"
                  :style="{ color: SUB_STATUS_LABEL[s.status]?.tone || '#909399' }"
                >
                  {{ SUB_STATUS_LABEL[s.status]?.label || s.status }}
                </text>
                <text class="sub-col date">{{ formatSubDate(s.endAt) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 试用期配置 -->
        <view class="card trial-card" @click="changeTrial">
          <view class="trial-icon">
            <Icon name="gift" :size="36" color="#52C41A" />
          </view>
          <view class="trial-info">
            <text class="trial-label">新商户试用期</text>
            <text class="trial-desc">新注册商户自动赠送基础套餐</text>
          </view>
          <text class="trial-value">{{ trialDays > 0 ? `${trialDays} 天` : '已关闭' }}</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>

        <view class="add-plan" @click="openCreateSheet('basic')">
          <Icon name="plus" :size="28" color="#fff" />
          <text>新增会员套餐</text>
        </view>
      </view>

      <!-- 广告推送套餐 -->
      <view v-else-if="tab === 'ad'">
        <view class="section-head">
          <view class="head-title-row">
            <text class="section-title">广告推送套餐</text>
            <view class="new-tag">新</view>
          </view>
          <text class="section-desc">帮商户在选品广场/首页 Banner 获得曝光位,错峰出售</text>
        </view>

        <view v-for="p in adPlans" :key="p.id" :class="['plan-card', 'ad', p.hot ? 'is-hot' : '']">
          <view v-if="p.hot" class="hot-ribbon">HOT</view>
          <view class="plan-head">
            <view class="plan-title">
              <text class="name">{{ p.name }}</text>
            </view>
            <view :class="['status-tag', p.status === 'active' ? 'on' : 'off']">
              {{ p.status === 'active' ? '已启用' : '已停用' }}
            </view>
          </view>

          <view class="price-row">
            <text class="price-cur">¥</text>
            <text class="price-num">{{ formatPrice(p.price) }}</text>
            <text class="price-unit">/ {{ PERIOD_LABEL[p.period] || p.period }}</text>
          </view>

          <view class="rights">
            <view v-for="(r, i) in p.rights" :key="i" class="r-row">
              <view class="dot" />
              <text>{{ r }}</text>
            </view>
            <view v-if="p.constraints" class="constraint-grid">
              <view v-if="p.constraints.pushSlots" class="c-item">
                <text class="c-label">推送位</text>
                <text class="c-value">{{ p.constraints.pushSlots }}</text>
              </view>
              <view v-if="p.constraints.weightLimit" class="c-item">
                <text class="c-label">权重上限</text>
                <text class="c-value">{{ p.constraints.weightLimit }}</text>
              </view>
              <view v-if="p.constraints.bannerLimit" class="c-item">
                <text class="c-label">Banner</text>
                <text class="c-value">{{ p.constraints.bannerLimit }}</text>
              </view>
              <view v-if="p.constraints.impressionLimit" class="c-item">
                <text class="c-label">月曝光</text>
                <text class="c-value">{{ p.constraints.impressionLimit }}</text>
              </view>
            </view>
          </view>

          <view class="actions">
            <view class="link-btn" @click="toggleSubscriptions(p.id)">
              <text>{{ expandedPlanId === p.id ? '收起订阅商家' : '查看订阅商家' }}</text>
              <Icon
                :name="expandedPlanId === p.id ? 'chevron-up' : 'chevron-down'"
                :size="22"
                color="var(--text-tertiary)"
              />
            </view>
            <view class="btn ghost" @click="openEditSheet(p)">编辑</view>
          </view>

          <view v-if="expandedPlanId === p.id" class="sub-list">
            <view v-if="subscriptionLoadingId === p.id" class="sub-empty">加载中…</view>
            <view v-else-if="!subscriptionCache.get(p.id)?.length" class="sub-empty">
              暂无商家订阅
            </view>
            <view v-else class="sub-rows">
              <view class="sub-head-row">
                <text class="sub-col name">商家</text>
                <text class="sub-col status">状态</text>
                <text class="sub-col date">到期</text>
              </view>
              <view v-for="s in subscriptionCache.get(p.id)" :key="s.id" class="sub-row">
                <text class="sub-col name">{{ s.merchantName || '—' }}</text>
                <text
                  class="sub-col status"
                  :style="{ color: SUB_STATUS_LABEL[s.status]?.tone || '#909399' }"
                >
                  {{ SUB_STATUS_LABEL[s.status]?.label || s.status }}
                </text>
                <text class="sub-col date">{{ formatSubDate(s.endAt) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 增值单项 -->
        <view class="card" v-if="addonItems.length > 0">
          <view class="card-head-row">
            <Icon name="gift" :size="28" color="var(--brand-primary)" />
            <text class="card-title">增值单项购买</text>
          </view>
          <view class="addon-list">
            <view
              v-for="a in addonItems"
              :key="a.id"
              class="addon-row"
              @click="openEditSheet(plans.find((x) => x.id === a.id)!)"
            >
              <view class="addon-icon">
                <Icon :name="a.icon" :size="24" color="var(--brand-primary)" />
              </view>
              <text class="addon-label">{{ a.label }}</text>
              <text class="addon-price">¥{{ a.price }}</text>
              <Icon name="chevron-right" :size="22" color="var(--text-tertiary)" />
            </view>
          </view>
        </view>

        <view class="add-plan" @click="openCreateSheet('ad')">
          <Icon name="plus" :size="28" color="#fff" />
          <text>新增广告推送套餐</text>
        </view>
      </view>

      <!-- 会员状态 -->
      <view v-else-if="tab === 'status'">
        <view class="card status-card">
          <text class="card-title">会员订阅概况</text>
          <view class="status-grid">
            <view class="s-item">
              <text class="s-num">{{ statusOverview.yearly }}</text>
              <text class="s-label">VIP 年费</text>
            </view>
            <view class="s-item">
              <text class="s-num">{{ statusOverview.monthly }}</text>
              <text class="s-label">月费</text>
            </view>
            <view class="s-item">
              <text class="s-num">{{ statusOverview.trial }}</text>
              <text class="s-label">试用</text>
            </view>
            <view class="s-item">
              <text class="s-num">{{ statusOverview.expiringSoon }}</text>
              <text class="s-label">7 天内到期</text>
            </view>
          </view>
          <text class="hint">数据来源:当前所有套餐订阅记录实时聚合</text>
        </view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>

    <!-- 套餐编辑底部 sheet -->
    <view v-if="planSheetOpen" class="mask" @click="closePlanSheet">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ planSheetTitle }}</text>
          <view :class="['sheet-save', planSheetSaving ? 'disabled' : '']" @click="savePlanSheet">
            {{ planSheetSaving ? '保存中…' : '保存' }}
          </view>
        </view>

        <scroll-view scroll-y class="sheet-body">
          <view class="form-block">
            <text class="form-label">套餐名称</text>
            <input
              v-model="planDraft.name"
              class="form-input"
              placeholder="例如：VIP 年费会员"
              maxlength="40"
            />
          </view>

          <view class="form-block">
            <text class="form-label">类型</text>
            <view class="chip-row">
              <view
                v-for="t in ['basic', 'ad', 'addon'] as MemberPlanType[]"
                :key="t"
                :class="[
                  'chip',
                  planDraft.type === t ? 'active' : '',
                  planSheetEditing ? 'locked' : '',
                ]"
                @click="!planSheetEditing && (planDraft.type = t)"
              >
                {{ TYPE_LABEL[t] }}
              </view>
            </view>
            <text v-if="planSheetEditing" class="form-hint"
              >类型创建后不可修改,避免订阅数据错位。</text
            >
          </view>

          <view class="form-block">
            <text class="form-label">计费周期</text>
            <view class="chip-row wrap">
              <view
                v-for="opt in PERIOD_OPTIONS"
                :key="opt.key"
                :class="['chip', planDraft.period === opt.key ? 'active' : '']"
                @click="planDraft.period = opt.key"
              >
                {{ opt.label }}
              </view>
            </view>
          </view>

          <view class="form-row-grid">
            <view class="grid-col">
              <text class="form-label">周期数</text>
              <input
                v-model.number="planDraft.periodCount"
                class="form-input"
                type="number"
                placeholder="1"
              />
              <text class="form-hint">如「12 个月年费」填 12</text>
            </view>
            <view class="grid-col">
              <text class="form-label">价格 (¥)</text>
              <input
                v-model.number="planDraft.price"
                class="form-input"
                type="number"
                placeholder="0.00"
              />
            </view>
          </view>

          <view class="form-block">
            <text class="form-label">原价 (¥，可选)</text>
            <input
              :value="planDraft.originalPrice ?? ''"
              class="form-input"
              type="number"
              placeholder="留空则不显示删除线价"
              @input="
                (e: any) => {
                  const v = Number(e.detail.value)
                  planDraft.originalPrice = Number.isFinite(v) && v > 0 ? v : null
                }
              "
            />
          </view>

          <view v-if="showTrialDaysField" class="form-block">
            <text class="form-label">套餐试用天数</text>
            <input
              v-model.number="planDraft.trialDays"
              class="form-input"
              type="number"
              placeholder="0 表示无套餐内试用"
            />
            <text class="form-hint">
              此处是「该套餐促销试用」,与全局「新商户试用期」不同(后者在套餐外侧设置)。
            </text>
          </view>

          <view class="form-block">
            <text class="form-label">权益列表(每行一条)</text>
            <textarea
              v-model="planDraft.rightsText"
              class="form-textarea"
              placeholder="例如：&#10;无限商品上架&#10;开通直播带货&#10;5 个员工账号"
              :auto-height="true"
              :maxlength="800"
            />
          </view>

          <view v-if="showConstraintsBlock" class="form-block">
            <text class="form-label">广告位配额</text>
            <view class="quota-grid">
              <view class="quota-item">
                <text class="quota-label">推送位</text>
                <input
                  v-model.number="planDraft.constraints.pushSlots"
                  class="form-input"
                  type="number"
                  placeholder="0"
                />
              </view>
              <view class="quota-item">
                <text class="quota-label">权重上限</text>
                <input
                  v-model.number="planDraft.constraints.weightLimit"
                  class="form-input"
                  type="number"
                  placeholder="0-100"
                />
              </view>
              <view class="quota-item">
                <text class="quota-label">Banner 数</text>
                <input
                  v-model.number="planDraft.constraints.bannerLimit"
                  class="form-input"
                  type="number"
                  placeholder="0"
                />
              </view>
              <view class="quota-item">
                <text class="quota-label">月曝光</text>
                <input
                  v-model.number="planDraft.constraints.impressionLimit"
                  class="form-input"
                  type="number"
                  placeholder="0"
                />
              </view>
            </view>
          </view>

          <view class="form-row-switch">
            <view class="form-row-info">
              <text class="form-row-title">标记为 HOT</text>
              <text class="form-row-desc">在卡片上展示 HOT 角标,吸引商户点击</text>
            </view>
            <view
              :class="['switch', planDraft.hot ? 'on' : '']"
              @click="planDraft.hot = !planDraft.hot"
            >
              <view class="thumb" />
            </view>
          </view>

          <view class="form-row-switch">
            <view class="form-row-info">
              <text class="form-row-title">上架状态</text>
              <text class="form-row-desc">下架后商户无法新订阅,已订阅商家不受影响</text>
            </view>
            <view
              :class="['switch', planDraft.status === 'active' ? 'on' : '']"
              @click="planDraft.status = planDraft.status === 'active' ? 'disabled' : 'active'"
            >
              <view class="thumb" />
            </view>
          </view>

          <view
            v-if="planSheetEditing && planDraft.id"
            class="delete-row"
            @click="confirmDeletePlan"
          >
            <Icon name="trash" :size="24" color="#F5222D" />
            <text>{{ planSheetDeleting ? '删除中…' : '删除该套餐' }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx;
  box-sizing: border-box;
}

.section-head {
  margin-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .section-title {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--text-primary);
  }
  .section-desc {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .section-count {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .head-title-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
}
.new-tag {
  padding: 2rpx 12rpx;
  background: linear-gradient(135deg, #ffd89b, #ffb300);
  color: #5c2d00;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 800;
}

.plan-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 2rpx dashed var(--border-default);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  position: relative;
  overflow: hidden;
  &.ad {
    border-color: var(--brand-primary);
  }
  &.is-hot {
    background: linear-gradient(180deg, rgba(255, 77, 45, 0.04), var(--bg-card));
  }
}
.hot-ribbon {
  position: absolute;
  top: 16rpx;
  right: -32rpx;
  width: 120rpx;
  text-align: center;
  background: linear-gradient(135deg, #ff4d2d, #faad14);
  color: #fff;
  font-size: 20rpx;
  font-weight: 800;
  padding: 4rpx 0;
  transform: rotate(45deg);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.15);
}
.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  .plan-title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8rpx;
    .name {
      font-size: 30rpx;
      font-weight: 800;
      color: var(--text-primary);
    }
  }
  .hot-tag {
    padding: 2rpx 10rpx;
    background: var(--brand-gradient);
    color: #fff;
    border-radius: 999rpx;
    font-size: 18rpx;
    font-weight: 800;
  }
  .status-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
    &.on {
      background: rgba(82, 196, 26, 0.1);
      color: #52c41a;
    }
    &.off {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text-tertiary);
    }
  }
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  .price-cur {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
  .price-num {
    font-size: 60rpx;
    font-weight: 800;
    color: var(--brand-primary);
    line-height: 1;
    font-family: var(--font-family-base);
  }
  .price-unit {
    font-size: 24rpx;
    color: var(--text-tertiary);
  }
  .price-original {
    margin-left: 8rpx;
    font-size: 22rpx;
    color: var(--text-tertiary);
    text-decoration: line-through;
  }
}
.rights {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.r-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
  .dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: var(--brand-primary);
    flex-shrink: 0;
  }
}
.constraint-grid {
  margin-top: 8rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8rpx;
  padding: 12rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
}
.c-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  .c-label {
    font-size: 18rpx;
    color: var(--text-tertiary);
  }
  .c-value {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
}
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding-top: 8rpx;
}
.link-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
}

/* 订阅商家展开 */
.sub-list {
  margin-top: 8rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 12rpx;
}
.sub-empty {
  font-size: 22rpx;
  color: var(--text-tertiary);
  text-align: center;
  padding: 12rpx 0;
}
.sub-rows {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.sub-head-row,
.sub-row {
  display: flex;
  gap: 8rpx;
  font-size: 22rpx;
  padding: 6rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
}
.sub-head-row {
  color: var(--text-tertiary);
  font-weight: 700;
}
.sub-col {
  &.name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &.status {
    width: 100rpx;
    text-align: center;
    font-weight: 700;
  }
  &.date {
    width: 140rpx;
    text-align: right;
    font-family: var(--font-family-base);
  }
}

/* 卡片通用 */
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
}
.card-head-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
  .card-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
}
.addon-list {
  display: flex;
  flex-direction: column;
}
.addon-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .addon-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    background: rgba(255, 77, 45, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .addon-label {
    flex: 1;
    font-size: 24rpx;
    color: var(--text-primary);
  }
  .addon-price {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
}

.trial-card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.08), rgba(82, 196, 26, 0.02));
  border: 1rpx dashed rgba(82, 196, 26, 0.3);
  .trial-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: rgba(82, 196, 26, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .trial-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .trial-label {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .trial-desc {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
  .trial-value {
    font-size: 28rpx;
    font-weight: 800;
    color: #52c41a;
    font-family: var(--font-family-base);
  }
}
.add-plan {
  margin-top: 16rpx;
  padding: 24rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
}

/* 会员状态 */
.status-card {
  padding: 24rpx;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-top: 12rpx;
}
.s-item {
  background: var(--bg-page);
  border-radius: 16rpx;
  padding: 20rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .s-num {
    font-size: 48rpx;
    font-weight: 800;
    color: var(--brand-primary);
    line-height: 1;
    font-family: var(--font-family-base);
  }
  .s-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.status-card .hint {
  display: block;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
}

/* ==== 底部 sheet (套餐编辑) ==== */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #f7f8fa;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #ebeef5;
  background: #f7f8fa;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1d2129;
}
.sheet-save {
  padding: 12rpx 36rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  &.disabled {
    opacity: 0.5;
  }
}
.sheet-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  box-sizing: border-box;
}

.form-block {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.form-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #1d2129;
}
.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1d2129;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx 20rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1d2129;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  line-height: 1.5;
}
.form-hint {
  font-size: 20rpx;
  color: #909399;
  line-height: 1.4;
}

.form-row-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  background: transparent;
}
.grid-col {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.chip-row {
  display: flex;
  gap: 12rpx;
  &.wrap {
    flex-wrap: wrap;
  }
}
.chip {
  padding: 10rpx 20rpx;
  background: #f7f8fa;
  border: 1rpx solid #ebeef5;
  color: #1d2129;
  border-radius: 999rpx;
  font-size: 24rpx;
  &.active {
    background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
    border-color: transparent;
    color: #fff;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
  &.locked {
    opacity: 0.6;
  }
}

.quota-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.quota-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .quota-label {
    font-size: 22rpx;
    color: #909399;
  }
}

.form-row-switch {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}
.form-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .form-row-title {
    font-size: 26rpx;
    font-weight: 700;
    color: #1d2129;
  }
  .form-row-desc {
    font-size: 20rpx;
    color: #909399;
    line-height: 1.4;
  }
}
.switch {
  flex-shrink: 0;
  width: 80rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  position: relative;
  transition: all 0.2s;
  .thumb {
    position: absolute;
    top: 2rpx;
    left: 2rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: all 0.2s;
    box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.15);
  }
  &.on {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
    .thumb {
      left: 38rpx;
      background: #fff;
    }
  }
}

.delete-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  color: #f5222d;
  font-size: 26rpx;
  font-weight: 700;
  border: 1rpx solid rgba(245, 34, 45, 0.2);
}
</style>
