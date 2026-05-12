<script setup lang="ts">
/**
 * 统一 SVG 图标组件（用户端）
 * <Icon name="search" :size="36" color="#FF4D2D" />
 *
 * line 风格 24×24 viewBox，stroke="currentColor"，fill="none"
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    color?: string
    stroke?: number
    fill?: boolean
  }>(),
  {
    size: 24,
    color: 'currentColor',
    stroke: 1.6,
    fill: false,
  },
)

const PATH: Record<string, string> = {
  // 通用
  'back': 'M15 6l-6 6 6 6',
  'forward': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'close': 'M6 6l12 12 M18 6L6 18',
  'close-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18z M9 9l6 6 M15 9l-6 6',
  'plus': 'M12 5v14 M5 12h14',
  'minus': 'M5 12h14',
  'check': 'M5 12l5 5 9-11',
  'check-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 12l3 3 5-6',
  'circle': 'M12 21a9 9 0 100-18 9 9 0 000 18z',
  'circle-fill': 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 17a5 5 0 100-10 5 5 0 000 10z',
  'search': 'M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-3.5-3.5',
  'more-h': 'M5 12h.01 M12 12h.01 M19 12h.01',
  'more-v': 'M12 5h.01 M12 12h.01 M12 19h.01',
  'edit': 'M4 20h4l11-11-4-4L4 16v4z M14 6l4 4',
  'trash': 'M5 7h14 M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2 M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13',
  'phone': 'M5 4h4l2 5-2 1a11 11 0 005 5l1-2 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2',
  'mail': 'M3 7h18v12H3z M3 7l9 7 9-7',
  'lock': 'M6 11V8a6 6 0 1112 0v3 M5 11h14v9H5z',
  'refresh': 'M4 4v6h6 M20 20v-6h-6 M5 13a7 7 0 0011 4 M19 11a7 7 0 00-11-4',
  'share': 'M16 6l-4-4-4 4 M12 2v13 M5 16v3a2 2 0 002 2h10a2 2 0 002-2v-3',
  'info': 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 11v6 M12 7h.01',
  'help': 'M12 21a9 9 0 100-18 9 9 0 000 18z M9 10a3 3 0 116 0c0 2-3 2-3 4 M12 17h.01',
  'bell': 'M6 9a6 6 0 1112 0v5l2 3H4l2-3V9z M9 20a3 3 0 006 0',
  'gear': 'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12l1.5-2.5-2-3.5-2.8.6L14.5 4h-5l-1.2 2.6-2.8-.6-2 3.5L5 12l-1.5 2.5 2 3.5 2.8-.6L9.5 20h5l1.2-2.6 2.8.6 2-3.5L19 12z',
  'star': 'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  'star-fill': 'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  'heart': 'M12 21s-7-5-9-9.5C1 7 4 4 7 4c2 0 4 1 5 3 1-2 3-3 5-3 3 0 6 3 4 7.5C19 16 12 21 12 21z',
  'lightning': 'M13 2L4 14h7l-2 8 9-12h-7l2-8z',
  'camera': 'M3 7h4l2-2h6l2 2h4v12H3z M12 11a3 3 0 100 6 3 3 0 000-6z',
  'image-plus': 'M3 5h18v14H3z M3 15l5-5 5 5 4-4 4 4',
  'eye': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M12 9a3 3 0 100 6 3 3 0 000-6z',
  'calendar': 'M3 6h18v15H3z M8 3v6 M16 3v6 M3 10h18',
  'filter': 'M3 5h18l-7 9v6l-4-2v-4z',
  'sort': 'M7 4v14 M3 8l4-4 4 4 M17 20V6 M21 16l-4 4-4-4',
  'location': 'M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z M12 11a2 2 0 100-4 2 2 0 000 4z',
  'location-pin': 'M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z M12 11a2 2 0 100-4 2 2 0 000 4z',
  'clock': 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l4 2',
  'arrow-up': 'M12 19V5 M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14 M5 12l7 7 7-7',
  'arrow-right': 'M5 12h14 M12 5l7 7-7 7',
  'crown': 'M3 7l4 4 5-7 5 7 4-4-2 13H5z',
  'wallet': 'M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H3z M3 7V5a2 2 0 012-2h12 M17 13h2',
  'gift': 'M3 9h18v4H3z M5 13h14v8H5z M12 9V21 M12 9a3 3 0 10-3-3c0 2 1 3 3 3z M12 9a3 3 0 113-3c0 2-1 3-3 3z',
  'doc': 'M6 3h9l4 4v14H6z M14 3v5h5 M9 13h6 M9 16h6 M9 10h3',
  'tag': 'M3 13L13 3l7 0 0 7L10 20z M16 7h.01',
  'wechat': 'M9 9a3 3 0 11-6 0 3 3 0 016 0z M21 14a3 3 0 11-6 0 3 3 0 016 0z M9 12c0 4 4 7 8 7 1 0 2-.1 3-.4M15 11c0-4-4-6-8-6-3 0-5 1-6 3',
  'wechat-pay': 'M3 12a9 9 0 1118 0 9 9 0 01-18 0z M8 12c1 2 2 3 3 3 2 0 3-2 2-3-1-1-3 0-3-2 0-1 1-2 2-2',
  'ruler': 'M3 17L17 3l4 4L7 21l-4-4z M7 13l2 2 M11 9l2 2 M15 5l2 2',
  'megaphone': 'M3 11v2c0 1 1 2 2 2h1l1 5h2v-5h2l6 3V6L11 9H5c-1 0-2 1-2 2z M19 8a3 3 0 010 6',
  'home-shop': 'M3 9l1-5h16l1 5 M3 9v11h18V9 M3 9c0 2 2 3 3 3s3-1 3-3c0 2 1 3 3 3s3-1 3-3 1 3 3 3 3-1 3-3 M10 20v-6h4v6',
  'factory': 'M3 21V11l6 4V11l6 4V6h2l1 4h2v11z M5 17h2 M9 17h2 M13 17h2 M17 17h2',
  'cart': 'M3 5h2l3 12h11l3-9H6 M9 21a1 1 0 100-2 1 1 0 000 2z M18 21a1 1 0 100-2 1 1 0 000 2z',
  'cart-plus': 'M3 5h2l3 12h11l3-9H6 M9 21a1 1 0 100-2 1 1 0 000 2z M18 21a1 1 0 100-2 1 1 0 000 2z M12 9v4 M10 11h4',
  'user': 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 4-7 8-7s8 3 8 7',
  'user-add': 'M9 12a4 4 0 100-8 4 4 0 000 8z M2 21c0-4 3-7 7-7M18 8v6 M15 11h6',
  'message': 'M3 12a8 8 0 0114-5 8 8 0 01-2 14l-3 1-4-5a8 8 0 01-5-5z',
  'menu': 'M4 7h16 M4 12h16 M4 17h16',
  'navigation': 'M3 11l18-8-8 18-2-8z',
  'compass': 'M12 21a9 9 0 100-18 9 9 0 000 18z M16 8l-2 6-6 2 2-6z',
  'truck': 'M3 7h11v9H3z M14 11h5l2 3v2h-7 M7 19a2 2 0 100-4 2 2 0 000 4z M18 19a2 2 0 100-4 2 2 0 000 4z',
  'package': 'M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10',
  'discount': 'M9 8h.01 M15 15h.01 M8 15l8-8 M3 13a9 9 0 0118 0v6a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  'apple': 'M12 7c-2 0-3 1-4 2-2 2-2 6 0 8 1 1 3 2 4 2s2-1 3-1 2 1 3 1c1 0 3-1 4-3 1-2 1-5-1-7-1-1-3-2-4-2-1 0-2 1-3 1 M14 4c-1 1-2 2-3 2 0-1 1-3 3-3z',
  'apple-pay': 'M12 7c-2 0-3 1-4 2-2 2-2 6 0 8 1 1 3 2 4 2s2-1 3-1 2 1 3 1c1 0 3-1 4-3 1-2 1-5-1-7-1-1-3-2-4-2-1 0-2 1-3 1',
  'sparkles': 'M5 3v4 M3 5h4 M19 11v4 M17 13h4 M11 7l2 5 5 2-5 2-2 5-2-5-5-2 5-2z',
  'flag': 'M5 3v18 M5 4h13l-2 5 2 5H5',
  'ticket': 'M3 7v3a2 2 0 010 4v3h18v-3a2 2 0 010-4V7z M9 7v10 M15 7v10',
  'thumb-up': 'M5 11v9h3v-9z M8 11l3-7c2 0 3 1 3 3v3h5a2 2 0 012 2l-1 6c0 1-1 2-2 2H8',
  'book': 'M4 4h7a3 3 0 013 3v13H7a3 3 0 01-3-3z M13 7a3 3 0 013-3h4v13a3 3 0 01-3 3h-4',
  'badge-vip': 'M5 6l3 9 4-7 4 7 3-9 M3 19h18',
}

const dValue = computed(() => PATH[props.name] ?? '')

const sizePx = computed(() => (typeof props.size === 'number' ? `${props.size}rpx` : props.size))
</script>

<template>
  <view
    class="svg-icon"
    :style="{ width: sizePx, height: sizePx, color }"
  >
    <svg viewBox="0 0 24 24" :fill="fill ? color : 'none'" :stroke="color" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round">
      <path :d="dValue" />
    </svg>
  </view>
</template>

<style lang="scss" scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>
