/**
 * 网络请求 · 商家端
 *
 * 仅连接真实后端，不再保留 mock 拦截层。
 *
 * 401 / 2001 / 2002 → 节流 toast + 清 storage + 跳 /pages/auth/login
 */
import type { ApiResult } from '@jiujiu/shared/types'

export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://ewsn.top')
const LOGIN_PATH = '/pages/auth/login'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: Record<string, unknown>
  params?: Record<string, unknown>
  headers?: Record<string, string>
  silent?: boolean
}

function buildUrl(url: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return url
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) usp.append(k, String(v))
  })
  const q = usp.toString()
  return q ? `${url}${url.includes('?') ? '&' : '?'}${q}` : url
}

/**
 * 商家端只允许调：/m/* 私有  +  /auth/* 共享认证  +  /files/* 共享文件
 *                +  /u/categories  /u/banners  /u/merchant-apply  （公开接口白名单）
 */
const MERCHANT_PUBLIC_ALLOW = new Set([
  '/api/v1/u/categories',
  '/api/v1/u/banners',
  '/api/v1/u/merchant-apply',
  '/api/v1/u/stores/nearby',
  '/api/v1/u/agreements',
])
function guardNamespace(url: string): void {
  if (import.meta.env.PROD) return
  if (!url.startsWith('/api/v1/')) return
  for (const w of MERCHANT_PUBLIC_ALLOW) if (url.startsWith(w)) return
  const path = url.replace(/^\/api\/v1\//, '')
  if (path.startsWith('p/') || path.startsWith('u/')) {
    const msg = `[merchant-app 命名空间错误] 商家端不能调用 ${url}，会触发 403。请改为 /api/v1/m/* 接口。`
    console.error(msg, new Error('stacktrace'))
    throw new Error(msg)
  }
}

const TOKEN_KEY = 'jiujiu_token'
const REFRESH_KEY = 'jiujiu_refresh_token'

function getToken(): string | null {
  try {
    return uni.getStorageSync(TOKEN_KEY) || null
  } catch {
    return null
  }
}
function getRefreshToken(): string | null {
  try {
    return uni.getStorageSync(REFRESH_KEY) || null
  } catch {
    return null
  }
}

async function realRequest<T>(url: string, options: RequestOptions): Promise<ApiResult<T>> {
  guardNamespace(url)
  const token = getToken()
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method: (options.method ?? 'GET') as any,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      success: (res) => {
        const status = (res as any).statusCode as number
        if (status === 401) {
          resolve({
            code: 2001,
            data: null,
            message: '登录已过期',
            traceId: '',
            timestamp: Date.now(),
          } as ApiResult<T>)
          return
        }
        resolve(res.data as ApiResult<T>)
      },
      fail: (err) => reject(err),
    })
  })
}

/**
 * 用 refresh token 静默续签 access token。
 *
 * 并发请求只触发一次 refresh —— refreshPromise 复用同一个 in-flight Promise。
 * 成功后把新的 token 写回 storage（下次 getToken() 就能拿到）。
 *
 * 失败一定要返回 false，让上层走 handleUnauthorized 流程。
 */
let refreshPromise: Promise<boolean> | null = null
function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const rt = getRefreshToken()
    if (!rt) return false
    return await new Promise<boolean>((resolve) => {
      uni.request({
        url: BASE_URL + '/api/v1/auth/refresh',
        method: 'POST',
        data: { refreshToken: rt },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          try {
            const data = res.data as ApiResult<{ accessToken: string; refreshToken: string }>
            if (data?.code === 0 && data.data?.accessToken && data.data?.refreshToken) {
              uni.setStorageSync(TOKEN_KEY, data.data.accessToken)
              uni.setStorageSync(REFRESH_KEY, data.data.refreshToken)
              resolve(true)
              return
            }
          } catch {
            /* ignore */
          }
          resolve(false)
        },
        fail: () => resolve(false),
      })
    })
  })()
  try {
    return refreshPromise
  } finally {
    // 清掉 in-flight 占位（无论结果都释放，等下次再调时才会重新发起）
    refreshPromise.finally(() => { refreshPromise = null })
  }
}

let lastUnauthAt = 0
function handleUnauthorized(message: string) {
  const now = Date.now()
  const recent = now - lastUnauthAt < 5000
  lastUnauthAt = now

  try {
    uni.removeStorageSync('jiujiu_token')
    uni.removeStorageSync('jiujiu_refresh_token')
    uni.removeStorageSync('jiujiu_user')
  } catch {
    /* ignore */
  }

  if (recent) return
  uni.showToast({ title: message || '登录已过期，请重新登录', icon: 'none', duration: 1500 })

  setTimeout(() => {
    try {
      const pages = getCurrentPages?.() || []
      const top = pages[pages.length - 1] as any
      const route = top?.route || top?.$page?.route || ''
      if (route && route.includes('pages/auth/')) return
    } catch {
      /* ignore */
    }
    uni.reLaunch({ url: LOGIN_PATH })
  }, 600)
}

/** 是否是「登录已过期」类的错误码 */
function isAuthExpired(code: number) {
  return code === 401 || code === 2001 || code === 2002
}

export async function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const fullUrl = buildUrl(url, options.params)
  let result = await realRequest<T>(fullUrl, options)

  // 鉴权失败 → 尝试用 refresh token 静默续签后重试一次
  // /auth/refresh 自身失败不再递归
  if (result.code !== 0 && isAuthExpired(result.code) && !url.includes('/auth/refresh')) {
    const ok = await tryRefresh()
    if (ok) {
      result = await realRequest<T>(fullUrl, options)
    }
  }

  if (result.code !== 0) {
    if (isAuthExpired(result.code)) {
      handleUnauthorized(result.message)
      throw new Error(result.message || '登录已过期')
    }
    if (!options.silent) {
      uni.showToast({ title: result.message || '请求失败', icon: 'none', duration: 2000 })
    }
    throw new Error(result.message)
  }

  return result.data as T
}

export const http = {
  get: <T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'params'>,
  ) => request<T>(url, { ...options, method: 'GET', params }),
  post: <T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(url, { ...options, method: 'POST', data }),
  put: <T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(url, { ...options, method: 'PUT', data }),
  patch: <T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'data'>,
  ) => request<T>(url, { ...options, method: 'PATCH', data }),
  del: <T = unknown>(url: string, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(url, { ...options, method: 'DELETE' }),
}
