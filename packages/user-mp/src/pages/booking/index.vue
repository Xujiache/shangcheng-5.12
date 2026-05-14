<script setup lang="ts">
/**
 * UM-10 · 预约量尺
 * 还原 原型图/user-mini.jsx::UM_Book
 * - 提示语
 * - 联系人 / 手机号 / 地址 / 时间 / 空间类型 / 备注
 * - 提交预约
 */
import { ref } from 'vue'
import { bookingService } from '../../services'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'

const SPACES = ['客厅', '餐厅', '卧室', '书房', '儿童房', '其他']

const form = ref({
  name: '',
  phone: '',
  address: '',
  /** 后端要的 ISO 字符串，提交时发它 */
  appointAt: '',
  /** 仅用于按钮上展示的人类可读文本（如「今天 14:00」），不会发后端 */
  appointAtLabel: '',
  space: '客厅',
  remark: '',
})
const submitting = ref(false)

function chooseAddress() {
  uni.chooseLocation({
    success: (res) => {
      form.value.address = res.address + (res.name ? ' · ' + res.name : '')
    },
    fail: () => {
      uni.showActionSheet({
        itemList: ['北京市朝阳区望京 SOHO', '上海市浦东新区陆家嘴', '广东省深圳市福田', '手动填写'],
        success: (r) => {
          if (r.tapIndex < 3) {
            form.value.address = ['北京市朝阳区望京 SOHO', '上海市浦东新区陆家嘴', '广东省深圳市福田'][r.tapIndex]
          } else {
            uni.showModal({
              title: '预约地址',
              editable: true,
              placeholderText: '请输入详细地址',
              success: (m) => {
                if (m.confirm) form.value.address = m.content ?? ''
              },
            })
          }
        },
      })
    },
  })
}

/**
 * 构造预约时间槽：今天 / 明天 / 后天 × {09:00, 14:00, 16:00}
 * - label：界面显示
 * - iso：发给后端的 ISO 字符串（Date.toISOString()）
 */
function buildTimeSlots() {
  const days = [
    { offset: 0, name: '今天' },
    { offset: 1, name: '明天' },
    { offset: 2, name: '后天' },
  ]
  const hours = [9, 14, 16]
  const slots: { label: string; iso: string }[] = []
  const now = new Date()
  for (const d of days) {
    for (const h of hours) {
      const dt = new Date(now)
      dt.setDate(dt.getDate() + d.offset)
      dt.setHours(h, 0, 0, 0)
      // 今天且已过的时段跳过
      if (d.offset === 0 && dt.getTime() <= now.getTime()) continue
      const hh = String(h).padStart(2, '0')
      slots.push({ label: `${d.name} ${hh}:00`, iso: dt.toISOString() })
    }
  }
  return slots
}

function chooseTime() {
  const slots = buildTimeSlots()
  if (slots.length === 0) {
    uni.showToast({ title: '今天已无可预约时段，请选明天', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: slots.map((s) => s.label),
    success: (r) => {
      const picked = slots[r.tapIndex]
      if (!picked) return
      form.value.appointAt = picked.iso
      form.value.appointAtLabel = picked.label
    },
  })
}

async function submit() {
  if (!form.value.name) return uni.showToast({ title: '请填写联系人', icon: 'none' })
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  if (!form.value.address) return uni.showToast({ title: '请选择预约地址', icon: 'none' })
  if (!form.value.appointAt) return uni.showToast({ title: '请选择预约时间', icon: 'none' })

  submitting.value = true
  try {
    await bookingService.submit({
      name: form.value.name,
      phone: form.value.phone,
      address: form.value.address,
      // 已是 ISO 字符串（new Date(...).toISOString()）
      appointAt: form.value.appointAt,
      space: form.value.space,
      remark: form.value.remark,
    })
    uni.showToast({ title: '预约成功 · 客服将与您联系', icon: 'success', duration: 2000 })
    setTimeout(() => uni.navigateBack({ delta: 1 }), 1500)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="预约量尺" />

    <view class="hero">
      <view class="hero-icon">
        <Icon name="ruler" :size="56" color="var(--brand-primary)" />
      </view>
      <view class="hero-info">
        <text class="hero-title">填写预约信息</text>
        <text class="hero-desc">客服将于工作时间内与您联系确认</text>
      </view>
    </view>

    <view class="form">
      <view class="row">
        <text class="label">联系人</text>
        <input v-model="form.name" class="input" placeholder="请输入姓名" />
      </view>
      <view class="row">
        <text class="label">手机号</text>
        <input v-model="form.phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="row link" @click="chooseAddress">
        <text class="label">预约地址</text>
        <text :class="['value', form.address ? '' : 'placeholder']">
          {{ form.address || '点击选择 / 输入' }}
        </text>
        <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
      </view>
      <view class="row link" @click="chooseTime">
        <text class="label">预约时间</text>
        <view class="time-row">
          <Icon name="calendar" :size="28" color="var(--text-tertiary)" />
          <text :class="['value', form.appointAtLabel ? '' : 'placeholder']">
            {{ form.appointAtLabel || '选择日期 / 时段' }}
          </text>
        </view>
        <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
      </view>
      <view class="row col">
        <text class="label">空间类型</text>
        <view class="space-grid">
          <view
            v-for="s in SPACES"
            :key="s"
            :class="['chip', form.space === s ? 'active' : '']"
            @click="form.space = s"
          >{{ s }}</view>
        </view>
      </view>
      <view class="row col">
        <text class="label">备注</text>
        <textarea
          v-model="form.remark"
          class="textarea"
          placeholder="选填，如：希望工作日 14:00 后联系"
          :maxlength="200"
        />
      </view>
    </view>

    <view class="ft">
      <view :class="['submit', submitting ? 'loading' : '']" @click="submit">
        {{ submitting ? '提交中…' : '提交预约' }}
      </view>
      <text class="tip">提交后客服将于 1 个工作日内与您电话联系</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
}
.hero {
  margin: 16rpx 24rpx;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: $shadow-sm;
  .hero-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 24rpx;
    background: rgba(255,77,45,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hero-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .hero-title { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
    .hero-desc { font-size: 22rpx; color: var(--text-tertiary); }
  }
}
.form {
  margin: 16rpx 24rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.row {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border-light);
  padding: 24rpx 0;
  &:last-child { border-bottom: none; }
  &.col {
    flex-direction: column;
    align-items: stretch;
    gap: 12rpx;
  }
  .label {
    width: 140rpx;
    font-size: 26rpx;
    color: var(--text-tertiary);
  }
  .input {
    flex: 1;
    height: 56rpx;
    font-size: 28rpx;
    color: var(--text-primary);
    text-align: right;
  }
  .value {
    flex: 1;
    font-size: 28rpx;
    color: var(--text-primary);
    text-align: right;
    &.placeholder { color: var(--text-tertiary); }
  }
  &.link { cursor: pointer; }
}
.time-row {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  gap: 8rpx;
}
.space-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .chip {
    padding: 8rpx 24rpx;
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    border-radius: 999rpx;
    font-size: 24rpx;
    color: var(--text-primary);
    &.active {
      background: $brand-gradient;
      border-color: transparent;
      color: #fff;
      box-shadow: 0 2rpx 8rpx rgba(255,77,45,0.3);
    }
  }
}
.textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx;
  background: var(--bg-page);
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
}
.ft {
  margin: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  .submit {
    width: 100%;
    height: 96rpx;
    line-height: 96rpx;
    text-align: center;
    background: $brand-gradient;
    color: #fff;
    border-radius: 999rpx;
    font-size: 32rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 16rpx rgba(255,77,45,0.3);
    &.loading { opacity: 0.7; }
  }
  .tip { font-size: 22rpx; color: var(--text-tertiary); }
}
</style>
