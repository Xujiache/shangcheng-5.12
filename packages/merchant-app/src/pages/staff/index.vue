<script setup lang="ts">
/**
 * MA-16 · 员工管理
 *
 * 顶部统计 + Tab + 员工卡（角色 + 业绩 + 权限）+ 邀请 / 编辑 / 离职
 */
import { ref, computed, reactive, onMounted } from 'vue'
import { staffService } from '../../services/store'
import type { Staff } from '@jiujiu/shared/types'
import { formatPrice, maskPhone } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Tabs from '../../components/tabs/tabs.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import Icon from '../../components/icon/icon.vue'

type Tab = 'all' | 'sales' | 'cs' | 'manager'

const tab = ref<Tab>('all')
const list = ref<Staff[]>([])

const ROLE_LABEL: Record<string, { text: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  sales: { text: '销售员', tone: 'primary' },
  cs: { text: '客服', tone: 'info' },
  manager: { text: '店长', tone: 'warning' },
}

const TABS = computed(() => [
  { key: 'all' as Tab, label: '全部', badge: list.value.filter((s) => s.status === 'active').length },
  { key: 'sales' as Tab, label: '销售员' },
  { key: 'cs' as Tab, label: '客服' },
  { key: 'manager' as Tab, label: '店长' },
])

const filtered = computed(() => {
  if (tab.value === 'all') return list.value
  return list.value.filter((s) => s.role === tab.value)
})

const total = computed(() => list.value.filter((s) => s.status === 'active').length)
const topPerf = computed(() => Math.max(...list.value.map((s) => s.monthlyPerformance ?? 0), 1))

const showEditor = ref(false)
const editing = reactive<{ id?: string; name: string; phone: string; role: 'sales' | 'cs' | 'manager' }>({
  name: '',
  phone: '',
  role: 'sales',
})

const PERMS_PRESET = ['product:read', 'product:write', 'order:read', 'order:write', 'customer:read', 'customer:write', 'chat:write', 'stats:read']

async function load() {
  const data = await staffService.list({ pageSize: 30 })
  list.value = data.list
}

function openInvite() {
  Object.assign(editing, { id: undefined, name: '', phone: '', role: 'sales' })
  showEditor.value = true
}
function openEdit(s: Staff) {
  Object.assign(editing, { id: s.id, name: s.name, phone: s.phone, role: s.role })
  showEditor.value = true
}

async function saveStaff() {
  if (!editing.name || !editing.phone) {
    uni.showToast({ title: '请填写姓名和手机号', icon: 'none' })
    return
  }
  if (editing.id) {
    await staffService.update(editing.id, {
      name: editing.name,
      phone: editing.phone,
      role: editing.role,
    })
  } else {
    await staffService.create({
      name: editing.name,
      phone: editing.phone,
      role: editing.role,
      status: 'active',
      permissions: PERMS_PRESET.slice(0, 3),
    })
  }
  uni.showToast({ title: editing.id ? '已更新' : '已邀请', icon: 'success' })
  showEditor.value = false
  load()
}

function offboard(s: Staff) {
  uni.showModal({
    title: '员工离职',
    content: `确认「${s.name}」已离职？离职后将无法登录后台。`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (r.confirm) {
        s.status = 'left'
        await staffService.update(s.id, { status: 'left' })
        uni.showToast({ title: '已离职' })
      }
    },
  })
}

function callStaff(s: Staff) {
  uni.makePhoneCall({ phoneNumber: s.phone })
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="员工管理" right-text="＋ 邀请" @right="openInvite" />

    <!-- 顶部概览 -->
    <view class="hero">
      <view class="hero-stat">
        <text class="hero-value">{{ total }}</text>
        <text class="hero-label">在职员工</text>
      </view>
      <view class="divider" />
      <view class="hero-stat">
        <text class="hero-value">{{ formatPrice(list.reduce((s, x) => s + (x.monthlyPerformance ?? 0), 0)) }}</text>
        <text class="hero-label">本月业绩</text>
      </view>
    </view>

    <view class="header">
      <Tabs v-model="tab" :items="TABS" variant="underline" />
    </view>

    <view class="list">
      <view v-for="s in filtered" :key="s.id" class="card">
        <view class="card-head">
          <view class="avatar">{{ s.name.slice(-1) }}</view>
          <view class="info">
            <view class="name-row">
              <text class="name">{{ s.name }}</text>
              <StatusTag :text="ROLE_LABEL[s.role].text" :tone="ROLE_LABEL[s.role].tone" />
              <StatusTag v-if="s.status === 'left'" text="已离职" tone="default" />
            </view>
            <text class="phone">{{ maskPhone(s.phone) }}</text>
          </view>
          <view class="phone-btn" @click="callStaff(s)">
            <Icon name="phone" :size="32" color="var(--brand-primary)" />
          </view>
        </view>

        <view v-if="s.status === 'active'" class="perf">
          <view class="perf-info">
            <text class="perf-label">本月业绩</text>
            <text class="perf-value">{{ formatPrice(s.monthlyPerformance ?? 0) }}</text>
          </view>
          <view class="perf-bar">
            <view class="perf-fill" :style="{ width: ((s.monthlyPerformance ?? 0) / topPerf * 100) + '%' }"></view>
          </view>
        </view>

        <view class="perms">
          <text class="perms-label">权限</text>
          <view class="perms-list">
            <text v-for="p in s.permissions.slice(0, 4)" :key="p" class="perm-pill">{{ p.replace(':', ' · ') }}</text>
            <text v-if="s.permissions.length > 4" class="perm-more">+{{ s.permissions.length - 4 }}</text>
          </view>
        </view>

        <view class="card-actions">
          <view class="action ghost" @click="openEdit(s)">编辑</view>
          <view v-if="s.status === 'active'" class="action danger" @click="offboard(s)">离职</view>
        </view>
      </view>

      <EmptyState v-if="list.length === 0" title="暂无员工" desc="点击右上角邀请" />
    </view>

    <view class="safe-bottom" />

    <!-- 邀请/编辑浮层 -->
    <view v-if="showEditor" class="mask" @click="showEditor = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text>{{ editing.id ? '编辑员工' : '邀请新员工' }}</text>
          <text class="close" @click="showEditor = false">✕</text>
        </view>
        <view class="form">
          <view class="form-row">
            <text class="form-label required">姓名</text>
            <input v-model="editing.name" class="form-input" placeholder="员工真实姓名" />
          </view>
          <view class="form-row">
            <text class="form-label required">手机号</text>
            <input v-model="editing.phone" class="form-input" placeholder="手机号 · 登录账号" maxlength="11" />
          </view>
          <view class="form-row">
            <text class="form-label">角色</text>
            <view class="role-row">
              <view
                v-for="r in ['sales', 'cs', 'manager'] as const"
                :key="r"
                :class="['role-opt', { active: editing.role === r }]"
                @click="editing.role = r"
              >{{ ROLE_LABEL[r].text }}</view>
            </view>
          </view>
        </view>
        <view class="sheet-footer">
          <view class="sf-btn ghost" @click="showEditor = false">取消</view>
          <view class="sf-btn primary" @click="saveStaff">{{ editing.id ? '保存' : '邀请' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-page); padding-bottom: 40rpx; }
.hero {
  background: var(--brand-gradient);
  color: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  display: flex;
  align-items: center;
  .hero-stat {
    flex: 1;
    text-align: center;
    .hero-value {
      font-size: 40rpx;
      font-weight: 700;
      font-family: var(--font-family-base);
    }
    .hero-label {
      display: block;
      margin-top: 4rpx;
      font-size: 22rpx;
      opacity: 0.9;
    }
  }
  .divider {
    width: 2rpx;
    height: 56rpx;
    background: rgba(255,255,255,0.3);
  }
}
.header {
  background: var(--bg-card);
  position: sticky;
  top: 0;
  z-index: 5;
  border-bottom: 1rpx solid var(--border-light);
}
.list { padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.card {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  .avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: var(--brand-gradient);
    color: #fff;
    text-align: center;
    line-height: 80rpx;
    font-size: 32rpx;
    font-weight: 700;
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    .name-row {
      display: flex;
      align-items: center;
      gap: 8rpx;
      flex-wrap: wrap;
      .name { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
    }
    .phone {
      font-size: 22rpx;
      color: var(--text-tertiary);
      font-family: var(--font-family-base);
    }
  }
  .phone-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: var(--brand-primary-ghost);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.perf {
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .perf-info {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    .perf-label { font-size: 22rpx; color: var(--text-tertiary); }
    .perf-value {
      font-size: 28rpx;
      font-weight: 700;
      color: var(--brand-primary);
      font-family: var(--font-family-base);
    }
  }
  .perf-bar {
    height: 8rpx;
    background: var(--bg-active);
    border-radius: 999rpx;
    overflow: hidden;
    .perf-fill {
      height: 100%;
      background: var(--brand-gradient);
      border-radius: 999rpx;
    }
  }
}
.perms {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  .perms-label {
    flex-shrink: 0;
    font-size: 22rpx;
    color: var(--text-tertiary);
    padding-top: 4rpx;
  }
  .perms-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6rpx;
    .perm-pill {
      padding: 2rpx 8rpx;
      background: var(--bg-hover);
      border-radius: 4rpx;
      font-size: 18rpx;
      color: var(--text-secondary);
    }
    .perm-more {
      padding: 2rpx 8rpx;
      font-size: 18rpx;
      color: var(--text-tertiary);
    }
  }
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed var(--border-light);
  .action {
    padding: 8rpx 24rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    &.ghost { background: var(--bg-hover); color: var(--text-primary); }
    &.danger { background: transparent; color: var(--status-error); border: 1rpx solid var(--status-error); }
  }
}
.mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
}
.sheet-head {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid var(--border-light);
  font-size: 30rpx; font-weight: 700;
  .close { color: var(--text-tertiary); }
}
.form {
  padding-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
  .form-label {
    width: 140rpx;
    font-size: 26rpx;
    color: var(--text-secondary);
    &.required::before { content: '*'; color: var(--status-error); margin-right: 4rpx; }
  }
  .form-input {
    flex: 1;
    background: var(--bg-page);
    border-radius: 8rpx;
    padding: 12rpx 16rpx;
    font-size: 26rpx;
  }
}
.role-row {
  flex: 1;
  display: flex;
  gap: 8rpx;
}
.role-opt {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  background: var(--bg-hover);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  border: 1rpx solid transparent;
  &.active {
    background: var(--brand-primary-ghost);
    color: var(--brand-primary);
    border-color: var(--brand-primary);
    font-weight: 700;
  }
}
.sheet-footer {
  display: flex; gap: 12rpx;
  padding: 16rpx 0 24rpx;
  .sf-btn {
    flex: 1; height: 80rpx; border-radius: 999rpx;
    text-align: center; line-height: 80rpx;
    font-size: 26rpx; font-weight: 600;
    &.ghost { background: var(--bg-hover); color: var(--text-primary); }
    &.primary { background: var(--brand-gradient); color: #fff; }
  }
}
.safe-bottom { height: 40rpx; }
</style>
