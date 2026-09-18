import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'DASHBOARDTEST',
}))

import { MerchantService } from '../src/modules/merchant/merchant.service'

function makePrisma(previousAmount = 100) {
  const orderAggregate = jest
    .fn<any>()
    .mockResolvedValueOnce({ _count: { _all: 2 }, _sum: { payAmount: 300 } })
    .mockResolvedValueOnce({
      _count: { _all: previousAmount > 0 ? 1 : 0 },
      _sum: { payAmount: previousAmount },
    })

  const orderGroupBy = jest
    .fn<any>()
    .mockResolvedValueOnce([{ userId: 'customer-1' }, { userId: 'customer-2' }])
    .mockResolvedValueOnce(previousAmount > 0 ? [{ userId: 'customer-1' }] : [])

  return {
    order: {
      aggregate: orderAggregate,
      findMany: jest.fn<any>().mockResolvedValue([
        { paidAt: new Date('2026-08-21T16:30:00.000Z'), payAmount: 50 },
        { paidAt: new Date('2026-08-26T16:00:00.000Z'), payAmount: 100 },
        { paidAt: new Date('2026-08-27T03:00:00.000Z'), payAmount: 200 },
      ]),
      groupBy: orderGroupBy,
      count: jest.fn<any>().mockResolvedValue(4),
    },
    refund: { count: jest.fn<any>().mockResolvedValue(2) },
    store: { count: jest.fn<any>().mockResolvedValue(1) },
    chatSession: {
      aggregate: jest.fn<any>().mockResolvedValue({ _sum: { unreadCount: 7 } }),
    },
    product: {
      count: jest
        .fn<any>()
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1),
      findMany: jest.fn<any>().mockResolvedValue([
        {
          id: 'plaza-product-1',
          name: '真实广场商品',
          images: ['https://example.com/product.png'],
          merchantId: 'factory-2',
          merchant: { id: 'factory-2', name: '其他厂家' },
          priceWholesaleMin: 88,
          priceRetailMin: 100,
          sales: 10,
          tags: [],
        },
      ]),
    },
    agencyApplication: { findMany: jest.fn<any>().mockResolvedValue([]) },
    plazaPush: { findMany: jest.fn<any>().mockResolvedValue([]) },
    systemConfig: {
      findUnique: jest.fn<any>().mockResolvedValue({ value: ['internal-test-merchant'] }),
      findMany: jest.fn<any>().mockResolvedValue([]),
    },
  }
}

describe('MerchantService.dashboard 商家工作台', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-27T04:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('按北京时间 paidAt 统计真实成交并返回兼容字段和待办', async () => {
    const prisma = makePrisma()
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    const result = await service.dashboard('merchant-1')

    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          merchantId: 'merchant-1',
          paidAt: {
            gte: new Date('2026-08-26T16:00:00.000Z'),
            lt: new Date('2026-08-27T16:00:00.000Z'),
          },
        },
      }),
    )
    expect(result.workbench.overview).toEqual({
      paidAmount: 300,
      paidOrders: 2,
      paidCustomers: 2,
      versusYesterday: {
        paidAmountPct: 200,
        paidOrdersPct: 100,
        paidCustomersPct: 100,
      },
    })
    expect(result.workbench.actions).toEqual({
      pendingShipment: 4,
      pendingRefund: 2,
      unreadMessages: 7,
      rejectedProducts: 3,
      auditingProducts: 5,
      pendingStoreAuth: 1,
    })
    expect(result.workbench.trend7d).toHaveLength(7)
    expect(result.workbench.trend7d.at(-1)).toEqual({ date: '2026-08-27', paidAmount: 300 })
    expect(result.today).toMatchObject({ orders: 2, newCustomers: 2, sales: 300 })
    expect(result.todos).toEqual({ pendingShipment: 4, pendingRefund: 2, pendingStoreAuth: 1 })
    expect(result.plazaHighlights).toEqual([
      {
        productId: 'plaza-product-1',
        productImage: 'https://example.com/product.png',
        price: 88,
      },
    ])

    const plazaWhere = ((prisma.product.findMany as jest.Mock).mock.calls[0]?.[0] as any)?.where
    expect(plazaWhere.merchantId.notIn).toEqual(
      expect.arrayContaining(['merchant-1', 'internal-test-merchant']),
    )
  })

  it('昨日没有成交时环比返回 null 而不是虚假 100%', async () => {
    const prisma = makePrisma(0)
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    const result = await service.dashboard('merchant-1')

    expect(result.workbench.overview.versusYesterday).toEqual({
      paidAmountPct: null,
      paidOrdersPct: null,
      paidCustomersPct: null,
    })
  })
})
