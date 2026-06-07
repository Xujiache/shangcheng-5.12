<!--
  门窗利账 · 增加会员时长弹窗（账号页 / 会员页共用）
  ─────────────────────────────────────────────
  预设套餐（体验卡1天 / 周卡7天 / 月卡30天 / 季卡90天 / 年卡365天）单选，
  或自定义天数（自定义优先于预设）+ 备注。调用后端 grant 接口（累加时长），
  成功后向上 emit('success', deltaDays, newExpiresAt) 由父页刷新列表 + 提示新到期。
-->
<template>
  <ElDialog
    v-model="visible"
    title="增加会员时长"
    width="480px"
    align-center
    destroy-on-close
    @closed="onClosed"
  >
    <div v-if="account" class="ledger-grant">
      <div class="ledger-grant__target">
        <span class="ledger-grant__phone">{{ account.phone }}</span>
        <span v-if="account.nickname" class="ledger-grant__nick">（{{ account.nickname }}）</span>
        <ElTag :type="curTagType" size="small" class="ml-2">{{ curLabel }}</ElTag>
      </div>
      <div class="ledger-grant__cur">
        当前到期：<b>{{
          account.membership.expiresAt ? formatDateTime(account.membership.expiresAt) : '未开通'
        }}</b>
      </div>

      <ElForm :model="form" label-position="top">
        <ElFormItem label="选择套餐">
          <div class="ledger-grant__plans">
            <ElButton
              v-for="p in plans"
              :key="p.key"
              :type="form.planKey === p.key && !customActive ? 'primary' : 'default'"
              :plain="!(form.planKey === p.key && !customActive)"
              @click="pickPlan(p.key)"
            >
              {{ p.label }} · {{ p.days }}天
            </ElButton>
          </div>
        </ElFormItem>

        <ElFormItem label="自定义天数（优先于套餐）">
          <ElInputNumber
            v-model="form.days"
            :min="1"
            :max="3650"
            :step="1"
            placeholder="留空则使用上方套餐"
            controls-position="right"
            style="width: 100%"
            @change="onCustomChange"
          />
        </ElFormItem>

        <ElFormItem label="备注">
          <ElInput
            v-model="form.note"
            type="textarea"
            :rows="2"
            placeholder="选填 · 充值留痕（如：客户付费 / 活动赠送）"
            maxlength="200"
            show-word-limit
          />
        </ElFormItem>

        <div class="ledger-grant__preview">
          本次将增加 <b class="text-primary">{{ effectiveDays }}</b> 天， 新到期约
          <b>{{ previewExpiry }}</b>
        </div>
      </ElForm>
    </div>

    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" :disabled="effectiveDays <= 0" @click="submit">
        确认充值
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    grantLedgerMembership,
    LEDGER_PLANS,
    type LedgerAccount,
    type LedgerPlanKey
  } from '@/api/ledger'
  import { membershipTagType, membershipLabel } from './shared'
  import { formatDateTime } from '@jiujiu/shared/utils'

  defineOptions({ name: 'LedgerGrantMembershipDialog' })

  const props = defineProps<{
    modelValue: boolean
    account: LedgerAccount | null
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'success', deltaDays: number, newExpiresAt: string | null): void
  }>()

  const plans = LEDGER_PLANS

  const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
  })

  const submitting = ref(false)
  const form = reactive<{ planKey: LedgerPlanKey; days: number | undefined; note: string }>({
    planKey: 'month',
    days: undefined,
    note: ''
  })

  // 自定义天数有值时视为「自定义模式」，预设按钮取消高亮、days 优先生效
  const customActive = computed(() => typeof form.days === 'number' && form.days > 0)

  // 每次打开弹窗时重置表单（默认月卡）
  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        form.planKey = 'month'
        form.days = undefined
        form.note = ''
      }
    }
  )

  const curTagType = computed(() => membershipTagType(props.account?.membership))
  const curLabel = computed(() => membershipLabel(props.account?.membership))

  /** 实际生效天数：自定义优先，否则取预设套餐天数 */
  const effectiveDays = computed(() => {
    if (customActive.value) return form.days as number
    return plans.find((p) => p.key === form.planKey)?.days ?? 0
  })

  /** 预览新到期：本地估算（max(now, 当前到期) + N 天），仅供参考，真实值以后端返回为准 */
  const previewExpiry = computed(() => {
    const base = props.account?.membership.expiresAt
    const now = Date.now()
    const from = base ? Math.max(now, new Date(base).getTime()) : now
    return formatDateTime(new Date(from + effectiveDays.value * 86400000))
  })

  function pickPlan(key: LedgerPlanKey) {
    form.planKey = key
    // 选预设时清掉自定义天数，回到「套餐模式」
    form.days = undefined
  }

  function onCustomChange(v: number | undefined) {
    form.days = v ?? undefined
  }

  function onClosed() {
    submitting.value = false
  }

  async function submit() {
    if (!props.account) return
    if (effectiveDays.value <= 0) {
      ElMessage.warning('请选择套餐或填写自定义天数')
      return
    }
    submitting.value = true
    try {
      // days 优先：自定义时只传 days，否则传 planKey（与后端语义一致）
      const payload = customActive.value
        ? { days: form.days, note: form.note.trim() || undefined }
        : { planKey: form.planKey, note: form.note.trim() || undefined }
      const res = await grantLedgerMembership(props.account.id, payload)
      const newExpiry = res?.membership?.expiresAt ?? null
      ElMessage.success(
        `已增加 ${res?.deltaDays ?? effectiveDays.value} 天` +
          (newExpiry ? `，新到期 ${formatDateTime(newExpiry)}` : '')
      )
      emit('success', res?.deltaDays ?? effectiveDays.value, newExpiry)
      visible.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || '充值失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped lang="scss">
  .ledger-grant {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ledger-grant__target {
    display: flex;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
  }

  .ledger-grant__phone {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  }

  .ledger-grant__nick {
    font-weight: 400;
    color: #6b7280;
  }

  .ledger-grant__cur {
    margin-bottom: 4px;
    font-size: 13px;
    color: #6b7280;
  }

  .ledger-grant__plans {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ledger-grant__preview {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
    background: #fafbfc;
    border: 1px dashed var(--art-border-color, #e5e7eb);
    border-radius: 8px;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .ml-2 {
    margin-left: 8px;
  }
</style>
