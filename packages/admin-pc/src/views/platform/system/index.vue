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
        <div class="pf-card__title"
          ><span><ArtSvgIcon icon="ri:earth-line" /> 站点信息</span></div
        >
      </template>
      <ElForm :model="s.site" label-width="160px">
        <ElFormItem label="平台名称"><ElInput v-model="s.site.name" /></ElFormItem>
        <ElFormItem label="Logo URL"><ElInput v-model="s.site.logo" /></ElFormItem>
        <ElFormItem label="ICP 备案号"><ElInput v-model="s.site.icp" /></ElFormItem>
      </ElForm>
      <ElDivider />
      <!--
        业务策略字段名严格对齐后端 `platform.service.ts#systemSettings` default：
          - newMerchantAutoApprove / newProductAutoApprove：新商户 / 新商品入驻是否免审
          - platformCommissionRate：平台抽佣比例（百分比）
          - withdrawMinAmount：商家可发起提现的最小金额（元）
        旧字段 registerLimit / commissionRate 已废弃，后端读不到，且保存后会被默认值反向覆盖。
      -->
      <ElForm :model="s.business" label-width="160px">
        <ElFormItem label="新商户自动审核">
          <ElSwitch v-model="s.business.newMerchantAutoApprove" />
          <span class="text-xs text-g-500 ml-2">开启后商户入驻申请直接通过</span>
        </ElFormItem>
        <ElFormItem label="新商品自动审核">
          <ElSwitch v-model="s.business.newProductAutoApprove" />
          <span class="text-xs text-g-500 ml-2"
            >开启后商品提交即上架；可在「商品审核」页设置抽检</span
          >
        </ElFormItem>
        <ElFormItem label="平台抽佣比例">
          <ElInputNumber
            v-model="s.business.platformCommissionRate"
            :min="0"
            :max="50"
            :step="0.5"
            :precision="1"
          />
          <span class="text-xs text-g-500 ml-2">%</span>
        </ElFormItem>
        <ElFormItem label="提现起付门槛">
          <ElInputNumber v-model="s.business.withdrawMinAmount" :min="0" :max="100000" :step="50" />
          <span class="text-xs text-g-500 ml-2">元</span>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 2 支付 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"
          ><span><ArtSvgIcon icon="ri:wallet-3-line" /> 支付方式</span></div
        >
      </template>
      <div class="pf-toggles">
        <div class="pf-toggle">
          <div class="pf-toggle__icon" style="color: #3cb244; background: #3cb24418"
            ><ArtSvgIcon icon="ri:wechat-pay-line"
          /></div>
          <div class="flex-1">
            <div class="font-medium">微信支付</div>
            <div class="text-xs text-g-500">移动端 · 公众号 · 小程序</div>
          </div>
          <ElSwitch v-model="s.payment.wechat.enabled" />
        </div>
        <div class="pf-toggle">
          <div class="pf-toggle__icon" style="color: #1296db; background: #1296db18"
            ><ArtSvgIcon icon="ri:alipay-line"
          /></div>
          <div class="flex-1">
            <div class="font-medium">支付宝</div>
            <div class="text-xs text-g-500">移动端 · 网页 · 小程序</div>
          </div>
          <ElSwitch v-model="s.payment.alipay.enabled" />
        </div>
        <div class="pf-toggle">
          <div class="pf-toggle__icon" style="color: #ff7a45; background: #ff7a4518"
            ><ArtSvgIcon icon="ri:wallet-line"
          /></div>
          <div class="flex-1">
            <div class="font-medium">余额支付</div>
            <div class="text-xs text-g-500">商户预存款</div>
          </div>
          <ElSwitch v-model="s.payment.balance.enabled" />
        </div>
      </div>
    </ElCard>

    <!-- 3 物流 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"
          ><span><ArtSvgIcon icon="ri:truck-line" /> 物流配置</span></div
        >
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
        <div class="pf-card__title"
          ><span><ArtSvgIcon icon="ri:customer-service-2-line" /> 客服 / 联系方式</span></div
        >
      </template>
      <ElForm :model="s.service" label-width="120px">
        <ElFormItem label="客服电话"><ElInput v-model="s.service.phone" /></ElFormItem>
        <ElFormItem label="客服邮箱"><ElInput v-model="s.service.email" /></ElFormItem>
        <ElFormItem label="工作时间"
          ><ElInput v-model="s.service.workTime" placeholder="如：09:00 - 21:00"
        /></ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 5 安全 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title"
          ><span><ArtSvgIcon icon="ri:shield-keyhole-line" /> 安全策略</span></div
        >
      </template>
      <ElForm :model="s.security" label-width="120px">
        <ElFormItem label="密码最小长度">
          <ElInputNumber
            v-model="s.security.passwordPolicy.minLength"
            :min="6"
            :max="32"
            :step="1"
            style="width: 160px"
          />
          <span class="text-xs text-g-500 ml-2">位</span>
        </ElFormItem>
        <ElFormItem label="必须包含大写字母">
          <ElSwitch v-model="s.security.passwordPolicy.requireUppercase" />
        </ElFormItem>
        <ElFormItem label="IP 白名单">
          <ElInput
            :model-value="s.security.ipWhitelist.join('\n')"
            type="textarea"
            :rows="4"
            placeholder="每行一个 IP，留空表示不限制"
            @update:model-value="
              (v) =>
                (s!.security.ipWhitelist = String(v)
                  .split('\n')
                  .map((x: string) => x.trim())
                  .filter(Boolean))
            "
          />
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchSystemSettings,
    saveSystemSettings,
    type SystemSettings
  } from '@/api/platform-business'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'PlatformSystem' })

  const s = ref<SystemSettings>()
  const saving = ref(false)

  /**
   * 兜底补全所有嵌套字段，避免后端缺字段时 v-model="s.payment.wechat.enabled"
   * 访问 undefined 报 TypeError。所有 payment.* 必须是 {enabled} 对象，
   * security.passwordPolicy 必须是 {minLength, requireUppercase} 对象。
   */
  function fillDefaults(raw: any): SystemSettings {
    return {
      site: {
        name: raw?.site?.name ?? '',
        logo: raw?.site?.logo ?? '',
        icp: raw?.site?.icp ?? ''
      },
      payment: {
        wechat: { enabled: !!raw?.payment?.wechat?.enabled },
        alipay: { enabled: !!raw?.payment?.alipay?.enabled },
        balance: { enabled: !!raw?.payment?.balance?.enabled }
      },
      logistics: {
        providers: Array.isArray(raw?.logistics?.providers) ? raw.logistics.providers : [],
        defaultFreight:
          typeof raw?.logistics?.defaultFreight === 'number' ? raw.logistics.defaultFreight : 10
      },
      service: {
        phone: raw?.service?.phone ?? '',
        email: raw?.service?.email ?? '',
        workTime: raw?.service?.workTime ?? ''
      },
      security: {
        passwordPolicy: {
          minLength:
            typeof raw?.security?.passwordPolicy?.minLength === 'number'
              ? raw.security.passwordPolicy.minLength
              : 8,
          requireUppercase: raw?.security?.passwordPolicy?.requireUppercase !== false
        },
        ipWhitelist: Array.isArray(raw?.security?.ipWhitelist) ? raw.security.ipWhitelist : []
      },
      business: {
        // 后端 default：newMerchantAutoApprove / newProductAutoApprove / platformCommissionRate / withdrawMinAmount
        // 兼容老数据（registerLimit / commissionRate）：
        //   - commissionRate（旧）→ platformCommissionRate（新）
        //   - registerLimit（旧）已废弃，无对应新字段，丢弃即可（保存时也不会再写回去）
        newMerchantAutoApprove: !!raw?.business?.newMerchantAutoApprove,
        newProductAutoApprove: !!raw?.business?.newProductAutoApprove,
        platformCommissionRate:
          typeof raw?.business?.platformCommissionRate === 'number'
            ? raw.business.platformCommissionRate
            : typeof raw?.business?.commissionRate === 'number'
              ? raw.business.commissionRate
              : 5,
        withdrawMinAmount:
          typeof raw?.business?.withdrawMinAmount === 'number'
            ? raw.business.withdrawMinAmount
            : 100
      }
    }
  }

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
    const raw = await fetchSystemSettings()
    s.value = fillDefaults(raw)
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-sys {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
      gap: 6px;
      align-items: center;
    }
  }

  .pf-toggles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;

    @media (width <= 900px) {
      grid-template-columns: 1fr;
    }
  }

  .pf-toggle {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px;
    background: #fafbfc;
    border-radius: 12px;
  }

  .pf-toggle__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 22px;
    border-radius: 12px;
  }
</style>
