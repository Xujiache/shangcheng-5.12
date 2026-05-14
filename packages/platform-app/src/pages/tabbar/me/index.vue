<script setup lang="ts">
/**
 * PA-Tab · 平台管理员我的
 * - 头像 + 昵称 + 角色徽章
 * - 快捷入口（系统设置/权限/功能开关/会员/数据）
 * - 退出登录
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAdminStore } from '../../../store/admin'
import { merchantService, productAuditService, ticketService, systemService } from '../../../services'
import { platformAuthService } from '../../../services/auth'
import type { SystemSettings } from '../../../services'
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
 * 处理工单数：调 GET /p/tickets/pending-count 拿"未处理"工单数 (open + handling),
 * 失败兜底 0。点击工单卡跳 /pages/ticket/index 进入工单管理。
 *
 * 在线时长：从 adminStore.loginAt 算起到现在,setSession 时已记录登录时刻。
 */
const auditCount = ref<number>(0)
const ticketPending = ref<number>(0)
const tickNow = ref<number>(Date.now())
let tickTimer: ReturnType<typeof setInterval> | null = null

/**
 * 真实登录用户信息(GET /auth/user-info)
 *
 * 取代历史写死的"超级管理员 / admin"信息。
 * 未加载 / 加载失败时 → null,UI 优先回退到 adminStore 内的本地缓存
 * (登录时 setSession 已写入),再回退到通用占位"管理员",
 * 严禁出现固定 role 文案。
 */
interface MeUserInfo {
  id?: string
  username?: string
  nickname?: string
  role?: string
  avatar?: string
  phone?: string
  lastLoginAt?: string
}
const userInfo = ref<MeUserInfo | null>(null)

/** 系统设置(客服联系信息源于 settings.service.{phone,email,workTime}) */
const sysSettings = ref<SystemSettings | null>(null)
const sysSettingsLoaded = ref(false)

const ROLE_LABEL: Record<string, string> = {
  'super-admin': '超级管理员',
  superadmin: '超级管理员',
  platform: '平台管理员',
  admin: '管理员',
  merchant: '商户管理员',
  customer: '普通用户',
  agency: '代理商',
  factory: '厂家',
  visitor: '访客',
}

/** 头像/昵称/用户名 优先后端实时数据,fallback 到本地登录态 */
const meNickname = computed(
  () => userInfo.value?.nickname || adminStore.nickname || '管理员',
)
const meUsername = computed(() => userInfo.value?.username || '—')
const meRoleKey = computed(() => userInfo.value?.role || '')
const meRoleLabel = computed(() => ROLE_LABEL[meRoleKey.value] || meRoleKey.value || '管理员')

/** 最近登录时间(真值,来自后端 user.lastLoginAt) */
function formatLastLogin(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '最近登录 · 刚刚'
  if (diff < 3600_000) return `最近登录 · ${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `最近登录 · ${Math.floor(diff / 3600_000)} 小时前`
  return `最近登录 · ${Math.floor(diff / 86400_000)} 天前`
}
const lastLoginText = computed(() => formatLastLogin(userInfo.value?.lastLoginAt))

async function loadStats() {
  try {
    const [m, p, tp] = await Promise.all([
      merchantService.auditList({ pageSize: 1 }).catch(() => ({ total: 0, list: [] }) as any),
      productAuditService.list({ pageSize: 1 }).catch(() => ({ total: 0, list: [] }) as any),
      ticketService.pendingCount(),
    ])
    auditCount.value = (m?.total ?? 0) + (p?.total ?? 0)
    ticketPending.value = tp
  } catch {
    auditCount.value = 0
    ticketPending.value = 0
  }
}

/** 拉取真实登录用户信息(用于头部展示 + viewProfile 弹窗) */
async function loadMe() {
  try {
    const info = (await platformAuthService.userInfo()) as MeUserInfo | null
    if (info && typeof info === 'object') {
      userInfo.value = info
    }
  } catch {
    // 失败保留 null,UI 自动 fallback 到本地缓存,不展示假数据
  }
}

/** 拉取系统设置(供 openHelp 显示真实客服联系信息) */
async function loadSettings() {
  try {
    sysSettings.value = await systemService.settings()
  } catch {
    sysSettings.value = null
  } finally {
    sysSettingsLoaded.value = true
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
  {
    key: 'audit',
    label: '待审任务',
    value: String(auditCount.value),
    icon: 'check-circle',
    tint: '#52C41A',
    to: '/pages/audit/merchant',
  },
  {
    key: 'ticket',
    label: '待处理工单',
    value: String(ticketPending.value),
    icon: 'message',
    tint: '#1296DB',
    to: '/pages/ticket/index',
  },
  {
    key: 'online',
    label: '在线时长',
    value: onlineDuration.value,
    icon: 'clock',
    tint: '#FAAD14',
    to: '',
  },
])

function onStatTap(card: { key: string; to: string }) {
  if (card.to) {
    uni.navigateTo({ url: card.to })
  }
}

onMounted(() => {
  loadStats()
  loadMe()
  loadSettings()
  tickTimer = setInterval(() => {
    tickNow.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
})

const MANAGE_ENTRIES = [
  {
    key: 'audit',
    icon: 'check-circle',
    label: '入驻审核',
    desc: '商户入驻审核',
    to: '/pages/audit/merchant',
    tint: '#52C41A',
  },
  {
    key: 'product-audit',
    icon: 'package',
    label: '商品审核',
    desc: '商品上架审核',
    to: '/pages/audit/product',
    tint: '#FF7A45',
  },
  {
    key: 'ad',
    icon: 'megaphone',
    label: '广告管理',
    desc: '广告位 / 创意',
    to: '/pages/ad/index',
    tint: '#FAAD14',
  },
  {
    key: 'plaza',
    icon: 'biz-plaza',
    label: '选品广场',
    desc: '商品 / 厂家推送',
    to: '/pages/plaza/index',
    tint: '#1296DB',
  },
  {
    key: 'ticket',
    icon: 'message',
    label: '工单管理',
    desc: '用户反馈处理',
    to: '/pages/ticket/index',
    tint: '#1296DB',
  },
  {
    key: 'share-stats',
    icon: 'gift',
    label: '订单分享数据',
    desc: '查看商家分享统计',
    to: '',
    action: 'share-stats',
    tint: '#A855F7',
  },
]

/**
 * 商家"订单分享"统计原本只在 admin-pc 提供,
 * platform-app 已在 /pages/share-stats/index 原生承接,直接跳转即可。
 */
function goShareStats() {
  uni.navigateTo({ url: '/pages/share-stats/index' })
}

const SYSTEM_ENTRIES = [
  { key: 'member', icon: 'crown', label: '会员&套餐', to: '/pages/member/index' },
  { key: 'feature', icon: 'gear', label: '功能开关', to: '/pages/feature-flag/index' },
  { key: 'perm', icon: 'lock', label: '权限管理', to: '/pages/permission/index' },
  { key: 'legal', icon: 'tag', label: '法律协议', to: '/pages/legal/index' },
  { key: 'app-release', icon: 'package', label: 'APP 发布', to: '/pages/app-release/index' },
  { key: 'feedback-list', icon: 'message', label: '反馈队列', to: '/pages/feedback/admin-list' },
  { key: 'feedback', icon: 'message', label: '我要反馈', to: '/pages/feedback/index' },
  { key: 'system', icon: 'gear', label: '系统设置', to: '/pages/system/index' },
]

function goEntry(to: string) {
  if (!to) {
    uni.showToast({ title: '功能正在准备中,请等待下一版', icon: 'none', duration: 1600 })
    return
  }
  uni.navigateTo({ url: to })
}

/**
 * 帮助中心 —— 真读 GET /p/system/settings 的 service.{phone,email,workTime}。
 * 未配置时显示"暂未配置,请联系平台运营",严禁出现写死的 400-000-0000 / support@jiujiu.com
 * 这类伪造客服信息(早期硬编码会让用户误拨)。
 */
function openHelp() {
  const svc = sysSettings.value?.service
  const phone = (svc?.phone || '').trim()
  const email = (svc?.email || '').trim()
  const workTime = (svc?.workTime || '').trim()

  // 若 settings 还在加载中或后端未配置任何字段,提示运营完善
  if (!sysSettingsLoaded.value) {
    uni.showToast({ title: '正在加载客服信息...', icon: 'none' })
    return
  }
  if (!phone && !email && !workTime) {
    uni.showModal({
      title: '帮助中心',
      content: '暂未配置客服联系方式,请联系平台运营前往「系统设置 → 客服信息」配置后再试。',
      showCancel: true,
      cancelText: '关闭',
      confirmText: '去反馈',
      success: (r) => {
        if (r.confirm) uni.navigateTo({ url: '/pages/feedback/index' })
      },
    })
    return
  }

  const lines: string[] = []
  if (phone) lines.push(`客服热线:${phone}`)
  if (email) lines.push(`邮箱:${email}`)
  if (workTime) lines.push(`工作时间:${workTime}`)
  lines.push('')
  lines.push('如需更多帮助,请在「我要反馈」提交工单。')

  uni.showModal({
    title: '帮助中心',
    content: lines.join('\n'),
    showCancel: true,
    cancelText: '关闭',
    confirmText: '去反馈',
    success: (r) => {
      if (r.confirm) uni.navigateTo({ url: '/pages/feedback/index' })
    },
  })
}

/** 关于平台 - 简介 + 当前版本号 */
function openAbout() {
  uni.showModal({
    title: '关于平台',
    content:
      '经纬科技 · 商城平台管理端\n当前版本：v1.0.0\n\n用于商户审核、订单总览、会员套餐、广告管理等平台运营事务。',
    showCancel: false,
    confirmText: '我知道了',
  })
}

function goManageEntry(item: (typeof MANAGE_ENTRIES)[number]) {
  if (item.action === 'share-stats') {
    goShareStats()
    return
  }
  goEntry(item.to ?? '')
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

/**
 * 账号信息弹窗 —— 优先使用 GET /auth/user-info 返回的真实数据
 * (loadMe() 已在 onMounted 触发)。后端可能尚未返回时回退到本地登录态,
 * 严禁继续硬编码 role="超级管理员" / username="admin"。
 */
function viewProfile() {
  const lines: string[] = []
  lines.push(`昵称: ${meNickname.value}`)
  lines.push(`角色: ${meRoleLabel.value}`)
  lines.push(`账号: ${meUsername.value}`)
  if (userInfo.value?.phone) lines.push(`手机: ${userInfo.value.phone}`)
  lines.push('')
  lines.push('如需修改账号信息,请前往「权限管理」处理。')

  uni.showModal({
    title: '账号信息',
    content: lines.join('\n'),
    showCancel: false,
    confirmText: '我知道了',
  })
}
</script>

<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight }" />

    <!-- 头像区 -->
    <view class="hero">
      <view class="hero-row" @click="viewProfile">
        <view class="avatar-wrap">
          <image
            v-if="adminStore.avatar"
            :src="adminStore.avatar"
            class="avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar fallback">
            {{ (adminStore.nickname || 'A')[0] }}
          </view>
        </view>
        <view class="info">
          <view class="name-row">
            <text class="nick">{{ meNickname }}</text>
            <view class="role-badge">
              <Icon name="crown" :size="20" color="#fff" />
              <text>{{ meRoleLabel }}</text>
            </view>
          </view>
          <text class="sub">{{ meRoleLabel }} · {{ meUsername }}</text>
          <text v-if="lastLoginText" class="last-login">{{ lastLoginText }}</text>
        </view>
        <Icon name="chevron-right" :size="32" color="rgba(255,255,255,0.7)" />
      </view>

      <view class="stat-row">
        <view v-for="s in STAT_CARDS" :key="s.key" class="stat-item" @click="onStatTap(s)">
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

    <view class="body">
      <!-- 业务管理 -->
      <view class="card">
        <text class="card-title">业务管理</text>
        <view class="manage-grid">
          <view
            v-for="e in MANAGE_ENTRIES"
            :key="e.key"
            class="manage-cell"
            @click="goManageEntry(e)"
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
        <view class="sys-row with-divider" @click="openHelp">
          <view class="sys-icon">
            <Icon name="help" :size="32" color="#52C41A" />
          </view>
          <text class="sys-label">帮助中心</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
        <view class="sys-row" @click="openAbout">
          <view class="sys-icon">
            <Icon name="info" :size="32" color="#1296DB" />
          </view>
          <text class="sys-label">关于平台</text>
          <text class="sys-meta">v1.0.0</text>
          <Icon name="chevron-right" :size="28" color="var(--text-tertiary)" />
        </view>
      </view>

      <!-- 退出 -->
      <view class="logout-btn" @click="logout">
        <Icon name="arrow-right" :size="28" color="#FF3B30" />
        <text>退出登录</text>
      </view>
    </view>

    <TabBar current="me" />
  </view>
</template>

<style lang="scss" scoped>
/**
 * 自然文档流布局 —— 不用 flex column + overflow:hidden(mp/App 真包高度计算失败会塌陷)。
 * 顶部 hero 用 position:sticky,底部 TabBar 由组件自身 position:fixed 兜底。
 */
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.hero {
  position: sticky;
  top: 0;
  z-index: 50;
}
.status {
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
}
.hero {
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
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
  background: rgba(255, 255, 255, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  .avatar {
    width: 100%;
    height: 100%;
    display: block;
    &.fallback {
      background: rgba(255, 255, 255, 0.3);
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
    .nick {
      font-size: 36rpx;
      font-weight: 800;
    }
  }
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    background: rgba(255, 255, 255, 0.25);
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
  background: rgba(255, 255, 255, 0.15);
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

.body {
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
  .m-label {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .m-desc {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
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
    background: rgba(255, 77, 45, 0.08);
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
  border: 1rpx solid rgba(255, 59, 48, 0.3);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #ff3b30;
  font-size: 28rpx;
  font-weight: 700;
}
</style>
