<!-- 平台 PC · 选品广场推送（S5-T8）-->
<template>
  <div class="pf-plaza">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">选品广场</h2>
        <p class="mt-1 text-sm text-g-500">平台统一推送 · 厂家商品 → 门店代理</p>
      </div>
      <div class="flex gap-2">
        <ElInput
          v-model="keyword"
          placeholder="搜索商品 / 厂家"
          clearable
          style="width: 220px"
          :prefix-icon="Search"
        />
        <ElButton plain @click="batchMode = !batchMode">
          {{ batchMode ? '退出批量' : '批量推送' }}
        </ElButton>
        <ElButton
          type="primary"
          :icon="Plus"
          :disabled="batchMode && selectedIds.size === 0"
          @click="openPush"
        >
          {{ batchMode ? `推送 (${selectedIds.size})` : '快速推送' }}
        </ElButton>
      </div>
    </div>

    <!-- 3 KPI -->
    <div class="pf-kpi-row">
      <ElCard v-for="k in kpiCards" :key="k.key" shadow="hover" class="pf-kpi">
        <div class="pf-kpi__icon" :style="{ background: k.color + '18', color: k.color }">
          <ArtSvgIcon :icon="k.icon" />
        </div>
        <div>
          <div class="pf-kpi__num">{{ k.value }}</div>
          <div class="pf-kpi__label">{{ k.label }}</div>
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane label="推送商品" name="products" />
        <ElTabPane label="推送厂家" name="factories" />
        <ElTabPane label="推送记录" name="records" />
      </ElTabs>
    </ElCard>

    <!-- 商品 / 厂家 网格 -->
    <ElCard v-if="tab !== 'records'" shadow="never">
      <div class="pf-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="pf-item"
          :class="{ selected: selectedIds.has(item.id) }"
        >
          <ElCheckbox
            v-if="batchMode"
            :model-value="selectedIds.has(item.id)"
            @change="toggle(item.id)"
            class="pf-item__check"
          />
          <ElImage :src="item.image" fit="cover" class="pf-item__img" />
          <div class="pf-item__body">
            <div class="font-medium line-2">{{ item.name }}</div>
            <div class="text-xs text-g-500 mt-1">{{ item.factory }}</div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-primary font-semibold">¥{{ item.price }}</span>
              <ElTag v-if="item.tag" size="small" effect="plain">{{ item.tag }}</ElTag>
            </div>
            <div class="flex justify-between items-center mt-2 text-xs text-g-500">
              <span>代理 {{ item.agencyCount }} 家</span>
              <ElTag size="small" :type="statusTypeOf(item.status)">{{
                statusLabelOf(item.status)
              }}</ElTag>
            </div>
          </div>
          <div class="pf-item__actions">
            <ElButton v-if="item.status !== 'offline'" link type="primary" @click="pushOne(item)"
              >推送</ElButton
            >
            <ElButton v-else link type="success" @click="onlineOne(item)">上线</ElButton>
            <ElButton link type="danger" @click="offlineOne(item)">下架</ElButton>
          </div>
        </div>

        <ElEmpty
          v-if="filteredItems.length === 0"
          :description="tab === 'factories' ? '暂无相应厂家' : '暂无相应商品'"
        />
      </div>
    </ElCard>

    <!-- 推送记录 -->
    <ElCard v-else shadow="never">
      <ElTable
        :data="records"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn label="推送 ID" prop="id" width="200" />
        <ElTableColumn label="投放对象" width="140">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ targetLabelOf(row.audience) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="推送语" prop="pushText" min-width="220">
          <template #default="{ row }">
            <span v-if="row.pushText">{{ row.pushText }}</span>
            <span v-else class="text-g-500">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="pushStatusType(row.status)">{{
              pushStatusLabel(row.status)
            }}</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 推送 Drawer -->
    <ElDrawer v-model="pushOpen" :size="480" :with-header="false">
      <div class="pf-push">
        <div class="pf-push__head">
          <h3 class="m-0">推送商品</h3>
        </div>
        <ElAlert
          type="info"
          :title="`即将推送 ${pushForm.productIds.length} 件商品`"
          :closable="false"
          show-icon
        />
        <ElForm :model="pushForm" label-position="top">
          <ElFormItem label="投放对象">
            <ElRadioGroup v-model="pushForm.audience">
              <ElRadioButton value="all">全部商户</ElRadioButton>
              <ElRadioButton value="factory">仅厂家</ElRadioButton>
              <ElRadioButton value="store">仅门店</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="推送时段">
            <ElDatePicker
              v-model="pushDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="权重">
            <ElInputNumber
              v-model="pushForm.weight"
              :min="0"
              :max="100"
              :step="5"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="推送语">
            <ElInput
              v-model="pushForm.pushText"
              type="textarea"
              :rows="3"
              placeholder="可选 · 展示在商家端推送卡片上"
            />
          </ElFormItem>
        </ElForm>
        <div class="pf-push__footer">
          <ElButton @click="pushOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitPush" :loading="submitting">提交推送</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchPlatformPlaza,
    pushPlaza,
    setPlazaProductOnline,
    type PlazaItem,
    type PushPayload
  } from '@/api/platform-business'
  import type { PlazaPush } from '@jiujiu/shared/types'
  import { formatDateTime } from '@jiujiu/shared/utils'
  import { ElMessage } from 'element-plus'
  import { Search, Plus } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformPlaza' })

  const tab = ref<'products' | 'factories' | 'records'>('products')
  const keyword = ref('')
  const items = ref<PlazaItem[]>([])
  const records = ref<PlazaPush[]>([])
  const batchMode = ref(false)
  const selectedIds = ref(new Set<string>())
  const pushOpen = ref(false)
  const submitting = ref(false)

  /**
   * 当前推送表单。
   *
   * 字段含义对齐后端 PlazaPush schema：
   *   - targetType: 'product' / 'factory'，由当前 tab 决定
   *   - productIds / factoryIds: 二选一
   *   - audience: 投放对象（all/factory/store/customer）
   *   - positions: 推送位置（后端 String[] 字段）
   *   - tags: 推送标签
   *   - scheduledStart / scheduledEnd: 投放时段
   *   - weight: 权重
   *   - pushText: 推送语（来自旧 remark 字段，重命名以贴近后端）
   */
  const pushForm = reactive<PushPayload>({
    targetType: 'product',
    productIds: [],
    factoryIds: [],
    positions: [],
    tags: [],
    audience: 'all',
    scheduledStart: '',
    scheduledEnd: '',
    weight: 50,
    pushText: ''
  })
  const pushDateRange = ref<[string, string]>(['', ''])

  const filteredItems = computed(() => {
    if (!keyword.value) return items.value
    const kw = keyword.value.toLowerCase()
    return items.value.filter(
      (x) => x.name.toLowerCase().includes(kw) || (x.factory || '').toLowerCase().includes(kw)
    )
  })

  const kpiCards = computed(() => {
    const factories = new Set(items.value.map((x) => x.factory)).size
    const totalAgency = items.value.reduce((s, x) => s + x.agencyCount, 0)
    const pushing = items.value.filter((x) => x.status === 'pushing').length
    return [
      {
        key: 'pushing',
        icon: 'ri:rocket-line',
        label: '在推商品',
        value: pushing,
        color: '#FF4D2D'
      },
      {
        key: 'factories',
        icon: 'ri:building-line',
        label: '入驻厂家',
        value: factories,
        color: '#FF7A45'
      },
      {
        key: 'agency',
        icon: 'ri:share-line',
        label: '总代理数',
        value: totalAgency,
        color: '#10B981'
      }
    ]
  })

  function statusTypeOf(s: PlazaItem['status']) {
    return ({ pushing: 'success', pending: 'warning', offline: 'info' } as const)[s]
  }
  function statusLabelOf(s: PlazaItem['status']) {
    return ({ pushing: '在推', pending: '待上线', offline: '已下架' } as const)[s]
  }
  function targetLabelOf(t: string) {
    return (
      (
        { all: '全部商户', factory: '仅厂家', store: '仅门店', customer: '客户' } as Record<
          string,
          string
        >
      )[t] || t
    )
  }
  // PlazaPush.status 与商品 status 名称不同（draft/pending/active/offline/ended），
  // 单独建一组映射，不再复用商品的 statusType/statusLabel。
  function pushStatusType(s: string) {
    return (
      (
        {
          active: 'success',
          pending: 'warning',
          draft: 'info',
          offline: 'info',
          ended: 'info'
        } as Record<string, 'success' | 'warning' | 'info' | 'danger'>
      )[s] || 'info'
    )
  }
  function pushStatusLabel(s: string) {
    return (
      (
        {
          active: '推送中',
          pending: '待生效',
          draft: '草稿',
          offline: '已下线',
          ended: '已结束'
        } as Record<string, string>
      )[s] || s
    )
  }

  function toggle(id: string) {
    if (selectedIds.value.has(id)) selectedIds.value.delete(id)
    else selectedIds.value.add(id)
    selectedIds.value = new Set(selectedIds.value)
  }

  function pushOne(item: PlazaItem) {
    if (tab.value === 'factories') {
      pushForm.targetType = 'factory'
      pushForm.factoryIds = [item.id]
      pushForm.productIds = []
    } else {
      pushForm.targetType = 'product'
      pushForm.productIds = [item.id]
      pushForm.factoryIds = []
    }
    openPush()
  }

  function openPush() {
    const isFactory = tab.value === 'factories'
    pushForm.targetType = isFactory ? 'factory' : 'product'
    if (batchMode.value) {
      if (selectedIds.value.size === 0) {
        ElMessage.warning(isFactory ? '请先勾选厂家' : '请先勾选商品')
        return
      }
      const ids = Array.from(selectedIds.value)
      if (isFactory) {
        pushForm.factoryIds = ids
        pushForm.productIds = []
      } else {
        pushForm.productIds = ids
        pushForm.factoryIds = []
      }
    } else {
      const fallback = items.value.slice(0, 5).map((x) => x.id)
      const currentIds = isFactory ? pushForm.factoryIds : pushForm.productIds
      if (!currentIds || currentIds.length === 0) {
        if (isFactory) {
          pushForm.factoryIds = fallback
          pushForm.productIds = []
        } else {
          pushForm.productIds = fallback
          pushForm.factoryIds = []
        }
      }
    }
    const today = new Date().toISOString().slice(0, 10)
    const next7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    pushDateRange.value = [today, next7]
    pushOpen.value = true
  }

  async function submitPush() {
    submitting.value = true
    try {
      pushForm.scheduledStart = pushDateRange.value[0]
      pushForm.scheduledEnd = pushDateRange.value[1]
      await pushPlaza({ ...pushForm })
      // 后端 createPlazaPush 直接返回 PlazaPush 记录而非 pushedCount；
      // 不再假装显示数量，统一 toast「已创建推送任务」，避免 NaN 误导运营。
      ElMessage.success('已创建推送任务')
      pushOpen.value = false
      selectedIds.value = new Set()
      batchMode.value = false
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '推送失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  async function offlineOne(item: PlazaItem) {
    const original = item.status
    // 乐观更新：先翻转 UI，失败时回滚
    item.status = 'offline'
    try {
      const res = await setPlazaProductOnline(item.id, false)
      if (res?.status) item.status = res.status
      ElMessage.success('已下架')
    } catch (e: any) {
      item.status = original
      ElMessage.error(e?.message || '下架失败，请稍后重试')
    }
  }
  async function onlineOne(item: PlazaItem) {
    const original = item.status
    item.status = 'pushing'
    try {
      const res = await setPlazaProductOnline(item.id, true)
      if (res?.status) item.status = res.status
      ElMessage.success('已上线')
    } catch (e: any) {
      item.status = original
      ElMessage.error(e?.message || '上架失败，请稍后重试')
    }
  }

  /**
   * 按当前 tab 拉取列表 + 拉一次推送记录
   *
   * - products / factories: 写入 items，网格展示
   * - records: 写入 records，表格展示
   *
   * tab 切换时也走这里，确保「推送厂家」标签切换后真的调 /p/plaza/factories
   * 而不是停留在商品数据上。
   */
  async function load() {
    if (tab.value === 'products' || tab.value === 'factories') {
      items.value = (await fetchPlatformPlaza(tab.value)) as PlazaItem[]
    }
    // 推送记录与商品/厂家是独立维度，每次重载顺带刷一次
    records.value = (await fetchPlatformPlaza('records')) as PlazaPush[]
  }

  // 切换 tab 时清空批量勾选并重新拉取
  watch(tab, () => {
    selectedIds.value = new Set()
    batchMode.value = false
    load()
  })

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-plaza {
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

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .text-g-500 {
    color: #6b7280;
  }

  .line-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  .pf-kpi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;

    @media (width <= 900px) {
      grid-template-columns: 1fr;
    }
  }

  .pf-kpi {
    border-radius: 12px;

    :deep(.el-card__body) {
      display: flex;
      gap: 14px;
      align-items: center;
      padding: 16px 18px;
    }
  }

  .pf-kpi__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 22px;
    border-radius: 12px;
  }

  .pf-kpi__num {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--art-gray-800, #1f2937);
  }

  .pf-kpi__label {
    margin-top: 4px;
    font-size: 12px;
    color: #6b7280;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }

  .pf-item {
    position: relative;
    overflow: hidden;
    background: #fff;
    border: 1px solid var(--art-border-color, #e5e7eb);
    border-radius: 12px;
    transition: all 0.18s;

    &:hover {
      border-color: var(--el-color-primary, #ff4d2d);
      box-shadow: 0 8px 24px -10px rgb(255 77 45 / 25%);
      transform: translateY(-2px);
    }

    &.selected {
      background: rgb(255 77 45 / 4%);
      border-color: var(--el-color-primary, #ff4d2d);
    }
  }

  .pf-item__check {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;
    padding: 4px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgb(0 0 0 / 12%);
  }

  .pf-item__img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
  }

  .pf-item__body {
    padding: 12px;
  }

  .pf-item__actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    padding: 6px 12px 12px;
    margin-top: 6px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  .pf-push {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 22px;
  }

  .pf-push__footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: auto;
  }
</style>
