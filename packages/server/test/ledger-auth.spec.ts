import { beforeEach, describe, expect, it, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 使用确定性替身。
jest.mock('nanoid', () => ({
  customAlphabet: (_alphabet: string, size: number) => () => 'A'.repeat(size),
}))

import { LedgerAuthService } from '../src/modules/ledger/ledger-auth.service'

function buildPrisma() {
  return {
    ledgerUser: {
      findUnique: jest.fn(async (..._args: any[]) => null as any),
      create: jest.fn(async (..._args: any[]) => null as any),
      update: jest.fn(async (..._args: any[]) => ({}) as any),
      count: jest.fn(async (..._args: any[]) => 0),
    },
    ledgerConfig: {
      findUnique: jest.fn(async (..._args: any[]) => null as any),
    },
    systemConfig: {
      findUnique: jest.fn(async (..._args: any[]) => null as any),
    },
    ledgerMembership: {
      create: jest.fn(async (..._args: any[]) => null as any),
      upsert: jest.fn(async (..._args: any[]) => null as any),
      update: jest.fn(async (..._args: any[]) => null as any),
    },
    ledgerMembershipLog: {
      create: jest.fn(async (..._args: any[]) => null as any),
    },
    ledgerNotification: {
      create: jest.fn(async (..._args: any[]) => null as any),
    },
  }
}

function buildService(prisma: ReturnType<typeof buildPrisma>) {
  const jwt = { signAsync: jest.fn(async () => 'ledger-token') }
  const service = new LedgerAuthService(prisma as any, jwt as any)
  ;(service as any).jscode2session = jest.fn(async () => 'openid-1')
  return { service, jwt }
}

const activeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-abc12345',
  nickname: '微信用户',
  avatar: null,
  status: 'active',
  membership: null,
  ...overrides,
})

describe('LedgerAuthService 纯微信登录', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAuthService

  beforeEach(() => {
    prisma = buildPrisma()
    service = buildService(prisma).service
  })

  it('已有 openid 直接登录，不重复建号', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce(activeUser() as any)

    const result = await service.wechatLogin({ code: 'wx-code' })

    expect(result.token).toBe('ledger-token')
    expect(result.created).toBe(false)
    expect(result.user).toMatchObject({
      id: 'user-abc12345',
      accountCode: 'ABC12345',
      nickname: '微信用户',
    })
    expect(prisma.ledgerUser.create).not.toHaveBeenCalled()
    expect(prisma.ledgerUser.update).toHaveBeenCalledWith({
      where: { id: 'user-abc12345' },
      data: { lastLoginAt: expect.any(Date) },
    })
  })

  it('历史微信账号缺少会员行时，登录会补建默认未开通会员档案', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce(activeUser() as any)
    prisma.ledgerMembership.upsert.mockResolvedValueOnce({
      id: 'member-1',
      userId: 'user-abc12345',
      expiresAt: null,
      lastPlanKey: null,
      perpetual: false,
      trialClaimedAt: null,
    } as any)

    const result = await service.wechatLogin({ code: 'wx-code' })

    expect(prisma.ledgerMembership.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-abc12345' },
      create: { userId: 'user-abc12345' },
      update: {},
    })
    expect(result.membership).toMatchObject({ active: false, never: true })
  })

  it('首次微信登录自动创建账号和空会员记录', async () => {
    const created = activeUser()
    prisma.ledgerUser.findUnique.mockResolvedValueOnce(null as any)
    prisma.ledgerUser.create.mockResolvedValueOnce(created as any)

    const result = await service.wechatLogin({ code: 'wx-code' })

    expect(result.created).toBe(true)
    expect(prisma.ledgerUser.create).toHaveBeenCalledWith({
      data: {
        wxOpenid: 'openid-1',
        nickname: '微信用户',
        inviteCode: 'AAAAAAAA',
        invitedById: null,
        membership: { create: {} },
      },
      include: { membership: true },
    })
    const data = (prisma.ledgerUser.create.mock.calls[0][0] as any).data
    expect(data).not.toHaveProperty('phone')
    expect(data).not.toHaveProperty('passwordHash')
  })

  it('同一 openid 并发首次登录时复用唯一索引已创建账号', async () => {
    prisma.ledgerUser.findUnique
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(activeUser() as any)
    prisma.ledgerUser.create.mockRejectedValueOnce({ code: 'P2002' })

    const result = await service.wechatLogin({ code: 'wx-code' })

    expect(result.created).toBe(false)
    expect(result.user.id).toBe('user-abc12345')
  })

  it('禁用的微信账号不能登录', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce(activeUser({ status: 'disabled' }) as any)

    await expect(service.wechatLogin({ code: 'wx-code' })).rejects.toMatchObject({
      message: '账号已被禁用，请联系管理员',
    })
    expect(prisma.ledgerUser.update).not.toHaveBeenCalled()
  })

  it('邀请奖励只在好友首次微信登录建号后发放', async () => {
    const inviter = {
      id: 'inviter-87654321',
      status: 'active',
      membership: {
        id: 'member-1',
        expiresAt: null,
        lastPlanKey: null,
      },
    }
    prisma.ledgerUser.findUnique
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: inviter.id, status: 'active' } as any)
      .mockResolvedValueOnce(inviter as any)
    prisma.ledgerUser.create.mockResolvedValueOnce(activeUser() as any)
    prisma.ledgerUser.count.mockResolvedValueOnce(1)
    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
      value: { inviteRewardDays: 7, inviteMaxRewarded: 50 },
    } as any)

    const result = await service.wechatLogin({ code: 'wx-code', inviteCode: 'invite88' })

    expect(result.created).toBe(true)
    expect(prisma.ledgerUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invitedById: inviter.id }),
      }),
    )
    expect(prisma.ledgerMembershipLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        membershipId: 'member-1',
        deltaDays: 7,
        planKey: 'invite',
      }),
    })
    expect(prisma.ledgerNotification.create).toHaveBeenCalled()
  })
})

describe('LedgerAuthService 登录页公开配置', () => {
  it('只返回品牌 LOGO，不再返回其他登录方式开关', async () => {
    const prisma = buildPrisma()
    prisma.systemConfig.findUnique.mockResolvedValueOnce({
      value: { site: { logo: 'https://cdn.example/logo.png' } },
    } as any)
    const service = buildService(prisma).service

    await expect(service.getPublicConfig()).resolves.toEqual({
      logoUrl: 'https://cdn.example/logo.png',
    })
  })
})
