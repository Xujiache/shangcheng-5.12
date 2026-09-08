import { RefreshTokenBlacklistService } from '../src/modules/auth/refresh-token-blacklist.service'

describe('atomic refresh receipts', () => {
  const originalRedis = process.env.REDIS_URL
  const originalEnvironment = process.env.NODE_ENV
  const instances: RefreshTokenBlacklistService[] = []
  const make = () => {
    const service = new RefreshTokenBlacklistService()
    instances.push(service)
    return service
  }
  beforeEach(() => {
    delete process.env.REDIS_URL
    process.env.NODE_ENV = 'test'
  })
  afterEach(async () => {
    await Promise.all(instances.splice(0).map((s) => s.onModuleDestroy()))
    if (originalRedis === undefined) delete process.env.REDIS_URL
    else process.env.REDIS_URL = originalRedis
    process.env.NODE_ENV = originalEnvironment
    jest.restoreAllMocks()
  })
  it('uses Redis SET NX across instances and exposes only one winner', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:16389/15'
    const receipts = new Set<string>()
    const client = {
      set: jest.fn(async (key: string, _value: string, _ex: string, _ttl: number, nx: string) => {
        expect(nx).toBe('NX')
        if (receipts.has(key)) return null
        receipts.add(key)
        return 'OK'
      }),
    }
    const a = make(),
      b = make()
    jest.spyOn(a as any, 'getRedis').mockResolvedValue(client)
    jest.spyOn(b as any, 'getRedis').mockResolvedValue(client)
    expect((await Promise.all([a.consume('same', 60), b.consume('same', 60)])).sort()).toEqual([
      false,
      true,
    ])
    expect(client.set).toHaveBeenCalledWith('rtbl:same', '1', 'EX', 60, 'NX')
  })
  it('Redis failures reject rather than treating an unknown token as valid', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:16389/15'
    const service = make()
    jest.spyOn(service as any, 'getRedis').mockRejectedValue(new Error('connection failed'))
    await expect(service.isRevoked('x')).rejects.toMatchObject({ status: 503 })
    await expect(service.consume('x', 60)).rejects.toMatchObject({ status: 503 })
    await expect(service.revoke('x', 60)).rejects.toMatchObject({ status: 503 })
  })
  it('never clears live receipts on capacity pressure; production cannot fall back to memory', async () => {
    const service = make()
    ;(service as any).MAX_ENTRIES = 1
    await service.revoke('kept', 60)
    await expect(service.revoke('new', 60)).rejects.toMatchObject({ status: 503 })
    expect(await service.isRevoked('kept')).toBe(true)
    process.env.NODE_ENV = 'production'
    await expect(make().consume('no-shared-store', 60)).rejects.toMatchObject({ status: 503 })
  })
  it('clears successful connection promises so a later disconnect can reconnect', async () => {
    const service = make()
    const client = {
      status: 'end',
      connect: jest.fn(async () => {
        client.status = 'ready'
      }),
      disconnect: jest.fn(),
    }
    ;(service as any).redis = client
    await (service as any).getRedis()
    client.status = 'end'
    await (service as any).getRedis()
    expect(client.connect).toHaveBeenCalledTimes(2)
  })
})
