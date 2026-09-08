import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const kv = new Map<string, any>(),
  files = new Map<string, any>()
let offline = true
let requests = 0
let lastPage: any
const messages: string[] = []
const app: any = {
  globalData: { token: '', user: null, membership: null, online: true },
  clearAuth() {
    this.globalData.token = ''
    this.globalData.user = null
  },
  setToken(t: string) {
    this.globalData.token = t
  },
}
const fsMock = {
  readFileSync(p: string, encoding?: string) {
    if (!files.has(p)) throw Error('ENOENT')
    const v = files.get(p)
    if (encoding === 'base64') return Buffer.from(v).toString('base64')
    return v
  },
  writeFileSync(p: string, v: any) {
    files.set(p, v)
  },
  accessSync(p: string) {
    if (p.endsWith('workbook-data')) return
    if (!files.has(p)) throw Error('ENOENT')
  },
  mkdirSync() {},
  unlinkSync(p: string) {
    files.delete(p)
  },
  copyFileSync(a: string, b: string) {
    files.set(b, this.readFileSync(a))
  },
  readdirSync(p: string) {
    return [...files.keys()].filter((k) => k.startsWith(p + '/')).map((k) => k.slice(p.length + 1))
  },
}
;(globalThis as any).getApp = () => app
;(globalThis as any).getCurrentPages = () => []
;(globalThis as any).wx = {
  env: { USER_DATA_PATH: '/test-user' },
  getStorageSync: (k: string) => kv.get(k) || '',
  setStorageSync: (k: string, v: any) => kv.set(k, JSON.parse(JSON.stringify(v))),
  removeStorageSync: (k: string) => kv.delete(k),
  getStorageInfoSync: () => ({ keys: [...kv.keys()] }),
  getFileSystemManager: () => fsMock,
  base64ToArrayBuffer: (s: string) => {
    const b = Buffer.from(s, 'base64')
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  },
  showModal: (o: any) => {
    messages.push(o.content || '')
    o.success?.({ confirm: true, content: '测试原因' })
    o.complete?.()
  },
  showToast() {},
  navigateBack() {},
  navigateTo() {},
  reLaunch() {},
  redirectTo() {},
  request(o: any) {
    requests++
    if (offline) o.fail({ errMsg: 'request:fail offline' })
    else cloudRequest(o)
  },
  uploadFile() {
    throw Error('No test attachments')
  },
  getNetworkType(o: any) {
    o.success({ networkType: 'none' })
  },
}
;(globalThis as any).Page = (def: any) => {
  const page: any = {
    data: JSON.parse(JSON.stringify(def.data)),
    setData(values: any) {
      for (const [key, value] of Object.entries(values)) {
        const parts = key.split('.')
        let target = this.data
        while (parts.length > 1) {
          const part = parts.shift()!
          target = target[part] || (target[part] = {})
        }
        target[parts[0]] = value
      }
    },
  }
  for (const [k, v] of Object.entries(def))
    if (typeof v === 'function') page[k] = (v as Function).bind(page)
  lastPage = page
}
const domain = require('../miniprogram/utils/workbook/domain.ts')
const client = require('../miniprogram/utils/workbook/client.ts')
const exportApi = require('../miniprogram/utils/workbook/export.ts')
function page(name: string) {
  const path =
    name === 'overview'
      ? '../miniprogram/pages/work-log/index.ts'
      : '../miniprogram/subpackages/workbook/' + name + '/index.ts'
  delete require.cache[require.resolve(path)]
  require(path)
  return lastPage
}
const event = (field: string, value: any) => ({
  currentTarget: { dataset: { field } },
  detail: { value },
})
let cloud = domain.emptyBook()
let revision = 0
let dropReply = true
let canWrite = true
const receipts: any[] = []
function cloudRequest(o: any) {
  try {
    const path = new URL(o.url).pathname
    let data: any
    if (path.endsWith('/access')) data = { canRead: true, canWrite }
    else if (path.endsWith('/snapshot'))
      data = { book: cloud, revision, applied: receipts.map((x) => x.operation.id) }
    else if (path.endsWith('/changes')) {
      const c = Number(o.data?.cursor || 0)
      const changes = receipts.filter((r) => r.revision > c)
      data = { changes, cursor: changes.at(-1)?.revision || c, hasMore: false }
    } else if (path.endsWith('/sync')) {
      if (!canWrite) {
        o.success({ statusCode: 200, data: { code: 6001, message: '会员到期' } })
        return
      }
      const op = o.data.operation
      const old = receipts.find((r) => r.operation.id === op.id)
      if (!old) {
        cloud = domain.applyOperation(cloud, JSON.parse(JSON.stringify(op)))
        revision++
        receipts.push({ revision, operation: op })
      }
      data = { revision: old?.revision || revision }
      if (dropReply) {
        dropReply = false
        o.fail({ errMsg: 'connection lost after commit' })
        return
      }
    } else throw Error('unexpected URL ' + path)
    o.success({
      statusCode: 200,
      data: { code: 0, data: JSON.parse(JSON.stringify(data)), message: 'ok' },
    })
  } catch (e) {
    o.success({ statusCode: 400, data: { code: 1001, message: (e as Error).message } })
  }
}
async function main() {
  // Calendar regression: leading blanks are inert, date selection toggles, both views work.
  let calendar = page('records')
  calendar.month({ detail: { value: '2026-09' } })
  assert.equal(calendar.data.cells.filter((c: any) => !c.date).length, 2)
  assert.equal(calendar.data.cells.filter((c: any) => c.date).length, 30)
  calendar.day({ currentTarget: { dataset: { date: '' } } })
  assert.equal(calendar.data.selectedDate, '')
  calendar.day({ currentTarget: { dataset: { date: '2026-09-09' } } })
  assert.equal(calendar.data.selectedDate, '2026-09-09')
  calendar.day({ currentTarget: { dataset: { date: '2026-09-09' } } })
  assert.equal(calendar.data.selectedDate, '')
  calendar.view({ detail: { value: 'list' } })
  assert.equal(calendar.data.view, 'list')
  calendar.view({ detail: { value: 'calendar' } })
  assert.equal(calendar.data.view, 'calendar')
  calendar.month({ detail: { value: '2026-02' } })
  assert.equal(calendar.data.cells.length, 28)
  calendar.month({ detail: { value: '2028-02' } })
  assert.equal(calendar.data.cells.filter((c: any) => c.date).length, 29)
  console.log('PASS calendar blanks, selection, segmented views, month switching and leap February')

  const editor = page('people')
  editor.onShow()
  editor.add()
  assert.equal(editor.data.form.rate, '')
  for (const [index, mode] of ['day', 'hour', 'piece', 'fixed'].entries()) {
    editor.mode({ currentTarget: { dataset: { index } } })
    assert.equal(editor.data.modeIndex, index)
    assert.equal(editor.data.form.mode, mode)
    assert(editor.data.modeUnits[index])
  }
  editor.mode({ currentTarget: { dataset: { index: 99 } } })
  assert.equal(editor.data.form.mode, 'fixed')
  editor.mode({ detail: { value: 1 } })
  assert.equal(editor.data.form.mode, 'hour')
  await editor.save()
  assert.equal(editor.data.formError, '请填写工人姓名')
  assert.equal(editor.data.saving, false)
  assert.equal(editor.data.editing, true)
  editor.field(event('name', '测试'))
  editor.field(event('rate', '-1'))
  await editor.save()
  assert.equal(editor.data.formError, '默认单价不能小于 0')
  assert.equal(editor.data.saving, false)
  editor.setData({ saving: true })
  editor.cancel()
  editor.mode({ currentTarget: { dataset: { index: 0 } } })
  editor.field(event('name', '不应修改'))
  assert.equal(editor.data.editing, true)
  assert.equal(editor.data.form.mode, 'hour')
  assert.equal(editor.data.form.name, '测试')
  editor.setData({ saving: false })
  editor.field(event('status', 'archived'))
  assert.equal(editor.data.form.status, 'active')
  editor.cancel()
  editor.add()
  assert.equal(editor.data.formError, '')
  assert.equal(editor.data.modeIndex, 0)
  assert.equal(editor.data.form.rate, '')
  editor.cancel()
  editor.tab({ detail: { value: 'projects' } })
  editor.add()
  await editor.save()
  assert.equal(editor.data.formError, '请填写工地名称')
  editor.cancel()
  console.log(
    'PASS profile editor pay-mode buttons/units, invalid selection, inline validation, busy guards, field allowlist and clean form reset',
  )
  let p = page('people')
  p.onShow()
  p.add()
  p.field(event('name', '测试安装师傅'))
  p.field(event('rate', '300.25'))
  await p.save()
  assert.equal(p.data.list.length, 1)
  const worker = p.data.list[0]
  assert.equal(p.data.totalCount, 1)
  assert.equal(worker.initial, '测')
  assert.equal(worker.unitLabel, '天')
  p.search({ detail: { value: '没有匹配的工人' } })
  assert.equal(p.data.list.length, 0)
  assert.equal(p.data.totalCount, 1, 'filtered empty differs from first-use empty')
  p.resetSearch()
  assert.equal(p.data.list.length, 1)
  assert.equal(p.data.archived, true)
  await p.archive({ currentTarget: { dataset: { id: worker.id } } })
  p.toggleArchived()
  assert.equal(p.data.list.length, 0)
  assert.equal(p.data.totalCount, 1)
  p.resetSearch()
  assert.equal(p.data.list[0].status, 'archived')
  await p.archive({ currentTarget: { dataset: { id: worker.id } } })
  assert.equal(p.data.list[0].status, 'active')
  p.tab({ detail: { value: 'projects' } })
  assert.equal(p.data.tab, 'projects')
  assert.equal(p.data.totalCount, 0)
  assert.equal(p.data.search, '')
  assert.equal(p.data.archived, false)
  p.tab({ detail: { value: 'workers' } })
  assert.equal(p.data.list.length, 1)
  console.log(
    'PASS archive-page segmented views, first-use/filtered empty, search reset, archive/recover and card display fields',
  )
  p = page('edit')
  p.onLoad({})
  p.chooseWorkers({ detail: { value: [worker.id] } })
  p.field(event('quantity', '0.5'))
  assert.equal(p.data.amount, '¥150.13')
  await p.save()
  assert.equal(p.data.saving, false)
  // Filters are transactional UI drafts: no list changes until Apply, cancel is lossless.
  calendar = page('records')
  calendar.onShow()
  assert.equal(calendar.data.count, 1)
  calendar.advanced()
  assert.equal(calendar.data.advanced, true)
  assert.equal(calendar.data.draftCount, 1)
  calendar.draftField(event('search', '不存在的姓名'))
  assert.equal(calendar.data.draftCount, 0)
  assert.equal(calendar.data.count, 1)
  assert.equal(calendar.data.search, '')
  calendar.closeFilters()
  calendar.advanced()
  assert.equal(calendar.data.draft.search, '')
  calendar.draftPicker(event('workerIndex', 1))
  calendar.draftField(event('search', '测试安装'))
  calendar.applyFilters()
  assert.equal(calendar.data.advanced, false)
  assert.equal(calendar.data.count, 1)
  assert.equal(calendar.data.filterCount, 2)
  calendar.advanced()
  calendar.resetFilters()
  assert.equal(calendar.data.draft.workerIndex, 0)
  assert.equal(calendar.data.workerIndex, 1)
  calendar.closeFilters()
  assert.equal(calendar.data.filterCount, 2)
  calendar.removeFilter({ currentTarget: { dataset: { key: 'workerIndex' } } })
  assert.equal(calendar.data.workerIndex, 0)
  assert.equal(calendar.data.filterCount, 1)
  calendar.advanced()
  calendar.resetFilters()
  calendar.applyFilters()
  assert.equal(calendar.data.filterCount, 0)
  calendar.advanced()
  calendar.draftField(event('from', '2026-09-30'))
  calendar.draftField(event('to', '2026-09-01'))
  calendar.applyFilters()
  assert.equal(calendar.data.advanced, true)
  assert(calendar.data.filterError)
  assert.equal(calendar.data.count, 1)
  calendar.draftField(event('from', '2026-08-01'))
  calendar.draftField(event('to', '2026-09-30'))
  calendar.applyFilters()
  assert.equal(calendar.data.view, 'list')
  assert.equal(calendar.data.from, '2026-08-01')
  assert.equal(calendar.data.count, 1)
  calendar.advanced()
  calendar.draftStatus({ currentTarget: { dataset: { index: 2 } } })
  assert.equal(calendar.data.draftCount, 0)
  calendar.closeFilters()
  assert.equal(calendar.data.statusIndex, 0)
  calendar.advanced()
  calendar.quickRange({ currentTarget: { dataset: { range: 'previous' } } })
  assert.equal(calendar.data.draft.from, '2026-07-01')
  assert.equal(calendar.data.draft.to, '2026-07-31')
  const originalWindowInfo = (globalThis as any).wx.getWindowInfo
  ;(globalThis as any).wx.getWindowInfo = () => ({ windowHeight: 667, statusBarHeight: 20 })
  calendar.keyboard({ detail: { height: 280 } })
  assert.equal(calendar.data.keyboardHeight, 280)
  assert(calendar.data.sheetHeight <= 291)
  calendar.keyboardBlur()
  assert.equal(calendar.data.keyboardHeight, 0)
  ;(globalThis as any).wx.getWindowInfo = originalWindowInfo
  calendar.closeFilters()
  calendar.createSelectorQuery = () => ({
    select: () => ({ boundingClientRect: (fn: any) => ({ exec: () => fn({ bottom: 248 }) }) }),
  })
  calendar.advanced({ currentTarget: { dataset: { group: 'workers' } } })
  assert.equal(calendar.data.filterGroup, 'workers')
  assert.equal(calendar.data.filterTop, 248)
  calendar.chooseOption({ currentTarget: { dataset: { field: 'workerIndex', index: 1 } } })
  assert.equal(calendar.data.draft.workerIndex, 1)
  calendar.optionField({ detail: { value: '不存在' } })
  assert.equal(calendar.data.choices.length, 1)
  calendar.advanced({ currentTarget: { dataset: { group: 'status' } } })
  assert.equal(calendar.data.advanced, true)
  assert.equal(calendar.data.draft.workerIndex, 1)
  assert.equal(calendar.data.filterGroup, 'status')
  calendar.advanced({ currentTarget: { dataset: { group: 'status' } } })
  assert.equal(calendar.data.advanced, false, 'same dropdown toggles closed')
  calendar.advanced({ currentTarget: { dataset: { group: 'workers' } } })
  assert.equal(calendar.data.draft.workerIndex, 0, 'cancelled dropdown draft must not apply')
  calendar.closeFilters()
  console.log(
    'PASS top dropdown anchor, grouped selection, option search, draft-preserving tab switch, toggle and cancel',
  )
  console.log(
    'PASS filter draft/cancel/apply/reset, per-condition removal, preview count, invalid dates, cross-month list, status and keyboard layout',
  )
  p = page('overview')
  p.refresh()
  assert.equal(p.data.earned, '¥150.13')
  assert.equal(p.data.workerCount, 1)
  await p.onShow()
  assert.equal(p.data.recordCount, 1)
  assert.equal(p.data.recent[0].initial, '测')
  assert.equal(p.data.cloudNotice, '')
  assert.equal(p.data.cloudBusy, false)
  assert.equal(requests, 0)
  const currentMonth = p.data.month
  p.monthChange({ detail: { value: '2028-02' } })
  assert.equal(p.data.earned, '¥0.00')
  p.monthChange({ detail: { value: 'invalid' } })
  assert.equal(p.data.month, '2028-02')
  p.monthChange({ detail: { value: currentMonth } })
  assert.equal(p.data.earned, '¥150.13')
  const nativeNavigate = (globalThis as any).wx.navigateTo
  const destinations: string[] = []
  ;(globalThis as any).wx.navigateTo = (o: any) => destinations.push(o.url)
  for (const route of ['people', 'finance', 'reports', 'records'])
    p.go({ currentTarget: { dataset: { page: route } } })
  p.go({ currentTarget: { dataset: { page: 'bad' } } })
  assert.equal(destinations.length, 4)
  p.firstEntry()
  assert(destinations.at(-1)?.endsWith('/edit/index'))
  p.setData({ workerCount: 0 })
  p.firstEntry()
  assert(destinations.at(-1)?.endsWith('/people/index'))
  ;(globalThis as any).wx.navigateTo = nativeNavigate
  console.log(
    'PASS overview guest offline refresh, month validation, display fields and management/first-entry navigation',
  )

  p = page('finance')
  p.onShow()
  for (const option of p.data.tabs) {
    assert.equal(option.value, option.id)
    assert.equal(option.label, option.name)
    p.tab({ detail: { value: option.value } })
    assert.equal(p.data.tab, option.id)
    assert.equal(p.data.formType, '')
  }
  p.tab({ detail: { value: 'settlements' } })
  p.tab({ detail: { value: 'invalid' } })
  assert.equal(p.data.tab, 'settlements')
  console.log('PASS finance shared segmented control: all four tabs and invalid-value guard')
  p.start({ currentTarget: { dataset: { type: 'advances' } } })
  p.picker(event('workerIndex', 1))
  p.field(event('amount', '50'))
  await p.save()
  assert.equal(p.data.list[0].remaining, '¥50.00')
  p.start({ currentTarget: { dataset: { type: 'settlements' } } })
  p.candidates()
  p.selectAll()
  assert.equal(p.data.preview, '¥150.13')
  assert.equal(p.data.offset, '¥50.00')
  assert.equal(p.data.due, '¥100.13')
  await p.save()
  const settlement = p.data.list[0]
  p.pay({ currentTarget: { dataset: { id: settlement.id } } })
  p.field(event('amount', '40'))
  await p.save()
  assert.equal(domain.settlementRemaining(client.repository().read().book, settlement.id), 6013)
  p = page('reports')
  p.onShow()
  assert.equal(p.data.earned, '¥150.13')
  assert.equal(p.data.paid, '¥40.00')
  const csv = exportApi.makeCsv(client.repository().read().book, p.filter())
  assert(csv.includes('150.13'))
  assert(csv.includes('发薪记录'))
  assert(exportApi.csvCell('=HYPERLINK("bad")').startsWith('"\''))
  assert.equal(p.data.days, '0.5')
  assert.equal(p.data.hours, '0')
  assert.equal(p.data.pieces, '0')
  assert.equal(p.data.settled, '¥150.13')
  assert.equal(p.data.recordCount, 1)
  p.createSelectorQuery = () => ({
    select: (selector: string) => {
      assert.equal(selector, '.reports-controls')
      return {
        boundingClientRect: (fn: any) => ({
          exec: () => fn({ bottom: 310, left: 18, width: 354 }),
        }),
      }
    },
  })
  p.openFilter({ currentTarget: { dataset: { group: 'workers' } } })
  assert.equal(p.data.filterTop, 310)
  assert.equal(p.data.filterLeft, 18)
  assert.equal(p.data.filterWidth, 354)
  p.chooseOption({ currentTarget: { dataset: { index: 1 } } })
  assert.equal(p.data.workerIndex, 0)
  assert.equal(p.data.draft.workerIndex, 1)
  p.openFilter({ currentTarget: { dataset: { group: 'date' } } })
  assert.equal(p.data.draft.workerIndex, 1)
  p.draftDate(event('from', '2026-09-30'))
  p.draftDate(event('to', '2026-09-01'))
  p.applyFilter()
  assert.equal(p.data.filterOpen, true)
  assert(p.data.filterError)
  assert.equal(p.data.earned, '¥150.13')
  p.closeFilter()
  p.openFilter({ currentTarget: { dataset: { group: 'workers' } } })
  assert.equal(p.data.draft.workerIndex, 0)
  p.optionField({ detail: { value: '测试' } })
  assert.equal(p.data.choices.length, 2)
  p.chooseOption({ currentTarget: { dataset: { index: 1 } } })
  p.applyFilter()
  assert.equal(p.data.filterTags.length, 1)
  assert.equal(p.filter().workerId, worker.id)
  p.removeFilter({ currentTarget: { dataset: { key: 'workerIndex' } } })
  assert.equal(p.data.filterTags.length, 0)
  for (const value of ['day', 'month', 'year']) {
    p.range({ detail: { value } })
    assert.equal(p.data.period, value)
    assert.equal(p.data.to, domain.localDate())
    assert.equal(p.data.earned, '¥150.13')
  }
  p.range({ detail: { value: 'custom' } })
  assert.equal(p.data.filterOpen, true)
  p.closeFilter()
  p.range({ detail: { value: 'month' } })

  // Explicit custom selection is a draft until confirmation, not inferred from preset dates.
  const dateRange = require('../miniprogram/utils/workbook/date-range.ts')
  p.range({ detail: { value: 'year' } })
  const yearFrom = p.data.from
  p.range({ detail: { value: 'custom' } })
  assert.equal(p.data.draftPeriod, 'custom')
  assert.equal(p.data.period, 'year')
  assert.equal(p.data.draft.from, yearFrom)
  p.closeFilter()
  assert.equal(p.data.period, 'year')
  p.range({ detail: { value: 'custom' } })
  p.applyFilter()
  assert.equal(p.data.period, 'custom')
  assert.equal(p.data.from, yearFrom)
  p.range({ detail: { value: 'custom' } })
  const tapDate = (date: string) => p.calendarDay({ currentTarget: { dataset: { date } } })
  tapDate('2028-02-29')
  assert.equal(p.data.rangePending, true)
  p.applyFilter()
  assert.equal(p.data.filterOpen, true)
  assert.equal(p.data.from, yearFrom)
  tapDate('2028-03-02')
  assert.equal(p.data.rangeDays, 3)
  assert.equal(p.data.rangePending, false)
  p.applyFilter()
  assert.equal(p.data.from, '2028-02-29')
  assert.equal(p.data.to, '2028-03-02')
  p.range({ detail: { value: 'custom' } })
  tapDate('2028-03-02')
  tapDate('2028-02-28')
  assert.equal(p.data.rangeDays, 4)
  assert.equal(p.data.draft.from, '2028-02-28')
  tapDate('2028-02-29')
  tapDate('2028-02-29')
  assert.equal(p.data.rangeDays, 1)
  const draftSnapshot = JSON.stringify(p.data.draft)
  tapDate('')
  tapDate('2026-02-29')
  assert.equal(JSON.stringify(p.data.draft), draftSnapshot)
  p.calendarMonthChange({ detail: { value: '2028-02' } })
  assert.equal(p.data.calendarCells.filter((c: any) => c.date).length, 29)
  p.calendarMove({ currentTarget: { dataset: { step: 1 } } })
  assert.equal(p.data.calendarMonth, '2028-03')
  p.calendarMove({ currentTarget: { dataset: { step: -1 } } })
  assert.equal(p.data.calendarMonth, '2028-02')
  p.calendarMonthChange({ detail: { value: '1900-01' } })
  p.calendarMove({ currentTarget: { dataset: { step: -1 } } })
  assert.equal(p.data.calendarMonth, '1900-01')
  p.calendarMonthChange({ detail: { value: '2199-12' } })
  p.calendarMove({ currentTarget: { dataset: { step: 1 } } })
  assert.equal(p.data.calendarMonth, '2199-12')
  for (const [type, days] of [
    ['recent7', 7],
    ['recent30', 30],
  ]) {
    p.draftRange({ currentTarget: { dataset: { type } } })
    assert.equal(p.data.rangeDays, days)
    assert.equal(p.data.draftPeriod, 'custom')
  }
  p.draftRange({ currentTarget: { dataset: { type: 'previousMonth' } } })
  assert(p.data.rangeDays >= 28 && p.data.rangeDays <= 31)
  assert(p.data.draft.from.endsWith('-01'))
  p.resetFilter()
  assert.equal(p.data.rangePending, false)
  assert.equal(p.data.filterError, '')
  assert.equal(p.data.draftPeriod, 'custom')
  assert.equal(dateRange.inclusiveDays('2026-03-07', '2026-03-10'), 4)
  assert.equal(dateRange.inclusiveDays('2028-02-28', '2028-03-01'), 3)
  assert.equal(dateRange.inclusiveDays('2026-02-29', '2026-03-01'), 0)
  assert.equal(dateRange.inclusiveDays('2026-03-10', '2026-03-07'), 0)
  const cells = dateRange.rangeMonthCells('2026-09', '2026-09-08', '2026-09-10', '2026-09-09')
  assert.equal(cells.filter((c: any) => !c.date).length, 2)
  assert(cells.filter((c: any) => !c.date).every((c: any) => !c.between && !c.start && !c.end))
  assert.equal(cells.filter((c: any) => c.between).length, 3)
  assert.equal(dateRange.rangeMonthCells('invalid', '', '', '').length, 0)
  p.closeFilter()
  p.range({ detail: { value: 'month' } })
  console.log(
    'PASS custom highlight draft/cancel/confirm, inclusive range calendar, reversed/same-day selection, pending guard, leap day, month boundaries and shortcuts',
  )
  for (const value of ['people', 'sites', 'trend']) {
    p.reportTab({ detail: { value } })
    assert.equal(p.data.reportTab, value)
  }
  p.section({ detail: { value: 'export' } })
  await p.export({ currentTarget: { dataset: { type: 'csv' } } })
  assert(p.data.outputPath.endsWith('.csv'))
  assert(files.get(p.data.outputPath).includes('150.13'))
  assert.equal(p.data.busy, false)
  assert.equal(p.data.cloudError, false)
  p.section({ detail: { value: 'data' } })
  for (const value of ['history', 'trash', 'templates']) {
    p.dataTab({ detail: { value } })
    assert.equal(p.data.dataTab, value)
  }
  p.setData({ busy: true })
  p.section({ detail: { value: 'stats' } })
  assert.equal(p.data.section, 'data')
  p.setData({ busy: false })
  p.section({ detail: { value: 'stats' } })
  for (const value of ['people', 'sites', 'trend']) {
    p.reportTab({ currentTarget: { dataset: { value } } })
    assert.equal(p.data.reportTab, value)
  }
  p.reportTab({ currentTarget: { dataset: { value: 'invalid' } } })
  assert.equal(p.data.reportTab, 'trend')
  for (const value of ['history', 'trash', 'templates']) {
    p.dataTab({ currentTarget: { dataset: { value } } })
    assert.equal(p.data.dataTab, value)
  }
  p.range({ currentTarget: { dataset: { type: 'day' } } })
  assert.equal(p.data.period, 'day')
  p.range({ currentTarget: { dataset: { type: 'month' } } })
  assert.equal(p.data.period, 'month')

  p.section({ detail: { value: 'export' } })
  assert.equal(p.data.exportTitle, '记工汇总报表')
  assert.equal(p.data.exportFormat, 'csv')
  const nativeExport = p.export
  const routed: string[] = []
  p.export = async (e: any) => {
    routed.push(e.currentTarget.dataset.type)
  }
  for (const value of ['csv', 'pdf', 'image']) {
    p.selectExportFormat({ currentTarget: { dataset: { value } } })
    assert.equal(p.data.exportFormat, value)
    await p.exportSelected()
  }
  assert.deepEqual(routed, ['csv', 'pdf', 'image'])
  p.selectExportFormat({ currentTarget: { dataset: { value: 'invalid' } } })
  assert.equal(p.data.exportFormat, 'image')
  p.setData({ busy: true })
  p.selectExportFormat({ currentTarget: { dataset: { value: 'csv' } } })
  await p.exportSelected()
  assert.equal(p.data.exportFormat, 'image')
  assert.equal(routed.length, 3)
  p.setData({ busy: false })
  p.openFilter({ currentTarget: { dataset: { group: 'workers' } } })
  await p.exportSelected()
  assert.equal(routed.length, 3)
  p.chooseOption({ currentTarget: { dataset: { index: 1 } } })
  p.applyFilter()
  assert.equal(p.data.exportTitle, '个人工资单')
  assert(p.data.exportScope.includes(worker.name))
  p.export = nativeExport
  p.selectExportFormat({ currentTarget: { dataset: { value: 'csv' } } })
  await p.exportSelected()
  assert(p.data.outputPath.endsWith('.csv'))
  assert(files.get(p.data.outputPath).includes(worker.name))
  assert(p.data.outputScope.includes(worker.name))
  assert(p.data.outputScope.includes(p.data.from))
  const snapshot = p.data.outputScope
  p.removeFilter({ currentTarget: { dataset: { key: 'workerIndex' } } })
  assert.equal(p.data.exportTitle, '记工汇总报表')
  assert.equal(
    p.data.outputScope,
    snapshot,
    'generated file retains its actual scope after filter changes',
  )
  const exportedPath = p.data.outputPath
  await p.export({ currentTarget: { dataset: { type: 'invalid' } } })
  assert.equal(p.data.outputPath, exportedPath)
  const empty = page('reports')
  empty.onShow()
  empty.setData({ from: '1900-01-01', to: '1900-01-02' })
  empty.refresh()
  assert.equal(empty.data.recordCount, 0)
  await empty.exportSelected()
  assert(empty.data.outputPath.endsWith('.csv'))
  p.section({ detail: { value: 'stats' } })

  assert.equal(empty.data.outputOpen, true)
  const output = empty.data.outputPath
  empty.closeOutput()
  assert.equal(empty.data.outputOpen, false)
  assert.equal(empty.data.outputPath, output)
  empty.openOutput()
  assert.equal(empty.data.outputOpen, true)
  const wxMock = (globalThis as any).wx
  const originalShare = wxMock.shareFileMessage
  let shareCalls = 0
  let pendingShare: any
  wxMock.shareFileMessage = (options: any) => {
    shareCalls++
    pendingShare = options
  }
  const sharing = empty.share()
  assert.equal(empty.data.outputSharing, true)
  await empty.share()
  assert.equal(shareCalls, 1)
  empty.closeOutput()
  assert.equal(empty.data.outputOpen, true)
  assert.equal(pendingShare.filePath, output)
  pendingShare.success()
  await sharing
  assert.equal(empty.data.outputOpen, false)
  assert.equal(empty.data.outputSharing, false)
  empty.openOutput()
  wxMock.shareFileMessage = (options: any) =>
    options.fail({ errMsg: 'shareFileMessage:fail cancel' })
  await empty.share()
  assert.equal(empty.data.outputOpen, true)
  assert.equal(empty.data.outputError, '')
  assert.equal(empty.data.outputSharing, false)
  wxMock.shareFileMessage = (options: any) => options.fail(new Error('test sharing unavailable'))
  await empty.share()
  assert(empty.data.outputError.includes('test sharing unavailable'))
  assert.equal(empty.data.outputOpen, true)
  assert.equal(empty.data.outputSharing, false)
  wxMock.shareFileMessage = (options: any) => options.success()
  await empty.share()
  assert.equal(empty.data.outputError, '')
  assert.equal(empty.data.outputOpen, false)
  wxMock.shareFileMessage = originalShare
  await empty.export({ currentTarget: { dataset: { type: 'backup' } } })
  assert.equal(empty.data.outputOpen, true)
  assert.equal(empty.data.outputScope, '完整本机台账备份')
  assert.equal(empty.data.images.length, 0)
  console.log(
    'PASS automatic export dialog, close/reopen, shared file identity, duplicate-click guard, cancellation and failure/retry',
  )
  console.log(
    'PASS export format selection/dispatch, busy and draft guards, personal preview, CSV generation, empty report and immutable output scope',
  )
  console.log(
    'PASS report lightweight date controls and integrated card tabs via native tap events',
  )
  console.log(
    'PASS reports sections, shared top filters, draft/cancel/apply, invalid dates, date presets, unit/amount summaries and actual CSV export handler',
  )
  const path = await exportApi.exportBackup()
  const raw = JSON.parse(files.get(path))
  assert.equal(raw.format, 'LWB1')
  assert.equal(Object.keys(raw.state.book.settlements).length, 1)
  client.backupPreview(raw)
  assert.equal(requests, 0, 'guest local flow must not call backend')
  app.globalData.token = 'test-token'
  app.globalData.user = { id: 'test_account_A' }
  assert.equal(Object.keys(client.repository().read().book.entries).length, 0)
  await client.mergeBackup(raw, 'test-import')
  assert.equal(domain.summary(client.repository().read().book).due, 6013)
  assert(client.repository().read().history.length > 0)
  const repo = client.repository()
  const state = repo.read()
  state.cloudEnabled = true
  repo.write(state)
  offline = false
  await assert.rejects(() => client.syncWorkbook())
  assert.equal(revision, 1)
  assert.equal(repo.read().pending.length, 1)
  await client.syncWorkbook()
  assert.equal(revision, 1, 'receipt retry must not duplicate settlement/payment')
  assert.equal(repo.read().pending.length, 0)
  canWrite = false
  const b = repo.read().book
  client.saveChanges('到期本机补差', [
    client.makeChange(
      'adjustments',
      {
        workerId: worker.id,
        projectId: '',
        workDate: domain.localDate(),
        amountFen: 100,
        note: '补差',
      },
      b,
    ),
  ])
  await client.syncWorkbook()
  assert.equal(repo.read().pending.length, 1)
  assert.equal(domain.summary(repo.read().book).earned, 15113)
  canWrite = true
  await client.syncWorkbook()
  assert.equal(repo.read().pending.length, 0)
  assert.equal(revision, 2)

  const wxOverview = (globalThis as any).wx
  const originalRequest = wxOverview.request,
    originalModal = wxOverview.showModal
  wxOverview.showModal = (o: any) => o.success?.({ confirm: false })
  wxOverview.request = (o: any) =>
    o.success({
      statusCode: 404,
      data: { code: 1001, message: 'Cannot GET /api/v1/l/workbook/access' },
    })
  const overview = page('overview')
  await overview.onShow()
  assert.equal(overview.data.earned, '¥151.13')
  assert.equal(overview.data.error, '')
  assert(overview.data.cloudNotice.includes('本机记工不受影响'))
  assert(overview.data.cloudDetail.includes('Cannot GET'))
  assert.equal(overview.data.cloudBusy, false)
  let delayed: any
  wxOverview.request = (o: any) => {
    delayed = o
  }
  const late = overview.onShow()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  assert(delayed)
  overview.onHide()
  delayed.success({ statusCode: 404, data: { code: 1001, message: 'Cannot GET old request' } })
  await late
  assert.equal(overview.data.cloudNotice, '', 'hidden-page response must not overwrite current UI')
  wxOverview.request = originalRequest
  wxOverview.showModal = originalModal
  console.log(
    'PASS unavailable cloud route is separate from local totals and stale-page response is ignored',
  )
  app.globalData.token = ''
  app.globalData.user = null
  assert.equal(
    domain.summary(client.repository().read().book).earned,
    15013,
    'logout must return to isolated original guest book',
  )
  console.log(
    'PASS native-page guest offline entry → advance → settlement → payment → CSV → backup → import → lost-ACK retry → expiry → renewal → logout isolation',
  )
  console.log(
    JSON.stringify({
      requestsDuringGuestFlow: 0,
      cloudRevision: revision,
      guestEarnedFen: 15013,
      accountEarnedFen: 15113,
      accountDueFen: 6013,
      backedUpCollections: Object.keys(raw.state.book).length,
    }),
  )
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
