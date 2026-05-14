<script setup lang="ts">
/**
 * PA-08 · 会员&推广套餐
 * 还原 原型图/platform-app.jsx::PA_Members
 * - Tab：会员套餐 / 广告推送套餐 / 缴费订单 / 会员状态
 * - 套餐卡：名称 + 价格 + 权益列表 + 编辑按钮
 * - 增值单项 + 试用期配置
 * - 新增套餐按钮
 */
import { ref, computed, onMounted } from 'vue'
import { memberService, type SubscriptionStatusOverview } from '../../services'
import type { MemberPlan } from '@jiujiu/shared/types'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

type TabKey = 'basic' | 'ad' | 'pay-orders' | 'status'

const tab = ref<TabKey>('basic')
const plans = ref<MemberPlan[]>([])
const loading = ref(false)
const statusOverview = ref<SubscriptionStatusOverview>({ yearly: 0, monthly: 0, trial: 0, expiringSoon: 0 })

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '会员套餐' },
  { key: 'ad', label: '广告推送套餐' },
  { key: 'pay-orders', label: '缴费订单' },
  { key: 'status', label: '会员状态' },
]

// 增值单项从后端 plans 里 type='addon' 派生；本地不再保留写死价格
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

// trialDays 持久化到 SystemConfig；首次加载从后端读
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
    const [planList, td] = await Promise.all([
      memberService.plans(),
      memberService.trialDays(),
    ])
    plans.value = planList
    trialDays.value = td
    // 切到 status tab 时再 lazy 拉取 overview（避免每次进页面都遍历）
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

/**
 * 套餐编辑：调后端 savePlan 真实落库（PATCH 用 POST 同接口实现，按是否带 id 区分）
 *
 * - 上下架：toggle status 字段调 savePlan
 * - 修改价格/权益/限制：弹简单 prompt，让用户输入后调 savePlan
 *   （详细编辑表单在 admin-pc 平台后台，platform-app 只做快速编辑）
 */
async function editPlan(p: MemberPlan) {
  uni.showActionSheet({
    itemList: ['修改价格', '修改权益', '修改限制', p.status === 'active' ? '下架' : '上架'],
    success: async (r) => {
      try {
        if (r.tapIndex === 3) {
          // 上下架
          const next = p.status === 'active' ? 'disabled' : 'active'
          await memberService.savePlan({ id: p.id, status: next })
          uni.showToast({ title: next === 'active' ? '已上架' : '已下架', icon: 'success' })
          await load()
          return
        }
        if (r.tapIndex === 0) {
          // 改价格
          const v = await promptInput('修改价格', '请输入新价格（元）', String(p.price))
          if (!v) return
          const price = Number(v)
          if (!Number.isFinite(price) || price < 0) {
            uni.showToast({ title: '价格非法', icon: 'none' })
            return
          }
          await memberService.savePlan({ id: p.id, price })
          uni.showToast({ title: '价格已更新', icon: 'success' })
          await load()
          return
        }
        if (r.tapIndex === 1) {
          // 改权益（多行）
          const v = await promptInput(
            '修改权益',
            '一行一条权益（最多 8 条）',
            (Array.isArray(p.rights) ? p.rights : []).join('\n'),
          )
          if (v === null) return
          const rights = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 8)
          await memberService.savePlan({ id: p.id, rights })
          uni.showToast({ title: '权益已更新', icon: 'success' })
          await load()
          return
        }
        if (r.tapIndex === 2) {
          // 改限制（仅推送位/Banner/月曝光三项；通过 JSON 字符串编辑）
          const cur = p.constraints
            ? JSON.stringify(p.constraints)
            : '{"pushSlots":0,"bannerLimit":0,"impressionLimit":0}'
          const v = await promptInput('修改限制', '请输入 JSON', cur)
          if (!v) return
          let parsed: any
          try {
            parsed = JSON.parse(v)
          } catch {
            uni.showToast({ title: 'JSON 格式错误', icon: 'none' })
            return
          }
          await memberService.savePlan({ id: p.id, constraints: parsed })
          uni.showToast({ title: '限制已更新', icon: 'success' })
          await load()
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '更新失败', icon: 'none' })
      }
    },
  })
}

function addPlan() {
  uni.showActionSheet({
    itemList: ['新增会员套餐', '新增广告推送套餐', '新增增值单项'],
    success: async (r) => {
      const type = (['basic', 'ad', 'addon'] as const)[r.tapIndex]
      const name = await promptInput(
        '新增套餐',
        `请输入${['会员', '广告', '增值'][r.tapIndex]}套餐名称`,
      )
      if (!name) return
      const priceStr = await promptInput('新增套餐', '请输入价格（元）', '99')
      if (!priceStr) return
      const price = Number(priceStr)
      if (!Number.isFinite(price) || price < 0) {
        uni.showToast({ title: '价格非法', icon: 'none' })
        return
      }
      try {
        await memberService.savePlan({
          name,
          price,
          type,
          period: 'monthly',
          periodCount: 1,
          status: 'active',
          rights: [],
        } as Partial<MemberPlan>)
        uni.showToast({ title: '已创建', icon: 'success' })
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '创建失败', icon: 'none' })
      }
    },
  })
}

/**
 * uni.showModal 包装：让 PC/手机端都能弹输入框拿到字符串结果
 * 取消返回 null，确认返回 content（可能是空字符串，调用方需要判断）
 */
function promptInput(title: string, placeholder: string, initial = ''): Promise<string | null> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content: placeholder,
      editable: true,
      placeholderText: initial,
      success: (r) => {
        if (r.confirm) resolve(r.content || initial)
        else resolve(null)
      },
      fail: () => resolve(null),
    })
  })
}

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

const PERIOD_LABEL: Record<string, string> = {
  monthly: '月',
  yearly: '年',
  weekly: '周',
  daily: '天',
  oneoff: '次',
}

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
          <text class="section-title">会员套餐（基础功能）</text>
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
            <text v-if="p.originalPrice" class="price-original">{{ formatPrice(p.originalPrice) }}</text>
          </view>

          <view class="rights">
            <view v-for="(r, i) in p.rights" :key="i" class="r-row">
              <Icon name="check" :size="22" color="#52C41A" />
              <text>{{ r }}</text>
            </view>
          </view>

          <view class="actions">
            <view class="btn ghost" @click="editPlan(p)">编辑</view>
          </view>
        </view>
      </view>

      <!-- 广告推送套餐 -->
      <view v-else-if="tab === 'ad'">
        <view class="section-head">
          <view class="head-title-row">
            <text class="section-title">广告推送套餐</text>
            <view class="new-tag">新</view>
          </view>
          <text class="section-desc">帮商户在选品广场/首页 Banner 获得曝光位，错峰出售</text>
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
            <view class="btn ghost" @click="editPlan(p)">编辑</view>
          </view>
        </view>

        <!-- 增值单项（从后端 plans 派生，type='addon'） -->
        <view class="card" v-if="addonItems.length > 0">
          <view class="card-head-row">
            <Icon name="gift" :size="28" color="var(--brand-primary)" />
            <text class="card-title">增值单项购买</text>
          </view>
          <view class="addon-list">
            <view v-for="a in addonItems" :key="a.id" class="addon-row">
              <view class="addon-icon">
                <Icon :name="a.icon" :size="24" color="var(--brand-primary)" />
              </view>
              <text class="addon-label">{{ a.label }}</text>
              <text class="addon-price">¥{{ a.price }}</text>
              <Icon name="chevron-right" :size="22" color="var(--text-tertiary)" />
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

        <view class="add-plan" @click="addPlan">
          <Icon name="plus" :size="28" color="#fff" />
          <text>新增套餐</text>
        </view>
      </view>

      <!-- 会员状态（真实订阅聚合：遍历套餐 + subscriptions 实时计数） -->
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
          <text class="hint">数据来源：当前所有套餐订阅记录实时聚合</text>
        </view>
      </view>

      <view style="height: 40rpx;" />
    </scroll-view>
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
  .section-title { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
  .section-desc { font-size: 22rpx; color: var(--text-tertiary); }
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
  background: linear-gradient(135deg, #FFD89B, #FFB300);
  color: #5C2D00;
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
    background: linear-gradient(180deg, rgba(255,77,45,0.04), var(--bg-card));
  }
}
.hot-ribbon {
  position: absolute;
  top: 16rpx;
  right: -32rpx;
  width: 120rpx;
  text-align: center;
  background: linear-gradient(135deg, #FF4D2D, #FAAD14);
  color: #fff;
  font-size: 20rpx;
  font-weight: 800;
  padding: 4rpx 0;
  transform: rotate(45deg);
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.15);
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
    .name { font-size: 30rpx; font-weight: 800; color: var(--text-primary); }
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
    &.on { background: rgba(82,196,26,0.1); color: #52C41A; }
    &.off { background: rgba(0,0,0,0.05); color: var(--text-tertiary); }
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
  .c-label { font-size: 18rpx; color: var(--text-tertiary); }
  .c-value {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding-top: 8rpx;
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
  &:last-child { border-bottom: none; }
  .addon-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    background: rgba(255,77,45,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .addon-label { flex: 1; font-size: 24rpx; color: var(--text-primary); }
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
  background: linear-gradient(135deg, rgba(82,196,26,0.08), rgba(82,196,26,0.02));
  border: 1rpx dashed rgba(82,196,26,0.3);
  .trial-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: rgba(82,196,26,0.15);
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
    .trial-label { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
    .trial-desc { font-size: 20rpx; color: var(--text-tertiary); }
  }
  .trial-value {
    font-size: 28rpx;
    font-weight: 800;
    color: #52C41A;
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
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
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
</style>
