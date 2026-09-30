import { MotionPage, navigation } from '../../../utils/page-transition'
import { requireLogin } from '../../../utils/store'
import { MATERIAL_BY_ID, METAL_CATEGORIES } from '../data/materials'
import { calculateMetal, describeMetalInput, fmt } from '../../../utils/metal/calc'
import { deleteMetalRecord, readMetalRecords, RecordKind } from '../../../utils/metal/storage'

MotionPage({
  data: { tab: 'history' as RecordKind, historyCount: 0, favoritesCount: 0, rows: [] as Array<{ id: string; material: string; category: string; spec: string; weight: string; amount: string; savedAt: string }> },
  onShow() { if (requireLogin('登录后可查看本机计算记录。')) this.refresh() },
  refresh() {
    this.setData({ historyCount: readMetalRecords('history').length, favoritesCount: readMetalRecords('favorites').length,
      rows: readMetalRecords(this.data.tab).map(item => {
        const material = MATERIAL_BY_ID.get(item.input.materialId)
        let weight = '—', amount = '—'
        try {
          const result = calculateMetal(item.input)
          if (result.totalWeightKg > 0) { weight = fmt(result.totalWeightKg, 3); amount = fmt(result.amountYuan, 2) }
        } catch { /* 旧记录仍可打开修改规格。 */ }
        const date = new Date(item.savedAt)
        const pad = (value: number) => String(value).padStart(2, '0')
        const savedAt = Number.isFinite(date.getTime())
          ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}` : ''
        return { id: item.id, material: material?.label || item.label,
          category: METAL_CATEGORIES.find(category => category.id === material?.category)?.title.replace('类', '') || '材料',
          spec: describeMetalInput(item.input), weight, amount, savedAt }
      }) })
  },
  switchTab(event: any) {
    const tab = String(event.currentTarget.dataset.tab) as RecordKind
    if (tab !== 'history' && tab !== 'favorites') return
    this.setData({ tab }, () => this.refresh())
  },
  reopen(event: any) {
    const id = String(event.currentTarget.dataset.id)
    const record = readMetalRecords(this.data.tab).find(item => item.id === id)
    const category = MATERIAL_BY_ID.get(record?.input.materialId || '')?.category
    if (record && category) navigation.navigateTo({ url: `/subpackages/metal/calc/index?category=${category}&recordId=${encodeURIComponent(id)}` })
  },
  remove(event: any) {
    const id = String(event.currentTarget.dataset.id)
    wx.showModal({ title: '删除记录', content: '删除这条本机记录？', success: result => {
      if (result.confirm && deleteMetalRecord(this.data.tab, id)) this.refresh()
    } })
  },
  openCalculator() { navigation.navigateTo({ url: '/subpackages/metal/index/index' }) },
})
