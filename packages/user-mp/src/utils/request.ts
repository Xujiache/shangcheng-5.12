/**
 * 网络请求 · 用户端
 *
 * 仅连接真实后端，不再保留 mock 拦截层。
 *
 * 401 / 2001 / 2002（未登录 / Token 过期 / 鉴权失败）处理：
 *  - 清 token + user store
 *  - 节流 toast（5s 内只弹一次，避免连环弹）
 *  - reLaunch 跳登录页
 *  - throw 后让调用方 catch 即可，不再继续业务
 */
import type { ApiResult } from '@jiujiu/shared/types'

// uni-app mp-weixin build 不会把 .env.production 的 VITE_* 注入到产物里
// （H5 会，mp-weixin 不会——uni-app quirk），所以 prod 时写死 https://ewsn.top 兜底。
const BASE_URL =
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
  const parts: string[] = []
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  })
  if (parts.length === 0) return url
  return `${url}${url.includes('?') ? '&' : '?'}${parts.join('&')}`
}

/**
 * 命名空间守卫（dev 模式）
 *
 * 用户端只允许调：
 *  - /api/v1/u/*       用户端私有
 *  - /api/v1/auth/*    全端共享认证
 *  - /api/v1/files/*   全端共享文件
 *  - 非 /api/v1/* 的资源 URL
 */
function guardNamespace(url: string): void {
  if (import.meta.env.PROD) return
  if (!url.startsWith('/api/v1/')) return
  const path = url.replace(/^\/api\/v1\//, '')
  if (path.startsWith('m/') || path.startsWith('p/')) {
    const msg = `[user-mp 命名空间错误] 用户端不能调用 ${url}，会触发 403。请改为 /api/v1/u/* 接口。`
    console.error(msg, new Error('stacktrace'))
    throw new Error(msg)
  }
}

function getToken(): string | null {
  try {
    return uni.getStorageSync('jiujiu_token') || null
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

export async function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const fullUrl = buildUrl(url, options.params)
  const result = await realRequest<T>(fullUrl, options)

  if (result.code !== 0) {
    if (result.code === 2001 || result.code === 2002 || result.code === 401) {
      handleUnauthorized(result.message)
      throw new Error(result.message || '登录已过期')
    }
    if (!options.silent) {
      uni.showToast({
        title: result.message || '请求失败',
        icon: 'none',
        duration: 2000,
      })
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
