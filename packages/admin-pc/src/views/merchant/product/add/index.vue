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
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="mp-form"
    >
      <!-- §1 基础信息 -->
      <ElCard shadow="never" class="mp-section">
        <template #header><span class="mp-section__title">① 基础信息</span></template>

        <ElFormItem label="商品名称" prop="name">
          <ElInput v-model="form.name" placeholder="如 实木北欧餐桌 A 款" maxlength="60" show-word-limit />
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
          <ElInput v-model="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
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
              <ElImage :src="img" fit="cover" style="width: 110px; height: 110px; border-radius: 8px" />
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
                <ElButton size="small" circle :icon="Delete" type="danger" @click="removeImage(i)" />
              </div>
            </div>
            <label class="mp-image-add">
              <input type="file" accept="image/*" multiple class="hidden" @change="onUpload" />
              <ArtSvgIcon icon="ri:add-line" class="text-2xl" />
              <span class="mt-1 text-xs text-g-500">上传图片</span>
              <span class="text-[10px] text-g-400 mt-1">最多 9 张</span>
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
              <ElButton text type="danger" size="small" :icon="Delete" @click="removeSpecGroup(gi)" />
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
              <ElInputNumber v-model="batchFillPrice" :min="0" placeholder="批量价格" controls-position="right" />
              <ElButton size="small" @click="onBatchFillPrice">填零售价</ElButton>
              <ElInputNumber v-model="batchFillStock" :min="0" placeholder="批量库存" controls-position="right" />
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
          <ElSwitch v-model="form.freeShipping" inline-prompt active-text="包邮" inactive-text="不包邮" />
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
      <ElButton size="large" type="primary" @click="submit" :loading="submitting">提交审核</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import {
    ArrowLeft,
    Bottom,
    Delete,
    Plus,
    Top
  } from '@element-plus/icons-vue'

  import { useShopPriceVisibility } from '@/composables/useShopPriceVisibility'

  defineOptions({ name: 'MerchantProductAdd' })

  const router = useRouter()
  const route = useRoute()
  const editingId = computed(() => (route.query.id as string) || '')

  /** 店铺级价格显示规则（只读展示；改在商品管理顶部） */
  const { state: shopRule } = useShopPriceVisibility()

  const TAG_OPTIONS = ['新品', '包邮', '厂家直发', '热销', '限时', '推荐', '环保', 'A级品']
  const SPEC_NAME_OPTIONS = ['尺寸', '颜色', '材质', '风格', '套餐', '版本']

  const categoryOptions = [
    {
      value: 'cat-1',
      label: '客厅家具',
      children: [
        { value: 'cat-1-1', label: '沙发' },
        { value: 'cat-1-2', label: '茶几' },
        { value: 'cat-1-3', label: '电视柜' }
      ]
    },
    {
      value: 'cat-2',
      label: '餐厅家具',
      children: [
        { value: 'cat-2-1', label: '餐桌' },
        { value: 'cat-2-2', label: '餐椅' }
      ]
    },
    {
      value: 'cat-3',
      label: '卧室家具',
      children: [
        { value: 'cat-3-1', label: '床' },
        { value: 'cat-3-2', label: '衣柜' }
      ]
    }
  ]

  interface SpecGroup {
    name: string
    values: string[]
  }
  interface SkuRow {
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

  function ruleDescOf(row: { tier: string; price: PriceVisibility; canBuy: boolean }) {
    const priceText = ({ hidden: '隐藏', wholesale: '批发价', retail: '零售价', member: '会员价' } as Record<string, string>)[row.price]
    const buyText = row.canBuy ? '可下单' : '联系询价'
    return `看到「${priceText}」 · ${buyText}`
  }

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
    pricePerSqm: [
      { type: 'number', min: 0.1, message: '请输入每平方米单价', trigger: 'blur' }
    ]
  }

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  /* ===== 图片 ===== */

  function onUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])
    for (const f of files) {
      if (form.images.length >= 9) break
      form.images.push(URL.createObjectURL(f))
    }
    input.value = ''
  }

  function removeImage(i: number) {
    form.images.splice(i, 1)
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= form.images.length) return
    ;[form.images[i], form.images[j]] = [form.images[j], form.images[i]]
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

  async function submit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) {
      ElMessage.warning('请补全必填项')
      return
    }
    submitting.value = true
    setTimeout(() => {
      submitting.value = false
      ElMessage.success('已提交审核')
      router.push('/merchant/product/list')
    }, 600)
  }

  function saveDraft() {
    ElMessage.success('草稿已保存')
  }

  onMounted(rebuildSku)
</script>

<style scoped lang="scss">
  .mp-product-add {
    padding: 16px 16px 100px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mp-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mp-section {
    border-radius: 12px;
  }

  .mp-section__title {
    font-size: 15px;
    font-weight: 600;
  }

  .mp-section--notice {
    border: 1px dashed #fde6df;
    background: linear-gradient(135deg, #fff8f5 0%, #fffbf3 100%);
  }

  .mp-rule-notice {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .mp-rule-notice__main {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .mp-rule-notice__icon {
    color: var(--el-color-primary, #ff4d2d);
    font-size: 26px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .mp-rule-notice__title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .mp-rule-notice__sub {
    font-size: 12px;
    color: #606266;
    margin-top: 6px;
    line-height: 1.7;
  }

  .mp-rule-notice__pill {
    display: inline-block;
    padding: 2px 10px;
    margin: 0 4px 4px 0;
    background: rgba(255, 77, 45, 0.08);
    color: #ff4d2d;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
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
    border-radius: 8px;
    overflow: hidden;

    &.is-main {
      box-shadow: 0 0 0 2px var(--el-color-primary, #ff4d2d);
    }
  }

  .mp-image__badge {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mp-image__main {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--el-color-primary, #ff4d2d);
    color: #fff;
    font-size: 11px;
  }

  .mp-image__ops {
    position: absolute;
    inset: auto 0 4px 0;
    display: flex;
    gap: 4px;
    padding: 0 4px;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.18s;
  }

  .mp-image:hover .mp-image__ops {
    opacity: 1;
  }

  .mp-image-add {
    width: 110px;
    height: 110px;
    border: 1.5px dashed var(--art-border-color, #e5e7eb);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s;
    color: var(--art-gray-500, #6b7280);

    &:hover {
      border-color: var(--el-color-primary, #ff4d2d);
      color: var(--el-color-primary, #ff4d2d);
      background: rgba(255, 77, 45, 0.04);
    }

    .hidden {
      display: none;
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
    border: 1px solid var(--art-border-color, #e5e7eb);
    border-radius: 10px;
    background: #fafbfc;
  }

  .mp-spec-group__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  /* ===== 按尺寸定价 ===== */

  .mp-bysize {
    padding: 14px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(255, 77, 45, 0.06), rgba(255, 77, 45, 0.02));
    border: 1px dashed rgba(255, 77, 45, 0.3);
  }

  .mp-bysize-preview {
    margin-top: 6px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 8px;
    font-size: 13px;
    color: var(--el-color-primary, #ff4d2d);
    font-weight: 500;
  }

  /* ===== Sticky 底部 ===== */

  .mp-sticky-bottom {
    position: fixed;
    bottom: 0;
    left: var(--art-sidebar-width, 230px);
    right: 0;
    z-index: 5;
    background: #fff;
    border-top: 1px solid var(--art-border-color, #e5e7eb);
    padding: 12px 28px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    box-shadow: 0 -4px 12px -8px rgba(0, 0, 0, 0.05);
  }
</style>
