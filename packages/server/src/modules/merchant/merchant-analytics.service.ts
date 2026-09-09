import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { MerchantAnalytics } from '@jiujiu/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { analyticsBuckets, AnalyticsRange, resolveAnalyticsRange } from './analytics-range'

type RawPoint = { bucketStart: string; amount: string }
type RawProduct = { productId: string; name: string; quantity: string }
type RawCategory = { categoryId: string; name: string; quantity: string }
interface RawAnalytics {
  paidAmount: string
  paidOrderCount: string
  avgOrderValue: string
  refundAmount: string
  totalQuantity: string
  trend: RawPoint[]
  topProducts: RawProduct[]
  categories: RawCategory[]
}

/** One statement gives all sections the same database snapshot, without hydrating orders. */
export function analyticsQuery(merchantId: string, range: AnalyticsRange): Prisma.Sql {
  const start = range.start.toISOString()
  const cutoff = range.asOf.toISOString()
  return Prisma.sql`
    WITH paid AS (
      SELECT id, "payAmount", "paidAt" FROM "Order"
      WHERE "merchantId" = ${merchantId}
        AND "paidAt" >= (${start}::timestamptz AT TIME ZONE 'UTC')
        AND "paidAt" < (${cutoff}::timestamptz AT TIME ZONE 'UTC')
    ), units AS (
      SELECT i."productId", i."productName", i.quantity, p."paidAt", i.id,
        COALESCE(c.id, '') AS "categoryId", COALESCE(c.name, '未分类') AS category
      FROM "OrderItem" i JOIN paid p ON p.id = i."orderId"
      LEFT JOIN "Product" product ON product.id = i."productId"
      LEFT JOIN "Category" c ON c.id = product."categoryId"
    ), trend AS (
      SELECT date_trunc(${range.bucket}, "paidAt" + interval '8 hours') - interval '8 hours' AS bucket,
        SUM("payAmount") AS amount FROM paid GROUP BY bucket
    ), top_products AS (
      SELECT "productId", (array_agg("productName" ORDER BY "paidAt" DESC, id DESC))[1] AS name,
        SUM(quantity) AS quantity FROM units GROUP BY "productId"
      ORDER BY quantity DESC, "productId" ASC
    ), categories AS (
      SELECT "categoryId", category AS name, SUM(quantity) AS quantity FROM units
      GROUP BY "categoryId", category ORDER BY quantity DESC, "categoryId" ASC
    )
    SELECT
      COALESCE(SUM("payAmount"), 0)::text AS "paidAmount",
      COUNT(*)::text AS "paidOrderCount",
      COALESCE(ROUND(AVG("payAmount"), 2), 0)::text AS "avgOrderValue",
      (SELECT COALESCE(SUM("refundAmount"), 0)::text FROM "Refund"
        WHERE "merchantId" = ${merchantId} AND status = 'completed'
          AND "completedAt" >= (${start}::timestamptz AT TIME ZONE 'UTC')
          AND "completedAt" < (${cutoff}::timestamptz AT TIME ZONE 'UTC')) AS "refundAmount",
      (SELECT COALESCE(SUM(quantity), 0)::text FROM units) AS "totalQuantity",
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('bucketStart',
        to_char(bucket, 'YYYY-MM-DD"T"HH24:MI:SS".000Z"'), 'amount', amount::text) ORDER BY bucket), '[]'::jsonb) FROM trend) AS trend,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('productId', "productId", 'name', name,
        'quantity', quantity::text) ORDER BY quantity DESC, "productId"), '[]'::jsonb) FROM top_products) AS "topProducts",
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('categoryId', "categoryId", 'name', name,
        'quantity', quantity::text) ORDER BY quantity DESC, "categoryId"), '[]'::jsonb) FROM categories) AS categories
    FROM paid
  `
}

function money(value: string): number {
  const amount = new Prisma.Decimal(value).toDecimalPlaces(2)
  if (!amount.isFinite() || amount.isNegative() || amount.mul(100).gt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Invalid analytics amount')
  }
  return amount.toNumber()
}
function quantity(value: string): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Invalid analytics quantity')
  return result
}

@Injectable()
export class MerchantAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(merchantId: string, query: unknown): Promise<MerchantAnalytics> {
    const range = resolveAnalyticsRange(query)
    const [raw] = await this.prisma.$queryRaw<RawAnalytics[]>(analyticsQuery(merchantId, range))
    if (!raw) throw new Error('Analytics result missing')
    const points = new Map(raw.trend.map((point) => [point.bucketStart, money(point.amount)]))
    return {
      version: 1,
      period: range.period,
      startDate: range.startDate,
      endDate: range.endDate,
      timeZone: 'Asia/Shanghai',
      asOf: range.asOf.toISOString(),
      granularity: range.bucket,
      paidAmount: money(raw.paidAmount),
      paidOrderCount: quantity(raw.paidOrderCount),
      avgOrderValue: money(raw.avgOrderValue),
      refundAmount: money(raw.refundAmount),
      totalQuantity: quantity(raw.totalQuantity),
      trend: analyticsBuckets(range).map((bucketStart) => ({
        bucketStart,
        amount: points.get(bucketStart) ?? 0,
      })),
      topProducts: raw.topProducts.map((row) => ({ ...row, quantity: quantity(row.quantity) })),
      categories: raw.categories.map((row) => ({ ...row, quantity: quantity(row.quantity) })),
    }
  }
}
