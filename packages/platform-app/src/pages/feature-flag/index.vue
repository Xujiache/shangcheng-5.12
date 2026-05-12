<script setup lang="ts">
/**
 * PA-12 · 商家端功能开关
 * 还原 原型图/platform-app.jsx::PA_FeatureToggle
 * - 作用对象（全部/厂家/门店/指定）
 * - 首页快捷入口（9 项 + 标签）
 * - 商户角色入口按钮（5 项）
 * - 侧边/二级菜单（8 项）
 * - 灰度发布（比例 + 命中规则）
 */
import { ref, computed, onMounted } from 'vue'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

type AudienceKey = 'all' | 'factory' | 'store' | 'specific'

const audience = ref<AudienceKey>('all')
const grayscale = ref(30)
const grayscaleRule = ref<'random' | 'whitelist' | 'level'>('random')

const AUDIENCE_OPTS: { key: AudienceKey; label: string }[] = [
  { key: 'all', label: '全部商家' },
  { key: 'factory', label: '仅厂家' },
  { key: 'store', label: '仅门店' },
  { key: 'specific', label: '指定商户' },
]

/** 首页快捷入口 */
const homeEntries = ref([
  { key: 'product', icon: 'package', label: '商品', enabled: true, tag: '常开', tagTone: 'success' },
  { key: 'order', icon: 'biz-order', label: '订单', enabled: true, tag: '常开', tagTone: 'success' },
  { key: 'customer', icon: 'biz-customer', label: '客户', enabled: true, tag: '常开', tagTone: 'success' },
  { key: 'chat', icon: 'biz-chat', label: '客服', enabled: true, tag: '', tagTone: '' },
  { key: 'store', icon: 'biz-store', label: '门店', enabled: true, tag: '仅厂家可见', tagTone: 'info' },
  { key: 'staff', icon: 'biz-staff', label: '员工', enabled: true, tag: '', tagTone: '' },
  { key: 'marketing', icon: 'biz-marketing', label: '营销', enabled: true, tag: '', tagTone: '' },
  { key: 'stats', icon: 'biz-stats', label: '数据', enabled: true, tag: '', tagTone: '' },
  { key: 'plaza', icon: 'biz-plaza', label: '选品广场', enabled: true, tag: 'HOT', tagTone: 'hot' },
  { key: 'booking', icon: 'ruler', label: '量尺预约', enabled: false, tag: '', tagTone: '' },
])

/** 商户角色入口按钮 */
const roleButtons = ref([
  { key: 'reg-store', label: '申请注册为门店（平台授权按钮）', enabled: true, tag: '图标常开', tagTone: 'success' },
  { key: 'reg-factory', label: '申请注册为厂家（平台授权按钮）', enabled: true, tag: '图标常开', tagTone: 'success' },
  { key: 'store-apply-agency', label: '门店向厂家申请代理', enabled: true, tag: '', tagTone: '' },
  { key: 'factory-invite-store', label: '厂家邀请门店', enabled: true, tag: '', tagTone: '' },
  { key: 'staff-invite', label: '员工邀请', enabled: true, tag: '', tagTone: '' },
])

/** 侧边 / 二级菜单 */
const sideMenus = ref([
  { key: 'product-ext', label: '产品扩展（申请代理）', enabled: true },
  { key: 'commission', label: '分佣客户管理', enabled: true },
  { key: 'withdraw', label: '提现处理', enabled: true },
  { key: 'decorate', label: '店铺装修', enabled: true },
  { key: 'group-buy', label: '营销中心 · 团购', enabled: false },
  { key: 'flash-sale', label: '营销中心 · 限时购', enabled: true },
  { key: 'chat-free', label: '在线客服（免费版）', enabled: true },
  { key: 'export', label: '数据导出（年费）', enabled: true },
])

const totalCount = computed(() => homeEntries.value.length + roleButtons.value.length + sideMenus.value.length)
const enabledCount = computed(() =>
  homeEntries.value.filter((x) => x.enabled).length +
  roleButtons.value.filter((x) => x.enabled).length +
  sideMenus.value.filter((x) => x.enabled).length,
)

function toggleEntry(list: { enabled: boolean }[], idx: number) {
  list[idx].enabled = !list[idx].enabled
  uni.showToast({
    title: list[idx].enabled ? '已开启' : '已关闭',
    icon: 'none',
    duration: 800,
  })
}

function reset() {
  uni.showModal({
    title: '重置开关',
    content: '将所有开关恢复默认值？',
    success: (r) => {
      if (r.confirm) {
        homeEntries.value.forEach((x) => (x.enabled = x.key !== 'booking'))
        roleButtons.value.forEach((x) => (x.enabled = true))
        sideMenus.value.forEach((x) => (x.enabled = x.key !== 'group-buy'))
        uni.showToast({ title: '已重置', icon: 'success' })
      }
    },
  })
}

function changeGrayscale() {
  uni.showActionSheet({
    itemList: ['10% (谨慎)', '30% (推荐)', '50% (一半)', '100% (全量)'],
    success: (r) => {
      grayscale.value = [10, 30, 50, 100][r.tapIndex]
      uni.showToast({ title: `灰度比例 ${grayscale.value}%`, icon: 'success' })
    },
  })
}

function changeGrayscaleRule() {
  uni.showActionSheet({
    itemList: ['随机抽样', '白名单', '按等级灰度'],
    success: (r) => {
      grayscaleRule.value = (['random', 'whitelist', 'level'] as const)[r.tapIndex]
    },
  })
}

const GRAYSCALE_LABEL: Record<string, string> = {
  random: '随机抽样',
  whitelist: '白名单',
  level: '按等级',
}

onMounted(() => {})
</script>

<template>
  <view class="page">
    <NavBar title="商家端功能开关" right-icon="refresh" @right="reset" />

    <scroll-view scroll-y class="scroll">
      <!-- 顶部提示 -->
      <view class="tip-strip">
        <Icon name="info" :size="26" color="var(--brand-primary)" />
        <text>控制商家 APP 后台的按钮 / 图标 / 菜单显隐 · 立即生效</text>
      </view>

      <!-- 总览卡 -->
      <view class="hero">
        <view class="hero-stat">
          <text class="num">{{ enabledCount }}</text>
          <text class="total">/ {{ totalCount }}</text>
        </view>
        <view class="hero-info">
          <text class="label">已开启开关</text>
          <view class="progress">
            <view class="bar" :style="{ width: (enabledCount / totalCount * 100).toFixed(0) + '%' }" />
          </view>
        </view>
      </view>

      <!-- 作用对象 -->
      <view class="card">
        <text class="card-label">作用对象</text>
        <view class="chip-row">
          <view
            v-for="a in AUDIENCE_OPTS"
            :key="a.key"
            :class="['chip', audience === a.key ? 'active' : '']"
            @click="audience = a.key"
          >{{ a.label }}</view>
        </view>
        <text class="card-hint">当前修改将应用到 {{ AUDIENCE_OPTS.find(a => a.key === audience)?.label }}</text>
      </view>

      <!-- 首页快捷入口 -->
      <view class="section-title">
        <Icon name="biz-home" :size="28" color="var(--brand-primary)" />
        <text>商家首页 · 快捷入口</text>
        <text class="section-meta">{{ homeEntries.filter(x => x.enabled).length }} / {{ homeEntries.length }}</text>
      </view>
      <view class="card switch-card">
        <view
          v-for="(e, i) in homeEntries"
          :key="e.key"
          class="switch-row"
          :class="{ 'with-divider': i < homeEntries.length - 1 }"
        >
          <view class="row-icon">
            <Icon :name="e.icon" :size="28" :color="e.enabled ? 'var(--brand-primary)' : 'var(--text-tertiary)'" />
          </view>
          <view class="row-info">
            <text class="row-label">{{ e.label }}</text>
            <view v-if="e.tag" :class="['row-tag', `tone-${e.tagTone}`]">{{ e.tag }}</view>
          </view>
          <view :class="['switch', e.enabled ? 'on' : '']" @click="toggleEntry(homeEntries, i)">
            <view class="thumb" />
          </view>
        </view>
      </view>

      <!-- 商户角色入口 -->
      <view class="section-title">
        <Icon name="user-add" :size="28" color="#A855F7" />
        <text>商户角色 · 入口按钮</text>
        <text class="section-meta">{{ roleButtons.filter(x => x.enabled).length }} / {{ roleButtons.length }}</text>
      </view>
      <view class="card switch-card">
        <view
          v-for="(b, i) in roleButtons"
          :key="b.key"
          class="switch-row"
          :class="{ 'with-divider': i < roleButtons.length - 1 }"
        >
          <view class="row-info no-icon">
            <text class="row-label">{{ b.label }}</text>
            <view v-if="b.tag" :class="['row-tag', `tone-${b.tagTone}`]">{{ b.tag }}</view>
          </view>
          <view :class="['switch', b.enabled ? 'on' : '']" @click="toggleEntry(roleButtons, i)">
            <view class="thumb" />
          </view>
        </view>
      </view>

      <!-- 侧边菜单 -->
      <view class="section-title">
        <Icon name="menu" :size="28" color="#52C41A" />
        <text>侧边 / 二级菜单</text>
        <text class="section-meta">{{ sideMenus.filter(x => x.enabled).length }} / {{ sideMenus.length }}</text>
      </view>
      <view class="card switch-card">
        <view
          v-for="(m, i) in sideMenus"
          :key="m.key"
          class="switch-row simple"
          :class="{ 'with-divider': i < sideMenus.length - 1 }"
        >
          <view class="dot" :class="{ active: m.enabled }" />
          <text class="row-label">{{ m.label }}</text>
          <view :class="['switch', m.enabled ? 'on' : '']" @click="toggleEntry(sideMenus, i)">
            <view class="thumb" />
          </view>
        </view>
      </view>

      <!-- 灰度发布 -->
      <view class="card grayscale-card">
        <view class="g-title">
          <Icon name="filter" :size="28" color="#FAAD14" />
          <text>灰度发布</text>
        </view>
        <text class="g-desc">开关变更先对部分商户生效，验证无误后全量推送</text>

        <view class="g-progress">
          <view class="g-progress-bar">
            <view class="g-progress-fill" :style="{ width: grayscale + '%' }" />
          </view>
          <view class="g-progress-labels">
            <text>0%</text>
            <text class="active">{{ grayscale }}% 当前</text>
            <text>100%</text>
          </view>
        </view>

        <view class="g-row" @click="changeGrayscale">
          <text class="g-label">灰度比例</text>
          <view class="g-value">
            <text class="g-num">{{ grayscale }}%</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="g-row" @click="changeGrayscaleRule">
          <text class="g-label">命中规则</text>
          <view class="g-value">
            <text>{{ GRAYSCALE_LABEL[grayscaleRule] }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <view style="height: 60rpx;" />
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
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}

.tip-strip {
  margin: 16rpx 24rpx 0;
  padding: 14rpx 20rpx;
  background: rgba(255,77,45,0.06);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--text-secondary);
  line-height: 1.4;
}

.hero {
  margin: 12rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #FF4D2D, #FAAD14);
  color: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.25);
}
.hero-stat {
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
  font-family: var(--font-family-base);
  .num {
    font-size: 72rpx;
    font-weight: 800;
    line-height: 1;
  }
  .total {
    font-size: 28rpx;
    opacity: 0.9;
    margin-left: 4rpx;
  }
}
.hero-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .label {
    font-size: 24rpx;
    opacity: 0.95;
  }
  .progress {
    width: 100%;
    height: 8rpx;
    background: rgba(255,255,255,0.25);
    border-radius: 4rpx;
    overflow: hidden;
    .bar {
      height: 100%;
      background: #fff;
      border-radius: 4rpx;
      transition: width .3s;
    }
  }
}

.card {
  margin: 16rpx 24rpx 0;
  padding: 20rpx 24rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm);
}
.card-label {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12rpx;
}
.chip-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.chip {
  padding: 10rpx 20rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-primary);
  &.active {
    background: var(--brand-gradient);
    border-color: transparent;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
}
.card-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
}

.section-title {
  margin: 24rpx 24rpx 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
  .section-meta {
    margin-left: auto;
    font-size: 22rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
    font-weight: 400;
  }
}

.switch-card {
  padding: 0 24rpx;
  margin-top: 12rpx;
}
.switch-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  &.with-divider {
    border-bottom: 1rpx dashed var(--border-light);
  }
  &.simple {
    gap: 10rpx;
  }
  .row-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 16rpx;
    background: var(--bg-page);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .row-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    &.no-icon { padding-left: 0; }
  }
  .row-label {
    font-size: 26rpx;
    color: var(--text-primary);
    line-height: 1.3;
  }
  .row-tag {
    align-self: flex-start;
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
    font-size: 18rpx;
    font-weight: 700;
    &.tone-success { background: rgba(82,196,26,0.1); color: #52C41A; }
    &.tone-info { background: rgba(18,150,219,0.1); color: #1296DB; }
    &.tone-hot { background: var(--brand-gradient); color: #fff; }
  }
  .dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
    &.active { background: var(--brand-primary); }
  }
}
.switch {
  flex-shrink: 0;
  width: 72rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  position: relative;
  transition: all .2s;
  .thumb {
    position: absolute;
    top: 2rpx;
    left: 2rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: all .2s;
    box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.15);
  }
  &.on {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
    .thumb {
      left: 34rpx;
      background: #fff;
    }
  }
}

/* 灰度发布 */
.grayscale-card {
  margin-top: 24rpx;
  background: linear-gradient(180deg, rgba(250,173,20,0.06), var(--bg-card));
  border: 1rpx dashed rgba(250,173,20,0.3);
}
.g-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}
.g-desc {
  display: block;
  font-size: 20rpx;
  color: var(--text-tertiary);
  margin-bottom: 16rpx;
}
.g-progress {
  margin-bottom: 16rpx;
}
.g-progress-bar {
  width: 100%;
  height: 16rpx;
  background: var(--bg-page);
  border-radius: 999rpx;
  overflow: hidden;
}
.g-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF4D2D, #FAAD14);
  border-radius: 999rpx;
  transition: width .3s;
}
.g-progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
  font-size: 18rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
  .active {
    color: #FAAD14;
    font-weight: 700;
  }
}
.g-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-top: 1rpx dashed rgba(250,173,20,0.2);
  .g-label { font-size: 24rpx; color: var(--text-tertiary); }
  .g-value {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    .g-num {
      color: #FAAD14;
      font-family: var(--font-family-base);
    }
  }
}
</style>
