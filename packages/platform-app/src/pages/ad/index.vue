<script setup lang="ts">
/**
 * PA-05 · 广告管理（移动端全量实现）
 *
 * 改造前: 创建广告 / 编辑素材 / 修改时段 全部弹 modal 引导去 admin-pc。
 * 改造后: 全部能力上移动端,通过 FormSheet 完整实现 CRUD,后端真接口落库。
 *
 * 功能矩阵:
 *   - 广告位 (slots):  新建 / 改素材 (名称 / 投放对象 / 预览图) / 改时段 (start-end) / 暂停-恢复 / 删除
 *   - 创意   (creatives):新建 (标题 + 图 + 链接 + 投放槽位) / 编辑 (标题 + 图 + 时段) / 删除
 *   - 数据   (stats):    曝光排行 + 总曝光 + 平均 CTR (只读)
 *
 * 后端依赖:
 *   - POST / PUT / DELETE  /api/v1/p/ads/slots
 *   - POST / PUT / DELETE  /api/v1/p/ads/creatives
 *   - POST                 /api/v1/files/upload (bizType=misc)
 *
 * 兜底字段 (后端 AdSlot 模型暂无 preview/startAt/endAt):
 *   - 走 system_settings.business.adSlotMeta 落库, 详见 adService.updateSlot / loadSlotMetaMap。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { adService } from '../../services'
import type {
  AdSlot,
  AdCreativeRow,
  CreateAdSlotDto,
  UpdateAdSlotDto,
  CreateAdCreativeDto,
  UpdateAdCreativeDto,
} from '../../services'
import { pickAndUploadImage } from '../../utils/upload'
import { formatWan } from '@jiujiu/shared/utils'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import EmptyState from '../../components/empty-state/empty-state.vue'
import FormSheet from '../../components/form-sheet/form-sheet.vue'

type TabKey = 'slots' | 'create' | 'stats'

const tab = ref<TabKey>('slots')
const slots = ref<AdSlot[]>([])
const creatives = ref<AdCreativeRow[]>([])
const loading = ref(false)

const TABS: { key: TabKey; label: string }[] = [
  { key: 'slots', label: '广告位' },
  { key: 'create', label: '创意' },
  { key: 'stats', label: '数据' },
]

const STATUS_META: Record<string, { label: string; tint: string }> = {
  active: { label: '进行中', tint: '#52C41A' },
  paused: { label: '已暂停', tint: '#FAAD14' },
  ended: { label: '已结束', tint: '#86909C' },
  draft: { label: '草稿', tint: '#1296DB' },
  pending: { label: '待审', tint: '#FAAD14' },
  rejected: { label: '已驳回', tint: '#FF3B30' },
}

const TARGET_OPTIONS = [
  { value: 'customer', label: '客户(小程序)' },
  { value: 'factory', label: '厂家' },
  { value: 'store', label: '门店' },
  { value: 'all', label: '全部端' },
]
const TARGET_LABEL: Record<string, string> = {
  customer: '客户',
  factory: '厂家',
  store: '门店',
  all: '全端',
}

async function load() {
  loading.value = true
  try {
    const [slotList, creativeResp] = await Promise.all([
      adService.slots(),
      adService.creatives({ pageSize: 50 }),
    ])
    slots.value = slotList
    creatives.value = (creativeResp as any)?.list ?? []
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ============================================================
// 广告位:新建 sheet
// ============================================================
type SlotMode = 'create' | 'edit-asset' | 'edit-time'
const slotSheetOpen = ref(false)
const slotSheetMode = ref<SlotMode>('create')
const editingSlotId = ref<string | null>(null)
const slotSubmitting = ref(false)
const slotForm = reactive({
  name: '',
  target: 'customer',
  scene: '',
  preview: '',
  startAt: '',
  endAt: '',
})

function resetSlotForm() {
  slotForm.name = ''
  slotForm.target = 'customer'
  slotForm.scene = ''
  slotForm.preview = ''
  slotForm.startAt = ''
  slotForm.endAt = ''
}

function openCreateSlot() {
  resetSlotForm()
  editingSlotId.value = null
  slotSheetMode.value = 'create'
  slotSheetOpen.value = true
}

function openEditSlotAsset(s: AdSlot) {
  resetSlotForm()
  editingSlotId.value = s.id
  slotForm.name = s.name
  slotForm.target = s.target || 'customer'
  slotForm.scene = s.scene || ''
  slotForm.preview = s.preview || ''
  slotSheetMode.value = 'edit-asset'
  slotSheetOpen.value = true
}

function openEditSlotTime(s: AdSlot) {
  resetSlotForm()
  editingSlotId.value = s.id
  slotForm.name = s.name
  const today = new Date().toISOString().slice(0, 10)
  const next30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
  slotForm.startAt = s.startAt || today
  slotForm.endAt = s.endAt || next30
  slotSheetMode.value = 'edit-time'
  slotSheetOpen.value = true
}

const slotSheetTitle = computed(() => {
  if (slotSheetMode.value === 'create') return '新建广告位'
  if (slotSheetMode.value === 'edit-asset') return '修改广告位素材'
  return '修改投放时段'
})

const slotSheetConfirmDisabled = computed(() => {
  if (slotSheetMode.value === 'edit-time') {
    return !slotForm.startAt || !slotForm.endAt
  }
  return !slotForm.name.trim()
})

async function onPickSlotPreview() {
  try {
    const url = await pickAndUploadImage({ bizType: 'misc' })
    slotForm.preview = url
    uni.showToast({ title: '已上传', icon: 'success' })
  } catch (e: any) {
    if (!/cancel/i.test(e?.message || '')) {
      uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
    }
  }
}

async function submitSlotSheet() {
  if (slotSubmitting.value) return
  slotSubmitting.value = true
  try {
    if (slotSheetMode.value === 'create') {
      if (!slotForm.name.trim()) {
        uni.showToast({ title: '请填写广告位名称', icon: 'none' })
        return
      }
      const dto: CreateAdSlotDto = {
        name: slotForm.name.trim(),
        target: slotForm.target,
        scene: slotForm.scene.trim() || undefined,
        preview: slotForm.preview || undefined,
        startAt: slotForm.startAt || undefined,
        endAt: slotForm.endAt || undefined,
        status: 'active',
      }
      await adService.createSlot(dto)
      uni.showToast({ title: '已创建', icon: 'success' })
    } else if (slotSheetMode.value === 'edit-asset' && editingSlotId.value) {
      const dto: UpdateAdSlotDto = {
        name: slotForm.name.trim(),
        target: slotForm.target,
        scene: slotForm.scene.trim() || undefined,
        preview: slotForm.preview || undefined,
      }
      await adService.updateSlot(editingSlotId.value, dto)
      uni.showToast({ title: '已保存', icon: 'success' })
    } else if (slotSheetMode.value === 'edit-time' && editingSlotId.value) {
      if (!slotForm.startAt || !slotForm.endAt) {
        uni.showToast({ title: '请选择起止日期', icon: 'none' })
        return
      }
      if (slotForm.startAt > slotForm.endAt) {
        uni.showToast({ title: '结束日期不能早于开始', icon: 'none' })
        return
      }
      const dto: UpdateAdSlotDto = {
        startAt: slotForm.startAt,
        endAt: slotForm.endAt,
      }
      await adService.updateSlot(editingSlotId.value, dto)
      uni.showToast({ title: '时段已更新', icon: 'success' })
    }
    slotSheetOpen.value = false
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    slotSubmitting.value = false
  }
}

// ============================================================
// 广告位:暂停/恢复 + 删除 + 批量
// ============================================================
async function quickToggleAll() {
  const activeCount = slots.value.filter((s) => s.status === 'active').length
  const pausedCount = slots.value.filter((s) => s.status === 'paused').length
  if (activeCount + pausedCount === 0) {
    uni.showToast({ title: '暂无可操作的广告位', icon: 'none' })
    return
  }
  const willPause = activeCount > 0
  const title = willPause
    ? `批量暂停 ${activeCount} 个进行中广告位？`
    : `批量恢复 ${pausedCount} 个已暂停广告位？`
  uni.showModal({
    title: '批量操作',
    content: title,
    success: async (r) => {
      if (!r.confirm) return
      const target = willPause ? 'active' : 'paused'
      const next: 'active' | 'paused' = willPause ? 'paused' : 'active'
      const todo = slots.value.filter((s) => s.status === target)
      try {
        await Promise.all(todo.map((s) => adService.updateSlot(s.id, { status: next })))
        todo.forEach((s) => (s.status = next))
        uni.showToast({
          title: willPause ? `已暂停 ${todo.length} 个` : `已恢复 ${todo.length} 个`,
          icon: 'success',
        })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '批量操作失败', icon: 'none' })
      }
    },
  })
}

function viewStats(s: AdSlot) {
  uni.showModal({
    title: s.name + ' · 数据',
    content: `曝光 ${formatWan(s.impressions)}\n点击 ${formatWan(s.impressions * (s.ctr / 100))}\n点击率 ${s.ctr}%\n创意数 ${s.creativeCount}`,
    showCancel: false,
  })
}

/**
 * 广告位编辑入口:聚合操作列表(action sheet)
 *   - 修改素材 → 打开 edit-asset sheet
 *   - 修改时段 → 打开 edit-time sheet
 *   - 暂停/恢复 → 单次 updateSlot 调用
 *   - 删除 → 二次确认 + deleteSlot
 */
function openSlotActions(s: AdSlot) {
  const items = [
    '修改素材 (名称 / 投放对象 / 预览图)',
    '修改投放时段',
    s.status === 'paused' ? '恢复投放' : '暂停投放',
    '删除广告位',
  ]
  uni.showActionSheet({
    itemList: items,
    success: async (r) => {
      try {
        if (r.tapIndex === 0) {
          openEditSlotAsset(s)
        } else if (r.tapIndex === 1) {
          openEditSlotTime(s)
        } else if (r.tapIndex === 2) {
          const next = s.status === 'paused' ? 'active' : 'paused'
          await adService.updateSlot(s.id, { status: next })
          s.status = next
          uni.showToast({ title: next === 'active' ? '已恢复' : '已暂停', icon: 'success' })
        } else if (r.tapIndex === 3) {
          uni.showModal({
            title: '删除广告位',
            content: `确认删除「${s.name}」？该位下的创意会同时清除。`,
            confirmColor: '#FF3B30',
            success: async (m) => {
              if (m.confirm) {
                await adService.deleteSlot(s.id)
                slots.value = slots.value.filter((x) => x.id !== s.id)
                uni.showToast({ title: '已删除', icon: 'success' })
              }
            },
          })
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

// ============================================================
// 创意:新建 / 编辑 sheet
// ============================================================
type CreativeMode = 'create' | 'edit'
const creativeSheetOpen = ref(false)
const creativeSheetMode = ref<CreativeMode>('create')
const editingCreativeId = ref<string | null>(null)
const creativeSubmitting = ref(false)
const creativeForm = reactive({
  title: '',
  image: '',
  link: '',
  slotId: '',
  startAt: '',
  endAt: '',
  budget: 1000,
})

function resetCreativeForm() {
  creativeForm.title = ''
  creativeForm.image = ''
  creativeForm.link = ''
  creativeForm.slotId = slots.value[0]?.id || ''
  creativeForm.startAt = new Date().toISOString().slice(0, 10)
  creativeForm.endAt = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
  creativeForm.budget = 1000
}

function openCreateCreative() {
  if (slots.value.length === 0) {
    uni.showToast({ title: '请先创建广告位', icon: 'none' })
    return
  }
  resetCreativeForm()
  editingCreativeId.value = null
  creativeSheetMode.value = 'create'
  creativeSheetOpen.value = true
}

function openEditCreative(c: AdCreativeRow) {
  resetCreativeForm()
  editingCreativeId.value = c.id
  creativeForm.title = c.title || ''
  creativeForm.image = c.image || ''
  creativeForm.link = c.link || ''
  creativeForm.slotId = c.slotId
  creativeForm.startAt = (c.startAt || '').slice(0, 10) || creativeForm.startAt
  creativeForm.endAt = (c.endAt || '').slice(0, 10) || creativeForm.endAt
  creativeForm.budget = c.budget || 1000
  creativeSheetMode.value = 'edit'
  creativeSheetOpen.value = true
}

const creativeSheetTitle = computed(() =>
  creativeSheetMode.value === 'create' ? '新建创意' : '编辑创意',
)

const creativeSheetConfirmDisabled = computed(() => {
  return (
    !creativeForm.title.trim() ||
    !creativeForm.slotId ||
    !creativeForm.startAt ||
    !creativeForm.endAt
  )
})

async function onPickCreativeImage() {
  try {
    const url = await pickAndUploadImage({ bizType: 'misc' })
    creativeForm.image = url
    uni.showToast({ title: '已上传', icon: 'success' })
  } catch (e: any) {
    if (!/cancel/i.test(e?.message || '')) {
      uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
    }
  }
}

async function submitCreativeSheet() {
  if (creativeSubmitting.value) return
  creativeSubmitting.value = true
  try {
    if (!creativeForm.title.trim()) {
      uni.showToast({ title: '请填写创意标题', icon: 'none' })
      return
    }
    if (!creativeForm.slotId) {
      uni.showToast({ title: '请选择广告位', icon: 'none' })
      return
    }
    if (creativeForm.startAt > creativeForm.endAt) {
      uni.showToast({ title: '结束日期不能早于开始', icon: 'none' })
      return
    }
    if (creativeSheetMode.value === 'create') {
      const dto: CreateAdCreativeDto = {
        slotId: creativeForm.slotId,
        title: creativeForm.title.trim(),
        image: creativeForm.image || undefined,
        link: creativeForm.link.trim() || undefined,
        startAt: creativeForm.startAt,
        endAt: creativeForm.endAt,
        budget: Number(creativeForm.budget) || 0,
        status: 'active',
      }
      await adService.createCreative(dto)
      uni.showToast({ title: '已创建', icon: 'success' })
    } else if (editingCreativeId.value) {
      const dto: UpdateAdCreativeDto = {
        title: creativeForm.title.trim(),
        image: creativeForm.image || undefined,
        link: creativeForm.link.trim() || undefined,
        startAt: creativeForm.startAt,
        endAt: creativeForm.endAt,
        budget: Number(creativeForm.budget) || 0,
      }
      await adService.updateCreative(editingCreativeId.value, dto)
      uni.showToast({ title: '已保存', icon: 'success' })
    }
    creativeSheetOpen.value = false
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    creativeSubmitting.value = false
  }
}

function deleteCreative(c: AdCreativeRow) {
  uni.showModal({
    title: '删除创意',
    content: `确认删除「${c.title || c.id}」？删除后历史曝光数据保留,该创意不再展示。`,
    confirmColor: '#FF3B30',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await adService.deleteCreative(c.id)
        creatives.value = creatives.value.filter((x: AdCreativeRow) => x.id !== c.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

/**
 * 审核通过(pending → active)
 * 调 adService.approveCreative —— 内部会优先调 approve 真接口,
 * 未实现时降级到 updateCreative({status:'active'}) 并 console.warn 提示 Agent E。
 */
function approveCreative(c: AdCreativeRow) {
  uni.showModal({
    title: '审核通过',
    content: `通过创意「${c.title || c.id}」？通过后立即上线展示。`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await adService.approveCreative(c.id)
        c.status = 'active'
        uni.showToast({ title: '已通过', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '审核失败', icon: 'none' })
      }
    },
  })
}

/**
 * 审核驳回(pending → rejected)
 * 需录入原因(将同步到商户/创意所属人)
 */
function rejectCreative(c: AdCreativeRow) {
  uni.showModal({
    title: '驳回创意',
    content: '请填写驳回原因(将同步至创意提交方)',
    editable: true,
    placeholderText: '如:素材不清晰 / 文案违规 / 链接无效',
    confirmColor: '#FF3B30',
    success: async (m) => {
      if (!m.confirm) return
      const reason = (m.content || '').trim()
      if (!reason) {
        uni.showToast({ title: '请填写原因', icon: 'none' })
        return
      }
      try {
        await adService.rejectCreative(c.id, reason)
        c.status = 'rejected'
        uni.showToast({ title: '已驳回', icon: 'success' })
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

function openCreativeActions(c: AdCreativeRow) {
  // 待审创意优先展示审核入口,其它状态保持编辑 / 删除
  if (c.status === 'pending') {
    uni.showActionSheet({
      itemList: ['审核通过', '驳回', '编辑创意 (标题 / 图 / 时段)', '删除创意'],
      success: (r) => {
        if (r.tapIndex === 0) approveCreative(c)
        else if (r.tapIndex === 1) rejectCreative(c)
        else if (r.tapIndex === 2) openEditCreative(c)
        else if (r.tapIndex === 3) deleteCreative(c)
      },
    })
    return
  }
  uni.showActionSheet({
    itemList: ['编辑创意 (标题 / 图 / 时段)', '删除创意'],
    success: (r) => {
      if (r.tapIndex === 0) openEditCreative(c)
      else if (r.tapIndex === 1) deleteCreative(c)
    },
  })
}

// ============================================================
// 顶部右上角 + 按钮: 根据当前 tab 决定 "新建广告位" 还是 "新建创意"
// ============================================================
function onNavRightTap() {
  if (tab.value === 'create') openCreateCreative()
  else openCreateSlot()
}

const totalStats = computed(() => ({
  totalImpressions: slots.value.reduce((s, x) => s + x.impressions, 0),
  totalCreatives: slots.value.reduce((s, x) => s + x.creativeCount, 0),
  activeSlots: slots.value.filter((x) => x.status === 'active').length,
  avgCtr:
    slots.value.length > 0
      ? (slots.value.reduce((s, x) => s + x.ctr, 0) / slots.value.length).toFixed(1)
      : '0',
}))

function slotNameOf(slotId: string): string {
  return slots.value.find((s) => s.id === slotId)?.name || slotId
}

onMounted(load)
</script>

<template>
  <view class="page">
    <NavBar title="广告管理" right-icon="plus" @right="onNavRightTap" />

    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        :class="['tab', tab === t.key ? 'active' : '']"
        @click="tab = t.key"
      >
        <text>{{ t.label }}</text>
        <view v-if="tab === t.key" class="indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 顶部统计 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.activeSlots }}</text>
          <text class="stat-label">投放中</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.totalCreatives }}</text>
          <text class="stat-label">创意数</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ formatWan(totalStats.totalImpressions) }}</text>
          <text class="stat-label">总曝光</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.avgCtr }}%</text>
          <text class="stat-label">平均 CTR</text>
        </view>
      </view>

      <!-- Tab: 广告位 -->
      <view v-if="tab === 'slots'" class="list">
        <view class="quick-toolbar">
          <view class="qt-btn primary" @click="openCreateSlot">
            <Icon name="plus" :size="24" color="#fff" />
            <text>新建广告位</text>
          </view>
          <view class="qt-btn ghost" @click="quickToggleAll">
            <Icon name="refresh" :size="22" color="#FF4D2D" />
            <text>批量暂停/恢复</text>
          </view>
        </view>

        <view v-for="s in slots" :key="s.id" class="card">
          <view class="card-head">
            <text class="name">{{ s.name }}</text>
            <view
              class="status-tag"
              :style="{
                color: STATUS_META[s.status]?.tint,
                background: (STATUS_META[s.status]?.tint || '#86909C') + '14',
              }"
            >
              {{ STATUS_META[s.status]?.label || s.status }}
            </view>
          </view>
          <view class="meta">
            <Icon name="navigation" :size="22" color="var(--text-tertiary)" />
            <text>{{ s.scene || '未设场景' }} · 目标 {{ TARGET_LABEL[s.target] || s.target }}</text>
          </view>
          <view v-if="s.startAt && s.endAt" class="meta">
            <Icon name="calendar" :size="22" color="var(--text-tertiary)" />
            <text>{{ s.startAt }} ~ {{ s.endAt }}</text>
          </view>

          <view class="preview">
            <image v-if="s.preview" :src="s.preview" mode="aspectFill" class="preview-img" />
            <view v-else class="preview-bg">
              <Icon name="megaphone" :size="56" color="rgba(255,77,45,0.3)" />
              <text class="preview-text">未上传预览图</text>
            </view>
          </view>

          <view class="metrics">
            <view class="metric">
              <text class="m-label">曝光</text>
              <text class="m-value">{{ formatWan(s.impressions) }}</text>
            </view>
            <view class="metric">
              <text class="m-label">点击率</text>
              <text class="m-value">{{ s.ctr }}%</text>
            </view>
            <view class="metric">
              <text class="m-label">创意</text>
              <text class="m-value">{{ s.creativeCount }}</text>
            </view>
          </view>

          <view class="actions">
            <view class="btn ghost" @click="viewStats(s)">数据</view>
            <view class="btn primary" @click="openSlotActions(s)">编辑</view>
          </view>
        </view>

        <EmptyState
          v-if="!loading && slots.length === 0"
          title="暂无广告位"
          desc="点击「新建广告位」开始投放"
          icon="megaphone"
        />
      </view>

      <!-- Tab: 创意 -->
      <view v-else-if="tab === 'create'" class="list">
        <view class="quick-toolbar">
          <view class="qt-btn primary" @click="openCreateCreative">
            <Icon name="plus" :size="24" color="#fff" />
            <text>新建创意</text>
          </view>
        </view>

        <view v-for="c in creatives" :key="c.id" class="creative-card">
          <image v-if="c.image" :src="c.image" mode="aspectFill" class="creative-img" />
          <view v-else class="creative-img placeholder">
            <Icon name="image-plus" :size="40" color="#C9CDD4" />
          </view>
          <view class="creative-info">
            <text class="c-title">{{ c.title }}</text>
            <text class="c-meta">点击 {{ c.clicks }} · 曝光 {{ formatWan(c.impressions) }}</text>
            <text class="c-meta">归属:{{ slotNameOf(c.slotId) }}</text>
            <view class="c-status" :style="{ color: STATUS_META[c.status]?.tint }">
              {{ STATUS_META[c.status]?.label }}
            </view>
            <view v-if="c.status === 'pending'" class="c-audit-row">
              <view class="audit-btn reject" @click.stop="rejectCreative(c)">驳回</view>
              <view class="audit-btn primary" @click.stop="approveCreative(c)">通过</view>
            </view>
          </view>
          <view class="more-btn" @click.stop="openCreativeActions(c)">
            <Icon name="more-v" :size="32" color="var(--text-tertiary)" />
          </view>
        </view>
        <EmptyState
          v-if="!loading && creatives.length === 0"
          title="暂无创意"
          desc="点击「新建创意」上传素材"
          icon="image-plus"
        />
      </view>

      <!-- Tab: 数据 -->
      <view v-else class="list">
        <view class="big-stat-card">
          <text class="bs-title">本月广告数据</text>
          <view class="bs-grid">
            <view class="bs-item">
              <text class="bs-num">{{ formatWan(totalStats.totalImpressions) }}</text>
              <text class="bs-label">总曝光</text>
            </view>
            <view class="bs-item">
              <text class="bs-num">{{ totalStats.avgCtr }}%</text>
              <text class="bs-label">平均 CTR</text>
            </view>
          </view>
        </view>
        <view class="card">
          <text class="rank-title">各广告位曝光排行</text>
          <view
            v-for="(s, i) in [...slots].sort((a, b) => b.impressions - a.impressions)"
            :key="s.id"
            class="rank-row"
          >
            <view :class="['rank-num', i < 3 ? `rank-${i + 1}` : '']">{{ i + 1 }}</view>
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-val">{{ formatWan(s.impressions) }}</text>
          </view>
          <EmptyState
            v-if="!loading && slots.length === 0"
            title="暂无数据"
            desc="先创建几个广告位"
            icon="megaphone"
          />
        </view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>

    <!-- 广告位 sheet (create / edit-asset / edit-time) -->
    <FormSheet
      :open="slotSheetOpen"
      :title="slotSheetTitle"
      :confirm-text="slotSheetMode === 'create' ? '创建' : '保存'"
      :loading="slotSubmitting"
      :disabled="slotSheetConfirmDisabled"
      @close="slotSheetOpen = false"
      @confirm="submitSlotSheet"
    >
      <!-- 通用字段 -->
      <view v-if="slotSheetMode !== 'edit-time'" class="form-row">
        <text class="form-label">广告位名称<text class="required">*</text></text>
        <input
          v-model="slotForm.name"
          class="form-input"
          placeholder="如:首页 Banner / 商品详情顶部"
          maxlength="40"
        />
      </view>
      <view v-if="slotSheetMode !== 'edit-time'" class="form-row">
        <text class="form-label">投放对象</text>
        <view class="seg-group">
          <view
            v-for="opt in TARGET_OPTIONS"
            :key="opt.value"
            :class="['seg-item', slotForm.target === opt.value ? 'active' : '']"
            @click="slotForm.target = opt.value"
          >
            {{ opt.label }}
          </view>
        </view>
      </view>
      <view v-if="slotSheetMode !== 'edit-time'" class="form-row">
        <text class="form-label">场景描述</text>
        <input
          v-model="slotForm.scene"
          class="form-input"
          placeholder="可选,如「首页轮播大图」"
          maxlength="40"
        />
      </view>
      <view v-if="slotSheetMode !== 'edit-time'" class="form-row">
        <text class="form-label">预览图(目标 URL 落地图)</text>
        <view class="upload-box" @click="onPickSlotPreview">
          <image
            v-if="slotForm.preview"
            :src="slotForm.preview"
            class="upload-preview"
            mode="aspectFill"
          />
          <view v-else class="upload-placeholder">
            <Icon name="image-plus" :size="48" color="#C9CDD4" />
            <text class="upload-hint">点击选图上传</text>
          </view>
        </view>
        <view v-if="slotForm.preview" class="upload-actions">
          <text class="link-action" @click="slotForm.preview = ''">移除</text>
          <text class="link-action" @click="onPickSlotPreview">重新上传</text>
        </view>
      </view>

      <!-- 修改时段:仅日期范围 -->
      <view v-if="slotSheetMode === 'edit-time'" class="form-tip">
        投放时段持久化至系统配置 (system_settings.business.adSlotMeta), 后端 AdSlot
        主表后续加字段后会自动迁移读写。
      </view>
      <view v-if="slotSheetMode === 'edit-time'" class="form-row">
        <text class="form-label">开始日期<text class="required">*</text></text>
        <picker
          mode="date"
          :value="slotForm.startAt"
          @change="(e: any) => (slotForm.startAt = e.detail.value)"
        >
          <view class="form-input picker">
            <text>{{ slotForm.startAt || '请选择' }}</text>
            <Icon name="calendar" :size="28" color="#86909C" />
          </view>
        </picker>
      </view>
      <view v-if="slotSheetMode === 'edit-time'" class="form-row">
        <text class="form-label">结束日期<text class="required">*</text></text>
        <picker
          mode="date"
          :value="slotForm.endAt"
          @change="(e: any) => (slotForm.endAt = e.detail.value)"
        >
          <view class="form-input picker">
            <text>{{ slotForm.endAt || '请选择' }}</text>
            <Icon name="calendar" :size="28" color="#86909C" />
          </view>
        </picker>
      </view>
    </FormSheet>

    <!-- 创意 sheet (create / edit) -->
    <FormSheet
      :open="creativeSheetOpen"
      :title="creativeSheetTitle"
      :confirm-text="creativeSheetMode === 'create' ? '创建' : '保存'"
      :loading="creativeSubmitting"
      :disabled="creativeSheetConfirmDisabled"
      @close="creativeSheetOpen = false"
      @confirm="submitCreativeSheet"
    >
      <view class="form-row">
        <text class="form-label">创意标题<text class="required">*</text></text>
        <input
          v-model="creativeForm.title"
          class="form-input"
          placeholder="如:双11 全场五折"
          maxlength="40"
        />
      </view>
      <view class="form-row">
        <text class="form-label">归属广告位<text class="required">*</text></text>
        <picker
          mode="selector"
          :range="slots"
          range-key="name"
          :value="slots.findIndex((s) => s.id === creativeForm.slotId)"
          :disabled="creativeSheetMode === 'edit'"
          @change="(e: any) => (creativeForm.slotId = slots[e.detail.value]?.id || '')"
        >
          <view :class="['form-input', 'picker', creativeSheetMode === 'edit' ? 'disabled' : '']">
            <text>{{ slotNameOf(creativeForm.slotId) || '请选择广告位' }}</text>
            <Icon name="chevron-down" :size="28" color="#86909C" />
          </view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">创意图<text class="required">*</text></text>
        <view class="upload-box" @click="onPickCreativeImage">
          <image
            v-if="creativeForm.image"
            :src="creativeForm.image"
            class="upload-preview"
            mode="aspectFill"
          />
          <view v-else class="upload-placeholder">
            <Icon name="image-plus" :size="48" color="#C9CDD4" />
            <text class="upload-hint">点击选图上传</text>
          </view>
        </view>
        <view v-if="creativeForm.image" class="upload-actions">
          <text class="link-action" @click="creativeForm.image = ''">移除</text>
          <text class="link-action" @click="onPickCreativeImage">重新上传</text>
        </view>
      </view>
      <view class="form-row">
        <text class="form-label">点击跳转链接</text>
        <input
          v-model="creativeForm.link"
          class="form-input"
          placeholder="https:// 或 /pages/xxx"
          maxlength="200"
        />
      </view>
      <view class="form-row form-row-half">
        <view class="half-col">
          <text class="form-label">开始日期</text>
          <picker
            mode="date"
            :value="creativeForm.startAt"
            @change="(e: any) => (creativeForm.startAt = e.detail.value)"
          >
            <view class="form-input picker">
              <text>{{ creativeForm.startAt }}</text>
            </view>
          </picker>
        </view>
        <view class="half-col">
          <text class="form-label">结束日期</text>
          <picker
            mode="date"
            :value="creativeForm.endAt"
            @change="(e: any) => (creativeForm.endAt = e.detail.value)"
          >
            <view class="form-input picker">
              <text>{{ creativeForm.endAt }}</text>
            </view>
          </picker>
        </view>
      </view>
      <view class="form-row">
        <text class="form-label">预算(元)</text>
        <input
          v-model.number="creativeForm.budget"
          class="form-input"
          type="number"
          placeholder="0 表示不设上限"
        />
      </view>
    </FormSheet>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tabs {
  display: flex;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}
.tab {
  flex: 1;
  padding: 24rpx 0 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
  &.active {
    color: var(--brand-primary);
    font-weight: 700;
  }
  .indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 48rpx;
    height: 6rpx;
    background: var(--brand-gradient);
    border-radius: 6rpx 6rpx 0 0;
  }
}
.scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}

.stats-card {
  margin: 16rpx 24rpx 0;
  padding: 20rpx 16rpx;
  background: linear-gradient(135deg, #ff4d2d, #ff9c6e);
  color: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.2);
  .stat-item {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    .stat-num {
      font-size: 32rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .stat-label {
      font-size: 20rpx;
      opacity: 0.9;
    }
  }
  .stat-divider {
    width: 1rpx;
    height: 48rpx;
    background: rgba(255, 255, 255, 0.3);
  }
}
.list {
  padding: 16rpx 24rpx;
}

.quick-toolbar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
  .qt-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    font-size: 26rpx;
    font-weight: 700;
    &.primary {
      background: var(--brand-gradient);
      color: #fff;
      box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
    }
    &.ghost {
      background: var(--bg-card);
      color: var(--brand-primary);
      border: 1rpx solid rgba(255, 77, 45, 0.3);
    }
  }
}

.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 700;
  }
}
.meta {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.preview {
  width: 100%;
  height: 200rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 77, 45, 0.08), rgba(255, 156, 110, 0.04));
}
.preview-img {
  width: 100%;
  height: 100%;
}
.preview-bg {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .preview-text {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}
.metrics {
  display: flex;
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 12rpx 0;
}
.metric {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  .m-label {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .m-value {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
  }
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}
.btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    color: var(--text-primary);
  }
  &.primary {
    background: var(--brand-gradient);
    color: #fff;
    box-shadow: 0 2rpx 8rpx rgba(255, 77, 45, 0.3);
  }
}

/* 创意卡 */
.creative-card {
  display: flex;
  gap: 16rpx;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
  align-items: flex-start;
}
.creative-img {
  width: 160rpx;
  height: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: var(--bg-page);
  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.creative-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  .c-title {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .c-meta {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
  .c-status {
    font-size: 20rpx;
    font-weight: 700;
  }
  .c-audit-row {
    display: flex;
    gap: 12rpx;
    margin-top: 8rpx;
    .audit-btn {
      flex: 0 0 auto;
      padding: 8rpx 20rpx;
      border-radius: 999rpx;
      font-size: 22rpx;
      font-weight: 700;
      &.reject {
        background: var(--bg-card);
        border: 1rpx solid var(--border-default);
        color: var(--text-primary);
      }
      &.primary {
        background: var(--brand-gradient);
        color: #fff;
      }
    }
  }
}
.more-btn {
  padding: 8rpx;
  flex-shrink: 0;
}

/* 数据 tab */
.big-stat-card {
  margin-bottom: 16rpx;
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #ff4d2d, #faad14);
  color: #fff;
  border-radius: 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.3);
  .bs-title {
    font-size: 24rpx;
    opacity: 0.9;
    margin-bottom: 12rpx;
    display: block;
  }
  .bs-grid {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 64rpx;
  }
  .bs-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    .bs-num {
      font-size: 56rpx;
      font-weight: 800;
      line-height: 1;
      font-family: var(--font-family-base);
    }
    .bs-label {
      font-size: 22rpx;
      opacity: 0.85;
    }
  }
}
.rank-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12rpx;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx dashed var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  .rank-num {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-page);
    color: var(--text-tertiary);
    font-weight: 800;
    font-size: 24rpx;
    flex-shrink: 0;
    font-family: var(--font-family-base);
    &.rank-1 {
      background: linear-gradient(135deg, #ffd700, #ffa500);
      color: #fff;
    }
    &.rank-2 {
      background: linear-gradient(135deg, #c0c0c0, #888);
      color: #fff;
    }
    &.rank-3 {
      background: linear-gradient(135deg, #cd7f32, #8b4513);
      color: #fff;
    }
  }
  .rank-name {
    flex: 1;
    min-width: 0;
    font-size: 26rpx;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rank-val {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    flex-shrink: 0;
  }
}

/* ===== 表单 sheet 通用样式 ===== */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 12rpx 0;
  &.form-row-half {
    flex-direction: row;
    gap: 16rpx;
    .half-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10rpx;
    }
  }
}
.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
  .required {
    color: #ff3b30;
    margin-left: 4rpx;
  }
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  background: #f7f8fa;
  border: 1rpx solid #e5e6eb;
  border-radius: 16rpx;
  color: #1d2129;
  &.picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  &.disabled {
    opacity: 0.6;
  }
}
.form-tip {
  margin: 4rpx 0 8rpx;
  padding: 14rpx 16rpx;
  background: rgba(18, 150, 219, 0.06);
  border-left: 4rpx solid #1296db;
  border-radius: 0 12rpx 12rpx 0;
  font-size: 22rpx;
  color: #4e5969;
  line-height: 1.6;
}
.seg-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  .seg-item {
    padding: 12rpx 24rpx;
    background: #f7f8fa;
    border: 1rpx solid #e5e6eb;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: var(--text-secondary);
    &.active {
      background: rgba(255, 77, 45, 0.1);
      border-color: #ff4d2d;
      color: #ff4d2d;
      font-weight: 700;
    }
  }
}
.upload-box {
  width: 100%;
  height: 240rpx;
  border-radius: 16rpx;
  background: #f7f8fa;
  border: 2rpx dashed #c9cdd4;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  .upload-preview {
    width: 100%;
    height: 100%;
  }
  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    .upload-hint {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
}
.upload-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
  .link-action {
    font-size: 24rpx;
    color: #1296db;
    font-weight: 600;
  }
}
</style>
