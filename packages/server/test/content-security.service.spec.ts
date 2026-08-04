import { BizException } from '../src/common/exceptions/biz.exception'
import { ContentSecurityService } from '../src/modules/content-security/content-security.service'

const ENV_KEYS = [
  'NODE_ENV',
  'WX_MINIAPP_APPID',
  'WX_MINIAPP_SECRET',
  'LEDGER_WX_APPID',
  'LEDGER_WX_SECRET',
  'WX_CONTENT_SECURITY_TIMEOUT_MS',
] as const

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
const originalFetch = global.fetch

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response
}

function configureWechatCredentials() {
  process.env.NODE_ENV = 'production'
  process.env.WX_MINIAPP_APPID = 'mall-appid'
  process.env.WX_MINIAPP_SECRET = 'mall-secret'
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

describe('ContentSecurityService', () => {
  it('在文本安全结果为 pass 后才完成请求', async () => {
    configureWechatCredentials()
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ access_token: 'mall-token', expires_in: 7200 }))
      .mockResolvedValueOnce(response({ errcode: 0, result: { suggest: 'pass', label: 100 } }))
    global.fetch = fetchMock as unknown as typeof fetch

    await new ContentSecurityService().assertTextSafe('正常昵称', { scope: 'mall', scene: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/wxa/msg_sec_check?access_token=mall-token',
    )
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      version: 2,
      scene: 1,
      content: '正常昵称',
    })
  })

  it('微信返回风险建议时拒绝写入路径', async () => {
    configureWechatCredentials()
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ access_token: 'mall-token', expires_in: 7200 }))
      .mockResolvedValueOnce(response({ errcode: 0, result: { suggest: 'risky', label: 100 } }))
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(new ContentSecurityService().assertTextSafe('违规内容')).rejects.toBeInstanceOf(
      BizException,
    )
  })

  it('生产环境缺少凭据时 fail closed', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.WX_MINIAPP_APPID
    delete process.env.WX_MINIAPP_SECRET

    await expect(
      new ContentSecurityService().assertTextSafe('任何用户输入'),
    ).rejects.toBeInstanceOf(BizException)
  })

  it('头像图片通过图片安全接口后才允许继续上传', async () => {
    configureWechatCredentials()
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ access_token: 'mall-token', expires_in: 7200 }))
      .mockResolvedValueOnce(response({ errcode: 0, result: { suggest: 'pass', label: 100 } }))
    global.fetch = fetchMock as unknown as typeof fetch

    await new ContentSecurityService().assertImageSafe(Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
      scope: 'mall',
      filename: 'avatar.png',
      mimeType: 'image/png',
    })

    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/wxa/img_sec_check?access_token=mall-token',
    )
    expect(fetchMock.mock.calls[1][1]?.body).toBeInstanceOf(FormData)
  })
})
