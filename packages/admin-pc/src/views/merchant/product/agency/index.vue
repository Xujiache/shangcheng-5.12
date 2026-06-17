<!-- 商家 PC · 代理厂家（按厂家聚合 + 厂家详情批量上架/改价） -->
<template>
  <div class="mp-agency">
    <div class="mp-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">代理厂家</h2>
        <p class="mt-1 text-sm text-g-500">
          已代理 {{ factoryStats.length }} 家厂家 · 共 {{ list.length }} 件代理商品 · 加价收益 ¥{{
            totalMarkup.toLocaleString()
          }}
        </p>
      </div>
      <div class="flex gap-2">
        <ElInput
          v-model="keyword"
          placeholder="搜索厂家名"
          clearable
          :prefix-icon="Search"
          style="width: 240px"
        />
        <ElButton :icon="Refresh" @click="loadData" plain>刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="goToPlaza">去广场选品</ElButton>
      </div>
    </div>

    <!-- 自动同步全店加价 -->
    <ElCard shadow="never" class="mp-sync-bar">
      <div class="mp-sync-bar__row">
        <div class="flex items-center gap-3 flex-1">
          <div class="mp-sync-bar__icon">
            <ArtSvgIcon icon="ri:refresh-line" />
          </div>
          <div>
            <div class="font-semibold">自动同步厂家价格</div>
            <div class="text-xs text-g-500 mt-1">
              开启后，所有代理商品在厂家调价时<b>自动按加价率重算</b>我的零售价；关闭则只手动调整
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <ElInputNumber
            v-model="globalMarkup"
            :min="0"
            :max="9999"
            :step="5"
            :precision="2"
            controls-position="right"
            style="width: 160px"
            :disabled="!globalAutoSync"
          />
          <span class="text-xs text-g-500">全店统一加价率 %</span>
          <ElButton
            size="small"
            type="primary"
            plain
            @click="applyGlobalMarkup"
            :disabled="!globalAutoSync"
          >
            一键应用
          </ElButton>
          <ElSwitch
            v-model="globalAutoSync"
            size="large"
            active-text="开"
            inactive-text="关"
            inline-prompt
            @change="onGlobalSyncChange"
          />
        </div>
      </div>
    </ElCard>

    <!-- 厂家卡片网格 -->
    <ElCard shadow="never" v-loading="loading">
      <div v-if="!factoryStats.length" class="mp-empty">
        <ArtSvgIcon icon="ri:store-2-line" />
        <div class="text-g-500 mt-3">还没有代理任何厂家</div>
        <ElButton type="primary" class="mt-3" @click="goToPlaza">去选品广场逛逛</ElButton>
      </div>
      <div v-else class="mp-factory-grid">
        <div
          v-for="f in filteredFactoryStats"
          :key="f.factoryId"
          class="mp-factory-card"
          @click="openFactory(f.factoryId)"
        >
          <div class="mp-factory-card__head">
            <ElAvatar :src="f.logo" :size="48" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">{{ f.factoryName }}</div>
              <div class="text-xs text-g-500 mt-1"
                >最近代理：{{ formatRelative(f.lastAppliedAt) }}</div
              >
            </div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" class="mp-factory-card__arrow" />
          </div>
          <div class="mp-factory-card__stats">
            <div class="mp-stat">
              <div class="mp-stat__num">{{ f.totalCount }}</div>
              <div class="mp-stat__label">代理商品</div>
            </div>
            <div class="mp-stat">
              <div class="mp-stat__num text-success">{{ f.approvedCount }}</div>
              <div class="mp-stat__label">已上架</div>
            </div>
            <div class="mp-stat">
              <div class="mp-stat__num text-warning">{{ f.pendingCount }}</div>
              <div class="mp-stat__label">待审核</div>
            </div>
            <div class="mp-stat">
              <div class="mp-stat__num text-primary">¥{{ f.totalMarkup.toLocaleString() }}</div>
              <div class="mp-stat__label">加价收益</div>
            </div>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- 厂家详情 + 批量上架/改价 Drawer -->
    <ElDrawer v-model="drawerOpen" :size="980" :with-header="false" :destroy-on-close="true">
      <div v-if="factory" class="mp-factory-detail" v-loading="detailLoading">
        <div class="mp-factory-detail__head">
          <ElAvatar :src="factory.factoryLogo" :size="64" />
          <div class="flex-1 min-w-0">
            <div class="text-lg font-semibold">{{ factory.factoryName }}</div>
            <div class="text-xs text-g-500 mt-1">
              <ArtSvgIcon icon="ri:star-fill" class="text-yellow-500" />
              {{ factory.rating }} · {{ factory.yearsInBusiness }} 年厂龄 · 共
              {{ factory.cards.length }} 件商品
            </div>
            <div class="text-xs text-g-600 mt-1 line-clamp-1">{{ factory.description }}</div>
          </div>
          <ElButton :icon="ChatLineRound" @click="goChat">在线沟通</ElButton>
        </div>

        <ElTabs v-model="detailTab" class="mp-factory-detail__tabs">
          <ElTabPane :label="`厂家全部商品 (${factory.cards.length})`" name="all" />
          <ElTabPane :label="`我已代理 (${myAgencyOfFactory.length})`" name="mine" />
        </ElTabs>

        <!-- 批量操作工具栏 -->
        <div class="mp-bulk-bar" v-if="selectedRows.length > 0">
          <div class="text-sm">
            已选中 <b class="text-primary">{{ selectedRows.length }}</b> 件
          </div>
          <div class="flex gap-2">
            <ElButton
              v-if="detailTab === 'all'"
              type="primary"
              size="small"
              :icon="Upload"
              @click="bulkListing"
            >
              一键上架
            </ElButton>
            <ElButton type="warning" size="small" :icon="EditPen" @click="bulkRepricing">
              批量改价
            </ElButton>
            <ElButton
              v-if="detailTab === 'mine'"
              type="danger"
              size="small"
              plain
              :icon="Delete"
              @click="bulkCancel"
            >
              取消代理
            </ElButton>
            <ElButton size="small" text @click="selectedRows = []">清空选择</ElButton>
          </div>
        </div>

        <ElTable
          ref="tableRef"
          :data="detailTableData"
          stripe
          :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
          @selection-change="onSelectionChange"
          row-key="productId"
        >
          <ElTableColumn type="selection" width="48" :selectable="rowSelectable" />
          <ElTableColumn label="商品" min-width="280">
            <template #default="{ row }">
              <div class="mp-row-cell">
                <ElImage
                  :src="row.productImage"
                  fit="cover"
                  style="width: 56px; height: 56px; border-radius: 8px"
                />
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ row.productName }}</div>
                  <div class="text-xs text-g-500 truncate">
                    <span v-for="t in row.tags || []" :key="t" class="mr-2">#{{ t }}</span>
                  </div>
                </div>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="出厂价" width="110">
            <template #default="{ row }">¥{{ row.factoryPrice ?? row.startPrice }}</template>
          </ElTableColumn>
          <ElTableColumn label="我的零售" width="120">
            <template #default="{ row }">
              <span v-if="row.myRetailPrice" class="text-primary font-semibold">
                ¥{{ row.myRetailPrice }}
              </span>
              <span v-else class="text-g-400 text-xs">未上架</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="加价率" width="100" align="center">
            <template #default="{ row }">
              <ElTag
                v-if="row.markupRatio != null"
                size="small"
                :type="row.markupRatio >= 30 ? 'success' : 'info'"
                effect="plain"
              >
                +{{ row.markupRatio }}%
              </ElTag>
              <span v-else class="text-g-400 text-xs">
                建议+{{ row.suggestMarkupMin }}~{{ row.suggestMarkupMax }}%
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="110" align="center">
            <template #default="{ row }">
              <ElTag v-if="row.status" :type="statusTypeOf(row.status)" size="small">
                {{ statusLabelOf(row.status) }}
              </ElTag>
              <ElTag v-else type="info" size="small" effect="plain">未代理</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="160" fixed="right" align="center">
            <template #default="{ row }">
              <template v-if="!row.status">
                <ElButton text type="primary" size="small" @click="onListOne(row)"> 上架 </ElButton>
              </template>
              <template v-else-if="row.status === 'approved'">
                <ElButton text type="primary" size="small" @click="onAdjustMarkup(row)">
                  改价
                </ElButton>
                <ElDivider direction="vertical" />
                <ElButton text type="warning" size="small" @click="onOffline(row)"> 下架 </ElButton>
              </template>
              <template v-else-if="row.status === 'offline'">
                <ElButton text type="primary" size="small" @click="onReup(row)">重新上架</ElButton>
              </template>
              <template v-else-if="row.status === 'pending'">
                <ElButton text type="danger" size="small" @click="onCancel(row)">取消申请</ElButton>
              </template>
              <template v-else>
                <span class="text-g-500 text-xs">已驳回</span>
              </template>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </ElDrawer>

    <!-- 调价 / 上架 统一弹窗（支持加价率 % 与固定金额 ¥ 两种模式） -->
    <ElDialog
      v-model="priceDialog.open"
      :title="priceDialog.title"
      width="460px"
      align-center
      append-to-body
      @closed="onPriceDialogClosed"
    >
      <div class="mp-price-form">
        <div class="mp-price-field">
          <label class="mp-price-field__label">
            加价
            <span class="mp-price-field__sub"> （任意正数 · 后面下拉选 % 或 ¥） </span>
          </label>
          <ElInput
            v-model="priceDialog.valueStr"
            type="number"
            placeholder="输入加价数值"
            size="large"
            clearable
            @keydown.enter="onPriceConfirm"
          >
            <template #append>
              <ElSelect v-model="priceDialog.mode" style="width: 110px" size="large">
                <ElOption label="% 加价率" value="ratio">
                  <span class="text-primary mr-2">%</span>
                  按比例
                </ElOption>
                <ElOption label="¥ 固定金额" value="amount">
                  <span class="text-primary mr-2">¥</span>
                  按金额
                </ElOption>
              </ElSelect>
            </template>
          </ElInput>
          <div class="mp-price-field__hint">
            {{
              priceDialog.mode === 'ratio'
                ? '示例：输入 30，% → 零售价 = 出厂价 × 1.30'
                : '示例：输入 100，¥ → 零售价 = 出厂价 + ¥100（心算友好）'
            }}
          </div>
        </div>

        <!-- 单行预览：实时显示零售价 -->
        <div v-if="pricePreview" class="mp-price-preview">
          <div class="mp-price-preview__row">
            <span class="text-g-500">出厂价</span>
            <span>¥{{ pricePreview.factoryPrice }}</span>
          </div>
          <div class="mp-price-preview__arrow">
            <ArtSvgIcon icon="ri:arrow-down-line" />
          </div>
          <div class="mp-price-preview__row mp-price-preview__row--accent">
            <span>新零售价</span>
            <span class="text-primary font-bold text-lg">¥{{ pricePreview.newRetail }}</span>
          </div>
          <div class="mp-price-preview__row mp-price-preview__row--small">
            <span class="text-g-500">实际加价率</span>
            <span class="text-g-700">+{{ pricePreview.derivedRatio }}%</span>
          </div>
        </div>

        <!-- 批量预览：显示影响行数 -->
        <div v-else-if="priceDialog.batchCount > 0" class="mp-price-batch">
          将影响 <b class="text-primary">{{ priceDialog.batchCount }}</b> 件商品；逐件按当前出厂价
          {{
            priceDialog.mode === 'ratio' ? `× (1 + ${parsedPriceValue}%)` : `+ ¥${parsedPriceValue}`
          }}
          重算零售价。
        </div>
      </div>

      <template #footer>
        <ElButton @click="onPriceCancel">取消</ElButton>
        <ElButton type="primary" @click="onPriceConfirm">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchAgencyApplications,
    saveAgencyApplications,
    updateAgencyApplication,
    cancelAgencyApplication,
    createAgencyApplication,
    fetchFactoryDetail,
    type AgencyApplication,
    type FactoryDetail
  } from '@/api/merchant-business'
  import type { PlazaProductCard } from '@jiujiu/shared/types'
  import { formatRelative } from '@jiujiu/shared/utils'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    Plus,
    Refresh,
    Search,
    Upload,
    EditPen,
    Delete,
    ChatLineRound
  } from '@element-plus/icons-vue'

  defineOptions({ name: 'MerchantAgencyList' })

  const router = useRouter()

  /* ====== 列表数据（per-product agency applications）====== */
  const loading = ref(false)
  const list = ref<AgencyApplication[]>([])
  const keyword = ref('')

  /* ====== 自动同步全店配置 ====== */
  const SYNC_KEY = 'jj_agency_sync_v1'
  const globalAutoSync = ref(true)
  const globalMarkup = ref(30)

  function loadSyncConfig() {
    try {
      const raw = localStorage.getItem(SYNC_KEY)
      if (raw) {
        const cfg = JSON.parse(raw)
        if (typeof cfg.globalAutoSync === 'boolean') globalAutoSync.value = cfg.globalAutoSync
        if (typeof cfg.globalMarkup === 'number') globalMarkup.value = cfg.globalMarkup
      }
    } catch {
      /* ignore */
    }
  }
  function persistSyncConfig() {
    try {
      localStorage.setItem(
        SYNC_KEY,
        JSON.stringify({ globalAutoSync: globalAutoSync.value, globalMarkup: globalMarkup.value })
      )
    } catch {
      /* ignore */
    }
  }
  function onGlobalSyncChange(v: boolean | string | number) {
    const on = Boolean(v)
    persistSyncConfig()
    list.value.forEach((row) => {
      if (row.status === 'approved') row.syncStatus = on ? 'synced' : 'pending'
    })
    ElMessage.success(on ? '已开启全店自动同步' : '已切换为手动调价模式')
  }
  function applyGlobalMarkup() {
    let updated = 0
    list.value.forEach((row) => {
      if (row.status === 'approved') {
        row.markupRatio = globalMarkup.value
        row.myRetailPrice = Math.round(row.factoryPrice * (1 + globalMarkup.value / 100))
        updated++
      }
    })
    persistSyncConfig()
    saveAgencyApplications(list.value)
    ElMessage.success(`已重算 ${updated} 件代理商品价格`)
  }

  /* ====== 按厂家聚合 ====== */
  interface FactoryStat {
    factoryId: string
    factoryName: string
    logo: string
    totalCount: number
    approvedCount: number
    pendingCount: number
    totalMarkup: number
    lastAppliedAt: string
  }

  const factoryStats = computed<FactoryStat[]>(() => {
    const map = new Map<string, FactoryStat>()
    for (const app of list.value) {
      let f = map.get(app.factoryId)
      if (!f) {
        f = {
          factoryId: app.factoryId,
          factoryName: app.factoryName,
          // ElAvatar 在 logo 为空时会显示默认占位图标，无需外链初始头像服务
          logo: '',
          totalCount: 0,
          approvedCount: 0,
          pendingCount: 0,
          totalMarkup: 0,
          lastAppliedAt: app.appliedAt
        }
        map.set(app.factoryId, f)
      }
      f.totalCount++
      if (app.status === 'approved') {
        f.approvedCount++
        f.totalMarkup += app.myRetailPrice - app.factoryPrice
      }
      if (app.status === 'pending') f.pendingCount++
      if (app.appliedAt > f.lastAppliedAt) f.lastAppliedAt = app.appliedAt
    }
    return Array.from(map.values()).sort(
      (a, b) => Date.parse(b.lastAppliedAt) - Date.parse(a.lastAppliedAt)
    )
  })

  const filteredFactoryStats = computed(() => {
    if (!keyword.value.trim()) return factoryStats.value
    const kw = keyword.value.trim().toLowerCase()
    return factoryStats.value.filter((f) => f.factoryName.toLowerCase().includes(kw))
  })

  const totalMarkup = computed(() =>
    list.value
      .filter((a) => a.status === 'approved')
      .reduce((acc, a) => acc + (a.myRetailPrice - a.factoryPrice), 0)
  )

  /* ====== 厂家详情 Drawer ====== */
  const drawerOpen = ref(false)
  const detailLoading = ref(false)
  const factory = ref<FactoryDetail>()
  const detailTab = ref<'all' | 'mine'>('all')
  const selectedRows = ref<DetailRow[]>([])
  const tableRef = ref()

  type DetailRow = PlazaProductCard & Partial<AgencyApplication>

  async function openFactory(factoryId: string) {
    drawerOpen.value = true
    detailLoading.value = true
    detailTab.value = 'all'
    selectedRows.value = []
    try {
      factory.value = await fetchFactoryDetail(factoryId)
    } finally {
      detailLoading.value = false
    }
  }

  /** 厂家全部商品 + 合并已代理状态 */
  const allProductsOfFactory = computed<DetailRow[]>(() => {
    if (!factory.value) return []
    const byPid = new Map(list.value.map((a) => [a.productId, a]))
    return factory.value.cards.map((c) => {
      const app = byPid.get(c.productId)
      return app ? ({ ...c, ...app } as DetailRow) : (c as DetailRow)
    })
  })

  const myAgencyOfFactory = computed<DetailRow[]>(() => {
    if (!factory.value) return []
    const factoryId = factory.value.factoryId
    return list.value
      .filter((a) => a.factoryId === factoryId)
      .map((a) => {
        const card = factory.value!.cards.find((c) => c.productId === a.productId)
        return { ...(card || {}), ...a } as DetailRow
      })
  })

  const detailTableData = computed(() =>
    detailTab.value === 'all' ? allProductsOfFactory.value : myAgencyOfFactory.value
  )

  function rowSelectable(row: DetailRow) {
    if (detailTab.value === 'all') return !row.status || row.status === 'offline'
    return row.status === 'approved' || row.status === 'pending'
  }

  function onSelectionChange(rows: DetailRow[]) {
    selectedRows.value = rows
  }

  /* ====== 单行操作 ====== */
  function statusTypeOf(s: AgencyApplication['status']) {
    return (
      {
        pending: 'warning',
        approved: 'success',
        rejected: 'danger',
        offline: 'info'
      } as const
    )[s]
  }
  function statusLabelOf(s: AgencyApplication['status']) {
    return (
      {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回',
        offline: '已下架'
      } as const
    )[s]
  }

  /** 根据出厂价 + 模式 + 数值，统一算新零售价 */
  function computeRetail(factoryPrice: number, mode: 'ratio' | 'amount', value: number) {
    if (mode === 'ratio') {
      const myRetailPrice = Math.round(factoryPrice * (1 + value / 100))
      return { myRetailPrice, markupRatio: value }
    }
    // amount 模式：在出厂价基础上加固定金额，加价率反推
    const myRetailPrice = factoryPrice + value
    const markupRatio = factoryPrice > 0 ? Math.round((value / factoryPrice) * 100) : 0
    return { myRetailPrice, markupRatio }
  }

  function buildAppFromCard(
    card: DetailRow,
    mode: 'ratio' | 'amount',
    value: number
  ): AgencyApplication {
    const factoryPrice = card.startPrice
    const { myRetailPrice, markupRatio } = computeRetail(factoryPrice, mode, value)
    return {
      id: `ag-${card.productId}-${Date.now()}`,
      productId: card.productId,
      productName: card.productName,
      productImage: card.productImage,
      factoryId: card.factoryId,
      factoryName: card.factoryName,
      factoryPrice,
      myRetailPrice,
      markupRatio,
      syncStatus: globalAutoSync.value ? 'synced' : 'pending',
      status: 'approved',
      appliedAt: new Date().toISOString()
    }
  }

  /* ====== 调价弹窗：可在「加价率 %」与「固定金额 ¥」之间切换 ====== */
  interface PriceDialogState {
    open: boolean
    title: string
    mode: 'ratio' | 'amount'
    /** 用户输入字符串，允许任意数值（包括小数） */
    valueStr: string
    /** 单行场景：被调整的行；批量场景为 null */
    target: DetailRow | null
    /** 批量场景：选中行数；单行场景为 0 */
    batchCount: number
    resolve: ((r: { mode: 'ratio' | 'amount'; value: number } | null) => void) | null
  }

  const priceDialog = reactive<PriceDialogState>({
    open: false,
    title: '调整加价',
    mode: 'ratio',
    valueStr: '30',
    target: null,
    batchCount: 0,
    resolve: null
  })

  /** 解析输入字符串为数值（支持任意正数，包括小数；非法时返回 0） */
  const parsedPriceValue = computed(() => {
    const n = Number(priceDialog.valueStr)
    return Number.isFinite(n) && n >= 0 ? n : 0
  })

  /** 单行实时预览（点开"调价"或"上架"时显示） */
  const pricePreview = computed(() => {
    if (!priceDialog.target) return null
    const fp = priceDialog.target.factoryPrice ?? priceDialog.target.startPrice ?? 0
    const { myRetailPrice, markupRatio } = computeRetail(
      fp,
      priceDialog.mode,
      parsedPriceValue.value
    )
    return { factoryPrice: fp, newRetail: myRetailPrice, derivedRatio: markupRatio }
  })

  function askPrice(opts: {
    title: string
    target?: DetailRow | null
    batchCount?: number
    initialMode?: 'ratio' | 'amount'
    initialValue?: number
  }): Promise<{ mode: 'ratio' | 'amount'; value: number } | null> {
    priceDialog.title = opts.title
    priceDialog.target = opts.target ?? null
    priceDialog.batchCount = opts.batchCount ?? 0
    priceDialog.mode = opts.initialMode ?? 'ratio'
    const init = opts.initialValue ?? (opts.initialMode === 'amount' ? 100 : globalMarkup.value)
    priceDialog.valueStr = String(init)
    priceDialog.open = true
    return new Promise((r) => {
      priceDialog.resolve = r
    })
  }

  function onPriceConfirm() {
    const v = parsedPriceValue.value
    priceDialog.resolve?.({ mode: priceDialog.mode, value: v })
    priceDialog.resolve = null
    priceDialog.open = false
  }

  function onPriceCancel() {
    priceDialog.resolve?.(null)
    priceDialog.resolve = null
    priceDialog.open = false
  }

  function onPriceDialogClosed() {
    // 用户按 ESC / 点击遮罩关掉时也按取消处理
    if (priceDialog.resolve) {
      priceDialog.resolve(null)
      priceDialog.resolve = null
    }
  }

  /** 调用后端 fire-and-forget；网络失败时 console.warn 但不回滚本地态 */
  function silentPushApply(payload: {
    factoryId: string
    productIds: string[]
    markupPercent: number
  }) {
    createAgencyApplication({
      factoryId: payload.factoryId,
      productIds: payload.productIds,
      markupPercent: payload.markupPercent,
      autoSyncPrice: globalAutoSync.value
    }).catch((e) => console.warn('[agency] createAgencyApplication failed:', e))
  }
  function silentPatch(id: string, patch: Parameters<typeof updateAgencyApplication>[1]) {
    updateAgencyApplication(id, patch).catch((e) =>
      console.warn('[agency] updateAgencyApplication failed:', e)
    )
  }
  function silentDelete(id: string) {
    cancelAgencyApplication(id).catch((e) =>
      console.warn('[agency] cancelAgencyApplication failed:', e)
    )
  }

  async function onListOne(card: DetailRow) {
    const res = await askPrice({
      title: `上架「${card.productName}」`,
      target: card,
      initialMode: 'ratio',
      initialValue: globalMarkup.value
    })
    if (!res) return
    const app = buildAppFromCard(card, res.mode, res.value)
    list.value.push(app)
    silentPushApply({
      factoryId: card.factoryId,
      productIds: [card.productId],
      markupPercent: app.markupRatio
    })
    const tail = res.mode === 'ratio' ? `加价 +${res.value}%` : `加价 +¥${res.value}`
    ElMessage.success(`已上架「${card.productName}」 · ${tail}`)
  }

  async function onAdjustMarkup(row: DetailRow) {
    const res = await askPrice({
      title: '调整加价',
      target: row,
      initialMode: 'ratio',
      initialValue: row.markupRatio ?? globalMarkup.value
    })
    if (!res) return
    const target = list.value.find((a) => a.id === row.id)
    if (!target) return
    const { myRetailPrice, markupRatio } = computeRetail(target.factoryPrice, res.mode, res.value)
    target.markupRatio = markupRatio
    target.myRetailPrice = myRetailPrice
    silentPatch(target.id, { markupRatio, myRetailPrice })
    const tail = res.mode === 'ratio' ? `+${res.value}%` : `+¥${res.value}（约 +${markupRatio}%）`
    ElMessage.success(`已调整为 ${tail} → ¥${myRetailPrice}`)
  }

  function onOffline(row: DetailRow) {
    const target = list.value.find((a) => a.id === row.id)
    if (!target) return
    target.status = 'offline'
    silentPatch(target.id, { status: 'offline' })
    ElMessage.success('已下架')
  }

  function onReup(row: DetailRow) {
    const target = list.value.find((a) => a.id === row.id)
    if (!target) return
    target.status = 'approved'
    silentPatch(target.id, { status: 'approved' })
    ElMessage.success('已重新上架')
  }

  async function onCancel(row: DetailRow) {
    try {
      await ElMessageBox.confirm(`取消申请「${row.productName}」？`, '提示', { type: 'warning' })
      list.value = list.value.filter((a) => a.id !== row.id)
      if (row.id) silentDelete(row.id)
      ElMessage.success('已取消申请')
    } catch {
      /* cancel */
    }
  }

  /* ====== 批量操作 ====== */
  async function bulkListing() {
    if (!selectedRows.value.length) return
    const res = await askPrice({
      title: `一键上架 · ${selectedRows.value.length} 件`,
      batchCount: selectedRows.value.length,
      initialMode: 'ratio',
      initialValue: globalMarkup.value
    })
    if (!res) return
    let added = 0
    // 按厂家分组发起申请（后端 POST /m/plaza/agency 一次接受一家厂的多 productIds）
    const byFactory = new Map<string, string[]>()
    for (const row of selectedRows.value) {
      if (row.status) continue
      const app = buildAppFromCard(row, res.mode, res.value)
      list.value.push(app)
      if (!byFactory.has(row.factoryId)) byFactory.set(row.factoryId, [])
      byFactory.get(row.factoryId)!.push(row.productId)
      added++
    }
    for (const [factoryId, productIds] of byFactory) {
      silentPushApply({
        factoryId,
        productIds,
        markupPercent: res.mode === 'ratio' ? res.value : globalMarkup.value
      })
    }
    selectedRows.value = []
    tableRef.value?.clearSelection?.()
    const tail = res.mode === 'ratio' ? `加价 +${res.value}%` : `加价 +¥${res.value}`
    ElMessage.success(`已批量上架 ${added} 件商品 · ${tail}`)
  }

  async function bulkRepricing() {
    if (!selectedRows.value.length) return
    const res = await askPrice({
      title: `批量改价 · ${selectedRows.value.length} 件`,
      batchCount: selectedRows.value.length,
      initialMode: 'ratio',
      initialValue: globalMarkup.value
    })
    if (!res) return
    let updated = 0
    const byFactory = new Map<string, string[]>()
    for (const row of selectedRows.value) {
      const target = list.value.find((a) => a.id === row.id)
      if (target && target.status === 'approved') {
        const { myRetailPrice, markupRatio } = computeRetail(
          target.factoryPrice,
          res.mode,
          res.value
        )
        target.markupRatio = markupRatio
        target.myRetailPrice = myRetailPrice
        silentPatch(target.id, { markupRatio, myRetailPrice })
        updated++
      } else if (!row.status) {
        const app = buildAppFromCard(row, res.mode, res.value)
        list.value.push(app)
        if (!byFactory.has(row.factoryId)) byFactory.set(row.factoryId, [])
        byFactory.get(row.factoryId)!.push(row.productId)
        updated++
      }
    }
    for (const [factoryId, productIds] of byFactory) {
      silentPushApply({
        factoryId,
        productIds,
        markupPercent: res.mode === 'ratio' ? res.value : globalMarkup.value
      })
    }
    selectedRows.value = []
    tableRef.value?.clearSelection?.()
    const tail = res.mode === 'ratio' ? `+${res.value}%` : `+¥${res.value}`
    ElMessage.success(`已批量调价 ${updated} 件 · ${tail}`)
  }

  async function bulkCancel() {
    if (!selectedRows.value.length) return
    try {
      await ElMessageBox.confirm(
        `取消代理选中的 ${selectedRows.value.length} 件商品？`,
        '批量取消',
        { type: 'warning' }
      )
      const idSet = new Set(selectedRows.value.map((r) => r.id))
      list.value.filter((a) => idSet.has(a.id)).forEach((a) => silentDelete(a.id))
      list.value = list.value.filter((a) => !idSet.has(a.id))
      selectedRows.value = []
      tableRef.value?.clearSelection?.()
      ElMessage.success('已批量取消代理')
    } catch {
      /* cancel */
    }
  }

  /* ====== 其它 ====== */
  function goToPlaza() {
    router.push('/merchant/plaza')
  }

  function goChat() {
    drawerOpen.value = false
    router.push('/merchant/chat')
  }

  async function loadData() {
    loading.value = true
    try {
      list.value = await fetchAgencyApplications()
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadSyncConfig()
    loadData()
  })
</script>

<style scoped lang="scss">
  .mp-agency {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .mp-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mp-sync-bar {
    background: linear-gradient(135deg, rgb(255 77 45 / 4%), rgb(255 156 110 / 2%));
    border: 1px solid rgb(255 77 45 / 20%);
    border-radius: 12px;

    :deep(.el-card__body) {
      padding: 14px 18px;
    }
  }

  .mp-sync-bar__row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }

  .mp-sync-bar__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 22px;
    color: var(--el-color-primary, #ff4d2d);
    background: rgb(255 77 45 / 12%);
    border-radius: 12px;
  }

  .mp-factory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .mp-factory-card {
    padding: 16px;
    cursor: pointer;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 12px;
    transition: all 0.18s ease;

    &:hover {
      border-color: var(--el-color-primary, #ff4d2d);
      box-shadow: 0 4px 16px rgb(255 77 45 / 12%);
      transform: translateY(-2px);
    }
  }

  .mp-factory-card__head {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px dashed #f0f0f0;
  }

  .mp-factory-card__arrow {
    flex-shrink: 0;
    font-size: 20px;
    color: #c0c4cc;
  }

  .mp-factory-card__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 12px;
  }

  .mp-stat {
    text-align: center;
  }

  .mp-stat__num {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }

  .mp-stat__label {
    margin-top: 2px;
    font-size: 11px;
    color: #909399;
  }

  .text-success {
    color: var(--el-color-success, #67c23a);
  }

  .text-warning {
    color: var(--el-color-warning, #e6a23c);
  }

  .text-primary {
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-empty {
    padding: 60px 0;
    text-align: center;

    > :first-child {
      font-size: 56px;
      color: #dcdfe6;
    }
  }

  .mp-factory-detail {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 20px;
  }

  .mp-factory-detail__head {
    display: flex;
    gap: 14px;
    align-items: center;
    padding-bottom: 14px;
    border-bottom: 1px solid #ebeef5;
  }

  .mp-factory-detail__tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }
  }

  .mp-bulk-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #fef6f4;
    border: 1px solid rgb(255 77 45 / 30%);
    border-radius: 8px;
  }

  .mp-row-cell {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  /* ============ 调价弹窗 ============ */
  .mp-price-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mp-price-mode {
    display: flex;
    width: 100%;

    :deep(.el-radio-button) {
      flex: 1;
    }

    :deep(.el-radio-button__inner) {
      width: 100%;
    }
  }

  .mp-price-field__label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #303133;
  }

  .mp-price-field__sub {
    margin-left: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #909399;
  }

  .mp-price-field__hint {
    margin-top: 6px;
    font-size: 12px;
    color: #909399;
  }

  .mp-price-preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    background: #fafbfc;
    border: 1px dashed #ebeef5;
    border-radius: 10px;
  }

  .mp-price-preview__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;

    &--accent {
      padding: 6px 0;
      border-top: 1px dashed #e5e7eb;
      border-bottom: 1px dashed #e5e7eb;
    }

    &--small {
      font-size: 12px;
    }
  }

  .mp-price-preview__arrow {
    font-size: 16px;
    line-height: 1;
    color: #c0c4cc;
    text-align: center;
  }

  .mp-price-batch {
    padding: 12px 14px;
    font-size: 13px;
    color: #606266;
    background: #fef6f4;
    border: 1px solid rgb(255 77 45 / 20%);
    border-radius: 8px;
  }
</style>
