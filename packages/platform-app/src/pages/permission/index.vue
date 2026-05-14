<script setup lang="ts">
/**
 * PA-10 · 权限管理
 * 还原 原型图/platform-app.jsx::PA_Perm
 * - Tab：角色 / 管理员
 * - 角色卡：名称 + 成员数 + 权限摘要 + 编辑权限/成员
 * - 管理员卡：头像 + 昵称 + 角色 + 状态 + 最近登录
 */
import { ref, computed, onMounted } from 'vue'
import { permissionService } from '../../services'
import type { AdminUser, AdminRole } from '../../services'
import { formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'

type TabKey = 'roles' | 'admins'

const tab = ref<TabKey>('roles')
const roles = ref<AdminRole[]>([])
const admins = ref<AdminUser[]>([])
const loading = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'roles', label: '角色' },
  { key: 'admins', label: '管理员' },
]

/** 角色对应颜色（按名称硬编码常见角色，未知 → 默认灰）*/
const ROLE_TINT: Record<string, string> = {
  超级管理员: '#FF4D2D',
  运营经理: '#A855F7',
  审核员: '#1296DB',
  客服: '#52C41A',
  财务: '#FAAD14',
}

const memberCountOf = computed(() => {
  return (roleId: string) =>
    admins.value.filter((a) => roles.value.find((r) => r.id === roleId)?.name === a.role).length
})

async function load() {
  loading.value = true
  try {
    const [roleList, adminList] = await Promise.all([
      permissionService.roles(),
      permissionService.admins(),
    ])
    roles.value = roleList
    admins.value = adminList
  } finally {
    loading.value = false
  }
}

/**
 * 角色操作：移动端只接最危险的"删除",创建/改名/改权限因为表单复杂引导去 admin-pc。
 * DELETE /p/roles/:id 后端硬删 prisma.adminRole，已分配该角色的管理员会变成无角色。
 */
function editRole(r: AdminRole) {
  uni.showActionSheet({
    itemList: ['查看成员', '删除角色', '改名 / 改权限（去 admin-pc）'],
    success: (s) => {
      if (s.tapIndex === 0) {
        viewMembers(r)
      } else if (s.tapIndex === 1) {
        uni.showModal({
          title: '删除角色',
          content: `确认删除角色「${r.name}」？该角色下的成员将变为无权限状态。`,
          confirmColor: '#FF3B30',
          success: async (m) => {
            if (!m.confirm) return
            try {
              await permissionService.deleteRole(r.id)
              roles.value = roles.value.filter((x) => x.id !== r.id)
              uni.showToast({ title: '已删除', icon: 'success' })
            } catch (e: any) {
              uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
            }
          },
        })
      } else {
        uni.showToast({ title: '请到 admin-pc 后台修改', icon: 'none' })
      }
    },
  })
}

function viewMembers(r: AdminRole) {
  const members = admins.value.filter((a) => a.role === r.name)
  if (members.length === 0) {
    uni.showToast({ title: '暂无成员', icon: 'none' })
    return
  }
  uni.showModal({
    title: `${r.name} · ${members.length} 名成员`,
    content: members.map((m) => `${m.nickname} (${m.username})`).join('\n'),
    showCancel: false,
  })
}

/**
 * 管理员操作：移动端只接停用/恢复 + 删除。改角色/重置密码涉及 secret-field 操作,
 * 走 admin-pc。所有真实 API:
 * - POST /p/admins/:id/toggle  状态翻转（active ↔ disabled）
 * - DELETE /p/admins/:id        硬删 user 记录
 */
function manageAdmin(a: AdminUser) {
  uni.showActionSheet({
    itemList: [
      a.status === 'active' ? '停用账号' : '恢复账号',
      '删除管理员',
      '改角色 / 重置密码（去 admin-pc）',
    ],
    success: async (s) => {
      try {
        if (s.tapIndex === 0) {
          await permissionService.toggleAdmin(a.id)
          a.status = a.status === 'active' ? 'disabled' : 'active'
          uni.showToast({ title: a.status === 'active' ? '已恢复' : '已停用', icon: 'success' })
        } else if (s.tapIndex === 1) {
          uni.showModal({
            title: '删除管理员',
            content: `确认删除「${a.nickname}」？删除后此账号无法登录平台。`,
            confirmColor: '#FF3B30',
            success: async (m) => {
              if (!m.confirm) return
              try {
                await permissionService.deleteAdmin(a.id)
                admins.value = admins.value.filter((x) => x.id !== a.id)
                uni.showToast({ title: '已删除', icon: 'success' })
              } catch (e: any) {
                uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
              }
            },
          })
        } else {
          uni.showToast({ title: '请到 admin-pc 后台修改', icon: 'none' })
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

function addNew() {
  uni.showModal({
    title: '新增角色 / 管理员',
    content: '新增角色 / 管理员涉及权限配置和密码生成,请到 admin-pc 管理后台 → 权限管理 → 新增。',
    confirmText: '我知道了',
    showCancel: false,
  })
}

function formatLastLogin(t?: string): string {
  if (!t) return '未登录'
  const diff = Date.now() - new Date(t).getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return Math.floor(diff / 60_000) + ' 分钟前'
  if (diff < 86400_000) return Math.floor(diff / 3600_000) + ' 小时前'
  return formatDate(t)
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="权限管理" right-icon="plus" @right="addNew" />

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text>{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 顶部统计 -->
      <view class="stats">
        <view class="stat-item">
          <view class="s-icon">
            <Icon name="lock" :size="28" color="var(--brand-primary)" />
          </view>
          <view class="s-info">
            <text class="s-num">{{ roles.length }}</text>
            <text class="s-label">角色</text>
          </view>
        </view>
        <view class="s-divider" />
        <view class="stat-item">
          <view class="s-icon">
            <Icon name="user" :size="28" color="#A855F7" />
          </view>
          <view class="s-info">
            <text class="s-num">{{ admins.length }}</text>
            <text class="s-label">管理员</text>
          </view>
        </view>
        <view class="s-divider" />
        <view class="stat-item">
          <view class="s-icon">
            <Icon name="check-circle" :size="28" color="#52C41A" />
          </view>
          <view class="s-info">
            <text class="s-num">{{ admins.filter((a) => a.status === 'active').length }}</text>
            <text class="s-label">在线</text>
          </view>
        </view>
      </view>

      <!-- 角色 -->
      <view v-if="tab === 'roles'" class="list">
        <view v-for="r in roles" :key="r.id" class="card">
          <view class="card-head">
            <view class="role-badge" :style="{ background: ROLE_TINT[r.name] || '#86909C' }">
              <text>{{ r.name[0] }}</text>
            </view>
            <view class="card-info">
              <view class="info-head">
                <text class="name">{{ r.name }}</text>
                <view
                  class="count-tag"
                  :style="{
                    color: ROLE_TINT[r.name] || '#86909C',
                    background: (ROLE_TINT[r.name] || '#86909C') + '14',
                  }"
                >
                  {{ memberCountOf(r.id) }} 人
                </view>
              </view>
              <text class="desc">{{ r.desc }}</text>
              <view class="perms">
                <view v-for="p in r.permissions.slice(0, 4)" :key="p" class="perm">
                  {{ p === '*' ? '全部权限' : p }}
                </view>
                <text v-if="r.permissions.length > 4" class="perm-more"
                  >+{{ r.permissions.length - 4 }}</text
                >
              </view>
            </view>
          </view>
          <view class="actions">
            <view class="btn ghost" @click="viewMembers(r)">成员</view>
            <view class="btn primary" @click="editRole(r)">编辑权限</view>
          </view>
        </view>

        <EmptyState
          v-if="!loading && roles.length === 0"
          title="暂无角色"
          desc="点击右上角创建"
          icon="lock"
        />
      </view>

      <!-- 管理员 -->
      <view v-else class="list">
        <view v-for="a in admins" :key="a.id" class="admin-card">
          <image v-if="a.avatar" :src="a.avatar" class="admin-avatar" mode="aspectFill" />
          <view v-else class="admin-avatar fallback">{{ a.nickname[0] }}</view>
          <view class="admin-info">
            <view class="info-head">
              <text class="name">{{ a.nickname }}</text>
              <view :class="['status-tag', a.status]">
                {{ a.status === 'active' ? '在线' : '已停用' }}
              </view>
            </view>
            <view class="meta-row">
              <text class="meta-label">账号</text>
              <text class="meta-value">{{ a.username }}</text>
            </view>
            <view class="meta-row">
              <text class="meta-label">角色</text>
              <view
                class="role-mini"
                :style="{
                  color: ROLE_TINT[a.role] || '#86909C',
                  background: (ROLE_TINT[a.role] || '#86909C') + '14',
                }"
              >
                {{ a.role }}
              </view>
            </view>
            <text class="last-login">最近登录 · {{ formatLastLogin(a.lastLoginAt) }}</text>
          </view>
          <view class="more-btn" @click="manageAdmin(a)">
            <Icon name="more-v" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>

        <EmptyState
          v-if="!loading && admins.length === 0"
          title="暂无管理员"
          desc="点击右上角添加"
          icon="user"
        />
      </view>

      <view style="height: 40rpx" />
    </scroll-view>
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
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}
.stats {
  margin: 16rpx 24rpx 0;
  padding: 16rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: var(--shadow-sm);
}
.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  justify-content: center;
  .s-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 16rpx;
    background: var(--bg-page);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .s-info {
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    .s-num {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .s-label {
      font-size: 20rpx;
      color: var(--text-tertiary);
    }
  }
}
.s-divider {
  width: 1rpx;
  height: 56rpx;
  background: var(--border-light);
}

.list {
  padding: 16rpx 24rpx;
}

/* 角色卡 */
.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
}
.card-head {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  min-width: 0;
}
.role-badge {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36rpx;
  font-weight: 800;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}
.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.info-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.count-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.desc {
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.perms {
  display: flex;
  gap: 6rpx;
  flex-wrap: wrap;
  margin-top: 4rpx;
}
.perm {
  padding: 2rpx 12rpx;
  background: var(--bg-page);
  color: var(--text-secondary);
  border-radius: 999rpx;
  font-size: 18rpx;
  font-family: var(--font-family-base);
}
.perm-more {
  padding: 2rpx 12rpx;
  background: rgba(255, 77, 45, 0.08);
  color: var(--brand-primary);
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  font-family: var(--font-family-base);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  border-top: 1rpx dashed var(--border-light);
  padding-top: 16rpx;
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}

/* 管理员卡 */
.admin-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  min-width: 0;
}
.admin-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--bg-page);
  flex-shrink: 0;
  &.fallback {
    background: var(--brand-gradient);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36rpx;
    font-weight: 800;
  }
}
.admin-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.status-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
  &.active {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }
  &.disabled {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-tertiary);
  }
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  .meta-label {
    flex-shrink: 0;
    width: 64rpx;
  }
  .meta-value {
    color: var(--text-primary);
    font-family: var(--font-family-base);
  }
}
.role-mini {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.last-login {
  font-size: 20rpx;
  color: var(--text-tertiary);
  font-family: var(--font-family-base);
}
.more-btn {
  padding: 8rpx;
  flex-shrink: 0;
}
</style>
