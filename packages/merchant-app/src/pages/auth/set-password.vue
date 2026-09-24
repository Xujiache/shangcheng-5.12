<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
/**
 * 商家端 · 首次设置密码
 *
 * 历史异常账号兜底页：仅当已审核商家仍没有 passwordHash 时由 login.vue 导入。
 * 新注册流程已在提交入驻申请时原子设置密码，不会进入本页。
 *
 * 提交逻辑：POST /api/v1/auth/change-password，oldPassword 传空（后端 changePassword 已支持首次设置场景）。
 *   - 服务端会把这次设的密码 hash 存到 User.passwordHash
 *   - 服务端会继续兼容历史数据，并写入 User.passwordHash
 *
 * 离开本页：
 *   - 成功设密码 → reLaunch 到商家主页
 *   - 不允许返回入口；导航条只放"退出登录"
 */
import { ref, computed } from 'vue'
import { useUserStore } from '../../store/user'
import { authService } from '../../services/auth'
import { useStatusBar } from '../../composables/useStatusBar'
const { heroPaddingTop } = useStatusBar(40)
const userStore = useUserStore()

const password = ref('')
const confirm = ref('')
const showPwd = ref(false)
const showConfirm = ref(false)
const submitting = ref(false)

const phoneHint = computed(() => {
  const p = (userStore.user as any)?.phone || ''
  if (!p || p.length !== 11) return ''
  return p.slice(0, 3) + '****' + p.slice(7)
})

const canSubmit = computed(
  () => password.value.length >= 6 && confirm.value.length >= 6 && password.value === confirm.value,
)

async function submit() {
  if (password.value.length < 6) {
    appFeedback.showToast({ title: '密码至少 6 位', icon: 'none' })
    return
  }
  if (password.value !== confirm.value) {
    appFeedback.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await authService.changePassword({ oldPassword: '', newPassword: password.value })
    // 刷一次本地资料，让 hasPassword 等状态立即同步。
    await userStore.refreshFromServer?.().catch(() => {})
    appFeedback.showToast({ title: '密码设置成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/tabbar/home/index' }), 500)
  } catch (e: any) {
    appFeedback.showToast({ title: e?.message || '设置失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function logout() {
  userStore.logout()
  uni.reLaunch({ url: '/pages/auth/login' })
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
      <view class="hero" :style="{ paddingTop: heroPaddingTop }">
        <view class="blob blob-1" />
        <view class="blob blob-2" />
        <view class="hero-title">设置登录密码</view>
        <view class="hero-sub">请设置 6-32 位密码，之后使用「手机号 + 密码」登录商家工作台</view>

        <view v-if="phoneHint" class="hero-phone">
          <wd-icon :name="$jwIcon('phone')" size="11px" color="rgba(255,255,255,0.9)" />
          <text>{{ phoneHint }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card-head">
          <text class="card-title">新密码</text>
          <text class="card-lead">6-32 位，建议字母 + 数字组合</text>
        </view>

        <view class="field">
          <view class="prefix">
            <wd-icon :name="$jwIcon('lock')" size="16px" color="#86909c" />
          </view>
          <wd-input
            no-border
            v-model="password"
            class="input"
            show-password
            placeholder="请输入新密码"
            placeholder-class="ph"
            maxlength="32"
          />
          <view class="suffix" @click="showPwd = !showPwd">
            <wd-icon :name="$jwIcon(showPwd ? 'eye' : 'eye-off')" size="14px" color="#86909c" />
          </view>
        </view>

        <view class="field">
          <view class="prefix">
            <wd-icon :name="$jwIcon('lock')" size="16px" color="#86909c" />
          </view>
          <wd-input
            no-border
            v-model="confirm"
            class="input"
            show-password
            placeholder="请再次输入新密码"
            placeholder-class="ph"
            maxlength="32"
          />
          <view class="suffix" @click="showConfirm = !showConfirm">
            <wd-icon :name="$jwIcon(showConfirm ? 'eye' : 'eye-off')" size="14px" color="#86909c" />
          </view>
        </view>

        <wd-button
          class="primary"
          :disabled="!canSubmit || submitting"
          @click="submit"
          type="primary"
          size="large"
          block
        >
          <text v-if="!submitting">设置密码并进入商家工作台</text>
          <text v-else>设置中…</text>
        </wd-button>

        <view class="quit" @click="logout">
          <text>暂不设置 · 退出登录</text>
        </view>
      </view>
    </view>
  </wd-config-provider>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 60rpx;
}
.hero {
  position: relative;
  padding: 0 40rpx 120rpx;
  background:
    radial-gradient(120% 70% at 100% 0%, #ff8a5e 0%, transparent 60%),
    linear-gradient(160deg, #ff6b45 0%, #ff4d2d 50%, #e63a1f 100%);
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  overflow: hidden;
  color: #fff;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60rpx);
  opacity: 0.5;
  pointer-events: none;
}
.blob-1 {
  width: 280rpx;
  height: 280rpx;
  background: #ffd6c5;
  top: 20rpx;
  right: -60rpx;
}
.blob-2 {
  width: 220rpx;
  height: 220rpx;
  background: #ffeede;
  top: 200rpx;
  left: -40rpx;
}
.hero-title {
  font-size: 44rpx;
  font-weight: 700;
  margin-top: 60rpx;
  letter-spacing: 1rpx;
}
.hero-sub {
  margin-top: 16rpx;
  font-size: 24rpx;
  opacity: 0.92;
  line-height: 1.5;
}
.hero-phone {
  margin-top: 28rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 36rpx;
  font-size: 24rpx;
}
.card {
  margin: -84rpx 32rpx 0;
  padding: 36rpx 36rpx 32rpx;
  background: var(--bg-card);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(15, 23, 42, 0.06);
  position: relative;
  z-index: 2;
}
.card-head {
  margin-bottom: 24rpx;
}
.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2329;
}
.card-lead {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.field {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: var(--bg-page);
}
.prefix {
  width: 48rpx;
  display: flex;
  justify-content: center;
}
.input {
  flex: 1;
  height: 96rpx;
  font-size: 28rpx;
  color: #1f2329;
}
.ph {
  color: var(--text-disabled);
}
.suffix {
  padding: 0 8rpx;
}
.primary {
  margin-top: 36rpx;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 16rpx;
  border: 0;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  background: linear-gradient(90deg, #ff6b45, #ff4d2d);
  &[disabled] {
    opacity: 0.45;
    background: #c9cdd4;
  }
}
.quit {
  margin-top: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-tertiary);
}
</style>
