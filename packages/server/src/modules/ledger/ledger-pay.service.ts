import { Injectable, Logger } from '@nestjs/common'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { WxPayService } from '../payment/wxpay.service'
import { LedgerAuthService } from './ledger-auth.service'
import { computeGrantExpiry, ledgerPlanPriceFen, normalizeLedgerConfig } from './ledger.constants'

const genTradeSuffix = customAlphabet('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 10)

/**
 * 门窗利账 · 会员在线支付（用户直接付款 → 微信回调自动开通会员）。
 *
 * 资金安全（P0）：
 *   - 金额/天数在下单时按后台套餐锁定写库，回调以本表为准，绝不信任前端传值
 *   - 回调校验签名 + 解密 + 金额比对 + 行级幂等（updateMany where status=pending）
 *   - 微信支付未配齐 → payEnabled=false，App 自动回退到「留言找管理员」流程
 *
 * 注意：门窗利账是独立小程序（appid=LEDGER_WX_APPID），与商城共用商户号(WX_PAY_MCH_ID)，
 * 故下单时显式传 appid + 专用回调地址 LEDGER_PAY_NOTIFY_URL，避免回调串到商城路由。
 */
@Injectable()
export class LedgerPayService {
  private readonly logger = new Logger(LedgerPayService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly wxpay: WxPayService,
    private readonly auth: LedgerAuthService,
  ) {}

  /** 在线支付是否就绪：微信支付配齐 + ledger 小程序 appid + 专用回调地址都到位。 */
  payEnabled(): boolean {
    return this.wxpay.isReady() && !!process.env.LEDGER_WX_APPID && !!this.notifyUrl()
  }
  private notifyUrl(): string {
    return process.env.LEDGER_PAY_NOTIFY_URL || ''
  }

  private async readConfig() {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  /** 下单：锁定套餐天数/金额 → 解析 openid → 微信 JSAPI 下单 → 返回小程序调起支付参数。 */
  async createMembershipOrder(userId: string, planKey: string, code?: string) {
    if (!this.payEnabled()) {
      throw new BizException(BizCode.BUSINESS_ERROR, '在线支付暂未开通，请联系管理员开通会员')
    }
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

    // openid：优先已绑定的 wxOpenid（与 ledger appid 同源）；否则用本次 wx.login 的 code 兑换
    let openid = user.wxOpenid || ''
    if (!openid) {
      if (!code) throw new BizException(BizCode.INVALID_PARAMS, '缺少微信授权，请重试')
      openid = await this.auth.codeToOpenid(code)
    }

    const outTradeNo = 'LMEM' + Date.now().toString(36).toUpperCase() + genTradeSuffix()
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

    try {
      const invoke = await this.wxpay.createMiniPay({
        outTradeNo,
        description: `门窗利账会员 · ${plan.label}`,
        totalFen: amountFen,
        openid,
        attach: `lmember:${order.id}`,
        appid: process.env.LEDGER_WX_APPID!,
        notifyUrl: this.notifyUrl(),
      })
      return { ...invoke, outTradeNo, amountFen, planKey: plan.key }
    } catch (e: any) {
      await this.prisma.ledgerPaymentOrder
        .update({ where: { id: order.id }, data: { status: 'failed' } })
        .catch(() => {})
      throw new BizException(BizCode.BUSINESS_ERROR, e?.message || '微信下单失败，请稍后再试')
    }
  }

  /**
   * 微信支付回调入账（幂等 + 金额校验 + 自动发放会员）。
   * 返回 true=已正确处理（回 SUCCESS）；false=未找到订单（回 FAIL 让微信按梯度重试）。
   */
  async handleNotify(outTradeNo: string, transactionId: string, paidFen: number): Promise<boolean> {
    const order = await this.prisma.ledgerPaymentOrder.findUnique({ where: { outTradeNo } })
    if (!order) {
      this.logger.warn(`[ledger pay] 找不到订单 outTradeNo=${outTradeNo}`)
      return false
    }
    // 幂等：已入账直接 ACK
    if (order.status === 'paid' || order.grantedAt) {
      this.logger.log(`[ledger pay] 幂等命中 outTradeNo=${outTradeNo}`)
      return true
    }
    // 金额防篡改：回调金额必须与下单锁定金额一致
    if (Number.isFinite(paidFen) && paidFen > 0 && paidFen !== order.amountFen) {
      this.logger.error(
        `[ledger pay] 金额不一致 outTradeNo=${outTradeNo} expect=${order.amountFen} got=${paidFen}`,
      )
      await this.prisma.ledgerPaymentOrder
        .update({ where: { id: order.id }, data: { status: 'failed' } })
        .catch(() => {})
      return true // ACK 不重发，金额异常交人工对账/退款
    }

    const now = new Date()
    // 永久套餐：回调发放时置 perpetual=true（天数仍按订单锁定值记录，但永久态以本标记为准）
    const cfgForGrant = await this.readConfig()
    const planForGrant = cfgForGrant.plans.find((p) => p.key === order.planKey)
    const isPerpetual = !!planForGrant?.perpetual
    const isTrial = !!planForGrant?.trial
    let granted: { after: Date; days: number } | null = null
    await this.prisma.$transaction(async (tx) => {
      // 行级幂等：仅当仍 pending 才入账（拦并发重复回调）
      const claim = await tx.ledgerPaymentOrder.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'paid', paidAt: now, transactionId: transactionId || null },
      })
      if (claim.count === 0) return // 已被另一并发回调处理

      let membership = await tx.ledgerMembership.findUnique({ where: { userId: order.userId } })
      if (!membership) {
        membership = await tx.ledgerMembership.create({ data: { userId: order.userId } })
      }
      const before = membership.expiresAt
      const after = computeGrantExpiry(before, order.days, now)
      await tx.ledgerMembership.update({
        where: { id: membership.id },
        data: {
          expiresAt: after,
          lastPlanKey: order.planKey,
          ...(isPerpetual ? { perpetual: true } : {}),
          ...(isTrial ? { trialClaimedAt: now } : {}),
        },
      })
      await tx.ledgerMembershipLog.create({
        data: {
          membershipId: membership.id,
          deltaDays: order.days,
          planKey: order.planKey,
          beforeAt: before,
          afterAt: after,
          operatorId: null,
          note: `在线支付开通（${(order.amountFen / 100).toFixed(2)} 元 / ${outTradeNo}）`,
        },
      })
      await tx.ledgerPaymentOrder.update({ where: { id: order.id }, data: { grantedAt: now } })
      granted = { after, days: order.days }
    })

    if (granted) {
      // 应用内通知（best-effort，置于事务外避免拖垮入账）
      const g = granted as { after: Date; days: number }
      await this.prisma.ledgerNotification
        .create({
          data: {
            userId: order.userId,
            type: 'member',
            title: '会员开通成功',
            body: `支付成功，已为您增加 ${g.days} 天会员时长，有效期至 ${g.after.toISOString().slice(0, 10)}。`,
          },
        })
        .catch(() => {})
      this.logger.log(`[ledger pay] 开通成功 outTradeNo=${outTradeNo} txid=${transactionId}`)
    }
    return true
  }
}
