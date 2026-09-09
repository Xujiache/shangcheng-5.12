import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const ts = createRequire(import.meta.url)('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, 'entry/src/main/ets/features/order')
function compile(source, context = {}) {
  const exports = {}
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(js, { exports, require: () => ({}), ...context })
  return exports
}
const { OrderDetailPolicy: Policy, OrderDetailRequests: Requests } = compile(
  fs.readFileSync(path.join(base, 'OrderDetailPolicy.ets'), 'utf8'),
)
const example = () => ({
  id: 'o1',
  no: 'TEST-1',
  status: 'pending_shipment',
  payAmount: 123.45,
  totalAmount: 120,
  discountAmount: 0,
  shippingFee: 3.45,
  shippingMethod: 'factory',
  createdAt: '2026-09-09T00:00:00Z',
  address: { name: 'Test', phone: '10000', region: 'Test area', detail: 'Test street' },
  items: [],
})
function page(repository = {}) {
  let source = fs.readFileSync(path.join(base, 'OrderDetailPage.ets'), 'utf8')
  source =
    source.slice(
      source.indexOf('type OrderAction'),
      source.indexOf('  @Builder private addressCard'),
    ) + '\n}'
  source = source
    .replace('@Component\nstruct OrderDetailPage', 'export class OrderDetailPage')
    .replace(/@(?:StorageProp|StorageLink|Watch)\([^)]*\)\s*/g, '')
    .replace(/@State\s*/g, '')
  const session = { user: { id: 'owner' } }
  const copied = []
  const { OrderDetailPage } = compile(source, {
    OrderDetailPolicy: Policy,
    OrderDetailRequests: Requests,
    IdRouteParams: class {
      id = 'o1'
      action = ''
    },
    KeyboardAvoidMode: { OFFSET: 0 },
    SessionStore: { shared: () => session },
    OrderRepository: repository,
    I18n: { text: (locale, zh, en) => (locale === 'en-US' ? en : zh) },
    IBestToast: { show: () => {} },
    pasteboard: {
      MIMETYPE_TEXT_PLAIN: 'text',
      createData: (_, text) => text,
      getSystemPasteboard: () => ({ setData: async (text) => copied.push(text) }),
    },
    AppRouter: { back: () => {} },
  })
  const instance = new OrderDetailPage()
  instance.owner = 'owner'
  instance.order = example()
  return { instance, session, copied }
}

test('known statuses have clear labels and only pending shipment allows shipping', () => {
  for (const status of [
    'pending_payment',
    'pending_shipment',
    'shipped',
    'completed',
    'cancelled',
    'after_sale',
    'refunded',
    'new-state',
  ]) {
    assert.ok(Policy.status(status).en)
    assert.ok(Policy.status(status).hintZh)
    assert.equal(Policy.canShip({ ...example(), status }), status === 'pending_shipment')
  }
})
test('unpaid amounts are not described as paid; missing money is not invented as zero', () => {
  assert.equal(Policy.amountTitle({ ...example(), status: 'pending_payment' }, true), 'Amount due')
  assert.equal(Policy.amountTitle(example(), true), 'Order amount')
  assert.equal(Policy.money(undefined), '—')
  assert.equal(Policy.money(NaN), '—')
  assert.equal(Policy.money(123.45), '¥123.45')
  assert.equal(Policy.timestamp('not-a-date'), '—')
})
test('share validation rejects empty sections, invalid duration and overlong messages', () => {
  assert.equal(Policy.shareError([], '30', ''), 'fields')
  for (const days of ['', '-1', '1.5', '366', 'NaN'])
    assert.equal(Policy.shareError(['basics'], days, ''), 'days')
  for (const days of ['0', '7', '365']) assert.equal(Policy.shareError(['basics'], days, ''), '')
  assert.equal(Policy.shareError(['basics'], '30', 'x'.repeat(41)), 'intro')
})
test('address parsing copies only and never changes authoritative order address', async () => {
  const h = page()
  const original = JSON.stringify(h.instance.order)
  h.instance.parsedAddress = {
    name: 'Parsed',
    phone: '20000',
    region: 'Other area',
    detail: 'Other street',
  }
  h.instance.actionVisible = true
  await h.instance.copyParsedAddress()
  assert.equal(JSON.stringify(h.instance.order), original)
  assert.equal(h.copied[0], 'Parsed 20000 Other area Other street')
  assert.equal(h.instance.actionVisible, false)
})
test('late share prefill cannot reopen a dismissed panel or overwrite changed account state', async () => {
  let resolve
  const h = page({
    currentShare: () =>
      new Promise((r) => {
        resolve = r
      }),
  })
  const task = h.instance.openShare()
  assert.equal(h.instance.shareLoading, true)
  h.instance.closeAction()
  resolve({ shareCode: 'old', config: { visibleFields: ['customer'] } })
  await task
  assert.equal(h.instance.actionVisible, false)
  assert.equal(h.instance.shareCustomer, false)
  assert.equal(h.instance.currentShareCode, '')
  h.session.user.id = 'another'
  assert.equal(h.instance.current(), false)
})
test('shipping is single-flight and refreshes final order state', async () => {
  let resolve
  let ships = 0
  const h = page({
    ship: () => {
      ships++
      return new Promise((r) => {
        resolve = r
      })
    },
    detail: async () => ({ ...example(), status: 'shipped' }),
  })
  h.instance.company = 'Test'
  h.instance.trackingNumber = 'TEST-TRACK'
  const task = h.instance.ship()
  await h.instance.ship()
  assert.equal(ships, 1)
  resolve({ ok: true })
  await task
  assert.equal(h.instance.order.status, 'shipped')
  assert.equal(h.instance.submitting, false)
  assert.equal(h.instance.refreshFailed, false)
})
test('failed refresh preserves displayed order and disables further shipment until refreshed', async () => {
  const h = page({
    detail: async () => {
      throw Error('offline')
    },
  })
  const original = h.instance.order
  await h.instance.load()
  assert.equal(h.instance.order, original)
  assert.equal(h.instance.refreshFailed, true)
})
test('channel invalidation ignores stale responses without invalidating unrelated requests', () => {
  const requests = new Requests()
  const old = requests.next('share')
  const detail = requests.next('detail')
  requests.next('share')
  assert.equal(requests.current('share', old), false)
  assert.equal(requests.current('detail', detail), true)
  requests.close()
  assert.equal(requests.current('detail', detail), false)
})
