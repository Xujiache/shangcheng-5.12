/**
 * 门窗利账 · 运行配置
 *
 * API_BASE：后端基址（不含 /api/v1，request 工具会补 /api/v1/l/*）。
 * 生产环境：业务与格式转换请求均使用统一 HTTPS 后端。
 */
export const API_BASE = 'https://ewsn.top'
export const CONVERSION_API_BASE = API_BASE
export const LOCAL_CONVERSION_TEST = false

export const LEDGER_AVATAR_HUES = ['teal', 'blue', 'gold', 'rust', 'olive', 'violet'] as const
export type LedgerAvatarHue = (typeof LEDGER_AVATAR_HUES)[number]
const AVATAR_IMAGE_RE = /^\/api\/v1\/l\/avatar-image\/[a-zA-Z0-9_-]{8,64}$/
const AVATAR_IMAGE_PREFIX = '/api/v1/l/avatar-image/'
export function isAvatarImage(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false
  const v = value.trim()
  return AVATAR_IMAGE_RE.test(v) || v.startsWith(API_BASE + AVATAR_IMAGE_PREFIX) && AVATAR_IMAGE_RE.test(v.slice(API_BASE.length))
}
export function avatarImageSrc(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const v = value.trim()
  if (AVATAR_IMAGE_RE.test(v)) return API_BASE + v
  if (v.startsWith(API_BASE + AVATAR_IMAGE_PREFIX) && AVATAR_IMAGE_RE.test(v.slice(API_BASE.length))) return v
  return ''
}
export function ledgerAvatarLetter(value: string | null | undefined): string {
  const text = String(value || '').trim()
  return text ? text.charAt(0).toUpperCase() : '账'
}

/** access token 在本地存储的键名 */
export const TOKEN_KEY = 'ledger_token'

/**
 * 应用版本号（与发版号同步）
 * - release/trial 环境优先用 wx.getAccountInfoSync().miniProgram.version
 * - develop 环境该值为空，回退到此常量
 */
export const VERSION = '1.0.2'
