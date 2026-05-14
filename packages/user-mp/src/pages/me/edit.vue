<script setup lang="ts">
/**
 * UM · 个人信息编辑
 *
 * 从「我的」tab 顶部信息卡片点击进入。
 * 支持改：头像 / 昵称 / 性别 / 邮箱
 * 账号绑定：
 *   - 手机号登录账号 → 可绑定微信（点击直接调 uni.login）
 *   - 微信登录账号 → 可绑定手机号（弹层 + 验证码）
 *   - 一个手机号 / 一个微信只能绑定一个账号；被占用时给出明确提示
 *   - 绑定后两种方式均可登录
 * 保存后立即调 PATCH /u/profile，后端通过 WS 广播给同账号所有在线设备。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { authService } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

/**
 * 文件上传 BASE_URL 与 utils/request 同源（VITE_API_BASE_URL）。
 * 之前写死 https://ewsn.top 在 dev 环境 + 自建后端时会 CORS / 404。
 * 与 merchant/apply.vue 的上传逻辑保持一致。
 */
const UPLOAD_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'https://ewsn.top'

const userStore = useUserStore()

const form = reactive({
  avatar: '',
  nickname: '',
  gender: 0 as 0 | 1 | 2,
  email: '',
})

const saving = ref(false)

function hydrateFromStore() {
  if (!userStore.user) return
  const u = userStore.user as any
  form.avatar = u.avatar || ''
  form.nickname = u.nickname || ''
  form.gender = (u.gender as 0 | 1 | 2) ?? 0
  form.email = u.email || ''
}

onMounted(async () => {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  hydrateFromStore()
  // 从服务器再拉一次最新
  await userStore.refreshFromServer()
  hydrateFromStore()
})

// 回到本页时也刷一次（同账号另一台手机改了 → 本页立刻看到）
onShow(() => {
  if (userStore.isLogin) {
    userStore.refreshFromServer().then(hydrateFromStore)
  }
})

const isValid = computed(() => {
  if (!form.nickname.trim() || form.nickname.length > 32) return false
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return false
  return true
})

const dirty = computed(() => {
  const u = userStore.user as any
  if (!u) return false
  return (
    form.nickname !== (u.nickname || '') ||
    form.avatar !== (u.avatar || '') ||
    form.gender !== ((u.gender as 0 | 1 | 2) ?? 0) ||
    form.email !== (u.email || '')
  )
})

const GENDER_TEXT = ['保密', '男', '女'] as const

const boundPhone = computed(() => (userStore.user as any)?.phone || '')
const boundOpenid = computed(() => (userStore.user as any)?.openid || '')
function maskedPhone(p: string) {
  return p ? p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : ''
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (r: any) => {
      const tempPath = r.tempFilePaths?.[0]
      if (!tempPath) return
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const uploadRes = await new Promise<{ url: string }>((resolve, reject) => {
          uni.uploadFile({
            url: `${UPLOAD_BASE}/api/v1/files/upload`,
            filePath: tempPath,
            name: 'file',
            header: { Authorization: `Bearer ${userStore.accessToken}` },
            success: (res: any) => {
              try {
                const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                if (data?.code === 0 && data?.data?.url) {
                  resolve({ url: data.data.url })
                } else {
                  reject(new Error(data?.message || '上传失败'))
                }
              } catch (e: any) {
                reject(e)
              }
            },
            fail: (err: any) => reject(err),
          })
        })
        form.avatar = uploadRes.url
        uni.hideLoading()
        uni.showToast({ title: '已选择头像，记得保存', icon: 'none' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
      }
    },
  })
}

function chooseGender() {
  uni.showActionSheet({
    itemList: ['保密', '男', '女'],
    success: (r) => {
      form.gender = r.tapIndex as 0 | 1 | 2
    },
  })
}

async function save() {
  if (!isValid.value) {
    uni.showToast({ title: '请检查输入', icon: 'none' })
    return
  }
  if (!dirty.value) {
    uni.navigateBack()
    return
  }
  saving.value = true
  uni.showLoading({ title: '保存中…', mask: true })
  try {
    await userStore.updateProfile({
      nickname: form.nickname.trim(),
      avatar: form.avatar,
      gender: form.gender,
      email: form.email.trim(),
    })
    uni.hideLoading()
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/* ====== 绑定手机号弹层 ====== */
const phoneDialog = reactive({
  open: false,
  phone: '',
  code: '',
  sending: false,
  countdown: 0,
  submitting: false,
})

function openPhoneBind() {
  if (boundPhone.value) {
    uni.showToast({ title: '已绑定手机号，如需更换请联系客服', icon: 'none', duration: 2000 })
    return
  }
  phoneDialog.open = true
  phoneDialog.phone = ''
  phoneDialog.code = ''
}

function closePhoneBind() {
  phoneDialog.open = false
}

async function sendPhoneCode() {
  if (phoneDialog.sending || phoneDialog.countdown > 0) return
  if (!/^1[3-9]\d{9}$/.test(phoneDialog.phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  phoneDialog.sending = true
  try {
    await authService.sendSmsCode(phoneDialog.phone)
    uni.showToast({ title: '验证码已发送', icon: 'none' })
    phoneDialog.countdown = 60
    const t = setInterval(() => {
      phoneDialog.countdown--
      if (phoneDialog.countdown <= 0) clearInterval(t)
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    phoneDialog.sending = false
  }
}

async function submitPhoneBind() {
  if (!/^1[3-9]\d{9}$/.test(phoneDialog.phone) || !/^\d{4,6}$/.test(phoneDialog.code)) {
    uni.showToast({ title: '请填写完整手机号和验证码', icon: 'none' })
    return
  }
  phoneDialog.submitting = true
  uni.showLoading({ title: '绑定中…', mask: true })
  try {
    await userStore.bindPhone({ phone: phoneDialog.phone, code: phoneDialog.code })
    uni.hideLoading()
    uni.showToast({ title: '绑定成功', icon: 'success' })
    phoneDialog.open = false
  } catch (e: any) {
    uni.hideLoading()
    // 后端会返回明确占用提示
    uni.showToast({ title: e?.message || '绑定失败', icon: 'none', duration: 2200 })
  } finally {
    phoneDialog.submitting = false
  }
}

/* ====== 绑定微信 ====== */
const wechatBinding = ref(false)

async function bindWechat() {
  if (boundOpenid.value) {
    uni.showToast({ title: '已绑定微信，如需更换请联系客服', icon: 'none', duration: 2000 })
    return
  }
  wechatBinding.value = true
  try {
    const wxCode = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (r) => (r.code ? resolve(r.code) : reject(new Error('未获取到微信 code'))),
        fail: (err) => reject(new Error(err?.errMsg || '微信授权失败')),
      })
    })
    await userStore.bindWechat({ code: wxCode })
    uni.showToast({ title: '微信绑定成功', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '绑定失败', icon: 'none', duration: 2200 })
  } finally {
    wechatBinding.value = false
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="个人信息" :sticky="true" />

    <view class="card">
      <view class="row" @click="chooseAvatar">
        <text class="label">头像</text>
        <view class="avatar-wrap">
          <image v-if="form.avatar" :src="form.avatar" class="avatar" mode="aspectFill" />
          <view v-else class="avatar avatar-empty">
            <text>?</text>
          </view>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
      </view>
      <view class="divider" />
      <view class="row">
        <text class="label">昵称</text>
        <input v-model="form.nickname" class="input" placeholder="2-32 字" maxlength="32" />
      </view>
      <view class="divider" />
      <view class="row" @click="chooseGender">
        <text class="label">性别</text>
        <view class="value-row">
          <text>{{ GENDER_TEXT[form.gender] }}</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
      </view>
      <view class="divider" />
      <view class="row">
        <text class="label">邮箱</text>
        <input v-model="form.email" class="input" placeholder="可选，用于接收通知" maxlength="60" />
      </view>
    </view>

    <!-- 账号绑定卡片 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">账号绑定</text>
        <text class="card-sub">绑定后两种方式均可登录</text>
      </view>
      <view class="bind-row" @click="openPhoneBind">
        <view class="bind-icon bind-icon-phone">
          <Icon name="phone" :size="32" color="#fff" />
        </view>
        <view class="bind-info">
          <text class="bind-name">手机号</text>
          <text v-if="boundPhone" class="bind-sub">{{ maskedPhone(boundPhone) }}</text>
          <text v-else class="bind-sub bind-sub-empty">未绑定</text>
        </view>
        <view v-if="boundPhone" class="bind-tag bound">已绑定</view>
        <view v-else class="bind-tag">去绑定</view>
        <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
      </view>
      <view class="divider" />
      <view class="bind-row" @click="bindWechat">
        <view class="bind-icon bind-icon-wechat">
          <Icon name="wechat" :size="32" color="#fff" />
        </view>
        <view class="bind-info">
          <text class="bind-name">微信</text>
          <text v-if="boundOpenid" class="bind-sub">已绑定微信账号</text>
          <text v-else class="bind-sub bind-sub-empty">未绑定</text>
        </view>
        <view v-if="boundOpenid" class="bind-tag bound">已绑定</view>
        <view v-else class="bind-tag">{{ wechatBinding ? '绑定中…' : '去绑定' }}</view>
        <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
      </view>
    </view>

    <view class="hint">
      <Icon name="info" :size="24" color="var(--text-tertiary)" />
      <text>修改后在同账号的其他手机 / 微信小程序上会自动同步</text>
    </view>

    <view class="ft">
      <button
        class="submit"
        :class="{ disabled: !isValid || !dirty || saving }"
        :disabled="!isValid || !dirty || saving"
        @click="save"
      >
        {{ saving ? '保存中…' : dirty ? '保 存' : '未做修改' }}
      </button>
    </view>

    <!-- 绑定手机号弹层 -->
    <view v-if="phoneDialog.open" class="mask" @click="closePhoneBind">
      <view class="dialog" @click.stop>
        <view class="dialog-head">
          <text class="dialog-title">绑定手机号</text>
          <view class="dialog-close" @click="closePhoneBind">
            <Icon name="close" :size="32" color="#909399" />
          </view>
        </view>
        <text class="dialog-sub">绑定后即可用手机号登录此账号。</text>
        <view class="field">
          <text class="prefix">+86</text>
          <view class="divider-v" />
          <input
            v-model="phoneDialog.phone"
            class="input"
            type="number"
            maxlength="11"
            placeholder="手机号"
            placeholder-class="ph"
          />
        </view>
        <view class="field code-field">
          <input
            v-model="phoneDialog.code"
            class="input"
            type="number"
            maxlength="6"
            placeholder="短信验证码"
            placeholder-class="ph"
          />
          <view
            :class="['code-btn', (phoneDialog.countdown > 0 || phoneDialog.sending) && 'disabled']"
            @click="sendPhoneCode"
          >
            {{
              phoneDialog.countdown > 0
                ? `${phoneDialog.countdown}s 后重发`
                : phoneDialog.sending
                  ? '发送中…'
                  : '获取验证码'
            }}
          </view>
        </view>
        <view
          class="dialog-submit"
          :class="{ disabled: phoneDialog.submitting }"
          @click="submitPhoneBind"
        >
          {{ phoneDialog.submitting ? '绑定中…' : '确认绑定' }}
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.card {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 0 24rpx;
}
.card-head {
  padding: 24rpx 0 8rpx;
  border-bottom: 1rpx solid #f5f6f8;
  margin-bottom: 8rpx;
  .card-title {
    font-size: 28rpx;
    font-weight: 800;
    color: #1d2129;
  }
  .card-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #86909c;
  }
}
.row {
  display: flex;
  align-items: center;
  min-height: 112rpx;
  gap: 20rpx;
  padding: 16rpx 0;
}
.label {
  width: 140rpx;
  flex-shrink: 0;
  font-size: 28rpx;
  color: var(--text-tertiary);
}
.input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #303133;
}
.value-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  font-size: 28rpx;
  color: #303133;
}
.avatar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f5f6f8;
}
.avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #c0c4cc;
}
.divider {
  height: 1rpx;
  background: #f0f2f5;
  margin-left: 140rpx;
}

/* 绑定卡片 */
.bind-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  min-height: 96rpx;
}
.bind-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bind-icon-phone {
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
}
.bind-icon-wechat {
  background: linear-gradient(135deg, #09d365, #06ad55);
}
.bind-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.bind-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1d2129;
}
.bind-sub {
  font-size: 22rpx;
  color: #86909c;
}
.bind-sub-empty {
  color: #c9cdd4;
}
.bind-tag {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  background: rgba(255, 77, 45, 0.1);
  color: #ff4d2d;
  &.bound {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }
}

.hint {
  margin: 24rpx 24rpx 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #909399;
  line-height: 1.6;
}
.ft {
  padding: 32rpx 24rpx;
}
.submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.35);
  border: none;
  &.disabled,
  &[disabled] {
    background: #dcdfe6 !important;
    box-shadow: none !important;
    color: #fff;
  }
  &::after {
    border: none;
  }
}

/* 绑定手机号弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
}
.dialog {
  width: 100%;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx 32rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .dialog-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1d2129;
  }
  .dialog-close {
    padding: 4rpx;
  }
}
.dialog-sub {
  font-size: 22rpx;
  color: #86909c;
  margin-bottom: 4rpx;
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
    border-color: rgba(255, 77, 45, 0.4);
    background: #fff;
  }
  .prefix {
    font-size: 28rpx;
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
    font-size: 28rpx;
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
  padding: 12rpx 20rpx;
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
.dialog-submit {
  margin-top: 8rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  letter-spacing: 4rpx;
  box-shadow: 0 8rpx 20rpx rgba(255, 77, 45, 0.32);
  &.disabled {
    opacity: 0.6;
  }
  &:active {
    transform: scale(0.98);
  }
}
</style>
