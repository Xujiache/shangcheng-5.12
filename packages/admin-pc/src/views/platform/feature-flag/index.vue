<!-- 平台 PC · 功能开关（S5-T13）-->
<template>
  <div class="pf-ff">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">功能开关</h2>
        <p class="mt-1 text-sm text-g-500">商家端入口与菜单可见性 · 灰度发布</p>
      </div>
      <div class="flex gap-2">
        <ElButton plain @click="onReset">重置默认</ElButton>
        <ElButton type="primary" @click="onSave">保存配置</ElButton>
      </div>
    </div>

    <!-- 受众 + 灰度 -->
    <ElCard shadow="never" class="pf-card">
      <template #header><div class="pf-card__title">作用对象与灰度</div></template>
      <ElForm label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="作用对象">
            <ElRadioGroup v-model="gray.audience">
              <ElRadioButton value="all">全部商家</ElRadioButton>
              <ElRadioButton value="factory">仅厂家</ElRadioButton>
              <ElRadioButton value="store">仅门店</ElRadioButton>
              <ElRadioButton value="specific">指定商户</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="灰度比例">
            <ElInputNumber v-model="gray.percent" :min="0" :max="100" :step="10" style="width: 160px" />
            <span class="text-xs text-g-500 ml-2">% 命中</span>
          </ElFormItem>
          <ElFormItem label="命中规则">
            <ElRadioGroup v-model="gray.rule">
              <ElRadioButton value="random">随机</ElRadioButton>
              <ElRadioButton value="whitelist">白名单</ElRadioButton>
              <ElRadioButton value="level">按等级</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="状态总览">
            <ElTag type="primary" size="large">已启用 {{ enabledCount }} / {{ totalCount }}</ElTag>
          </ElFormItem>
        </div>
      </ElForm>
    </ElCard>

    <!-- 首页快捷入口 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span><ArtSvgIcon icon="ri:apps-line" /> 首页快捷入口</span>
          <span class="text-xs text-g-500">{{ countOf('home_entry', true) }} / {{ countOf('home_entry') }}</span>
        </div>
      </template>
      <div class="pf-flag-grid">
        <div v-for="f in groupOf('home_entry')" :key="f.key" class="pf-flag">
          <div class="pf-flag__head">
            <span class="font-medium">{{ f.label }}</span>
            <ElTag v-if="f.badge" size="small" :type="badgeTypeOf(f.badge)">{{ f.badge }}</ElTag>
          </div>
          <ElSwitch v-model="f.defaultEnabled" />
        </div>
      </div>
    </ElCard>

    <!-- 商户角色入口按钮 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span><ArtSvgIcon icon="ri:user-settings-line" /> 商户角色入口</span>
          <span class="text-xs text-g-500">{{ countOf('role_button', true) }} / {{ countOf('role_button') }}</span>
        </div>
      </template>
      <div class="pf-flag-rows">
        <div v-for="f in groupOf('role_button')" :key="f.key" class="pf-flag-row">
          <div>
            <div class="font-medium">{{ f.label }}</div>
            <div v-if="f.badge" class="text-xs text-g-500 mt-1">{{ f.badge }}</div>
          </div>
          <ElSwitch v-model="f.defaultEnabled" />
        </div>
      </div>
    </ElCard>

    <!-- 侧边/二级菜单 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span><ArtSvgIcon icon="ri:menu-line" /> 侧边 / 二级菜单</span>
          <span class="text-xs text-g-500">{{ countOf('side_menu', true) }} / {{ countOf('side_menu') }}</span>
        </div>
      </template>
      <div class="pf-flag-rows">
        <div v-for="f in groupOf('side_menu')" :key="f.key" class="pf-flag-row">
          <span class="font-medium">{{ f.label }}</span>
          <ElSwitch v-model="f.defaultEnabled" />
        </div>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchFeatureFlags,
    fetchGrayscale,
    saveGrayscale,
    resetFeatureFlags,
    type GrayscaleConfig
  } from '@/api/platform-business'
  import type { FeatureFlag } from '@jiujiu/shared/types'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'PlatformFeatureFlag' })

  const flags = ref<FeatureFlag[]>([])
  const gray = ref<GrayscaleConfig>({ audience: 'all', percent: 30, rule: 'random' })

  function groupOf(g: FeatureFlag['group']) {
    return flags.value.filter((f) => f.group === g)
  }
  function countOf(g: FeatureFlag['group'], enabled?: boolean) {
    const list = groupOf(g)
    if (enabled) return list.filter((f) => f.defaultEnabled).length
    return list.length
  }
  const totalCount = computed(() => flags.value.length)
  const enabledCount = computed(() => flags.value.filter((f) => f.defaultEnabled).length)

  function badgeTypeOf(b: string) {
    if (b === '常开') return 'success'
    if (b === 'HOT') return 'danger'
    if (b.includes('厂家')) return 'warning'
    return 'info'
  }

  async function onSave() {
    await saveGrayscale(gray.value)
    ElMessage.success(`配置已保存：启用 ${enabledCount.value} 项 · 灰度 ${gray.value.percent}%`)
  }

  async function onReset() {
    await resetFeatureFlags()
    await load()
    ElMessage.success('已重置默认')
  }

  async function load() {
    flags.value = await fetchFeatureFlags()
    gray.value = await fetchGrayscale()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ff {
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;

    > span:first-child {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  .pf-flag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .pf-flag {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: #fafbfc;
    border-radius: 10px;
    gap: 8px;
  }

  .pf-flag__head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .pf-flag-rows {
    display: flex;
    flex-direction: column;
  }

  .pf-flag-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 4px;
    border-bottom: 1px dashed var(--art-border-color, #e5e7eb);

    &:last-child {
      border-bottom: none;
    }
  }

  .grid {
    display: grid;
  }
  .grid-cols-2 {
    grid-template-columns: 1fr 1fr;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }
  .gap-4 {
    gap: 16px;
  }
</style>
