<script setup lang="ts">
/**
 * PA · 意见反馈
 *
 * 表单字段：
 *   - type      反馈类型（功能建议 / Bug 反馈 / 体验问题 / 其他）
 *   - content   反馈内容（≥ 10 字）
 *   - contact   联系方式（可选,默认拿当前管理员 phone）
 *   - images    截图（可选,最多 3 张,bizType=feedback）
 *
 * 提交策略（容错降级）:
 *   1. 优先调 `POST /api/v1/p/feedback`（feedbackService.submit,silent）
 *   2. 失败 → 暂存到本地 storage (key: jiujiu_platform_feedback_local),
 *      toast「已收到您的反馈,我们将尽快处理」,避免用户输入丢失
 *
 * 历史草稿：
 *   离开页面前会缓存到 `jiujiu_platform_feedback_draft`,下次进来自动回填,
 *   submit 成功后清空。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { feedbackService, type FeedbackDto } from '../../services'
import { useAdminStore } from '../../store/admin'
import { BASE_URL, PLATFORM_TOKEN_KEY } from '../../utils/request'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const DRAFT_KEY = 'jiujiu_platform_feedback_draft'
const LOCAL_FALLBACK_KEY = 'jiujiu_platform_feedback_local'

// 后端 platform.service.submitFeedback validTypes = ['suggestion','bug','experience','other'],
// 任何其它值会被悄悄改成 'other' 落库。这里"功能建议"对齐为 suggestion。
const TYPE_OPTIONS: { key: FeedbackDto['type']; label: string; icon: string; tint: string }[] = [
  { key: 'suggestion', label: '功能建议', icon: 'sparkles', tint: '#1296DB' },
  { key: 'bug', label: 'Bug 反馈', icon: 'info', tint: '#FF3B30' },
  { key: 'experience', label: '体验问题', icon: 'heart', tint: '#FF7A45' },
  { key: 'other', label: '其他', icon: 'message', tint: '#86909C' },
]

const adminStore = useAdminStore()

const type = ref<FeedbackDto['type']>('suggestion')
const content = ref('')
const contact = ref('')
const images = ref<string[]>([])
const submitting = ref(false)
const uploading = ref(false)

const contentLen = computed(() => content.value.trim().length)
const canSubmit = computed(
  () => contentLen.value >= 10 && !!type.value && !submitting.value && !uploading.value,
)

function ensureContactDefault() {
  if (contact.value) return
  const phone = adminStore.admin?.phone || ''
  if (phone) contact.value = phone
}

function loadDraft() {
  try {
    const raw = uni.getStorageSync(DRAFT_KEY)
    if (!raw) return
    const draft = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (draft?.type) type.value = draft.type
    if (typeof draft?.content === 'string') content.value = draft.content
    if (typeof draft?.contact === 'string') contact.value = draft.contact
    if (Array.isArray(draft?.images)) images.value = draft.images
  } catch {
    /* ignore */
  }
}

function saveDraft() {
  try {
    if (!content.value && images.value.length === 0) {
      uni.removeStorageSync(DRAFT_KEY)
      return
    }
    uni.setStorageSync(
      DRAFT_KEY,
      JSON.stringify({
        type: type.value,
        content: content.value,
        contact: contact.value,
        images: images.value,
      }),
    )
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    uni.removeStorageSync(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

function chooseImage() {
  const remain = 3 - images.value.length
  if (remain <= 0) {
    uni.showToast({ title: '最多上传 3 张', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const paths = (res as { tempFilePaths: string[] }).tempFilePaths || []
      if (paths.length === 0) return
      uploading.value = true
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        for (const p of paths) {
          if (images.value.length >= 3) break
          const url = await uploadOne(p)
          if (url) images.value.push(url)
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '部分图片上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
        uploading.value = false
      }
    },
  })
}

function uploadOne(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let token = ''
    try {
      token = uni.getStorageSync(PLATFORM_TOKEN_KEY) || ''
    } catch {
      /* ignore */
    }
    uni.uploadFile({
      url: BASE_URL + '/api/v1/files/upload',
      filePath,
      name: 'file',
      formData: { bizType: 'feedback' },
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (r: any) => {
        try {
          const body = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
          if (body?.code === 0 && (body?.data?.url || body?.data?.path)) {
            resolve(body.data.url || body.data.path)
          } else {
            reject(new Error(body?.message || '上传失败'))
          }
        } catch {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err: any) => reject(new Error(err?.errMsg || '上传失败,请检查网络')),
    })
  })
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

function previewImage(idx: number) {
  uni.previewImage({
    urls: images.value,
    current: images.value[idx],
  })
}

function pushLocal(dto: FeedbackDto) {
  try {
    const rawHistory = uni.getStorageSync(LOCAL_FALLBACK_KEY)
    const arr: any[] = rawHistory
      ? typeof rawHistory === 'string'
        ? JSON.parse(rawHistory)
        : rawHistory
      : []
    arr.unshift({
      ...dto,
      pendingSync: true,
      createdAt: new Date().toISOString(),
    })
    while (arr.length > 50) arr.pop()
    uni.setStorageSync(LOCAL_FALLBACK_KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

async function submit() {
  if (!canSubmit.value) {
    if (contentLen.value < 10) {
      uni.showToast({ title: '请至少写 10 个字哦', icon: 'none' })
    }
    return
  }
  submitting.value = true
  const dto: FeedbackDto = {
    type: type.value,
    content: content.value.trim(),
    contact: contact.value.trim() || undefined,
    images: images.value.length ? [...images.value] : undefined,
  }
  uni.showLoading({ title: '提交中…', mask: true })
  try {
    await feedbackService.submit(dto)
    uni.hideLoading()
    uni.showToast({ title: '已提交,感谢您的反馈', icon: 'success' })
    clearDraft()
    setTimeout(() => uni.navigateBack({ delta: 1, fail: () => {} }), 800)
  } catch {
    pushLocal(dto)
    uni.hideLoading()
    uni.showToast({
      title: '已收到您的反馈,我们将尽快处理',
      icon: 'none',
      duration: 1800,
    })
    clearDraft()
    setTimeout(() => uni.navigateBack({ delta: 1, fail: () => {} }), 1200)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDraft()
  ensureContactDefault()
})

onBeforeUnmount(saveDraft)
</script>

<template>
  <view class="page">
    <NavBar title="意见反馈" />

    <scroll-view scroll-y class="scroll">
      <!-- 顶部说明 -->
      <view class="banner">
        <view class="banner-icon">
          <Icon name="thumb-up" :size="36" color="#fff" />
        </view>
        <view class="banner-text">
          <text class="bt-title">您的反馈,我们用心倾听</text>
          <text class="bt-desc">提交后由平台运营/产品同步处理,可在「我的-工单」追溯进度</text>
        </view>
      </view>

      <!-- 反馈类型 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">反馈类型</text>
          <text class="card-req">必选</text>
        </view>
        <view class="type-grid">
          <view
            v-for="opt in TYPE_OPTIONS"
            :key="opt.key"
            :class="['type-card', type === opt.key ? 'active' : '']"
            @click="type = opt.key"
          >
            <view class="t-icon" :style="{ background: opt.tint + '18' }">
              <Icon :name="opt.icon" :size="32" :color="opt.tint" />
            </view>
            <text class="t-label">{{ opt.label }}</text>
            <view v-if="type === opt.key" class="t-check">
              <Icon name="check" :size="20" color="#fff" />
            </view>
          </view>
        </view>
      </view>

      <!-- 反馈内容 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">反馈内容</text>
          <text :class="['card-req', contentLen >= 10 ? 'ok' : '']"> {{ contentLen }}/10+ </text>
        </view>
        <textarea
          v-model="content"
          class="content-input"
          placeholder="请详细描述您遇到的问题/建议（至少 10 字）"
          maxlength="500"
          auto-height
          :cursor-spacing="20"
        />
      </view>

      <!-- 联系方式 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">联系方式</text>
          <text class="card-req opt">选填</text>
        </view>
        <input
          v-model="contact"
          class="contact-input"
          placeholder="手机 / 微信 / 邮箱（默认使用账号手机号）"
          maxlength="64"
        />
      </view>

      <!-- 截图上传 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">附件截图</text>
          <text class="card-req opt">最多 3 张 · 选填</text>
        </view>
        <view class="img-grid">
          <view v-for="(url, i) in images" :key="url + i" class="img-cell">
            <image :src="url" mode="aspectFill" class="thumb" @click="previewImage(i)" />
            <view class="img-del" @click="removeImage(i)">
              <Icon name="close" :size="20" color="#fff" />
            </view>
          </view>
          <view v-if="images.length < 3" class="img-add" @click="chooseImage">
            <Icon
              :name="uploading ? 'refresh' : 'image-plus'"
              :size="40"
              color="var(--text-tertiary)"
            />
            <text>{{ uploading ? '上传中…' : '添加图片' }}</text>
          </view>
        </view>
      </view>

      <view class="tip">
        <Icon name="info" :size="22" color="var(--text-tertiary)" />
        <text>反馈内容会同步至运营团队,处理结果将在 1-3 个工作日内回复</text>
      </view>

      <view style="height: 220rpx" />
    </scroll-view>

    <!-- 底部提交 -->
    <view class="ft">
      <view :class="['ft-btn', !canSubmit ? 'disabled' : '']" @click="submit">
        {{ submitting ? '提交中…' : '提交反馈' }}
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 24rpx 0;
  box-sizing: border-box;
}

/* === Banner === */
.banner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
  color: #fff;
  border-radius: 20rpx;
  box-shadow: 0 6rpx 18rpx rgba(255, 77, 45, 0.24);
  .banner-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .banner-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .bt-title {
      font-size: 28rpx;
      font-weight: 800;
      letter-spacing: 1rpx;
    }
    .bt-desc {
      font-size: 22rpx;
      opacity: 0.88;
      line-height: 1.4;
    }
  }
}

/* === 卡片公共 === */
.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
}
.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .card-title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .card-req {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
    &.opt {
      color: var(--text-tertiary);
      font-weight: 500;
    }
    &.ok {
      color: #52c41a;
    }
  }
}

/* === 类型卡 === */
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.type-card {
  position: relative;
  background: var(--bg-page);
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  padding: 20rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  &.active {
    border-color: var(--brand-primary);
    background: rgba(255, 77, 45, 0.06);
  }
  .t-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .t-label {
    font-size: 24rpx;
    color: var(--text-primary);
    font-weight: 600;
  }
  .t-check {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: var(--brand-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* === 内容输入 === */
.content-input {
  width: 100%;
  min-height: 240rpx;
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.55;
  color: var(--text-primary);
  box-sizing: border-box;
}
.contact-input {
  width: 100%;
  height: 80rpx;
  padding: 0 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

/* === 图片网格 === */
.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}
.img-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--bg-page);
  .thumb {
    width: 100%;
    height: 100%;
    display: block;
  }
  .img-del {
    position: absolute;
    top: 6rpx;
    right: 6rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.img-add {
  aspect-ratio: 1;
  background: var(--bg-page);
  border: 2rpx dashed var(--border-light);
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
  &:active {
    background: #f0f1f3;
  }
}

/* === 底部提示 === */
.tip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}

/* === 底部按钮 === */
.ft {
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-light);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.ft-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  &.disabled {
    opacity: 0.5;
    box-shadow: none;
  }
}
</style>
