import { API_BASE, TOKEN_KEY } from '../config'

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
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return ''
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
  return parts.length ? '?' + parts.join('&') : ''
}

let unauthHandling = false
function handleUnauthorized() {
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
  wx.reLaunch({ url: '/pages/membership/index?gate=1' })
  setTimeout(() => (gateHandling = false), 1500)
}

export function request<T = any>(opts: RequestOptions): Promise<T> {
  const app = getApp<IAppOption>()
  const token = app?.globalData?.token || wx.getStorageSync(TOKEN_KEY) || ''
  const header: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.auth !== false && token) header['Authorization'] = 'Bearer ' + token
  const url = API_BASE + '/api/v1' + opts.url + buildQuery(opts.params)

  return new Promise<T>((resolve, reject) => {
    wx.request({
      url,
      method: (opts.method || 'GET') as any,
      data: opts.data,
      header,
      success: (res) => {
        const body = res.data as ApiShell<T>
        const httpOk = res.statusCode >= 200 && res.statusCode < 300
        if (body && typeof body === 'object' && 'code' in body) {
          if (body.code === 0) {
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
          if (!opts.silent) wx.showToast({ title: err.message, icon: 'none' })
          reject(err)
          return
        }
        if (httpOk) {
          resolve(body as any)
          return
        }
        const e: any = new Error('网络错误 (' + res.statusCode + ')')
        if (res.statusCode === 401) handleUnauthorized()
        if (!opts.silent) wx.showToast({ title: e.message, icon: 'none' })
        reject(e)
      },
      fail: (e) => {
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
