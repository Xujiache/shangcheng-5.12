/**
 * ID 生成
 */
const ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-'

/** 通用短 ID */
export function genId(size = 12): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(size))
    return Array.from(bytes, (byte) => ID_ALPHABET[byte & 63]).join('')
  }

  return Array.from(
    { length: size },
    () => ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)],
  ).join('')
}

/** 订单号：P + yyyyMMddHHmmss + 4 位随机数 */
export function genOrderNo(prefix = 'P'): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  const r = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${y}${m}${day}${hh}${mm}${ss}${r}`
}

/** 退款单号 */
export function genRefundNo(): string {
  return genOrderNo('RF')
}

/** 提现单号 */
export function genWithdrawNo(): string {
  return genOrderNo('W')
}

/** 缴费单号 */
export function genPayOrderNo(): string {
  return genOrderNo('M')
}
