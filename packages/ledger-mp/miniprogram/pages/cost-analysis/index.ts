import { statsApi } from '../../api/index'
import { yuan } from '../../utils/format'

// 成本分类 → 配色 token（与首页 / COST_CATS 同口径；extras=其他→c6）
const COLORMAP: Record<string, string> = {
  profile: 'c1',
  glass: 'c2',
  hardware: 'c3',
  labor: 'c4',
  screen: 'c5',
  extras: 'c6',
}
// monthly 序列里有逐月明细的分类（人工 / 其他）
const MONTHLY_FIELD: Record<string, 'labor' | 'otherCost'> = {
  labor: 'labor',
  extras: 'otherCost',
}

interface Slice {
  key: string
  name: string
  value: number
}

Page({
  data: {
    loading: true,
    ovYear: new Date().getFullYear(),
    hasData: false,
    donut: [] as any[],
    legend: [] as any[],
    totalCostText: '¥0',
    // 分类切换
    catOptions: [] as any[],
    cat: '',
    catName: '',
    catColor: 'c1',
    catTotalText: '¥0',
    catHasMonthly: false,
    catBars: [] as any[],
    // 缓存，供切换分类时复用
    _slices: [] as Slice[],
    _series: [] as any[],
  },

  onLoad() {
    this.load()
  },

  async load() {
    try {
      const [ov, mon] = await Promise.all([
        statsApi.overview('year') as Promise<any>,
        statsApi.monthly(this.data.ovYear) as Promise<any>,
      ])
      const slices: Slice[] = (ov && ov.costSlices) || []
      const series: any[] = (mon && mon.series) || []
      const total = slices.reduce((s, x) => s + (x.value || 0), 0)

      if (!slices.length || total <= 0) {
        this.setData({ hasData: false, loading: false })
        return
      }

      const donut = slices.map((s) => ({ value: s.value, color: COLORMAP[s.key] || 'c6' }))
      const legend = slices.map((s) => ({
        key: s.key,
        name: s.name,
        color: COLORMAP[s.key] || 'c6',
        valueText: yuan(s.value),
        pct: Math.round((s.value / total) * 100),
      }))
      const catOptions = slices.map((s) => ({ value: s.key, label: s.name }))

      this.setData(
        {
          hasData: true,
          donut,
          legend,
          totalCostText: yuan(total),
          catOptions,
          cat: slices[0].key,
          _slices: slices,
          _series: series,
          loading: false,
        },
        () => this.applyCat(slices[0].key),
      )
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onCat(e: any) {
    const cat = e.detail.value
    this.setData({ cat }, () => this.applyCat(cat))
  },

  // 根据选中分类计算总额 / 逐月柱
  applyCat(key: string) {
    const slice = this.data._slices.find((s) => s.key === key)
    const color = COLORMAP[key] || 'c6'
    const field = MONTHLY_FIELD[key]
    let catBars: any[] = []
    let catHasMonthly = false
    if (field) {
      const series = this.data._series || []
      catBars = series.map((s: any) => ({ label: s.label, value: s[field] || 0 }))
      catHasMonthly = catBars.some((b) => b.value > 0)
    }
    this.setData({
      catName: slice ? slice.name : '',
      catColor: color,
      catTotalText: yuan(slice ? slice.value : 0),
      catBars,
      catHasMonthly,
    })
  },
})
