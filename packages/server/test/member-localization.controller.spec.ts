jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TEST00000001' }))
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }), { virtual: true })

import { MerchantController } from '../src/modules/merchant/merchant.controller'

describe('MerchantController membership language negotiation', () => {
  const user = { sub: 'user-1', merchantId: 'merchant-1' }

  function setup() {
    const service = {
      ensureMerchantId: jest.fn(async () => 'merchant-1'),
      memberPlans: jest.fn(async () => []),
      myMembership: jest.fn(async () => null),
      myPayments: jest.fn(async () => []),
      membershipNotices: jest.fn(async () => []),
    }
    return {
      service,
      controller: new MerchantController(service as never, {} as never),
    }
  }

  it('forwards Accept-Language to every localized membership response', async () => {
    const { controller, service } = setup()

    await controller.memberPlans('en-US')
    await controller.myMembership(user as never, 'en-US')
    await controller.payments(user as never, 'en-US')
    await controller.notices(user as never, 'en-US')

    expect(service.memberPlans).toHaveBeenCalledWith('en-US')
    expect(service.myMembership).toHaveBeenCalledWith('merchant-1', 'en-US')
    expect(service.myPayments).toHaveBeenCalledWith('merchant-1', 'en-US')
    expect(service.membershipNotices).toHaveBeenCalledWith('merchant-1', 'en-US')
  })
})
