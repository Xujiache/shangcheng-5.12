<!--
  平台 PC · 门窗利账 · 账号管理
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/users（列表 / 新建 / 改昵称·状态 / 重置密码 / 充值）。
  运营在此创建门窗利账小程序用户、启停账号、重置密码、为其充值会员时长。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">账号管理</h2>
        <p class="mt-1 text-sm text-g-500">门窗利账用户 · 创建 · 启停 · 重置密码 · 充值会员</p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" :icon="Plus" @click="openCreate">新建账号</ElButton>
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <!-- 搜索 / 过滤 -->
    <ElCard shadow="never" class="pf-toolbar">
      <div class="pf-filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索手机号 / 昵称"
          clearable
          style="width: 240px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
        </ElInput>
        <ElSelect
          v-model="status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="onSearch"
        >
          <ElOption label="启用" value="active" />
          <ElOption label="停用" value="disabled" />
        </ElSelect>
        <ElButton type="primary" :icon="Search" @click="onSearch">查询</ElButton>
      </div>
    </ElCard>

    <ElCard shadow="never">
      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无账号，点击右上角「新建账号」创建"
      >
        <ElTableColumn label="手机号" min-width="130">
          <template #default="{ row }">
            <span class="pf-mono">{{ row.phone }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="昵称" min-width="120">
          <template #default="{ row }">
            <span>{{ row.nickname || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="accountStatusTagType(row.status)" size="small">{{
              accountStatusLabel(row.status)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="会员状态" width="140" align="center">
          <template #default="{ row }">
            <ElTag :type="membershipTagType(row.membership)" size="small" effect="light">{{
              membershipLabel(row.membership)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="到期日" width="170">
          <template #default="{ row }">
            <span v-if="row.membership.expiresAt">{{
              formatDateTime(row.membership.expiresAt)
            }}</span>
            <span v-else class="text-g-500">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="最后登录" width="170">
          <template #default="{ row }">
            <span v-if="row.lastLoginAt">{{ formatDateTime(row.lastLoginAt) }}</span>
            <span v-else class="text-g-500">从未登录</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="创建时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="onToggleStatus(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </ElButton>
            <ElButton link type="danger" @click="onResetPassword(row)">重置密码</ElButton>
            <ElButton link type="primary" @click="openGrant(row)">增加时长</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pf-pager">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="load"
          @size-change="onSizeChange"
        />
      </div>
    </ElCard>

    <!-- 新建账号 -->
    <ElDialog v-model="createOpen" title="新建账号" width="460px" align-center destroy-on-close>
      <ElForm
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="84px"
        label-position="right"
      >
        <ElFormItem label="手机号" prop="phone">
          <ElInput
            v-model="createForm.phone"
            placeholder="11 位手机号（即登录账号）"
            maxlength="11"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="初始密码" prop="password">
          <ElInput
            v-model="createForm.password"
            placeholder="留空则系统自动生成并展示"
            maxlength="32"
            clearable
            show-password
          />
        </ElFormItem>
        <ElFormItem label="昵称" prop="nickname">
          <ElInput v-model="createForm.nickname" placeholder="选填" maxlength="20" clearable />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="createSubmitting" @click="submitCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 编辑昵称 -->
    <ElDialog v-model="editOpen" title="编辑账号" width="420px" align-center destroy-on-close>
      <ElForm :model="editForm" label-width="84px" label-position="right">
        <ElFormItem label="手机号">
          <span class="pf-mono">{{ editForm.phone }}</span>
        </ElFormItem>
        <ElFormItem label="昵称">
          <ElInput v-model="editForm.nickname" placeholder="选填" maxlength="20" clearable />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="editSubmitting" @click="submitEdit">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 增加时长（共用组件） -->
    <GrantMembershipDialog v-model="grantOpen" :account="grantTarget" @success="onGrantSuccess" />
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { Refresh, Plus, Search } from '@element-plus/icons-vue'
  import {
    fetchLedgerAccounts,
    createLedgerAccount,
    updateLedgerAccount,
    resetLedgerPassword,
    type LedgerAccount
  } from '@/api/ledger'
  import {
    membershipTagType,
    membershipLabel,
    accountStatusTagType,
    accountStatusLabel,
    showPasswordDialog
  } from '../shared'
  import GrantMembershipDialog from '../GrantMembershipDialog.vue'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'PlatformLedgerAccounts' })

  const list = ref<LedgerAccount[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const keyword = ref('')
  const status = ref<'active' | 'disabled' | ''>('')

  async function load() {
    loading.value = true
    try {
      const resp = await fetchLedgerAccounts({
        keyword: keyword.value.trim() || undefined,
        status: status.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      })
      list.value = resp.list
      total.value = resp.total
    } catch (e: any) {
      ElMessage.error(e?.message || '加载账号列表失败')
    } finally {
      loading.value = false
    }
  }

  function onSearch() {
    page.value = 1
    load()
  }

  function onSizeChange(size: number) {
    pageSize.value = size
    page.value = 1
    load()
  }

  // ====== 新建账号 ======
  const createOpen = ref(false)
  const createSubmitting = ref(false)
  const createFormRef = ref<FormInstance>()
  const createForm = reactive<{ phone: string; password: string; nickname: string }>({
    phone: '',
    password: '',
    nickname: ''
  })
  const createRules: FormRules = {
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '请输入正确的 11 位手机号', trigger: 'blur' }
    ]
  }

  function openCreate() {
    createForm.phone = ''
    createForm.password = ''
    createForm.nickname = ''
    createOpen.value = true
  }

  async function submitCreate() {
    if (!createFormRef.value) return
    try {
      await createFormRef.value.validate()
    } catch {
      return
    }
    createSubmitting.value = true
    try {
      const res = await createLedgerAccount({
        phone: createForm.phone.trim(),
        password: createForm.password.trim() || undefined,
        nickname: createForm.nickname.trim() || undefined
      })
      createOpen.value = false
      ElMessage.success('账号已创建')
      // 系统生成的密码仅返回一次，必须立即展示给管理员复制
      if (res?.generatedPassword) {
        await showPasswordDialog({
          title: '账号已创建',
          intro: `已为 <b style="color:#1f2937">${res.phone}</b> 生成初始密码：`,
          password: res.generatedPassword
        })
      }
      page.value = 1
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '创建失败，请稍后重试')
    } finally {
      createSubmitting.value = false
    }
  }

  // ====== 编辑昵称 ======
  const editOpen = ref(false)
  const editSubmitting = ref(false)
  const editTargetId = ref('')
  const editForm = reactive<{ phone: string; nickname: string }>({ phone: '', nickname: '' })

  function openEdit(row: LedgerAccount) {
    editTargetId.value = row.id
    editForm.phone = row.phone
    editForm.nickname = row.nickname || ''
    editOpen.value = true
  }

  async function submitEdit() {
    editSubmitting.value = true
    try {
      await updateLedgerAccount(editTargetId.value, { nickname: editForm.nickname.trim() })
      ElMessage.success('已保存')
      editOpen.value = false
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败，请稍后重试')
    } finally {
      editSubmitting.value = false
    }
  }

  // ====== 启用 / 停用 ======
  async function onToggleStatus(row: LedgerAccount) {
    const next = row.status === 'active' ? 'disabled' : 'active'
    const actionLabel = next === 'disabled' ? '停用' : '启用'
    try {
      await ElMessageBox.confirm(
        `确认${actionLabel}账号「${row.phone}」？${
          next === 'disabled' ? '停用后该用户将无法登录门窗利账小程序。' : ''
        }`,
        `${actionLabel}账号`,
        { confirmButtonText: actionLabel, cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await updateLedgerAccount(row.id, { status: next })
      row.status = next
      ElMessage.success(`已${actionLabel}`)
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败，请稍后重试')
    }
  }

  // ====== 重置密码 ======
  async function onResetPassword(row: LedgerAccount) {
    try {
      await ElMessageBox.confirm(
        `确认重置账号「${row.phone}」的密码？将生成一个新密码，旧密码立即失效。`,
        '重置密码',
        { confirmButtonText: '确认重置', cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return
    }
    try {
      const res = await resetLedgerPassword(row.id)
      await showPasswordDialog({
        title: '密码已重置',
        intro: `已为 <b style="color:#1f2937">${row.phone}</b> 生成新密码：`,
        password: res.password
      })
    } catch (e: any) {
      ElMessage.error(e?.message || '重置失败，请稍后重试')
    }
  }

  // ====== 增加时长 ======
  const grantOpen = ref(false)
  const grantTarget = ref<LedgerAccount | null>(null)

  function openGrant(row: LedgerAccount) {
    grantTarget.value = row
    grantOpen.value = true
  }

  function onGrantSuccess() {
    // 充值后刷新列表，使会员状态 / 到期日同步后端
    load()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ledger {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 12px 16px;
    }
  }

  .pf-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .pf-mono {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .pf-pager {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 4px;
  }
</style>
