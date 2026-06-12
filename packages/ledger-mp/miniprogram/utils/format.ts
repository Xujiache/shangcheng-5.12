// 金额 / 日期格式化（与设计 data.jsx 口径一致，避免依赖 toLocaleString 在真机的不一致）

function group(v: number): string {
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** ¥1,234；bare=true 去掉符号；负数前置 - */
export function yuan(n: number, bare = false): string {
  const neg = n < 0
  const v = Math.abs(Math.round(n || 0))
  const s = group(v)
  return (neg ? '-' : '') + (bare ? s : '¥' + s)
}

/** 轴用紧凑格式：2.4万 / 1.2k */
export function wan(n: number): string {
  const v = Math.abs(n || 0)
  if (v >= 10000) return (n / 10000).toFixed(v >= 100000 ? 0 : 1) + '万'
  if (v >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(Math.round(n || 0))
}

/** Date/ISO → YYYY-MM-DD */
export function ymd(d: string | Date): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return typeof d === 'string' ? d.slice(0, 10) : ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ISO → 2026年06月08日 */
export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
}

/** 百分比文本，1 位小数 */
export function pct(n: number, digits = 0): string {
  return (n * 100).toFixed(digits) + '%'
}

/** 隐藏金额模式下的统一掩码（与设置页「隐藏金额」联动） */
export function maskMoney(v: number | string): string {
  return '****'
}
