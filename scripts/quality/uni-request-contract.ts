import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

interface PendingRequest {
  url: string
  success: (response: { statusCode: number; data: unknown }) => void
  fail: (error: unknown) => void
}

export function requestContract(
  load: () => Promise<{ request: (url: string) => Promise<unknown> }>,
  platform: boolean,
) {
  describe('real request adapter with simulated uni transport', () => {
    let storage: Map<string, string>, pending: PendingRequest[]
    const tokenKey = platform ? 'jiujiu_admin_token' : 'jiujiu_token'
    const refreshKey = platform ? 'jiujiu_admin_refresh_token' : 'jiujiu_refresh_token'
    const path = platform ? '/api/v1/p/test' : '/api/v1/auth/profile'
    const respond = (request: PendingRequest, code: number, data: unknown = null) =>
      request.success({
        statusCode: 200,
        data: { code, data, message: 'test', msg: 'test', traceId: 'test', timestamp: 1 },
      })
    beforeEach(() => {
      vi.resetModules()
      storage = new Map([
        [tokenKey, 'account-a'],
        [refreshKey, 'refresh-a'],
      ])
      pending = []
      vi.stubGlobal('uni', {
        getStorageSync: (k: string) => storage.get(k),
        setStorageSync: (k: string, v: string) => storage.set(k, v),
        removeStorageSync: (k: string) => storage.delete(k),
        request: (r: PendingRequest) => pending.push(r),
        showToast: vi.fn(),
        reLaunch: vi.fn(),
      })
    })
    afterEach(() => vi.unstubAllGlobals())
    it('returns successful data', async () => {
      const { request } = await load()
      const result = request(path)
      respond(pending.shift()!, 0, { id: 'record' })
      await expect(result).resolves.toEqual({ id: 'record' })
    })
    it('does not accept HTTP 500 as business success', async () => {
      const { request } = await load()
      const result = request(path)
      pending.shift()!.success({ statusCode: 500, data: { code: 0, data: 'not success' } })
      await expect(result).rejects.toThrow('服务暂时不可用')
      expect(storage.get(tokenKey)).toBe('account-a')
    })
    it('does not overwrite a later login when refresh returns', async () => {
      const { request } = await load()
      const result = request(path)
      respond(pending.shift()!, 2002)
      await vi.waitFor(() => expect(pending.length).toBe(1))
      storage.set(tokenKey, 'account-b')
      storage.set(refreshKey, 'refresh-b')
      respond(pending.shift()!, 0, { accessToken: 'old-rotated', refreshToken: 'old-refresh' })
      await expect(result).rejects.toThrow('账号状态已变化')
      expect(storage.get(tokenKey)).toBe('account-b')
    })
    it('rejects malformed response instead of reading undefined.length downstream', async () => {
      const { request } = await load()
      const result = request(path)
      pending.shift()!.success({ statusCode: 200, data: undefined })
      await expect(result).rejects.toThrow('服务响应异常')
    })
    it('rejects an old successful response after switching accounts', async () => {
      const { request } = await load()
      const result = request(path)
      storage.set(tokenKey, 'account-b')
      storage.set(refreshKey, 'refresh-b')
      respond(pending.shift()!, 0, { private: 'old account data' })
      await expect(result).rejects.toThrow('账号状态已变化')
      expect(storage.get(tokenKey)).toBe('account-b')
    })
    it('retains the session when refresh fails due to network', async () => {
      const { request } = await load()
      const result = request(path)
      respond(pending.shift()!, 2002)
      await vi.waitFor(() => expect(pending.length).toBe(1))
      expect(pending[0].url).toContain('/auth/refresh')
      pending.shift()!.fail({ errMsg: 'timeout' })
      await expect(result).rejects.toThrow('网络连接失败')
      expect(storage.get(tokenKey)).toBe('account-a')
    })
    it('shares refresh across requests and retries each only once', async () => {
      const { request } = await load()
      const first = request(path),
        second = request(path)
      respond(pending.shift()!, 2002)
      respond(pending.shift()!, 2002)
      await vi.waitFor(() => expect(pending.length).toBe(1))
      respond(pending.shift()!, 0, { accessToken: 'rotated', refreshToken: 'rotated-refresh' })
      await vi.waitFor(() => expect(pending.length).toBe(2))
      respond(pending.shift()!, 0, 'one')
      respond(pending.shift()!, 0, 'two')
      await expect(Promise.all([first, second])).resolves.toEqual(['one', 'two'])
      expect(storage.get(tokenKey)).toBe('rotated')
      expect(pending.length).toBe(0)
    })
    it('does not refresh twice for a late expired response', async () => {
      const { request } = await load()
      const first = request(path),
        firstRequest = pending.shift()!
      const second = request(path),
        lateRequest = pending.shift()!
      respond(firstRequest, 2002)
      await vi.waitFor(() => expect(pending.length).toBe(1))
      respond(pending.shift()!, 0, { accessToken: 'rotated', refreshToken: 'new-refresh' })
      await vi.waitFor(() => expect(pending.length).toBe(1))
      respond(pending.shift()!, 0, 'one')
      await expect(first).resolves.toBe('one')
      respond(lateRequest, 2002)
      await vi.waitFor(() => expect(pending.length).toBe(1))
      expect(pending[0].url).not.toContain('/auth/refresh')
      respond(pending.shift()!, 0, 'two')
      await expect(second).resolves.toBe('two')
    })
    it('keeps login when refresh HTTP 503 contains an auth-like error code', async () => {
      const { request } = await load()
      const result = request(path)
      respond(pending.shift()!, 2002)
      await vi.waitFor(() => expect(pending.length).toBe(1))
      pending.shift()!.success({ statusCode: 503, data: { code: 2001 } })
      await expect(result).rejects.toThrow('登录续期暂时不可用')
      expect(storage.get(tokenKey)).toBe('account-a')
    })
    it('rejects success envelopes with missing data', async () => {
      const { request } = await load()
      const result = request(path)
      pending.shift()!.success({ statusCode: 200, data: { code: 0 } })
      await expect(result).rejects.toThrow('服务响应异常')
    })
  })
}
