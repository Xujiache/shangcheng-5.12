<script setup lang="ts">
/**
 * 商家端 · 登录页
 *
 * 双 Tab：账号密码（B 端首选）/ 手机短信（自动注册）
 * 设计：暖色渐变顶图 + 白色卡片
 */
import { ref, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services/auth'
import Icon from '../../components/icon/icon.vue'
import AgreementSheet from '../../components/agreement-sheet/agreement-sheet.vue'

type LegalKind = 'user' | 'privacy' | 'collect'
const agreementOpen = ref(false)
const agreementKind = ref<LegalKind>('user')
function openAgreement(type: LegalKind) {
  agreementKind.value = type
  agreementOpen.value = true
}

const userStore = useUserStore()

const mode = ref<'account' | 'phone'>('account')

// 账号密码
const username = ref('')
const password = ref('')
const showPwd = ref(false)

// 手机号
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const sending = ref(false)

const loading = ref(false)
const agreed = ref(true)

const canSubmit = computed(() => {
  if (mode.value === 'account') return username.value.trim().length >= 3 && password.value.length >= 6
  return /^1[3-9]\d{9}$/.test(phone.value) && /^\d{4,6}$/.test(smsCode.value)
})

async function onLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  if (!canSubmit.value) {
    uni.showToast({ title: mode.value === 'account' ? '账号或密码格式有误' : '手机号 / 验证码格式有误', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const session = mode.value === 'account'
      ? await authService.adminLogin({ username: username.value.trim(), password: password.value })
      : await authService.phoneLogin({ phone: phone.value, code: smsCode.value })

    userStore.setSession(session as any)

    const role = (session as any).user?.role
    if (role === 'factory' || role === 'store' || role === 'super-admin') {
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => uni.reLaunch({ url: '/pages/tabbar/home/index' }), 500)
    } else {
      uni.showModal({
        title: '欢迎使用经纬科技商家版',
        content: '当前账号尚未入驻为商家，是否前往申请入驻？',
        confirmText: '去申请',
        cancelText: '取消',
        success: (r) => {
          if (r.confirm) uni.navigateTo({ url: '/pages/auth/apply' })
          else userStore.logout()
        },
      })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onSendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  sending.value = true
  try {
    await authService.sendSmsCode(phone.value)
    uni.showToast({ title: '验证码已发送，请注意查收', icon: 'none' })
    countdown.value = 60
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(t)
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function goApply() {
  uni.navigateTo({ url: '/pages/auth/apply' })
}
</script>

<template>
  <view class="page">
    <!-- 顶部品牌区 -->
    <view class="hero">
      <view class="blob blob-1" />
      <view class="blob blob-2" />
      <view class="brand">
        <view class="logo-wrap">
          <text class="logo">经纬科技</text>
        </view>
        <view class="title-wrap">
          <text class="title">商家管理</text>
          <text class="subtitle">家居建材厂家 · 门店一体化经营</text>
        </view>
      </view>
    </view>

    <!-- 登录卡片 -->
    <view class="card">
      <view class="tabs">
        <view :class="['tab', mode === 'account' && 'active']" @click="mode = 'account'">
          <text>账号登录</text>
          <view class="dot" v-if="mode === 'account'" />
        </view>
        <view :class="['tab', mode === 'phone' && 'active']" @click="mode = 'phone'">
          <text>短信登录</text>
          <view class="dot" v-if="mode === 'phone'" />
        </view>
      </view>

      <!-- 账号密码 -->
      <view v-if="mode === 'account'" class="form">
        <view class="field">
          <text class="prefix">@</text>
          <input v-model="username" class="input" placeholder="邮箱 / 用户名" />
        </view>
        <view class="field">
          <text class="prefix">密</text>
          <input
            v-model="password"
            class="input"
            :password="!showPwd"
            placeholder="6 位以上密码"
          />
          <text class="suffix" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
        </view>
      </view>

      <!-- 手机短信 -->
      <view v-else class="form">
        <view class="field">
          <text class="prefix">+86</text>
          <input v-model="phone" class="input" type="number" maxlength="11" placeholder="手机号" />
        </view>
        <view class="field">
          <text class="prefix">码</text>
          <input v-model="smsCode" class="input" type="number" maxlength="6" placeholder="短信验证码" />
          <text
            :class="['code-btn', (countdown > 0 || sending) && 'disabled']"
            @click="onSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码' }}
          </text>
        </view>
      </view>

      <!-- 协议 -->
      <view class="agree-row" @click="agreed = !agreed">
        <view :class="['check', agreed && 'on']">
          <Icon v-if="agreed" name="check" :size="20" color="#fff" />
        </view>
        <text class="agree-text">
          已阅读并同意
          <text class="hl" @click.stop="openAgreement('user')">《商家入驻协议》</text>
          、
          <text class="hl" @click.stop="openAgreement('privacy')">《隐私政策》</text>
          及
          <text class="hl" @click.stop="openAgreement('collect')">《信息收集清单》</text>
        </text>
      </view>

      <!-- 提交 -->
      <button
        class="submit"
        :class="{ disabled: !canSubmit || loading }"
        :disabled="!canSubmit || loading"
        @click="onLogin"
      >
        <text v-if="loading">登录中…</text>
        <text v-else>登 录</text>
      </button>

      <!-- 入驻链接 -->
      <view class="apply-row">
        <text class="apply-text">还未入驻？</text>
        <text class="apply-link" @click="goApply">立即申请成为商家 ›</text>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <view class="footer-row">
        <text class="meta">© 2026 经纬科技</text>
        <text class="dot-divider">·</text>
        <text class="meta">商家版 v0.1.0</text>
      </view>
    </view>

    <AgreementSheet :open="agreementOpen" :type="agreementKind" @close="agreementOpen = false" />
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F7F8FA;
  padding-bottom: 40rpx;
  box-sizing: border-box;
  position: relative;
}

/* ===== 顶部品牌区 ===== */
.hero {
  position: relative;
  height: 400rpx;
  background: linear-gradient(135deg, #FF6B45 0%, #FF4D2D 45%, #FF3B1F 100%);
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  overflow: hidden;
  padding: 100rpx 40rpx 0;
  box-sizing: border-box;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60rpx);
  opacity: 0.5;
  &.blob-1 {
    width: 320rpx;
    height: 320rpx;
    background: #FFB199;
    top: -80rpx;
    right: -80rpx;
  }
  &.blob-2 {
    width: 240rpx;
    height: 240rpx;
    background: #FFD89B;
    bottom: -60rpx;
    left: -60rpx;
  }
}
.brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.logo-wrap {
  width: 128rpx;
  height: 128rpx;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8rpx);
  border-radius: 32rpx;
  border: 2rpx solid rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15);
}
.logo {
  font-size: 48rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2rpx;
}
.title-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.title {
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
}
.subtitle {
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
}

/* ===== 登录卡片 ===== */
.card {
  margin: -64rpx 32rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx 32rpx 40rpx;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.08);
  position: relative;
  z-index: 2;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8rpx;
  margin-bottom: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 16rpx 20rpx;
  font-size: 30rpx;
  color: #86909c;
  position: relative;
  transition: color 0.2s;
  &.active {
    color: #FF4D2D;
    font-weight: 700;
  }
  .dot {
    position: absolute;
    bottom: -2rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 64rpx;
    height: 6rpx;
    background: linear-gradient(90deg, #FF6B45, #FF4D2D);
    border-radius: 3rpx;
  }
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.field {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  background: #F7F8FA;
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  transition: all 0.2s;
  .prefix {
    width: 40rpx;
    text-align: center;
    font-size: 28rpx;
    margin-right: 12rpx;
    color: #86909c;
  }
  .input {
    flex: 1;
    height: 100%;
    font-size: 30rpx;
    color: #1d2129;
  }
  .suffix {
    margin-left: 12rpx;
    font-size: 32rpx;
    color: #86909c;
    padding: 0 8rpx;
  }
  .code-btn {
    margin-left: 12rpx;
    padding: 12rpx 20rpx;
    background: #fff1ed;
    color: #FF4D2D;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    border-left: 1rpx solid #ffe2d6;
    &.disabled {
      background: #f0f0f0;
      color: #86909c;
    }
  }
}

/* 协议 */
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin: 28rpx 0 24rpx;
}
.check {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #c9cdd4;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &.on {
    background: #FF4D2D;
    border-color: #FF4D2D;
  }
}
.agree-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.5;
  color: #86909c;
  .hl { color: #FF4D2D; }
}

/* 提交 */
.submit {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #FF6B45 0%, #FF4D2D 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  border-radius: 16rpx;
  border: none;
  box-shadow: 0 12rpx 24rpx rgba(255,77,45,0.35);
  text-align: center;
  &.disabled, &[disabled] {
    opacity: 0.5;
    box-shadow: none;
  }
  &::after { border: none; }
}

/* 入驻链接 */
.apply-row {
  margin-top: 28rpx;
  text-align: center;
  font-size: 26rpx;
}
.apply-text { color: #86909c; }
.apply-link {
  color: #FF4D2D;
  font-weight: 600;
  margin-left: 8rpx;
}

/* 底部 */
.footer {
  margin-top: 80rpx;
  padding: 0 32rpx;
}
.footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.meta {
  font-size: 22rpx;
  color: #c9cdd4;
}
.dot-divider {
  font-size: 22rpx;
  color: #c9cdd4;
}
</style>
