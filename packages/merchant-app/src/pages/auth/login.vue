<script setup lang="ts">
/**
 * 商家端 · 登录页（v2 · 重构美化）
 *
 * 结构：暖色渐变 Hero（双层光晕 + 品牌徽标） → 关键价值胶囊 →
 *      白色登录卡（Tab + 图标输入 + 协议 + 渐变主按钮） → 入驻引导 → 页脚
 *
 * 视觉：
 *   - 所有字段前缀使用 <Icon /> SVG 图标（line 风格），与三端统一
 *   - 密码可见性切换走 eye / eye-off 图标
 *   - 主色 #FF4D2D（暖橙），与商家端品牌一致
 */
import { ref, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services/auth'
import { useStatusBar } from '../../composables/useStatusBar'
import Icon from '../../components/icon/icon.vue'
import AgreementSheet from '../../components/agreement-sheet/agreement-sheet.vue'

const { heroPaddingTop } = useStatusBar(40)

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
    <!-- Hero · 暖色渐变 + 双层光晕 -->
    <view class="hero" :style="{ paddingTop: heroPaddingTop }">
      <view class="blob blob-1" />
      <view class="blob blob-2" />
      <view class="blob blob-3" />

      <view class="brand">
        <view class="logo-mark">
          <view class="logo-inner">
            <text class="logo-letter">经</text>
          </view>
        </view>
        <view class="brand-text">
          <text class="brand-name">经纬科技</text>
          <text class="brand-tag">商家工作台</text>
        </view>
      </view>

      <view class="lead-text">
        <text class="lead-title">让家居建材生意更轻松</text>
        <text class="lead-sub">厂家直供 · 门店一体 · 数据闭环</text>
      </view>

      <view class="pills">
        <view class="pill">
          <Icon name="biz-store" :size="22" color="#fff" />
          <text class="pill-text">厂家直供</text>
        </view>
        <view class="pill">
          <Icon name="biz-staff" :size="22" color="#fff" />
          <text class="pill-text">多角色协作</text>
        </view>
        <view class="pill">
          <Icon name="biz-stats" :size="22" color="#fff" />
          <text class="pill-text">实时经营</text>
        </view>
      </view>
    </view>

    <!-- 登录卡片 -->
    <view class="card">
      <!-- Tabs -->
      <view class="tabs">
        <view :class="['tab', mode === 'account' && 'active']" @click="mode = 'account'">
          <text class="tab-label">账号登录</text>
          <view class="tab-underline" v-if="mode === 'account'" />
        </view>
        <view :class="['tab', mode === 'phone' && 'active']" @click="mode = 'phone'">
          <text class="tab-label">短信登录</text>
          <view class="tab-underline" v-if="mode === 'phone'" />
        </view>
      </view>

      <!-- 账号密码 -->
      <view v-if="mode === 'account'" class="form">
        <view class="field">
          <view class="prefix">
            <Icon name="biz-me" :size="32" color="#86909c" />
          </view>
          <input v-model="username" class="input" placeholder="邮箱 / 用户名" placeholder-class="ph" />
        </view>
        <view class="field">
          <view class="prefix">
            <Icon name="lock" :size="32" color="#86909c" />
          </view>
          <input
            v-model="password"
            class="input"
            :password="!showPwd"
            placeholder="6 位以上密码"
            placeholder-class="ph"
          />
          <view class="suffix" @click="showPwd = !showPwd">
            <Icon :name="showPwd ? 'eye' : 'eye-off'" :size="32" color="#86909c" />
          </view>
        </view>
      </view>

      <!-- 手机短信 -->
      <view v-else class="form">
        <view class="field">
          <view class="prefix">
            <Icon name="phone" :size="32" color="#86909c" />
          </view>
          <input v-model="phone" class="input" type="number" maxlength="11" placeholder="手机号" placeholder-class="ph" />
        </view>
        <view class="field">
          <view class="prefix">
            <Icon name="biz-receipt" :size="32" color="#86909c" />
          </view>
          <input v-model="smsCode" class="input" type="number" maxlength="6" placeholder="短信验证码" placeholder-class="ph" />
          <view
            :class="['code-btn', (countdown > 0 || sending) && 'disabled']"
            @click="onSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码' }}
          </view>
        </view>
      </view>

      <!-- 协议 -->
      <view class="agree-row">
        <view :class="['check', agreed && 'on']" @click="agreed = !agreed">
          <Icon v-if="agreed" name="check" :size="20" color="#fff" />
        </view>
        <text class="agree-text">
          已阅读并同意
          <text class="hl" @click="openAgreement('user')">《商家入驻协议》</text>、
          <text class="hl" @click="openAgreement('privacy')">《隐私政策》</text>及
          <text class="hl" @click="openAgreement('collect')">《信息收集清单》</text>
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

      <!-- 分割 -->
      <view class="divider">
        <view class="line" />
        <text class="dtext">还未成为商家？</text>
        <view class="line" />
      </view>

      <!-- 入驻引导 -->
      <view class="apply-banner" @click="goApply">
        <view class="apply-left">
          <view class="apply-icon">
            <Icon name="biz-shop-decorate" :size="36" color="#FF4D2D" />
          </view>
          <view class="apply-info">
            <text class="apply-title">立即申请入驻</text>
            <text class="apply-sub">最快 1 个工作日审核</text>
          </view>
        </view>
        <Icon name="forward" :size="28" color="#FF4D2D" />
      </view>
    </view>

    <!-- 页脚 -->
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
  padding-bottom: 48rpx;
  box-sizing: border-box;
  position: relative;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  /* padding-top 由内联样式 heroPaddingTop 注入（状态栏 + 40rpx） */
  padding: 0 40rpx 120rpx;
  background:
    radial-gradient(140% 80% at 100% 0%, #FF8A5E 0%, transparent 60%),
    radial-gradient(120% 80% at 0% 100%, #FF3B1F 0%, transparent 50%),
    linear-gradient(160deg, #FF6B45 0%, #FF4D2D 50%, #E63A1F 100%);
  border-bottom-left-radius: 56rpx;
  border-bottom-right-radius: 56rpx;
  overflow: hidden;
  box-sizing: border-box;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(72rpx);
  opacity: 0.55;
  pointer-events: none;
}
.blob-1 {
  width: 360rpx; height: 360rpx;
  background: #FFD3A8;
  top: -100rpx; right: -100rpx;
}
.blob-2 {
  width: 260rpx; height: 260rpx;
  background: #FFE7B0;
  top: 280rpx; left: -80rpx;
}
.blob-3 {
  width: 200rpx; height: 200rpx;
  background: #FFAA82;
  bottom: -60rpx; right: 30%;
  opacity: 0.4;
}

.brand {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.logo-mark {
  width: 108rpx;
  height: 108rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.14) 100%);
  border: 2rpx solid rgba(255,255,255,0.4);
  padding: 6rpx;
  box-shadow: 0 12rpx 32rpx rgba(0,0,0,0.18);
  box-sizing: border-box;
}
.logo-inner {
  width: 100%;
  height: 100%;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #fff 0%, #FFE6DC 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-letter {
  font-size: 52rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #FF6B45, #E63A1F);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 2rpx;
}
.brand-text {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.brand-name {
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
}
.brand-tag {
  font-size: 24rpx;
  color: rgba(255,255,255,0.88);
  letter-spacing: 1rpx;
}

.lead-text {
  position: relative;
  z-index: 2;
  margin-top: 56rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.lead-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
}
.lead-sub {
  font-size: 24rpx;
  color: rgba(255,255,255,0.82);
  letter-spacing: 1rpx;
}

.pills {
  position: relative;
  z-index: 2;
  margin-top: 36rpx;
  display: flex;
  gap: 16rpx;
}
.pill {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 0 16rpx;
  background: rgba(255,255,255,0.18);
  border: 2rpx solid rgba(255,255,255,0.28);
  border-radius: 999rpx;
  box-sizing: border-box;
}
.pill-text {
  font-size: 22rpx;
  color: #fff;
  letter-spacing: 1rpx;
}

/* ===== 登录卡 ===== */
.card {
  margin: -80rpx 28rpx 0;
  background: #fff;
  border-radius: 36rpx;
  padding: 8rpx 32rpx 36rpx;
  box-shadow: 0 24rpx 60rpx rgba(255,90,40,0.15), 0 8rpx 24rpx rgba(0,0,0,0.06);
  position: relative;
  z-index: 3;
}

.tabs {
  display: flex;
  margin-bottom: 28rpx;
  position: relative;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 32rpx 16rpx 24rpx;
  font-size: 30rpx;
  color: #86909c;
  position: relative;
  transition: color 0.2s;
}
.tab.active {
  color: #1d2129;
  font-weight: 700;
}
.tab-label {
  position: relative;
  z-index: 1;
}
.tab-underline {
  position: absolute;
  bottom: 14rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 56rpx;
  height: 6rpx;
  background: linear-gradient(90deg, #FF6B45, #FF4D2D);
  border-radius: 3rpx;
  box-shadow: 0 4rpx 8rpx rgba(255,77,45,0.4);
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
  height: 104rpx;
  padding: 0 24rpx;
  background: #F7F8FA;
  border: 2rpx solid #F0F1F4;
  border-radius: 20rpx;
  transition: border-color 0.2s, background 0.2s;
}
.field:focus-within,
.field:active {
  border-color: #FFB199;
  background: #fff;
}
.prefix {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: #1d2129;
}
.ph {
  color: #c9cdd4;
  font-size: 28rpx;
}
.suffix {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
}
.code-btn {
  margin-left: 12rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #FFF1ED, #FFE2D6);
  color: #FF4D2D;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  white-space: nowrap;
}
.code-btn.disabled {
  background: #F2F3F5;
  color: #C9CDD4;
}

/* 协议 */
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin: 32rpx 0 28rpx;
}
.check {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #C9CDD4;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  transition: all 0.2s;
}
.check.on {
  background: #FF4D2D;
  border-color: #FF4D2D;
}
.agree-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: #86909c;
}
.agree-text .hl {
  color: #FF4D2D;
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
  letter-spacing: 10rpx;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 16rpx 32rpx rgba(255,77,45,0.36);
  text-align: center;
}
.submit::after { border: none; }
.submit.disabled,
.submit[disabled] {
  opacity: 0.5;
  box-shadow: none;
  background: linear-gradient(135deg, #FFB199, #FF8A6A);
}

/* 分割 */
.divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 36rpx 0 20rpx;
}
.divider .line {
  flex: 1;
  height: 2rpx;
  background: #F0F1F4;
}
.dtext {
  font-size: 22rpx;
  color: #C9CDD4;
  letter-spacing: 1rpx;
}

/* 入驻引导卡片 */
.apply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #FFF6F1 0%, #FFE9DC 100%);
  border: 2rpx solid #FFE0CD;
  border-radius: 20rpx;
}
.apply-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.apply-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255,77,45,0.12);
}
.apply-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.apply-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1d2129;
}
.apply-sub {
  font-size: 22rpx;
  color: #86909c;
}

/* 底部 */
.footer {
  margin-top: 64rpx;
  padding: 0 32rpx;
}
.footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.meta {
  font-size: 22rpx;
  color: #C9CDD4;
  letter-spacing: 1rpx;
}
.dot-divider {
  font-size: 22rpx;
  color: #C9CDD4;
}
</style>
