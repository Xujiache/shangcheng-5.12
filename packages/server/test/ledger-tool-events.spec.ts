import { ToolEventsService } from '../src/modules/ledger/tool-events.service'

const event = (id: string) => ({ id, tool: 'rmb', status: 'success', occurredAt: new Date().toISOString() })

describe('Ledger tool events', () => {
  const events = new Map<string, any>()
  const prisma = {
    ledgerToolEvent: {
      createMany: jest.fn(async ({ data }: any) => {
        let count = 0
        for (const item of data) if (!events.has(item.id)) { events.set(item.id, item); count++ }
        return { count }
      }),
      groupBy: jest.fn(async () => []),
      count: jest.fn(async ({ where }: any) => [...events.values()].filter((item) => item.userId === where.userId).length),
      findMany: jest.fn(async ({ where }: any) => [...events.values()].filter((item) => item.userId === where.userId)),
    },
    ledgerUser: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
    $transaction: jest.fn(async (calls: Promise<any>[]) => Promise.all(calls)),
  }
  const service = new ToolEventsService(prisma as any)

  beforeEach(() => { events.clear(); jest.clearAllMocks() })

  it('deduplicates UUIDs and attributes events to the authenticated account', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000'
    expect(await service.submit('alice', { events: [event(id)] })).toEqual({ accepted: 1, inserted: 1 })
    expect(await service.submit('alice', { events: [event(id)] })).toEqual({ accepted: 1, inserted: 0 })
    expect(events.get(id).userId).toBe('alice')
    expect(await service.timeline('bob', {})).toMatchObject({ total: 0, items: [] })
  })

  it('rejects payload data and client forged server results', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000'
    await expect(service.submit('alice', { events: [{ ...event(id), amount: 123 }] })).rejects.toThrow()
    await expect(service.submit('alice', { events: [{ ...event(id), tool: 'glass' }] })).rejects.toThrow()
    await expect(service.submit('alice', { events: [event(id), event(id)] })).rejects.toThrow()
    expect(events.size).toBe(0)
  })

  it('uses deterministic server IDs for terminal conversion events', async () => {
    await service.recordServerEvent('alice', 'format', 'success', 'job-1')
    await service.recordServerEvent('alice', 'format', 'success', 'job-1')
    expect(events.size).toBe(1)
    expect([...events.values()][0]).toMatchObject({ userId: 'alice', tool: 'format', status: 'success' })
  })
})
