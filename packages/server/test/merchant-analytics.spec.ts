import { resolveAnalyticsRange, analyticsBuckets } from '../src/modules/merchant/analytics-range'
import {
  analyticsQuery,
  MerchantAnalyticsService,
} from '../src/modules/merchant/merchant-analytics.service'
import { PrismaService } from '../src/prisma/prisma.service'

const now = new Date('2026-09-09T10:23:00.000Z')
describe('isolated paid analytics', () => {
  afterEach(() => jest.useRealTimers())
  it.each([
    ['today', '2026-09-09', 'hour'],
    ['week', '2026-09-07', 'day'],
    ['month', '2026-09-01', 'day'],
    ['year', '2026-01-01', 'month'],
  ])('uses Beijing natural %s boundaries', (period, start, bucket) => {
    const r = resolveAnalyticsRange({ period }, now)
    expect(r.startDate).toBe(start)
    expect(r.endDate).toBe('2026-09-09')
    expect(r.bucket).toBe(bucket)
    expect(r.start.getTime()).toBe(Date.parse(`${start}T00:00:00+08:00`))
  })
  it('handles Sunday, Monday, year boundary and leap-day ranges', () => {
    expect(
      resolveAnalyticsRange({ period: 'week' }, new Date('2026-09-06T15:59:59Z')).startDate,
    ).toBe('2026-08-31')
    expect(
      resolveAnalyticsRange({ period: 'week' }, new Date('2026-09-06T16:00:00Z')).startDate,
    ).toBe('2026-09-07')
    expect(resolveAnalyticsRange({ period: 'week' }, new Date('2026-09-06T17:00:00Z')).bucket).toBe(
      'day',
    )
    expect(
      resolveAnalyticsRange({ period: 'month' }, new Date('2026-08-31T17:00:00Z')).bucket,
    ).toBe('day')
    expect(
      resolveAnalyticsRange({ period: 'year' }, new Date('2025-12-31T16:00:00Z')).startDate,
    ).toBe('2026-01-01')
    expect(
      resolveAnalyticsRange(
        { period: 'custom', startDate: '2024-01-01', endDate: '2024-12-31' },
        now,
      ).bucket,
    ).toBe('month')
    const single = resolveAnalyticsRange(
      { period: 'custom', startDate: '2024-02-29', endDate: '2024-02-29' },
      now,
    )
    expect(analyticsBuckets(single)).toHaveLength(24)
    expect(single.start.toISOString()).toBe('2024-02-28T16:00:00.000Z')
    expect(
      resolveAnalyticsRange(
        { period: 'custom', startDate: '2019-12-31', endDate: '2020-01-01' },
        now,
      ).startDate,
    ).toBe('2019-12-31')
    expect(single.end.toISOString()).toBe('2024-02-29T16:00:00.000Z')
  })
  it.each([
    { period: 'bad' },
    { period: ['week'] },
    { period: 'week', date: '2026-01-01' },
    { period: 'custom', startDate: '2026-02-30', endDate: '2026-03-01' },
    { period: 'custom', startDate: '2026-09-10', endDate: '2026-09-10' },
    { period: 'custom', startDate: '2026-09-02', endDate: '2026-09-01' },
    { period: 'custom', startDate: '2024-01-01', endDate: '2025-01-01' },
  ])('rejects invalid or ambiguous dates: %p', (q) =>
    expect(() => resolveAnalyticsRange(q, now)).toThrow(),
  )
  it('produces monthly rather than twelve daily year buckets', () => {
    const buckets = analyticsBuckets(resolveAnalyticsRange({ period: 'year' }, now))
    expect(buckets).toHaveLength(9)
    expect(buckets[0]).toBe('2025-12-31T16:00:00.000Z')
    expect(buckets[8]).toBe('2026-08-31T16:00:00.000Z')
  })
  it('parameterizes ownership and both payment/refund ranges without creation-time filtering', () => {
    const query = analyticsQuery("owner'--", resolveAnalyticsRange({ period: 'week' }, now))
    expect(query.text).not.toContain("owner'--")
    expect(query.values.filter((v) => v === "owner'--")).toHaveLength(2)
    expect(query.text).toContain('"paidAt" >=')
    expect(query.text).toContain('"completedAt" >=')
    expect(query.text).toContain("status = 'completed'")
    expect(query.text).not.toContain('"createdAt"')
    expect(query.text).not.toContain('refundAmount" FROM paid')
  })
  it('keeps cents, independent refunds and fills only elapsed trend buckets', async () => {
    jest.useFakeTimers().setSystemTime(now)
    const $queryRaw = jest.fn().mockResolvedValue([
      {
        paidAmount: '10.35',
        paidOrderCount: '2',
        avgOrderValue: '5.18',
        refundAmount: '99.99',
        totalQuantity: '3',
        trend: [{ bucketStart: '2026-09-06T16:00:00.000Z', amount: '10.35' }],
        topProducts: [{ productId: 'p1', name: 'Product', quantity: '3' }],
        categories: [{ categoryId: '', name: '未分类', quantity: '3' }],
      },
    ])
    const service = new MerchantAnalyticsService({ $queryRaw } as unknown as PrismaService)
    const result = await service.overview('owner', { period: 'week' })
    expect(result.paidAmount).toBe(10.35)
    expect(result.avgOrderValue).toBe(5.18)
    expect(result.refundAmount).toBe(99.99)
    expect(result.trend).toHaveLength(3)
    expect(result.trend.reduce((sum, p) => sum + p.amount, 0)).toBe(result.paidAmount)
    expect(result.categories[0].quantity).toBe(3)
    expect($queryRaw).toHaveBeenCalledTimes(1)
  })
})
