<script setup lang="ts">
/**
 * MA-06 · 添加 / 编辑商品（含 FX-2/5/6 增强）
 *
 * 1. 图片 CRUD：上传/删除/替换/预览/设为主图/排序
 * 2. 定价模式：普通 / 按尺寸定价（每平方米单价 + 用户输入长宽自动算总价）
 * 3. 自定义 SKU 规格：规格名 + 多值，自动生成 SKU 矩阵
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { categoryService, productService } from '../../services/product'
import { formatPrice } from '@jiujiu/shared/utils'
import type { Category } from '@jiujiu/shared/types'
import { BASE_URL } from '../../utils/request'
import { useUserStore } from '../../store/user'
import NavBar from '../../components/nav-bar/nav-bar.vue'
import Icon from '../../components/icon/icon.vue'
import StatusTag from '../../components/status-tag/status-tag.vue'

const userStore = useUserStore()
const uploading = ref(false)

/**
 * 上传单张图片到 /files/upload，返回正式 URL
 *
 * 选图后必须先上传换成 https URL 再写入 form.images，绝不能把 tempFilePaths
 * 直接提交给后端 productService.create — 后端服务器无法访问本机临时路径，
 * 商品落库后图片只会在原选图设备上能看一次，下次刷新就 404。
 */
function uploadImage(tempPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/api/v1/files/upload',
      filePath: tempPath,
      name: 'file',
      formData: { bizType: 'product' },
      header: userStore.accessToken ? { Authorization: `Bearer ${userStore.accessToken}` } : {},
      success: (res: any) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (data?.code === 0 && data?.data?.url) {
            resolve(data.data.url as string)
          } else {
            reject(new Error(data?.message || '上传失败'))
          }
        } catch (e: any) {
          reject(e)
        }
      },
      fail: (err: any) => reject(err instanceof Error ? err : new Error(err?.errMsg || '上传失败')),
    })
  })
}

/** 并发上传一组本地路径，逐张成功 push；任一失败终止后续 */
async function uploadImages(tempPaths: string[]): Promise<string[]> {
  if (tempPaths.length === 0) return []
  uploading.value = true
  const total = tempPaths.length
  uni.showLoading({ title: total > 1 ? `上传中 0/${total}` : '上传中…', mask: true })
  const urls: string[] = []
  try {
    for (let i = 0; i < tempPaths.length; i++) {
      if (total > 1) uni.showLoading({ title: `上传中 ${i + 1}/${total}`, mask: true })
      urls.push(await uploadImage(tempPaths[i]))
    }
    uni.hideLoading()
    return urls
  } catch (e: any) {
    uni.hideLoading()
    if (urls.length > 0) {
      // 部分成功的不丢，提示用户哪些没传上
      uni.showToast({
        title: `已上传 ${urls.length}/${total}，剩余失败: ${e?.message || '未知错误'}`,
        icon: 'none',
        duration: 2500,
      })
      return urls
    }
    throw e
  } finally {
    uploading.value = false
  }
}

type PricingMode = 'standard' | 'by-size'

interface SpecGroup {
  /** 规格名 e.g. 颜色 / 尺寸 / 材质 */
  name: string
  /** 该规格下的所有取值 */
  values: string[]
}

interface SkuRow {
  /** specs[i] 对应 specGroups[i].values 中的某个 */
  specs: string[]
  /** 后端 SKU 主键(新建时为空,编辑时来自 loadProduct;updateProduct 据此决定 update/create) */
  id?: string
  /** SKU 代表图(可选);用户端选规格弹层视觉规格组按此图展示 */
  image?: string
  priceWholesale: number
  priceRetail: number
  priceMember: number
  stock: number
  active: boolean
}

const productId = ref('')
const isEdit = computed(() => !!productId.value)

const form = reactive({
  name: '',
  description: '',
  /** 主图:封面/橱窗用,最多 10 张,首张为商品主图 */
  images: [] as string[],
  /** 详情图:商品详情页内嵌图(替代富文本 detailHtml),最多 20 张 */
  detailImages: [] as string[],
  categoryId: '',
  merchantCategoryId: '',
  shipping: ['factory'] as ('factory' | 'local' | 'pickup')[],
  pricingMode: 'standard' as PricingMode,
  /** 按尺寸定价：每平方米单价（元） */
  pricePerSqm: 0,
  /** 单位（cm / m） */
  sizeUnit: 'cm' as 'cm' | 'm',
  /** 最小可下单尺寸（长×宽 cm）*/
  minLength: 30,
  minWidth: 30,
  maxLength: 500,
  maxWidth: 500,
  /** 起售费 */
  baseFee: 0,
})

/**
 * 自定义规格组：默认空（单 SKU 商品最常见）。
 * 用户点"添加规格"才进入多规格模式，体验更轻；
 * 历史默认 2 组 × 5 SKU 删起来很麻烦，那个反馈是删掉的根因。
 */
const specGroups = ref<SpecGroup[]>([])

/** SKU 矩阵 */
const skus = ref<SkuRow[]>([])
const platformCats = ref<Category[]>([])
const PRESET_SPEC_NAMES = ['尺寸', '颜色', '材质', '款式', '功能', '规格']

/** 主图 / 详情图共享操作 — 抽出来避免两套几乎相同的代码 */
const MAIN_MAX = 10
const DETAIL_MAX = 20
const showCatPicker = ref(false)

/* ============ Computed ============ */

const totalStock = computed(() => skus.value.reduce((s, x) => s + (Number(x.stock) || 0), 0))
const priceWholesaleRange = computed(() => {
  const vs = skus.value.map((s) => Number(s.priceWholesale) || 0).filter((v) => v > 0)
  if (vs.length === 0) return ''
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  return min === max ? formatPrice(min) : `${formatPrice(min)} ~ ${formatPrice(max)}`
})

const selectedCategoryName = computed(
  () => platformCats.value.find((c) => c.id === form.categoryId)?.name ?? '',
)

/** 按尺寸定价示例：以最小尺寸算 */
const sizeExampleArea = computed(() => {
  const lm = form.sizeUnit === 'cm' ? form.minLength / 100 : form.minLength
  const wm = form.sizeUnit === 'cm' ? form.minWidth / 100 : form.minWidth
  return (lm * wm).toFixed(2)
})
const sizeExamplePrice = computed(() => {
  const area = Number(sizeExampleArea.value)
  return Number((area * form.pricePerSqm + form.baseFee).toFixed(2))
})

/* ============ Image CRUD — 主图/详情图共用 ============ */

type ImageField = 'images' | 'detailImages'

function maxOf(field: ImageField): number {
  return field === 'images' ? MAIN_MAX : DETAIL_MAX
}

function chooseImage(field: ImageField = 'images') {
  const list = form[field]
  const max = maxOf(field)
  if (list.length >= max) {
    uni.showToast({ title: `最多上传 ${max} 张`, icon: 'none' })
    return
  }
  uni.chooseImage({
    count: max - list.length,
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const paths = (res as { tempFilePaths: string[] }).tempFilePaths || []
      if (paths.length === 0) return
      try {
        const urls = await uploadImages(paths)
        if (urls.length > 0) {
          form[field] = [...form[field], ...urls].slice(0, max)
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' })
      }
    },
  })
}

function removeImage(i: number, field: ImageField = 'images') {
  uni.showModal({
    title: '删除图片',
    content:
      field === 'images' && i === 0
        ? '当前为主图，删除后将自动使用下一张作为主图。'
        : '确认删除该图片？',
    success: (r) => {
      if (r.confirm) {
        form[field] = form[field].filter((_, idx) => idx !== i)
      }
    },
  })
}

function replaceImage(i: number, field: ImageField = 'images') {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const paths = (res as { tempFilePaths: string[] }).tempFilePaths || []
      if (!paths[0]) return
      try {
        const [url] = await uploadImages([paths[0]])
        if (url) {
          const next = [...form[field]]
          next[i] = url
          form[field] = next
        }
      } catch (e: any) {
        uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' })
      }
    },
  })
}

function setAsMain(i: number, field: ImageField = 'images') {
  if (i === 0) return
  const next = [...form[field]]
  const [picked] = next.splice(i, 1)
  next.unshift(picked)
  form[field] = next
  uni.showToast({ title: '已设为主图', icon: 'success' })
}

function moveImage(i: number, direction: -1 | 1, field: ImageField = 'images') {
  const target = i + direction
  const list = form[field]
  if (target < 0 || target >= list.length) return
  const next = [...list]
  ;[next[i], next[target]] = [next[target], next[i]]
  form[field] = next
}

function previewImage(i: number, field: ImageField = 'images') {
  uni.previewImage({
    urls: form[field],
    current: form[field][i],
  })
}

function showImageMenu(i: number, field: ImageField = 'images') {
  const list = form[field]
  const items: string[] = []
  // 详情图无"设为主图"概念
  if (field === 'images' && i > 0) items.push('设为主图')
  items.push('替换')
  if (i > 0) items.push('上移')
  if (i < list.length - 1) items.push('下移')
  items.push('预览')
  items.push('删除')
  uni.showActionSheet({
    itemList: items,
    success: (r) => {
      const label = items[r.tapIndex]
      if (label === '设为主图') setAsMain(i, field)
      else if (label === '替换') replaceImage(i, field)
      else if (label === '上移') moveImage(i, -1, field)
      else if (label === '下移') moveImage(i, 1, field)
      else if (label === '预览') previewImage(i, field)
      else if (label === '删除') removeImage(i, field)
    },
  })
}

/** 跳全局价格规则页（价格显示规则已迁出单品配置） */
function goPriceRule() {
  uni.navigateTo({ url: '/pages/shop/price-rule' })
}

/* ============ Spec Editor (FX-6) ============ */

function addSpecGroup() {
  if (specGroups.value.length >= 4) {
    uni.showToast({ title: '最多 4 个规格', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: [
      ...PRESET_SPEC_NAMES.filter((n) => !specGroups.value.find((g) => g.name === n)),
      '自定义…',
    ],
    success: (r) => {
      const available = PRESET_SPEC_NAMES.filter((n) => !specGroups.value.find((g) => g.name === n))
      if (r.tapIndex === available.length) {
        // 自定义
        uni.showModal({
          title: '自定义规格名',
          editable: true,
          placeholderText: '如 香型 / 尺码',
          success: (m) => {
            if (m.confirm && m.content) {
              specGroups.value = [...specGroups.value, { name: m.content.trim(), values: [] }]
              regenerateSkus()
            }
          },
        })
      } else {
        specGroups.value = [...specGroups.value, { name: available[r.tapIndex], values: [] }]
        regenerateSkus()
      }
    },
  })
}

function removeSpecGroup(i: number) {
  if (specGroups.value.length <= 1) {
    uni.showToast({ title: '至少保留一个规格', icon: 'none' })
    return
  }
  uni.showModal({
    title: '删除规格',
    content: `删除规格「${specGroups.value[i].name}」？关联的 SKU 将重新生成。`,
    success: (r) => {
      if (r.confirm) {
        specGroups.value = specGroups.value.filter((_, idx) => idx !== i)
        regenerateSkus()
      }
    },
  })
}

function renameSpec(i: number) {
  uni.showModal({
    title: '修改规格名',
    editable: true,
    content: specGroups.value[i].name,
    success: (r) => {
      if (r.confirm && r.content) {
        specGroups.value[i].name = r.content.trim()
      }
    },
  })
}

function addSpecValue(gi: number) {
  uni.showModal({
    title: `添加「${specGroups.value[gi].name}」`,
    editable: true,
    placeholderText: '请输入规格值',
    success: (r) => {
      if (r.confirm && r.content) {
        const v = r.content.trim()
        if (specGroups.value[gi].values.includes(v)) {
          uni.showToast({ title: '该值已存在', icon: 'none' })
          return
        }
        specGroups.value[gi].values = [...specGroups.value[gi].values, v]
        regenerateSkus()
      }
    },
  })
}

function removeSpecValue(gi: number, vi: number) {
  specGroups.value[gi].values = specGroups.value[gi].values.filter((_, i) => i !== vi)
  regenerateSkus()
}

function editSpecValue(gi: number, vi: number) {
  uni.showModal({
    title: '修改规格值',
    editable: true,
    content: specGroups.value[gi].values[vi],
    success: (r) => {
      if (r.confirm && r.content) {
        const next = [...specGroups.value[gi].values]
        next[vi] = r.content.trim()
        specGroups.value[gi].values = next
        regenerateSkus()
      }
    },
  })
}

/** 笛卡尔积重新生成 SKU 矩阵 */
function regenerateSkus() {
  const groups = specGroups.value.filter((g) => g.values.length > 0)
  // 没有规格 → 用单 SKU（默认规格），既能下单也能填价格
  if (groups.length === 0) {
    if (skus.value.length === 1 && skus.value[0].specs.length === 0) return
    const old = skus.value[0]
    skus.value = [
      old && old.specs.length === 0
        ? old
        : {
            specs: [],
            priceWholesale: 0,
            priceRetail: 0,
            priceMember: 0,
            stock: 0,
            active: true,
          },
    ]
    return
  }
  const combos: string[][] = [[]]
  for (const g of groups) {
    const next: string[][] = []
    for (const combo of combos) {
      for (const v of g.values) {
        next.push([...combo, v])
      }
    }
    combos.splice(0, combos.length, ...next)
  }
  // 保留已有 SKU 的价格/库存
  const oldMap = new Map<string, SkuRow>()
  for (const s of skus.value) oldMap.set(s.specs.join('|'), s)
  skus.value = combos.map((c) => {
    const key = c.join('|')
    const old = oldMap.get(key)
    return (
      old ?? {
        specs: c,
        priceWholesale: 0,
        priceRetail: 0,
        priceMember: 0,
        stock: 0,
        active: true,
      }
    )
  })
}

/** 批量填价 */
function batchFillPrice() {
  uni.showModal({
    title: '批量填价',
    editable: true,
    placeholderText: '输入价格（如 1288）',
    success: (r) => {
      if (r.confirm && r.content) {
        const v = Number(r.content)
        if (isNaN(v) || v <= 0) {
          uni.showToast({ title: '价格无效', icon: 'none' })
          return
        }
        skus.value.forEach((s) => {
          s.priceWholesale = v
          s.priceRetail = Math.round(v * 1.3)
          s.priceMember = Math.round(v * 1.1)
        })
        uni.showToast({ title: '已批量填充', icon: 'success' })
      }
    },
  })
}

function batchFillStock() {
  uni.showModal({
    title: '批量填库存',
    editable: true,
    placeholderText: '输入库存数',
    success: (r) => {
      if (r.confirm && r.content) {
        const v = Number(r.content)
        if (isNaN(v) || v < 0) return
        skus.value.forEach((s) => (s.stock = v))
        uni.showToast({ title: '已批量填充', icon: 'success' })
      }
    },
  })
}

/** 给 SKU 行选图并上传 —— 上传成功后用 https URL 回写 sku.image,失败保持原值 */
async function chooseSkuImage(skuIndex: number) {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const paths = (res as { tempFilePaths: string[] }).tempFilePaths || []
      if (!paths[0]) return
      try {
        const [url] = await uploadImages([paths[0]])
        if (url) skus.value[skuIndex].image = url
      } catch (e: any) {
        uni.showToast({ title: e?.message || 'SKU 图上传失败', icon: 'none' })
      }
    },
  })
}

function removeSkuImage(skuIndex: number) {
  skus.value[skuIndex].image = undefined
}

/* ============ Pricing Mode (FX-5) ============ */

function switchPricingMode(mode: PricingMode) {
  form.pricingMode = mode
  if (mode === 'by-size') {
    // 按尺寸定价时，SKU 简化为单条（规格只描述材质/颜色）
    if (specGroups.value.length === 0) {
      specGroups.value = [{ name: '材质', values: ['默认'] }]
      regenerateSkus()
    }
  }
}

/* ============ Form ============ */

function toggleShipping(s: 'factory' | 'local' | 'pickup') {
  if (form.shipping.includes(s)) form.shipping = form.shipping.filter((x) => x !== s)
  else form.shipping = [...form.shipping, s]
}

function pickCategory(cat: Category) {
  form.categoryId = cat.id
  showCatPicker.value = false
}

/* ============ Init ============ */

async function loadCats() {
  // 平台 + 商家自定义分类合并展示
  //
  // picker template 是按「parentId=null 一级 → parentId=父id 二级」两层树渲染的。
  // 之前的虚拟父方案会把自定义分类的子分类切断（因为子的 parentId 仍指向真实父，
  // 但真实父被改成挂在虚拟父下变成"二级"，子分类找不到 root → 不可见）。
  //
  // 现简化为直接拼接：自定义一级分类（parentId=null）和平台一级分类同列；
  // 自定义子分类的 parentId 指向自定义一级即可被 picker 二级查询命中。
  try {
    const [platform, own] = await Promise.all([
      categoryService.platformList().catch(() => [] as Category[]),
      categoryService.merchantList().catch(() => [] as Category[]),
    ])
    platformCats.value = [...platform, ...own]
  } catch {}
}

async function loadProduct() {
  if (!productId.value) return
  try {
    const data = await productService.detail(productId.value)
    form.name = data.name
    form.description = data.description ?? ''
    form.images = data.images ?? []
    // 兼容历史商品:旧版把详情图存在 images[1..],新版独立字段 detailImages
    form.detailImages = ((data as unknown as { detailImages?: string[] }).detailImages ?? []).slice(
      0,
      DETAIL_MAX,
    )
    form.categoryId = data.categoryId
    form.merchantCategoryId = data.merchantCategoryId ?? ''
    form.shipping = data.shipping ?? ['factory']
    // 检查是否有按尺寸定价的扩展字段
    const ext = data as unknown as {
      pricingMode?: PricingMode
      pricePerSqm?: number
      minLength?: number
      minWidth?: number
      maxLength?: number
      maxWidth?: number
      baseFee?: number
      sizeUnit?: 'cm' | 'm'
    }
    if (ext.pricingMode === 'by-size') {
      form.pricingMode = 'by-size'
      form.pricePerSqm = ext.pricePerSqm ?? 0
      form.minLength = ext.minLength ?? 30
      form.minWidth = ext.minWidth ?? 30
      form.maxLength = ext.maxLength ?? 500
      form.maxWidth = ext.maxWidth ?? 500
      form.baseFee = ext.baseFee ?? 0
      form.sizeUnit = ext.sizeUnit ?? 'cm'
    }

    // 还原 SKU 数据 —— 之前 loadProduct 漏掉这一步,导致编辑模式下商家看到的 SKU 为空,
    // 提交又会变成新建一份替换原有 SKU。这是已知生产 bug,这次一并修。
    const dbSkus = (data as unknown as { skus?: Array<Record<string, unknown>> }).skus ?? []
    if (dbSkus.length > 0) {
      // 按 SKU 中首次出现的 spec 顺序反推 specGroups(确保 SKU 矩阵列顺序与历史一致)
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
      specGroups.value = groupOrder.map((name) => ({ name, values: groupValues[name] }))

      skus.value = dbSkus.map((sku) => {
        const specsObj = (sku.specs ?? {}) as Record<string, string>
        return {
          id: String(sku.id ?? ''),
          specs: groupOrder.map((g) => String(specsObj[g] ?? '')),
          image: typeof sku.image === 'string' ? sku.image : undefined,
          priceWholesale: Number(sku.priceWholesale ?? 0),
          priceRetail: Number(sku.priceRetail ?? 0),
          priceMember: Number(sku.priceMember ?? 0),
          stock: Number(sku.stock ?? 0),
          active: sku.active !== false,
        }
      })
    }
  } catch {}
}

/* ============ Submit ============ */

async function submit(status: 'draft' | 'submit') {
  if (!form.name) return uni.showToast({ title: '请填写商品名称', icon: 'none' })
  if (!form.categoryId) return uni.showToast({ title: '请选择分类', icon: 'none' })
  if (form.images.length === 0) return uni.showToast({ title: '请上传至少一张主图', icon: 'none' })
  // 防御:所有图片(主图/详情图/SKU 图)必须全是 http(s) URL,否则后端拿到本地 tempFilePath 会落库脏数据
  const isHttpUrl = (u: string) => /^https?:\/\//i.test(u)
  const badMain = form.images.find((u) => !isHttpUrl(u))
  const badDetail = form.detailImages.find((u) => !isHttpUrl(u))
  const badSku = skus.value.find((s) => s.image && !isHttpUrl(s.image))
  if (badMain || badDetail || badSku) {
    return uni.showToast({
      title: '存在未上传完成的图片,请稍候重试',
      icon: 'none',
      duration: 2000,
    })
  }
  if (uploading.value) {
    return uni.showToast({ title: '图片仍在上传,请稍候', icon: 'none' })
  }
  if (form.pricingMode === 'by-size' && form.pricePerSqm <= 0) {
    return uni.showToast({ title: '请填写每平米单价', icon: 'none' })
  }
  if (form.pricingMode === 'standard' && skus.value.length === 0) {
    return uni.showToast({ title: '请添加规格值生成 SKU', icon: 'none' })
  }
  try {
    uni.showLoading({ title: status === 'draft' ? '保存草稿…' : '提交审核…' })
    const dto = {
      categoryId: form.categoryId,
      merchantCategoryId: form.merchantCategoryId || undefined,
      name: form.name,
      description: form.description,
      images: form.images,
      detailImages: form.detailImages,
      // 商品标签页面已下架,但本端不再发送 tags 字段:
      // 老商品的 tags 字段保留在数据库不动,避免破坏性升级清空商家既有数据。
      // 新商品因 dto 不传 tags → Prisma 走 schema 默认 []。
      shipping: form.shipping,
      // 价格显示规则已迁到「店铺设置 - 价格规则」全局，单品不再单独配置
      skus: skus.value.map((s) => {
        const specsObj: Record<string, string> = {}
        specGroups.value.forEach((g, i) => {
          if (s.specs[i] !== undefined) specsObj[g.name] = s.specs[i]
        })
        // 价格 fallback：商家常常只填了批发价、零售/会员价留空（=0）
        // 但 Product 价格聚合用 priceRetailMin = min(skus.priceRetail) → 全 0
        // 用户体验上的"提交 999 → 平台看到 0"就是这个 bug
        // 容错：如果批发价有值而零售价为 0，用批发价填上；会员价同理
        const w = Number(s.priceWholesale) || 0
        const r = Number(s.priceRetail) || 0
        const m = Number(s.priceMember) || 0
        const finalRetail = r > 0 ? r : w
        const finalMember = m > 0 ? m : finalRetail
        return {
          // id 仅在编辑模式有值,后端 updateProduct 据此 update 现有行;为空则 create 新行
          ...(s.id ? { id: s.id } : {}),
          specs: specsObj,
          specsLabel: s.specs.join(' · '),
          image: s.image || undefined,
          priceWholesale: w,
          priceRetail: finalRetail,
          priceMember: finalMember,
          stock: Number(s.stock),
          active: s.active,
        }
      }),
      // 按尺寸定价扩展字段（mock 端透传）
      pricingMode: form.pricingMode,
      pricePerSqm: form.pricingMode === 'by-size' ? Number(form.pricePerSqm) : undefined,
      minLength: form.pricingMode === 'by-size' ? Number(form.minLength) : undefined,
      minWidth: form.pricingMode === 'by-size' ? Number(form.minWidth) : undefined,
      maxLength: form.pricingMode === 'by-size' ? Number(form.maxLength) : undefined,
      maxWidth: form.pricingMode === 'by-size' ? Number(form.maxWidth) : undefined,
      baseFee: form.pricingMode === 'by-size' ? Number(form.baseFee) : undefined,
      sizeUnit: form.pricingMode === 'by-size' ? form.sizeUnit : undefined,
      // 显式传 status,否则后端 createProduct 一律落 'auditing'(参考 merchant.service.ts:309)
      // 草稿:'draft'  提交审核:'auditing'  编辑模式由 productService.update 自行处理流程
      status: status === 'draft' ? ('draft' as const) : ('auditing' as const),
    }
    if (isEdit.value) {
      await productService.update(productId.value, dto)
    } else {
      await productService.create(dto)
    }
    uni.hideLoading()
    uni.showToast({ title: status === 'draft' ? '已保存' : '已提交', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e: any) {
    // 不能再用空 catch 吞错误 —— 之前有过"toast 提交成功但商品没落库"的反馈,
    // 真因(throttler / 字段校验失败 / 商家未绑定)都被吞掉,排查时只能猜。
    // 这里把后端 message 抬到 UI,长一点也没关系,信息密度优先。
    uni.hideLoading()
    const msg = e?.message || e?.errMsg || '提交失败,请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 3000 })
    console.error('[product/add submit failed]', e)
  }
}

onLoad((opts) => {
  productId.value = (opts as { id?: string })?.id || ''
})
onMounted(async () => {
  await loadCats()
  if (productId.value) await loadProduct()
  if (skus.value.length === 0) regenerateSkus()
})
</script>

<template>
  <view class="page">
    <NavBar :title="isEdit ? '编辑商品' : '添加商品'" right-text="预览" />

    <view class="body">
      <!-- 商品主图 -->
      <view class="section">
        <view class="section-head">
          <text class="title">商品主图</text>
          <text class="sub">{{ form.images.length }} / {{ MAIN_MAX }} · 首张为主图，长按编辑</text>
        </view>
        <view class="image-grid">
          <view
            v-for="(img, i) in form.images"
            :key="`m-${i}`"
            class="img-cell"
            @click="showImageMenu(i, 'images')"
          >
            <image :src="img" class="img" mode="aspectFill" />
            <view v-if="i === 0" class="img-main">主图</view>
            <view class="img-idx">{{ i + 1 }}</view>
            <view class="img-actions">
              <view class="img-btn" @click.stop="previewImage(i, 'images')">
                <Icon name="eye" :size="22" color="#fff" />
              </view>
              <view class="img-btn danger" @click.stop="removeImage(i, 'images')">
                <Icon name="close" :size="22" color="#fff" />
              </view>
            </view>
            <view v-if="i > 0" class="img-move up" @click.stop="moveImage(i, -1, 'images')">
              <Icon name="chevron-up" :size="22" color="#fff" />
            </view>
            <view
              v-if="i < form.images.length - 1"
              class="img-move down"
              @click.stop="moveImage(i, 1, 'images')"
            >
              <Icon name="chevron-down" :size="22" color="#fff" />
            </view>
          </view>
          <view v-if="form.images.length < MAIN_MAX" class="img-add" @click="chooseImage('images')">
            <Icon name="plus" :size="48" color="var(--text-tertiary)" />
            <text class="add-text">上传主图</text>
          </view>
        </view>
      </view>

      <!-- 基本信息：标题 / 分类 / 简介 -->
      <view class="section">
        <view class="row">
          <text class="row-label required">商品标题</text>
          <input
            v-model="form.name"
            class="row-input"
            placeholder="必填，最多 30 字"
            maxlength="30"
          />
        </view>
        <view class="row">
          <text class="row-label required">商品分类</text>
          <view class="row-picker" @click="showCatPicker = true">
            <text :class="['picker-text', !selectedCategoryName ? 'placeholder' : '']">
              {{ selectedCategoryName || '选择分类' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </view>
        <view class="row align-top">
          <text class="row-label">商品简介</text>
          <textarea
            v-model="form.description"
            class="row-textarea"
            placeholder="可选 · 一句话描述商品卖点"
            maxlength="80"
          />
        </view>
      </view>

      <!-- 商品详情图 -->
      <view class="section">
        <view class="section-head">
          <text class="title">商品详情图</text>
          <text class="sub"
            >{{ form.detailImages.length }} / {{ DETAIL_MAX }} · 按顺序展示在商品详情页</text
          >
        </view>
        <view class="image-grid">
          <view
            v-for="(img, i) in form.detailImages"
            :key="`d-${i}`"
            class="img-cell"
            @click="showImageMenu(i, 'detailImages')"
          >
            <image :src="img" class="img" mode="aspectFill" />
            <view class="img-idx">{{ i + 1 }}</view>
            <view class="img-actions">
              <view class="img-btn" @click.stop="previewImage(i, 'detailImages')">
                <Icon name="eye" :size="22" color="#fff" />
              </view>
              <view class="img-btn danger" @click.stop="removeImage(i, 'detailImages')">
                <Icon name="close" :size="22" color="#fff" />
              </view>
            </view>
            <view v-if="i > 0" class="img-move up" @click.stop="moveImage(i, -1, 'detailImages')">
              <Icon name="chevron-up" :size="22" color="#fff" />
            </view>
            <view
              v-if="i < form.detailImages.length - 1"
              class="img-move down"
              @click.stop="moveImage(i, 1, 'detailImages')"
            >
              <Icon name="chevron-down" :size="22" color="#fff" />
            </view>
          </view>
          <view
            v-if="form.detailImages.length < DETAIL_MAX"
            class="img-add"
            @click="chooseImage('detailImages')"
          >
            <Icon name="plus" :size="48" color="var(--text-tertiary)" />
            <text class="add-text">上传详情图</text>
          </view>
        </view>
      </view>

      <!-- 定价模式（FX-5）-->
      <view class="section">
        <view class="section-head">
          <text class="title">定价模式</text>
          <StatusTag
            :text="form.pricingMode === 'standard' ? '标准' : '按尺寸'"
            tone="primary"
            fill
          />
        </view>
        <view class="mode-row">
          <view
            :class="['mode-card', { active: form.pricingMode === 'standard' }]"
            @click="switchPricingMode('standard')"
          >
            <view class="mode-icon">
              <Icon name="package" :size="32" color="var(--brand-primary)" />
            </view>
            <text class="mode-title">标准定价</text>
            <text class="mode-desc">按 SKU 规格分别定价</text>
          </view>
          <view
            :class="['mode-card', { active: form.pricingMode === 'by-size' }]"
            @click="switchPricingMode('by-size')"
          >
            <view class="mode-icon">
              <Icon name="ruler" :size="32" color="var(--brand-primary)" />
            </view>
            <text class="mode-title">按尺寸定价</text>
            <text class="mode-desc">每平方米单价 · 客户定制</text>
          </view>
        </view>

        <!-- 按尺寸定价配置 -->
        <view v-if="form.pricingMode === 'by-size'" class="by-size-block">
          <view class="bs-row">
            <text class="bs-label required">每平米单价（元）</text>
            <input
              v-model.number="form.pricePerSqm"
              type="digit"
              class="bs-input"
              placeholder="如 480"
            />
            <text class="bs-unit">元 / m²</text>
          </view>
          <view class="bs-row">
            <text class="bs-label">起售费（固定）</text>
            <input
              v-model.number="form.baseFee"
              type="digit"
              class="bs-input"
              placeholder="可选，如 50"
            />
            <text class="bs-unit">元</text>
          </view>
          <view class="bs-row">
            <text class="bs-label">尺寸单位</text>
            <view class="unit-toggle">
              <view
                :class="['ut-btn', form.sizeUnit === 'cm' ? 'active' : '']"
                @click="form.sizeUnit = 'cm'"
                >cm</view
              >
              <view
                :class="['ut-btn', form.sizeUnit === 'm' ? 'active' : '']"
                @click="form.sizeUnit = 'm'"
                >m</view
              >
            </view>
          </view>
          <view class="bs-row">
            <text class="bs-label">最小尺寸</text>
            <input
              v-model.number="form.minLength"
              type="number"
              class="bs-input dim"
              :placeholder="`最小长(${form.sizeUnit})`"
            />
            <text class="bs-x">×</text>
            <input
              v-model.number="form.minWidth"
              type="number"
              class="bs-input dim"
              :placeholder="`最小宽(${form.sizeUnit})`"
            />
          </view>
          <view class="bs-row">
            <text class="bs-label">最大尺寸</text>
            <input
              v-model.number="form.maxLength"
              type="number"
              class="bs-input dim"
              :placeholder="`最大长(${form.sizeUnit})`"
            />
            <text class="bs-x">×</text>
            <input
              v-model.number="form.maxWidth"
              type="number"
              class="bs-input dim"
              :placeholder="`最大宽(${form.sizeUnit})`"
            />
          </view>

          <!-- 实时预览 -->
          <view class="bs-preview">
            <text class="preview-label">价格预览（以最小尺寸）</text>
            <view class="preview-formula">
              <text class="formula-part"
                >{{ form.minLength }}{{ form.sizeUnit }} × {{ form.minWidth
                }}{{ form.sizeUnit }}</text
              >
              <text class="formula-eq">=</text>
              <text class="formula-part accent">{{ sizeExampleArea }} m²</text>
              <text class="formula-eq">×</text>
              <text class="formula-part">¥{{ form.pricePerSqm || 0 }}</text>
              <text v-if="form.baseFee > 0" class="formula-eq">+</text>
              <text v-if="form.baseFee > 0" class="formula-part">¥{{ form.baseFee }}</text>
              <text class="formula-eq">=</text>
            </view>
            <view class="preview-total">
              <text class="total-cur">¥</text>
              <text class="total-num">{{ sizeExamplePrice }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 物流 -->
      <view class="section">
        <text class="title">物流方式</text>
        <view class="ship-row">
          <view
            v-for="s in [
              { k: 'factory', l: '厂家直发' },
              { k: 'local', l: '本地配送' },
              { k: 'pickup', l: '门店自提' },
            ]"
            :key="s.k"
            :class="[
              'ship-pill',
              { active: form.shipping.includes(s.k as 'factory' | 'local' | 'pickup') },
            ]"
            @click="toggleShipping(s.k as 'factory' | 'local' | 'pickup')"
            >{{ s.l }}</view
          >
        </view>
      </view>

      <!-- 自定义规格 (FX-6) -->
      <view class="section">
        <view class="section-head">
          <text class="title">商品规格</text>
          <view class="add-spec" @click="addSpecGroup">
            <Icon name="plus" :size="22" color="var(--brand-primary)" />
            <text>添加规格</text>
          </view>
        </view>

        <view v-for="(g, gi) in specGroups" :key="gi" class="spec-group">
          <view class="sg-head">
            <view class="sg-name-edit" @click="renameSpec(gi)">
              <text class="sg-name">{{ g.name }}</text>
              <Icon name="edit" :size="18" color="var(--text-tertiary)" />
            </view>
            <view class="sg-remove" v-if="specGroups.length > 1" @click="removeSpecGroup(gi)">
              <Icon name="trash" :size="22" color="var(--text-tertiary)" />
            </view>
          </view>
          <view class="sg-values">
            <view
              v-for="(v, vi) in g.values"
              :key="vi"
              class="sg-value"
              @click="editSpecValue(gi, vi)"
            >
              <text>{{ v }}</text>
              <view class="sg-value-x" @click.stop="removeSpecValue(gi, vi)">
                <Icon name="close" :size="18" color="#fff" />
              </view>
            </view>
            <view class="sg-add-value" @click="addSpecValue(gi)">
              <Icon name="plus" :size="20" color="var(--brand-primary)" />
              <text>添加值</text>
            </view>
          </view>
        </view>
      </view>

      <!-- SKU 矩阵 -->
      <view v-if="form.pricingMode === 'standard'" class="section">
        <view class="section-head">
          <text class="title">SKU 价格与库存</text>
          <text class="sub">{{ skus.length }} 条</text>
        </view>
        <view v-if="skus.length === 0" class="sku-empty"> 请先在上方为每个规格添加至少一个值 </view>
        <view v-else class="sku-actions">
          <view class="sku-action" @click="batchFillPrice">
            <Icon name="lightning" :size="22" color="var(--brand-primary)" />
            <text>批量填价</text>
          </view>
          <view class="sku-action" @click="batchFillStock">
            <Icon name="package" :size="22" color="var(--brand-primary)" />
            <text>批量填库存</text>
          </view>
        </view>
        <view class="sku-list">
          <view v-for="(s, i) in skus" :key="i" class="sku-card">
            <view class="sku-head">
              <!-- SKU 代表图(可选);点击上传/替换,长按删除 -->
              <view
                class="sku-thumb"
                @click="chooseSkuImage(i)"
                @longpress="s.image ? removeSkuImage(i) : null"
              >
                <image v-if="s.image" :src="s.image" class="sku-thumb-img" mode="aspectFill" />
                <view v-else class="sku-thumb-empty">
                  <Icon name="plus" :size="28" color="var(--text-tertiary)" />
                  <text>SKU 图</text>
                </view>
              </view>
              <view class="sku-no">
                <text class="sku-idx">#{{ i + 1 }}</text>
                <view class="sku-spec-tags">
                  <view v-for="(sp, idx) in s.specs" :key="idx" class="sku-spec-tag">
                    <text class="ssp-name">{{ specGroups[idx]?.name }}</text>
                    <text class="ssp-val">{{ sp }}</text>
                  </view>
                </view>
              </view>
              <switch
                :checked="s.active"
                @change="(e) => (s.active = e.detail.value)"
                style="transform: scale(0.7)"
              />
            </view>
            <view class="sku-grid">
              <view class="sku-field">
                <text class="field-label">库存</text>
                <input v-model.number="s.stock" type="number" class="field-input" placeholder="0" />
              </view>
              <view class="sku-field">
                <text class="field-label" style="color: #1296db">批发价</text>
                <input
                  v-model.number="s.priceWholesale"
                  type="digit"
                  class="field-input"
                  placeholder="¥0"
                />
              </view>
              <view class="sku-field">
                <text class="field-label" style="color: var(--brand-primary)">零售价</text>
                <input
                  v-model.number="s.priceRetail"
                  type="digit"
                  class="field-input"
                  placeholder="¥0"
                />
              </view>
              <view class="sku-field">
                <text class="field-label" style="color: #a855f7">会员价</text>
                <input
                  v-model.number="s.priceMember"
                  type="digit"
                  class="field-input"
                  placeholder="¥0"
                />
              </view>
            </view>
          </view>
        </view>
        <view v-if="skus.length > 0" class="sku-summary">
          <text class="sum-label">总库存</text>
          <text class="sum-value">{{ totalStock }}</text>
          <text class="sum-label" style="margin-left: 24rpx">批发价区间</text>
          <text class="sum-value">{{ priceWholesaleRange || '—' }}</text>
        </view>
      </view>

      <!-- 价格显示规则说明（迁移到店铺设置 · 全局生效，不再单品配置） -->
      <view class="section">
        <view class="section-head">
          <text class="title">价格显示规则</text>
          <StatusTag text="全局" tone="default" />
        </view>
        <view class="rule-migrated" @click="goPriceRule">
          <view class="rule-mig-icon">
            <Icon name="wallet" :size="32" color="#FF4D2D" />
          </view>
          <view class="rule-mig-info">
            <text class="rule-mig-title">价格显示规则已全局化</text>
            <text class="rule-mig-sub">所有商品共用一套规则，到「店铺 → 价格规则」修改</text>
          </view>
          <Icon name="forward" :size="22" color="#FF4D2D" />
        </view>
      </view>

      <view class="safe-bottom" />
    </view>

    <!-- 底部 -->
    <view class="footer">
      <view class="footer-btn ghost" @click="submit('draft')">存草稿</view>
      <view class="footer-btn primary" @click="submit('submit')">
        {{ isEdit ? '保存修改' : '提交审核' }}
      </view>
    </view>

    <!-- 分类选择浮层 -->
    <view v-if="showCatPicker" class="cat-mask" @click="showCatPicker = false">
      <view class="cat-sheet" @click.stop>
        <view class="cat-head">
          <text>选择分类</text>
          <text class="cat-close" @click="showCatPicker = false">✕</text>
        </view>
        <scroll-view scroll-y class="cat-scroll">
          <view
            v-for="c in platformCats.filter((x) => x.parentId === null)"
            :key="c.id"
            class="cat-group"
          >
            <text class="cat-group-title">{{ c.name }}</text>
            <view class="cat-sub-list">
              <view
                v-for="s in platformCats.filter((x) => x.parentId === c.id)"
                :key="s.id"
                :class="['cat-sub', { active: form.categoryId === s.id }]"
                @click="pickCategory(s)"
                >{{ s.name }}</view
              >
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 160rpx;
}
.body {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.section {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: var(--shadow-sm);
  .title {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .sub {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .section-head {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
    justify-content: space-between;
  }
}

/* 图片 CRUD */
.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.img-cell,
.img-add {
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
}
.img-cell {
  background: var(--bg-hover);
  .img {
    width: 100%;
    height: 100%;
  }
  .img-idx {
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    min-width: 32rpx;
    padding: 0 8rpx;
    height: 32rpx;
    line-height: 32rpx;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border-radius: 6rpx;
    font-size: 18rpx;
    font-family: var(--font-family-base);
    font-weight: 700;
  }
  .img-main {
    position: absolute;
    bottom: 4rpx;
    left: 4rpx;
    padding: 2rpx 10rpx;
    background: var(--brand-primary);
    color: #fff;
    font-size: 18rpx;
    border-radius: 6rpx;
    font-weight: 700;
  }
  .img-actions {
    position: absolute;
    top: 4rpx;
    right: 4rpx;
    display: flex;
    gap: 4rpx;
  }
  .img-btn {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    &.danger {
      background: rgba(255, 59, 48, 0.85);
    }
  }
  .img-move {
    position: absolute;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    &.up {
      right: 4rpx;
      bottom: 44rpx;
    }
    &.down {
      right: 4rpx;
      bottom: 4rpx;
    }
  }
}
.img-add {
  border: 2rpx dashed var(--border-default);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  background: var(--bg-page);
  .add-text {
    font-size: 20rpx;
    color: var(--text-tertiary);
  }
}

/* 通用行 */
.row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-light);
  &:last-child {
    border-bottom: none;
  }
  &.align-top {
    align-items: flex-start;
  }
  .row-label {
    width: 160rpx;
    font-size: 26rpx;
    color: var(--text-secondary);
    &.required::before {
      content: '*';
      color: var(--status-error, #ff3b30);
      margin-right: 4rpx;
    }
  }
  .row-input {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
  }
  .row-textarea {
    flex: 1;
    font-size: 26rpx;
    color: var(--text-primary);
    min-height: 120rpx;
  }
  .row-picker {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .picker-text {
      font-size: 26rpx;
      color: var(--text-primary);
    }
    .picker-text.placeholder {
      color: var(--text-tertiary);
    }
    .arrow {
      color: var(--text-tertiary);
    }
  }
}

/* 定价模式 */
.mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.mode-card {
  padding: 20rpx 16rpx;
  border: 2rpx dashed var(--border-default);
  border-radius: 16rpx;
  background: var(--bg-page);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  &.active {
    border-color: var(--brand-primary);
    background: rgba(255, 77, 45, 0.04);
    border-style: solid;
  }
  .mode-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: rgba(255, 77, 45, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4rpx;
  }
  .mode-title {
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
  }
  .mode-desc {
    font-size: 20rpx;
    color: var(--text-tertiary);
    text-align: center;
  }
}

.by-size-block {
  background: linear-gradient(180deg, rgba(255, 77, 45, 0.04), transparent);
  border-radius: 16rpx;
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.bs-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  .bs-label {
    flex-shrink: 0;
    width: 200rpx;
    font-size: 24rpx;
    color: var(--text-secondary);
    &.required::before {
      content: '*';
      color: #ff3b30;
      margin-right: 4rpx;
    }
  }
  .bs-input {
    flex: 1;
    height: 60rpx;
    padding: 0 12rpx;
    background: var(--bg-card);
    border: 1rpx solid var(--border-default);
    border-radius: 8rpx;
    font-size: 24rpx;
    color: var(--text-primary);
    &.dim {
      flex: 1;
      min-width: 0;
    }
  }
  .bs-unit {
    flex-shrink: 0;
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .bs-x {
    font-size: 24rpx;
    color: var(--text-tertiary);
    font-weight: 700;
  }
}
.unit-toggle {
  display: flex;
  gap: 4rpx;
  padding: 2rpx;
  background: var(--bg-card);
  border-radius: 8rpx;
  border: 1rpx solid var(--border-default);
  .ut-btn {
    padding: 6rpx 20rpx;
    font-size: 22rpx;
    color: var(--text-secondary);
    border-radius: 6rpx;
    &.active {
      background: var(--brand-primary);
      color: #fff;
      font-weight: 700;
    }
  }
}
.bs-preview {
  margin-top: 4rpx;
  padding: 16rpx;
  background: var(--bg-card);
  border-radius: 12rpx;
  border: 1rpx dashed var(--brand-primary);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .preview-label {
    font-size: 22rpx;
    color: var(--text-tertiary);
  }
  .preview-formula {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6rpx;
    .formula-part {
      font-size: 22rpx;
      color: var(--text-primary);
      font-family: var(--font-family-base);
      &.accent {
        color: var(--brand-primary);
        font-weight: 700;
      }
    }
    .formula-eq {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }
  .preview-total {
    display: flex;
    align-items: baseline;
    gap: 4rpx;
    color: var(--brand-primary);
    font-family: var(--font-family-base);
    .total-cur {
      font-size: 26rpx;
      font-weight: 800;
    }
    .total-num {
      font-size: 48rpx;
      font-weight: 800;
      line-height: 1;
    }
  }
}

/* 物流 pill */
.ship-pill {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 24rpx;
  &.active {
    background: rgba(255, 77, 45, 0.08);
    color: var(--brand-primary);
    border: 1rpx solid var(--brand-primary);
  }
}
.ship-row {
  margin-top: 12rpx;
  display: flex;
  gap: 12rpx;
}

/* 自定义规格 */
.add-spec {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 14rpx;
  background: rgba(255, 77, 45, 0.08);
  color: var(--brand-primary);
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}
.spec-group {
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  &:last-child {
    margin-bottom: 0;
  }
}
.sg-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  .sg-name-edit {
    display: flex;
    align-items: center;
    gap: 6rpx;
    .sg-name {
      font-size: 26rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
  }
  .sg-remove {
    padding: 4rpx;
  }
}
.sg-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.sg-value {
  display: inline-flex;
  align-items: center;
  gap: 0;
  background: var(--bg-card);
  border: 1rpx solid var(--brand-primary);
  border-radius: 999rpx;
  overflow: hidden;
  text {
    padding: 6rpx 14rpx;
    font-size: 22rpx;
    color: var(--brand-primary);
    font-weight: 600;
  }
  .sg-value-x {
    width: 36rpx;
    height: 36rpx;
    background: var(--brand-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.sg-add-value {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 14rpx;
  border: 1rpx dashed var(--brand-primary);
  color: var(--brand-primary);
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  background: transparent;
}

/* SKU */
.sku-empty {
  text-align: center;
  padding: 40rpx 16rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  background: var(--bg-page);
  border-radius: 12rpx;
}
.sku-actions {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.sku-action {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  background: rgba(255, 77, 45, 0.08);
  color: var(--brand-primary);
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}
.sku-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.sku-card {
  background: var(--bg-page);
  border-radius: 12rpx;
  padding: 16rpx;
  .sku-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12rpx;
    margin-bottom: 12rpx;
  }
  /* SKU 代表图缩略 —— 点击上传,长按删除 */
  .sku-thumb {
    flex-shrink: 0;
    width: 100rpx;
    height: 100rpx;
    border-radius: 8rpx;
    overflow: hidden;
    background: var(--bg-card);
    .sku-thumb-img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .sku-thumb-empty {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rpx;
      border: 2rpx dashed var(--border-default);
      border-radius: 8rpx;
      box-sizing: border-box;
      text {
        font-size: 18rpx;
        color: var(--text-tertiary);
      }
    }
  }
  .sku-no {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    .sku-idx {
      font-size: 20rpx;
      font-weight: 600;
      color: var(--text-tertiary);
      font-family: var(--font-family-base);
    }
  }
  .sku-spec-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4rpx;
  }
  .sku-spec-tag {
    display: inline-flex;
    align-items: center;
    background: var(--bg-card);
    border-radius: 6rpx;
    overflow: hidden;
    .ssp-name {
      padding: 2rpx 8rpx;
      background: var(--text-tertiary);
      color: #fff;
      font-size: 18rpx;
    }
    .ssp-val {
      padding: 2rpx 8rpx;
      color: var(--brand-primary);
      font-size: 18rpx;
      font-weight: 600;
    }
  }
  .sku-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12rpx 16rpx;
  }
  .sku-field {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    .field-label {
      font-size: 20rpx;
      color: var(--text-tertiary);
      font-weight: 600;
    }
    .field-input {
      background: var(--bg-card);
      border: 1rpx solid var(--border-default);
      border-radius: 8rpx;
      padding: 8rpx 12rpx;
      font-size: 24rpx;
      color: var(--text-primary);
    }
  }
}
.sku-summary {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  .sum-label {
    color: var(--text-tertiary);
    margin-right: 8rpx;
  }
  .sum-value {
    color: var(--brand-primary);
    font-weight: 700;
  }
}

/* 价格显示规则 — 全局化提示卡 */
.rule-migrated {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, #fff6f1, #ffe9dc);
  border: 2rpx solid #ffe0cd;
  border-radius: 16rpx;
  margin-top: 12rpx;
  &:active {
    opacity: 0.85;
  }
}
.rule-mig-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 10rpx rgba(255, 77, 45, 0.15);
}
.rule-mig-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.rule-mig-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.rule-mig-sub {
  font-size: 22rpx;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 底部 */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.06);
  .footer-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 999rpx;
    text-align: center;
    line-height: 88rpx;
    font-size: 28rpx;
    font-weight: 700;
    &.ghost {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    &.primary {
      background: var(--brand-gradient);
      color: #fff;
      box-shadow: 0 4rpx 16rpx rgba(255, 77, 45, 0.4);
    }
  }
}
.cat-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.cat-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.cat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--border-light);
  font-size: 30rpx;
  font-weight: 700;
  .cat-close {
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
}
.cat-scroll {
  flex: 1;
  padding: 16rpx 24rpx;
}
.cat-group {
  margin-bottom: 24rpx;
  .cat-group-title {
    display: block;
    font-size: 26rpx;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12rpx;
  }
  .cat-sub-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }
  .cat-sub {
    padding: 8rpx 20rpx;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 24rpx;
    border-radius: 999rpx;
    border: 1rpx solid transparent;
    &.active {
      background: rgba(255, 77, 45, 0.08);
      color: var(--brand-primary);
      border-color: var(--brand-primary);
    }
  }
}
.safe-bottom {
  height: 40rpx;
}
</style>
