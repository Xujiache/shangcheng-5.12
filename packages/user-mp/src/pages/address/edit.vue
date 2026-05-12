<script setup lang="ts">
/**
 * UM · 新增 / 编辑收货地址
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addressService } from '../../services'
import type { Address } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const editingId = ref('')
const submitting = ref(false)

const form = reactive({
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false,
})

const isValid = computed(() => (
  form.name.trim().length >= 2 &&
  /^1[3-9]\d{9}$/.test(form.phone) &&
  form.region.trim().length >= 2 &&
  form.detail.trim().length >= 4
))

onLoad(async (options) => {
  if (options?.id) {
    editingId.value = options.id
    try {
      const list = await addressService.list()
      const target = list.find((a) => a.id === options.id)
      if (target) {
        form.name = target.name
        form.phone = target.phone
        form.region = (target as any).region || ''
        form.detail = target.detail
        form.isDefault = target.isDefault
      }
    } catch { /* ignore */ }
  }
})

async function submit() {
  if (!isValid.value) {
    uni.showToast({ title: '请填写完整且手机号格式正确', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await (addressService as any).update(editingId.value, form)
      uni.showToast({ title: '已更新', icon: 'success' })
    } else {
      await (addressService as any).create(form)
      uni.showToast({ title: '已添加', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack({ delta: 1 }), 400)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function chooseRegion() {
  const items = ['上海市浦东新区', '上海市黄浦区', '北京市朝阳区', '广东省深圳市福田区', '浙江省杭州市西湖区', '其它（手动输入）']
  uni.showActionSheet({
    itemList: items,
    success: (r) => {
      if (r.tapIndex === items.length - 1) {
        uni.showModal({
          title: '所在地区',
          editable: true,
          placeholderText: '省/市/区',
          content: form.region,
          success: (mr) => { if (mr.confirm) form.region = mr.content || '' },
        })
      } else {
        form.region = items[r.tapIndex]
      }
    },
  })
}
</script>

<template>
  <view class="page">
    <NavBar :title="editingId ? '编辑收货地址' : '新增收货地址'" :sticky="true" />

    <view class="card">
      <view class="field">
        <text class="label">收货人</text>
        <input v-model="form.name" class="input" placeholder="姓名" />
      </view>
      <view class="divider" />
      <view class="field">
        <text class="label">手机号</text>
        <input v-model="form.phone" class="input" type="number" maxlength="11" placeholder="11 位手机号" />
      </view>
      <view class="divider" />
      <view class="field row" @click="chooseRegion">
        <text class="label">所在地区</text>
        <text :class="['value', !form.region && 'placeholder']">{{ form.region || '请选择省/市/区' }}</text>
        <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
      </view>
      <view class="divider" />
      <view class="field">
        <text class="label">详细地址</text>
        <textarea
          v-model="form.detail"
          class="textarea"
          placeholder="街道、门牌号、单元号等（≥ 4 字）"
          :maxlength="120"
        />
      </view>
    </view>

    <view class="card">
      <view class="field row toggle" @click="form.isDefault = !form.isDefault">
        <text class="label">设为默认地址</text>
        <view :class="['switch', form.isDefault && 'on']">
          <view class="thumb" />
        </view>
      </view>
    </view>

    <view class="ft">
      <button
        class="submit"
        :class="{ disabled: !isValid || submitting }"
        :disabled="!isValid || submitting"
        @click="submit"
      >{{ submitting ? '保存中…' : '保 存' }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F7F8FA;
  display: flex;
  flex-direction: column;
}
.card {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.field {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  padding: 16rpx 0;
  gap: 24rpx;
  &.row { align-items: center; }
  .label {
    width: 160rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .input {
    flex: 1;
    height: 64rpx;
    font-size: 28rpx;
    color: var(--text-primary);
  }
  .textarea {
    flex: 1;
    min-height: 80rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    line-height: 1.5;
  }
  .value {
    flex: 1;
    font-size: 28rpx;
    color: var(--text-primary);
    &.placeholder { color: var(--text-tertiary); }
  }
}
.divider { height: 1rpx; background: var(--border-light); }
.toggle { padding: 24rpx 0; }
.switch {
  width: 88rpx;
  height: 48rpx;
  background: #e5e5e5;
  border-radius: 999rpx;
  position: relative;
  transition: background 0.2s;
  .thumb {
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
    transition: left 0.2s;
  }
  &.on {
    background: linear-gradient(135deg, #FF6B45, #FF4D2D);
    .thumb { left: 44rpx; }
  }
}
.ft {
  margin-top: auto;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #FF6B45, #FF4D2D);
  color: #fff;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  letter-spacing: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(255,77,45,0.35);
  &.disabled, &[disabled] {
    opacity: 0.5;
    box-shadow: none;
  }
  &::after { border: none; }
}
</style>
