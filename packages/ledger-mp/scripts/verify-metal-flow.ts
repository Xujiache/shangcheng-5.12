import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const kv = new Map<string, any>(),
  files = new Map<string, string>()
let definition: any,
  offline = true,
  clipboard = '',
  lastRoute = '',
  saved: any
let exportCalls = 0,
  imagePreviews = 0
const app = { globalData: { token: '', user: null as any, membership: null as any } }
const drawn: string[] = []
const context = {
  measureText: (text: string) => ({ width: text.length * 16 }),
  fillRect() {},
  scale() {},
  fillText: (text: string) => drawn.push(text),
}
const canvas: any = { getContext: () => context }
const nativeRoute = (options: any) => {
  lastRoute = options.url
  options.success?.({})
}
;(globalThis as any).getApp = () => app
;(globalThis as any).getCurrentPages = () => []
;(globalThis as any).Page = (value: any) => {
  definition = value
}
;(globalThis as any).wx = {
  env: { USER_DATA_PATH: '/test-metal' },
  getStorageSync: (key: string) => kv.get(key) || '',
  setStorageSync: (key: string, value: any) => kv.set(key, structuredClone(value)),
  removeStorageSync: (key: string) => kv.delete(key),
  getStorageInfoSync: () => ({ keys: [...kv.keys()] }),
  showToast() {},
  showModal: (options: any) => {
    options.success?.({ confirm: false })
    options.complete?.()
  },
  navigateTo: nativeRoute,
  reLaunch: nativeRoute,
  navigateBack: nativeRoute,
  setClipboardData: (options: any) => {
    clipboard = options.data
    options.success?.({})
  },
  request(options: any) {
    if (offline) {
      options.fail({ errMsg: 'offline' })
      return
    }
    const path = new URL(options.url).pathname
    let data: any
    if (path.endsWith('/config'))
      data = {
        prices: { 'plate.carbon.hot': 4000 },
        densities: {},
        updatedAt: '2026-09-30T00:00:00Z',
      }
    else if (path.endsWith('/export')) {
      exportCalls++
      data = saved
    } else if (path.endsWith('/quotes')) data = [saved]
    else if (path.endsWith('/quote')) data = saved
    else throw Error('Unexpected route: ' + path)
    options.success({ statusCode: 200, data: { code: 0, data } })
  },
  getFileSystemManager: () => ({
    writeFile: (options: any) => {
      files.set(options.filePath, options.data)
      options.success()
    },
  }),
  createSelectorQuery() {
    const query: any = {
      in: () => query,
      select: () => query,
      fields: () => query,
      exec: (callback: any) => callback([{ node: canvas }]),
    }
    return query
  },
  canvasToTempFilePath: (options: any) =>
    options.success({ tempFilePath: '/test-metal/quote.png' }),
  previewImage: () => {
    imagePreviews++
  },
}
function page(path: string): any {
  const file = require.resolve(path)
  delete require.cache[file]
  require(file)
  const instance: any = { ...definition, data: structuredClone(definition.data) }
  instance.setData = (patch: any, callback?: () => void) => {
    Object.assign(instance.data, patch)
    callback?.()
  }
  return instance
}
const tap = (key: string, value: string) => ({ currentTarget: { dataset: { [key]: value } } })
const input = (key: string, value: string) => ({
  currentTarget: { dataset: { key } },
  detail: { value },
})
const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve)
  })
async function main() {
  const home = page('../miniprogram/subpackages/metal/index/index.ts')
  for (const category of home.data.categories) {
    home.openCategory(tap('id', category.id))
    assert.equal(lastRoute, `/subpackages/metal/calc/index?category=${category.id}`)
  }
  const samples: Record<string, any> = {
    plate: { lengthMm: '1000', widthMm: '2000', thicknessMm: '5', quantity: '1' },
    section: { model: '50*5', thicknessMm: '5', lengthM: '1' },
    squareTube: { outerLengthMm: '80', outerWidthMm: '40', thicknessMm: '2', lengthM: '1' },
    flatBar: { widthMm: '40', thicknessMm: '5', lengthM: '1' },
    roundTube: { diameterMm: '32', thicknessMm: '1.5', lengthM: '1' },
    roundBar: { diameterMm: '20', lengthM: '1' },
  }
  const weights: Record<string, string> = {
    plate: '78.500',
    section: '3.770',
    squareTube: '3.642',
    flatBar: '1.570',
    roundTube: '1.128',
    roundBar: '2.466',
  }
  for (const [category, dimensions] of Object.entries(samples)) {
    const calc = page('../miniprogram/subpackages/metal/calc/index.ts')
    calc.onLoad({ category })
    for (const [key, value] of Object.entries(dimensions))
      calc.onFieldInput(input(key, String(value)))
    await new Promise((resolve) => {
      setTimeout(resolve, 220)
    })
    assert.equal(calc.data.unitWeight, weights[category])
    assert.equal(calc.data.hasResult, true)
    await flush()
    assert.ok(calc.data.priceNote.includes('离线'))
    for (const field of ['unit', 'total', 'price']) {
      calc.copyItem(tap('field', field))
      assert.ok(clipboard)
    }
    calc.copyAll()
    assert.ok(clipboard.includes('\n规格：') && clipboard.includes('——————\n重量与价格仅供参考'))
    calc.onUnload()
  }
  console.log(
    'PASS native metal pages: 6 guest routes, live input, known weights, offline seeds and four copy actions',
  )

  const calc = page('../miniprogram/subpackages/metal/calc/index.ts')
  calc.onLoad({ category: 'plate' })
  for (const [key, value] of Object.entries(samples.plate))
    calc.onFieldInput(input(key, String(value)))
  calc.onTonPrice({ detail: { value: '4000' } })
  calc.onFactor({ detail: { value: '1.2' } })
  calc.onFee({ detail: { value: '20' } })
  calc.recalculate()
  assert.equal(calc.data.totalPrice, '396.80')
  calc.onDensity({ detail: { value: '8' } })
  calc.selectGrade(tap('id', 'plate.ss.304'))
  assert.equal(calc.data.density, '8')
  assert.equal(calc.data.manualTonPrice, '4000')
  assert.equal(calc.data.fields[0].value, '1000')
  calc.clearDensity()
  assert.equal(calc.data.density, '7.93')
  calc.selectGrade(tap('id', 'plate.carbon.hot'))
  calc.clearTonPrice()
  calc.recalculate()
  assert.equal(calc.data.totalPrice, '331.43')
  await flush()
  offline = false
  await calc.loadConfig()
  assert.equal(calc.data.totalPrice, '396.80')
  app.globalData.token = 'member'
  app.globalData.user = { id: 'account-a' }
  app.globalData.membership = { active: true, perpetual: true }
  calc.saveHistoryAction()
  calc.saveFavorite()
  const { readMetalRecords } = require('../miniprogram/subpackages/metal/utils/storage.ts')
  assert.equal(readMetalRecords('history').length, 1)
  assert.equal(readMetalRecords('favorites').length, 1)
  calc.onKeyboardHeight({ detail: { height: 300 } })
  assert.equal(calc.data.keyboardRaised, true)
  calc.onKeyboardHeight({ detail: { height: 0 } })
  assert.equal(calc.data.keyboardRaised, false)
  const history = page('../miniprogram/subpackages/metal/history/index.ts')
  history.onShow()
  assert.equal(history.data.rows[0].spec, '1000×2000×5mm × 1张')
  assert.equal(history.data.rows[0].weight, '78.500')
  assert.equal(history.data.rows[0].amount, '396.80')
  history.reopen(tap('id', history.data.rows[0].id))
  assert.ok(lastRoute.includes('recordId='))
  app.globalData.user = { id: 'account-b' }
  assert.equal(readMetalRecords('history').length, 0)
  app.globalData.user = { id: 'account-a' }
  calc.addToQuote()
  assert.equal(lastRoute, '/subpackages/metal/quote/index')
  calc.onUnload()
  console.log(
    'PASS native material switching, manual price/reset, density/reset, settings, server price and account-scoped records',
  )

  const draft = require('../miniprogram/subpackages/metal/utils/quote.ts').readMetalQuoteDraft()
  saved = {
    id: 'fixture',
    title: '=报价,测试',
    createdAt: '2026-09-30T00:00:00Z',
    items: [{ ...draft[0], weightKg: 78.5, amountFen: 39680, tonPriceFen: 400000 }],
    totalWeightKg: 78.5,
    totalAmountFen: 39680,
  }
  const quote = page('../miniprogram/subpackages/metal/quote/index.ts')
  quote.onShow()
  await flush()
  assert.equal(quote.data.rows[0].tonPrice, '4,000')
  quote.onKeyboardHeight({ detail: { height: 280 } })
  assert.equal(quote.data.keyboardRaised, true)
  quote.onKeyboardHeight({ detail: { height: 0 } })
  assert.equal(quote.data.keyboardRaised, false)
  quote.onTitle({ detail: { value: saved.title } })
  await quote.saveQuote()
  assert.equal(quote.data.view, 'saved')
  assert.equal(quote.data.totalAmount, '396.80')
  assert.equal(quote.data.saved[0].lineCount, 1)
  assert.equal(quote.data.saved[0].weight, '78.500')
  assert.equal(
    require('../miniprogram/subpackages/metal/utils/quote.ts').readMetalQuoteDraft().length,
    0,
  )
  quote.showSavedList()
  assert.equal(quote.data.view, 'history')
  quote.openSaved(tap('id', 'fixture'))
  assert.equal(quote.data.view, 'saved')
  await quote.exportCsv()
  assert.ok(files.get(quote.data.csvPath)?.startsWith('\uFEFF"报价单","\'=报价,测试"'))
  await quote.exportImage()
  assert.equal(imagePreviews, 1)
  assert.ok(drawn.includes(saved.title))
  saved.items = Array.from({ length: 200 }, (_, index) => ({
    ...saved.items[0],
    spec: { ...saved.items[0].spec, quantity: index + 1 },
  }))
  await quote.exportImage()
  assert.equal(canvas.height, 4000)
  assert.ok(canvas.width < 680)
  assert.ok(
    drawn.some((text) => text.startsWith('200. ')),
    '长图不能截断末行',
  )
  const calls = exportCalls
  app.globalData.membership = { active: false }
  await quote.loadQuotes()
  assert.equal(quote.data.saved.length, 1)
  await quote.exportCsv()
  await quote.exportImage()
  assert.equal(exportCalls, calls)
  console.log(
    'PASS native mixed quote save/read, BOM CSV export, protected image export, 200-row complete compression and expired read-only',
  )
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
