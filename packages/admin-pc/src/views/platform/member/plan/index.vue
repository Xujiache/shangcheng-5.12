<!-- 平台 PC · 会员套餐（S5-T9）-->
<template>
  <div class="pf-mp">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">会员套餐</h2>
        <p class="mt-1 text-sm text-g-500">套餐 · 推广包 · 增值单项 · 试用配置</p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" :icon="Plus" @click="onAdd">新建套餐</ElButton>
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
      </div>
    </div>

    <!-- 试用期配置 -->
    <ElCard shadow="never" class="pf-trial">
      <div class="pf-trial__row">
        <div class="flex items-center gap-3">
          <div class="pf-trial__icon"><ArtSvgIcon icon="ri:gift-line" /></div>
          <div>
            <div class="font-semibold">新商家试用期</div>
            <div class="text-xs text-g-500 mt-1">新注册商家可免费体验所有功能</div>
          </div>
        </div>
        <ElSelect v-model="trialDays" style="width: 160px" :loading="trialSaving" @change="onTrialChange">
          <ElOption :value="7" label="7 天" />
          <ElOption :value="15" label="15 天" />
          <ElOption :value="30" label="30 天" />
          <ElOption :value="60" label="60 天" />
          <ElOption :value="0" label="关闭试用" />
        </ElSelect>
      </div>
    </ElCard>

    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab">
        <ElTabPane :label="`会员套餐 (${countOfType('basic')})`" name="basic" />
        <ElTabPane :label="`推广套餐 (${countOfType('ad')})`" name="ad" />
        <ElTabPane :label="`增值单项 (${countOfType('addon')})`" name="addon" />
        <ElTabPane :label="`订阅商家 (${subscriptions.length})`" name="subs" />
        <ElTabPane label="缴费订单" name="orders" />
      </ElTabs>
    </ElCard>

    <!-- 套餐网格 -->
    <div v-if="tab !== 'orders' && tab !== 'subs'" class="pf-plans">
      <ElCard v-for="p in filteredPlans" :key="p.id" shadow="hover" class="pf-plan" :class="{ hot: p.hot }">
        <div v-if="p.hot" class="pf-plan__hot">HOT</div>
        <div class="pf-plan__head">
          <div class="pf-plan__name">{{ p.name }}</div>
          <ElTag :type="p.status === 'active' ? 'success' : 'info'" size="small">{{ p.status === 'active' ? '上架中' : '已停用' }}</ElTag>
        </div>
        <div class="pf-plan__price">
          <span class="cur">¥</span>{{ p.price }}
          <small>/ {{ periodLabelOf(p.period) }}</small>
        </div>
        <div v-if="p.originalPrice" class="pf-plan__org">原价 <s>¥{{ p.originalPrice }}</s></div>
        <ul class="pf-plan__rights">
          <li v-for="(r, i) in p.rights" :key="i">
            <ArtSvgIcon icon="ri:check-line" class="text-success" /> {{ r }}
          </li>
        </ul>
        <div v-if="p.constraints" class="pf-plan__constraints">
          <ElTag v-if="p.constraints.pushSlots !== undefined" size="small" effect="plain">{{ p.constraints.pushSlots > 99 ? '推送位不限' : `${p.constraints.pushSlots} 个推送位` }}</ElTag>
          <ElTag v-if="p.constraints.weightLimit !== undefined" size="small" effect="plain">权重 ≤ {{ p.constraints.weightLimit }}</ElTag>
          <ElTag v-if="p.constraints.bannerLimit !== undefined" size="small" effect="plain">Banner {{ p.constraints.bannerLimit > 99 ? '不限' : p.constraints.bannerLimit }}</ElTag>
        </div>
        <!-- 订阅商家数 -->
        <div class="pf-plan__subs">
          <ArtSvgIcon icon="ri:user-3-line" class="text-g-500" />
          <span class="text-xs text-g-500">订阅 {{ subsByPlanId(p.id).length }} 家</span>
          <ElLink v-if="subsByPlanId(p.id).length" type="primary" :underline="false" @click="viewSubsOfPlan(p.id)">查看</ElLink>
        </div>
        <div class="pf-plan__actions">
          <ElDropdown trigger="click" @command="(cmd) => onEdit(p, cmd)">
            <ElButton type="primary" plain class="w-full">编辑 <ArtSvgIcon icon="ri:arrow-down-s-line" /></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="price">修改价格</ElDropdownItem>
                <ElDropdownItem command="rights">修改权益</ElDropdownItem>
                <ElDropdownItem command="constraints" :disabled="!p.constraints">修改限制</ElDropdownItem>
                <ElDropdownItem command="toggle">{{ p.status === 'active' ? '下架' : '上架' }}</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </ElCard>
      <ElEmpty v-if="filteredPlans.length === 0" description="暂无相应套餐" />
    </div>

    <!-- 订阅商家 Tab -->
    <ElCard v-else-if="tab === 'subs'" shadow="never">
      <ElInput
        v-model="subsKeyword"
        placeholder="搜索商家 / 套餐"
        clearable
        size="small"
        style="width: 280px; margin-bottom: 12px"
      />
      <ElTable :data="filteredSubs" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="商家" prop="merchantName" min-width="220" />
        <ElTableColumn label="订阅套餐" min-width="180">
          <template #default="{ row }">
            <div>{{ row.planName }}</div>
            <div class="text-xs text-g-500">{{ planTypeLabelOf(row.planType) }} · ¥{{ row.price }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="有效期" width="220">
          <template #default="{ row }">
            <div>{{ row.startAt.slice(0, 10) }} ~ {{ row.endAt.slice(0, 10) }}</div>
            <ElProgress
              :percentage="Math.round(daysRemainingOf(row) / row.totalDays * 100)"
              :stroke-width="6"
              :show-text="false"
              :color="daysRemainingOf(row) < 30 ? '#F56C6C' : daysRemainingOf(row) < 90 ? '#E6A23C' : '#10B981'"
              style="margin-top: 6px"
            />
            <div class="text-xs text-g-500 mt-1">剩 {{ daysRemainingOf(row) }} 天 / {{ row.totalDays }} 天</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="自动续订" width="100" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="row.autoRenew ? 'success' : 'info'" effect="plain">{{ row.autoRenew ? '是' : '否' }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="row.status === 'active' ? 'success' : 'warning'">{{ subStatusLabelOf(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="订阅时间" width="170">
          <template #default="{ row }">{{ row.subscribedAt.slice(0, 16).replace('T', ' ') }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 缴费订单跳转 -->
    <ElCard v-else shadow="never">
      <ElEmpty description="缴费订单详情请前往 [缴费订单] 页面">
        <ElButton type="primary" @click="$router.push('/platform/member/orders')">前往</ElButton>
      </ElEmpty>
    </ElCard>

    <!-- 套餐编辑 Drawer -->
    <ElDrawer v-model="editOpen" :size="540" :with-header="false">
      <div class="pf-drawer">
        <h3 class="m-0">{{ editTitleOf() }} <span v-if="editForm.id" class="text-sm text-g-500 font-normal">· {{ editForm.name }}</span></h3>
        <ElForm :model="editForm" label-position="top">
          <template v-if="editMode === 'create' || editMode === 'price'">
            <div class="grid grid-cols-2 gap-3">
              <ElFormItem label="套餐类型">
                <ElSelect v-model="editForm.type" :disabled="editMode !== 'create'" style="width: 100%">
                  <ElOption value="basic" label="会员套餐" />
                  <ElOption value="ad" label="推广套餐" />
                  <ElOption value="addon" label="增值单项" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="计费周期">
                <ElSelect v-model="editForm.period" style="width: 100%">
                  <ElOption value="daily" label="天" />
                  <ElOption value="weekly" label="周" />
                  <ElOption value="monthly" label="月" />
                  <ElOption value="yearly" label="年" />
                  <ElOption value="oneoff" label="一次性" />
                </ElSelect>
              </ElFormItem>
            </div>
            <ElFormItem label="套餐名称">
              <ElInput v-model="editForm.name" :disabled="editMode !== 'create'" placeholder="如：年费会员" />
            </ElFormItem>
            <ElFormItem v-if="editMode === 'create'" label="套餐 Code">
              <ElInput v-model="editForm.code" placeholder="英文标识，如 yearly_pro" />
            </ElFormItem>
            <div class="grid grid-cols-2 gap-3">
              <ElFormItem label="售价（元）">
                <ElInputNumber v-model="editForm.price" :min="0" :max="999999" :step="10" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="原价（删除线）">
                <ElInputNumber v-model="editForm.originalPrice" :min="0" :max="999999" :step="10" style="width: 100%" />
              </ElFormItem>
            </div>
            <div v-if="editMode === 'create'" class="grid grid-cols-2 gap-3">
              <ElFormItem label="试用天数（basic）">
                <ElInputNumber v-model="editForm.trialDays" :min="0" :max="365" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="HOT 标记">
                <ElSwitch v-model="editForm.hot" />
              </ElFormItem>
            </div>
          </template>

          <template v-if="editMode === 'create' || editMode === 'rights'">
            <ElFormItem label="权益列表">
              <div class="flex w-full gap-2">
                <ElInput
                  v-model="editForm.rightInput"
                  placeholder="输入权益描述后回车 / 点添加"
                  @keyup.enter="addRight"
                />
                <ElButton type="primary" plain @click="addRight">添加</ElButton>
              </div>
              <div class="pf-rights-list mt-2">
                <ElTag
                  v-for="(r, i) in editForm.rights"
                  :key="i"
                  closable
                  type="primary"
                  effect="plain"
                  class="mr-2 mb-2"
                  @close="removeRight(i)"
                >
                  {{ r }}
                </ElTag>
                <span v-if="editForm.rights.length === 0" class="text-xs text-g-500">尚未添加任何权益</span>
              </div>
            </ElFormItem>
          </template>

          <template v-if="(editMode === 'create' && editForm.type !== 'basic') || editMode === 'constraints'">
            <ElDivider>投放限制（推广 / 增值套餐专用）</ElDivider>
            <div class="grid grid-cols-2 gap-3">
              <ElFormItem label="推送位数">
                <ElInputNumber v-model="editForm.constraints.pushSlots" :min="0" :max="99999" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="权重上限">
                <ElInputNumber v-model="editForm.constraints.weightLimit" :min="0" :max="100" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="首屏 Banner 数">
                <ElInputNumber v-model="editForm.constraints.bannerLimit" :min="0" :max="99999" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="月曝光上限">
                <ElInputNumber v-model="editForm.constraints.impressionLimit" :min="0" :max="99999999" :step="10000" style="width: 100%" />
              </ElFormItem>
            </div>
          </template>
        </ElForm>
        <div class="pf-drawer__footer">
          <ElButton @click="editOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitEdit">保存</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchPlatformMemberPlans,
    savePlatformMemberPlan,
    fetchAllSubscriptions,
    fetchMemberTrialDays,
    saveMemberTrialDays
  } from '@/api/platform-business'
  import type { Subscription } from '@/api/member-service'
  import type { MemberPlan } from '@jiujiu/shared/types'
  import { ElMessage } from 'element-plus'
  import { Refresh, Plus } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformMemberPlan' })

  const tab = ref<'basic' | 'ad' | 'addon' | 'subs' | 'orders'>('basic')
  const plans = ref<MemberPlan[]>([])
  const subscriptions = ref<Subscription[]>([])
  const subsKeyword = ref('')
  const trialDays = ref(30)
  const trialSaving = ref(false)

  async function onTrialChange(v: number) {
    trialSaving.value = true
    try {
      const r = await saveMemberTrialDays(v)
      trialDays.value = r.days
      ElMessage.success(v > 0 ? `已设为 ${v} 天试用` : '已关闭试用')
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      trialSaving.value = false
    }
  }

  const filteredPlans = computed(() => plans.value.filter((p) => p.type === tab.value))

  function countOfType(t: MemberPlan['type']) {
    return plans.value.filter((p) => p.type === t).length
  }

  function subsByPlanId(planId: string) {
    return subscriptions.value.filter((s) => s.planId === planId)
  }

  const filteredSubs = computed(() => {
    if (!subsKeyword.value) return subscriptions.value
    const kw = subsKeyword.value.toLowerCase()
    return subscriptions.value.filter(
      (s) => s.merchantName.toLowerCase().includes(kw) || s.planName.toLowerCase().includes(kw)
    )
  })

  function planTypeLabelOf(t: MemberPlan['type']) {
    return ({ basic: '会员套餐', ad: '推广套餐', addon: '增值单项' } as const)[t]
  }

  function subStatusLabelOf(s: Subscription['status']) {
    return ({ trial: '试用中', active: '生效中', expired: '已过期', cancelled: '已取消' } as const)[s]
  }

  function daysRemainingOf(s: Subscription) {
    return Math.max(0, Math.ceil((new Date(s.endAt).getTime() - Date.now()) / 86400000))
  }

  function viewSubsOfPlan(planId: string) {
    subsKeyword.value = ''
    tab.value = 'subs'
    setTimeout(() => {
      const target = plans.value.find((p) => p.id === planId)
      if (target) subsKeyword.value = target.name
    }, 50)
  }

  function periodLabelOf(p: MemberPlan['period']) {
    return ({ monthly: '月', yearly: '年', weekly: '周', daily: '天', oneoff: '次', month: '月', year: '年', day: '天' } as Record<string, string>)[p] || p
  }

  // ====== 编辑 Drawer 通用 ======
  const editOpen = ref(false)
  const editMode = ref<'create' | 'price' | 'rights' | 'constraints'>('create')
  const editForm = reactive<{
    id?: string
    type: MemberPlan['type']
    name: string
    code: string
    price: number
    originalPrice: number
    period: MemberPlan['period']
    rights: string[]
    rightInput: string
    constraints: NonNullable<MemberPlan['constraints']>
    hot: boolean
    trialDays: number
  }>({
    id: undefined,
    type: 'basic',
    name: '',
    code: '',
    price: 99,
    originalPrice: 0,
    period: 'monthly',
    rights: [],
    rightInput: '',
    constraints: { pushSlots: 5, weightLimit: 60, bannerLimit: 0, impressionLimit: 50000 },
    hot: false,
    trialDays: 0
  })

  function editTitleOf() {
    return {
      create: '新建套餐',
      price: '修改价格',
      rights: '修改权益',
      constraints: '修改投放限制'
    }[editMode.value]
  }

  async function onEdit(p: MemberPlan, cmd: string) {
    if (cmd === 'toggle') {
      const next = p.status === 'active' ? 'disabled' : 'active'
      await savePlatformMemberPlan({ id: p.id, status: next })
      p.status = next as MemberPlan['status']
      ElMessage.success(next === 'active' ? '已上架' : '已下架')
      return
    }
    editMode.value = cmd as 'price' | 'rights' | 'constraints'
    editForm.id = p.id
    editForm.type = p.type
    editForm.name = p.name
    editForm.code = p.code
    editForm.price = p.price
    editForm.originalPrice = p.originalPrice ?? 0
    editForm.period = p.period
    editForm.rights = [...p.rights]
    editForm.rightInput = ''
    editForm.constraints = p.constraints
      ? { ...p.constraints }
      : { pushSlots: 5, weightLimit: 60, bannerLimit: 0, impressionLimit: 50000 }
    editForm.hot = !!p.hot
    editForm.trialDays = p.trialDays ?? 0
    editOpen.value = true
  }

  function onAdd() {
    editMode.value = 'create'
    editForm.id = undefined
    editForm.type = tab.value === 'orders' ? 'basic' : (tab.value as MemberPlan['type'])
    editForm.name = ''
    editForm.code = ''
    editForm.price = 99
    editForm.originalPrice = 0
    editForm.period = 'monthly'
    editForm.rights = []
    editForm.rightInput = ''
    editForm.constraints = { pushSlots: 5, weightLimit: 60, bannerLimit: 0, impressionLimit: 50000 }
    editForm.hot = false
    editForm.trialDays = 0
    editOpen.value = true
  }

  function addRight() {
    const v = editForm.rightInput.trim()
    if (!v) return
    editForm.rights.push(v)
    editForm.rightInput = ''
  }
  function removeRight(i: number) {
    editForm.rights.splice(i, 1)
  }

  async function submitEdit() {
    if (editMode.value === 'create' && !editForm.name.trim()) {
      ElMessage.warning('请填写套餐名称')
      return
    }
    if (editMode.value === 'create' && !editForm.code.trim()) {
      ElMessage.warning('请填写套餐 code')
      return
    }
    if ((editMode.value === 'create' || editMode.value === 'rights') && editForm.rights.length === 0) {
      ElMessage.warning('请至少添加 1 项权益')
      return
    }
    const payload: Partial<MemberPlan> = {
      id: editForm.id,
      type: editForm.type,
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      price: editForm.price,
      originalPrice: editForm.originalPrice || undefined,
      period: editForm.period,
      rights: [...editForm.rights],
      hot: editForm.hot,
      trialDays: editForm.trialDays || undefined,
      status: 'active',
      constraints: editForm.type !== 'basic' ? { ...editForm.constraints } : undefined
    }
    await savePlatformMemberPlan(payload)
    if (editMode.value === 'create') {
      const now = new Date().toISOString()
      plans.value.push({
        id: 'p-' + Date.now(),
        sort: plans.value.length + 1,
        createdAt: now,
        updatedAt: now,
        ...payload
      } as MemberPlan)
      ElMessage.success('套餐已创建')
    } else {
      const target = plans.value.find((p) => p.id === editForm.id)
      if (target) Object.assign(target, payload)
      ElMessage.success('已保存')
    }
    editOpen.value = false
  }

  async function load() {
    const [planList, subs, trial] = await Promise.all([
      fetchPlatformMemberPlans(),
      fetchAllSubscriptions(),
      fetchMemberTrialDays(),
    ])
    plans.value = planList
    subscriptions.value = subs
    trialDays.value = trial
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-mp {
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

  .text-success {
    color: #10b981;
  }
  .text-g-500 {
    color: #6b7280;
  }

  .pf-trial {
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 156, 110, 0.1), rgba(255, 77, 45, 0.04));
    border: 1px solid rgba(255, 156, 110, 0.3);
  }

  .pf-trial__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pf-trial__icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(255, 77, 45, 0.16);
    color: var(--el-color-primary, #ff4d2d);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-plans {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .pf-plan {
    position: relative;
    border-radius: 14px;
    border: 2px solid var(--art-border-color, #e5e7eb);
    transition: all 0.2s;

    :deep(.el-card__body) {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
    }

    &.hot {
      border-color: var(--el-color-primary, #ff4d2d);
      box-shadow: 0 8px 24px -10px rgba(255, 77, 45, 0.3);
    }
  }

  .pf-plan__hot {
    position: absolute;
    top: -10px;
    right: 16px;
    padding: 3px 10px;
    border-radius: 8px;
    background: linear-gradient(135deg, #ff4d2d, #ff7a45);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    z-index: 1;
  }

  .pf-plan__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pf-plan__name {
    font-size: 16px;
    font-weight: 700;
  }

  .pf-plan__price {
    font-size: 30px;
    font-weight: 700;
    color: var(--el-color-primary, #ff4d2d);
    margin-top: 4px;

    .cur {
      font-size: 18px;
      margin-right: 2px;
    }
    small {
      font-size: 13px;
      color: #6b7280;
      font-weight: 400;
    }
  }

  .pf-plan__org {
    font-size: 12px;
    color: #6b7280;
  }

  .pf-plan__rights {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    flex: 1;

    li {
      padding: 4px 0;
      font-size: 13px;
      display: flex;
      gap: 6px;
      color: var(--art-gray-700, #374151);
    }
  }

  .pf-plan__constraints {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  .pf-plan__subs {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding-top: 8px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  .pf-plan__actions {
    margin-top: auto;
    padding-top: 10px;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .w-full {
    width: 100%;
  }

  /* Drawer */
  .pf-drawer {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
  }

  .pf-drawer__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: auto;
  }

  .grid {
    display: grid;
  }
  .grid-cols-2 {
    grid-template-columns: 1fr 1fr;
  }
  .gap-3 {
    gap: 12px;
  }

  .pf-rights-list {
    display: flex;
    flex-wrap: wrap;
  }
</style>
