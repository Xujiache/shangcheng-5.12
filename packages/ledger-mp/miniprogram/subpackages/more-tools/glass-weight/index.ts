import { MotionPage, navigation } from '../../../utils/page-transition'
import { http } from '../../../utils/request'
import { goToLogin, isLoggedIn, requireLogin } from '../../../utils/store'
import { reportToolEvent } from '../../../utils/tool-events'
import { buildGlassWeight, GLASS_THICKNESSES, MAX_GLASS_LAYERS } from '../../../utils/more-tools/glass'

type WeightResponse = {
  weightKg: number; areaM2: number; totalThicknessMm: number; weightPerM2: number
  densityCoefficient: number; layerWeightsKg: number[]
}
const display = (number: number, places = 2) => Number(number >= 10 ** -places ? number.toFixed(places) : number.toPrecision(3)).toString()
const defaults = () => ({ heightMm: '', widthMm: '', thicknessIndex: 4, customThicknessMm: '', layerCount: 2, mixed: false, layers: [{ id: 1, thicknessMm: '6' }, { id: 2, thicknessMm: '6' }] })

MotionPage({
  _opened: false, _revision: 0, _requestId: 0, _mixedConfigured: false,
  data: {
    ...defaults(), authorized: false,
    thicknessOptions: GLASS_THICKNESSES.map(value => `${value} mm`),
    layerOptions: Array.from({ length: MAX_GLASS_LAYERS }, (_, i) => `${i + 1} 层`),
    calculating: false, error: '', result: null as (WeightResponse & { weight: string; area: string; perM2: string; thickness: string; formula: string; dimensions: string; layers: number; layerWeights: { id: number; weight: string }[] }) | null,
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) { this._requestId++; this.setData({ result: null, calculating: false }); requireLogin('登录后可免费使用玻璃重量估算。') }
    else if (!this._opened) { this._opened = true; reportToolEvent('glass-weight', 'open') }
  },
  onUnload() { this._requestId++ },
  login() { goToLogin() },
  openK() { navigation.navigateTo({ url: '/subpackages/more-tools/glass/index' }) },
  update(values: Record<string, any>) { this._revision++; this.setData({ ...values, result: null, error: '' }) },
  onField(event: any) {
    const field = event.currentTarget.dataset.field
    if (['heightMm', 'widthMm', 'customThicknessMm'].includes(field)) this.update({ [field]: String(event.detail.value || '') })
  },
  chooseThickness(event: any) {
    const thicknessIndex = Number(event.detail.value)
    if (Number.isInteger(thicknessIndex) && GLASS_THICKNESSES[thicknessIndex]) this.update({ thicknessIndex })
  },
  setCount(layerCount: number) {
    if (!Number.isInteger(layerCount) || layerCount < 1 || layerCount > MAX_GLASS_LAYERS || layerCount === this.data.layerCount) return
    const layers = this.data.layers.slice(0, layerCount)
    const value = this.data.customThicknessMm.trim() || String(GLASS_THICKNESSES[this.data.thicknessIndex])
    while (layers.length < layerCount) layers.push({ id: layers.length + 1, thicknessMm: value })
    this.update({ layerCount, layers })
  },
  chooseLayers(event: any) { this.setCount(Number(event.detail.value) + 1) },
  changeCount(event: any) { this.setCount(this.data.layerCount + Number(event.currentTarget.dataset.delta)) },
  chooseMode(event: any) {
    const mixed = event.currentTarget.dataset.mode === 'mixed'
    if (mixed === this.data.mixed) return
    const value = this.data.customThicknessMm.trim() || String(GLASS_THICKNESSES[this.data.thicknessIndex])
    const firstMixed = mixed && !this._mixedConfigured
    if (mixed) this._mixedConfigured = true
    this.update({ mixed, ...(firstMixed ? { layers: Array.from({ length: this.data.layerCount }, (_, i) => ({ id: i + 1, thicknessMm: value })) } : {}) })
  },
  onLayerThickness(event: any) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0 || index >= this.data.layerCount) return
    this.update({ layers: this.data.layers.map((layer, i) => i === index ? { ...layer, thicknessMm: String(event.detail.value || '') } : layer) })
  },
  reset() { this._requestId++; this._mixedConfigured = false; this.update({ ...defaults(), calculating: false }) },
  async calculate() {
    if (!this.data.authorized || this.data.calculating) return
    let payload: ReturnType<typeof buildGlassWeight>
    try { payload = buildGlassWeight(this.data) }
    catch (error: any) { this.setData({ error: error.message, result: null }); return }
    const revision = this._revision, requestId = ++this._requestId
    this.setData({ calculating: true, error: '' })
    try {
      const response = await http.post<WeightResponse>('/l/tools/glass/weight', payload, { silent: true })
      if (requestId !== this._requestId || revision !== this._revision) return
      if (!Number.isFinite(response.weightKg) || response.weightKg <= 0) throw Error('计算结果无效，请重试')
      const same = payload.thicknessesMm.every(value => value === payload.thicknessesMm[0])
      const thickness = same ? `${payload.thicknessesMm[0]} mm × ${payload.thicknessesMm.length} 层` : `(${payload.thicknessesMm.join(' + ')}) mm`
      this.setData({ result: {
        ...response, weight: display(response.weightKg), area: display(response.areaM2, 4), perM2: display(response.weightPerM2),
        thickness, layers: payload.thicknessesMm.length, dimensions: `${payload.heightMm} × ${payload.widthMm} mm`,
        formula: `${payload.heightMm / 1000} m × ${payload.widthMm / 1000} m × ${thickness} × ${response.densityCoefficient} kg/(m²·mm)`,
        layerWeights: response.layerWeightsKg.map((value, index) => ({ id: index + 1, weight: display(value) })),
      } })
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    } catch (error: any) {
      if (requestId === this._requestId && revision === this._revision) this.setData({ error: error?.message || '计算失败，请稍后重试' })
    } finally {
      if (requestId === this._requestId) this.setData({ calculating: false })
    }
  },
})
