import { HarmonyRealtimeService } from '../src/modules/harmony-merchant/harmony-realtime.service'

describe('HarmonyRealtimeService', () => {
  const state = () => ({ userId: 'user-1', merchantId: 'merchant-1', sessions: new Set(['session-1']), requestIds: new Set(), authenticatedAt: Date.now(), expiresAt: Date.now() + 60000 })
  const fixture = (claims: object = {}) => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', role: 'merchant', merchantId: 'merchant-1', exp: Math.floor(Date.now() / 1000) + 60, ...claims }) }
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', status: 'active', role: 'merchant', merchantId: 'merchant-1' }) },
      merchant: { findUnique: jest.fn().mockResolvedValue({ id: 'merchant-1', status: 'active' }) },
      chatSession: { findFirst: jest.fn().mockResolvedValue(null) },
    }
    const socket = { readyState: 1, send: jest.fn(), close: jest.fn() }
    const service = new HarmonyRealtimeService({} as any, jwt as any, prisma as any) as any
    return { service, socket, prisma }
  }
  it.each([{ _r: 1 }, { scope: 'ledger' }, { exp: 1 }, { merchantId: 'other' }])('rejects incompatible access claims %p and clears prior state', async (claims) => {
    const { service, socket } = fixture(claims)
    service.clients.set(socket, state())
    await service.authenticate(socket, 'redacted')
    expect(socket.close).toHaveBeenCalledWith(4401, 'authentication failed')
    expect(service.clients.has(socket)).toBe(false)
  })
  it('rejects disabled accounts', async () => {
    const { service, socket, prisma } = fixture()
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'disabled', role: 'merchant', merchantId: 'merchant-1' })
    await service.authenticate(socket, 'redacted')
    expect(socket.close).toHaveBeenCalledWith(4401, 'authentication failed')
  })
  it('does not carry joined sessions across token account changes', async () => {
    const { service, socket } = fixture()
    service.clients.set(socket, { ...state(), merchantId: 'previous' })
    await service.authenticate(socket, 'redacted')
    expect(service.clients.has(socket)).toBe(false)
  })
  it('checks current account before each event', async () => {
    const { service, socket, prisma } = fixture()
    service.clients.set(socket, state())
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'disabled', role: 'merchant', merchantId: 'merchant-1' })
    await service.handle(socket, Buffer.from(JSON.stringify({ v: 1, event: 'chat.send', data: { sessionId: 'session-1' } })))
    expect(socket.close).toHaveBeenCalledWith(4401, 'identity expired or revoked')
    expect(prisma.chatSession.findFirst).not.toHaveBeenCalled()
  })
  it('joins only sessions owned by the authenticated merchant', async () => {
    const { service, socket, prisma } = fixture()
    await expect(service.joinSession(socket, state(), 'foreign-session')).rejects.toThrow('无此会话访问权限')
    expect(prisma.chatSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign-session', merchantId: 'merchant-1' } }))
    expect(socket.send.mock.calls.map(([frame]: [string]) => JSON.parse(frame).event)).not.toContain('chat.joined')
  })
  it('uses one stable event id for a merchant broadcast and a new id for the next event', () => {
    const service = new HarmonyRealtimeService({} as any, {} as any, {} as any)
    const firstFrames: string[] = []
    const secondFrames: string[] = []
    const firstSocket = { readyState: 1, send: (value: string) => firstFrames.push(value) }
    const secondSocket = { readyState: 1, send: (value: string) => secondFrames.push(value) }
    const state = {
      userId: 'user-1',
      merchantId: 'merchant-1',
      sessions: new Set<string>(),
      requestIds: new Set<string>(),
      authenticatedAt: Date.now(),
    }
    ;(service as any).clients.set(firstSocket, state)
    ;(service as any).clients.set(secondSocket, state)

    service.emitMerchant('merchant-1', 'order.new', { id: 'order-1' })
    const first = JSON.parse(firstFrames[0])
    const mirrored = JSON.parse(secondFrames[0])
    expect(first.requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(mirrored.requestId).toBe(first.requestId)

    service.emitMerchant('merchant-1', 'order.update', { id: 'order-1', status: 'paid' })
    const next = JSON.parse(firstFrames[1])
    expect(next.requestId).not.toBe(first.requestId)
  })
})
