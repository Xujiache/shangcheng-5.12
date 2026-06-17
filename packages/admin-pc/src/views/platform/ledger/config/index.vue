<!--
  平台 PC · 门窗利账 · 功能配置（#9 优化下料 / #10 邀请）
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/config（读取 / 更新）。
  运营在此调整：优化下料试用天数 / 是否需会员、邀请奖励天数、是否开放自助注册。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">功能配置</h2>
        <p class="mt-1 text-sm text-g-500">优化下料试用规则 · 邀请奖励 · 自助注册开关</p>
      </div>
      <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
    </div>

    <ElCard v-loading="loading" shadow="never" class="pf-cfg-card">
      <h3 class="pf-cfg-title">型材优化下料（#9）</h3>
      <ElForm :model="form" label-width="180px" label-position="left">
        <ElFormItem label="试用期后需会员">
          <ElSwitch v-model="form.cutRequireMembership" />
          <span class="pf-cfg-hint">关闭则所有用户永久免费使用优化下料</span>
        </ElFormItem>
        <ElFormItem label="免费试用天数">
          <ElInputNumber
            v-model="form.cutTrialDays"
            :min="0"
            :max="3650"
            :value-on-clear="0"
            controls-position="right"
            :disabled="!form.cutRequireMembership"
          />
          <span class="pf-cfg-hint">从用户首次使用起算；0 表示无试用，直接要求会员</span>
        </ElFormItem>
      </ElForm>

      <ElDivider />

      <h3 class="pf-cfg-title">邀请与注册（#10）</h3>
      <ElForm :model="form" label-width="180px" label-position="left">
        <ElFormItem label="开放自助注册">
          <ElSwitch v-model="form.allowSelfRegister" />
          <span class="pf-cfg-hint">关闭后 App 注册入口将提示"请联系管理员开通"</span>
        </ElFormItem>
        <ElFormItem label="邀请奖励天数">
          <ElInputNumber
            v-model="form.inviteRewardDays"
            :min="0"
            :max="3650"
            :value-on-clear="0"
            controls-position="right"
          />
          <span class="pf-cfg-hint"
            >好友凭邀请码注册成功后，赠送邀请人的会员天数；0 表示不奖励</span
          >
        </ElFormItem>
        <ElFormItem label="每人最多奖励人数">
          <ElInputNumber
            v-model="form.inviteMaxRewarded"
            :min="0"
            :max="100000"
            :value-on-clear="0"
            controls-position="right"
          />
          <span class="pf-cfg-hint"
            >单个邀请人最多奖励多少个被邀请人（反刷量上限）；0 表示不限</span
          >
        </ElFormItem>
      </ElForm>

      <ElDivider />

      <h3 class="pf-cfg-title">会员套餐</h3>
      <p class="pf-cfg-sub">
        App 会员中心展示的套餐卡片，并作为后台「按套餐授予」的天数来源（价格仅展示，App 内无支付）。
      </p>
      <ElTable :data="form.plans" size="small" border class="pf-plans">
        <ElTableColumn label="标识 key" width="140">
          <template #default="{ row }">
            <ElInput v-model="row.key" placeholder="如 month" maxlength="20" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="名称" width="150">
          <template #default="{ row }">
            <ElInput v-model="row.label" placeholder="如 月卡" maxlength="20" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="天数" width="140">
          <template #default="{ row }">
            <ElInputNumber
              v-model="row.days"
              :min="1"
              :max="3650"
              :value-on-clear="1"
              controls-position="right"
              size="small"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="价格（展示）" width="130">
          <template #default="{ row }">
            <ElInput v-model="row.price" placeholder="如 ¥29" maxlength="20" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="永久" width="76" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.perpetual" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="限领1次" width="84" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.trial" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="72">
          <template #default="{ $index }">
            <ElButton type="danger" link @click="removePlan($index)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <ElButton class="mt-2" :icon="Plus" plain size="small" @click="addPlan">新增套餐</ElButton>

      <div class="pf-cfg-actions">
        <ElButton type="primary" :loading="saving" @click="save">保存配置</ElButton>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { reactive, ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Refresh, Plus } from '@element-plus/icons-vue'
  import {
    fetchLedgerConfig,
    updateLedgerConfig,
    type LedgerConfig,
    type LedgerPlan
  } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerConfig' })

  const loading = ref(false)
  const saving = ref(false)
  const form = reactive<LedgerConfig>({
    allowSelfRegister: true,
    inviteRewardDays: 7,
    inviteMaxRewarded: 50,
    cutTrialDays: 7,
    cutRequireMembership: true,
    plans: []
  })

  function addPlan() {
    form.plans.push({ key: '', label: '', days: 30, price: '', perpetual: false, trial: false })
  }
  function removePlan(i: number) {
    form.plans.splice(i, 1)
  }

  async function load() {
    loading.value = true
    try {
      const cfg = await fetchLedgerConfig()
      form.allowSelfRegister = cfg.allowSelfRegister
      form.inviteRewardDays = cfg.inviteRewardDays
      form.inviteMaxRewarded = cfg.inviteMaxRewarded
      form.cutTrialDays = cfg.cutTrialDays
      form.cutRequireMembership = cfg.cutRequireMembership
      // 拷贝一份，避免直接引用接口返回对象
      form.plans = cfg.plans.map((p) => ({ ...p }))
    } catch (e: any) {
      ElMessage.error(e?.message || '加载配置失败')
    } finally {
      loading.value = false
    }
  }

  /** 套餐前置校验：标识/名称非空 + key 唯一 + 至少一条；返回清洗后的数组或 null。 */
  function validatePlans(): LedgerPlan[] | null {
    const plans = form.plans.map((p) => ({
      key: String(p.key || '').trim(),
      label: String(p.label || '').trim(),
      days: Math.round(Number(p.days) || 0),
      price: String(p.price || '').trim(),
      perpetual: !!p.perpetual,
      trial: !!p.trial
    }))
    if (!plans.length) {
      ElMessage.warning('至少保留一个套餐')
      return null
    }
    const keys = new Set<string>()
    for (const p of plans) {
      if (!p.key || !p.label) {
        ElMessage.warning('每个套餐的「标识」和「名称」都要填写')
        return null
      }
      if (!(p.days > 0)) {
        ElMessage.warning(`套餐「${p.label}」的天数需大于 0`)
        return null
      }
      if (keys.has(p.key)) {
        ElMessage.warning(`套餐标识「${p.key}」重复，请改为唯一值`)
        return null
      }
      keys.add(p.key)
    }
    return plans
  }

  async function save() {
    const plans = validatePlans()
    if (!plans) return
    saving.value = true
    try {
      await updateLedgerConfig({
        allowSelfRegister: form.allowSelfRegister,
        inviteRewardDays: form.inviteRewardDays,
        inviteMaxRewarded: form.inviteMaxRewarded,
        cutTrialDays: form.cutTrialDays,
        cutRequireMembership: form.cutRequireMembership,
        plans
      })
      ElMessage.success('配置已保存')
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败，请稍后重试')
    } finally {
      saving.value = false
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

  .pf-cfg-card {
    max-width: 720px;
  }

  .pf-cfg-title {
    margin: 4px 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .pf-cfg-hint {
    margin-left: 12px;
    font-size: 12.5px;
    color: #9ca3af;
  }

  .pf-cfg-sub {
    margin: -8px 0 14px;
    font-size: 12.5px;
    color: #9ca3af;
  }

  .pf-plans {
    width: 100%;
  }

  .mt-2 {
    margin-top: 10px;
  }

  .pf-cfg-actions {
    padding-left: 180px;
    margin-top: 20px;
  }
</style>
