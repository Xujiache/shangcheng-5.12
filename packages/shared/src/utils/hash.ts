/**
 * 哈希工具：用于灰度分桶等
 */

/** 字符串 → 0-99 之间的整数 hash（用于灰度分桶） */
export function hashToPercent(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 100
}

/** 判断某商户是否命中灰度 */
export function isInGray(merchantId: string, grayPercent: number): boolean {
  if (grayPercent >= 100) return true
  if (grayPercent <= 0) return false
  return hashToPercent(merchantId) < grayPercent
}
