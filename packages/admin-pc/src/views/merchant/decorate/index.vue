<!-- 商家 PC · 店铺装修（S3.5-T6）-->
<template>
  <div class="mp-decorate">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">店铺装修</h2>
        <p class="mt-1 text-sm text-g-500">配置移动端首页模块 · 实时预览</p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="RefreshLeft" @click="resetTemplate" plain>重置</ElButton>
        <ElButton type="primary" :icon="Check" @click="onSave">保存</ElButton>
      </div>
    </div>

    <!-- 全局样式 -->
    <ElCard shadow="never" class="mp-style-bar">
      <div class="mp-style-row">
        <div class="mp-style-group">
          <span class="mp-style-label">主题色</span>
          <div class="mp-color-list">
            <div
              v-for="c in THEME_COLORS"
              :key="c.value"
              class="mp-color"
              :class="{ active: style.themeColor === c.value }"
              :style="{ background: c.value }"
              :title="c.label"
              @click="style.themeColor = c.value"
            />
          </div>
        </div>
        <div class="mp-style-group">
          <span class="mp-style-label">字体风格</span>
          <ElRadioGroup v-model="style.fontFamily" size="small">
            <ElRadioButton value="system">系统</ElRadioButton>
            <ElRadioButton value="rounded">圆体</ElRadioButton>
            <ElRadioButton value="serif">衬线</ElRadioButton>
          </ElRadioGroup>
        </div>
        <div class="mp-style-group">
          <span class="mp-style-label">圆角风格</span>
          <ElRadioGroup v-model="style.cornerStyle" size="small">
            <ElRadioButton value="sharp">直角</ElRadioButton>
            <ElRadioButton value="soft">轻圆</ElRadioButton>
            <ElRadioButton value="round">大圆</ElRadioButton>
          </ElRadioGroup>
        </div>
      </div>
    </ElCard>

    <div class="mp-decorate__layout">
      <!-- 左：模块列表 -->
      <ElCard shadow="never" class="mp-decorate__left">
        <template #header>
          <span class="font-semibold">模块列表</span>
        </template>
        <div class="mp-modules">
          <div
            v-for="(m, i) in modules"
            :key="m.id"
            class="mp-module"
            :class="{ active: selected?.id === m.id }"
            @click="selectModule(m)"
          >
            <ArtSvgIcon :icon="iconOf(m.type)" class="mp-module__icon" />
            <span class="mp-module__title">{{ m.title }}</span>
            <div class="mp-module__ops" @click.stop>
              <ElButton text :icon="Top" size="small" :disabled="i === 0" @click="move(i, -1)" />
              <ElButton text :icon="Bottom" size="small" :disabled="i === modules.length - 1" @click="move(i, 1)" />
              <ElSwitch v-model="m.visible" size="small" />
            </div>
          </div>
        </div>
        <ElDivider />
        <div class="mp-add-module">
          <ElSelect v-model="addType" placeholder="添加模块" style="width: 100%" @change="addModule">
            <ElOption v-for="t in MODULE_TYPES" :key="t.value" :value="t.value" :label="t.label">
              <ArtSvgIcon :icon="t.icon" /> {{ t.label }}
            </ElOption>
          </ElSelect>
        </div>
      </ElCard>

      <!-- 中：预览 -->
      <div class="mp-decorate__preview">
        <div class="mp-phone" :style="phoneStyleVars" :class="[`font-${style.fontFamily}`, `corner-${style.cornerStyle}`]">
          <div class="mp-phone__head">
            <div class="mp-phone__name">经纬科技</div>
            <ArtSvgIcon icon="ri:search-line" class="text-base" :style="{ color: style.themeColor }" />
          </div>
          <div class="mp-phone__body">
            <div v-for="m in visibleModules" :key="m.id" class="mp-preview-block">
              <div class="mp-preview-block__head">
                <ArtSvgIcon :icon="iconOf(m.type)" class="text-sm" />
                {{ m.title }}
              </div>
              <div class="mp-preview-block__body" :class="`type-${m.type}`">
                <!-- Banner -->
                <template v-if="m.type === 'banner'">
                  <div class="placeholder-banner">轮播图</div>
                </template>
                <!-- Category -->
                <template v-else-if="m.type === 'category'">
                  <div class="placeholder-cat">
                    <div v-for="i in 5" :key="i">分类{{ i }}</div>
                  </div>
                </template>
                <!-- Coupon -->
                <template v-else-if="m.type === 'coupon'">
                  <div class="placeholder-coupon">领券中心 · 满 99-20 / 满 299-50</div>
                </template>
                <!-- Hot / New / Product-list -->
                <template v-else-if="m.type === 'hot' || m.type === 'new' || m.type === 'product-list'">
                  <div class="placeholder-grid">
                    <div v-for="i in 4" :key="i" class="placeholder-card">商品{{ i }}</div>
                  </div>
                </template>
                <!-- Video -->
                <template v-else-if="m.type === 'video'">
                  <div class="placeholder-video">▶ 视频展示</div>
                </template>
                <!-- Rich text -->
                <template v-else-if="m.type === 'rich-text'">
                  <div class="placeholder-rich">富文本区</div>
                </template>
              </div>
            </div>
            <div v-if="visibleModules.length === 0" class="mp-empty">
              <ElEmpty description="暂无可见模块，请在左侧添加或启用" />
            </div>
          </div>
          <div class="mp-phone__tabbar">
            <span>首页</span><span>分类</span><span>购物车</span><span>我的</span>
          </div>
        </div>
      </div>

      <!-- 右：属性 -->
      <ElCard shadow="never" class="mp-decorate__right">
        <template #header>
          <span class="font-semibold">{{ selected ? '模块属性' : '请选择模块' }}</span>
        </template>
        <div v-if="selected">
          <ElForm label-position="top">
            <ElFormItem label="模块标题">
              <ElInput v-model="selected.title" />
            </ElFormItem>
            <ElFormItem label="是否显示">
              <ElSwitch v-model="selected.visible" />
            </ElFormItem>
            <ElFormItem v-if="selected.type === 'banner'" label="Banner 高度">
              <ElInputNumber v-model="(selected.config as any).height" :min="200" :max="600" :step="20" />
            </ElFormItem>
            <ElFormItem v-if="selected.type === 'category'" label="分类列数">
              <ElInputNumber v-model="(selected.config as any).columns" :min="3" :max="6" />
            </ElFormItem>
            <ElFormItem
              v-if="['hot', 'new', 'product-list'].includes(selected.type)"
              label="商品数量"
            >
              <ElInputNumber v-model="(selected.config as any).limit" :min="2" :max="12" :step="2" />
            </ElFormItem>
            <ElDivider />
            <ElButton text type="danger" @click="removeModule(selected)" :disabled="modules.length <= 1">
              删除该模块
            </ElButton>
          </ElForm>
        </div>
        <ElEmpty v-else description="点击中间预览或左侧模块" :image-size="60" />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchDecorate,
    saveDecorate,
    consumeQuota,
    type DecorateModule
  } from '@/api/merchant-business'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Bottom, Check, RefreshLeft, Top } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantDecorate' })

  const MODULE_TYPES: { value: DecorateModule['type']; label: string; icon: string; defaultConfig: Record<string, unknown> }[] = [
    { value: 'banner', label: '轮播图', icon: 'ri:image-line', defaultConfig: { height: 360 } },
    { value: 'category', label: '分类导航', icon: 'ri:apps-2-line', defaultConfig: { columns: 5 } },
    { value: 'coupon', label: '优惠券', icon: 'ri:coupon-3-line', defaultConfig: { autoLoad: true } },
    { value: 'hot', label: '热销爆款', icon: 'ri:fire-line', defaultConfig: { limit: 6 } },
    { value: 'new', label: '新品上架', icon: 'ri:newspaper-line', defaultConfig: { limit: 6 } },
    { value: 'product-list', label: '商品列表', icon: 'ri:list-check-2', defaultConfig: { limit: 8 } },
    { value: 'video', label: '视频', icon: 'ri:play-circle-line', defaultConfig: {} },
    { value: 'rich-text', label: '富文本', icon: 'ri:font-color', defaultConfig: {} }
  ]

  const THEME_COLORS = [
    { value: '#FF4D2D', label: '热情橙（默认）' },
    { value: '#0EA5E9', label: '清新蓝' },
    { value: '#10B981', label: '自然绿' },
    { value: '#A855F7', label: '高雅紫' },
    { value: '#1F2937', label: '极简黑' },
    { value: '#F59E0B', label: '阳光金' }
  ]

  const style = reactive({
    themeColor: '#FF4D2D',
    fontFamily: 'system' as 'system' | 'rounded' | 'serif',
    cornerStyle: 'soft' as 'sharp' | 'soft' | 'round'
  })

  const phoneStyleVars = computed(() => ({
    '--mp-theme': style.themeColor
  }))

  const modules = ref<DecorateModule[]>([])
  const selected = ref<DecorateModule | null>(null)
  const addType = ref<DecorateModule['type']>()

  const visibleModules = computed(() => modules.value.filter((m) => m.visible))

  function iconOf(t: DecorateModule['type']) {
    return MODULE_TYPES.find((m) => m.value === t)?.icon || 'ri:question-line'
  }

  function selectModule(m: DecorateModule) {
    selected.value = m
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= modules.value.length) return
    ;[modules.value[i], modules.value[j]] = [modules.value[j], modules.value[i]]
  }

  async function addModule(t: DecorateModule['type']) {
    const type = MODULE_TYPES.find((x) => x.value === t)!
    // Banner 配额联动：店铺装修加 Banner 占用 1 个 Banner 配额
    if (t === 'banner') {
      const res = await consumeQuota('bannerLimit', 1)
      if (!res.ok) {
        ElMessage.warning(res.reason || 'Banner 配额不足，请升级套餐')
        addType.value = undefined
        return
      }
    }
    const m: DecorateModule = {
      id: 'm-' + Date.now(),
      type: t,
      title: type.label,
      visible: true,
      config: { ...type.defaultConfig }
    }
    modules.value.push(m)
    selected.value = m
    addType.value = undefined
    if (t === 'banner') {
      ElMessage.success(`已添加 Banner ${res.quota ? `· 已用 ${res.quota.used.bannerLimit}/${res.quota.limits.bannerLimit}` : ''}`)
    }
  }

  function removeModule(m: DecorateModule) {
    if (modules.value.length <= 1) {
      ElMessage.warning('至少保留 1 个模块')
      return
    }
    ElMessageBox.confirm(`删除「${m.title}」？`, '确认', { type: 'warning' })
      .then(() => {
        modules.value = modules.value.filter((x) => x.id !== m.id)
        selected.value = null
        ElMessage.success('已删除')
      })
      .catch(() => {})
  }

  async function resetTemplate() {
    try {
      await ElMessageBox.confirm('重置为默认模板？当前修改将丢失。', '确认', { type: 'warning' })
      modules.value = await fetchDecorate()
      selected.value = null
      ElMessage.success('已重置为默认模板')
    } catch {
      /* cancel */
    }
  }

  const STYLE_KEY = 'jj_decorate_style_v1'

  async function onSave() {
    await saveDecorate(modules.value)
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(style))
    } catch {
      /* ignore quota */
    }
    ElMessage.success('已保存 · 主题色 / 字体 / 模块全部同步到 user 端')
  }

  function loadStyle() {
    try {
      const raw = localStorage.getItem(STYLE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.themeColor) style.themeColor = s.themeColor
        if (s.fontFamily) style.fontFamily = s.fontFamily
        if (s.cornerStyle) style.cornerStyle = s.cornerStyle
      }
    } catch {
      /* ignore */
    }
  }

  onMounted(async () => {
    loadStyle()
    modules.value = await fetchDecorate()
    if (modules.value.length) selected.value = modules.value[0]
  })
</script>

<style scoped lang="scss">
  .mp-decorate {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: calc(100vh - 100px);
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mp-decorate__layout {
    flex: 1;
    display: grid;
    grid-template-columns: 320px 1fr 300px;
    gap: 14px;
    min-height: 0;

    @media (max-width: 1280px) {
      grid-template-columns: 280px 1fr 280px;
    }
  }

  .mp-decorate__left,
  .mp-decorate__right {
    border-radius: 12px;
    height: 100%;
    overflow: hidden;

    :deep(.el-card__body) {
      max-height: calc(100% - 60px);
      overflow-y: auto;
    }
  }

  .mp-modules {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mp-module {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: var(--art-bg-color, #fafbfc);
    }

    &.active {
      background: rgba(255, 77, 45, 0.08);
      color: var(--el-color-primary, #ff4d2d);
    }
  }

  .mp-module__icon {
    font-size: 16px;
  }

  .mp-module__title {
    flex: 1;
    font-size: 13px;
  }

  .mp-module__ops {
    display: none;
    gap: 4px;
    align-items: center;
  }

  .mp-module:hover .mp-module__ops,
  .mp-module.active .mp-module__ops {
    display: flex;
  }

  .mp-add-module {
    padding-top: 6px;
  }

  /* 中间手机预览 */
  .mp-decorate__preview {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 12px 0;
  }

  .mp-phone {
    width: 375px;
    min-height: 700px;
    background: #fff;
    border: 12px solid #1f2937;
    border-radius: 38px;
    box-shadow: 0 12px 36px -8px rgba(0, 0, 0, 0.18);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: all 0.25s ease;

    &.font-rounded {
      font-family: 'PingFang SC', 'HarmonyOS Sans', -apple-system, sans-serif;
      letter-spacing: 0.3px;
    }

    &.font-serif {
      font-family: 'Source Han Serif', '宋体', Songti, serif;
    }

    &.corner-sharp .mp-preview-block {
      border-radius: 0 !important;
    }
    &.corner-soft .mp-preview-block {
      border-radius: 8px;
    }
    &.corner-round .mp-preview-block {
      border-radius: 18px;
    }
  }

  .mp-phone__head {
    height: 44px;
    background: var(--mp-theme, #ff4d2d);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 500;
  }

  /* 全局样式条 */
  .mp-style-bar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 14px 18px;
    }
  }

  .mp-style-row {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: center;
  }

  .mp-style-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mp-style-label {
    font-size: 13px;
    color: var(--art-gray-700, #374151);
    font-weight: 500;
  }

  .mp-color-list {
    display: flex;
    gap: 8px;
  }

  .mp-color {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px var(--art-border-color, #e5e7eb);
    transition: all 0.15s;

    &:hover {
      transform: scale(1.1);
    }

    &.active {
      box-shadow:
        0 0 0 2px #fff,
        0 0 0 4px currentColor;
    }
  }

  .mp-phone__body {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    background: #f7f8fa;
  }

  .mp-phone__tabbar {
    height: 50px;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    text-align: center;
    line-height: 50px;
    font-size: 12px;
    color: #6b7280;
  }

  .mp-preview-block {
    background: #fff;
    border: 1px dashed #e5e7eb;
    border-radius: 6px;
    margin-bottom: 8px;
    overflow: hidden;
  }

  .mp-preview-block__head {
    padding: 6px 10px;
    font-size: 11px;
    color: #9ca3af;
    background: #fafbfc;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mp-preview-block__body {
    padding: 8px 10px;
  }

  .placeholder-banner {
    height: 100px;
    background: linear-gradient(135deg, #ff7a45, #ff4d2d);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
  }

  .placeholder-cat {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    text-align: center;
    font-size: 10px;
    color: #6b7280;

    & > div {
      padding: 6px 0;
      background: #fafbfc;
      border-radius: 4px;
    }
  }

  .placeholder-coupon {
    padding: 10px;
    background: linear-gradient(90deg, #fef2f2, #fff7ed);
    border-radius: 6px;
    font-size: 11px;
    color: #ff4d2d;
    text-align: center;
  }

  .placeholder-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .placeholder-card {
    background: #fafbfc;
    border-radius: 6px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #9ca3af;
  }

  .placeholder-video,
  .placeholder-rich {
    height: 70px;
    background: #f1f5f9;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    font-size: 12px;
  }

  .mp-empty {
    padding-top: 80px;
  }
</style>
