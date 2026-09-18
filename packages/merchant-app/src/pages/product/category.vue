<script setup lang="ts">
import { appFeedback } from '@jiujiu/shared'
/**
 * MA-07 · 分类管理
 *
 * 平台/厂家分类切换 + 树形展开 + 排序（上移/下移）+ 新增/编辑/删除
 */
import { ref, computed, onMounted } from 'vue'
import { categoryService } from '../../services/product'
import type { Category } from '@jiujiu/shared/types'
type Tab = 'platform' | 'merchant'

const tab = ref<Tab>('merchant')
const platformList = ref<Category[]>([])
const merchantList = ref<Category[]>([])
const expanded = ref<Set<string>>(new Set())

const showEditor = ref(false)
const editing = ref<{ id?: string; name: string; parentId: string | null }>({ name: '', parentId: null })

const TABS = [
  { key: 'merchant' as Tab, label: '厂家自定义' },
  { key: 'platform' as Tab, label: '平台分类' },
]

const currentRoots = computed(() => {
  const list = tab.value === 'platform' ? platformList.value : merchantList.value
  return list.filter((c) => c.parentId === null).sort((a, b) => a.sort - b.sort)
})

function childrenOf(parentId: string) {
  const list = tab.value === 'platform' ? platformList.value : merchantList.value
  return list.filter((c) => c.parentId === parentId).sort((a, b) => a.sort - b.sort)
}

function isExpanded(id: string) {
  return expanded.value.has(id)
}
function toggleExpand(id: string) {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expanded.value = s
}

async function load() {
  try {
    const [p, m] = await Promise.all([
      categoryService.platformList(),
      categoryService.merchantList(),
    ])
    platformList.value = p
    merchantList.value = m
  } catch {
    // ignore
  }
}

function openAdd(parentId: string | null = null) {
  editing.value = { name: '', parentId }
  showEditor.value = true
}
function openEdit(c: Category) {
  if (tab.value === 'platform') {
    appFeedback.showToast({ title: '平台分类不可编辑', icon: 'none' })
    return
  }
  editing.value = { id: c.id, name: c.name, parentId: c.parentId }
  showEditor.value = true
}

async function saveCategory() {
  if (!editing.value.name) {
    appFeedback.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  if (editing.value.id) {
    await categoryService.update(editing.value.id, { name: editing.value.name })
    appFeedback.showToast({ title: '已更新' })
  } else {
    await categoryService.create({
      name: editing.value.name,
      parentId: editing.value.parentId,
      type: 'merchant',
    })
    appFeedback.showToast({ title: '已新增' })
  }
  showEditor.value = false
  load()
}

function removeCat(c: Category) {
  if (tab.value === 'platform') return
  appFeedback.showModal({
    title: '删除分类',
    content: `确定删除"${c.name}"？该分类下的商品将变为未分类。`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (r.confirm) {
        await categoryService.remove(c.id)
        appFeedback.showToast({ title: '已删除' })
        load()
      }
    },
  })
}

/**
 * 持久化排序:本地交换两项 sort 后,把同级所有 ID 按新顺序提交给后端
 *
 * categoryService.sort(ids) → POST /api/v1/m/categories/sort 写入 sort 值,
 * 保证刷新后顺序与拖拽结果一致(原实现只改本地内存,导致刷新就还原)
 */
async function persistSort(parentId: string | null) {
  const siblings = merchantList.value
    .filter((x) => x.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
  const ids = siblings.map((x) => x.id)
  try {
    await categoryService.sort(ids)
  } catch (e: any) {
    appFeedback.showToast({ title: e?.message || '排序保存失败', icon: 'none' })
    // 失败时重新拉取,避免本地与后端不一致
    await load()
  }
}

async function moveUp(c: Category) {
  if (tab.value === 'platform') return
  const list = merchantList.value
    .filter((x) => x.parentId === c.parentId)
    .sort((a, b) => a.sort - b.sort)
  const idx = list.findIndex((x) => x.id === c.id)
  if (idx <= 0) return
  const prev = list[idx - 1]
  const tmp = c.sort
  c.sort = prev.sort
  prev.sort = tmp
  merchantList.value = [...merchantList.value]
  await persistSort(c.parentId)
}
async function moveDown(c: Category) {
  if (tab.value === 'platform') return
  const list = merchantList.value
    .filter((x) => x.parentId === c.parentId)
    .sort((a, b) => a.sort - b.sort)
  const idx = list.findIndex((x) => x.id === c.id)
  if (idx < 0 || idx === list.length - 1) return
  const next = list[idx + 1]
  const tmp = c.sort
  c.sort = next.sort
  next.sort = tmp
  merchantList.value = [...merchantList.value]
  await persistSort(c.parentId)
}

onMounted(load)
</script>

<template>
  <wd-config-provider
    :theme="$jwTheme.resolvedTheme"
    :theme-vars="$jwTheme.themeVars"
    custom-class="jw-theme-root"
  >
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />
  <view class="page">
    <wd-navbar title="分类管理" right-text="完成" @click-right="uni.navigateBack()"  @click-left="$jwNav.back()" left-arrow fixed placeholder safe-area-inset-top custom-class="jw-glass-navbar" />

    <view class="header">
      <wd-tabs v-model="tab"  color="var(--brand-primary)">
        <wd-tab
          v-for="item in TABS"
          :key="item.key"
          :name="item.key"
          :title="item.label"
          :badge-props="(item as any).badge ? { value: (item as any).badge, max: 99 } : undefined"
        />
      </wd-tabs>
      <view v-if="tab === 'merchant'" class="add-row" @click="openAdd(null)">
        <text class="add-icon">＋</text>
        <text>新增顶级分类</text>
      </view>
    </view>

    <view class="tree" v-if="currentRoots.length">
      <view v-for="root in currentRoots" :key="root.id" class="tree-root">
        <view class="row root-row" @click="toggleExpand(root.id)">
          <view class="row-left">
            <text class="caret">{{ childrenOf(root.id).length ? (isExpanded(root.id) ? '▼' : '▶') : '·' }}</text>
            <text class="row-name">{{ root.name }}</text>
            <wd-tag v-if="tab === 'merchant'"  :type="$jwTagType('info')" :plain="true" round>{{ "自定义" }}</wd-tag>
            <text class="row-count">{{ childrenOf(root.id).length }} 子项</text>
          </view>
          <view class="row-actions" @click.stop>
            <text v-if="tab === 'merchant'" class="act" @click="moveUp(root)">↑</text>
            <text v-if="tab === 'merchant'" class="act" @click="moveDown(root)">↓</text>
            <text v-if="tab === 'merchant'" class="act" @click="openAdd(root.id)">＋</text>
            <text v-if="tab === 'merchant'" class="act" @click="openEdit(root)">✎</text>
            <text v-if="tab === 'merchant'" class="act danger" @click="removeCat(root)">✕</text>
          </view>
        </view>
        <view v-if="isExpanded(root.id)" class="sub-list">
          <view v-for="sub in childrenOf(root.id)" :key="sub.id" class="row sub-row">
            <view class="row-left">
              <text class="indent">└</text>
              <text class="row-name">{{ sub.name }}</text>
            </view>
            <view class="row-actions">
              <text v-if="tab === 'merchant'" class="act" @click="moveUp(sub)">↑</text>
              <text v-if="tab === 'merchant'" class="act" @click="moveDown(sub)">↓</text>
              <text v-if="tab === 'merchant'" class="act" @click="openEdit(sub)">✎</text>
              <text v-if="tab === 'merchant'" class="act danger" @click="removeCat(sub)">✕</text>
            </view>
          </view>
          <view v-if="tab === 'merchant'" class="sub-add" @click="openAdd(root.id)">
            ＋ 新增子分类
          </view>
        </view>
      </view>
    </view>
    <wd-status-tip v-else  image="content" :tip="['暂无分类', '点击上方按钮新增'].filter(Boolean).join(' · ')" />

    <view v-if="tab === 'platform'" class="tip">
      <text>平台分类由后台统一维护，商家不可编辑</text>
    </view>

    <!-- 编辑浮层 -->
    <wd-popup v-model="showEditor" position="bottom" custom-class="sheet" safe-area-inset-bottom root-portal>
      <view class="sheet-content">
        <view class="sheet-head">
          <text>{{ editing.id ? '编辑分类' : '新增分类' }}</text>
          <text class="close" @click="showEditor = false">✕</text>
        </view>
        <view class="sheet-body">
          <view class="form-row">
            <text class="form-label">分类名称</text>
            <wd-input no-border v-model="editing.name" class="form-input" placeholder="不超过 10 字" maxlength="10"  />
          </view>
          <view class="form-row" v-if="editing.parentId">
            <text class="form-label">上级</text>
            <text class="form-text">{{ merchantList.find(c => c.id === editing.parentId)?.name || '—' }}</text>
          </view>
          <view class="form-row" v-else>
            <text class="form-label">类型</text>
            <text class="form-text">顶级分类</text>
          </view>
        </view>
        <view class="sheet-footer">
          <wd-button block plain size="large" @click="showEditor = false">取消</wd-button>
          <wd-button block type="primary" size="large" @click="saveCategory">保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>

  </wd-config-provider>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 40rpx;
}
.header {
  background: var(--bg-card);
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.add-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 999rpx;
  font-size: 22rpx;
  .add-icon { font-size: 24rpx; }
}
.tree {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.tree-root {
  background: var(--bg-card);
  border-radius: 16rpx;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  &.root-row { background: var(--bg-page); }
  &:last-child { border-bottom: none; }
  .row-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12rpx;
    .caret {
      width: 24rpx;
      font-size: 22rpx;
      color: var(--text-tertiary);
      text-align: center;
    }
    .indent {
      width: 24rpx;
      color: var(--text-tertiary);
      font-size: 22rpx;
    }
    .row-name { font-size: 28rpx; font-weight: 600; color: var(--text-primary); }
    .row-count { margin-left: auto; font-size: 20rpx; color: var(--text-tertiary); }
  }
  .row-actions {
    display: flex;
    gap: 8rpx;
    .act {
      width: 48rpx;
      height: 48rpx;
      border-radius: 50%;
      background: var(--bg-page);
      text-align: center;
      line-height: 48rpx;
      font-size: 24rpx;
      color: var(--text-secondary);
      &.danger { color: var(--status-error); }
    }
  }
}
.sub-list {
  background: var(--bg-card);
}
.sub-row {
  padding-left: 56rpx;
  background: var(--bg-card);
  .row-name { font-size: 26rpx; font-weight: 500; }
}
.sub-add {
  padding: 16rpx 56rpx;
  font-size: 24rpx;
  color: var(--brand-primary);
  border-top: 1rpx dashed var(--border-light);
}
.tip {
  padding: 16rpx 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex; align-items: center; justify-content: center;
  padding: 0 48rpx;
}
.sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 20rpx;
  overflow: hidden;
}
.sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  font-size: 30rpx; font-weight: 700;
  .close { font-size: 28rpx; color: var(--text-tertiary); }
}
.sheet-body {
  padding: 24rpx;
  display: flex; flex-direction: column; gap: 16rpx;
}
.form-row {
  display: flex; align-items: center; gap: 16rpx;
  .form-label { width: 120rpx; font-size: 26rpx; color: var(--text-secondary); }
  .form-input {
    flex: 1;
    background: var(--bg-page);
    border-radius: 8rpx;
    padding: 12rpx 16rpx;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .form-text { flex: 1; font-size: 26rpx; color: var(--text-primary); }
}
.sheet-footer {
  display: flex; gap: 12rpx;
  padding: 16rpx 24rpx 24rpx;
  .btn {
    flex: 1; height: 80rpx; border-radius: 999rpx;
    text-align: center; line-height: 80rpx;
    font-size: 26rpx; font-weight: 600;
    &.ghost { background: var(--bg-hover); color: var(--text-primary); }
    &.primary { background: var(--brand-gradient); color: #fff; }
  }
}
</style>
