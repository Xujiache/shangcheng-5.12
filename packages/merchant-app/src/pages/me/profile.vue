<script setup lang="ts">
/**
 * 个人信息 · 编辑页
 *
 * 来源：me/index.vue → 点"个人信息" → 进本页
 * 字段：店名 / 商户号(只读) / 联系手机 / 邮箱 / 经营品类 / 联系地址 / 联系人 / 简介
 * 持久化：uni.setStorageSync('merchant_profile', ...) — 预览模式下本地持久化
 */
import { ref, computed, onMounted, reactive } from 'vue'
import Icon from '../../components/icon/icon.vue'
import { profileService, type MerchantProfile } from '../../services/profile'
import { useTencentMap } from '../../composables/useTencentMap'

const tmap = useTencentMap()
const showMapPick = ref(false)
const mapPickKeyword = ref('')
const mapPickResults = ref<{ lat: number; lng: number; name?: string; address?: string }[]>([])

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

const PROFILE_KEY = 'merchant_profile' // 本地缓存，避免离线时空白

interface MerchantProfile {
  shopName: string
  merchantNo: string
  contactPhone: string
  email: string
  categories: string[]
  address: string
  contactName: string
  description: string
}

const DEFAULT_PROFILE: MerchantProfile = {
  shopName: '经纬科技',
  merchantNo: 'M10283',
  contactPhone: '138****1234',
  email: 'sales@jingwei.com',
  categories: ['家具', '灯具'],
  address: '上海市浦东新区张江高科技园区博云路 12 号',
  contactName: '李经理',
  description: '专注实木家具 8 年，全国设有 3 大生产基地，月产能 5000 件。',
}

/** 可选品类（多选） */
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

async function loadProfile() {
  // 先从本地缓存秒级渲染
  try {
    const raw = uni.getStorageSync(PROFILE_KEY)
    if (raw) {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      Object.assign(form, { ...DEFAULT_PROFILE, ...data })
      original.value = { ...form }
    }
  } catch {
    // ignore
  }
  // 然后从后端拉取最新数据并覆盖
  try {
    const data = await profileService.get()
    Object.assign(form, { ...DEFAULT_PROFILE, ...data })
    original.value = { ...form }
    try { uni.setStorageSync(PROFILE_KEY, JSON.stringify(form)) } catch {}
  } catch (e) {
    // 后端不可达：保持本地缓存即可
  }
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
    })
    Object.assign(form, { ...DEFAULT_PROFILE, ...updated })
    original.value = { ...form }
    try { uni.setStorageSync(PROFILE_KEY, JSON.stringify(form)) } catch {}
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

function resetField(field: keyof MerchantProfile) {
  ;(form as any)[field] = (DEFAULT_PROFILE as any)[field]
}

onMounted(loadProfile)
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="avatar">{{ form.shopName.slice(0, 1) }}</view>
      <view class="hero-info">
        <text class="hero-name">{{ form.shopName || '未命名店铺' }}</text>
        <text class="hero-no">商户号 {{ form.merchantNo }}</text>
      </view>
    </view>

    <!-- 基础信息 -->
    <view class="card">
      <view class="card-title">基础信息</view>

      <view class="row">
        <text class="row-label">店名</text>
        <input
          v-model="form.shopName"
          class="row-input"
          placeholder="请输入店名"
          maxlength="40"
        />
      </view>

      <view class="row row--readonly">
        <text class="row-label">商户号</text>
        <text class="row-readonly">{{ form.merchantNo }}</text>
        <text class="row-hint">系统生成 · 不可修改</text>
      </view>

      <view class="row">
        <text class="row-label">联系人</text>
        <input
          v-model="form.contactName"
          class="row-input"
          placeholder="请输入联系人"
          maxlength="20"
        />
      </view>

      <view class="row">
        <text class="row-label">联系手机</text>
        <input
          v-model="form.contactPhone"
          class="row-input"
          placeholder="例：13912345678"
          maxlength="20"
        />
      </view>

      <view class="row">
        <text class="row-label">邮箱</text>
        <input
          v-model="form.email"
          class="row-input"
          placeholder="例：contact@example.com"
          maxlength="60"
        />
      </view>
    </view>

    <!-- 经营信息 -->
    <view class="card">
      <view class="card-title">经营信息</view>

      <view class="row" @click="showCategoryPicker = true">
        <text class="row-label">经营品类</text>
        <view class="row-tags">
          <view v-for="c in form.categories" :key="c" class="tag">{{ c }}</view>
          <text v-if="!form.categories.length" class="row-placeholder">请选择</text>
        </view>
        <Icon name="forward" :size="22" color="#C0C4CC" />
      </view>

      <view class="row">
        <text class="row-label">联系地址</text>
        <input
          v-model="form.address"
          class="row-input"
          placeholder="详细地址"
          maxlength="100"
        />
      </view>
      <view class="row row--map" @click="pickAddressOnMap">
        <text class="row-label">地图选址</text>
        <text class="row-readonly">在地图上选位置 / 搜索 POI</text>
        <Icon name="location-pin" :size="28" color="#FF4D2D" />
      </view>

      <view class="row row--textarea">
        <text class="row-label">店铺简介</text>
        <textarea
          v-model="form.description"
          class="row-textarea"
          placeholder="一句话介绍你的店铺，让客户更了解你"
          :maxlength="160"
          auto-height
        />
        <text class="row-hint row-hint--right">{{ form.description.length }} / 160</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer">
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

    <!-- 地图选址（H5 端 POI 搜索；mp-weixin 走 uni.chooseLocation） -->
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

.hero {
  background: var(--brand-gradient, linear-gradient(135deg, #ff4d2d, #ff7a45));
  padding: 48rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  color: #fff;
  text-align: center;
  line-height: 112rpx;
  font-size: 52rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.hero-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.hero-no {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm, 0 2rpx 8rpx rgba(0, 0, 0, 0.04));
  overflow: hidden;
}

.card-title {
  padding: 24rpx 28rpx 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  border-top: 1rpx solid #f0f2f5;
  flex-wrap: wrap;

  &:first-of-type {
    border-top: none;
  }

  &--readonly {
    background: #fafbfc;
  }

  &--textarea {
    flex-direction: column;
    align-items: stretch;
    gap: 12rpx;
  }
}

.row-label {
  flex-shrink: 0;
  width: 160rpx;
  font-size: 28rpx;
  color: #606266;
}

.row-input {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
  background: transparent;
  border: none;
  outline: none;
}

.row-readonly {
  flex: 1;
  font-size: 28rpx;
  color: #909399;
  text-align: right;
}

.row-hint {
  width: 100%;
  font-size: 22rpx;
  color: #c0c4cc;
  margin-left: 160rpx;

  &--right {
    text-align: right;
    margin-left: 0;
  }
}

.row-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: flex-end;
  min-height: 44rpx;
  align-items: center;
}

.tag {
  padding: 6rpx 16rpx;
  font-size: 22rpx;
  background: rgba(255, 77, 45, 0.08);
  color: #ff4d2d;
  border-radius: 999rpx;
}

.row-placeholder {
  font-size: 28rpx;
  color: #c0c4cc;
}

.row-textarea {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  color: #303133;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  line-height: 1.5;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx 32rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.btn-save {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  background: #dcdfe6;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  transition: all 0.2s ease;

  &--active {
    background: linear-gradient(135deg, #ff4d2d, #ff7a45);
    box-shadow: 0 8rpx 24rpx rgba(255, 77, 45, 0.35);
  }

  &:active {
    transform: scale(0.98);
  }
}

.safe-bottom {
  height: 60rpx;
}

/* ============ 品类多选弹层 ============ */
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

.picker-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.picker-close {
  font-size: 28rpx;
  color: #ff4d2d;
  font-weight: 500;
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 12rpx 0;
}

.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #303133;
  border-bottom: 1rpx solid #f5f6f8;

  &:active {
    background: #fafbfc;
  }

  &--active {
    color: #ff4d2d;
    font-weight: 500;
  }
}

/* ============ 地图选址弹层 ============ */
.row--map {
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.04), transparent);

  &:active {
    background: linear-gradient(135deg, rgba(255, 77, 45, 0.08), transparent);
  }
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
