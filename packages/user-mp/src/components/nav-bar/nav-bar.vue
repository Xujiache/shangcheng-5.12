<script setup lang="ts">
/**
 * 通用导航栏（自定义，所有非 tabbar 页面统一使用）
 */
import { computed } from 'vue'
import Icon from '../icon/icon.vue'
import { safeBackOrHome } from '../../utils/tab-nav'

const props = withDefaults(
  defineProps<{
    title?: string
    sub?: string
    showBack?: boolean
    rightText?: string
    rightIcon?: string
    bg?: string
    color?: string
    sticky?: boolean
    transparent?: boolean
  }>(),
  {
    title: '',
    sub: '',
    showBack: true,
    rightText: '',
    rightIcon: '',
    bg: 'var(--bg-card)',
    color: 'var(--text-primary)',
    sticky: true,
    transparent: false,
  },
)

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'right'): void
}>()

function onBack() {
  emit('back')
  safeBackOrHome('/pages/tabbar/home/index')
}

const statusBarHeight = computed(() => {
  try {
    const sys = uni.getSystemInfoSync()
    return (sys.statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

const bgStyle = computed(() => (props.transparent ? 'transparent' : props.bg))
</script>

<template>
  <view
    :class="['navbar', sticky ? 'sticky' : '', transparent ? 'transparent' : '']"
    :style="{ background: bgStyle, color }"
  >
    <view class="status-bar" :style="{ height: statusBarHeight }" />
    <view class="nav-row">
      <view class="left" @click="onBack">
        <Icon v-if="showBack" name="back" :size="48" :color="color" />
      </view>
      <view class="center">
        <text class="title" :style="{ color }">{{ title }}</text>
        <text v-if="sub" class="sub">{{ sub }}</text>
      </view>
      <view class="right" @click="emit('right')">
        <Icon v-if="rightIcon" :name="rightIcon" :size="44" :color="color" />
        <text v-else-if="rightText" class="text" :style="{ color }">{{ rightText }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.navbar {
  z-index: 100;
  &.sticky {
    position: sticky;
    top: 0;
  }
  &.transparent {
    background: transparent !important;
  }
}
.nav-row {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 16rpx;
  .left,
  .right {
    min-width: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .right {
    justify-content: flex-end;
    padding-right: 8rpx;
  }

  .center {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    .title {
      font-size: 32rpx;
      font-weight: 600;
    }
    .sub {
      font-size: 20rpx;
      opacity: 0.7;
      margin-top: 2rpx;
    }
  }

  .text {
    font-size: 26rpx;
    padding: 0 8rpx;
  }
}
</style>
