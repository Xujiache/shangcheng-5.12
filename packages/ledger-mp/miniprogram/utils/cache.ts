// 读接口本地缓存（network-first + 离线兜底）：请求成功写入；无网/5xx/超时回退上次数据。
// 仅缓存读接口成功响应。退出登录/换账号清空全部，避免跨账号脏读。带版本号与单条容量上限。
const PREFIX = 'lc:' // ledger read-cache 命名空间
const VERSION = 1 // 缓存结构版本；改结构时 +1，旧缓存自动作废
const MAX_BYTES = 256 * 1024 // 单条上限（wx 单 key 上限 1MB，留足余量）

interface CacheEntry<T> {
  v: number
  t: number // 写入时间戳(ms)
  data: T
}

/** 读缓存：命中且版本一致返回 { t, data }；否则 null */
export function readCache<T = any>(key: string): { t: number; data: T } | null {
  try {
    const raw = wx.getStorageSync(PREFIX + key) as CacheEntry<T>
    if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return null
    return { t: raw.t, data: raw.data }
  } catch (e) {
    return null
  }
}

/** 写缓存：超大响应直接跳过，避免占满存储 */
export function writeCache<T = any>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { v: VERSION, t: Date.now(), data }
    if (JSON.stringify(entry).length > MAX_BYTES) return
    wx.setStorageSync(PREFIX + key, entry)
  } catch (e) {
    /* 存储满/序列化失败：静默放弃，不影响主流程 */
  }
}

/** 按前缀失效：清掉匹配任一前缀的缓存（如 '/l/orders' 命中 列表/详情/带查询串） */
export function invalidateCache(prefixes: string | string[]): void {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes]
  try {
    const keys = (wx.getStorageInfoSync().keys || []) as string[]
    keys.forEach((k) => {
      if (k.indexOf(PREFIX) !== 0) return
      const sub = k.slice(PREFIX.length)
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
      if (k.indexOf(PREFIX) === 0) wx.removeStorageSync(k)
    })
  } catch (e) {
    /* ignore */
  }
}
