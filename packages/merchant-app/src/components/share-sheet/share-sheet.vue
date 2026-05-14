<script setup lang="ts">
/**
 * 订单分享配置 Sheet
 *
 * 触发场景：商家在订单详情页右上角"分享"按钮 →弹出此 sheet 配置：
 *   - 可见内容(5 个字段勾选)
 *   - 可见时长(0 = 永久)
 *   - 微信分享简介(此次有效)
 *
 * 点"分享"后:
 *   1. 调 orderService.createShare 创建分享记录 → 拿 shareCode + shareUrl
 *   2. 调用 uni.share(微信小程序卡片) 或复制链接(H5)
 *   3. 给客户的链接打开后看到的是脱敏后的订单(被隐藏的字段在 JSON 中完全不存在)
 *
 * Props:
 *   - open: 是否显示
 *   - order: 当前订单数据(用于头部摘要 + 默认简介生成)
 *
 * Emits:
 *   - close: 关闭 sheet
 *   - shared: 分享成功后透传 shareCode / shareUrl(父组件可显示成功提示)
 */
import { ref, computed, watch } from 'vue'
import { orderService } from '../../services/order'
import { formatPrice } from '@jiujiu/shared/utils'
import type { Order } from '@jiujiu/shared/types'

type ShareField = 'basics' | 'customer' | 'pricing' | 'items' | 'extra'

interface FieldOption {
  key: ShareField
  label: string
  desc: string
}

const FIELDS: FieldOption[] = [
  { key: 'basics', label: '订单基础', desc: '订单号 / 状态 / 时间' },
  { key: 'customer', label: '客户信息', desc: '姓名 / 电话 / 地址' },
  { key: 'pricing', label: '价格明细', desc: '总价 / 优惠 / 应付' },
  { key: 'items', label: '商品清单', desc: '商品图片 / 规格 / 数量' },
  { key: 'extra', label: '备注/物流', desc: '买家备注 / 配送 / 物流单号' },
]

const props = defineProps<{
  open: boolean
  order: Order | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'shared', payload: { shareCode: string; shareUrl: string }): void
}>()

// 默认全选除"客户信息"外的字段(分享给客户时通常默认隐藏客户隐私给第三方截屏风险)
// 注:商家可以手动勾上"客户信息"分享给客户自己
const visible = ref<Set<ShareField>>(new Set(['basics', 'pricing', 'items', 'extra']))
const expiresInDays = ref<number>(30)
const intro = ref<string>('')
const loading = ref(false)
const currentShareCode = ref<string>('')

// 监听 open 变化:打开时尝试拉当前分享配置回显
watch(
  () => props.open,
  async (val) => {
    if (val && props.order?.id) {
      await loadCurrent()
    }
  },
)

async function loadCurrent() {
  if (!props.order?.id) return
  try {
    const current = await orderService.getCurrentShare(props.order.id)
    if (current?.config) {
      const cfg = current.config
      visible.value = new Set(cfg.visibleFields as ShareField[])
      intro.value = cfg.intro || defaultIntro()
      currentShareCode.value = current.shareCode || ''
      if (cfg.expiresAt) {
        const days = Math.round((new Date(cfg.expiresAt).getTime() - Date.now()) / 86400_000)
        expiresInDays.value = days > 0 ? days : 30
      } else {
        expiresInDays.value = 0
      }
    } else {
      visible.value = new Set(['basics', 'pricing', 'items', 'extra'])
      intro.value = defaultIntro()
      expiresInDays.value = 30
      currentShareCode.value = ''
    }
  } catch {
    intro.value = defaultIntro()
  }
}

function defaultIntro(): string {
  if (!props.order) return ''
  const total = formatPrice(props.order.payAmount || props.order.totalAmount || 0)
  return `请查看您的订单详情(共 ${total})`
}

function toggleField(key: ShareField) {
  if (visible.value.has(key)) visible.value.delete(key)
  else visible.value.add(key)
  // 触发响应式
  visible.value = new Set(visible.value)
}

const visibleList = computed(() => Array.from(visible.value))
const canSubmit = computed(() => visibleList.value.length > 0 && !loading.value)

// 顶部订单摘要(只读展示给商家)
const headerSummary = computed(() => {
  if (!props.order) return null
  const items = props.order.items || []
  return {
    no: props.order.no,
    total: formatPrice(props.order.totalAmount || 0),
    payAmount: formatPrice(props.order.payAmount || 0),
    customer: (props.order.address as any)?.name || '—',
    region: (props.order.address as any)?.region || '',
    itemsCount: items.length,
  }
})

function onClose() {
  emit('close')
}

async function onShare() {
  if (!canSubmit.value || !props.order) return
  loading.value = true
  try {
    const res = await orderService.createShare(props.order.id, {
      visibleFields: visibleList.value,
      expiresInDays: expiresInDays.value,
      intro: intro.value.trim() || undefined,
    })
    const shareCode = res?.shareCode
    if (!shareCode) throw new Error('生成分享链接失败')

    const baseURL = (import.meta.env.VITE_API_BASE_URL as string) || 'https://ewsn.top'
    // 公开访问页地址(用户端 user-mp 的 /pages/share/order),
    // 实际部署时会被替换为小程序短链或 wxacode
    const shareUrl = `${baseURL}/share?code=${shareCode}`

    // 1. 复制链接到剪贴板(H5 / App 通用兜底)
    try {
      await new Promise<void>((resolve, reject) => {
        uni.setClipboardData({
          data: shareUrl,
          success: () => resolve(),
          fail: (err) => reject(err),
        })
      })
    } catch {
      /* ignore */
    }

    // 2. 微信小程序内调用 wx.shareAppMessage(由 onShareAppMessage 钩子完成,
    //    这里通过 emit 让父页处理)
    emit('shared', { shareCode, shareUrl })

    uni.showToast({ title: '链接已复制', icon: 'success', duration: 1500 })
    setTimeout(() => emit('close'), 800)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '分享失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onRevoke() {
  if (!props.order?.id || !currentShareCode.value) {
    uni.showToast({ title: '当前订单暂无生效分享', icon: 'none' })
    return
  }
  uni.showModal({
    title: '撤销分享',
    content: '撤销后,客户使用旧链接将无法继续查看。已截屏的内容无法收回。',
    confirmColor: '#FF4D2D',
    confirmText: '确认撤销',
    success: async (r) => {
      if (!r.confirm || !props.order) return
      try {
        await orderService.revokeShare(props.order.id)
        currentShareCode.value = ''
        uni.showToast({ title: '已撤销', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '撤销失败', icon: 'none' })
      }
    },
  })
}
</script>

<template>
  <view v-if="open" class="mask" @click="onClose">
    <view class="sheet" @click.stop>
      <!-- 顶部摘要 -->
      <view class="head">
        <view class="head-title">分享订单</view>
        <view class="head-share" :class="{ disabled: !canSubmit }" @click="onShare">
          {{ loading ? '生成中…' : '分享' }}
        </view>
      </view>

      <view v-if="headerSummary" class="summary">
        <view class="summary-row">
          <text class="summary-label">订单号</text>
          <text class="summary-value">{{ headerSummary.no }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">客户</text>
          <text class="summary-value"
            >{{ headerSummary.customer }} · {{ headerSummary.itemsCount }} 件</text
          >
        </view>
        <view class="summary-row">
          <text class="summary-label">应付</text>
          <text class="summary-value primary">{{ headerSummary.payAmount }}</text>
        </view>
      </view>

      <!-- 可见内容 -->
      <view class="block">
        <view class="block-title">
          <text>设置可见内容</text>
          <text class="block-tip">客户只能看到勾选的字段</text>
        </view>
        <view class="chips">
          <view
            v-for="f in FIELDS"
            :key="f.key"
            :class="['chip', { on: visible.has(f.key) }]"
            @click="toggleField(f.key)"
          >
            <text class="chip-label">{{ f.label }}</text>
            <text class="chip-desc">{{ f.desc }}</text>
            <view v-if="visible.has(f.key)" class="chip-mark">
              <text>✓</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 可见时长 -->
      <view class="block">
        <view class="block-title">
          <text>设置可见时长</text>
          <text class="block-tip">链接过期后无法访问</text>
        </view>
        <view class="duration-row">
          <input
            v-model.number="expiresInDays"
            type="number"
            class="duration-input"
            :placeholder="'30'"
            :maxlength="3"
          />
          <text class="duration-unit">天</text>
          <text class="duration-hint">(0 为永久可见)</text>
        </view>
        <view class="quick-row">
          <view
            v-for="d in [7, 30, 90, 0]"
            :key="d"
            :class="['quick', { on: expiresInDays === d }]"
            @click="expiresInDays = d"
          >
            {{ d === 0 ? '永久' : `${d} 天` }}
          </view>
        </view>
      </view>

      <!-- 简介 -->
      <view class="block">
        <view class="block-title">
          <text>微信分享简介</text>
          <text class="block-tip">显示在分享卡片下方</text>
        </view>
        <textarea
          v-model="intro"
          class="intro-input"
          placeholder="例如:请查看您的家装订单详情"
          :maxlength="40"
          :auto-height="true"
        />
        <view class="intro-meta">
          <text class="intro-count">{{ intro.length }}/40</text>
        </view>
      </view>

      <!-- 撤销已分享 -->
      <view v-if="currentShareCode" class="revoke-row" @click="onRevoke">
        <text class="revoke-tip"
          >该订单已有生效分享 (code: {{ currentShareCode.slice(0, 4) }}…)</text
        >
        <text class="revoke-btn">撤销</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
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
  max-height: 85vh;
  overflow-y: auto;
  padding: 32rpx 32rpx env(safe-area-inset-bottom);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #ebeef5;
}
.head-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 1rpx;
}
.head-share {
  padding: 14rpx 40rpx;
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 999rpx;
  &.disabled {
    opacity: 0.45;
  }
}

.summary {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.03);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}
.summary-label {
  font-size: 24rpx;
  color: #86909c;
}
.summary-value {
  font-size: 26rpx;
  color: #1d2129;
  font-weight: 500;
  &.primary {
    color: #ff4d2d;
    font-weight: 700;
  }
}

.block {
  margin-top: 28rpx;
  padding: 24rpx 24rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.03);
}
.block-title {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 16rpx;
  > text:first-child {
    font-size: 28rpx;
    font-weight: 600;
    color: #1d2129;
  }
}
.block-tip {
  font-size: 22rpx;
  color: #909399;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  position: relative;
  flex: 0 0 calc(50% - 8rpx);
  padding: 16rpx 20rpx;
  background: #f7f8fa;
  border: 2rpx solid #ebeef5;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  transition: all 0.18s ease;
  box-sizing: border-box;
  &.on {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-color: #10b981;
  }
}
.chip-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #1d2129;
}
.chip-desc {
  font-size: 20rpx;
  color: #909399;
  line-height: 1.3;
}
.chip-mark {
  position: absolute;
  top: 0;
  right: 0;
  width: 28rpx;
  height: 28rpx;
  background: #10b981;
  border-radius: 0 16rpx 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  > text {
    color: #fff;
    font-size: 18rpx;
    font-weight: 700;
  }
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 16rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
}
.duration-input {
  flex: 1;
  font-size: 36rpx;
  font-weight: 700;
  color: #1d2129;
  text-align: left;
}
.duration-unit {
  font-size: 26rpx;
  color: #4e5969;
}
.duration-hint {
  font-size: 22rpx;
  color: #909399;
}
.quick-row {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}
.quick {
  flex: 1;
  padding: 12rpx 0;
  background: #f7f8fa;
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  text-align: center;
  font-size: 24rpx;
  color: #4e5969;
  &.on {
    background: rgba(16, 185, 129, 0.08);
    border-color: #10b981;
    color: #10b981;
    font-weight: 600;
  }
}

.intro-input {
  width: 100%;
  min-height: 100rpx;
  padding: 16rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1d2129;
  box-sizing: border-box;
}
.intro-meta {
  display: flex;
  justify-content: flex-end;
  margin-top: 8rpx;
}
.intro-count {
  font-size: 22rpx;
  color: #c9cdd4;
}

.revoke-row {
  margin-top: 24rpx;
  padding: 18rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid #fde6df;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.revoke-tip {
  font-size: 24rpx;
  color: #86909c;
}
.revoke-btn {
  font-size: 26rpx;
  color: #ff4d2d;
  font-weight: 600;
}
</style>
