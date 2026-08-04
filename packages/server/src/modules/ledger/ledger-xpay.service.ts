import { Injectable, Logger } from '@nestjs/common'
import { createHash, createHmac } from 'crypto'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { LedgerAuthService } from './ledger-auth.service'
import { LedgerPayService } from './ledger-pay.service'
import { ledgerPlanPriceFen, normalizeLedgerConfig } from './ledger.constants'

const genTradeSuffix = customAlphabet('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 10)

/**
 * 门窗利账 · 小程序虚拟支付（道具直购 short_series_goods）。
 *
 * 为什么：会员是虚拟商品，微信规定虚拟商品须用官方「小程序虚拟支付」，不能用普通微信支付
 * （否则审核被拒，见 docs/虚拟支付接入）。本服务取代普通微信支付卖会员，覆盖 Android + iOS。
 *
 * 流程：createOrder 生成 signData/paySig/signature → 前端 wx.requestVirtualPayment →
 *       平台收银台(iOS:Apple Pay / 安卓:微信) → 发货回调 deliver-notify(本服务验签) →
 *       复用 LedgerPayService.handleNotify（按 outTradeNo 幂等 + 金额校验 + 发放会员）。
 *
 * 配置开关：LEDGER_XPAY_OFFER_ID + LEDGER_XPAY_APP_KEY 齐备才 xpayEnabled()=true；
 *           缺失则前端 virtualPayEnabled=false，自动回退「留言找管理员」，不影响线上。
 *
 * 签名（官方）：paySig    = hex(HMAC_SHA256(AppKey,      'requestVirtualPayment&' + signData))
 *               signature = hex(HMAC_SHA256(session_key, signData))
 * ⚠️ 联调须知：signData/回调字段名与回调验签头以官方《小程序虚拟支付接入指引》最新示例为准，
 *    拿到正式 AppKey/offerId 后用真机核对一次（见各 TODO）。
 */
@Injectable()
export class LedgerXpayService {
  private readonly logger = new Logger(LedgerXpayService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: LedgerAuthService,
    private readonly pay: LedgerPayService,
  ) {}

  private offerId(): string {
    return process.env.LEDGER_XPAY_OFFER_ID || ''
  }
  private appKey(): string {
    return process.env.LEDGER_XPAY_APP_KEY || ''
  }
  /** 虚拟支付环境：'1'=沙箱，默认 0=现网（iOS 无沙箱）。 */
  private env(): number {
    return process.env.LEDGER_XPAY_ENV === '1' ? 1 : 0
  }

  /** 虚拟支付是否就绪（道具号 + 密钥齐备）。未就绪则前端回退留言开通。 */
  xpayEnabled(): boolean {
    return !!this.offerId() && !!this.appKey()
  }

  private async readConfig() {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  /** 套餐 → 虚拟支付道具 productId：优先 env JSON 映射，其次 plan.productId，最后回退 plan.key。 */
  private productIdOf(planKey: string, plan: any): string {
    try {
      const map = JSON.parse(process.env.LEDGER_XPAY_PRODUCTS || '{}')
      if (map && map[planKey]) return String(map[planKey])
    } catch {
      /* 非法 JSON 忽略，走回退 */
    }
    return String(plan?.productId || planKey)
  }

  private hmac(key: string, data: string): string {
    return createHmac('sha256', key).update(data, 'utf8').digest('hex')
  }

  /**
   * 下单：锁定套餐天数/金额写库 → 用本次 wx.login code 换 session_key → 生成
   * wx.requestVirtualPayment 所需 { mode, signData, paySig, signature }。
   */
  async createOrder(userId: string, planKey: string, code?: string) {
    if (!this.xpayEnabled()) {
      throw new BizException(BizCode.BUSINESS_ERROR, '虚拟支付暂未开通，请联系管理员开通会员')
    }
    if (!code) throw new BizException(BizCode.INVALID_PARAMS, '缺少微信授权，请重试')

    const cfg = await this.readConfig()
    const plan = cfg.plans.find((p) => p.key === planKey)
    if (!plan) throw new BizException(BizCode.INVALID_PARAMS, '套餐不存在')
    const amountFen = ledgerPlanPriceFen(plan.price)
    if (amountFen <= 0) {
      throw new BizException(BizCode.BUSINESS_ERROR, '该套餐暂不支持在线支付，请联系管理员')
    }
    // 体验卡免费直接领取，不允许走支付（应调用 /l/membership/claim-trial）
    if (plan.trial) {
      throw new BizException(BizCode.BUSINESS_ERROR, '体验卡免费领取，无需支付')
    }
    const user = await this.prisma.ledgerUser.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')

    // 用户态签名需 session_key（每次下单用本次 code 现换；不持久化 session_key）
    const { sessionKey } = await this.auth.codeToSession(code)

    const outTradeNo = 'LXP' + Date.now().toString(36).toUpperCase() + genTradeSuffix()
    const order = await this.prisma.ledgerPaymentOrder.create({
      data: {
        outTradeNo,
        userId,
        planKey: plan.key,
        days: plan.days,
        amountFen,
        status: 'pending',
      },
    })

    // 道具直购 signData。paySig 与 signature 都对“这串字符”签名、前端原样回传，故字段顺序无需规范化。
    const signData = JSON.stringify({
      offerId: this.offerId(),
      buyQuantity: 1,
      env: this.env(),
      currencyType: 'CNY',
      productId: this.productIdOf(plan.key, plan),
      goodsPrice: amountFen, // 分
      outTradeNo,
      attach: `lmember:${order.id}`,
    })
    const paySig = this.hmac(this.appKey(), 'requestVirtualPayment&' + signData)
    const signature = this.hmac(sessionKey, signData)

    return {
      mode: 'short_series_goods',
      env: this.env(),
      signData,
      paySig,
      signature,
      outTradeNo,
      amountFen,
    }
  }

  /** 服务端/回调签名校验：sig = hex(HMAC_SHA256(AppKey, uriPath + '&' + body))。 */
  verifySig(uriPath: string, body: string, sig: string): boolean {
    if (!sig) return false
    return this.hmac(this.appKey(), uriPath + '&' + body) === sig
  }

  /**
   * 微信「消息推送」签名校验（虚拟支付发货回调走此通道下发）。
   * 明文模式：signature = sha1(sort([Token, timestamp, nonce]).join(''))。
   * Token 取 LEDGER_WX_PUSH_TOKEN（与公众平台「消息推送」配置一致）。
   */
  verifyPushSignature(signature?: string, timestamp?: string, nonce?: string): boolean {
    const token = process.env.LEDGER_WX_PUSH_TOKEN || ''
    if (!token || !signature || !timestamp || !nonce) return false
    const sha1 = createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex')
    return sha1 === signature
  }

  /**
   * 发货回调（xpay_goods_deliver_notify）：取 outTradeNo + 实付金额 → 复用 pay.handleNotify
   * 幂等发放会员。返回 true=已处理。
   * ⚠️ 回调字段名以官方文档为准（多写几种大小写兜底）；金额取不到时传 0，handleNotify 会按下单锁定额发放。
   */
  async handleDeliverNotify(payload: any): Promise<boolean> {
    const outTradeNo: string =
      payload?.OutTradeNo || payload?.out_trade_no || payload?.outTradeNo || ''
    if (!outTradeNo) {
      this.logger.warn('[ledger xpay] 发货回调缺 outTradeNo')
      return false
    }
    const txid: string =
      payload?.WeChatPayInfo?.TransactionId || payload?.transaction_id || payload?.OrderId || ''
    const paidFen = Number(
      payload?.GoodsInfo?.ActualPrice ?? payload?.goods_price ?? payload?.Amount ?? 0,
    )
    return this.pay.handleNotify(outTradeNo, txid, paidFen)
  }
}
