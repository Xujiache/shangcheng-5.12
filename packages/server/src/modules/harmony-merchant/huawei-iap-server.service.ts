import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { createHash, createPrivateKey, sign as cryptoSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { request } from 'undici'

interface HuaweiIapServerCredentials {
  applicationId: string
  issuerId: string
  keyId: string
  privateKey: string
  rootUrl: string
}

interface HuaweiIapStatusResponse {
  responseCode?: string
  responseMessage?: string
  jwsSubGroupStatus?: string
  jwsPurchaseOrder?: string
  jwsPurchaseOrderStatus?: string
  jwsOrderStatus?: string
}

export interface HuaweiSubscriptionStatusResult {
  jwsSubGroupStatus: string
}

export interface HuaweiOrderStatusResult {
  jwsPurchaseOrder: string
}

/**
 * HarmonyOS IAP server API client.
 *
 * Huawei's current HarmonyOS API does not use the legacy OAuth client secret.
 * Every request is bound to its exact JSON body through the SHA-256 `digest`
 * claim and signed with the AppGallery IAP server key (ES256). Keeping this in
 * a dedicated service prevents a plain callback envelope from ever becoming
 * an entitlement authority.
 */
@Injectable()
export class HuaweiIapServerService {
  private credentialsCache: HuaweiIapServerCredentials | null | undefined

  isConfigured(): boolean {
    return !!this.getCredentials()
  }

  async querySubscriptionStatus(
    purchaseToken: string,
    purchaseOrderId: string,
  ): Promise<HuaweiSubscriptionStatusResult> {
    const credentials = this.getCredentials()
    if (!credentials) {
      throw new ServiceUnavailableException('华为 IAP 服务端密钥尚未配置')
    }

    const body = JSON.stringify({ purchaseToken, purchaseOrderId })
    const payload = await this.post(
      credentials,
      '/subscription/harmony/v1/application/subscription/status/query',
      body,
    )
    const jwsSubGroupStatus = String(payload.jwsSubGroupStatus || '').trim()
    if (!jwsSubGroupStatus) {
      throw new BadGatewayException('华为 IAP 状态查询缺少签名结果')
    }
    return { jwsSubGroupStatus }
  }

  async queryOrderStatus(
    purchaseToken: string,
    purchaseOrderId: string,
  ): Promise<HuaweiOrderStatusResult> {
    const credentials = this.getCredentials()
    if (!credentials) {
      throw new ServiceUnavailableException('华为 IAP 服务端密钥尚未配置')
    }
    const body = JSON.stringify({ purchaseToken, purchaseOrderId })
    const payload = await this.post(
      credentials,
      '/order/harmony/v1/application/order/status/query',
      body,
    )
    const jwsPurchaseOrder = String(
      payload.jwsPurchaseOrder || payload.jwsPurchaseOrderStatus || payload.jwsOrderStatus || '',
    ).trim()
    if (!jwsPurchaseOrder) {
      throw new BadGatewayException('华为 IAP 订单查询缺少签名结果')
    }
    return { jwsPurchaseOrder }
  }

  private async post(
    credentials: HuaweiIapServerCredentials,
    path: string,
    body: string,
  ): Promise<HuaweiIapStatusResponse> {
    const authorization = this.createAuthorization(credentials, body)
    const endpoint = `${credentials.rootUrl}${path}`

    let response: Awaited<ReturnType<typeof request>>
    try {
      response = await request(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${authorization}`,
          'content-type': 'application/json;charset=UTF-8',
        },
        body,
        headersTimeout: 8_000,
        bodyTimeout: 8_000,
      })
    } catch {
      throw new ServiceUnavailableException('华为 IAP 状态查询暂时不可用')
    }

    const text = await response.body.text()
    let payload: HuaweiIapStatusResponse = {}
    try {
      payload = text ? (JSON.parse(text) as HuaweiIapStatusResponse) : {}
    } catch {
      throw new BadGatewayException('华为 IAP 状态查询返回了无效数据')
    }
    if (response.statusCode < 200 || response.statusCode >= 300 || payload.responseCode !== '0') {
      throw new BadGatewayException(
        `华为 IAP 状态查询失败: ${payload.responseCode || response.statusCode}`,
      )
    }
    return payload
  }

  private getCredentials(): HuaweiIapServerCredentials | null {
    if (this.credentialsCache !== undefined) return this.credentialsCache
    try {
      const applicationId = String(process.env.HUAWEI_IAP_APPLICATION_ID || '').trim()
      const issuerId = String(process.env.HUAWEI_IAP_ISSUER_ID || '').trim()
      const keyId = String(process.env.HUAWEI_IAP_KEY_ID || '').trim()
      const privateKeyPath = String(process.env.HUAWEI_IAP_PRIVATE_KEY_FILE || '').trim()
      const privateKey = String(
        privateKeyPath
          ? readFileSync(privateKeyPath, 'utf8')
          : process.env.HUAWEI_IAP_PRIVATE_KEY || '',
      )
        .replace(/\\n/g, '\n')
        .trim()
      const configuredRoot = String(process.env.HUAWEI_IAP_ROOT_URL || '').trim()
      const rootUrl = (configuredRoot || 'https://iap.cloud.huawei.com').replace(/\/+$/, '')

      if (!applicationId || !issuerId || !keyId || !privateKey || !/^https:\/\//.test(rootUrl)) {
        this.credentialsCache = null
        return null
      }
      createPrivateKey(privateKey)
      this.credentialsCache = { applicationId, issuerId, keyId, privateKey, rootUrl }
    } catch {
      this.credentialsCache = null
    }
    return this.credentialsCache
  }

  private createAuthorization(credentials: HuaweiIapServerCredentials, body: string): string {
    const now = Math.floor(Date.now() / 1000)
    const header = this.base64Url({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' })
    const payload = this.base64Url({
      iss: credentials.issuerId,
      digest: createHash('sha256').update(body, 'utf8').digest('hex'),
      aud: 'iap-v1',
      exp: now + 3600,
      iat: now,
      aid: credentials.applicationId,
    })
    const signingInput = `${header}.${payload}`
    const signature = cryptoSign('sha256', Buffer.from(signingInput, 'utf8'), {
      key: credentials.privateKey,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url')
    return `${signingInput}.${signature}`
  }

  private base64Url(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
  }
}
