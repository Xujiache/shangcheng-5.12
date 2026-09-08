const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../packages/ledger-mp/node_modules/typescript')
const root = path.resolve('packages/ledger-mp/miniprogram')
const source = fs.readFileSync(path.join(root, 'utils/page-transition.ts'), 'utf8')
function fixture() {
  let now = 0,
    id = 0,
    definition
  const timers = new Map(),
    calls = [],
    toasts = [],
    storage = new Map()
  const wx = {
    getStorageSync: (k) => storage.get(k),
    setStorageSync: (k, v) => storage.set(k, v),
    showToast: (o) => toasts.push(o),
  }
  for (const method of ['navigateTo', 'navigateBack', 'redirectTo', 'switchTab', 'reLaunch'])
    wx[method] = (options) => {
      const result = { native: calls.length }
      calls.push({ method, options, result })
      return result
    }
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
      exports,
      wx,
      console,
      Promise,
      Date: { now: () => now },
      getApp: () => ({ globalData: { statusBarHeight: 44 } }),
      Page: (d) => {
        definition = d
      },
      setTimeout: (fn, delay) => {
        const handle = ++id
        timers.set(handle, { fn, at: now + delay })
        return handle
      },
      clearTimeout: (i) => timers.delete(i),
    },
  )
  function advance(ms) {
    const end = now + ms
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (!next) break
      now = next[1].at
      timers.delete(next[0])
      next[1].fn()
    }
    now = end
  }
  function page(route, extra = {}) {
    exports.MotionPage({ data: { amount: 35000, scroll: 280 }, ...extra })
    const p = {
      route,
      data: JSON.parse(JSON.stringify(definition.data)),
      patches: [],
      setData(patch) {
        this.patches.push(patch)
        Object.assign(this.data, patch)
      },
    }
    for (const [k, v] of Object.entries(definition)) if (typeof v === 'function') p[k] = v.bind(p)
    return p
  }
  return { ...exports, calls, toasts, storage, timers, page, advance }
}
const passed = []
async function test(name, fn) {
  await fn()
  passed.push(name)
  console.log('PASS ' + name)
}
function capture(file, imports, register = 'Page') {
  let definition
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
      exports: {},
      console,
      setTimeout,
      clearTimeout,
      wx: {
        showToast() {
          throw Error('unexpected toast while loading')
        },
      },
      [register]: (d) => {
        definition = d
      },
      require: (id) => {
        if (id.endsWith('/page-transition'))
          return {
            MotionPage: (d) => {
              definition = d
            },
            ...imports.motion,
          }
        const match = Object.entries(imports).find(([key]) => id.endsWith(key))
        if (!match) throw Error('Unmocked import ' + id)
        return match[1]
      },
    },
  )
  const instance = {
    data: structuredClone(definition.data),
    patches: [],
    setData(patch, done) {
      this.patches.push(patch)
      Object.assign(this.data, patch)
      done?.()
    },
  }
  for (const [key, value] of Object.entries({ ...definition, ...definition.methods }))
    if (typeof value === 'function') instance[key] = value.bind(instance)
  return { instance, definition }
}
async function main() {
  await test('native route dispatch has no animation delay; fast navigation never flashes a loader', async () => {
    const f = fixture(),
      a = f.page('pages/a')
    a.onShow()
    a.onReady()
    const promise = f.navigation.navigateTo({ url: '/pages/b' })
    assert.equal(f.calls.length, 1)
    f.advance(100)
    const b = f.page('pages/b')
    a.onHide()
    b.onShow()
    b.onReady()
    const result = { eventChannel: { id: 'real channel' } }
    f.calls[0].options.success(result)
    assert.equal(await promise, result)
    f.advance(2000)
    assert(!a.patches.some((p) => p._routeBusy))
    assert(!b.patches.some((p) => p._routeBusy))
    assert.equal(f.timers.size, 0)
  })
  await test('slow native navigation shows delayed rail then hint; ready clears both', async () => {
    const f = fixture(),
      a = f.page('pages/a')
    a.onShow()
    a.onReady()
    f.navigation.navigateTo({ url: '/pages/b' })
    f.advance(179)
    assert.equal(a.data._routeBusy, false)
    f.advance(1)
    assert.equal(a.data._routeBusy, true)
    f.advance(1220)
    assert.equal(a.data._routeSlow, true)
    a.onHide()
    const b = f.page('pages/b')
    b.onShow()
    b.onReady()
    f.calls[0].options.success({})
    assert.equal(b.data._routeBusy, false)
    assert.equal(f.timers.size, 0)
  })
  await test('double tap shares native promise and eventChannel; unrelated callbacks/events are not swallowed', async () => {
    const f = fixture(),
      p = f.page('pages/a')
    p.onShow()
    p.onReady()
    const first = f.navigation.navigateTo({ url: '/pages/b?id=1' }),
      second = f.navigation.navigateTo({ url: '/pages/b?id=1' })
    assert.equal(first, second)
    assert.equal(f.calls.length, 1)
    const result = { eventChannel: {} }
    f.calls[0].options.success(result)
    assert.equal(await second, result)
    f.navigation.navigateTo({ url: '/pages/b?id=1', events: { hello() {} } })
    assert.equal(f.calls.length, 2)
    f.navigation.navigateTo({ url: '/pages/b?id=1' })
    assert.equal(f.calls.length, 3)
    const order = [],
      events = { hello() {} }
    const native = f.navigation.navigateTo({
      url: '/pages/c',
      events,
      success: (r) => order.push(r),
      complete: (r) => order.push(r),
    })
    const call = f.calls[3]
    assert.equal(native, call.result)
    assert.equal(call.options.events, events)
    call.options.success(result)
    call.options.complete(result)
    assert.deepEqual(order, [result, result])
  })
  await test('failure releases feedback and rejects awaiters; retry starts immediately', async () => {
    const f = fixture(),
      a = f.page('pages/a')
    a.onShow()
    a.onReady()
    const p = f.navigation.redirectTo({ url: '/pages/b' })
    f.advance(200)
    const error = { errMsg: 'not found' }
    f.calls[0].options.fail(error)
    await assert.rejects(p, (e) => e === error)
    assert.equal(a.data._routeBusy, false)
    assert.equal(f.toasts.length, 1)
    f.navigation.redirectTo({ url: '/pages/b' })
    assert.equal(f.calls.length, 2)
  })
  await test('cached return keeps amount, inputs and scroll; app foreground does not replay motion', async () => {
    const f = fixture(),
      a = f.page('pages/a')
    a.onShow()
    a.onReady()
    const first = a.data._routeMotion
    a.onHide()
    a.onShow()
    assert.equal(a.data._routeMotion, first)
    assert(!('_routeMotion' in a.patches.at(-1)))
    const b = f.page('pages/b')
    a.onHide()
    b.onShow()
    b.onReady()
    f.navigation.navigateBack({ delta: 1 })
    b.onUnload()
    a.onShow()
    assert.notEqual(a.data._routeMotion, first)
    assert.equal(a.data.amount, 35000)
    assert.equal(a.data.scroll, 280)
    assert.equal(f.timers.size, 0)
  })
  await test('hide/unload prevents timer writes; stale callback cannot dismiss a newer navigation', async () => {
    const f = fixture(),
      a = f.page('pages/a')
    a.onShow()
    a.onReady()
    f.navigation.navigateTo({ url: '/pages/b' })
    f.navigation.reLaunch({ url: '/pages/c' })
    f.advance(180)
    f.calls[0].options.fail({})
    assert.equal(a.data._routeBusy, true)
    const count = a.patches.length
    a.onUnload()
    f.advance(20000)
    assert.equal(a.patches.length, count)
    assert.equal(f.timers.size, 0)
  })
  await test('watchdog only removes cosmetic feedback; late native success still resolves', async () => {
    const f = fixture(),
      a = f.page('pages/a')
    a.onShow()
    a.onReady()
    const p = f.navigation.navigateTo({ url: '/pages/b' })
    f.advance(10000)
    assert.equal(a.data._routeBusy, false)
    const result = { late: true }
    f.calls[0].options.success(result)
    assert.equal(await p, result)
  })
  await test('lifecycle arguments, this, async results and thrown errors are preserved', async () => {
    const f = fixture(),
      promise = Promise.resolve('result'),
      seen = []
    const p = f.page('pages/a', {
      onLoad(v) {
        seen.push([this.route, v])
      },
      onShow(v) {
        seen.push(v)
        return promise
      },
      onReady(v) {
        return v
      },
      onUnload() {
        throw Error('original')
      },
    })
    p.onLoad('query')
    assert.equal(p.onShow('shown'), promise)
    assert.equal(p.onReady('ready'), 'ready')
    assert.deepEqual(seen, [['pages/a', 'query'], 'shown'])
    assert.throws(() => p.onUnload(), /original/)
  })
  await test('motion preference and preparation feedback do not interfere with navigation', async () => {
    const f = fixture()
    f.setPageMotionEnabled(false)
    const a = f.page('pages/a')
    a.onShow()
    a.onReady()
    assert.equal(a.data._routeMotion, '')
    f.setPageMotionEnabled(true)
    const stop = f.beginNavigationFeedback()
    f.advance(180)
    assert(a.data._routeBusy)
    f.navigation.navigateTo({ url: '/pages/b' })
    f.advance(180)
    stop()
    assert(a.data._routeBusy)
  })
  await test('loading components respect motion preference, deduplicate updates and stop hidden-page animation', () => {
    for (const name of ['lz-skeleton', 'lz-route-feedback']) {
      let enabled = true
      const { instance: c, definition: d } = capture(
        'components/' + name + '/index.ts',
        { motion: { pageMotionEnabled: () => enabled } },
        'Component',
      )
      d.lifetimes.attached.call(c)
      d.pageLifetimes.show.call(c)
      assert.equal(c.data.moving, true)
      assert.equal(c.patches.length, 1)
      d.pageLifetimes.hide.call(c)
      assert.equal(c.data.moving, false)
      enabled = false
      d.pageLifetimes.show.call(c)
      assert.equal(c.data.moving, false)
      assert.equal(c.patches.length, 2)
      enabled = true
      d.pageLifetimes.show.call(c)
      assert.equal(c.data.moving, true)
    }
  })
  await test('real customer/order editors guard unfinished loads, release errors and support retry without blank saves', async () => {
    for (const name of ['customer', 'order']) {
      let resolve,
        reject,
        reads = 0,
        writes = 0
      const api = {
        get() {
          reads++
          return new Promise((yes, no) => {
            resolve = yes
            reject = no
          })
        },
        update() {
          writes++
        },
        create() {
          writes++
        },
      }
      const { instance: p } = capture('pages/' + name + '-edit/index.ts', {
        '/api/index': { customerApi: api, orderApi: api },
        '/format': {},
        '/calc': { EXTRA_TYPES: [] },
        '/store': {},
        '/cost-categories': { readCostCategories: () => [] },
      })
      assert.equal(p.data.loadingRecord, false, 'new form is available immediately')
      Object.assign(p.data, { editing: true, id: 'existing', canSave: true })
      p.refresh = () => {}
      p.fetchCostCategories = async () => []
      const load = () => (name === 'customer' ? p.load() : p.loadOrder())
      const first = load()
      assert.equal(p.data.loadingRecord, true)
      await p.save()
      await load()
      assert.equal(reads, 1)
      assert.equal(writes, 0)
      reject(Error('offline'))
      await first
      assert.equal(p.data.loadingRecord, false)
      assert.equal(p.data.loadError, true)
      await p.save()
      assert.equal(writes, 0)
      const retry = load()
      assert.equal(p.data.loadError, false)
      assert.equal(p.data.loadingRecord, true)
      resolve({ name: '客户甲', customer: '客户甲', total: 82000, date: '2026-09-09' })
      await retry
      assert.equal(p.data.loadingRecord, false)
      assert.equal(p.data.loadError, false)
      assert.equal(reads, 2)
      assert.equal(name === 'customer' ? p.data.name : p.data.customerName, '客户甲')
      if (name === 'order') assert.equal(p.data.total, 82000)
    }
  })
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  const routes = [
    ...app.pages,
    ...app.subPackages.flatMap((p) => p.pages.map((r) => p.root + '/' + r)),
  ]
  await test('all registered pages use shared motion/feedback; native fixed positioning is not transformed', () => {
    assert.equal(routes.length, 41)
    for (const route of routes) {
      const script = fs.readFileSync(path.join(root, route + '.ts'), 'utf8'),
        template = fs.readFileSync(path.join(root, route + '.wxml'), 'utf8')
      assert(/\bMotionPage[<(]/.test(script), route)
      assert(!/\bwx\.(navigateTo|navigateBack|switchTab|redirectTo|reLaunch)\(/.test(script), route)
      assert.equal((template.match(/<lz-route-feedback\b/g) || []).length, 1, route)
      assert(template.includes('lz-route-scene {{_routeMotion}}'), route)
      assert(!template.includes('tab-page--motion'), route)
    }
    const css = fs.readFileSync(path.join(root, 'styles/page-transition.wxss'), 'utf8')
    assert(!/@keyframes[^}]*transform/.test(css))
    assert(css.includes('prefers-reduced-motion'))
    assert(app.preloadRule['pages/work-log/index'].packages.includes('subpackages/workbook'))
  })
  const result = {
    passed: passed.length,
    checks: passed,
    routes: routes.length,
    realDeviceVerified: false,
  }
  const docs = path.resolve('docs/页面过渡优化')
  fs.mkdirSync(docs, { recursive: true })
  fs.writeFileSync(path.join(docs, 'verification.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
