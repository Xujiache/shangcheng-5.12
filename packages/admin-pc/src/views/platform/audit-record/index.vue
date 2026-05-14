<!--
  平台 PC · 审核日志（Wave3 加固新增）
  ─────────────────────────────────────────────
  消费后端 `GET /api/v1/p/audit/records`，回溯商家 / 商品的审核流转。
  支持类型 + 状态 + 目标 ID 三维过滤 + 标准分页。
-->
<template>
  <div class="pf-ar">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">审核日志</h2>
        <p class="mt-1 text-sm text-g-500">
          商家 / 商品审核流转记录 · 谁在什么时候批 / 驳 / 自动通过
        </p>
      </div>
      <ElButton :icon="Refresh" plain @click="reload">刷新</ElButton>
    </div>

    <!-- 过滤栏 -->
    <ElCard shadow="never" class="pf-toolbar">
      <ElForm :inline="true" :model="filters" @submit.prevent="onSearch">
        <ElFormItem label="类型">
          <ElSelect v-model="filters.type" placeholder="全部" clearable style="width: 140px">
            <ElOption label="商家" value="merchant" />
            <ElOption label="商品" value="product" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="filters.status" placeholder="全部" clearable style="width: 160px">
            <ElOption label="通过" value="approved" />
            <ElOption label="驳回" value="rejected" />
            <ElOption label="待审核" value="pending" />
            <ElOption label="自动通过" value="auto_approved" />
            <ElOption label="抽检" value="sample_check" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="目标 ID">
          <ElInput
            v-model="filters.targetId"
            placeholder="精确匹配商家 / 商品 ID"
            clearable
            style="width: 240px"
            @keyup.enter="onSearch"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :icon="Search" @click="onSearch">查询</ElButton>
          <ElButton :icon="RefreshLeft" @click="onReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 列表 -->
    <ElCard shadow="never">
      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无审核记录"
      >
        <ElTableColumn label="时间" width="180">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="类型" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="typeTagOf(row.type)" size="small">
              {{ typeLabelOf(row.type) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="目标 ID" prop="targetId" min-width="200">
          <template #default="{ row }">
            <span class="pf-mono">{{ row.targetId }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTagOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作人" width="160">
          <template #default="{ row }">
            <span v-if="row.actorName">{{ row.actorName }}</span>
            <span v-else-if="row.autoApproved" class="text-g-400">系统自动</span>
            <span v-else class="text-g-400">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="原因 / 备注" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.reason">{{ row.reason }}</span>
            <span v-else class="text-g-400">—</span>
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
          @current-change="reload"
          @size-change="onSizeChange"
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Refresh, RefreshLeft, Search } from '@element-plus/icons-vue'
  import { fetchAuditRecords, type AuditRecord } from '@/api/platform-business'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'PlatformAuditRecord' })

  const filters = reactive<{ type: string; status: string; targetId: string }>({
    type: '',
    status: '',
    targetId: ''
  })

  const list = ref<AuditRecord[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)

  function typeTagOf(t: AuditRecord['type']) {
    return ({ merchant: 'warning', product: 'primary' } as const)[t] || 'info'
  }
  function typeLabelOf(t: AuditRecord['type']) {
    return ({ merchant: '商家', product: '商品' } as const)[t] || t
  }
  function statusTagOf(s: AuditRecord['status']) {
    return (
      (
        {
          approved: 'success',
          rejected: 'danger',
          pending: 'warning',
          auto_approved: 'success',
          sample_check: 'info'
        } as const
      )[s] || 'info'
    )
  }
  function statusLabelOf(s: AuditRecord['status']) {
    return (
      (
        {
          approved: '通过',
          rejected: '驳回',
          pending: '待审核',
          auto_approved: '自动通过',
          sample_check: '抽检'
        } as const
      )[s] || s
    )
  }

  async function reload() {
    loading.value = true
    try {
      const resp = await fetchAuditRecords({
        type: filters.type || undefined,
        status: filters.status || undefined,
        targetId: filters.targetId ? filters.targetId.trim() : undefined,
        page: page.value,
        pageSize: pageSize.value
      })
      list.value = resp.list
      total.value = resp.total
    } catch (e: any) {
      ElMessage.error(e?.message || '加载审核日志失败')
    } finally {
      loading.value = false
    }
  }

  function onSearch() {
    page.value = 1
    reload()
  }

  function onReset() {
    filters.type = ''
    filters.status = ''
    filters.targetId = ''
    page.value = 1
    reload()
  }

  function onSizeChange(size: number) {
    pageSize.value = size
    page.value = 1
    reload()
  }

  onMounted(reload)
</script>

<style scoped lang="scss">
  .pf-ar {
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

  .text-g-400 {
    color: #9ca3af;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 12px 16px 0;
    }
  }

  .pf-mono {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 12px;
    color: var(--art-gray-700, #374151);
  }

  .pf-pager {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 4px;
  }
</style>
