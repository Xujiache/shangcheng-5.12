<script setup lang="ts">
/**
 * 账号安全弹层（修改密码 + 修改手机号）
 *
 * 用法：在个人中心点"修改密码"/"修改手机号" → 调 useAccountSecurity().openPassword() 或 openPhone()
 * mode='password' → 显示旧密码 + 新密码两栏
 * mode='phone'    → 显示 原手机 + 旧码 + 新手机 + 新码 四栏
 *                   如果账号未绑过手机号（如纯微信用户），自动隐藏原手机栏
 *
 * 设计：
 *   - 表单都在弹层内部 reactive，关闭后清空
 *   - SMS 60s 倒计时（分别用于原手机和新手机）
 *   - 改成功后 emit('success')，调用方刷新 user store
 */
import { ref, reactive, computed } from 'vue'
import { authService } from '../../services/auth'
import Icon from '../icon/icon.vue'

type Mode = 'password' | 'phone'

const props = defineProps<{
  open: boolean
  mode: Mode
  currentPhone?: string // 当前账号已绑的手机号（空 = 首次绑定）
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', mode: Mode): void
}>()

const title = computed(() => (props.mode === 'password' ? '修改密码' : '修改手机号'))

/* ====== 修改密码 ====== */
const pwd = reactive({ old: '', new: '', new2: '', show: false, submitting: false })

function resetPwd() {
  pwd.old = ''; pwd.new = ''; pwd.new2 = ''; pwd.show = false; pwd.submitting = false
}

async function submitPwd() {
  if (!pwd.new || pwd.new.length < 6) {
    uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
    return
  }
  if (pwd.new !== pwd.new2) {
    uni.showToast({ title: '两次新密码不一致', icon: 'none' })
    return
  }
  pwd.submitting = true
  try {
    await authService.changePassword({ oldPassword: pwd.old, newPassword: pwd.new })
    uni.showToast({ title: '密码已修改', icon: 'success' })
    emit('success', 'password')
    emit('close')
    resetPwd()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '修改失败', icon: 'none', duration: 2200 })
  } finally {
    pwd.submitting = false
  }
}

/* ====== 修改手机号 ====== */
const ph = reactive({
  newPhone: '',
  oldCode: '',
  newCode: '',
  oldSending: false, oldCountdown: 0,
  newSending: false, newCountdown: 0,
  submitting: false,
})

const needOldCode = computed(() => !!props.currentPhone)

function resetPh() {
  ph.newPhone = ''; ph.oldCode = ''; ph.newCode = ''
  ph.oldSending = false; ph.oldCountdown = 0
  ph.newSending = false; ph.newCountdown = 0
  ph.submitting = false
}

function maskedPhone(p?: string) {
  return p ? p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : ''
}

async function sendOldCode() {
  if (!props.currentPhone || ph.oldSending || ph.oldCountdown > 0) return
  ph.oldSending = true
  try {
    await authService.sendSmsCode(props.currentPhone)
    uni.showToast({ title: '验证码已发到原手机', icon: 'none' })
    ph.oldCountdown = 60
    const t = setInterval(() => {
      ph.oldCountdown--
      if (ph.oldCountdown <= 0) clearInterval(t)
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    ph.oldSending = false
  }
}

async function sendNewCode() {
  if (ph.newSending || ph.newCountdown > 0) return
  if (!/^1[3-9]\d{9}$/.test(ph.newPhone)) {
    uni.showToast({ title: '请先输入正确的新手机号', icon: 'none' })
    return
  }
  ph.newSending = true
  try {
    await authService.sendSmsCode(ph.newPhone)
    uni.showToast({ title: '验证码已发送', icon: 'none' })
    ph.newCountdown = 60
    const t = setInterval(() => {
      ph.newCountdown--
      if (ph.newCountdown <= 0) clearInterval(t)
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    ph.newSending = false
  }
}

async function submitPh() {
  if (!/^1[3-9]\d{9}$/.test(ph.newPhone)) {
    uni.showToast({ title: '请输入正确的新手机号', icon: 'none' })
    return
  }
  if (!/^\d{4,6}$/.test(ph.newCode)) {
    uni.showToast({ title: '请输入新手机号验证码', icon: 'none' })
    return
  }
  if (needOldCode.value && !/^\d{4,6}$/.test(ph.oldCode)) {
    uni.showToast({ title: '请输入原手机号验证码', icon: 'none' })
    return
  }
  ph.submitting = true
  try {
    await authService.changePhone({
      oldSmsCode: needOldCode.value ? ph.oldCode : undefined,
      newPhone: ph.newPhone,
      newSmsCode: ph.newCode,
    })
    uni.showToast({ title: '手机号已修改', icon: 'success' })
    emit('success', 'phone')
    emit('close')
    resetPh()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '修改失败', icon: 'none', duration: 2200 })
  } finally {
    ph.submitting = false
  }
}

function close() {
  emit('close')
  // 关闭后清空，避免下次打开看到上次输入
  setTimeout(() => {
    resetPwd()
    resetPh()
  }, 200)
}
</script>

<template>
  <view v-if="open" class="mask" @click="close">
    <view class="sheet" @click.stop>
      <view class="head">
        <text class="title">{{ title }}</text>
        <view class="close" @click="close">
          <Icon name="close" :size="32" color="#909399" />
        </view>
      </view>

      <!-- 修改密码 -->
      <view v-if="mode === 'password'" class="body">
        <view class="field">
          <text class="label">当前密码</text>
          <input
            v-model="pwd.old"
            class="input"
            :password="!pwd.show"
            placeholder="留空表示首次设置"
            maxlength="40"
          />
        </view>
        <view class="field">
          <text class="label">新密码</text>
          <input
            v-model="pwd.new"
            class="input"
            :password="!pwd.show"
            placeholder="至少 6 位"
            maxlength="40"
          />
        </view>
        <view class="field">
          <text class="label">确认新密码</text>
          <input
            v-model="pwd.new2"
            class="input"
            :password="!pwd.show"
            placeholder="再输入一次新密码"
            maxlength="40"
          />
        </view>
        <view class="show-toggle" @click="pwd.show = !pwd.show">
          <text>{{ pwd.show ? '隐藏密码' : '显示密码' }}</text>
        </view>
        <view :class="['submit', pwd.submitting && 'disabled']" @click="submitPwd">
          {{ pwd.submitting ? '提交中…' : '确认修改' }}
        </view>
      </view>

      <!-- 修改手机号 -->
      <view v-else class="body">
        <view v-if="needOldCode" class="field-block">
          <text class="block-title">第 1 步：验证原手机号</text>
          <view class="field readonly">
            <text class="label">原手机号</text>
            <text class="input-readonly">{{ maskedPhone(currentPhone) }}</text>
          </view>
          <view class="field code-field">
            <text class="label">验证码</text>
            <input
              v-model="ph.oldCode"
              class="input"
              type="number"
              maxlength="6"
              placeholder="原手机验证码"
            />
            <view
              :class="['code-btn', (ph.oldCountdown > 0 || ph.oldSending) && 'disabled']"
              @click="sendOldCode"
            >
              {{
                ph.oldCountdown > 0
                  ? `${ph.oldCountdown}s 后重发`
                  : ph.oldSending
                  ? '发送中…'
                  : '获取验证码'
              }}
            </view>
          </view>
        </view>

        <view class="field-block">
          <text class="block-title">
            {{ needOldCode ? '第 2 步：' : '' }}填写新手机号
          </text>
          <view class="field">
            <text class="label">新手机号</text>
            <input
              v-model="ph.newPhone"
              class="input"
              type="number"
              maxlength="11"
              placeholder="11 位手机号"
            />
          </view>
          <view class="field code-field">
            <text class="label">验证码</text>
            <input
              v-model="ph.newCode"
              class="input"
              type="number"
              maxlength="6"
              placeholder="新手机验证码"
            />
            <view
              :class="['code-btn', (ph.newCountdown > 0 || ph.newSending) && 'disabled']"
              @click="sendNewCode"
            >
              {{
                ph.newCountdown > 0
                  ? `${ph.newCountdown}s 后重发`
                  : ph.newSending
                  ? '发送中…'
                  : '获取验证码'
              }}
            </view>
          </view>
        </view>

        <view :class="['submit', ph.submitting && 'disabled']" @click="submitPh">
          {{ ph.submitting ? '提交中…' : '确认修改' }}
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  padding: 32rpx 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  max-height: 88vh;
  overflow-y: auto;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .title { font-size: 32rpx; font-weight: 800; color: #1d2129; }
  .close { padding: 8rpx; }
}
.body {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.field-block {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
}
.block-title {
  font-size: 22rpx;
  font-weight: 700;
  color: #4e5969;
}
.field {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 20rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #ebedf0;
  gap: 12rpx;
  &.readonly { background: #fafbfc; }
  &.code-field { padding-right: 8rpx; }
  &:focus-within { border-color: rgba(255, 77, 45, 0.4); }
}
.label {
  flex-shrink: 0;
  width: 160rpx;
  font-size: 26rpx;
  color: #606266;
}
.input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: #1d2129;
}
.input-readonly {
  flex: 1;
  font-size: 28rpx;
  color: #909399;
  font-family: var(--font-family-base, monospace);
}
.code-btn {
  flex-shrink: 0;
  padding: 12rpx 18rpx;
  background: #fff1ed;
  color: #ff4d2d;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
  &.disabled { background: #f0f0f0; color: #86909c; }
}
.show-toggle {
  align-self: flex-end;
  padding: 4rpx 8rpx;
  font-size: 22rpx;
  color: #ff4d2d;
}
.submit {
  margin-top: 12rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 24rpx rgba(255, 77, 45, 0.32);
  letter-spacing: 4rpx;
  &.disabled { opacity: 0.6; }
  &:active { transform: scale(0.98); }
}
</style>
