import { parse } from '../src/modules/video-parser/spapi.client'

function json(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } })
}

describe('spapi client', () => {
  const originalFetch = global.fetch
  const originalKey = process.env.SPAPI_KEY

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(0)
    process.env.SPAPI_KEY = 'test-spapi-key'
  })

  afterEach(() => { jest.clearAllMocks() })

  afterAll(() => {
    global.fetch = originalFetch
    if (originalKey === undefined) delete process.env.SPAPI_KEY
    else process.env.SPAPI_KEY = originalKey
    jest.useRealTimers()
  })

  it('maps status 102 without retrying and sends the full input text', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ status: 102, msg: '获取失败' }))
    const result = await parse('复制打开抖音 https://v.douyin.com/example/ 口令')
    expect(result).toMatchObject({ ok: false, kind: 'unsupported', status: 102 })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const requestUrl = new URL(String((global.fetch as jest.Mock).mock.calls[0][0]))
    expect(requestUrl.searchParams.get('appkey')).toBe('test-spapi-key')
    expect(requestUrl.searchParams.get('url')).toContain('复制打开抖音')
  })

  it('returns the title, cover and signed video URL from status 101', async () => {
    jest.setSystemTime(5_000)
    global.fetch = jest.fn().mockResolvedValue(json({
      status: 101,
      msg: '获取成功',
      data: { title: '标题', image: 'http://cover.example/a.jpg', video: 'https://video.example/a.mp4?sig=1' },
    }))
    await expect(parse('https://www.bilibili.com/video/BV1GJ411x7h7')).resolves.toEqual(expect.objectContaining({
      ok: true,
      title: '标题',
      cover: 'http://cover.example/a.jpg',
      video_url: 'https://video.example/a.mp4?sig=1',
    }))
  })

  it('backs off once for an HTML 403 and reports busy when the retry fails', async () => {
    jest.setSystemTime(10_000)
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response('<html>quota</html>', { status: 403, headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(json({ status: 102, msg: '获取失败' }))
    const pending = parse('https://v.douyin.com/example/')
    await Promise.resolve()
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(60_000)
    await expect(pending).resolves.toMatchObject({ ok: false, kind: 'busy', message: '服务繁忙，请稍后再试' })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('serializes concurrent calls with at least 4.5 seconds between upstream requests', async () => {
    jest.setSystemTime(100_000)
    const startedAt: number[] = []
    global.fetch = jest.fn().mockImplementation(() => {
      startedAt.push(Date.now())
      return Promise.resolve(json({ status: 102, msg: '获取失败' }))
    })
    const pending = Promise.all(Array.from({ length: 5 }, (_, index) => parse(`https://example.com/${index}`)))
    for (let index = 0; index < 6; index += 1) await jest.advanceTimersByTimeAsync(4_500)
    await pending
    expect(startedAt).toHaveLength(5)
    for (let index = 1; index < startedAt.length; index += 1) {
      expect(startedAt[index] - startedAt[index - 1]).toBeGreaterThanOrEqual(4_500)
    }
  })
})
