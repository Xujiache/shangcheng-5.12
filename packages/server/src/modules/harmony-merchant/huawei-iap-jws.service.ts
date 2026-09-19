import { Injectable } from '@nestjs/common'
import { constants, createPublicKey, verify as cryptoVerify } from 'crypto'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

type JsonObject = Record<string, unknown>

export interface VerifiedHuaweiPurchase {
  payload: JsonObject
  productId: string
  purchaseToken: string
  providerOrderId: string
  applicationUserName?: string
  developerPayload?: string
  expirationTime?: number
}

export interface VerifiedHuaweiSubscriptionStatus extends VerifiedHuaweiPurchase {
  active: boolean
  autoRenew: boolean
  refunded: boolean
  status: string
}

export interface VerifiedHuaweiOrderStatus extends VerifiedHuaweiPurchase {
  paid: boolean
  refunded: boolean
  status: string
}

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function readPath(source: JsonObject, path: string[]): unknown {
  let current: unknown = source
  for (const key of path) {
    const object = asObject(current)
    if (!object) return undefined
    current = object[key]
  }
  return current
}

function firstString(source: JsonObject, paths: string[][]): string {
  for (const path of paths) {
    const value = readPath(source, path)
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function firstNumber(source: JsonObject, paths: string[][]): number | undefined {
  for (const path of paths) {
    const value = readPath(source, path)
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function firstValue(source: JsonObject, paths: string[][]): unknown {
  for (const path of paths) {
    const value = readPath(source, path)
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (['TRUE', 'ACTIVE', 'ENABLED', 'ON'].includes(normalized)) return true
  if (['FALSE', 'INACTIVE', 'DISABLED', 'OFF'].includes(normalized)) return false
  return fallback
}

@Injectable()
export class HuaweiIapJwsService {
  private resolvePublicKey(): ReturnType<typeof createPublicKey> {
    const configured = String(process.env.HUAWEI_IAP_PUBLIC_KEY || '').trim()
    if (!configured) {
      throw new BizException(BizCode.BUSINESS_ERROR, '华为 IAP 尚未完成服务端公钥配置')
    }
    const pem = configured.includes('BEGIN PUBLIC KEY')
      ? configured.replace(/\\n/g, '\n')
      : `-----BEGIN PUBLIC KEY-----\n${configured.match(/.{1,64}/g)?.join('\n') || configured}\n-----END PUBLIC KEY-----`
    try {
      return createPublicKey(pem)
    } catch {
      throw new BizException(BizCode.BUSINESS_ERROR, '华为 IAP 公钥格式无效')
    }
  }

  verifyCompactJws(jws: string): JsonObject {
    const parts = String(jws || '').split('.')
    if (parts.length !== 3 || parts.some((part) => !part)) {
      throw new BizException(BizCode.PAY_FAILED, '华为支付凭证不是有效 JWS')
    }
    let header: JsonObject
    let payload: JsonObject
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as JsonObject
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JsonObject
    } catch {
      throw new BizException(BizCode.PAY_FAILED, '华为支付凭证无法解析')
    }
    const alg = String(header.alg || '')
    if (alg !== 'PS256' && alg !== 'RS256') {
      throw new BizException(BizCode.PAY_FAILED, `不支持的华为支付签名算法: ${alg || 'unknown'}`)
    }
    const data = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8')
    const signature = Buffer.from(parts[2], 'base64url')
    const key = this.resolvePublicKey()
    const ok =
      alg === 'PS256'
        ? cryptoVerify(
            'sha256',
            data,
            {
              key,
              padding: constants.RSA_PKCS1_PSS_PADDING,
              saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
            },
            signature,
          )
        : cryptoVerify('RSA-SHA256', data, key, signature)
    if (!ok) throw new BizException(BizCode.PAY_FAILED, '华为支付凭证验签失败')
    return payload
  }

  verifyPurchaseData(purchaseData: string, productType: string): VerifiedHuaweiPurchase {
    if (!purchaseData || purchaseData.length > 128 * 1024) {
      throw new BizException(BizCode.INVALID_PARAMS, 'purchaseData 格式不正确')
    }
    let outer: JsonObject
    try {
      outer = purchaseData.trim().startsWith('{')
        ? (JSON.parse(purchaseData) as JsonObject)
        : { compactJws: purchaseData }
    } catch {
      throw new BizException(BizCode.PAY_FAILED, '华为支付结果无法解析')
    }
    const jws = firstString(outer, [
      ['jwsSubscriptionStatus'],
      ['jwsPurchaseOrder'],
      ['jwsPurchaseOrderStatus'],
      ['jwsOrderStatus'],
      ['compactJws'],
    ])
    if (!jws) throw new BizException(BizCode.PAY_FAILED, '华为支付结果缺少签名凭证')
    const payload = this.verifyCompactJws(jws)
    const subscription = asObject(payload.lastSubscriptionStatus)
    const order =
      asObject(subscription?.lastPurchaseOrder) || asObject(payload.purchaseOrder) || payload

    if (productType === 'subscription') {
      const status = subscription?.status ?? payload.status
      if (!(status === 1 || status === '1' || String(status).toUpperCase() === 'ACTIVE')) {
        throw new BizException(BizCode.PAY_FAILED, '订阅当前未生效')
      }
    } else {
      const state = order.purchaseStatus ?? order.purchaseState ?? order.status
      const normalized = String(state ?? '').toUpperCase()
      if (
        !(
          state === 0 ||
          state === 1 ||
          normalized === 'SUCCESS' ||
          normalized === 'PAID' ||
          normalized === 'PURCHASED'
        )
      ) {
        throw new BizException(BizCode.PAY_FAILED, '商品订单当前未支付')
      }
    }

    const productId = firstString(order, [['productId'], ['productID']])
    const purchaseToken = firstString(order, [['purchaseToken']])
    const providerOrderId = firstString(order, [['purchaseOrderId'], ['orderId']])
    if (!productId || !purchaseToken || !providerOrderId) {
      throw new BizException(BizCode.PAY_FAILED, '华为支付凭证缺少商品或订单标识')
    }
    return {
      payload,
      productId,
      purchaseToken,
      providerOrderId,
      applicationUserName: firstString(order, [['applicationUserName']]) || undefined,
      developerPayload: firstString(order, [['developerPayload']]) || undefined,
      expirationTime: firstNumber(payload, [
        ['lastSubscriptionStatus', 'expirationTime'],
        ['lastSubscriptionStatus', 'expireTime'],
        ['expirationTime'],
      ]),
    }
  }

  /**
   * Verifies the authoritative JWS returned by Huawei's server-side
   * subscription status API. Unlike verifyPurchaseData, inactive states are
   * valid input here because expiry, cancellation and refund callbacks must be
   * processed without treating the signed status as a malformed purchase.
   */
  verifySubscriptionStatus(jwsSubGroupStatus: string): VerifiedHuaweiSubscriptionStatus {
    const payload = this.verifyCompactJws(jwsSubGroupStatus)
    const subscription = asObject(payload.lastSubscriptionStatus)
    if (!subscription) {
      throw new BizException(BizCode.PAY_FAILED, '华为订阅状态缺少最新订阅信息')
    }
    const order = asObject(subscription.lastPurchaseOrder)
    if (!order) {
      throw new BizException(BizCode.PAY_FAILED, '华为订阅状态缺少最新订单信息')
    }

    const productId = firstString(order, [['productId'], ['productID']])
    const purchaseToken = firstString(order, [['purchaseToken']])
    const providerOrderId = firstString(order, [['purchaseOrderId'], ['orderId']])
    if (!productId || !purchaseToken || !providerOrderId) {
      throw new BizException(BizCode.PAY_FAILED, '华为订阅状态缺少商品或订单标识')
    }

    const rawStatus = subscription.status ?? payload.status
    const normalizedStatus = String(rawStatus ?? '')
      .trim()
      .toUpperCase()
    const active = rawStatus === 1 || rawStatus === '1' || normalizedStatus === 'ACTIVE'
    const autoRenewValue = firstValue(payload, [
      ['lastSubscriptionStatus', 'autoRenewStatus'],
      ['lastSubscriptionStatus', 'renewStatus'],
      ['lastSubscriptionStatus', 'autoRenewing'],
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'autoRenewStatus'],
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'renewStatus'],
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'autoRenewing'],
    ])
    const refundValue = firstValue(payload, [
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refundStatus'],
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refunded'],
      ['lastSubscriptionStatus', 'refundStatus'],
    ])
    const orderState = String(
      firstValue(payload, [
        ['lastSubscriptionStatus', 'lastPurchaseOrder', 'purchaseStatus'],
        ['lastSubscriptionStatus', 'lastPurchaseOrder', 'purchaseState'],
      ]) ?? '',
    ).toUpperCase()
    const refundTime = firstNumber(payload, [
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refundTime'],
      ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refundedAt'],
    ])

    return {
      payload,
      productId,
      purchaseToken,
      providerOrderId,
      applicationUserName: firstString(order, [['applicationUserName']]) || undefined,
      developerPayload: firstString(order, [['developerPayload']]) || undefined,
      expirationTime: firstNumber(payload, [
        ['lastSubscriptionStatus', 'expirationTime'],
        ['lastSubscriptionStatus', 'expireTime'],
        ['lastSubscriptionStatus', 'lastPurchaseOrder', 'expirationTime'],
      ]),
      active,
      autoRenew: asBoolean(autoRenewValue, active),
      refunded:
        asBoolean(refundValue, false) ||
        Boolean(refundTime && refundTime > 0) ||
        /REFUND|REVOK/.test(orderState),
      status: normalizedStatus || 'UNKNOWN',
    }
  }

  verifyOrderStatus(jwsPurchaseOrder: string): VerifiedHuaweiOrderStatus {
    const payload = this.verifyCompactJws(jwsPurchaseOrder)
    const order = asObject(payload.purchaseOrder) || payload
    const productId = firstString(order, [['productId'], ['productID']])
    const purchaseToken = firstString(order, [['purchaseToken']])
    const providerOrderId = firstString(order, [['purchaseOrderId'], ['orderId']])
    if (!productId || !purchaseToken || !providerOrderId) {
      throw new BizException(BizCode.PAY_FAILED, '华为订单状态缺少商品或订单标识')
    }
    const rawState = order.purchaseStatus ?? order.purchaseState ?? order.status
    const normalized = String(rawState ?? '')
      .trim()
      .toUpperCase()
    const refundValue = firstValue(order, [['refundStatus'], ['refunded']])
    const refundTime = firstNumber(order, [['refundTime'], ['refundedAt']])
    const refunded =
      asBoolean(refundValue, false) ||
      Boolean(refundTime && refundTime > 0) ||
      /REFUND|REVOK/.test(normalized)
    const paid =
      !refunded &&
      (rawState === 0 ||
        rawState === 1 ||
        ['SUCCESS', 'PAID', 'PURCHASED', 'COMPLETED'].includes(normalized))
    return {
      payload,
      productId,
      purchaseToken,
      providerOrderId,
      applicationUserName: firstString(order, [['applicationUserName']]) || undefined,
      developerPayload: firstString(order, [['developerPayload']]) || undefined,
      paid,
      refunded,
      status: normalized || 'UNKNOWN',
    }
  }
}
