import { describe, it, expect, jest } from '@jest/globals'

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TEST' }))

import { LedgerJwtGuard } from '../src/modules/ledger/guards/ledger-jwt.guard'

function context(token = 'jwt') {
  const req: any = { headers: { authorization: `Bearer ${token}` } }
  const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) }
  return { ctx, req }
}

describe('LedgerJwtGuard token domain and status', () => {
  it('拒绝商城 token 与 refresh token，不查询账号', async () => {
    const jwt: any = { verifyAsync: jest.fn(async () => ({ sub: 'u1', scope: 'mall' })) }
    const prisma: any = { ledgerUser: { findUnique: jest.fn() } }
    const guard = new LedgerJwtGuard(jwt, prisma)
    await expect(guard.canActivate(context().ctx)).rejects.toBeTruthy()
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', scope: 'ledger', _r: true })
    await expect(guard.canActivate(context().ctx)).rejects.toBeTruthy()
    expect(prisma.ledgerUser.findUnique).not.toHaveBeenCalled()
  })

  it('禁用账号即使签名有效也拒绝', async () => {
    const jwt: any = { verifyAsync: jest.fn(async () => ({ sub: 'u1', scope: 'ledger' })) }
    const prisma: any = { ledgerUser: { findUnique: jest.fn(async () => ({ id: 'u1', status: 'disabled' })) } }
    await expect(new LedgerJwtGuard(jwt, prisma).canActivate(context().ctx)).rejects.toBeTruthy()
  })

  it('有效 ledger token 按当前账号状态建立请求身份', async () => {
    const jwt: any = { verifyAsync: jest.fn(async () => ({ sub: 'u1', scope: 'ledger' })) }
    const prisma: any = { ledgerUser: { findUnique: jest.fn(async () => ({
      id: 'u1', status: 'active', nickname: 'user', avatar: null, membership: null,
    })) } }
    const { ctx, req } = context()
    expect(await new LedgerJwtGuard(jwt, prisma).canActivate(ctx)).toBe(true)
    expect(req.ledgerUser.id).toBe('u1')
    expect(prisma.ledgerUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' }, include: { membership: true },
    })
  })
})
