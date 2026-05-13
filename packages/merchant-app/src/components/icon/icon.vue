<script setup lang="ts">
/**
 * 统一图标组件
 * <Icon name="back" :size="24" color="#FF4D2D" />
 *
 * 实现：SVG path → base64 data URI → <image>
 * 这样在 H5 / App-vue WebView / nvue 全端稳定显示，
 * 不受 WebView SVG 渲染差异影响（之前 App 打包出现 SVG 不显示的根因）。
 */
import { computed } from 'vue'
import { lineIcon, fillIcon } from '../../utils/svgDataUri'

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
    color: '#1F2329',
    stroke: 1.6,
    fill: false,
  },
)

/** 单一路径图标（line 风格，stroke 主导） */
const PATH: Record<string, string> = {
  // 通用
  'back': 'M15 6l-6 6 6 6',
  'forward': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  'close': 'M6 6l12 12 M18 6L6 18',
  'plus': 'M12 5v14 M5 12h14',
  'minus': 'M5 12h14',
  'check': 'M5 12l5 5 9-11',
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
  'eye-off': 'M2 2l20 20 M9 5a10 10 0 0113 7c-1 2-2 3-3 4 M6 6c-2 1-4 4-4 6 0 0 4 7 10 7 2 0 3-.4 5-1 M10 10a3 3 0 014 4',
  'calendar': 'M3 6h18v15H3z M8 3v6 M16 3v6 M3 10h18',
  'filter': 'M3 5h18l-7 9v6l-4-2v-4z',
  'sort': 'M7 4v14 M3 8l4-4 4 4 M17 20V6 M21 16l-4 4-4-4',
  'location': 'M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z M12 11a2 2 0 100-4 2 2 0 000 4z',
  'clock': 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l4 2',
  'arrow-up': 'M12 19V5 M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14 M5 12l7 7 7-7',
  'arrow-right': 'M5 12h14 M12 5l7 7-7 7',
  'crown': 'M3 7l4 4 5-7 5 7 4-4-2 13H5z',
  'wallet': 'M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H3z M3 7V5a2 2 0 012-2h12 M17 13h2',
  'gift': 'M3 9h18v4H3z M5 13h14v8H5z M12 9V21 M12 9a3 3 0 10-3-3c0 2 1 3 3 3z M12 9a3 3 0 113-3c0 2-1 3-3 3z',
  'doc': 'M6 3h9l4 4v14H6z M14 3v5h5 M9 13h6 M9 16h6 M9 10h3',
  'package': 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  'ruler': 'M4 12l8-8 8 8-8 8z M9 7l2 2 M7 9l2 2 M5 11l2 2 M11 5l2 2 M13 7l2 2',
  'menu': 'M4 6h16 M4 12h16 M4 18h16',
  'tag': 'M3 13L13 3l7 0 0 7L10 20z M16 7h.01',
  // 业务图标
  'biz-home': 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z',
  'biz-product': 'M3 7l9-4 9 4-9 4-9-4z M3 12l9 4 9-4 M3 17l9 4 9-4',
  'biz-order': 'M6 3h12a1 1 0 011 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 011-1z M9 8h6 M9 12h6 M9 16h4',
  'biz-stats': 'M3 21h18 M6 21V10 M11 21V6 M16 21V13 M21 21V3',
  'biz-me': 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 4-7 8-7s8 3 8 7',
  'biz-customer': 'M9 11a4 4 0 100-8 4 4 0 000 8z M3 21c0-4 3-7 6-7s6 3 6 7 M16 14a3 3 0 100-6 3 3 0 000 6z M21 21c0-3-2-5-5-5',
  'biz-chat': 'M3 12a8 8 0 0114-5 8 8 0 01-2 14l-3 1-4-5a8 8 0 01-5-5z',
  'biz-store': 'M3 9l1-5h16l1 5 M3 9v11h18V9 M3 9c0 2 2 3 3 3s3-1 3-3c0 2 1 3 3 3s3-1 3-3 1 3 3 3 3-1 3-3 M10 20v-6h4v6',
  'biz-staff': 'M12 11a4 4 0 100-8 4 4 0 000 8z M4 21c0-3 3-7 8-7 1 0 2 .2 3 .5 M19 14l3 3 M19 20l3-3',
  'biz-marketing': 'M3 14l11-9v14L3 10V14z M14 8c2 1 3 2 3 4s-1 3-3 4 M7 15v4a2 2 0 002 2h2v-5',
  'biz-plaza': 'M3 8l9-5 9 5-9 5-9-5z M3 14l9 5 9-5 M21 8v6 M3 8v6',
  'biz-member': 'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  'biz-withdraw': 'M3 8h18v10H3z M3 12h18 M7 16h2 M11 16h2',
  'biz-commission': 'M12 21a9 9 0 100-18 9 9 0 000 18z M15 8h-4a2 2 0 100 4h2a2 2 0 110 4H9 M12 7v1 M12 16v1',
  'biz-shop-decorate': 'M3 9h18v11H3z M3 9l3-5h12l3 5 M9 13h6 M9 16h6',
  'biz-aftersale': 'M3 6l9-3 9 3v6c0 5-4 8-9 9-5-1-9-4-9-9z M9 12l2 2 4-4',
  'biz-receipt': 'M6 2v20l3-2 3 2 3-2 3 2V2 M9 7h6 M9 11h6 M9 15h4',
}

const sizePx = computed(() => (typeof props.size === 'number' ? `${props.size}rpx` : props.size))

const dataUri = computed(() => {
  const d = PATH[props.name] ?? ''
  return props.fill ? fillIcon(d, props.color) : lineIcon(d, props.color, props.stroke)
})
</script>

<template>
  <image
    class="svg-icon"
    :src="dataUri"
    :style="{ width: sizePx, height: sizePx }"
    mode="aspectFit"
  />
</template>

<style lang="scss" scoped>
.svg-icon {
  display: inline-block;
  flex-shrink: 0;
}
</style>
