import { Body, Controller, Headers, Post, Req } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { WxPayService } from './wxpay.service'
import { PrismaService } from '../../prisma/prisma.service'
import { Logger } from '@nestjs/common'

/**
 * 微信支付回调
 * URL：POST /api/v1/payments/wechat/notify
 * 微信会 POST 加密 JSON；商户号申请通过后会被微信调用。
 */
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name)

  constructor(
    private readonly wxpay: WxPayService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('wechat/notify')
  async wechatNotify(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: any,
  ) {
    const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(body)
    const ok = await this.wxpay.verifyNotify(headers, raw)
    if (!ok) return { code: 'FAIL', message: '签名验证失败' }

    // 微信 v3 回调结构：
    //   { event_type: 'TRANSACTION.SUCCESS', resource: { ciphertext, nonce, associated_data } }
    // 解密 ciphertext → { out_trade_no, trade_state, transaction_id, ... }
    try {
      let decrypted: any = null
      if (body?.resource?.ciphertext) {
        try {
          decrypted = this.wxpay.decryptResource(body.resource)
        } catch (e: any) {
          this.logger.error(`[wxpay notify] 解密失败：${e?.message || e}`)
        }
      }
      const outTradeNo = decrypted?.out_trade_no || body?.out_trade_no
      const tradeState = decrypted?.trade_state || body?.trade_state
      const transactionId = decrypted?.transaction_id || body?.transaction_id

      if (outTradeNo && tradeState === 'SUCCESS') {
        await this.prisma.order.updateMany({
          where: { no: outTradeNo, status: 'pending_payment' },
          data: { status: 'pending_shipment', paidAt: new Date() },
        })
        // 也写一条 Payment 记录（用于对账）
        const order = await this.prisma.order.findFirst({ where: { no: outTradeNo } })
        if (order) {
          await this.prisma.payment.create({
            data: {
              orderId: order.id,
              method: 'wechat',
              amount: order.payAmount,
              status: 'success',
              paidAt: new Date(),
              wxTransactionId: transactionId || null,
            },
          })
        }
      }
    } catch (e: any) {
      this.logger.error(`[wxpay notify] update order failed: ${e?.message || e}`)
    }
    return { code: 'SUCCESS', message: 'OK' }
  }
}
