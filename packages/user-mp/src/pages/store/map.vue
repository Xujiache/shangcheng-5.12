<script setup lang="ts">
/**
 * UM-12 · 门店地图
 * 还原 原型图/user-mini.jsx::UM_Map
 * - 上：地图区（uni-app map / 降级为网格 + Pin）
 * - 下：选中门店卡（名 + 地址 + 距离 + 电话/导航按钮）
 */
import { ref, computed, onMounted } from 'vue'
import { storeMapService } from '../../services'
import type { NearbyStore } from '../../services'
import { useTencentMap } from '../../composables/useTencentMap'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const tmap = useTencentMap()

const stores = ref<NearbyStore[]>([])
const selectedId = ref<string>('')
const showList = ref(false)

const selected = computed(() => stores.value.find((s) => s.id === selectedId.value) ?? stores.value[0])

async function load() {
  stores.value = await storeMapService.nearby()
  if (stores.value.length > 0) selectedId.value = stores.value[0].id
}

function selectStore(s: NearbyStore) {
  selectedId.value = s.id
  showList.value = false
}

function callStore() {
  if (!selected.value) return
  uni.makePhoneCall({ phoneNumber: selected.value.phone })
}

function navigateTo() {
  if (!selected.value) return
  tmap.openNavigation({
    lat: selected.value.lat,
    lng: selected.value.lng,
    name: selected.value.name,
    address: selected.value.address,
  })
}

function toggleList() {
  showList.value = !showList.value
}

/** map markers */
const markers = computed(() =>
  stores.value.map((s) => ({
    id: Number(s.id.replace(/\D/g, '')) || 1,
    latitude: s.lat,
    longitude: s.lng,
    title: s.name,
    iconPath: 'https://api.dicebear.com/9.x/icons/svg?seed=pin',
    width: 32,
    height: 32,
  })),
)

const center = computed(() =>
  selected.value
    ? { lat: selected.value.lat, lng: selected.value.lng }
    : { lat: 39.9087, lng: 116.3975 },
)

/** H5 端用腾讯静态地图 PNG 渲染（mp-weixin 走原生 <map>） */
const staticMapUrl = computed(() => {
  if (!stores.value.length) return ''
  return tmap.staticImageUrl({
    center: center.value,
    zoom: 13,
    size: { w: 750, h: 600 },
    markers: stores.value.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name })),
  })
})

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="门店地址" right-icon="search" />

    <!-- 地图区 -->
    <view class="map-wrap">
      <!-- 微信小程序原生 map -->
      <!-- #ifdef MP-WEIXIN -->
      <map
        class="map"
        :latitude="center.lat"
        :longitude="center.lng"
        :markers="markers"
        :scale="13"
        show-location
      />
      <!-- #endif -->

      <!-- H5 / 其它平台：腾讯静态地图 PNG + 可点击 pin 列表浮层 -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="map-fallback">
        <image
          v-if="staticMapUrl"
          :src="staticMapUrl"
          mode="aspectFill"
          class="map-static"
        />
        <view v-else class="grid" />
        <!-- 静态图上方半透明 pin 浮层，让用户能切换"选中门店" -->
        <view class="pin-layer">
          <view
            v-for="(s, i) in stores"
            :key="s.id"
            :class="['pin-chip', selectedId === s.id ? 'active' : '']"
            @click="selectStore(s)"
          >
            <Icon name="location-pin" :size="22" color="#fff" :fill="true" />
            <text>{{ i + 1 }} · {{ s.name }}</text>
          </view>
        </view>
      </view>
      <!-- #endif -->

      <!-- 列表切换按钮 -->
      <view class="list-toggle" @click="toggleList">
        <Icon name="menu" :size="32" color="#fff" />
        <text>列表</text>
      </view>
    </view>

    <!-- 选中门店卡 -->
    <view v-if="selected" class="bottom-card">
      <view class="card-head">
        <view class="card-info">
          <text class="name">{{ selected.name }}</text>
          <text class="address">{{ selected.address }} · 距您 {{ selected.distance }}km</text>
        </view>
        <view class="distance-tag">
          <Icon name="navigation" :size="20" color="var(--brand-primary)" />
          <text>{{ selected.distance }}km</text>
        </view>
      </view>
      <view class="card-actions">
        <view class="action ghost" @click="callStore">
          <Icon name="phone" :size="28" color="var(--text-primary)" />
          <text>电话</text>
        </view>
        <view class="action primary" @click="navigateTo">
          <Icon name="navigation" :size="28" color="#fff" />
          <text>导航前往</text>
        </view>
      </view>
    </view>

    <!-- 列表抽屉 -->
    <view v-if="showList" class="list-mask" @click="showList = false">
      <view class="list-sheet" @click.stop>
        <view class="sheet-head">
          <text class="title">附近门店（{{ stores.length }}）</text>
          <view class="close" @click="showList = false">
            <Icon name="close" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view
            v-for="s in stores"
            :key="s.id"
            :class="['store-item', selectedId === s.id ? 'active' : '']"
            @click="selectStore(s)"
          >
            <view class="store-info">
              <text class="name">{{ s.name }}</text>
              <text class="address">{{ s.address }}</text>
            </view>
            <view class="store-distance">
              <text>{{ s.distance }}km</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}
.map-wrap {
  flex: 1;
  position: relative;
  background: #E0E0E0;
  .map { width: 100%; height: 100%; display: block; }
}
.map-fallback {
  position: absolute;
  inset: 0;
  background: #e9eef2;
}
.map-static {
  width: 100%;
  height: 100%;
  display: block;
}
.pin-layer {
  position: absolute;
  left: 20rpx;
  right: 20rpx;
  bottom: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  z-index: 2;
}
.pin-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 14rpx;
  background: rgba(255, 122, 69, 0.92);
  color: #fff;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(4px);
  &.active {
    background: rgba(255, 77, 45, 0.96);
    transform: scale(1.04);
  }
}
.list-toggle {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.4);
}
.bottom-card {
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-default);
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  .card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
    .name { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
    .address { font-size: 22rpx; color: var(--text-tertiary); }
  }
  .distance-tag {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 14rpx;
    border: 1rpx solid var(--brand-primary);
    color: var(--brand-primary);
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
    font-family: $font-family-base;
  }
}
.card-actions {
  display: flex;
  gap: 16rpx;
}
.action {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  &.primary {
    background: $brand-gradient;
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
  }
}
.list-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.list-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 32rpx 32rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.sheet-head {
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid var(--border-light);
  .title { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
  .close { padding: 8rpx; }
}
.sheet-body {
  flex: 1;
  height: 0;
}
.store-item {
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  &.active {
    background: rgba(255,77,45,0.04);
  }
  .store-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
    .name { font-size: 28rpx; font-weight: 600; color: var(--text-primary); }
    .address { font-size: 22rpx; color: var(--text-tertiary); }
  }
  .store-distance {
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 700;
    font-family: $font-family-base;
  }
}
</style>
