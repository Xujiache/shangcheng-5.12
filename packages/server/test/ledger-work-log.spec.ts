import { describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'ABCDEFGH' }))

import { LedgerService } from '../src/modules/ledger/ledger.service'

const now = new Date('2026-06-15T08:00:00.000Z')

function buildService() {
  const rows: any[] = []
  const prisma: any = {
    ledgerWorkLog: {
      findMany: jest.fn(async ({ where }: any) =>
        rows.filter(
          (row) =>
            row.userId === where.userId &&
            row.workDate >= where.workDate.gte &&
            row.workDate < where.workDate.lt,
        ),
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `w${rows.length + 1}`, createdAt: now, updatedAt: now, ...data }
        rows.push(row)
        return row
      }),
      findFirst: jest.fn(
        async ({ where }: any) =>
          rows.find((row) => row.id === where.id && row.userId === where.userId) || null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const row = rows.find((item) => item.id === where.id)
        Object.assign(row, data, { updatedAt: now })
        return row
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        const index = rows.findIndex((row) => row.id === where.id && row.userId === where.userId)
        if (index < 0) return { count: 0 }
        rows.splice(index, 1)
        return { count: 1 }
      }),
    },
  }
  return { service: new LedgerService(prisma), prisma, rows }
}

describe('LedgerService work logs', () => {
  it('recalculates amount on create and aggregates the requested month only', async () => {
    const { service } = buildService()
    const created = await service.createWorkLog('u1', {
      workDate: '2026-06-10',
      workerName: '张工',
      jobType: '安装',
      unit: 'day',
      quantity: 1.25,
      unitPrice: 320,
      note: '阳台',
    })
    expect(created.amount).toBe(400)

    const out = await service.listWorkLogs('u1', { month: '2026-06' })
    expect(out.summary).toEqual({ totalAmount: 400, dayQuantity: 1.25, hourQuantity: 0, count: 1 })
  })

  it('rejects cross-account updates and recalculates an edited amount', async () => {
    const { service } = buildService()
    const created = await service.createWorkLog('u1', {
      workDate: '2026-06-10',
      workerName: '李工',
      unit: 'hour',
      quantity: 8,
      unitPrice: 35,
    })
    await expect(service.updateWorkLog('u2', created.id, { unitPrice: 99 })).rejects.toThrow(
      '记工记录不存在',
    )
    const updated = await service.updateWorkLog('u1', created.id, { quantity: 7.5, unitPrice: 40 })
    expect(updated.amount).toBe(300)
  })
})
