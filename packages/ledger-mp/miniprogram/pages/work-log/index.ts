import { workLogApi } from '../../api/index'
import { yuan } from '../../utils/format'
import { goToLogin, isLoggedIn } from '../../utils/store'

const roundQuantity = (value: any) => Math.round(Number(value) * 100) / 100
const today = () => new Date().toISOString().slice(0, 10)
const monthOf = () => today().slice(0, 7)
const quantityText = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

Page({
  data: {
    month: monthOf(),
    date: today(),
    workerName: '',
    jobType: '',
    unit: 'day' as 'day' | 'hour',
    units: [
      { value: 'day', label: '按工天' },
      { value: 'hour', label: '按工时' },
    ],
    quantityStr: '',
    unitPriceStr: '',
    note: '',
    amountText: '¥0',
    loading: true,
    loadError: false,
    saving: false,
    editingId: '',
    groups: [] as any[],
    totalAmountText: '¥0',
    dayQuantityText: '0',
    hourQuantityText: '0',
    count: 0,
  },

  onShow() {
    if (!isLoggedIn()) {
      goToLogin()
      return
    }
    this.load()
  },

  async load(done?: () => void) {
    if (!isLoggedIn()) return
    this.setData({ loading: true, loadError: false })
    try {
      const res: any = await workLogApi.list(this.data.month)
      const groups: any[] = []
      ;(res.list || []).forEach((row: any) => {
        let group = groups.find((item) => item.date === row.workDate)
        if (!group) {
          group = { date: row.workDate, rows: [] }
          groups.push(group)
        }
        group.rows.push({
          ...row,
          quantityText: quantityText(Number(row.quantity) || 0),
          amountText: yuan(Number(row.amount) || 0),
          unitText: row.unit === 'hour' ? '工时' : '工天',
          avatarChar: String(row.workerName || '工').slice(0, 1),
          subText: [
            row.jobType,
            `${quantityText(Number(row.quantity) || 0)} ${row.unit === 'hour' ? '小时' : '天'}`,
            `¥${row.unitPrice}/${row.unit === 'hour' ? '时' : '天'}`,
          ]
            .filter(Boolean)
            .join(' · '),
        })
      })
      const summary = res.summary || {}
      this.setData({
        groups,
        count: Number(summary.count) || 0,
        totalAmountText: yuan(Number(summary.totalAmount) || 0),
        dayQuantityText: quantityText(Number(summary.dayQuantity) || 0),
        hourQuantityText: quantityText(Number(summary.hourQuantity) || 0),
        loading: false,
      })
    } catch {
      this.setData({ loading: false, loadError: true })
    } finally {
      if (done) done()
    }
  },

  onMonth(e: any) {
    this.setData({ month: e.detail.value }, () => this.load())
  },
  onDate(e: any) {
    this.setData({ date: e.detail.value })
  },
  onUnit(e: any) {
    this.setData({ unit: e.detail.value as 'day' | 'hour' }, () => this.recalc())
  },
  onInput(e: any) {
    const field = String(e.currentTarget.dataset.field || '')
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalc())
  },
  recalc() {
    const quantity = Math.max(0, roundQuantity(this.data.quantityStr) || 0)
    const unitPrice = Math.max(0, Math.round(Number(this.data.unitPriceStr) || 0))
    this.setData({ amountText: yuan(Math.round(quantity * unitPrice)) })
  },
  clearEditor() {
    this.setData({
      date: today(),
      workerName: '',
      jobType: '',
      unit: 'day',
      quantityStr: '',
      unitPriceStr: '',
      note: '',
      amountText: '¥0',
      editingId: '',
    })
  },
  edit(e: any) {
    const id = String(e.currentTarget.dataset.id || '')
    let row: any = null
    this.data.groups.some((group: any) => {
      row = group.rows.find((item: any) => item.id === id)
      return !!row
    })
    if (!row) return
    this.setData({
      editingId: row.id,
      date: row.workDate,
      workerName: row.workerName,
      jobType: row.jobType || '',
      unit: row.unit,
      quantityStr: quantityText(Number(row.quantity) || 0),
      unitPriceStr: row.unitPrice ? String(row.unitPrice) : '',
      note: row.note || '',
      amountText: yuan(Number(row.amount) || 0),
    })
    wx.pageScrollTo({ scrollTop: 0, duration: 250 })
  },
  async save() {
    if (this.data.saving) return
    const workerName = this.data.workerName.trim()
    const quantity = roundQuantity(this.data.quantityStr)
    const unitPrice = Math.round(Number(this.data.unitPriceStr) || 0)
    if (!workerName) {
      wx.showToast({ title: '请填写工人姓名', icon: 'none' })
      return
    }
    if (!(quantity > 0)) {
      wx.showToast({ title: '请填写有效工量', icon: 'none' })
      return
    }
    const payload = {
      workDate: this.data.date,
      workerName,
      jobType: this.data.jobType.trim() || undefined,
      unit: this.data.unit,
      quantity,
      unitPrice: Math.max(0, unitPrice),
      note: this.data.note.trim() || undefined,
    }
    this.setData({ saving: true })
    try {
      if (this.data.editingId) await workLogApi.update(this.data.editingId, payload)
      else await workLogApi.create(payload)
      wx.showToast({ title: this.data.editingId ? '已更新' : '已记工', icon: 'success' })
      this.clearEditor()
      this.load()
    } catch {
      this.setData({ saving: false })
    }
  },
  remove(e: any) {
    const id = String(e.currentTarget.dataset.id || '')
    if (!id) return
    wx.showModal({
      title: '删除记工记录',
      content: '删除后无法恢复，是否继续？',
      confirmColor: '#C8442B',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await workLogApi.remove(id)
          if (this.data.editingId === id) this.clearEditor()
          wx.showToast({ title: '已删除', icon: 'success' })
          this.load()
        } catch {
          /* request 层已提示 */
        }
      },
    })
  },
  retry() {
    this.load()
  },
})
