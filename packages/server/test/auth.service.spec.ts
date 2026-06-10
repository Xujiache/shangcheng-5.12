import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import * as argon2 from 'argon2'

// nanoid@5 是纯 ESM，ts-jest(CJS) 默认不转换 node_modules，AuthService 导入 customAlphabet
// 会抛 "Cannot use import statement outside a module"。这里用工厂 mock 替换为等价的随机生成器。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let s = ''
    for (let i = 0; i < size; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return s
  },
}))

import { AuthService } from '../src/modules/auth/auth.service'
import { RefreshTokenBlacklistService } from '../src/modules/auth/refresh-token-blacklist.service'

// ----------------------------------------------------------------------------
// AuthService — 鉴权核心（真实测试）
//
// 实现位置：
//   packages/server/src/modules/auth/auth.service.ts
//   packages/server/src/modules/auth/refresh-token-blacklist.service.ts
//
// 关键行为契约：
//   - refresh token rotation：每次 refresh 都签发新 token，并把旧 jti 列入黑名单
//   - 旧 jti 重放：第二次拿同一个 refresh token → 'refresh token revoked'
//   - 错误语义：缺 _r → 'invalid refresh token'（2001）；真过期 → 2002
//   - adminLogin：argon2 校验、防枚举（账号不存在与密码错误同一文案）、禁用 → 2003
//   - logout：合法 token 吊销 jti；非法 token 仍幂等返回 ok:true
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

/** 捕获抛出异常的 message（用于防枚举对比） */
async function catchMessage(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    return e.getResponse().message
  }
}

function makeJwtMock() {
  return {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(async () => 'tok'),
  }
}

function makeSmsMock() {
  return { sendVerifyCode: jest.fn() }
}

// ============================================================================
// A. 黑名单核心 —— RefreshTokenBlacklistService
// ============================================================================
describe('RefreshTokenBlacklistService 黑名单核心', () => {
  let blacklist: RefreshTokenBlacklistService

  beforeEach(() => {
    blacklist = new RefreshTokenBlacklistService()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('revoke 后 isRevoked 返回 true', () => {
    blacklist.revoke('jti-a', 3600)
    expect(blacklist.isRevoked('jti-a')).toBe(true)
  })

  it('未被吊销的 jti → isRevoked 返回 false', () => {
    expect(blacklist.isRevoked('never-revoked')).toBe(false)
  })

  it('懒过期：TTL 到点后 isRevoked 返回 false', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-11T00:00:00Z'))
    blacklist.revoke('jti-short', 1)
    expect(blacklist.isRevoked('jti-short')).toBe(true)
    // 推进 2 秒，超过 1 秒 TTL → 懒过期清除
    jest.setSystemTime(Date.now() + 2000)
    expect(blacklist.isRevoked('jti-short')).toBe(false)
  })
})

// ============================================================================
// B/C/D. refresh rotation / 重放 / 错误语义
// ============================================================================
describe('AuthService.refresh —— rotation / 重放 / 错误语义', () => {
  let blacklist: RefreshTokenBlacklistService
  let jwt: ReturnType<typeof makeJwtMock>
  let sms: ReturnType<typeof makeSmsMock>
  let prisma: any
  let service: AuthService

  beforeEach(() => {
    blacklist = new RefreshTokenBlacklistService()
    jwt = makeJwtMock()
    sms = makeSmsMock()
    prisma = {}
    service = new AuthService(prisma as any, jwt as any, sms as any, blacklist)
  })

  // B. rotation
  it('B：成功 rotation 返回新 token 对，且旧 jti 被列入黑名单', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({
      _r: 1,
      sub: 'u1',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: 'old-jti',
    } as never)

    const result = await service.refresh({ refreshToken: 'rt-old' } as any)

    expect(result).toHaveProperty('accessToken')
    expect(result).toHaveProperty('refreshToken')
    expect(result).toHaveProperty('expiresIn')
    expect(blacklist.isRevoked('old-jti')).toBe(true)
  })

  // C. 重放：同一 token 第二次 refresh
  it('C：同一 refresh token 第二次使用 → 抛 2001 且 message 含 "revoked"', async () => {
    const payload = {
      _r: 1,
      sub: 'u1',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: 'old-jti',
    }
    // 两次 verify 都通过（同一个 token），rotation 状态由黑名单维护
    jwt.verifyAsync.mockResolvedValue(payload as never)

    // 第一次成功，旧 jti 进黑名单
    await service.refresh({ refreshToken: 'rt-old' } as any)

    // 第二次：jti 已在黑名单 → 重放被拒
    const msg = await catchMessage(() => service.refresh({ refreshToken: 'rt-old' } as any))
    expect(msg).toContain('revoked')
    await expectBizCode(() => service.refresh({ refreshToken: 'rt-old' } as any), 2001)
  })

  // D. 缺 _r 标志 / TokenExpiredError
  it('D：payload 缺 _r 标志 → 2001 "invalid refresh token"', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'u1',
      role: 'customer',
      jti: 'x',
    } as never)

    const msg = await catchMessage(() =>
      service.refresh({ refreshToken: 'access-token-by-mistake' } as any),
    )
    expect(msg).toBe('invalid refresh token')
    await expectBizCode(
      () => service.refresh({ refreshToken: 'access-token-by-mistake' } as any),
      2001,
    )
  })

  it('D：verifyAsync 抛 TokenExpiredError → 2002', async () => {
    const err: any = new Error('jwt expired')
    err.name = 'TokenExpiredError'
    jwt.verifyAsync.mockRejectedValue(err as never)

    await expectBizCode(() => service.refresh({ refreshToken: 'rt-expired' } as any), 2002)
  })
})

// ============================================================================
// E. adminLogin
// ============================================================================
describe('AuthService.adminLogin', () => {
  let blacklist: RefreshTokenBlacklistService
  let jwt: ReturnType<typeof makeJwtMock>
  let sms: ReturnType<typeof makeSmsMock>
  let prisma: any
  let service: AuthService

  const PLAIN = 'secret123'

  beforeEach(() => {
    blacklist = new RefreshTokenBlacklistService()
    jwt = makeJwtMock()
    sms = makeSmsMock()
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(async () => ({}) as any),
      },
    }
    service = new AuthService(prisma as any, jwt as any, sms as any, blacklist)
  })

  it('E：正确密码 → 返回平铺 token 字段 + user.hasPassword=true 且响应不含 passwordHash', async () => {
    const passwordHash = await argon2.hash(PLAIN)
    prisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      merchantId: null,
      passwordHash,
      adminRole: { name: '超级管理员' },
    } as never)

    const res: any = await service.adminLogin({ username: 'admin', password: PLAIN } as any)

    // 平铺 token 字段
    expect(res.token).toBe(res.accessToken)
    expect(res).toHaveProperty('refreshToken')
    expect(res).toHaveProperty('expiresIn')
    // hasPassword 暴露为 boolean
    expect(res.user.hasPassword).toBe(true)
    // 绝不回传 passwordHash
    expect(res.user.passwordHash).toBeUndefined()
  })

  it('E：密码错误 与 账号不存在 返回完全相同的文案（防枚举）', async () => {
    const passwordHash = await argon2.hash(PLAIN)
    // 第一次：账号存在但密码错
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'admin-1',
      username: 'admin',
      role: 'admin',
      status: 'active',
      passwordHash,
      adminRole: null,
    } as never)
    const wrongPwdMsg = await catchMessage(() =>
      service.adminLogin({ username: 'admin', password: 'WRONG' } as any),
    )

    // 第二次：账号不存在
    prisma.user.findFirst.mockResolvedValueOnce(null as never)
    const unknownMsg = await catchMessage(() =>
      service.adminLogin({ username: 'ghost', password: PLAIN } as any),
    )

    expect(wrongPwdMsg).toBe(unknownMsg)
  })

  it('E：账号被禁用 → 2003', async () => {
    const passwordHash = await argon2.hash(PLAIN)
    prisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      username: 'admin',
      role: 'admin',
      status: 'disabled',
      passwordHash,
      adminRole: null,
    } as never)

    await expectBizCode(
      () => service.adminLogin({ username: 'admin', password: PLAIN } as any),
      2003,
    )
  })

  it('E：账号形如手机号时 where.OR 含 3 个条件（username/email/phone）', async () => {
    const passwordHash = await argon2.hash(PLAIN)
    prisma.user.findFirst.mockResolvedValue({
      id: 'm-1',
      username: '13800138000',
      role: 'merchant',
      status: 'active',
      passwordHash,
      adminRole: null,
    } as never)

    await service.adminLogin({ username: '13800138000', password: PLAIN } as any)

    const callArg: any = prisma.user.findFirst.mock.calls[0][0]
    expect(callArg.where.OR).toHaveLength(3)
    const keys = callArg.where.OR.map((c: any) => Object.keys(c)[0])
    expect(keys).toEqual(expect.arrayContaining(['username', 'email', 'phone']))
  })
})

// ============================================================================
// F. logout
// ============================================================================
describe('AuthService.logout', () => {
  let blacklist: RefreshTokenBlacklistService
  let jwt: ReturnType<typeof makeJwtMock>
  let sms: ReturnType<typeof makeSmsMock>
  let prisma: any
  let service: AuthService

  beforeEach(() => {
    blacklist = new RefreshTokenBlacklistService()
    jwt = makeJwtMock()
    sms = makeSmsMock()
    prisma = {}
    service = new AuthService(prisma as any, jwt as any, sms as any, blacklist)
  })

  it('F：合法 refresh token → {ok:true} 且 jti 被吊销', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'u1',
      jti: 'logout-jti',
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as never)

    const res = await service.logout('rt-valid')
    expect(res).toEqual({ ok: true })
    expect(blacklist.isRevoked('logout-jti')).toBe(true)
  })

  it('F：垃圾 token（verify 抛错）仍幂等返回 {ok:true}', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt malformed') as never)

    const res = await service.logout('garbage')
    expect(res).toEqual({ ok: true })
  })
})
