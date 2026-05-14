<!-- 商家 PC · 佣金设置（S3.5-T8）-->
<template>
  <div class="mp-commission">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">佣金设置</h2>
        <p class="mt-1 text-sm text-g-500">配置分销规则 · 实时生效</p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" @click="load" plain>重置</ElButton>
        <ElButton type="primary" :icon="Check" @click="save">保存配置</ElButton>
      </div>
    </div>

    <!-- 总开关卡 -->
    <ElCard shadow="never" class="mp-hero">
      <div class="mp-hero__row">
        <div>
          <div class="text-lg font-semibold">
            <ArtSvgIcon icon="ri:share-forward-line" class="mr-2" /> 分销佣金
          </div>
          <div class="text-sm text-g-500 mt-1">客户分享购买后，自动结算佣金到推广者账户</div>
        </div>
        <ElSwitch
          v-model="config.enabled"
          size="large"
          active-text="启用中"
          inactive-text="已停用"
          inline-prompt
        />
      </div>
    </ElCard>

    <!-- 佣金比例 -->
    <ElCard shadow="never">
      <template #header><span class="font-semibold">默认佣金比例 · 全店通用</span></template>
      <div class="mp-rates">
        <div class="mp-rate">
          <div class="mp-rate__head">
            <span class="mp-rate__lbl">一级佣金</span>
            <span class="text-xs text-g-500">直接推广者获得</span>
          </div>
          <div class="mp-rate__row">
            <ElButton circle :icon="Minus" @click="adjust('level1Percent', -0.5)" />
            <span class="mp-rate__num">{{ config.level1Percent }}<small>%</small></span>
            <ElButton circle :icon="Plus" type="primary" @click="adjust('level1Percent', 0.5)" />
          </div>
        </div>
        <div class="mp-rate-divider" />
        <div class="mp-rate">
          <div class="mp-rate__head">
            <span class="mp-rate__lbl">二级佣金</span>
            <span class="text-xs text-g-500">推广者的上级获得</span>
          </div>
          <div class="mp-rate__row">
            <ElButton circle :icon="Minus" @click="adjust('level2Percent', -0.5)" />
            <span class="mp-rate__num">{{ config.level2Percent }}<small>%</small></span>
            <ElButton circle :icon="Plus" type="primary" @click="adjust('level2Percent', 0.5)" />
          </div>
        </div>
      </div>
      <ElAlert
        v-if="totalPercent > 30"
        type="warning"
        :title="`一级 + 二级 = ${totalPercent}%，超过 30% 建议调低（影响利润）`"
        :closable="false"
        show-icon
        class="mt-3"
      />
    </ElCard>

    <!-- 商品自定义佣金 -->
    <ElCard shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">商品自定义佣金</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-g-500">单品规则将覆盖全店默认值</span>
            <ElButton type="primary" plain size="small" :icon="Plus" @click="openCustomRule">添加自定义</ElButton>
          </div>
        </div>
      </template>
      <ElTable v-if="customRules.length" :data="customRules" stripe size="small">
        <ElTableColumn label="商品" min-width="220">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElImage :src="row.image" fit="cover" style="width: 36px; height: 36px; border-radius: 6px" />
              <span class="font-medium">{{ row.name }}</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="一级佣金" width="120" align="center">
          <template #default="{ row }">
            <ElTag size="small" type="primary">{{ row.level1 }}%</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="二级佣金" width="120" align="center">
          <template #default="{ row }">
            <ElTag size="small">{{ row.level2 }}%</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="生效" width="80" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.enabled" size="small" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="140" align="center">
          <template #default="{ row, $index }">
            <ElButton link type="primary" @click="editCustomRule(row, $index)">编辑</ElButton>
            <ElButton link type="danger" @click="removeCustomRule($index)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <ElEmpty v-else description="尚未设置单品自定义，所有商品使用默认比例" :image-size="60" />
    </ElCard>

    <!-- 其它选项 -->
    <ElCard shadow="never">
      <template #header><span class="font-semibold">其它选项</span></template>
      <div class="mp-options">
        <div class="mp-opt">
          <div>
            <div class="font-medium">对分佣客户可见</div>
            <div class="text-xs text-g-500">客户能在「我的推广」看到自己的佣金率</div>
          </div>
          <ElSwitch v-model="config.visibleToPromoter" />
        </div>
        <div class="mp-opt">
          <div>
            <div class="font-medium">允许线下结算</div>
            <div class="text-xs text-g-500">商户可手动结算佣金（不走系统）</div>
          </div>
          <ElSwitch v-model="config.allowOffline" />
        </div>
      </div>
    </ElCard>

    <!-- 自定义佣金 Dialog -->
    <ElDialog v-model="customDialogOpen" :title="customForm.id ? '编辑自定义佣金' : '添加自定义佣金'" width="500px" align-center>
      <ElForm :model="customForm" label-position="top">
        <ElFormItem label="商品">
          <ElSelect v-model="customForm.id" filterable placeholder="选择商品" style="width: 100%" :disabled="!!customForm.editing">
            <ElOption
              v-for="p in productOptions"
              :key="p.id"
              :value="p.id"
              :label="p.name"
              :disabled="customRules.some((r) => r.id === p.id && r.id !== customForm.editing)"
            />
          </ElSelect>
        </ElFormItem>
        <div class="grid grid-cols-2 gap-3">
          <ElFormItem label="一级佣金 %">
            <ElInputNumber v-model="customForm.level1" :min="0" :max="50" :step="0.5" style="width: 100%" />
          </ElFormItem>
          <ElFormItem label="二级佣金 %">
            <ElInputNumber v-model="customForm.level2" :min="0" :max="50" :step="0.5" style="width: 100%" />
          </ElFormItem>
        </div>
        <ElAlert
          v-if="customForm.level1 + customForm.level2 > 50"
          type="warning"
          :closable="false"
          show-icon
          :title="`合计 ${customForm.level1 + customForm.level2}% 偏高，可能影响利润`"
        />
      </ElForm>
      <template #footer>
        <ElButton @click="customDialogOpen = false">取消</ElButton>
        <ElButton type="primary" @click="submitCustomRule">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 佣金记录 -->
    <ElCard shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">佣金记录</span>
          <ElLink type="primary" :underline="false">查看全部</ElLink>
        </div>
      </template>
      <div class="mp-summary" v-if="summary">
        <div class="mp-summary__item">
          <div class="text-xs text-g-500">累计佣金</div>
          <div class="mp-summary__val text-primary">¥{{ summary.totalCommission.toLocaleString() }}</div>
        </div>
        <div class="mp-summary__item">
          <div class="text-xs text-g-500">本月佣金</div>
          <div class="mp-summary__val">¥{{ summary.monthCommission.toLocaleString() }}</div>
        </div>
        <div class="mp-summary__item">
          <div class="text-xs text-g-500">待结算</div>
          <div class="mp-summary__val">¥{{ summary.pendingCommission.toLocaleString() }}</div>
        </div>
        <div class="mp-summary__item">
          <div class="text-xs text-g-500">推广客户</div>
          <div class="mp-summary__val">{{ summary.promotedUsers }} 人</div>
        </div>
      </div>
      <ElTable :data="history" stripe size="default">
        <ElTableColumn label="订单号" prop="orderId" width="180">
          <template #default="{ row }">{{ row.orderId.slice(0, 10) }}</template>
        </ElTableColumn>
        <ElTableColumn label="级别" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.level === 1 ? 'primary' : 'info'" size="small" effect="plain">
              {{ row.level }} 级
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="金额" width="140" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ row.amount }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="时间" prop="createdAt">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchCommissionConfig,
    saveCommissionConfig,
    fetchCommissionHistory,
    fetchPromoteSummary,
    fetchMerchantProducts,
    type CommissionConfig
  } from '@/api/merchant-business'
  import type { Commission, Product, PromoteSummary } from '@jiujiu/shared/types'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage } from 'element-plus'
  import { Check, Minus, Plus, Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantCommission' })

  const config = reactive<CommissionConfig>({
    level1Percent: 8,
    level2Percent: 3,
    visibleToPromoter: true,
    allowOffline: false,
    enabled: true
  })

  const history = ref<Commission[]>([])
  const summary = ref<PromoteSummary>()

  /* ====== 商品自定义佣金 ====== */
  interface CustomRule {
    id: string
    name: string
    image: string
    level1: number
    level2: number
    enabled: boolean
  }
  const CUSTOM_KEY = 'jj_commission_custom_v1'
  const customRules = ref<CustomRule[]>([])
  const productOptions = ref<Pick<Product, 'id' | 'name' | 'images'>[]>([])
  const customDialogOpen = ref(false)
  const customForm = reactive<{
    id: string
    editing?: string
    level1: number
    level2: number
  }>({ id: '', editing: undefined, level1: 8, level2: 3 })

  function loadCustomRules() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY)
      if (raw) customRules.value = JSON.parse(raw)
    } catch {
      /* ignore */
    }
  }
  function persistCustomRules() {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customRules.value))
    } catch {
      /* ignore */
    }
  }

  function openCustomRule() {
    customForm.id = ''
    customForm.editing = undefined
    customForm.level1 = config.level1Percent
    customForm.level2 = config.level2Percent
    customDialogOpen.value = true
  }

  function editCustomRule(rule: CustomRule, _idx: number) {
    customForm.id = rule.id
    customForm.editing = rule.id
    customForm.level1 = rule.level1
    customForm.level2 = rule.level2
    customDialogOpen.value = true
  }

  function removeCustomRule(idx: number) {
    customRules.value.splice(idx, 1)
    persistCustomRules()
    ElMessage.success('已移除单品规则')
  }

  function submitCustomRule() {
    if (!customForm.id) {
      ElMessage.warning('请选择商品')
      return
    }
    const product = productOptions.value.find((p) => p.id === customForm.id)
    if (!product) return
    const newRule: CustomRule = {
      id: product.id,
      name: product.name,
      image: product.images?.[0] || '',
      level1: customForm.level1,
      level2: customForm.level2,
      enabled: true
    }
    const idx = customRules.value.findIndex((r) => r.id === product.id)
    if (idx >= 0) customRules.value.splice(idx, 1, newRule)
    else customRules.value.push(newRule)
    persistCustomRules()
    customDialogOpen.value = false
    ElMessage.success('单品规则已保存')
  }

  const totalPercent = computed(() =>
    Math.round((config.level1Percent + config.level2Percent) * 10) / 10
  )

  function adjust(k: 'level1Percent' | 'level2Percent', d: number) {
    const next = Math.max(0, Math.min(50, config[k] + d))
    config[k] = Math.round(next * 10) / 10
  }

  function statusTypeOf(s: Commission['status']) {
    return ({ pending: 'warning', settled: 'success', cancelled: 'info' } as const)[s]
  }
  function statusLabelOf(s: Commission['status']) {
    return ({ pending: '待结算', settled: '已结算', cancelled: '已取消' } as const)[s]
  }

  async function save() {
    await saveCommissionConfig(config)
    persistCustomRules()
    ElMessage.success(`已保存 · 全店默认 + ${customRules.value.length} 条单品规则`)
  }

  async function load() {
    Object.assign(config, await fetchCommissionConfig())
    history.value = await fetchCommissionHistory()
    summary.value = await fetchPromoteSummary()
    const products = await fetchMerchantProducts({})
    productOptions.value = products.slice(0, 30).map((p) => ({
      id: p.id,
      name: p.name,
      images: p.images
    }))
    loadCustomRules()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .mp-commission {
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
    background: linear-gradient(135deg, rgba(255, 77, 45, 0.05), rgba(255, 77, 45, 0.02));
  }

  .mp-hero__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mp-rates {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 16px;
    align-items: center;
  }

  .mp-rate__head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: center;
    margin-bottom: 10px;
  }

  .mp-rate__lbl {
    font-size: 14px;
    font-weight: 500;
  }

  .mp-rate__row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }

  .mp-rate__num {
    font-size: 36px;
    font-weight: 700;
    color: var(--el-color-primary, #ff4d2d);
    min-width: 90px;
    text-align: center;

    small {
      font-size: 18px;
      margin-left: 2px;
    }
  }

  .mp-rate-divider {
    width: 1px;
    height: 80px;
    background: var(--art-border-color, #e5e7eb);
  }

  .mp-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mp-opt {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;

    & + & {
      border-top: 1px solid var(--art-border-color, #f3f4f6);
    }
  }

  .mp-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 14px;
  }

  .mp-summary__item {
    padding: 12px 14px;
    background: #fafbfc;
    border-radius: 8px;
  }

  .mp-summary__val {
    font-size: 20px;
    font-weight: 600;
    margin-top: 4px;
  }
</style>
