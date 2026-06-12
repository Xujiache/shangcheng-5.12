import { statsApi } from '../../api/index'
import { yuan, maskMoney } from '../../utils/format'
import { getHideAmount } from '../../utils/store'

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
    loadError: false, // 网络/加载失败：区别于"暂无成本数据"空态
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

  _seq: 0,

  onShow() {
    // onShow 重新拉取：从隐私设置返回时同步「隐藏金额」开关
    this.load()
  },

  async load() {
    // 序号守卫：onShow 可能并发触发，旧响应不得覆盖新数据
    const seq = (this._seq = (this._seq || 0) + 1)
    try {
      const [ov, mon] = await Promise.all([
        statsApi.overview('year') as Promise<any>,
        statsApi.monthly(this.data.ovYear) as Promise<any>,
      ])
      if (seq !== this._seq) return
      const slices: Slice[] = (ov && ov.costSlices) || []
      const series: any[] = (mon && mon.series) || []
      const total = slices.reduce((s, x) => s + (x.value || 0), 0)

      if (!slices.length || total <= 0) {
        this.setData({ hasData: false, loading: false, loadError: false })
        return
      }

      // 隐藏金额模式：仅掩码文本金额，环图/占比保持相对比例
      const hide = getHideAmount()
      const donut = slices.map((s) => ({ value: s.value, color: COLORMAP[s.key] || 'c6' }))
      const legend = slices.map((s) => ({
        key: s.key,
        name: s.name,
        color: COLORMAP[s.key] || 'c6',
        valueText: hide ? maskMoney(s.value) : yuan(s.value),
        pct: Math.round((s.value / total) * 100),
      }))
      const catOptions = slices.map((s) => ({ value: s.key, label: s.name }))

      this.setData(
        {
          hasData: true,
          donut,
          legend,
          totalCostText: hide ? maskMoney(total) : yuan(total),
          catOptions,
          cat: slices[0].key,
          _slices: slices,
          _series: series,
          loading: false,
          loadError: false,
        },
        () => this.applyCat(slices[0].key),
      )
    } catch (e) {
      if (seq !== this._seq) return
      // 已有数据在屏时不切错误卡（request 层已 toast），仅首载失败才显示重试，同订单页口径
      this.setData({ loading: false, loadError: !this.data.hasData })
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
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
    const catTotal = slice ? slice.value : 0
    this.setData({
      catName: slice ? slice.name : '',
      catColor: color,
      catTotalText: getHideAmount() ? maskMoney(catTotal) : yuan(catTotal),
      catBars,
      catHasMonthly,
    })
  },
})
