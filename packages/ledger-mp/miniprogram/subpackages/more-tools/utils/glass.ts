export const GLASS_THICKNESSES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 19, 25]
export const MAX_GLASS_LAYERS = 20
export const GLASS_GASES = [{ value: 'air', label: '空气' }, { value: 'argon', label: '氩气' }]
export const GAP_TYPES = [{ value: 'hollow', label: '中空腔' }, { value: 'vacuum', label: '真空腔' }]

export function newGlassPane(index: number) {
  return {
    id: index + 1, thicknessMm: '6', coatingIndex: 0, frontEmissivity: '0.10', backEmissivity: '0.10',
    coatings: ['无镀膜', `第 ${index * 2 + 1} 面 Low-E`, `第 ${index * 2 + 2} 面 Low-E`, '双面 Low-E'],
  }
}
export function newGlassGap(index: number) {
  return {
    id: index + 1, typeIndex: 0, thicknessMm: '12', gasIndex: 0,
    vacuumPressurePa: '0.1', pillarDiameterMm: '0.3', pillarPitchMm: '25', expanded: false,
  }
}
export type GlassPaneInput = ReturnType<typeof newGlassPane>
export type GlassGapInput = ReturnType<typeof newGlassGap>

function numberInRange(value: string, min: number, max: number, label: string) {
  const number = value.trim() ? Number(value) : NaN
  if (!Number.isFinite(number) || number < min || number > max) throw Error(`${label}须为 ${min}–${max}`)
  return number
}

export function buildGlassEstimate(panes: GlassPaneInput[], gaps: GlassGapInput[], outsideH: string, insideH: string) {
  if (panes.length < 2 || panes.length > MAX_GLASS_LAYERS || gaps.length !== panes.length - 1) throw Error('玻璃与腔体数量不匹配')
  return {
    panes: panes.map((pane, index) => {
      if (!Number.isInteger(pane.coatingIndex) || pane.coatingIndex < 0 || pane.coatingIndex > 3) throw Error('请选择镀膜位置')
      return {
        thicknessMm: numberInRange(pane.thicknessMm, 2, 25, `第 ${index + 1} 片厚度（mm）`),
        frontEmissivity: pane.coatingIndex === 1 || pane.coatingIndex === 3 ? numberInRange(pane.frontEmissivity, 0.01, 0.84, `第 ${index * 2 + 1} 面发射率`) : 0.84,
        backEmissivity: pane.coatingIndex === 2 || pane.coatingIndex === 3 ? numberInRange(pane.backEmissivity, 0.01, 0.84, `第 ${index * 2 + 2} 面发射率`) : 0.84,
      }
    }),
    gaps: gaps.map((gap, index) => {
      const label = `第 ${index + 1} 腔`
      if (gap.typeIndex === 0) {
        if (!GLASS_GASES[gap.gasIndex]) throw Error(`${label}请选择气体`)
        return { type: 'hollow', thicknessMm: numberInRange(gap.thicknessMm, 4, 30, `${label}厚度（mm）`), gas: GLASS_GASES[gap.gasIndex].value }
      }
      if (gap.typeIndex !== 1) throw Error(`${label}请选择类型`)
      return {
        type: 'vacuum', thicknessMm: numberInRange(gap.thicknessMm, 0.1, 1, `${label}厚度（mm）`),
        vacuumPressurePa: numberInRange(gap.vacuumPressurePa, 0.001, 100, `${label}压力（Pa）`),
        pillarDiameterMm: numberInRange(gap.pillarDiameterMm, 0.1, 1, `${label}支撑柱直径（mm）`),
        pillarPitchMm: numberInRange(gap.pillarPitchMm, 10, 50, `${label}支撑柱间距（mm）`),
      }
    }),
    outsideH: numberInRange(outsideH, 5, 50, '室外表面系数'),
    insideH: numberInRange(insideH, 2, 20, '室内表面系数'),
  }
}

export interface GlassWeightInput {
  heightMm: string
  widthMm: string
  thicknessIndex: number
  customThicknessMm: string
  layerCount: number
  mixed: boolean
  layers: { id: number; thicknessMm: string }[]
}
export function buildGlassWeight(input: GlassWeightInput) {
  const heightMm = numberInRange(input.heightMm, 0.001, 100000, '高度（mm）')
  const widthMm = numberInRange(input.widthMm, 0.001, 100000, '宽度（mm）')
  if (!Number.isInteger(input.layerCount) || input.layerCount < 1 || input.layerCount > MAX_GLASS_LAYERS) throw Error('玻璃层数须为 1–20')
  const custom = input.customThicknessMm.trim()
  const thicknessesMm = input.mixed
    ? input.layers.map((layer, index) => numberInRange(layer.thicknessMm, 0.1, 100, `第 ${index + 1} 层厚度（mm）`))
    : Array(input.layerCount).fill(custom ? numberInRange(custom, 0.1, 100, '自定义厚度（mm）') : GLASS_THICKNESSES[input.thicknessIndex])
  if (thicknessesMm.length !== input.layerCount || thicknessesMm.some(value => !Number.isFinite(value) || value < 0.1 || value > 100)) throw Error('请完整填写每层玻璃厚度')
  return { heightMm, widthMm, thicknessesMm }
}

export function glassConstruction(panes: GlassPaneInput[], gaps: GlassGapInput[]) {
  return panes.map((pane, index) => `${pane.thicknessMm || '—'}${gaps[index] ? ` / ${gaps[index].thicknessMm || '—'}${gaps[index].typeIndex === 1 ? 'V' : gaps[index].gasIndex === 1 ? 'Ar' : 'A'}` : ''}`).join(' / ')
}
