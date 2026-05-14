<script setup lang="ts">
/**
 * 订单分享公开访问页
 *
 * 商家在商家端配置了「分享」之后,客户(或任何持链接者)在小程序/H5 打开此页,
 * 凭 URL 参数 ?code=XXX 调 GET /u/share/orders/:code 拉取脱敏后的订单详情。
 *
 * 后端会严格按商家选择的 visibleFields 过滤字段,被隐藏的字段在响应 JSON 中
 * 完全不存在(而不是返 null),防止前端 devtools 反向看到敏感信息。
 *
 * 异常处理:
 *   - 链接不存在 → 显示空态"分享不存在或已撤销"
 *   - 已过期 / 已撤销 → 显示提示页
 *   - 网络异常 → toast + 重试按钮
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { http } from '../../utils/request'

interface MerchantInfo {
  id: string
  name: string
  logo?: string
  contactPhone?: string
}

interface OrderItem {
  id: string
  productName: string
  productImage?: string
  specsLabel?: string
  unitPrice: number
  quantity: number
}

interface SharedOrder {
  shareCode: string
  intro?: string
  expiresAt: string | null
  merchant: MerchantInfo
  basics?: {
    no: string
    status: string
    totalAmount: number
    payAmount: number
    createdAt: string
    paidAt?: string
    shippedAt?: string
    completedAt?: string
  }
  customer?: {
    name: string | null
    phone: string | null
    region: string | null
    detail: string | null
  }
  pricing?: {
    totalAmount: number
    discountAmount: number
    shippingFee: number
    couponDiscount?: number
    payAmount: number
    paymentMethod?: string
  }
  items?: OrderItem[]
  extra?: {
    remark?: string
    shippingMethod?: string
    trackingCompany?: string
    trackingNumber?: string
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: '待付款',
  pending_shipment: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  after_sale: '售后中',
  refunded: '已退款',
}

const SHIPPING_LABEL: Record<string, string> = {
  factory: '厂家直发',
  local: '本地配送',
  pickup: '门店自提',
}

const code = ref('')
const loading = ref(true)
const errorMsg = ref('')
const data = ref<SharedOrder | null>(null)

onLoad((q: any) => {
  code.value = String(q?.code || '').trim()
  if (!code.value) {
    errorMsg.value = '分享链接缺少参数'
    loading.value = false
    return
  }
  load()
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await http.get<SharedOrder>(
      `/api/v1/u/share/orders/${encodeURIComponent(code.value)}`,
      undefined,
      { silent: true },
    )
    data.value = res
  } catch (e: any) {
    errorMsg.value = e?.message || '分享已失效或不存在'
    data.value = null
  } finally {
    loading.value = false
  }
}

function formatYuan(v: number | undefined | null): string {
  if (v == null) return '—'
  return `¥${Number(v).toFixed(2)}`
}

function formatDate(s: string | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const expiresHint = computed(() => {
  if (!data.value?.expiresAt) return '永久有效'
  const left = new Date(data.value.expiresAt).getTime() - Date.now()
  if (left <= 0) return '已过期'
  const days = Math.ceil(left / 86400_000)
  return `链接还有 ${days} 天过期`
})

function callMerchant() {
  const phone = data.value?.merchant?.contactPhone
  if (!phone) {
    uni.showToast({ title: '商家未公开电话', icon: 'none' })
    return
  }
  uni.makePhoneCall({ phoneNumber: phone }).catch(() => {})
}

function copyOrderNo() {
  const no = data.value?.basics?.no
  if (!no) return
  uni.setClipboardData({
    data: no,
    success: () => uni.showToast({ title: '订单号已复制', icon: 'success' }),
  })
}

function copyPhone() {
  const phone = data.value?.customer?.phone
  if (!phone) return
  uni.setClipboardData({
    data: phone,
    success: () => uni.showToast({ title: '电话已复制', icon: 'success' }),
  })
}
</script>

<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="state-box">
      <text class="state-text">加载中…</text>
    </view>

    <!-- 异常 -->
    <view v-else-if="errorMsg" class="state-box">
      <view class="state-icon">⚠️</view>
      <text class="state-title">无法查看</text>
      <text class="state-text">{{ errorMsg }}</text>
      <view class="state-btn" @click="load">重试</view>
    </view>

    <!-- 正文 -->
    <view v-else-if="data" class="body">
      <!-- 商家头 -->
      <view class="merchant-card">
        <image
          v-if="data.merchant.logo"
          class="m-logo"
          :src="data.merchant.logo"
          mode="aspectFill"
        />
        <view v-else class="m-logo placeholder">{{ data.merchant.name?.slice(0, 1) || 'M' }}</view>
        <view class="m-info">
          <text class="m-name">{{ data.merchant.name }}</text>
          <text class="m-tip">{{ data.intro || '商家邀请您查看订单详情' }}</text>
        </view>
        <view v-if="data.merchant.contactPhone" class="m-call" @click="callMerchant"> 联系 </view>
      </view>

      <!-- 基础信息 -->
      <view v-if="data.basics" class="card">
        <view class="card-head">
          <text class="card-title">订单信息</text>
          <text class="status-tag">{{
            STATUS_LABEL[data.basics.status] || data.basics.status
          }}</text>
        </view>
        <view class="row" @click="copyOrderNo">
          <text class="row-label">订单号</text>
          <view class="row-value-with-copy">
            <text class="row-value">{{ data.basics.no }}</text>
            <text class="row-copy">复制</text>
          </view>
        </view>
        <view class="row">
          <text class="row-label">下单时间</text>
          <text class="row-value">{{ formatDate(data.basics.createdAt) }}</text>
        </view>
        <view v-if="data.basics.paidAt" class="row">
          <text class="row-label">付款时间</text>
          <text class="row-value">{{ formatDate(data.basics.paidAt) }}</text>
        </view>
        <view v-if="data.basics.shippedAt" class="row">
          <text class="row-label">发货时间</text>
          <text class="row-value">{{ formatDate(data.basics.shippedAt) }}</text>
        </view>
      </view>

      <!-- 客户信息 -->
      <view v-if="data.customer" class="card">
        <view class="card-head">
          <text class="card-title">客户信息</text>
        </view>
        <view class="row">
          <text class="row-label">姓名</text>
          <text class="row-value">{{ data.customer.name || '—' }}</text>
        </view>
        <view v-if="data.customer.phone" class="row" @click="copyPhone">
          <text class="row-label">电话</text>
          <view class="row-value-with-copy">
            <text class="row-value">{{ data.customer.phone }}</text>
            <text class="row-copy">复制</text>
          </view>
        </view>
        <view v-if="data.customer.region || data.customer.detail" class="row">
          <text class="row-label">地址</text>
          <text class="row-value">{{ data.customer.region }} {{ data.customer.detail }}</text>
        </view>
      </view>

      <!-- 商品清单 -->
      <view v-if="data.items && data.items.length > 0" class="card">
        <view class="card-head">
          <text class="card-title">商品清单</text>
          <text class="card-sub">共 {{ data.items.length }} 件</text>
        </view>
        <view v-for="it in data.items" :key="it.id" class="item">
          <image v-if="it.productImage" class="item-img" :src="it.productImage" mode="aspectFill" />
          <view v-else class="item-img placeholder">商品</view>
          <view class="item-info">
            <text class="item-name">{{ it.productName }}</text>
            <text v-if="it.specsLabel" class="item-spec">{{ it.specsLabel }}</text>
            <view class="item-bottom">
              <text class="item-price">{{ formatYuan(it.unitPrice) }}</text>
              <text class="item-qty">× {{ it.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view v-if="data.pricing" class="card">
        <view class="card-head">
          <text class="card-title">价格明细</text>
        </view>
        <view class="row">
          <text class="row-label">商品总额</text>
          <text class="row-value">{{ formatYuan(data.pricing.totalAmount) }}</text>
        </view>
        <view
          v-if="data.pricing.discountAmount && Number(data.pricing.discountAmount) > 0"
          class="row"
        >
          <text class="row-label">优惠金额</text>
          <text class="row-value discount">− {{ formatYuan(data.pricing.discountAmount) }}</text>
        </view>
        <view class="row">
          <text class="row-label">运费</text>
          <text class="row-value">
            {{
              Number(data.pricing.shippingFee) === 0 ? '包邮' : formatYuan(data.pricing.shippingFee)
            }}
          </text>
        </view>
        <view class="row total">
          <text class="row-label">应付金额</text>
          <text class="row-value primary">{{ formatYuan(data.pricing.payAmount) }}</text>
        </view>
      </view>

      <!-- 附加信息 -->
      <view
        v-if="
          data.extra &&
          (data.extra.remark || data.extra.trackingNumber || data.extra.shippingMethod)
        "
        class="card"
      >
        <view class="card-head">
          <text class="card-title">附加信息</text>
        </view>
        <view v-if="data.extra.shippingMethod" class="row">
          <text class="row-label">配送方式</text>
          <text class="row-value">{{
            SHIPPING_LABEL[data.extra.shippingMethod] || data.extra.shippingMethod
          }}</text>
        </view>
        <view v-if="data.extra.trackingCompany" class="row">
          <text class="row-label">物流公司</text>
          <text class="row-value">{{ data.extra.trackingCompany }}</text>
        </view>
        <view v-if="data.extra.trackingNumber" class="row">
          <text class="row-label">物流单号</text>
          <text class="row-value">{{ data.extra.trackingNumber }}</text>
        </view>
        <view v-if="data.extra.remark" class="row">
          <text class="row-label">备注</text>
          <text class="row-value">{{ data.extra.remark }}</text>
        </view>
      </view>

      <!-- 底部说明 -->
      <view class="footer">
        <text class="footer-tip">⌛ {{ expiresHint }}</text>
        <text class="footer-mark">由商家通过经纬科技分享 · 内容仅供查看</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
  padding: 24rpx;
  box-sizing: border-box;
}

.state-box {
  margin-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx;
}
.state-icon {
  font-size: 80rpx;
}
.state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
}
.state-text {
  font-size: 26rpx;
  color: #86909c;
  text-align: center;
}
.state-btn {
  margin-top: 20rpx;
  padding: 16rpx 60rpx;
  background: #ff4d2d;
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
}

.merchant-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.m-logo {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
  &.placeholder {
    color: #fff;
  }
}
.m-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}
.m-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
}
.m-tip {
  font-size: 24rpx;
  color: #86909c;
}
.m-call {
  padding: 14rpx 28rpx;
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 16rpx;
  margin-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f6f8;
}
.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
}
.card-sub {
  font-size: 22rpx;
  color: #86909c;
}
.status-tag {
  padding: 4rpx 16rpx;
  background: rgba(255, 77, 45, 0.1);
  color: #ff4d2d;
  font-size: 22rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  &.total {
    margin-top: 12rpx;
    padding-top: 16rpx;
    border-top: 1rpx dashed #f5f6f8;
  }
}
.row-label {
  font-size: 26rpx;
  color: #86909c;
  flex-shrink: 0;
  margin-right: 16rpx;
}
.row-value {
  font-size: 26rpx;
  color: #1d2129;
  text-align: right;
  word-break: break-all;
  &.discount {
    color: #ff4d2d;
  }
  &.primary {
    font-size: 32rpx;
    color: #ff4d2d;
    font-weight: 700;
  }
}
.row-value-with-copy {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.row-copy {
  font-size: 22rpx;
  color: #ff4d2d;
  padding: 4rpx 12rpx;
  background: rgba(255, 77, 45, 0.08);
  border-radius: 8rpx;
}

.item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f6f8;
  &:last-child {
    border-bottom: none;
  }
}
.item-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f7f8fa;
  flex-shrink: 0;
  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c9cdd4;
    font-size: 22rpx;
  }
}
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.item-name {
  font-size: 28rpx;
  color: #1d2129;
  font-weight: 500;
  line-height: 1.4;
}
.item-spec {
  font-size: 22rpx;
  color: #86909c;
}
.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}
.item-price {
  font-size: 28rpx;
  color: #ff4d2d;
  font-weight: 700;
}
.item-qty {
  font-size: 22rpx;
  color: #86909c;
}

.footer {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.footer-tip {
  font-size: 24rpx;
  color: #86909c;
}
.footer-mark {
  font-size: 20rpx;
  color: #c9cdd4;
}
</style>
