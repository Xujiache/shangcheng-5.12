<script setup lang="ts">
/**
 * PA-11 · 系统设置
 * 还原 原型图/platform-app.jsx::PA_System
 * - 基础设置：注册商家上限/平台名称/客服电话/抽佣比例
 * - 系统配置：支付/短信/物流/OSS 存储
 * - 安全设置：密码策略 / IP 白名单
 */
import { ref, computed, onMounted } from 'vue'
import { systemService } from '../../services'
import type { SystemSettings } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const settings = ref<SystemSettings | null>(null)
const loading = ref(false)
/**
 * registerLimit / commissionRate 与 admin-pc 共用同一 SystemConfig 记录,
 * 字段路径 settings.business.{registerLimit,commissionRate}。
 * 这里两个本地 ref 仅作为表单展示态,实际真相在 settings.business。
 */
const registerLimit = ref(500)
const commissionRate = ref(2)

async function load() {
  loading.value = true
  try {
    const s = await systemService.settings()
    settings.value = s
    if (s?.business) {
      if (typeof s.business.registerLimit === 'number') registerLimit.value = s.business.registerLimit
      if (typeof s.business.commissionRate === 'number') commissionRate.value = s.business.commissionRate
    }
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!settings.value) return
  uni.showLoading({ title: '保存中…' })
  try {
    await systemService.saveSettings(settings.value)
    uni.hideLoading()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch {
    uni.hideLoading()
  }
}

/** 将 registerLimit / commissionRate 写回 settings.business 再持久化 */
async function persistBusiness() {
  if (!settings.value) return
  settings.value.business = {
    registerLimit: registerLimit.value,
    commissionRate: commissionRate.value,
  }
  await save()
}

function editSiteName() {
  if (!settings.value) return
  uni.showModal({
    title: '平台名称',
    editable: true,
    content: settings.value.site.name,
    success: async (r) => {
      if (r.confirm && r.content) {
        settings.value!.site.name = r.content
        await save()
      }
    },
  })
}

function editServicePhone() {
  if (!settings.value) return
  uni.showModal({
    title: '客服电话',
    editable: true,
    content: settings.value.service.phone,
    success: async (r) => {
      if (r.confirm && r.content) {
        settings.value!.service.phone = r.content
        await save()
      }
    },
  })
}

function editIcp() {
  if (!settings.value) return
  uni.showModal({
    title: 'ICP 备案号',
    editable: true,
    content: settings.value.site.icp,
    success: async (r) => {
      if (r.confirm && r.content) {
        settings.value!.site.icp = r.content
        await save()
      }
    },
  })
}

function changeRegisterLimit() {
  uni.showActionSheet({
    itemList: ['100 家', '200 家', '500 家', '1000 家', '不限制'],
    success: async (r) => {
      registerLimit.value = [100, 200, 500, 1000, 9999][r.tapIndex]
      await persistBusiness()
    },
  })
}

function changeCommissionRate() {
  uni.showActionSheet({
    itemList: ['1% 抽佣', '2% 抽佣', '3% 抽佣', '5% 抽佣'],
    success: async (r) => {
      commissionRate.value = [1, 2, 3, 5][r.tapIndex]
      await persistBusiness()
    },
  })
}

async function togglePayment(key: 'wechat' | 'alipay' | 'balance') {
  if (!settings.value) return
  settings.value.payment[key] = !settings.value.payment[key]
  await save()
}

function configureItem(item: string) {
  uni.showToast({ title: item + ' · 待开放配置面板', icon: 'none' })
}

function viewLogs() {
  uni.showToast({ title: '操作日志 · 待开放', icon: 'none' })
}

function changeWorkTime() {
  if (!settings.value) return
  uni.showActionSheet({
    itemList: ['7×24 小时', '工作日 9:00-22:00', '工作日 9:00-18:00', '自定义'],
    success: async (r) => {
      const times = ['7×24 小时', '工作日 9:00-22:00', '工作日 9:00-18:00', '工作日 10:00-19:00']
      settings.value!.service.workTime = times[r.tapIndex]
      await save()
    },
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="系统设置" />

    <scroll-view scroll-y class="scroll" v-if="settings">
      <!-- 站点信息卡 -->
      <view class="hero">
        <view class="site-logo">
          <image v-if="settings.site.logo" :src="settings.site.logo" class="logo-img" />
          <text v-else class="logo-letter">{{ settings.site.name[0] }}</text>
        </view>
        <view class="site-info">
          <text class="site-name">{{ settings.site.name }}</text>
          <text class="site-icp">{{ settings.site.icp }}</text>
          <text class="site-tag">平台版本 · v1.0.0</text>
        </view>
      </view>

      <!-- 基础设置 -->
      <view class="card">
        <view class="card-title">
          <Icon name="gear" :size="28" color="var(--brand-primary)" />
          <text>基础设置</text>
        </view>
        <view class="row" @click="editSiteName">
          <text class="r-label">平台名称</text>
          <view class="r-value">
            <text>{{ settings.site.name }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="editIcp">
          <text class="r-label">ICP 备案号</text>
          <view class="r-value">
            <text class="value-mono">{{ settings.site.icp }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="changeRegisterLimit">
          <text class="r-label">注册商家上限</text>
          <view class="r-value">
            <text class="value-num">{{ registerLimit >= 9999 ? '不限' : registerLimit + ' 家' }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="changeCommissionRate">
          <text class="r-label">平台抽佣比例</text>
          <view class="r-value">
            <text class="value-num accent">{{ commissionRate }}%</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 客服设置 -->
      <view class="card">
        <view class="card-title">
          <Icon name="message" :size="28" color="#52C41A" />
          <text>客服设置</text>
        </view>
        <view class="row" @click="editServicePhone">
          <text class="r-label">客服电话</text>
          <view class="r-value">
            <text class="value-mono">{{ settings.service.phone }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row">
          <text class="r-label">客服邮箱</text>
          <view class="r-value">
            <text class="value-mono">{{ settings.service.email }}</text>
          </view>
        </view>
        <view class="row" @click="changeWorkTime">
          <text class="r-label">工作时间</text>
          <view class="r-value">
            <text>{{ settings.service.workTime }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="card">
        <view class="card-title">
          <Icon name="wallet" :size="28" color="#FAAD14" />
          <text>支付方式</text>
        </view>
        <view class="pay-row">
          <view class="pay-icon" :style="{ background: '#3CB244' }">
            <Icon name="wechat" :size="32" color="#fff" />
          </view>
          <view class="pay-info">
            <text class="p-name">微信支付</text>
            <text class="p-desc">官方接口 · 实时到账</text>
          </view>
          <view :class="['switch', settings.payment.wechat ? 'on' : '']" @click="togglePayment('wechat')">
            <view class="thumb" />
          </view>
        </view>
        <view class="pay-row">
          <view class="pay-icon" :style="{ background: '#1296DB' }">
            <Icon name="apple-pay" :size="32" color="#fff" />
          </view>
          <view class="pay-info">
            <text class="p-name">支付宝</text>
            <text class="p-desc">官方接口 · 实时到账</text>
          </view>
          <view :class="['switch', settings.payment.alipay ? 'on' : '']" @click="togglePayment('alipay')">
            <view class="thumb" />
          </view>
        </view>
        <view class="pay-row">
          <view class="pay-icon" :style="{ background: '#FF7A45' }">
            <Icon name="wallet" :size="32" color="#fff" />
          </view>
          <view class="pay-info">
            <text class="p-name">余额支付</text>
            <text class="p-desc">商户余额钱包</text>
          </view>
          <view :class="['switch', settings.payment.balance ? 'on' : '']" @click="togglePayment('balance')">
            <view class="thumb" />
          </view>
        </view>
      </view>

      <!-- 系统配置 -->
      <view class="card">
        <view class="card-title">
          <Icon name="package" :size="28" color="#A855F7" />
          <text>系统配置</text>
        </view>
        <view class="row" @click="configureItem('短信配置')">
          <text class="r-label">短信服务</text>
          <view class="r-value">
            <text class="value-status on">已配置</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="configureItem('物流配置')">
          <text class="r-label">物流配置</text>
          <view class="r-value">
            <text class="value-num">{{ settings.logistics.providers.length }} 家承运商</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="configureItem('OSS 存储')">
          <text class="r-label">OSS / 存储</text>
          <view class="r-value">
            <text class="value-status on">阿里云 OSS</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="configureItem('地图服务')">
          <text class="r-label">地图服务</text>
          <view class="r-value">
            <text class="value-status warn">未配置</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
      </view>

      <!-- 安全设置 -->
      <view class="card">
        <view class="card-title">
          <Icon name="lock" :size="28" color="#FF3B30" />
          <text>安全设置</text>
        </view>
        <view class="row" @click="configureItem('密码策略')">
          <text class="r-label">密码策略</text>
          <view class="r-value">
            <text>{{ settings.security.passwordPolicy }}</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="configureItem('IP 白名单')">
          <text class="r-label">IP 白名单</text>
          <view class="r-value">
            <text class="value-status warn">未启用</text>
            <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
          </view>
        </view>
        <view class="row" @click="viewLogs">
          <text class="r-label">操作日志</text>
          <view class="r-value">
            <text>查看 ›</text>
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

.hero {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #FF4D2D, #FF9C6E);
  color: #fff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.25);
}
.site-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .logo-img {
    width: 100%;
    height: 100%;
    border-radius: 24rpx;
  }
  .logo-letter {
    font-size: 44rpx;
    font-weight: 800;
    color: #fff;
  }
}
.site-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .site-name { font-size: 32rpx; font-weight: 800; }
  .site-icp {
    font-size: 22rpx;
    opacity: 0.9;
    font-family: var(--font-family-base);
  }
  .site-tag {
    font-size: 20rpx;
    opacity: 0.85;
  }
}

.card {
  background: var(--bg-card);
  margin: 16rpx 24rpx 0;
  border-radius: 20rpx;
  padding: 8rpx 24rpx;
  box-shadow: var(--shadow-sm);
}
.card-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0 12rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: var(--text-primary);
  border-bottom: 1rpx solid var(--border-light);
}
.row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  .r-label {
    flex-shrink: 0;
    width: 200rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
  .r-value {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    text-align: right;
    min-width: 0;
    text {
      max-width: 320rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .value-mono {
      font-family: var(--font-family-base);
      font-size: 24rpx;
    }
    .value-num {
      font-family: var(--font-family-base);
      font-weight: 700;
      &.accent {
        color: var(--brand-primary);
        font-size: 30rpx;
      }
    }
    .value-status {
      padding: 2rpx 12rpx;
      border-radius: 999rpx;
      font-size: 20rpx;
      font-weight: 700;
      &.on { background: rgba(82,196,26,0.1); color: #52C41A; }
      &.warn { background: rgba(250,173,20,0.1); color: #FAAD14; }
    }
  }
}

.pay-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
}
.pay-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pay-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  .p-name { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
  .p-desc { font-size: 20rpx; color: var(--text-tertiary); }
}
.switch {
  flex-shrink: 0;
  width: 80rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  position: relative;
  transition: all .2s;
  .thumb {
    position: absolute;
    top: 2rpx;
    left: 2rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: all .2s;
    box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.15);
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
</style>
