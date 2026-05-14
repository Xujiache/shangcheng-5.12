<script setup lang="ts">
/**
 * PA-07 · 新建广场推送
 * 还原 原型图/platform-app.jsx::PA_PlazaPush
 * - 推送对象（商品/厂家）
 * - 选择内容（多商品）
 * - 推送位置（广场入口/Banner/分类首屏）
 * - 标签
 * - 投放对象
 * - 排期 / 权重 / 加价 / 佣金
 * - 推送语
 * - 存草稿 / 立即推送
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { plazaService } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const subjectType = ref<'product' | 'factory'>('product')
// 商品由上一步页面通过 query string 传入（productIds 逗号分隔 / 单品 productId / 仅 count），
// 这里不再硬编码示例商品,避免出现"假数据已选 6 件"误导用户
const products = ref<{ id: string; name: string }[]>([])
const positions = ref<string[]>(['商家APP · 广场入口'])
const tags = ref<string[]>(['🔥本周热推'])
const audience = ref<'all' | 'region' | 'level'>('all')

const today = new Date()
const in30Days = new Date(today.getTime() + 30 * 86400000)
const scheduleStart = ref(today.toISOString().slice(0, 10))
const scheduleEnd = ref(in30Days.toISOString().slice(0, 10))
const weight = ref(80)
const markupRange = ref('¥200~500')
const commission = ref(8)
const pushText = ref('平台精选 · 厂家直供 · 一键代理')
const submitting = ref(false)

const POSITIONS = ['商家APP · 广场入口', '广场首屏 Banner', '分类首屏', '客户端首页推荐']
const ALL_TAGS = ['🔥本周热推', '新品', '厂家直供', '高佣金', '黑五特惠', 'A 级商户']
const AUDIENCE_OPTS = [
  { key: 'all' as const, label: '全部门店' },
  { key: 'region' as const, label: '指定区域' },
  { key: 'level' as const, label: '会员等级' },
]

const positionAvailable = computed(() => POSITIONS.filter((p) => !positions.value.includes(p)))

/**
 * 上一步页面（plaza/index.vue）跳转过来时,通过 query 串带商品 ID:
 * - `productIds=a,b,c` 批量推送（首选,主流程）
 * - `productId=xxx` 单品推送（兼容旧链接）
 * 把它们填入 `products.value`,后续 submit 才能拿到真实 productIds 传给后端。
 */
onLoad((options) => {
  const rawIds: string =
    (options?.productIds as string | undefined) ||
    (options?.productId as string | undefined) ||
    ''
  const ids = rawIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (ids.length > 0) {
    products.value = ids.map((id) => ({ id, name: `商品 ${id}` }))
    uni.showToast({ title: `已选 ${ids.length} 件`, icon: 'none' })
  } else if (options?.count) {
    uni.showToast({ title: `已选 ${options.count} 件`, icon: 'none' })
  }
})

function togglePosition(p: string) {
  const i = positions.value.indexOf(p)
  if (i >= 0) positions.value.splice(i, 1)
  else positions.value.push(p)
}

function toggleTag(t: string) {
  const i = tags.value.indexOf(t)
  if (i >= 0) tags.value.splice(i, 1)
  else tags.value.push(t)
}

function addCustomTag() {
  uni.showModal({
    title: '添加自定义标签',
    editable: true,
    placeholderText: '请输入标签名',
    success: (r) => {
      if (r.confirm && r.content) tags.value.push(r.content)
    },
  })
}

function addProduct() {
  uni.showToast({ title: '商品选择器 · 待开放', icon: 'none' })
}

function removeProduct(id: string) {
  products.value = products.value.filter((p) => p.id !== id)
}

function chooseSchedule() {
  uni.showActionSheet({
    itemList: ['7 天（短期推广）', '15 天（标准）', '30 天（长期）', '90 天（季度套餐）'],
    success: (r) => {
      const days = [7, 15, 30, 90][r.tapIndex]
      const start = new Date()
      const end = new Date(start.getTime() + days * 86400000)
      scheduleStart.value = start.toISOString().slice(0, 10)
      scheduleEnd.value = end.toISOString().slice(0, 10)
    },
  })
}

function changeWeight() {
  uni.showActionSheet({
    itemList: ['40 - 标准', '60 - 高曝光', '80 - 推荐', '95 - 强推（仅旗舰包）'],
    success: (r) => {
      weight.value = [40, 60, 80, 95][r.tapIndex]
    },
  })
}

function changeMarkup() {
  uni.showActionSheet({
    itemList: ['¥50~150', '¥200~500', '¥500~1000', '不限'],
    success: (r) => {
      markupRange.value = ['¥50~150', '¥200~500', '¥500~1000', '不限'][r.tapIndex]
    },
  })
}

function changeCommission() {
  uni.showActionSheet({
    itemList: ['5%', '8%', '12%', '15%'],
    success: (r) => {
      commission.value = [5, 8, 12, 15][r.tapIndex]
    },
  })
}

async function saveDraft() {
  uni.showToast({ title: '已存草稿', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 600)
}

async function submit() {
  if (products.value.length === 0) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  if (positions.value.length === 0) {
    uni.showToast({ title: '请选择推送位置', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await plazaService.createPush({
      subjectType: subjectType.value,
      productIds: products.value.map((p) => p.id),
      positions: positions.value,
      tags: tags.value,
      audience: audience.value,
      scheduleStart: scheduleStart.value,
      scheduleEnd: scheduleEnd.value,
      weight: weight.value,
      markupRange: markupRange.value,
      commission: commission.value,
      pushText: pushText.value,
    })
    uni.showToast({ title: '推送已发布', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="新建推送" right-icon="check" @right="submit" />

    <scroll-view scroll-y class="scroll">
      <!-- 推送对象 -->
      <view class="card">
        <text class="label">推送对象</text>
        <view class="chip-row">
          <view
            :class="['chip', subjectType === 'product' ? 'active' : '']"
            @click="subjectType = 'product'"
          >商品</view>
          <view
            :class="['chip', subjectType === 'factory' ? 'active' : '']"
            @click="subjectType = 'factory'"
          >厂家</view>
        </view>
      </view>

      <!-- 选择内容 -->
      <view class="card">
        <view class="card-head">
          <text class="label">选择内容（已选 {{ products.length }} 件）</text>
          <view class="add-btn" @click="addProduct">
            <Icon name="plus" :size="22" color="var(--brand-primary)" />
            <text>添加</text>
          </view>
        </view>
        <view class="product-list">
          <view v-for="p in products.slice(0, 3)" :key="p.id" class="p-row">
            <view class="dot" />
            <text class="p-name">{{ p.name }}</text>
            <view class="remove" @click="removeProduct(p.id)">
              <Icon name="close" :size="22" color="var(--text-tertiary)" />
            </view>
          </view>
          <view v-if="products.length > 3" class="more">… 还有 {{ products.length - 3 }} 件 ›</view>
        </view>
      </view>

      <!-- 推送位置 -->
      <view class="card">
        <text class="label">推送位置（已选 {{ positions.length }} 个）</text>
        <view class="chip-row wrap">
          <view
            v-for="p in POSITIONS"
            :key="p"
            :class="['chip', positions.includes(p) ? 'active' : '']"
            @click="togglePosition(p)"
          >{{ p }}</view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="card">
        <text class="label">标签（已选 {{ tags.length }}）</text>
        <view class="chip-row wrap">
          <view
            v-for="t in ALL_TAGS"
            :key="t"
            :class="['chip', tags.includes(t) ? 'active' : '']"
            @click="toggleTag(t)"
          >{{ t }}</view>
          <view class="chip add" @click="addCustomTag">
            <Icon name="plus" :size="22" color="var(--brand-primary)" />
            <text>自定义</text>
          </view>
        </view>
      </view>

      <!-- 投放对象 -->
      <view class="card">
        <text class="label">投放对象</text>
        <view class="chip-row">
          <view
            v-for="a in AUDIENCE_OPTS"
            :key="a.key"
            :class="['chip', audience === a.key ? 'active' : '']"
            @click="audience = a.key"
          >{{ a.label }}</view>
        </view>
      </view>

      <!-- 排期 + 权重 + 加价 + 佣金 -->
      <view class="card">
        <view class="config-row" @click="chooseSchedule">
          <text class="r-label">排期</text>
          <view class="r-value">
            <text class="time">{{ scheduleStart }} → {{ scheduleEnd }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="config-row" @click="changeWeight">
          <text class="r-label">排序权重</text>
          <view class="r-value">
            <text class="num">{{ weight }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="config-row" @click="changeMarkup">
          <text class="r-label">建议加价</text>
          <view class="r-value">
            <text>{{ markupRange }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="config-row" @click="changeCommission">
          <text class="r-label">建议佣金</text>
          <view class="r-value">
            <text class="num">{{ commission }}%</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 推送语 -->
      <view class="card">
        <text class="label">推送语</text>
        <input v-model="pushText" class="push-input" placeholder="平台精选 · 厂家直供 · 一键代理" />
      </view>

      <view style="height: 180rpx;" />
    </scroll-view>

    <view class="ft">
      <view class="ft-btn ghost" @click="saveDraft">存草稿</view>
      <view :class="['ft-btn primary', submitting ? 'loading' : '']" @click="submit">
        {{ submitting ? '推送中…' : '立即推送' }}
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
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx;
  box-sizing: border-box;
}
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
  .add-btn {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 14rpx;
    background: rgba(255,77,45,0.08);
    color: var(--brand-primary);
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
  }
}
.label {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
  margin-bottom: 12rpx;
}
.chip-row {
  display: flex;
  gap: 12rpx;
  &.wrap { flex-wrap: wrap; }
}
.chip {
  padding: 10rpx 20rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  color: var(--text-primary);
  border-radius: 999rpx;
  font-size: 24rpx;
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  &.active {
    background: var(--brand-gradient);
    border-color: transparent;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
  &.add {
    color: var(--brand-primary);
    border-style: dashed;
  }
}
.product-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.p-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 0;
  font-size: 24rpx;
  color: var(--text-primary);
  .dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: var(--brand-primary);
    flex-shrink: 0;
  }
  .p-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .remove { padding: 4rpx; }
}
.more {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  padding-left: 22rpx;
}
.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .r-label { font-size: 26rpx; color: var(--text-tertiary); }
  .r-value {
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    .num {
      color: var(--brand-primary);
      font-family: var(--font-family-base);
    }
    .time {
      font-family: var(--font-family-base);
      font-size: 24rpx;
    }
  }
}
.push-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.ft {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);
}
.ft-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
    &.loading { opacity: 0.7; }
  }
}
</style>
