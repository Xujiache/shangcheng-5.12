<script setup lang="ts">
/**
 * 商家入驻申请
 *
 * 1) 手机号 + 验证码（已登录就跳过这一步）
 * 2) 填写资料 → POST /api/v1/u/merchant-apply
 * 3) 等待平台审核（status=pending）
 */
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services/auth'

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
    uni.showToast({ title: '验证码已发送（dev: 0000）', icon: 'success' })
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
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">商家入驻</text>
      <text class="step-hint">{{ step === 'phone' ? '第一步 / 共 2 步' : step === 'form' ? '第二步 / 共 2 步' : '完成' }}</text>
    </view>

    <!-- Step 1: 手机号 -->
    <view v-if="step === 'phone'" class="card">
      <text class="lead">为保证账号安全，请先验证手机号</text>
      <view class="field">
        <text class="label">手机号</text>
        <input v-model="phone" class="input" type="number" maxlength="11" placeholder="11 位手机号" />
      </view>
      <view class="field code-field">
        <text class="label">验证码</text>
        <input v-model="smsCode" class="input" type="number" maxlength="6" placeholder="4-6 位验证码" />
        <view :class="['code-btn', (countdown > 0 || sending) && 'disabled']" @click="sendCode">
          {{ countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中…' : '获取验证码' }}
        </view>
      </view>
      <button class="submit" :disabled="verifyLoading" @click="verifyPhone">
        {{ verifyLoading ? '验证中…' : '下一步' }}
      </button>
      <view class="link" @click="backToLogin">已有账号？返回登录</view>
    </view>

    <!-- Step 2: 表单 -->
    <view v-else-if="step === 'form'" class="card">
      <view class="field">
        <text class="label">主体类型</text>
        <view class="seg">
          <view :class="['seg-item', form.type === 'store' && 'active']" @click="form.type = 'store'">门店</view>
          <view :class="['seg-item', form.type === 'factory' && 'active']" @click="form.type = 'factory'">厂家</view>
        </view>
      </view>
      <view class="field">
        <text class="label">店铺名 / 工厂名</text>
        <input v-model="form.name" class="input" placeholder="例：经纬科技" />
      </view>
      <view class="field">
        <text class="label">营业执照法定名称</text>
        <input v-model="form.legalName" class="input" placeholder="营业执照上的全称" />
      </view>
      <view class="field">
        <text class="label">统一社会信用代码</text>
        <input v-model="form.creditCode" class="input" placeholder="18 位社会信用代码" />
      </view>
      <view class="field">
        <text class="label">法定代表人</text>
        <input v-model="form.legalRep" class="input" placeholder="姓名" />
      </view>
      <view class="field">
        <text class="label">联系人</text>
        <input v-model="form.contact" class="input" placeholder="联系人姓名" />
      </view>
      <view class="field">
        <text class="label">联系电话</text>
        <input v-model="form.contactPhone" class="input" type="number" maxlength="11" placeholder="11 位手机号" />
      </view>
      <view class="field">
        <text class="label">所在地区</text>
        <input v-model="form.region" class="input" placeholder="例：上海市浦东新区" />
      </view>
      <view class="field">
        <text class="label">详细地址</text>
        <input v-model="form.address" class="input" placeholder="街道、门牌号" />
      </view>
      <view class="field">
        <text class="label">主营品类（多选）</text>
        <view class="chips">
          <view
            v-for="c in CATS"
            :key="c"
            :class="['chip', form.categories.includes(c) && 'active']"
            @click="toggleCat(c)"
          >{{ c }}</view>
        </view>
      </view>
      <button class="submit" :disabled="submitting || !formValid" @click="submit">
        {{ submitting ? '提交中…' : '提交申请' }}
      </button>
    </view>

    <!-- Step 3: 完成 -->
    <view v-else class="card done">
      <view class="done-icon">✓</view>
      <text class="done-title">入驻申请已提交</text>
      <text class="done-sub">平台审核约 1 个工作日，审核通过后即可使用商家工作台。</text>
      <button class="submit" @click="backToLogin">返回登录</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F7F8FA;
  padding: 32rpx;
}
.header {
  margin-bottom: 24rpx;
  .title {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    color: #1d2129;
  }
  .step-hint {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #86909c;
  }
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.lead {
  font-size: 26rpx;
  color: #4e5969;
  margin-bottom: 8rpx;
}
.field {
  .label {
    display: block;
    font-size: 24rpx;
    color: #86909c;
    margin-bottom: 8rpx;
  }
  .input {
    width: 100%;
    height: 72rpx;
    padding: 0 20rpx;
    background: #f7f8fa;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #1d2129;
    box-sizing: border-box;
  }
}
.code-field {
  position: relative;
  .input { padding-right: 200rpx; }
  .code-btn {
    position: absolute;
    right: 12rpx;
    top: 44rpx;
    padding: 12rpx 16rpx;
    background: #fff1ed;
    color: #FF4D2D;
    font-size: 22rpx;
    border-radius: 999rpx;
    &.disabled { background: #f0f0f0; color: #86909c; }
  }
}
.seg {
  display: flex;
  background: #f0f0f0;
  border-radius: 12rpx;
  padding: 4rpx;
  .seg-item {
    flex: 1;
    text-align: center;
    padding: 12rpx 0;
    font-size: 26rpx;
    color: #86909c;
    border-radius: 8rpx;
    &.active {
      background: #fff;
      color: #FF4D2D;
      font-weight: 600;
      box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
    }
  }
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .chip {
    padding: 12rpx 24rpx;
    background: #f0f0f0;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #4e5969;
    &.active {
      background: #fff1ed;
      color: #FF4D2D;
      border: 2rpx solid #FF4D2D;
    }
  }
}
.submit {
  margin-top: 16rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #FF6B45, #FF4D2D);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 16rpx;
  border: none;
  &[disabled] { opacity: 0.5; }
}
.link {
  text-align: center;
  font-size: 24rpx;
  color: #86909c;
  margin-top: 16rpx;
}
.done {
  align-items: center;
  text-align: center;
  padding: 64rpx 32rpx;
  .done-icon {
    width: 120rpx;
    height: 120rpx;
    line-height: 120rpx;
    border-radius: 50%;
    background: #00B42A;
    color: #fff;
    font-size: 64rpx;
    margin-bottom: 24rpx;
  }
  .done-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1d2129;
    margin-bottom: 12rpx;
  }
  .done-sub {
    font-size: 24rpx;
    color: #86909c;
    line-height: 1.6;
    margin-bottom: 24rpx;
  }
}
</style>
