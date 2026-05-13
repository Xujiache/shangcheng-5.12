<script setup lang="ts">
/**
 * 个人信息 · 编辑页（v2）
 *
 * 来源：me/index.vue → 点"个人信息" → 进本页
 * 字段：头像 / 店名 / 商户号(只读) / 联系手机 / 邮箱 / 经营品类 / 联系地址 / 联系人 / 简介
 *
 * v2 变化：
 *   - 增加头像编辑（uni.chooseImage + uni.uploadFile）
 *   - 去掉 localStorage 缓存路径，资料一律以后端为单一真源
 *   - 保存成功后 emit profile-changed（自定义 event）+ 设个全局 flag，
 *     me/index 和 home 都 onShow 时重新拉一次，避免分享出去的店铺信息和实际不一致
 */
import { ref, computed, onMounted, reactive } from 'vue'
import Icon from '../../components/icon/icon.vue'
import { profileService, type MerchantProfile } from '../../services/profile'
import { useUserStore } from '../../store'
import { useTencentMap } from '../../composables/useTencentMap'
import { useStatusBar } from '../../composables/useStatusBar'

const userStore = useUserStore()
const { heroPaddingTop } = useStatusBar(24)
const tmap = useTencentMap()
const showMapPick = ref(false)
const mapPickKeyword = ref('')
const mapPickResults = ref<{ lat: number; lng: number; name?: string; address?: string }[]>([])

const DEFAULT_PROFILE: MerchantProfile = {
  shopName: '',
  merchantNo: '',
  contactPhone: '',
  email: '',
  categories: [],
  address: '',
  contactName: '',
  description: '',
  avatar: '',
}

const CATEGORY_OPTIONS = [
  '家具',
  '灯具',
  '布艺',
  '家居',
  '建材',
  '厨卫',
  '家电',
  '装饰',
  '办公',
  '户外',
] as const

const form = reactive<MerchantProfile>({ ...DEFAULT_PROFILE })
const original = ref<MerchantProfile>({ ...DEFAULT_PROFILE })
const showCategoryPicker = ref(false)
const uploadingAvatar = ref(false)

async function loadProfile() {
  try {
    const data = await profileService.get()
    Object.assign(form, { ...DEFAULT_PROFILE, ...data })
    original.value = { ...form }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  }
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (r: any) => {
      const tempPath = r.tempFilePaths?.[0]
      if (!tempPath) return
      uploadingAvatar.value = true
      uni.showLoading({ title: '上传中…', mask: true })
      try {
        const uploadRes = await new Promise<{ url: string }>((resolve, reject) => {
          uni.uploadFile({
            url: 'https://ewsn.top/api/v1/files/upload',
            filePath: tempPath,
            name: 'file',
            header: { Authorization: `Bearer ${userStore.accessToken}` },
            success: (res: any) => {
              try {
                const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                if (data?.code === 0 && data?.data?.url) resolve({ url: data.data.url })
                else reject(new Error(data?.message || '上传失败'))
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
      } finally {
        uploadingAvatar.value = false
      }
    },
  })
}

function pickAddressOnMap() {
  // #ifdef MP-WEIXIN
  uni.chooseLocation({
    success: (res: any) => {
      const v = [res.name, res.address].filter(Boolean).join(' · ')
      if (v) form.address = v
    },
  })
  return
  // #endif
  showMapPick.value = true
  mapPickKeyword.value = form.address || form.shopName || ''
  doMapSearch()
}

async function doMapSearch() {
  const kw = mapPickKeyword.value.trim()
  if (!kw) return
  mapPickResults.value = await tmap.searchPlaces(kw)
}

function pickMapResult(item: { lat: number; lng: number; name?: string; address?: string }) {
  const v = [item.name, item.address].filter(Boolean).join(' · ')
  if (v) form.address = v
  showMapPick.value = false
}

async function saveProfile() {
  if (!form.shopName.trim()) {
    uni.showToast({ title: '请填写店名', icon: 'none' })
    return
  }
  if (form.contactPhone && !/^[\d\s+\-*()]+$/.test(form.contactPhone)) {
    uni.showToast({ title: '联系手机格式不对', icon: 'none' })
    return
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    uni.showToast({ title: '邮箱格式不对', icon: 'none' })
    return
  }
  if (!form.categories.length) {
    uni.showToast({ title: '至少选择 1 个经营品类', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中…' })
  try {
    const updated = await profileService.update({
      shopName: form.shopName,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      email: form.email,
      categories: form.categories,
      address: form.address,
      description: form.description,
      avatar: form.avatar,
    })
    Object.assign(form, { ...DEFAULT_PROFILE, ...updated })
    original.value = { ...form }
    // 通知其他页面（home / me/index）：店铺信息已变，下次 onShow 强制刷新
    try { uni.setStorageSync('merchant_profile_changed_at', Date.now()) } catch {}
    uni.hideLoading()
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  }
}

const hasChange = computed(
  () => JSON.stringify(form) !== JSON.stringify(original.value)
)

function toggleCategory(c: string) {
  const idx = form.categories.indexOf(c)
  if (idx >= 0) form.categories.splice(idx, 1)
  else form.categories.push(c)
}

onMounted(loadProfile)
</script>

<template>
  <view class="page">
    <!-- Hero · 渐变 + 头像 + 头部信息 -->
    <view class="hero" :style="{ paddingTop: heroPaddingTop }">
      <view class="hero-top">
        <view class="back-btn" @click="() => uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/tabbar/me/index' }) })">
          <Icon name="back" :size="32" color="#fff" />
        </view>
        <text class="hero-title">个人信息</text>
        <view class="back-btn placeholder" />
      </view>
      <view class="avatar-block" @click="chooseAvatar">
        <view class="avatar-ring">
          <image v-if="form.avatar" :src="form.avatar" class="avatar-img" mode="aspectFill" />
          <view v-else class="avatar avatar-placeholder">
            <text>{{ form.shopName.slice(0, 1) || '?' }}</text>
          </view>
          <view class="avatar-edit-badge">
            <Icon name="camera" :size="22" color="#fff" />
          </view>
        </view>
        <text class="hero-name">{{ form.shopName || '未命名店铺' }}</text>
        <text class="hero-no">商户号 {{ form.merchantNo || '--' }}</text>
      </view>
    </view>

    <!-- 基础信息 -->
    <view class="card">
      <view class="section-head">
        <view class="section-bar" />
        <text class="section-title">基础信息</text>
      </view>

      <view class="field-block">
        <text class="label">店名</text>
        <view class="field">
          <view class="prefix"><Icon name="biz-shop-decorate" :size="32" color="#86909c" /></view>
          <input v-model="form.shopName" class="input" placeholder="请输入店名" placeholder-class="ph" maxlength="40" />
        </view>
      </view>

      <view class="field-block">
        <text class="label">商户号</text>
        <view class="field field-readonly">
          <view class="prefix"><Icon name="biz-receipt" :size="32" color="#c9cdd4" /></view>
          <text class="readonly-text">{{ form.merchantNo || '--' }}</text>
          <text class="readonly-hint">系统生成</text>
        </view>
      </view>

      <view class="field-block">
        <text class="label">联系人</text>
        <view class="field">
          <view class="prefix"><Icon name="biz-me" :size="32" color="#86909c" /></view>
          <input v-model="form.contactName" class="input" placeholder="请输入联系人" placeholder-class="ph" maxlength="20" />
        </view>
      </view>

      <view class="field-block">
        <text class="label">联系手机</text>
        <view class="field">
          <view class="prefix"><Icon name="phone" :size="32" color="#86909c" /></view>
          <input v-model="form.contactPhone" class="input" placeholder="例：13912345678" placeholder-class="ph" maxlength="20" type="number" />
        </view>
      </view>

      <view class="field-block">
        <text class="label">邮箱</text>
        <view class="field">
          <view class="prefix"><Icon name="mail" :size="32" color="#86909c" /></view>
          <input v-model="form.email" class="input" placeholder="例：contact@example.com" placeholder-class="ph" maxlength="60" />
        </view>
      </view>
    </view>

    <!-- 经营信息 -->
    <view class="card">
      <view class="section-head">
        <view class="section-bar" />
        <text class="section-title">经营信息</text>
      </view>

      <view class="field-block">
        <text class="label">
          经营品类
          <text class="label-hint">（多选）</text>
        </text>
        <view class="cat-selector" @click="showCategoryPicker = true">
          <view v-if="form.categories.length" class="cat-tags">
            <view v-for="c in form.categories" :key="c" class="cat-chip">{{ c }}</view>
          </view>
          <text v-else class="cat-placeholder">点击选择经营品类</text>
          <Icon name="forward" :size="24" color="#c9cdd4" />
        </view>
      </view>

      <view class="field-block">
        <text class="label">联系地址</text>
        <view class="field">
          <view class="prefix"><Icon name="location" :size="32" color="#86909c" /></view>
          <input v-model="form.address" class="input" placeholder="详细地址" placeholder-class="ph" maxlength="100" />
        </view>
        <view class="map-btn" @click="pickAddressOnMap">
          <Icon name="location" :size="28" color="#FF4D2D" />
          <text>在地图上选位置 / 搜索 POI</text>
          <Icon name="forward" :size="22" color="#FF4D2D" />
        </view>
      </view>

      <view class="field-block">
        <text class="label">店铺简介</text>
        <view class="textarea-wrap">
          <textarea
            v-model="form.description"
            class="textarea"
            placeholder="一句话介绍你的店铺，让客户更了解你"
            placeholder-class="ph"
            :maxlength="160"
            auto-height
          />
          <text class="count">{{ form.description.length }} / 160</text>
        </view>
      </view>
    </view>

    <!-- 浮动保存按钮 -->
    <view class="save-dock">
      <button
        class="btn-save"
        :class="{ 'btn-save--active': hasChange }"
        :disabled="!hasChange"
        @click="saveProfile"
      >
        {{ hasChange ? '保存修改' : '未做修改' }}
      </button>
    </view>
    <view class="safe-bottom" />

    <!-- 经营品类多选弹层 -->
    <view v-if="showCategoryPicker" class="picker-mask" @click="showCategoryPicker = false">
      <view class="picker" @click.stop>
        <view class="picker-head">
          <text class="picker-title">选择经营品类（多选）</text>
          <text class="picker-close" @click="showCategoryPicker = false">完成</text>
        </view>
        <view class="picker-body">
          <view
            v-for="c in CATEGORY_OPTIONS"
            :key="c"
            class="picker-item"
            :class="{ 'picker-item--active': form.categories.includes(c) }"
            @click="toggleCategory(c)"
          >
            <text>{{ c }}</text>
            <Icon v-if="form.categories.includes(c)" name="check" :size="28" color="#FF4D2D" />
          </view>
        </view>
      </view>
    </view>

    <!-- #ifndef MP-WEIXIN -->
    <view v-if="showMapPick" class="mpick-mask" @click="showMapPick = false">
      <view class="mpick-sheet" @click.stop>
        <view class="mpick-head">
          <text class="mpick-title">地图选址</text>
          <text class="mpick-close" @click="showMapPick = false">关闭</text>
        </view>
        <view class="mpick-search">
          <input
            v-model="mapPickKeyword"
            class="mpick-input"
            placeholder="输入小区 / 楼宇 / 地址关键词"
            confirm-type="search"
            @confirm="doMapSearch"
          />
          <view class="mpick-btn" @click="doMapSearch">搜索</view>
        </view>
        <scroll-view scroll-y class="mpick-list">
          <view v-if="!mapPickResults.length" class="mpick-empty">
            <text>输入关键词后点搜索</text>
          </view>
          <view
            v-for="(r, i) in mapPickResults"
            :key="`${r.lat}-${r.lng}-${i}`"
            class="mpick-item"
            @click="pickMapResult(r)"
          >
            <Icon name="location-pin" :size="32" color="#FF4D2D" />
            <view class="mpick-item-info">
              <text class="mpick-item-name">{{ r.name || '未命名' }}</text>
              <text class="mpick-item-addr">{{ r.address || '' }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page, #f7f8fa);
  padding-bottom: 240rpx;
}

/* ===== Hero ===== */
.hero {
  background:
    radial-gradient(120% 80% at 100% 0%, #FF8A5E 0%, transparent 60%),
    linear-gradient(160deg, #FF6B45 0%, #FF4D2D 50%, #E63A1F 100%);
  padding: 0 32rpx 64rpx;
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;
  position: relative;
  overflow: hidden;
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.back-btn.placeholder {
  background: transparent;
  border-color: transparent;
}
.hero-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
}

.avatar-block {
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.avatar-ring {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  padding: 6rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.15));
  border: 3rpx solid rgba(255,255,255,0.4);
  box-shadow: 0 12rpx 32rpx rgba(0,0,0,0.18);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  &:active { transform: scale(0.96); }
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff, #FFE6DC);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar text {
  font-size: 64rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #FF6B45, #E63A1F);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.avatar-edit-badge {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  background: #FF4D2D;
  border: 3rpx solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.2);
}
.hero-name {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1rpx;
  margin-top: 8rpx;
}
.hero-no {
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
  letter-spacing: 1rpx;
}

/* ===== 卡片 + Section ===== */
.card {
  margin: 24rpx 28rpx 0;
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx 28rpx 8rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
}
.card:first-of-type {
  margin-top: -32rpx;
  position: relative;
  z-index: 2;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
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
}

/* ===== 字段 ===== */
.field-block {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-bottom: 20rpx;
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
  height: 92rpx;
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
.field-readonly {
  background: #FAFAFB;
  border-style: dashed;
}
.prefix {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
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
.readonly-text {
  flex: 1;
  font-size: 28rpx;
  color: #86909c;
  font-family: 'SF Mono', Consolas, monospace;
}
.readonly-hint {
  font-size: 20rpx;
  color: #c9cdd4;
}

/* 经营品类选择器 */
.cat-selector {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-height: 92rpx;
  padding: 16rpx 24rpx;
  background: #F7F8FA;
  border: 2rpx solid #F0F1F4;
  border-radius: 20rpx;
  transition: background 0.2s;
}
.cat-selector:active { background: #fff; }
.cat-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.cat-chip {
  padding: 8rpx 18rpx;
  background: linear-gradient(135deg, #FFF6F1, #FFE9DC);
  color: #FF4D2D;
  border: 2rpx solid #FFD3BD;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}
.cat-placeholder {
  flex: 1;
  font-size: 26rpx;
  color: #c9cdd4;
}

/* 地图入口（在地址行下方） */
.map-btn {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 22rpx;
  background: linear-gradient(135deg, #FFF6F1, #FFE9DC);
  border: 2rpx solid #FFE0CD;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #FF4D2D;
  font-weight: 500;
}
.map-btn text { flex: 1; }

/* textarea */
.textarea-wrap {
  position: relative;
  background: #F7F8FA;
  border: 2rpx solid #F0F1F4;
  border-radius: 20rpx;
  padding: 20rpx 24rpx 36rpx;
}
.textarea {
  width: 100%;
  min-height: 140rpx;
  font-size: 28rpx;
  color: #1d2129;
  line-height: 1.5;
  box-sizing: border-box;
}
.count {
  position: absolute;
  bottom: 10rpx;
  right: 20rpx;
  font-size: 20rpx;
  color: #c9cdd4;
}

/* 浮动保存按钮 */
.save-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(247,248,250,0) 0%, #F7F8FA 30%);
  z-index: 10;
}
.btn-save {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 24rpx;
  background: #dcdfe6;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  border: none;
  transition: all 0.2s ease;
}
.btn-save::after { border: none; }
.btn-save--active {
  background: linear-gradient(135deg, #FF6B45 0%, #FF4D2D 100%);
  box-shadow: 0 12rpx 28rpx rgba(255, 77, 45, 0.35);
}
.btn-save:active { transform: scale(0.98); }
.safe-bottom { height: 240rpx; }

.picker-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.picker {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f2f5;
}
.picker-title { font-size: 30rpx; font-weight: 600; color: #303133; }
.picker-close { font-size: 28rpx; color: #ff4d2d; font-weight: 500; }
.picker-body { flex: 1; overflow-y: auto; padding: 12rpx 0; }
.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #303133;
  border-bottom: 1rpx solid #f5f6f8;
  &:active { background: #fafbfc; }
  &--active { color: #ff4d2d; font-weight: 500; }
}

.row--map {
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.04), transparent);
  &:active { background: linear-gradient(135deg, rgba(255, 77, 45, 0.08), transparent); }
}
.mpick-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.mpick-sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 76vh;
  display: flex;
  flex-direction: column;
}
.mpick-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f0f2f5;
}
.mpick-title { font-size: 30rpx; font-weight: 700; color: #303133; }
.mpick-close { font-size: 26rpx; color: #ff4d2d; font-weight: 600; }
.mpick-search {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f5f6f8;
}
.mpick-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f6f8;
  border-radius: 999rpx;
  font-size: 28rpx;
}
.mpick-btn {
  padding: 0 28rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff7a45);
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
}
.mpick-list { flex: 1; height: 0; padding: 12rpx 0; }
.mpick-empty {
  padding: 80rpx 0;
  text-align: center;
  color: #909399;
  font-size: 24rpx;
}
.mpick-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f5f6f8;
  &:active { background: #fafbfc; }
}
.mpick-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.mpick-item-name { font-size: 28rpx; font-weight: 600; color: #303133; }
.mpick-item-addr { font-size: 22rpx; color: #909399; }
</style>
