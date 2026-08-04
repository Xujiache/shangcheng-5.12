/**
 * 校验工具
 */

/** 手机号 */
export function isPhone(v: string): boolean {
  return /^1[3-9]\d{9}$/.test(v)
}

/** 邮箱 */
export function isEmail(v: string): boolean {
  return /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v)
}

/** 身份证 */
export function isIdCard(v: string): boolean {
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(v)
}

/** 统一社会信用代码 */
export function isCreditCode(v: string): boolean {
  return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(v)
}

/** 是否价格（≥ 0 的两位小数） */
export function isPrice(v: string | number): boolean {
  const num = typeof v === 'string' ? parseFloat(v) : v
  return !isNaN(num) && num >= 0
}

/** 是否非空 */
export function isNotEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  return true
}

/** URL */
export function isUrl(v: string): boolean {
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}
