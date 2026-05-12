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
    saveMerchantCategories
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

  /** 平台分类（mock 只读） */
  const PLATFORM_TREE: TreeNode[] = [
    {
      id: 'pf-1',
      parentId: null,
      name: '客厅家具',
      icon: 'ri:sofa-line',
      sortOrder: 1,
      visible: true,
      productCount: 128,
      children: [
        { id: 'pf-1-1', parentId: 'pf-1', name: '沙发', icon: 'ri:sofa-line', visible: true, productCount: 56 },
        { id: 'pf-1-2', parentId: 'pf-1', name: '茶几', icon: 'ri:table-line', visible: true, productCount: 32 },
        { id: 'pf-1-3', parentId: 'pf-1', name: '电视柜', icon: 'ri:tv-line', visible: true, productCount: 24 },
        { id: 'pf-1-4', parentId: 'pf-1', name: '边几', icon: 'ri:table-line', visible: true, productCount: 16 }
      ]
    },
    {
      id: 'pf-2',
      parentId: null,
      name: '餐厅家具',
      icon: 'ri:restaurant-line',
      sortOrder: 2,
      visible: true,
      productCount: 76,
      children: [
        { id: 'pf-2-1', parentId: 'pf-2', name: '餐桌', icon: 'ri:table-line', visible: true, productCount: 40 },
        { id: 'pf-2-2', parentId: 'pf-2', name: '餐椅', icon: 'ri:armchair-line', visible: true, productCount: 28 },
        { id: 'pf-2-3', parentId: 'pf-2', name: '餐边柜', icon: 'ri:archive-line', visible: true, productCount: 8 }
      ]
    },
    {
      id: 'pf-3',
      parentId: null,
      name: '卧室家具',
      icon: 'ri:hotel-bed-line',
      sortOrder: 3,
      visible: true,
      productCount: 92,
      children: [
        { id: 'pf-3-1', parentId: 'pf-3', name: '床', icon: 'ri:hotel-bed-line', visible: true, productCount: 48 },
        { id: 'pf-3-2', parentId: 'pf-3', name: '床垫', icon: 'ri:hotel-line', visible: true, productCount: 22 },
        { id: 'pf-3-3', parentId: 'pf-3', name: '衣柜', icon: 'ri:archive-line', visible: true, productCount: 22 }
      ]
    },
    {
      id: 'pf-4',
      parentId: null,
      name: '灯具',
      icon: 'ri:lightbulb-line',
      sortOrder: 4,
      visible: true,
      productCount: 58,
      children: []
    }
  ]

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

  async function loadData() {
    if (source.value === 'platform') {
      treeData.value = JSON.parse(JSON.stringify(PLATFORM_TREE))
    } else {
      // 自定义：先读 localStorage，没有就从 shared mock 转换
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
      const flat = await fetchMerchantCategories()
      treeData.value = flat.map((c, i) => ({
        ...c,
        visible: true,
        sortOrder: i + 1,
        productCount: Math.floor(Math.random() * 20),
        children: []
      }))
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
