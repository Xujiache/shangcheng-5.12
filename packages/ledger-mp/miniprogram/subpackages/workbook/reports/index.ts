import { MotionPage, navigation } from '../../../utils/page-transition'
import {
  COLLECTIONS,
  Filter,
  filteredEntries,
  localDate,
  money,
  rows,
  summary,
  validateBook,
  quantity,
  validDate,
} from '../../../utils/workbook/domain'
import {
  ask,
  backupPreview,
  confirm,
  errorText,
  makeChange,
  mergeBackup,
  repository,
  reportError,
  saveChanges,
  scope,
  syncWorkbook,
} from '../../../utils/workbook/client'
import {
  exportBackup,
  makeCsv,
  readBackup,
  renderReport,
  writeExport,
} from '../../../utils/workbook/export'
import { shareQuoteFile } from '../../../utils/quote-export'
import { http } from '../../../utils/request'
import { inclusiveDays, rangeMonthCells } from '../../../utils/workbook/date-range'
MotionPage({
  data: {
    section: 'stats',
    exportFormat: 'csv',
    exportFormatLabel: 'CSV 表格',
    exportFormats: [
      { value: 'csv', label: 'CSV 表格', description: '适合 Excel 整理与核对', icon: 'orders' },
      { value: 'pdf', label: 'PDF 文档', description: '多页排版，适合打印留存', icon: 'pdf' },
      { value: 'image', label: '报表图片', description: '逐页预览，方便分享', icon: 'photo' },
    ],
    exportTitle: '记工汇总报表',
    exportScope: '全部工人 · 全部工地',
    outputScope: '',
    sectionOptions: [
      { value: 'stats', label: '统计报表' },
      { value: 'export', label: '导出报表' },
      { value: 'data', label: '数据管理' },
    ],
    period: 'month',
    draftPeriod: 'month',
    calendarMonth: localDate().slice(0, 7),
    calendarCells: [] as ReturnType<typeof rangeMonthCells>,
    calendarWeek: ['日', '一', '二', '三', '四', '五', '六'],
    rangePending: false,
    rangeDays: 0,
    periodOptions: [
      { value: 'day', label: '今日' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' },
      { value: 'custom', label: '自定义' },
    ],
    reportTab: 'people',
    reportOptions: [
      { value: 'people', label: '人员工资' },
      { value: 'sites', label: '工地成本' },
      { value: 'trend', label: '工资趋势' },
    ],
    dataOptions: [
      { value: 'history', label: '变更记录' },
      { value: 'trash', label: '回收站' },
      { value: 'templates', label: '模板' },
    ],
    recordCount: 0,
    days: '0',
    hours: '0',
    pieces: '0',
    settled: '¥0.00',
    filterOpen: false,
    filterGroup: 'date',
    filterTop: 260,
    filterLeft: 18,
    filterWidth: 0,
    panelHeight: 400,
    keyboardHeight: 0,
    filterError: '',
    optionSearch: '',
    choices: [] as any[],
    draft: { from: '', to: '', workerIndex: 0, projectIndex: 0 },
    filterTags: [] as { key: string; label: string }[],
    from: localDate().slice(0, 7) + '-01',
    to: localDate(),
    workers: [] as any[],
    projects: [] as any[],
    workerIndex: 0,
    projectIndex: 0,
    earned: '¥0.00',
    paid: '¥0.00',
    due: '¥0.00',
    advance: '¥0.00',
    people: [] as any[],
    sites: [] as any[],
    trend: [] as any[],
    cloudEnabled: false,
    pending: 0,
    identity: '',
    busy: false,
    outputPath: '',
    outputName: '',
    outputOpen: false,
    outputSharing: false,
    outputError: '',
    images: [] as string[],
    error: '',
    cloudError: false,
    dataTab: 'history',
    trash: [] as any[],
    history: [] as any[],
    templates: [] as any[],
  },
  onShow() {
    this.refresh()
  },
  filter(): Filter {
    return {
      from: this.data.from,
      to: this.data.to,
      workerId: this.data.workers[this.data.workerIndex]?.id,
      projectId: this.data.projects[this.data.projectIndex]?.id,
    }
  },
  refresh() {
    try {
      const s = repository().read()
      const b = s.book
      const workers = [{ id: '', name: '全部工人' }, ...rows(b, 'workers')]
      const projects = [{ id: '', name: '全部工地' }, ...rows(b, 'projects')]
      const workerId = this.data.workers[this.data.workerIndex]?.id
      const projectId = this.data.projects[this.data.projectIndex]?.id
      this.setData({
        workers,
        projects,
        workerIndex: Math.max(
          0,
          workers.findIndex((w) => w.id === workerId),
        ),
        projectIndex: Math.max(
          0,
          projects.findIndex((p) => p.id === projectId),
        ),
      })
      const f = this.filter()
      const sum = summary(b, f)
      const people = workers
        .slice(1)
        .filter((w) => !f.workerId || w.id === f.workerId)
        .map((w) => {
          const v = summary(b, { ...f, workerId: w.id })
          return {
            id: w.id,
            name: w.name,
            initial: w.name.slice(0, 1),
            amount: money(v.earned),
            due: money(v.due),
            advance: money(v.advance),
          }
        })
      const es = filteredEntries(b, f)
      const siteTotals: Record<string, number> = {}
      const dates: Record<string, number> = {}
      es.forEach((e) => {
        siteTotals[e.projectId] = (siteTotals[e.projectId] || 0) + e.amountFen
        dates[e.workDate] = (dates[e.workDate] || 0) + e.amountFen
      })
      const max = Math.max(1, ...Object.values(dates))
      const filterTags: { key: string; label: string }[] = []
      if (f.workerId)
        filterTags.push({ key: 'workerIndex', label: workers[this.data.workerIndex].name })
      if (f.projectId)
        filterTags.push({ key: 'projectIndex', label: projects[this.data.projectIndex].name })
      this.setData({
        filterTags,
        exportTitle: f.workerId ? '个人工资单' : f.projectId ? '工地对账单' : '记工汇总报表',
        exportScope:
          workers[this.data.workerIndex].name + ' · ' + projects[this.data.projectIndex].name,
        recordCount: sum.count,
        days: quantity(sum.days),
        hours: quantity(sum.hours),
        pieces: quantity(sum.pieces),
        settled: money(sum.settled),
        earned: money(sum.earned),
        paid: money(sum.paid),
        due: money(sum.due),
        advance: money(sum.advance),
        people,
        sites: Object.keys(siteTotals).map((id) => ({
          id,
          name: b.projects[id]?.name || '未分配工地',
          amount: money(siteTotals[id]),
        })),
        trend: Object.keys(dates)
          .sort()
          .map((date) => ({
            date,
            amount: money(dates[date]),
            width: Math.max(0, Math.round((dates[date] / max) * 100)),
          })),
        cloudEnabled: s.cloudEnabled,
        pending: s.pending.length,
        identity: scope() === 'guest' ? '游客台账 · 当前设备' : '账号台账 · ' + scope().slice(-6),
        trash: [...rows(b, 'entries', true), ...rows(b, 'adjustments', true)].map((r) => ({
          ...r,
          collection: 'mode' in r ? 'entries' : 'adjustments',
          name: b.workers[r.workerId]?.name,
          amount: money(r.amountFen),
        })),
        history: s.history
          .slice()
          .reverse()
          .slice(0, 100)
          .map((o) => ({
            ...o,
            time: o.at.replace('T', ' ').slice(0, 19),
            count: o.changes.length,
          })),
        templates: rows(b, 'templates'),
      })
    } catch (e) {
      reportError(e)
    }
  },
  section(e: any) {
    if (this.data.busy) return
    const section = e.detail.value
    if (!['stats', 'export', 'data'].includes(section)) return
    this.closeFilter()
    this.setData({ section })
  },
  reportTab(e: any) {
    const value = e.detail?.value || e.currentTarget?.dataset?.value
    if (['people', 'sites', 'trend'].includes(value)) this.setData({ reportTab: value })
  },
  range(e: any) {
    if (this.data.busy) return
    const type = e.detail?.value || e.currentTarget?.dataset?.type
    if (type === 'custom') {
      this.openFilter({ currentTarget: { dataset: { group: 'date' } } })
      return
    }
    if (!['day', 'month', 'year'].includes(type)) return
    const d = localDate()
    this.setData({
      period: type,
      from: type === 'day' ? d : type === 'year' ? d.slice(0, 4) + '-01-01' : d.slice(0, 7) + '-01',
      to: d,
    })
    this.closeFilter()
    this.refresh()
  },
  openFilter(e: any) {
    if (this.data.busy) return
    const group = e.currentTarget.dataset.group
    if (!['workers', 'projects', 'date'].includes(group)) return
    if (this.data.filterOpen) {
      if (this.data.filterGroup === group) {
        this.closeFilter()
        return
      }
      this.setData({
        filterGroup: group,
        optionSearch: '',
        ...(group === 'date' ? { draftPeriod: 'custom' } : {}),
      })
      this.refreshCalendar()
      this.refreshChoices()
      this.resizePanel(this.data.keyboardHeight)
      return
    }
    this.setData({
      filterOpen: true,
      filterGroup: group,
      draftPeriod: group === 'date' ? 'custom' : this.data.period,
      rangePending: false,
      calendarMonth: this.data.to.slice(0, 7),
      optionSearch: '',
      filterError: '',
      draft: {
        from: this.data.from,
        to: this.data.to,
        workerIndex: this.data.workerIndex,
        projectIndex: this.data.projectIndex,
      },
    })
    this.refreshCalendar()
    this.refreshChoices()
    this.resizePanel(0)
    this.measureFilter()
  },
  closeFilter() {
    this.setData({ filterOpen: false, keyboardHeight: 0 })
    if (typeof wx.hideKeyboard === 'function') wx.hideKeyboard()
  },
  onHide() {
    this.closeFilter()
  },
  noop() {},
  onResize() {
    if (this.data.filterOpen) this.measureFilter()
  },
  measureFilter() {
    try {
      this.createSelectorQuery()
        .select('.reports-controls')
        .boundingClientRect((r: any) => {
          if (!this.data.filterOpen || !r || !Number.isFinite(r.bottom)) return
          // Use the card's outer bounds so the panel shares its border on every screen width.
          this.setData({
            filterTop: Math.max(0, r.bottom),
            filterLeft: Number.isFinite(r.left) ? Math.max(0, r.left) : 18,
            filterWidth: Number.isFinite(r.width) && r.width > 0 ? r.width : 0,
          })
          this.resizePanel(this.data.keyboardHeight)
        })
        .exec()
    } catch {}
  },
  resizePanel(keyboardHeight: number) {
    let height = 740
    try {
      height = wx.getWindowInfo().windowHeight
    } catch {}
    const keyboard = Math.max(0, keyboardHeight)
    this.setData({
      keyboardHeight: keyboard,
      panelHeight: Math.min(
        this.data.filterGroup === 'date' ? 510 : 425,
        Math.max(0, height - this.data.filterTop - keyboard - 12),
      ),
    })
  },
  keyboard(e: any) {
    if (this.data.filterOpen) this.resizePanel(Number(e.detail.height) || 0)
  },
  keyboardBlur() {
    if (this.data.filterOpen) this.resizePanel(0)
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
        .map((item, index) => ({
          index,
          name: item.name,
          code: item.id ? item.id.slice(-6).toUpperCase() : '',
        }))
        .filter(
          (item) =>
            !item.index ||
            !search ||
            item.name.includes(search) ||
            item.code.includes(search.toUpperCase()),
        ),
    })
  },
  chooseOption(e: any) {
    const field = this.data.filterGroup === 'projects' ? 'projectIndex' : 'workerIndex'
    const items = field === 'projectIndex' ? this.data.projects : this.data.workers
    const index = Number(e.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return
    this.setData({ ['draft.' + field]: index })
  },
  refreshCalendar() {
    const d = this.data.draft
    this.setData({
      calendarCells: rangeMonthCells(this.data.calendarMonth, d.from, d.to, localDate()),
      rangeDays: this.data.rangePending ? 0 : inclusiveDays(d.from, d.to),
    })
  },
  calendarMonthChange(e: any) {
    const month = e.detail.value
    if (!validDate(month + '-01')) return
    this.setData({ calendarMonth: month })
    this.refreshCalendar()
  },
  calendarMove(e: any) {
    const step = Number(e.currentTarget.dataset.step)
    if (step !== -1 && step !== 1) return
    const [y, m] = this.data.calendarMonth.split('-').map(Number)
    const month = localDate(new Date(y, m - 1 + step, 1)).slice(0, 7)
    if (!validDate(month + '-01')) return
    this.setData({ calendarMonth: month })
    this.refreshCalendar()
  },
  calendarDay(e: any) {
    const date = e.currentTarget.dataset.date
    if (!validDate(date)) return
    if (!this.data.rangePending)
      this.setData({
        'draft.from': date,
        'draft.to': date,
        draftPeriod: 'custom',
        rangePending: true,
        filterError: '',
      })
    else {
      const first = this.data.draft.from
      this.setData({
        'draft.from': date < first ? date : first,
        'draft.to': date < first ? first : date,
        draftPeriod: 'custom',
        rangePending: false,
        filterError: '',
      })
    }
    this.refreshCalendar()
  },
  draftDate(e: any) {
    const field = e.currentTarget.dataset.field
    if (!['from', 'to'].includes(field)) return
    const date = e.detail.value
    this.setData({
      ['draft.' + field]: date,
      draftPeriod: 'custom',
      rangePending: false,
      ...(validDate(date) ? { calendarMonth: date.slice(0, 7) } : {}),
    })
    this.validateDates()
    this.refreshCalendar()
  },
  validateDates() {
    const d = this.data.draft
    const valid = validDate(d.from) && validDate(d.to) && d.from <= d.to
    this.setData({ filterError: valid ? '' : '请选择有效日期，开始日期不能晚于结束日期' })
    return valid && !this.data.rangePending
  },
  draftRange(e: any) {
    const type = e.currentTarget.dataset.type,
      now = new Date(),
      today = localDate(now)
    let from = '',
      to = today,
      period = 'custom'
    if (type === 'recent7' || type === 'recent30')
      from = localDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - (type === 'recent7' ? 6 : 29)),
      )
    else if (type === 'previousMonth') {
      from = localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      to = localDate(new Date(now.getFullYear(), now.getMonth(), 0))
    } else if (['day', 'month', 'year'].includes(type)) {
      period = type
      from =
        type === 'day'
          ? today
          : type === 'year'
            ? today.slice(0, 4) + '-01-01'
            : today.slice(0, 7) + '-01'
    } else return
    this.setData({
      'draft.from': from,
      'draft.to': to,
      draftPeriod: period,
      rangePending: false,
      calendarMonth: to.slice(0, 7),
      filterError: '',
    })
    this.refreshCalendar()
  },
  resetFilter() {
    const now = localDate()
    this.setData({
      draft: { from: now.slice(0, 7) + '-01', to: now, workerIndex: 0, projectIndex: 0 },
      draftPeriod: this.data.filterGroup === 'date' ? 'custom' : 'month',
      rangePending: false,
      calendarMonth: now.slice(0, 7),
      optionSearch: '',
      filterError: '',
    })
    this.refreshCalendar()
    this.refreshChoices()
  },
  applyFilter() {
    if (!this.validateDates()) return
    // Custom is an explicit user choice, even when its dates happen to match a preset.
    this.setData({ ...this.data.draft, period: this.data.draftPeriod })
    this.closeFilter()
    this.refresh()
  },
  removeFilter(e: any) {
    if (this.data.busy) return
    const key = e.currentTarget.dataset.key
    if (!['workerIndex', 'projectIndex'].includes(key)) return
    this.setData({ [key]: 0 })
    this.refresh()
  },
  selectExportFormat(e: any) {
    if (this.data.busy) return
    const value = e.currentTarget.dataset.value
    const format = this.data.exportFormats.find((item) => item.value === value)
    if (format) this.setData({ exportFormat: value, exportFormatLabel: format.label })
  },
  async exportSelected() {
    if (this.data.busy || this.data.filterOpen) return
    await this.export({ currentTarget: { dataset: { type: this.data.exportFormat } } })
  },
  async export(e: any) {
    if (this.data.busy) return
    const type = e.currentTarget.dataset.type
    if (!['backup', 'csv', 'pdf', 'image'].includes(type)) return
    const outputScope =
      type === 'backup'
        ? '完整本机台账备份'
        : this.data.exportScope + ' · ' + this.data.from + ' 至 ' + this.data.to
    this.setData({
      busy: true,
      error: '',
      cloudError: false,
      outputPath: '',
      images: [],
      outputScope: '',
      outputOpen: false,
      outputError: '',
    })
    try {
      let path = ''
      if (type === 'backup') path = await exportBackup()
      else if (type === 'csv')
        path = writeExport(
          '记工报表-' + Date.now() + '.csv',
          makeCsv(repository().read().book, this.filter()),
        )
      else {
        const result = await renderReport(this, repository().read().book, this.filter())
        path = result.pdf
        this.setData({ images: result.images })
      }
      this.setData({
        outputPath: path,
        outputName: path.split('/').pop()!,
        outputScope,
        outputOpen: true,
      })
    } catch (e) {
      this.setData({ error: errorText(e) })
      reportError(e)
    } finally {
      this.setData({ busy: false })
    }
  },
  openOutput() {
    if (this.data.outputPath && !this.data.busy) this.setData({ outputOpen: true })
  },
  closeOutput() {
    if (!this.data.outputSharing) this.setData({ outputOpen: false })
  },
  async share() {
    if (this.data.busy || this.data.outputSharing || !this.data.outputPath) return
    this.setData({ outputSharing: true, outputError: '' })
    try {
      await shareQuoteFile(this.data.outputPath, this.data.outputName)
      this.setData({ outputOpen: false })
    } catch (e) {
      const message = errorText(e)
      if (!/cancel/i.test(message)) this.setData({ outputError: message })
    } finally {
      this.setData({ outputSharing: false })
    }
  },
  previewImages() {
    wx.previewImage({ urls: this.data.images })
  },
  async import() {
    if (this.data.busy) return
    this.setData({ busy: true })
    try {
      const raw = await readBackup()
      const info = backupPreview(raw)
      if (
        !(await confirm(
          '备份导入预览',
          info.counts + '\n重复编号 ' + info.duplicates + ' 条。相同记录跳过，不同内容不会覆盖。',
        ))
      )
        return
      await mergeBackup(info.backup)
      this.refresh()
      wx.showToast({ title: '已导入到本机', image: '/assets/workbook-icons/check.png' })
    } catch (e) {
      reportError(e)
    } finally {
      this.setData({ busy: false })
    }
  },
  async enableCloud() {
    try {
      if (scope() === 'guest') {
        if (await confirm('会员云同步', '本机所有功能免费。登录并成为会员后，可主动开启云同步。'))
          navigation.navigateTo({ url: '/pages/login/index' })
        return
      }
      const repo = repository()
      const s = repo.read()
      if (
        !s.cloudEnabled &&
        !(await confirm(
          '开启云同步',
          '人员、工资、结算和凭证将上传至当前账号私有云端；本机仍可离线使用。是否开启？',
        ))
      )
        return
      s.cloudEnabled = !s.cloudEnabled
      repo.write(s)
      this.refresh()
      if (s.cloudEnabled) await this.sync()
    } catch (e) {
      reportError(e)
    }
  },
  async sync() {
    if (this.data.busy) return
    this.setData({ busy: true, error: '', cloudError: true })
    try {
      const r = await syncWorkbook()
      this.refresh()
      wx.showToast({ title: r.pending ? '云端只读，本机继续记工' : '同步完成', icon: 'none' })
    } catch (e) {
      this.setData({ error: errorText(e) })
    } finally {
      this.setData({ busy: false })
    }
  },
  async pull() {
    if (this.data.busy) return
    this.setData({ busy: true, error: '', cloudError: true })
    try {
      await syncWorkbook(true)
      this.refresh()
      wx.showToast({ title: '云端历史已取回', image: '/assets/workbook-icons/check.png' })
    } catch (e) {
      this.setData({ error: errorText(e) })
    } finally {
      this.setData({ busy: false })
    }
  },
  async restoreCloud() {
    if (this.data.busy) return
    try {
      if (
        !(await confirm(
          '恢复云端版本',
          '将先生成当前本机完整备份，并要求分享保存。完成后再次选择此操作，才能替换本机记录。',
        ))
      )
        return
      const path = await exportBackup()
      this.setData({
        outputPath: path,
        outputName: path.split('/').pop()!,
        outputScope: '恢复云端前的本机备份',
        images: [],
        outputError: '',
      })
      await shareQuoteFile(path, path.split('/').pop()!)
      if (
        !(await confirm(
          '本机备份已分享',
          '确认用当前云端快照替换本机台账？未同步修改仅保留在刚才的备份中。',
        ))
      )
        return
      const repo = repository()
      const cloud: any = await http.get('/l/workbook/snapshot')
      if (scope() !== repo.scope) throw new Error('账号已切换')
      validateBook(cloud.book)
      const state = repo.read()
      state.book = cloud.book
      state.cloudBook = cloud.book
      state.cursor = cloud.revision
      state.pending = []
      repo.write(state)
      this.refresh()
    } catch (e) {
      reportError(e)
    }
  },
  dataTab(e: any) {
    const value = e.detail?.value || e.currentTarget?.dataset?.value
    if (['trash', 'history', 'templates'].includes(value)) this.setData({ dataTab: value })
  },
  async restore(e: any) {
    try {
      const b = repository().read().book
      const c = e.currentTarget.dataset.collection as any
      const r = b[c as 'entries'][e.currentTarget.dataset.id]
      saveChanges('恢复回收站记录', [makeChange(c, { ...r, deleted: false }, b)])
      this.refresh()
    } catch (e) {
      reportError(e)
    }
  },
  async deleteTemplate(e: any) {
    try {
      if (!(await confirm('删除模板', '只删除模板，不影响已保存的记工。'))) return
      const b = repository().read().book
      saveChanges('删除记工模板', [
        makeChange('templates', { ...b.templates[e.currentTarget.dataset.id], deleted: true }, b),
      ])
      this.refresh()
    } catch (e) {
      reportError(e)
    }
  },
  historyDetail(e: any) {
    const op = repository()
      .read()
      .history.find((o) => o.id === e.currentTarget.dataset.id)
    if (op)
      wx.showModal({
        title: op.label,
        content: op.changes
          .slice(0, 10)
          .map(
            (c) =>
              c.collection + ' / ' + c.id + '\n版本 ' + c.baseVersion + ' → ' + (c.baseVersion + 1),
          )
          .join('\n'),
        showCancel: false,
      })
  },
})
