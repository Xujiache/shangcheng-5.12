<script setup lang="ts">
/**
 * MA · 系统设置（v1 · 替换原 action-sheet 桩）
 *
 * 包含：通知开关、夜间模式、语言、缓存清理、版本号、隐私协议链接
 * 所有偏好持久化到本地 uni storage，重启后生效；夜间模式作用于全局 CSS 变量。
 *
 * Wave5 评估（2026-05）：
 * 通知偏好刻意"仅本地"，与新订单 WS 推送、AppPush 等服务端推送解耦：
 *   1. 关闭"推送通知"只影响 APP 内提示，不影响系统通知栏权限；
 *   2. 通常无需跨设备同步（移动端每台设备的提示噪音诉求不同）。
 * 后续如需多端同步（如商家在 PC 和 APP 双端登录），可：
 *   - 后端补一个 `GET / POST /api/v1/m/profile/notify-prefs` 接口；
 *   - 这里把 load() / save() 改成 storage 优先 + 在 onMounted 后异步 merge 服务端；
 *   - save() 防抖批量上传，避免单 toggle 就触发请求。
 * 目前不动，保持轻量。
 */
import { ref, onMounted, computed } from 'vue'
import Icon from '../../components/icon/icon.vue'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import AccountSecurity from '../../components/account-security/account-security.vue'
import { useUserStore } from '../../store'

const userStore = useUserStore()
const currentPhone = computed(() => (userStore.user as any)?.phone || '')

const securityOpen = ref(false)
const securityMode = ref<'password' | 'phone'>('password')
function openPasswordSheet() {
  securityMode.value = 'password'
  securityOpen.value = true
}
function openPhoneChangeSheet() {
  securityMode.value = 'phone'
  securityOpen.value = true
}

const KEY = 'merchant_settings_prefs'

interface Prefs {
  notify: boolean
  notifyOrder: boolean
  notifyAfterSale: boolean
  notifyChat: boolean
  darkMode: boolean
  language: 'zh-CN' | 'en'
}

const DEFAULTS: Prefs = {
  notify: true,
  notifyOrder: true,
  notifyAfterSale: true,
  notifyChat: true,
  darkMode: false,
  language: 'zh-CN',
}

const prefs = ref<Prefs>({ ...DEFAULTS })
const cacheSize = ref('0.0 MB')

function load() {
  try {
    const raw = uni.getStorageSync(KEY)
    if (raw) Object.assign(prefs.value, { ...DEFAULTS, ...JSON.parse(raw) })
  } catch {}
  estimateCache()
}

function save() {
  try {
    uni.setStorageSync(KEY, JSON.stringify(prefs.value))
  } catch {}
}

function toggleNotify(key: 'notify' | 'notifyOrder' | 'notifyAfterSale' | 'notifyChat') {
  prefs.value[key] = !prefs.value[key]
  if (key === 'notify' && !prefs.value.notify) {
    // 关闭总开关时也关闭所有子开关
    prefs.value.notifyOrder = false
    prefs.value.notifyAfterSale = false
    prefs.value.notifyChat = false
  }
  save()
}

function toggleDark() {
  prefs.value.darkMode = !prefs.value.darkMode
  save()
  uni.showToast({ title: prefs.value.darkMode ? '已切换夜间模式' : '已切回日间模式', icon: 'none' })
}

function chooseLanguage() {
  uni.showActionSheet({
    itemList: ['简体中文', 'English'],
    success: (r) => {
      prefs.value.language = r.tapIndex === 0 ? 'zh-CN' : 'en'
      save()
      uni.showToast({ title: '已切换语言（下次启动生效）', icon: 'none' })
    },
  })
}

function estimateCache() {
  try {
    const info = uni.getStorageInfoSync()
    cacheSize.value = `${(info.currentSize / 1024).toFixed(1)} MB`
  } catch {
    cacheSize.value = '--'
  }
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '将清除浏览历史、图片缓存等数据，登录态保留。',
    confirmText: '清除',
    success: (r) => {
      if (!r.confirm) return
      try {
        const keepKeys = ['jiujiu_token', 'jiujiu_refresh_token', 'jiujiu_user', KEY]
        const info = uni.getStorageInfoSync()
        for (const k of info.keys || []) {
          if (!keepKeys.includes(k)) {
            try {
              uni.removeStorageSync(k)
            } catch {}
          }
        }
        estimateCache()
        uni.showToast({ title: '已清除', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '清除失败', icon: 'none' })
      }
    },
  })
}

function goAgreement() {
  uni.showToast({ title: '请登录后在登录页查看协议弹层', icon: 'none' })
}

function goAbout() {
  uni.showModal({
    title: '关于我们',
    content: '经纬科技 · 商家版 v0.1.0\n\n客服：400-888-9988\nsupport@jiujiu.com',
    showCancel: false,
  })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="系统设置" />
    <view class="card">
      <view class="card-title">通知</view>
      <view class="row" @click="toggleNotify('notify')">
        <view class="row-info">
          <text class="row-label">推送通知</text>
          <text class="row-sub">关闭后不再收到任何推送</text>
        </view>
        <switch :checked="prefs.notify" color="#FF4D2D" @click.stop="toggleNotify('notify')" />
      </view>
      <view
        class="row"
        :class="{ 'row-disabled': !prefs.notify }"
        @click="prefs.notify && toggleNotify('notifyOrder')"
      >
        <view class="row-info">
          <text class="row-label">新订单提醒</text>
          <text class="row-sub">有新订单时震动 + 弹窗</text>
        </view>
        <switch
          :checked="prefs.notifyOrder && prefs.notify"
          :disabled="!prefs.notify"
          color="#FF4D2D"
          @click.stop="prefs.notify && toggleNotify('notifyOrder')"
        />
      </view>
      <view
        class="row"
        :class="{ 'row-disabled': !prefs.notify }"
        @click="prefs.notify && toggleNotify('notifyAfterSale')"
      >
        <view class="row-info">
          <text class="row-label">售后提醒</text>
          <text class="row-sub">退款 / 售后申请时提醒</text>
        </view>
        <switch
          :checked="prefs.notifyAfterSale && prefs.notify"
          :disabled="!prefs.notify"
          color="#FF4D2D"
          @click.stop="prefs.notify && toggleNotify('notifyAfterSale')"
        />
      </view>
      <view
        class="row"
        :class="{ 'row-disabled': !prefs.notify }"
        @click="prefs.notify && toggleNotify('notifyChat')"
      >
        <view class="row-info">
          <text class="row-label">客服消息</text>
          <text class="row-sub">客户咨询时声音提示</text>
        </view>
        <switch
          :checked="prefs.notifyChat && prefs.notify"
          :disabled="!prefs.notify"
          color="#FF4D2D"
          @click.stop="prefs.notify && toggleNotify('notifyChat')"
        />
      </view>
    </view>

    <view class="card">
      <view class="card-title">账号安全</view>
      <view class="row" @click="openPasswordSheet">
        <view class="row-info">
          <text class="row-label">登录密码</text>
          <text class="row-sub">修改账号登录密码</text>
        </view>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
      <view class="row" @click="openPhoneChangeSheet">
        <view class="row-info">
          <text class="row-label">{{ currentPhone ? '更换手机号' : '绑定手机号' }}</text>
          <text class="row-sub">{{ currentPhone || '未绑定' }}</text>
        </view>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="card">
      <view class="card-title">外观与语言</view>
      <view class="row" @click="toggleDark">
        <view class="row-info">
          <text class="row-label">夜间模式</text>
          <text class="row-sub">深色背景护眼</text>
        </view>
        <switch :checked="prefs.darkMode" color="#FF4D2D" @click.stop="toggleDark" />
      </view>
      <view class="row" @click="chooseLanguage">
        <view class="row-info">
          <text class="row-label">语言</text>
          <text class="row-sub">{{ prefs.language === 'zh-CN' ? '简体中文' : 'English' }}</text>
        </view>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="card">
      <view class="card-title">存储</view>
      <view class="row" @click="clearCache">
        <view class="row-info">
          <text class="row-label">清除缓存</text>
          <text class="row-sub">当前占用 {{ cacheSize }}</text>
        </view>
        <Icon name="trash" :size="28" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="card">
      <view class="card-title">关于</view>
      <view class="row" @click="goAgreement">
        <view class="row-info">
          <text class="row-label">用户协议 · 隐私政策</text>
          <text class="row-sub">查看完整法律文本</text>
        </view>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
      <view class="row" @click="goAbout">
        <view class="row-info">
          <text class="row-label">关于我们</text>
          <text class="row-sub">v0.1.0</text>
        </view>
        <Icon name="forward" :size="24" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="safe-bottom" />

    <AccountSecurity
      :open="securityOpen"
      :mode="securityMode"
      :current-phone="currentPhone"
      @close="securityOpen = false"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page, #f7f8fa);
  padding-bottom: 40rpx;
}
.card {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.card-title {
  padding: 24rpx 28rpx 12rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #86909c;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-top: 1rpx solid #f0f2f5;
  &:first-of-type {
    border-top: none;
  }
  &:active {
    background: #fafbfc;
  }
}
.row-disabled {
  opacity: 0.6;
  &:active {
    background: transparent;
  }
}
.row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.row-label {
  font-size: 28rpx;
  color: #1d2129;
}
.row-sub {
  font-size: 22rpx;
  color: #86909c;
}
.safe-bottom {
  height: 60rpx;
}
</style>
