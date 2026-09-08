import { describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'PLAZATEST',
}))

import { MerchantService } from '../src/modules/merchant/merchant.service'

describe('MerchantService.plazaProducts 选品筛选', () => {
  it('把标签、关键词和内部商户隔离同时下推到分页查询与总数统计', async () => {
    const findMany = jest.fn<any>().mockResolvedValue([])
    const count = jest.fn<any>().mockResolvedValue(0)
    const prisma = {
      systemConfig: {
        findUnique: jest.fn<any>().mockResolvedValue({ value: ['internal-merchant'] }),
      },
      product: { findMany, count },
    }
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    const result = await service.plazaProducts('current-merchant', {
      keyword: '系统门窗',
      tags: '厂家直供',
      page: 2,
      pageSize: 20,
    })

    const expectedWhere = {
      status: 'active',
      merchantId: { notIn: ['current-merchant', 'internal-merchant'] },
      name: { contains: '系统门窗', mode: 'insensitive' },
      tags: { has: '厂家直供' },
    }
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere, skip: 20, take: 20 }),
    )
    expect(count).toHaveBeenCalledWith({ where: expectedWhere })
    expect(result).toEqual({ list: [], total: 0, page: 2, pageSize: 20, hasMore: false })
  })
})

describe('MerchantService 代理商品按单品变更', () => {
  const application = {
    id: 'application-1',
    merchantId: 'merchant-1',
    factoryMerchantId: 'factory-1',
    productIds: ['product-1', 'product-2'],
    markupPercent: 30,
    autoSyncPrice: true,
    message: 'test',
    status: 'approved',
  }

  it('调整一件商品的售价时拆分申请，不影响同批其它商品', async () => {
    const update = jest.fn<any>().mockResolvedValue({})
    const create = jest.fn<any>().mockResolvedValue({ id: 'application-2' })
    const prisma = {
      agencyApplication: {
        findFirst: jest.fn<any>().mockResolvedValue(application),
      },
      $transaction: jest.fn<any>().mockImplementation(async (work: any) =>
        work({ agencyApplication: { update, create } }),
      ),
    }
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    await expect(
      service.updateAgencyApplication('merchant-1', 'application-1:product-1', {
        markupRatio: 45,
      }),
    ).resolves.toEqual({ ok: true, id: 'application-2:product-1' })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'application-1' },
      data: { productIds: ['product-2'] },
    })
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        merchantId: 'merchant-1',
        productIds: ['product-1'],
        markupPercent: 45,
        status: 'approved',
      }),
    })
  })

  it('撤销一件商品时只从申请中移除目标商品', async () => {
    const update = jest.fn<any>().mockResolvedValue({})
    const remove = jest.fn<any>().mockResolvedValue({})
    const prisma = {
      agencyApplication: {
        findFirst: jest.fn<any>().mockResolvedValue(application),
        update,
        delete: remove,
      },
    }
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    await expect(
      service.cancelAgencyApplication('merchant-1', 'application-1:product-1'),
    ).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'application-1' },
      data: { productIds: ['product-2'] },
    })
    expect(remove).not.toHaveBeenCalled()
  })

  it('拒绝不属于申请的复合商品 id', async () => {
    const prisma = {
      agencyApplication: {
        findFirst: jest.fn<any>().mockResolvedValue(application),
      },
    }
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    await expect(
      service.cancelAgencyApplication('merchant-1', 'application-1:other-product'),
    ).rejects.toMatchObject({ message: '代理商品不存在' })
  })
})
