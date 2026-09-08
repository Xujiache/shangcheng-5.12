import { JwtAuthGuard, _clearJwtUserCache } from '../src/common/guards/jwt.guard'

describe('JWT write ownership boundary', () => {
  beforeEach(() => _clearJwtUserCache())
  function fixture() {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'u', role: 'factory', status: 'active', merchantId: 'm' })
    const guard = new JwtAuthGuard(
      { getAllAndOverride: () => false } as any,
      { verifyAsync: async () => ({ sub: 'u', merchantId: 'old-merchant' }) } as any,
      { user: { findUnique } } as any,
    )
    const request = (method: string) => {
      const req = { method, headers: { authorization: 'Bearer token' } } as any
      const context = {
        getHandler: () => null,
        getClass: () => null,
        switchToHttp: () => ({ getRequest: () => req }),
      } as any
      return { req, run: () => guard.canActivate(context) }
    }
    return { findUnique, request }
  }
  it('never resurrects a removed merchant association from the token', async () => {
    const f = fixture()
    f.findUnique.mockResolvedValue({
      id: 'u',
      role: 'customer',
      status: 'active',
      merchantId: null,
    })
    const r = f.request('POST')
    await r.run()
    expect(r.req.user.merchantId).toBeUndefined()
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'rechecks disabled status on %s even with a warm read cache',
    async (method) => {
      const f = fixture()
      await f.request('GET').run()
      f.findUnique.mockResolvedValue({
        id: 'u',
        role: 'factory',
        status: 'disabled',
        merchantId: 'm',
      })
      await expect(f.request(method).run()).rejects.toThrow()
      expect(f.findUnique).toHaveBeenCalledTimes(2)
    },
  )
})
