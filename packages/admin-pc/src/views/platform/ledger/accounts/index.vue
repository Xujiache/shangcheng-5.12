<!--
  平台 PC · 门窗利账 · 账号管理
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/users（列表 / 改昵称·状态 / 充值）。
  用户首次微信登录后自动建号，运营在此启停账号并开通会员。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">账号管理</h2>
        <p class="mt-1 text-sm text-g-500">微信登录用户 · 启停账号 · 充值会员</p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <!-- 搜索 / 过滤 -->
    <ElCard shadow="never" class="pf-toolbar">
      <div class="pf-filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索账号编号 / 昵称"
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
        empty-text="暂无账号，用户首次微信登录后会自动出现在这里"
      >
        <ElTableColumn label="账号编号" min-width="120">
          <template #default="{ row }">
            <span class="pf-mono">{{ row.accountCode }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="微信登录" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.wechatLinked ? 'success' : 'info'" size="small">
              {{ row.wechatLinked ? '已登录' : '旧账号' }}
            </ElTag>
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
            <span v-if="row.membership.perpetual" class="text-primary font-semibold">永久有效</span>
            <span v-else-if="row.membership.expiresAt">{{
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
        <ElTableColumn label="操作" width="345" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openTools(row)">工具使用</ElButton>
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="onToggleStatus(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </ElButton>
            <ElButton link type="primary" @click="openGrant(row)">增加时长</ElButton>
            <ElButton link type="primary" @click="openNotify(row)">发送通知</ElButton>
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

    <!-- 编辑昵称 -->
    <ElDialog v-model="editOpen" title="编辑账号" width="420px" align-center destroy-on-close>
      <ElForm :model="editForm" label-width="84px" label-position="right">
        <ElFormItem label="账号编号">
          <span class="pf-mono">{{ editForm.accountCode }}</span>
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

    <!-- 发送应用内通知 -->
    <ElDialog v-model="notifyOpen" title="发送通知" width="460px" align-center destroy-on-close>
      <ElForm
        ref="notifyFormRef"
        :model="notifyForm"
        :rules="notifyRules"
        label-width="64px"
        label-position="right"
      >
        <ElFormItem label="接收人">
          <span class="pf-mono">{{ notifyTargetAccount }}</span>
        </ElFormItem>
        <ElFormItem label="标题" prop="title">
          <ElInput
            v-model="notifyForm.title"
            placeholder="如：本月报表已生成"
            maxlength="40"
            show-word-limit
          />
        </ElFormItem>
        <ElFormItem label="内容" prop="body">
          <ElInput
            v-model="notifyForm.body"
            type="textarea"
            :rows="3"
            placeholder="通知正文，将出现在小程序消息中心"
            maxlength="500"
            show-word-limit
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="notifyOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="notifySubmitting" @click="submitNotify">发送</ElButton>
      </template>
    </ElDialog>

    <ElDrawer v-model="toolsOpen" :title="`工具使用 · ${toolsAccount}`" size="920px" destroy-on-close>
      <div class="tool-drawer">
        <div class="tool-drawer__note">已同步使用记录 · 本机工具的离线操作在设备补传后显示。统计不含游客使用。</div>
        <ElTable v-loading="toolsLoading" :data="usageRows" size="small" border>
          <ElTableColumn prop="label" label="工具" min-width="125" />
          <ElTableColumn prop="today" label="今日事件" width="88" align="right" />
          <ElTableColumn prop="last7Days" label="近 7 天" width="82" align="right" />
          <ElTableColumn prop="last30Days" label="近 30 天" width="88" align="right" />
          <ElTableColumn prop="open" label="累计打开" width="88" align="right" />
          <ElTableColumn prop="success" label="累计成功" width="88" align="right" />
          <ElTableColumn prop="failure" label="累计失败" width="88" align="right" />
        </ElTable>
        <div class="tool-drawer__head">使用明细</div>
        <div class="tool-drawer__filters">
          <ElSelect v-model="toolFilter" placeholder="全部工具" clearable style="width: 148px" @change="resetToolEvents">
            <ElOption v-for="tool in toolOptions" :key="tool.key" :label="tool.label" :value="tool.key" />
          </ElSelect>
          <ElSelect v-model="statusFilter" placeholder="全部状态" clearable style="width: 126px" @change="resetToolEvents">
            <ElOption label="打开" value="open" />
            <ElOption label="成功" value="success" />
            <ElOption label="失败" value="failure" />
          </ElSelect>
          <ElDatePicker v-model="toolDateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" clearable @change="resetToolEvents" />
        </div>
        <ElTable v-loading="eventsLoading" :data="toolEvents" size="small" stripe empty-text="当前条件下暂无已同步记录">
          <ElTableColumn label="发生时间" width="190">
            <template #default="{ row }">{{ formatDateTime(row.occurredAt) }}</template>
          </ElTableColumn>
          <ElTableColumn label="工具" min-width="145">
            <template #default="{ row }">{{ toolName(row.tool) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="88">
            <template #default="{ row }">
              <ElTag :type="row.status === 'success' ? 'success' : row.status === 'failure' ? 'danger' : 'info'" size="small">{{ statusName(row.status) }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="同步时间" width="190">
            <template #default="{ row }">{{ formatDateTime(row.receivedAt) }}</template>
          </ElTableColumn>
        </ElTable>
        <ElPagination
          v-model:current-page="eventPage"
          :page-size="20"
          :total="eventTotal"
          layout="total, prev, pager, next"
          background
          class="tool-drawer__pager"
          @current-change="loadToolEvents"
        />
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, computed } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { Refresh, Search } from '@element-plus/icons-vue'
  import {
    fetchLedgerAccounts,
    fetchLedgerToolSummary,
    fetchLedgerToolEvents,
    updateLedgerAccount,
    pushLedgerNotification,
    type LedgerAccount,
    type LedgerToolKey,
    type LedgerToolStatus,
    type LedgerToolSummary,
    type LedgerToolEvent
  } from '@/api/ledger'
  import {
    membershipTagType,
    membershipLabel,
    accountStatusTagType,
    accountStatusLabel
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

  const toolOptions: Array<{ key: LedgerToolKey; label: string }> = [
    { key: 'triangle', label: '三角计算' },
    { key: 'arc', label: '圆弧计算' },
    { key: 'cut', label: '优化下料' },
    { key: 'work-log', label: '记工' },
    { key: 'format', label: '格式转换' },
    { key: 'rmb', label: '人民币大小写' },
    { key: 'retire', label: '退休倒计时' },
    { key: 'level', label: '水平仪' },
    { key: 'glass', label: '玻璃 K 值' },
    { key: 'glass-weight', label: '玻璃重量' },
    { key: 'luban', label: '鲁班尺' }
  ]
  const toolName = (key: LedgerToolKey) => toolOptions.find(item => item.key === key)?.label || key
  const statusName = (value: LedgerToolStatus) => ({ open: '打开', success: '成功', failure: '失败' })[value]
  const toolsOpen = ref(false)
  const toolsAccount = ref('')
  const toolsUserId = ref('')
  const toolsLoading = ref(false)
  const toolSummary = ref<LedgerToolSummary | null>(null)
  const usageRows = computed(() => toolOptions.map(({ key, label }) => {
    const item = toolSummary.value?.tools[key]
    return { label, today: item?.today || 0, last7Days: item?.last7Days || 0,
      last30Days: item?.last30Days || 0, open: item?.byStatus.open || 0,
      success: item?.byStatus.success || 0, failure: item?.byStatus.failure || 0 }
  }))
  const toolFilter = ref<LedgerToolKey | ''>('')
  const statusFilter = ref<LedgerToolStatus | ''>('')
  const toolDateRange = ref<[Date, Date] | null>(null)
  const eventPage = ref(1)
  const eventTotal = ref(0)
  const eventsLoading = ref(false)
  const toolEvents = ref<LedgerToolEvent[]>([])
  let toolEventsRequest = 0

  async function openTools(row: LedgerAccount) {
    toolsUserId.value = row.id
    toolsAccount.value = `${row.nickname || '微信用户'}（${row.accountCode}）`
    toolsOpen.value = true
    toolFilter.value = ''
    statusFilter.value = ''
    toolDateRange.value = null
    eventPage.value = 1
    toolSummary.value = null
    toolEvents.value = []
    eventTotal.value = 0
    toolsLoading.value = true
    try {
      const summary = await fetchLedgerToolSummary(row.id)
      if (toolsUserId.value === row.id) toolSummary.value = summary
    } catch (e: any) {
      if (toolsUserId.value === row.id) ElMessage.error(e?.message || '加载工具统计失败')
    } finally {
      if (toolsUserId.value === row.id) toolsLoading.value = false
    }
    if (toolsUserId.value === row.id) loadToolEvents()
  }

  function resetToolEvents() {
    eventPage.value = 1
    loadToolEvents()
  }

  async function loadToolEvents() {
    if (!toolsUserId.value) return
    const requestId = ++toolEventsRequest
    const userId = toolsUserId.value
    const range = toolDateRange.value
    const from = range?.[0] ? new Date(range[0]).toISOString() : undefined
    const end = range?.[1] ? new Date(range[1]) : null
    if (end) end.setHours(23, 59, 59, 999)
    eventsLoading.value = true
    try {
      const response = await fetchLedgerToolEvents(userId, {
        tool: toolFilter.value || undefined,
        status: statusFilter.value || undefined,
        from,
        to: end?.toISOString(),
        page: eventPage.value,
        pageSize: 20
      })
      if (userId !== toolsUserId.value || requestId !== toolEventsRequest) return
      toolEvents.value = response.items
      eventTotal.value = response.total
    } catch (e: any) {
      if (requestId === toolEventsRequest) ElMessage.error(e?.message || '加载工具明细失败')
    } finally {
      if (requestId === toolEventsRequest) eventsLoading.value = false
    }
  }

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

  // ====== 编辑昵称 ======
  const editOpen = ref(false)
  const editSubmitting = ref(false)
  const editTargetId = ref('')
  const editForm = reactive<{ accountCode: string; nickname: string }>({
    accountCode: '',
    nickname: ''
  })

  function openEdit(row: LedgerAccount) {
    editTargetId.value = row.id
    editForm.accountCode = row.accountCode
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
        `确认${actionLabel}账号「${row.nickname || row.accountCode}（${row.accountCode}）」？${
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

  // ====== 发送通知 ======
  const notifyOpen = ref(false)
  const notifySubmitting = ref(false)
  const notifyTargetId = ref('')
  const notifyTargetAccount = ref('')
  const notifyFormRef = ref<FormInstance>()
  const notifyForm = reactive<{ title: string; body: string }>({ title: '', body: '' })
  const notifyRules: FormRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    body: [{ required: true, message: '请输入内容', trigger: 'blur' }]
  }

  function openNotify(row: LedgerAccount) {
    notifyTargetId.value = row.id
    notifyTargetAccount.value = `${row.nickname || '微信用户'}（${row.accountCode}）`
    notifyForm.title = ''
    notifyForm.body = ''
    notifyOpen.value = true
  }

  async function submitNotify() {
    if (!notifyFormRef.value) return
    try {
      await notifyFormRef.value.validate()
    } catch {
      return
    }
    notifySubmitting.value = true
    try {
      await pushLedgerNotification(notifyTargetId.value, {
        title: notifyForm.title.trim(),
        body: notifyForm.body.trim()
      })
      notifyOpen.value = false
      ElMessage.success('通知已发送')
    } catch (e: any) {
      ElMessage.error(e?.message || '发送失败，请稍后重试')
    } finally {
      notifySubmitting.value = false
    }
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

  .tool-drawer { display: flex; flex-direction: column; gap: 15px; }
  .tool-drawer__note { padding: 10px 12px; border-radius: 9px; background: #f0f7f3; color: #4f685b; font-size: 12px; }
  .tool-drawer__head { margin-top: 8px; font-size: 15px; font-weight: 700; }
  .tool-drawer__filters { display: flex; flex-wrap: wrap; gap: 10px; }
  .tool-drawer__pager { justify-content: flex-end; }

  .pf-pager {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 4px;
  }
</style>
