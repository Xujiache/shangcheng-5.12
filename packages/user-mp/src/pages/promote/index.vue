<script setup lang="ts">
/**
 * UM-11 · 推广分佣
 * 还原 原型图/user-mini.jsx::UM_Promote
 * - 顶部累计佣金大数据
 * - 3 宫格：推广人数 / 订单数 / 转化率
 * - 生成专属推广海报
 * - 佣金明细
 */
import { ref, onMounted } from 'vue'
import { promoteService } from '../../services'
import { formatPrice, formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const summary = ref<Awaited<ReturnType<typeof promoteService.summary>>>({
  total: 0,
  thisMonth: 0,
  pending: 0,
  people: 0,
  orderCount: 0,
  conversion: 0,
})
const orders = ref<{ id: string; orderNo: string; amount: number; createdAt: string }[]>([])

async function load() {
  try {
    const [s, o] = await Promise.all([promoteService.summary(), promoteService.orders()])
    summary.value = s
    orders.value = o.list ?? []
  } catch (e) {
    console.error(e)
  }
}

/** 客服微信号（如需变更可放进 SystemConfig） */
const SUPPORT_WECHAT = 'jiujiu_kefu'

/**
 * 推广提现：后端目前没有 /u/promote/withdraw 接口，统一引导联系客服。
 * 之前 setTimeout 假成功容易让用户以为真到账，已改为复制客服微信号的诚实流程。
 */
function withdraw() {
  uni.showModal({
    title: '推广收益提现',
    content: `本月待结算 ¥${summary.value.thisMonth || 0}。当前提现走人工审核，复制客服微信号后联系客服核对账户后到账，预计 1-3 个工作日。`,
    confirmText: '复制客服微信',
    cancelText: '我再想想',
    success: (r) => {
      if (r.confirm) {
        uni.setClipboardData({
          data: SUPPORT_WECHAT,
          success: () => uni.showToast({ title: '客服微信号已复制', icon: 'success' }),
          fail: () =>
            uni.showToast({
              title: '复制失败，请手动添加 ' + SUPPORT_WECHAT,
              icon: 'none',
              duration: 2500,
            }),
        })
      }
    },
  })
}

/**
 * 生成专属推广海报（极简方案）：
 *  1. 把当前推广分享链接放入剪贴板
 *  2. 提示用户去通讯录 / 朋友圈粘贴；或长按主页二维码海报截图（后期接 canvas 真海报时替换）
 *
 * 之所以不走 canvas 是因为 mp-weixin 真渲染需要：
 *   - 二维码图片来源（带 token 的服务端签名 URL，后端暂未提供）
 *   - 头像跨域白名单
 *   - canvas 2d 性能 / 截图保存权限
 * 这些条件不齐全的情况下做半成品反而误导用户。
 */
function genPoster() {
  const link = 'https://ewsn.top/?ref=' + (summary.value.people > 0 ? 'promoter' : 'invite')
  uni.setClipboardData({
    data: link,
    success: () => {
      uni.showModal({
        title: '推广链接已复制',
        content:
          '可以粘贴到微信好友 / 朋友圈分享。\n\n如果需要带二维码的海报图，请联系客服获取专属海报模板。',
        confirmText: '我知道了',
        showCancel: false,
      })
    },
    fail: () => uni.showToast({ title: '复制失败，请稍后重试', icon: 'none' }),
  })
}

function showHelp() {
  uni.showModal({
    title: '推广分佣规则',
    content:
      '邀请好友通过你的专属链接下单，即可获得订单金额 8% 的一级佣金，二级佣金 3%。佣金次月结算。',
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

    <!-- 3 宫格 -->
    <view class="grid">
      <view class="grid-item">
        <Icon name="user-add" :size="36" color="var(--brand-primary)" />
        <text class="grid-label">推广人数</text>
        <text class="grid-value">{{ summary.people }}</text>
      </view>
      <view class="grid-item">
        <Icon name="package" :size="36" color="#FF7A45" />
        <text class="grid-label">订单数</text>
        <text class="grid-value">{{ summary.orderCount }}</text>
      </view>
      <view class="grid-item">
        <Icon name="thumb-up" :size="36" color="#A855F7" />
        <text class="grid-label">转化率</text>
        <text class="grid-value">{{ summary.conversion }}%</text>
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
