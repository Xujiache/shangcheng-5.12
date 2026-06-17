<!-- 平台 PC · 权限管理（S5-T11）-->
<template>
  <div class="pf-perm">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">权限管理</h2>
        <p class="mt-1 text-sm text-g-500">角色与管理员账号</p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" :icon="Plus" @click="openCreate"
          >新建{{ tab === 'roles' ? '角色' : '管理员' }}</ElButton
        >
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane label="角色" name="roles" />
        <ElTabPane label="管理员" name="admins" />
      </ElTabs>
    </ElCard>

    <!-- 角色 -->
    <div v-if="tab === 'roles'" class="pf-roles">
      <ElCard v-for="r in roles" :key="r.id" shadow="hover" class="pf-role">
        <div class="pf-role__head">
          <div class="flex items-center gap-2">
            <div
              class="pf-role__icon"
              :style="{ background: roleColorOf(r.name) + '18', color: roleColorOf(r.name) }"
            >
              <ArtSvgIcon icon="ri:shield-user-line" />
            </div>
            <div>
              <div class="font-semibold">{{ r.name }}</div>
              <div class="text-xs text-g-500 mt-1">{{ r.desc }}</div>
            </div>
          </div>
          <ElTag v-if="r.builtIn" size="small" type="warning">内置</ElTag>
        </div>
        <div class="pf-role__body">
          <div class="text-sm">
            成员 <b>{{ memberCountOf(r.name) }}</b> 人 · 权限 <b>{{ r.permissions.length }}</b> 项
          </div>
          <div class="pf-role__perms">
            <ElTag
              v-for="(p, i) in r.permissions.slice(0, 6)"
              :key="i"
              size="small"
              effect="plain"
              >{{ p }}</ElTag
            >
            <span v-if="r.permissions.length > 6" class="text-xs text-g-500"
              >+{{ r.permissions.length - 6 }}</span
            >
          </div>
        </div>
        <div class="pf-role__actions">
          <ElButton plain @click="onEditRole(r)">编辑</ElButton>
          <ElButton plain @click="viewMembers(r)">查看成员</ElButton>
          <ElPopconfirm
            v-if="!r.builtIn"
            title="确认删除该角色？该角色下成员将无权限。"
            @confirm="onRemoveRole(r)"
          >
            <template #reference>
              <ElButton type="danger" plain>删除</ElButton>
            </template>
          </ElPopconfirm>
        </div>
      </ElCard>
    </div>

    <!-- 管理员 -->
    <ElCard v-else shadow="never">
      <ElTable
        :data="admins"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn label="管理员" min-width="260">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElAvatar :size="36" :src="row.avatar" />
              <div>
                <div class="font-medium">{{ row.nickname }}</div>
                <div class="text-xs text-g-500">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="角色" width="160">
          <template #default="{ row }">
            <ElTag :type="row.role === '超级管理员' ? 'danger' : 'primary'" size="small">{{
              row.role
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '正常' : '已停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="最近登录" width="170">
          <template #default="{ row }">{{
            row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '—'
          }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="onEditAdmin(row)">改角色</ElButton>
            <ElButton link @click="onReset(row)">重置密码</ElButton>
            <ElButton
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="onToggleAdmin(row)"
            >
              {{ row.status === 'active' ? '停用' : '恢复' }}
            </ElButton>
            <ElPopconfirm title="确认删除？" @confirm="onRemoveAdmin(row)">
              <template #reference>
                <ElButton link type="danger">删除</ElButton>
              </template>
            </ElPopconfirm>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 创建/编辑 Drawer -->
    <ElDrawer v-model="drawerOpen" :size="460" :with-header="false">
      <div class="pf-drawer">
        <h3 class="m-0">{{ drawerMode === 'role' ? '角色' : '管理员' }}</h3>
        <ElForm v-if="drawerMode === 'role'" :model="roleForm" label-position="top">
          <ElFormItem label="角色名称">
            <ElInput v-model="roleForm.name" placeholder="如：运营经理" />
          </ElFormItem>
          <ElFormItem label="描述">
            <ElInput v-model="roleForm.desc" type="textarea" :rows="2" />
          </ElFormItem>
          <ElFormItem label="权限">
            <ElCheckboxGroup v-model="roleForm.permissions">
              <ElCheckbox value="merchant:*">商户管理</ElCheckbox>
              <ElCheckbox value="order:read">订单查看</ElCheckbox>
              <ElCheckbox value="audit:*">审核</ElCheckbox>
              <ElCheckbox value="ad:*">广告</ElCheckbox>
              <ElCheckbox value="member:read">会员</ElCheckbox>
              <ElCheckbox value="finance:*">财务</ElCheckbox>
              <ElCheckbox value="system:*">系统</ElCheckbox>
            </ElCheckboxGroup>
          </ElFormItem>
        </ElForm>
        <ElForm v-else :model="adminForm" label-position="top">
          <ElFormItem label="昵称"><ElInput v-model="adminForm.nickname" /></ElFormItem>
          <ElFormItem label="用户名"
            ><ElInput v-model="adminForm.username" placeholder="登录账号"
          /></ElFormItem>
          <ElFormItem label="角色">
            <ElSelect v-model="adminForm.role" style="width: 100%">
              <ElOption v-for="r in roles" :key="r.id" :value="r.name" :label="r.name" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="初始密码"
            ><ElInput v-model="adminForm.password" type="password" show-password
          /></ElFormItem>
        </ElForm>
        <div class="pf-drawer__footer">
          <ElButton @click="drawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitDrawer">保存</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchAdminRoles,
    fetchAdminUsers,
    saveAdminRole,
    removeAdminRole,
    saveAdminUser,
    toggleAdminUser,
    removeAdminUser,
    type AdminRole,
    type AdminUser
  } from '@/api/platform-business'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Plus } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformPermission' })

  const tab = ref<'roles' | 'admins'>('roles')
  const roles = ref<AdminRole[]>([])
  const admins = ref<AdminUser[]>([])

  const drawerOpen = ref(false)
  const drawerMode = ref<'role' | 'admin'>('role')
  const editingId = ref<string | null>(null)

  const roleForm = reactive<{ name: string; desc: string; permissions: string[] }>({
    name: '',
    desc: '',
    permissions: []
  })
  const adminForm = reactive<{
    nickname: string
    username: string
    role: string
    password: string
  }>({
    nickname: '',
    username: '',
    role: '客服',
    password: ''
  })

  function roleColorOf(name: string) {
    return (
      (
        {
          超级管理员: '#FF4D2D',
          运营经理: '#A855F7',
          审核员: '#3B82F6',
          客服: '#10B981',
          财务: '#FAAD14'
        } as Record<string, string>
      )[name] || '#86909C'
    )
  }

  function memberCountOf(roleName: string) {
    return admins.value.filter((a) => a.role === roleName).length
  }

  function openCreate() {
    editingId.value = null
    drawerMode.value = tab.value === 'roles' ? 'role' : 'admin'
    Object.assign(roleForm, { name: '', desc: '', permissions: [] })
    Object.assign(adminForm, { nickname: '', username: '', role: '客服', password: '' })
    drawerOpen.value = true
  }

  function onEditRole(r: AdminRole) {
    editingId.value = r.id
    drawerMode.value = 'role'
    Object.assign(roleForm, { name: r.name, desc: r.desc, permissions: [...r.permissions] })
    drawerOpen.value = true
  }

  function onEditAdmin(a: AdminUser) {
    editingId.value = a.id
    drawerMode.value = 'admin'
    Object.assign(adminForm, {
      nickname: a.nickname,
      username: a.username,
      role: a.role,
      password: ''
    })
    drawerOpen.value = true
  }

  async function submitDrawer() {
    if (drawerMode.value === 'role') {
      await saveAdminRole({ id: editingId.value || undefined, ...roleForm })
    } else {
      await saveAdminUser({ id: editingId.value || undefined, ...adminForm })
    }
    drawerOpen.value = false
    ElMessage.success('已保存')
    await load()
  }

  function viewMembers(r: AdminRole) {
    const members = admins.value.filter((a) => a.role === r.name)
    if (members.length === 0) {
      ElMessage.info('暂无成员')
      return
    }
    ElMessageBox.alert(
      members.map((m) => `${m.nickname} (${m.username})`).join('\n'),
      `${r.name} · ${members.length} 名成员`,
      { confirmButtonText: '关闭', customClass: 'el-pre' }
    )
  }

  async function onRemoveRole(r: AdminRole) {
    await removeAdminRole(r.id)
    ElMessage.success('已删除')
    await load()
  }

  async function onReset(a: AdminUser) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += charset[Math.floor(Math.random() * charset.length)]
    try {
      await ElMessageBox.alert(
        `<div style="font-size:13px;color:#6b7280;margin-bottom:10px">已为 <b style="color:#1f2937">${a.nickname}</b> (${a.username}) 生成新密码：</div>` +
          `<div style="font-family:monospace;font-size:18px;font-weight:600;padding:12px;background:#fafbfc;border:1px dashed #e5e7eb;border-radius:8px;text-align:center;letter-spacing:1px;color:#ff4d2d">${pwd}</div>` +
          `<div style="font-size:12px;color:#f56c6c;margin-top:10px"><b>仅显示一次</b>，请立即复制并通知管理员，本窗口关闭后无法再次查看。</div>`,
        '密码已重置',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '复制密码',
          showClose: true,
          callback: async (action: string) => {
            if (action === 'confirm') {
              try {
                await navigator.clipboard.writeText(pwd)
                ElMessage.success('密码已复制到剪贴板')
              } catch {
                ElMessage.warning('剪贴板不可用，请手动复制')
              }
            }
          }
        }
      )
    } catch {
      /* close */
    }
  }

  async function onToggleAdmin(a: AdminUser) {
    await toggleAdminUser(a.id)
    ElMessage.success(a.status === 'active' ? '已停用' : '已恢复')
    await load()
  }

  async function onRemoveAdmin(a: AdminUser) {
    await removeAdminUser(a.id)
    ElMessage.success('已删除')
    await load()
  }

  async function load() {
    roles.value = await fetchAdminRoles()
    admins.value = await fetchAdminUsers()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-perm {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-roles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 14px;
  }

  .pf-role {
    border-radius: 12px;

    :deep(.el-card__body) {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 18px;
    }
  }

  .pf-role__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .pf-role__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 20px;
    border-radius: 12px;
  }

  .pf-role__body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  .pf-role__perms {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pf-role__actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  .pf-drawer {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 22px;
  }

  .pf-drawer__footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: auto;
  }
</style>
