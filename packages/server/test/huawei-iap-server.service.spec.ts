import { createHash, generateKeyPairSync, verify } from 'node:crypto'
import { HuaweiIapServerService } from '../src/modules/harmony-merchant/huawei-iap-server.service'

describe('HuaweiIapServerService', () => {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const privateKey = keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  const publicKey = keys.publicKey.export({ format: 'pem', type: 'spki' }).toString()

  beforeEach(() => {
    process.env.HUAWEI_IAP_APPLICATION_ID = '123456789'
    process.env.HUAWEI_IAP_ISSUER_ID = 'issuer-1'
    process.env.HUAWEI_IAP_KEY_ID = 'key-1'
    process.env.HUAWEI_IAP_PRIVATE_KEY = privateKey
  })

  afterEach(() => {
    delete process.env.HUAWEI_IAP_APPLICATION_ID
    delete process.env.HUAWEI_IAP_ISSUER_ID
    delete process.env.HUAWEI_IAP_KEY_ID
    delete process.env.HUAWEI_IAP_PRIVATE_KEY
    delete process.env.HUAWEI_IAP_PRIVATE_KEY_FILE
    delete process.env.HUAWEI_IAP_ROOT_URL
  })

  it('binds an ES256 server JWT to the exact request body digest', () => {
    const service = new HuaweiIapServerService()
    const credentials = (service as any).getCredentials()
    const body = JSON.stringify({ purchaseToken: 'token-1', purchaseOrderId: 'order-1' })
    const token = (service as any).createAuthorization(credentials, body) as string
    const [headerPart, payloadPart, signaturePart] = token.split('.')
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))

    expect(header).toEqual({ alg: 'ES256', kid: 'key-1', typ: 'JWT' })
    expect(payload).toMatchObject({ iss: 'issuer-1', aud: 'iap-v1', aid: '123456789' })
    expect(payload.digest).toBe(createHash('sha256').update(body).digest('hex'))
    expect(payload.exp - payload.iat).toBe(3600)
    expect(
      verify(
        'sha256',
        Buffer.from(`${headerPart}.${payloadPart}`),
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        Buffer.from(signaturePart, 'base64url'),
      ),
    ).toBe(true)
  })

  it('fails closed when any AppGallery IAP server credential is missing', async () => {
    delete process.env.HUAWEI_IAP_PRIVATE_KEY
    const service = new HuaweiIapServerService()
    expect(service.isConfigured()).toBe(false)
    await expect(service.querySubscriptionStatus('token', 'order')).rejects.toMatchObject({
      status: 503,
    })
  })
})
