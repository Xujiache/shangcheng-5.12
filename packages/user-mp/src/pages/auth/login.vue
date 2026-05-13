<script setup lang="ts">
/**
 * 用户端 · 登录注册页（重构 v3）
 *
 * 结构：
 *   品牌头 · 权益栏 · 登录卡（微信主入口 + 手机号次入口） · 协议
 *
 * 设计点：
 *   - 暖色径向渐变背景（mp-weixin 不支持 filter:blur，所以用 radial-gradient 替代毛玻璃球）
 *   - 微信登录走 uni.login() → 后端换 openid + token（不再传空 code）
 *   - 手机号登录：+86 前缀 + 短信验证码 60s 倒计时
 *   - 主操作按钮：禁用态 / 加载态 / 高亮态三类视觉
 *   - 没有 <button> 原生组件，避免 mp-weixin 默认样式干扰
 */
import { ref, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services'
import Icon from '../../components/icon/icon.vue'

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
    // 拿微信下发的临时 code（5 分钟内有效），交给后端换 openid
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

function goAgreement(type: 'user' | 'privacy') {
  uni.showToast({ title: type === 'user' ? '《用户协议》' : '《隐私政策》', icon: 'none' })
}

function asGuest() {
  uni.reLaunch({ url: '/pages/tabbar/home/index' })
}
</script>

<template>
  <view class="page">
    <!-- 背景：径向渐变 + 暖色叠加（替代不兼容的 blur blob）-->
    <view class="bg-base" />
    <view class="bg-glow bg-glow-1" />
    <view class="bg-glow bg-glow-2" />

    <!-- 顶部关闭 -->
    <view class="top-bar">
      <view class="top-close" @click="asGuest">
        <Icon name="close" :size="36" color="#fff" />
      </view>
    </view>

    <!-- 品牌头 -->
    <view class="brand">
      <view class="logo">
        <view class="logo-inner">
          <text class="logo-mark">经纬</text>
        </view>
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
      <!-- Entry 模式 -->
      <view v-if="mode === 'entry'" class="entry">
        <view class="welcome">
          <text class="welcome-title">登录解锁更多权益</text>
          <text class="welcome-sub">微信一键授权，安全免输入</text>
        </view>

        <view :class="['btn-primary', 'btn-wechat', loading && 'is-loading']" @click="wechatLogin">
          <view class="btn-icon">
            <Icon name="wechat" :size="40" color="#fff" />
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

        <view class="guest" @click="asGuest">
          <text>暂不登录，先逛逛 ›</text>
        </view>
      </view>

      <!-- Phone 模式 -->
      <view v-else class="phone-mode">
        <view class="back-row" @click="mode = 'entry'">
          <text class="back-icon">‹</text>
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
          <text class="hl" @click="goAgreement('user')">《用户协议》</text>
          和
          <text class="hl" @click="goAgreement('privacy')">《隐私政策》</text>
        </text>
      </view>
    </view>
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

/* ===== 背景层（替代 filter:blur blob）===== */
.bg-base {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(180deg, #ff8e6c 0%, #ff6e4d 45%, #ff4d2d 100%);
}
.bg-glow {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  opacity: 0.6;
}
.bg-glow-1 {
  width: 600rpx;
  height: 600rpx;
  top: -200rpx;
  right: -200rpx;
  background: radial-gradient(circle, rgba(255, 220, 180, 0.7) 0%, rgba(255, 220, 180, 0) 70%);
}
.bg-glow-2 {
  width: 500rpx;
  height: 500rpx;
  bottom: 480rpx;
  left: -150rpx;
  background: radial-gradient(circle, rgba(255, 200, 150, 0.45) 0%, rgba(255, 200, 150, 0) 70%);
}

/* ===== 顶部关闭 ===== */
.top-bar {
  position: relative;
  z-index: 2;
  padding-top: 80rpx;
  display: flex;
  justify-content: flex-end;
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

/* ===== 品牌 ===== */
.brand {
  position: relative;
  z-index: 2;
  text-align: center;
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.logo {
  width: 168rpx;
  height: 168rpx;
  border-radius: 56rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 48rpx rgba(180, 50, 20, 0.35);
}
.logo-inner {
  width: 132rpx;
  height: 132rpx;
  border-radius: 40rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-mark {
  font-size: 44rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
  color: #ff4d2d;
}
.brand-name {
  margin-top: 24rpx;
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
}
.brand-slogan {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1rpx;
}

/* ===== 权益栏 ===== */
.benefits {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-around;
  margin-top: 48rpx;
  padding: 0 16rpx;
}
.benefit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  flex: 1;
}
.benefit-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
}
.benefit-label {
  font-size: 22rpx;
  color: #fff;
  opacity: 0.9;
}

/* ===== 底部白卡 ===== */
.sheet {
  position: relative;
  z-index: 2;
  margin-top: auto;
  margin-left: -32rpx;
  margin-right: -32rpx;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 48rpx 48rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -16rpx 48rpx rgba(0, 0, 0, 0.08);
}

/* ===== Entry 模式 ===== */
.entry {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.welcome {
  text-align: center;
  margin-bottom: 8rpx;
  .welcome-title {
    display: block;
    font-size: 36rpx;
    font-weight: 800;
    color: #1d2129;
    letter-spacing: 1rpx;
  }
  .welcome-sub {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #86909c;
  }
}
.btn-primary {
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
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
  background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
  box-shadow: 0 10rpx 24rpx rgba(7, 193, 96, 0.32);
  &.is-loading {
    opacity: 0.7;
  }
}
.btn-icon {
  width: 48rpx;
  height: 48rpx;
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
  gap: 16rpx;
  margin: 4rpx 0;
  .line {
    flex: 1;
    height: 1rpx;
    background: #ececec;
  }
  .or {
    font-size: 22rpx;
    color: #c9cdd4;
  }
}
.btn-secondary {
  height: 96rpx;
  border-radius: 24rpx;
  background: #f7f8fa;
  color: #1d2129;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 2rpx solid #efefef;
  &:active {
    background: #efeff2;
    transform: scale(0.98);
  }
  transition: transform 0.15s ease;
}
.guest {
  margin-top: 4rpx;
  text-align: center;
  font-size: 24rpx;
  color: #86909c;
  padding: 12rpx;
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
  margin-bottom: 4rpx;
  .back-icon {
    font-size: 32rpx;
    line-height: 1;
  }
}
.phone-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #1d2129;
}
.phone-sub {
  font-size: 24rpx;
  color: #86909c;
}
.field {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  background: #f7f8fa;
  border-radius: 20rpx;
  border: 2rpx solid transparent;
  &:focus-within {
    border-color: rgba(255, 77, 45, 0.35);
    background: #fff;
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
    margin: 0 16rpx;
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
}
.btn-submit {
  margin-top: 12rpx;
  background: linear-gradient(135deg, #ff6b45 0%, #ff4d2d 100%);
  box-shadow: 0 12rpx 28rpx rgba(255, 77, 45, 0.32);
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
  gap: 12rpx;
  margin-top: 28rpx;
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
  }
}
.agree-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.5;
  color: #86909c;
  .hl {
    color: #ff4d2d;
  }
}
</style>
