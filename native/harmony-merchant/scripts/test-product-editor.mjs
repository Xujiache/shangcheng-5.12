import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, 'entry/src/main/ets/features/product')
function load(name, dependencies = {}) {
  const exports = {}
  const source = fs.readFileSync(path.join(base, `${name}.ets`), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(js, { exports, require: (name) => dependencies[name] || {} })
  return exports
}
const media = load('ProductImageQueue')
const { ProductImageQueue: Queue, ProductImageItem: Item } = media
const { ProductEditPolicy: Policy, ProductEditSession: Session } = load('ProductEditPolicy', {
  './ProductImageQueue': media,
})
const { ProductSkuMatrix: Matrix } = load('ProductSkuMatrix')
const sku = () => ({
  id: 'sku-1',
  specs: { Colour: 'Blue' },
  specValues: ['Blue'],
  specsLabel: 'Blue',
  priceRetail: 13,
  priceWholesale: 10,
  priceMember: 11,
  stock: 7,
  image: 'https://test.invalid/blue.png',
  active: true,
})
const body = () => ({
  name: 'Test',
  categoryId: 'category',
  images: ['https://test.invalid/cover.png'],
  detailImages: [],
  shipping: ['factory'],
  skus: [sku()],
  pricingMode: 'standard',
  status: 'draft',
})

test('SKU regeneration preserves matching IDs, images, amounts and stock', () => {
  const result = Matrix.regenerate(
    [{ name: 'Colour', values: ['Blue', 'Red'] }],
    [sku()],
    'Default',
  )
  assert.equal(result[0].id, 'sku-1')
  assert.equal(result[0].stock, 7)
  assert.equal(result[0].priceWholesale, 10)
  assert.equal(result[0].image, sku().image)
  assert.equal(result[1].stock, 0)
  assert.equal(result[1].id, undefined)
})
test('cancelled option drafts cannot modify nested parent values', () => {
  const source = [sku()]
  const groups = [{ name: 'Colour', values: ['Blue'] }]
  const draft = Policy.cloneSkus(source)
  const draftGroups = Policy.cloneGroups(groups)
  draft[0].priceRetail = 99
  draft[0].specs.Colour = 'Red'
  draft[0].specValues.push('New')
  draftGroups[0].values.push('Red')
  assert.equal(source[0].priceRetail, 13)
  assert.equal(source[0].specs.Colour, 'Blue')
  assert.equal(source[0].specValues.length, 1)
  assert.equal(groups[0].values.length, 1)
})
test('partial upload keeps successes and retries only the chosen failed item', async () => {
  const queue = new Queue()
  let result = queue.append([], ['one', 'two', 'three'], 10)
  const calls = []
  await queue.upload(
    result,
    async (uri) => {
      calls.push(uri)
      if (uri === 'two') throw Error('offline')
      return `https://test.invalid/${uri}`
    },
    (next) => {
      result = next
    },
    () => true,
  )
  assert.equal(result.map((x) => x.state).join(','), 'ready,failed,ready')
  assert.equal(calls.length, 3)
  result[1] = new Item(result[1].id, result[1].preview)
  await queue.upload(
    result,
    async (uri) => {
      calls.push(uri)
      return `https://test.invalid/${uri}`
    },
    (next) => {
      result = next
    },
    () => true,
  )
  assert.equal(calls.join(','), 'one,two,three,two')
  assert.equal(Queue.pending(result), false)
})
test('abandoned image request does not publish after leaving or changing account', async () => {
  const queue = new Queue()
  let resolve
  let publications = 0
  let current = true
  const running = queue.upload(
    queue.append([], ['one'], 10),
    () =>
      new Promise((r) => {
        resolve = r
      }),
    () => {
      publications++
    },
    () => current,
  )
  assert.equal(publications, 1)
  current = false
  queue.cancel()
  resolve('https://test.invalid/one')
  await running
  assert.equal(publications, 1)
})
test('media limits and failed upload validation apply to draft as well as review', () => {
  const queue = new Queue()
  const many = Array.from({ length: 30 }, (_, i) => `image-${i}`)
  assert.equal(queue.append([], many, 10).length, 10)
  assert.equal(queue.append([], many, 20).length, 20)
  const errors = Policy.validate(body(), [new Item('bad', 'local', '', 'failed')], [])
  assert.equal(errors[0].field, 'images')
})
test('invalid dimensions, fractional stock, empty name and missing delivery are blocked', () => {
  const input = body()
  input.name = ''
  input.shipping = []
  input.skus[0].stock = 1.5
  input.pricingMode = 'by-size'
  input.pricePerSqm = 10
  input.minLength = 50
  input.maxLength = 30
  input.minWidth = 10
  input.maxWidth = 20
  input.baseFee = 0
  const fields = Policy.validate(input, Queue.remote(input.images), [])
    .map((x) => x.field)
    .join(',')
  assert.equal(fields, 'name,skus,size,shipping')
  input.name = 'Valid'
  input.shipping = ['factory']
  input.skus[0].stock = 1
  input.maxLength = 100
  assert.equal(Policy.validate(input, Queue.remote(input.images), []).length, 0)
})
test('save single-flight, dirty baseline and stale page epoch', () => {
  const state = new Session()
  const epoch = state.begin()
  state.accept('original')
  assert.equal(state.dirty('original'), false)
  assert.equal(state.dirty('edited'), true)
  assert.equal(state.beginSave(), true)
  assert.equal(state.beginSave(), false)
  state.finishSave()
  assert.equal(state.beginSave(), true)
  state.invalidate()
  assert.equal(state.current(epoch), false)
})
test('setting menu leaves subscribe to locale and are not passed translated snapshots', () => {
  const profile = path.join(root, 'entry/src/main/ets/features/profile')
  const menu = fs.readFileSync(path.join(profile, 'LocalizedMenu.ets'), 'utf8')
  assert.equal((menu.match(/@StorageLink\('language'\)/g) || []).length, 3)
  for (const name of ['SettingsPage', 'MePage']) {
    const source = fs.readFileSync(path.join(profile, `${name}.ets`), 'utf8')
    assert.doesNotMatch(
      source,
      /this\.(settingRow|primaryService|businessTool|supportRow)\([^\n]*I18n\.text/,
    )
  }
})

function editor() {
  let source = fs.readFileSync(path.join(base, 'ProductEditPage.ets'), 'utf8')
  source =
    source.slice(
      source.indexOf('@Component\nstruct ProductEditPage'),
      source.indexOf('  @Builder private fieldErrors'),
    ) + '\n}'
  source = source
    .replace('@Component\nstruct ProductEditPage', 'export class ProductEditPage')
    .replace(/@(?:StorageProp|StorageLink|Watch)\([^)]*\)\s*/g, '')
    .replace(/@State\s*/g, '')
  const exports = {}
  const session = { user: { id: 'test-owner' } }
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      IdRouteParams: class {},
      KeyboardAvoidMode: { OFFSET: 0 },
      Scroller: class {},
      ProductEditSession: Session,
      ProductEditPolicy: Policy,
      ProductImageQueue: Queue,
      ProductSkuMatrix: Matrix,
      SessionStore: { shared: () => session },
      IBestToast: { show: () => {} },
      I18n: { text: (lang, zh, en) => (lang === 'en-US' ? en : zh) },
    },
  )
  const instance = new exports.ProductEditPage()
  instance.owner = 'test-owner'
  instance.epoch = instance.session.begin()
  instance.skus = [sku()]
  instance.specGroups = [{ name: 'Colour', values: ['Blue'] }]
  return instance
}

test('one-SKU price edits open directly; Cancel discards and Apply updates only that draft', () => {
  const p = editor()
  p.openPricing()
  assert.equal(p.skuEditorVisible, true)
  assert.equal(p.optionsVisible, false)
  p.skuRetail = '99'
  p.closeInner()
  assert.equal(p.skus[0].priceRetail, 13)
  p.openPricing()
  p.skuRetail = '21'
  p.skuStock = '9'
  p.saveSku()
  assert.equal(p.skus[0].priceRetail, 21)
  assert.equal(p.skus[0].stock, 9)
  assert.equal(p.skus[0].id, 'sku-1')
  assert.equal(p.skus[0].image, sku().image)
  assert.equal(p.skuEditorVisible, false)
  assert.equal(p.optionsVisible, false)
  assert.equal(p.specGroups[0].values[0], 'Blue')
})

test('multi-SKU editing retains parent confirmation; blank numeric fields cannot silently become zero', () => {
  const p = editor()
  p.skus.push({ ...sku(), id: 'sku-2' })
  p.openPricing()
  assert.equal(p.optionsVisible, true)
  assert.equal(p.skuEditorVisible, false)
  p.openSku(0)
  p.skuStock = ''
  p.saveSku()
  assert.equal(p.skuEditorVisible, true)
  assert.equal(p.skus[0].stock, 7)
  p.skuStock = '10'
  p.saveSku()
  assert.equal(p.skus[0].stock, 7)
  assert.equal(p.editorSkus[0].stock, 10)
  p.acceptOptions()
  assert.equal(p.skus[0].stock, 10)
  assert.equal(p.skus[1].stock, 7)
})

test('size-based summary does not mislabel SKU retail as the calculated size price', () => {
  const p = editor()
  p.pricingMode = 'by-size'
  assert.doesNotMatch(p.priceSummary(), /¥/)
  p.skus[0].active = false
  assert.match(p.priceSummary(), /0$/)
})
