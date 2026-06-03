<script setup lang="ts">
/**
 * PA-07 · 新建广场推送
 *
 * 字段:推送对象 / 选择内容(多商品) / 推送位置 / 标签 / 投放对象 /
 *      排期 / 权重 / 加价 / 佣金 / 推送语
 *
 * 商品选择器(本页内全屏 sheet):
 *   - 拉 plazaService.products 列表(/p/plaza/products 已过滤 status='active'),
 *     按 name / merchantName 关键字本地过滤
 *   - 支持多选,确认后回填 products.value(name/merchant/price/image 全保留)
 *   - 已有选中(URL 传入 productIds 或上次确认的)在 picker 内会预选
 *
 * 兼容入口:
 *   - 上一步页 plaza/index.vue 通过 query `productIds=a,b,c` 批量推送
 *   - 单品推送 `productId=xxx`(兼容旧链接)
 *   - 仅传 `count` 时,picker 仍可自由选商品(展示纯计数信息)
 *
 * 草稿 / 立即推送都走 plazaService.createPush,通过 `status` 字段区分。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { plazaService } from '../../services'
import { formatPrice } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

interface PickedProduct {
  id: string
  name: string
  merchant?: string
  price?: number
  image?: string
}

const subjectType = ref<'product' | 'factory'>('product')
const products = ref<PickedProduct[]>([])
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
const saving = ref(false)

const POSITIONS = ['商家APP · 广场入口', '广场首屏 Banner', '分类首屏', '客户端首页推荐']
const ALL_TAGS = ['🔥本周热推', '新品', '厂家直供', '高佣金', '黑五特惠', 'A 级商户']
const AUDIENCE_OPTS = [
  { key: 'all' as const, label: '全部门店' },
  { key: 'region' as const, label: '指定区域' },
  { key: 'level' as const, label: '会员等级' },
]

onLoad((options) => {
  const rawIds: string =
    (options?.productIds as string | undefined) || (options?.productId as string | undefined) || ''
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

// ========== 商品选择器 ==========
const pickerOpen = ref(false)
const pickerLoading = ref(false)
const pickerKeyword = ref('')
const pickerList = ref<PickedProduct[]>([])
const pickerSelected = ref<Set<string>>(new Set())
// 缓存已抓到的商品详情,picker 取消/重开都复用,避免重复请求
const pickerCache = ref<PickedProduct[]>([])

/**
 * 拉一次全平台已上架商品(plazaProductsAll 默认 status='active',include merchant),
 * 抓 200 条足够移动端 picker 浏览;若需要分页可后续增加.
 */
async function ensurePickerList() {
  if (pickerCache.value.length > 0) {
    pickerList.value = pickerCache.value
    return
  }
  pickerLoading.value = true
  try {
    const res = (await plazaService.products({ pageSize: 100 })) as { list?: any[] } | any[]
    const list = Array.isArray(res) ? res : Array.isArray(res?.list) ? res!.list! : []
    pickerCache.value = list.map(
      (x: any): PickedProduct => ({
        id: String(x.id ?? ''),
        name: x.name || x.productName || '未命名商品',
        merchant: x.factory || x.factoryName || x.merchant?.name || '',
        price:
          typeof x.price === 'number'
            ? x.price
            : typeof x.startPrice === 'number'
              ? x.startPrice
              : 0,
        image: x.image || x.productImage || (Array.isArray(x.images) ? x.images[0] : '') || '',
      }),
    )
    pickerList.value = pickerCache.value
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载商品失败', icon: 'none' })
    pickerList.value = []
  } finally {
    pickerLoading.value = false
  }
}

async function openPicker() {
  pickerSelected.value = new Set(products.value.map((p) => p.id))
  pickerKeyword.value = ''
  pickerOpen.value = true
  await ensurePickerList()
}

function closePicker() {
  pickerOpen.value = false
}

function togglePick(id: string) {
  if (pickerSelected.value.has(id)) pickerSelected.value.delete(id)
  else pickerSelected.value.add(id)
  pickerSelected.value = new Set(pickerSelected.value)
}

function confirmPicker() {
  const ids = Array.from(pickerSelected.value)
  // 优先从 picker 列表/缓存里取完整信息;选中但已不在列表里的(可能是历史 URL 传入)保留原有 stub
  const lookup = new Map(pickerCache.value.map((p) => [p.id, p]))
  const existingMap = new Map(products.value.map((p) => [p.id, p]))
  products.value = ids.map((id) => {
    const fromPicker = lookup.get(id)
    if (fromPicker) return fromPicker
    return existingMap.get(id) || { id, name: `商品 ${id}` }
  })
  pickerOpen.value = false
  uni.showToast({ title: `已选 ${products.value.length} 件`, icon: 'none' })
}

const filteredPicker = computed(() => {
  const kw = pickerKeyword.value.trim().toLowerCase()
  if (!kw) return pickerList.value
  return pickerList.value.filter(
    (p) =>
      p.name.toLowerCase().includes(kw) ||
      (p.merchant || '').toLowerCase().includes(kw) ||
      p.id.toLowerCase().includes(kw),
  )
})

function removeProduct(id: string) {
  products.value = products.value.filter((p) => p.id !== id)
}

function chooseSchedule() {
  uni.showActionSheet({
    itemList: ['7 天(短期推广)', '15 天(标准)', '30 天(长期)', '90 天(季度套餐)'],
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
    itemList: ['40 - 标准', '60 - 高曝光', '80 - 推荐', '95 - 强推(仅旗舰包)'],
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

// 把 '¥200~500' / '不限' 之类的展示文案解析成后端需要的数值区间
function parseMarkup(s: string): { suggestMarkupMin?: number; suggestMarkupMax?: number } {
  const nums = (s.match(/\d+/g) || []).map(Number)
  if (nums.length >= 2) return { suggestMarkupMin: nums[0], suggestMarkupMax: nums[1] }
  if (nums.length === 1) return { suggestMarkupMin: nums[0] }
  return {}
}

/**
 * 构造 /p/plaza/pushes 请求体，字段名严格对齐后端 PlazaPush 模型：
 * targetType / productIds|factoryIds / scheduledStart / scheduledEnd /
 * suggestMarkupMin|Max / suggestCommission。之前用 subjectType / scheduleStart /
 * markupRange / commission 等错误字段名，会被 Prisma 当未知列拒绝而整单失败。
 */
function buildPushPayload(status: 'draft' | 'pending') {
  const ids = products.value.map((p) => p.id)
  const isFactory = subjectType.value === 'factory'
  return {
    targetType: subjectType.value,
    productIds: isFactory ? [] : ids,
    factoryIds: isFactory ? ids : [],
    positions: positions.value,
    tags: tags.value,
    audience: audience.value,
    scheduledStart: scheduleStart.value,
    scheduledEnd: scheduleEnd.value,
    weight: weight.value,
    ...parseMarkup(markupRange.value),
    suggestCommission: commission.value,
    pushText: pushText.value,
    status,
  }
}

async function saveDraft() {
  if (saving.value) return
  saving.value = true
  try {
    await plazaService.createPush(buildPushPayload('draft'))
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goPushList() {
  uni.navigateTo({ url: '/pages/plaza/pushes' })
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
    await plazaService.createPush(buildPushPayload('pending'))
    uni.showToast({ title: '推送已发布', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '推送失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="新建推送" right-text="查看记录" @right="goPushList" />

    <scroll-view scroll-y class="scroll">
      <!-- 推送对象 -->
      <view class="card">
        <text class="label">推送对象</text>
        <view class="chip-row">
          <view
            :class="['chip', subjectType === 'product' ? 'active' : '']"
            @click="subjectType = 'product'"
            >商品</view
          >
          <view
            :class="['chip', subjectType === 'factory' ? 'active' : '']"
            @click="subjectType = 'factory'"
            >厂家</view
          >
        </view>
      </view>

      <!-- 选择内容 -->
      <view class="card">
        <view class="card-head">
          <text class="label">选择内容(已选 {{ products.length }} 件)</text>
          <view class="add-btn" @click="openPicker">
            <Icon name="plus" :size="22" color="var(--brand-primary)" />
            <text>添加商品</text>
          </view>
        </view>
        <view v-if="products.length === 0" class="empty-hint">
          点击右上角「添加商品」从全平台已上架商品中挑选
        </view>
        <view v-else class="product-list">
          <view v-for="p in products.slice(0, 3)" :key="p.id" class="p-row">
            <image v-if="p.image" :src="p.image" class="p-img" mode="aspectFill" />
            <view v-else class="p-dot" />
            <view class="p-info">
              <text class="p-name">{{ p.name }}</text>
              <text v-if="p.merchant" class="p-merchant">{{ p.merchant }}</text>
            </view>
            <text v-if="typeof p.price === 'number' && p.price > 0" class="p-price">
              ¥{{ formatPrice(p.price) }}
            </text>
            <view class="remove" @click="removeProduct(p.id)">
              <Icon name="close" :size="22" color="var(--text-tertiary)" />
            </view>
          </view>
          <view v-if="products.length > 3" class="more">
            … 还有 {{ products.length - 3 }} 件 ›
          </view>
        </view>
      </view>

      <!-- 推送位置 -->
      <view class="card">
        <text class="label">推送位置(已选 {{ positions.length }} 个)</text>
        <view class="chip-row wrap">
          <view
            v-for="p in POSITIONS"
            :key="p"
            :class="['chip', positions.includes(p) ? 'active' : '']"
            @click="togglePosition(p)"
            >{{ p }}</view
          >
        </view>
      </view>

      <!-- 标签 -->
      <view class="card">
        <text class="label">标签(已选 {{ tags.length }})</text>
        <view class="chip-row wrap">
          <view
            v-for="t in ALL_TAGS"
            :key="t"
            :class="['chip', tags.includes(t) ? 'active' : '']"
            @click="toggleTag(t)"
            >{{ t }}</view
          >
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
            >{{ a.label }}</view
          >
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

      <view style="height: 180rpx" />
    </scroll-view>

    <view class="ft">
      <view :class="['ft-btn ghost', saving ? 'loading' : '']" @click="saveDraft">
        {{ saving ? '保存中…' : '存草稿' }}
      </view>
      <view :class="['ft-btn primary', submitting ? 'loading' : '']" @click="submit">
        {{ submitting ? '推送中…' : '立即推送' }}
      </view>
    </view>

    <!-- 商品选择器 (全屏 sheet) -->
    <view v-if="pickerOpen" class="picker">
      <view class="picker-head">
        <view class="picker-cancel" @click="closePicker">取消</view>
        <text class="picker-title">选择商品</text>
        <view class="picker-confirm" @click="confirmPicker"> 确定({{ pickerSelected.size }}) </view>
      </view>

      <view class="picker-search">
        <Icon name="search" :size="28" color="var(--text-tertiary)" />
        <input
          v-model="pickerKeyword"
          class="picker-search-input"
          placeholder="搜索商品名 / 商家 / ID"
        />
        <view v-if="pickerKeyword" class="picker-search-clear" @click="pickerKeyword = ''">
          <Icon name="close" :size="22" color="var(--text-tertiary)" />
        </view>
      </view>

      <scroll-view scroll-y class="picker-list">
        <view v-if="pickerLoading" class="picker-empty">
          <text>加载中…</text>
        </view>
        <view v-else-if="filteredPicker.length === 0" class="picker-empty">
          <Icon name="search" :size="60" color="var(--text-tertiary)" />
          <text>{{ pickerKeyword ? '没有匹配的商品' : '暂无可推送的商品' }}</text>
        </view>
        <view
          v-for="p in filteredPicker"
          v-else
          :key="p.id"
          :class="['picker-item', pickerSelected.has(p.id) ? 'selected' : '']"
          @click="togglePick(p.id)"
        >
          <view class="picker-check">
            <Icon
              v-if="pickerSelected.has(p.id)"
              name="check-circle"
              :size="40"
              color="var(--brand-primary)"
            />
            <Icon v-else name="circle" :size="40" color="var(--text-tertiary)" />
          </view>
          <image v-if="p.image" :src="p.image" class="picker-item-img" mode="aspectFill" />
          <view v-else class="picker-item-img placeholder">
            <Icon name="package" :size="32" color="var(--text-tertiary)" />
          </view>
          <view class="picker-item-info">
            <text class="picker-item-name">{{ p.name }}</text>
            <text v-if="p.merchant" class="picker-item-merchant">{{ p.merchant }}</text>
            <text v-if="typeof p.price === 'number' && p.price > 0" class="picker-item-price">
              ¥{{ formatPrice(p.price) }}
            </text>
          </view>
        </view>
        <view style="height: 60rpx" />
      </scroll-view>

      <view class="picker-footer">
        <text class="picker-footer-tip">已选 {{ pickerSelected.size }} 件商品</text>
        <view class="picker-footer-btn" @click="confirmPicker">确定加入推送</view>
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
    background: rgba(255, 77, 45, 0.08);
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
  &.wrap {
    flex-wrap: wrap;
  }
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
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
  &.add {
    color: var(--brand-primary);
    border-style: dashed;
  }
}
.empty-hint {
  padding: 16rpx 0;
  font-size: 22rpx;
  color: var(--text-tertiary);
  text-align: center;
}
.product-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.p-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  font-size: 24rpx;
  color: var(--text-primary);
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .p-img {
    width: 72rpx;
    height: 72rpx;
    border-radius: 12rpx;
    background: var(--bg-page);
    flex-shrink: 0;
  }
  .p-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: var(--brand-primary);
    flex-shrink: 0;
  }
  .p-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .p-name {
      font-size: 24rpx;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .p-merchant {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
  .p-price {
    flex-shrink: 0;
    font-size: 24rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
  .remove {
    padding: 4rpx;
    flex-shrink: 0;
  }
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
  &:last-child {
    border-bottom: none;
  }
  .r-label {
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
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
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
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
    &.loading {
      opacity: 0.7;
    }
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
    &.loading {
      opacity: 0.7;
    }
  }
}

/* ==== 商品选择器 ==== */
.picker {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}
.picker-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(24rpx + env(safe-area-inset-top)) 32rpx 24rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.picker-cancel {
  font-size: 28rpx;
  color: var(--text-secondary);
  padding: 8rpx 16rpx 8rpx 0;
}
.picker-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--text-primary);
}
.picker-confirm {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand-primary);
  padding: 8rpx 0 8rpx 16rpx;
}
.picker-search {
  flex-shrink: 0;
  margin: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 72rpx;
  background: var(--bg-card);
  border-radius: 999rpx;
  box-shadow: var(--shadow-sm);
}
.picker-search-input {
  flex: 1;
  height: 100%;
  font-size: 26rpx;
}
.picker-search-clear {
  padding: 4rpx;
}
.picker-list {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
  box-sizing: border-box;
}
.picker-empty {
  padding: 80rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  color: var(--text-tertiary);
  font-size: 24rpx;
}
.picker-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  &.selected {
    border-color: var(--brand-primary);
    background: rgba(255, 77, 45, 0.04);
  }
}
.picker-check {
  flex-shrink: 0;
  padding: 4rpx;
}
.picker-item-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background: var(--bg-page);
  flex-shrink: 0;
  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.picker-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.picker-item-name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-item-merchant {
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.picker-item-price {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--brand-primary);
  font-family: var(--font-family-base);
}
.picker-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.picker-footer-tip {
  flex: 1;
  font-size: 24rpx;
  color: var(--text-secondary);
}
.picker-footer-btn {
  flex-shrink: 0;
  padding: 18rpx 48rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
}
</style>
