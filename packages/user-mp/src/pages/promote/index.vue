<script setup lang="ts">
/**
 * UM-11 · 推广分佣
 * 还原 原型图/user-mini.jsx::UM_Promote
 * - 顶部累计佣金大数据
 * - 3 宫格：推广人数 / 订单数 / 转化率（后端无聚合 → 显示「—」）
 * - 生成专属推广海报（走后端签名链接，本地不再凑假 URL）
 * - 佣金明细
 *
 * 零硬编码原则：
 *   - 不写死客服微信号/电话（P1-14）
 *   - 不写死推广规则百分比（P1-12）
 *   - 不显示假的 0% 转化率（P0-8）
 */
import { ref, computed, onMounted } from 'vue'
import { promoteService, systemService } from '../../services'
import type { PromoteSummary } from '../../services'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const summary = ref<PromoteSummary>({
  total: 0,
  thisMonth: 0,
  pending: 0,
  people: null,
  orderCount: 0,
  conversion: null,
})
const orders = ref<{ id: string; orderNo: string; amount: number; createdAt: string }[]>([])

/** 平台客服联系方式（由 systemService.settings 拉），空值=未配置 */
const supportWechat = ref<string | null>(null)
const supportPhone = ref<string | null>(null)
const supportHours = ref<string | null>(null)

/** 推广规则正文：由后端 SystemConfig.promote.rules 配置；为空时显示"详情请咨询客服" */
const ruleBody = ref<string>('')
const ruleUpdatedAt = ref<string>('')

async function load() {
  try {
    const [s, o] = await Promise.all([promoteService.summary(), promoteService.orders()])
    summary.value = s
    orders.value = o.list ?? []
  } catch (e) {
    console.error(e)
  }
  // 系统设置与推广规则可独立失败（老后端没该接口，不影响主流程）
  systemService
    .settings()
    .then((cfg) => {
      supportWechat.value = (cfg?.customerServiceWechat as string | null) ?? null
      supportPhone.value = (cfg?.customerServicePhone as string | null) ?? null
      supportHours.value = (cfg?.customerServiceHours as string | null) ?? null
    })
    .catch(() => {})
  promoteService
    .rules()
    .then((r) => {
      ruleBody.value = r?.body || ''
      ruleUpdatedAt.value = r?.updatedAt || ''
    })
    .catch(() => {})
}

/** 显示文案兜底：null/0 都视为"暂无数据"（避免造一个 0% 转化率误导用户） */
function showCountOrEmpty(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v === 0) return '—'
  return String(v)
}

/** 转化率：null=无聚合源，显示「—」；否则展示百分比 */
const conversionText = computed(() => {
  const v = summary.value.conversion
  if (v == null) return '—'
  return `${v}%`
})

const peopleText = computed(() => showCountOrEmpty(summary.value.people))
const orderCountText = computed(() => showCountOrEmpty(summary.value.orderCount))

/**
 * 推广提现：平台目前未开通自助提现入口，统一引导联系客服。
 *
 * 关键：不写死任何客服微信号/电话；客服联系方式从 systemService.settings 拉，
 * 后端未配置时直接显示"请联系平台客服"，绝不退化成硬编码常量。
 */
function withdraw() {
  const month = formatPrice(summary.value.thisMonth || 0)
  const supportLines: string[] = []
  if (supportWechat.value) supportLines.push(`客服微信：${supportWechat.value}`)
  if (supportPhone.value) supportLines.push(`客服电话：${supportPhone.value}`)
  if (supportHours.value) supportLines.push(`服务时间：${supportHours.value}`)
  const supportText =
    supportLines.length > 0 ? supportLines.join('\n') : '请通过平台官方渠道联系客服。'

  uni.showModal({
    title: '推广收益提现',
    content: `本月待结算 ¥${month}。\n\n暂未开通自助提现，请联系客服核对账户后人工到账。\n\n${supportText}`,
    confirmText: supportWechat.value ? '复制客服微信' : '我知道了',
    cancelText: supportWechat.value ? '我再想想' : '取消',
    showCancel: !!supportWechat.value,
    success: (r) => {
      if (r.confirm && supportWechat.value) {
        uni.setClipboardData({
          data: supportWechat.value,
          success: () => uni.showToast({ title: '客服微信号已复制', icon: 'success' }),
          fail: () =>
            uni.showToast({ title: '复制失败，请手动添加', icon: 'none', duration: 2000 }),
        })
      }
    },
  })
}

/**
 * 生成专属推广海报。
 *
 * 调后端 `GET /u/promote/share-link` 拿到带 user.id 追踪签名的 URL（以及可选 posterUrl）。
 * - 接口正常 → 复制链接 / 海报地址，引导用户分享
 * - 接口不存在/未上线 → 提示"请联系客服获取推广素材"
 *
 * 不再本地凑 `ewsn.top/?ref=invite` 的假链接：这种链接不带追踪，推广人无法获得佣金归属，
 * 是典型的"假装能用"反模式。
 */
async function genPoster() {
  uni.showLoading({ title: '生成中…', mask: true })
  try {
    const data = await promoteService.shareLink()
    uni.hideLoading()
    const payload = data?.posterUrl || data?.url
    if (!payload) {
      uni.showToast({ title: '暂未生成推广素材，请联系客服', icon: 'none', duration: 2000 })
      return
    }
    uni.setClipboardData({
      data: payload,
      success: () => {
        uni.showModal({
          title: data.posterUrl ? '推广海报链接已复制' : '推广链接已复制',
          content: data.posterUrl
            ? '可在浏览器打开下载，或将链接粘贴到微信好友/朋友圈直接分享。'
            : '可粘贴到微信好友/朋友圈分享。该链接已带你的推广追踪标识。',
          confirmText: '我知道了',
          showCancel: false,
        })
      },
      fail: () => uni.showToast({ title: '复制失败，请稍后重试', icon: 'none' }),
    })
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({
      title: e?.message || '暂未开通推广海报，请联系客服',
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * 推广规则弹窗。
 *
 * 优先用后端 `GET /u/promote/rules` 返回的正文；为空时显示"详情请咨询客服"，
 * 绝不写死"一级 8% / 二级 3%"这类百分比文案（业务可能随时调整）。
 */
function showHelp() {
  const body = ruleBody.value || '推广分佣规则由平台不定期调整，详情请咨询平台客服。'
  uni.showModal({
    title: '推广分佣规则',
    content: ruleUpdatedAt.value ? `${body}\n\n(更新于 ${ruleUpdatedAt.value})` : body,
    showCancel: false,
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="推广分佣" right-icon="help" @right="showHelp" />

    <!-- 累计佣金大数据卡 -->
    <view class="hero-card">
      <view class="hero-bg" />
      <text class="hero-label">累计佣金（元）</text>
      <text class="hero-value">{{ formatPrice(summary.total) }}</text>
      <view class="hero-row">
        <view class="hero-meta">
          <text class="meta-label">本月</text>
          <text class="meta-value">{{ formatPrice(summary.thisMonth) }}</text>
        </view>
        <view class="hero-divider" />
        <view class="hero-meta">
          <text class="meta-label">待结算</text>
          <text class="meta-value">{{ formatPrice(summary.pending) }}</text>
        </view>
        <view class="withdraw-btn" @click="withdraw">提现</view>
      </view>
    </view>

    <!-- 3 宫格：null/0 一律显示「—」，禁止造假 0% -->
    <view class="grid">
      <view class="grid-item">
        <Icon name="user-add" :size="36" color="var(--brand-primary)" />
        <text class="grid-label">推广人数</text>
        <text class="grid-value">{{ peopleText }}</text>
      </view>
      <view class="grid-item">
        <Icon name="package" :size="36" color="#FF7A45" />
        <text class="grid-label">订单数</text>
        <text class="grid-value">{{ orderCountText }}</text>
      </view>
      <view class="grid-item">
        <Icon name="thumb-up" :size="36" color="#A855F7" />
        <text class="grid-label">转化率</text>
        <text class="grid-value">{{ conversionText }}</text>
      </view>
    </view>

    <!-- 生成海报按钮 -->
    <view class="poster-btn" @click="genPoster">
      <Icon name="image-plus" :size="36" color="#fff" />
      <text>生成专属推广海报</text>
    </view>

    <!-- 明细 -->
    <view class="list-card">
      <view class="list-head">
        <text class="title">佣金明细</text>
        <text class="action">全部 ›</text>
      </view>
      <view v-for="o in orders" :key="o.id" class="list-row">
        <view class="list-info">
          <text class="list-no">订单 #{{ o.orderNo }}</text>
          <text class="list-time">{{ formatDate(o.createdAt) }}</text>
        </view>
        <text class="list-amount">+{{ formatPrice(o.amount) }}</text>
      </view>
      <view v-if="orders.length === 0" class="list-empty">
        <text>暂无佣金记录</text>
      </view>
    </view>

    <view style="height: 40rpx" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.hero-card {
  position: relative;
  margin: 16rpx 24rpx;
  padding: 36rpx 32rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .hero-bg {
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 240rpx;
    height: 240rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
  .hero-label {
    font-size: 24rpx;
    opacity: 0.85;
  }
  .hero-value {
    font-size: 72rpx;
    font-weight: 800;
    line-height: 1;
    font-family: $font-family-base;
  }
  .hero-row {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin-top: 16rpx;
    z-index: 1;
    .hero-meta {
      display: flex;
      flex-direction: column;
      gap: 2rpx;
      .meta-label {
        font-size: 20rpx;
        opacity: 0.8;
      }
      .meta-value {
        font-size: 26rpx;
        font-weight: 700;
        font-family: $font-family-base;
      }
    }
    .hero-divider {
      width: 1rpx;
      height: 48rpx;
      background: rgba(255, 255, 255, 0.3);
    }
    .withdraw-btn {
      margin-left: auto;
      padding: 12rpx 32rpx;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 999rpx;
      font-size: 24rpx;
      font-weight: 700;
    }
  }
}
.grid {
  margin: 16rpx 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.grid-item {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  box-shadow: $shadow-sm;
  .grid-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .grid-value {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--text-primary);
    font-family: $font-family-base;
  }
}
.poster-btn {
  margin: 16rpx 24rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: var(--text-primary);
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.list-card {
  margin: 16rpx 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: $shadow-sm;
}
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12rpx;
  .title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .action {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
}
.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .list-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .list-no {
      font-size: 26rpx;
      color: var(--text-primary);
    }
    .list-time {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
  .list-amount {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: $font-family-base;
  }
}
.list-empty {
  padding: 48rpx 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 24rpx;
}
</style>
