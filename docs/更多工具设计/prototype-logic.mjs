const DIGITS = '零壹贰叁肆伍陆柒捌玖'
const SMALL_UNITS = ['', '拾', '佰', '仟']
const GROUP_UNITS = ['', '万', '亿']

function fourDigits(value) {
  const digits = String(value).padStart(4, '0')
  let result = ''
  let zero = false
  for (let i = 0; i < 4; i++) {
    const digit = Number(digits[i])
    if (digit === 0) {
      zero = result !== ''
    } else {
      if (zero) result += '零'
      result += DIGITS[digit] + SMALL_UNITS[3 - i]
      zero = false
    }
  }
  return result
}

function integerUppercase(integer) {
  if (integer === '0') return '零'
  const groups = []
  for (let end = integer.length; end > 0; end -= 4) {
    groups.unshift(Number(integer.slice(Math.max(0, end - 4), end)))
  }
  let result = ''
  let gap = false
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    if (group === 0) {
      gap = result !== ''
      continue
    }
    if (result && (gap || group < 1000)) result += '零'
    result += fourDigits(group) + GROUP_UNITS[groups.length - i - 1]
    gap = false
  }
  return result
}

export function toRmbUppercase(amountText) {
  if (typeof amountText !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(amountText)) {
    return { ok: false, error: '请输入最多两位小数的非负金额' }
  }
  const [rawInteger, rawFraction = ''] = amountText.replaceAll(',', '').split('.')
  const integer = rawInteger.replace(/^0+(?=\d)/, '')
  if (integer.length > 12 || (integer.length === 12 && integer > '999999999999')) {
    return { ok: false, error: '金额不能超过 999999999999.99' }
  }
  const fraction = rawFraction.replace(/0+$/, '')
  const normalized = integer + (fraction ? '.' + fraction : '')
  const [jiao = '0', fen = '0'] = rawFraction.padEnd(2, '0')
  let uppercase = integerUppercase(integer) + '元'
  if (jiao === '0' && fen === '0') uppercase += '整'
  else {
    if (jiao !== '0') uppercase += DIGITS[Number(jiao)] + '角'
    if (fen !== '0') uppercase += (jiao === '0' ? '零' : '') + DIGITS[Number(fen)] + '分'
  }
  return { ok: true, normalized, uppercase }
}

function parseDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [year, month, day] = iso.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null
  return { year, month, day, time: date.getTime() }
}

function addCalendarMonths(start, months) {
  const monthIndex = start.year * 12 + start.month - 1 + months
  const year = Math.floor(monthIndex / 12)
  const month = (monthIndex % 12) + 1
  const lastDay = new Date(0)
  lastDay.setUTCFullYear(year, month, 0)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, Math.min(start.day, lastDay.getUTCDate()))
  date.setUTCHours(0, 0, 0, 0)
  return date.getTime()
}

export function dateCountdown(targetISO, todayISO) {
  const target = parseDate(targetISO)
  const today = parseDate(todayISO)
  if (!target || !today) return { ok: false, error: '请输入有效的 YYYY-MM-DD 日期' }
  if (target.time <= today.time) {
    return { ok: true, years: 0, months: 0, days: 0, totalDays: 0, reached: true }
  }
  const totalDays = Math.round((target.time - today.time) / 86400000)
  let years = target.year - today.year
  if (addCalendarMonths(today, years * 12) > target.time) years--
  let months = 0
  while (months < 11 && addCalendarMonths(today, years * 12 + months + 1) <= target.time) months++
  const days = Math.round((target.time - addCalendarMonths(today, years * 12 + months)) / 86400000)
  return { ok: true, years, months, days, totalDays, reached: false }
}
