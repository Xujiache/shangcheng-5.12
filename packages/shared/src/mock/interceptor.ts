/**
 * Mock 路由拦截器（uni-app / 浏览器 fetch 通用）
 *
 * 使用方式：
 *   import { mockMatch, registerMockRoutes } from '@jiujiu/shared/mock'
 *   registerMockRoutes(routes)
 *   const result = await mockMatch({ method, url, data })
 */

import type { ApiResult, Pagination } from '../types/common'

export type MockHandler<T = unknown> = (ctx: MockContext) => T | Promise<T>

export interface MockRoute<T = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** path 支持 :param 占位符，如 /products/:id */
  path: string
  handler: MockHandler<T>
  /** 模拟延迟（ms） */
  delay?: number
}

export interface MockContext {
  method: string
  url: string
  /** path 参数 */
  params: Record<string, string>
  /** query 参数 */
  query: Record<string, string>
  /** request body */
  body: Record<string, unknown>
  headers: Record<string, string>
}

export interface MockRequest {
  method: string
  url: string
  data?: Record<string, unknown>
  headers?: Record<string, string>
}

const routes: MockRoute[] = []

/** 注册 mock 路由 */
export function registerMockRoutes(list: MockRoute[]): void {
  routes.push(...list)
}

/** 清空已注册路由（测试用） */
export function clearMockRoutes(): void {
  routes.length = 0
}

/** 解析 URL：分离 path 和 query */
function parseUrl(rawUrl: string): { path: string; query: Record<string, string> } {
  const [path, queryString = ''] = rawUrl.split('?')
  const query: Record<string, string> = {}
  queryString.split('&').filter(Boolean).forEach((kv) => {
    const [k, v] = kv.split('=')
    query[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
  })
  return { path, query }
}

/** 路由匹配 */
function matchRoute(route: MockRoute, method: string, path: string): Record<string, string> | null {
  if (route.method.toUpperCase() !== method.toUpperCase()) return null
  const routeSegments = route.path.split('/').filter(Boolean)
  const pathSegments = path.split('/').filter(Boolean)
  if (routeSegments.length !== pathSegments.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < routeSegments.length; i++) {
    const r = routeSegments[i]
    const p = pathSegments[i]
    if (r.startsWith(':')) {
      params[r.slice(1)] = p
    } else if (r !== p) {
      return null
    }
  }
  return params
}

/** 主入口：根据请求匹配并执行 mock */
export async function mockMatch<T = unknown>(req: MockRequest): Promise<ApiResult<T>> {
  const { path, query } = parseUrl(req.url)
  for (const route of routes) {
    const params = matchRoute(route, req.method, path)
    if (params) {
      const ctx: MockContext = {
        method: req.method,
        url: req.url,
        params,
        query,
        body: req.data ?? {},
        headers: req.headers ?? {},
      }
      if (route.delay) {
        await new Promise((r) => setTimeout(r, route.delay))
      }
      const data = await route.handler(ctx)
      return {
        code: 0,
        data: data as T,
        message: 'ok',
        traceId: 'mock-' + Date.now().toString(36),
        timestamp: Date.now(),
      }
    }
  }
  return {
    code: 1002,
    data: null,
    message: `Mock route not found: ${req.method} ${path}`,
    traceId: 'mock-' + Date.now().toString(36),
  }
}

/** 工具：构造分页响应 */
export function paginate<T>(list: T[], query: Record<string, string>): Pagination<T> {
  const page = parseInt(query.page ?? '1', 10) || 1
  const pageSize = parseInt(query.pageSize ?? '20', 10) || 20
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
    hasMore: start + pageSize < list.length,
  }
}
