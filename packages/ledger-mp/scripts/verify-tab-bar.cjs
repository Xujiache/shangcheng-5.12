const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const typescript = require(
  require.resolve('typescript', { paths: [path.resolve(__dirname, '..')] }),
)

const packageRoot = path.resolve(__dirname, '..')
const sourceArg =
  process.env.TAB_BAR_SOURCE || path.join(packageRoot, 'miniprogram/custom-tab-bar/index.ts')
const sourcePath = fs.statSync(sourceArg).isDirectory()
  ? path.join(sourceArg, 'index.ts')
  : sourceArg
const baselineRoot =
  '/var/folders/rc/vt578yqn6g781c3kw7j179340000gn/T/ledger-tab-bar-baseline-x_wpid81'
const isBaseline = path.resolve(sourcePath) === path.resolve(path.join(baselineRoot, 'index.ts'))
const baselineAvailable = ['index.json'].every((file) =>
  fs.existsSync(path.join(baselineRoot, file)),
)

function createFakeClock() {
  let now = 0
  let nextId = 1
  const timers = []
  return {
    setTimeout(fn, delay) {
      const timer = { id: nextId++, at: now + Number(delay || 0), fn, cancelled: false }
      timers.push(timer)
      return timer.id
    },
    clearTimeout(id) {
      const timer = timers.find((item) => item.id === id)
      if (timer) timer.cancelled = true
    },
    tick(ms) {
      now += ms
      let timer
      while ((timer = timers.find((item) => !item.cancelled && item.at <= now))) {
        timer.cancelled = true
        timer.fn()
      }
    },
  }
}

function loadComponent() {
  const state = {
    loggedIn: false,
    membership: null,
    glass: true,
    loginCalls: 0,
    membershipPrompts: [],
    navigation: [],
    feedbackStarted: 0,
    feedbackFinished: 0,
    throwSwitch: false,
    currentRoute: 'pages/home/index',
    membershipRefresh: () => Promise.resolve(state.membership),
  }
  let definition
  const Component = (config) => {
    definition = config
  }
  const fakeStore = {
    getGlass: () => state.glass,
    glassTabStyle: () => 'background: fake-glass;',
    goToLogin: () => {
      state.loginCalls += 1
    },
    hasActiveMembership: (membership) =>
      !!state.loggedIn &&
      !!membership &&
      !!membership.active &&
      (membership.perpetual ||
        !membership.expiresAt ||
        Date.parse(membership.expiresAt) > Date.now()),
    isLoggedIn: () => state.loggedIn,
    requireMembership: (message) => {
      state.membershipPrompts.push(message)
    },
    setMembership: (membership) => {
      state.membership = membership
    },
  }
  const fakeApi = { meApi: { refreshMembership: () => state.membershipRefresh() } }
  const fakeTransition = {
    navigation: {
      switchTab: (options) => {
        if (state.throwSwitch) throw new Error('sync switch failure')
        state.navigation.push({ kind: 'switchTab', options })
      },
      navigateTo: (options) => {
        state.navigation.push({ kind: 'navigateTo', options })
      },
    },
    beginNavigationFeedback: () => {
      state.feedbackStarted += 1
      return () => {
        state.feedbackFinished += 1
      }
    },
  }
  const compiled = typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2018,
      esModuleInterop: true,
    },
  }).outputText
  const clock = createFakeClock()
  const context = vm.createContext({
    Component,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    getCurrentPages: () => [{ route: state.currentRoute }],
    Date,
    console,
  })
  const localRequire = (request) => {
    if (request === '../utils/store') return fakeStore
    if (request === '../api/index') return fakeApi
    if (request === '../utils/page-transition') return fakeTransition
    throw new Error('unexpected require: ' + request)
  }
  const script = new vm.Script('(function (exports, module, require) {' + compiled + '\n})')
  const moduleObject = { exports: {} }
  script.runInContext(context)(moduleObject.exports, moduleObject, localRequire)
  function makeInstance() {
    const instance = {
      data: JSON.parse(JSON.stringify(definition.data)),
      setData(patch) {
        Object.assign(this.data, patch)
      },
    }
    for (const [name, method] of Object.entries(definition.methods))
      instance[name] = method.bind(instance)
    return instance
  }
  return { clock, state, definition, makeInstance }
}

function event(index) {
  return { currentTarget: { dataset: { index } } }
}

test(
  'visual assets and tab routes remain the established contract',
  { skip: !baselineAvailable },
  () => {
    const currentDir = path.dirname(sourcePath)
    assert.equal(
      fs.readFileSync(path.join(currentDir, 'index.json'), 'utf8'),
      fs.readFileSync(path.join(baselineRoot, 'index.json'), 'utf8'),
    )
    const source = fs.readFileSync(path.join(currentDir, 'index.wxml'), 'utf8')
    for (const asset of [
      '/assets/navigation/nav-home.png',
      '/assets/settings/notification-order.png',
      '/assets/settings/notification-report.png',
      '/assets/navigation/nav-profile.png',
    ])
      assert.ok(fs.existsSync(path.join(packageRoot, 'miniprogram', asset.slice(1))), asset)
    for (const route of [
      '/pages/home/index',
      '/pages/orders/index',
      '/pages/reports/index',
      '/pages/profile/index',
    ]) {
      assert.match(fs.readFileSync(sourcePath, 'utf8'), /(?:TABS|tabs:)/)
      assert.ok(fs.existsSync(path.join(packageRoot, 'miniprogram', route.slice(1) + '.ts')), route)
    }
  },
)

test('initial state and all four selected states are stable', () => {
  const { definition, makeInstance } = loadComponent()
  assert.equal(definition.data.selected, 0)
  const instance = makeInstance()
  for (const index of [1, 2, 3]) {
    instance.selectTab(index)
    assert.equal(instance.data.selected, index)
  }
})

test('page show synchronization rewrites a stale selected state without animation', () => {
  const { makeInstance } = loadComponent()
  const instance = makeInstance()
  instance.selectTab(2)
  instance.syncTab(1)
  assert.equal(instance.data.selected, 1)
})

test(
  'page show uses the current route instead of a stale component origin',
  { skip: isBaseline },
  () => {
    const { state, definition, makeInstance } = loadComponent()
    const target = makeInstance()
    target.selectTab(2)
    state.currentRoute = 'pages/orders/index'
    definition.pageLifetimes.show.call(target)
    assert.equal(target.data.selected, 1)
  },
)

test('attached and page show refresh appearance preferences', () => {
  const { definition, state, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.glass = false
  definition.lifetimes.attached.call(instance)
  assert.equal(instance.data.glass, false)
  state.glass = true
  definition.pageLifetimes.show.call(instance)
  assert.equal(instance.data.glass, true)
})

test('guest can return home, but protected tabs require login without switching', () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.currentRoute = 'pages/reports/index'
  instance.selectTab(2)
  instance.switchTab(event(0))
  assert.equal(instance.data.selected, 0)
  assert.equal(state.navigation.at(-1).options.url, '/pages/home/index')
  const protectedInstance = makeInstance()
  protectedInstance.switchTab(event(1))
  assert.equal(state.loginCalls, 1)
  assert.equal(state.navigation.length, 1)
  assert.equal(protectedInstance.data.selected, 0)
})

test('current tab, invalid event and rapid taps are ignored', () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  instance.switchTab(event(0))
  instance.switchTab(event('bad'))
  instance.switchTab(event(4))
  assert.equal(state.navigation.length, 0)
  state.loggedIn = true
  instance.switchTab(event(1))
  instance.switchTab(event(2))
  assert.equal(state.navigation.length, 1)
  assert.equal(instance.data.selected, 1)
})

test('real route wins over a stale selected value', () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  instance.selectTab(1)
  state.currentRoute = 'pages/home/index'
  instance.switchTab(event(1))
  assert.equal(state.navigation.length, 1)
  assert.equal(state.navigation[0].options.url, '/pages/orders/index')
})

test('switch failure rolls selection back and completion releases lock at 280ms', () => {
  const { state, clock, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  instance.switchTab(event(1))
  const request = state.navigation[0].options
  assert.equal(instance.data.switching, true)
  assert.equal(instance.data.selected, 1)
  request.fail()
  assert.equal(instance.data.selected, 0)
  assert.equal(instance.data.switching, false)
  instance.switchTab(event(1))
  const completed = state.navigation[1].options
  completed.complete()
  assert.equal(instance.data.switching, true)
  clock.tick(279)
  assert.equal(instance.data.switching, true)
  clock.tick(1)
  assert.equal(instance.data.switching, false)
})

test('switch lock has a failsafe when native callbacks do not arrive', { skip: isBaseline }, () => {
  const { state, clock, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  instance.switchTab(event(1))
  assert.equal(instance.data.switching, true)
  clock.tick(1499)
  assert.equal(instance.data.switching, true)
  clock.tick(1)
  assert.equal(instance.data.switching, false)
})

test('onAdd sends guests to login and opens active membership orders', async () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  await instance.onAdd()
  assert.equal(state.loginCalls, 1)
  state.loggedIn = true
  state.membershipRefresh = () => Promise.resolve({ active: true, perpetual: true })
  await instance.onAdd()
  assert.equal(state.navigation.at(-1).options.url, '/subpackages/orders/pages/order-edit/index')
  assert.equal(state.feedbackStarted, 1)
  assert.equal(state.feedbackFinished, 1)
})

test('onAdd blocks expired membership and always finishes feedback', async () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  state.membershipRefresh = () =>
    Promise.resolve({ active: true, expiresAt: '2020-01-01T00:00:00.000Z' })
  await instance.onAdd()
  assert.equal(state.navigation.length, 0)
  assert.equal(state.membershipPrompts.length, 1)
  assert.equal(state.feedbackFinished, 1)
})

test('onAdd fails closed when membership API fails', async () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  state.membershipRefresh = () => Promise.reject(new Error('network'))
  await instance.onAdd()
  assert.equal(state.navigation.length, 0)
  assert.equal(state.feedbackStarted, 1)
  assert.equal(state.feedbackFinished, 1)
})

test('onAdd lock is shared by component instances and expires at 600ms', async () => {
  let resolveMembership
  const { state, clock, makeInstance } = loadComponent()
  const first = makeInstance()
  const second = makeInstance()
  state.loggedIn = true
  state.membershipRefresh = () =>
    new Promise((resolve) => {
      resolveMembership = resolve
    })
  const firstCall = first.onAdd()
  await Promise.resolve()
  await second.onAdd()
  assert.equal(state.feedbackStarted, 1)
  resolveMembership({ active: true, perpetual: true })
  await firstCall
  state.membershipRefresh = () => Promise.resolve({ active: true, perpetual: true })
  await second.onAdd()
  assert.equal(state.feedbackStarted, 1)
  clock.tick(599)
  await second.onAdd()
  assert.equal(state.feedbackStarted, 1)
  clock.tick(1)
  await second.onAdd()
  assert.equal(state.feedbackStarted, 2)
})

test('synchronous switchTab failure leaves no lock', { skip: isBaseline }, () => {
  const { state, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  state.throwSwitch = true
  assert.doesNotThrow(() => instance.switchTab(event(1)))
  assert.equal(instance.data.switching, false)
  assert.equal(instance.data.selected, 0)
})

test('a failed switch clears its old completion timer', { skip: isBaseline }, () => {
  const { state, clock, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  instance.switchTab(event(1))
  const first = state.navigation[0].options
  first.complete()
  first.fail()
  instance.switchTab(event(1))
  const second = state.navigation[1].options
  second.complete()
  clock.tick(279)
  assert.equal(instance.data.switching, true)
})

test('detached invalidates a pending completion timer', { skip: isBaseline }, () => {
  const { state, clock, definition, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  instance.switchTab(event(1))
  state.navigation[0].options.complete()
  definition.lifetimes.detached.call(instance)
  clock.tick(280)
  assert.equal(instance.data.switching, true)
})

test('hiding a source page releases its local switch lock', { skip: isBaseline }, () => {
  const { state, definition, makeInstance } = loadComponent()
  const instance = makeInstance()
  state.loggedIn = true
  instance.switchTab(event(1))
  assert.equal(instance.data.switching, true)
  definition.pageLifetimes.hide.call(instance)
  assert.equal(instance.data.switching, false)
})

test('tab pages use the non-animated synchronization hook', () => {
  for (const page of ['home', 'orders', 'reports', 'profile']) {
    const source = fs.readFileSync(
      path.join(packageRoot, 'miniprogram/pages', page, 'index.ts'),
      'utf8',
    )
    assert.match(source, /syncTab/)
  }
})

test('defensive direct selectTab ignores NaN and fractional indexes', { skip: isBaseline }, () => {
  const { makeInstance } = loadComponent()
  const instance = makeInstance()
  instance.selectTab(Number.NaN)
  assert.equal(instance.data.selected, 0)
  instance.selectTab(1.5)
  assert.equal(instance.data.selected, 0)
})
