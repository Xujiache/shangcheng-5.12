<script setup lang="ts">
/**
 * 平台管理 · 登录页
 *
 * 仅账号密码登录（B 端高权限）
 */
import { ref, computed } from 'vue'
import { useAdminStore } from '../../store/admin'
import { platformAuthService } from '../../services/auth'

const adminStore = useAdminStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const showPwd = ref(false)
const agreed = ref(true)

const canSubmit = computed(() => username.value.trim().length >= 3 && password.value.length >= 6)

async function onLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意管理员守则', icon: 'none' })
    return
  }
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写账号与密码（≥6位）', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const session = await platformAuthService.adminLogin({
      username: username.value.trim(),
      password: password.value,
    })
    const role = (session as any).user?.role
    if (role !== 'platform' && role !== 'admin' && role !== 'super-admin') {
      uni.showToast({ title: '当前账号无平台访问权限', icon: 'none' })
      return
    }
    adminStore.setSession(session as any)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/tabbar/home/index' }), 500)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <view class="page">
    <view class="bg-deco" />

    <view class="header">
      <view class="logo">经纬科技</view>
      <text class="title">平台管理后台</text>
      <text class="subtitle">Powered by 经纬科技 · Platform Console</text>
    </view>

    <view class="card">
      <view class="card-head">
        <text class="card-title">管理员登录</text>
        <text class="card-tip">仅授权人员可访问</text>
      </view>

      <view class="field">
        <view class="label-row">
          <text class="label">账号</text>
        </view>
        <view class="input-wrap">
          <text class="prefix-icon">@</text>
          <input v-model="username" class="input" placeholder="邮箱 / 工号" />
        </view>
      </view>

      <view class="field">
        <view class="label-row">
          <text class="label">密码</text>
          <text class="forgot">忘记密码</text>
        </view>
        <view class="input-wrap">
          <text class="prefix-icon">密</text>
          <input
            v-model="password"
            class="input"
            :password="!showPwd"
            placeholder="6 位以上"
          />
          <text class="suffix-toggle" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
        </view>
      </view>

      <view class="agree-row">
        <view :class="['check', agreed && 'on']" @click="agreed = !agreed" />
        <text class="agree-text" @click="agreed = !agreed">
          我已阅读并同意 <text class="hl">《管理员守则》</text>
        </text>
      </view>

      <button
        :class="['submit', (!canSubmit || loading) && 'disabled']"
        :disabled="!canSubmit || loading"
        @click="onLogin"
      >{{ loading ? '登录中…' : '登 录' }}</button>
    </view>

    <view class="footer">
      <text class="copyright">© 2026 经纬科技 · 平台管理</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #0E1320;
  position: relative;
  overflow: hidden;
  padding: 120rpx 40rpx 40rpx;
  box-sizing: border-box;
}
.bg-deco {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 10%, rgba(255,77,45,0.25) 0%, transparent 50%),
    radial-gradient(circle at 90% 100%, rgba(255,156,110,0.18) 0%, transparent 55%);
  pointer-events: none;
}
.header {
  text-align: center;
  margin-bottom: 56rpx;
  position: relative;
  z-index: 1;
}
.logo {
  display: inline-block;
  font-size: 64rpx;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #FF6B45 0%, #FF4D2D 100%);
  width: 160rpx;
  height: 160rpx;
  line-height: 160rpx;
  border-radius: 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(255,77,45,0.4);
  letter-spacing: 4rpx;
}
.title {
  display: block;
  margin-top: 24rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}
.subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(255,255,255,0.45);
  font-family: var(--font-family-base);
}
.card {
  position: relative;
  z-index: 1;
  background: rgba(255,255,255,0.98);
  border-radius: 32rpx;
  padding: 48rpx 32rpx 32rpx;
  box-shadow: 0 32rpx 64rpx rgba(0,0,0,0.4);
}
.card-head {
  margin-bottom: 32rpx;
  .card-title {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    color: #1d2129;
  }
  .card-tip {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #86909c;
  }
}
.field {
  margin-bottom: 24rpx;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  .label {
    font-size: 24rpx;
    color: #4e5969;
    font-weight: 600;
  }
  .forgot {
    font-size: 24rpx;
    color: #FF4D2D;
  }
}
.input-wrap {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  background: #f7f8fa;
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  transition: all 0.2s;
  &:focus-within {
    border-color: #FF4D2D;
    background: #fff;
  }
  .prefix-icon {
    font-size: 32rpx;
    color: #86909c;
    margin-right: 12rpx;
    width: 40rpx;
    text-align: center;
  }
  .input {
    flex: 1;
    height: 100%;
    font-size: 30rpx;
    color: #1d2129;
  }
  .suffix-toggle {
    font-size: 24rpx;
    color: #FF4D2D;
    padding: 8rpx 16rpx;
    margin-left: 8rpx;
  }
}
.agree-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 8rpx 0 32rpx;
  .check {
    width: 32rpx;
    height: 32rpx;
    border: 2rpx solid #c9cdd4;
    border-radius: 50%;
    transition: all 0.2s;
    flex-shrink: 0;
    &.on {
      background: #FF4D2D;
      border-color: #FF4D2D;
      box-shadow: inset 0 0 0 4rpx #fff, 0 0 0 1rpx #FF4D2D;
    }
  }
  .agree-text {
    font-size: 24rpx;
    color: #86909c;
    .hl { color: #FF4D2D; }
  }
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
  border-radius: 16rpx;
  border: none;
  box-shadow: 0 12rpx 24rpx rgba(255,77,45,0.4);
  &.disabled, &[disabled] {
    opacity: 0.5;
    box-shadow: none;
  }
  &::after { border: none; }
}
.footer {
  position: relative;
  z-index: 1;
  margin-top: 64rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .copyright {
    font-size: 22rpx;
    color: rgba(255,255,255,0.5);
  }
  .version {
    font-size: 20rpx;
    color: rgba(255,255,255,0.3);
    font-family: var(--font-family-base);
  }
}
</style>
