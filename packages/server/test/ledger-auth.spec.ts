import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import * as argon2 from 'argon2'

// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require。轻量替身保留字符集+长度契约。
// ledger-auth.service 直接 import customAlphabet，且间接经 ledger.constants 再次 import。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return out
  },
}))

import { LedgerAuthService } from '../src/modules/ledger/ledger-auth.service'

// ----------------------------------------------------------------------------
// LedgerAuthService — 门窗利账鉴权（真实测试）
//
// 实现位置：packages/server/src/modules/ledger/ledger-auth.service.ts
//
// 关键行为契约：
//   - changePassword：mustReset=true 首登设密可免旧密；两条路径成功后均清 mustReset=false
//   - changePassword：已设密码（mustReset=false）必须验旧密，缺失/错误 → 1001
//   - getPublicConfig：与 register 校验读同一份 LedgerConfig（allowSelfRegister）
// ----------------------------------------------------------------------------

/** 断言抛出的 BizException 业务码 */
async function expectBizCode(fn: () => Promise<unknown>, code: number) {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    expect(e.getResponse().code).toBe(code)
  }
}

// ── prisma 替身：仅含本服务消费到的模型/方法 ──
function buildPrisma() {
  return {
    ledgerUser: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
      update: jest.fn(async (..._a: any[]) => ({}) as any),
    },
    ledgerConfig: {
      findUnique: jest.fn(async (..._a: any[]) => null as any),
    },
  }
}

const jwtMock = () => ({ signAsync: jest.fn(async () => 'tok') })
const smsMock = () => ({ sendVerifyCode: jest.fn() })

function buildService(prisma: ReturnType<typeof buildPrisma>) {
  return new LedgerAuthService(prisma as any, jwtMock() as any, smsMock() as any)
}

describe('LedgerAuthService.changePassword（mustReset 闭环）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAuthService

  beforeEach(() => {
    prisma = buildPrisma()
    service = buildService(prisma)
  })

  it('用例1：mustReset=true 不传旧密码也能改密，且成功后清 mustReset=false', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      mustReset: true,
      passwordHash: null, // 后台建号未设密
    } as any)

    const res = await service.changePassword('u1', { newPassword: 'newpass1' } as any)
    expect(res).toEqual({ ok: true })

    expect(prisma.ledgerUser.update).toHaveBeenCalledTimes(1)
    const arg = prisma.ledgerUser.update.mock.calls[0][0] as any
    expect(arg.where.id).toBe('u1')
    expect(arg.data.mustReset).toBe(false)
    // 落库的是新密码的 argon2 哈希
    expect(await argon2.verify(arg.data.passwordHash, 'newpass1')).toBe(true)
  })

  it('用例2：mustReset=false 验旧密成功 → 同样写 mustReset=false（幂等闭环）', async () => {
    const oldHash = await argon2.hash('oldpass1')
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      mustReset: false,
      passwordHash: oldHash,
    } as any)

    const res = await service.changePassword('u1', {
      oldPassword: 'oldpass1',
      newPassword: 'newpass1',
    } as any)
    expect(res).toEqual({ ok: true })

    const arg = prisma.ledgerUser.update.mock.calls[0][0] as any
    expect(arg.data.mustReset).toBe(false)
    expect(await argon2.verify(arg.data.passwordHash, 'newpass1')).toBe(true)
  })

  it('用例3：mustReset=false 缺旧密码 → 1001，不更新', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      mustReset: false,
      passwordHash: await argon2.hash('oldpass1'),
    } as any)

    await expectBizCode(
      () => service.changePassword('u1', { newPassword: 'newpass1' } as any),
      1001,
    )
    expect(prisma.ledgerUser.update).not.toHaveBeenCalled()
  })

  it('用例4：新密码不足 6 位 → 1001，不更新', async () => {
    await expectBizCode(() => service.changePassword('u1', { newPassword: '12345' } as any), 1001)
    expect(prisma.ledgerUser.update).not.toHaveBeenCalled()
  })
})

describe('LedgerAuthService.getPublicConfig（登录页公开配置）', () => {
  let prisma: ReturnType<typeof buildPrisma>
  let service: LedgerAuthService

  beforeEach(() => {
    prisma = buildPrisma()
    service = buildService(prisma)
  })

  it('用例5：无配置行 → 走 LEDGER_CONFIG_DEFAULTS（allowSelfRegister 默认 true）', async () => {
    prisma.ledgerConfig.findUnique.mockResolvedValueOnce(null as any)
    const res = await service.getPublicConfig()
    expect(res).toEqual({ allowSelfRegister: true, logoUrl: '' })
  })

  it('用例6：后台关闭自助注册 → 返回 false（与 register 校验同一数据源）', async () => {
    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
      key: 'global',
      value: { allowSelfRegister: false },
    } as any)
    const res = await service.getPublicConfig()
    expect(res).toEqual({ allowSelfRegister: false, logoUrl: '' })
    // 读的就是 register 用的那行 LedgerConfig(key='global')
    const arg = prisma.ledgerConfig.findUnique.mock.calls[0][0] as any
    expect(arg.where.key).toBe('global')
  })
})
