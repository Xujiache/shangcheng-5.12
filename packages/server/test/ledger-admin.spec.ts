import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require。用一份"忠实"的轻量替身：
// customAlphabet 仍按传入字符集 + 长度随机取字符，从而保留 genPassword 的
// 长度(8)/字符集契约可被真实验证（仅替换熵源，不改变可观察行为）。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return out
  },
}))

// argon2 是原生模块且哈希很慢；测试只关心"密码被哈希后落库"，替身保留可观察契约。
jest.mock('argon2', () => ({
  hash: jest.fn(async (plain: string) => `hashed:${plain}`),
}))

import { LedgerAdminService } from '../src/modules/ledger/ledger-admin.service'

// genPassword 的字符集（与 src 中一致），用于验证返回密码只来自此集合。
const PWD_CHARSET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const DAY_MS = 86_400_000

// approx：两个时间戳相差不超过 toleranceMs（默认 5s）。
function approxMs(actual: number, expected: number, toleranceMs = 5000) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceMs)
}

function buildPrisma() {
  return {
    ledgerUser: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      findMany: jest.fn(async (..._a: any[]) => [] as any),
      count: jest.fn(async (..._a: any[]) => 0),
      create: jest.fn(async (..._a: any[]) => ({}) as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerMembership: {
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
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      membership: { id: 'm1', expiresAt: null, lastPlanKey: null },
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
  })

  it('用例2：days 与 planKey 同传 → days 优先（days=5, planKey=year → delta=5）', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      membership: { id: 'm1', expiresAt: null, lastPlanKey: null },
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
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      membership: { id: 'm1', expiresAt: null, lastPlanKey: null },
    } as any)

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
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      membership: { id: 'm1', expiresAt: currentExpiry, lastPlanKey: 'month' },
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
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      membership: null, // 没有 1:1 会员行
    } as any)
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
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      membership: { id: 'm1', expiresAt: null, lastPlanKey: null },
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
})

describe('LedgerAdminService.resetPassword', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAdminService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerAdminService(prisma as any)
  })

  it('用例7：返回 8 位密码（仅来自指定字符集），update 设置 mustReset=true', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' } as any)

    const { password } = await service.resetPassword('u1')

    expect(password).toHaveLength(8)
    for (const ch of password) {
      expect(PWD_CHARSET).toContain(ch)
    }
    const updateArg = prisma.ledgerUser.update.mock.calls[0][0] as any
    expect(updateArg.data.mustReset).toBe(true)
  })
})

describe('LedgerAdminService.createUser', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAdminService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerAdminService(prisma as any)
  })

  it('用例8a：手机号格式不合法 → 1001', async () => {
    try {
      await service.createUser({ phone: '12345' } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1001)
    }
  })

  it('用例8b：手机号已存在 → 1003', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'dup' } as any)
    try {
      await service.createUser({ phone: '13800138000' } as any)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as any).getResponse().code).toBe(1003)
    }
  })

  it('用例8c：未传密码 → 返回 8 位 generatedPassword 且 create 设 mustReset=true', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce(null as any) // 无重复
    prisma.ledgerUser.create.mockResolvedValueOnce({
      id: 'u-new',
      phone: '13800138000',
      membership: { expiresAt: null, lastPlanKey: null },
    } as any)

    const res = await service.createUser({ phone: '13800138000' } as any)

    expect(res.generatedPassword).toBeDefined()
    expect(res.generatedPassword).toHaveLength(8)
    for (const ch of res.generatedPassword as string) {
      expect(PWD_CHARSET).toContain(ch)
    }
    const createArg = prisma.ledgerUser.create.mock.calls[0][0] as any
    expect(createArg.data.mustReset).toBe(true)
  })

  it('用例8d：显式传密码 → 无 generatedPassword 且 mustReset=false', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce(null as any)
    prisma.ledgerUser.create.mockResolvedValueOnce({
      id: 'u-new',
      phone: '13800138000',
      membership: { expiresAt: null, lastPlanKey: null },
    } as any)

    const res = await service.createUser({
      phone: '13800138000',
      password: 'mySecret123',
    } as any)

    expect(res.generatedPassword).toBeUndefined()
    const createArg = prisma.ledgerUser.create.mock.calls[0][0] as any
    expect(createArg.data.mustReset).toBe(false)
  })
})

describe('LedgerAdminService.updateConfig', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAdminService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerAdminService(prisma as any)
  })

  it('用例9：normalizeLedgerConfig 收口 — inviteRewardDays 封顶 3650、cutTrialDays 下限 0', async () => {
    // 当前持久化里有越界的 inviteRewardDays
    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
      value: { inviteRewardDays: 99999 },
    } as any)

    const merged = await service.updateConfig({ cutTrialDays: -5 } as any)

    // inviteRewardDays 被钳到上限 3650，cutTrialDays 被钳到下限 0
    expect(merged.inviteRewardDays).toBe(3650)
    expect(merged.cutTrialDays).toBe(0)

    // upsert 落库的也是收口后的值
    const upsertArg = prisma.ledgerConfig.upsert.mock.calls[0][0] as any
    expect(upsertArg.update.value.inviteRewardDays).toBe(3650)
    expect(upsertArg.update.value.cutTrialDays).toBe(0)
  })
})
