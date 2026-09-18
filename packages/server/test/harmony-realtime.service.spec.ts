import { HarmonyRealtimeService } from '../src/modules/harmony-merchant/harmony-realtime.service'

describe('HarmonyRealtimeService', () => {
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
