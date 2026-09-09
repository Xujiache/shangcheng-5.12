import { BizCode, BizException } from '../../common/exceptions/biz.exception'

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'
export type AnalyticsBucket = 'hour' | 'day' | 'month'
const DAY = 86400_000
const OFFSET = 8 * 3600_000

export interface AnalyticsRange {
  period: AnalyticsPeriod
  startDate: string
  endDate: string
  start: Date
  end: Date
  asOf: Date
  bucket: AnalyticsBucket
}

export function businessDate(date: Date): string {
  return new Date(date.getTime() + OFFSET).toISOString().slice(0, 10)
}

function dateOnly(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BizException(BizCode.INVALID_PARAMS, '日期必须为 YYYY-MM-DD')
  }
  const result = new Date(`${value}T00:00:00+08:00`)
  if (
    !Number.isFinite(result.getTime()) ||
    businessDate(result) !== value ||
    value < '0001-01-01'
  ) {
    throw new BizException(BizCode.INVALID_PARAMS, '日期不合法')
  }
  return result
}

export function resolveAnalyticsRange(input: unknown, now = new Date()): AnalyticsRange {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BizException(BizCode.INVALID_PARAMS, '无效的统计条件')
  }
  const q = input as Record<string, unknown>
  const period = q.period ?? 'week'
  if (!['today', 'week', 'month', 'year', 'custom'].includes(period as string)) {
    throw new BizException(BizCode.INVALID_PARAMS, '无效的统计周期')
  }
  const today = businessDate(now)
  const midnight = dateOnly(today)
  let start = midnight
  let endDate = today
  if (period === 'custom') {
    start = dateOnly(q.startDate)
    const last = dateOnly(q.endDate)
    endDate = businessDate(last)
    const days = (last.getTime() - start.getTime()) / DAY + 1
    if (days < 1 || days > 366 || endDate > today) {
      throw new BizException(BizCode.INVALID_PARAMS, '请选择不超过 366 天且不晚于今天的日期范围')
    }
  } else {
    if (q.startDate !== undefined || q.endDate !== undefined || q.date !== undefined) {
      throw new BizException(BizCode.INVALID_PARAMS, '快捷周期不能同时传入自定义日期')
    }
    if (period === 'week') {
      const weekday = new Date(midnight.getTime() + OFFSET).getUTCDay()
      start = new Date(midnight.getTime() - ((weekday + 6) % 7) * DAY)
    } else if (period === 'month') start = dateOnly(`${today.slice(0, 7)}-01`)
    else if (period === 'year') start = dateOnly(`${today.slice(0, 4)}-01-01`)
  }
  const end = new Date(dateOnly(endDate).getTime() + DAY)
  const days = (end.getTime() - start.getTime()) / DAY
  const bucket =
    period === 'year'
      ? 'month'
      : period === 'today'
        ? 'hour'
        : period !== 'custom'
          ? 'day'
          : days === 1
            ? 'hour'
            : days <= 62
              ? 'day'
              : 'month'
  return {
    period: period as AnalyticsPeriod,
    startDate: businessDate(start),
    endDate,
    start,
    end,
    asOf: new Date(Math.min(now.getTime(), end.getTime())),
    bucket,
  }
}

/** ISO instants are stable keys; display labels are localized only by the client. */
export function analyticsBuckets(range: AnalyticsRange): string[] {
  const local = new Date(range.start.getTime() + OFFSET)
  if (range.bucket === 'month') local.setUTCDate(1)
  const result: string[] = []
  let cursor = local.getTime() - OFFSET
  const stop = Math.min(range.end.getTime(), range.asOf.getTime())
  while (cursor < stop) {
    result.push(new Date(cursor).toISOString())
    if (range.bucket === 'month') {
      local.setUTCMonth(local.getUTCMonth() + 1)
      cursor = local.getTime() - OFFSET
    } else cursor += range.bucket === 'hour' ? 3600_000 : DAY
  }
  return result
}
