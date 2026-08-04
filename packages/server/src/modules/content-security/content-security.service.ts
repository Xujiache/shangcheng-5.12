import { Injectable, Logger } from '@nestjs/common'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

export type WechatContentScope = 'mall' | 'ledger'

export interface TextCheckOptions {
  scope?: WechatContentScope
  /** 微信内容安全场景值：1=资料，2=评论/消息。 */
  scene?: number
  openid?: string
}

export interface ImageCheckOptions extends TextCheckOptions {
  filename?: string
  mimeType?: string
}

type TokenCache = { value: string; expiresAt: number }

/**
 * 微信小程序内容安全校验的唯一服务入口。
 *
 * - 文本：`wxa/msg_sec_check`，用于昵称、备注、反馈和聊天消息；
 * - 图片：`wxa/img_sec_check`，用于头像及其它用户上传图片；
 * - 生产环境缺 AppID/Secret 或微信接口不可用时 fail closed，不能让未校验 UGC 落库；
 * - 本地开发未配置凭据时只跳过远程调用，以维持离线测试可运行。
 */
@Injectable()
export class ContentSecurityService {
  private readonly logger = new Logger(ContentSecurityService.name)
  private readonly tokenCache = new Map<WechatContentScope, TokenCache>()

  private credentials(scope: WechatContentScope) {
    return scope === 'ledger'
      ? {
          appid: process.env.LEDGER_WX_APPID || '',
          secret: process.env.LEDGER_WX_SECRET || '',
        }
      : {
          appid: process.env.WX_MINIAPP_APPID || '',
          secret: process.env.WX_MINIAPP_SECRET || '',
        }
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  private timeoutMs(): number {
    const configured = Number(process.env.WX_CONTENT_SECURITY_TIMEOUT_MS || 10_000)
    return Number.isSafeInteger(configured) && configured >= 1_000 && configured <= 30_000
      ? configured
      : 10_000
  }

  private async getAccessToken(scope: WechatContentScope): Promise<string | null> {
    const { appid, secret } = this.credentials(scope)
    if (!appid || !secret) {
      if (this.isProduction()) {
        throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务未配置，暂时无法提交用户内容')
      }
      this.logger.warn(`[content-security] ${scope} 未配置 AppID/Secret，非生产环境跳过远程校验`)
      return null
    }

    const cached = this.tokenCache.get(scope)
    if (cached && cached.expiresAt > Date.now()) return cached.value

    let response: Response
    try {
      response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`,
        { signal: AbortSignal.timeout(this.timeoutMs()) },
      )
    } catch (error: any) {
      this.logger.error(
        `[content-security] 获取 ${scope} access_token 失败: ${error?.message || error}`,
      )
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试')
    }

    const payload: any = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.access_token) {
      this.logger.error(
        `[content-security] 获取 ${scope} access_token 失败: http=${response.status} errcode=${payload?.errcode ?? '-'} ` +
          `errmsg=${payload?.errmsg ?? '-'}`,
      )
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试')
    }

    const ttlMs = Math.max(60, Number(payload.expires_in) || 7_200) * 1000
    const token = String(payload.access_token)
    // 提前 5 分钟刷新，避免在微信接口调用中间过期。
    this.tokenCache.set(scope, {
      value: token,
      expiresAt: Date.now() + Math.max(60_000, ttlMs - 300_000),
    })
    return token
  }

  private assertWechatResult(payload: any, kind: '文本' | '图片') {
    if (payload?.errcode && Number(payload.errcode) !== 0) {
      this.logger.warn(
        `[content-security] ${kind}检测接口拒绝: errcode=${payload.errcode} errmsg=${payload?.errmsg || '-'}`,
      )
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全检测失败，请修改后重试')
    }

    // v2 返回 result.suggest；旧版成功响应没有 result 时仍按微信的 errcode=0 兼容。
    const suggest = String(payload?.result?.suggest || '').toLowerCase()
    if (suggest && suggest !== 'pass') {
      this.logger.warn(
        `[content-security] ${kind}未通过: suggest=${suggest} label=${payload?.result?.label ?? '-'}`,
      )
      throw new BizException(BizCode.BUSINESS_ERROR, '内容未通过安全检测，请修改后重试')
    }
  }

  async assertTextSafe(content: string, options: TextCheckOptions = {}): Promise<void> {
    const normalized = String(content || '').trim()
    if (!normalized) return

    const scope = options.scope || 'mall'
    const token = await this.getAccessToken(scope)
    if (!token) return

    let response: Response
    try {
      response = await fetch(
        `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: 2,
            scene: options.scene || 2,
            content: normalized,
            ...(options.openid ? { openid: options.openid } : {}),
          }),
          signal: AbortSignal.timeout(this.timeoutMs()),
        },
      )
    } catch (error: any) {
      this.logger.error(`[content-security] 文本检测请求失败: ${error?.message || error}`)
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试')
    }

    const payload: any = await response.json().catch(() => ({}))
    if (!response.ok) {
      this.logger.error(`[content-security] 文本检测 HTTP 失败: ${response.status}`)
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试')
    }
    this.assertWechatResult(payload, '文本')
  }

  async assertImageSafe(buffer: Buffer, options: ImageCheckOptions = {}): Promise<void> {
    if (!buffer?.length) throw new BizException(BizCode.INVALID_PARAMS, '图片内容为空')

    const scope = options.scope || 'mall'
    const token = await this.getAccessToken(scope)
    if (!token) return

    const form = new FormData()
    form.set(
      'media',
      new Blob([buffer], { type: options.mimeType || 'application/octet-stream' }),
      options.filename || 'upload-image',
    )

    let response: Response
    try {
      response = await fetch(
        `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(this.timeoutMs()),
        },
      )
    } catch (error: any) {
      this.logger.error(`[content-security] 图片检测请求失败: ${error?.message || error}`)
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试')
    }

    const payload: any = await response.json().catch(() => ({}))
    if (!response.ok) {
      this.logger.error(`[content-security] 图片检测 HTTP 失败: ${response.status}`)
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试')
    }
    this.assertWechatResult(payload, '图片')
  }
}
