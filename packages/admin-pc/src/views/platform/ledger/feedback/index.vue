<!--
  平台 PC · 门窗利账 · 意见反馈
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/feedback（列表 / 处理）。
  运营在此查看小程序用户提交的反馈、注销申请、换号申请，并标记处理 / 回复备注。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">意见反馈</h2>
        <p class="mt-1 text-sm text-g-500">门窗利账用户提交的反馈 · 注销申请 · 换号申请</p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <!-- 搜索 / 过滤 -->
    <ElCard shadow="never" class="pf-toolbar">
      <div class="pf-filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索反馈内容"
          clearable
          style="width: 240px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
        </ElInput>
        <ElSelect
          v-model="type"
          placeholder="全部类型"
          clearable
          style="width: 140px"
          @change="onSearch"
        >
          <ElOption label="一般反馈" value="general" />
          <ElOption label="注销申请" value="delete_account" />
          <ElOption label="换号申请" value="phone_change" />
        </ElSelect>
        <ElSelect
          v-model="status"
          placeholder="全部状态"
          clearable
          style="width: 130px"
          @change="onSearch"
        >
          <ElOption label="待处理" value="open" />
          <ElOption label="已处理" value="resolved" />
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
        empty-text="暂无反馈"
      >
        <ElTableColumn label="提交人" min-width="150">
          <template #default="{ row }">
            <div class="pf-mono">{{ row.phone }}</div>
            <div class="text-xs text-g-500">{{ row.nickname || '—' }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="类型" width="110" align="center">
          <template #default="{ row }">
            <ElTag :type="typeTagType(row.type)" size="small" effect="light">{{
              typeLabel(row.type)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="内容" min-width="260">
          <template #default="{ row }">
            <div class="pf-fb-content">{{ row.content }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="联系方式" width="150">
          <template #default="{ row }">
            <span v-if="row.contact" class="pf-mono">{{ row.contact }}</span>
            <span v-else class="text-g-500">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 'resolved' ? 'success' : 'warning'" size="small">{{
              row.status === 'resolved' ? '已处理' : '待处理'
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="提交时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openHandle(row)">处理</ElButton>
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

    <!-- 处理反馈 -->
    <ElDialog v-model="handleOpen" title="处理反馈" width="520px" align-center destroy-on-close>
      <div class="pf-fb-detail">
        <div class="pf-fb-row">
          <span class="pf-fb-key">提交人</span>
          <span class="pf-mono"
            >{{ handleTarget?.phone }}（{{ handleTarget?.nickname || '—' }}）</span
          >
        </div>
        <div class="pf-fb-row">
          <span class="pf-fb-key">类型</span>
          <ElTag :type="typeTagType(handleTarget?.type || '')" size="small" effect="light">{{
            typeLabel(handleTarget?.type || '')
          }}</ElTag>
        </div>
        <div class="pf-fb-row">
          <span class="pf-fb-key">联系方式</span>
          <span>{{ handleTarget?.contact || '—' }}</span>
        </div>
        <div class="pf-fb-block">
          <span class="pf-fb-key">内容</span>
          <div class="pf-fb-text">{{ handleTarget?.content }}</div>
        </div>
        <ElForm :model="handleForm" label-position="top">
          <ElFormItem label="处理备注 / 回复">
            <ElInput
              v-model="handleForm.reply"
              type="textarea"
              :rows="3"
              placeholder="选填，记录处理结果或回复内容"
              maxlength="500"
              show-word-limit
            />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <ElButton @click="handleOpen = false">取消</ElButton>
        <ElButton :loading="handleSubmitting" @click="submitHandle(false)">仅保存备注</ElButton>
        <ElButton type="primary" :loading="handleSubmitting" @click="submitHandle(true)">
          标记已处理
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Refresh, Search } from '@element-plus/icons-vue'
  import { fetchLedgerFeedback, updateLedgerFeedback, type LedgerFeedback } from '@/api/ledger'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'PlatformLedgerFeedback' })

  const TYPE_LABEL: Record<string, string> = {
    general: '一般反馈',
    delete_account: '注销申请',
    phone_change: '换号申请'
  }
  function typeLabel(t: string): string {
    return TYPE_LABEL[t] || '反馈'
  }
  function typeTagType(t: string): 'info' | 'danger' | 'warning' {
    if (t === 'delete_account') return 'danger'
    if (t === 'phone_change') return 'warning'
    return 'info'
  }

  const list = ref<LedgerFeedback[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const keyword = ref('')
  const status = ref<'open' | 'resolved' | ''>('')
  const type = ref('')

  async function load() {
    loading.value = true
    try {
      const resp = await fetchLedgerFeedback({
        keyword: keyword.value.trim() || undefined,
        status: status.value || undefined,
        type: type.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      })
      list.value = resp.list
      total.value = resp.total
    } catch (e: any) {
      ElMessage.error(e?.message || '加载反馈列表失败')
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

  // ====== 处理反馈 ======
  const handleOpen = ref(false)
  const handleSubmitting = ref(false)
  const handleTarget = ref<LedgerFeedback | null>(null)
  const handleForm = reactive<{ reply: string }>({ reply: '' })

  function openHandle(row: LedgerFeedback) {
    handleTarget.value = row
    handleForm.reply = row.reply || ''
    handleOpen.value = true
  }

  async function submitHandle(markResolved: boolean) {
    if (!handleTarget.value) return
    handleSubmitting.value = true
    try {
      await updateLedgerFeedback(handleTarget.value.id, {
        // 仅保存备注时不传 status，避免把已处理的反馈意外改回待处理
        status: markResolved ? 'resolved' : undefined,
        reply: handleForm.reply.trim() || undefined
      })
      ElMessage.success(markResolved ? '已标记为已处理' : '备注已保存')
      handleOpen.value = false
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败，请稍后重试')
    } finally {
      handleSubmitting.value = false
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

  .pf-fb-content {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: #374151;
  }

  .pf-pager {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 4px;
  }

  .pf-fb-detail {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pf-fb-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .pf-fb-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pf-fb-key {
    flex: 0 0 72px;
    font-size: 13px;
    color: #6b7280;
  }

  .pf-fb-text {
    padding: 10px 12px;
    font-size: 14px;
    line-height: 1.6;
    color: #1f2937;
    white-space: pre-wrap;
    background: #fafbfc;
    border: 1px solid #eef0f2;
    border-radius: 8px;
  }
</style>
