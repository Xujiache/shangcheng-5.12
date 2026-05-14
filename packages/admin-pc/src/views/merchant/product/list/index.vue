<!-- 商家 PC · 商品管理（S3-T2） -->
<template>
  <div class="mp-product-list">
    <!-- 顶部 -->
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">商品管理</h2>
        <p class="mt-1 text-sm text-g-500">共 {{ filteredProducts.length }} 件商品 · 销售总额 ¥{{ totalSales.toLocaleString() }}</p>
      </div>
      <div class="flex gap-2">
        <ElButton @click="loadData" :icon="Refresh" plain>刷新</ElButton>
        <ElButton @click="exportCsv" :icon="Download" plain>导出</ElButton>
        <ElButton type="primary" :icon="Plus" @click="router.push('/merchant/product/add')">
          添加商品
        </ElButton>
      </div>
    </div>

    <!-- 价格显示规则（店铺级 · 改一次全店生效） -->
    <ElCard shadow="never" class="mp-price-rule" :body-style="{ padding: '20px 24px' }">
      <div class="mp-price-rule__head">
        <div>
          <div class="mp-price-rule__title">
            <ArtSvgIcon icon="ri:price-tag-2-fill" class="mp-price-rule__title-icon" />
            价格显示规则
            <ElTag size="small" type="danger" effect="dark" round class="ml-2">核心</ElTag>
          </div>
          <div class="mp-price-rule__sub">
            按对方身份显示对应价格。决定客户能否看到价格、能看到什么价。
            <b class="text-primary">改一次，全店所有商品立即生效。</b>
          </div>
        </div>
        <ElButton text type="primary" size="small" @click="resetPriceRule">恢复默认</ElButton>
      </div>

      <div class="mp-price-rule__list">
        <!-- 未登录访客 -->
        <div class="mp-rule-row">
          <div class="mp-rule-row__main">
            <ArtSvgIcon icon="ri:user-line" class="mp-rule-row__icon" :style="{ color: '#9CA3AF' }" />
            <div>
              <div class="mp-rule-row__label">未登录访客</div>
              <div class="mp-rule-row__hint">未授权小程序的访客</div>
            </div>
          </div>
          <div class="mp-rule-row__action">
            <ElSwitch
              v-model="priceRule.guestAllow"
              size="large"
              inline-prompt
              active-text="允许浏览"
              inactive-text="禁止进入"
              @change="onRuleChange('未登录访客')"
            />
          </div>
        </div>

        <!-- 普通客户 -->
        <div class="mp-rule-row">
          <div class="mp-rule-row__main">
            <ArtSvgIcon icon="ri:user-3-line" class="mp-rule-row__icon" :style="{ color: '#3B82F6' }" />
            <div>
              <div class="mp-rule-row__label">普通客户</div>
              <div class="mp-rule-row__hint">已登录但未授权门店</div>
            </div>
          </div>
          <div class="mp-rule-row__action">
            <ElRadioGroup
              v-model="priceRule.customerPrice"
              size="default"
              @change="onRuleChange('普通客户')"
            >
              <ElRadioButton value="retail">显示零售价</ElRadioButton>
              <ElRadioButton value="hidden">不显示价格</ElRadioButton>
            </ElRadioGroup>
          </div>
        </div>

        <!-- 授权门店 -->
        <div class="mp-rule-row">
          <div class="mp-rule-row__main">
            <ArtSvgIcon icon="ri:store-3-line" class="mp-rule-row__icon" :style="{ color: '#FF4D2D' }" />
            <div>
              <div class="mp-rule-row__label">授权门店</div>
              <div class="mp-rule-row__hint">已申请代理 / 加盟门店</div>
            </div>
          </div>
          <div class="mp-rule-row__action">
            <ElRadioGroup
              v-model="priceRule.agencyPrice"
              size="default"
              @change="onRuleChange('授权门店')"
            >
              <ElRadioButton value="wholesale">批发价</ElRadioButton>
              <ElRadioButton value="retail">零售价</ElRadioButton>
            </ElRadioGroup>
          </div>
        </div>

        <!-- 会员客户 -->
        <div class="mp-rule-row">
          <div class="mp-rule-row__main">
            <ArtSvgIcon icon="ri:vip-crown-2-line" class="mp-rule-row__icon" :style="{ color: '#A855F7' }" />
            <div>
              <div class="mp-rule-row__label">会员客户</div>
              <div class="mp-rule-row__hint">付费 / 邀请制会员</div>
            </div>
          </div>
          <div class="mp-rule-row__action">
            <ElRadioGroup
              v-model="priceRule.memberPrice"
              size="default"
              @change="onRuleChange('会员客户')"
            >
              <ElRadioButton value="member">会员价</ElRadioButton>
              <ElRadioButton value="retail">零售价</ElRadioButton>
            </ElRadioGroup>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- Tab + 搜索 -->
    <ElCard shadow="never" class="mp-toolbar">
      <ElTabs v-model="status" @tab-change="loadData" class="mp-status-tabs">
        <ElTabPane
          v-for="t in statusTabs"
          :key="t.value"
          :label="`${t.label} (${countOf(t.value)})`"
          :name="t.value"
        />
      </ElTabs>
      <div class="mp-toolbar__filters">
        <ElInput
          v-model="keyword"
          placeholder="搜索商品名"
          clearable
          :prefix-icon="Search"
          style="width: 260px"
          @input="onSearchInput"
        />
        <ElSelect v-model="categoryId" placeholder="全部分类" clearable style="width: 160px">
          <ElOption label="餐厅家具" value="cat-1" />
          <ElOption label="客厅家具" value="cat-2" />
          <ElOption label="卧室家具" value="cat-3" />
        </ElSelect>
        <div class="flex-1"></div>
        <transition name="el-fade-in-linear">
          <div v-if="selectedIds.length" class="mp-batch-bar">
            已选 <b>{{ selectedIds.length }}</b> 项 ·
            <ElButton text type="primary" size="small" @click="batchUpdate('active')">批量上架</ElButton>
            <ElDivider direction="vertical" />
            <ElButton text type="primary" size="small" @click="batchUpdate('offline')">批量下架</ElButton>
            <ElDivider direction="vertical" />
            <ElButton text type="danger" size="small" @click="batchRemove">批量删除</ElButton>
          </div>
        </transition>
      </div>
    </ElCard>

    <!-- 表格 -->
    <ElCard shadow="never" class="mp-table-card" v-loading="loading">
      <ElTable
        :data="pagedProducts"
        @selection-change="onSelectionChange"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无商品 · 试试 添加商品 按钮"
      >
        <ElTableColumn type="selection" width="48" align="center" />
        <ElTableColumn label="商品" min-width="320">
          <template #default="{ row }">
            <div class="mp-product-cell">
              <ElImage
                :src="row.images?.[0]"
                fit="cover"
                style="width: 56px; height: 56px; border-radius: 8px"
              >
                <template #error>
                  <div class="image-fallback"><ArtSvgIcon icon="ri:image-line" /></div>
                </template>
              </ElImage>
              <div class="mp-product-cell__text">
                <div class="mp-product-cell__name">{{ row.name }}</div>
                <div class="mp-product-cell__tags">
                  <ElTag
                    v-for="tag in row.tags?.slice(0, 2)"
                    :key="tag"
                    size="small"
                    type="info"
                    effect="plain"
                  >
                    {{ tag }}
                  </ElTag>
                  <span v-if="row.pricingMode === 'by-size'" class="badge-bysize">按尺寸定价</span>
                </div>
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="零售价" width="140">
          <template #default="{ row }">
            <span class="price">¥{{ row.priceRetailMin }}</span>
            <span v-if="row.priceRetailMax > row.priceRetailMin" class="price-range">
              - ¥{{ row.priceRetailMax }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="库存" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ low: row.totalStock < 20 }">{{ row.totalStock }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="销量" prop="sales" width="100" align="center" sortable />

        <ElTableColumn label="状态" width="130" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTypeOf(row.status)" effect="light" size="small">
              {{ statusLabelOf(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton text type="primary" size="small" @click="editProduct(row)">编辑</ElButton>
            <ElDivider direction="vertical" />
            <ElButton
              text
              type="primary"
              size="small"
              v-if="row.status !== 'active'"
              @click="toggleStatus(row, 'active')"
            >
              上架
            </ElButton>
            <ElButton
              text
              type="warning"
              size="small"
              v-else
              @click="toggleStatus(row, 'offline')"
            >
              下架
            </ElButton>
            <ElDivider direction="vertical" />
            <ElDropdown trigger="click" @command="(c: string) => onMoreAction(c, row)">
              <ElButton text type="info" size="small">更多 <ElIcon><ArrowDown /></ElIcon></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="copy">复制链接</ElDropdownItem>
                  <ElDropdownItem command="stats">数据分析</ElDropdownItem>
                  <ElDropdownItem command="delete" divided>
                    <span class="text-danger">删除</span>
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mp-pagination">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredProducts.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMerchantProducts,
    updateProductStatus,
    removeProducts
  } from '@/api/merchant-business'
  import { useShopPriceVisibility } from '@/composables/useShopPriceVisibility'
  import type { Product } from '@jiujiu/shared/types'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    ArrowDown,
    Download,
    Plus,
    Refresh,
    Search
  } from '@element-plus/icons-vue'

  /** 店铺级价格显示规则（localStorage 持久化） */
  const { state: priceRule, reset: resetPriceRuleStore } = useShopPriceVisibility()
  function onRuleChange(tierName: string) {
    ElMessage.success(`${tierName} 的价格规则已保存 · 全店生效`)
  }
  function resetPriceRule() {
    resetPriceRuleStore()
    ElMessage.success('已恢复默认规则')
  }

  defineOptions({ name: 'MerchantProductList' })

  const router = useRouter()

  const statusTabs = [
    { label: '全部', value: 'all' as const },
    { label: '在售', value: 'active' as const },
    { label: '已售罄', value: 'sold-out' as const },
    { label: '待审核', value: 'pending' as const },
    { label: '已驳回', value: 'rejected' as const },
    { label: '草稿', value: 'draft' as const }
  ]

  const status = ref<typeof statusTabs[number]['value']>('all')
  const keyword = ref('')
  const categoryId = ref('')
  const page = ref(1)
  const pageSize = ref(10)
  const loading = ref(false)

  const allProducts = ref<Product[]>([])
  const selectedIds = ref<string[]>([])

  const filteredProducts = computed(() => {
    let list = allProducts.value
    if (status.value !== 'all') list = list.filter((p) => p.status === status.value)
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(kw))
    }
    return list
  })

  const pagedProducts = computed(() =>
    filteredProducts.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )

  const totalSales = computed(() =>
    filteredProducts.value.reduce((acc, p) => acc + (p.sales || 0) * (p.priceRetailMin || 0), 0)
  )

  function countOf(s: typeof statusTabs[number]['value']) {
    if (s === 'all') return allProducts.value.length
    return allProducts.value.filter((p) => p.status === s).length
  }

  function statusTypeOf(s: string) {
    return (
      {
        active: 'success',
        'sold-out': 'info',
        pending: 'warning',
        rejected: 'danger',
        draft: 'info'
      } as Record<string, 'success' | 'info' | 'warning' | 'danger'>
    )[s] || 'info'
  }

  function statusLabelOf(s: string) {
    return (
      {
        active: '在售',
        'sold-out': '已售罄',
        pending: '待审核',
        rejected: '已驳回',
        draft: '草稿'
      } as Record<string, string>
    )[s] || s
  }

  function onSelectionChange(rows: Product[]) {
    selectedIds.value = rows.map((r) => r.id)
  }

  function onSearchInput() {
    page.value = 1
  }

  function editProduct(p: Product) {
    router.push(`/merchant/product/add?id=${p.id}`)
  }

  async function toggleStatus(p: Product, target: Product['status']) {
    await updateProductStatus([p.id], target)
    p.status = target
    ElMessage.success(target === 'active' ? '已上架' : '已下架')
  }

  async function batchUpdate(target: Product['status']) {
    await updateProductStatus(selectedIds.value, target)
    allProducts.value.forEach((p) => {
      if (selectedIds.value.includes(p.id)) p.status = target
    })
    ElMessage.success(`已批量${target === 'active' ? '上架' : '下架'} ${selectedIds.value.length} 件`)
    selectedIds.value = []
  }

  async function batchRemove() {
    try {
      await ElMessageBox.confirm(
        `确定删除选中的 ${selectedIds.value.length} 件商品？此操作不可恢复。`,
        '危险操作',
        { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
      )
      await removeProducts(selectedIds.value)
      allProducts.value = allProducts.value.filter((p) => !selectedIds.value.includes(p.id))
      ElMessage.success(`已删除 ${selectedIds.value.length} 件`)
      selectedIds.value = []
    } catch {
      /* user cancel */
    }
  }

  function onMoreAction(c: string, row: Product) {
    if (c === 'copy') {
      navigator.clipboard?.writeText(`https://shop.jiujiu/p/${row.id}`)
      ElMessage.success('商品链接已复制')
    } else if (c === 'stats') {
      router.push('/merchant/dashboard')
    } else if (c === 'delete') {
      ElMessageBox.confirm('确认删除该商品？', '提示', { type: 'warning' })
        .then(async () => {
          await removeProducts([row.id])
          allProducts.value = allProducts.value.filter((p) => p.id !== row.id)
          ElMessage.success('已删除')
        })
        .catch(() => {})
    }
  }

  function exportCsv() {
    ElMessage.success(`已导出 ${filteredProducts.value.length} 条商品数据`)
  }

  async function loadData() {
    loading.value = true
    try {
      allProducts.value = await fetchMerchantProducts()
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-product-list {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 4px 0;
  }

  .mp-toolbar {
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 8px 16px 12px;
    }
  }

  /* ============ 店铺价格显示规则 ============ */
  .mp-price-rule {
    border-radius: 14px;
    border: 1px solid #fde6df;
    background: linear-gradient(135deg, #fff8f5 0%, #fffbf3 100%);
  }

  .mp-price-rule__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 1px dashed #f5d8cd;
    margin-bottom: 4px;
    gap: 16px;
  }

  .mp-price-rule__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .mp-price-rule__title-icon {
    color: var(--el-color-primary, #ff4d2d);
    font-size: 20px;
  }

  .mp-price-rule__sub {
    font-size: 12px;
    color: #909399;
    margin-top: 6px;
    line-height: 1.6;
  }

  .mp-price-rule__list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px 24px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  .mp-rule-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 8px;
    border-bottom: 1px dashed #f5d8cd;

    &:nth-last-child(-n + 2) {
      border-bottom: none;
    }
  }

  .mp-rule-row__main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .mp-rule-row__icon {
    font-size: 22px;
    flex-shrink: 0;
  }

  .mp-rule-row__label {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .mp-rule-row__hint {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }

  .mp-rule-row__action {
    flex-shrink: 0;
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-status-tabs {
    :deep(.el-tabs__nav-wrap)::after {
      height: 1px;
    }

    :deep(.el-tabs__header) {
      margin: 0 0 8px;
    }
  }

  .mp-toolbar__filters {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0 0;
  }

  .mp-batch-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(255, 77, 45, 0.08);
    color: var(--art-gray-700, #374151);
    border-radius: 8px;
    font-size: 13px;
  }

  .mp-table-card {
    border-radius: 12px;
    flex: 1;

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .mp-product-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .image-fallback {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f6f8;
    border-radius: 8px;
    color: #c0c4cc;
    font-size: 22px;
  }

  .mp-product-cell__text {
    flex: 1;
    min-width: 0;
  }

  .mp-product-cell__name {
    font-size: 14px;
    color: var(--art-gray-800, #1f2937);
    margin-bottom: 4px;
  }

  .mp-product-cell__tags {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }

  .badge-bysize {
    padding: 1px 8px;
    border-radius: 4px;
    font-size: 11px;
    background: rgba(255, 77, 45, 0.1);
    color: var(--el-color-primary, #ff4d2d);
  }

  .price {
    color: var(--el-color-primary, #ff4d2d);
    font-weight: 600;
    font-size: 14px;
  }

  .price-range {
    color: var(--art-gray-500, #9ca3af);
    font-size: 12px;
  }

  .low {
    color: #f56c6c;
    font-weight: 600;
  }

  .mp-pagination {
    display: flex;
    justify-content: flex-end;
    padding: 14px 18px;
  }

  .text-danger {
    color: var(--el-color-danger);
  }
</style>
