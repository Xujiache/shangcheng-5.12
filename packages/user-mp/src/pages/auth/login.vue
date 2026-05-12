<script setup lang="ts">
/**
 * 用户端 · 登录注册页（重构版）
 *
 * - 全屏沉浸式，暖色系渐变 + 弧形白卡片
 * - 主入口：微信一键登录（任何场景）
 * - 次入口：手机号 + 短信验证码（自动注册）
 * - 兜底：游客继续浏览
 */
import { ref, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services'

const userStore = useUserStore()

const mode = ref<'entry' | 'phone'>('entry')
const phone = ref('')
const code = ref('')
const agreed = ref(false)
const sending = ref(false)
const countdown = ref(0)
const loading = ref(false)

const canSubmitPhone = computed(() =>
  /^1[3-9]\d{9}$/.test(phone.value) && /^\d{4,6}$/.test(code.value),
)

function close() {
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
    const session = await authService.wechatLogin({})
    userStore.setSession(session)
    uni.showToast({ title: '欢迎回来', icon: 'success' })
    setTimeout(close, 600)
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
    setTimeout(close, 600)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请先输入正确手机号', icon: 'none' })
    return
  }
  sending.value = true
  try {
    await authService.sendSmsCode(phone.value)
    uni.showToast({ title: '验证码已发送（dev: 0000）', icon: 'none' })
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

function goAgreement(type: 'user' | 'privacy') {
  uni.showToast({ title: type === 'user' ? '《用户协议》' : '《隐私政策》', icon: 'none' })
}

function asGuest() {
  uni.reLaunch({ url: '/pages/tabbar/home/index' })
}
</script>

<template>
  <view class="page">
    <!-- 装饰背景 -->
    <view class="bg">
      <view class="blob blob-1" />
      <view class="blob blob-2" />
      <view class="blob blob-3" />
    </view>

    <!-- 顶部品牌 -->
    <view class="brand">
      <view class="logo-circle">
        <text class="logo-text">经纬科技</text>
      </view>
      <text class="brand-title">经纬科技</text>
      <text class="brand-slogan">家居·建材·定制 一站式选品</text>
    </view>

    <!-- 底部卡片 -->
    <view class="sheet">
      <view class="sheet-handle" />

      <view v-if="mode === 'entry'" class="entry">
        <view class="welcome">
          <text class="welcome-title">登录解锁更多权益</text>
          <text class="welcome-sub">登录后可查看零售价、收藏商品、查看订单</text>
        </view>

        <button class="btn-wechat" :class="{ loading }" @click="wechatLogin">
          <view class="wechat-icon">
            <text>💬</text>
          </view>
          <text class="btn-text">{{ loading ? '登录中…' : '微信一键登录' }}</text>
        </button>

        <view class="divider">
          <view class="line" />
          <text class="or">或</text>
          <view class="line" />
        </view>

        <button class="btn-phone" @click="mode = 'phone'">
          <text class="phone-icon">📱</text>
          <text>手机号登录</text>
        </button>

        <view class="guest" @click="asGuest">
          <text>暂不登录，先逛逛 ›</text>
        </view>
      </view>

      <view v-else class="phone-mode">
        <view class="back-row" @click="mode = 'entry'">
          <text class="back-icon">‹</text>
          <text>其他登录方式</text>
        </view>

        <text class="phone-title">手机号登录</text>
        <text class="phone-sub">未注册的手机号将自动创建账号</text>

        <view class="field">
          <text class="prefix">+86</text>
          <view class="divider-v" />
          <input v-model="phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" />
        </view>

        <view class="field code-field">
          <input v-model="code" class="input" type="number" maxlength="6" placeholder="请输入短信验证码" />
          <text
            :class="['code-btn', (countdown > 0 || sending) && 'disabled']"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中…' : '获取验证码' }}
          </text>
        </view>

        <view class="dev-tip">dev 模式接受 <text class="hl">0000</text> 作为验证码</view>

        <button
          :class="['submit', !canSubmitPhone && 'disabled']"
          :disabled="!canSubmitPhone || loading"
          @click="phoneLogin"
        >
          {{ loading ? '登录中…' : '登录 / 注册' }}
        </button>
      </view>

      <!-- 协议（双模式共用） -->
      <view class="agree-row">
        <view :class="['check', agreed && 'on']" @click="agreed = !agreed">
          <text v-if="agreed">✓</text>
        </view>
        <text class="agree-text">
          已阅读并同意
          <text class="hl" @click="goAgreement('user')">《用户协议》</text>
          与
          <text class="hl" @click="goAgreement('privacy')">《隐私政策》</text>
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFE4D6 0%, #FFB99A 35%, #FF8266 70%, #FF6E4D 100%);
  position: relative;
  overflow: hidden;
  padding: 80rpx 32rpx 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 装饰 */
.bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80rpx);
  opacity: 0.45;
  &.blob-1 {
    width: 400rpx;
    height: 400rpx;
    background: #FFE0CC;
    top: -100rpx;
    left: -100rpx;
  }
  &.blob-2 {
    width: 320rpx;
    height: 320rpx;
    background: #FFD89B;
    top: 200rpx;
    right: -120rpx;
  }
  &.blob-3 {
    width: 280rpx;
    height: 280rpx;
    background: #FFB199;
    top: 480rpx;
    left: 80rpx;
  }
}

/* 品牌 */
.brand {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 60rpx;
}
.logo-circle {
  width: 160rpx;
  height: 160rpx;
  margin: 0 auto;
  background: rgba(255,255,255,0.95);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 48rpx rgba(255,77,45,0.4);
  border: 4rpx solid rgba(255,255,255,0.6);
}
.logo-text {
  font-size: 56rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #FF6B45, #FF4D2D);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 4rpx;
}
.brand-title {
  display: block;
  margin-top: 28rpx;
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 4rpx 16rpx rgba(0,0,0,0.15);
  letter-spacing: 2rpx;
}
.brand-slogan {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
  letter-spacing: 1rpx;
}

/* 底部白卡 */
.sheet {
  position: relative;
  z-index: 1;
  margin-top: auto;
  margin-left: -32rpx;
  margin-right: -32rpx;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 24rpx 48rpx 48rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -8rpx 48rpx rgba(0,0,0,0.12);
}
.sheet-handle {
  width: 80rpx;
  height: 8rpx;
  background: #e5e5e5;
  border-radius: 4rpx;
  margin: 0 auto 28rpx;
}

/* Entry 模式 */
.entry {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.welcome {
  text-align: center;
  margin-bottom: 12rpx;
  .welcome-title {
    display: block;
    font-size: 38rpx;
    font-weight: 800;
    color: #1d2129;
    margin-bottom: 8rpx;
  }
  .welcome-sub {
    display: block;
    font-size: 22rpx;
    color: #86909c;
  }
}
.btn-wechat {
  height: 96rpx;
  background: linear-gradient(135deg, #07C160 0%, #06AE56 100%);
  color: #fff;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 32rpx;
  font-weight: 700;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(7,193,96,0.35);
  &.loading { opacity: 0.7; }
  &::after { border: none; }
}
.wechat-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}
.btn-text { letter-spacing: 4rpx; }
.divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 4rpx 0;
  .line {
    flex: 1;
    height: 1rpx;
    background: #eee;
  }
  .or {
    font-size: 22rpx;
    color: #c9cdd4;
  }
}
.btn-phone {
  height: 96rpx;
  background: #F7F8FA;
  color: #1d2129;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: 2rpx solid #f0f0f0;
  &::after { border: none; }
}
.phone-icon { font-size: 28rpx; }
.guest {
  margin-top: 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #86909c;
  padding: 12rpx;
}

/* Phone 模式 */
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
  .back-icon { font-size: 32rpx; line-height: 1; }
}
.phone-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #1d2129;
}
.phone-sub {
  font-size: 24rpx;
  color: #86909c;
  margin-bottom: 8rpx;
}
.field {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  background: #F7F8FA;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  .prefix {
    font-size: 30rpx;
    color: #1d2129;
    font-weight: 600;
  }
  .divider-v {
    width: 2rpx;
    height: 36rpx;
    background: #e5e5e5;
    margin: 0 16rpx;
  }
  .input {
    flex: 1;
    height: 100%;
    font-size: 30rpx;
    color: #1d2129;
  }
  .code-btn {
    margin-left: 12rpx;
    padding: 12rpx 20rpx;
    background: #fff1ed;
    color: #FF4D2D;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    &.disabled {
      background: #f0f0f0;
      color: #86909c;
    }
  }
}
.dev-tip {
  font-size: 22rpx;
  color: #86909c;
  padding: 8rpx 16rpx;
  background: rgba(255,77,45,0.04);
  border-radius: 12rpx;
  .hl { color: #FF4D2D; font-weight: 600; }
}
.submit {
  margin-top: 12rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #FF6B45 0%, #FF4D2D 100%);
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  border: none;
  box-shadow: 0 12rpx 24rpx rgba(255,77,45,0.35);
  &.disabled, &[disabled] {
    opacity: 0.5;
    box-shadow: none;
  }
  &::after { border: none; }
}

/* 协议（共用） */
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 32rpx;
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
  color: #fff;
  font-size: 20rpx;
  font-weight: 900;
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
</style>
