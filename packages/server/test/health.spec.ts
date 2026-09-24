import { HealthService } from '../src/health.service'
import { HealthController } from '../src/health.controller'

describe('health contracts', () => {
  const original = { redis: process.env.REDIS_URL, mode: process.env.NODE_ENV }
  afterEach(() => {
    for (const [key, value] of Object.entries({
      REDIS_URL: original.redis,
      NODE_ENV: original.mode,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    jest.useRealTimers()
  })
  it('preserves legacy health fields and keeps live independent of readiness', () => {
    const c = new HealthController({ ready: jest.fn() } as any)
    expect(c.check()).toMatchObject({ status: 'ok', service: '@jiujiu/server' })
    expect(c.live()).toEqual({ status: 'ok' })
  })
  it('returns 503 without exposing dependency errors', async () => {
    const c = new HealthController({ ready: async () => false } as any)
    await expect(c.ready()).rejects.toMatchObject({ status: 503, message: 'Service not ready' })
  })
  it('fails production readiness when Redis is unconfigured', async () => {
    delete process.env.REDIS_URL
    process.env.NODE_ENV = 'production'
    const s = new HealthService({ $queryRaw: async () => [1] } as any)
    expect(await s.ready()).toBe(false)
  })
  it('accepts healthy development DB and rejects failed DB', async () => {
    delete process.env.REDIS_URL
    process.env.NODE_ENV = 'test'
    const query = jest.fn().mockResolvedValue([1])
    const s = new HealthService({ $queryRaw: query } as any)
    expect(await s.ready()).toBe(true)
    query.mockRejectedValue(new Error('private connection information'))
    expect(await s.ready()).toBe(false)
  })
  it('times out and shares a stalled DB probe instead of opening more queries', async () => {
    jest.useFakeTimers()
    const query = jest.fn(() => new Promise(() => undefined))
    const s = new HealthService({ $queryRaw: query } as any)
    const a = s.ready(),
      b = s.ready()
    await jest.advanceTimersByTimeAsync(2500)
    expect(await a).toBe(false)
    expect(await b).toBe(false)
    expect(query).toHaveBeenCalledTimes(1)
  })
})
