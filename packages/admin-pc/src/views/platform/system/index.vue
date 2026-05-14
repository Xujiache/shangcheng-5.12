<!-- 平台 PC · 系统设置（S5-T12）-->
<template>
  <div class="pf-sys" v-if="s">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">系统设置</h2>
        <p class="mt-1 text-sm text-g-500">平台基础配置 · 支付 · 物流 · 安全</p>
      </div>
      <ElButton type="primary" @click="onSave" :loading="saving">保存全部</ElButton>
    </div>

    <!-- 1 站点 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"><span><ArtSvgIcon icon="ri:earth-line" /> 站点信息</span></div>
      </template>
      <ElForm :model="s.site" label-width="120px">
        <ElFormItem label="平台名称"><ElInput v-model="s.site.name" /></ElFormItem>
        <ElFormItem label="Logo URL"><ElInput v-model="s.site.logo" /></ElFormItem>
        <ElFormItem label="ICP 备案号"><ElInput v-model="s.site.icp" /></ElFormItem>
      </ElForm>
      <ElDivider />
      <ElForm :model="s.business" label-width="120px">
        <ElFormItem label="商家注册上限">
          <ElInputNumber v-model="s.business.registerLimit" :min="0" :max="100000" :step="100" />
          <span class="text-xs text-g-500 ml-2">家</span>
        </ElFormItem>
        <ElFormItem label="平台抽佣比例">
          <ElInputNumber v-model="s.business.commissionRate" :min="0" :max="50" :step="0.5" :precision="1" />
          <span class="text-xs text-g-500 ml-2">%</span>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 2 支付 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"><span><ArtSvgIcon icon="ri:wallet-3-line" /> 支付方式</span></div>
      </template>
      <div class="pf-toggles">
        <div class="pf-toggle">
          <div class="pf-toggle__icon" style="background: #3CB24418; color: #3CB244"><ArtSvgIcon icon="ri:wechat-pay-line" /></div>
          <div class="flex-1">
            <div class="font-medium">微信支付</div>
            <div class="text-xs text-g-500">移动端 · 公众号 · 小程序</div>
          </div>
          <ElSwitch v-model="s.payment.wechat" />
        </div>
        <div class="pf-toggle">
          <div class="pf-toggle__icon" style="background: #1296DB18; color: #1296DB"><ArtSvgIcon icon="ri:alipay-line" /></div>
          <div class="flex-1">
            <div class="font-medium">支付宝</div>
            <div class="text-xs text-g-500">移动端 · 网页 · 小程序</div>
          </div>
          <ElSwitch v-model="s.payment.alipay" />
        </div>
        <div class="pf-toggle">
          <div class="pf-toggle__icon" style="background: #FF7A4518; color: #FF7A45"><ArtSvgIcon icon="ri:wallet-line" /></div>
          <div class="flex-1">
            <div class="font-medium">余额支付</div>
            <div class="text-xs text-g-500">商户预存款</div>
          </div>
          <ElSwitch v-model="s.payment.balance" />
        </div>
      </div>
    </ElCard>

    <!-- 3 物流 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"><span><ArtSvgIcon icon="ri:truck-line" /> 物流配置</span></div>
      </template>
      <ElForm :model="s.logistics" label-width="120px">
        <ElFormItem label="默认运费">
          <ElInputNumber v-model="s.logistics.defaultFreight" :min="0" :max="999" />
          <span class="text-xs text-g-500 ml-2">元</span>
        </ElFormItem>
        <ElFormItem label="可选物流商">
          <ElCheckboxGroup v-model="s.logistics.providers">
            <ElCheckbox value="顺丰">顺丰</ElCheckbox>
            <ElCheckbox value="京东">京东</ElCheckbox>
            <ElCheckbox value="中通">中通</ElCheckbox>
            <ElCheckbox value="圆通">圆通</ElCheckbox>
            <ElCheckbox value="申通">申通</ElCheckbox>
            <ElCheckbox value="韵达">韵达</ElCheckbox>
            <ElCheckbox value="德邦">德邦（大件）</ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 4 客服 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"><span><ArtSvgIcon icon="ri:customer-service-2-line" /> 客服 / 联系方式</span></div>
      </template>
      <ElForm :model="s.service" label-width="120px">
        <ElFormItem label="客服电话"><ElInput v-model="s.service.phone" /></ElFormItem>
        <ElFormItem label="客服邮箱"><ElInput v-model="s.service.email" /></ElFormItem>
        <ElFormItem label="工作时间"><ElInput v-model="s.service.workTime" placeholder="如：09:00 - 21:00" /></ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 5 安全 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"><span><ArtSvgIcon icon="ri:shield-keyhole-line" /> 安全策略</span></div>
      </template>
      <ElForm :model="s.security" label-width="120px">
        <ElFormItem label="密码策略">
          <ElSelect v-model="s.security.passwordPolicy" style="width: 240px">
            <ElOption value="strict" label="严格（8 位 + 大小写 + 数字 + 特殊符号）" />
            <ElOption value="normal" label="标准（8 位 + 大小写 + 数字）" />
            <ElOption value="loose" label="宽松（6 位以上）" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="IP 白名单">
          <ElInput
            :model-value="s.security.ipWhitelist.join('\n')"
            type="textarea"
            :rows="4"
            placeholder="每行一个 IP，留空表示不限制"
            @update:model-value="(v) => (s!.security.ipWhitelist = String(v).split('\n').map((x: string) => x.trim()).filter(Boolean))"
          />
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchSystemSettings, saveSystemSettings, type SystemSettings } from '@/api/platform-business'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'PlatformSystem' })

  const s = ref<SystemSettings>()
  const saving = ref(false)

  async function onSave() {
    if (!s.value) return
    saving.value = true
    try {
      await saveSystemSettings(s.value)
      ElMessage.success('已保存所有配置')
    } finally {
      saving.value = false
    }
  }

  async function load() {
    s.value = await fetchSystemSettings()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-sys {
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

  .text-g-500 {
    color: #6b7280;
  }

  .pf-card {
    border-radius: 12px;
  }

  .pf-card__title {
    font-weight: 600;

    > span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  .pf-toggles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .pf-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: #fafbfc;
    border-radius: 12px;
  }

  .pf-toggle__icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
</style>
