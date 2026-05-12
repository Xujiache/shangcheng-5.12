<!-- 商家 PC · 提现处理（S3.5-T9）-->
<template>
  <div class="mp-withdraw">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">提现处理</h2>
        <p class="mt-1 text-sm text-g-500">商家收益与提现申请</p>
      </div>
      <ElButton :icon="Refresh" @click="load" plain>刷新</ElButton>
    </div>

    <!-- Hero 余额卡 -->
    <ElCard shadow="never" class="mp-hero">
      <div class="mp-hero__inner">
        <div class="mp-hero__main">
          <div class="text-sm opacity-80">可提现余额</div>
          <div class="mp-hero__amount">¥{{ balance.available.toLocaleString() }}</div>
          <div class="text-xs opacity-70 mt-1">
            待结算 ¥{{ balance.pending.toLocaleString() }} · 累计提现 ¥{{ balance.totalWithdrawn.toLocaleString() }}
          </div>
        </div>
        <div>
          <ElButton type="primary" size="large" @click="openApply" :icon="Wallet">申请提现</ElButton>
        </div>
      </div>
    </ElCard>

    <!-- Tab + 列表 -->
    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="filterStatus">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="`${t.label} (${countOf(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never">
      <ElTable :data="filteredList" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="申请单号" width="180" prop="no" />
        <ElTableColumn label="申请金额" width="140" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.applyAmount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="实际金额" width="140" align="right">
          <template #default="{ row }">¥{{ row.actualAmount }}</template>
        </ElTableColumn>
        <ElTableColumn label="提现方式" width="120" align="center">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ methodLabelOf(row.method) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="收款账号" prop="account" min-width="160" />
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="申请时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 申请抽屉 -->
    <ElDrawer v-model="applyOpen" :size="480" :with-header="false">
      <div class="mp-apply">
        <div class="mp-apply__head"><h3 class="m-0">申请提现</h3></div>
        <ElAlert
          type="info"
          :title="`可提现余额 ¥${balance.available.toLocaleString()}`"
          :closable="false"
          show-icon
        />
        <ElForm :model="form" :rules="rules" ref="formRef" label-position="top">
          <ElFormItem label="提现金额" prop="applyAmount">
            <ElInputNumber
              v-model="form.applyAmount"
              :min="100"
              :max="balance.available"
              :step="100"
              controls-position="right"
              style="width: 100%"
            />
            <div class="text-xs text-g-500 mt-1">每次最低 ¥100 · 单次最多 ¥{{ balance.available }}</div>
          </ElFormItem>
          <ElFormItem label="提现方式" prop="method">
            <ElRadioGroup v-model="form.method">
              <ElRadioButton value="wechat">微信</ElRadioButton>
              <ElRadioButton value="alipay">支付宝</ElRadioButton>
              <ElRadioButton value="bank">银行卡</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="收款账号" prop="account">
            <ElInput v-model="form.account" :placeholder="accountPlaceholder" />
          </ElFormItem>
        </ElForm>
        <div class="mp-apply__footer">
          <ElButton @click="applyOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitApply" :loading="submitting">提交申请</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchBalance,
    fetchWithdraws,
    applyWithdraw,
    type WithdrawApply
  } from '@/api/merchant-business'
  import type { Withdraw } from '@jiujiu/shared/types'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { Refresh, Wallet } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantWithdraw' })

  const tabs: { label: string; value: Withdraw['status'] | 'all' }[] = [
    { label: '全部', value: 'all' },
    { label: '待审核', value: 'pending' },
    { label: '已通过', value: 'approved' },
    { label: '已驳回', value: 'rejected' },
    { label: '已打款', value: 'paid' },
    { label: '失败', value: 'failed' }
  ]

  const balance = reactive({ available: 0, pending: 0, totalWithdrawn: 0 })
  const list = ref<Withdraw[]>([])
  const filterStatus = ref<Withdraw['status'] | 'all'>('all')

  const applyOpen = ref(false)
  const submitting = ref(false)
  const formRef = ref<FormInstance>()
  const form = reactive<WithdrawApply>({
    applyAmount: 1000,
    method: 'wechat',
    account: ''
  })

  const accountPlaceholder = computed(() =>
    ({ wechat: '微信号 / openid', alipay: '支付宝账号', bank: '请输入银行卡号' })[form.method]
  )

  const rules = computed<FormRules>(() => ({
    applyAmount: [
      { required: true, message: '请输入金额', trigger: 'blur' },
      {
        validator: (_r, v: number, cb) =>
          v >= 100 && v <= balance.available ? cb() : cb(new Error('金额超出范围')),
        trigger: 'blur'
      }
    ],
    account: [{ required: true, message: '请输入收款账号', trigger: 'blur' }]
  }))

  const filteredList = computed(() => {
    if (filterStatus.value === 'all') return list.value
    return list.value.filter((w) => w.status === filterStatus.value)
  })

  function countOf(s: Withdraw['status'] | 'all') {
    if (s === 'all') return list.value.length
    return list.value.filter((w) => w.status === s).length
  }

  function statusTypeOf(s: Withdraw['status']) {
    return (
      {
        pending: 'warning',
        approved: 'primary',
        rejected: 'danger',
        paid: 'success',
        failed: 'info'
      } as const
    )[s]
  }
  function statusLabelOf(s: Withdraw['status']) {
    return (
      {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回',
        paid: '已打款',
        failed: '失败'
      } as const
    )[s]
  }
  function methodLabelOf(m: Withdraw['method']) {
    return ({ wechat: '微信', alipay: '支付宝', bank: '银行卡' } as const)[m]
  }

  function openApply() {
    form.applyAmount = Math.min(1000, balance.available)
    form.method = 'wechat'
    form.account = ''
    applyOpen.value = true
  }

  async function submitApply() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    submitting.value = true
    try {
      await applyWithdraw({ ...form })
      balance.available -= form.applyAmount
      balance.pending += form.applyAmount
      applyOpen.value = false
      ElMessage.success('提现申请已提交')
      await load()
    } finally {
      submitting.value = false
    }
  }

  async function load() {
    const b = await fetchBalance()
    Object.assign(balance, b)
    list.value = await fetchWithdraws()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-withdraw {
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

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-hero {
    border-radius: 12px;
    background: linear-gradient(135deg, #ff7a45, #ff4d2d 80%);
    color: #fff;
    border: none;

    :deep(.el-card__body) {
      padding: 24px 28px;
    }
  }

  .mp-hero__inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mp-hero__amount {
    font-size: 36px;
    font-weight: 700;
    margin: 6px 0;
  }

  .mp-hero :deep(.el-button) {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.32);
    color: #fff;

    &:hover {
      background: rgba(255, 255, 255, 0.28);
      border-color: rgba(255, 255, 255, 0.48);
    }
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .mp-apply {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
  }

  .mp-apply__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: auto;
  }
</style>
