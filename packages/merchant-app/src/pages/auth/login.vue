<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
/**
 * 商家端 · 登录页（v2 · 重构美化）
 *
 * 结构：暖色渐变 Hero（双层光晕 + 品牌徽标） → 关键价值胶囊 →
 *      白色登录卡（手机号密码为主 + 短信登录小字入口） → 入驻引导 → 页脚
 *
 * 视觉：
 *   - 所有字段前缀使用 <wd-icon  /> SVG 图标（line 风格），与三端统一
 *   - 密码可见性切换走 eye / eye-off 图标
 *   - 主色 #FF4D2D（暖橙），与商家端品牌一致
 */
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services/auth'
import { useStatusBar } from '../../composables/useStatusBar'
import { checkAppUpdate } from '../../composables/useAppUpdate'
import AgreementSheet from '../../components/agreement-sheet/agreement-sheet.vue'
import GlassSurface from '@jiujiu/shared/glass-surface.vue'

const { heroPaddingTop } = useStatusBar(40)

type LegalKind = 'user' | 'privacy' | 'collect'
const agreementOpen = ref(false)
const agreementKind = ref<LegalKind>('user')
function openAgreement(type: LegalKind) {
  agreementKind.value = type
  agreementOpen.value = true
}

const userStore = useUserStore()

const mode = ref<'password' | 'sms'>('password')

// 手机号 + 密码为默认登录方式；短信仅作为次级入口。
const phone = ref('')
const password = ref('')
const showPwd = ref(false)
const smsCode = ref('')
const countdown = ref(0)
const sending = ref(false)

const loading = ref(false)
const checkingUpdate = ref(false)
const agreed = ref(true)

/**
 * 入驻成功提示横幅：apply.vue 提交后写 storage 标志，登录页消费一次。
 *   - justApplied 控制横幅显示
 *   - 自动回填刚验证过的手机号，省去用户重输
 *   - 新版申请已在提交事务中设置好密码，因此仍保持默认手机号密码登录
 */
const justApplied = ref(false)
onMounted(() => {
  userStore.hydrate()
  if (userStore.accessToken || userStore.refreshToken) {
    uni.reLaunch({ url: '/pages/tabbar/home/index' })
    return
  }
  try {
    if (uni.getStorageSync('merchant_just_applied')) {
      justApplied.value = true
      const p = uni.getStorageSync('merchant_applied_phone')
      if (p && typeof p === 'string') phone.value = p
    }
  } catch {
    /* ignore */
  }
})
function dismissApplyBanner() {
  justApplied.value = false
  try {
    uni.removeStorageSync('merchant_just_applied')
    uni.removeStorageSync('merchant_applied_phone')
  } catch {
    /* ignore */
  }
}

const canSubmit = computed(() => {
  if (mode.value === 'password') {
    return (
      /^1[3-9]\d{9}$/.test(phone.value) && password.value.length >= 6 && password.value.length <= 32
    )
  }
  return /^1[3-9]\d{9}$/.test(phone.value) && /^\d{4,6}$/.test(smsCode.value)
})

function showDialog(options: UniNamespace.ShowModalOptions) {
  return new Promise<UniNamespace.ShowModalRes>((resolve) => {
    appFeedback.showModal({ ...options, success: resolve })
  })
}

function switchMode() {
  mode.value = mode.value === 'password' ? 'sms' : 'password'
}

async function handleMerchantSession(
  session: Awaited<ReturnType<typeof authService.merchantPasswordLogin>>,
) {
  const role = session.user?.role
  const application = session.merchantApplication

  if (String(role) === 'super-admin') {
    userStore.setSession(session)
    dismissApplyBanner()
    appFeedback.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/tabbar/home/index' }), 400)
    return
  }

  if (!application) {
    const result = await showDialog({
      title: '尚未申请入驻',
      content: '该手机号已注册，但尚未提交商家入驻申请。',
      confirmText: '立即申请入驻',
      cancelText: '稍后再说',
    })
    if (result.confirm) uni.navigateTo({ url: '/pages/auth/apply' })
    return
  }

  if (application.status === 'pending') {
    await showDialog({
      title: '入驻审核中',
      content: `${application.name || '您的商家'}已提交申请，平台正在审核，请耐心等待。`,
      showCancel: false,
      confirmText: '我知道了',
    })
    return
  }

  if (application.status === 'rejected') {
    await showDialog({
      title: '入驻申请未通过',
      content: application.rejectReason
        ? `驳回原因：${application.rejectReason}`
        : '请联系平台了解审核详情。',
      showCancel: false,
      confirmText: '我知道了',
    })
    return
  }

  if (application.status === 'disabled') {
    await showDialog({
      title: '商家账号已停用',
      content: '该商家账号当前已停用，如有疑问请联系平台客服。',
      showCancel: false,
      confirmText: '我知道了',
    })
    return
  }

  if (!['factory', 'store', 'merchant'].includes(String(role))) {
    appFeedback.showToast({ title: '当前账号暂无商家权限', icon: 'none' })
    return
  }

  userStore.setSession(session)
  // 历史异常账号兜底：新版注册不会进入这里，但旧数据仍可首次设置密码。
  if (!session.user?.hasPassword) {
    appFeedback.showToast({ title: '请先设置登录密码', icon: 'none' })
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/set-password' }), 400)
    return
  }

  dismissApplyBanner()
  appFeedback.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => uni.reLaunch({ url: '/pages/tabbar/home/index' }), 400)
}

async function onLogin() {
  if (!agreed.value) {
    appFeedback.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  if (!canSubmit.value) {
    appFeedback.showToast({
      title:
        mode.value === 'password' ? '请输入正确手机号和 6-32 位密码' : '手机号或验证码格式有误',
      icon: 'none',
    })
    return
  }
  loading.value = true
  try {
    const session =
      mode.value === 'password'
        ? await authService.merchantPasswordLogin({ phone: phone.value, password: password.value })
        : await authService.merchantSmsLogin({ phone: phone.value, code: smsCode.value })
    await handleMerchantSession(session)
  } catch (e: any) {
    const message = e?.message || '登录失败'
    if (mode.value === 'sms' && message.includes('尚未注册')) {
      const result = await showDialog({
        title: '该手机号尚未注册商家账号',
        content: '验证码登录只适用于已有账号，请先完成商家入驻注册。',
        confirmText: '立即申请入驻',
        cancelText: '取消',
      })
      if (result.confirm) uni.navigateTo({ url: '/pages/auth/apply' })
    } else {
      appFeedback.showToast({ title: message, icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function onSendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    appFeedback.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  sending.value = true
  try {
    await authService.sendSmsCode(phone.value, 'login')
    appFeedback.showToast({ title: '验证码已发送，请注意查收', icon: 'none' })
    countdown.value = 60
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(t)
    }, 1000)
  } catch (e: any) {
    appFeedback.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function goApply() {
  uni.navigateTo({ url: '/pages/auth/apply' })
}

async function manualCheckUpdate() {
  if (checkingUpdate.value) return
  checkingUpdate.value = true
  try {
    await checkAppUpdate('merchant', { silent: false, source: 'manual' })
  } finally {
    checkingUpdate.value = false
  }
}
</script>

<template>
  <wd-config-provider
    :theme="$jwTheme.resolvedTheme"
    :theme-vars="$jwTheme.themeVars"
    custom-class="jw-theme-root"
  >
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />
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
            <wd-icon :name="$jwIcon('biz-store')" size="11px" color="#fff" />
            <text class="pill-text">厂家直供</text>
          </view>
          <view class="pill">
            <wd-icon :name="$jwIcon('biz-staff')" size="11px" color="#fff" />
            <text class="pill-text">多角色协作</text>
          </view>
          <view class="pill">
            <wd-icon :name="$jwIcon('biz-stats')" size="11px" color="#fff" />
            <text class="pill-text">实时经营</text>
          </view>
        </view>
      </view>

      <!-- 入驻成功横幅 -->
      <view v-if="justApplied" class="status-banner">
        <view class="apply-banner-icon">
          <wd-icon :name="$jwIcon('check')" size="14px" color="#fff" />
        </view>
        <view class="apply-banner-text">
          <text class="apply-banner-title">入驻申请已提交</text>
          <text class="apply-banner-sub"
            >申请已进入审核流程，审核通过后可直接使用手机号和设置好的密码登录</text
          >
        </view>
        <view class="apply-banner-close" @click="dismissApplyBanner">
          <wd-icon :name="$jwIcon('close')" size="12px" color="#fff" />
        </view>
      </view>

      <!-- 登录卡片 -->
      <GlassSurface class="card" variant="card" effect="auto">
        <view class="login-head">
          <text class="login-title">{{ mode === 'password' ? '手机号登录' : '验证码登录' }}</text>
          <text class="login-sub">
            {{ mode === 'password' ? '请输入注册手机号和密码' : '验证码登录仅适用于已有商家账号' }}
          </text>
        </view>

        <view class="form">
          <view class="field">
            <view class="prefix">
              <wd-icon :name="$jwIcon('phone')" size="16px" color="#86909c" />
            </view>
            <wd-input
              no-border
              v-model="phone"
              class="input"
              type="number"
              maxlength="11"
              placeholder="请输入手机号"
              placeholder-class="ph"
            />
          </view>
          <view v-if="mode === 'password'" class="field">
            <view class="prefix">
              <wd-icon :name="$jwIcon('lock')" size="16px" color="#86909c" />
            </view>
            <wd-input
              no-border
              v-model="password"
              class="input"
              show-password
              maxlength="32"
              placeholder="请输入 6-32 位密码"
              placeholder-class="ph"
            />
            <view class="suffix" @click="showPwd = !showPwd">
              <wd-icon :name="$jwIcon(showPwd ? 'eye' : 'eye-off')" size="16px" color="#86909c" />
            </view>
          </view>
          <view v-else class="field">
            <view class="prefix">
              <wd-icon :name="$jwIcon('biz-receipt')" size="16px" color="#86909c" />
            </view>
            <wd-input
              no-border
              v-model="smsCode"
              class="input"
              type="number"
              maxlength="6"
              placeholder="短信验证码"
              placeholder-class="ph"
            />
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
            <wd-icon v-if="agreed" :name="$jwIcon('check')" size="10px" color="#fff" />
          </view>
          <text class="agree-text">
            已阅读并同意
            <text class="hl" @click="openAgreement('user')">《商家入驻协议》</text>、
            <text class="hl" @click="openAgreement('privacy')">《隐私政策》</text>及
            <text class="hl" @click="openAgreement('collect')">《信息收集清单》</text>
          </text>
        </view>

        <!-- 提交 -->
        <wd-button
          class="submit"
          :class="{ disabled: !canSubmit || loading }"
          :disabled="!canSubmit || loading"
          @click="onLogin"
          type="primary"
          size="large"
          block
        >
          <text v-if="loading">登录中…</text>
          <text v-else>登 录</text>
        </wd-button>

        <view class="mode-link" @click="switchMode">
          {{ mode === 'password' ? '忘记密码？使用验证码登录' : '返回手机号密码登录' }}
        </view>

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
              <wd-icon :name="$jwIcon('biz-shop-decorate')" size="18px" color="#FF4D2D" />
            </view>
            <view class="apply-info">
              <text class="apply-title">立即申请入驻</text>
              <text class="apply-sub">最快 1 个工作日审核</text>
            </view>
          </view>
          <wd-icon :name="$jwIcon('forward')" size="14px" color="#FF4D2D" />
        </view>
      </GlassSurface>

      <!-- 页脚 -->
      <view class="footer">
        <view class="update-link" @click="manualCheckUpdate">
          {{ checkingUpdate ? '正在检查更新…' : '检查更新' }}
        </view>
        <view class="footer-row">
          <text class="meta">© 2026 经纬科技</text>
          <text class="dot-divider">·</text>
          <text class="meta">商家版</text>
        </view>
      </view>

      <AgreementSheet :open="agreementOpen" :type="agreementKind" @close="agreementOpen = false" />
    </view>
  </wd-config-provider>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 48rpx;
  box-sizing: border-box;
  position: relative;
}

/* 入驻成功横幅（覆盖在 Hero 下方、登录卡片上方） */
.status-banner {
  margin: -84rpx 32rpx 24rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(26, 188, 156, 0.32);
  position: relative;
  z-index: 2;
}
.apply-banner-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.apply-banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.apply-banner-title {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.4;
}
.apply-banner-sub {
  color: rgba(255, 255, 255, 0.92);
  font-size: 22rpx;
  line-height: 1.4;
}
.apply-banner-close {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.85;
}
.tab-disabled {
  opacity: 0.35;
  pointer-events: none;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  /* padding-top 由内联样式 heroPaddingTop 注入（状态栏 + 40rpx） */
  padding: 0 40rpx 120rpx;
  background:
    radial-gradient(140% 80% at 100% 0%, #ff8a5e 0%, transparent 60%),
    radial-gradient(120% 80% at 0% 100%, #ff3b1f 0%, transparent 50%),
    linear-gradient(160deg, #ff6b45 0%, #ff4d2d 50%, #e63a1f 100%);
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
  width: 360rpx;
  height: 360rpx;
  background: #ffd3a8;
  top: -100rpx;
  right: -100rpx;
}
.blob-2 {
  width: 260rpx;
  height: 260rpx;
  background: #ffe7b0;
  top: 280rpx;
  left: -80rpx;
}
.blob-3 {
  width: 200rpx;
  height: 200rpx;
  background: #ffaa82;
  bottom: -60rpx;
  right: 30%;
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
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.14) 100%);
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  padding: 6rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
}
.logo-inner {
  width: 100%;
  height: 100%;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #fff 0%, #ffe6dc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-letter {
  font-size: 52rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #ff6b45, #e63a1f);
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
  color: rgba(255, 255, 255, 0.88);
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
  color: rgba(255, 255, 255, 0.82);
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
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.28);
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
  background: var(--bg-card);
  border-radius: 36rpx;
  padding: 8rpx 32rpx 36rpx;
  box-shadow:
    0 24rpx 60rpx rgba(255, 90, 40, 0.15),
    0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 3;
}

.login-head {
  padding: 34rpx 4rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.login-title {
  color: var(--text-primary);
  font-size: 34rpx;
  font-weight: 700;
}
.login-sub {
  color: var(--text-tertiary);
  font-size: 23rpx;
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
  color: var(--text-tertiary);
  position: relative;
  transition: color 0.2s;
}
.tab.active {
  color: var(--text-primary);
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
  background: linear-gradient(90deg, #ff6b45, #ff4d2d);
  border-radius: 3rpx;
  box-shadow: 0 4rpx 8rpx rgba(255, 77, 45, 0.4);
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
  background: var(--bg-page);
  border: 2rpx solid #f0f1f4;
  border-radius: 20rpx;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.field:focus-within,
.field:active {
  border-color: #ffb199;
  background: var(--bg-card);
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
  color: var(--text-primary);
}
.ph {
  color: var(--text-disabled);
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
  background: linear-gradient(135deg, #fff1ed, #ffe2d6);
  color: #ff4d2d;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  white-space: nowrap;
}
.code-btn.disabled {
  background: #f2f3f5;
  color: var(--text-disabled);
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
  border: 2rpx solid #c9cdd4;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  transition: all 0.2s;
}
.check.on {
  background: #ff4d2d;
  border-color: #ff4d2d;
}
.agree-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--text-tertiary);
}
.agree-text .hl {
  color: #ff4d2d;
}

/* 提交 */
.submit {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #ff6b45 0%, #ff4d2d 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 10rpx;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 16rpx 32rpx rgba(255, 77, 45, 0.36);
  text-align: center;
}
.submit::after {
  border: none;
}
.submit.disabled,
.submit[disabled] {
  opacity: 0.5;
  box-shadow: none;
  background: linear-gradient(135deg, #ffb199, #ff8a6a);
}

.mode-link {
  padding: 24rpx 0 4rpx;
  color: var(--text-tertiary);
  font-size: 23rpx;
  text-align: center;
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
  background: #f0f1f4;
}
.dtext {
  font-size: 22rpx;
  color: var(--text-disabled);
  letter-spacing: 1rpx;
}

/* 入驻引导卡片 */
.apply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #fff6f1 0%, #ffe9dc 100%);
  border: 2rpx solid #ffe0cd;
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
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 77, 45, 0.12);
}
.apply-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.apply-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.apply-sub {
  font-size: 22rpx;
  color: var(--text-tertiary);
}

/* 底部 */
.footer {
  margin-top: 64rpx;
  padding: 0 32rpx;
}
.update-link {
  margin-bottom: 20rpx;
  color: #ff4d2d;
  font-size: 24rpx;
  text-align: center;
}
.footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.meta {
  font-size: 22rpx;
  color: var(--text-disabled);
  letter-spacing: 1rpx;
}
.dot-divider {
  font-size: 22rpx;
  color: var(--text-disabled);
}
</style>
