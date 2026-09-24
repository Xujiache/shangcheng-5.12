jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TEST00000001' }))
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }), { virtual: true })

import { PlatformService } from '../src/modules/platform/platform.service'

describe('PlatformService bilingual member-plan validation', () => {
  function serviceWith(memberPlan: object) {
    const prisma = { memberPlan }
    return new PlatformService(prisma as never, {} as never, {} as never, undefined)
  }

  it('rejects a newly active plan without reviewed English copy', async () => {
    const service = serviceWith({ create: jest.fn() })
    await expect(
      service.saveMemberPlan({
        name: '自定义套餐',
        code: 'custom',
        rights: ['权益'],
        status: 'active',
      }),
    ).rejects.toMatchObject({ response: { code: 1001 } })
  })

  it('requires English copy when re-enabling a legacy disabled plan', async () => {
    const service = serviceWith({
      findUnique: jest.fn(async () => ({
        id: 'plan-1',
        status: 'disabled',
        nameEn: null,
        rightsEn: null,
      })),
      update: jest.fn(),
    })
    await expect(service.saveMemberPlan({ id: 'plan-1', status: 'active' })).rejects.toMatchObject({
      response: { code: 1001 },
    })
  })
})
