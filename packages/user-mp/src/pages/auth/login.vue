<script setup lang="ts">
/**
 * 用户端 · 登录注册页（v4 · 重构美化）
 *
 * 结构：
 *   全屏暖色径向背景 → 顶部品牌区 → 权益胶囊 → 底部白色 sheet（登录卡）
 *
 * 设计要点：
 *   - 不使用任何 emoji，全部图标走 <Icon /> 组件（data-URI SVG，全端稳定）
 *   - 登录方式：微信一键登录（主） + 手机号验证码（次）
 *   - 协议勾选 + 默认未勾选，强制提示用户阅读
 *   - 双层背景光晕 + sheet 圆角弧线，遵循 iOS 18 / Material 3 视觉风格
 */
import { ref, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services'
import Icon from '../../components/icon/icon.vue'
import AgreementSheet from '../../components/agreement-sheet/agreement-sheet.vue'

const userStore = useUserStore()

const mode = ref<'entry' | 'phone'>('entry')
const phone = ref('')
const code = ref('')
const agreed = ref(false)
const sending = ref(false)
const countdown = ref(0)
const loading = ref(false)

const canSubmitPhone = computed(
  () => /^1[3-9]\d{9}$/.test(phone.value) && /^\d{4,6}$/.test(code.value),
)

const BENEFITS = [
  { icon: 'tag', label: '会员价' },
  { icon: 'heart', label: '收藏夹' },
  { icon: 'package', label: '订单' },
  { icon: 'help', label: '售后' },
]

function back() {
  uni.reLaunch({ url: '/pages/tabbar/home/index' })
}

function ensureAgreed(): boolean {
  if (!agreed.value) {
    uni.showToast({ title: '请先勾选用户协议', icon: 'none' })
    return false
  }
  return true
}

async function wechatLogin() {
  if (!ensureAgreed()) return
  loading.value = true
  try {
    const wxCode = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (r) => (r.code ? resolve(r.code) : reject(new Error('未获取到微信 code'))),
        fail: (err) => reject(new Error(err?.errMsg || '微信授权失败')),
      })
    })
    const session = await authService.wechatLogin({ code: wxCode })
    userStore.setSession(session)
    uni.showToast({ title: '欢迎回来', icon: 'success' })
    setTimeout(back, 600)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function phoneLogin() {
  if (!ensureAgreed()) return
  if (!canSubmitPhone.value) {
    uni.showToast({ title: '请填写完整手机号与验证码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const session = await authService.phoneLogin({ phone: phone.value, code: code.value })
    userStore.setSession(session)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(back, 600)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  if (sending.value || countdown.value > 0) return
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请先输入正确手机号', icon: 'none' })
    return
  }
  sending.value = true
  try {
    await authService.sendSmsCode(phone.value)
    uni.showToast({ title: '验证码已发送', icon: 'none' })
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

type LegalKind = 'user' | 'privacy' | 'collect'
const agreementOpen = ref(false)
const agreementKind = ref<LegalKind>('user')
function openAgreement(type: LegalKind) {
  agreementKind.value = type
  agreementOpen.value = true
}

function asGuest() {
  uni.reLaunch({ url: '/pages/tabbar/home/index' })
}
</script>

<template>
  <view class="page">
    <!-- 背景渐变 + 双层光晕 -->
    <view class="bg-base" />
    <view class="bg-glow bg-glow-1" />
    <view class="bg-glow bg-glow-2" />
    <view class="bg-grid" />

    <!-- 顶部 close + 跳过 -->
    <view class="top-bar">
      <view class="top-close" @click="asGuest">
        <Icon name="close" :size="36" color="#fff" />
      </view>
      <view class="top-skip" @click="asGuest">
        <text>跳过</text>
        <Icon name="chevron-right" :size="24" color="rgba(255,255,255,0.85)" />
      </view>
    </view>

    <!-- 品牌头 -->
    <view class="brand">
      <view class="logo-shell">
        <view class="logo-inner">
          <text class="logo-mark">经纬</text>
        </view>
        <view class="logo-glow" />
      </view>
      <text class="brand-name">经纬科技</text>
      <text class="brand-slogan">家居 · 建材 · 定制 一站式选品</text>
    </view>

    <!-- 权益横栏 -->
    <view class="benefits">
      <view v-for="b in BENEFITS" :key="b.icon" class="benefit">
        <view class="benefit-icon">
          <Icon :name="b.icon" :size="36" color="#fff" />
        </view>
        <text class="benefit-label">{{ b.label }}</text>
      </view>
    </view>

    <!-- 底部白卡 -->
    <view class="sheet">
      <view class="sheet-handle" />

      <!-- Entry 模式 -->
      <view v-if="mode === 'entry'" class="entry">
        <view class="welcome">
          <text class="welcome-title">登录解锁专属权益</text>
          <text class="welcome-sub">微信一键授权 · 安全免输入</text>
        </view>

        <view :class="['btn-primary', 'btn-wechat', loading && 'is-loading']" @click="wechatLogin">
          <view class="btn-icon">
            <Icon name="wechat" :size="42" color="#fff" />
          </view>
          <text class="btn-text">{{ loading ? '登录中…' : '微信一键登录' }}</text>
        </view>

        <view class="divider">
          <view class="line" />
          <text class="or">其他登录方式</text>
          <view class="line" />
        </view>

        <view class="btn-secondary" @click="mode = 'phone'">
          <Icon name="phone" :size="32" color="#1d2129" />
          <text>手机号登录 / 注册</text>
        </view>
      </view>

      <!-- Phone 模式 -->
      <view v-else class="phone-mode">
        <view class="back-row" @click="mode = 'entry'">
          <Icon name="chevron-left" :size="32" color="#86909c" />
          <text>其他登录方式</text>
        </view>

        <text class="phone-title">手机号登录</text>
        <text class="phone-sub">未注册手机号将自动创建账号</text>

        <view class="field">
          <text class="prefix">+86</text>
          <view class="divider-v" />
          <input
            v-model="phone"
            class="input"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-class="ph"
          />
        </view>

        <view class="field code-field">
          <input
            v-model="code"
            class="input"
            type="number"
            maxlength="6"
            placeholder="短信验证码"
            placeholder-class="ph"
          />
          <view
            :class="['code-btn', (countdown > 0 || sending) && 'disabled']"
            @click="sendCode"
          >
            {{
              countdown > 0
                ? `${countdown}s 后重发`
                : sending
                ? '发送中…'
                : '获取验证码'
            }}
          </view>
        </view>

        <view
          :class="['btn-primary', 'btn-submit', !canSubmitPhone && 'disabled', loading && 'is-loading']"
          @click="phoneLogin"
        >
          <text>{{ loading ? '登录中…' : '登录 / 注册' }}</text>
        </view>
      </view>

      <!-- 协议（共用） -->
      <view class="agree-row">
        <view :class="['check', agreed && 'on']" @click="agreed = !agreed">
          <Icon v-if="agreed" name="check" :size="20" color="#fff" />
        </view>
        <text class="agree-text">
          已阅读并同意
          <text class="hl" @click="openAgreement('user')">《用户协议》</text>
          、
          <text class="hl" @click="openAgreement('privacy')">《隐私政策》</text>
          及
          <text class="hl" @click="openAgreement('collect')">《信息收集清单》</text>
        </text>
      </view>
    </view>

    <AgreementSheet :open="agreementOpen" :type="agreementKind" @close="agreementOpen = false" />
  </view>
</template>

<style scoped lang="scss">
.page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 0 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* ===== 背景层 ===== */
.bg-base {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(120% 80% at 50% 0%, #ffb98c 0%, #ff7a4e 35%, #ff4d2d 70%, #d43014 100%);
}
.bg-glow {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  opacity: 0.7;
  pointer-events: none;
}
.bg-glow-1 {
  width: 700rpx;
  height: 700rpx;
  top: -240rpx;
  right: -260rpx;
  background: radial-gradient(circle, rgba(255, 220, 180, 0.7) 0%, rgba(255, 220, 180, 0) 70%);
}
.bg-glow-2 {
  width: 560rpx;
  height: 560rpx;
  bottom: 520rpx;
  left: -180rpx;
  background: radial-gradient(circle, rgba(255, 200, 150, 0.45) 0%, rgba(255, 200, 150, 0) 70%);
}
.bg-grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1rpx, transparent 1rpx),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1rpx, transparent 1rpx);
  background-size: 64rpx 64rpx;
  mask-image: radial-gradient(circle at 50% 30%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(circle at 50% 30%, #000 30%, transparent 75%);
}

/* ===== 顶部 ===== */
.top-bar {
  position: relative;
  z-index: 2;
  padding-top: 80rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.top-close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  &:active {
    background: rgba(255, 255, 255, 0.28);
  }
}
.top-skip {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  letter-spacing: 1rpx;
  &:active {
    background: rgba(255, 255, 255, 0.28);
  }
}

/* ===== 品牌 ===== */
.brand {
  position: relative;
  z-index: 2;
  text-align: center;
  margin-top: 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.logo-shell {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-inner {
  position: relative;
  z-index: 2;
  width: 140rpx;
  height: 140rpx;
  border-radius: 44rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 16rpx 48rpx rgba(180, 50, 20, 0.45),
    inset 0 -8rpx 24rpx rgba(255, 122, 78, 0.15);
}
.logo-mark {
  font-size: 46rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
  color: #ff4d2d;
  background: linear-gradient(135deg, #ff7a4e 0%, #ff4d2d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.logo-glow {
  position: absolute;
  inset: -8rpx;
  z-index: 1;
  border-radius: 56rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.4);
}
.brand-name {
  margin-top: 28rpx;
  font-size: 48rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 4rpx;
  text-shadow: 0 4rpx 16rpx rgba(160, 40, 20, 0.4);
}
.brand-slogan {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 2rpx;
}

/* ===== 权益栏 ===== */
.benefits {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-around;
  margin-top: 56rpx;
  padding: 0 16rpx;
}
.benefit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}
.benefit-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: 2rpx solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(160, 40, 20, 0.18);
}
.benefit-label {
  font-size: 22rpx;
  color: #fff;
  opacity: 0.92;
  font-weight: 500;
}

/* ===== 底部白卡 ===== */
.sheet {
  position: relative;
  z-index: 2;
  margin-top: auto;
  margin-left: -32rpx;
  margin-right: -32rpx;
  background: #fff;
  border-radius: 56rpx 56rpx 0 0;
  padding: 24rpx 48rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -20rpx 60rpx rgba(0, 0, 0, 0.08);
}
.sheet-handle {
  margin: 0 auto 24rpx;
  width: 80rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #ececec;
}

/* ===== Entry 模式 ===== */
.entry {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.welcome {
  text-align: center;
  margin-bottom: 4rpx;
  .welcome-title {
    display: block;
    font-size: 38rpx;
    font-weight: 800;
    color: #1d2129;
    letter-spacing: 2rpx;
  }
  .welcome-sub {
    display: block;
    margin-top: 10rpx;
    font-size: 24rpx;
    color: #86909c;
    letter-spacing: 1rpx;
  }
}
.btn-primary {
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  color: #fff;
  &:active {
    transform: scale(0.98);
  }
  transition: transform 0.15s ease;
}
.btn-wechat {
  background: linear-gradient(135deg, #09d365 0%, #06ad55 100%);
  box-shadow:
    0 14rpx 32rpx rgba(7, 193, 96, 0.36),
    inset 0 -4rpx 12rpx rgba(0, 0, 0, 0.12);
  &.is-loading {
    opacity: 0.7;
  }
}
.btn-icon {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-text {
  letter-spacing: 4rpx;
}
.divider {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 8rpx 0;
  .line {
    flex: 1;
    height: 1rpx;
    background: linear-gradient(to right, transparent, #e5e6eb, transparent);
  }
  .or {
    font-size: 22rpx;
    color: #c9cdd4;
    font-weight: 500;
  }
}
.btn-secondary {
  height: 100rpx;
  border-radius: 28rpx;
  background: #f7f8fa;
  color: #1d2129;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  border: 2rpx solid #efefef;
  letter-spacing: 2rpx;
  &:active {
    background: #efeff2;
    transform: scale(0.98);
  }
  transition: transform 0.15s ease;
}

/* ===== Phone 模式 ===== */
.phone-mode {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.back-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #86909c;
  margin-bottom: 8rpx;
  padding: 8rpx 0;
  &:active {
    color: #4e5969;
  }
}
.phone-title {
  font-size: 44rpx;
  font-weight: 800;
  color: #1d2129;
  letter-spacing: 2rpx;
}
.phone-sub {
  font-size: 24rpx;
  color: #86909c;
  letter-spacing: 1rpx;
}
.field {
  display: flex;
  align-items: center;
  height: 100rpx;
  padding: 0 28rpx;
  background: #f7f8fa;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  &:focus-within {
    border-color: rgba(255, 77, 45, 0.45);
    background: #fff;
    box-shadow: 0 0 0 6rpx rgba(255, 77, 45, 0.08);
  }
  .prefix {
    font-size: 30rpx;
    color: #1d2129;
    font-weight: 600;
  }
  .divider-v {
    width: 2rpx;
    height: 36rpx;
    background: #e5e5e5;
    margin: 0 20rpx;
  }
  .input {
    flex: 1;
    height: 100%;
    font-size: 30rpx;
    color: #1d2129;
  }
  .ph {
    color: #c9cdd4;
  }
}
.code-field {
  position: relative;
}
.code-btn {
  margin-left: 12rpx;
  padding: 14rpx 22rpx;
  background: #fff1ed;
  color: #ff4d2d;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
  &.disabled {
    background: #f0f0f0;
    color: #86909c;
  }
  &:active {
    transform: scale(0.96);
  }
}
.btn-submit {
  margin-top: 16rpx;
  background: linear-gradient(135deg, #ff7a4e 0%, #ff4d2d 60%, #e6411f 100%);
  box-shadow:
    0 14rpx 32rpx rgba(255, 77, 45, 0.38),
    inset 0 -4rpx 12rpx rgba(0, 0, 0, 0.1);
  &.disabled {
    opacity: 0.45;
    box-shadow: none;
  }
  &.is-loading {
    opacity: 0.7;
  }
}

/* ===== 协议 ===== */
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-top: 36rpx;
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
  margin-top: 2rpx;
  &.on {
    background: #ff4d2d;
    border-color: #ff4d2d;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.35);
  }
  transition: all 0.18s ease;
}
.agree-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: #86909c;
  .hl {
    color: #ff4d2d;
    font-weight: 600;
  }
}
</style>
