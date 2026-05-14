<!-- 平台 PC · 广告管理（S5-T7）-->
<template>
  <div class="pf-ad">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">广告管理</h2>
        <p class="mt-1 text-sm text-g-500">广告位 · 创意 · 投放数据</p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Plus" type="primary" @click="onCreate">新建广告</ElButton>
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <!-- 4 KPI -->
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
        <ElTabPane label="广告位" name="slots" />
        <ElTabPane label="创意" name="creatives" />
        <ElTabPane label="数据" name="stats" />
      </ElTabs>
    </ElCard>

    <!-- 广告位 -->
    <div v-if="tab === 'slots'" class="pf-cards">
      <ElCard v-for="s in slots" :key="s.id" shadow="hover" class="pf-slot">
        <div class="pf-slot__head">
          <div>
            <h3 class="m-0 text-base font-semibold">{{ s.name }}</h3>
            <div class="text-xs text-g-500 mt-1">投放对象 · {{ targetLabelOf(s.target) }}</div>
          </div>
          <ElTag :type="statusTypeOf(s.status)" size="small">{{ statusLabelOf(s.status) }}</ElTag>
        </div>
        <ElImage :src="s.preview" fit="cover" class="pf-slot__preview" />
        <div class="pf-slot__stats">
          <div
            ><b>{{ formatWan(s.impressions) }}</b
            ><span>曝光</span></div
          >
          <div
            ><b>{{ formatWan(Math.round((s.impressions * s.ctr) / 100)) }}</b
            ><span>点击</span></div
          >
          <div
            ><b>{{ s.ctr }}%</b><span>CTR</span></div
          >
          <div
            ><b>{{ s.creativeCount }}</b
            ><span>创意</span></div
          >
        </div>
        <div class="pf-slot__actions">
          <ElButton plain @click="viewStats(s)">查看数据</ElButton>
          <ElDropdown trigger="click" @command="(cmd) => onEdit(s, cmd)">
            <ElButton type="primary" plain
              >编辑 <ArtSvgIcon icon="ri:arrow-down-s-line"
            /></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="upload">上传新创意</ElDropdownItem>
                <ElDropdownItem command="target">修改投放目标</ElDropdownItem>
                <ElDropdownItem command="time">修改时段</ElDropdownItem>
                <ElDropdownItem command="pause">{{
                  s.status === 'paused' ? '恢复投放' : '暂停投放'
                }}</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </ElCard>
    </div>

    <!-- 创意 -->
    <ElCard v-else-if="tab === 'creatives'" shadow="never">
      <ElTable
        :data="creatives"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
      >
        <ElTableColumn label="创意" min-width="260">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <ElImage :src="row.image" fit="cover" class="pf-creative-thumb" />
              <div class="font-medium">{{ row.title }}</div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="时段" width="200">
          <template #default="{ row }">{{ row.startAt }} ~ {{ row.endAt }}</template>
        </ElTableColumn>
        <ElTableColumn label="预算 / 已花" width="160">
          <template #default="{ row }">¥{{ row.spent }} / ¥{{ row.budget }}</template>
        </ElTableColumn>
        <ElTableColumn label="曝光" prop="impressions" width="100" align="right" />
        <ElTableColumn label="点击" prop="clicks" width="100" align="right" />
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 'active' ? 'success' : 'warning'" size="small">
              {{ row.status === 'active' ? '投放中' : '待审' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 数据 -->
    <ElCard v-else shadow="never">
      <ArtBarChart
        v-if="slots.length"
        height="320px"
        :data="slots.map((s) => s.impressions)"
        :x-axis-data="slots.map((s) => s.name)"
      />
      <div class="pf-stats-list mt-4">
        <div v-for="s in slots" :key="s.id" class="pf-stats-row">
          <span class="font-medium">{{ s.name }}</span>
          <div class="flex items-center gap-3">
            <span class="text-xs text-g-500">CTR</span>
            <ElProgress
              :percentage="Math.min(100, s.ctr * 8)"
              :stroke-width="10"
              :color="ctrColor(s.ctr)"
              style="width: 160px"
            />
            <span class="text-primary font-semibold">{{ s.ctr }}%</span>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- 新建广告位 Drawer -->
    <ElDrawer v-model="createOpen" :size="460" :with-header="false">
      <div class="pf-drawer">
        <h3 class="m-0">新建广告位</h3>
        <ElForm :model="createForm" label-position="top">
          <ElFormItem label="广告位名称">
            <ElInput v-model="createForm.name" placeholder="如：首页 Banner 推广位" />
          </ElFormItem>
          <ElFormItem label="投放对象">
            <ElRadioGroup v-model="createForm.target">
              <ElRadioButton value="customer">客户（小程序）</ElRadioButton>
              <ElRadioButton value="factory">厂家</ElRadioButton>
              <ElRadioButton value="store">门店</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="预览图（默认占位图）">
            <ElImage
              :src="createForm.preview"
              fit="cover"
              style="width: 100%; height: 120px; border-radius: 8px"
            />
          </ElFormItem>
        </ElForm>
        <div class="pf-drawer__footer">
          <ElButton @click="createOpen = false">取消</ElButton>
          <ElButton type="primary" :loading="submittingCreate" @click="submitCreate">创建</ElButton>
        </div>
      </div>
    </ElDrawer>

    <!-- 查看广告位详细数据 Dialog -->
    <ElDialog
      v-model="statsOpen"
      :title="(statsTarget?.name || '') + ' · 数据详情'"
      width="520px"
      align-center
    >
      <div v-if="statsTarget" class="pf-stats-detail">
        <div class="pf-stats-grid">
          <div class="pf-stats-cell">
            <div class="num">{{ formatWan(statsTarget.impressions) }}</div>
            <div class="label">总曝光</div>
          </div>
          <div class="pf-stats-cell">
            <div class="num">{{
              formatWan(Math.round((statsTarget.impressions * statsTarget.ctr) / 100))
            }}</div>
            <div class="label">总点击</div>
          </div>
          <div class="pf-stats-cell">
            <div class="num">{{ statsTarget.ctr }}%</div>
            <div class="label">CTR</div>
          </div>
          <div class="pf-stats-cell">
            <div class="num">{{ statsTarget.creativeCount }}</div>
            <div class="label">创意数</div>
          </div>
        </div>
        <ElDescriptions :column="1" border class="mt-4">
          <ElDescriptionsItem label="状态">
            <ElTag :type="statusTypeOf(statsTarget.status)" size="small">{{
              statusLabelOf(statsTarget.status)
            }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="投放对象">{{
            targetLabelOf(statsTarget.target)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="点击率指标">
            <ElProgress
              :percentage="Math.min(100, statsTarget.ctr * 8)"
              :stroke-width="14"
              :color="ctrColor(statsTarget.ctr)"
            />
          </ElDescriptionsItem>
          <ElDescriptionsItem label="预估单次点击"
            >¥{{
              (statsTarget.impressions * statsTarget.ctr * 0.001).toFixed(2)
            }}</ElDescriptionsItem
          >
        </ElDescriptions>
      </div>
      <template #footer>
        <ElButton @click="statsOpen = false">关闭</ElButton>
      </template>
    </ElDialog>

    <!-- 编辑广告位 Drawer -->
    <ElDrawer v-model="editOpen" :size="460" :with-header="false">
      <div class="pf-drawer">
        <h3 class="m-0">
          {{
            editMode === 'upload'
              ? '上传新创意'
              : editMode === 'target'
                ? '修改投放目标'
                : '修改投放时段'
          }}
          <span class="text-sm text-g-500 font-normal">· {{ editTarget?.name }}</span>
        </h3>
        <ElForm :model="editForm" label-position="top">
          <template v-if="editMode === 'upload'">
            <ElFormItem label="创意标题">
              <ElInput v-model="editForm.creativeTitle" placeholder="如：双11 全场五折" />
            </ElFormItem>
            <ElFormItem label="创意图">
              <ElImage
                :src="editForm.creativeImage"
                fit="cover"
                style="width: 100%; height: 120px; border-radius: 8px"
              />
            </ElFormItem>
            <ElFormItem label="预算（元）">
              <ElInputNumber
                v-model="editForm.creativeBudget"
                :min="100"
                :max="100000"
                :step="100"
                style="width: 100%"
              />
            </ElFormItem>
          </template>
          <template v-else-if="editMode === 'target'">
            <ElFormItem label="新投放对象">
              <ElRadioGroup v-model="editForm.newTarget">
                <ElRadioButton value="customer">客户（小程序）</ElRadioButton>
                <ElRadioButton value="factory">厂家</ElRadioButton>
                <ElRadioButton value="store">门店</ElRadioButton>
              </ElRadioGroup>
            </ElFormItem>
          </template>
          <template v-else>
            <ElFormItem label="投放时段">
              <ElDatePicker
                v-model="editForm.timeRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始"
                end-placeholder="结束"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </ElFormItem>
          </template>
        </ElForm>
        <div class="pf-drawer__footer">
          <ElButton @click="editOpen = false">取消</ElButton>
          <ElButton type="primary" :loading="submittingEdit" @click="submitEdit">保存</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchAdSlots,
    fetchAdCreatives,
    createAdSlot,
    updateAdSlot,
    createAdCreative,
    type AdSlotVM
  } from '@/api/platform-business'
  import type { AdCreative } from '@jiujiu/shared/types'
  import { formatWan } from '@jiujiu/shared/utils'
  import { ElMessage } from 'element-plus'
  import { Refresh, Plus } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformAd' })

  const tab = ref<'slots' | 'creatives' | 'stats'>('slots')
  const slots = ref<AdSlotVM[]>([])
  const creatives = ref<AdCreative[]>([])

  const kpiCards = computed(() => {
    const active = slots.value.filter((s) => s.status === 'active').length
    const totalImp = slots.value.reduce((s, x) => s + x.impressions, 0)
    const totalCreative = slots.value.reduce((s, x) => s + x.creativeCount, 0)
    const avgCtr = slots.value.length
      ? slots.value.reduce((s, x) => s + x.ctr, 0) / slots.value.length
      : 0
    return [
      {
        key: 'active',
        icon: 'ri:advertisement-line',
        label: '投放中',
        value: active,
        color: '#FF4D2D'
      },
      {
        key: 'creative',
        icon: 'ri:image-line',
        label: '创意数',
        value: totalCreative,
        color: '#FF7A45'
      },
      {
        key: 'imp',
        icon: 'ri:eye-line',
        label: '总曝光',
        value: formatWan(totalImp),
        color: '#10B981'
      },
      {
        key: 'ctr',
        icon: 'ri:percent-line',
        label: '平均 CTR',
        value: avgCtr.toFixed(1) + '%',
        color: '#A855F7'
      }
    ]
  })

  function targetLabelOf(t: AdSlotVM['target']) {
    return ({ customer: '客户（小程序）', factory: '厂家', store: '门店' } as const)[t] || t
  }
  function statusTypeOf(s: AdSlotVM['status']) {
    return ({ active: 'success', paused: 'warning', ended: 'info', draft: 'primary' } as const)[s]
  }
  function statusLabelOf(s: AdSlotVM['status']) {
    return ({ active: '进行中', paused: '已暂停', ended: '已结束', draft: '草稿' } as const)[s]
  }

  function ctrColor(ctr: number) {
    if (ctr >= 8) return '#10B981'
    if (ctr >= 4) return '#FAAD14'
    return '#F56C6C'
  }

  // ====== 新建广告位 Drawer ======
  const createOpen = ref(false)
  const submittingCreate = ref(false)
  const createForm = reactive({
    name: '',
    target: 'customer' as AdSlotVM['target'],
    preview: ''
  })

  function onCreate() {
    createForm.name = ''
    createForm.target = 'customer'
    createForm.preview = ''
    createOpen.value = true
  }

  async function submitCreate() {
    if (!createForm.name.trim()) {
      ElMessage.warning('请填写广告位名称')
      return
    }
    if (submittingCreate.value) return
    submittingCreate.value = true
    try {
      await createAdSlot({
        name: createForm.name.trim(),
        target: createForm.target,
        preview: createForm.preview,
        status: 'draft'
      })
      createOpen.value = false
      ElMessage.success(`已创建广告位：${createForm.name}`)
      // 重新拉真实数据，避免本地 unshift 与后端 ID 错位
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '创建失败，请稍后重试')
    } finally {
      submittingCreate.value = false
    }
  }

  // ====== 查看广告位详细数据 Dialog ======
  const statsOpen = ref(false)
  const statsTarget = ref<AdSlotVM>()

  function viewStats(s: AdSlotVM) {
    statsTarget.value = s
    statsOpen.value = true
  }

  // ====== 编辑广告位 ======
  const editOpen = ref(false)
  const editMode = ref<'upload' | 'target' | 'time'>('upload')
  const editTarget = ref<AdSlotVM>()
  const editForm = reactive({
    creativeTitle: '',
    creativeImage: '',
    creativeBudget: 1000,
    newTarget: 'customer' as AdSlotVM['target'],
    timeRange: [] as string[]
  })

  async function onEdit(s: AdSlotVM, cmd: string) {
    if (cmd === 'pause') {
      // 切换广告位投放状态：调真接口 + 失败回滚
      const original = s.status
      const next: AdSlotVM['status'] = original === 'paused' ? 'active' : 'paused'
      s.status = next
      try {
        await updateAdSlot(s.id, { status: next })
        ElMessage.success(next === 'paused' ? '已暂停投放' : '已恢复投放')
      } catch (e: any) {
        s.status = original
        ElMessage.error(e?.message || '操作失败，请稍后重试')
      }
      return
    }
    editTarget.value = s
    editMode.value = cmd as 'upload' | 'target' | 'time'
    editForm.creativeTitle = ''
    editForm.creativeImage = ''
    editForm.creativeBudget = 1000
    editForm.newTarget = s.target
    const today = new Date().toISOString().slice(0, 10)
    const next30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    editForm.timeRange = [today, next30]
    editOpen.value = true
  }

  const submittingEdit = ref(false)

  async function submitEdit() {
    if (!editTarget.value) return
    if (submittingEdit.value) return
    submittingEdit.value = true
    try {
      if (editMode.value === 'upload') {
        if (!editForm.creativeTitle.trim()) {
          ElMessage.warning('请填写创意标题')
          return
        }
        await createAdCreative({
          slotId: editTarget.value.id,
          title: editForm.creativeTitle.trim(),
          image: editForm.creativeImage,
          link: '#',
          startAt: editForm.timeRange[0] || new Date().toISOString().slice(0, 10),
          endAt: editForm.timeRange[1] || '',
          budget: editForm.creativeBudget,
          priority: 50
        })
        ElMessage.success('创意已上传，进入审核队列')
        // 重新拉创意列表与广告位（creativeCount 同步）
        await load()
      } else if (editMode.value === 'target') {
        const original = editTarget.value.target
        const next = editForm.newTarget
        editTarget.value.target = next
        try {
          await updateAdSlot(editTarget.value.id, { target: next })
          ElMessage.success(`投放对象已改为：${targetLabelOf(next)}`)
        } catch (e: any) {
          editTarget.value.target = original
          throw e
        }
      } else {
        // TODO: 等后端 AdSlot 模型补 startAt/endAt 字段后再补该 PUT，
        // 当前 AdSlot 表只存 name/target/preview/status，时段配置在创意维度
        ElMessage.info('时段配置请在「上传新创意」入口中按创意维度设置')
        editOpen.value = false
        return
      }
      editOpen.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败，请稍后重试')
    } finally {
      submittingEdit.value = false
    }
  }

  async function load() {
    slots.value = await fetchAdSlots()
    creatives.value = await fetchAdCreatives()
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ad {
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

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (width <= 1100px) {
      grid-template-columns: repeat(2, 1fr);
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

  .pf-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 14px;
  }

  .pf-slot {
    border-radius: 12px;

    :deep(.el-card__body) {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 18px;
    }
  }

  .pf-slot__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .pf-slot__preview {
    width: 100%;
    height: 120px;
    overflow: hidden;
    border-radius: 8px;
  }

  .pf-slot__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 10px 0;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
    border-bottom: 1px dashed var(--art-border-color, #e5e7eb);

    > div {
      display: flex;
      flex-direction: column;
      align-items: center;

      b {
        font-size: 16px;
        font-weight: 700;
        color: var(--art-gray-800, #1f2937);
      }

      span {
        margin-top: 2px;
        font-size: 11px;
        color: #6b7280;
      }
    }
  }

  .pf-slot__actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .pf-creative-thumb {
    flex-shrink: 0;
    width: 80px;
    height: 32px;
    border-radius: 4px;
  }

  .pf-stats-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pf-stats-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 4px;
    border-bottom: 1px dashed var(--art-border-color, #e5e7eb);

    &:last-child {
      border-bottom: none;
    }
  }

  /* Drawer 通用 */
  .pf-drawer {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 22px;
  }

  .pf-drawer__footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: auto;
  }

  /* 详细数据 Dialog */
  .pf-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .pf-stats-cell {
    padding: 14px 8px;
    text-align: center;
    background: linear-gradient(135deg, rgb(255 77 45 / 6%), rgb(255 77 45 / 2%));
    border-radius: 10px;

    .num {
      font-size: 20px;
      font-weight: 700;
      line-height: 1;
      color: var(--el-color-primary, #ff4d2d);
    }

    .label {
      margin-top: 6px;
      font-size: 11px;
      color: var(--art-gray-500, #6b7280);
    }
  }
</style>
