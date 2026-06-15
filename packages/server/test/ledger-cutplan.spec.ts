import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require。轻量替身保留字符集+长度契约。
// ledger.service 间接 import ledger.constants（含 customAlphabet），故必须 mock。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return out
  },
}))

import { LedgerService } from '../src/modules/ledger/ledger.service'

// ── prisma 替身：仅含本批用例消费到的 ledgerCutPlan 方法 ──
function buildPrisma() {
  return {
    ledgerCutPlan: {
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      findFirst: jest.fn(async (..._a: any[]) => null as any),
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
      delete: jest.fn(async (..._a: any[]) => ({}) as any),
    },
  }
}

// 方案行工厂：填齐 mapCutPlan 所需列，调用方按需覆写。
function planRow(over: Partial<any> = {}): any {
  return {
    id: 'p1',
    userId: 'u1',
    title: '阳台推拉门',
    material: 'glass',
    input: { sheetW: 2440, sheetH: 1220, kerf: 5, pieces: [{ w: 600, h: 800, qty: 4 }] },
    summary: { material: 'glass', count: 4, util: 0.78, units: '块' },
    updatedAt: new Date('2026-06-13T00:00:00.000Z'),
    ...over,
  }
}

describe('LedgerService.listCutPlans（按 userId 隔离 + 倒序 + 上限）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例1：列表强制 where.userId、updatedAt 倒序、take 100，且映射为契约形态', async () => {
    prisma.ledgerCutPlan.findMany.mockResolvedValueOnce([
      planRow({ id: 'p2', title: '型材清单', material: 'profile' }),
      planRow({ id: 'p1' }),
    ] as any)

    const res = await service.listCutPlans('u1')

    const arg = prisma.ledgerCutPlan.findMany.mock.calls[0][0] as any
    expect(arg.where.userId).toBe('u1')
    expect(arg.orderBy).toEqual({ updatedAt: 'desc' })
    expect(arg.take).toBe(100)

    expect(res).toHaveLength(2)
    expect(res[0]).toEqual({
      id: 'p2',
      title: '型材清单',
      material: 'profile',
      input: planRow().input,
      summary: planRow().summary,
      updatedAt: '2026-06-13T00:00:00.000Z',
    })
  })
})

describe('LedgerService.createCutPlan（校验 + 落库 + 体积上限）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例2：happy path → 带 userId 落库并返回契约形态', async () => {
    prisma.ledgerCutPlan.create.mockImplementationOnce(async (args: any) =>
      planRow({ ...args.data }),
    )

    const res = await service.createCutPlan('u1', {
      title: '  阳台推拉门  ', // 落库前 trim
      material: 'glass',
      input: { sheetW: 2440, sheetH: 1220, kerf: 5, pieces: [{ w: 600, h: 800, qty: 4 }] },
      summary: { material: 'glass', count: 4, util: 0.78, units: '块' },
    } as any)

    const createArg = prisma.ledgerCutPlan.create.mock.calls[0][0] as any
    expect(createArg.data.userId).toBe('u1')
    expect(createArg.data.title).toBe('阳台推拉门')
    expect(createArg.data.material).toBe('glass')
    expect(res.title).toBe('阳台推拉门')
    expect(res.material).toBe('glass')
    expect(typeof res.updatedAt).toBe('string')
  })

  it('用例3：标题去空白后为空 → 1001 且不落库', async () => {
    try {
      await service.createCutPlan('u1', {
        title: '   ',
        material: 'board',
        input: {},
        summary: {},
      } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    expect(prisma.ledgerCutPlan.create).not.toHaveBeenCalled()
  })

  it('用例4：input 序列化 > 20KB → 1001（体积上限）且不落库', async () => {
    // 构造一个超大 pieces 数组使 JSON 体积超过 20000 字节
    const pieces = Array.from({ length: 1200 }, (_, i) => ({ w: 600, h: 800, qty: i }))
    try {
      await service.createCutPlan('u1', {
        title: '超大方案',
        material: 'glass',
        input: { sheetW: 2440, sheetH: 1220, kerf: 5, pieces },
        summary: {},
      } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    expect(prisma.ledgerCutPlan.create).not.toHaveBeenCalled()
  })
})

describe('LedgerService.updateCutPlan（归属隔离 + 字段增量）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例5：happy path → 仅更新传入字段（title 去空白、material/input 透传）', async () => {
    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(planRow() as any)
    prisma.ledgerCutPlan.update.mockImplementationOnce(async (args: any) =>
      planRow({ ...args.data }),
    )

    await service.updateCutPlan('u1', 'p1', {
      title: ' 新名 ',
      input: { sheetW: 3000, sheetH: 2000, kerf: 4, pieces: [] },
    } as any)

    // 命中查询带 userId 隔离
    const findArg = prisma.ledgerCutPlan.findFirst.mock.calls[0][0] as any
    expect(findArg.where).toEqual({ id: 'p1', userId: 'u1' })

    const updateArg = prisma.ledgerCutPlan.update.mock.calls[0][0] as any
    expect(updateArg.where).toEqual({ id: 'p1', userId: 'u1' })
    expect(updateArg.data.title).toBe('新名')
    expect(updateArg.data.input).toEqual({ sheetW: 3000, sheetH: 2000, kerf: 4, pieces: [] })
    // 未传字段不出现在 data 中
    expect('material' in updateArg.data).toBe(false)
    expect('summary' in updateArg.data).toBe(false)
  })

  it('用例6：他人方案（findFirst 因 where 含 userId 返回 null）→ 1002 NOT_FOUND，且不 update', async () => {
    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(null as any)
    try {
      await service.updateCutPlan('u1', 'p-other', { title: '改名' } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1002)
    }
    const arg = prisma.ledgerCutPlan.findFirst.mock.calls[0][0] as any
    expect(arg.where.userId).toBe('u1')
    expect(prisma.ledgerCutPlan.update).not.toHaveBeenCalled()
  })

  it('用例7：传入超大 summary → 1001 且不 update', async () => {
    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(planRow() as any)
    const big = { blob: 'x'.repeat(20_001) }
    try {
      await service.updateCutPlan('u1', 'p1', { summary: big } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    expect(prisma.ledgerCutPlan.update).not.toHaveBeenCalled()
  })
})

describe('LedgerService.deleteCutPlan（归属隔离）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例8：happy path → 命中后删除并返回 {ok:true}', async () => {
    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(planRow() as any)

    const res = await service.deleteCutPlan('u1', 'p1')

    expect(res).toEqual({ ok: true })
    const delArg = prisma.ledgerCutPlan.delete.mock.calls[0][0] as any
    expect(delArg.where).toEqual({ id: 'p1', userId: 'u1' })
  })

  it('用例9：他人方案 → 1002 NOT_FOUND，且不 delete', async () => {
    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(null as any)
    try {
      await service.deleteCutPlan('u1', 'p-other')
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1002)
    }
    const arg = prisma.ledgerCutPlan.findFirst.mock.calls[0][0] as any
    expect(arg.where.userId).toBe('u1')
    expect(prisma.ledgerCutPlan.delete).not.toHaveBeenCalled()
  })
})
