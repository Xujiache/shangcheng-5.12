/**
 * 门窗利账 · 运行配置
 *
 * API_BASE：后端基址（不含 /api/v1，request 工具会补 /api/v1/l/*）。
 * 生产环境：业务与格式转换请求均使用统一 HTTPS 后端。
 */
function developmentApiBase() {
  try {
    if (typeof wx === 'undefined' || wx.getAccountInfoSync().miniProgram.envVersion !== 'develop') return ''
    const saved = String(wx.getStorageSync('ledger_local_api_base') || '').replace(/\/$/, '')
    if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d{2,5}$/.test(saved))
      return saved
    return 'http://127.0.0.1:3001'
  } catch { return '' }
}
export const API_BASE = developmentApiBase() || 'https://ewsn.top'
export const CONVERSION_API_BASE = API_BASE
export const LOCAL_CONVERSION_TEST = false

const AVATAR_IMAGE_PREFIX = '/api/v1/l/avatar-image/'
export function isAvatarImage(value: string): boolean {
  return /^https?:\/\//.test(value) || value.startsWith(AVATAR_IMAGE_PREFIX)
}
export function avatarImageSrc(value: string): string {
  return value.startsWith(AVATAR_IMAGE_PREFIX) ? API_BASE + value : value
}

/** access token 在本地存储的键名 */
export const TOKEN_KEY = 'ledger_token'

/**
 * 应用版本号（与发版号同步）
 * - release/trial 环境优先用 wx.getAccountInfoSync().miniProgram.version
 * - develop 环境该值为空，回退到此常量
 */
export const VERSION = '1.0.2'
