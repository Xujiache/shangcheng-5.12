<!-- 商家 PC · 营销中心（S3-T9）-->
<template>
  <div class="mp-marketing">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">营销中心</h2>
        <p class="mt-1 text-sm text-g-500">5 种活动模板 · 实时投放数据</p>
      </div>
      <ElButton type="primary" :icon="Plus" @click="openCreate">新建活动</ElButton>
    </div>

    <!-- 5 种活动卡片入口 -->
    <div class="mp-types">
      <div
        v-for="type in TYPES"
        :key="type.value"
        class="mp-type-card"
        :class="{ active: filterType === type.value }"
        :style="{ '--accent': type.color }"
        @click="filterType = filterType === type.value ? 'all' : type.value"
      >
        <div class="mp-type-icon" :style="{ background: type.color }">
          <ArtSvgIcon :icon="type.icon" />
        </div>
        <div class="mp-type-text">
          <div class="mp-type-name">{{ type.label }}</div>
          <div class="mp-type-count">{{ countOfType(type.value) }} 个活动</div>
        </div>
      </div>
    </div>

    <!-- 活动列表 -->
    <ElCard shadow="never" v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">活动列表</span>
          <ElRadioGroup v-model="filterStatus" size="small">
            <ElRadioButton value="all">全部</ElRadioButton>
            <ElRadioButton value="running">进行中</ElRadioButton>
            <ElRadioButton value="paused">已暂停</ElRadioButton>
            <ElRadioButton value="ended">已结束</ElRadioButton>
            <ElRadioButton value="draft">草稿</ElRadioButton>
          </ElRadioGroup>
        </div>
      </template>

      <div class="mp-activities">
        <ElEmpty v-if="filteredList.length === 0" description="暂无活动" />
        <div v-for="act in filteredList" :key="act.id" class="mp-activity">
          <div class="mp-activity__head">
            <div class="mp-activity__tag" :class="`type-${act.type}`">
              {{ labelOf(act.type) }}
            </div>
            <ElTag :type="statusTypeOf(act.status)" size="small" effect="plain">
              {{ statusLabelOf(act.status) }}
            </ElTag>
          </div>
          <div class="mp-activity__title">{{ act.title }}</div>
          <div class="mp-activity__desc">{{ act.description }}</div>
          <div class="mp-activity__meta">
            <span>{{ act.startAt }} ~ {{ act.endAt }}</span>
          </div>
          <ElDivider class="my-3" />
          <div class="mp-activity__stats">
            <div>
              <div class="mp-activity__stat-val">{{ act.joinCount }}</div>
              <div class="mp-activity__stat-lbl">参与</div>
            </div>
            <div>
              <div class="mp-activity__stat-val">{{ (act.conversion * 100).toFixed(0) }}%</div>
              <div class="mp-activity__stat-lbl">转化率</div>
            </div>
          </div>
          <div class="mp-activity__ops">
            <ElButton size="small" @click="ElMessage.info('数据分析')">数据</ElButton>
            <ElButton
              size="small"
              :type="act.status === 'running' ? 'warning' : 'primary'"
              @click="toggleStatus(act)"
            >
              {{ act.status === 'running' ? '暂停' : '启用' }}
            </ElButton>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- 新建对话框（轻量演示） -->
    <ElDialog v-model="createOpen" title="新建活动" width="520">
      <ElForm label-position="top">
        <ElFormItem label="活动类型">
          <ElRadioGroup v-model="newAct.type">
            <ElRadioButton v-for="t in TYPES" :key="t.value" :value="t.value">
              {{ t.label }}
            </ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="活动名称"><ElInput v-model="newAct.title" /></ElFormItem>
        <ElFormItem label="活动描述">
          <ElInput v-model="newAct.description" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="活动期">
          <ElDatePicker
            v-model="newActDate"
            type="daterange"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createOpen = false">取消</ElButton>
        <ElButton type="primary" @click="confirmCreate">创建</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMarketingActivities,
    type MarketingActivity
  } from '@/api/merchant-business'
  import { ElMessage } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantMarketing' })

  const TYPES = [
    { value: 'coupon' as const, label: '优惠券', icon: 'ri:coupon-3-line', color: '#FF4D2D' },
    { value: 'discount' as const, label: '满减', icon: 'ri:price-tag-3-line', color: '#3B82F6' },
    { value: 'group' as const, label: '拼团', icon: 'ri:group-line', color: '#10B981' },
    { value: 'seckill' as const, label: '秒杀', icon: 'ri:flashlight-line', color: '#F59E0B' },
    { value: 'distribute' as const, label: '分销', icon: 'ri:share-forward-line', color: '#A855F7' }
  ]

  const loading = ref(false)
  const list = ref<MarketingActivity[]>([])
  const filterType = ref<MarketingActivity['type'] | 'all'>('all')
  const filterStatus = ref<MarketingActivity['status'] | 'all'>('all')

  const createOpen = ref(false)
  const newAct = reactive({
    type: 'coupon' as MarketingActivity['type'],
    title: '',
    description: ''
  })
  const newActDate = ref<[string, string]>()

  const filteredList = computed(() =>
    list.value.filter(
      (a) =>
        (filterType.value === 'all' || a.type === filterType.value) &&
        (filterStatus.value === 'all' || a.status === filterStatus.value)
    )
  )

  function countOfType(t: MarketingActivity['type']) {
    return list.value.filter((a) => a.type === t).length
  }

  function labelOf(t: MarketingActivity['type']) {
    return TYPES.find((x) => x.value === t)?.label || t
  }

  function statusTypeOf(s: MarketingActivity['status']) {
    return (
      {
        running: 'success',
        paused: 'warning',
        ended: 'info',
        draft: 'info'
      } as const
    )[s]
  }

  function statusLabelOf(s: MarketingActivity['status']) {
    return (
      {
        running: '进行中',
        paused: '已暂停',
        ended: '已结束',
        draft: '草稿'
      } as const
    )[s]
  }

  function toggleStatus(act: MarketingActivity) {
    act.status = act.status === 'running' ? 'paused' : 'running'
    ElMessage.success(act.status === 'running' ? '已启用' : '已暂停')
  }

  function openCreate() {
    Object.assign(newAct, { type: 'coupon', title: '', description: '' })
    newActDate.value = undefined
    createOpen.value = true
  }

  function confirmCreate() {
    if (!newAct.title) {
      ElMessage.warning('请填写活动名称')
      return
    }
    list.value.unshift({
      id: 'mk-' + Date.now(),
      type: newAct.type,
      title: newAct.title,
      description: newAct.description || '—',
      status: 'draft',
      startAt: newActDate.value?.[0] || '',
      endAt: newActDate.value?.[1] || '',
      joinCount: 0,
      conversion: 0
    })
    createOpen.value = false
    ElMessage.success('活动已创建（草稿）')
  }

  async function loadData() {
    loading.value = true
    try {
      list.value = await fetchMarketingActivities()
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-marketing {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* === 类型卡片 === */

  .mp-types {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .mp-type-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 12px;
    background: #fff;
    border: 1.5px solid var(--art-border-color, #e5e7eb);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px -10px rgba(0, 0, 0, 0.15);
    }

    &.active {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, white);
    }
  }

  .mp-type-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: #fff;
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mp-type-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--art-gray-800, #1f2937);
  }

  .mp-type-count {
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
    margin-top: 2px;
  }

  /* === 活动卡片 === */

  .mp-activities {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .mp-activity {
    padding: 16px 18px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid var(--art-border-color, #e5e7eb);
    display: flex;
    flex-direction: column;
    transition: all 0.18s;

    &:hover {
      border-color: var(--el-color-primary, #ff4d2d);
      box-shadow: 0 4px 14px -6px rgba(255, 77, 45, 0.18);
    }
  }

  .mp-activity__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .mp-activity__tag {
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;

    &.type-coupon { background: rgba(255, 77, 45, 0.1); color: #ff4d2d; }
    &.type-discount { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    &.type-group { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    &.type-seckill { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    &.type-distribute { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
  }

  .mp-activity__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--art-gray-800, #1f2937);
  }

  .mp-activity__desc {
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
    margin-top: 4px;
  }

  .mp-activity__meta {
    font-size: 11px;
    color: var(--art-gray-400, #9ca3af);
    margin-top: 6px;
  }

  .mp-activity__stats {
    display: flex;
    justify-content: space-around;
  }

  .mp-activity__stat-val {
    font-size: 18px;
    font-weight: 600;
    color: var(--art-gray-800, #1f2937);
    text-align: center;
  }

  .mp-activity__stat-lbl {
    font-size: 11px;
    color: var(--art-gray-500, #6b7280);
    margin-top: 2px;
    text-align: center;
  }

  .mp-activity__ops {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
</style>
