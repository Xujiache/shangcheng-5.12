import { Prisma } from '@prisma/client'

export type LedgerStatsRange = { from: Date; until: Date }
export type LedgerStatsRow = {
  index: number
  count: string
  revenue: string
  cost: string
  profit: string
}

/** 日期列为 UTC timestamp(3)；显式转换边界，避免数据库 session 时区改变分桶。 */
export function ledgerStatsQuery(userId: string, ranges: LedgerStatsRange[]): Prisma.Sql {
  if (!ranges.length) throw new Error('Ledger stats ranges must not be empty')
  const buckets = ranges.map(
    (range, index) => Prisma.sql`(
    ${index},
    (${range.from.toISOString()}::timestamptz AT TIME ZONE 'UTC'),
    (${range.until.toISOString()}::timestamptz AT TIME ZONE 'UTC')
  )`,
  )
  return Prisma.sql`
    SELECT b.index,
      COUNT(o.id)::text AS count,
      COALESCE(SUM(o.total), 0)::text AS revenue,
      COALESCE(SUM(o."costAmount"), 0)::text AS cost,
      COALESCE(SUM(o."profitAmount"), 0)::text AS profit
    FROM (VALUES ${Prisma.join(buckets)}) AS b(index, start_at, end_at)
    LEFT JOIN "LedgerOrder" o ON o."userId" = ${userId}
      AND o.date >= b.start_at AND o.date < b.end_at
    GROUP BY b.index ORDER BY b.index
  `
}
