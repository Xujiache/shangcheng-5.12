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
function compile(relative, overrides = {}) {
  const exports = {}
  const source = fs.readFileSync(path.join(root, 'entry/src/main/ets', relative), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(js, {
    exports,
    require: (name) => overrides[name] || {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    ...overrides,
  })
  return exports
}
function appearance({ pauseRead = false } = {}) {
  const values = new Map()
  const disk = new Map([
    ['themeMode', 'light'],
    ['language', 'zh-CN'],
  ])
  let release
  let first = true
  let failing = false
  const languageCalls = []
  const prefs = {
    get: async (key, fallback) => disk.get(key) ?? fallback,
    put: async (key, value) => {
      if (failing) throw Error('storage full')
      disk.set(key, value)
    },
    flush: async () => {},
  }
  const context = {
    config: { colorMode: 0 },
    getApplicationContext: () => ({
      setLanguage: (x) => languageCalls.push(x),
      setColorMode: () => {},
    }),
  }
  const storage = {
    has: (k) => values.has(k),
    get: (k) => values.get(k),
    set: (k, v) => values.set(k, v),
    setOrCreate: (k, v) => values.set(k, v),
  }
  const { AppearanceService: service } = compile('core/theme/AppearanceService.ets', {
    AppStorage: storage,
    '@kit.AbilityKit': {
      ConfigurationConstant: {
        ColorMode: { COLOR_MODE_DARK: 1, COLOR_MODE_LIGHT: 0, COLOR_MODE_NOT_SET: -1 },
      },
    },
    '@kit.ArkData': {
      preferences: {
        getPreferences: async () => {
          if (first && pauseRead) {
            first = false
            await new Promise((resolve) => {
              release = resolve
            })
          }
          return prefs
        },
      },
    },
    './ComponentThemeBridge': { ComponentThemeBridge: { apply: () => {} } },
  })
  return {
    service,
    values,
    disk,
    context,
    languageCalls,
    release: () => release(),
    fail: (value) => {
      failing = value
    },
  }
}
test('rapid theme/language selections persist only the latest pair', async () => {
  const h = appearance()
  await h.service.initialize(h.context)
  for (let i = 0; i < 30; i++) {
    h.service.setTheme(i % 2 ? 'dark' : 'light')
    h.service.setLanguage(i % 2 ? 'en-US' : 'zh-CN')
  }
  await h.service.persistChain
  assert.equal(h.disk.get('themeMode'), 'dark')
  assert.equal(h.disk.get('language'), 'en-US')
  assert.equal(h.values.get('appearanceSaveState'), 'saved')
})
test('late bootstrap cannot undo an already selected theme or language', async () => {
  const h = appearance({ pauseRead: true })
  const ready = h.service.initialize(h.context)
  h.service.setTheme('dark')
  h.service.setLanguage('en-US')
  h.release()
  await ready
  await h.service.persistChain
  assert.equal(h.values.get('themeMode'), 'dark')
  assert.equal(h.values.get('language'), 'en-US')
  assert.equal(h.languageCalls.length, 0)
})
test('storage failure keeps live selection and exposes a successful retry', async () => {
  const h = appearance()
  await h.service.initialize(h.context)
  h.fail(true)
  h.service.setTheme('dark')
  await h.service.persistChain
  assert.equal(h.values.get('themeMode'), 'dark')
  assert.equal(h.values.get('appearanceSaveState'), 'failed')
  h.fail(false)
  h.service.retryPersistence()
  await h.service.persistChain
  assert.equal(h.disk.get('themeMode'), 'dark')
  assert.equal(h.values.get('appearanceSaveState'), 'saved')
})
test('explicit mode configuration echoes do not become the system preference', async () => {
  const h = appearance()
  await h.service.initialize(h.context)
  h.service.setTheme('dark')
  h.service.syncSystemColorMode(true)
  h.service.setTheme('system')
  assert.equal(h.values.get('darkMode'), false)
  h.service.syncSystemColorMode(true)
  assert.equal(h.values.get('darkMode'), true)
})
test('runtime language does not reconfigure native resources or change theme', async () => {
  const h = appearance()
  await h.service.initialize(h.context)
  h.service.setTheme('dark')
  h.service.setLanguage('en-US')
  await h.service.persistChain
  assert.equal(h.languageCalls.length, 1)
  assert.equal(h.values.get('themeMode'), 'dark')
})
test('missing initialization cannot leave save feedback stuck indefinitely', async () => {
  const h = appearance()
  h.service.setTheme('dark')
  await h.service.persistChain
  assert.equal(h.values.get('appearanceSaveState'), 'failed')
})
test('missing thumbnail falls back once and becomes eligible again after TTL', () => {
  const { RemoteImagePolicy: p } = compile('core/ui/RemoteImagePolicy.ets')
  assert.equal(p.first('thumb', 'original', 100), 'thumb')
  p.failedThumbnail('thumb', 100)
  assert.equal(p.first('thumb', 'original', 101), 'original')
  assert.equal(p.first('thumb', 'original', 300101), 'thumb')
  assert.equal(p.first('', '', 101), '')
})
test('thumbnail negative cache remains bounded', () => {
  const { RemoteImagePolicy: p } = compile('core/ui/RemoteImagePolicy.ets')
  for (let i = 0; i < 100; i++) p.failedThumbnail(`url${i}`, 100)
  assert.equal(p.unavailable.size, 64)
  assert.equal(p.first('url0', 'fallback', 101), 'url0')
})
test('virtual list unregisters listeners and notifies current subscribers', () => {
  const { ProductDataSource } = compile('features/product/ProductDataSource.ets')
  const source = new ProductDataSource()
  let count = 0
  const listener = { onDataReloaded: () => count++ }
  source.registerDataChangeListener(listener)
  source.registerDataChangeListener(listener)
  source.update([{ id: 'a' }])
  assert.equal(source.totalCount(), 1)
  assert.equal(count, 1)
  source.unregisterDataChangeListener(listener)
  source.update([])
  assert.equal(count, 1)
})
