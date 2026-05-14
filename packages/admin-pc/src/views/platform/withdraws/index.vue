<!--
  平台 PC · 提现审核
  ─────────────────────────────────────────────
  对接后端 GET /api/v1/p/withdraws 列表 + 通过 / 驳回 / 标记已打款。
  商家在自己工作台提交提现申请后，平台运营在这里统一审核与放款。
-->
<template>
  <div class="pf-wd">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">提现审核</h2>
        <p class="mt-1 text-sm text-g-500">
          商家提交的提现申请 · 通过 → 财务打款 → 标记已支付
        </p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <!-- KPI -->
    <div class="pf-kpi-row">
      <ElCard
        v-for="k in kpiCards"
        :key="k.key"
        shadow="hover"
        class="pf-kpi"
      >
        <div class="pf-kpi__icon" :style="{ background: k.color + '18', color: k.color }">
          <ArtSvgIcon :icon="k.icon" />
        </div>
        <div>
          <div class="pf-kpi__num">{{ k.value }}</div>
          <div class="pf-kpi__label">{{ k.label }}</div>
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab" @tab-change="onTabChange">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="t.label"
          :name="t.value"
        />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never">
      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无提现申请"
      >
        <ElTableColumn label="商家" min-width="160">
          <template #default="{ row }">
            <div>{{ row.merchantName || '—' }}</div>
            <div class="text-xs text-g-500 pf-mono">{{ row.merchantId }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="金额" width="120" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.amount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="提现方式" width="110" align="center">
          <template #default="{ row }">
            <ElTag :type="methodTypeOf(row.method)" size="small" effect="plain">
              {{ methodLabelOf(row.method) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="收款账户" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="pf-mono">{{ row.account || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="申请时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">{{
              statusLabelOf(row.status)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <ElButton link type="primary" @click="onApprove(row)">通过</ElButton>
              <ElButton link type="danger" @click="onReject(row)">驳回</ElButton>
            </template>
            <template v-else-if="row.status === 'approved'">
              <ElButton link type="success" @click="onMarkPaid(row)">标记已打款</ElButton>
            </template>
            <ElButton link @click="openDetail(row)">详情</ElButton>
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

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailOpen" :size="460" :with-header="false">
      <div v-if="current" class="pf-detail">
        <h3 class="m-0">提现详情</h3>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="商家">{{ current.merchantName || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商家 ID">{{ current.merchantId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="金额">
            <span class="text-primary font-semibold">¥{{ current.amount }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="提现方式">{{
            methodLabelOf(current.method)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收款账户">{{ current.account || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="statusTypeOf(current.status)" size="small">{{
              statusLabelOf(current.status)
            }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="申请时间">{{
            formatDateTime(current.createdAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="current.reviewedAt" label="审核时间">{{
            formatDateTime(current.reviewedAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="current.paidAt" label="打款时间">{{
            formatDateTime(current.paidAt)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="current.transactionId" label="对账流水号">
            <span class="pf-mono">{{ current.transactionId }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem v-if="current.remark" label="审核备注">{{
            current.remark
          }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="current.rejectReason" label="驳回理由">{{
            current.rejectReason
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </div>
    </ElDrawer>

    <!-- 标记已打款对话框 -->
    <ElDialog
      v-model="paidDialogOpen"
      title="标记已打款"
      width="460px"
      align-center
      destroy-on-close
    >
      <ElForm :model="paidForm" label-width="92px" label-position="right">
        <ElFormItem label="对账流水号" required>
          <ElInput
            v-model="paidForm.transactionId"
            placeholder="必填 · 银行 / 微信 / 支付宝转账单号"
            maxlength="64"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput
            v-model="paidForm.remark"
            type="textarea"
            :rows="3"
            placeholder="选填 · 内部留痕，商家可见"
            maxlength="200"
            show-word-limit
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="paidDialogOpen = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="paidSubmitting"
          :disabled="!paidForm.transactionId.trim()"
          @click="confirmMarkPaid"
        >
          确认已打款
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'
  import {
    fetchPlatformWithdraws,
    approvePlatformWithdraw,
    rejectPlatformWithdraw,
    markPlatformWithdrawPaid,
    type PlatformWithdrawItem
  } from '@/api/platform-business'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'PlatformWithdraws' })

  type TabKey = 'all' | PlatformWithdrawItem['status']

  const tabs: { label: string; value: TabKey }[] = [
    { label: '全部', value: 'all' },
    { label: '待审核', value: 'pending' },
    { label: '已通过(待打款)', value: 'approved' },
    { label: '已打款', value: 'paid' },
    { label: '已驳回', value: 'rejected' }
  ]

  const tab = ref<TabKey>('pending')
  const list = ref<PlatformWithdrawItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const detailOpen = ref(false)
  const current = ref<PlatformWithdrawItem>()

  // 标记已打款对话框状态
  const paidDialogOpen = ref(false)
  const paidSubmitting = ref(false)
  const paidTargetId = ref('')
  const paidForm = reactive<{ transactionId: string; remark: string }>({
    transactionId: '',
    remark: ''
  })

  // KPI 卡片走"全量统计"而非"当前分页统计"——后端无聚合接口前，
  // 仅展示当前页面可见的待审核/已通过/已打款数量；写明只是当前页面统计，
  // 避免误把"100 条总计"当成"系统全部"。
  const kpiCards = computed(() => {
    const pending = list.value.filter((x) => x.status === 'pending').length
    const approved = list.value.filter((x) => x.status === 'approved').length
    const paid = list.value.filter((x) => x.status === 'paid').length
    const rejected = list.value.filter((x) => x.status === 'rejected').length
    return [
      {
        key: 'pending',
        icon: 'ri:time-line',
        label: '待审核',
        value: pending,
        color: '#FF4D2D'
      },
      {
        key: 'approved',
        icon: 'ri:check-line',
        label: '已通过待打款',
        value: approved,
        color: '#FAAD14'
      },
      {
        key: 'paid',
        icon: 'ri:wallet-line',
        label: '已打款',
        value: paid,
        color: '#10B981'
      },
      {
        key: 'rejected',
        icon: 'ri:close-line',
        label: '已驳回',
        value: rejected,
        color: '#909399'
      }
    ]
  })

  function methodTypeOf(m: PlatformWithdrawItem['method']) {
    return ({ wechat: 'success', alipay: 'primary', bank: 'warning' } as const)[m] || 'info'
  }
  function methodLabelOf(m: PlatformWithdrawItem['method']) {
    return ({ wechat: '微信', alipay: '支付宝', bank: '银行卡' } as const)[m] || m
  }
  function statusTypeOf(s: PlatformWithdrawItem['status']) {
    return (
      (
        {
          pending: 'warning',
          approved: 'primary',
          paid: 'success',
          rejected: 'info'
        } as const
      )[s] || 'info'
    )
  }
  function statusLabelOf(s: PlatformWithdrawItem['status']) {
    return (
      (
        {
          pending: '待审核',
          approved: '已通过',
          paid: '已打款',
          rejected: '已驳回'
        } as const
      )[s] || s
    )
  }

  function openDetail(w: PlatformWithdrawItem) {
    current.value = w
    detailOpen.value = true
  }

  async function onApprove(w: PlatformWithdrawItem) {
    let remark = ''
    try {
      const r = await ElMessageBox.prompt(
        `通过「${w.merchantName || w.merchantId}」¥${w.amount} 的提现申请？\n可选留备注供财务参考。`,
        '通过提现',
        {
          confirmButtonText: '通过',
          cancelButtonText: '取消',
          inputType: 'textarea',
          inputPlaceholder: '可选 · 内部备注'
        }
      )
      remark = (r.value || '').trim()
    } catch {
      return
    }
    try {
      await approvePlatformWithdraw(w.id, remark)
      ElMessage.success('已通过提现申请')
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败，请稍后重试')
    }
  }

  async function onReject(w: PlatformWithdrawItem) {
    let reason = ''
    try {
      const r = await ElMessageBox.prompt(
        `驳回「${w.merchantName || w.merchantId}」¥${w.amount} 的提现申请，请填写理由（必填，将告知商家）`,
        '驳回提现',
        {
          confirmButtonText: '确认驳回',
          cancelButtonText: '取消',
          inputType: 'textarea',
          inputPlaceholder: '如：账户信息错误 / 风控异常 / 余额异常 ...',
          inputValidator: (v) => (v && v.trim().length >= 2 ? true : '请填写至少 2 个字符的理由')
        }
      )
      reason = (r.value || '').trim()
    } catch {
      return
    }
    try {
      await rejectPlatformWithdraw(w.id, reason)
      ElMessage.success('已驳回提现申请')
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败，请稍后重试')
    }
  }

  function onMarkPaid(w: PlatformWithdrawItem) {
    paidTargetId.value = w.id
    paidForm.transactionId = ''
    paidForm.remark = ''
    paidDialogOpen.value = true
  }

  async function confirmMarkPaid() {
    const transactionId = paidForm.transactionId.trim()
    if (!transactionId) {
      ElMessage.warning('请填写对账流水号')
      return
    }
    paidSubmitting.value = true
    try {
      await markPlatformWithdrawPaid(paidTargetId.value, {
        transactionId,
        remark: paidForm.remark.trim() || undefined
      })
      ElMessage.success('已标记打款完成')
      paidDialogOpen.value = false
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败，请稍后重试')
    } finally {
      paidSubmitting.value = false
    }
  }

  function onTabChange() {
    page.value = 1
    load()
  }

  function onSizeChange(size: number) {
    pageSize.value = size
    page.value = 1
    load()
  }

  async function load() {
    loading.value = true
    try {
      const resp = await fetchPlatformWithdraws({
        status: tab.value === 'all' ? undefined : tab.value,
        page: page.value,
        pageSize: pageSize.value
      })
      list.value = resp.list
      total.value = resp.total
    } catch (e: any) {
      ElMessage.error(e?.message || '加载提现列表失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-wd {
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

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .text-g-500 {
    color: #6b7280;
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
      padding: 8px 16px;
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

  .pf-detail {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px;
  }
</style>
