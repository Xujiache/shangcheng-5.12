<script setup lang="ts">
/**
 * PA-10 · 权限管理(移动端全量实现)
 *
 * 改造前: 新建角色 / 改角色权限 / 新建管理员 / 重置密码 全部弹 modal 引导去 admin-pc。
 * 改造后: 全部能力上移动端,通过 FormSheet 直接落库,杜绝 "去 admin-pc" 提示。
 *
 * 功能矩阵:
 *   - 角色 (roles):    新建(名 + 描述 + 权限多选) / 编辑(名 + 权限) / 删除 / 查看成员
 *   - 管理员 (admins):  新建(基础信息 + 初始密码) / 改角色 / 重置密码(仅 super-admin) / 停用-恢复 / 删除
 *
 * 后端依赖:
 *   - POST /p/roles                    saveRole (传 id=更新)
 *   - DELETE /p/roles/:id              deleteRole
 *   - POST /p/admins                   createAdmin
 *   - PUT /p/admins/:id                updateAdmin (字段白名单 username/phone/email/nickname/avatar/role/status)
 *   - POST /p/admins/:id/reset-password 仅 super-admin 可调
 *   - POST /p/admins/:id/toggle        启用/停用切换
 *   - DELETE /p/admins/:id             硬删
 *
 * 权限项与 admin-pc 保持一致(packages/admin-pc/src/views/platform/permission/index.vue ROLE_PERMISSIONS),
 * 后端只存字符串数组,前端做 label 映射展示。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { permissionService } from '../../services'
import type { AdminUser, AdminRole, AdminRoleDto, AdminUserDto } from '../../services'
import { useAdminStore } from '../../store/admin'
import { formatDate } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import FormSheet from '../../components/form-sheet/form-sheet.vue'

type TabKey = 'roles' | 'admins'

const tab = ref<TabKey>('roles')
const roles = ref<AdminRole[]>([])
const admins = ref<AdminUser[]>([])
const loading = ref(false)
const adminStore = useAdminStore()

/**
 * 当前登录管理员是否 super-admin
 * - 仅 super-admin 才能看到 "重置密码" 入口
 * - 后端也会再次校验角色身份(双重防御)
 */
const isSuperAdmin = computed(() => {
  const r = (adminStore.admin as any)?.role
  return r === 'super-admin'
})

const TABS: { key: TabKey; label: string }[] = [
  { key: 'roles', label: '角色' },
  { key: 'admins', label: '管理员' },
]

/** 角色对应颜色(按名称硬编码常见角色,未知 → 默认灰) */
const ROLE_TINT: Record<string, string> = {
  超级管理员: '#FF4D2D',
  运营经理: '#A855F7',
  审核员: '#1296DB',
  客服: '#52C41A',
  财务: '#FAAD14',
}

/**
 * 权限项与 admin-pc 对齐(packages/admin-pc/src/views/platform/permission/index.vue),
 * value 是后端落库的字符串, label 是 UI 展示文案
 */
const PERMISSION_OPTIONS = [
  { value: 'merchant:*', label: '商户管理' },
  { value: 'order:read', label: '订单查看' },
  { value: 'audit:*', label: '审核' },
  { value: 'ad:*', label: '广告' },
  { value: 'member:read', label: '会员' },
  { value: 'finance:*', label: '财务' },
  { value: 'system:*', label: '系统' },
  { value: '*', label: '全部权限' },
]
const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_OPTIONS.map((o) => [o.value, o.label]),
)
function labelOfPermission(p: string): string {
  return PERMISSION_LABEL[p] || p
}

/**
 * prisma user.role 字段取值 - 这是 user 表上的固定字段, 不是 AdminRole 表的角色
 * 后端 createAdmin 校验 ALLOWED_NORMAL_ROLES = ['admin', 'platform']
 * super-admin 仅 super-admin 调用者可以指派
 */
const USER_ROLE_OPTIONS = [
  { value: 'admin', label: '平台运营 (admin)' },
  { value: 'platform', label: '平台普通 (platform)' },
]

const memberCountOf = computed(() => {
  return (roleName: string) => admins.value.filter((a) => a.role === roleName).length
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
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ============================================================
// 角色 sheet (新建 / 编辑)
// ============================================================
type RoleMode = 'create' | 'edit'
const roleSheetOpen = ref(false)
const roleSheetMode = ref<RoleMode>('create')
const editingRoleId = ref<string | null>(null)
const roleSubmitting = ref(false)
const roleForm = reactive<{ name: string; desc: string; permissions: string[] }>({
  name: '',
  desc: '',
  permissions: [],
})

function resetRoleForm() {
  roleForm.name = ''
  roleForm.desc = ''
  roleForm.permissions = []
}

function openCreateRole() {
  resetRoleForm()
  editingRoleId.value = null
  roleSheetMode.value = 'create'
  roleSheetOpen.value = true
}

function openEditRole(r: AdminRole) {
  resetRoleForm()
  editingRoleId.value = r.id
  roleForm.name = r.name
  roleForm.desc = r.desc || ''
  roleForm.permissions = [...(r.permissions || [])]
  roleSheetMode.value = 'edit'
  roleSheetOpen.value = true
}

function togglePerm(p: string) {
  const i = roleForm.permissions.indexOf(p)
  if (i >= 0) roleForm.permissions.splice(i, 1)
  else roleForm.permissions.push(p)
}

const roleSheetConfirmDisabled = computed(() => {
  return !roleForm.name.trim()
})

async function submitRoleSheet() {
  if (roleSubmitting.value) return
  roleSubmitting.value = true
  try {
    if (!roleForm.name.trim()) {
      uni.showToast({ title: '请填写角色名称', icon: 'none' })
      return
    }
    const dto: AdminRoleDto = {
      name: roleForm.name.trim(),
      desc: roleForm.desc.trim(),
      permissions: roleForm.permissions,
    }
    if (roleSheetMode.value === 'edit' && editingRoleId.value) {
      // 走显式 PUT 通道, 与 saveRole 等价但语义更清
      await permissionService.updateRole(editingRoleId.value, dto)
    } else {
      await permissionService.saveRole(dto)
    }
    uni.showToast({
      title: roleSheetMode.value === 'edit' ? '已保存' : '已创建',
      icon: 'success',
    })
    roleSheetOpen.value = false
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    roleSubmitting.value = false
  }
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

function openRoleActions(r: AdminRole) {
  uni.showActionSheet({
    itemList: ['查看成员', '编辑角色 (名称 / 权限)', '删除角色'],
    success: async (s) => {
      try {
        if (s.tapIndex === 0) {
          viewMembers(r)
        } else if (s.tapIndex === 1) {
          openEditRole(r)
        } else if (s.tapIndex === 2) {
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
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

// ============================================================
// 管理员 sheet (新建 / 改角色)
// ============================================================
type AdminMode = 'create' | 'edit-role'
const adminSheetOpen = ref(false)
const adminSheetMode = ref<AdminMode>('create')
const editingAdminId = ref<string | null>(null)
const adminSubmitting = ref(false)
const adminForm = reactive<{
  username: string
  nickname: string
  email: string
  phone: string
  role: string
  password: string
}>({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  role: 'platform',
  password: '',
})

function resetAdminForm() {
  adminForm.username = ''
  adminForm.nickname = ''
  adminForm.email = ''
  adminForm.phone = ''
  adminForm.role = 'platform'
  adminForm.password = ''
}

function openCreateAdmin() {
  resetAdminForm()
  editingAdminId.value = null
  adminSheetMode.value = 'create'
  adminSheetOpen.value = true
}

function openEditAdminRole(a: AdminUser) {
  resetAdminForm()
  editingAdminId.value = a.id
  adminForm.username = a.username
  adminForm.nickname = a.nickname
  // 管理员的 user.role 字段可能是中文角色名(历史数据) 或 admin/platform 字面量,
  // 优先把它丢进表单, 让用户能看到当前值, 再改成 admin / platform 之一
  adminForm.role = a.role || 'platform'
  adminSheetMode.value = 'edit-role'
  adminSheetOpen.value = true
}

const adminSheetTitle = computed(() => {
  if (adminSheetMode.value === 'create') return '新建管理员'
  return '修改管理员角色'
})

const adminSheetConfirmDisabled = computed(() => {
  if (adminSheetMode.value === 'create') {
    return (
      !adminForm.username.trim() ||
      !adminForm.password ||
      adminForm.password.length < 8 ||
      !adminForm.role
    )
  }
  return !adminForm.role
})

async function submitAdminSheet() {
  if (adminSubmitting.value) return
  adminSubmitting.value = true
  try {
    if (adminSheetMode.value === 'create') {
      if (!adminForm.username.trim()) {
        uni.showToast({ title: '请填写账号', icon: 'none' })
        return
      }
      if (!adminForm.password || adminForm.password.length < 8) {
        uni.showToast({ title: '密码至少 8 位', icon: 'none' })
        return
      }
      const dto: AdminUserDto = {
        username: adminForm.username.trim(),
        nickname: adminForm.nickname.trim() || adminForm.username.trim(),
        email: adminForm.email.trim() || undefined,
        phone: adminForm.phone.trim() || undefined,
        role: adminForm.role,
        password: adminForm.password,
      }
      await permissionService.createAdminUser(dto)
      adminSheetOpen.value = false
      const initial = adminForm.password
      uni.showModal({
        title: '账号已创建',
        content: `账号:${dto.username}\n初始密码:${initial}\n\n请立即通知本人,本提示关闭后无法再次查看。`,
        showCancel: false,
        confirmText: '我已记下',
      })
      await load()
    } else if (editingAdminId.value) {
      await permissionService.updateAdminUser(editingAdminId.value, {
        role: adminForm.role,
        username: adminForm.username,
        nickname: adminForm.nickname,
      })
      uni.showToast({ title: '已保存', icon: 'success' })
      adminSheetOpen.value = false
      await load()
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    adminSubmitting.value = false
  }
}

// ============================================================
// 重置密码 sheet (仅 super-admin)
// ============================================================
const resetSheetOpen = ref(false)
const resetSubmitting = ref(false)
const resetTarget = ref<AdminUser | null>(null)
const resetForm = reactive({ password: '', confirm: '' })

function openResetPassword(a: AdminUser) {
  resetTarget.value = a
  resetForm.password = ''
  resetForm.confirm = ''
  resetSheetOpen.value = true
}

const resetConfirmDisabled = computed(() => {
  return (
    !resetForm.password || resetForm.password.length < 8 || resetForm.password !== resetForm.confirm
  )
})

async function submitResetPassword() {
  if (resetSubmitting.value) return
  if (!resetTarget.value) return
  if (!resetForm.password || resetForm.password.length < 8) {
    uni.showToast({ title: '密码至少 8 位', icon: 'none' })
    return
  }
  if (resetForm.password !== resetForm.confirm) {
    uni.showToast({ title: '两次输入不一致', icon: 'none' })
    return
  }
  resetSubmitting.value = true
  try {
    await permissionService.resetAdminPassword(resetTarget.value.id, resetForm.password)
    resetSheetOpen.value = false
    uni.showModal({
      title: '密码已重置',
      content: `账号:${resetTarget.value.username}\n新密码:${resetForm.password}\n\n请立即复制并通知本人,本提示关闭后无法再次查看。`,
      showCancel: false,
      confirmText: '我已记下',
    })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '重置失败', icon: 'none' })
  } finally {
    resetSubmitting.value = false
  }
}

// ============================================================
// 管理员: 停用/恢复 + 删除 + 操作菜单
// ============================================================
function openAdminActions(a: AdminUser) {
  const items = ['修改角色', a.status === 'active' ? '停用账号' : '恢复账号', '删除管理员']
  if (isSuperAdmin.value && a.id !== adminStore.admin?.id) {
    items.splice(1, 0, '重置密码')
  }
  uni.showActionSheet({
    itemList: items,
    success: async (s) => {
      // 因为可能动态插入"重置密码", 这里按 itemList 实际索引判断
      const action = items[s.tapIndex]
      try {
        if (action === '修改角色') {
          openEditAdminRole(a)
        } else if (action === '重置密码') {
          openResetPassword(a)
        } else if (action === '停用账号' || action === '恢复账号') {
          await permissionService.toggleAdmin(a.id)
          a.status = a.status === 'active' ? 'disabled' : 'active'
          uni.showToast({ title: a.status === 'active' ? '已恢复' : '已停用', icon: 'success' })
        } else if (action === '删除管理员') {
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
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

function onNavRightTap() {
  if (tab.value === 'roles') openCreateRole()
  else openCreateAdmin()
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
    <NavBar title="权限管理" right-icon="plus" @right="onNavRightTap" />

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
        <view class="quick-toolbar">
          <view class="qt-btn primary" @click="openCreateRole">
            <Icon name="plus" :size="24" color="#fff" />
            <text>新建角色</text>
          </view>
        </view>
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
                  {{ memberCountOf(r.name) }} 人
                </view>
              </view>
              <text class="desc">{{ r.desc || '未填描述' }}</text>
              <view class="perms">
                <view v-for="p in r.permissions.slice(0, 4)" :key="p" class="perm">
                  {{ labelOfPermission(p) }}
                </view>
                <text v-if="r.permissions.length > 4" class="perm-more"
                  >+{{ r.permissions.length - 4 }}</text
                >
              </view>
            </view>
          </view>
          <view class="actions">
            <view class="btn ghost" @click="viewMembers(r)">成员</view>
            <view class="btn ghost" @click="openEditRole(r)">编辑</view>
            <view class="btn primary" @click="openRoleActions(r)">更多</view>
          </view>
        </view>

        <EmptyState
          v-if="!loading && roles.length === 0"
          title="暂无角色"
          desc="点击「新建角色」配置权限"
          icon="lock"
        />
      </view>

      <!-- 管理员 -->
      <view v-else class="list">
        <view class="quick-toolbar">
          <view class="qt-btn primary" @click="openCreateAdmin">
            <Icon name="plus" :size="24" color="#fff" />
            <text>新建管理员</text>
          </view>
        </view>
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
          <view class="more-btn" @click="openAdminActions(a)">
            <Icon name="more-v" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>

        <EmptyState
          v-if="!loading && admins.length === 0"
          title="暂无管理员"
          desc="点击「新建管理员」添加账号"
          icon="user"
        />
      </view>

      <view style="height: 40rpx" />
    </scroll-view>

    <!-- 角色 sheet -->
    <FormSheet
      :open="roleSheetOpen"
      :title="roleSheetMode === 'create' ? '新建角色' : '编辑角色'"
      :confirm-text="roleSheetMode === 'create' ? '创建' : '保存'"
      :loading="roleSubmitting"
      :disabled="roleSheetConfirmDisabled"
      @close="roleSheetOpen = false"
      @confirm="submitRoleSheet"
    >
      <view class="form-row">
        <text class="form-label">角色名称<text class="required">*</text></text>
        <input
          v-model="roleForm.name"
          class="form-input"
          placeholder="如:运营经理 / 审核员 / 客服"
          maxlength="20"
        />
      </view>
      <view class="form-row">
        <text class="form-label">角色描述</text>
        <textarea
          v-model="roleForm.desc"
          class="form-textarea"
          placeholder="该角色的职责简述,可选"
          maxlength="100"
          :auto-height="true"
        />
      </view>
      <view class="form-row">
        <text class="form-label">权限项<text class="required">*</text></text>
        <view class="perm-grid">
          <view
            v-for="opt in PERMISSION_OPTIONS"
            :key="opt.value"
            :class="['perm-chip', roleForm.permissions.includes(opt.value) ? 'active' : '']"
            @click="togglePerm(opt.value)"
          >
            <Icon
              :name="roleForm.permissions.includes(opt.value) ? 'check-circle' : 'circle'"
              :size="24"
              :color="roleForm.permissions.includes(opt.value) ? '#FF4D2D' : '#C9CDD4'"
            />
            <text>{{ opt.label }}</text>
          </view>
        </view>
        <text class="form-hint">已选 {{ roleForm.permissions.length }} 项</text>
      </view>
    </FormSheet>

    <!-- 管理员 sheet (create / edit-role) -->
    <FormSheet
      :open="adminSheetOpen"
      :title="adminSheetTitle"
      :confirm-text="adminSheetMode === 'create' ? '创建' : '保存'"
      :loading="adminSubmitting"
      :disabled="adminSheetConfirmDisabled"
      @close="adminSheetOpen = false"
      @confirm="submitAdminSheet"
    >
      <view v-if="adminSheetMode === 'create'" class="form-row">
        <text class="form-label">账号(登录名)<text class="required">*</text></text>
        <input
          v-model="adminForm.username"
          class="form-input"
          placeholder="英文 / 数字, 唯一"
          maxlength="40"
        />
      </view>
      <view class="form-row">
        <text class="form-label">{{ adminSheetMode === 'create' ? '昵称' : '昵称' }}</text>
        <input
          v-model="adminForm.nickname"
          class="form-input"
          placeholder="留空将使用账号作为昵称"
          maxlength="20"
        />
      </view>
      <view v-if="adminSheetMode === 'create'" class="form-row">
        <text class="form-label">邮箱</text>
        <input
          v-model="adminForm.email"
          class="form-input"
          type="text"
          placeholder="可选,用于密码找回"
          maxlength="100"
        />
      </view>
      <view v-if="adminSheetMode === 'create'" class="form-row">
        <text class="form-label">手机号</text>
        <input
          v-model="adminForm.phone"
          class="form-input"
          type="number"
          placeholder="可选"
          maxlength="20"
        />
      </view>
      <view class="form-row">
        <text class="form-label">用户角色 (user.role)<text class="required">*</text></text>
        <view class="seg-group">
          <view
            v-for="opt in USER_ROLE_OPTIONS"
            :key="opt.value"
            :class="['seg-item', adminForm.role === opt.value ? 'active' : '']"
            @click="adminForm.role = opt.value"
          >
            {{ opt.label }}
          </view>
        </view>
        <text class="form-hint">super-admin 不在此创建, 需走数据库或后端 root 流程</text>
      </view>
      <view v-if="adminSheetMode === 'create'" class="form-row">
        <text class="form-label">初始密码 (至少 8 位)<text class="required">*</text></text>
        <input
          v-model="adminForm.password"
          class="form-input"
          type="text"
          placeholder="账号创建后立即通知本人, 首次登录请改"
          maxlength="40"
        />
        <text v-if="adminForm.password && adminForm.password.length < 8" class="form-hint err">
          密码长度不足
        </text>
      </view>
    </FormSheet>

    <!-- 重置密码 sheet (仅 super-admin) -->
    <FormSheet
      :open="resetSheetOpen"
      title="重置管理员密码"
      confirm-text="重置"
      :loading="resetSubmitting"
      :disabled="resetConfirmDisabled"
      @close="resetSheetOpen = false"
      @confirm="submitResetPassword"
    >
      <view v-if="resetTarget" class="form-tip">
        即将为
        <text class="bold">「{{ resetTarget.nickname }} ({{ resetTarget.username }})」</text>
        重置密码,新密码仅显示一次,请立即通知本人。
      </view>
      <view class="form-row">
        <text class="form-label">新密码 (至少 8 位)<text class="required">*</text></text>
        <input
          v-model="resetForm.password"
          class="form-input"
          type="text"
          placeholder="建议混合字母+数字+符号"
          maxlength="40"
        />
      </view>
      <view class="form-row">
        <text class="form-label">确认密码<text class="required">*</text></text>
        <input
          v-model="resetForm.confirm"
          class="form-input"
          type="text"
          placeholder="再次输入新密码"
          maxlength="40"
        />
        <text
          v-if="resetForm.confirm && resetForm.password !== resetForm.confirm"
          class="form-hint err"
        >
          两次输入不一致
        </text>
      </view>
    </FormSheet>
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

.quick-toolbar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
  .qt-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    font-size: 26rpx;
    font-weight: 700;
    &.primary {
      background: var(--brand-gradient);
      color: #fff;
      box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
    }
  }
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

/* ===== 表单 sheet 通用样式 ===== */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 12rpx 0;
}
.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
  .required {
    color: #ff3b30;
    margin-left: 4rpx;
  }
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  background: #f7f8fa;
  border: 1rpx solid #e5e6eb;
  border-radius: 16rpx;
  color: #1d2129;
}
.form-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 120rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  background: #f7f8fa;
  border: 1rpx solid #e5e6eb;
  border-radius: 16rpx;
  color: #1d2129;
  line-height: 1.5;
}
.form-hint {
  font-size: 22rpx;
  color: var(--text-tertiary);
  margin-top: 4rpx;
  &.err {
    color: #ff3b30;
  }
}
.form-tip {
  margin: 4rpx 0 8rpx;
  padding: 14rpx 16rpx;
  background: rgba(18, 150, 219, 0.06);
  border-left: 4rpx solid #1296db;
  border-radius: 0 12rpx 12rpx 0;
  font-size: 22rpx;
  color: #4e5969;
  line-height: 1.6;
  .bold {
    font-weight: 700;
    color: #1d2129;
  }
}
.seg-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .seg-item {
    padding: 12rpx 24rpx;
    background: #f7f8fa;
    border: 1rpx solid #e5e6eb;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: var(--text-secondary);
    &.active {
      background: rgba(255, 77, 45, 0.1);
      border-color: #ff4d2d;
      color: #ff4d2d;
      font-weight: 700;
    }
  }
}
.perm-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .perm-chip {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 14rpx 20rpx;
    background: #f7f8fa;
    border: 1rpx solid #e5e6eb;
    border-radius: 16rpx;
    font-size: 24rpx;
    color: var(--text-secondary);
    &.active {
      background: rgba(255, 77, 45, 0.08);
      border-color: rgba(255, 77, 45, 0.4);
      color: #ff4d2d;
      font-weight: 700;
    }
  }
}
</style>
