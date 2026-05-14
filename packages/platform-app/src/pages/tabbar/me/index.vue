<script setup lang="ts">
/**
 * PA-Tab · 平台管理员我的
 * - 头像 + 昵称 + 角色徽章
 * - 快捷入口（系统设置/权限/功能开关/会员/数据）
 * - 退出登录
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAdminStore } from '../../../store/admin'
import { merchantService, productAuditService } from '../../../services'
import Icon from '../../../components/icon/icon.vue'
import TabBar from '../../../components/tab-bar/tab-bar.vue'

const adminStore = useAdminStore()

const statusBarHeight = computed(() => {
  try {
    return (uni.getSystemInfoSync().statusBarHeight ?? 0) + 'px'
  } catch {
    return '0px'
  }
})

/**
 * 本月审核数 = 商户审核待办 + 商品审核待办,基于后端 total 字段。
 * 后端 `/p/audit/merchants` 默认只返 status=pending,
 * `/p/audit/products` 默认 status=pending → 内部 status=auditing。
 * 这里只统计 "当前待审" 总量,因为后端没有 "本月已审" 聚合接口。
 *
 * 处理工单数：工单（ticket）模块尚未上线，UI 显示「— 暂未接入」并禁用入口。
 * 后端补 GET /p/tickets/handled-count?month=YYYY-MM 后，把 placeholder 替换成
 * 实际请求即可，不需要再改 UI 结构。
 *
 * 在线时长：从 adminStore.loginAt 算起到现在,setSession 时已记录登录时刻。
 */
const auditCount = ref<number>(0)
const tickNow = ref<number>(Date.now())
let tickTimer: ReturnType<typeof setInterval> | null = null

async function loadStats() {
  try {
    const [m, p] = await Promise.all([
      merchantService.auditList({ pageSize: 1 }).catch(() => ({ total: 0, list: [] }) as any),
      productAuditService.list({ pageSize: 1 }).catch(() => ({ total: 0, list: [] }) as any),
    ])
    auditCount.value = (m?.total ?? 0) + (p?.total ?? 0)
  } catch {
    auditCount.value = 0
  }
}

function formatOnlineDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const h = totalMin / 60
  return `${h.toFixed(1)}h`
}

const onlineDuration = computed(() => {
  if (!adminStore.loginAt) return '—'
  return formatOnlineDuration(tickNow.value - adminStore.loginAt)
})

const STAT_CARDS = computed(() => [
  { label: '待审任务', value: String(auditCount.value), icon: 'check-circle', tint: '#52C41A' },
  { label: '工单(暂未接入)', value: '—', icon: 'message', tint: '#1296DB' },
  { label: '在线时长', value: onlineDuration.value, icon: 'clock', tint: '#FAAD14' },
])

onMounted(() => {
  loadStats()
  tickTimer = setInterval(() => {
    tickNow.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
})

const MANAGE_ENTRIES = [
  { key: 'audit', icon: 'check-circle', label: '入驻审核', desc: '商户入驻审核', to: '/pages/audit/merchant', tint: '#52C41A' },
  { key: 'product-audit', icon: 'package', label: '商品审核', desc: '商品上架审核', to: '/pages/audit/product', tint: '#FF7A45' },
  { key: 'ad', icon: 'megaphone', label: '广告管理', desc: '广告位 / 创意', to: '/pages/ad/index', tint: '#FAAD14' },
  { key: 'plaza', icon: 'biz-plaza', label: '选品广场', desc: '商品 / 厂家推送', to: '/pages/plaza/index', tint: '#1296DB' },
]

const SYSTEM_ENTRIES = [
  { key: 'member', icon: 'crown', label: '会员&套餐', to: '/pages/member/index' },
  { key: 'feature', icon: 'gear', label: '功能开关', to: '/pages/feature-flag/index' },
  { key: 'perm', icon: 'lock', label: '权限管理', to: '/pages/permission/index' },
  { key: 'legal', icon: 'tag', label: '法律协议', to: '/pages/legal/index' },
  { key: 'app-release', icon: 'package', label: 'APP 发布', to: '/pages/app-release/index' },
  { key: 'system', icon: 'gear', label: '系统设置', to: '/pages/system/index' },
]

function goEntry(to: string) {
  if (!to) {
    uni.showToast({ title: '待开放', icon: 'none' })
    return
  }
  uni.navigateTo({ url: to })
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出当前管理员账号？',
    confirmColor: '#FF3B30',
    success: (r) => {
      if (r.confirm) {
        adminStore.logout()
        uni.showToast({ title: '已退出', icon: 'success', duration: 800 })
        setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 600)
      }
    },
  })
}

function viewProfile() {
  uni.showToast({ title: '账号信息 · 待开放', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight }" />

    <!-- 头像区 -->
    <view class="hero">
      <view class="hero-row" @click="viewProfile">
        <view class="avatar-wrap">
          <image v-if="adminStore.avatar" :src="adminStore.avatar" class="avatar" mode="aspectFill" />
          <view v-else class="avatar fallback">
            {{ (adminStore.nickname || 'A')[0] }}
          </view>
        </view>
        <view class="info">
          <view class="name-row">
            <text class="nick">{{ adminStore.nickname }}</text>
            <view class="role-badge">
              <Icon name="crown" :size="20" color="#fff" />
              <text>超级管理员</text>
            </view>
          </view>
          <text class="sub">平台管理员 · admin</text>
          <text class="last-login">最近登录 · 刚刚 · IP 192.168.x.x</text>
        </view>
        <Icon name="chevron-right" :size="32" color="rgba(255,255,255,0.7)" />
      </view>

      <view class="stat-row">
        <view v-for="s in STAT_CARDS" :key="s.label" class="stat-item">
          <view class="stat-icon" :style="{ background: 'rgba(255,255,255,0.2)' }">
            <Icon :name="s.icon" :size="24" color="#fff" />
          </view>
          <view class="stat-info">
            <text class="s-num">{{ s.value }}</text>
            <text class="s-label">{{ s.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 业务管理 -->
      <view class="card">
        <text class="card-title">业务管理</text>
        <view class="manage-grid">
          <view
            v-for="e in MANAGE_ENTRIES"
            :key="e.key"
            class="manage-cell"
            @click="goEntry(e.to)"
          >
            <view class="m-icon" :style="{ background: e.tint + '18' }">
              <Icon :name="e.icon" :size="40" :color="e.tint" />
            </view>
            <text class="m-label">{{ e.label }}</text>
            <text class="m-desc">{{ e.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 系统设置 -->
      <view class="card">
        <text class="card-title">系统</text>
        <view
          v-for="(e, i) in SYSTEM_ENTRIES"
          :key="e.key"
          class="sys-row"
          :class="{ 'with-divider': i < SYSTEM_ENTRIES.length - 1 }"
          @click="goEntry(e.to)"
        >
          <view class="sys-icon">
            <Icon :name="e.icon" :size="32" color="var(--brand-primary)" />
          </view>
          <text class="sys-label">{{ e.label }}</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
      </view>

      <!-- 其他 -->
      <view class="card">
        <view class="sys-row" @click="goEntry('')">
          <view class="sys-icon">
            <Icon name="help" :size="32" color="#52C41A" />
          </view>
          <text class="sys-label">帮助中心</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
        <view class="sys-row with-divider" />
        <view class="sys-row" @click="goEntry('')">
          <view class="sys-icon">
            <Icon name="info" :size="32" color="#1296DB" />
          </view>
          <text class="sys-label">关于平台</text>
          <text class="sys-meta">v1.0.0</text>
        </view>
      </view>

      <!-- 退出 -->
      <view class="logout-btn" @click="logout">
        <Icon name="arrow-right" :size="28" color="#FF3B30" />
        <text>退出登录</text>
      </view>

      <view style="height: 160rpx;" />
    </scroll-view>

    <TabBar current="me" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.status { background: linear-gradient(135deg, #FF4D2D, #FF9C6E); }
.hero {
  background: linear-gradient(135deg, #FF4D2D, #FF9C6E);
  padding: 8rpx 0 36rpx;
  color: #fff;
}
.hero-row {
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.avatar-wrap {
  flex-shrink: 0;
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255,255,255,0.2);
  border: 4rpx solid rgba(255,255,255,0.4);
  .avatar {
    width: 100%;
    height: 100%;
    display: block;
    &.fallback {
      background: rgba(255,255,255,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 56rpx;
      font-weight: 800;
    }
  }
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .name-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    flex-wrap: wrap;
    .nick { font-size: 36rpx; font-weight: 800; }
  }
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    background: rgba(255,255,255,0.25);
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
  .sub {
    font-size: 22rpx;
    opacity: 0.9;
  }
  .last-login {
    font-size: 18rpx;
    opacity: 0.8;
    font-family: var(--font-family-base);
  }
}

.stat-row {
  margin: 16rpx 24rpx 0;
  padding: 12rpx;
  background: rgba(255,255,255,0.15);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  backdrop-filter: blur(4rpx);
}
.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  justify-content: center;
  .stat-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .s-num {
      font-size: 26rpx;
      font-weight: 800;
      font-family: var(--font-family-base);
      line-height: 1;
    }
    .s-label {
      font-size: 18rpx;
      opacity: 0.85;
    }
  }
}

.scroll {
  flex: 1;
  height: 0;
  margin-top: -16rpx;
  box-sizing: border-box;
}
.card {
  margin: 0 24rpx 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  box-shadow: var(--shadow-md);
}
.card-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16rpx;
}

/* 业务管理网格 */
.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.manage-cell {
  background: var(--bg-page);
  border-radius: 16rpx;
  padding: 20rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  .m-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4rpx;
  }
  .m-label { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
  .m-desc { font-size: 20rpx; color: var(--text-tertiary); }
}

/* 系统行 */
.sys-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  &.with-divider {
    border-bottom: 1rpx dashed var(--border-light);
  }
  .sys-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 16rpx;
    background: rgba(255,77,45,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sys-label {
    flex: 1;
    font-size: 28rpx;
    color: var(--text-primary);
  }
  .sys-meta {
    font-size: 22rpx;
    color: var(--text-tertiary);
    font-family: var(--font-family-base);
  }
}

.logout-btn {
  margin: 24rpx;
  height: 96rpx;
  background: var(--bg-card);
  border: 1rpx solid rgba(255,59,48,0.3);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #FF3B30;
  font-size: 28rpx;
  font-weight: 700;
}
</style>
