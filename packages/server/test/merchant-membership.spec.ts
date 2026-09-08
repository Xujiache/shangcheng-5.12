import { describe, expect, it, jest } from '@jest/globals'

// nanoid@5 是纯 ESM；服务类会间接导入 id.util，因此在 CJS Jest 中提供轻量替身。
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'ANDROIDTEST1',
}))

import { BizCode, BizException } from '../src/common/exceptions/biz.exception'
import { MerchantService } from '../src/modules/merchant/merchant.service'

describe('MerchantService.subscribe 客户端支付门禁', () => {
  it('Android 支付未启用时在创建支付单之前拒绝', async () => {
    const prisma = {
      memberPlan: { findUnique: jest.fn() },
      paymentRecord: { create: jest.fn() },
    }
    const wxpay = { isReady: jest.fn(), createMiniPay: jest.fn() }
    const service = new MerchantService(prisma as any, wxpay as any, {} as any)

    await expect(
      service.subscribe('merchant-1', 'user-1', {
        planId: 'plan-1',
        payMethod: 'wechat',
        clientPlatform: 'android',
      }),
    ).rejects.toBeInstanceOf(BizException)

    try {
      await service.subscribe('merchant-1', 'user-1', {
        planId: 'plan-1',
        clientPlatform: 'android',
      })
    } catch (error) {
      expect((error as BizException).getResponse()).toMatchObject({
        code: BizCode.BUSINESS_ERROR,
        message: 'Android 支付即将开放',
      })
    }
    expect(prisma.memberPlan.findUnique).not.toHaveBeenCalled()
    expect(prisma.paymentRecord.create).not.toHaveBeenCalled()
    expect(wxpay.createMiniPay).not.toHaveBeenCalled()
  })

  it('拒绝未知客户端且不访问数据库', async () => {
    const prisma = { memberPlan: { findUnique: jest.fn() } }
    const service = new MerchantService(prisma as any, {} as any, {} as any)

    await expect(
      service.subscribe('merchant-1', 'user-1', {
        planId: 'plan-1',
        clientPlatform: 'desktop' as any,
      }),
    ).rejects.toMatchObject({
      response: { code: BizCode.INVALID_PARAMS },
    })
    expect(prisma.memberPlan.findUnique).not.toHaveBeenCalled()
  })
})

describe('MerchantService.membershipNotices language negotiation', () => {
  it('returns localized quota warnings without changing the quota contract', async () => {
    const service = new MerchantService({} as any, {} as any, {} as any)
    jest.spyOn(service, 'quota').mockResolvedValue({
      pushSlotsLimit: 10,
      pushSlotsUsed: 8,
      bannerLimit: 2,
      bannerUsed: 2,
      impressionLimit: 100,
      impressionUsed: 10,
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-09-01T00:00:00.000Z'),
    } as any)

    await expect(service.membershipNotices('merchant-1', 'en-US')).resolves.toEqual([
      {
        type: 'warn',
        text: 'Featured plaza slots used: 8/10',
        link: '/merchant/member',
      },
      {
        type: 'error',
        text: 'Banner quota has been fully used',
        link: '/merchant/member',
      },
    ])
    await expect(service.membershipNotices('merchant-1', 'zh-CN')).resolves.toEqual([
      {
        type: 'warn',
        text: '广场推荐次数已用 8/10',
        link: '/merchant/member',
      },
      {
        type: 'error',
        text: 'Banner 配额已用尽',
        link: '/merchant/member',
      },
    ])
  })
})
