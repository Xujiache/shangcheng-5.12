<template>
  <div class="metal-page">
    <header class="metal-head">
      <div><h2>金属参考价</h2><p>统一维护小程序 65 种材质的参考吨价与密度</p></div>
      <div class="metal-actions"><ElButton @click="load">刷新</ElButton><ElButton type="primary" :loading="saving" :disabled="!config" @click="save">保存修改</ElButton></div>
    </header>
    <ElAlert title="价格仅供估算，前台会标注参考价格；修改后请核对最新采购报价。" type="info" :closable="false" show-icon />
    <div v-if="config" class="metal-stats">
      <div><strong>{{ config.materials.length }}</strong><span>材质总数</span></div>
      <div><strong>{{ liveCount }}</strong><span>标记为实时</span></div>
      <div><strong>{{ config.materials.length - liveCount }}</strong><span>估算价</span></div>
      <div><strong class="metal-date">{{ config.updatedAt ? config.updatedAt.slice(0, 16).replace('T', ' ') : '尚未保存' }}</strong><span>最近更新</span></div>
    </div>
    <ElCard v-loading="loading" shadow="never">
      <div class="metal-toolbar">
        <ElInput v-model="keyword" clearable placeholder="搜索材质、牌号或 ID" style="width: 260px" />
        <ElSelect v-model="category" style="width: 160px"><ElOption label="全部类别" value="" /><ElOption v-for="item in categories" :key="item" :label="item" :value="item" /></ElSelect>
        <span class="metal-spacer" />
        <ElInputNumber v-model="batchPrice" :min="0" :max="10000000" :precision="0" placeholder="批量吨价" style="width: 170px" />
        <ElButton :disabled="!selected.length || batchPrice === null" @click="applyBatch">应用到选中 {{ selected.length }} 项</ElButton>
        <ElButton :disabled="!config" @click="save">全部标记为已更新</ElButton>
      </div>
      <ElTable v-if="config" :data="filtered" stripe max-height="640" @selection-change="onSelection">
        <ElTableColumn type="selection" width="48" />
        <ElTableColumn prop="id" label="材质 ID" min-width="190" />
        <ElTableColumn prop="category" label="类别" width="115" />
        <ElTableColumn prop="group" label="材料" width="115" />
        <ElTableColumn prop="label" label="牌号" min-width="150" />
        <ElTableColumn label="密度 g/cm³" width="165"><template #default="{ row }"><ElInputNumber v-model="config.densities[row.id]" :min="0.01" :max="30" :precision="3" :step="0.01" controls-position="right" style="width: 130px" /></template></ElTableColumn>
        <ElTableColumn label="参考吨价 元/吨" width="200"><template #default="{ row }"><ElInputNumber v-model="config.prices[row.id]" :min="0" :max="10000000" :precision="0" :step="100" controls-position="right" style="width: 165px" /></template></ElTableColumn>
        <ElTableColumn label="价格模式" width="145"><template #default="{ row }"><ElSelect v-model="config.priceMode[row.id]" style="width: 110px"><ElOption label="已更新" value="live" /><ElOption label="估算" value="estimate" /></ElSelect></template></ElTableColumn>
        <ElTableColumn label="操作" width="105"><template #default="{ row }"><ElButton link type="primary" @click="reset(row)">恢复种子价</ElButton></template></ElTableColumn>
      </ElTable>
      <ElEmpty v-else-if="!loading" description="配置加载失败，请刷新重试" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { fetchLedgerMetalConfig, updateLedgerMetalConfig, type LedgerMetalConfig, type MetalMaterialConfig } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerMetal' })
  const config = ref<LedgerMetalConfig | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const keyword = ref('')
  const category = ref('')
  const batchPrice = ref<number | null>(null)
  const selected = ref<MetalMaterialConfig[]>([])
  const categories = computed(() => [...new Set(config.value?.materials.map((item) => item.category) || [])])
  const filtered = computed(() => config.value?.materials.filter((item) =>
    (!category.value || item.category === category.value) &&
    (!keyword.value || `${item.id} ${item.group} ${item.label}`.toLowerCase().includes(keyword.value.trim().toLowerCase()))
  ) || [])
  const liveCount = computed(() => config.value?.materials.filter((item) => config.value?.priceMode[item.id] === 'live').length || 0)

  async function load() {
    loading.value = true
    try { config.value = await fetchLedgerMetalConfig() }
    catch (error: any) { config.value = null; ElMessage.error(error?.message || '加载金属价格失败') }
    finally { loading.value = false }
  }
  function onSelection(rows: MetalMaterialConfig[]) { selected.value = rows }
  function applyBatch() {
    if (!config.value || batchPrice.value === null) return
    for (const item of selected.value) config.value.prices[item.id] = batchPrice.value
    ElMessage.success(`已修改 ${selected.value.length} 项，请保存`)
  }
  function reset(item: MetalMaterialConfig) {
    if (!config.value) return
    config.value.prices[item.id] = item.seedTonPriceYuan
    config.value.densities[item.id] = item.density
    config.value.priceMode[item.id] = item.priceMode
  }
  async function save() {
    if (!config.value) return
    saving.value = true
    try { await updateLedgerMetalConfig(config.value); ElMessage.success('金属配置已保存'); await load() }
    catch (error: any) { ElMessage.error(error?.message || '保存失败') }
    finally { saving.value = false }
  }
  onMounted(load)
</script>

<style scoped>
  .metal-page { display: grid; gap: 16px; padding: 20px; }
  .metal-head, .metal-toolbar { display: flex; align-items: center; gap: 12px; }
  .metal-head { justify-content: space-between; }
  .metal-head h2 { margin: 0; font-size: 22px; color: #172321; }
  .metal-head p { margin: 5px 0 0; color: #73807d; font-size: 13px; }
  .metal-actions { display: flex; gap: 8px; }
  .metal-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .metal-stats > div { display: grid; gap: 7px; padding: 18px 20px; background: #fff; border: 1px solid #edf0ef; border-radius: 12px; }
  .metal-stats strong { font-size: 25px; color: #176c59; }
  .metal-stats span { font-size: 12px; color: #7b8783; }
  .metal-stats .metal-date { font-size: 17px; }
  .metal-toolbar { margin-bottom: 15px; flex-wrap: wrap; }
  .metal-spacer { flex: 1; }
</style>
