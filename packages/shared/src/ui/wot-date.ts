/** Wot 日期选择器与既有 YYYY-MM-DD 业务字段之间的无损桥接。 */
export function dateStringToTimestamp(value?: string | null): number {
  if (!value) return Date.now()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return Date.now()
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
}

export function timestampToDateString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  const date = new Date(typeof raw === 'number' || typeof raw === 'string' ? raw : Date.now())
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
