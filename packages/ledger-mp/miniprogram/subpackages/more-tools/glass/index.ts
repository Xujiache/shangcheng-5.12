import { MotionPage, navigation } from '../../../utils/page-transition'
import { http } from '../../../utils/request'
import { goToLogin, isLoggedIn, requireLogin } from '../../../utils/store'
import { reportToolEvent } from '../../../utils/tool-events'
import { toolShare, toolShareTimeline } from '../utils/tool-share'
import {
  buildGlassEstimate,
  GAP_TYPES,
  GLASS_GASES,
  glassConstruction,
  MAX_GLASS_LAYERS,
  newGlassGap,
  newGlassPane,
} from '../utils/glass'

type GlassResponse = { uValue: number; unit: string; region: string; model: string }
const paneFields = ['thicknessMm', 'frontEmissivity', 'backEmissivity']
const gapFields = ['thicknessMm', 'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm']

MotionPage({
  _opened: false,
  _revision: 0,
  _requestId: 0,
  data: {
    authorized: false,
    panes: [newGlassPane(0), newGlassPane(1)],
    gaps: [newGlassGap(0)],
    gases: GLASS_GASES,
    gapTypes: GAP_TYPES,
    counts: Array.from({ length: MAX_GLASS_LAYERS - 1 }, (_, i) => `${i + 2} 片 / ${i + 1} 腔`),
    construction: '6 / 12A / 6',
    outsideH: '25',
    insideH: '7.7',
    advanced: false,
    calculating: false,
    error: '',
    result: null as
      | (GlassResponse & {
          value: string
          construction: string
          paneCount: number
          gapCount: number
        })
      | null,
  },
  onShow() {
    const authorized = isLoggedIn()
    this.setData({ authorized })
    if (!authorized) {
      this._requestId++
      this.setData({ result: null, calculating: false })
      requireLogin('登录后可免费使用玻璃 K 值计算。')
    } else if (!this._opened) {
      this._opened = true
      reportToolEvent('glass', 'open')
    }
  },
  onShareAppMessage() {
    return toolShare('glass')
  },
  onShareTimeline() {
    return toolShareTimeline('glass')
  },
  onUnload() {
    this._requestId++
  },
  login() {
    goToLogin()
  },
  openWeight() {
    navigation.navigateTo({ url: '/subpackages/more-tools/glass-weight/index' })
  },
  update(values: Record<string, any>) {
    this._revision++
    const panes = values.panes || this.data.panes
    const gaps = values.gaps || this.data.gaps
    this.setData({
      ...values,
      result: null,
      error: '',
      construction: glassConstruction(panes, gaps),
    })
  },
  setCount(count: number) {
    if (
      !Number.isInteger(count) ||
      count < 2 ||
      count > MAX_GLASS_LAYERS ||
      count === this.data.panes.length
    )
      return
    const panes = this.data.panes.slice(0, count)
    const gaps = this.data.gaps.slice(0, count - 1)
    while (panes.length < count) panes.push(newGlassPane(panes.length))
    while (gaps.length < count - 1) gaps.push(newGlassGap(gaps.length))
    this.update({ panes, gaps })
  },
  chooseCount(event: any) {
    this.setCount(Number(event.detail.value) + 2)
  },
  changeCount(event: any) {
    this.setCount(this.data.panes.length + Number(event.currentTarget.dataset.delta))
  },
  presetCount(event: any) {
    this.setCount(Number(event.currentTarget.dataset.count))
  },
  onPaneField(event: any) {
    const { index, field } = event.currentTarget.dataset
    if (!paneFields.includes(field) || !this.data.panes[index]) return
    const panes = this.data.panes.map((pane, i) =>
      i === Number(index) ? { ...pane, [field]: String(event.detail.value || '') } : pane,
    )
    this.update({ panes })
  },
  chooseCoating(event: any) {
    const index = Number(event.currentTarget.dataset.index),
      coatingIndex = Number(event.detail.value)
    if (
      !this.data.panes[index] ||
      !Number.isInteger(coatingIndex) ||
      coatingIndex < 0 ||
      coatingIndex > 3
    )
      return
    this.update({
      panes: this.data.panes.map((pane, i) => (i === index ? { ...pane, coatingIndex } : pane)),
    })
  },
  onGapField(event: any) {
    const { index, field } = event.currentTarget.dataset
    if (!gapFields.includes(field) || !this.data.gaps[index]) return
    this.update({
      gaps: this.data.gaps.map((gap, i) =>
        i === Number(index) ? { ...gap, [field]: String(event.detail.value || '') } : gap,
      ),
    })
  },
  chooseGapType(event: any) {
    const index = Number(event.currentTarget.dataset.index),
      typeIndex = Number(event.detail.value)
    if (
      !this.data.gaps[index] ||
      ![0, 1].includes(typeIndex) ||
      typeIndex === this.data.gaps[index].typeIndex
    )
      return
    this.update({
      gaps: this.data.gaps.map((gap, i) =>
        i === index
          ? {
              ...gap,
              typeIndex,
              thicknessMm: typeIndex === 0 ? '12' : '0.3',
              expanded: typeIndex === 1,
            }
          : gap,
      ),
    })
  },
  chooseGas(event: any) {
    const index = Number(event.currentTarget.dataset.index),
      gasIndex = Number(event.detail.value)
    if (!this.data.gaps[index] || !GLASS_GASES[gasIndex]) return
    this.update({
      gaps: this.data.gaps.map((gap, i) => (i === index ? { ...gap, gasIndex } : gap)),
    })
  },
  toggleGap(event: any) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({
      gaps: this.data.gaps.map((gap, i) =>
        i === index ? { ...gap, expanded: !gap.expanded } : gap,
      ),
    })
  },
  onBoundary(event: any) {
    const field = event.currentTarget.dataset.field
    if (field === 'outsideH' || field === 'insideH')
      this.update({ [field]: String(event.detail.value || '') })
  },
  toggleAdvanced() {
    this.setData({ advanced: !this.data.advanced })
  },
  reset() {
    this._requestId++
    this.update({
      panes: [newGlassPane(0), newGlassPane(1)],
      gaps: [newGlassGap(0)],
      outsideH: '25',
      insideH: '7.7',
      advanced: false,
      calculating: false,
    })
  },
  async calculate() {
    if (!this.data.authorized || this.data.calculating) return
    let payload: ReturnType<typeof buildGlassEstimate>
    try {
      payload = buildGlassEstimate(
        this.data.panes,
        this.data.gaps,
        this.data.outsideH,
        this.data.insideH,
      )
    } catch (error: any) {
      this.setData({ error: error.message, result: null })
      return
    }
    const revision = this._revision,
      requestId = ++this._requestId
    const construction = this.data.construction
    this.setData({ calculating: true, error: '' })
    try {
      const response = await http.post<GlassResponse>('/l/tools/glass/estimate', payload, {
        silent: true,
      })
      if (requestId !== this._requestId || revision !== this._revision) return
      if (!Number.isFinite(response.uValue) || response.uValue <= 0)
        throw Error('计算结果无效，请重试')
      this.setData({
        result: {
          ...response,
          value: response.uValue.toFixed(2),
          construction,
          paneCount: payload.panes.length,
          gapCount: payload.gaps.length,
        },
      })
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    } catch (error: any) {
      if (requestId === this._requestId && revision === this._revision)
        this.setData({ error: error?.message || '计算失败，请稍后重试' })
    } finally {
      if (requestId === this._requestId) this.setData({ calculating: false })
    }
  },
})
