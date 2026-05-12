<!-- 商家 PC · 代理商品（S3-T5）-->
<template>
  <div class="mp-agency">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">代理商品</h2>
        <p class="mt-1 text-sm text-g-500">
          从选品广场申请的代理商品，共 {{ list.length }} 件 · 加价收益 ¥{{ totalMarkup.toLocaleString() }}
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" @click="loadData" plain>刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="goToPlaza">去广场选品</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="mp-toolbar" v-if="$route.query.from === 'apply'">
      <ElAlert
        :closable="false"
        type="success"
        :title="`已收到 ${list.length} 条申请，平台正在审核，预计 1 个工作日内出结果。`"
        show-icon
      />
    </ElCard>

    <!-- 自动同步价格全店配置 -->
    <ElCard shadow="never" class="mp-sync-bar">
      <div class="mp-sync-bar__row">
        <div class="flex items-center gap-3 flex-1">
          <div class="mp-sync-bar__icon">
            <ArtSvgIcon icon="ri:refresh-line" />
          </div>
          <div>
            <div class="font-semibold">自动同步厂家价格</div>
            <div class="text-xs text-g-500 mt-1">
              开启后，所有代理商品在厂家调价时<b>自动按加价率重算</b>我的零售价；关闭则只手动调整
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <ElInputNumber
            v-model="globalMarkup"
            :min="0"
            :max="500"
            :step="5"
            controls-position="right"
            style="width: 140px"
            :disabled="!globalAutoSync"
          />
          <span class="text-xs text-g-500">全店统一加价率 %</span>
          <ElButton
            size="small"
            type="primary"
            plain
            @click="applyGlobalMarkup"
            :disabled="!globalAutoSync"
          >
            一键应用
          </ElButton>
          <ElSwitch
            v-model="globalAutoSync"
            size="large"
            active-text="开"
            inactive-text="关"
            inline-prompt
            @change="onGlobalSyncChange"
          />
        </div>
      </div>
    </ElCard>

    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="status">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="`${t.label} (${countOf(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never" v-loading="loading">
      <ElTable :data="filteredList" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="商品" min-width="320">
          <template #default="{ row }">
            <div class="mp-row-cell">
              <ElImage :src="row.productImage" fit="cover" style="width: 56px; height: 56px; border-radius: 8px" />
              <div>
                <div class="font-medium">{{ row.productName }}</div>
                <div class="text-xs text-g-500">{{ row.factoryName }} · {{ formatRelative(row.appliedAt) }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="出厂价" width="120">
          <template #default="{ row }">¥{{ row.factoryPrice }}</template>
        </ElTableColumn>
        <ElTableColumn label="我的零售" width="120">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.myRetailPrice }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="加价率" width="100" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="row.markupRatio >= 30 ? 'success' : 'info'" effect="plain">
              +{{ row.markupRatio }}%
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="同步状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="syncTypeOf(row.syncStatus)" size="small">
              {{ syncLabelOf(row.syncStatus) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="审核状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <ElButton text type="danger" size="small" @click="onCancel(row)">取消申请</ElButton>
            </template>
            <template v-else-if="row.status === 'approved'">
              <ElButton text type="primary" size="small" @click="onAdjustMarkup(row)">调整加价</ElButton>
              <ElDivider direction="vertical" />
              <ElButton text type="warning" size="small" @click="onOffline(row)">下架</ElButton>
              <ElDivider direction="vertical" />
              <ElButton text type="primary" size="small" @click="onEdit(row)">编辑</ElButton>
            </template>
            <template v-else-if="row.status === 'offline'">
              <ElButton text type="primary" size="small" @click="onReup(row)">重新上架</ElButton>
            </template>
            <template v-else>
              <span class="text-g-500 text-xs">已驳回</span>
            </template>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchAgencyApplications,
    type AgencyApplication
  } from '@/api/merchant-business'
  import { formatRelative } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantAgencyList' })

  const router = useRouter()

  const tabs = [
    { label: '全部', value: 'all' as const },
    { label: '待审核', value: 'pending' as const },
    { label: '已通过', value: 'approved' as const },
    { label: '已驳回', value: 'rejected' as const },
    { label: '已下架', value: 'offline' as const }
  ]

  const status = ref<typeof tabs[number]['value']>('all')
  const loading = ref(false)
  const list = ref<AgencyApplication[]>([])

  /* ====== 自动同步全店配置 ====== */
  const SYNC_KEY = 'jj_agency_sync_v1'
  const globalAutoSync = ref(true)
  const globalMarkup = ref(30)

  function loadSyncConfig() {
    try {
      const raw = localStorage.getItem(SYNC_KEY)
      if (raw) {
        const cfg = JSON.parse(raw)
        if (typeof cfg.globalAutoSync === 'boolean') globalAutoSync.value = cfg.globalAutoSync
        if (typeof cfg.globalMarkup === 'number') globalMarkup.value = cfg.globalMarkup
      }
    } catch {
      /* ignore */
    }
  }
  function persistSyncConfig() {
    try {
      localStorage.setItem(
        SYNC_KEY,
        JSON.stringify({ globalAutoSync: globalAutoSync.value, globalMarkup: globalMarkup.value })
      )
    } catch {
      /* ignore */
    }
  }

  function onGlobalSyncChange(v: boolean | string | number) {
    const on = Boolean(v)
    persistSyncConfig()
    list.value.forEach((row) => {
      if (row.status === 'approved') row.syncStatus = on ? 'auto' : 'manual'
    })
    ElMessage.success(on ? '已开启全店自动同步' : '已切换为手动调价模式')
  }

  function applyGlobalMarkup() {
    let updated = 0
    list.value.forEach((row) => {
      if (row.status === 'approved' && row.syncStatus === 'auto') {
        row.markupRatio = globalMarkup.value
        row.myRetailPrice = Math.round(row.factoryPrice * (1 + globalMarkup.value / 100))
        updated++
      }
    })
    persistSyncConfig()
    ElMessage.success(`已重算 ${updated} 件代理商品价格`)
  }

  const filteredList = computed(() => {
    if (status.value === 'all') return list.value
    return list.value.filter((a) => a.status === status.value)
  })

  const totalMarkup = computed(() =>
    list.value
      .filter((a) => a.status === 'approved')
      .reduce((acc, a) => acc + (a.myRetailPrice - a.factoryPrice), 0)
  )

  function countOf(s: typeof tabs[number]['value']) {
    if (s === 'all') return list.value.length
    return list.value.filter((a) => a.status === s).length
  }

  function statusTypeOf(s: AgencyApplication['status']) {
    return (
      {
        pending: 'warning',
        approved: 'success',
        rejected: 'danger',
        offline: 'info'
      } as const
    )[s]
  }

  function statusLabelOf(s: AgencyApplication['status']) {
    return (
      {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回',
        offline: '已下架'
      } as const
    )[s]
  }

  function syncTypeOf(s: AgencyApplication['syncStatus']) {
    return ({ synced: 'success', pending: 'warning', failed: 'danger' } as const)[s]
  }

  function syncLabelOf(s: AgencyApplication['syncStatus']) {
    return ({ synced: '已同步', pending: '同步中', failed: '失败' } as const)[s]
  }

  async function onCancel(row: AgencyApplication) {
    try {
      await ElMessageBox.confirm(`取消申请 "${row.productName}"？`, '提示', { type: 'warning' })
      list.value = list.value.filter((a) => a.id !== row.id)
      ElMessage.success('已取消申请')
    } catch {
      /* cancel */
    }
  }

  async function onAdjustMarkup(row: AgencyApplication) {
    try {
      const { value } = await ElMessageBox.prompt('新加价率（%）', '调整加价', {
        inputValue: String(row.markupRatio),
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入整数'
      })
      row.markupRatio = Number(value)
      row.myRetailPrice = Math.round(row.factoryPrice * (1 + row.markupRatio / 100))
      ElMessage.success(`已调整为 +${row.markupRatio}%`)
    } catch {
      /* cancel */
    }
  }

  function onOffline(row: AgencyApplication) {
    row.status = 'offline'
    ElMessage.success('已下架')
  }

  function onReup(row: AgencyApplication) {
    row.status = 'approved'
    ElMessage.success('已重新上架')
  }

  function onEdit(row: AgencyApplication) {
    router.push(`/merchant/product/add?id=${row.productId}`)
  }

  function goToPlaza() {
    ElMessage.info('选品广场入口在移动端 · 用户端可访问')
  }

  async function loadData() {
    loading.value = true
    try {
      list.value = await fetchAgencyApplications()
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadSyncConfig()
    loadData()
  })
</script>

<style scoped lang="scss">
  .mp-agency {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .mp-sync-bar {
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 77, 45, 0.04), rgba(255, 156, 110, 0.02));
    border: 1px solid rgba(255, 77, 45, 0.2);

    :deep(.el-card__body) {
      padding: 14px 18px;
    }
  }

  .mp-sync-bar__row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .mp-sync-bar__icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 77, 45, 0.12);
    color: var(--el-color-primary, #ff4d2d);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mp-row-cell {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }
</style>
