import { Body, Controller, Headers, Post, Req } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import { WxPayService } from './wxpay.service'
import { PrismaService } from '../../prisma/prisma.service'
import { MerchantService } from '../merchant/merchant.service'
import { ChatGateway } from '../chat/chat.gateway'
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
 *
 * 关键保护：
 *   - rawBody 真实读取：main.ts 启用 NestExpress { rawBody: true } 后 req.rawBody 是 Buffer，
 *     验签必须用这份原始字节（JSON.stringify(body) 会被字段顺序 / 转义影响导致签名不一致）
 *   - 幂等：先按 wxTransactionId 或 (orderId, status='success') 查 Payment，命中直接 ACK
 *   - 事务：订单状态 + Payment 写入用 prisma.$transaction，任一失败回滚
 *   - 错误回 FAIL：业务失败返回 { code: 'FAIL' }，微信会按 5 分钟级别梯度重试
 *   - @SkipResponseWrap()：跳过全局 ResponseInterceptor 包装，让 { code:'SUCCESS'|'FAIL' }
 *     成为顶层结构，否则微信网关解析失败会无限重试这笔回调
 */
@SkipResponseWrap()
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name)

  constructor(
    private readonly wxpay: WxPayService,
    private readonly prisma: PrismaService,
    private readonly merchantService: MerchantService,
    private readonly chat: ChatGateway,
  ) {}

  // P1-25：微信支付回调走 'payment-notify' 桶（200/min/IP），
  // 微信高峰期会高频重试，桶要宽松；同时拒绝 default 桶的 60/min 误杀
  @Public()
  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @Post('wechat/notify')
  async wechatNotify(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBuf = req.rawBody
    const raw = rawBuf
      ? (Buffer.isBuffer(rawBuf) ? rawBuf.toString('utf8') : String(rawBuf))
      : JSON.stringify(body)
    const ok = await this.wxpay.verifyNotify(headers, raw)
    if (!ok) return { code: 'FAIL', message: '签名验证失败' }

    let decrypted: any = null
    if (body?.resource?.ciphertext) {
      try {
        decrypted = this.wxpay.decryptResource(body.resource)
      } catch (e: any) {
        this.logger.error(`[wxpay notify] 解密失败：${e?.message || e}`)
        return { code: 'FAIL', message: '解密失败，请重试' }
      }
    }
    const outTradeNo: string = decrypted?.out_trade_no || body?.out_trade_no
    const tradeState: string = decrypted?.trade_state || body?.trade_state
    const transactionId: string = decrypted?.transaction_id || body?.transaction_id
    const attach: string = decrypted?.attach || body?.attach || ''

    if (!outTradeNo || tradeState !== 'SUCCESS') {
      // 非成功事件直接 ACK 即可（微信只会对 FAIL 重试）
      return { code: 'SUCCESS', message: 'OK' }
    }

    try {
      // 1) 会员订阅缴费回调
      const isMembership = outTradeNo.startsWith('MEM') || attach.startsWith('membership:')
      if (isMembership) {
        const recordIdFromAttach = attach.startsWith('membership:') ? attach.slice('membership:'.length) : null
        let record = recordIdFromAttach
          ? await this.prisma.paymentRecord.findUnique({ where: { id: recordIdFromAttach } })
          : null
        if (!record) {
          record = await this.prisma.paymentRecord.findUnique({ where: { no: outTradeNo } })
        }
        if (!record) {
          this.logger.warn(`[wxpay notify] 找不到 PaymentRecord no=${outTradeNo}`)
          // 业务上找不到记录就当未处理 → 让微信继续重试，给运维一个补登记的窗口
          return { code: 'FAIL', message: 'PaymentRecord not found' }
        }
        if (record.status === 'paid') {
          this.logger.log(`[wxpay notify] 会员幂等命中 no=${outTradeNo}（PaymentRecord 已 paid）`)
          return { code: 'SUCCESS', message: 'OK' }
        }
        if (record.status === 'pending') {
          await this.merchantService.activateMembership(record.id)
          this.logger.log(`[wxpay notify] 会员激活成功 no=${outTradeNo} txid=${transactionId}`)
        } else {
          // refunding / refunded / failed 等不合法状态 → 仍当作 SUCCESS 让微信停止重试，由人工对账
          this.logger.warn(`[wxpay notify] PaymentRecord 状态异常 no=${outTradeNo} status=${record.status}`)
        }
        return { code: 'SUCCESS', message: 'OK' }
      }

      // 2) 普通商品订单 —— 幂等保护
      // 优先按 wxTransactionId 查（同一笔微信交易号只入账一次）
      if (transactionId) {
        const dupByTx = await this.prisma.payment.findFirst({
          where: { wxTransactionId: transactionId, status: 'success' },
        })
        if (dupByTx) {
          this.logger.log(`[wxpay notify] 幂等命中（wxTransactionId） txid=${transactionId}`)
          return { code: 'SUCCESS', message: 'OK' }
        }
      }
      const order = await this.prisma.order.findFirst({ where: { no: outTradeNo } })
      if (!order) {
        this.logger.warn(`[wxpay notify] 找不到 Order no=${outTradeNo}`)
        return { code: 'FAIL', message: 'Order not found' }
      }
      // 按 (orderId, status=success) 二次幂等：上一次写 Payment 但订单状态未改也能拦住
      const dupByOrder = await this.prisma.payment.findFirst({
        where: { orderId: order.id, status: 'success' },
      })
      if (dupByOrder) {
        this.logger.log(`[wxpay notify] 幂等命中（orderId） orderId=${order.id}`)
        return { code: 'SUCCESS', message: 'OK' }
      }

      // 真实入账：订单状态更新 + Payment 写入放进同一个事务，避免出现"订单已改但 Payment 没落账"
      const paidAt = new Date()
      await this.prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, status: 'pending_payment' },
          data: {
            status: 'pending_shipment',
            paidAt,
            paymentMethod: 'wechat',
          },
        })
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: 'wechat',
            amount: order.payAmount,
            status: 'success',
            paidAt,
            wxTransactionId: transactionId || null,
          },
        })
      })
      this.logger.log(`[wxpay notify] 订单入账成功 no=${outTradeNo} txid=${transactionId}`)
      // 推商家：订单已付款待发货。fire-and-forget，绝不能阻塞回调返回 SUCCESS
      // （回调超时未返回会被微信无限重试，污染对账）
      try {
        this.chat.emitOrderUpdate(order.merchantId, {
          orderId: order.id,
          no: order.no,
          status: 'pending_shipment',
          updatedAt: paidAt,
        })
      } catch (e: any) {
        this.logger.warn(`[wxpay notify] emit order:update 失败 orderId=${order.id}: ${e?.message || e}`)
      }
      return { code: 'SUCCESS', message: 'OK' }
    } catch (e: any) {
      // 业务失败：返回 FAIL 让微信按梯度重试（不要吞错回 SUCCESS）
      this.logger.error(`[wxpay notify] 业务处理失败 no=${outTradeNo}: ${e?.message || e}`)
      return { code: 'FAIL', message: e?.message || '处理失败，请重试' }
    }
  }
}
