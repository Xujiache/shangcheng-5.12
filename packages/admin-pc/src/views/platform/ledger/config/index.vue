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
            controls-position="right"
          />
          <span class="pf-cfg-hint"
            >好友凭邀请码注册成功后，赠送邀请人的会员天数；0 表示不奖励</span
          >
        </ElFormItem>
      </ElForm>

      <div class="pf-cfg-actions">
        <ElButton type="primary" :loading="saving" @click="save">保存配置</ElButton>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { reactive, ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'
  import { fetchLedgerConfig, updateLedgerConfig, type LedgerConfig } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerConfig' })

  const loading = ref(false)
  const saving = ref(false)
  const form = reactive<LedgerConfig>({
    allowSelfRegister: true,
    inviteRewardDays: 7,
    cutTrialDays: 7,
    cutRequireMembership: true
  })

  async function load() {
    loading.value = true
    try {
      const cfg = await fetchLedgerConfig()
      form.allowSelfRegister = cfg.allowSelfRegister
      form.inviteRewardDays = cfg.inviteRewardDays
      form.cutTrialDays = cfg.cutTrialDays
      form.cutRequireMembership = cfg.cutRequireMembership
    } catch (e: any) {
      ElMessage.error(e?.message || '加载配置失败')
    } finally {
      loading.value = false
    }
  }

  async function save() {
    saving.value = true
    try {
      await updateLedgerConfig({
        allowSelfRegister: form.allowSelfRegister,
        inviteRewardDays: form.inviteRewardDays,
        cutTrialDays: form.cutTrialDays,
        cutRequireMembership: form.cutRequireMembership
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

  .pf-cfg-actions {
    padding-left: 180px;
    margin-top: 20px;
  }
</style>
