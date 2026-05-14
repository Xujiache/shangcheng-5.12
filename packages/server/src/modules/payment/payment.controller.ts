import { Body, Controller, Headers, Post, Req } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { WxPayService } from './wxpay.service'
import { PrismaService } from '../../prisma/prisma.service'
import { MerchantService } from '../merchant/merchant.service'
import { Logger } from '@nestjs/common'

/**
 * 微信支付回调
 * URL：POST /api/v1/payments/wechat/notify
 * 微信会 POST 加密 JSON；商户号申请通过后会被微信调用。
 *
 * 支持两类业务：
 *   1. 普通商品订单（outTradeNo = Order.no，不带 MEM 前缀）
 *      → 更新 Order.status='pending_shipment' + 写 Payment 对账记录
 *   2. 会员订阅缴费（outTradeNo 以 MEM 开头）
 *      → 通过 attach 字段（"membership:<recordId>"）或 PaymentRecord.no 找到
 *        待支付的 PaymentRecord，调 MerchantService.activateMembership 真正激活会员
 */
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name)

  constructor(
    private readonly wxpay: WxPayService,
    private readonly prisma: PrismaService,
    private readonly merchantService: MerchantService,
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

    try {
      let decrypted: any = null
      if (body?.resource?.ciphertext) {
        try {
          decrypted = this.wxpay.decryptResource(body.resource)
        } catch (e: any) {
          this.logger.error(`[wxpay notify] 解密失败：${e?.message || e}`)
        }
      }
      const outTradeNo: string = decrypted?.out_trade_no || body?.out_trade_no
      const tradeState: string = decrypted?.trade_state || body?.trade_state
      const transactionId: string = decrypted?.transaction_id || body?.transaction_id
      const attach: string = decrypted?.attach || body?.attach || ''

      if (!outTradeNo || tradeState !== 'SUCCESS') {
        // 非成功事件直接 ACK，避免微信重试
        return { code: 'SUCCESS', message: 'OK' }
      }

      // 1) 会员订阅缴费回调
      const isMembership = outTradeNo.startsWith('MEM') || attach.startsWith('membership:')
      if (isMembership) {
        const recordIdFromAttach = attach.startsWith('membership:') ? attach.slice('membership:'.length) : null
        // 优先用 attach 里的 recordId，找不到再按 outTradeNo 查
        let record = recordIdFromAttach
          ? await this.prisma.paymentRecord.findUnique({ where: { id: recordIdFromAttach } })
          : null
        if (!record) {
          record = await this.prisma.paymentRecord.findUnique({ where: { no: outTradeNo } })
        }
        if (record && record.status === 'pending') {
          await this.merchantService.activateMembership(record.id).catch((e: any) => {
            this.logger.error(`[wxpay notify] 会员激活失败 record=${record!.id} err=${e?.message || e}`)
          })
          this.logger.log(`[wxpay notify] 会员激活成功 no=${outTradeNo} txid=${transactionId}`)
        } else if (!record) {
          this.logger.warn(`[wxpay notify] 找不到 PaymentRecord no=${outTradeNo}`)
        }
        return { code: 'SUCCESS', message: 'OK' }
      }

      // 2) 普通商品订单
      await this.prisma.order.updateMany({
        where: { no: outTradeNo, status: 'pending_payment' },
        data: { status: 'pending_shipment', paidAt: new Date() },
      })
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
    } catch (e: any) {
      this.logger.error(`[wxpay notify] update order failed: ${e?.message || e}`)
    }
    return { code: 'SUCCESS', message: 'OK' }
  }
}
