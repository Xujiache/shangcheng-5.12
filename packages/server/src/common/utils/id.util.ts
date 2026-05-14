import { customAlphabet } from 'nanoid'

const nano = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 12)

export function orderNo(prefix = 'O') {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${prefix}${ymd}${nano()}`
}

export function refundNo() { return orderNo('R') }
export function withdrawNo() { return orderNo('W') }
export function payNo() { return orderNo('P') }
/** 会员订阅缴费单号；带 MEM 前缀让 wxpay 回调能识别为会员订阅而非普通订单 */
export function membershipNo() { return orderNo('MEM') }
