<!-- 商家 PC · 添加商品（S3-T3）-->
<template>
  <div class="mp-product-add">
    <!-- 顶部 -->
    <div class="mp-page-header">
      <div>
        <ElButton text :icon="ArrowLeft" @click="router.back()">返回</ElButton>
        <h2 class="m-0 text-xl font-semibold inline-block ml-2">
          {{ editingId ? '编辑商品' : '添加商品' }}
        </h2>
      </div>
      <div class="flex gap-2">
        <ElButton @click="saveDraft">保存草稿</ElButton>
        <ElButton type="primary" @click="submit" :loading="submitting">提交审核</ElButton>
      </div>
    </div>

    <!-- 三栏分段表单 -->
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" class="mp-form">
      <!-- §1 基础信息 -->
      <ElCard shadow="never" class="mp-section">
        <template #header><span class="mp-section__title">① 基础信息</span></template>

        <ElFormItem label="商品名称" prop="name">
          <ElInput
            v-model="form.name"
            placeholder="如 实木北欧餐桌 A 款"
            maxlength="60"
            show-word-limit
          />
        </ElFormItem>

        <div class="mp-row-2">
          <ElFormItem label="商品分类" prop="categoryId">
            <ElCascader
              v-model="form.categoryId"
              :options="categoryOptions"
              placeholder="选择分类"
              clearable
            />
          </ElFormItem>
          <ElFormItem label="商品标签">
            <ElSelect
              v-model="form.tags"
              multiple
              filterable
              allow-create
              placeholder="选择或新建标签"
            >
              <ElOption v-for="t in TAG_OPTIONS" :key="t" :label="t" :value="t" />
            </ElSelect>
          </ElFormItem>
        </div>

        <ElFormItem label="商品简介">
          <ElInput
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </ElFormItem>

        <!-- 图片 CRUD -->
        <ElFormItem label="商品图片（首张为主图）">
          <div class="mp-images">
            <div
              v-for="(img, i) in form.images"
              :key="i"
              class="mp-image"
              :class="{ 'is-main': i === 0 }"
            >
              <ElImage
                :src="img"
                fit="cover"
                style="width: 110px; height: 110px; border-radius: 8px"
              />
              <div class="mp-image__badge">{{ i + 1 }}</div>
              <span v-if="i === 0" class="mp-image__main">主图</span>
              <div class="mp-image__ops">
                <ElButton size="small" circle :icon="Top" v-if="i > 0" @click="moveImage(i, -1)" />
                <ElButton
                  size="small"
                  circle
                  :icon="Bottom"
                  v-if="i < form.images.length - 1"
                  @click="moveImage(i, 1)"
                />
                <ElButton
                  size="small"
                  circle
                  :icon="Delete"
                  type="danger"
                  @click="removeImage(i)"
                />
              </div>
            </div>
            <!-- 上传中的占位（每个等待中的请求一个 spinner，与 form.images 区分开） -->
            <div
              v-for="n in uploadingCount"
              :key="`uploading-${n}`"
              class="mp-image mp-image--uploading"
            >
              <ElIcon class="mp-image__spinner"><Loading /></ElIcon>
              <span class="text-[10px] text-g-500 mt-1">上传中</span>
            </div>
            <label class="mp-image-add" v-if="form.images.length + uploadingCount < MAX_IMAGES">
              <input type="file" accept="image/*" multiple class="hidden" @change="onUpload" />
              <ArtSvgIcon icon="ri:add-line" class="text-2xl" />
              <span class="mt-1 text-xs text-g-500">上传图片</span>
              <span class="text-[10px] text-g-400 mt-1">最多 {{ MAX_IMAGES }} 张</span>
            </label>
          </div>
        </ElFormItem>
      </ElCard>

      <!-- §2 规格 SKU -->
      <ElCard shadow="never" class="mp-section">
        <template #header><span class="mp-section__title">② 规格 SKU</span></template>

        <div class="mp-specs">
          <div v-for="(group, gi) in form.specs" :key="gi" class="mp-spec-group">
            <div class="mp-spec-group__head">
              <ElSelect
                v-model="group.name"
                placeholder="规格名"
                filterable
                allow-create
                style="width: 140px"
                @change="rebuildSku"
              >
                <ElOption v-for="n in SPEC_NAME_OPTIONS" :key="n" :label="n" :value="n" />
              </ElSelect>
              <ElButton
                text
                type="danger"
                size="small"
                :icon="Delete"
                @click="removeSpecGroup(gi)"
              />
            </div>
            <div class="mp-spec-values">
              <ElTag
                v-for="(v, vi) in group.values"
                :key="vi"
                closable
                @close="removeSpecValue(gi, vi)"
                effect="plain"
              >
                {{ v }}
              </ElTag>
              <ElInput
                v-if="addingValueAt === gi"
                v-model="newSpecValue"
                placeholder="按回车添加"
                size="small"
                style="width: 120px"
                @keyup.enter="confirmAddValue(gi)"
                @blur="confirmAddValue(gi)"
              />
              <ElButton v-else size="small" plain @click="startAddValue(gi)">+ 添加值</ElButton>
            </div>
          </div>

          <ElButton plain :icon="Plus" @click="addSpecGroup" v-if="form.specs.length < 4">
            添加规格（最多 4 组）
          </ElButton>
        </div>

        <!-- SKU 矩阵 -->
        <div v-if="skuMatrix.length" class="mp-sku-matrix">
          <div class="mp-sku-matrix__head">
            <span>共 {{ skuMatrix.length }} 个 SKU</span>
            <div class="flex gap-2">
              <ElInputNumber
                v-model="batchFillPrice"
                :min="0"
                placeholder="批量价格"
                controls-position="right"
              />
              <ElButton size="small" @click="onBatchFillPrice">填零售价</ElButton>
              <ElInputNumber
                v-model="batchFillStock"
                :min="0"
                placeholder="批量库存"
                controls-position="right"
              />
              <ElButton size="small" @click="onBatchFillStock">填库存</ElButton>
            </div>
          </div>
          <ElTable :data="skuMatrix" stripe size="small">
            <ElTableColumn
              v-for="(s, si) in form.specs"
              :key="si"
              :label="s.name"
              :prop="`specs.${si}`"
              width="120"
            >
              <template #default="{ row }">{{ row.specs[si] }}</template>
            </ElTableColumn>
            <ElTableColumn label="批发价" width="140">
              <template #default="{ row }">
                <ElInputNumber v-model="row.priceWholesale" :min="0" size="small" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="零售价" width="140">
              <template #default="{ row }">
                <ElInputNumber v-model="row.priceRetail" :min="0" size="small" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="会员价" width="140">
              <template #default="{ row }">
                <ElInputNumber v-model="row.priceMember" :min="0" size="small" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="库存" width="120">
              <template #default="{ row }">
                <ElInputNumber v-model="row.stock" :min="0" size="small" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="启用" width="80" align="center">
              <template #default="{ row }">
                <ElSwitch v-model="row.active" />
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </ElCard>

      <!-- §3 价格库存 -->
      <ElCard shadow="never" class="mp-section">
        <template #header><span class="mp-section__title">③ 价格 / 定价模式</span></template>

        <ElFormItem label="定价模式">
          <ElRadioGroup v-model="form.pricingMode">
            <ElRadio value="standard">标准定价（按 SKU）</ElRadio>
            <ElRadio value="by-size">按尺寸定价（地毯 / 桌布 / 窗帘等定制）</ElRadio>
          </ElRadioGroup>
        </ElFormItem>

        <!-- 按尺寸定价细节 -->
        <div v-if="form.pricingMode === 'by-size'" class="mp-bysize">
          <div class="mp-row-3">
            <ElFormItem label="每平方米单价（元）" prop="pricePerSqm">
              <ElInputNumber v-model="form.pricePerSqm" :min="0" controls-position="right" />
            </ElFormItem>
            <ElFormItem label="起售费（元）">
              <ElInputNumber v-model="form.baseFee" :min="0" controls-position="right" />
            </ElFormItem>
            <ElFormItem label="尺寸单位">
              <ElRadioGroup v-model="form.sizeUnit">
                <ElRadioButton value="cm">cm</ElRadioButton>
                <ElRadioButton value="m">m</ElRadioButton>
              </ElRadioGroup>
            </ElFormItem>
          </div>
          <div class="mp-row-4">
            <ElFormItem label="最小长度">
              <ElInputNumber v-model="form.minLength" :min="0" controls-position="right" />
            </ElFormItem>
            <ElFormItem label="最小宽度">
              <ElInputNumber v-model="form.minWidth" :min="0" controls-position="right" />
            </ElFormItem>
            <ElFormItem label="最大长度">
              <ElInputNumber v-model="form.maxLength" :min="0" controls-position="right" />
            </ElFormItem>
            <ElFormItem label="最大宽度">
              <ElInputNumber v-model="form.maxWidth" :min="0" controls-position="right" />
            </ElFormItem>
          </div>
          <div class="mp-bysize-preview">
            公式预览 · 面积（m²）× ¥{{ form.pricePerSqm || 0 }} + 起售费 ¥{{ form.baseFee || 0 }}
            = 总价
          </div>
        </div>

        <ElFormItem label="包邮" v-if="form.pricingMode === 'standard'">
          <ElSwitch
            v-model="form.freeShipping"
            inline-prompt
            active-text="包邮"
            inactive-text="不包邮"
          />
        </ElFormItem>
      </ElCard>

      <!-- §4 价格显示规则提示（已上移至「商品管理」店铺级配置） -->
      <ElCard shadow="never" class="mp-section mp-section--notice">
        <template #header>
          <span class="mp-section__title">④ 价格显示规则</span>
          <ElTag size="small" type="success" effect="plain" class="ml-2">店铺级配置</ElTag>
        </template>

        <div class="mp-rule-notice">
          <div class="mp-rule-notice__main">
            <ArtSvgIcon icon="ri:price-tag-2-fill" class="mp-rule-notice__icon" />
            <div>
              <div class="mp-rule-notice__title">价格显示规则已移至「商品管理」店铺级配置</div>
              <div class="mp-rule-notice__sub">
                改一次全店所有商品立即生效；当前商品也会自动跟随店铺规则展示价格。
                <b>当前店铺规则：</b>
                <span class="mp-rule-notice__pill">
                  访客 {{ shopRule.guestAllow ? '允许浏览' : '禁止进入' }}
                </span>
                <span class="mp-rule-notice__pill">
                  普通客户：{{ shopRule.customerPrice === 'retail' ? '零售价' : '不显示' }}
                </span>
                <span class="mp-rule-notice__pill">
                  授权门店：{{ shopRule.agencyPrice === 'wholesale' ? '批发价' : '零售价' }}
                </span>
                <span class="mp-rule-notice__pill">
                  会员客户：{{ shopRule.memberPrice === 'member' ? '会员价' : '零售价' }}
                </span>
              </div>
            </div>
          </div>
          <ElButton
            type="primary"
            plain
            size="small"
            @click="router.push('/merchant/product/list')"
          >
            去店铺规则页修改
          </ElButton>
        </div>
      </ElCard>
    </ElForm>

    <!-- 底部 sticky -->
    <div class="mp-sticky-bottom">
      <ElButton size="large" @click="router.back()">取消</ElButton>
      <ElButton size="large" @click="saveDraft">保存草稿</ElButton>
      <ElButton size="large" type="primary" @click="submit" :loading="submitting"
        >提交审核</ElButton
      >
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { ArrowLeft, Bottom, Delete, Loading, Plus, Top } from '@element-plus/icons-vue'

  import { useShopPriceVisibility } from '@/composables/useShopPriceVisibility'
  import {
    fetchMerchantCategories,
    fetchPlatformCategoriesForMerchant,
    createMerchantProduct,
    updateMerchantProduct,
    fetchMerchantProductDetail,
    uploadImage
  } from '@/api/merchant-business'
  import type { Category } from '@jiujiu/shared/types'

  defineOptions({ name: 'MerchantProductAdd' })

  const router = useRouter()
  const route = useRoute()
  const editingId = computed(() => (route.query.id as string) || '')

  /** 店铺级价格显示规则（只读展示；改在商品管理顶部） */
  const { state: shopRule } = useShopPriceVisibility()

  const TAG_OPTIONS = ['新品', '包邮', '厂家直发', '热销', '限时', '推荐', '环保', 'A级品']
  const SPEC_NAME_OPTIONS = ['尺寸', '颜色', '材质', '风格', '套餐', '版本']

  // 分类级联：从后端真实分类构建（优先商家自定义，回退平台分类）。
  interface CascaderNode {
    value: string
    label: string
    children?: CascaderNode[]
  }

  const categoryOptions = ref<CascaderNode[]>([])

  function buildCascaderTree(flat: Category[]): CascaderNode[] {
    const byId = new Map<string, CascaderNode & { _parentId: string | null; _sort: number }>()
    for (const c of flat) {
      byId.set(c.id, {
        value: c.id,
        label: c.name,
        children: [],
        _parentId: c.parentId ?? null,
        _sort: c.sort ?? 0
      })
    }
    const roots: CascaderNode[] = []
    for (const node of byId.values()) {
      if (node._parentId && byId.has(node._parentId)) {
        const parent = byId.get(node._parentId)!
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
    const sortRec = (list: CascaderNode[]) => {
      list.sort((a, b) => ((a as any)._sort ?? 0) - ((b as any)._sort ?? 0))
      list.forEach((n) => {
        if (n.children?.length) sortRec(n.children)
        else delete n.children
      })
    }
    sortRec(roots)
    return roots
  }

  async function loadCategories() {
    try {
      const own = await fetchMerchantCategories()
      const flat = own.length ? own : await fetchPlatformCategoriesForMerchant()
      categoryOptions.value = buildCascaderTree(flat)
    } catch {
      categoryOptions.value = []
    }
  }

  interface SpecGroup {
    name: string
    values: string[]
  }
  interface SkuRow {
    /**
     * 后端 SKU 主键 —— 新建时为空字符串，编辑模式由 loadProduct 回填。
     * 后端 updateProduct 据此决定 update/create/delete：
     *   - 有 id 且仍在数组：update
     *   - 无 id：create
     *   - 数据库已存在但 dto.skus 没出现：delete
     * 不带 id 提交编辑会让原有 SKU 全部被识别为新增 → 库存翻倍 / 旧 SKU 残留。
     */
    id?: string
    specs: string[]
    priceWholesale: number
    priceRetail: number
    priceMember: number
    stock: number
    active: boolean
  }

  const form = reactive({
    name: '',
    categoryId: [] as string[],
    tags: [] as string[],
    description: '',
    images: [] as string[],
    specs: [] as SpecGroup[],
    pricingMode: 'standard' as 'standard' | 'by-size',
    pricePerSqm: 0,
    baseFee: 0,
    sizeUnit: 'cm' as 'cm' | 'm',
    minLength: 50,
    minWidth: 50,
    maxLength: 600,
    maxWidth: 400,
    freeShipping: true,
    priceVisibility: [
      {
        tier: 'guest',
        label: '游客 / 未登录',
        icon: 'ri:user-line',
        color: '#9CA3AF',
        hint: '尚未登录的访客',
        price: 'hidden' as PriceVisibility,
        canBuy: false,
        locked: false
      },
      {
        tier: 'customer',
        label: '普通客户',
        icon: 'ri:user-3-line',
        color: '#3B82F6',
        hint: '已登录的零售客户',
        price: 'retail' as PriceVisibility,
        canBuy: true,
        locked: false
      },
      {
        tier: 'member',
        label: '会员客户',
        icon: 'ri:vip-crown-2-line',
        color: '#A855F7',
        hint: '已开通会员的客户',
        price: 'member' as PriceVisibility,
        canBuy: true,
        locked: false
      },
      {
        tier: 'agency',
        label: '分佣 / 授权门店',
        icon: 'ri:store-3-line',
        color: '#FF4D2D',
        hint: '已被授权的代理 / 门店',
        price: 'wholesale' as PriceVisibility,
        canBuy: true,
        locked: false
      }
    ]
  })

  type PriceVisibility = 'hidden' | 'wholesale' | 'retail' | 'member'

  const skuMatrix = ref<SkuRow[]>([])

  const rules: FormRules = {
    name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
    categoryId: [
      {
        type: 'array',
        required: true,
        message: '请选择商品分类',
        trigger: 'change'
      }
    ],
    pricePerSqm: [{ type: 'number', min: 0.1, message: '请输入每平方米单价', trigger: 'blur' }]
  }

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  /* ===== 图片 ===== */

  // 正在上传的图片数；>0 时表示有图片还没拿到对象存储 URL，submit/saveDraft 需要被拦截。
  // 之前的实现把 `URL.createObjectURL(file)` 生成的 blob: 链接直接塞进 form.images
  // 提交，服务器存到数据库的就是 `blob:http://localhost:.../xxx`，C 端无法回显（404）。
  // 现在选图后立即通过 `/api/v1/files/upload` 上传，拿到对象存储 URL 再写回 form.images。
  const uploadingCount = ref(0)
  const MAX_IMAGES = 9
  const MAX_IMAGE_MB = 5 // 与后端 files.service 校验保持一致（图片 ≤ 5MB）

  async function onUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])
    input.value = '' // 提前清空，避免选同一张图触发不了 change

    const accepted: File[] = []
    for (const f of files) {
      if (form.images.length + accepted.length + uploadingCount.value >= MAX_IMAGES) {
        ElMessage.warning(`最多 ${MAX_IMAGES} 张图片`)
        break
      }
      if (!f.type.startsWith('image/')) {
        ElMessage.warning(`「${f.name}」不是图片文件，已跳过`)
        continue
      }
      if (f.size / 1024 / 1024 > MAX_IMAGE_MB) {
        ElMessage.warning(`「${f.name}」超过 ${MAX_IMAGE_MB}MB，已跳过`)
        continue
      }
      accepted.push(f)
    }
    if (!accepted.length) return

    // 并行上传，单张失败不影响其他张；按到达顺序 push 到 form.images。
    uploadingCount.value += accepted.length
    await Promise.all(
      accepted.map(async (f) => {
        try {
          const r = await uploadImage(f, 'product')
          if (r?.url) {
            form.images.push(r.url)
          } else {
            ElMessage.error(`「${f.name}」上传失败：服务端未返回 URL`)
          }
        } catch (err: any) {
          ElMessage.error(err?.message || `「${f.name}」上传失败`)
        } finally {
          uploadingCount.value -= 1
        }
      })
    )
  }

  function removeImage(i: number) {
    form.images.splice(i, 1)
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= form.images.length) return
    ;[form.images[i], form.images[j]] = [form.images[j], form.images[i]]
  }

  /**
   * 图片 URL 合法性校验
   *
   * submit / saveDraft 之前最终防御：
   *   - 必须全部是 http:// 或 https:// 开头的真实 URL
   *   - 任何 blob: / data: / 空字符串 / 相对路径都视为非法（说明上传失败或 helper 失效）
   */
  function ensureImagesUploaded(): boolean {
    if (uploadingCount.value > 0) {
      ElMessage.error(`还有 ${uploadingCount.value} 张图片正在上传，请等待完成后再提交`)
      return false
    }
    const bad = form.images.find((u) => !/^https?:\/\//i.test(u))
    if (bad) {
      ElMessage.error('存在未成功上传的图片，请删除后重新上传')
      return false
    }
    return true
  }

  /* ===== 规格 ===== */

  const newSpecValue = ref('')
  const addingValueAt = ref(-1)

  function addSpecGroup() {
    if (form.specs.length >= 4) return
    form.specs.push({ name: '', values: [] })
  }

  function removeSpecGroup(gi: number) {
    form.specs.splice(gi, 1)
    rebuildSku()
  }

  function startAddValue(gi: number) {
    addingValueAt.value = gi
    newSpecValue.value = ''
  }

  function confirmAddValue(gi: number) {
    const val = newSpecValue.value.trim()
    if (val && !form.specs[gi].values.includes(val)) {
      form.specs[gi].values.push(val)
      rebuildSku()
    }
    addingValueAt.value = -1
    newSpecValue.value = ''
  }

  function removeSpecValue(gi: number, vi: number) {
    form.specs[gi].values.splice(vi, 1)
    rebuildSku()
  }

  function rebuildSku() {
    // 笛卡尔积
    const valid = form.specs.filter((s) => s.name && s.values.length > 0)
    if (valid.length === 0) {
      skuMatrix.value = []
      return
    }
    const oldKeys = new Map(skuMatrix.value.map((r) => [r.specs.join('|'), r]))
    let combos: string[][] = [[]]
    for (const g of valid) {
      const next: string[][] = []
      for (const c of combos) {
        for (const v of g.values) next.push([...c, v])
      }
      combos = next
    }
    skuMatrix.value = combos.map((specs) => {
      const key = specs.join('|')
      const existing = oldKeys.get(key)
      return (
        existing || {
          specs,
          priceWholesale: 0,
          priceRetail: 0,
          priceMember: 0,
          stock: 0,
          active: true
        }
      )
    })
  }

  const batchFillPrice = ref<number>()
  const batchFillStock = ref<number>()

  function onBatchFillPrice() {
    if (batchFillPrice.value === undefined) return
    skuMatrix.value.forEach((r) => (r.priceRetail = batchFillPrice.value!))
    ElMessage.success(`已批量填入零售价 ¥${batchFillPrice.value}`)
  }

  function onBatchFillStock() {
    if (batchFillStock.value === undefined) return
    skuMatrix.value.forEach((r) => (r.stock = batchFillStock.value!))
    ElMessage.success(`已批量填入库存 ${batchFillStock.value}`)
  }

  /* ===== 提交 ===== */

  /**
   * 把当前表单整理成后端 `ProductCreateDto` 形态：
   *
   * - categoryId 取级联器选中链路的叶子（最末一项）
   * - priceDisplayRules 来源于店铺级 `useShopPriceVisibility`（前端店铺统一规则）
   * - skus 把 SkuRow.specs 数组配合 form.specs[].name 还原成 {规格名:规格值} record
   * - pricingMode / 按尺寸定价相关字段作为附加业务字段透传（后端 Prisma 模型
   *   支持任意 JSON 列时直接落地，否则被忽略不报错）
   */
  function buildProductPayload(extra: Record<string, unknown> = {}) {
    const leafCategoryId =
      Array.isArray(form.categoryId) && form.categoryId.length
        ? form.categoryId[form.categoryId.length - 1]
        : ''
    const specNames = form.specs.map((g) => g.name)
    const skus = skuMatrix.value.map((row) => {
      const specRecord: Record<string, string> = {}
      specNames.forEach((name, i) => {
        if (name) specRecord[name] = row.specs[i] ?? ''
      })
      return {
        // id 仅在编辑模式有值；后端按 id 走 update，未带 id 走 create
        ...(row.id ? { id: row.id } : {}),
        specs: specRecord,
        specsLabel: row.specs.join(' / '),
        priceWholesale: row.priceWholesale,
        priceRetail: row.priceRetail,
        priceMember: row.priceMember,
        stock: row.stock,
        active: row.active
      }
    })
    const retailPrices = skus.map((s) => s.priceRetail).filter((n) => typeof n === 'number')
    const wholesalePrices = skus
      .map((s) => s.priceWholesale)
      .filter((n) => typeof n === 'number' && n > 0)
    const memberPrices = skus
      .map((s) => s.priceMember)
      .filter((n) => typeof n === 'number' && n > 0)
    return {
      name: form.name,
      categoryId: leafCategoryId,
      description: form.description,
      images: [...form.images],
      tags: [...form.tags],
      shipping: ['factory'] as ('factory' | 'local' | 'pickup')[],
      priceDisplayRules: {
        guestVisible: shopRule.value.guestAllow,
        customerTier: shopRule.value.customerPrice === 'retail' ? 'retail' : 'hidden',
        storeTier: shopRule.value.agencyPrice === 'wholesale' ? 'wholesale' : 'retail',
        memberTier: shopRule.value.memberPrice === 'member' ? 'member' : 'retail'
      },
      skus,
      // 价格区间（取 SKU 聚合后的 min/max 写入主表，方便列表页显示）
      priceRetailMin: retailPrices.length ? Math.min(...retailPrices) : 0,
      priceRetailMax: retailPrices.length ? Math.max(...retailPrices) : 0,
      priceWholesaleMin: wholesalePrices.length ? Math.min(...wholesalePrices) : 0,
      priceWholesaleMax: wholesalePrices.length ? Math.max(...wholesalePrices) : 0,
      priceMemberMin: memberPrices.length ? Math.min(...memberPrices) : 0,
      priceMemberMax: memberPrices.length ? Math.max(...memberPrices) : 0,
      totalStock: skus.reduce((acc, s) => acc + (s.stock || 0), 0),
      // 按尺寸定价等业务扩展字段（后端忽略未声明字段，不会 500）
      pricingMode: form.pricingMode,
      freeShipping: form.freeShipping,
      ...(form.pricingMode === 'by-size'
        ? {
            pricePerSqm: form.pricePerSqm,
            baseFee: form.baseFee,
            sizeUnit: form.sizeUnit,
            minLength: form.minLength,
            minWidth: form.minWidth,
            maxLength: form.maxLength,
            maxWidth: form.maxWidth
          }
        : {}),
      ...extra
    }
  }

  async function submit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) {
      ElMessage.warning('请补全必填项')
      return
    }
    if (!ensureImagesUploaded()) return
    submitting.value = true
    try {
      const payload = buildProductPayload({ status: 'auditing' })
      if (editingId.value) {
        await updateMerchantProduct(editingId.value, payload)
        ElMessage.success('已更新并提交审核')
      } else {
        await createMerchantProduct(payload)
        ElMessage.success('已提交审核')
      }
      router.push('/merchant/product/list')
    } catch (e: any) {
      ElMessage.error(e?.message || '提交失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  async function saveDraft() {
    if (!ensureImagesUploaded()) return
    submitting.value = true
    try {
      const payload = buildProductPayload({ status: 'draft' })
      if (editingId.value) {
        await updateMerchantProduct(editingId.value, payload)
      } else {
        await createMerchantProduct(payload)
      }
      ElMessage.success('草稿已保存')
    } catch (e: any) {
      ElMessage.error(e?.message || '草稿保存失败')
    } finally {
      submitting.value = false
    }
  }

  /**
   * 编辑模式回填
   *
   * 当 URL 携带 ?id=xxx 时，从后端拉取商品详情写回所有 form 字段 + SKU 矩阵。
   * 之前 onMounted 完全忽略 query.id → 编辑商品时看到的是全新空表单，
   * 用户随便填几个字段点「提交审核」实际上等同于「新建一份新商品」，
   * 原商品所有字段被替换为空白。
   *
   * 实现要点：
   *   - 先用 form.specs / skuMatrix 还原规格组与 SKU 矩阵，再让 rebuildSku 合并
   *     现有 SKU 价格 / 库存 / id；rebuildSku 在 oldKeys 命中时会复用整行（含 id）
   *   - 按尺寸定价 (pricingMode = 'by-size') 的扩展字段一并还原
   */
  async function loadProduct() {
    if (!editingId.value) return
    const data = await fetchMerchantProductDetail(editingId.value)
    if (!data) {
      ElMessage.warning('商品不存在或已被删除')
      router.replace('/merchant/product/list')
      return
    }
    form.name = data.name ?? ''
    form.description = data.description ?? ''
    form.images = Array.isArray(data.images) ? [...data.images] : []
    form.tags = Array.isArray(data.tags) ? [...data.tags] : []
    // categoryId 是 cascader 链路：后端只存叶子 id，UI 用 array
    form.categoryId = data.categoryId ? [data.categoryId] : []
    // 按尺寸定价的扩展字段
    if (data.pricingMode === 'by-size') {
      form.pricingMode = 'by-size'
      form.pricePerSqm = Number(data.pricePerSqm ?? 0)
      form.baseFee = Number(data.baseFee ?? 0)
      form.sizeUnit = (data.sizeUnit as 'cm' | 'm') ?? 'cm'
      form.minLength = Number(data.minLength ?? 50)
      form.minWidth = Number(data.minWidth ?? 50)
      form.maxLength = Number(data.maxLength ?? 600)
      form.maxWidth = Number(data.maxWidth ?? 400)
    } else {
      form.pricingMode = 'standard'
      form.freeShipping = !!data.freeShipping
    }

    // 还原规格组与 SKU 矩阵（参考 merchant-app 同款 loadProduct 实现）
    const dbSkus: Array<Record<string, any>> = Array.isArray(data.skus) ? data.skus : []
    if (dbSkus.length > 0) {
      // 按首次出现顺序反推 specGroups（保持 SKU 矩阵列顺序与历史一致）
      const groupOrder: string[] = []
      const groupValues: Record<string, string[]> = {}
      for (const sku of dbSkus) {
        const specs = (sku.specs ?? {}) as Record<string, string>
        for (const [k, v] of Object.entries(specs)) {
          if (!groupOrder.includes(k)) groupOrder.push(k)
          if (!groupValues[k]) groupValues[k] = []
          if (!groupValues[k].includes(String(v))) groupValues[k].push(String(v))
        }
      }
      form.specs = groupOrder.map((name) => ({ name, values: groupValues[name] }))

      // 直接用后端数据构建 SKU 矩阵，保留每行的真实 id
      skuMatrix.value = dbSkus.map((sku) => ({
        id: String(sku.id ?? ''),
        specs: groupOrder.map((g) => String((sku.specs ?? {})[g] ?? '')),
        priceWholesale: Number(sku.priceWholesale ?? 0),
        priceRetail: Number(sku.priceRetail ?? 0),
        priceMember: Number(sku.priceMember ?? 0),
        stock: Number(sku.stock ?? 0),
        active: sku.active !== false
      }))
    }
  }

  onMounted(async () => {
    await loadCategories()
    if (editingId.value) {
      await loadProduct()
    }
    if (skuMatrix.value.length === 0) rebuildSku()
  })
</script>

<style scoped lang="scss">
  .mp-product-add {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px 16px 100px;
  }

  .mp-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mp-section {
    border-radius: 12px;
  }

  .mp-section__title {
    font-size: 15px;
    font-weight: 600;
  }

  .mp-section--notice {
    background: linear-gradient(135deg, #fff8f5 0%, #fffbf3 100%);
    border: 1px dashed #fde6df;
  }

  .mp-rule-notice {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .mp-rule-notice__main {
    display: flex;
    flex: 1;
    gap: 12px;
    align-items: flex-start;
    min-width: 0;
  }

  .mp-rule-notice__icon {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 26px;
    color: var(--el-color-primary, #ff4d2d);
  }

  .mp-rule-notice__title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .mp-rule-notice__sub {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.7;
    color: #606266;
  }

  .mp-rule-notice__pill {
    display: inline-block;
    padding: 2px 10px;
    margin: 0 4px 4px 0;
    font-size: 11px;
    font-weight: 500;
    color: #ff4d2d;
    background: rgb(255 77 45 / 8%);
    border-radius: 999px;
  }

  .mp-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .mp-row-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .mp-row-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  /* ===== 图片 ===== */

  .mp-images {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .mp-image {
    position: relative;
    width: 110px;
    height: 110px;
    overflow: hidden;
    border-radius: 8px;

    &.is-main {
      box-shadow: 0 0 0 2px var(--el-color-primary, #ff4d2d);
    }
  }

  .mp-image__badge {
    position: absolute;
    top: 4px;
    left: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 11px;
    color: #fff;
    background: rgb(0 0 0 / 55%);
    border-radius: 50%;
  }

  .mp-image__main {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 1px 6px;
    font-size: 11px;
    color: #fff;
    background: var(--el-color-primary, #ff4d2d);
    border-radius: 4px;
  }

  .mp-image__ops {
    position: absolute;
    inset: auto 0 4px;
    display: flex;
    gap: 4px;
    justify-content: center;
    padding: 0 4px;
    opacity: 0;
    transition: opacity 0.18s;
  }

  .mp-image:hover .mp-image__ops {
    opacity: 1;
  }

  .mp-image-add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 110px;
    height: 110px;
    color: var(--art-gray-500, #6b7280);
    cursor: pointer;
    border: 1.5px dashed var(--art-border-color, #e5e7eb);
    border-radius: 8px;
    transition: all 0.18s;

    &:hover {
      color: var(--el-color-primary, #ff4d2d);
      background: rgb(255 77 45 / 4%);
      border-color: var(--el-color-primary, #ff4d2d);
    }

    .hidden {
      display: none;
    }
  }

  .mp-image--uploading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 110px;
    height: 110px;
    color: var(--el-color-primary, #ff4d2d);
    background: rgb(255 77 45 / 5%);
    border: 1.5px dashed var(--el-color-primary, #ff4d2d);
    border-radius: 8px;
  }

  .mp-image__spinner {
    font-size: 24px;
    animation: mp-spin 1s linear infinite;
  }

  @keyframes mp-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  /* ===== 规格 ===== */

  .mp-specs {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 10px;
  }

  .mp-spec-group {
    padding: 12px;
    background: #fafbfc;
    border: 1px solid var(--art-border-color, #e5e7eb);
    border-radius: 10px;
  }

  .mp-spec-group__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .mp-spec-values {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  /* ===== SKU 矩阵 ===== */

  .mp-sku-matrix {
    margin-top: 18px;
  }

  .mp-sku-matrix__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  /* ===== 按尺寸定价 ===== */

  .mp-bysize {
    padding: 14px;
    background: linear-gradient(135deg, rgb(255 77 45 / 6%), rgb(255 77 45 / 2%));
    border: 1px dashed rgb(255 77 45 / 30%);
    border-radius: 10px;
  }

  .mp-bysize-preview {
    padding: 10px 14px;
    margin-top: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-color-primary, #ff4d2d);
    background: rgb(255 255 255 / 70%);
    border-radius: 8px;
  }

  /* ===== Sticky 底部 ===== */

  .mp-sticky-bottom {
    position: fixed;
    right: 0;
    bottom: 0;
    left: var(--art-sidebar-width, 230px);
    z-index: 5;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 12px 28px;
    background: #fff;
    border-top: 1px solid var(--art-border-color, #e5e7eb);
    box-shadow: 0 -4px 12px -8px rgb(0 0 0 / 5%);
  }
</style>
