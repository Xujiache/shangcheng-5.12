<script setup lang="ts">
/**
 * MA-09 · 订单详情（含一键识别地址）
 *
 * 头信息 + 收货地址（一键识别）+ 商品 + 金额表 + 备注 + 操作
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderService } from '../../services/order'
import { formatPrice, formatDateTime, parseAddress } from '@jiujiu/shared/utils'
import type { Order, OrderStatus } from '@jiujiu/shared/types'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Section from '../../components/section/section.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import Icon from '../../components/icon/icon.vue'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(true)

const showParseDialog = ref(false)
const parseInput = ref('')
const parsedResult = ref<{ name?: string; phone?: string; region?: string; detail?: string } | null>(null)

const STATUS_LABEL: Record<OrderStatus, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default'; desc: string }> = {
  pending_payment: { text: '待付款', tone: 'warning', desc: '客户尚未支付，订单将自动关闭' },
  pending_shipment: { text: '待发货', tone: 'primary', desc: '客户已付款，请尽快安排发货' },
  shipped: { text: '已发货', tone: 'info', desc: '物流配送中，等待客户确认收货' },
  completed: { text: '已完成', tone: 'success', desc: '订单已完成' },
  cancelled: { text: '已取消', tone: 'default', desc: '订单已被取消' },
  after_sale: { text: '售后中', tone: 'error', desc: '客户发起售后，请尽快处理' },
  refunded: { text: '已退款', tone: 'default', desc: '订单已退款' },
}

const statusInfo = computed(() => (order.value ? STATUS_LABEL[order.value.status] : STATUS_LABEL.pending_shipment))

async function load() {
  loading.value = true
  try {
    order.value = await orderService.detail(orderId.value)
  } finally {
    loading.value = false
  }
}

function openParse() {
  parseInput.value = ''
  parsedResult.value = null
  showParseDialog.value = true
}

function doParse() {
  if (!parseInput.value.trim()) {
    uni.showToast({ title: '请粘贴客户地址', icon: 'none' })
    return
  }
  parsedResult.value = parseAddress(parseInput.value)
}

function applyParsed() {
  if (!order.value || !parsedResult.value) return
  order.value.address = {
    ...order.value.address,
    name: parsedResult.value.name || order.value.address.name,
    phone: parsedResult.value.phone || order.value.address.phone,
    region: parsedResult.value.region || order.value.address.region,
    detail: parsedResult.value.detail || order.value.address.detail,
  }
  showParseDialog.value = false
  uni.showToast({ title: '已应用解析结果', icon: 'success' })
}

function copyOrderNo() {
  if (!order.value) return
  uni.setClipboardData({ data: order.value.no, success: () => uni.showToast({ title: '已复制' }) })
}

function copyAddress() {
  if (!order.value) return
  const a = order.value.address
  const text = `${a.name} ${a.phone} ${a.region} ${a.detail}`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制' }) })
}

function ship() {
  if (!order.value) return
  uni.showModal({
    title: '填写物流单号',
    editable: true,
    placeholderText: '请输入运单号',
    success: async (r) => {
      if (r.confirm && r.content && order.value) {
        await orderService.ship(order.value.id, { company: '顺丰', trackingNumber: r.content })
        uni.showToast({ title: '已发货' })
        load()
      }
    },
  })
}

function callCustomer() {
  if (!order.value) return
  uni.makePhoneCall({ phoneNumber: order.value.address.phone })
}

onLoad((opts) => {
  orderId.value = (opts as { id?: string })?.id || ''
  load()
})
onMounted(() => {
  if (!orderId.value) load()
})
</script>

<template>
  <view class="page">
    <NavBar title="订单详情" />

    <view v-if="order" class="body">
      <!-- 状态条 -->
      <view :class="['status-bar', `status-${order.status}`]">
        <view class="status-info">
          <view class="status-title-row">
            <Icon name="biz-order" :size="32" color="#fff" />
            <text class="status-title">{{ statusInfo.text }}</text>
          </view>
          <text class="status-desc">{{ statusInfo.desc }}</text>
        </view>
        <text v-if="order.status === 'pending_payment'" class="status-countdown">
          剩余 {{ Math.floor((order.expiresIn ?? 0) / 60) }} 分
        </text>
      </view>

      <!-- 收货地址 -->
      <Section title="收货地址">
        <template #default>
          <view class="addr">
            <view class="addr-info">
              <view class="addr-line1">
                <text class="addr-name">{{ order.address.name }}</text>
                <text class="addr-phone">{{ order.address.phone }}</text>
              </view>
              <text class="addr-detail">{{ order.address.region }} {{ order.address.detail }}</text>
            </view>
            <view class="addr-actions">
              <view class="addr-btn primary" @click="openParse">
                <Icon name="doc" :size="22" color="#fff" />
                <text>一键识别</text>
              </view>
              <view class="addr-btn" @click="copyAddress">
                <text>复制</text>
              </view>
            </view>
          </view>
        </template>
      </Section>

      <!-- 商品 -->
      <Section title="商品信息" :sub="`共 ${order.items?.length ?? 0} 件`">
        <view class="items">
          <view v-for="it in order.items" :key="it.id" class="item">
            <image class="item-img" :src="it.productImage" mode="aspectFill" />
            <view class="item-info">
              <text class="item-name">{{ it.productName }}</text>
              <text class="item-spec">{{ it.specsLabel }}</text>
              <view class="item-price-row">
                <text class="item-price">{{ formatPrice(it.unitPrice) }}</text>
                <text class="item-qty">× {{ it.quantity }}</text>
              </view>
            </view>
          </view>
        </view>
      </Section>

      <!-- 金额表 -->
      <Section title="费用明细">
        <view class="fees">
          <view class="fee-row">
            <text class="fee-label">商品总额</text>
            <text class="fee-value">{{ formatPrice(order.totalAmount) }}</text>
          </view>
          <view v-if="order.discountAmount > 0" class="fee-row">
            <text class="fee-label">优惠</text>
            <text class="fee-value discount">− {{ formatPrice(order.discountAmount) }}</text>
          </view>
          <view class="fee-row">
            <text class="fee-label">运费</text>
            <text class="fee-value">{{ order.shippingFee === 0 ? '包邮' : formatPrice(order.shippingFee) }}</text>
          </view>
          <view class="fee-row total">
            <text class="fee-label">实付金额</text>
            <text class="fee-value primary">{{ formatPrice(order.payAmount) }}</text>
          </view>
        </view>
      </Section>

      <!-- 订单信息 -->
      <Section title="订单信息">
        <view class="meta-row" @click="copyOrderNo">
          <text class="meta-label">订单编号</text>
          <view class="meta-value">
            <text>{{ order.no }}</text>
            <text class="copy">复制</text>
          </view>
        </view>
        <view class="meta-row">
          <text class="meta-label">下单时间</text>
          <text class="meta-value">{{ formatDateTime(order.createdAt) }}</text>
        </view>
        <view v-if="order.paidAt" class="meta-row">
          <text class="meta-label">付款时间</text>
          <text class="meta-value">{{ formatDateTime(order.paidAt) }}</text>
        </view>
        <view v-if="order.shippedAt" class="meta-row">
          <text class="meta-label">发货时间</text>
          <text class="meta-value">{{ formatDateTime(order.shippedAt) }}</text>
        </view>
        <view class="meta-row">
          <text class="meta-label">配送方式</text>
          <text class="meta-value">{{ ({ factory: '厂家直发', local: '本地配送', pickup: '门店自提' })[order.shippingMethod] }}</text>
        </view>
        <view v-if="order.remark" class="meta-row">
          <text class="meta-label">买家备注</text>
          <text class="meta-value">{{ order.remark }}</text>
        </view>
      </Section>

      <view class="safe-bottom" />
    </view>

    <!-- 底部操作 -->
    <view v-if="order" class="footer">
      <view class="f-btn ghost" @click="callCustomer">
        <Icon name="phone" :size="32" color="var(--text-primary)" />
        <text>联系客户</text>
      </view>
      <view v-if="order.status === 'pending_shipment'" class="f-btn primary" @click="ship">发货</view>
      <view v-else-if="order.status === 'shipped'" class="f-btn primary" @click="uni.showToast({ title: '物流跟踪', icon: 'none' })">查看物流</view>
      <view v-else-if="order.status === 'after_sale'" class="f-btn primary" @click="uni.navigateTo({ url: `/pages/order/aftersale?orderId=${order.id}` })">处理售后</view>
      <view v-else class="f-btn ghost" @click="uni.showToast({ title: '打印订单', icon: 'none' })">打印订单</view>
    </view>

    <!-- 一键识别弹窗 -->
    <view v-if="showParseDialog" class="mask" @click="showParseDialog = false">
      <view class="parse-sheet" @click.stop>
        <view class="parse-head">
          <text class="parse-title">一键识别地址</text>
          <text class="parse-close" @click="showParseDialog = false">✕</text>
        </view>
        <view class="parse-tip">粘贴客户发来的"姓名 + 手机号 + 地址"，自动拆分</view>
        <textarea
          v-model="parseInput"
          class="parse-input"
          placeholder="示例：张三 13800138000 浙江省杭州市西湖区文三路 100 号 西溪国际 3 幢 502"
          maxlength="200"
        />
        <view class="parse-actions">
          <view class="parse-btn primary" @click="doParse">立即识别</view>
        </view>

        <view v-if="parsedResult" class="parse-result">
          <view class="parse-result-head">识别结果</view>
          <view class="parse-grid">
            <view class="parse-cell">
              <text class="cell-label">姓名</text>
              <text class="cell-value">{{ parsedResult.name || '—' }}</text>
            </view>
            <view class="parse-cell">
              <text class="cell-label">手机</text>
              <text class="cell-value">{{ parsedResult.phone || '—' }}</text>
            </view>
            <view class="parse-cell full">
              <text class="cell-label">地区</text>
              <text class="cell-value">{{ parsedResult.region || '—' }}</text>
            </view>
            <view class="parse-cell full">
              <text class="cell-label">详细</text>
              <text class="cell-value">{{ parsedResult.detail || '—' }}</text>
            </view>
          </view>
          <view class="parse-apply" @click="applyParsed">应用到订单地址</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 160rpx;
}
.body {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.status-bar {
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &.status-pending_payment { background: linear-gradient(135deg, #FFAA33, #FF8845); }
  &.status-pending_shipment { background: var(--brand-gradient); }
  &.status-shipped { background: linear-gradient(135deg, #4A8BFF, #3A6FFF); }
  &.status-completed { background: linear-gradient(135deg, #4FBF7C, #2FA362); }
  &.status-cancelled { background: linear-gradient(135deg, #909EAB, #6B7780); }
  &.status-after_sale { background: linear-gradient(135deg, #FF5252, #D93030); }

  .status-info { flex: 1; }
  .status-title-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    .status-icon { font-size: 32rpx; }
    .status-title { font-size: 32rpx; font-weight: 700; }
  }
  .status-desc {
    display: block;
    margin-top: 4rpx;
    font-size: 22rpx;
    opacity: 0.9;
  }
  .status-countdown {
    font-size: 28rpx;
    font-weight: 700;
    background: rgba(255,255,255,0.25);
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
  }
}
.addr {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  .addr-info {
    flex: 1;
    .addr-line1 {
      display: flex;
      align-items: baseline;
      gap: 16rpx;
      .addr-name { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
      .addr-phone { font-size: 26rpx; color: var(--text-secondary); }
    }
    .addr-detail {
      display: block;
      margin-top: 8rpx;
      font-size: 24rpx;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
  .addr-actions {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
  .addr-btn {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 16rpx;
    border: 1rpx solid var(--border-default);
    border-radius: 999rpx;
    font-size: 22rpx;
    color: var(--text-primary);
    white-space: nowrap;
    &.primary {
      background: var(--brand-primary);
      color: #fff;
      border-color: var(--brand-primary);
    }
  }
}
.items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.item {
  display: flex;
  gap: 16rpx;
  .item-img {
    width: 140rpx;
    height: 140rpx;
    border-radius: 12rpx;
    background: var(--bg-hover);
  }
  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .item-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary); }
    .item-spec { font-size: 22rpx; color: var(--text-tertiary); }
    .item-price-row {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .item-price { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
      .item-qty { font-size: 22rpx; color: var(--text-tertiary); }
    }
  }
}
.fees {
  display: flex;
  flex-direction: column;
}
.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  font-size: 26rpx;
  .fee-label { color: var(--text-secondary); }
  .fee-value { color: var(--text-primary); font-family: var(--font-family-base); }
  .fee-value.discount { color: var(--status-error); }
  &.total {
    border-top: 1rpx dashed var(--border-light);
    margin-top: 12rpx;
    padding-top: 16rpx;
    .fee-label { font-weight: 700; }
    .fee-value.primary {
      color: var(--brand-primary);
      font-size: 32rpx;
      font-weight: 700;
    }
  }
}
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  font-size: 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  &:last-child { border-bottom: none; }
  .meta-label { color: var(--text-tertiary); }
  .meta-value {
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8rpx;
    .copy {
      padding: 2rpx 8rpx;
      background: var(--brand-primary-ghost);
      color: var(--brand-primary);
      font-size: 20rpx;
      border-radius: 4rpx;
    }
  }
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.06);
  .f-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 999rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    font-size: 28rpx;
    font-weight: 700;
    &.ghost { background: var(--bg-hover); color: var(--text-primary); }
    &.primary { background: var(--brand-gradient); color: #fff; }
  }
}
.mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex; align-items: flex-end;
}
.parse-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  max-height: 80vh;
}
.parse-head {
  display: flex; justify-content: space-between; align-items: center;
  .parse-title { font-size: 32rpx; font-weight: 700; }
  .parse-close { font-size: 28rpx; color: var(--text-tertiary); }
}
.parse-tip {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.parse-input {
  margin-top: 16rpx;
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.5;
}
.parse-actions {
  margin-top: 16rpx;
  display: flex;
}
.parse-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  text-align: center;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  &.primary { background: var(--brand-gradient); color: #fff; }
}
.parse-result {
  margin-top: 16rpx;
  background: var(--brand-primary-ghost);
  border-radius: 16rpx;
  padding: 16rpx;
}
.parse-result-head {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--brand-primary);
  margin-bottom: 12rpx;
}
.parse-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.parse-cell {
  background: var(--bg-card);
  border-radius: 8rpx;
  padding: 12rpx;
  &.full { grid-column: 1 / -1; }
  .cell-label { display: block; font-size: 20rpx; color: var(--text-tertiary); }
  .cell-value { display: block; margin-top: 4rpx; font-size: 24rpx; color: var(--text-primary); font-weight: 500; }
}
.parse-apply {
  margin-top: 12rpx;
  padding: 16rpx;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 12rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 600;
}
.safe-bottom { height: 40rpx; }
</style>
