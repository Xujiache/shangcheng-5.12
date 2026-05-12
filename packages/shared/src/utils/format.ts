/**
 * 格式化工具（全端共用）
 *
 * 时区：所有日期/时间统一显示为北京时间（Asia/Shanghai · UTC+8），不依赖客户端时区。
 *
 * - 后端返回的 ISO 时间（带 Z 或 +08:00）→ 自动转北京时间显示
 * - 客户端本地时间（new Date()）→ 通过 .tz('Asia/Shanghai') 强制对齐到 +08:00
 *
 * 使用：formatDate / formatDateTime / formatRelative / nowBeijing
 */
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')
// 默认时区设置为北京时间（在某些 dayjs 构建里这个 API 不存在 → 容错）
try {
  // @ts-ignore
  if (typeof dayjs.tz?.setDefault === 'function') dayjs.tz.setDefault('Asia/Shanghai')
} catch {}

/** 北京时区常量 */
export const BEIJING_TZ = 'Asia/Shanghai'

/** 将任意输入转换为北京时间的 dayjs 对象 */
function bj(date: string | number | Date | undefined | null) {
  if (date === undefined || date === null || date === '') {
    return dayjs().tz(BEIJING_TZ)
  }
  return dayjs(date).tz(BEIJING_TZ)
}

/** 当前北京时间（dayjs 对象） */
export function nowBeijing() {
  return dayjs().tz(BEIJING_TZ)
}

/** 当前北京时间（毫秒时间戳） */
export function nowBeijingMs(): number {
  return dayjs().tz(BEIJING_TZ).valueOf()
}

/** 金额格式化（带千分位）*/
export function formatMoney(value: number | string | null | undefined, options?: { prefix?: string; fraction?: number }): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value as number)
  if (value === null || value === undefined || isNaN(num as number)) return options?.prefix ? `${options.prefix}0.00` : '0.00'
  const fraction = options?.fraction ?? 2
  const formatted = (num as number).toFixed(fraction).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return options?.prefix ? `${options.prefix}${formatted}` : formatted
}

/** ¥ 前缀简写 */
export function formatPrice(value: number | string | null | undefined): string {
  return formatMoney(value, { prefix: '¥' })
}

/** 万元简写：12345 → "1.23万"，安全处理 undefined/null */
export function formatWan(value: number | null | undefined): string {
  const v = Number(value)
  if (value === null || value === undefined || isNaN(v)) return '0'
  if (v < 10000) return v.toString()
  return (v / 10000).toFixed(v < 1_000_000 ? 2 : 1) + '万'
}

/** k 简写：1234 → "1.2K" */
export function formatK(value: number | null | undefined): string {
  const v = Number(value)
  if (value === null || value === undefined || isNaN(v)) return '0'
  if (v < 1000) return v.toString()
  if (v < 1_000_000) return (v / 1000).toFixed(1) + 'K'
  return (v / 1_000_000).toFixed(1) + 'M'
}

/** 日期格式化（北京时间） */
export function formatDate(date: string | number | Date, pattern = 'YYYY-MM-DD'): string {
  return bj(date).format(pattern)
}

/** 完整时间（北京时间，到秒） */
export function formatDateTime(date: string | number | Date): string {
  return bj(date).format('YYYY-MM-DD HH:mm:ss')
}

/** 简短时间（北京时间，到分钟） */
export function formatTime(date: string | number | Date): string {
  return bj(date).format('HH:mm')
}

/** 相对时间：3 分钟前（基于北京时间计算） */
export function formatRelative(date: string | number | Date): string {
  return bj(date).fromNow()
}

/**
 * 计算到目标时间还剩多少天（向下取整 · 北京时间口径）
 * - 返回 0 → 今天即将到期
 * - 返回 -1 → 已过期 1 天
 */
export function daysUntil(target: string | number | Date | undefined | null): number {
  if (!target) return 0
  const now = nowBeijing()
  const end = bj(target)
  return end.diff(now, 'day')
}

/**
 * 计算从起始到目标共多少天
 */
export function daysBetween(start: string | number | Date, end: string | number | Date): number {
  return bj(end).diff(bj(start), 'day')
}

/** 倒计时（秒）→ "14:52" */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** 手机号脱敏 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/** 文本省略 */
export function ellipsis(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

/** 百分比 */
export function formatPercent(value: number, fraction = 0): string {
  return (value * 100).toFixed(fraction) + '%'
}
