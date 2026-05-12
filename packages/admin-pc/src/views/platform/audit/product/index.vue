<!-- 平台 PC · 商品审核（S5-T6）-->
<template>
  <div class="pf-pa">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">商品审核</h2>
        <p class="mt-1 text-sm text-g-500">免审条件配置 · 抽检比例</p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <!-- 自动通过开关 -->
    <ElCard v-if="cfg" shadow="never" class="pf-auto">
      <div class="pf-auto__row">
        <div class="pf-auto__icon">
          <ArtSvgIcon icon="ri:flashlight-line" />
        </div>
        <div class="flex-1">
          <div class="font-semibold text-base">自动通过 · 免审核</div>
          <div class="text-xs text-g-500 mt-1">满足条件的商品提交后无需人工审核，直接上架</div>
        </div>
        <ElSwitch
          v-model="cfg.autoApprove"
          inline-prompt
          active-text="开"
          inactive-text="关"
          style="--el-switch-on-color: #ff4d2d"
          @change="saveCfg"
        />
      </div>
    </ElCard>

    <!-- 免审条件 + 抽检 -->
    <ElCard v-if="cfg" shadow="never" class="pf-cond">
      <template #header>
        <div class="pf-card__title">
          <span>免审条件（满足任一即可）</span>
          <span class="text-xs text-g-500">
            {{ cfg.conditions.filter((c) => c.enabled).length }} / {{ cfg.conditions.length }} 已启用
          </span>
        </div>
      </template>
      <div class="pf-cond__list">
        <div v-for="c in cfg.conditions" :key="c.key" class="pf-cond__row">
          <ElCheckbox v-model="c.enabled" @change="saveCfg">{{ c.label }}</ElCheckbox>
          <ElTag v-if="c.enabled" type="success" size="small" effect="plain">已启用</ElTag>
          <ElTag v-else type="info" size="small" effect="plain">未启用</ElTag>
        </div>
      </div>
      <div class="pf-cond__sample">
        <span class="font-medium">抽检比例</span>
        <div class="flex items-center gap-3">
          <ElInputNumber
            v-model="cfg.samplingRate"
            :min="0"
            :max="100"
            :step="5"
            controls-position="right"
            style="width: 140px"
            @change="saveCfg"
          />
          <span class="text-xs text-g-500">% 随机抽检</span>
        </div>
      </div>
    </ElCard>

    <!-- Tab -->
    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane v-for="t in tabs" :key="t.value" :label="`${t.label} (${countOf(t.value)})`" :name="t.value" />
      </ElTabs>
    </ElCard>

    <!-- 商品表 -->
    <ElCard shadow="never">
      <ElTable :data="filtered" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="商品" min-width="320">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <ElImage :src="row.image" fit="cover" class="pf-thumb" />
              <div>
                <div class="font-medium">{{ row.name }}</div>
                <div class="text-xs text-g-500">{{ row.merchant }} · {{ row.category }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="价格" width="120" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.price }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="提交时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">{{ statusLabelOf(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <ElButton link type="primary" @click="onApprove(row)">通过</ElButton>
              <ElDropdown trigger="click" @command="(cmd) => onReject(row, cmd)">
                <ElButton link type="danger">
                  驳回 <ArtSvgIcon icon="ri:arrow-down-s-line" />
                </ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="图片不清晰">图片不清晰</ElDropdownItem>
                    <ElDropdownItem command="商品描述违规">商品描述违规</ElDropdownItem>
                    <ElDropdownItem command="价格异常">价格异常</ElDropdownItem>
                    <ElDropdownItem command="类目不符">类目不符</ElDropdownItem>
                    <ElDropdownItem command="其他原因">其他原因</ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </template>
            <ElButton v-else-if="row.status === 'auto_approved'" link type="warning" @click="onSpot(row)">抽检</ElButton>
            <ElButton link @click="openDetail(row)">详情</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDrawer v-model="detailOpen" :size="500" :with-header="false">
      <div v-if="current" class="pf-detail">
        <ElImage :src="current.image" fit="cover" class="pf-detail__img" />
        <h3 class="m-0">{{ current.name }}</h3>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="商户">{{ current.merchant }}</ElDescriptionsItem>
          <ElDescriptionsItem label="类目">{{ current.category }}</ElDescriptionsItem>
          <ElDescriptionsItem label="价格">¥{{ current.price }}</ElDescriptionsItem>
          <ElDescriptionsItem label="提交时间">{{ formatDateTime(current.submittedAt) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="statusTypeOf(current.status)" size="small">{{ statusLabelOf(current.status) }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem v-if="current.rejectReason" label="驳回原因">{{ current.rejectReason }}</ElDescriptionsItem>
        </ElDescriptions>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchProductAudits,
    fetchProductAuditConfig,
    saveProductAuditConfig,
    approveProduct,
    rejectProduct,
    type AuditProduct,
    type ProductAuditConfig
  } from '@/api/platform-business'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformAuditProduct' })

  type TabKey = 'pending' | 'auto_approved' | 'rejected'

  const tabs: { label: string; value: TabKey }[] = [
    { label: '待审核', value: 'pending' },
    { label: '自动通过', value: 'auto_approved' },
    { label: '已驳回', value: 'rejected' }
  ]

  const tab = ref<TabKey>('pending')
  const list = ref<AuditProduct[]>([])
  const cfg = ref<ProductAuditConfig>()
  const detailOpen = ref(false)
  const current = ref<AuditProduct>()

  const filtered = computed(() => list.value.filter((p) => p.status === tab.value))

  function countOf(t: TabKey) {
    return list.value.filter((p) => p.status === t).length
  }

  function statusTypeOf(s: AuditProduct['status']) {
    return ({ pending: 'warning', auto_approved: 'success', rejected: 'info' } as const)[s]
  }
  function statusLabelOf(s: AuditProduct['status']) {
    return ({ pending: '待审核', auto_approved: '自动通过', rejected: '已驳回' } as const)[s]
  }

  async function onApprove(p: AuditProduct) {
    try {
      await ElMessageBox.confirm(`通过「${p.name}」？通过后立即上架。`, '通过审核', {
        confirmButtonText: '通过',
        cancelButtonText: '取消'
      })
      await approveProduct(p.id)
      ElMessage.success('已通过')
      await load()
    } catch {
      /* cancel */
    }
  }

  async function onReject(p: AuditProduct, reason: string) {
    await rejectProduct(p.id, reason)
    ElMessage.success(`已驳回：${reason}`)
    await load()
  }

  async function onSpot(p: AuditProduct) {
    try {
      await ElMessageBox.confirm(`对「${p.name}」进行抽检审查？`, '抽检', {
        confirmButtonText: '加入抽检',
        cancelButtonText: '取消'
      })
      ElMessage.success('已加入抽检队列')
    } catch {
      /* cancel */
    }
  }

  function openDetail(p: AuditProduct) {
    current.value = p
    detailOpen.value = true
  }

  async function saveCfg() {
    if (!cfg.value) return
    await saveProductAuditConfig({ ...cfg.value })
    ElMessage.success('配置已保存')
  }

  async function load() {
    list.value = await fetchProductAudits()
    if (!cfg.value) cfg.value = await fetchProductAuditConfig()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-pa {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }
  .text-g-500 {
    color: #6b7280;
  }

  .pf-auto {
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 77, 45, 0.08), rgba(255, 156, 110, 0.04));
    border: 1px solid rgba(255, 77, 45, 0.2);

    :deep(.el-card__body) {
      padding: 18px 22px;
    }
  }

  .pf-auto__row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .pf-auto__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(255, 77, 45, 0.16);
    color: var(--el-color-primary, #ff4d2d);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .pf-cond {
    border-radius: 12px;
  }

  .pf-card__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .pf-cond__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pf-cond__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 4px;
    border-bottom: 1px dashed var(--art-border-color, #e5e7eb);

    &:last-child {
      border-bottom: none;
    }
  }

  .pf-cond__sample {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-thumb {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .pf-detail {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-detail__img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
  }
</style>
