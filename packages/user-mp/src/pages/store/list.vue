<script setup lang="ts">
/**
 * UM-门店列表 · 附近门店（列表视图）
 *
 * 入口：
 *   - 我的页"门店地址（列表）" / 首页"附近门店"
 *   - store/map.vue 顶部"列表"按钮也可跳这里
 *
 * - 调 storeMapService.nearby({lat,lng}) 拉附近门店
 * - 列表：门店名 + 地址 + 距离 + 营业状态徽标 + 电话/导航按钮
 * - 点击门店跳商家商品流（/pages/product/list?merchantId=xxx）
 * - 顶部"查看地图"按钮跳 store/map.vue（共享同一份数据集）
 * - 未授权定位 → 显示提示横条 + 按钮再次唤起 uni.getLocation
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { storeMapService } from '../../services'
import type { NearbyStore } from '../../services'
import { useTencentMap } from '../../composables/useTencentMap'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

const tmap = useTencentMap()

const stores = ref<NearbyStore[]>([])
const loading = ref(false)
const locationGranted = ref(false)

function resolveUserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    try {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          if (typeof res.latitude === 'number' && typeof res.longitude === 'number') {
            locationGranted.value = true
            resolve({ lat: res.latitude, lng: res.longitude })
          } else {
            locationGranted.value = false
            resolve(null)
          }
        },
        fail: () => {
          locationGranted.value = false
          resolve(null)
        },
      })
    } catch {
      locationGranted.value = false
      resolve(null)
    }
  })
}

async function load() {
  loading.value = true
  const loc = await resolveUserLocation()
  try {
    stores.value = await storeMapService.nearby(loc ?? undefined)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载门店失败', icon: 'none' })
    stores.value = []
  } finally {
    loading.value = false
  }
}

function requestLocation() {
  load()
}

function goMap() {
  uni.navigateTo({ url: '/pages/store/map' })
}

function goMerchantProducts(s: NearbyStore) {
  // 把门店当成"商家",跳商品列表用 merchantId 过滤
  uni.navigateTo({ url: `/pages/product/list?merchantId=${s.id}` })
}

function callStore(s: NearbyStore, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  if (!s.phone) {
    uni.showToast({ title: '该门店未提供电话', icon: 'none' })
    return
  }
  uni.makePhoneCall({
    phoneNumber: s.phone,
    fail: () => uni.showToast({ title: '呼叫失败', icon: 'none' }),
  })
}

function navigateToStore(s: NearbyStore, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  tmap.openNavigation({
    lat: s.lat,
    lng: s.lng,
    name: s.name,
    address: s.address,
  })
}

const sorted = computed(() => {
  // 后端已经按距离排序；这里再兜底一次,把没距离的放最后
  return stores.value.slice().sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0
    if (a.distance == null) return 1
    if (b.distance == null) return -1
    return a.distance - b.distance
  })
})

onMounted(load)
onShow(() => {
  // 切回页面时如果已授权,重新拉一次（用户可能在地图页改了筛选）
  if (locationGranted.value) load()
})
</script>

<template>
  <view class="page">
    <NavBar title="附近门店" right-text="地图" @right="goMap" />

    <!-- 未授权定位横条 -->
    <view v-if="!locationGranted && !loading" class="loc-hint" @click="requestLocation">
      <Icon name="location-pin" :size="28" color="var(--brand-primary)" />
      <view class="loc-text">
        <text class="title">未获取你的位置</text>
        <text class="desc">允许定位后可看到准确距离</text>
      </view>
      <view class="loc-btn">允许定位</view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view v-if="loading" class="state">
        <text>加载中…</text>
      </view>

      <view v-else-if="sorted.length === 0" class="empty-wrap">
        <EmptyState title="附近暂无门店" desc="切换地区或稍后再试" icon="location-pin" />
        <view class="empty-btn" @click="goMap">查看地图</view>
      </view>

      <view v-else class="store-list">
        <view
          v-for="(s, i) in sorted"
          :key="s.id"
          class="store-card"
          @click="goMerchantProducts(s)"
        >
          <view class="rank">{{ i + 1 }}</view>
          <view class="info">
            <view class="info-head">
              <text class="name">{{ s.name }}</text>
              <view class="distance-tag">
                <Icon name="navigation" :size="20" color="var(--brand-primary)" />
                <text>{{ s.distance != null ? `${s.distance}km` : '距离未知' }}</text>
              </view>
            </view>
            <text class="address">{{ s.address }}</text>
            <view class="badges">
              <view class="badge open">营业中</view>
              <view v-if="s.phone" class="badge soft">可电话</view>
            </view>
            <view class="actions" @click.stop>
              <view class="act ghost" @click="callStore(s, $event)">
                <Icon name="phone" :size="24" color="var(--text-primary)" />
                <text>电话</text>
              </view>
              <view class="act primary" @click="navigateToStore(s, $event)">
                <Icon name="navigation" :size="24" color="#fff" />
                <text>导航</text>
              </view>
              <view class="act soft" @click="goMerchantProducts(s)">
                <Icon name="package" :size="24" color="var(--brand-primary)" />
                <text>看商品</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
}
.scroll {
  flex: 1;
  height: 0;
}

/* 未授权横条 */
.loc-hint {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.08), rgba(255, 156, 110, 0.06));
  border: 1rpx dashed var(--brand-primary);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  .loc-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .title {
      font-size: 24rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
    .desc {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
  .loc-btn {
    flex-shrink: 0;
    padding: 8rpx 20rpx;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}

.state {
  padding: 80rpx 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 24rpx;
}
.empty-wrap {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  background: $brand-gradient;
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
}

.store-list {
  padding: 16rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.store-card {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  box-shadow: $shadow-sm;
}
.rank {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $brand-gradient;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: $font-family-base;
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .distance-tag {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 12rpx;
    border: 1rpx solid var(--brand-primary);
    color: var(--brand-primary);
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
    font-family: $font-family-base;
  }
}
.address {
  font-size: 22rpx;
  color: var(--text-tertiary);
  line-height: 1.4;
}
.badges {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  .badge {
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
    &.open {
      background: rgba(82, 196, 26, 0.12);
      color: #52c41a;
    }
    &.soft {
      background: var(--bg-page);
      color: var(--text-secondary);
    }
  }
}
.actions {
  margin-top: 8rpx;
  display: flex;
  gap: 12rpx;
}
.act {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 60rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-page);
    color: var(--text-primary);
    border: 1rpx solid var(--border-default);
  }
  &.soft {
    background: rgba(255, 77, 45, 0.08);
    color: var(--brand-primary);
  }
  &.primary {
    background: $brand-gradient;
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}
</style>
