import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；order-share.service 在模块加载时
// 通过 customAlphabet 生成 12 位 shareCode。用等价随机生成器替换，避免
// "Cannot use import statement outside a module"。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let s = ''
    for (let i = 0; i < size; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return s
  },
}))

import { OrderShareService } from '../src/modules/merchant/order-share.service'

// ----------------------------------------------------------------------------
// OrderShareService — 重写版（独立 OrderShare 表，替代 SystemConfig 兜底）
//
// 实现位置：packages/server/src/modules/merchant/order-share.service.ts
//
// 重点契约：
//   - createShare：visibleFields 空 → 1001；订单不存在 → 1002；
//                  跨商户 → 2003；正常 → 先 updateMany 撤销旧分享再 create，
//                  落库 visibleFields 经白名单过滤，返回 { shareCode, orderNo,
//                  expiresAt, visibleFields, intro }
//   - getPublicByCode：不存在 → 1002；revoked → 2003；过期 → 2003；
//                  字段门控（visibleFields=[basics] 时只返回 basics，不泄露
//                  customer/pricing/items/extra）；viewCount 自增 update 被触发
//   - listByMerchant：真分页（findMany 带 skip/take，count 取 total），
//                  列表行带 orderNo
// ----------------------------------------------------------------------------

/** 断言抛出的 BizException 业务码 */
async function expectBizCode(fn: () => Promise<unknown>, code: number) {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    expect(e.getResponse().code).toBe(code)
  }
}

// ── prisma 替身：仅含本服务消费到的模型/方法 ──
function buildPrisma() {
  return {
    order: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      findMany: jest.fn(async (..._a: any[]) => [] as any),
    },
    orderShare: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      findFirst: jest.fn(async (..._a: any[]) => null as any),
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      count: jest.fn(async (..._a: any[]) => 0 as any),
      create: jest.fn(async (args: any) => ({ shareCode: 'SC', ...args?.data }) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
      updateMany: jest.fn(async (..._a: any[]) => ({ count: 0 }) as any),
    },
    merchant: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
    },
  }
}

describe('OrderShareService.createShare（校验 + 撤销旧分享 + 落库）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: OrderShareService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new OrderShareService(prisma as any)
  })

  it('用例1：visibleFields 为空 → 1001 INVALID_PARAMS，不落库', async () => {
    // 给一个归属正确的订单，确保 1001 来自空字段校验而非订单/越权分支
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', merchantId: 'm1', no: 'NO-1' } as any)

    await expectBizCode(
      () =>
        service.createShare({
          orderId: 'o1',
          merchantId: 'm1',
          callerSub: 'u1',
          visibleFields: [],
        }),
      1001,
    )
    expect(prisma.orderShare.create).not.toHaveBeenCalled()
  })

  it('用例2：订单不存在（order.findUnique 返回 null）→ 1002 NOT_FOUND', async () => {
    prisma.order.findUnique.mockResolvedValue(null as any)

    await expectBizCode(
      () =>
        service.createShare({
          orderId: 'missing',
          merchantId: 'm1',
          callerSub: 'u1',
          visibleFields: ['basics'],
        }),
      1002,
    )
    expect(prisma.orderShare.create).not.toHaveBeenCalled()
  })

  it('用例3：订单归属他人（merchantId 不匹配）→ 2003 FORBIDDEN', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', merchantId: 'other', no: 'NO-1' } as any)

    await expectBizCode(
      () =>
        service.createShare({
          orderId: 'o1',
          merchantId: 'm1',
          callerSub: 'u1',
          visibleFields: ['basics'],
        }),
      2003,
    )
    expect(prisma.orderShare.create).not.toHaveBeenCalled()
  })

  it('用例4：正常 → 先 updateMany 撤销旧分享，再 create；白名单过滤非法字段；返回结构正确', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', merchantId: 'm1', no: 'NO-1' } as any)

    // 记录调用顺序，验证「先撤销旧分享，后创建新分享」
    const calls: string[] = []
    prisma.orderShare.updateMany.mockImplementationOnce(async (..._a: any[]) => {
      calls.push('updateMany')
      return { count: 1 } as any
    })
    prisma.orderShare.create.mockImplementationOnce(async (args: any) => {
      calls.push('create')
      return { shareCode: 'NEWCODE12345', ...args.data } as any
    })

    const res = await service.createShare({
      orderId: 'o1',
      merchantId: 'm1',
      callerSub: 'u1',
      // 混入一个非法字段 'evil'，应被白名单过滤掉
      visibleFields: ['basics', 'pricing', 'evil'] as any,
      intro: '门窗报价单',
    })

    // 撤销旧分享发生在创建之前
    expect(prisma.orderShare.updateMany).toHaveBeenCalledTimes(1)
    expect(prisma.orderShare.create).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['updateMany', 'create'])

    // 落库的 visibleFields 经过白名单过滤（去掉 'evil'）
    const createArg = prisma.orderShare.create.mock.calls[0][0] as any
    expect(createArg.data.visibleFields).toEqual(['basics', 'pricing'])
    expect(createArg.data.orderId).toBe('o1')
    expect(createArg.data.merchantId).toBe('m1')

    // 返回结构契约
    expect(res.orderNo).toBe('NO-1')
    expect(res.visibleFields).toEqual(['basics', 'pricing'])
    expect(res.intro).toBe('门窗报价单')
    expect(typeof res.shareCode).toBe('string')
    expect('expiresAt' in res).toBe(true)
  })
})

describe('OrderShareService.getPublicByCode（撤销/过期拦截 + 字段门控 + 浏览数自增）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: OrderShareService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new OrderShareService(prisma as any)
  })

  function shareRow(over: Partial<any> = {}): any {
    return {
      shareCode: 'CODE12345678',
      orderId: 'o1',
      merchantId: 'm1',
      visibleFields: ['basics'],
      expiresAt: null,
      intro: '报价',
      viewCount: 0,
      revoked: false,
      createdBy: 'u1',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      ...over,
    }
  }

  function orderRow(over: Partial<any> = {}): any {
    return {
      id: 'o1',
      no: 'NO-1',
      merchantId: 'm1',
      status: 'paid',
      totalAmount: 10000,
      payAmount: 8000,
      discountAmount: 2000,
      shippingFee: 0,
      couponDiscount: 0,
      paymentMethod: 'wxpay',
      address: { name: '张三', phone: '13800000000', region: '广东', detail: 'xx路1号' },
      remark: '尽快',
      shippingMethod: 'express',
      trackingCompany: null,
      trackingNumber: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      items: [
        {
          id: 'it1',
          productName: '平开窗',
          productImage: '',
          specsLabel: '',
          unitPrice: 500,
          quantity: 2,
        },
      ],
      ...over,
    }
  }

  it('用例5：分享不存在 → 1002 NOT_FOUND', async () => {
    prisma.orderShare.findUnique.mockResolvedValue(null as any)
    await expectBizCode(() => service.getPublicByCode('CODE12345678'), 1002)
  })

  it('用例6：分享已撤销 → 2003 FORBIDDEN', async () => {
    prisma.orderShare.findUnique.mockResolvedValue(shareRow({ revoked: true }) as any)
    await expectBizCode(() => service.getPublicByCode('CODE12345678'), 2003)
  })

  it('用例7：分享已过期（expiresAt 在过去）→ 2003 FORBIDDEN', async () => {
    prisma.orderShare.findUnique.mockResolvedValue(
      shareRow({ expiresAt: new Date(Date.now() - 86400_000) }) as any,
    )
    await expectBizCode(() => service.getPublicByCode('CODE12345678'), 2003)
  })

  it('用例8：visibleFields=[basics] → 仅返回 basics，不泄露 customer/pricing/items/extra；浏览数自增被触发', async () => {
    prisma.orderShare.findUnique.mockResolvedValue(shareRow({ visibleFields: ['basics'] }) as any)
    prisma.order.findUnique.mockResolvedValue(orderRow() as any)
    prisma.merchant.findUnique.mockResolvedValue({
      id: 'm1',
      name: '门窗店',
      contactPhone: '123',
    } as any)

    const res: any = await service.getPublicByCode('CODE12345678')

    // 命中字段
    expect(res.basics).toBeDefined()
    // 字段门控：未授权字段一律不出现在返回 JSON 中（防 devtools 反向取敏感信息）
    expect(res.customer).toBeUndefined()
    expect(res.pricing).toBeUndefined()
    expect(res.items).toBeUndefined()
    expect(res.extra).toBeUndefined()

    // 浏览数自增 update 被触发（实现可能 fire-and-forget，等一拍微任务）
    await Promise.resolve()
    await Promise.resolve()
    expect(prisma.orderShare.update).toHaveBeenCalled()
  })
})

describe('OrderShareService.listByMerchant（真分页 skip/take + count + orderNo 拼接）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: OrderShareService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new OrderShareService(prisma as any)
  })

  it('用例9：findMany 带 skip/take（真分页，非 take:500），count 取 total，行带 orderNo', async () => {
    prisma.orderShare.findMany.mockResolvedValue([
      {
        shareCode: 'C1',
        orderId: 'o1',
        merchantId: 'm1',
        visibleFields: ['basics'],
        expiresAt: null,
        intro: '报价',
        viewCount: 3,
        revoked: false,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
    ] as any)
    prisma.orderShare.count.mockResolvedValue(42 as any)
    prisma.order.findMany.mockResolvedValue([{ id: 'o1', no: 'NO-1' }] as any)

    const res: any = await service.listByMerchant('m1', { page: 2, pageSize: 20 })

    // 真分页：findMany 必须带 skip/take，绝不是内存切 take:500
    const findArg = prisma.orderShare.findMany.mock.calls[0][0] as any
    expect(findArg.skip).toBe(20) // (page2-1)*20
    expect(findArg.take).toBe(20)
    expect(findArg.take).not.toBe(500)

    // total 来自 count，而非当前页行数
    expect(prisma.orderShare.count).toHaveBeenCalledTimes(1)
    expect(res.total).toBe(42)

    // 列表行拼接了订单号
    expect(res.list).toHaveLength(1)
    expect(res.list[0].orderNo).toBe('NO-1')
  })
})
