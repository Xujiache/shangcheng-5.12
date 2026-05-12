<!-- 商家 PC · 客户管理（S3-T8）-->
<template>
  <div class="mp-customer">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">客户管理</h2>
        <p class="mt-1 text-sm text-g-500">
          总客户 {{ all.length }} · 会员 <b class="text-primary">{{ vipCount }}</b> · 分佣 <b style="color:#FF4D2D">{{ agencyCount }}</b> · 黑名单 {{ blacklistCount }}
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton :icon="Refresh" @click="loadData" plain>刷新</ElButton>
        <ElButton :icon="Download" plain>导出</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="tier" @tab-change="loadData">
        <ElTabPane
          v-for="t in tabs"
          :key="t.value"
          :label="`${t.label} (${countOf(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
      <div class="mp-filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索昵称 / 手机号"
          clearable
          :prefix-icon="Search"
          style="width: 280px"
        />
      </div>
    </ElCard>

    <ElCard shadow="never" v-loading="loading">
      <ElTable :data="filteredList" stripe :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }">
        <ElTableColumn label="客户" min-width="240">
          <template #default="{ row }">
            <div class="mp-row-cell">
              <ElAvatar :src="row.avatar" :size="40" />
              <div>
                <div class="font-medium">
                  {{ row.nickname }}
                  <ElTag v-if="isVip(row)" type="warning" size="small" effect="dark" class="ml-1">VIP</ElTag>
                  <ElTag v-if="row.status === 'disabled'" type="danger" size="small" effect="plain" class="ml-1">
                    黑名单
                  </ElTag>
                </div>
                <div class="text-xs text-g-500 mt-1">{{ row.phone || '未绑定手机' }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="客户层级" width="120" align="center">
          <template #default="{ row }">
            <ElTag :type="tierMetaOf(tierOf(row)).tagType" size="small">{{ tierMetaOf(tierOf(row)).label }}</ElTag>
            <div class="text-xs text-g-500 mt-1">见 {{ tierMetaOf(tierOf(row)).priceLabel }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="性别" width="80" align="center">
          <template #default="{ row }">
            <ArtSvgIcon
              v-if="row.gender === 1"
              icon="ri:men-line"
              class="text-blue-500 text-base"
            />
            <ArtSvgIcon
              v-else-if="row.gender === 2"
              icon="ri:women-line"
              class="text-pink-500 text-base"
            />
            <span v-else class="text-g-400 text-xs">未知</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="标签">
          <template #default="{ row }">
            <ElTag
              v-for="tag in tagsOf(row)"
              :key="tag"
              size="small"
              type="info"
              effect="plain"
              class="mr-1"
            >
              {{ tag }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="注册时间" width="140">
          <template #default="{ row }">
            <span class="text-xs">{{ formatDate(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="累计消费" width="120" align="right">
          <template #default="{ row }">
            <span class="text-primary font-semibold">¥{{ totalConsumeOf(row) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton text type="primary" size="small" @click="openDetail(row)">详情</ElButton>
            <ElDivider direction="vertical" />
            <ElButton text type="primary" size="small">加标签</ElButton>
            <ElDivider direction="vertical" />
            <ElButton
              text
              :type="row.status === 'disabled' ? 'success' : 'danger'"
              size="small"
              @click="toggleBlacklist(row)"
            >
              {{ row.status === 'disabled' ? '移出黑名单' : '加入黑名单' }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailOpen" :size="480" :with-header="false">
      <div v-if="current" class="mp-detail">
        <div class="mp-detail__hero">
          <ElAvatar :src="current.avatar" :size="72" />
          <div>
            <div class="text-lg font-semibold">{{ current.nickname }}</div>
            <div class="text-xs text-g-500 mt-1">{{ current.phone || '未绑定手机' }}</div>
            <div class="mt-2 flex gap-1">
              <ElTag v-if="isVip(current)" type="warning" effect="dark" size="small">VIP 会员</ElTag>
              <ElTag v-if="current.status === 'disabled'" type="danger" size="small">黑名单</ElTag>
              <ElTag type="info" effect="plain" size="small">
                注册 {{ formatRelative(current.createdAt) }}
              </ElTag>
            </div>
          </div>
        </div>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">消费数据</h4>
          <div class="mp-stat-row">
            <div class="mp-stat">
              <div class="mp-stat__val text-primary">¥{{ totalConsumeOf(current) }}</div>
              <div class="mp-stat__lbl">累计消费</div>
            </div>
            <div class="mp-stat">
              <div class="mp-stat__val">{{ orderCountOf(current) }}</div>
              <div class="mp-stat__lbl">订单数</div>
            </div>
            <div class="mp-stat">
              <div class="mp-stat__val">{{ avgOrderOf(current) }}</div>
              <div class="mp-stat__lbl">客单价</div>
            </div>
          </div>
        </ElCard>

        <ElCard shadow="never" class="mp-detail__card">
          <h4 class="m-0 mb-3 text-sm text-g-700">客户标签</h4>
          <div class="flex flex-wrap gap-2">
            <ElTag
              v-for="t in tagsOf(current)"
              :key="t"
              closable
              effect="plain"
              size="small"
            >
              {{ t }}
            </ElTag>
            <ElTag type="primary" effect="plain" size="small" class="cursor-pointer">+ 添加</ElTag>
          </div>
        </ElCard>

        <div class="mp-detail__footer">
          <ElButton @click="detailOpen = false">关闭</ElButton>
          <ElButton type="primary" @click="ElMessage.info('已发送优惠券')">发送优惠券</ElButton>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { fetchCustomers } from '@/api/merchant-business'
  import type { User } from '@jiujiu/shared/types'
  import { formatDate, formatRelative } from '@jiujiu/shared/utils'
  import { ElMessage } from 'element-plus'
  import { Download, Refresh, Search } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantCustomer' })

  const tabs = [
    { label: '全部', value: 'all' as const },
    { label: '普通客户', value: 'normal' as const },
    { label: '会员客户', value: 'vip' as const },
    { label: '分佣 / 代理', value: 'agency' as const },
    { label: '黑名单', value: 'blacklist' as const }
  ]

  const tier = ref<typeof tabs[number]['value']>('all')
  const keyword = ref('')
  const loading = ref(false)
  const all = ref<User[]>([])
  const list = ref<User[]>([])
  const detailOpen = ref(false)
  const current = ref<User>()

  /** 客户层级判定：用 id 哈希派生稳定的层级（接真后端时改读 user.tier 字段） */
  type CustomerTier = 'normal' | 'vip' | 'agency'
  function tierOf(u: User): CustomerTier {
    if (u.status === 'disabled') return 'normal'
    const c = u.id.charCodeAt(u.id.length - 1)
    if (c % 7 === 0) return 'agency'
    if (c % 4 === 0) return 'vip'
    return 'normal'
  }
  function isVip(u: User) {
    return tierOf(u) === 'vip'
  }
  function isAgency(u: User) {
    return tierOf(u) === 'agency'
  }

  function tierMetaOf(t: CustomerTier) {
    return (
      {
        normal: { label: '普通', color: '#3B82F6', tagType: 'info' as const, priceLabel: '零售价' },
        vip: { label: '会员', color: '#A855F7', tagType: 'warning' as const, priceLabel: '会员价' },
        agency: { label: '分佣', color: '#FF4D2D', tagType: 'danger' as const, priceLabel: '批发价' }
      }
    )[t]
  }

  const vipCount = computed(() => all.value.filter(isVip).length)
  const agencyCount = computed(() => all.value.filter(isAgency).length)
  const blacklistCount = computed(() => all.value.filter((u) => u.status === 'disabled').length)

  const filteredList = computed(() => {
    if (!keyword.value) return list.value
    const kw = keyword.value.toLowerCase()
    return list.value.filter(
      (u) => u.nickname.toLowerCase().includes(kw) || (u.phone || '').includes(kw)
    )
  })

  function countOf(t: typeof tabs[number]['value']) {
    if (t === 'all') return all.value.length
    if (t === 'vip') return all.value.filter(isVip).length
    if (t === 'agency') return all.value.filter(isAgency).length
    if (t === 'blacklist') return all.value.filter((u) => u.status === 'disabled').length
    return all.value.filter((u) => tierOf(u) === 'normal' && u.status !== 'disabled').length
  }

  function tagsOf(u: User): string[] {
    const tags: string[] = []
    const t = tierOf(u)
    if (t === 'vip') tags.push('会员')
    if (t === 'agency') tags.push('分佣')
    const c = u.id.charCodeAt(u.id.length - 1)
    if (c % 3 === 0) tags.push('高客单')
    if (c % 5 === 0) tags.push('复购')
    if (c % 8 === 0) tags.push('忠诚')
    return tags
  }

  function totalConsumeOf(u: User) {
    return (u.id.charCodeAt(u.id.length - 1) * 137 + 800).toLocaleString()
  }

  function orderCountOf(u: User) {
    return (u.id.charCodeAt(u.id.length - 1) % 12) + 1
  }

  function avgOrderOf(u: User) {
    const total = u.id.charCodeAt(u.id.length - 1) * 137 + 800
    const cnt = (u.id.charCodeAt(u.id.length - 1) % 12) + 1
    return '¥' + Math.round(total / cnt).toLocaleString()
  }

  function openDetail(u: User) {
    current.value = u
    detailOpen.value = true
  }

  function toggleBlacklist(u: User) {
    u.status = u.status === 'disabled' ? 'active' : 'disabled'
    ElMessage.success(u.status === 'disabled' ? '已加入黑名单' : '已移出黑名单')
  }

  async function loadData() {
    loading.value = true
    try {
      // 全量先拿一次（保证统计与 tabs count 准确），再前端按 tier 筛
      const fetched = await fetchCustomers('all')
      all.value = fetched
      if (tier.value === 'all') {
        list.value = fetched
      } else if (tier.value === 'blacklist') {
        list.value = fetched.filter((u) => u.status === 'disabled')
      } else if (tier.value === 'vip') {
        list.value = fetched.filter(isVip)
      } else if (tier.value === 'agency') {
        list.value = fetched.filter(isAgency)
      } else {
        list.value = fetched.filter((u) => tierOf(u) === 'normal' && u.status !== 'disabled')
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-customer {
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

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px 12px;
    }
  }

  .mp-filters {
    display: flex;
    gap: 12px;
    margin-top: 6px;
  }

  .mp-row-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* === 抽屉 === */

  .mp-detail {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-detail__hero {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--art-border-color, #e5e7eb);
  }

  .mp-detail__card {
    border-radius: 10px;
    background: #fafbfc;

    :deep(.el-card__body) {
      padding: 14px 16px;
    }
  }

  .mp-stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .mp-stat {
    text-align: center;
  }

  .mp-stat__val {
    font-size: 20px;
    font-weight: 600;
  }

  .mp-stat__lbl {
    font-size: 12px;
    color: var(--art-gray-500, #6b7280);
    margin-top: 4px;
  }

  .mp-detail__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 6px;
  }
</style>
