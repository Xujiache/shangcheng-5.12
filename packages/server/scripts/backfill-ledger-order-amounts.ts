import { PrismaClient } from '@prisma/client'
import { revenueOf, totalCost } from '../src/modules/ledger/ledger.constants'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const verify = process.argv.includes('--verify')
const sizeArg = process.argv.find((arg) => arg.startsWith('--batch-size='))
const batchSize = Math.min(500, Math.max(1, Number(sizeArg?.split('=')[1]) || 200))

async function main() {
  let cursor: string | undefined
  let scanned = 0
  let changed = 0
  let mismatches = 0
  do {
    const rows = await prisma.ledgerOrder.findMany({
      where: verify
        ? cursor
          ? { id: { gt: cursor } }
          : {}
        : {
            ...(cursor ? { id: { gt: cursor } } : {}),
            OR: [{ revenueAmount: null }, { costAmount: null }, { profitAmount: null }],
          },
      orderBy: { id: 'asc' },
      take: batchSize,
      select: {
        id: true,
        total: true,
        costProfile: true,
        costGlass: true,
        costHardware: true,
        costLabor: true,
        costScreen: true,
        extras: true,
        customCosts: true,
        revenueAmount: true,
        costAmount: true,
        profitAmount: true,
      },
    })
    if (!rows.length) break
    for (const row of rows) {
      const revenueAmount = revenueOf(row)
      const costAmount = totalCost(row)
      const profitAmount = revenueAmount - costAmount
      const matches =
        row.revenueAmount === BigInt(revenueAmount) &&
        row.costAmount === BigInt(costAmount) &&
        row.profitAmount === BigInt(profitAmount)
      if (!matches) {
        mismatches++
        if (mismatches <= 10) console.error(`mismatch id=${row.id}`)
        if (apply && !verify) {
          const result = await prisma.ledgerOrder.updateMany({
            where: {
              id: row.id,
              OR: [{ revenueAmount: null }, { costAmount: null }, { profitAmount: null }],
            },
            data: {
              revenueAmount: BigInt(revenueAmount),
              costAmount: BigInt(costAmount),
              profitAmount: BigInt(profitAmount),
            },
          })
          changed += result.count
        }
      }
    }
    scanned += rows.length
    cursor = rows[rows.length - 1].id
    console.log(`scanned=${scanned} changed=${changed} mismatches=${mismatches}`)
  } while (true)
  if (verify && mismatches) process.exitCode = 1
  if (!apply && !verify)
    console.log('dry-run only; pass --apply to backfill, then --verify to audit all rows')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
