import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require，使用轻量替身。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return out
  },
}))

import { LedgerAdminService } from '../src/modules/ledger/ledger-admin.service'

const DAY_MS = 86_400_000

// approx：两个时间戳相差不超过 toleranceMs（默认 5s）。
function approxMs(actual: number, expected: number, toleranceMs = 5000) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceMs)
}

function buildPrisma() {
  const delegates = {
    ledgerUser: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      count: jest.fn(async (..._a: any[]) => 0),
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerMembership: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerMembershipLog: {
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      findMany: jest.fn(async (..._a: any[]) => [] as any),
    },
    ledgerNotification: {
      create: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerConfig: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      upsert: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerFeedback: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      count: jest.fn(async (..._a: any[]) => 0),
    },
  }
  return {
    ...delegates,
    $transaction: jest.fn(
      async (
        work: (tx: typeof delegates) => Promise<unknown>,
        _options?: { isolationLevel?: string },
      ) => work(delegates),
    ),
  }
}

describe('LedgerAdminService.grantMembership', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAdminService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerAdminService(prisma as any)
  })

  it('用例1：planKey=month 从未开通 → 到期≈now+30d，日志 deltaDays=30/beforeAt=null', async () => {
    // 用户存在，会员行存在但 expiresAt=null（从未开通）
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
      id: 'm1',
      expiresAt: null,
      lastPlanKey: null,
      perpetual: false,
    } as any)
    // update 回传一个带 expiresAt 的会员，便于 deriveMembership 派生状态
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm1',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
    }))

    const now = Date.now()
    const res = await service.grantMembership('u1', { planKey: 'month' } as any, 'op1')

    expect(res.deltaDays).toBe(30)

    // ledgerMembership.update 的 expiresAt ≈ now + 30d
    const updateArg = prisma.ledgerMembership.update.mock.calls[0][0] as any
    approxMs(new Date(updateArg.data.expiresAt).getTime(), now + 30 * DAY_MS)

    // 日志：deltaDays=30, beforeAt=null
    const logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0] as any
    expect(logArg.data.deltaDays).toBe(30)
    expect(logArg.data.beforeAt).toBeNull()
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
  })

  it('用例2：days 与 planKey 同传 → days 优先（days=5, planKey=year → delta=5）', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
      id: 'm1',
      expiresAt: null,
      lastPlanKey: null,
      perpetual: false,
    } as any)
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm1',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
    }))

    const now = Date.now()
    const res = await service.grantMembership('u1', { days: 5, planKey: 'year' } as any)

    expect(res.deltaDays).toBe(5)
    const logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0] as any
    expect(logArg.data.deltaDays).toBe(5)
    // 到期≈now+5d（证明用的是 days=5 而非 year=365）
    const updateArg = prisma.ledgerMembership.update.mock.calls[0][0] as any
    approxMs(new Date(updateArg.data.expiresAt).getTime(), now + 5 * DAY_MS)
  })

  it('用例3：无 days 且 planKey 非法/缺失 → 1001', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)

    try {
      await service.grantMembership('u1', { planKey: 'nope' } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
    // 既未写会员也未写日志
    expect(prisma.ledgerMembership.update).not.toHaveBeenCalled()
    expect(prisma.ledgerMembershipLog.create).not.toHaveBeenCalled()
  })

  it('用例4：当前到期+10d，叠加 30 → afterAt≈+40d（不浪费剩余时长）', async () => {
    const now = Date.now()
    const currentExpiry = new Date(now + 10 * DAY_MS)
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
      id: 'm1',
      expiresAt: currentExpiry,
      lastPlanKey: 'month',
      perpetual: false,
    } as any)
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm1',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
    }))

    const res = await service.grantMembership('u1', { days: 30 } as any)
    expect(res.deltaDays).toBe(30)

    // 在原到期日(+10d)基础上续 30 天 → ≈ now+40d
    const updateArg = prisma.ledgerMembership.update.mock.calls[0][0] as any
    approxMs(new Date(updateArg.data.expiresAt).getTime(), now + 40 * DAY_MS)
    // 日志 beforeAt 是续费前的原到期日
    const logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0] as any
    expect(new Date(logArg.data.beforeAt).getTime()).toBe(currentExpiry.getTime())
  })

  it('用例5：会员行缺失 → 自动创建后再开通', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce(null) // 没有 1:1 会员行
    prisma.ledgerMembership.create.mockResolvedValueOnce({
      id: 'm-new',
      expiresAt: null,
      lastPlanKey: null,
    } as any)
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm-new',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
    }))

    await service.grantMembership('u1', { days: 7 } as any)

    // 自动建会员行
    expect(prisma.ledgerMembership.create).toHaveBeenCalledTimes(1)
    const createArg = prisma.ledgerMembership.create.mock.calls[0][0] as any
    expect(createArg.data.userId).toBe('u1')
    // 用新建会员的 id 写更新与日志
    const updateArg = prisma.ledgerMembership.update.mock.calls[0][0] as any
    expect(updateArg.where.id).toBe('m-new')
    const logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0] as any
    expect(logArg.data.membershipId).toBe('m-new')
  })

  it('用例6：通知写入失败不影响返回（best-effort）', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
      id: 'm1',
      expiresAt: null,
      lastPlanKey: null,
      perpetual: false,
    } as any)
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm1',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
    }))
    prisma.ledgerNotification.create.mockRejectedValueOnce(new Error('db down') as any)

    const res = await service.grantMembership('u1', { days: 30 } as any)
    // 通知失败被吞掉，主流程照常返回
    expect(res.deltaDays).toBe(30)
    expect(res.membership).toBeDefined()
    expect(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1)
  })

  it('用例7：动态永久套餐 → expiresAt=null + 永久审计/通知，不写 3650 天', async () => {
    const oldExpiry = new Date(Date.now() + 30 * DAY_MS)
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
      value: {
        plans: [
          {
            key: 'lifetime',
            label: '永久会员',
            days: 3650,
            price: '¥999',
            perpetual: true,
          },
        ],
      },
    } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
      id: 'm1',
      expiresAt: oldExpiry,
      lastPlanKey: 'month',
      perpetual: false,
    } as any)
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm1',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
      perpetual: args.data.perpetual,
      trialClaimedAt: null,
    }))

    const res = await service.grantMembership(
      'u1',
      { planKey: 'lifetime', note: '客户付费' } as any,
      'op1',
    )

    expect(res.deltaDays).toBe(0)
    expect(res.membership).toMatchObject({
      active: true,
      perpetual: true,
      expiresAt: null,
      lastPlanKey: 'lifetime',
    })
    const updateArg = prisma.ledgerMembership.update.mock.calls[0][0] as any
    expect(updateArg.data).toMatchObject({
      expiresAt: null,
      lastPlanKey: 'lifetime',
      perpetual: true,
      updatedById: 'op1',
    })
    const logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0] as any
    expect(logArg.data).toMatchObject({
      deltaDays: 0,
      planKey: 'lifetime',
      beforeAt: oldExpiry,
      afterAt: null,
      note: '开通永久会员；客户付费',
    })
    expect(prisma.ledgerNotification.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: 'member',
        title: '永久会员已开通',
        body: '已为您开通永久会员，长期有效。',
      },
    })
  })

  it('用例8：审计日志写入失败 → 授予失败且不发成功通知', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
      id: 'm1',
      expiresAt: null,
      lastPlanKey: null,
      perpetual: false,
    } as any)
    prisma.ledgerMembership.update.mockImplementationOnce(async (args: any) => ({
      id: 'm1',
      expiresAt: args.data.expiresAt,
      lastPlanKey: args.data.lastPlanKey,
    }))
    prisma.ledgerMembershipLog.create.mockRejectedValueOnce(new Error('audit failed') as any)

    await expect(service.grantMembership('u1', { days: 30 } as any)).rejects.toThrow('audit failed')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.ledgerNotification.create).not.toHaveBeenCalled()
  })
})

describe('LedgerAdminService.updateConfig', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAdminService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerAdminService(prisma as any)
  })

  it('用例9：normalizeLedgerConfig 收口 — 仅保留邀请奖励与会员套餐配置', async () => {
    // 当前持久化里有越界的 inviteRewardDays
    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
      value: { inviteRewardDays: 99999 },
    } as any)

    const merged = await service.updateConfig({ inviteMaxRewarded: -5 } as any)

    // 邀请参数被钳制，历史试用字段不会再写回全局配置。
    expect(merged.inviteRewardDays).toBe(3650)
    expect(merged.inviteMaxRewarded).toBe(0)
    expect(merged).not.toHaveProperty('cutTrialDays')
    expect(merged).not.toHaveProperty('cutRequireMembership')

    // upsert 落库的也是收口后的值
    const upsertArg = prisma.ledgerConfig.upsert.mock.calls[0][0] as any
    expect(upsertArg.update.value.inviteRewardDays).toBe(3650)
    expect(upsertArg.update.value.inviteMaxRewarded).toBe(0)
  })
})
