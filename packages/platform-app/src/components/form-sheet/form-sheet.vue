<script setup lang="ts">
/**
 * FormSheet · 平台端通用底部表单抽屉
 *
 * 设计参考:
 *   - merchant-app 的 share-sheet.vue:同样的 mask + slide-up + handle 设计
 *   - platform-app 的 agreement-sheet.vue:底部弹层、滚动区、固定 footer
 *
 * 用法:
 *   <FormSheet
 *     :open="formOpen"
 *     title="新建广告位"
 *     confirm-text="创建"
 *     :loading="submitting"
 *     @close="formOpen = false"
 *     @confirm="onSubmit"
 *   >
 *     <view class="row">…自定义表单字段…</view>
 *   </FormSheet>
 *
 * 设计原则:
 *   - 不做任何业务,只提供 mask / 卡片 / 标题 / 滚动区 / 取消+确定按钮 chrome
 *   - 内容区用 slot,调用方完全控制表单结构
 *   - 大屏(平板/H5 PC)上自动收窄到 720rpx 居中,移动端铺满
 */
import Icon from '../icon/icon.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** 确定按钮文案,默认"保存" */
    confirmText?: string
    /** 取消按钮文案,默认"取消" */
    cancelText?: string
    /** 确定按钮 loading 态(防重复提交) */
    loading?: boolean
    /** 是否禁用确定按钮(表单校验未通过时用) */
    disabled?: boolean
    /** 是否隐藏确定按钮(纯展示用) */
    hideConfirm?: boolean
  }>(),
  {
    confirmText: '保存',
    cancelText: '取消',
    loading: false,
    disabled: false,
    hideConfirm: false,
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

function onMaskTap() {
  emit('close')
}
function onCancel() {
  emit('close')
}
function onConfirm() {
  emit('confirm')
}
</script>

<template>
  <view v-if="open" class="form-sheet-mask" @click="onMaskTap">
    <view class="form-sheet-card" @click.stop>
      <view class="form-sheet-handle" />
      <view class="form-sheet-head">
        <text class="form-sheet-title">{{ title }}</text>
        <view class="form-sheet-close" @click="onCancel">
          <Icon name="close" :size="32" color="#86909C" />
        </view>
      </view>

      <scroll-view
        scroll-y
        enhanced
        :show-scrollbar="false"
        class="form-sheet-body"
        style="max-height: 64vh"
      >
        <slot />
      </scroll-view>

      <view class="form-sheet-footer">
        <view class="form-sheet-btn ghost" @click="onCancel">{{ cancelText }}</view>
        <view
          v-if="!hideConfirm"
          :class="['form-sheet-btn', 'primary', loading || disabled ? 'is-disabled' : '']"
          @click="!loading && !disabled && onConfirm()"
        >
          <text v-if="!loading">{{ confirmText }}</text>
          <text v-else>提交中…</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.form-sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: form-sheet-fade-in 0.18s ease-out;
}
@keyframes form-sheet-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.form-sheet-card {
  width: 100%;
  max-width: 720rpx;
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  animation: form-sheet-slide-up 0.24s ease-out;
  overflow: hidden;
}
@keyframes form-sheet-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.form-sheet-handle {
  margin: 16rpx auto 8rpx;
  width: 76rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #ececec;
  flex-shrink: 0;
}
.form-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx 12rpx;
  flex-shrink: 0;
  .form-sheet-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1d2129;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .form-sheet-close {
    padding: 8rpx;
    flex-shrink: 0;
  }
}
.form-sheet-body {
  flex: 1;
  padding: 8rpx 32rpx 16rpx;
  box-sizing: border-box;
}
.form-sheet-footer {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f2f3f5;
  background: #fff;
  flex-shrink: 0;
}
.form-sheet-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  &.ghost {
    background: #f7f8fa;
    color: #4e5969;
    border: 1rpx solid #e5e6eb;
  }
  &.primary {
    background: linear-gradient(135deg, #ff7a4e, #ff4d2d);
    color: #fff;
    box-shadow: 0 10rpx 24rpx rgba(255, 77, 45, 0.32);
    &:active:not(.is-disabled) {
      transform: scale(0.98);
    }
    &.is-disabled {
      opacity: 0.55;
      box-shadow: none;
    }
  }
}
</style>
