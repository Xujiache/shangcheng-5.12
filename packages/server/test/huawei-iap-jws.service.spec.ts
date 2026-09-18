import { constants, generateKeyPairSync, sign } from 'crypto'
import { HuaweiIapJwsService } from '../src/modules/harmony-merchant/huawei-iap-jws.service'

function compactJws(payload: Record<string, unknown>, alg: 'RS256' | 'PS256', privateKey: string) {
  const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const data = Buffer.from(`${header}.${body}`)
  const signature =
    alg === 'PS256'
      ? sign('sha256', data, {
          key: privateKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
        })
      : sign('RSA-SHA256', data, privateKey)
  return `${header}.${body}.${signature.toString('base64url')}`
}

describe('HuaweiIapJwsService', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privateKey = keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  const publicKey = keys.publicKey.export({ format: 'pem', type: 'spki' }).toString()
  let service: HuaweiIapJwsService

  beforeEach(() => {
    process.env.HUAWEI_IAP_PUBLIC_KEY = publicKey
    service = new HuaweiIapJwsService()
  })

  afterAll(() => delete process.env.HUAWEI_IAP_PUBLIC_KEY)

  it.each(['RS256', 'PS256'] as const)('verifies %s compact JWS', (alg) => {
    const token = compactJws({ productId: 'member.monthly' }, alg, privateKey)
    expect(service.verifyCompactJws(token)).toEqual({ productId: 'member.monthly' })
  })

  it('extracts an active signed subscription purchase', () => {
    const signed = compactJws(
      {
        lastSubscriptionStatus: {
          status: 1,
          expirationTime: 1893456000000,
          lastPurchaseOrder: {
            productId: 'member.monthly',
            purchaseToken: 'purchase-token-1',
            purchaseOrderId: 'provider-order-1',
            applicationUserName: 'HMI123',
          },
        },
      },
      'PS256',
      privateKey,
    )
    const result = service.verifyPurchaseData(
      JSON.stringify({ jwsSubscriptionStatus: signed }),
      'subscription',
    )
    expect(result).toMatchObject({
      productId: 'member.monthly',
      purchaseToken: 'purchase-token-1',
      providerOrderId: 'provider-order-1',
      applicationUserName: 'HMI123',
      expirationTime: 1893456000000,
    })
  })

  it('accepts a signed inactive subscription status for authoritative expiry handling', () => {
    const signed = compactJws(
      {
        lastSubscriptionStatus: {
          status: 2,
          renewStatus: 0,
          expirationTime: 1700000000000,
          lastPurchaseOrder: {
            productId: 'member.monthly',
            purchaseToken: 'purchase-token-1',
            purchaseOrderId: 'provider-order-1',
            refundStatus: 1,
          },
        },
      },
      'PS256',
      privateKey,
    )
    expect(service.verifySubscriptionStatus(signed)).toMatchObject({
      active: false,
      autoRenew: false,
      refunded: true,
      status: '2',
      productId: 'member.monthly',
    })
  })

  it('verifies a paid consumable order returned by the server status API', () => {
    const signed = compactJws(
      {
        purchaseOrder: {
          productId: 'member.addon',
          purchaseToken: 'purchase-token-addon',
          purchaseOrderId: 'provider-order-addon',
          purchaseStatus: 'PAID',
        },
      },
      'RS256',
      privateKey,
    )
    expect(service.verifyOrderStatus(signed)).toMatchObject({
      paid: true,
      refunded: false,
      productId: 'member.addon',
    })
  })

  it('rejects a modified payload', () => {
    const signed = compactJws({ productId: 'member.monthly' }, 'RS256', privateKey)
    const parts = signed.split('.')
    parts[1] = Buffer.from(JSON.stringify({ productId: 'member.yearly' })).toString('base64url')
    expect(() => service.verifyCompactJws(parts.join('.'))).toThrow('验签失败')
  })

  it('fails closed when the IAP public key is missing', () => {
    delete process.env.HUAWEI_IAP_PUBLIC_KEY
    const signed = compactJws({ productId: 'member.monthly' }, 'RS256', privateKey)
    expect(() => service.verifyCompactJws(signed)).toThrow('尚未完成服务端公钥配置')
  })
})
