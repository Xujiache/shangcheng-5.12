import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { JwtAuthGuard, _clearJwtUserCache } from '../src/common/guards/jwt.guard'

// ----------------------------------------------------------------------------
// JwtAuthGuard — JWT 鉴权拦截器
//
// 实现位置：packages/server/src/common/guards/jwt.guard.ts
//
// 关键行为契约：
//   - @Public() 路由（reflector 返回 true）直接放行，连 token 都不读
//   - 缺 Authorization → UNAUTHORIZED(2001)
//   - verifyAsync 抛 TokenExpiredError → TOKEN_EXPIRED(2002)；其它错误 → 2001
//   - refresh token（payload._r 标记）不允许访问业务接口 → 2001
//   - payload 无 sub → 2001
//   - DB 查无此用户 → 2001（被删除等同吊销）
//   - status 为 disabled → FORBIDDEN(2003)
//   - 成功时把 DB 最新 role/merchantId 覆盖到 req.user（DB 当前值优先于 payload）
//   - 进程内缓存：同一 sub 连续请求只查一次 DB；_clearJwtUserCache 后再查
//
// 模块级缓存跨用例共享，必须在 beforeEach 中清空，否则用例互相污染。
// ----------------------------------------------------------------------------

// 业务码常量（与 BizCode 对齐）
const UNAUTHORIZED = 2001
const TOKEN_EXPIRED = 2002
const FORBIDDEN = 2003

/** 构造一个最小可用的 ExecutionContext mock，request 为可变对象便于断言 req.user */
function makeContext(req: any, isPublicHandler = false, isPublicClass = false) {
  return {
    getHandler: () => (isPublicHandler ? 'handlerWithPublic' : 'handler'),
    getClass: () => (isPublicClass ? 'classWithPublic' : 'class'),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as any
}

/** reflector mock：根据传入布尔值决定 getAllAndOverride 返回 */
function makeReflector(isPublic: boolean) {
  return {
    getAllAndOverride: jest.fn(() => isPublic),
  } as any
}

/** 期望抛出指定 BizCode */
async function expectBizCode(fn: () => Promise<unknown>, code: number) {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    expect(e.getResponse?.().code).toBe(code)
  }
}

describe('JwtAuthGuard.canActivate', () => {
  beforeEach(() => {
    _clearJwtUserCache()
  })

  it('@Public 路由直接放行，不读取 token', async () => {
    const reflector = makeReflector(true)
    const jwt = { verifyAsync: jest.fn() } as any
    const prisma = { user: { findUnique: jest.fn() } } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    // 故意不带 authorization 头：公共路由也应放行
    const req: any = { headers: {} }
    const result = await guard.canActivate(makeContext(req, true, true))

    expect(result).toBe(true)
    // 公共路由不应触碰 token 校验与 DB 查询
    expect(jwt.verifyAsync).not.toHaveBeenCalled()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('缺少 Authorization 头 → UNAUTHORIZED(2001)', async () => {
    const reflector = makeReflector(false)
    const jwt = { verifyAsync: jest.fn() } as any
    const prisma = { user: { findUnique: jest.fn() } } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: {} }
    await expectBizCode(() => guard.canActivate(makeContext(req)), UNAUTHORIZED)
    expect(jwt.verifyAsync).not.toHaveBeenCalled()
  })

  it('verifyAsync 抛 TokenExpiredError → TOKEN_EXPIRED(2002)', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => {
        const err: any = new Error('jwt expired')
        err.name = 'TokenExpiredError'
        throw err
      }),
    } as any
    const prisma = { user: { findUnique: jest.fn() } } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer expired-token' } }
    await expectBizCode(() => guard.canActivate(makeContext(req)), TOKEN_EXPIRED)
  })

  it('verifyAsync 抛普通错误 → UNAUTHORIZED(2001)', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => {
        throw new Error('invalid signature')
      }),
    } as any
    const prisma = { user: { findUnique: jest.fn() } } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer bad-token' } }
    await expectBizCode(() => guard.canActivate(makeContext(req)), UNAUTHORIZED)
  })

  it('refresh token（payload._r=1）不能访问业务接口 → UNAUTHORIZED(2001)', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => ({ sub: 'u1', _r: 1 })),
    } as any
    const prisma = { user: { findUnique: jest.fn() } } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer refresh-token' } }
    await expectBizCode(() => guard.canActivate(makeContext(req)), UNAUTHORIZED)
    // refresh token 直接拦在 DB 查询之前
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('payload 缺 sub → UNAUTHORIZED(2001)', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => ({ role: 'customer' })),
    } as any
    const prisma = { user: { findUnique: jest.fn() } } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer no-sub' } }
    await expectBizCode(() => guard.canActivate(makeContext(req)), UNAUTHORIZED)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('DB 查无此用户（findUnique 返回 null）→ UNAUTHORIZED(2001)', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => ({ sub: 'ghost' })),
    } as any
    const prisma = {
      user: { findUnique: jest.fn(async () => null) },
    } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer ghost-token' } }
    await expectBizCode(() => guard.canActivate(makeContext(req)), UNAUTHORIZED)
  })

  it('用户状态为 disabled → FORBIDDEN(2003)', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => ({ sub: 'u1' })),
    } as any
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'u1',
          status: 'disabled',
          role: 'customer',
          merchantId: null,
        })),
      },
    } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer disabled-token' } }
    await expectBizCode(() => guard.canActivate(makeContext(req)), FORBIDDEN)
  })

  it('成功放行：req.user 使用 DB 当前的 role/merchantId（覆盖 payload）', async () => {
    const reflector = makeReflector(false)
    // payload 里是 customer / 无 merchantId，DB 里已变成 factory / m1
    const jwt = {
      verifyAsync: jest.fn(async () => ({ sub: 'u1', role: 'customer' })),
    } as any
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'u1',
          status: 'active',
          role: 'factory',
          merchantId: 'm1',
        })),
      },
    } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req: any = { headers: { authorization: 'Bearer good-token' } }
    const result = await guard.canActivate(makeContext(req))

    expect(result).toBe(true)
    // DB 当前值优先：role 被覆盖为 factory，merchantId 为 m1
    expect(req.user.role).toBe('factory')
    expect(req.user.merchantId).toBe('m1')
    expect(req.user.sub).toBe('u1')
  })

  it('进程内缓存：同一 sub 连续两次只查一次 DB；清缓存后第三次再查', async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => ({ sub: 'u1', role: 'customer' })),
    } as any
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'u1',
          status: 'active',
          role: 'factory',
          merchantId: 'm1',
        })),
      },
    } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    const req1: any = { headers: { authorization: 'Bearer t' } }
    const req2: any = { headers: { authorization: 'Bearer t' } }
    await guard.canActivate(makeContext(req1))
    await guard.canActivate(makeContext(req2))
    // 第二次命中缓存，DB 只被查询一次
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1)

    // 清掉该 sub 的缓存后，再次请求必须重新查 DB
    _clearJwtUserCache('u1')
    const req3: any = { headers: { authorization: 'Bearer t' } }
    await guard.canActivate(makeContext(req3))
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2)
  })

  it("兼容 'Bearer xxx' 与裸 'xxx' 两种 Authorization 形式", async () => {
    const reflector = makeReflector(false)
    const jwt = {
      verifyAsync: jest.fn(async () => ({ sub: 'u1' })),
    } as any
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'u1',
          status: 'active',
          role: 'customer',
          merchantId: null,
        })),
      },
    } as any
    const guard = new JwtAuthGuard(reflector, jwt, prisma)

    // 形式一：Bearer 前缀，token 应被剥离前缀
    const reqBearer: any = { headers: { authorization: 'Bearer abc123' } }
    expect(await guard.canActivate(makeContext(reqBearer))).toBe(true)
    expect(jwt.verifyAsync).toHaveBeenLastCalledWith('abc123')

    // 形式二：admin-pc 直传裸 token（无 Bearer 前缀）
    _clearJwtUserCache()
    const reqBare: any = { headers: { authorization: 'abc123' } }
    expect(await guard.canActivate(makeContext(reqBare))).toBe(true)
    expect(jwt.verifyAsync).toHaveBeenLastCalledWith('abc123')
  })
})
