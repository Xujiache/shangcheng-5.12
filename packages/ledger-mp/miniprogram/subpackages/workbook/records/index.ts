import { MotionPage, navigation } from '../../../utils/page-transition'
import {
  filteredEntries,
  localDate,
  lockedIds,
  MODE_LABEL,
  money,
  quantity,
  rows,
  validDate,
  Workbook,
} from '../../../utils/workbook/domain'
import { repository, reportError } from '../../../utils/workbook/client'

type FilterValues = {
  search: string
  from: string
  to: string
  workerIndex: number
  projectIndex: number
  jobIndex: number
  statusIndex: number
}
const emptyFilters = (): FilterValues => ({
  search: '',
  from: '',
  to: '',
  workerIndex: 0,
  projectIndex: 0,
  jobIndex: 0,
  statusIndex: 0,
})
function monthRange(month: string) {
  const [year, m] = month.split('-').map(Number)
  return { from: month + '-01', to: localDate(new Date(year, m, 0)) }
}
function activeFilters(data: FilterValues): FilterValues {
  const { search, from, to, workerIndex, projectIndex, jobIndex, statusIndex } = data
  return { search, from, to, workerIndex, projectIndex, jobIndex, statusIndex }
}
function query(data: any, values: FilterValues) {
  const range = monthRange(data.month)
  return {
    from: values.from || range.from,
    to: values.to || range.to,
    search: values.search.trim(),
    workerId: data.workers[values.workerIndex]?.id,
    projectId: data.projects[values.projectIndex]?.id,
    jobType: values.jobIndex ? data.jobs[values.jobIndex] : '',
    status: ['', 'unsettled', 'settled'][values.statusIndex],
  }
}
MotionPage({
  data: {
    month: localDate().slice(0, 7),
    view: 'calendar',
    viewOptions: [
      { value: 'calendar', label: '日历' },
      { value: 'list', label: '明细' },
    ],
    selectedDate: '',
    ...emptyFilters(),
    workers: [] as any[],
    projects: [] as any[],
    jobs: [] as string[],
    statuses: ['全部', '待结算', '已结算'],
    advanced: false,
    filterGroup: 'more',
    filterTop: 220,
    optionSearch: '',
    choices: [] as { index: number; name: string; code: string }[],
    draft: emptyFilters(),
    draftRange: 'month',
    draftCount: 0,
    filterError: '',
    filterTags: [] as { key: string; label: string }[],
    filterCount: 0,
    rangeOptions: [
      { value: 'month', label: '本月' },
      { value: 'previous', label: '上月' },
      { value: 'week', label: '近7天' },
    ],
    sheetHeight: 600,
    keyboardHeight: 0,
    list: [] as any[],
    cells: [] as any[],
    week: ['日', '一', '二', '三', '四', '五', '六'],
    count: 0,
    amount: '¥0.00',
    limit: 50,
    hasMore: false,
  },
  _filterBook: null as Workbook | null,
  onShow() {
    this.load()
  },
  onHide() {
    this.closeFilters()
  },
  load() {
    try {
      const b = repository().read().book
      const workers = [{ id: '', name: '全部工人' }, ...rows(b, 'workers')]
      const projects = [{ id: '', name: '全部工地' }, ...rows(b, 'projects')]
      const jobs = [
        '全部工种',
        ...Array.from(
          new Set(
            rows(b, 'workers')
              .map((w) => w.jobType)
              .filter(Boolean),
          ),
        ),
      ]
      // Preserve the selected identity if new files are imported while this page is hidden.
      const workerId = this.data.workers[this.data.workerIndex]?.id
      const projectId = this.data.projects[this.data.projectIndex]?.id
      const job = this.data.jobs[this.data.jobIndex]
      this.setData({
        workers,
        projects,
        jobs,
        workerIndex: Math.max(
          0,
          workers.findIndex((w) => w.id === workerId),
        ),
        projectIndex: Math.max(
          0,
          projects.findIndex((p) => p.id === projectId),
        ),
        jobIndex: Math.max(0, jobs.indexOf(job)),
      })
      const f = query(this.data, activeFilters(this.data))
      const all = filteredEntries(b, f)
      const es = this.data.selectedDate
        ? all.filter((e) => e.workDate === this.data.selectedDate)
        : all
      const lock = lockedIds(b)
      const [y, m] = this.data.month.split('-').map(Number)
      const cells: any[] = []
      const counts: Record<string, number> = {}
      all.forEach((e) => {
        counts[e.workDate] = (counts[e.workDate] || 0) + 1
      })
      for (let i = 0; i < new Date(y, m - 1, 1).getDay(); i++)
        cells.push({ id: 'blank' + i, date: '', day: '', count: 0 })
      const today = localDate()
      for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
        const date = this.data.month + '-' + String(d).padStart(2, '0')
        cells.push({ id: date, date, day: d, today: date === today, count: counts[date] || 0 })
      }
      const filterTags: { key: string; label: string }[] = []
      if (this.data.search) filterTags.push({ key: 'search', label: '搜索：' + this.data.search })
      if (this.data.from || this.data.to)
        filterTags.push({ key: 'date', label: f.from + ' 至 ' + f.to })
      if (this.data.workerIndex)
        filterTags.push({ key: 'workerIndex', label: workers[this.data.workerIndex].name })
      if (this.data.projectIndex)
        filterTags.push({ key: 'projectIndex', label: projects[this.data.projectIndex].name })
      if (this.data.jobIndex) filterTags.push({ key: 'jobIndex', label: jobs[this.data.jobIndex] })
      if (this.data.statusIndex)
        filterTags.push({ key: 'statusIndex', label: this.data.statuses[this.data.statusIndex] })
      this.setData({
        cells,
        filterTags,
        filterCount: filterTags.length,
        count: es.length,
        amount: money(es.reduce((n, e) => n + e.amountFen, 0)),
        hasMore: es.length > this.data.limit,
        list: es.slice(0, this.data.limit).map((e, i) => ({
          ...e,
          name: b.workers[e.workerId]?.name,
          project: b.projects[e.projectId]?.name || '未分配工地',
          amount: money(e.amountFen),
          detail: quantity(e.quantity100) + ' ' + MODE_LABEL[e.mode] + ' · ' + money(e.rateFen),
          settled: lock.has(e.id),
          showDate: i === 0 || e.workDate !== es[i - 1].workDate,
        })),
      })
    } catch (e) {
      reportError(e)
    }
  },
  month(e: any) {
    this.setData({ month: e.detail.value, selectedDate: '', from: '', to: '', limit: 50 })
    this.load()
  },
  day(e: any) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({ selectedDate: this.data.selectedDate === date ? '' : date, limit: 50 })
    this.load()
  },
  view(e: any) {
    const view = e.detail.value
    if (view !== 'calendar' && view !== 'list') return
    this.setData({ view, selectedDate: '', limit: 50 })
    this.load()
  },
  advanced(e?: any) {
    const requested = e?.currentTarget?.dataset?.group || 'more'
    const filterGroup = ['workers', 'projects', 'status', 'more'].includes(requested)
      ? requested
      : 'more'
    if (this.data.advanced) {
      if (this.data.filterGroup === filterGroup) {
        this.closeFilters()
        return
      }
      this.setData({ filterGroup, optionSearch: '' })
      this.refreshChoices()
      this.resizeSheet(this.data.keyboardHeight)
      return
    }
    try {
      this._filterBook = repository().read().book
      const draft = { ...activeFilters(this.data), ...monthRange(this.data.month) }
      if (this.data.from) draft.from = this.data.from
      if (this.data.to) draft.to = this.data.to
      this.setData({
        advanced: true,
        filterGroup,
        draft,
        optionSearch: '',
        filterError: '',
        keyboardHeight: 0,
      })
      this.refreshChoices()
      this.measureFilterBar()
      this.resizeSheet(0)
      this.previewFilters()
    } catch (e) {
      reportError(e)
    }
  },
  closeFilters() {
    this.setData({ advanced: false, keyboardHeight: 0 })
    this._filterBook = null
    if (typeof wx.hideKeyboard === 'function') wx.hideKeyboard()
  },
  noop() {},
  measureFilterBar() {
    // Align the dropdown with the live toolbar, including after page scroll.
    try {
      this.createSelectorQuery()
        .select('.records-filter-bar')
        .boundingClientRect((rect: any) => {
          if (!this.data.advanced || !rect || !Number.isFinite(rect.bottom)) return
          this.setData({ filterTop: Math.max(0, Math.round(rect.bottom)) })
          this.resizeSheet(this.data.keyboardHeight)
        })
        .exec()
    } catch {
      /* Logic tests and older runtimes retain a bounded fallback. */
    }
  },
  onResize() {
    if (this.data.advanced) this.measureFilterBar()
  },
  resizeSheet(keyboardHeight: number) {
    let height = 740
    try {
      height = wx.getWindowInfo().windowHeight
    } catch {
      /* fallback */
    }
    const keyboard = Math.max(0, keyboardHeight)
    const available = Math.max(0, height - this.data.filterTop - keyboard)
    const desired =
      this.data.filterGroup === 'status' ? 235 : this.data.filterGroup === 'more' ? 580 : 425
    this.setData({
      keyboardHeight: keyboard,
      sheetHeight: Math.min(desired, Math.max(0, available - 12)),
    })
  },
  optionField(e: any) {
    this.setData({ optionSearch: e.detail.value })
    this.refreshChoices()
  },
  refreshChoices() {
    const items = this.data.filterGroup === 'projects' ? this.data.projects : this.data.workers
    const search = this.data.optionSearch.trim()
    this.setData({
      choices: items
        .map((item, index) => ({ index, name: item.name, code: item.id ? item.id.slice(-6) : '' }))
        .filter(
          (item) =>
            !item.index || !search || item.name.includes(search) || item.code.includes(search),
        ),
    })
  },
  chooseOption(e: any) {
    this.draftPicker({
      currentTarget: { dataset: { field: e.currentTarget.dataset.field } },
      detail: { value: e.currentTarget.dataset.index },
    })
  },
  keyboard(e: any) {
    if (this.data.advanced) this.resizeSheet(Number(e.detail.height) || 0)
  },
  keyboardBlur() {
    if (this.data.advanced) this.resizeSheet(0)
  },
  draftField(e: any) {
    const field = e.currentTarget.dataset.field
    if (!['search', 'from', 'to'].includes(field)) return
    this.setData({ ['draft.' + field]: e.detail.value })
    this.previewFilters()
  },
  clearSearch() {
    this.setData({ 'draft.search': '' })
    this.previewFilters()
  },
  draftPicker(e: any) {
    const field = e.currentTarget.dataset.field
    const index = Number(e.detail.value)
    const lengths: Record<string, number> = {
      workerIndex: this.data.workers.length,
      projectIndex: this.data.projects.length,
      jobIndex: this.data.jobs.length,
    }
    if (!Number.isInteger(index) || index < 0 || index >= (lengths[field] || 0)) return
    this.setData({ ['draft.' + field]: index })
    this.previewFilters()
  },
  draftStatus(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    if (![0, 1, 2].includes(index)) return
    this.setData({ 'draft.statusIndex': index })
    this.previewFilters()
  },
  quickRange(e: any) {
    const name = e.currentTarget.dataset.range
    let range = monthRange(this.data.month)
    if (name === 'previous') {
      const [y, m] = this.data.month.split('-').map(Number)
      range = monthRange(localDate(new Date(y, m - 2, 1)).slice(0, 7))
    } else if (name === 'week') {
      const now = new Date(),
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      range = { from: localDate(start), to: localDate(now) }
    } else if (name !== 'month') return
    this.setData({ 'draft.from': range.from, 'draft.to': range.to })
    this.previewFilters()
  },
  previewFilters() {
    const draft = this.data.draft
    const valid = validDate(draft.from) && validDate(draft.to) && draft.from <= draft.to
    let draftRange = 'custom'
    const month = monthRange(this.data.month)
    const [y, m] = this.data.month.split('-').map(Number)
    const prev = monthRange(localDate(new Date(y, m - 2, 1)).slice(0, 7))
    const now = new Date(),
      from = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
    if (draft.from === month.from && draft.to === month.to) draftRange = 'month'
    else if (draft.from === prev.from && draft.to === prev.to) draftRange = 'previous'
    else if (draft.from === from && draft.to === localDate(now)) draftRange = 'week'
    this.setData({
      draftRange,
      filterError: valid ? '' : '开始日期不能晚于结束日期，请调整日期范围',
      draftCount:
        valid && this._filterBook
          ? filteredEntries(this._filterBook, query(this.data, draft)).length
          : 0,
    })
  },
  resetFilters() {
    this.setData({ draft: { ...emptyFilters(), ...monthRange(this.data.month) } })
    this.previewFilters()
  },
  applyFilters() {
    this.previewFilters()
    if (this.data.filterError) return
    const draft = { ...this.data.draft, search: this.data.draft.search.trim() }
    const crossMonth = draft.from.slice(0, 7) !== draft.to.slice(0, 7)
    const month = draft.from.slice(0, 7)
    const range = monthRange(month)
    this.setData({
      ...draft,
      month,
      from: draft.from === range.from && draft.to === range.to ? '' : draft.from,
      to: draft.from === range.from && draft.to === range.to ? '' : draft.to,
      selectedDate: '',
      limit: 50,
      view: crossMonth ? 'list' : this.data.view,
    })
    this.closeFilters()
    this.load()
  },
  removeFilter(e: any) {
    const key = e.currentTarget.dataset.key
    if (key === 'date') this.setData({ from: '', to: '' })
    else if (key === 'search') this.setData({ search: '' })
    else if (['workerIndex', 'projectIndex', 'jobIndex', 'statusIndex'].includes(key))
      this.setData({ [key]: 0 })
    else return
    this.setData({ selectedDate: '', limit: 50 })
    this.load()
  },
  more() {
    this.setData({ limit: this.data.limit + 50 })
    this.load()
  },
  edit(e: any) {
    navigation.navigateTo({
      url: '/subpackages/workbook/edit/index?id=' + e.currentTarget.dataset.id,
    })
  },
  add() {
    navigation.navigateTo({
      url: '/subpackages/workbook/edit/index?date=' + (this.data.selectedDate || localDate()),
    })
  },
})
