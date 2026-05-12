/**
 * 网络请求 · 商家端
 *
 * 401 / 2001 / 2002 → 节流 toast + 清 storage + 跳 /pages/auth/login
 */
import { mockMatch } from '@jiujiu/shared/mock'
import type { ApiResult } from '@jiujiu/shared/types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3001'
const MOCK_FLAG = import.meta.env.VITE_USE_MOCK as string | undefined
const USE_MOCK = MOCK_FLAG === 'true' || (import.meta.env.DEV && MOCK_FLAG !== 'false')
const LOGIN_PATH = '/pages/auth/login'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: Record<string, unknown>
  params?: Record<string, unknown>
  headers?: Record<string, string>
  skipMock?: boolean
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
 * 调到 /p/* 会触发 403。dev 模式提前拦截。
 */
const MERCHANT_PUBLIC_ALLOW = new Set([
  '/api/v1/u/categories',
  '/api/v1/u/banners',
  '/api/v1/u/merchant-apply',
  '/api/v1/u/stores/nearby',
])
function guardNamespace(url: string): void {
  // Vite-native env 标志：避免 uni-app 浏览器侧 process 未定义
  if (import.meta.env.PROD) return
  if (!url.startsWith('/api/v1/')) return
  // 白名单（公开接口商家也可调）
  for (const w of MERCHANT_PUBLIC_ALLOW) if (url.startsWith(w)) return
  const path = url.replace(/^\/api\/v1\//, '')
  if (path.startsWith('p/') || path.startsWith('u/')) {
    const msg = `[merchant-app 命名空间错误] 商家端不能调用 ${url}，会触发 403。请改为 /api/v1/m/* 接口。`
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
  let result: ApiResult<T>

  if (USE_MOCK && !options.skipMock) {
    result = await mockMatch<T>({
      method: options.method ?? 'GET',
      url: fullUrl,
      data: options.data,
    })
  } else {
    result = await realRequest<T>(fullUrl, options)
  }

  if (result.code !== 0) {
    if (result.code === 2001 || result.code === 2002 || result.code === 401) {
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
