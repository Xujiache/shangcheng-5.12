/**
 * 网络请求 · 含 Mock 拦截器、统一错误处理、token 注入
 *
 * 401 / 2001 / 2002（未登录 / Token 过期 / 鉴权失败）处理：
 *  - 清 token + user store
 *  - 节流 toast（5s 内只弹一次，避免连环弹）
 *  - reLaunch 跳登录页
 *  - throw 后让调用方 catch 即可，不再继续业务
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
 * 命名空间守卫（dev 模式）
 *
 * 用户端只允许调：
 *  - /api/v1/u/*       用户端私有
 *  - /api/v1/auth/*    全端共享认证
 *  - /api/v1/files/*   全端共享文件
 *  - 非 /api/v1/* 的资源 URL
 *
 * 调到 /m/* 或 /p/* 会触发 403 "权限不足"。这里在请求前就拦截 + 打印调用栈，避免再发生此类问题。
 */
function guardNamespace(url: string): void {
  // Vite-native env 标志：避免 uni-app 浏览器侧 process 未定义
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
    // uni-app 的 RequestOptions['method'] 不含 PATCH，但 HTTP 标准支持。as any 透传，
    // h5 端走 XHR 没问题；mp 端如需 PATCH 由 mock 拦截层处理。
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
        // HTTP 401 但响应体非 ApiResult 形态（例如网关层）：构造一个伪 ApiResult
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

/** 401 防抖：同一 5s 内重复 401 不再 toast / 跳转 */
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
    // 当前已经在登录页则不重复跳
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
    // 鉴权失败：统一跳登录页 + 节流
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
