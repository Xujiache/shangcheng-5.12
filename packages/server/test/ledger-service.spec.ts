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

// ── prisma 替身：仅含本服务消费到的模型/方法 ──
function buildPrisma() {
  return {
    ledgerOrder: {
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      findFirst: jest.fn(async (..._a: any[]) => null as any),
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
      delete: jest.fn(async (..._a: any[]) => ({}) as any),
      updateMany: jest.fn(async (..._a: any[]) => ({ count: 0 }) as any),
    },
    ledgerCustomer: {
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      findFirst: jest.fn(async (..._a: any[]) => null as any),
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
      delete: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerNotification: {
      create: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerSetting: {
      // 默认无设置行 → pushNotification 按 schema 默认值（order/report/goal 开、system 关）
      findUnique: jest.fn(async (..._a: any[]) => null as any),
    },
    ledgerGoal: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      upsert: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerConfig: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
    },
    ledgerUser: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
    },
  }
}

// 订单行工厂：填齐 mapOrder/OrderRow 所需列，调用方按需覆写。
function orderRow(over: Partial<any> = {}): any {
  return {
    id: 'o1',
    customerId: 'c1',
    customerName: '张三',
    date: new Date('2026-06-01T00:00:00.000Z'),
    total: 0,
    received: 0,
    costProfile: 0,
    costGlass: 0,
    costHardware: 0,
    costLabor: 0,
    costScreen: 0,
    extras: [],
    customCosts: [],
    items: [],
    discount: 0,
    deposit: 0,
    note: null,
    ...over,
  }
}

describe('LedgerService.getOrder（映射 + 计算口径）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例1：成本/利润/营收/利润率 + 门窗明细金额与未收额计算正确', async () => {
    // 5 类固定成本之和 = 16800+9200+4100+6800+1900 = 38800
    // + 其他开销 600 + 自定义成本 400 → cost = 39800
    // 营收 = 58200 + 2000 = 60200；利润 = 60200 − 39800 = 20400
    const items = [
      {
        name: '平开窗',
        unitPrice: 500,
        baseArea: 0,
        qty: 0,
        // 1200×1500mm = 1.8㎡ → 小计 round(1.8*500)=900
        sizes: [{ w: 1200, h: 1500, note: '' }],
      },
      {
        name: '推拉门',
        unitPrice: 300,
        baseArea: 0,
        qty: 0,
        // 2000×2000mm = 4㎡ → 小计 round(4*300)=1200
        sizes: [{ w: 2000, h: 2000, note: '' }],
      },
    ]
    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(
      orderRow({
        total: 58200,
        received: 2000,
        costProfile: 16800,
        costGlass: 9200,
        costHardware: 4100,
        costLabor: 6800,
        costScreen: 1900,
        extras: [{ type: 'freight', amount: 600 }],
        customCosts: [{ name: 'lift', amount: 400 }],
        items,
        deposit: 20000,
      }),
    )

    const res = await service.getOrder('u1', 'o1')

    expect(res.cost).toBe(39800)
    // 利润 = 总价 − 总成本（收款不进利润）= 58200 − 39800 = 18400
    expect(res.profit).toBe(18400)
    // 营收 = 总价（额外收入已废弃）
    expect(res.revenue).toBe(58200)
    expect(res.margin).toBeCloseTo(18400 / 58200, 6)
    // 金额 = Σ各项小计 = 900 + 1200 = 2100
    expect(res.amount).toBe(2100)
    // 未收 = max(0, total − deposit − received) = 58200 − 20000 − 2000 = 36200
    expect(res.unpaid).toBe(36200)
    // 派生明细汇总
    expect(res.fixedCost).toBe(38800)
    expect(res.extrasTotal).toBe(600)
    expect(res.customCostsTotal).toBe(400)
  })

  it('用例2：他人订单（findFirst 因 where 含 userId 返回 null）→ 1002 NOT_FOUND', async () => {
    // where:{ id, userId } 命不中他人订单 → null
    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(null as any)
    try {
      await service.getOrder('u1', 'o-other')
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1002)
    }
    // 隔离条件确实带上了 userId
    const arg = prisma.ledgerOrder.findFirst.mock.calls[0][0] as any
    expect(arg.where.userId).toBe('u1')
  })
})

describe('LedgerService.listOrders（内存过滤/排序/分页/汇总）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例3：profit 区间内存过滤 + profit 降序 + 分页切片 + 汇总覆盖全集', async () => {
    // 三笔订单，利润分别为 1000 / 3000 / 5000（无成本时 profit = total）
    const rows = [
      orderRow({ id: 'a', total: 1000 }),
      orderRow({ id: 'b', total: 3000 }),
      orderRow({ id: 'c', total: 5000 }),
    ]
    prisma.ledgerOrder.findMany.mockResolvedValueOnce(rows as any)

    const res = await service.listOrders('u1', {
      profitMin: '2000', // 过滤掉利润 1000 的那笔
      sort: 'profit',
      page: '2',
      pageSize: '2',
    } as any)

    // 过滤后剩 2 笔（3000/5000），降序 [5000, 3000]，pageSize=2 → 第2页只剩 0 笔
    expect(res.total).toBe(2)
    expect(res.page).toBe(2)
    expect(res.list).toHaveLength(0)

    // 汇总基于过滤后的全集（不止当前页）：profit = 3000 + 5000 = 8000
    expect(res.summary.count).toBe(2)
    expect(res.summary.profit).toBe(8000)
    expect(res.summary.revenue).toBe(8000)
  })

  it('用例3b：3 笔 pageSize=2 → 第2页有 1 笔，降序后取最小利润', async () => {
    const rows = [
      orderRow({ id: 'a', total: 1000 }),
      orderRow({ id: 'b', total: 3000 }),
      orderRow({ id: 'c', total: 5000 }),
    ]
    prisma.ledgerOrder.findMany.mockResolvedValueOnce(rows as any)

    const res = await service.listOrders('u1', {
      sort: 'profit',
      page: '2',
      pageSize: '2',
    } as any)

    // 降序 [5000,3000,1000]，第2页(slice 2..4) → 仅 1000 这一笔
    expect(res.total).toBe(3)
    expect(res.list).toHaveLength(1)
    expect(res.list[0].profit).toBe(1000)
    // 汇总仍覆盖全集 3 笔
    expect(res.summary.count).toBe(3)
    expect(res.summary.profit).toBe(9000)
  })
})

describe('LedgerService.createOrder（校验 + 明细优先 + 通知）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例4a：客户名为空 → 1001 INVALID_PARAMS', async () => {
    try {
      await service.createOrder('u1', {
        customerName: '   ',
        date: '2026-06-01',
        total: 100,
      } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    expect(prisma.ledgerOrder.create).not.toHaveBeenCalled()
  })

  it('用例4b：无明细且 total=0 → 1001（总价须 > 0）', async () => {
    try {
      await service.createOrder('u1', { customerName: '张三', date: '2026-06-01', total: 0 } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    expect(prisma.ledgerOrder.create).not.toHaveBeenCalled()
  })

  it('用例4c：日期非法 → 1001', async () => {
    try {
      await service.createOrder('u1', { customerName: '张三', date: 'garbage', total: 100 } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    expect(prisma.ledgerOrder.create).not.toHaveBeenCalled()
  })

  it('用例4d：有明细时落库 total = 金额−优惠（忽略 dto.total），并写一条 order 通知', async () => {
    // 明细：500×(2㎡)=1000，优惠 200 → 落库 total = 1000 − 200 = 800（无视 dto.total=999）
    prisma.ledgerOrder.create.mockImplementationOnce(async (args: any) =>
      orderRow({ ...args.data }),
    )
    const items = [
      {
        name: '平开窗',
        unitPrice: 500,
        baseArea: 0,
        qty: 0,
        sizes: [{ w: 1000, h: 2000, note: '' }],
      },
    ]

    const res = await service.createOrder('u1', {
      customerName: '张三',
      date: '2026-06-01',
      total: 999, // 应被明细覆盖
      discount: 200,
      items,
    } as any)

    const createArg = prisma.ledgerOrder.create.mock.calls[0][0] as any
    expect(createArg.data.total).toBe(800)
    expect(res.total).toBe(800)

    // 录单成功 → 写入一条 order 类型通知
    expect(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1)
    const notifyArg = prisma.ledgerNotification.create.mock.calls[0][0] as any
    expect(notifyArg.data.type).toBe('order')
    expect(notifyArg.data.userId).toBe('u1')
  })

  it('用例5：customerId 不属于本账号 → customerId 落库为 null，但保留 customerName（快录兜底）', async () => {
    // resolveCustomer 内 findFirst(where:{id,userId}) 命不中 → 忽略 id 保名字
    prisma.ledgerCustomer.findFirst.mockResolvedValueOnce(null as any)
    prisma.ledgerOrder.create.mockImplementationOnce(async (args: any) =>
      orderRow({ ...args.data }),
    )

    await service.createOrder('u1', {
      customerId: 'not-mine',
      customerName: '李四',
      date: '2026-06-01',
      total: 500,
    } as any)

    const createArg = prisma.ledgerOrder.create.mock.calls[0][0] as any
    expect(createArg.data.customerId).toBeNull()
    expect(createArg.data.customerName).toBe('李四')
  })
})

describe('LedgerService.updateOrder（明细驱动 total 重算）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例6a：传入新明细 + 优惠 → update.data.total 由新明细重算', async () => {
    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(orderRow({ items: [], discount: 0 }) as any)
    prisma.ledgerOrder.update.mockImplementationOnce(async (args: any) =>
      orderRow({ ...args.data }),
    )

    const items = [
      {
        name: '推拉门',
        unitPrice: 300,
        baseArea: 0,
        qty: 0,
        sizes: [{ w: 2000, h: 2000, note: '' }],
      },
    ]
    // 小计 round(4㎡*300)=1200，优惠 100 → total = 1100
    await service.updateOrder('u1', 'o1', { items, discount: 100, total: 99999 } as any)

    const updateArg = prisma.ledgerOrder.update.mock.calls[0][0] as any
    expect(updateArg.data.total).toBe(1100)
  })

  it('用例6b：仅传优惠（exist.items 非空）→ 仍用 exist.items 重算 total', async () => {
    const existItems = [
      {
        name: '平开窗',
        unitPrice: 500,
        baseArea: 0,
        qty: 0,
        sizes: [{ w: 2000, h: 2000, note: '' }],
      },
    ]
    // 既有明细小计 round(4㎡*500)=2000
    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(
      orderRow({ items: existItems, discount: 0 }) as any,
    )
    prisma.ledgerOrder.update.mockImplementationOnce(async (args: any) =>
      orderRow({ ...args.data, items: existItems }),
    )

    // 只改优惠 300，不传 items → total = 2000 − 300 = 1700（用 exist.items）
    await service.updateOrder('u1', 'o1', { discount: 300 } as any)

    const updateArg = prisma.ledgerOrder.update.mock.calls[0][0] as any
    expect(updateArg.data.total).toBe(1700)
  })
})

describe('LedgerService.pushNotification（偏好开关过滤）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  // 设置行工厂：默认全部与 schema @default 一致，按需覆写
  function settingRow(over: Partial<any> = {}): any {
    return {
      notifyOrder: true,
      notifyReport: true,
      notifyGoal: true,
      notifySystem: false,
      dndEnabled: false,
      dndStart: '22:00',
      dndEnd: '08:00',
      ...over,
    }
  }

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例8a：notifyOrder 关闭 → order 通知被抑制（不写库）', async () => {
    prisma.ledgerSetting.findUnique.mockResolvedValueOnce(settingRow({ notifyOrder: false }))
    await service.pushNotification('u1', 'order', '订单已保存', 'x')
    expect(prisma.ledgerNotification.create).not.toHaveBeenCalled()
  })

  it('用例8b：notifyOrder 开启 → order 通知正常写库', async () => {
    prisma.ledgerSetting.findUnique.mockResolvedValueOnce(settingRow({ notifyOrder: true }))
    await service.pushNotification('u1', 'order', '订单已保存', 'x')
    expect(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1)
  })

  it('用例8c：无设置行 → 按默认值（goal 默认开 → 写库；system 默认关 → 抑制）', async () => {
    // buildPrisma 默认 findUnique → null（无设置行）
    await service.pushNotification('u1', 'goal', '目标达成', 'x')
    expect(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1)

    await service.pushNotification('u1', 'system', '系统通知', 'x')
    expect(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1) // 未新增
  })

  it('用例8d：member 类型走 notifySystem 开关', async () => {
    prisma.ledgerSetting.findUnique.mockResolvedValueOnce(settingRow({ notifySystem: true }))
    await service.pushNotification('u1', 'member', '邀请奖励到账', 'x')
    expect(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1)
  })

  it('用例8e：写库/查偏好抛错均不外抛（fire-and-forget 语义不变）', async () => {
    prisma.ledgerSetting.findUnique.mockRejectedValueOnce(new Error('db down') as never)
    await expect(service.pushNotification('u1', 'order', 't', 'b')).resolves.toBeUndefined()

    prisma.ledgerNotification.create.mockRejectedValueOnce(new Error('db down') as never)
    await expect(service.pushNotification('u1', 'goal', 't', 'b')).resolves.toBeUndefined()
  })
})

describe('LedgerService 客户改名/删除（订单冗余名同步与解绑）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerService(prisma as any)
  })

  it('用例7a：客户改名 → ledgerOrder.updateMany 同步历史订单 customerName', async () => {
    prisma.ledgerCustomer.findFirst.mockResolvedValueOnce({ id: 'c1', name: '老名' } as any)
    prisma.ledgerCustomer.update.mockResolvedValueOnce({ id: 'c1', name: '新名' } as any)

    await service.updateCustomer('u1', 'c1', { name: '新名' } as any)

    expect(prisma.ledgerOrder.updateMany).toHaveBeenCalledTimes(1)
    const arg = prisma.ledgerOrder.updateMany.mock.calls[0][0] as any
    expect(arg.where.userId).toBe('u1')
    expect(arg.where.customerId).toBe('c1')
    expect(arg.data.customerName).toBe('新名')
  })

  it('用例7b：删除客户 → 先 updateMany 解绑 customerId，再 delete', async () => {
    prisma.ledgerCustomer.findFirst.mockResolvedValueOnce({ id: 'c1', name: '张三' } as any)

    const order: string[] = []
    prisma.ledgerOrder.updateMany.mockImplementationOnce(async (..._a: any[]) => {
      order.push('updateMany')
      return { count: 1 } as any
    })
    prisma.ledgerCustomer.delete.mockImplementationOnce(async (..._a: any[]) => {
      order.push('delete')
      return {} as any
    })

    await service.deleteCustomer('u1', 'c1')

    // 先解绑（customerId=null）再删档，避免外键约束失败
    expect(order).toEqual(['updateMany', 'delete'])
    const unbindArg = prisma.ledgerOrder.updateMany.mock.calls[0][0] as any
    expect(unbindArg.where.customerId).toBe('c1')
    expect(unbindArg.data.customerId).toBeNull()
  })
})
