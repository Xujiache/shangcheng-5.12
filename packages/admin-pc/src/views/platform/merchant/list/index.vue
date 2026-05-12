<!-- 平台 PC · 商户列表（S5-T2）-->
<template>
  <div class="pf-merchant">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">商户列表</h2>
        <p class="mt-1 text-sm text-g-500">入驻商户管理 · 厂家 / 门店</p>
      </div>
      <div class="flex gap-2">
        <ElInput
          v-model="keyword"
          placeholder="搜索商户名 / 联系人"
          clearable
          style="width: 240px"
          :prefix-icon="Search"
          @input="reload"
        />
        <ElButton :icon="Refresh" plain @click="reload">刷新</ElButton>
      </div>
    </div>

    <!-- 4 统计 -->
    <div class="pf-kpi-row">
      <ElCard v-for="s in statsCards" :key="s.key" shadow="hover" class="pf-kpi">
        <div class="pf-kpi__icon" :style="{ background: s.color + '18', color: s.color }">
          <ArtSvgIcon :icon="s.icon" />
        </div>
        <div>
          <div class="pf-kpi__num">{{ s.value }}</div>
          <div class="pf-kpi__label">{{ s.label }}</div>
        </div>
      </ElCard>
    </div>

    <!-- Tab + 表 -->
    <ElCard shadow="never" class="pf-toolbar">
      <ElTabs v-model="tab" @tab-change="reload">
        <ElTabPane v-for="t in tabs" :key="t.value" :label="`${t.label} (${countOf(t.value)})`" :name="t.value" />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never">
      <ElTable :data="filtered" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="商户" min-width="240">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElAvatar :size="36" shape="square" :src="row.businessLicense" />
              <div>
                <div class="font-medium">{{ row.name }}</div>
                <div class="text-xs text-g-500">{{ row.legalName }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="类型" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="row.type === 'factory' ? 'danger' : 'warning'" size="small" effect="plain">
              {{ row.type === 'factory' ? '厂家' : '门店' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="联系人" width="160">
          <template #default="{ row }">
            <div>{{ row.contact }}</div>
            <div class="text-xs text-g-500">{{ row.contactPhone }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="地区" prop="region" width="180" />
        <ElTableColumn label="累计 GMV" width="140" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ formatWan(row.totalGmv || 0) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="信用" width="80" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="creditTypeOf(row.credit)">{{ row.credit || 'B' }}级</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag size="small" :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '已停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            <ElDropdown trigger="click" @command="(cmd) => onPerm(row, cmd)">
              <ElButton link type="primary">
                设权限
                <ArtSvgIcon icon="ri:arrow-down-s-line" />
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="all">授权全部</ElDropdownItem>
                  <ElDropdownItem command="base">仅基础</ElDropdownItem>
                  <ElDropdownItem command="view">仅查看</ElDropdownItem>
                  <ElDropdownItem command="custom">自定义</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
            <ElButton
              link
              :type="row.status === 'active' ? 'danger' : 'success'"
              @click="onToggle(row)"
            >
              {{ row.status === 'active' ? '停用' : '恢复' }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 详情 Drawer -->
    <ElDrawer v-model="detailOpen" :size="540" :with-header="false">
      <div v-if="current" class="pf-detail">
        <div class="pf-detail__head">
          <div>
            <h3 class="m-0">{{ current.name }}</h3>
            <div class="text-sm text-g-500 mt-1">{{ current.legalName }}</div>
          </div>
          <ElTag :type="current.type === 'factory' ? 'danger' : 'warning'">
            {{ current.type === 'factory' ? '厂家' : '门店' }}
          </ElTag>
        </div>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="法人">{{ current.legalRep }}</ElDescriptionsItem>
          <ElDescriptionsItem label="信用代码">{{ current.creditCode }}</ElDescriptionsItem>
          <ElDescriptionsItem label="联系人">{{ current.contact }} · {{ current.contactPhone }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地区">{{ current.region }}</ElDescriptionsItem>
          <ElDescriptionsItem label="地址">{{ current.address }}</ElDescriptionsItem>
          <ElDescriptionsItem label="经营品类">{{ current.categories.join('、') }}</ElDescriptionsItem>
          <ElDescriptionsItem label="累计 GMV">¥{{ formatWan(current.totalGmv || 0) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="信用等级">{{ current.credit || 'B' }} 级</ElDescriptionsItem>
          <ElDescriptionsItem label="驳回率">{{ current.rejectRate ?? 0 }}%</ElDescriptionsItem>
        </ElDescriptions>
        <div class="mt-3 font-semibold text-sm">资质图片</div>
        <div class="pf-qual-grid">
          <ElImage
            v-for="(q, i) in current.qualifications"
            :key="i"
            :src="q"
            :preview-src-list="current.qualifications"
            fit="cover"
            class="pf-qual"
          />
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchPlatformMerchants,
    pauseMerchant,
    resumeMerchant
  } from '@/api/platform-business'
  import type { Merchant } from '@jiujiu/shared/types'
  import { formatWan } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Search } from '@element-plus/icons-vue'

  defineOptions({ name: 'PlatformMerchantList' })

  type TabKey = 'all' | 'factory' | 'store' | 'disabled'

  const tabs: { label: string; value: TabKey }[] = [
    { label: '全部', value: 'all' },
    { label: '厂家', value: 'factory' },
    { label: '门店', value: 'store' },
    { label: '已停用', value: 'disabled' }
  ]

  const tab = ref<TabKey>('all')
  const keyword = ref('')
  const all = ref<Merchant[]>([])
  const detailOpen = ref(false)
  const current = ref<Merchant>()

  const filtered = computed(() => all.value)

  const statsCards = computed(() => [
    { key: 'total', icon: 'ri:store-2-line', label: '商户总数', value: rawAll.value.length, color: '#FF4D2D' },
    { key: 'factory', icon: 'ri:building-line', label: '厂家', value: rawAll.value.filter((m) => m.type === 'factory' && m.status === 'active').length, color: '#FF7A45' },
    { key: 'store', icon: 'ri:store-3-line', label: '门店', value: rawAll.value.filter((m) => m.type === 'store' && m.status === 'active').length, color: '#FAAD14' },
    { key: 'disabled', icon: 'ri:forbid-line', label: '已停用', value: rawAll.value.filter((m) => m.status === 'disabled').length, color: '#86909C' }
  ])

  const rawAll = ref<Merchant[]>([])

  function countOf(t: TabKey) {
    if (t === 'all') return rawAll.value.filter((m) => m.status !== 'pending').length
    if (t === 'factory') return rawAll.value.filter((m) => m.type === 'factory' && m.status === 'active').length
    if (t === 'store') return rawAll.value.filter((m) => m.type === 'store' && m.status === 'active').length
    return rawAll.value.filter((m) => m.status === 'disabled').length
  }

  function creditTypeOf(c?: string) {
    return ({ A: 'success', B: 'primary', C: 'warning', D: 'danger' } as const)[c || 'B'] ?? 'info'
  }

  function openDetail(m: Merchant) {
    current.value = m
    detailOpen.value = true
  }

  async function onPerm(_m: Merchant, cmd: string) {
    ElMessage.success(`已设置：${({ all: '授权全部', base: '仅基础', view: '仅查看', custom: '自定义' } as Record<string, string>)[cmd]}`)
  }

  async function onToggle(m: Merchant) {
    const willPause = m.status === 'active'
    try {
      await ElMessageBox.confirm(
        willPause ? `停用「${m.name}」？停用后商户将无法登录。` : `恢复「${m.name}」？`,
        '提示',
        { confirmButtonText: willPause ? '停用' : '恢复', cancelButtonText: '取消' }
      )
      await (willPause ? pauseMerchant(m.id) : resumeMerchant(m.id))
      ElMessage.success(willPause ? '已停用' : '已恢复')
      await reload()
    } catch {
      /* cancel */
    }
  }

  async function reload() {
    all.value = await fetchPlatformMerchants({ tab: tab.value, keyword: keyword.value })
    if (rawAll.value.length === 0) {
      rawAll.value = await fetchPlatformMerchants({ tab: 'all' })
    } else {
      rawAll.value = await fetchPlatformMerchants({ tab: 'all' })
    }
  }

  onMounted(reload)
</script>

<style scoped lang="scss">
  .pf-merchant {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
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

    @media (max-width: 1100px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .pf-kpi {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
  }

  .pf-kpi__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .pf-kpi__num {
    font-size: 26px;
    font-weight: 700;
    color: var(--art-gray-800, #1f2937);
    line-height: 1;
  }

  .pf-kpi__label {
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
    margin-top: 4px;
  }

  .pf-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px;
    }
  }

  .pf-detail {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-detail__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .pf-qual-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 6px;
  }

  .pf-qual {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 8px;
    border: 1px solid var(--art-border-color, #e5e7eb);
    overflow: hidden;
  }
</style>
