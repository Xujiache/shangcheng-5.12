import { afterEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => alphabet.slice(0, size),
}))

import { LedgerService } from '../src/modules/ledger/ledger.service'

function orderRow(date: Date) {
  return {
    id: 'o1',
    customerId: null,
    customerName: '张三',
    date,
    total: 1000,
    costProfile: 100,
    costGlass: 0,
    costHardware: 0,
    costLabor: 0,
    costScreen: 0,
    extras: [],
    customCosts: [],
    items: [],
    discount: 0,
    recycle: 0,
    deposit: 0,
    received: 0,
    note: null,
    revenueAmount: 1000n,
    costAmount: 100n,
    profitAmount: 900n,
  }
}

afterEach(() => {
  delete process.env.LEDGER_FAST_READS
})

describe('LedgerService performance paths', () => {
  it('overview and series use the database bucket totals after backfill', async () => {
    process.env.LEDGER_FAST_READS = '1'
    const now = new Date()
    const month = now.getMonth()
    const row = orderRow(new Date(now.getFullYear(), month, 2))
    const grouped = Array.from({ length: 12 }, (_, index) => ({
      index,
      count: index === month ? '1' : '0',
      revenue: index === month ? '1000' : '0',
      cost: index === month ? '100' : '0',
      profit: index === month ? '900' : '0',
    }))
    const prisma: any = {
      ledgerOrder: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async (args: any) => (args.select?.extras ? [row] : [])),
      },
      ledgerSetting: { findUnique: jest.fn(async () => ({ costCategories: [] })) },
      ledgerGoal: { findUnique: jest.fn(async () => ({ monthly: 1000, yearly: 10000 })) },
      $queryRaw: jest.fn(async () => grouped),
    }
    const service = new LedgerService(prisma)

    const overview = await service.overview('u1', 'month')
    expect(overview).toMatchObject({ count: 1, revenue: 1000, cost: 100, profit: 900 })
    expect(overview.monthProfit).toBe(900)
    expect(overview.trend[month]).toMatchObject({ count: 1, revenue: 1000, profit: 900 })

    const series = await service.series('u1', 'month')
    expect(series.summary).toMatchObject({ count: 1, revenue: 1000, cost: 100, profit: 900 })
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2)
  })

  it('concurrent fast-read checks share one readiness query', async () => {
    process.env.LEDGER_FAST_READS = '1'
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const count = jest.fn(async () => {
      await gate
      return 0
    })
    const prisma: any = {
      ledgerOrder: {
        count,
        findMany: jest.fn(async () => []),
        aggregate: jest.fn(async () => ({ _count: { _all: 0 }, _sum: {} })),
        groupBy: jest.fn(async () => []),
      },
      ledgerCustomer: { findMany: jest.fn(async () => []) },
    }
    const service = new LedgerService(prisma)
    const first = service.listOrders('u1', {} as any)
    const second = service.listCustomers('u1')
    await Promise.resolve()
    release()
    await Promise.all([first, second])
    expect(count).toHaveBeenCalledTimes(1)
  })
})
