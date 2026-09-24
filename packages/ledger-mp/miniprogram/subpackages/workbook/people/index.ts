import { MotionPage } from '../../../utils/page-transition'
import { decimal100, localDate, money, rows } from '../../../utils/workbook/domain'
import {
  confirm,
  errorText,
  makeChange,
  repository,
  reportError,
  saveChanges,
} from '../../../utils/workbook/client'
const blank = () => ({
  id: '',
  name: '',
  jobType: '',
  phone: '',
  mode: 'day',
  rate: '',
  address: '',
  contact: '',
  startDate: localDate(),
  status: 'active',
})
MotionPage({
  data: {
    tab: 'workers',
    tabOptions: [
      { value: 'workers', label: '工人档案' },
      { value: 'projects', label: '工地档案' },
    ],
    totalCount: 0,
    search: '',
    archived: false,
    list: [] as any[],
    editing: false,
    saving: false,
    formError: '',
    form: blank(),
    modes: ['按天', '按小时', '计件', '包工'],
    modeUnits: ['天', '小时', '件', '项'],
    modeIndex: 0,
  },
  onShow() {
    this.refresh()
  },
  refresh() {
    try {
      const s = repository().read()
      const c = this.data.tab as 'workers' | 'projects'
      this.setData({
        totalCount: rows(s.book, c).length,
        list: rows(s.book, c)
          .filter(
            (r) =>
              (this.data.archived || r.status === 'active') &&
              [r.name, r.jobType, r.phone, r.contact, r.address]
                .join(' ')
                .includes(this.data.search),
          )
          .sort(
            (a, b) =>
              (a.jobType || '').localeCompare(b.jobType || '') || a.name.localeCompare(b.name),
          )
          .map((r) => ({
            ...r,
            initial: r.name.slice(0, 1),
            unitLabel:
              ({ day: '天', hour: '小时', piece: '件', fixed: '项' } as Record<string, string>)[
                r.mode
              ] || '天',
            rate: money(r.rateFen || 0),
            code: r.id.slice(-6).toUpperCase(),
            statusText:
              r.status === 'active'
                ? c === 'workers'
                  ? '在职'
                  : '进行中'
                : c === 'workers'
                  ? '停用'
                  : '完工',
          })),
      })
    } catch (e) {
      reportError(e)
    }
  },
  tab(e: any) {
    const tab = e.detail.value
    if (!['workers', 'projects'].includes(tab)) return
    this.setData({ tab, editing: false, search: '', archived: false })
    this.refresh()
  },
  search(e: any) {
    this.setData({ search: e.detail.value })
    this.refresh()
  },
  archived(e: any) {
    this.setData({ archived: e.detail.value })
    this.refresh()
  },
  clearSearch() {
    this.setData({ search: '' })
    this.refresh()
  },
  resetSearch() {
    this.setData({ search: '', archived: true })
    this.refresh()
  },
  toggleArchived() {
    this.setData({ archived: !this.data.archived })
    this.refresh()
  },
  add() {
    this.setData({ editing: true, form: blank(), modeIndex: 0, formError: '' })
  },
  edit(e: any) {
    const r =
      repository().read().book[this.data.tab as 'workers' | 'projects'][e.currentTarget.dataset.id]
    this.setData({
      editing: true,
      formError: '',
      form: { ...blank(), ...r, rate: String((r.rateFen || 0) / 100) },
      modeIndex: ['day', 'hour', 'piece', 'fixed'].indexOf(r.mode || 'day'),
    })
  },
  field(e: any) {
    if (this.data.saving) return
    const field = e.currentTarget.dataset.field
    if (!['name', 'jobType', 'phone', 'rate', 'address', 'contact', 'startDate'].includes(field))
      return
    this.setData({ ['form.' + field]: e.detail.value, formError: '' })
  },
  mode(e: any) {
    if (this.data.saving) return
    const i = Number(e.currentTarget?.dataset?.index ?? e.detail?.value)
    if (!Number.isInteger(i) || i < 0 || i >= this.data.modes.length) return
    this.setData({ modeIndex: i, 'form.mode': ['day', 'hour', 'piece', 'fixed'][i] })
  },
  cancel() {
    if (this.data.saving) return
    this.setData({ editing: false, formError: '' })
  },
  async archive(e: any) {
    try {
      const s = repository().read()
      const c = this.data.tab as 'workers' | 'projects'
      const r = s.book[c][e.currentTarget.dataset.id]
      if (
        !(await confirm(
          r.status === 'active' ? '归档档案' : '恢复档案',
          '历史记工和工资不受影响。',
        ))
      )
        return
      saveChanges('变更档案状态', [
        makeChange(c, { ...r, status: r.status === 'active' ? 'archived' : 'active' }, s.book),
      ])
      this.refresh()
    } catch (e) {
      reportError(e)
    }
  },
  async save() {
    if (this.data.saving) return
    this.setData({ saving: true, formError: '' })
    try {
      const s = repository().read()
      const f = { ...this.data.form, name: this.data.form.name.trim() }
      const c = this.data.tab as 'workers' | 'projects'
      if (!f.name) throw new Error(c === 'workers' ? '请填写工人姓名' : '请填写工地名称')
      if (c === 'workers' && f.rate.trim().startsWith('-')) throw new Error('默认单价不能小于 0')
      const rateFen = c === 'workers' ? decimal100(f.rate.trim() || '0') : 0
      const same = rows(s.book, c).some((r) => r.name.trim() === f.name.trim() && r.id !== f.id)
      if (
        same &&
        !(await confirm(
          '发现同名档案',
          '仍然保存为独立档案？每位工人会有独立编号，不会合并历史工资。',
        ))
      )
        return
      const value = c === 'workers' ? { ...f, rateFen } : { ...f }
      saveChanges('保存' + (c === 'workers' ? '工人' : '工地'), [makeChange(c, value, s.book)])
      this.setData({ editing: false })
      this.refresh()
      wx.showToast({ title: '已保存到本机', image: '/assets/workbook-icons/check.png' })
    } catch (e) {
      this.setData({ formError: errorText(e) })
    } finally {
      this.setData({ saving: false })
    }
  },
})
