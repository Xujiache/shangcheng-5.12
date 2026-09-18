export type QueryParams = Record<string, unknown>

function encode(value: unknown): string {
  return encodeURIComponent(String(value))
}

/**
 * 不依赖 URL / URLSearchParams 的查询参数序列化。
 *
 * 部分 Android App WebView 没有 URLSearchParams；这里仅使用 ES5 可用的字符串 API，
 * 保证 uni-app App、H5 和小程序行为一致。数组按重复 key 输出，null/undefined 跳过。
 */
export function stringifyQuery(params?: QueryParams): string {
  if (!params) return ''
  const pairs: string[] = []
  Object.keys(params).forEach((key) => {
    const raw = params[key]
    if (raw === undefined || raw === null) return
    const values = Array.isArray(raw) ? raw : [raw]
    values.forEach((value) => {
      if (value === undefined || value === null) return
      pairs.push(`${encode(key)}=${encode(value)}`)
    })
  })
  return pairs.join('&')
}

export function appendQuery(url: string, params?: QueryParams): string {
  const query = stringifyQuery(params)
  if (!query) return url
  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

/** 轻量查询字符串解析；重复 key 保留最后一个值，符合当前导航参数消费方式。 */
export function parseQuery(query: string): Record<string, string> {
  const result: Record<string, string> = {}
  String(query || '')
    .replace(/^\?/, '')
    .split('&')
    .forEach((part) => {
      if (!part) return
      const index = part.indexOf('=')
      const key = decode(index >= 0 ? part.slice(0, index) : part)
      if (!key) return
      result[key] = decode(index >= 0 ? part.slice(index + 1) : '')
    })
  return result
}
