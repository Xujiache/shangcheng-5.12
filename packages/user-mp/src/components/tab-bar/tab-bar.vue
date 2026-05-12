<script setup lang="ts">
/**
 * 用户端自定义底部导航 · SVG + 文字（v2 · 精修选中态）
 * 4 个 tab：首页 / 分类 / 购物车 / 我的
 *
 * v2 关键修复：
 * - 选中态用纯填充（stroke=none）替代「描边+填充」叠加，告别选中图标发胖发糊
 * - 重新设计 path_svg_filled（heroicons 风格的实心图标）
 * - 渐变胶囊背景 + 浮起 + 弹性回弹
 */
import { computed } from 'vue'
import { useCartStore } from '../../store/cart'
import { lineIcon, fillIcon } from '../../utils/svgDataUri'

const props = defineProps<{ current: 'home' | 'category' | 'cart' | 'me' }>()

const cartStore = useCartStore()

interface TabItem {
  key: 'home' | 'category' | 'cart' | 'me'
  label: string
  path: string
  path_svg: string         // 未选中：描边线条
  path_svg_filled: string  // 选中：纯填充实心图标
}

// mp-weixin 不支持 inline <svg>，base64 data URI + <image> 渲染（见 utils/svgDataUri.ts）
const svgLineUri = (d: string, color: string, stroke: number) => lineIcon(d, color, stroke)
const svgFillUri = (d: string, color: string) => fillIcon(d, color)

const TABS: TabItem[] = [
  {
    key: 'home',
    label: '首页',
    path: '/pages/tabbar/home/index',
    path_svg: 'M3 11.5L12 3l9 8.5M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10',
    path_svg_filled: 'M11.3 2.7a1 1 0 011.4 0l9 9a1 1 0 01-1.4 1.4L20 12.4V20a1 1 0 01-1 1h-4v-6h-4v6H6a1 1 0 01-1-1v-7.6l-1.3 1.3a1 1 0 01-1.4-1.4l9-9z',
  },
  {
    key: 'category',
    label: '分类',
    path: '/pages/tabbar/category/index',
    path_svg: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1z',
    path_svg_filled: 'M4 4h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm11 0h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V5a1 1 0 011-1zM4 14h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5a1 1 0 011-1zm11 0h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5a1 1 0 011-1z',
  },
  {
    key: 'cart',
    label: '购物车',
    path: '/pages/tabbar/cart/index',
    path_svg: 'M3 4h2.5l2.6 11.6a2 2 0 002 1.4h8.8a2 2 0 002-1.4L21 8H6.5M9 20a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zm9 0a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8z',
    path_svg_filled: 'M2.5 3a1 1 0 011-1h2a1 1 0 01.97.76L7 6H21a1 1 0 01.97 1.24l-2.4 9.6A2 2 0 0117.62 18H9.38a2 2 0 01-1.94-1.51L4.78 4.5H3.5a1 1 0 01-1-1zm6.5 18a2 2 0 100-4 2 2 0 000 4zm9 0a2 2 0 100-4 2 2 0 000 4z',
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

const cartCount = computed(() => {
  try {
    return (cartStore.lines ?? []).reduce((s, l: any) => s + (l.qty ?? l.quantity ?? 0), 0)
  } catch {
    return 0
  }
})

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
            <!-- 未选中：描边 -->
            <image
              v-if="current !== t.key"
              class="tab-icon-img"
              :src="svgLineUri(t.path_svg, '#94A3B8', 1.8)"
              mode="aspectFit"
            />
            <!-- 选中：纯填充实心图标 -->
            <image
              v-else
              class="tab-icon-img active"
              :src="svgFillUri(t.path_svg_filled, '#FF4D2D')"
              mode="aspectFit"
            />
          </view>
          <view v-if="t.key === 'cart' && cartCount > 0" class="badge">
            {{ cartCount > 99 ? '99+' : cartCount }}
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
}
.tab-icon-img {
  width: 44rpx;
  height: 44rpx;
  transition: all 0.25s ease;
  filter: drop-shadow(0 1rpx 2rpx rgba(15, 23, 42, 0.06));
}
.tab.active .tab-icon-img {
  width: 46rpx;
  height: 46rpx;
  filter: drop-shadow(0 2rpx 6rpx rgba(255, 77, 45, 0.40));
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
