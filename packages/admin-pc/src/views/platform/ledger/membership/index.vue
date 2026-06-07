<!--
  平台 PC · 门窗利账 · 会员管理
  ─────────────────────────────────────────────
  与账号管理共用同一张账号表，但聚焦「会员维度」：会员状态 / 剩余天数 / 到期日 /
  最近套餐，并提供「增加时长」（复用 GrantMembershipDialog）与「变更记录」抽屉。
  对接后端 /api/v1/p/ledger/users + /membership/grant + /membership/logs。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">会员管理</h2>
        <p class="mt-1 text-sm text-g-500">门窗利账会员 · 充值时长 · 查看变更记录</p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <!-- KPI（仅统计当前页，避免把「100 条总计」误当系统全量） -->
    <div class="pf-kpi-row">
      <ElCard v-for="k in kpiCards" :key="k.key" shadow="hover" class="pf-kpi">
        <div class="pf-kpi__icon" :style="{ background: k.color + '18', color: k.color }">
          <ArtSvgIcon :icon="k.icon" />
        </div>
        <div>
          <div class="pf-kpi__num">{{ k.value }}</div>
          <div class="pf-kpi__label">{{ k.label }}</div>
        </div>
      </ElCard>
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
        empty-text="暂无会员账号"
      >
        <ElTableColumn label="手机号" min-width="130">
          <template #default="{ row }">
            <span class="pf-mono">{{ row.phone }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="昵称" min-width="110">
          <template #default="{ row }">
            <span>{{ row.nickname || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="会员状态" width="150" align="center">
          <template #default="{ row }">
            <ElTag :type="membershipTagType(row.membership)" size="small" effect="light">{{
              membershipLabel(row.membership)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="剩余天数" width="100" align="center">
          <template #default="{ row }">
            <span
              v-if="!row.membership.never"
              :class="row.membership.expired ? 'text-g-500' : 'text-primary font-semibold'"
            >
              {{ Math.max(0, row.membership.daysLeft) }} 天
            </span>
            <span v-else class="text-g-500">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="到期日" width="170">
          <template #default="{ row }">
            <span v-if="row.membership.expiresAt">{{
              formatDateTime(row.membership.expiresAt)
            }}</span>
            <span v-else class="text-g-500">未开通</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="最近套餐" width="110" align="center">
          <template #default="{ row }">
            <span>{{ lastPlanLabel(row.membership.lastPlanKey) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openGrant(row)">增加时长</ElButton>
            <ElButton link @click="openLogs(row)">变更记录</ElButton>
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

    <!-- 增加时长（共用组件） -->
    <GrantMembershipDialog v-model="grantOpen" :account="grantTarget" @success="onGrantSuccess" />

    <!-- 变更记录抽屉 -->
    <ElDrawer v-model="logsOpen" :size="480" :with-header="false">
      <div class="pf-logs">
        <h3 class="m-0">
          会员变更记录
          <span v-if="logsTarget" class="text-sm text-g-500 font-normal pf-mono">
            · {{ logsTarget.phone }}</span
          >
        </h3>
        <ElTimeline v-if="!logsLoading && logs.length" class="pf-logs__timeline">
          <ElTimelineItem
            v-for="(lg, i) in logs"
            :key="i"
            :timestamp="formatDateTime(lg.createdAt)"
            :type="lg.deltaDays >= 0 ? 'success' : 'danger'"
            placement="top"
          >
            <div class="pf-logs__delta">
              <b :class="lg.deltaDays >= 0 ? 'text-primary' : 'text-danger'">
                {{ lg.deltaDays >= 0 ? '+' : '' }}{{ lg.deltaDays }} 天
              </b>
              <ElTag v-if="lg.planKey" size="small" effect="plain" class="ml-2">{{
                lastPlanLabel(lg.planKey)
              }}</ElTag>
            </div>
            <div class="pf-logs__range">
              {{ lg.beforeAt ? formatDateTime(lg.beforeAt) : '未开通' }}
              →
              <b>{{ lg.afterAt ? formatDateTime(lg.afterAt) : '—' }}</b>
            </div>
            <div v-if="lg.note" class="pf-logs__note">{{ lg.note }}</div>
          </ElTimelineItem>
        </ElTimeline>
        <ElEmpty v-else-if="!logsLoading" description="暂无变更记录" />
        <div v-else v-loading="true" class="pf-logs__loading" />
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Refresh, Search } from '@element-plus/icons-vue'
  import {
    fetchLedgerAccounts,
    fetchLedgerMembershipLogs,
    LEDGER_PLANS,
    type LedgerAccount,
    type LedgerMembershipLog
  } from '@/api/ledger'
  import { membershipTagType, membershipLabel } from '../shared'
  import GrantMembershipDialog from '../GrantMembershipDialog.vue'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'PlatformLedgerMembership' })

  const list = ref<LedgerAccount[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const keyword = ref('')
  const status = ref<'active' | 'disabled' | ''>('')

  // KPI 仅统计当前页：有效会员 / 临近到期 / 已过期 / 未开通
  const kpiCards = computed(() => {
    const active = list.value.filter((x) => x.membership.active && !x.membership.expired).length
    const soon = list.value.filter(
      (x) => x.membership.active && !x.membership.expired && x.membership.expiringSoon
    ).length
    const expired = list.value.filter((x) => x.membership.expired).length
    const never = list.value.filter((x) => x.membership.never).length
    return [
      {
        key: 'active',
        icon: 'ri:vip-crown-2-line',
        label: '有效会员',
        value: active,
        color: '#10B981'
      },
      {
        key: 'soon',
        icon: 'ri:alarm-warning-line',
        label: '临近到期',
        value: soon,
        color: '#FAAD14'
      },
      { key: 'expired', icon: 'ri:time-line', label: '已过期', value: expired, color: '#FF4D2D' },
      { key: 'never', icon: 'ri:user-line', label: '未开通', value: never, color: '#909399' }
    ]
  })

  function lastPlanLabel(key?: string | null) {
    if (!key) return '—'
    return LEDGER_PLANS.find((p) => p.key === key)?.label || key
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
      ElMessage.error(e?.message || '加载会员列表失败')
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

  // ====== 增加时长 ======
  const grantOpen = ref(false)
  const grantTarget = ref<LedgerAccount | null>(null)

  function openGrant(row: LedgerAccount) {
    grantTarget.value = row
    grantOpen.value = true
  }

  function onGrantSuccess() {
    // 充值后刷新列表，使会员状态 / 到期日同步后端；若变更记录抽屉正打开则一并刷新
    load()
    if (logsOpen.value && logsTarget.value) loadLogs(logsTarget.value.id)
  }

  // ====== 变更记录 ======
  const logsOpen = ref(false)
  const logsLoading = ref(false)
  const logsTarget = ref<LedgerAccount | null>(null)
  const logs = ref<LedgerMembershipLog[]>([])

  function openLogs(row: LedgerAccount) {
    logsTarget.value = row
    logs.value = []
    logsOpen.value = true
    loadLogs(row.id)
  }

  async function loadLogs(id: string) {
    logsLoading.value = true
    try {
      logs.value = await fetchLedgerMembershipLogs(id)
    } catch (e: any) {
      ElMessage.error(e?.message || '加载变更记录失败')
    } finally {
      logsLoading.value = false
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

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .text-danger {
    color: #f56c6c;
  }

  .pf-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (width <= 900px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .pf-kpi {
    border-radius: 12px;

    :deep(.el-card__body) {
      display: flex;
      gap: 14px;
      align-items: center;
      padding: 16px 18px;
    }
  }

  .pf-kpi__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 22px;
    border-radius: 12px;
  }

  .pf-kpi__num {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--art-gray-800, #1f2937);
  }

  .pf-kpi__label {
    margin-top: 4px;
    font-size: 12px;
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

  .pf-logs {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    padding: 22px;
  }

  .pf-logs__timeline {
    padding-left: 4px;
  }

  .pf-logs__delta {
    font-size: 14px;
  }

  .pf-logs__range {
    margin-top: 4px;
    font-size: 12px;
    color: #6b7280;
  }

  .pf-logs__note {
    margin-top: 4px;
    font-size: 12px;
    color: var(--art-gray-700, #374151);
  }

  .pf-logs__loading {
    min-height: 200px;
  }

  .ml-2 {
    margin-left: 8px;
  }
</style>
