import { TideService } from '../src/modules/ledger/tide.service'

const station = { id: 'P2717', name: '青岛', country: '中国', adm1: '山东省', adm2: '青岛市', lat: '36.06', lon: '120.38', type: 'TSTA' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('TideService', () => {
  const service = new TideService()
  const originalFetch = global.fetch
  const originalHost = process.env.QWEATHER_API_HOST
  const originalKey = process.env.QWEATHER_API_KEY

  beforeEach(() => {
    process.env.QWEATHER_API_HOST = 'test.qweatherapi.com'
    process.env.QWEATHER_API_KEY = 'test-key'
  })
  afterEach(() => { global.fetch = originalFetch })
  afterAll(() => {
    if (originalHost === undefined) delete process.env.QWEATHER_API_HOST
    else process.env.QWEATHER_API_HOST = originalHost
    if (originalKey === undefined) delete process.env.QWEATHER_API_KEY
    else process.env.QWEATHER_API_KEY = originalKey
  })

  it('keeps only Chinese tide stations from live GeoAPI results', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ code: '200', poi: [station, { ...station, id: 'P9999', country: '日本' }] }))
    expect((await service.search('青岛')).stations).toEqual([{ id: 'P2717', name: '青岛', province: '山东省', city: '青岛市', latitude: 36.06, longitude: 120.38 }])
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('/geo/v2/poi/lookup?')
  })

  it('reports no nearby station for an inland location', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ error: { type: 'https://dev.qweather.com/docs/resource/error-code/#no-such-location' } }, 400))
    expect(await service.nearby(39.9, 116.4)).toEqual({ stations: [] })
  })

  it('returns forecast events, hourly points and source metadata', async () => {
    global.fetch = jest.fn().mockImplementation((url: URL) => Promise.resolve(
      String(url).includes('/geo/') ? json({ code: '200', poi: [station] }) : json({ code: '200', updateTime: '2026-09-30T02:00+08:00',
        tideTable: [{ fxTime: '2026-09-30T05:00+08:00', height: '3.5', type: 'H' }],
        tideHourly: [{ fxTime: '2026-09-30T05:00+08:00', height: '3.5' }] }),
    ))
    const date = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
    const result = await service.forecast('P2717', date)
    expect(result.events).toEqual([{ time: '2026-09-30T05:00+08:00', height: 3.5, type: 'H' }])
    expect(result.hourly).toHaveLength(1)
    expect(result.station.id).toBe('P2717')
    expect(result.attribution).toContain('QWeather')
  })

  it('rejects invalid dates before calling the provider', async () => {
    global.fetch = jest.fn()
    await expect(service.forecast('P2717', '20260230')).rejects.toThrow('只能查询今天起 10 天内的潮汐')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('accepts the current warning API envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ metadata: { attributions: ['官方预警来源说明'] }, alerts: [] }))
    const result = await service.alerts(36.06, 120.38)
    expect(result.alerts).toEqual([])
    expect(result.attributions).toEqual(['官方预警来源说明'])
  })
})
