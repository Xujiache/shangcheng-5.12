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

    <!-- 受众 + 灰度（单条编辑：select 选 key → 加载该 key 的灰度 → 编辑保存） -->
    <ElCard shadow="never" class="pf-card">
      <template #header><div class="pf-card__title">作用对象与灰度</div></template>
      <ElForm label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="选择要编辑的开关">
            <ElSelect
              v-model="currentGrayKey"
              placeholder="选择 FeatureFlag key"
              filterable
              style="width: 100%"
              @change="onSelectKey"
            >
              <ElOption
                v-for="g in grayList"
                :key="g.key"
                :label="`${g.label || g.key}  ·  ${g.grayPercent}%`"
                :value="g.key"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="状态总览">
            <ElTag type="primary" size="large">已启用 {{ enabledCount }} / {{ totalCount }}</ElTag>
            <ElTag class="ml-2" type="info" size="large">灰度记录 {{ grayList.length }} 条</ElTag>
          </ElFormItem>
          <ElFormItem label="作用对象">
            <ElRadioGroup v-model="currentGray.audience" :disabled="!currentGrayKey">
              <ElRadioButton value="all">全部商家</ElRadioButton>
              <ElRadioButton value="factory">仅厂家</ElRadioButton>
              <ElRadioButton value="store">仅门店</ElRadioButton>
              <ElRadioButton value="specific">指定商户</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="灰度比例">
            <ElInputNumber
              v-model="currentGray.grayPercent"
              :min="0"
              :max="100"
              :step="10"
              :disabled="!currentGrayKey"
              style="width: 160px"
            />
            <span class="text-xs text-g-500 ml-2">% 命中</span>
          </ElFormItem>
          <ElFormItem label="白名单 merchantId">
            <ElInput
              :model-value="currentGray.grayWhitelist.join('\n')"
              type="textarea"
              :rows="3"
              :disabled="!currentGrayKey"
              placeholder="每行一个 merchantId，留空表示无白名单"
              @update:model-value="onWhitelistInput"
            />
          </ElFormItem>
          <ElFormItem label="定时生效（可选）">
            <ElInput
              v-model="scheduledAtInput"
              :disabled="!currentGrayKey"
              placeholder="ISO 时间字符串，如 2026-06-01T00:00:00Z"
            />
          </ElFormItem>
        </div>
      </ElForm>
    </ElCard>

    <!-- 首页快捷入口 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span><ArtSvgIcon icon="ri:apps-line" /> 首页快捷入口</span>
          <span class="text-xs text-g-500"
            >{{ countOf('home_entry', true) }} / {{ countOf('home_entry') }}</span
          >
        </div>
      </template>
      <div class="pf-flag-grid">
        <div v-for="f in groupOf('home_entry')" :key="f.key" class="pf-flag">
          <div class="pf-flag__head">
            <span class="font-medium">{{ f.label }}</span>
            <ElTag v-if="f.badge" size="small" :type="badgeTypeOf(f.badge)">{{ f.badge }}</ElTag>
          </div>
          <ElSwitch
            v-model="f.defaultEnabled"
            :loading="togglingKeys.has(f.id)"
            @change="(v) => onToggle(f, v as boolean)"
          />
        </div>
      </div>
    </ElCard>

    <!-- 商户角色入口按钮 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span><ArtSvgIcon icon="ri:user-settings-line" /> 商户角色入口</span>
          <span class="text-xs text-g-500"
            >{{ countOf('role_button', true) }} / {{ countOf('role_button') }}</span
          >
        </div>
      </template>
      <div class="pf-flag-rows">
        <div v-for="f in groupOf('role_button')" :key="f.key" class="pf-flag-row">
          <div>
            <div class="font-medium">{{ f.label }}</div>
            <div v-if="f.badge" class="text-xs text-g-500 mt-1">{{ f.badge }}</div>
          </div>
          <ElSwitch
            v-model="f.defaultEnabled"
            :loading="togglingKeys.has(f.id)"
            @change="(v) => onToggle(f, v as boolean)"
          />
        </div>
      </div>
    </ElCard>

    <!-- 侧边/二级菜单 -->
    <ElCard shadow="never" class="pf-card">
      <template #header>
        <div class="pf-card__title">
          <span><ArtSvgIcon icon="ri:menu-line" /> 侧边 / 二级菜单</span>
          <span class="text-xs text-g-500"
            >{{ countOf('side_menu', true) }} / {{ countOf('side_menu') }}</span
          >
        </div>
      </template>
      <div class="pf-flag-rows">
        <div v-for="f in groupOf('side_menu')" :key="f.key" class="pf-flag-row">
          <span class="font-medium">{{ f.label }}</span>
          <ElSwitch
            v-model="f.defaultEnabled"
            :loading="togglingKeys.has(f.id)"
            @change="(v) => onToggle(f, v as boolean)"
          />
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
    toggleFeatureFlag,
    type GrayscaleConfig
  } from '@/api/platform-business'
  import type { FeatureFlag } from '@jiujiu/shared/types'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'PlatformFeatureFlag' })

  const flags = ref<FeatureFlag[]>([])
  // 灰度列表：后端 GET /p/feature-flags/gray 返回数组，每条对应一个 key 的灰度
  const grayList = ref<GrayscaleConfig[]>([])
  const currentGrayKey = ref<string>('')
  // 编辑中的灰度对象（绑定到表单）。currentGrayKey 为空时为占位空对象，
  // 表单 :disabled 防止误操作。
  const EMPTY_GRAY: GrayscaleConfig = {
    key: '',
    audience: 'all',
    grayPercent: 100,
    grayWhitelist: [],
    scheduledAt: null
  }
  const currentGray = reactive<GrayscaleConfig>({ ...EMPTY_GRAY })
  const scheduledAtInput = ref<string>('')
  const togglingKeys = reactive(new Set<string>())

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

  // ElSwitch v-model 已经把 flag.defaultEnabled 改成 next 值，
  // 这里把 next 透传给后端；失败时回滚本地状态并给用户提示。
  async function onToggle(flag: FeatureFlag, next: boolean) {
    togglingKeys.add(flag.id)
    try {
      await toggleFeatureFlag(flag.id, next)
      ElMessage.success(`${flag.label} 已${next ? '启用' : '停用'}`)
    } catch (e: any) {
      flag.defaultEnabled = !next
      ElMessage.error(`切换失败：${e?.message || '请重试'}`)
    } finally {
      togglingKeys.delete(flag.id)
    }
  }

  function onSelectKey(key: string) {
    const found = grayList.value.find((g) => g.key === key)
    if (!found) {
      Object.assign(currentGray, EMPTY_GRAY)
      scheduledAtInput.value = ''
      return
    }
    Object.assign(currentGray, {
      key: found.key,
      label: found.label,
      audience: found.audience || 'all',
      grayPercent: typeof found.grayPercent === 'number' ? found.grayPercent : 100,
      grayWhitelist: Array.isArray(found.grayWhitelist) ? [...found.grayWhitelist] : [],
      scheduledAt: found.scheduledAt ?? null
    })
    scheduledAtInput.value = found.scheduledAt ? new Date(found.scheduledAt).toISOString() : ''
  }

  function onWhitelistInput(v: string | number) {
    currentGray.grayWhitelist = String(v)
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
  }

  async function onSave() {
    if (!currentGrayKey.value || !currentGray.key) {
      ElMessage.warning('请先选择要编辑的开关 key')
      return
    }
    const cfg: GrayscaleConfig = {
      key: currentGray.key,
      audience: currentGray.audience,
      grayPercent: currentGray.grayPercent,
      grayWhitelist: currentGray.grayWhitelist,
      scheduledAt: scheduledAtInput.value ? scheduledAtInput.value : null
    }
    await saveGrayscale(cfg)
    // 保存后同步本地列表，避免再次切换时数据回滚
    const idx = grayList.value.findIndex((g) => g.key === cfg.key)
    if (idx >= 0) grayList.value[idx] = { ...grayList.value[idx], ...cfg }
    ElMessage.success(`已保存：${cfg.key} · 灰度 ${cfg.grayPercent}%`)
  }

  async function onReset() {
    await resetFeatureFlags()
    await load()
    ElMessage.success('已重置默认')
  }

  async function load() {
    flags.value = await fetchFeatureFlags()
    grayList.value = await fetchGrayscale()
    // 默认选中第一条灰度记录便于即时编辑
    if (grayList.value.length && !currentGrayKey.value) {
      currentGrayKey.value = grayList.value[0].key
      onSelectKey(currentGrayKey.value)
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ff {
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;

    > span:first-child {
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }
  }

  .pf-flag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .pf-flag {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: #fafbfc;
    border-radius: 10px;
  }

  .pf-flag__head {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
  }

  .pf-flag-rows {
    display: flex;
    flex-direction: column;
  }

  .pf-flag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

    @media (width <= 900px) {
      grid-template-columns: 1fr;
    }
  }

  .gap-4 {
    gap: 16px;
  }
</style>
