<!-- 商家 PC · 分类管理（S3-T4）-->
<template>
  <div class="mp-category">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">分类管理</h2>
        <p class="mt-1 text-sm text-g-500">拖拽节点可调整顺序，最多支持 3 级</p>
      </div>
      <div class="flex gap-2">
        <ElRadioGroup v-model="source" @change="onSourceChange">
          <ElRadioButton value="platform">
            <ArtSvgIcon icon="ri:building-line" class="mr-1" /> 平台分类
          </ElRadioButton>
          <ElRadioButton value="custom">
            <ArtSvgIcon icon="ri:store-2-line" class="mr-1" /> 自定义
          </ElRadioButton>
        </ElRadioGroup>
        <ElButton :icon="Refresh" @click="loadData" plain>刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="addRoot" :disabled="source === 'platform'">
          添加一级分类
        </ElButton>
      </div>
    </div>

    <ElAlert
      v-if="source === 'platform'"
      type="info"
      :closable="false"
      show-icon
      title="平台分类只读"
      description="平台分类由运营统一维护，所有商家共用。若需调整可切换到「自定义」创建自己的分类体系。"
    />

    <div class="mp-category__layout">
      <!-- 左：分类树 -->
      <ElCard shadow="never" class="mp-tree-card">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">分类列表（{{ flatCount }} 项）</span>
            <ElButton text type="primary" size="small" @click="saveOrder">保存排序</ElButton>
          </div>
        </template>
        <ElTree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          draggable
          @node-click="selectNode"
          @node-drop="onDrop"
        >
          <template #default="{ node, data }">
            <div
              class="mp-tree-node"
              :class="{ active: selectedNode?.id === data.id }"
            >
              <ArtSvgIcon
                :icon="data.icon || (data.parentId ? 'ri:folder-line' : 'ri:folder-open-line')"
                class="text-base text-g-500"
              />
              <span class="mp-tree-node__label">{{ data.name }}</span>
              <span class="mp-tree-node__count">{{ data.productCount || 0 }}</span>
              <div class="mp-tree-node__ops">
                <ElButton text size="small" :icon="Plus" @click.stop="addChild(data)" />
                <ElButton text size="small" :icon="Edit" @click.stop="renameNode(data)" />
                <ElButton text size="small" :icon="Delete" type="danger" @click.stop="removeNode(data)" />
              </div>
            </div>
          </template>
        </ElTree>
      </ElCard>

      <!-- 右：详情 -->
      <ElCard shadow="never" class="mp-detail-card">
        <template #header>
          <span class="font-semibold">{{ selectedNode ? '分类详情' : '请选择一个分类' }}</span>
        </template>
        <div v-if="selectedNode" class="mp-detail">
          <ElForm label-position="top">
            <ElFormItem label="分类名称">
              <ElInput v-model="selectedNode.name" @input="markDirty" />
            </ElFormItem>
            <ElFormItem label="图标（Remix Icon 名）">
              <ElInput
                v-model="selectedNode.icon"
                placeholder="如 ri:sofa-line"
                @input="markDirty"
              />
            </ElFormItem>
            <ElFormItem label="排序权重">
              <ElInputNumber v-model="selectedNode.sortOrder" :min="0" />
            </ElFormItem>
            <ElFormItem label="显示在商家端">
              <ElSwitch v-model="selectedNode.visible" @change="markDirty" />
            </ElFormItem>
            <ElFormItem label="关联商品数">
              <span class="text-lg font-medium">{{ selectedNode.productCount || 0 }}</span>
              <ElLink type="primary" :underline="false" class="ml-3" @click="goProducts">
                查看商品
              </ElLink>
            </ElFormItem>
          </ElForm>
        </div>
        <ElEmpty v-else description="点击左侧分类查看详情" />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchMerchantCategories,
    saveMerchantCategories,
    fetchPlatformCategoriesForMerchant
  } from '@/api/merchant-business'
  import type { Category } from '@jiujiu/shared/types'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantProductCategory' })

  const router = useRouter()

  interface TreeNode extends Category {
    children?: TreeNode[]
    visible?: boolean
    sortOrder?: number
    productCount?: number
  }

  const treeData = ref<TreeNode[]>([])
  const selectedNode = ref<TreeNode | null>(null)
  const dirty = ref(false)
  const source = ref<'platform' | 'custom'>('platform')
  const CUSTOM_KEY = 'jj_merchant_category_custom_v1'

  /**
   * 平台分类树
   *
   * 不再硬编码 demo 分类（"客厅家具/沙发"等）。
   * source='platform' 时由 loadData() 从后端 /api/v1/m/categories?type=platform 拉真数据。
   * 这里只声明一个空骨架，避免首次渲染前 undefined。
   */
  const PLATFORM_TREE: TreeNode[] = []

  function onSourceChange() {
    selectedNode.value = null
    loadData()
  }

  const flatCount = computed(() => {
    let c = 0
    const walk = (list: TreeNode[]) => {
      for (const n of list) {
        c++
        if (n.children?.length) walk(n.children)
      }
    }
    walk(treeData.value)
    return c
  })

  function markDirty() {
    dirty.value = true
  }

  function selectNode(data: TreeNode) {
    selectedNode.value = data
  }

  function addRoot() {
    const id = `cat-${Date.now()}`
    treeData.value.push({
      id,
      parentId: null,
      name: '新分类',
      icon: 'ri:folder-line',
      visible: true,
      sortOrder: treeData.value.length + 1,
      productCount: 0
    } as TreeNode)
    markDirty()
  }

  function addChild(parent: TreeNode) {
    const id = `cat-${Date.now()}`
    if (!parent.children) parent.children = []
    parent.children.push({
      id,
      parentId: parent.id,
      name: '子分类',
      icon: 'ri:folder-line',
      visible: true,
      sortOrder: parent.children.length + 1,
      productCount: 0
    } as TreeNode)
    markDirty()
  }

  async function renameNode(node: TreeNode) {
    try {
      const { value } = await ElMessageBox.prompt('新分类名', '重命名', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: node.name
      })
      if (value) {
        node.name = value
        markDirty()
      }
    } catch {
      /* cancel */
    }
  }

  async function removeNode(node: TreeNode) {
    try {
      await ElMessageBox.confirm(`删除 "${node.name}"？子分类一并删除。`, '危险操作', {
        type: 'warning'
      })
      const walk = (list: TreeNode[]): boolean => {
        const i = list.findIndex((n) => n.id === node.id)
        if (i >= 0) {
          list.splice(i, 1)
          return true
        }
        for (const n of list) {
          if (n.children && walk(n.children)) return true
        }
        return false
      }
      walk(treeData.value)
      selectedNode.value = null
      markDirty()
      ElMessage.success('已删除')
    } catch {
      /* cancel */
    }
  }

  function onDrop() {
    markDirty()
  }

  async function saveOrder() {
    if (!dirty.value) {
      ElMessage.info('暂无变更')
      return
    }
    await saveMerchantCategories(treeData.value as unknown as Category[])
    dirty.value = false
    ElMessage.success('已保存')
  }

  function goProducts() {
    router.push('/merchant/product/list')
  }

  /** 把后端返回的平铺分类列表组成树（parentId / children） */
  function buildTree(flat: Category[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []
    for (const c of flat) {
      map.set(c.id, { ...c, visible: true, sortOrder: c.sort ?? 0, productCount: 0, children: [] })
    }
    for (const n of map.values()) {
      if (n.parentId && map.has(n.parentId)) {
        const parent = map.get(n.parentId)!
        parent.children = parent.children || []
        parent.children.push(n)
      } else {
        roots.push(n)
      }
    }
    // 按 sort 升序
    const sortRec = (list: TreeNode[]) => {
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      list.forEach((n) => n.children && sortRec(n.children))
    }
    sortRec(roots)
    return roots
  }

  async function loadData() {
    if (source.value === 'platform') {
      // 拉真平台分类（type='platform' 由后端按权限返回）
      try {
        const flat = await fetchPlatformCategoriesForMerchant()
        treeData.value = buildTree(flat)
      } catch {
        treeData.value = PLATFORM_TREE
      }
    } else {
      // 自定义：先读 localStorage，没有就从后端拉真分类
      try {
        const raw = localStorage.getItem(CUSTOM_KEY)
        if (raw) {
          treeData.value = JSON.parse(raw)
          if (treeData.value.length) selectedNode.value = treeData.value[0]
          dirty.value = false
          return
        }
      } catch {
        /* ignore */
      }
      try {
        const flat = await fetchMerchantCategories()
        treeData.value = buildTree(flat)
      } catch {
        treeData.value = []
      }
    }
    if (treeData.value.length) selectedNode.value = treeData.value[0]
    dirty.value = false
  }

  // 持久化自定义分类
  watch(
    treeData,
    (v) => {
      if (source.value !== 'custom') return
      try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(v))
      } catch {
        /* ignore */
      }
    },
    { deep: true }
  )

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .mp-category {
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

  .mp-category__layout {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: 14px;
    flex: 1;
    min-height: 0;
  }

  .mp-tree-card,
  .mp-detail-card {
    border-radius: 12px;
  }

  .mp-tree-card :deep(.el-card__body) {
    max-height: calc(100vh - 240px);
    overflow-y: auto;
  }

  .mp-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 6px;

    &.active {
      background: rgba(255, 77, 45, 0.08);
      color: var(--el-color-primary, #ff4d2d);
    }
  }

  .mp-tree-node__label {
    flex: 1;
    font-size: 14px;
  }

  .mp-tree-node__count {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--art-bg-color, #fafbfc);
    color: var(--art-gray-500, #6b7280);
  }

  .mp-tree-node__ops {
    display: none;
    gap: 0;
  }

  .mp-tree-node:hover .mp-tree-node__ops {
    display: flex;
  }
</style>
