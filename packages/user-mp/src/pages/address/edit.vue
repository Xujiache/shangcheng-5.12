<script setup lang="ts">
/**
 * UM · 新增 / 编辑收货地址
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addressService } from '../../services'
import type { Address } from '../../services'
import { useTencentMap } from '../../composables/useTencentMap'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const tmap = useTencentMap()
const showMapPick = ref(false)
const mapPickKeyword = ref('')
const mapPickResults = ref<{ lat: number; lng: number; name?: string; address?: string }[]>([])

const editingId = ref('')
const submitting = ref(false)

const form = reactive({
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false,
})

const isValid = computed(() => (
  form.name.trim().length >= 2 &&
  /^1[3-9]\d{9}$/.test(form.phone) &&
  form.region.trim().length >= 2 &&
  form.detail.trim().length >= 4
))

onLoad(async (options) => {
  if (options?.id) {
    editingId.value = options.id
    try {
      const list = await addressService.list()
      const target = list.find((a) => a.id === options.id)
      if (target) {
        form.name = target.name
        form.phone = target.phone
        form.region = (target as any).region || ''
        form.detail = target.detail
        form.isDefault = target.isDefault
      }
    } catch { /* ignore */ }
  }
})

async function submit() {
  if (!isValid.value) {
    uni.showToast({ title: '请填写完整且手机号格式正确', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await (addressService as any).update(editingId.value, form)
      uni.showToast({ title: '已更新', icon: 'success' })
    } else {
      await (addressService as any).create(form)
      uni.showToast({ title: '已添加', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack({ delta: 1 }), 400)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

/**
 * 在地图上选位置
 * - mp-weixin: uni.chooseLocation 原生选点
 * - H5: 自定义抽屉 + 腾讯位置 POI 搜索
 */
function pickOnMap() {
  // #ifdef MP-WEIXIN
  uni.chooseLocation({
    success: (res: any) => {
      form.region = res.address || form.region
      // 把名称 + 详细拼上去
      const detail = [res.name, res.address].filter(Boolean).join(' · ')
      if (detail) form.detail = detail
    },
  })
  return
  // #endif

  showMapPick.value = true
  mapPickKeyword.value = form.detail || form.region || ''
  doSearch()
}

async function doSearch() {
  const kw = mapPickKeyword.value.trim()
  if (!kw) return
  mapPickResults.value = await tmap.searchPlaces(kw)
}

function pickResult(item: { lat: number; lng: number; name?: string; address?: string }) {
  if (item.address) form.region = item.address
  const detail = [item.name, item.address].filter(Boolean).join(' · ')
  if (detail) form.detail = detail
  showMapPick.value = false
}

function chooseRegion() {
  const items = ['上海市浦东新区', '上海市黄浦区', '北京市朝阳区', '广东省深圳市福田区', '浙江省杭州市西湖区', '其它（手动输入）']
  uni.showActionSheet({
    itemList: items,
    success: (r) => {
      if (r.tapIndex === items.length - 1) {
        uni.showModal({
          title: '所在地区',
          editable: true,
          placeholderText: '省/市/区',
          content: form.region,
          success: (mr) => { if (mr.confirm) form.region = mr.content || '' },
        })
      } else {
        form.region = items[r.tapIndex]
      }
    },
  })
}
</script>

<template>
  <view class="page">
    <NavBar :title="editingId ? '编辑收货地址' : '新增收货地址'" :sticky="true" />

    <view class="card">
      <view class="field">
        <text class="label">收货人</text>
        <input v-model="form.name" class="input" placeholder="姓名" />
      </view>
      <view class="divider" />
      <view class="field">
        <text class="label">手机号</text>
        <input v-model="form.phone" class="input" type="number" maxlength="11" placeholder="11 位手机号" />
      </view>
      <view class="divider" />
      <view class="field row" @click="chooseRegion">
        <text class="label">所在地区</text>
        <text :class="['value', !form.region && 'placeholder']">{{ form.region || '请选择省/市/区' }}</text>
        <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
      </view>
      <view class="divider" />
      <view class="field row" @click="pickOnMap">
        <text class="label">地图选址</text>
        <text class="value placeholder">在地图上搜索 / 选择位置</text>
        <Icon name="location-pin" :size="28" color="var(--brand-primary)" />
      </view>
      <view class="divider" />
      <view class="field">
        <text class="label">详细地址</text>
        <textarea
          v-model="form.detail"
          class="textarea"
          placeholder="街道、门牌号、单元号等（≥ 4 字）"
          :maxlength="120"
        />
      </view>
    </view>

    <!-- H5 端：地图选址弹层（mp-weixin 走原生 chooseLocation，不进这里） -->
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
            @confirm="doSearch"
          />
          <view class="mpick-btn" @click="doSearch">搜索</view>
        </view>
        <scroll-view scroll-y class="mpick-list">
          <view v-if="!mapPickResults.length" class="mpick-empty">
            <text>输入关键词后点搜索</text>
          </view>
          <view
            v-for="(r, i) in mapPickResults"
            :key="`${r.lat}-${r.lng}-${i}`"
            class="mpick-item"
            @click="pickResult(r)"
          >
            <Icon name="location-pin" :size="32" color="var(--brand-primary)" />
            <view class="mpick-item-info">
              <text class="mpick-item-name">{{ r.name || '未命名' }}</text>
              <text class="mpick-item-addr">{{ r.address || '' }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
    <!-- #endif -->

    <view class="card">
      <view class="field row toggle" @click="form.isDefault = !form.isDefault">
        <text class="label">设为默认地址</text>
        <view :class="['switch', form.isDefault && 'on']">
          <view class="thumb" />
        </view>
      </view>
    </view>

    <view class="ft">
      <button
        class="submit"
        :class="{ disabled: !isValid || submitting }"
        :disabled="!isValid || submitting"
        @click="submit"
      >{{ submitting ? '保存中…' : '保 存' }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F7F8FA;
  display: flex;
  flex-direction: column;
}
.card {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.field {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  padding: 16rpx 0;
  gap: 24rpx;
  &.row { align-items: center; }
  .label {
    width: 160rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .input {
    flex: 1;
    height: 64rpx;
    font-size: 28rpx;
    color: var(--text-primary);
  }
  .textarea {
    flex: 1;
    min-height: 80rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    line-height: 1.5;
  }
  .value {
    flex: 1;
    font-size: 28rpx;
    color: var(--text-primary);
    &.placeholder { color: var(--text-tertiary); }
  }
}
.divider { height: 1rpx; background: var(--border-light); }
.toggle { padding: 24rpx 0; }
.switch {
  width: 88rpx;
  height: 48rpx;
  background: #e5e5e5;
  border-radius: 999rpx;
  position: relative;
  transition: background 0.2s;
  .thumb {
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
    transition: left 0.2s;
  }
  &.on {
    background: linear-gradient(135deg, #FF6B45, #FF4D2D);
    .thumb { left: 44rpx; }
  }
}
.ft {
  margin-top: auto;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #FF6B45, #FF4D2D);
  color: #fff;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  letter-spacing: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(255,77,45,0.35);
  &.disabled, &[disabled] {
    opacity: 0.5;
    box-shadow: none;
  }
  &::after { border: none; }
}

/* ============ 地图选址弹层 ============ */
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
.mpick-list {
  flex: 1;
  height: 0;
  padding: 12rpx 0;
}
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
