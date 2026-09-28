import { MotionPage } from '../../../utils/page-transition'
import { http } from '../../../utils/request'
import { goToLogin, isLoggedIn, requireLogin } from '../../../utils/store'
import { reportToolEvent } from '../../../utils/tool-events'

const gases = [{ value: 'air', label: '空气' }, { value: 'argon', label: '氩气' }]
const coatings = [{ value: 'none', label: '无镀膜' }, { value: 'surface2', label: '第 2 面' }, { value: 'surface3', label: '第 3 面' }]
const numericFields = ['outerMm', 'innerMm', 'gapMm', 'emissivity', 'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm', 'outsideH', 'insideH'] as const
type NumericField = typeof numericFields[number]
type GlassResponse = { uValue: number; unit: string; region: string; model: string; conditions: { insideAirC: number; outsideAirC: number } }

MotionPage({
  _opened: false,
  data: {
    authorized: false,
    type: 'hollow' as 'hollow' | 'vacuum',
    gases, gasIndex: 0, coatings, coatingIndex: 0,
    outerMm: '6', innerMm: '6', gapMm: '12', emissivity: '0.10',
    vacuumPressurePa: '0.1', pillarDiameterMm: '0.3', pillarPitchMm: '25',
    outsideH: '25', insideH: '7.7', advanced: false,
    calculating: false, error: '', result: null as (Omit<GlassResponse, 'uValue'> & { uValue: string }) | null,
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) requireLogin('登录后可免费使用玻璃 K 值计算。')
    else if (!this._opened) { this._opened = true; reportToolEvent('glass', 'open') }
  },
  login() { goToLogin() },
  changeType(event: any) {
    const type = String(event.currentTarget.dataset.type)
    if (type !== 'hollow' && type !== 'vacuum') return
    this.setData({ type, gapMm: type === 'hollow' ? '12' : '0.3', result: null, error: '' })
  },
  chooseGas(event: any) { this.setData({ gasIndex: Number(event.detail.value), result: null }) },
  chooseCoating(event: any) { this.setData({ coatingIndex: Number(event.detail.value), result: null }) },
  onField(event: any) {
    const field = String(event.currentTarget.dataset.field) as NumericField
    if (!numericFields.includes(field)) return
    this.setData({ [field]: String(event.detail.value || ''), result: null, error: '' })
  },
  toggleAdvanced() { this.setData({ advanced: !this.data.advanced }) },
  edit() { this.setData({ result: null }) },
  async calculate() {
    if (!this.data.authorized || this.data.calculating) return
    const numeric = (field: NumericField) => Number(this.data[field])
    const required: NumericField[] = this.data.type === 'vacuum'
      ? ['outerMm', 'innerMm', 'gapMm', 'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm', 'outsideH', 'insideH']
      : ['outerMm', 'innerMm', 'gapMm', 'outsideH', 'insideH']
    if (this.data.coatingIndex > 0) required.push('emissivity')
    if (required.some(field => !this.data[field] || !Number.isFinite(numeric(field)) || numeric(field) <= 0)) {
      this.setData({ error: '请完整填写大于 0 的有效参数' })
      return
    }
    const payload: Record<string, any> = {
      type: this.data.type,
      outerMm: numeric('outerMm'), innerMm: numeric('innerMm'), gapMm: numeric('gapMm'),
      coating: coatings[this.data.coatingIndex].value,
      outsideH: numeric('outsideH'), insideH: numeric('insideH'),
    }
    if (this.data.type === 'hollow') payload.gas = gases[this.data.gasIndex].value
    if (this.data.coatingIndex > 0) payload.emissivity = numeric('emissivity')
    if (this.data.type === 'vacuum') {
      payload.vacuumPressurePa = numeric('vacuumPressurePa')
      payload.pillarDiameterMm = numeric('pillarDiameterMm')
      payload.pillarPitchMm = numeric('pillarPitchMm')
    }
    this.setData({ calculating: true, error: '' })
    try {
      const response = await http.post<GlassResponse>('/l/tools/glass/estimate', payload, { silent: true })
      this.setData({ result: { ...response, uValue: response.uValue.toFixed(2) } })
    } catch (error: any) {
      this.setData({ error: error?.message || '计算失败，请检查参数或稍后重试' })
    } finally {
      this.setData({ calculating: false })
    }
  },
})
