<script setup lang="ts">
/**
 * UM · 地址管理 / 选择
 * - 列表 + 默认徽标 + 编辑/删除 + 新增
 * - 选择模式：?from=confirm 时点击地址即选中并返回
 */
import { ref, onMounted } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { addressService } from '../../services'
import type { Address } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const list = ref<Address[]>([])
const loading = ref(true)
const isPickMode = ref(false)

async function load() {
  loading.value = true
  try {
    list.value = await addressService.list()
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  isPickMode.value = options?.from === 'confirm'
})

onMounted(load)
onShow(load)

function pickAddress(a: Address) {
  if (!isPickMode.value) return
  try { uni.setStorageSync('jiujiu_pick_address', a.id) } catch {}
  uni.navigateBack({ delta: 1 })
}

function goEdit(a?: Address) {
  if (a) {
    uni.navigateTo({ url: `/pages/address/edit?id=${a.id}` })
  } else {
    uni.navigateTo({ url: '/pages/address/edit' })
  }
}

async function removeOne(a: Address, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  uni.showModal({
    title: '删除地址',
    content: `确认删除「${a.name} · ${a.detail}」？`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (r.confirm) {
        try {
          await (addressService as any).remove(a.id)
        } catch (err: any) {
          uni.showToast({ title: err?.message || '删除失败', icon: 'none' })
          return
        }
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      }
    },
  })
}

async function setAsDefault(a: Address, e?: any) {
  if (e?.stopPropagation) e.stopPropagation()
  try {
    await (addressService as any).update(a.id, { ...a, isDefault: true })
    uni.showToast({ title: '已设为默认', icon: 'success' })
    load()
  } catch (err: any) {
    uni.showToast({ title: err?.message || '设置失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="page">
    <NavBar :title="isPickMode ? '选择收货地址' : '收货地址'" :sticky="true" />

    <view v-if="!loading && list.length === 0" class="empty">
      <view class="empty-icon"><Icon name="location-pin" :size="80" color="var(--text-tertiary)" /></view>
      <text class="empty-title">还没有收货地址</text>
      <text class="empty-sub">点击底部按钮添加第一个地址</text>
    </view>

    <scroll-view scroll-y class="scroll" v-else>
      <view class="addr-list">
        <view
          v-for="a in list"
          :key="a.id"
          class="addr-card"
          :class="{ 'pickable': isPickMode }"
          @click="pickAddress(a)"
        >
          <view class="addr-info">
            <view class="addr-row1">
              <text class="name">{{ a.name }}</text>
              <text class="phone">{{ a.phone }}</text>
              <view v-if="a.isDefault" class="badge-default">默认</view>
            </view>
            <text class="addr-region">{{ a.region }}</text>
            <text class="addr-detail">{{ a.detail }}</text>
          </view>
          <view class="addr-actions">
            <view v-if="!a.isDefault" class="action-mini" @click.stop="setAsDefault(a, $event)">
              <Icon name="check-circle" :size="22" color="var(--text-tertiary)" />
              <text>设为默认</text>
            </view>
            <view class="action-mini" @click.stop="goEdit(a)">
              <Icon name="edit" :size="22" color="var(--text-tertiary)" />
              <text>编辑</text>
            </view>
            <view class="action-mini" @click.stop="removeOne(a, $event)">
              <Icon name="trash" :size="22" color="#FF3B30" />
              <text style="color:#FF3B30">删除</text>
            </view>
          </view>
          <view v-if="isPickMode" class="pick-arrow">
            <Icon name="chevron-right" :size="32" color="var(--brand-primary)" />
          </view>
        </view>
      </view>
      <view style="height: 160rpx;" />
    </scroll-view>

    <view class="ft">
      <view class="add-btn" @click="goEdit()">
        <Icon name="plus" :size="32" color="#fff" />
        <text>新增收货地址</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F7F8FA;
}
.scroll { flex: 1; height: 0; }

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  gap: 12rpx;
  .empty-icon { opacity: 0.4; }
  .empty-title { font-size: 28rpx; font-weight: 600; color: var(--text-secondary); }
  .empty-sub { font-size: 22rpx; color: var(--text-tertiary); }
}

.addr-list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.addr-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  gap: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  position: relative;
  &.pickable {
    cursor: pointer;
    padding-right: 56rpx;
    &:active { background: rgba(255,77,45,0.03); }
  }
}
.addr-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.addr-row1 {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  .name { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
  .phone { font-size: 26rpx; color: var(--text-secondary); }
}
.badge-default {
  padding: 2rpx 12rpx;
  background: linear-gradient(135deg, #FF6B45, #FF4D2D);
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  border-radius: 999rpx;
}
.addr-region {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.addr-detail {
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.5;
}
.addr-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  justify-content: center;
  border-left: 1rpx dashed var(--border-light);
  padding-left: 16rpx;
}
.action-mini {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  padding: 4rpx 0;
}
.pick-arrow {
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
}
.ft {
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid var(--border-light);
}
.add-btn {
  height: 88rpx;
  background: linear-gradient(135deg, #FF6B45, #FF4D2D);
  border-radius: 999rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.35);
}
</style>
