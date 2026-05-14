<script setup lang="ts">
/**
 * UM-13 · 商家入驻申请
 * 还原 原型图/user-mini.jsx::UM_JoinApply
 * - 欢迎语 + 流程
 * - 角色二选一（厂家 / 门店）→ 映射后端 type 字段
 * - 主体名称 / 法人 / 统一社会信用代码 / 联系人/电话 / 区域 / 详细地址
 * - 营业执照（必传，先上传得 URL 再放入 businessLicense）
 * - 资质照片（可选，多张，每张上传后追加进 qualifications）
 * - 经营品类
 *
 * 字段对齐后端 user-mp.controller.ts @Post('merchant-apply') → user-mp.service.ts merchantApply：
 *   type / name / legalName / creditCode / legalRep / contact / contactPhone /
 *   region / address / businessLicense(url) / qualifications(url[]) / categories(string[])
 */
import { ref } from 'vue'
import { merchantApplyService } from '../../services'
import { useUserStore } from '../../store/user'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const userStore = useUserStore()

const CATEGORIES = ['家具', '灯具', '布艺', '厨卫', '摆件', '建材', '家电', '定制']

// 文件上传地址（与 me/edit.vue / merchant-app 的 profile 保持一致，直连后端 /files/upload）
const UPLOAD_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://ewsn.top')

const form = ref({
  type: 'factory' as 'factory' | 'store',
  name: '',
  legalName: '',
  creditCode: '',
  legalRep: '',
  contact: '',
  contactPhone: '',
  region: '',
  address: '',
  // 营业执照（必传，单张）—— 提交时取 [0] 给后端 businessLicense
  businessLicense: '' as string,
  // 资质照片（可选，最多 4 张）—— 提交时整个数组给后端 qualifications
  qualifications: [] as string[],
  categories: ['家具'] as string[],
})
const submitting = ref(false)
const uploading = ref(false)

function pickRole(type: 'factory' | 'store') {
  form.value.type = type
}

/**
 * 选图 → uni.uploadFile → /api/v1/files/upload → 取 data.url
 * 与 me/edit.vue 中头像上传同一段约定。
 */
async function uploadOne(tempPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: UPLOAD_URL + '/api/v1/files/upload',
      filePath: tempPath,
      name: 'file',
      header: userStore.accessToken
        ? { Authorization: `Bearer ${userStore.accessToken}` }
        : {},
      success: (res: any) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (data?.code === 0 && data?.data?.url) {
            resolve(data.data.url as string)
          } else {
            reject(new Error(data?.message || '上传失败'))
          }
        } catch (e: any) {
          reject(e)
        }
      },
      fail: (err: any) => reject(new Error(err?.errMsg || '上传失败')),
    })
  })
}

function uploadBusinessLicense() {
  if (uploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const tempPath = res.tempFilePaths?.[0]
      if (!tempPath) return
      uploading.value = true
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const url = await uploadOne(tempPath)
        form.value.businessLicense = url
        uni.hideLoading()
        uni.showToast({ title: '已上传执照', icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeBusinessLicense() {
  form.value.businessLicense = ''
}

function uploadQualification() {
  if (uploading.value) return
  const remain = 4 - form.value.qualifications.length
  if (remain <= 0) {
    uni.showToast({ title: '资质照片最多 4 张', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: async (res) => {
      const paths = res.tempFilePaths || []
      if (paths.length === 0) return
      uploading.value = true
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const urls: string[] = []
        for (const p of paths) {
          urls.push(await uploadOne(p))
        }
        form.value.qualifications.push(...urls)
        uni.hideLoading()
        uni.showToast({ title: `已上传 ${urls.length} 张`, icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeQualification(i: number) {
  form.value.qualifications.splice(i, 1)
}

function toggleCategory(c: string) {
  const idx = form.value.categories.indexOf(c)
  if (idx >= 0) form.value.categories.splice(idx, 1)
  else form.value.categories.push(c)
}

async function submit() {
  if (!form.value.name) return uni.showToast({ title: '请填写主体名称', icon: 'none' })
  if (!form.value.legalRep) return uni.showToast({ title: '请填写法人姓名', icon: 'none' })
  if (!form.value.contact) return uni.showToast({ title: '请填写联系人', icon: 'none' })
  if (!/^1[3-9]\d{9}$/.test(form.value.contactPhone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  if (!form.value.region) return uni.showToast({ title: '请填写所在区域（省/市/区）', icon: 'none' })
  if (!form.value.address) return uni.showToast({ title: '请填写详细地址', icon: 'none' })
  if (!form.value.businessLicense) return uni.showToast({ title: '请上传营业执照', icon: 'none' })
  if (form.value.categories.length === 0) return uni.showToast({ title: '请选择至少一个经营品类', icon: 'none' })

  submitting.value = true
  try {
    await merchantApplyService.submit({
      type: form.value.type,
      name: form.value.name,
      legalName: form.value.legalName || form.value.name,
      creditCode: form.value.creditCode,
      legalRep: form.value.legalRep,
      contact: form.value.contact,
      contactPhone: form.value.contactPhone,
      region: form.value.region,
      address: form.value.address,
      businessLicense: form.value.businessLicense,
      qualifications: form.value.qualifications,
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
          :class="['role-card', form.type === 'factory' ? 'active' : '']"
          @click="pickRole('factory')"
        >
          <view class="role-icon">
            <Icon name="factory" :size="56" :color="form.type === 'factory' ? '#fff' : 'var(--brand-primary)'" />
          </view>
          <text class="role-title">申请为厂家</text>
          <text class="role-desc">可被门店申请代理</text>
          <view :class="['role-btn', form.type === 'factory' ? 'on' : '']">
            {{ form.type === 'factory' ? '已选' : '选择' }}
          </view>
        </view>

        <view
          :class="['role-card', form.type === 'store' ? 'active' : '']"
          @click="pickRole('store')"
        >
          <view class="role-icon">
            <Icon name="home-shop" :size="56" :color="form.type === 'store' ? '#fff' : 'var(--brand-primary)'" />
          </view>
          <text class="role-title">申请为门店</text>
          <text class="role-desc">代理厂家商品销售</text>
          <view :class="['role-btn', form.type === 'store' ? 'on' : '']">
            {{ form.type === 'store' ? '已选' : '选择' }}
          </view>
        </view>
      </view>

      <!-- 表单 -->
      <view class="form">
        <view class="row">
          <text class="label">主体名称</text>
          <input v-model="form.name" class="input" placeholder="公司 / 个体工商户名称" />
        </view>
        <view class="row">
          <text class="label">法人姓名</text>
          <input v-model="form.legalRep" class="input" placeholder="张三" />
        </view>
        <view class="row">
          <text class="label">法人公司名</text>
          <input v-model="form.legalName" class="input" placeholder="选填，默认与主体名称一致" />
        </view>
        <view class="row">
          <text class="label">统一信用代码</text>
          <input v-model="form.creditCode" class="input" placeholder="18 位社会信用代码（选填）" maxlength="18" />
        </view>
        <view class="row">
          <text class="label">联系人</text>
          <input v-model="form.contact" class="input" placeholder="联系人姓名" />
        </view>
        <view class="row">
          <text class="label">联系电话</text>
          <input v-model="form.contactPhone" class="input" type="number" maxlength="11" placeholder="13800138000" />
        </view>
        <view class="row">
          <text class="label">所在区域</text>
          <input v-model="form.region" class="input" placeholder="如：北京市朝阳区" />
        </view>
        <view class="row">
          <text class="label">详细地址</text>
          <input v-model="form.address" class="input" placeholder="街道 / 门牌号" />
        </view>

        <view class="row col">
          <text class="label">营业执照（必传）</text>
          <view class="upload-grid">
            <view v-if="form.businessLicense" class="upload-img">
              <image :src="form.businessLicense" mode="aspectFill" class="img" />
              <view class="img-close" @click="removeBusinessLicense">
                <Icon name="close" :size="20" color="#fff" />
              </view>
            </view>
            <view v-else class="upload-add" @click="uploadBusinessLicense">
              <Icon name="plus" :size="36" color="var(--text-tertiary)" />
              <text>上传</text>
            </view>
          </view>
        </view>

        <view class="row col">
          <text class="label">资质照片（选填，最多 4 张）</text>
          <view class="upload-grid">
            <view
              v-for="(img, i) in form.qualifications"
              :key="i"
              class="upload-img"
            >
              <image :src="img" mode="aspectFill" class="img" />
              <view class="img-close" @click="removeQualification(i)">
                <Icon name="close" :size="20" color="#fff" />
              </view>
            </view>
            <view v-if="form.qualifications.length < 4" class="upload-add" @click="uploadQualification">
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
