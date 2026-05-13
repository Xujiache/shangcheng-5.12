<script setup lang="ts">
/**
 * UM · 个人信息编辑
 *
 * 从「我的」tab 顶部信息卡片点击进入。
 * 支持改：头像 / 昵称 / 性别 / 邮箱
 * 保存后立即调 PATCH /u/profile，后端通过 WS 广播给同账号所有在线设备。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

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

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (r: any) => {
      const tempPath = r.tempFilePaths?.[0]
      if (!tempPath) return
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        // 上传到后端 /api/v1/files/upload，复用已有公共上传通道
        const uploadRes = await new Promise<{ url: string }>((resolve, reject) => {
          uni.uploadFile({
            url: 'https://ewsn.top/api/v1/files/upload',
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
        <input
          v-model="form.email"
          class="input"
          placeholder="可选，用于接收通知"
          maxlength="60"
        />
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
</style>
