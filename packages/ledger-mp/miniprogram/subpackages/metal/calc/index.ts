import { MotionPage, navigation } from '../../../utils/page-transition'
import { request } from '../../../utils/request'
import { getCurrentLedgerAccountId, requireLogin, requireMembership } from '../../../utils/store'
import {
  MATERIALS,
  MATERIAL_BY_ID,
  METAL_CATEGORIES,
  METAL_FIELDS,
  Material,
  MetalCategory,
} from '../data/materials'
import { lookupSpec, SectionShape } from '../data/specTable'
import { calculateMetal, describeMetalInput, fmt, MetalInput, MetalResult } from '../utils/calc'
import { readMetalRecords, saveMetalRecord } from '../utils/storage'
import { addMetalQuoteItem } from '../utils/quote'
import { toolShare, toolShareTimeline } from '../utils/tool-share'

type Field = { key: string; label: string; unit: string; value: string; type: 'text' | 'digit' }
type Config = {
  prices?: Record<string, number>
  densities?: Record<string, number>
  priceMode?: Record<string, string>
  updatedAt?: string
  defaults?: { quoteFactor?: number; processingFeeFen?: number }
}
const shapes: Array<{ id: SectionShape; label: string }> = [
  { id: 'angle', label: '角钢' },
  { id: 'channel', label: '槽钢' },
  { id: 'ibeam', label: '工字钢' },
  { id: 'hbeam', label: 'H型钢' },
  { id: 'cpurlin', label: 'C型钢' },
]
const fieldsFor = (category: MetalCategory, values: Record<string, string> = {}): Field[] =>
  METAL_FIELDS[category].map((field) => ({
    ...field,
    value: values[field.key] ?? field.initial,
    type: field.text ? 'text' : 'digit',
  }))

function categoryOf(value: string): MetalCategory {
  return METAL_CATEGORIES.find((category) => category.id === value)?.id || 'plate'
}
function shapeOf(materialId: string): SectionShape {
  if (materialId.includes('.al.')) return 'aluminum'
  const suffix = materialId.split('.').pop() as SectionShape
  return shapes.some((shape) => shape.id === suffix) ? suffix : 'angle'
}
function estimateFieldsFor(shape: SectionShape, values: Record<string, string> = {}): Field[] {
  const field = (key: string, label: string, unit: string): Field => ({
    key,
    label,
    unit,
    value: values[key] ?? '',
    type: 'digit',
  })
  if (shape === 'aluminum') return [field('areaMm2', '截面面积', 'mm²')]
  if (shape === 'angle') return [field('widthMm', '边宽', 'mm')]
  return [
    field('heightMm', '截面高度', 'mm'),
    field('widthMm', '翼缘宽度', 'mm'),
    field('webThicknessMm', '腹板厚度', 'mm'),
    field('flangeThicknessMm', '翼缘厚度', 'mm'),
    ...(shape === 'cpurlin' ? [field('lipMm', '卷边宽度', 'mm')] : []),
  ]
}

MotionPage({
  _timer: 0 as any,
  _config: null as Config | null,
  _densityChanged: false,
  _densityHintShown: false,
  _settingsChanged: false,
  data: {
    category: 'plate' as MetalCategory,
    pageTitle: '金属计算器-板材类',
    groups: [] as string[],
    activeGroup: '',
    grades: [] as Material[],
    materialId: '',
    materialLabel: '',
    fields: [] as Field[],
    sectionShapes: shapes,
    sectionShape: 'angle' as SectionShape,
    estimateSection: false,
    estimateFields: [] as Field[],
    shapeSelectable: false,
    density: '',
    manualTonPrice: '',
    quoteFactor: '1.00',
    processingFee: '0.00',
    settingsOpen: false,
    referencePrice: '',
    priceNote: '',
    priceUpdatedAt: '',
    unitWeight: '0.000',
    totalWeight: '0.000',
    totalPrice: '0.00',
    unitText: 'kg/张',
    totalText: '共 0 张',
    methodText: '',
    warning: '',
    source: '',
    hasResult: false,
    keyboardRaised: false,
    inputTouched: false,
  },
  onShareAppMessage() {
    return toolShare('metal-calc', { category: this.data.category })
  },
  onShareTimeline() {
    return toolShareTimeline('metal-calc', { category: this.data.category })
  },
  onLoad(options: { category?: string; recordId?: string }) {
    const category = categoryOf(options.category || '')
    const material = MATERIALS.find((item) => item.category === category)!
    const fields = fieldsFor(category)
    const groups = [
      ...new Set(MATERIALS.filter((item) => item.category === category).map((item) => item.group)),
    ]
    this.setData(
      {
        category,
        pageTitle: `${METAL_CATEGORIES.find((item) => item.id === category)!.title.replace('类', '')}计算`,
        groups,
        activeGroup: material.group,
        grades: MATERIALS.filter(
          (item) => item.category === category && item.group === material.group,
        ),
        materialId: material.id,
        materialLabel: material.label,
        fields,
        sectionShape: shapeOf(material.id),
        shapeSelectable: material.id.includes('.ss.'),
        density: String(material.density),
      },
      () => this.recalculate(),
    )
    if (options.recordId) this.loadRecord(options.recordId)
    this.loadConfig()
  },
  onUnload() {
    clearTimeout(this._timer)
  },
  async loadConfig() {
    try {
      this._config = await request<Config>({
        url: '/l/tools/metal/config',
        auth: false,
        silent: true,
      })
      this.applyPrice()
      if (!this._settingsChanged && this._config?.defaults)
        this.setData({
          quoteFactor: String(this._config.defaults.quoteFactor ?? 1),
          processingFee: String((this._config.defaults.processingFeeFen ?? 0) / 100),
        })
      this.recalculate()
    } catch {
      this.applyPrice()
    }
  },
  applyPrice() {
    const material = MATERIAL_BY_ID.get(this.data.materialId)
    if (!material) return
    const live = this._config?.prices?.[material.id]
    const price = Number.isFinite(live) ? Number(live) : material.seedTonPriceYuan
    const density = this._config?.densities?.[material.id]
    this.setData({
      referencePrice: fmt(price, 0),
      priceNote: Number.isFinite(live)
        ? this._config?.priceMode?.[material.id] === 'estimate'
          ? '后台估算价 · 仅供参考'
          : '后台参考价'
        : '离线种子价 · 仅供参考',
      priceUpdatedAt: this._config?.updatedAt
        ? this._config.updatedAt.slice(0, 16).replace('T', ' ')
        : '2026-09-30',
      density: this._densityChanged
        ? this.data.density
        : String(Number.isFinite(density) ? density : material.density),
    })
  },
  selectGroup(event: any) {
    const group = String(event.currentTarget.dataset.group)
    const material = MATERIALS.find(
      (item) => item.category === this.data.category && item.group === group,
    )
    if (!material) return
    this.setMaterial(material)
  },
  selectGrade(event: any) {
    const material = MATERIAL_BY_ID.get(String(event.currentTarget.dataset.id))
    if (material?.category === this.data.category) this.setMaterial(material)
  },
  setMaterial(material: Material) {
    if (this._densityChanged && !this._densityHintShown) {
      this._densityHintShown = true
      wx.showToast({ title: '已保留你填写的密度', icon: 'none' })
    }
    this.setData(
      {
        activeGroup: material.group,
        grades: MATERIALS.filter(
          (item) => item.category === this.data.category && item.group === material.group,
        ),
        materialId: material.id,
        materialLabel: material.label,
        sectionShape: shapeOf(material.id),
        shapeSelectable: material.id.includes('.ss.'),
        estimateSection: false,
        estimateFields: [],
      },
      () => {
        this.applyPrice()
        this.recalculate()
      },
    )
  },
  onFieldInput(event: any) {
    const key = String(event.currentTarget.dataset.key)
    const value = String(event.detail.value || '')
    const fields = this.data.fields.map((field) =>
      field.key === key ? { ...field, value } : field,
    )
    if (key === 'model') {
      const row = lookupSpec(this.data.sectionShape, value)
      if (row?.thicknessMm) {
        const thickness = fields.find((field) => field.key === 'thicknessMm')
        if (thickness) thickness.value = String(row.thicknessMm)
      }
    }
    this.setData({ fields, inputTouched: true })
    this.scheduleCalculate()
  },
  onEstimateInput(event: any) {
    const key = String(event.currentTarget.dataset.key),
      value = String(event.detail.value || '')
    this.setData({
      inputTouched: true,
      estimateFields: this.data.estimateFields.map((field) =>
        field.key === key ? { ...field, value } : field,
      ),
    })
    this.scheduleCalculate()
  },
  selectShape(event: any) {
    const sectionShape = String(event.currentTarget.dataset.shape) as SectionShape
    if (!shapes.some((shape) => shape.id === sectionShape)) return
    this.setData({ sectionShape, estimateSection: false, estimateFields: [] }, () =>
      this.recalculate(),
    )
  },
  toggleEstimate() {
    const estimateSection = !this.data.estimateSection
    const estimateFields = estimateSection ? estimateFieldsFor(this.data.sectionShape) : []
    this.setData({ estimateSection, estimateFields }, () => this.recalculate())
  },
  onDensity(event: any) {
    this._densityChanged = true
    this.setData({ density: String(event.detail.value || '') })
    this.scheduleCalculate()
  },
  clearDensity() {
    this._densityChanged = false
    this._densityHintShown = false
    this.applyPrice()
    this.recalculate()
  },
  onTonPrice(event: any) {
    this.setData({ manualTonPrice: String(event.detail.value || '') })
    this.scheduleCalculate()
  },
  clearTonPrice() {
    this.setData({ manualTonPrice: '' }, () => this.recalculate())
  },
  onFactor(event: any) {
    this._settingsChanged = true
    this.setData({ quoteFactor: String(event.detail.value || '') })
    this.scheduleCalculate()
  },
  onFee(event: any) {
    this._settingsChanged = true
    this.setData({ processingFee: String(event.detail.value || '') })
    this.scheduleCalculate()
  },
  toggleSettings() {
    this.setData({ settingsOpen: !this.data.settingsOpen })
  },
  onKeyboardHeight(event: WechatMiniprogram.InputKeyboardHeightChange) {
    this.setData({ keyboardRaised: event.detail.height > 0 })
  },
  scheduleCalculate() {
    clearTimeout(this._timer)
    this._timer = setTimeout(() => this.recalculate(), 200)
  },
  currentInput(): MetalInput {
    const dimensions: Record<string, string> = {}
    for (const field of [...this.data.fields, ...this.data.estimateFields])
      dimensions[field.key] = field.value
    const material = MATERIAL_BY_ID.get(this.data.materialId)!
    const backendPrice = this._config?.prices?.[material.id]
    return {
      materialId: material.id,
      dimensions,
      density: this.data.density,
      tonPriceYuan:
        this.data.manualTonPrice ||
        (Number.isFinite(backendPrice) ? Number(backendPrice) : material.seedTonPriceYuan),
      quoteFactor: this.data.quoteFactor,
      processingFeeYuan: this.data.processingFee,
      sectionShape: this.data.sectionShape,
      estimateSection: this.data.estimateSection,
    }
  },
  recalculate() {
    try {
      const result = calculateMetal(this.currentInput())
      this.setData({
        unitWeight: fmt(result.unitWeightKg, 3),
        totalWeight: fmt(result.totalWeightKg, 3),
        totalPrice: fmt(result.amountYuan, 2),
        unitText: result.unit === '张' ? 'kg/张' : 'kg/m',
        totalText: `共 ${fmt(result.quantity, result.unit === '张' ? 0 : 2)} ${result.unit}`,
        methodText:
          result.method === 'table'
            ? result.thicknessCorrected
              ? '规格表 · 按实厚修正'
              : '规格表查表'
            : result.method === 'estimated'
              ? '按尺寸估算 · 不含圆角与工差'
              : result.method === 'unlisted'
                ? '未收录该型号'
                : '按尺寸计算',
        warning:
          result.method === 'unlisted' ? '未收录该型号，请选择已收录规格，或展开按尺寸估算。' : '',
        source: result.source || '',
        hasResult: result.totalWeightKg > 0,
      })
    } catch (error: any) {
      this.setData({
        unitWeight: '0.000',
        totalWeight: '0.000',
        totalPrice: '0.00',
        warning: error.message || '输入无效',
        hasResult: false,
      })
    }
  },
  currentResult(): MetalResult | null {
    try {
      return calculateMetal(this.currentInput())
    } catch {
      return null
    }
  },
  copyItem(event: any) {
    if (!this.data.hasResult) return
    const field = String(event.currentTarget.dataset.field)
    const text =
      field === 'unit'
        ? `${this.data.unitWeight} ${this.data.unitText}`
        : field === 'total'
          ? `${this.data.totalWeight} kg（${this.data.totalText}）`
          : `${this.data.totalPrice} 元`
    wx.setClipboardData({ data: text })
  },
  fullText(): string {
    const result = this.currentResult()
    const material = MATERIAL_BY_ID.get(this.data.materialId)!
    const title = METAL_CATEGORIES.find((category) => category.id === this.data.category)!.title
    return `【${title} - ${material.label}】\n规格：${describeMetalInput(this.currentInput())}\n理论重量：${this.data.unitWeight} ${this.data.unitText}\n总重量：${this.data.totalWeight} kg（${this.data.totalText}）\n参考总价：${this.data.totalPrice} 元（吨价 ${fmt(result?.tonPriceYuan || 0, 0)} 元/吨）\n报价系数：${fmt(Number(this.data.quoteFactor), 2)}　加工费：${fmt(Number(this.data.processingFee), 2)} 元\n——————\n重量与价格仅供参考，实际以过磅和供货商报价为准`
  },
  copyAll() {
    if (!this.data.hasResult) {
      wx.showToast({ title: '请先填写有效尺寸', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: this.fullText(), success: () => this.saveHistory() })
  },
  saveHistory() {
    if (!getCurrentLedgerAccountId()) return
    const material = MATERIAL_BY_ID.get(this.data.materialId)!
    saveMetalRecord('history', {
      id: String(Date.now()),
      savedAt: new Date().toISOString(),
      label: `${material.label} · ${this.data.totalWeight} kg`,
      input: this.currentInput(),
    })
  },
  saveHistoryAction() {
    if (!requireLogin('登录后可在本机保存计算记录。')) return
    if (!this.data.hasResult) {
      wx.showToast({ title: '请先填写有效尺寸', icon: 'none' })
      return
    }
    this.saveHistory()
    wx.showToast({ title: '已保存到历史', icon: 'none' })
  },
  saveFavorite() {
    if (!requireLogin('登录后可在本机收藏常用规格。')) return
    if (!this.data.hasResult) {
      wx.showToast({ title: '请先填写有效尺寸', icon: 'none' })
      return
    }
    const material = MATERIAL_BY_ID.get(this.data.materialId)!
    const ok = saveMetalRecord('favorites', {
      id: `${material.id}:${JSON.stringify(this.currentInput().dimensions)}`,
      savedAt: new Date().toISOString(),
      label: `${material.label} · ${this.data.totalWeight} kg`,
      input: this.currentInput(),
    })
    wx.showToast({ title: ok ? '已保存为常用' : '保存失败', icon: 'none' })
  },
  loadRecord(id: string) {
    const record = [...readMetalRecords('history'), ...readMetalRecords('favorites')].find(
      (item) => item.id === id,
    )
    if (!record) return
    const material = MATERIAL_BY_ID.get(record.input.materialId)
    if (!material || material.category !== this.data.category) return
    this._settingsChanged = true
    this._densityChanged = true
    const dimensions = record.input.dimensions
    this.setData(
      {
        activeGroup: material.group,
        grades: MATERIALS.filter(
          (item) => item.category === this.data.category && item.group === material.group,
        ),
        materialId: material.id,
        materialLabel: material.label,
        shapeSelectable: material.id.includes('.ss.'),
        fields: fieldsFor(this.data.category, dimensions as Record<string, string>),
        inputTouched: true,
        density: String(record.input.density ?? material.density),
        manualTonPrice: String(record.input.tonPriceYuan ?? ''),
        quoteFactor: String(record.input.quoteFactor ?? 1),
        processingFee: String(record.input.processingFeeYuan ?? 0),
        sectionShape: record.input.sectionShape || shapeOf(material.id),
        estimateSection: !!record.input.estimateSection,
        estimateFields: record.input.estimateSection
          ? estimateFieldsFor(
              record.input.sectionShape || shapeOf(material.id),
              dimensions as Record<string, string>,
            )
          : [],
      },
      () => this.recalculate(),
    )
  },
  openHistory() {
    navigation.navigateTo({ url: '/subpackages/metal/history/index' })
  },
  addToQuote() {
    if (!requireMembership('开通会员后可保存和导出金属报价单。')) return
    if (!this.data.hasResult) {
      wx.showToast({ title: '请先填写有效尺寸', icon: 'none' })
      return
    }
    if (!addMetalQuoteItem(this.currentInput())) {
      wx.showToast({ title: '报价单最多 200 行', icon: 'none' })
      return
    }
    navigation.navigateTo({ url: '/subpackages/metal/quote/index' })
  },
})
