import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { PrismaClient } from '@prisma/client'
import { LedgerService } from '../src/modules/ledger/ledger.service'

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid')
if (
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  url.pathname !== '/ledger_verify' ||
  process.env.LEDGER_VERIFY_DATASET !== '1'
)
  throw new Error('Only isolated local ledger_verify with LEDGER_VERIFY_DATASET=1 is allowed')

const prisma = new PrismaClient()
const service = new LedgerService(prisma as any)
const legacyStats = new LedgerService({
  ledgerOrder: {
    findMany: (args: any) =>
      prisma.ledgerOrder.findMany({ ...args, where: { userId: args.where.userId } }),
  },
  ledgerSetting: prisma.ledgerSetting,
  ledgerGoal: prisma.ledgerGoal,
} as any)
const accounts = [
  { id: 'ledger-verify-1k', size: 1000 },
  { id: 'ledger-verify-10k', size: 10000 },
]

async function seed() {
  for (const account of accounts) {
    await prisma.ledgerUser.upsert({
      where: { id: account.id },
      create: { id: account.id, nickname: account.id },
      update: {},
    })
    await prisma.ledgerOrder.deleteMany({ where: { userId: account.id } })
    for (let start = 0; start < account.size; start += 500) {
      const rows = Array.from({ length: Math.min(500, account.size - start) }, (_, i) => {
        const n = start + i
        return {
          id: `${account.id}-order-${String(n).padStart(5, '0')}`,
          userId: account.id,
          customerName: `客户${n % 20}`,
          date: new Date(Date.UTC(2000, 0, 1 + n)),
          total: 1000 + (n % 1999),
          costProfile: n % 500,
          costGlass: n % 200,
          extras: [{ type: 'old', amount: n % 75 }],
          customCosts: [{ name: '其他', amount: n % 33 }],
        }
      })
      await prisma.ledgerOrder.createMany({ data: rows })
    }
    console.log(`seeded ${account.id}: ${account.size} orders`)
  }
}

async function compare() {
  for (const account of accounts) {
    const missing = await prisma.ledgerOrder.count({
      where: { userId: account.id, profitAmount: null },
    })
    assert.equal(missing, 0, `backfill not complete for ${account.id}`)
    const queries: any[] = [
      { page: '1', pageSize: '20' },
      { page: '2', pageSize: '20', sort: 'profit' },
      { page: '9', pageSize: '20', profitMin: '1250', profitMax: '2000' },
      { page: '1', pageSize: '20', customer: '客户7' },
      { page: '1', pageSize: '20', dateFrom: '2020-01-01', dateTo: '2024-12-31' },
    ]
    for (const query of queries) {
      process.env.LEDGER_FAST_READS = '0'
      const oldStart = performance.now()
      const oldResult = await service.listOrders(account.id, query)
      const oldMs = performance.now() - oldStart
      process.env.LEDGER_FAST_READS = '1'
      const fastStart = performance.now()
      const fastResult = await service.listOrders(account.id, query)
      const fastMs = performance.now() - fastStart
      assert.deepEqual(fastResult, oldResult, `${account.id} ${JSON.stringify(query)}`)
      console.log(
        `${account.id} ${JSON.stringify(query)} old=${oldMs.toFixed(1)}ms fast=${fastMs.toFixed(1)}ms`,
      )
    }
    process.env.LEDGER_FAST_READS = '0'
    const oldCustomers = await service.listCustomers(account.id)
    process.env.LEDGER_FAST_READS = '1'
    const fastCustomers = await service.listCustomers(account.id)
    assert.deepEqual(
      fastCustomers.sort((a, b) => a.name.localeCompare(b.name)),
      oldCustomers.sort((a, b) => a.name.localeCompare(b.name)),
      `${account.id} customer summary`,
    )
    console.log(`${account.id} customers equivalent`)
  }
  const userId = 'ledger-verify-10k'
  for (const period of ['month', 'quarter', 'year']) {
    assert.deepEqual(
      await service.overview(userId, period),
      await legacyStats.overview(userId, period),
    )
  }
  for (const year of [2025, 2026]) {
    assert.deepEqual(
      await service.monthlySeries(userId, year),
      await legacyStats.monthlySeries(userId, year),
    )
  }
  for (const unit of ['day', 'month', 'year']) {
    assert.deepEqual(await service.series(userId, unit), await legacyStats.series(userId, unit))
  }
  console.log('10k orders: overview/monthlySeries/series equivalent')
}

async function bench() {
  const userId = 'ledger-verify-10k'
  assert.equal(await prisma.ledgerOrder.count({ where: { userId } }), 10000)
  const query: any = { page: '1', pageSize: '20' }
  const samples = { old: [] as number[], fast: [] as number[] }
  for (let i = -2; i < 30; i++) {
    for (const mode of ['old', 'fast'] as const) {
      process.env.LEDGER_FAST_READS = mode === 'fast' ? '1' : '0'
      const start = performance.now()
      await service.listOrders(userId, query)
      if (i >= 0) samples[mode].push(performance.now() - start)
    }
  }
  const p95 = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.ceil(sorted.length * 0.95) - 1]
  }
  const oldP95 = p95(samples.old)
  const fastP95 = p95(samples.fast)
  console.log(
    `local synthetic 10k orders p95 old=${oldP95.toFixed(1)}ms fast=${fastP95.toFixed(1)}ms reduction=${(100 * (1 - fastP95 / oldP95)).toFixed(1)}%`,
  )
  const statsSamples = { old: [] as number[], fast: [] as number[] }
  for (let i = -2; i < 30; i++) {
    for (const mode of ['old', 'fast'] as const) {
      const start = performance.now()
      if (mode === 'old') await legacyStats.overview(userId, 'month')
      else await service.overview(userId, 'month')
      if (i >= 0) statsSamples[mode].push(performance.now() - start)
    }
  }
  const statsOldP95 = p95(statsSamples.old)
  const statsFastP95 = p95(statsSamples.fast)
  console.log(
    `local synthetic 10k overview p95 old=${statsOldP95.toFixed(1)}ms fast=${statsFastP95.toFixed(1)}ms reduction=${(100 * (1 - statsFastP95 / statsOldP95)).toFixed(1)}%`,
  )
}

async function main() {
  try {
    if (process.argv.includes('--seed')) await seed()
    else if (process.argv.includes('--compare')) await compare()
    else if (process.argv.includes('--bench')) await bench()
    else throw new Error('pass --seed, --compare or --bench')
  } finally {
    delete process.env.LEDGER_FAST_READS
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
