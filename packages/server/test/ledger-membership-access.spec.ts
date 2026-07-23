import { describe, expect, it, jest } from '@jest/globals'

// ledger.constants 间接依赖 nanoid；测试只验证会员门禁，不需要真实邀请码熵源。
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'AAAAAAAA',
}))

import { LedgerService } from '../src/modules/ledger/ledger.service'

const userWith = (membership: any) => ({
  id: 'wechat-user-1',
  membership,
})

describe('LedgerService.cutAccess 会员闸门', () => {
  it('未开通会员的微信账号不会获得优化下料权限', async () => {
    const prisma = {
      ledgerUser: {
        findUnique: jest.fn(async () => userWith(null) as any),
      },
    }
    const service = new LedgerService(prisma as any)

    await expect(service.cutAccess('wechat-user-1')).resolves.toMatchObject({
      allowed: false,
      mode: 'locked',
      reason: '优化下料为会员功能，开通会员后即可使用',
      membership: { active: false, never: true },
    })
  })

  it('有效会员仅按该微信账号所属会员档案放行', async () => {
    const prisma = {
      ledgerUser: {
        findUnique: jest.fn(
          async () =>
            userWith({
              expiresAt: new Date(Date.now() + 86_400_000),
              lastPlanKey: 'month',
              perpetual: false,
              trialClaimedAt: null,
            }) as any,
        ),
      },
    }
    const service = new LedgerService(prisma as any)

    await expect(service.cutAccess('wechat-user-1')).resolves.toMatchObject({
      allowed: true,
      mode: 'member',
      membership: { active: true, lastPlanKey: 'month' },
    })
  })
})
