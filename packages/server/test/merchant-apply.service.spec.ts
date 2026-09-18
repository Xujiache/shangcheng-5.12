import { describe, expect, it, jest } from '@jest/globals'

// UserMpService 间接导入 nanoid@5（纯 ESM），ts-jest 的 CJS 环境用等价 mock。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => alphabet[0].repeat(size),
}))

import { UserMpService } from '../src/modules/user-mp/user-mp.service'

/** 捕获 BizException 的统一响应消息。 */
async function catchMessage(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    return e.getResponse?.().message || e.message
  }
}

function makeService(options?: { passwordHash?: string | null; merchantCreateError?: Error }) {
  const state = { passwordHash: options?.passwordHash ?? null }
  const tx = {
    merchant: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => {
        if (options?.merchantCreateError) throw options.merchantCreateError
        return { id: 'apply-1', ...data }
      }),
    },
    user: {
      findUnique: jest.fn(async () => ({ id: 'user-1', passwordHash: state.passwordHash })),
      update: jest.fn(async ({ data }: any) => {
        state.passwordHash = data.passwordHash
        return { id: 'user-1', passwordHash: state.passwordHash }
      }),
    },
  }
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<any>) => {
      const snapshot = state.passwordHash
      try {
        return await callback(tx)
      } catch (error) {
        // 模拟 Prisma 交互式事务的回滚语义。
        state.passwordHash = snapshot
        throw error
      }
    }),
  }
  const service = new UserMpService(prisma as any, null as any, null as any, undefined)
  return { service, prisma, tx, state }
}

const baseDto = {
  type: 'factory',
  name: '经纬门窗厂',
  legalName: '经纬门窗有限公司',
  contact: '张三',
  contactPhone: '13800138000',
  region: '四川省成都市',
  address: '高新区 1 号',
}

describe('UserMpService.merchantApply 密码与申请原子事务', () => {
  it('15 分钟内短信认证：同一事务写入密码哈希并创建申请', async () => {
    const { service, prisma, tx, state } = makeService()
    const nowSec = Math.floor(Date.now() / 1000)

    const res = await service.merchantApply(
      { sub: 'user-1', role: 'customer', amr: 'sms', amrAt: nowSec },
      { ...baseDto, password: 'secret123' },
    )

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.user.update).toHaveBeenCalledTimes(1)
    expect(state.passwordHash).toMatch(/^\$argon2/)
    expect(tx.merchant.create).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ ok: true, applyId: 'apply-1' })
  })

  it('短信认证超过 15 分钟：拒绝写密码且不创建申请', async () => {
    const { service, tx } = makeService()
    const message = await catchMessage(() =>
      service.merchantApply(
        {
          sub: 'user-1',
          role: 'customer',
          amr: 'sms',
          amrAt: Math.floor(Date.now() / 1000) - 901,
        },
        { ...baseDto, password: 'secret123' },
      ),
    )

    expect(message).toContain('短信验证已过期')
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.merchant.create).not.toHaveBeenCalled()
  })

  it('已有密码的普通用户申请时忽略 password，不重置原密码', async () => {
    const { service, tx, state } = makeService({ passwordHash: 'existing-hash' })

    await service.merchantApply(
      { sub: 'user-1', role: 'customer', amr: 'password' },
      { ...baseDto, password: 'different-password' },
    )

    expect(tx.user.update).not.toHaveBeenCalled()
    expect(state.passwordHash).toBe('existing-hash')
    expect(tx.merchant.create).toHaveBeenCalledTimes(1)
  })

  it('创建申请失败时密码写入一并回滚', async () => {
    const { service, state } = makeService({ merchantCreateError: new Error('db write failed') })

    await expect(
      service.merchantApply(
        {
          sub: 'user-1',
          role: 'customer',
          amr: 'sms',
          amrAt: Math.floor(Date.now() / 1000),
        },
        { ...baseDto, password: 'secret123' },
      ),
    ).rejects.toThrow('db write failed')
    expect(state.passwordHash).toBeNull()
  })

  it('旧版请求不带 password 仍可创建申请', async () => {
    const { service, tx } = makeService()
    const res = await service.merchantApply({ sub: 'user-1', role: 'customer' }, baseDto)

    expect(tx.user.update).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: true, applyId: 'apply-1' })
  })
})
