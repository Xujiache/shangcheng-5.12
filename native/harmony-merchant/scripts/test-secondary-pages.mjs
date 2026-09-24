import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, 'entry/src/main/ets')
const source = (file) => fs.readFileSync(path.join(base, file), 'utf8')
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function harness() {
  const state = { user: { id: 'merchant-a' }, epoch: 0, dialog: null, backs: 0, timers: new Map(), timerId: 0 }
  class ApiError extends Error { constructor(code, message) { super(message); this.code = code } }
  class Params { constructor(id = '') { this.id = id } }
  const i18n = { text: (language, zh, en) => language === 'en-US' ? en : zh, contract: (s) => s }
  const deps = {
    '../storage/SessionStore': { SessionStore: { shared: () => state } },
    '../network/ApiClient': { ApiError }, '../../core/network/ApiClient': { ApiError },
    '../i18n/I18n': { I18n: i18n }, '../../core/i18n/I18n': { I18n: i18n },
    '@ibestservices/ibest-ui': { IBestToast: { show: () => {} }, IBestDialogUtil: { open: (d) => { state.dialog = d } } },
    '../../core/navigation/AppRouter': { AppRouter: { back: () => { state.backs++ }, push: () => {} } },
    '../../core/navigation/RouteParams': { IdRouteParams: Params, FilterRouteParams: Params },
    '../../core/theme/DesignTokens': { DesignTokens: { brand: () => '#8A6A2D', danger: () => '#a00' } },
  }
  function compile(raw) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(raw, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, {
      exports, require: (id) => deps[id] || {},
      AppStorage: { get: (key) => key === 'sessionEpoch' ? state.epoch : undefined },
      setTimeout: (cb) => { const id = ++state.timerId; state.timers.set(id, cb); return id },
      clearTimeout: (id) => state.timers.delete(id),
    })
    return exports
  }
  const policy = compile(source('core/ui/SecondaryPolicy.ets'))
  const leave = compile(source('core/ui/LeaveGuard.ets'))
  deps['../../core/ui/SecondaryPolicy'] = policy
  deps['../../core/ui/LeaveGuard'] = leave
  function page(file, repository = {}, products = {}) {
    deps['./BusinessRepository'] = { BusinessRepository: repository }
    deps['../business/BusinessRepository'] = { BusinessRepository: repository }
    deps['../product/ProductRepository'] = { ProductRepository: products }
    deps['./OrderRepository'] = { OrderRepository: repository }
    deps['./AfterSalePolicy'] = compile(source('features/order/AfterSalePolicy.ets'))
    const raw = source(file).replace(/\bstruct\b/g, 'class ')
    const ast = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true)
    const klass = ast.statements.find((s) => ts.isClassDeclaration(s))
    assert.ok(klass, file)
    // Exercise actual controller methods, not a second implementation or ArkUI emulation.
    const members = klass.members.filter((m) => {
      if (!ts.isMethodDeclaration(m)) return true
      return m.name.getText(ast) !== 'build' && !ts.getDecorators(m)?.some((d) => d.getText(ast) === '@Builder')
    }).map((m) => m.getText(ast).replace(/@\w+(?:\([^)]*\))?\s*/g, '')).join('\n')
    const imports = ast.statements.filter(ts.isImportDeclaration).map((n) => n.getText(ast)).join('\n')
    const result = compile(`${imports}\nexport class Page { ${members} }`)
    const instance = new result.Page()
    instance.pageScope.open()
    return instance
  }
  return { state, policy, leave, page, ApiError }
}

test('read tickets reject stale conditions, disposed pages and account changes independently', async () => {
  const h = harness(), scope = new h.policy.PageReadScope()
  scope.open()
  const old = scope.begin('list'), metadata = scope.begin('metadata'), pending = deferred()
  const work = scope.read(pending.promise, old)
  scope.begin('list'); pending.resolve([1])
  await assert.rejects(work, /discarded-page-read/)
  assert.equal(scope.accepts(metadata), true)
  h.state.user.id = 'merchant-b'
  assert.equal(scope.isCurrent(), false)
  assert.equal(scope.accepts(scope.begin('write')), false)
  scope.dispose(); scope.open()
  assert.equal(scope.accepts(metadata), false)
})

test('unsaved cancel keeps draft; discard leaves once; busy cannot open or leave', () => {
  const h = harness(), guard = new h.leave.LeaveGuard()
  let leaves = 0
  guard.request('en-US', true, true, () => leaves++)
  assert.equal(h.state.dialog, null)
  guard.request('en-US', false, true, () => leaves++)
  assert.equal(h.state.dialog.confirmButtonText, 'Discard')
  h.state.dialog.onCancel(); assert.equal(leaves, 0)
  guard.request('zh-CN', false, true, () => leaves++)
  h.state.dialog.onConfirm(); assert.equal(leaves, 1)
})

test('debounce cancels superseded searches and page disposal cancels the last timer', () => {
  const h = harness(), search = new h.policy.PageSearch()
  let calls = 0
  search.schedule(() => calls += 1); search.schedule(() => calls += 10)
  assert.equal(h.state.timers.size, 1)
  for (const fn of h.state.timers.values()) fn()
  assert.equal(calls, 10)
  search.schedule(() => calls++); search.cancel()
  assert.equal([...h.state.timers.keys()].filter((id) => id === h.state.timerId).length, 0)
})

const priceRule = () => ({ guestAllow: false, customerPrice: 'retail', agencyPrice: 'wholesale', memberPrice: 'member' })
test('pricing has no autosave, rejects failed-load edits and single-flights explicit saves', async () => {
  const h = harness(), pending = deferred(); let writes = 0
  const page = h.page('features/business/PriceRulePage.ets', {
    priceRule: async () => priceRule(), savePriceRule: () => { writes++; return pending.promise },
  })
  page.dirty = true; await page.flushSave(); assert.equal(writes, 0)
  page.dirty = false; await page.load()
  page.guest = true; page.queueSave('guest')
  assert.equal(writes, 0); assert.equal(h.state.timers.size, 0)
  const saving = page.flushSave(); await page.flushSave(); assert.equal(writes, 1)
  pending.resolve({ ...priceRule(), guestAllow: true }); await saving
  assert.equal(page.saving, false); assert.equal(page.dirty, false)
  page.guest = false; page.queueSave('guest'); page.aboutToDisappear()
  assert.equal(writes, 1)
})

test('uncertain price save reads state without resubmitting or replacing draft', async () => {
  const h = harness(); let writes = 0, reads = 0
  const page = h.page('features/business/PriceRulePage.ets', {
    priceRule: async () => { reads++; return priceRule() },
    savePriceRule: async () => { writes++; throw Error('timeout') },
  })
  await page.load(); page.guest = true; page.queueSave('guest'); await page.flushSave()
  assert.equal(reads, 2); assert.equal(writes, 1)
  assert.equal(page.guest, true); assert.equal(page.dirty, true); assert.equal(page.verifying, false)
})

test('commission nested editor cancel does not mutate rules and changing settings never autosaves', async () => {
  const h = harness(); let writes = 0
  const rule = { productId: 'p', level1Percent: 3, level2Percent: 2, productName: 'P', productImage: '' }
  const page = h.page('features/business/CommissionPage.ets', {
    commissionRules: async () => ({ default: { level1Percent: 1, level2Percent: 2, visibleToPromoter: true, allowOffline: false, enabled: true }, productRules: [rule] }),
    saveCommissionRules: async () => { writes++ },
  }, { list: async () => ({ list: [] }) })
  await page.load(); page.openRule(rule); page.ruleFirst = '8'; page.closeLocalEditor()
  h.state.dialog.onConfirm()
  assert.equal(page.productRules[0].level1Percent, 3)
  page.first = '4'; page.scheduleSave(); assert.equal(writes, 0)
  await page.save(); assert.equal(writes, 1); assert.equal(page.dirty, false)
})

test('business authorization dates allow future dates but reject impossible dates', () => {
  const { SecondaryPolicy: p } = harness().policy
  for (const date of ['2028-02-29', '2027-12-31']) assert.equal(p.validBusinessDate(date), true)
  for (const date of ['2027-02-29', '2026-13-01', '2026-04-31', '2026-9-01', '']) assert.equal(p.validBusinessDate(date), false)
})

test('store authorization cannot save after failed initial load and clones checkbox policies', async () => {
  const h = harness(); let writes = 0
  const page = h.page('features/business/StoreAuthPage.ets', {
    storeAuth: async () => { throw Error('offline') }, saveStoreAuth: async () => { writes++ },
  })
  await page.load(); await page.save(); assert.equal(writes, 0)
  const original = { categoryId: 'c', categoryName: 'C', enabled: false, markupPercent: 15 }
  page.policies = [original]; page.togglePolicy('c', true)
  assert.equal(original.enabled, false); assert.equal(page.policies[0].enabled, true)
})

test('failed append preserves list and rolls back pagination; same-filter failed refresh preserves page', async () => {
  const h = harness()
  const page = h.page('features/business/CustomerPage.ets', { customers: async () => { throw Error('offline') } })
  page.visibleFilter = ':'; page.customers = [{ id: 'kept' }]; page.page = 3
  await page.load(true)
  assert.equal(page.page, 2); assert.equal(page.customers[0].id, 'kept')
  await page.reload(); assert.equal(page.page, 2); assert.equal(page.customers.length, 1)
})

test('store design updates its baseline only after save and preserves draft across read failures', async () => {
  const h = harness(); let fail = false, writes = 0
  const config = { merchantId: 'merchant-a', themeColor: '#111111', fontStyle: 'modern', banners: [], productLayout: 'twoColumn' }
  const page = h.page('features/business/DecoratePage.ets', {
    decorate: async () => { if (fail) throw Error('offline'); return config },
    saveDecorate: async () => { writes++ },
  }, { list: async () => ({ list: [] }) })
  await page.load(); page.themeColor = '#222222'
  const before = page.loadedStamp
  fail = true; await page.load()
  assert.equal(page.themeColor, '#222222'); assert.equal(page.loadedStamp, before)
  await page.save()
  assert.equal(writes, 1); assert.equal(page.loadedStamp, page.formStamp())
})

test('refund timeout switches to read-only verification and never automatically repeats the mutation', async () => {
  const h = harness(); let writes = 0, reads = 0
  const page = h.page('features/order/AfterSalePage.ets', {
    agreeRefund: async () => { writes++; throw Error('timeout') },
    refundDetail: async () => { reads++; return { id: 'r', applyAmount: 10, status: 'pending' } },
  })
  page.selected = { id: 'r', applyAmount: 10, status: 'pending' }; page.action = 'agree'; page.refundAmount = '10'
  await page.submit(); assert.equal(page.receiptPending, true); assert.equal(writes, 1)
  await page.submit(); assert.equal(reads, 1); assert.equal(writes, 1); assert.equal(page.receiptPending, false)
})

test('errors expose no raw path or server stack', () => {
  const h = harness()
  const message = h.policy.SecondaryPolicy.message(new h.ApiError(500, 'Cannot GET /private\nstack secret'), 'en-US')
  assert.equal(/private|stack|secret|Cannot GET/.test(message), false)
})
