import { API_BASE, TOKEN_KEY } from '../config'
// ── 读接口本地缓存（原 utils/cache 内联进来：避免新增文件被 DevTools 增量编译漏掉）──
const CACHE_PREFIX = 'lc:' // ledger read-cache 命名空间
const CACHE_VERSION = 1 // 缓存结构版本；改结构时 +1，旧缓存自动作废
const CACHE_MAX_BYTES = 256 * 1024 // 单条上限（wx 单 key 上限 1MB，留足余量）
interface CacheEntry<T> {
  v: number
  t: number
  data: T
}
function readCache<T = any>(key: string): { t: number; data: T } | null {
  try {
    const raw = wx.getStorageSync(CACHE_PREFIX + key) as CacheEntry<T>
    if (!raw || typeof raw !== 'object' || raw.v !== CACHE_VERSION) return null
    return { t: raw.t, data: raw.data }
  } catch (e) {
    return null
  }
}
function writeCache<T = any>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { v: CACHE_VERSION, t: Date.now(), data }
    if (JSON.stringify(entry).length > CACHE_MAX_BYTES) return
    wx.setStorageSync(CACHE_PREFIX + key, entry)
  } catch (e) {
    /* 存储满/序列化失败：静默放弃，不影响主流程 */
  }
}
/** 按前缀失效相关缓存（写接口成功后调用） */
export function invalidateCache(prefixes: string | string[]): void {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes]
  try {
    const keys = (wx.getStorageInfoSync().keys || []) as string[]
    keys.forEach((k) => {
      if (k.indexOf(CACHE_PREFIX) !== 0) return
      const sub = k.slice(CACHE_PREFIX.length)
      if (list.some((p) => sub.indexOf(p) === 0)) wx.removeStorageSync(k)
    })
  } catch (e) {
    /* ignore */
  }
}
/** 清空本端全部读缓存（退出登录/换账号时调用） */
export function clearAllCache(): void {
  try {
    const keys = (wx.getStorageInfoSync().keys || []) as string[]
    keys.forEach((k) => {
      if (k.indexOf(CACHE_PREFIX) === 0) wx.removeStorageSync(k)
    })
  } catch (e) {
    /* ignore */
  }
}

interface ApiShell<T> {
  code: number
  data: T
  message?: string
  msg?: string
}

export interface RequestOptions {
  url: string // 例 '/l/orders'（自动补 /api/v1 前缀）
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: any
  params?: Record<string, any>
  auth?: boolean // 默认 true
  silent?: boolean // 不弹错误 toast
  cache?: boolean // 读接口本地缓存：成功写入；无网/5xx/超时回退上次数据（仅 GET 生效）
  cacheKey?: string // 自定义缓存键（默认 路径+查询串）
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return ''
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
  return parts.length ? '?' + parts.join('&') : ''
}

let unauthHandling = false
export function handleUnauthorized() {
  if (unauthHandling) return
  unauthHandling = true
  const app = getApp<IAppOption>()
  app?.clearAuth?.()
  wx.reLaunch({ url: '/pages/login/index' })
  setTimeout(() => (unauthHandling = false), 1500)
}

let gateHandling = false
function handleMemberExpired() {
  if (gateHandling) return
  gateHandling = true
  // reLaunch 会清空页面栈（正在录入的内容会丢失），先用阻断式弹窗说明再跳闸门页
  wx.showModal({
    title: '会员已到期',
    content: '会员已到期，请联系管理员续费后再继续使用；当前未保存的内容请先截图留存。',
    showCancel: false,
    confirmText: '我知道了',
    complete: () => {
      wx.reLaunch({ url: '/pages/membership/index?gate=1' })
      setTimeout(() => (gateHandling = false), 1500)
    },
  })
}

// 离线/失败回退缓存时的统一提示（节流；silent 时只置标记不弹）
let lastOfflineToast = 0
function markOffline(silent?: boolean) {
  const app = getApp<IAppOption>()
  if (app?.globalData) app.globalData.online = false
  if (silent) return
  const now = Date.now()
  if (now - lastOfflineToast > 8000) {
    lastOfflineToast = now
    wx.showToast({ title: '当前离线 · 显示上次数据', icon: 'none' })
  }
}

export function request<T = any>(opts: RequestOptions): Promise<T> {
  const app = getApp<IAppOption>()
  const token = app?.globalData?.token || wx.getStorageSync(TOKEN_KEY) || ''
  const header: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.auth !== false && token) header['Authorization'] = 'Bearer ' + token
  const url = API_BASE + '/api/v1' + opts.url + buildQuery(opts.params)
  // 读缓存：仅 GET 生效；键默认取 路径+查询串
  const method = opts.method || 'GET'
  const useCache = method === 'GET' && !!opts.cache
  const cacheKey = opts.cacheKey || opts.url + buildQuery(opts.params)

  return new Promise<T>((resolve, reject) => {
    // 已知离线且有缓存：直接回退，省去等待网络超时
    if (useCache && app?.globalData?.online === false) {
      const c = readCache<T>(cacheKey)
      if (c) {
        markOffline(opts.silent)
        resolve(c.data)
        return
      }
    }
    wx.request({
      url,
      method: method as any,
      data: opts.data,
      header,
      timeout: 15000,
      success: (res) => {
        const body = res.data as ApiShell<T>
        const httpOk = res.statusCode >= 200 && res.statusCode < 300
        if (body && typeof body === 'object' && 'code' in body) {
          if (body.code === 0) {
            if (app?.globalData) app.globalData.online = true
            if (useCache) writeCache(cacheKey, body.data)
            resolve(body.data)
            return
          }
          const err: any = new Error(body.message || body.msg || '请求失败')
          err.code = body.code
          err.data = body.data
          if (body.code === 6001) {
            // 会员过期/未开通 → 进闸门页（业务接口才会触发）
            handleMemberExpired()
            reject(err)
            return
          }
          if (body.code === 2001 || body.code === 2002 || res.statusCode === 401) {
            handleUnauthorized()
            reject(err)
            return
          }
          // 2003 也用于登录前场景（如注册关闭），仅「账号被禁用」才强制登出
          if (body.code === 2003 && err.message.indexOf('禁用') >= 0) {
            handleUnauthorized()
            wx.showToast({ title: '账号已被禁用', icon: 'none' })
            reject(err)
            return
          }
          if (!opts.silent) wx.showToast({ title: err.message, icon: 'none' })
          reject(err)
          return
        }
        if (httpOk) {
          if (app?.globalData) app.globalData.online = true
          if (useCache) writeCache(cacheKey, body as any)
          resolve(body as any)
          return
        }
        // 状态码留在 Error 内供上层/console 用，toast 只说人话
        const e: any = new Error('网络错误 (' + res.statusCode + ')')
        e.statusCode = res.statusCode
        if (res.statusCode === 401) handleUnauthorized()
        // 服务器 5xx（非鉴权）：有缓存则回退上次数据，避免整屏失败
        if (useCache && res.statusCode >= 500) {
          const c = readCache<T>(cacheKey)
          if (c) {
            markOffline(opts.silent)
            resolve(c.data)
            return
          }
        }
        if (!opts.silent)
          wx.showToast({
            title: res.statusCode >= 500 ? '服务器开小差了，请稍后重试' : '网络异常，请重试',
            icon: 'none',
          })
        reject(e)
      },
      fail: (e) => {
        // 网络连接失败（无网/超时）：有缓存则回退上次数据
        if (useCache) {
          const c = readCache<T>(cacheKey)
          if (c) {
            markOffline(opts.silent)
            resolve(c.data)
            return
          }
        }
        markOffline(true)
        if (!opts.silent) wx.showToast({ title: '网络连接失败', icon: 'none' })
        reject(e)
      },
    })
  })
}

export const http = {
  get: <T = any>(url: string, params?: any, opts: Partial<RequestOptions> = {}) =>
    request<T>({ url, method: 'GET', params, ...opts }),
  post: <T = any>(url: string, data?: any, opts: Partial<RequestOptions> = {}) =>
    request<T>({ url, method: 'POST', data, ...opts }),
  put: <T = any>(url: string, data?: any, opts: Partial<RequestOptions> = {}) =>
    request<T>({ url, method: 'PUT', data, ...opts }),
  patch: <T = any>(url: string, data?: any, opts: Partial<RequestOptions> = {}) =>
    request<T>({ url, method: 'PATCH', data, ...opts }),
  del: <T = any>(url: string, data?: any, opts: Partial<RequestOptions> = {}) =>
    request<T>({ url, method: 'DELETE', data, ...opts }),
}
