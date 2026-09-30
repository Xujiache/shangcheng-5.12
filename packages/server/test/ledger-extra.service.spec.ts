import { describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TESTCODE' }))

import { LedgerExtraService } from '../src/modules/ledger/ledger-extra.service'

describe('LedgerExtraService.importData', () => {
  it('批量导入时保留长客户名归属并按 250 条写订单', async () => {
    const customerWrites: any[] = []
    const orderWrites: any[] = []
    const prisma: any = {
      ledgerCustomer: {
        findMany: jest.fn(async () => []),
        createMany: jest.fn(async ({ data }: any) => {
          customerWrites.push(...data)
          return { count: data.length }
        }),
      },
      ledgerOrder: {
        createMany: jest.fn(async ({ data }: any) => {
          orderWrites.push(data)
          return { count: data.length }
        }),
      },
    }
    const service = new LedgerExtraService(prisma)
    const longName = 'A'.repeat(41) + '1'
    const samePrefix = 'A'.repeat(41) + '2'
    const token = (service as any).encrypt({
      v: 1,
      owner: 'u1',
      allowShare: false,
      data: {
        customers: [{ name: longName }, { name: samePrefix }, { name: '短客户' }],
        orders: Array.from({ length: 251 }, (_, index) => ({
          customerName: index % 2 ? samePrefix : longName,
          date: '2026-09-01',
          total: 1000,
        })),
      },
    })

    const result = await service.importData('u1', token)

    expect(result).toEqual({ ok: true, customers: 2, orders: 251 })
    expect(customerWrites).toHaveLength(2)
    expect(customerWrites.map((row) => row.name)).toEqual(['A'.repeat(40), '短客户'])
    expect(orderWrites).toHaveLength(2)
    expect(orderWrites[0]).toHaveLength(250)
    expect(orderWrites[1]).toHaveLength(1)
    const longCustomerIds = new Set(
      orderWrites.flat().map((row) => row.customerId).filter(Boolean),
    )
    expect(longCustomerIds.size).toBe(1)
  })
})
