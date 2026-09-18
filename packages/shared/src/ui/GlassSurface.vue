<script setup lang="ts">
import { computed } from 'vue'

export type GlassEffect = 'auto' | 'liquid' | 'blur' | 'solid'
export type GlassVariant = 'navbar' | 'tabbar' | 'modal' | 'floating' | 'card'
export type GlassQuality = 'auto' | 'reduced'

const props = withDefaults(
  defineProps<{
    effect?: GlassEffect
    variant?: GlassVariant
    interactive?: boolean
    quality?: GlassQuality
  }>(),
  {
    effect: 'auto',
    variant: 'card',
    interactive: false,
    quality: 'auto',
  },
)

const emit = defineEmits<{ (event: 'click'): void }>()

const surfaceClass = computed(() => [
  'jw-glass-surface',
  `jw-glass-surface--${props.variant}`,
  `jw-glass-surface--${props.effect}`,
  props.interactive ? 'is-interactive' : '',
  'is-fallback',
])
</script>

<template>
  <view :class="surfaceClass" @click="emit('click')">
    <view class="jw-glass-surface__material" />
    <view class="jw-glass-surface__highlight" />
    <view class="jw-glass-surface__content"><slot /></view>
  </view>
</template>

<style scoped lang="scss">
.jw-glass-surface {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1rpx solid var(--glass-border, rgba(255, 255, 255, 0.46));
  background: var(--glass-fill, rgba(255, 255, 255, 0.58));
  box-shadow: var(--glass-shadow, 0 16rpx 48rpx rgba(30, 38, 54, 0.1));
  transform: translateZ(0);
  transition:
    transform var(--motion-fast, 120ms) ease,
    box-shadow var(--motion-normal, 200ms) ease,
    border-color var(--motion-normal, 200ms) ease;

  &--card { border-radius: var(--radius-2xl, 20px); }
  &--modal { border-radius: var(--radius-3xl, 24px); }
  &--floating { border-radius: 999px; }
  &--navbar,
  &--tabbar {
    border-radius: 0;
    --glass-fill: rgba(255, 255, 255, 0.68);
    --glass-shadow: 0 8rpx 32rpx rgba(30, 38, 54, 0.08);
  }

  &.is-interactive:active {
    transform: translateZ(0) scale(0.975);
    --glass-border: rgba(255, 255, 255, 0.7);
    --glass-shadow: 0 8rpx 28rpx rgba(30, 38, 54, 0.12);
  }
}

.jw-glass-surface__material,
.jw-glass-surface__highlight,
.jw-glass-surface__liquid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.jw-glass-surface__material {
  z-index: -3;
  background:
    radial-gradient(circle at 12% 4%, rgba(255, 255, 255, 0.62), transparent 44%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.04));
  backdrop-filter: blur(var(--glass-blur, 22px)) saturate(145%);
  -webkit-backdrop-filter: blur(var(--glass-blur, 22px)) saturate(145%);
}

.jw-glass-surface--solid .jw-glass-surface__material {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--surface-solid, #fff);
}

.jw-glass-surface__liquid { z-index: -2; }

.jw-glass-surface__highlight {
  z-index: -1;
  border-radius: inherit;
  box-shadow:
    inset 0 1rpx 0 rgba(255, 255, 255, 0.72),
    inset 1rpx 0 0 rgba(255, 255, 255, 0.34),
    inset 0 -1rpx 0 rgba(92, 103, 122, 0.08);
}

.jw-glass-surface__content {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .jw-glass-surface { transition: none; }
}
</style>
