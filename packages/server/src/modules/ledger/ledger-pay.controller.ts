import { Body, Controller, Get, Headers, Logger, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import { WxPayService } from '../payment/wxpay.service'
import { LedgerPayService } from './ledger-pay.service'
import { LedgerXpayService } from './ledger-xpay.service'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import { CreateLedgerPayDto } from './dto/misc.dto'

/**
 * 门窗利账 · 会员在线支付（/api/v1/l/*）。
 * - POST l/membership/pay  下单（需登录）→ 小程序 wx.requestPayment 参数
 * - POST l/pay/notify      微信支付回调（公开，须配 LEDGER_PAY_NOTIFY_URL 指向此地址）
 */
@ApiTags('门窗利账-支付')
@Public()
@Controller('l')
export class LedgerPayController {
  private readonly logger = new Logger(LedgerPayController.name)

  constructor(
    private readonly pay: LedgerPayService,
    private readonly xpay: LedgerXpayService,
    private readonly wxpay: WxPayService,
  ) {}

  /** 会员在线支付下单（需登录）→ 返回小程序 wx.requestPayment 所需参数。 */
  @UseGuards(LedgerJwtGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('membership/pay')
  createPay(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: CreateLedgerPayDto) {
    return this.pay.createMembershipOrder(user.id, dto.planKey, dto.code)
  }

  /**
   * 会员虚拟支付下单（需登录）→ 返回小程序 wx.requestVirtualPayment 所需
   * { mode, signData, paySig, signature }。虚拟商品合规内购，取代普通微信支付。
   */
  @UseGuards(LedgerJwtGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('membership/xpay-order')
  createXpay(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: CreateLedgerPayDto) {
    return this.xpay.createOrder(user.id, dto.planKey, dto.code)
  }

  /**
   * 微信支付回调（公开，专用于门窗利账会员）。
   * rawBody 验签 → 解密 → SUCCESS 才入账；返回顶层 { code:'SUCCESS'|'FAIL' }（SkipResponseWrap）。
   */
  @SkipResponseWrap()
  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @Post('pay/notify')
  async notify(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBuf = req.rawBody
    const raw = rawBuf
      ? Buffer.isBuffer(rawBuf)
        ? rawBuf.toString('utf8')
        : String(rawBuf)
      : JSON.stringify(body)
    const ok = await this.wxpay.verifyNotify(headers, raw)
    if (!ok) return { code: 'FAIL', message: '签名验证失败' }

    let decrypted: any = null
    if (body?.resource?.ciphertext) {
      try {
        decrypted = this.wxpay.decryptResource(body.resource)
      } catch (e: any) {
        this.logger.error(`[ledger pay notify] 解密失败：${e?.message || e}`)
        return { code: 'FAIL', message: '解密失败，请重试' }
      }
    }
    const outTradeNo: string = decrypted?.out_trade_no || body?.out_trade_no
    const tradeState: string = decrypted?.trade_state || body?.trade_state
    const transactionId: string = decrypted?.transaction_id || body?.transaction_id
    const paidFen = Number(decrypted?.amount?.total ?? decrypted?.amount?.payer_total ?? 0)

    if (!outTradeNo || tradeState !== 'SUCCESS') {
      // 非成功事件直接 ACK（微信只对 FAIL 重试）
      return { code: 'SUCCESS', message: 'OK' }
    }
    try {
      const handled = await this.pay.handleNotify(outTradeNo, transactionId, paidFen)
      return handled
        ? { code: 'SUCCESS', message: 'OK' }
        : { code: 'FAIL', message: 'order not found' }
    } catch (e: any) {
      this.logger.error(`[ledger pay notify] 处理失败 outTradeNo=${outTradeNo}: ${e?.message || e}`)
      return { code: 'FAIL', message: e?.message || '处理失败，请重试' }
    }
  }

  /**
   * 微信「消息推送」URL 校验（GET）。公众平台保存消息推送配置时发起：
   * 校验 sha1(Token,timestamp,nonce)==signature → 原样返回 echostr，否则配置保存失败。
   */
  @SkipResponseWrap()
  @Get('xpay/deliver-notify')
  xpayVerify(@Query() q: Record<string, string>): string {
    const ok = this.xpay.verifyPushSignature(q.signature, q.timestamp, q.nonce)
    this.logger.log(`[ledger xpay verify] ${ok ? 'OK' : 'FAIL'} q=${JSON.stringify(q)}`)
    return ok ? q.echostr || '' : 'signature mismatch'
  }

  /**
   * 虚拟支付「发货回调」(xpay_goods_deliver_notify)，经微信「消息推送」通道下发（POST）。
   * 公开 + SkipResponseWrap。明文模式：用 Token 校验 signature → 复用 handleNotify 幂等发放会员。
   * 非 xpay 事件（如订阅消息回执）直接回 "success" 忽略，避免微信重试。
   * ⚠️ 联调核对：发货事件字段名 / ack 格式以官方《小程序虚拟支付接入指引》为准（日志已留原文）。
   */
  @SkipResponseWrap()
  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @Post('xpay/deliver-notify')
  async xpayDeliver(
    @Query() q: Record<string, string>,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBuf = req.rawBody
    const raw = rawBuf
      ? Buffer.isBuffer(rawBuf)
        ? rawBuf.toString('utf8')
        : String(rawBuf)
      : JSON.stringify(body)
    // 联调期：打印回调原文 + query，便于一次性核对发货事件字段名（联调通过后可降级或移除）
    this.logger.log(`[ledger xpay deliver] q=${JSON.stringify(q)} body=${raw}`)
    // 消息推送验签（明文模式：Token + timestamp + nonce）
    if (!this.xpay.verifyPushSignature(q.signature, q.timestamp, q.nonce)) {
      return { errcode: 1, errmsg: 'sign verify failed' }
    }
    // 只处理发货事件；其它消息推送事件直接 ACK 忽略
    const event = String(body?.Event || body?.event || '')
    const isDeliver =
      event === 'xpay_goods_deliver_notify' ||
      !!(body?.OutTradeNo || body?.out_trade_no || body?.outTradeNo)
    if (!isDeliver) return 'success'
    try {
      const ok = await this.xpay.handleDeliverNotify(body)
      return ok ? { errcode: 0, errmsg: 'OK' } : { errcode: 1, errmsg: 'order not found' }
    } catch (e: any) {
      this.logger.error(`[ledger xpay deliver] 处理失败: ${e?.message || e}`)
      return { errcode: 1, errmsg: e?.message || 'process failed' }
    }
  }
}
