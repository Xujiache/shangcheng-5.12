<script setup lang="ts">
/**
 * UM-13 · 商家入驻申请
 * 还原 原型图/user-mini.jsx::UM_JoinApply
 * - 欢迎语 + 流程
 * - 角色二选一（厂家 / 门店）
 * - 主体名称 / 联系人/电话 / 营业执照 / 经营品类
 * - 提交申请
 */
import { ref } from 'vue'
import { merchantApplyService } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const CATEGORIES = ['家具', '灯具', '布艺', '厨卫', '摆件', '建材', '家电', '定制']

const form = ref({
  role: 'factory' as 'factory' | 'store',
  subject: '',
  contactName: '',
  contactPhone: '',
  licenses: [] as string[],
  categories: ['家具'] as string[],
})
const submitting = ref(false)

function pickRole(role: 'factory' | 'store') {
  form.value.role = role
}

function uploadLicense() {
  uni.chooseImage({
    count: 4 - form.value.licenses.length,
    success: (res) => {
      const paths = res.tempFilePaths
      form.value.licenses.push(...paths)
    },
  })
}

function removeLicense(i: number) {
  form.value.licenses.splice(i, 1)
}

function toggleCategory(c: string) {
  const idx = form.value.categories.indexOf(c)
  if (idx >= 0) form.value.categories.splice(idx, 1)
  else form.value.categories.push(c)
}

async function submit() {
  if (!form.value.subject) return uni.showToast({ title: '请填写主体名称', icon: 'none' })
  if (!form.value.contactName) return uni.showToast({ title: '请填写联系人', icon: 'none' })
  if (!/^1[3-9]\d{9}$/.test(form.value.contactPhone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  if (form.value.licenses.length === 0) return uni.showToast({ title: '请上传营业执照', icon: 'none' })
  if (form.value.categories.length === 0) return uni.showToast({ title: '请选择至少一个经营品类', icon: 'none' })

  submitting.value = true
  try {
    await merchantApplyService.submit({
      role: form.value.role,
      subject: form.value.subject,
      contactName: form.value.contactName,
      contactPhone: form.value.contactPhone,
      licenses: form.value.licenses,
      categories: form.value.categories,
    })
    uni.showModal({
      title: '提交成功',
      content: '我们将在 1-3 个工作日内完成审核，结果将通过短信和站内消息通知您',
      showCancel: false,
      success: () => uni.navigateBack({ delta: 1 }),
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="商家入驻" />

    <scroll-view scroll-y class="scroll">
      <view class="welcome">
        <text class="title">欢迎加入经纬科技</text>
        <view class="flow">
          <text>填写资料</text>
          <Icon name="arrow-right" :size="24" color="var(--text-tertiary)" />
          <text>平台审核</text>
          <Icon name="arrow-right" :size="24" color="var(--text-tertiary)" />
          <text>开店成功</text>
        </view>
      </view>

      <!-- 角色二选一 -->
      <view class="role-grid">
        <view
          :class="['role-card', form.role === 'factory' ? 'active' : '']"
          @click="pickRole('factory')"
        >
          <view class="role-icon">
            <Icon name="factory" :size="56" :color="form.role === 'factory' ? '#fff' : 'var(--brand-primary)'" />
          </view>
          <text class="role-title">申请为厂家</text>
          <text class="role-desc">可被门店申请代理</text>
          <view :class="['role-btn', form.role === 'factory' ? 'on' : '']">
            {{ form.role === 'factory' ? '已选' : '选择' }}
          </view>
        </view>

        <view
          :class="['role-card', form.role === 'store' ? 'active' : '']"
          @click="pickRole('store')"
        >
          <view class="role-icon">
            <Icon name="home-shop" :size="56" :color="form.role === 'store' ? '#fff' : 'var(--brand-primary)'" />
          </view>
          <text class="role-title">申请为门店</text>
          <text class="role-desc">代理厂家商品销售</text>
          <view :class="['role-btn', form.role === 'store' ? 'on' : '']">
            {{ form.role === 'store' ? '已选' : '选择' }}
          </view>
        </view>
      </view>

      <!-- 表单 -->
      <view class="form">
        <view class="row">
          <text class="label">主体名称</text>
          <input v-model="form.subject" class="input" placeholder="公司 / 个体工商户名称" />
        </view>
        <view class="row">
          <text class="label">联系人</text>
          <input v-model="form.contactName" class="input" placeholder="张先生" />
        </view>
        <view class="row">
          <text class="label">联系电话</text>
          <input v-model="form.contactPhone" class="input" type="number" maxlength="11" placeholder="13800138000" />
        </view>
        <view class="row col">
          <text class="label">营业执照</text>
          <view class="upload-grid">
            <view
              v-for="(img, i) in form.licenses"
              :key="i"
              class="upload-img"
            >
              <image :src="img" mode="aspectFill" class="img" />
              <view class="img-close" @click="removeLicense(i)">
                <Icon name="close" :size="20" color="#fff" />
              </view>
            </view>
            <view v-if="form.licenses.length < 4" class="upload-add" @click="uploadLicense">
              <Icon name="plus" :size="36" color="var(--text-tertiary)" />
              <text>上传</text>
            </view>
          </view>
        </view>
        <view class="row col">
          <text class="label">经营品类（可多选）</text>
          <view class="cat-grid">
            <view
              v-for="c in CATEGORIES"
              :key="c"
              :class="['chip', form.categories.includes(c) ? 'active' : '']"
              @click="toggleCategory(c)"
            >{{ c }}</view>
          </view>
        </view>
      </view>

      <view class="ft">
        <view :class="['submit', submitting ? 'loading' : '']" @click="submit">
          {{ submitting ? '提交中…' : '提交申请' }}
        </view>
        <text class="tip">预计 1-3 个工作日内完成审核</text>
      </view>
      <view style="height: 40rpx;" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}
.scroll { flex: 1; height: 0; }
.welcome {
  padding: 32rpx 24rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  .title {
    font-size: 40rpx;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 1rpx;
  }
  .flow {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 24rpx;
    color: var(--text-tertiary);
  }
}
.role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin: 0 24rpx;
}
.role-card {
  position: relative;
  padding: 32rpx 24rpx;
  background: var(--bg-card);
  border: 2rpx dashed var(--border-default);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all .2s;
  &.active {
    background: $brand-gradient;
    border-color: transparent;
    color: #fff;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
    .role-title, .role-desc { color: #fff; }
  }
  .role-icon {
    margin-bottom: 12rpx;
  }
  .role-title { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
  .role-desc { font-size: 22rpx; color: var(--text-tertiary); }
  .role-btn {
    margin-top: 12rpx;
    padding: 8rpx 24rpx;
    border: 1rpx solid currentColor;
    border-radius: 999rpx;
    font-size: 24rpx;
    font-weight: 600;
    &.on {
      background: rgba(255,255,255,0.25);
      border-color: transparent;
    }
  }
}
.form {
  margin: 16rpx 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.row {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child { border-bottom: none; }
  &.col {
    flex-direction: column;
    align-items: stretch;
    gap: 12rpx;
  }
  .label {
    width: 160rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
  .input {
    flex: 1;
    height: 56rpx;
    font-size: 28rpx;
    text-align: right;
  }
}
.upload-grid {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.upload-img, .upload-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  position: relative;
}
.upload-img {
  background: var(--bg-page);
  border: 1rpx solid var(--border-default);
  overflow: hidden;
  .img { width: 100%; height: 100%; display: block; }
  .img-close {
    position: absolute;
    top: 4rpx;
    right: 4rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.upload-add {
  border: 2rpx dashed var(--border-default);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
}
.cat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .chip {
    padding: 8rpx 24rpx;
    border: 1rpx solid var(--border-default);
    border-radius: 999rpx;
    font-size: 24rpx;
    color: var(--text-primary);
    background: var(--bg-card);
    &.active {
      background: $brand-gradient;
      border-color: transparent;
      color: #fff;
    }
  }
}
.ft {
  margin: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  .submit {
    width: 100%;
    height: 96rpx;
    line-height: 96rpx;
    text-align: center;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 32rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
    &.loading { opacity: 0.7; }
  }
  .tip { font-size: 22rpx; color: var(--text-tertiary); }
}
</style>
