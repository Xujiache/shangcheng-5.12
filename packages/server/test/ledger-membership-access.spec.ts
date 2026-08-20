import { describe, expect, it, jest } from '@jest/globals'

// ledger.constants 间接依赖 nanoid；测试只验证会员门禁，不需要真实邀请码熵源。
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'AAAAAAAA',
}))

import { LedgerService } from '../src/modules/ledger/ledger.service'
import { BizCode, BizException } from '../src/common/exceptions/biz.exception'
import { LedgerMembershipGuard } from '../src/modules/ledger/guards/ledger-membership.guard'

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

function guardContext(method: string, originalUrl: string, membership: any): any {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, originalUrl, ledgerUser: { membership } }),
    }),
  }
}

describe('LedgerMembershipGuard 到期会员订单只读', () => {
  const guard = new LedgerMembershipGuard()
  const expiredMembership = { active: false, expired: true }

  it.each(['/api/v1/l/orders', '/api/v1/l/orders/order-1?source=history'])(
    '%s 的 GET 请求可读取历史订单',
    (url) => {
      expect(guard.canActivate(guardContext('GET', url, expiredMembership))).toBe(true)
    },
  )

  it.each([
    ['POST', '/api/v1/l/orders'],
    ['PATCH', '/api/v1/l/orders/order-1'],
    ['DELETE', '/api/v1/l/orders/order-1'],
    ['GET', '/api/v1/l/customers'],
    ['GET', '/api/v1/l/work-logs?month=2026-06'],
    ['POST', '/api/v1/l/work-logs'],
  ])('%s %s 仍受会员闸门保护', (method, url) => {
    expect(() => guard.canActivate(guardContext(method, url, expiredMembership))).toThrow(
      BizException,
    )
    try {
      guard.canActivate(guardContext(method, url, expiredMembership))
    } catch (error) {
      expect((error as BizException).getResponse()).toMatchObject({ code: BizCode.MEMBER_EXPIRED })
    }
  })
})
