/** Page motion is cosmetic: never delay a native route, await an animation, or clear page data. */
const MOTION_KEY = 'ledger_page_motion_v1'
type PageView = { route?: string; data: any; setData: (patch: any) => void }
type PageState = { visible: boolean; ready: boolean; flip: boolean }
type RouteMethod = 'navigateTo' | 'navigateBack' | 'redirectTo' | 'switchTab' | 'reLaunch'
const states = new WeakMap<object, PageState>()
let active: PageView | undefined
let lastShown: PageView | undefined
let serial = 0
let flight:
  | {
      id: number
      key: string
      target: string
      started: number
      owner?: PageView
      shareable?: boolean
      promise?: Promise<any>
      timers: any[]
    }
  | undefined

export function pageMotionEnabled(): boolean {
  try {
    return wx.getStorageSync(MOTION_KEY) !== false
  } catch {
    return true
  }
}
export function setPageMotionEnabled(enabled: boolean): void {
  wx.setStorageSync(MOTION_KEY, enabled)
  if (!enabled && active) safeSetData(active, { _routeMotion: '' })
}
function state(page: PageView): PageState {
  let value = states.get(page)
  if (!value) {
    value = { visible: false, ready: false, flip: false }
    states.set(page, value)
  }
  return value
}
function timer(fn: () => void, ms: number) {
  const handle: any = setTimeout(fn, ms)
  // Test runners need not wait for abandoned mocked native calls. Mini-program timers are numeric.
  if (typeof handle?.unref === 'function') handle.unref()
  return handle
}
function safeSetData(page: PageView, patch: any): void {
  try {
    page.setData(patch)
  } catch {
    // A native route can destroy a webview before a cosmetic callback arrives.
  }
}
function paint(busy: boolean, slow = false, pageOverride?: PageView) {
  const page = pageOverride || flight?.owner || active
  if (!page || !states.get(page)?.visible) return
  if (page.data._routeBusy !== busy || page.data._routeSlow !== slow) {
    safeSetData(page, { _routeBusy: busy, _routeSlow: slow })
  }
}
function finish(id = flight?.id) {
  if (!flight || flight.id !== id) return
  const owner = flight.owner
  flight.timers.forEach(clearTimeout)
  flight = undefined
  paint(false, false, owner)
}
function arrived(page: PageView) {
  if (!flight || !states.get(page)?.ready) return
  const route = String(page.route || '').replace(/^\//, '')
  if (!flight.target || flight.target === route) finish(flight.id)
}
function start(key: string, target: string) {
  finish()
  const id = ++serial
  flight = { id, key, target, started: Date.now(), owner: active, timers: [] }
  flight.timers.push(
    timer(() => {
      if (flight?.id === id) paint(true)
    }, 180),
  )
  flight.timers.push(
    timer(() => {
      if (flight?.id === id) paint(true, true)
    }, 1400),
  )
  // An unavailable native callback must never leave a permanent spinner on a usable page.
  flight.timers.push(timer(() => finish(id), 10000))
  return flight
}

function route(method: RouteMethod, options: any = {}) {
  const url = String(options.url || '')
  const key = method + ':' + (url || String(options.delta || 1))
  const callbacks = ['success', 'fail', 'complete'].some(
    (name) => typeof options[name] === 'function',
  )
  // Coalesce repeated callback-free taps; awaiters still receive the original native result/eventChannel.
  const shareable = !callbacks && !options.events
  if (
    shareable &&
    flight?.shareable &&
    flight.key === key &&
    flight.promise &&
    Date.now() - flight.started < 800
  )
    return flight.promise
  const pending = start(key, method === 'navigateBack' ? '' : url.replace(/^\//, '').split('?')[0])
  pending.shareable = shareable
  let resolve: ((value: any) => void) | undefined
  let reject: ((reason: any) => void) | undefined
  if (!callbacks) {
    pending.promise = new Promise((yes, no) => {
      resolve = yes
      reject = no
    })
    // Fire-and-forget callers receive the toast; explicit awaiters still observe the rejection.
    pending.promise.catch(() => {})
  }
  try {
    const nativeResult = (wx[method] as any)({
      ...options,
      success(result: any) {
        if (flight?.id === pending.id && active) arrived(active)
        try {
          options.success?.(result)
        } finally {
          resolve?.(result)
        }
      },
      fail(error: any) {
        finish(pending.id)
        try {
          if (options.fail) options.fail(error)
          else wx.showToast({ title: '页面暂时未打开，请重试', icon: 'none' })
        } finally {
          reject?.(error)
        }
      },
      complete(result: any) {
        options.complete?.(result)
      },
    })
    return callbacks ? nativeResult : pending.promise
  } catch (error) {
    finish(pending.id)
    if (callbacks) throw error
    reject?.(error)
    return pending.promise
  }
}
export const navigation = {
  navigateTo: (options: any) => route('navigateTo', options),
  navigateBack: (options?: any) => route('navigateBack', options),
  redirectTo: (options: any) => route('redirectTo', options),
  switchTab: (options: any) => route('switchTab', options),
  reLaunch: (options: any) => route('reLaunch', options),
} as Pick<typeof wx, RouteMethod>

/** Optional feedback while a tap waits for an existing permission/membership check. */
export function beginNavigationFeedback(): () => void {
  const id = start('prepare:' + ++serial, '').id
  return () => finish(id)
}

/** Keep native Page's contextual typing and all original lifecycle arguments, returns and errors. */
export const MotionPage: typeof Page = ((definition: any) => {
  const wrapped = {
    ...definition,
    data: {
      _routeMotion: '',
      _routeBusy: false,
      _routeSlow: false,
      _routeTop: 64,
      ...definition.data,
    },
  }
  wrapped.onShow = function (this: PageView, ...args: any[]) {
    const current = state(this)
    current.visible = true
    active = this
    const patch: any = { _routeBusy: false, _routeSlow: false }
    if (lastShown !== this) {
      current.flip = !current.flip
      patch._routeMotion = pageMotionEnabled()
        ? 'lz-route-reveal-' + (current.flip ? 'a' : 'b')
        : ''
    }
    lastShown = this
    try {
      patch._routeTop = (getApp<IAppOption>()?.globalData?.statusBarHeight || 20) + 52
    } catch {}
    safeSetData(this, patch)
    arrived(this)
    return definition.onShow?.apply(this, args)
  }
  wrapped.onReady = function (this: PageView, ...args: any[]) {
    state(this).ready = true
    if (active === this) arrived(this)
    return definition.onReady?.apply(this, args)
  }
  wrapped.onHide = function (this: PageView, ...args: any[]) {
    state(this).visible = false
    if (active === this) active = undefined
    return definition.onHide?.apply(this, args)
  }
  wrapped.onUnload = function (this: PageView, ...args: any[]) {
    const wasOwner = flight?.owner === this
    states.delete(this)
    if (active === this) active = undefined
    if (lastShown === this) lastShown = undefined
    if (wasOwner) finish(flight?.id)
    return definition.onUnload?.apply(this, args)
  }
  return Page(wrapped)
}) as typeof Page
