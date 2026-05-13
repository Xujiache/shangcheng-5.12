<script setup lang="ts">
/**
 * 商家入驻申请（v2 · 重构美化）
 *
 * 流程：
 *   1) 手机号 + 验证码（已登录跳过）
 *   2) 填写资料 → POST /api/v1/u/merchant-apply
 *   3) 等待平台审核（status=pending）
 *
 * 视觉：
 *   - Hero 渐变 + 可视化步进条（验证 → 信息 → 完成）
 *   - 表单按 主体信息 / 联系方式 / 经营信息 三段分区
 *   - 字段使用 <Icon /> 图标前缀，与登录页统一
 */
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services/auth'
import { useStatusBar } from '../../composables/useStatusBar'
import Icon from '../../components/icon/icon.vue'

const { heroPaddingTop } = useStatusBar(40)

const userStore = useUserStore()

const step = ref<'phone' | 'form' | 'done'>(userStore.isLogin ? 'form' : 'phone')

// 第一步：手机号验证码
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const sending = ref(false)
const verifyLoading = ref(false)

async function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  sending.value = true
  try {
    await authService.sendSmsCode(phone.value)
    uni.showToast({ title: '验证码已发送，请注意查收', icon: 'success' })
    countdown.value = 60
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(t)
    }, 1000)
  } finally {
    sending.value = false
  }
}
async function verifyPhone() {
  if (!/^1[3-9]\d{9}$/.test(phone.value) || !/^\d{4,6}$/.test(smsCode.value)) {
    uni.showToast({ title: '请填写完整手机号与验证码', icon: 'none' })
    return
  }
  verifyLoading.value = true
  try {
    const session = await authService.phoneLogin({ phone: phone.value, code: smsCode.value })
    userStore.setSession(session as any)
    form.contactPhone = phone.value
    step.value = 'form'
  } catch (e: any) {
    uni.showToast({ title: e?.message || '验证失败', icon: 'none' })
  } finally {
    verifyLoading.value = false
  }
}

// 第二步：表单
const form = reactive({
  type: 'store' as 'factory' | 'store',
  name: '',
  legalName: '',
  creditCode: '',
  legalRep: '',
  contact: '',
  contactPhone: '',
  region: '',
  address: '',
  categories: [] as string[],
})

const CATS = ['家具', '窗帘布艺', '灯具', '装饰']

function toggleCat(c: string) {
  const i = form.categories.indexOf(c)
  if (i >= 0) form.categories.splice(i, 1)
  else form.categories.push(c)
}

const formValid = computed(() => (
  form.name && form.legalName && form.creditCode && form.legalRep && form.contact &&
  form.contactPhone && form.region && form.address && form.categories.length > 0
))

const submitting = ref(false)
async function submit() {
  if (!formValid.value) {
    uni.showToast({ title: '请填写完整必填项', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await authService.merchantApply({ ...form })
    step.value = 'done'
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function backToLogin() {
  uni.reLaunch({ url: '/pages/auth/login' })
}

/** 步进条当前位置（0/1/2） */
const stepIndex = computed(() => (step.value === 'phone' ? 0 : step.value === 'form' ? 1 : 2))
const STEPS = [
  { key: 'phone', label: '验证手机号' },
  { key: 'form', label: '填写资料' },
  { key: 'done', label: '等待审核' },
]
</script>

<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero" :style="{ paddingTop: heroPaddingTop }">
      <view class="blob blob-1" />
      <view class="blob blob-2" />
      <view class="hero-top">
        <view class="back-btn" @click="backToLogin">
          <Icon name="back" :size="32" color="#fff" />
        </view>
        <view class="hero-titles">
          <text class="hero-title">商家入驻</text>
          <text class="hero-sub">加入经纬科技 · 解锁经营全链路</text>
        </view>
      </view>

      <!-- Stepper -->
      <view class="stepper">
        <view
          v-for="(s, i) in STEPS"
          :key="s.key"
          class="step-item"
        >
          <view class="step-row">
            <view :class="['dot', i <= stepIndex && 'reached', i === stepIndex && 'active']">
              <Icon v-if="i < stepIndex" name="check" :size="20" color="#FF4D2D" />
              <text v-else class="dot-num">{{ i + 1 }}</text>
            </view>
            <view v-if="i < STEPS.length - 1" :class="['bar', i < stepIndex && 'reached']" />
          </view>
          <text :class="['step-label', i <= stepIndex && 'reached']">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <view class="content">
      <!-- Step 1: 手机号 -->
      <view v-if="step === 'phone'" class="card">
        <view class="card-head">
          <text class="card-title">验证手机号</text>
          <text class="card-lead">为保证账号安全，请先验证手机号</text>
        </view>

        <view class="form">
          <view class="field">
            <view class="prefix">
              <Icon name="phone" :size="32" color="#86909c" />
            </view>
            <input v-model="phone" class="input" type="number" maxlength="11" placeholder="11 位手机号" placeholder-class="ph" />
          </view>
          <view class="field">
            <view class="prefix">
              <Icon name="biz-receipt" :size="32" color="#86909c" />
            </view>
            <input v-model="smsCode" class="input" type="number" maxlength="6" placeholder="4-6 位验证码" placeholder-class="ph" />
            <view :class="['code-btn', (countdown > 0 || sending) && 'disabled']" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码' }}
            </view>
          </view>
        </view>

        <button class="submit" :disabled="verifyLoading" @click="verifyPhone">
          {{ verifyLoading ? '验证中…' : '下一步' }}
        </button>
        <view class="link" @click="backToLogin">已有账号？返回登录</view>
      </view>

      <!-- Step 2: 表单 -->
      <template v-else-if="step === 'form'">
        <!-- 主体信息 -->
        <view class="card">
          <view class="section-head">
            <view class="section-bar" />
            <text class="section-title">主体信息</text>
            <text class="section-tag">必填</text>
          </view>

          <view class="field-block">
            <text class="label">主体类型</text>
            <view class="seg">
              <view :class="['seg-item', form.type === 'store' && 'active']" @click="form.type = 'store'">
                <Icon name="biz-store" :size="28" :color="form.type === 'store' ? '#FF4D2D' : '#86909c'" />
                <text>门店</text>
              </view>
              <view :class="['seg-item', form.type === 'factory' && 'active']" @click="form.type = 'factory'">
                <Icon name="biz-product" :size="28" :color="form.type === 'factory' ? '#FF4D2D' : '#86909c'" />
                <text>厂家</text>
              </view>
            </view>
          </view>

          <view class="field-block">
            <text class="label">店铺名 / 工厂名</text>
            <view class="field">
              <view class="prefix">
                <Icon name="biz-shop-decorate" :size="32" color="#86909c" />
              </view>
              <input v-model="form.name" class="input" placeholder="例：经纬科技" placeholder-class="ph" />
            </view>
          </view>

          <view class="field-block">
            <text class="label">营业执照法定名称</text>
            <view class="field">
              <view class="prefix">
                <Icon name="doc" :size="32" color="#86909c" />
              </view>
              <input v-model="form.legalName" class="input" placeholder="营业执照上的全称" placeholder-class="ph" />
            </view>
          </view>

          <view class="field-block">
            <text class="label">统一社会信用代码</text>
            <view class="field">
              <view class="prefix">
                <Icon name="biz-receipt" :size="32" color="#86909c" />
              </view>
              <input v-model="form.creditCode" class="input" placeholder="18 位社会信用代码" placeholder-class="ph" />
            </view>
          </view>

          <view class="field-block">
            <text class="label">法定代表人</text>
            <view class="field">
              <view class="prefix">
                <Icon name="biz-me" :size="32" color="#86909c" />
              </view>
              <input v-model="form.legalRep" class="input" placeholder="姓名" placeholder-class="ph" />
            </view>
          </view>
        </view>

        <!-- 联系方式 -->
        <view class="card">
          <view class="section-head">
            <view class="section-bar" />
            <text class="section-title">联系方式</text>
            <text class="section-tag">必填</text>
          </view>

          <view class="field-block">
            <text class="label">联系人</text>
            <view class="field">
              <view class="prefix">
                <Icon name="biz-staff" :size="32" color="#86909c" />
              </view>
              <input v-model="form.contact" class="input" placeholder="联系人姓名" placeholder-class="ph" />
            </view>
          </view>

          <view class="field-block">
            <text class="label">联系电话</text>
            <view class="field">
              <view class="prefix">
                <Icon name="phone" :size="32" color="#86909c" />
              </view>
              <input v-model="form.contactPhone" class="input" type="number" maxlength="11" placeholder="11 位手机号" placeholder-class="ph" />
            </view>
          </view>

          <view class="field-block">
            <text class="label">所在地区</text>
            <view class="field">
              <view class="prefix">
                <Icon name="location" :size="32" color="#86909c" />
              </view>
              <input v-model="form.region" class="input" placeholder="例：上海市浦东新区" placeholder-class="ph" />
            </view>
          </view>

          <view class="field-block">
            <text class="label">详细地址</text>
            <view class="field">
              <view class="prefix">
                <Icon name="biz-home" :size="32" color="#86909c" />
              </view>
              <input v-model="form.address" class="input" placeholder="街道、门牌号" placeholder-class="ph" />
            </view>
          </view>
        </view>

        <!-- 经营信息 -->
        <view class="card">
          <view class="section-head">
            <view class="section-bar" />
            <text class="section-title">经营信息</text>
            <text class="section-tag">必填</text>
          </view>

          <view class="field-block">
            <text class="label">
              主营品类
              <text class="label-hint">（多选）</text>
            </text>
            <view class="chips">
              <view
                v-for="c in CATS"
                :key="c"
                :class="['chip', form.categories.includes(c) && 'active']"
                @click="toggleCat(c)"
              >
                <Icon v-if="form.categories.includes(c)" name="check" :size="22" color="#FF4D2D" />
                <text>{{ c }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 提交 -->
        <view class="submit-wrap">
          <button class="submit" :disabled="submitting || !formValid" @click="submit">
            {{ submitting ? '提交中…' : '提交申请' }}
          </button>
          <text class="submit-hint">提交即视为同意《商家入驻协议》</text>
        </view>
      </template>

      <!-- Step 3: 完成 -->
      <view v-else class="card done">
        <view class="done-icon">
          <Icon name="check" :size="68" color="#fff" :stroke="3" />
        </view>
        <text class="done-title">入驻申请已提交</text>
        <text class="done-sub">平台审核约 1 个工作日，审核通过后即可使用商家工作台。</text>

        <view class="done-meta">
          <view class="meta-row">
            <Icon name="clock" :size="28" color="#FF4D2D" />
            <text class="meta-text">预计审核时长 ≤ 24 小时</text>
          </view>
          <view class="meta-row">
            <Icon name="bell" :size="28" color="#FF4D2D" />
            <text class="meta-text">结果将以短信和站内消息通知</text>
          </view>
        </view>

        <button class="submit" @click="backToLogin">返回登录</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F7F8FA;
  padding-bottom: 48rpx;
  box-sizing: border-box;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  /* padding-top 由内联样式 heroPaddingTop 注入（状态栏 + 40rpx） */
  padding: 0 32rpx 88rpx;
  background:
    radial-gradient(120% 80% at 100% 0%, #FF8A5E 0%, transparent 60%),
    linear-gradient(160deg, #FF6B45 0%, #FF4D2D 50%, #E63A1F 100%);
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  overflow: hidden;
  box-sizing: border-box;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(64rpx);
  opacity: 0.55;
  pointer-events: none;
}
.blob-1 {
  width: 320rpx; height: 320rpx;
  background: #FFD3A8;
  top: -120rpx; right: -100rpx;
}
.blob-2 {
  width: 220rpx; height: 220rpx;
  background: #FFAA82;
  bottom: -80rpx; left: -40rpx;
  opacity: 0.4;
}

.hero-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255,255,255,0.18);
  border: 2rpx solid rgba(255,255,255,0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-titles {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.hero-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
}
.hero-sub {
  font-size: 24rpx;
  color: rgba(255,255,255,0.85);
  letter-spacing: 1rpx;
}

/* Stepper */
.stepper {
  position: relative;
  z-index: 2;
  margin-top: 48rpx;
  display: flex;
}
.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
  min-width: 0;
}
.step-row {
  display: flex;
  align-items: center;
  width: 100%;
}
.dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  border: 2rpx solid rgba(255,255,255,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.25s;
}
.dot.reached {
  background: #fff;
  border-color: #fff;
}
.dot.active {
  box-shadow: 0 0 0 8rpx rgba(255,255,255,0.25);
}
.dot-num {
  font-size: 26rpx;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
}
.dot.reached .dot-num {
  color: #FF4D2D;
}
.bar {
  flex: 1;
  height: 4rpx;
  margin: 0 8rpx;
  background: rgba(255,255,255,0.25);
  border-radius: 2rpx;
}
.bar.reached {
  background: #fff;
}
.step-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  letter-spacing: 1rpx;
  padding-left: 6rpx;
}
.step-label.reached {
  color: #fff;
  font-weight: 600;
}

/* ===== 内容区 ===== */
.content {
  position: relative;
  z-index: 3;
  margin-top: -48rpx;
  padding: 0 28rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
}

.card-head {
  margin-bottom: 24rpx;
}
.card-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 1rpx;
}
.card-lead {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #86909c;
  line-height: 1.5;
}

/* Section */
.section-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 24rpx;
}
.section-bar {
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #FF6B45, #FF4D2D);
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 1rpx;
  flex: 1;
}
.section-tag {
  font-size: 20rpx;
  color: #FF4D2D;
  background: #FFF1ED;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.field-block {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.field-block + .field-block {
  margin-top: 20rpx;
}
.label {
  font-size: 26rpx;
  color: #4e5969;
  font-weight: 600;
  letter-spacing: 1rpx;
}
.label-hint {
  font-weight: 400;
  color: #86909c;
  margin-left: 4rpx;
  font-size: 22rpx;
}

.field {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  background: #F7F8FA;
  border: 2rpx solid #F0F1F4;
  border-radius: 20rpx;
  transition: border-color 0.2s, background 0.2s;
}
.field:focus-within {
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
  font-size: 28rpx;
  color: #1d2129;
}
.ph {
  color: #c9cdd4;
  font-size: 26rpx;
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

/* Seg */
.seg {
  display: flex;
  background: #F2F3F5;
  border-radius: 20rpx;
  padding: 8rpx;
  gap: 8rpx;
}
.seg-item {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 28rpx;
  color: #86909c;
  border-radius: 14rpx;
  transition: all 0.2s;
}
.seg-item.active {
  background: #fff;
  color: #FF4D2D;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(255,77,45,0.15);
}

/* Chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 28rpx;
  background: #F7F8FA;
  border: 2rpx solid #F0F1F4;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #4e5969;
  transition: all 0.2s;
}
.chip.active {
  background: linear-gradient(135deg, #FFF6F1, #FFE9DC);
  color: #FF4D2D;
  border-color: #FFB199;
  font-weight: 600;
}

/* 提交按钮 */
.submit-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
  padding: 8rpx 4rpx 0;
}
.submit {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #FF6B45 0%, #FF4D2D 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 16rpx 32rpx rgba(255,77,45,0.36);
  text-align: center;
  margin-top: 12rpx;
}
.submit::after { border: none; }
.submit[disabled] {
  opacity: 0.5;
  box-shadow: none;
  background: linear-gradient(135deg, #FFB199, #FF8A6A);
}
.submit-hint {
  font-size: 22rpx;
  color: #86909c;
}
.link {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #86909c;
  margin-top: 20rpx;
}

/* Done */
.done {
  align-items: center;
  text-align: center;
  padding: 72rpx 40rpx 56rpx;
  display: flex;
  flex-direction: column;
}
.done-icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #36D399, #00B42A);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
  box-shadow: 0 16rpx 36rpx rgba(0,180,42,0.32);
}
.done-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d2129;
  margin-bottom: 16rpx;
  letter-spacing: 1rpx;
}
.done-sub {
  font-size: 26rpx;
  color: #86909c;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
.done-meta {
  width: 100%;
  background: #FFF6F1;
  border: 2rpx solid #FFE0CD;
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-bottom: 32rpx;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.meta-text {
  font-size: 24rpx;
  color: #4e5969;
  text-align: left;
}
.done .submit {
  width: 100%;
}
</style>
