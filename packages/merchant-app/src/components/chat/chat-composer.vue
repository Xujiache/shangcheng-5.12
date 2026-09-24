<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { QuickReplyItem } from '../../services/store'

type ComposerMode = 'idle' | 'keyboard' | 'quick' | 'attachment'
type PanelMode = 'quick' | 'attachment'

const props = withDefaults(
  defineProps<{
    modelValue: string
    quickReplies?: QuickReplyItem[]
    bottomInset?: number
    disabled?: boolean
    disabledText?: string
  }>(),
  {
    quickReplies: () => [],
    bottomInset: 0,
    disabled: false,
    disabledText: '该会话已关闭，暂时无法继续回复',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'send'): void
  (event: 'choose-image'): void
  (event: 'layout-change', mode: ComposerMode): void
  (event: 'keyboard-change', height: number): void
}>()

const mode = ref<ComposerMode>('idle')
const textareaFocused = ref(false)
const keyboardHeight = ref(0)
const lastKeyboardHeight = ref(0)
const pendingPanel = ref<PanelMode | null>(null)
let panelTimer: ReturnType<typeof setTimeout> | undefined
let lastSendAt = 0

const canSend = computed(() => props.modelValue.trim().length > 0)
const keyboardVisible = computed(() => mode.value === 'keyboard' || keyboardHeight.value > 0)
const safeBottomStyle = computed(() => ({
  height: keyboardVisible.value ? '0px' : `${Math.max(0, props.bottomInset)}px`,
}))
const closedStyle = computed(() => ({
  paddingBottom: `calc(24rpx + ${Math.max(0, props.bottomInset)}px)`,
}))
const panelStyle = computed(() => {
  const preferred = lastKeyboardHeight.value || 260
  return { height: `${Math.min(340, Math.max(220, preferred))}px` }
})

function clearPanelTimer() {
  if (panelTimer) clearTimeout(panelTimer)
  panelTimer = undefined
}

function notifyLayout(delay = 0) {
  const currentMode = mode.value
  nextTick(() => {
    if (delay > 0) setTimeout(() => emit('layout-change', currentMode), delay)
    else emit('layout-change', currentMode)
  })
}

function hideKeyboard() {
  try {
    uni.hideKeyboard()
  } catch {
    // H5 或旧版运行时不支持时，由 focus 状态完成降级处理。
  }
}

function commitPanel(panel: PanelMode) {
  clearPanelTimer()
  pendingPanel.value = null
  textareaFocused.value = false
  keyboardHeight.value = 0
  mode.value = panel
  notifyLayout()
}

function requestPanel(panel: PanelMode) {
  if (props.disabled) return
  if (mode.value === panel) {
    if (panel === 'quick') focusInput()
    else closePanels()
    return
  }

  clearPanelTimer()
  pendingPanel.value = panel
  textareaFocused.value = false
  hideKeyboard()
  if (keyboardHeight.value <= 0 && mode.value !== 'keyboard') {
    commitPanel(panel)
    return
  }
  panelTimer = setTimeout(() => commitPanel(panel), 220)
}

function closePanels() {
  clearPanelTimer()
  pendingPanel.value = null
  if (mode.value === 'quick' || mode.value === 'attachment') {
    mode.value = 'idle'
    notifyLayout()
  }
}

function focusInput() {
  if (props.disabled) return
  clearPanelTimer()
  pendingPanel.value = null
  mode.value = 'keyboard'
  textareaFocused.value = false
  nextTick(() => {
    textareaFocused.value = true
    notifyLayout()
  })
}

function dismiss() {
  clearPanelTimer()
  pendingPanel.value = null
  textareaFocused.value = false
  keyboardHeight.value = 0
  mode.value = 'idle'
  hideKeyboard()
  notifyLayout()
}

function handleFocus(event: any) {
  textareaFocused.value = true
  pendingPanel.value = null
  const height = Math.max(0, Number(event?.detail?.height || 0))
  if (height > 0) {
    keyboardHeight.value = height
    lastKeyboardHeight.value = height
  }
  mode.value = 'keyboard'
  emit('keyboard-change', keyboardHeight.value)
  notifyLayout(40)
}

function handleBlur() {
  textareaFocused.value = false
  if (pendingPanel.value) return
  setTimeout(() => {
    if (!textareaFocused.value && keyboardHeight.value <= 0 && mode.value === 'keyboard') {
      mode.value = 'idle'
      notifyLayout()
    }
  }, 80)
}

function handleKeyboardHeightChange(event: any) {
  const height = Math.max(0, Number(event?.detail?.height || 0))
  const duration = Math.max(0, Number(event?.detail?.duration || 0))
  keyboardHeight.value = height
  emit('keyboard-change', height)
  if (height > 0) {
    lastKeyboardHeight.value = height
    pendingPanel.value = null
    clearPanelTimer()
    mode.value = 'keyboard'
  } else if (pendingPanel.value) {
    commitPanel(pendingPanel.value)
    return
  } else if (mode.value === 'keyboard') {
    mode.value = 'idle'
  }
  notifyLayout(Math.min(duration, 280))
}

function handleInput(event: any) {
  emit('update:modelValue', String(event?.detail?.value || ''))
}

function handleLineChange() {
  notifyLayout(30)
}

function handleSend() {
  if (!canSend.value || props.disabled) return
  const now = Date.now()
  if (now - lastSendAt < 300) return
  lastSendAt = now
  emit('send')
  mode.value = 'keyboard'
  textareaFocused.value = true
  notifyLayout(30)
}

function applyQuick(item: QuickReplyItem) {
  emit('update:modelValue', item.content.slice(0, 1000))
  mode.value = 'idle'
  nextTick(() => focusInput())
}

function chooseImage() {
  mode.value = 'idle'
  emit('choose-image')
  notifyLayout()
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) dismiss()
  },
)

onBeforeUnmount(clearPanelTimer)

defineExpose({ dismiss, focusInput, closePanels, mode })
</script>

<template>
  <view v-if="disabled" class="closed-composer" :style="closedStyle">{{ disabledText }}</view>

  <view v-else class="chat-composer" @click.stop>
    <view class="composer-toolbar">
      <view class="tool-button" @click="mode === 'quick' ? focusInput() : requestPanel('quick')">
        <wd-icon
          :name="$jwIcon(mode === 'quick' ? 'keyboard' : 'quick-reply')"
          size="28px"
          color="#30343B"
        />
      </view>

      <view class="input-shell">
        <wd-textarea
          no-border
          :model-value="modelValue"
          class="message-input"
          auto-height
          :focus="textareaFocused"
          :maxlength="1000"
          placeholder="输入消息"
          placeholder-class="message-placeholder"
          confirm-type="send"
          :confirm-hold="true"
          :show-confirm-bar="false"
          :adjust-position="false"
          :auto-blur="false"
          :cursor-spacing="12"
          @input="handleInput"
          @confirm="handleSend"
          @focus="handleFocus"
          @blur="handleBlur"
          @linechange="handleLineChange"
          @keyboardheightchange="handleKeyboardHeightChange"
        />
      </view>

      <view v-if="canSend" class="send-button" @touchend.prevent="handleSend" @click="handleSend"
        >发送</view
      >
      <view
        v-else
        :class="['tool-button', 'plus-button', { opened: mode === 'attachment' }]"
        @click="requestPanel('attachment')"
      >
        <wd-icon :name="$jwIcon('plus-circle')" size="29px" color="#30343B" />
      </view>
    </view>

    <view v-if="mode === 'quick'" class="composer-panel quick-panel" :style="panelStyle">
      <view class="panel-heading">
        <text class="panel-title">快捷回复</text>
        <text class="panel-hint">点击后可继续编辑</text>
      </view>
      <scroll-view scroll-y class="quick-list">
        <view
          v-for="item in quickReplies"
          :key="item.id"
          class="quick-item"
          @click="applyQuick(item)"
        >
          <text class="quick-label">{{ item.label }}</text>
          <text class="quick-content">{{ item.content }}</text>
        </view>
        <view v-if="!quickReplies.length" class="panel-empty">暂未设置快捷回复</view>
      </scroll-view>
    </view>

    <view v-if="mode === 'attachment'" class="composer-panel attachment-panel" :style="panelStyle">
      <view class="attachment-item" @click="chooseImage">
        <view class="attachment-icon"
          ><wd-icon :name="$jwIcon('image-plus')" size="26px" color="#30343B"
        /></view>
        <text>图片</text>
      </view>
    </view>

    <view class="composer-safe-bottom" :style="safeBottomStyle" />
  </view>
</template>

<style lang="scss" scoped>
.chat-composer {
  flex-shrink: 0;
  border-top: 1rpx solid #dfe2e5;
  background: #f7f7f7;
}
.composer-toolbar {
  min-height: 112rpx;
  padding: 14rpx 18rpx;
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
  box-sizing: border-box;
}
.tool-button {
  width: 88rpx;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 88rpx;
  border-radius: 18rpx;
  transition:
    background 0.15s ease,
    transform 0.18s ease;
}
.tool-button:active {
  background: #e9eaec;
}
.plus-button.opened {
  transform: rotate(45deg);
}
.input-shell {
  flex: 1;
  min-width: 0;
  min-height: 80rpx;
  max-height: 200rpx;
  display: flex;
  align-items: center;
  overflow-y: auto;
  border: 1rpx solid #e6e8eb;
  border-radius: 12rpx;
  background: var(--bg-card);
}
.message-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 52rpx;
  max-height: 176rpx;
  padding: 14rpx 20rpx;
  overflow-y: auto;
  color: #1f2329;
  font-size: 29rpx;
  line-height: 42rpx;
}
:deep(.message-placeholder) {
  color: #a2a7b0;
}
.send-button {
  height: 72rpx;
  min-width: 108rpx;
  margin: 6rpx 0;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 10rpx;
  background: #ff4d2d;
  color: #fff;
  font-size: 27rpx;
  font-weight: 600;
}
.send-button:active {
  background: #e94124;
}
.composer-panel {
  box-sizing: border-box;
  min-height: 220px;
  max-height: 340px;
  border-top: 1rpx solid #e3e5e8;
  background: #f7f7f7;
}
.panel-heading {
  height: 76rpx;
  padding: 0 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  color: #1f2329;
  font-size: 27rpx;
  font-weight: 600;
}
.panel-hint {
  color: #a2a7b0;
  font-size: 21rpx;
}
.quick-panel {
  display: flex;
  flex-direction: column;
  padding-bottom: 10rpx;
}
.quick-list {
  flex: 1;
  min-height: 0;
  padding: 0 30rpx;
  box-sizing: border-box;
}
.quick-item {
  padding: 18rpx 0;
  display: flex;
  flex-direction: column;
  gap: 7rpx;
  border-top: 1rpx solid #e6e8eb;
}
.quick-label {
  color: #30343b;
  font-size: 25rpx;
  font-weight: 600;
}
.quick-content {
  color: #646a73;
  font-size: 25rpx;
  line-height: 1.45;
}
.panel-empty {
  padding: 70rpx 0;
  color: #a2a7b0;
  font-size: 24rpx;
  text-align: center;
}
.attachment-panel {
  padding: 34rpx 30rpx;
}
.attachment-item {
  width: 116rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  color: #646a73;
  font-size: 23rpx;
}
.attachment-icon {
  width: 108rpx;
  height: 108rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e2e4e7;
  border-radius: 18rpx;
  background: var(--bg-card);
}
.composer-safe-bottom {
  flex-shrink: 0;
  transition: height 0.12s ease;
}
.closed-composer {
  flex-shrink: 0;
  padding: 24rpx;
  border-top: 1rpx solid #dfe2e5;
  background: #f7f7f7;
  color: var(--text-tertiary);
  font-size: 24rpx;
  text-align: center;
}
</style>
