import { constants, sign as cryptoSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Injectable, Logger } from '@nestjs/common'
import { request } from 'undici'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

export interface HarmonyPushPreferences {
  orders: boolean
  refunds: boolean
  chat: boolean
}

export type HarmonyPushTopic = keyof HarmonyPushPreferences

export interface HarmonyPushMessage {
  topic: HarmonyPushTopic
  title: string
  body: string
  data?: Record<string, string | number | boolean | null | undefined>
  appMessageId?: string
}

interface HuaweiServiceAccount {
  key_id?: string
  keyId?: string
  sub_account?: string
  subAccount?: string
  private_key?: string
  privateKey?: string
}

interface HuaweiPushCredentials {
  projectId: string
  keyId: string
  subAccount: string
  privateKey: string
}

interface HuaweiPushResponse {
  code?: string
  msg?: string
  requestId?: string
}

export interface HarmonyPushDeliveryResult {
  sent: number
  skipped: boolean
  reason?: 'preference-disabled' | 'no-device' | 'not-configured' | 'provider-failed'
}

@Injectable()
export class HarmonyPushService {
  private readonly logger = new Logger(HarmonyPushService.name)
  private credentialsCache: HuaweiPushCredentials | null | undefined
  private jwtCache: { value: string; expiresAt: number } | null = null
  private warnedMissingConfig = false

  constructor(private readonly prisma: PrismaService) {}

  async register(
    userId: string,
    merchantId: string,
    dto: { token?: string; deviceId?: string; locale?: string },
  ) {
    const token = String(dto.token || '').trim()
    if (token.length < 16 || token.length > 4096) {
      throw new BizException(BizCode.INVALID_PARAMS, 'Push token 格式不正确')
    }
    const locale = String(dto.locale || 'zh-CN').slice(0, 32)
    const row = await this.prisma.harmonyPushDevice.upsert({
      where: { token },
      create: {
        token,
        userId,
        merchantId,
        deviceId: dto.deviceId ? String(dto.deviceId).slice(0, 256) : null,
        locale,
        enabled: true,
      },
      update: {
        userId,
        merchantId,
        deviceId: dto.deviceId ? String(dto.deviceId).slice(0, 256) : null,
        locale,
        enabled: true,
        lastSeenAt: new Date(),
      },
      select: { id: true, locale: true, enabled: true, lastSeenAt: true },
    })
    return { ok: true, device: row }
  }

  async unregister(userId: string, merchantId: string, dto: { token?: string; deviceId?: string }) {
    const token = String(dto.token || '').trim()
    const deviceId = String(dto.deviceId || '').trim()
    if (!token && !deviceId) {
      throw new BizException(BizCode.INVALID_PARAMS, '请提供 token 或 deviceId')
    }
    const result = await this.prisma.harmonyPushDevice.updateMany({
      where: {
        userId,
        merchantId,
        ...(token ? { token } : { deviceId }),
      },
      data: { enabled: false, lastSeenAt: new Date() },
    })
    return { ok: true, disabled: result.count }
  }

  async getPreferences(merchantId: string): Promise<HarmonyPushPreferences> {
    const row = await this.prisma.harmonyPushPreference.findUnique({ where: { merchantId } })
    return row
      ? { orders: row.orders, refunds: row.refunds, chat: row.chat }
      : { orders: true, refunds: true, chat: true }
  }

  async setPreferences(
    merchantId: string,
    dto: Partial<HarmonyPushPreferences>,
  ): Promise<HarmonyPushPreferences> {
    const current = await this.getPreferences(merchantId)
    const next: HarmonyPushPreferences = {
      orders: typeof dto.orders === 'boolean' ? dto.orders : current.orders,
      refunds: typeof dto.refunds === 'boolean' ? dto.refunds : current.refunds,
      chat: typeof dto.chat === 'boolean' ? dto.chat : current.chat,
    }
    const row = await this.prisma.harmonyPushPreference.upsert({
      where: { merchantId },
      create: { merchantId, ...next },
      update: next,
    })
    return { orders: row.orders, refunds: row.refunds, chat: row.chat }
  }

  /**
   * 向某个商户当前启用的 HarmonyOS NEXT 设备发送 Push Kit 通知。
   *
   * 推送是业务写入后的 best-effort 副作用：华为网络或配置异常只能记录日志，
   * 不能让下单、售后或客服消息回滚。调用方因此无需再包裹 try/catch。
   */
  async sendToMerchant(
    merchantId: string,
    message: HarmonyPushMessage,
  ): Promise<HarmonyPushDeliveryResult> {
    try {
      if (!merchantId) return { sent: 0, skipped: true, reason: 'no-device' }

      const preferences = await this.getPreferences(merchantId)
      if (!preferences[message.topic]) {
        return { sent: 0, skipped: true, reason: 'preference-disabled' }
      }

      const devices = await this.prisma.harmonyPushDevice.findMany({
        where: { merchantId, enabled: true },
        select: { token: true },
        orderBy: { lastSeenAt: 'desc' },
      })
      const tokens = [...new Set(devices.map((item) => item.token).filter(Boolean))]
      if (!tokens.length) return { sent: 0, skipped: true, reason: 'no-device' }

      const credentials = this.getCredentials()
      if (!credentials) {
        if (!this.warnedMissingConfig) {
          this.warnedMissingConfig = true
          this.logger.warn(
            'Harmony Push Kit 未配置：请设置 HUAWEI_PUSH_PROJECT_ID 和服务账号密钥文件',
          )
        }
        return { sent: 0, skipped: true, reason: 'not-configured' }
      }

      let sent = 0
      const batchSize = process.env.HUAWEI_PUSH_TEST_MESSAGE === '1' ? 10 : 500
      for (let offset = 0; offset < tokens.length; offset += batchSize) {
        const batch = tokens.slice(offset, offset + batchSize)
        const ok = await this.sendBatch(credentials, batch, message)
        if (ok) sent += batch.length
      }
      return sent > 0
        ? { sent, skipped: false }
        : { sent: 0, skipped: true, reason: 'provider-failed' }
    } catch (error: any) {
      this.logger.warn(
        `Harmony Push Kit 下发失败 merchantId=${merchantId}: ${error?.message || error}`,
      )
      return { sent: 0, skipped: true, reason: 'provider-failed' }
    }
  }

  isConfigured(): boolean {
    return !!this.getCredentials()
  }

  private getCredentials(): HuaweiPushCredentials | null {
    if (this.credentialsCache !== undefined) return this.credentialsCache

    try {
      let account: HuaweiServiceAccount = {}
      const accountPath = String(process.env.HUAWEI_PUSH_SERVICE_ACCOUNT_FILE || '').trim()
      if (accountPath) {
        account = JSON.parse(readFileSync(accountPath, 'utf8')) as HuaweiServiceAccount
      }

      const projectId = String(process.env.HUAWEI_PUSH_PROJECT_ID || '').trim()
      const keyId = String(
        account.key_id || account.keyId || process.env.HUAWEI_PUSH_KEY_ID || '',
      ).trim()
      const subAccount = String(
        account.sub_account || account.subAccount || process.env.HUAWEI_PUSH_SUB_ACCOUNT || '',
      ).trim()
      const privateKey = String(
        account.private_key || account.privateKey || process.env.HUAWEI_PUSH_PRIVATE_KEY || '',
      )
        .replace(/\\n/g, '\n')
        .trim()

      this.credentialsCache =
        projectId && keyId && subAccount && privateKey
          ? { projectId, keyId, subAccount, privateKey }
          : null
    } catch (error: any) {
      this.logger.warn(`读取 Harmony Push Kit 服务账号失败: ${error?.message || error}`)
      this.credentialsCache = null
    }
    return this.credentialsCache
  }

  private getServiceJwt(credentials: HuaweiPushCredentials): string {
    const now = Math.floor(Date.now() / 1000)
    if (this.jwtCache && this.jwtCache.expiresAt > now + 60) return this.jwtCache.value

    const header = this.base64Url({ kid: credentials.keyId, typ: 'JWT', alg: 'PS256' })
    const payload = this.base64Url({
      iss: credentials.subAccount,
      aud: 'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
      iat: now,
      exp: now + 3600,
    })
    const signingInput = `${header}.${payload}`
    const signature = cryptoSign('sha256', Buffer.from(signingInput), {
      key: credentials.privateKey,
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    }).toString('base64url')
    const value = `${signingInput}.${signature}`
    this.jwtCache = { value, expiresAt: now + 3600 }
    return value
  }

  private async sendBatch(
    credentials: HuaweiPushCredentials,
    tokens: string[],
    message: HarmonyPushMessage,
  ): Promise<boolean> {
    const notification = this.buildNotification(message)

    const response = await request(
      `https://push-api.cloud.huawei.com/v3/${encodeURIComponent(credentials.projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getServiceJwt(credentials)}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'push-type': '0',
        },
        body: JSON.stringify({
          payload: { notification },
          target: { token: tokens },
          pushOptions: {
            ttl: 86400,
            ...(process.env.HUAWEI_PUSH_TEST_MESSAGE === '1' ? { testMessage: true } : {}),
          },
        }),
        headersTimeout: 10_000,
        bodyTimeout: 10_000,
      },
    )

    const raw = await response.body.text()
    let data: HuaweiPushResponse = {}
    try {
      data = raw ? (JSON.parse(raw) as HuaweiPushResponse) : {}
    } catch {
      // 保留 raw 进入下面的可观察错误日志。
    }
    const success =
      response.statusCode >= 200 &&
      response.statusCode < 300 &&
      (!data.code || data.code === '80000000')
    if (!success) {
      this.logger.warn(
        `Harmony Push Kit 返回失败 status=${response.statusCode} code=${data.code || '-'} requestId=${data.requestId || '-'} message=${data.msg || raw.slice(0, 300)}`,
      )
    }
    return success
  }

  private buildNotification(message: HarmonyPushMessage): Record<string, unknown> {
    const title = this.cleanNotificationText(message.title, 128) || '经纬科技商家端'
    let body = this.cleanNotificationText(message.body, 512) || '您有一条新的业务通知'
    if (body === title) body = `${body}，请进入应用查看详情`

    const clickData: Record<string, string> = {}
    for (const [key, value] of Object.entries(message.data || {})) {
      if (value !== undefined && value !== null) clickData[key] = String(value).slice(0, 512)
    }
    const appMessageId = String(message.appMessageId || '')
      .trim()
      .slice(0, 128)
    if (appMessageId) clickData.eventId = appMessageId

    const notification: Record<string, unknown> = {
      category: String(process.env.HUAWEI_PUSH_CATEGORY || 'MARKETING').trim() || 'MARKETING',
      title,
      body,
      clickAction: {
        actionType: 1,
        action:
          String(process.env.HUAWEI_PUSH_CLICK_ACTION || '').trim() ||
          'top.ewsn.jingwei.merchant.action.OPEN_DETAIL',
        ...(Object.keys(clickData).length ? { data: clickData } : {}),
      },
      // 前台已经通过原生 WebSocket 实时刷新，避免同时再弹一条系统横幅。
      foregroundShow: false,
    }
    if (appMessageId) notification.appMessageId = appMessageId
    return notification
  }

  private base64Url(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url')
  }

  private cleanNotificationText(value: string, maxLength: number): string {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength)
  }
}
