<script setup lang="ts">
/**
 * 商家端自定义底部导航 · SVG + 文字（v2 · 精修选中态）
 * 5 tab：首页 / 商品 / 订单 / 数据 / 我的
 *
 * v2 关键修复：
 * - 选中态用纯填充（stroke=none）替代「描边+填充」叠加，告别选中图标发胖发糊
 * - 重新设计 path_svg_filled（heroicons 风格的实心图标）
 */
import { computed } from 'vue'
import { lineIcon, fillIcon } from '../../utils/svgDataUri'

const props = defineProps<{
  current: 'home' | 'product' | 'order' | 'stats' | 'me'
  orderBadge?: number
}>()

interface TabItem {
  key: 'home' | 'product' | 'order' | 'stats' | 'me'
  label: string
  path: string
  path_svg: string
  path_svg_filled: string
}

const TABS: TabItem[] = [
  {
    key: 'home',
    label: '首页',
    path: '/pages/tabbar/home/index',
    path_svg: 'M3 11.5L12 3l9 8.5M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10',
    path_svg_filled: 'M11.3 2.7a1 1 0 011.4 0l9 9a1 1 0 01-1.4 1.4L20 12.4V20a1 1 0 01-1 1h-4v-6h-4v6H6a1 1 0 01-1-1v-7.6l-1.3 1.3a1 1 0 01-1.4-1.4l9-9z',
  },
  {
    key: 'product',
    label: '商品',
    path: '/pages/tabbar/product/index',
    path_svg: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9',
    path_svg_filled: 'M11.55 2.1a1 1 0 011 0L20.6 6.5 12 10.8 3.4 6.5l8.15-4.4zM3 8.3l8 4.1V22l-8-4V8.3zm18 0v10L13 22v-9.6l8-4.1z',
  },
  {
    key: 'order',
    label: '订单',
    path: '/pages/tabbar/order/index',
    path_svg: 'M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zm-3 3h12a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V8a1 1 0 011-1zm2 4h8m-8 3h8m-8 3h5',
    path_svg_filled: 'M9.5 2.5h5a2 2 0 011.95 1.6L17 4.5H18a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2v-14a2 2 0 012-2h1.05A2 2 0 019 2.5zM9.5 4a.5.5 0 00-.5.5V5h6v-.5a.5.5 0 00-.5-.5zM8 10v2h8v-2zm0 4v2h8v-2zm0 4v2h5v-2z',
  },
  {
    key: 'stats',
    label: '数据',
    path: '/pages/tabbar/stats/index',
    path_svg: 'M3 21h18M7 17V11M12 17V5M17 17v-7',
    path_svg_filled: 'M3 19h18v2H3v-2zM5.5 9.5a1 1 0 011-1h1a1 1 0 011 1V19h-3zM11 4.5a1 1 0 011-1h1a1 1 0 011 1V19h-3zM16.5 10.5a1 1 0 011-1h1a1 1 0 011 1V19h-3z',
  },
  {
    key: 'me',
    label: '我的',
    path: '/pages/tabbar/me/index',
    path_svg: 'M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM4 21c0-4 3.6-7 8-7s8 3 8 7',
    path_svg_filled: 'M12 12a5 5 0 100-10 5 5 0 000 10zm-7.5 9a.5.5 0 01-.5-.5c0-4.42 3.58-8 8-8s8 3.58 8 8a.5.5 0 01-.5.5z',
  },
]

const safeBottom = computed(() => 'env(safe-area-inset-bottom)')

function getBadge(key: string): number {
  if (key === 'order') return props.orderBadge ?? 0
  return 0
}

function switchTo(item: TabItem) {
  if (item.key === props.current) return
  uni.switchTab({
    url: item.path,
    fail: () => uni.reLaunch({ url: item.path }),
  })
}
</script>

<template>
  <view class="tabbar-wrap">
    <view class="tabbar">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', current === t.key && 'active']"
        @click="switchTo(t)"
      >
        <view class="tab-inner">
          <view class="icon-cap" />
          <view class="tab-icon">
            <image
              v-if="current !== t.key"
              :src="lineIcon(t.path_svg, '#94A3B8', 1.8)"
              class="tab-icon-img"
              mode="aspectFit"
            />
            <image
              v-else
              :src="fillIcon(t.path_svg_filled, '#FF4D2D')"
              class="tab-icon-img tab-icon-img--active"
              mode="aspectFit"
            />
          </view>
          <view v-if="getBadge(t.key) > 0" class="badge">
            {{ getBadge(t.key) > 99 ? '99+' : getBadge(t.key) }}
          </view>
        </view>
        <text class="tab-label">{{ t.label }}</text>
      </view>
    </view>
    <view class="safe-bottom" :style="{ height: safeBottom }" />
  </view>
</template>

<style scoped lang="scss">
.tabbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid rgba(148, 163, 184, 0.14);
  box-shadow:
    0 -8rpx 32rpx rgba(15, 23, 42, 0.06),
    0 -2rpx 8rpx rgba(15, 23, 42, 0.04);
  backdrop-filter: saturate(180%) blur(20rpx);
  -webkit-backdrop-filter: saturate(180%) blur(20rpx);
}
.tabbar {
  display: flex;
  align-items: stretch;
  height: 110rpx;
  padding-top: 6rpx;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease;
  &:active { transform: scale(0.94); }
}
.tab-inner {
  position: relative;
  width: 84rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab.active .tab-inner {
  transform: translateY(-4rpx);
}
.icon-cap {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70rpx;
  height: 44rpx;
  border-radius: 22rpx;
  transform: translate(-50%, -50%) scale(0.7);
  background: linear-gradient(135deg, rgba(255, 107, 69, 0.20), rgba(255, 77, 45, 0.08));
  opacity: 0;
  transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab.active .icon-cap {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
.tab-icon {
  position: relative;
  z-index: 1;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  .tab-icon-img {
    width: 44rpx;
    height: 44rpx;
    transition: all 0.25s ease;
  }
}
.tab.active .tab-icon .tab-icon-img--active {
  width: 46rpx;
  height: 46rpx;
}
.tab-label {
  font-size: 20rpx;
  color: #94A3B8;
  font-weight: 500;
  letter-spacing: 2rpx;
  transition: all 0.2s ease;
  line-height: 1;
}
.tab.active .tab-label {
  color: #FF4D2D;
  font-weight: 700;
}

.badge {
  position: absolute;
  top: -4rpx;
  right: 0;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 8rpx;
  background: linear-gradient(135deg, #FF6B45, #FF3B30);
  color: #fff;
  font-size: 18rpx;
  line-height: 28rpx;
  text-align: center;
  border-radius: 999rpx;
  border: 2rpx solid #fff;
  font-weight: 700;
  z-index: 2;
  box-shadow: 0 2rpx 6rpx rgba(255, 59, 48, 0.4);
}
.safe-bottom {
  width: 100%;
}
</style>
