/**
 * 网络请求 · 用户端
 *
 * 仅连接真实后端，不再保留 mock 拦截层。
 *
 * 401 / 2001 / 2002（未登录 / Token 过期 / 鉴权失败）处理：
 *  - 优先用 refresh token 静默续签 access token，成功则透明重试原请求
 *  - refresh 失败再清 token + user store
 *  - 节流 toast（5s 内只弹一次，避免连环弹）
 *  - reLaunch 跳登录页
 *  - throw 后让调用方 catch 即可，不再继续业务
 */
import type { ApiResult } from '@jiujiu/shared/types'
import { createSessionCoordinator, LoginExpiredError } from '@jiujiu/shared/utils'

// 后端统一入口 https://ewsn.top —— 不再支持本地 server,
// .env 缺失 / uni-app mp-weixin 注入失败 / build 模式不匹配等任何场景,
// 都直接走线上,避免一切"连不上 localhost:3001"类故障。
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'https://ewsn.top'
const LOGIN_PATH = '/pages/auth/login'

const TOKEN_KEY = 'jiujiu_token'
const REFRESH_KEY = 'jiujiu_refresh_token'

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
      timeout: 18000,
      method: (options.method ?? 'GET') as any,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      success: (res) => {
        const status = res.statusCode
        if (status >= 500) {
          reject(new Error('服务暂时不可用，请稍后重试'))
          return
        }
        if (status === 401) {
          resolve({
            code: 2001,
            data: null,
            message: '登录已过期',
            msg: '登录已过期',
            traceId: '',
            timestamp: Date.now(),
          } as ApiResult<T>)
          return
        }
        const body = res.data as Partial<ApiResult<T>> | null
        if (
          !body ||
          typeof body.code !== 'number' ||
          !Object.prototype.hasOwnProperty.call(body, 'data')
        ) {
          reject(new Error('服务响应异常，请稍后重试'))
          return
        }
        if ((status < 200 || status >= 300) && body.code === 0) {
          reject(new Error('服务响应异常，请稍后重试'))
          return
        }
        resolve(body as ApiResult<T>)
      },
      fail: (err) => reject(err),
    })
  })
}

/**
 * 用 refresh token 静默续签 access token。
 *
 * 并发请求只触发一次 refresh —— refreshPromise 复用同一个 in-flight Promise，
 * 避免 N 个并发请求同时打 N 次 /auth/refresh。
 *
 * 成功后把新的 token 写回 storage（下次 getToken() 就能拿到）。
 * 仅凭据失效返回 false；网络或服务故障保留登录状态。
 */
const session = createSessionCoordinator(() => ({
  accessToken: getToken(),
  refreshToken: getRefreshToken(),
}))
async function tryRefresh(epoch: number, sentAccessToken: string | null): Promise<boolean> {
  try {
    await session.refresh(
      epoch,
      (refreshToken) =>
        new Promise((resolve, reject) => {
          uni.request({
            url: BASE_URL + '/api/v1/auth/refresh',
            method: 'POST',
            timeout: 15000,
            data: { refreshToken },
            success: (res) => {
              const result = res.data as ApiResult<{ accessToken: string; refreshToken: string }>
              if (res.statusCode >= 500) {
                reject(new Error('登录续期暂时不可用，请稍后重试'))
              } else if (res.statusCode === 401 || isAuthExpired(result?.code)) {
                reject(new LoginExpiredError('登录已过期'))
              } else if (
                res.statusCode === 200 &&
                result?.code === 0 &&
                result.data?.accessToken &&
                result.data?.refreshToken
              ) {
                resolve(result.data)
              } else {
                reject(new Error('登录续期暂时不可用，请稍后重试'))
              }
            },
            fail: () => reject(new Error('网络连接失败，请检查网络后重试')),
          })
        }),
      (tokens) => {
        uni.setStorageSync(TOKEN_KEY, tokens.accessToken)
        uni.setStorageSync(REFRESH_KEY, tokens.refreshToken)
      },
      sentAccessToken,
    )
    return true
  } catch (error) {
    if (error instanceof LoginExpiredError) return false
    throw error
  }
}

let lastUnauthAt = 0
function handleUnauthorized(message: string) {
  const now = Date.now()
  const recent = now - lastUnauthAt < 5000
  lastUnauthAt = now

  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(REFRESH_KEY)
    uni.removeStorageSync('jiujiu_user')
  } catch {
    /* ignore */
  }

  if (recent) return

  uni.showToast({ title: message || '登录已过期，请重新登录', icon: 'none', duration: 1500 })

  setTimeout(() => {
    if (getToken()) return
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
  const epoch = session.capture()
  const sentAccessToken = getToken()
  const fullUrl = buildUrl(url, options.params)
  let result = await realRequest<T>(fullUrl, options)
  session.assertCurrent(epoch)

  // 鉴权失败 → 尝试用 refresh token 静默续签后重试一次
  // /auth/refresh 自身失败不再递归（否则会死循环）
  if (result.code !== 0 && isAuthExpired(result.code) && !url.includes('/auth/refresh')) {
    const ok = await tryRefresh(epoch, sentAccessToken)
    session.assertCurrent(epoch)
    if (ok) {
      result = await realRequest<T>(fullUrl, options)
      session.assertCurrent(epoch)
    }
  }

  if (result.code !== 0) {
    if (isAuthExpired(result.code)) {
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
