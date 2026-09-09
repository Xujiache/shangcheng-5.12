import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const ts = createRequire(import.meta.url)('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, 'entry/src/main/ets/features/stats')
const read = (name) => fs.readFileSync(path.join(base, `${name}.ets`), 'utf8')
function compile(source, context = {}, dependencies = {}) {
  const exports = {}
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(js, { exports, require: (n) => dependencies[n] || {}, ...context })
  return exports
}
const models = compile(read('StatsModels'))
const { StatsSelection: Selection } = models
const { StatsPolicy: Policy, StatsRequests: Requests } = compile(
  read('StatsPolicy'),
  {},
  { './StatsModels': models },
)
function controller(name, anchor, extra = {}) {
  let source = read(name)
  const start = source.indexOf('@Component')
  source = source.slice(start, source.indexOf(anchor, start)) + '\n}'
  source = source
    .replace(/@Component\s+(?:export )?struct/, 'export class')
    .replace(/@(?:Prop|StorageProp|StorageLink|Watch)\([^)]*\)\s*/g, '')
    .replace(/@(?:Prop|Require|State)\s*/g, '')
  return compile(source, {
    StatsPolicy: Policy,
    StatsRequests: Requests,
    StatsSelection: Selection,
    Scroller: class {},
    ...extra,
  })[name]
}
function fixture(selection = new Selection()) {
  const range = Policy.resolve(selection)
  return {
    version: 1,
    period: range.period,
    startDate: range.startDate,
    endDate: range.endDate,
    timeZone: 'Asia/Shanghai',
    asOf: new Date().toISOString(),
    granularity: 'day',
    paidAmount: 12.34,
    paidOrderCount: 1,
    avgOrderValue: 12.34,
    refundAmount: 0,
    totalQuantity: 2,
    trend: [
      { bucketStart: new Date(`${range.startDate}T00:00:00+08:00`).toISOString(), amount: 12.34 },
    ],
    topProducts: [{ productId: 'p', name: 'Product', quantity: 2 }],
    categories: [{ categoryId: '', name: 'Uncategorized', quantity: 2 }],
  }
}
function page(repository) {
  const session = { user: { id: 'owner' } }
  class ApiError extends Error {
    constructor(code) {
      super('network')
      this.code = code
    }
  }
  const Page = controller('StatsPage', '  @Builder private dateFilter', {
    SessionStore: { shared: () => session },
    StatsRepository: repository,
    ApiError,
    I18n: { text: (lang, zh, en) => (lang === 'en-US' ? en : zh) },
  })
  const instance = new Page()
  instance.owner = 'owner'
  return { instance, session, ApiError }
}

test('natural ranges and date boundaries use Beijing time, including leap days', () => {
  const now = Date.parse('2026-09-06T16:00:00Z')
  assert.equal(Policy.resolve(new Selection('week'), now).startDate, '2026-09-07')
  assert.equal(Policy.resolve(new Selection('month'), now).startDate, '2026-09-01')
  assert.equal(Policy.rangeError('2024-01-01', '2024-12-31', '2026-09-09'), '')
  assert.equal(Policy.rangeError('2024-01-01', '2025-01-01', '2026-09-09'), 'limit')
  assert.equal(Policy.validDate('2019-12-31'), true)
  assert.equal(Policy.validDate('2026-02-30'), false)
  assert.equal(Policy.validDate('2024-02-29'), true)
  assert.equal(Policy.rangeError('2026-09-10', '2026-09-10', '2026-09-09'), 'range')
  const cells = Policy.calendar('2026-09', '2026-09-09')
  assert.equal(cells.length, 42)
  assert.equal(cells[0].date, '2026-08-31')
})
test('date calendar keeps a draft, supports single day, and never truncates an excessive range', () => {
  const Panel = controller('StatsDatePanel', '  @Builder private calendar')
  const p = new Panel()
  let applied
  p.selection = new Selection('custom', '2024-01-01', '2024-01-31')
  p.onApply = (s) => (applied = s)
  p.aboutToAppear()
  p.choose('2024-02-29')
  assert.equal(p.start, p.end)
  assert.equal(p.selection.startDate, '2024-01-01')
  p.apply()
  assert.equal(applied.period, 'custom')
  assert.equal(applied.endDate, '2024-02-29')
  p.pickingEnd = false
  p.choose('2024-01-01')
  p.choose('2025-01-01')
  assert.equal(p.error, 'limit')
  assert.equal(p.end, '2024-01-01')
  p.apply()
  assert.equal(applied.endDate, '2024-02-29') // Invalid attempted range must not silently confirm the previous single day.
})
test('missing required fields fail closed while actual empty arrays render safely', () => {
  const f = fixture()
  assert.equal(Policy.verify(f).paidAmount, 12.34)
  for (const value of [undefined, NaN, Infinity, '12.34'])
    assert.throws(() => Policy.verify({ ...f, paidAmount: value }))
  assert.throws(() => Policy.verify({ ...f, trend: undefined }))
  const zero = {
    ...f,
    paidAmount: 0,
    paidOrderCount: 0,
    avgOrderValue: 0,
    totalQuantity: 0,
    trend: [],
    topProducts: [],
    categories: [],
  }
  for (const key of ['trend', 'topProducts', 'categories'])
    assert.throws(() => Policy.verify({ ...zero, [key]: undefined }))
  const empty = Policy.verify(zero)
  assert.equal(empty.trend.length, 0)
  assert.equal(empty.topProducts.length, 0)
  assert.equal(Policy.percent(1, 4), '25.0%')
  assert.equal(Policy.bucketLabel('2026-09-08T16:00:00Z', 'hour', true), '2026-09-09 00:00')
})
test('duplicate activations coalesce; stale date responses cannot replace the latest selection', async () => {
  const jobs = []
  const h = page({ overview: (s) => new Promise((resolve) => jobs.push({ s, resolve })) })
  const first = h.instance.load()
  await h.instance.load()
  assert.equal(jobs.length, 1)
  h.instance.selectPeriod('month')
  assert.equal(jobs.length, 2)
  assert.equal(h.instance.data, null)
  jobs[1].resolve(fixture(jobs[1].s))
  await new Promise((r) => setTimeout(r, 0))
  jobs[0].resolve(fixture(jobs[0].s))
  await first
  assert.equal(h.instance.data.period, 'month')
})
test('same-range failure retains data; new-range failure does not label stale figures as current', async () => {
  let fail = false
  const h = page({
    overview: async (s) => {
      if (fail) throw Error('offline')
      return fixture(s)
    },
  })
  await h.instance.load()
  const original = h.instance.data
  fail = true
  await h.instance.load()
  assert.equal(h.instance.data, original)
  h.instance.selectPeriod('year')
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(h.instance.data, null)
  assert.equal(h.instance.errorKind, 'network')
})
test('cancel keeps filters; confirmed custom range highlights independently; account change discards old results', async () => {
  let resolve
  const h = page({ overview: () => new Promise((r) => (resolve = r)) })
  const old = Policy.key(h.instance.selection)
  h.instance.openCalendar()
  h.instance.calendarSelection.startDate = '2024-01-01'
  h.instance.closeSheet()
  assert.equal(Policy.key(h.instance.selection), old)
  h.instance.selectRange(new Selection('custom', '2024-01-01', '2024-01-02'))
  assert.equal(h.instance.selection.period, 'custom')
  h.session.user.id = 'new-owner'
  resolve(fixture(new Selection('custom', '2024-01-01', '2024-01-02')))
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(h.instance.data, null)
})
test('missing endpoint reports unavailability and never falls back to legacy stats', async () => {
  let calledLegacy = false
  const repo = {
    get: () => {
      calledLegacy = true
    },
  }
  const h = page(repo)
  repo.overview = async () => {
    throw new h.ApiError(404)
  }
  await h.instance.load()
  assert.equal(h.instance.errorKind, 'unavailable')
  assert.equal(calledLegacy, false)
})
test('new shared and ArkTS response fields stay aligned; both route insets and live locale are preserved', () => {
  const shared = fs.readFileSync(
    path.resolve(root, '../../packages/shared/src/types/stats.ts'),
    'utf8',
  )
  function keys(source) {
    const file = ts.createSourceFile('contract.ts', source, ts.ScriptTarget.Latest, true)
    return file.statements
      .find((n) => ts.isInterfaceDeclaration(n) && n.name.text === 'MerchantAnalytics')
      .members.map((n) => n.name.getText(file))
      .sort()
  }
  assert.deepEqual(keys(shared), keys(read('StatsModels')))
  assert.match(read('StatsPage'), /this.showBack \|\| this.windowWidth >= 720/)
  assert.match(read('StatsPage'), /PrimaryNavigationMetrics.contentInset\(this.safeBottom\)/)
  for (const name of ['StatsPage', 'StatsCards', 'StatsTrendChart', 'StatsDatePanel'])
    assert.match(read(name), /@StorageLink\('language'\)/)
  assert.doesNotMatch(read('StatsCards'), /quantity\.toFixed|¥\$\{.*quantity/)
})
