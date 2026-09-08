import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { createHash } from 'node:crypto'
import { nanoid } from 'nanoid'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  HuaweiIapJwsService,
  VerifiedHuaweiOrderStatus,
  VerifiedHuaweiPurchase,
  VerifiedHuaweiSubscriptionStatus,
} from './huawei-iap-jws.service'
import { HuaweiIapServerService } from './huawei-iap-server.service'

type JsonObject = Record<string, unknown>

@Injectable()
export class HarmonyIapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jws: HuaweiIapJwsService,
    private readonly iapServer: HuaweiIapServerService,
  ) {}

  async prepare(merchantId: string, userId: string, planId: string) {
    const plan = await this.prisma.memberPlan.findUnique({ where: { id: planId } })
    if (!plan || plan.status !== 'active') {
      throw new BizException(BizCode.NOT_FOUND, '套餐不存在或已下架')
    }
    if (!plan.huaweiProductId || !plan.huaweiProductType) {
      throw new BizException(BizCode.BUSINESS_ERROR, '该套餐尚未配置 AppGallery 商品')
    }
    if (!['subscription', 'consumable'].includes(plan.huaweiProductType)) {
      throw new BizException(BizCode.BUSINESS_ERROR, 'AppGallery 商品类型配置错误')
    }
    if (!this.iapServer.isConfigured()) {
      throw new ServiceUnavailableException('华为 IAP 尚未完成商户及服务端配置，暂不可购买')
    }
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant || merchant.status !== 'active') {
      throw new BizException(BizCode.FORBIDDEN, '当前商户状态不允许购买会员')
    }
    const orderNo = `HMI${Date.now()}${nanoid(10)}`
    await this.prisma.harmonyIapOrder.create({
      data: {
        orderNo,
        merchantId,
        userId,
        planId: plan.id,
        productId: plan.huaweiProductId,
        productType: plan.huaweiProductType,
        amount: plan.price,
      },
    })
    return {
      orderNo,
      productId: plan.huaweiProductId,
      productType: plan.huaweiProductType,
      developerPayload: JSON.stringify({ orderNo }),
    }
  }

  async verify(merchantId: string, userId: string, orderNo: string, purchaseData: string) {
    const prepared = await this.prisma.harmonyIapOrder.findFirst({
      where: { orderNo, merchantId, userId },
    })
    if (!prepared) throw new BizException(BizCode.NOT_FOUND, 'IAP 订单不存在')
    if (prepared.status === 'activated') {
      return {
        ok: true,
        membership: await this.currentMembership(merchantId),
        alreadyActivated: true,
        purchaseToken: prepared.purchaseToken,
        purchaseOrderId: prepared.providerOrderId,
        productType: prepared.productType,
      }
    }
    if (prepared.status !== 'prepared' && prepared.status !== 'verified') {
      throw new BizException(BizCode.PAY_FAILED, `当前 IAP 订单状态不可激活: ${prepared.status}`)
    }

    const verified = this.jws.verifyPurchaseData(purchaseData, prepared.productType)
    this.assertPurchaseMatches(prepared, verified)

    try {
      const result = await this.activate(prepared.id, verified, purchaseData)
      return { ok: true, ...result }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BizException(BizCode.CONFLICT, '该华为交易已被处理，不能重复发放权益')
      }
      throw error
    }
  }

  async restore(merchantId: string, userId: string, productType: string, purchaseData: string) {
    if (!['subscription', 'consumable'].includes(productType)) {
      throw new BizException(BizCode.INVALID_PARAMS, '不支持的华为商品类型')
    }
    const verified = this.jws.verifyPurchaseData(purchaseData, productType)
    const prepared = await this.prisma.harmonyIapOrder.findFirst({
      where: {
        merchantId,
        userId,
        OR: [
          { purchaseToken: verified.purchaseToken },
          { providerOrderId: verified.providerOrderId },
          ...(verified.applicationUserName ? [{ orderNo: verified.applicationUserName }] : []),
        ],
      },
    })
    if (!prepared) {
      throw new BizException(BizCode.NOT_FOUND, '该华为购买记录不属于当前商家账号')
    }
    this.assertPurchaseMatches(prepared, verified)
    if (prepared.status === 'activated') {
      return {
        ok: true,
        membership: await this.currentMembership(merchantId),
        alreadyActivated: true,
        purchaseToken: verified.purchaseToken,
        purchaseOrderId: verified.providerOrderId,
        productType: prepared.productType,
      }
    }
    if (prepared.status !== 'prepared' && prepared.status !== 'verified') {
      throw new BizException(BizCode.PAY_FAILED, `当前 IAP 订单状态不可恢复: ${prepared.status}`)
    }
    const result = await this.activate(prepared.id, verified, purchaseData)
    return { ok: true, ...result }
  }

  private assertPurchaseMatches(
    prepared: { orderNo: string; productId: string },
    verified: VerifiedHuaweiPurchase,
  ) {
    if (verified.productId !== prepared.productId) {
      throw new BizException(BizCode.PAY_FAILED, '华为支付商品与服务端订单不一致')
    }
    if (verified.applicationUserName && verified.applicationUserName !== prepared.orderNo) {
      throw new BizException(BizCode.PAY_FAILED, '华为支付账号绑定信息不一致')
    }
    if (verified.developerPayload) {
      try {
        const payload = JSON.parse(verified.developerPayload) as { orderNo?: string }
        if (payload.orderNo && payload.orderNo !== prepared.orderNo) {
          throw new BizException(BizCode.PAY_FAILED, '华为支付商户扩展信息不一致')
        }
      } catch (error) {
        if (error instanceof BizException) throw error
      }
    }
  }

  private async activate(
    iapOrderId: string,
    verified: VerifiedHuaweiPurchase,
    purchaseData: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.harmonyIapOrder.findUnique({ where: { id: iapOrderId } })
      if (!order) throw new BizException(BizCode.NOT_FOUND, 'IAP 订单不存在')
      if (order.status === 'activated') {
        return {
          membership: await this.currentMembership(order.merchantId, tx),
          alreadyActivated: true,
          purchaseToken: order.purchaseToken,
          purchaseOrderId: order.providerOrderId,
          productType: order.productType,
        }
      }
      const plan = await tx.memberPlan.findUnique({ where: { id: order.planId } })
      if (!plan || plan.status !== 'active' || plan.huaweiProductId !== verified.productId) {
        throw new BizException(BizCode.PAY_FAILED, '套餐配置在支付过程中发生变化')
      }

      await tx.harmonyIapOrder.update({
        where: { id: order.id },
        data: {
          status: 'verified',
          purchaseToken: verified.purchaseToken,
          providerOrderId: verified.providerOrderId,
          purchaseData: this.toJsonValue(purchaseData),
          verifiedAt: new Date(),
        },
      })

      let payment = await tx.paymentRecord.findUnique({ where: { no: order.orderNo } })
      if (!payment) {
        payment = await tx.paymentRecord.create({
          data: {
            no: order.orderNo,
            merchantId: order.merchantId,
            planId: plan.id,
            planName: plan.name,
            planType: plan.type,
            amount: order.amount,
            paymentMethod: 'huawei_iap',
            status: 'paid',
            paidAt: new Date(),
            providerOrderId: verified.providerOrderId,
            purchaseToken: verified.purchaseToken,
          },
        })
      }

      let membership: unknown = null
      if (plan.type === 'addon') {
        await this.addQuotaPack(tx, order.merchantId, plan.constraints as JsonObject | null)
      } else {
        membership = await this.activateSubscription(
          tx,
          order.merchantId,
          plan,
          verified.providerOrderId,
          verified.expirationTime,
        )
      }

      await tx.harmonyIapOrder.update({
        where: { id: order.id },
        data: { status: 'activated', activatedAt: new Date() },
      })
      return {
        membership,
        paymentId: payment.id,
        alreadyActivated: false,
        purchaseToken: verified.purchaseToken,
        purchaseOrderId: verified.providerOrderId,
        productType: order.productType,
      }
    })
  }

  private async activateSubscription(
    tx: Prisma.TransactionClient,
    merchantId: string,
    plan: {
      id: string
      code: string
      period: string
      periodCount: number
    },
    providerSubscriptionId: string,
    signedExpirationTime?: number,
  ) {
    const existing = await tx.merchantMembership.findFirst({
      where: { merchantId, planId: plan.id, status: { in: ['trial', 'active'] } },
      orderBy: { endAt: 'desc' },
    })
    const now = new Date()
    const startAt = existing && existing.endAt > now ? existing.endAt : now
    const endAt = new Date(startAt)
    if (signedExpirationTime && signedExpirationTime > now.getTime()) {
      endAt.setTime(signedExpirationTime)
    } else if (plan.period === 'monthly') endAt.setMonth(endAt.getMonth() + plan.periodCount)
    else if (plan.period === 'yearly') endAt.setFullYear(endAt.getFullYear() + plan.periodCount)
    else if (plan.period === 'weekly') endAt.setDate(endAt.getDate() + 7 * plan.periodCount)
    else if (plan.period === 'daily') endAt.setDate(endAt.getDate() + plan.periodCount)
    else endAt.setFullYear(endAt.getFullYear() + 100)

    await tx.merchantMembership.updateMany({
      where: { merchantId, status: { in: ['trial', 'active'] }, NOT: { planId: plan.id } },
      data: { status: 'expired' },
    })
    if (existing) {
      return tx.merchantMembership.update({
        where: { id: existing.id },
        data: {
          endAt,
          status: 'active',
          autoRenew: true,
          provider: 'huawei_iap',
          providerSubscriptionId,
        },
      })
    }
    return tx.merchantMembership.create({
      data: {
        merchantId,
        planId: plan.id,
        planCode: plan.code,
        startAt,
        endAt,
        status: 'active',
        autoRenew: true,
        provider: 'huawei_iap',
        providerSubscriptionId,
      },
    })
  }

  private async addQuotaPack(
    tx: Prisma.TransactionClient,
    merchantId: string,
    constraints: JsonObject | null,
  ) {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const pushSlots = Number(constraints?.pushSlots || 0)
    const banner = Number(constraints?.bannerLimit || 0)
    const impression = Number(constraints?.impressionLimit || 0)
    await tx.usageQuota.upsert({
      where: { merchantId_periodStart: { merchantId, periodStart } },
      create: {
        merchantId,
        periodStart,
        periodEnd,
        pushSlotsLimit: Math.max(0, pushSlots),
        bannerLimit: Math.max(0, banner),
        impressionLimit: Math.max(0, impression),
      },
      update: {
        pushSlotsLimit: { increment: Math.max(0, pushSlots) },
        bannerLimit: { increment: Math.max(0, banner) },
        impressionLimit: { increment: Math.max(0, impression) },
      },
    })
  }

  private async currentMembership(
    merchantId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return client.merchantMembership.findFirst({
      where: { merchantId, status: { in: ['trial', 'active'] } },
      orderBy: { endAt: 'desc' },
      include: { plan: true },
    })
  }

  async handleNotification(body: unknown) {
    const object = body && typeof body === 'object' ? (body as JsonObject) : {}
    if (object.notificationVersion || object.notificationMetaData) {
      return this.handleV3Notification(object)
    }
    return this.handleLegacySignedNotification(object)
  }

  private async handleV3Notification(notification: JsonObject) {
    const notificationType = String(notification.notificationType || '').trim().toUpperCase()
    const version = String(notification.notificationVersion || '').trim().toLowerCase()
    const requestId = String(notification.notificationRequestId || '').trim()
    const signedTime = Number(notification.signedTime || 0)
    const metadata = this.asObject(notification.notificationMetaData)
    if (!notificationType || version !== 'v3' || !requestId || !metadata || !signedTime) {
      throw new BadRequestException('华为 IAP v3 通知格式不正确')
    }
    if (requestId.length > 256 || signedTime > Date.now() + 10 * 60_000) {
      throw new BadRequestException('华为 IAP 通知标识或时间无效')
    }

    // The official test event intentionally uses a fixed test package and fake
    // transaction IDs. It only proves callback reachability and must never
    // query or mutate entitlements.
    if (notificationType === 'TEST') return { result: 0 }

    const expectedApplicationId = String(process.env.HUAWEI_IAP_APPLICATION_ID || '').trim()
    if (!expectedApplicationId || !this.iapServer?.isConfigured()) {
      throw new ServiceUnavailableException('华为 IAP 服务端鉴权尚未配置')
    }
    const expectedPackage =
      String(process.env.HUAWEI_IAP_PACKAGE_NAME || '').trim() || 'top.ewsn.jingwei.merchant'
    const applicationId = String(metadata.applicationId || '').trim()
    const packageName = String(metadata.packageName || '').trim()
    const environment = String(metadata.environment || '').trim().toUpperCase()
    const purchaseToken = String(metadata.purchaseToken || '').trim()
    const purchaseOrderId = String(metadata.purchaseOrderId || '').trim()
    const providerType = Number(metadata.type)
    if (
      applicationId !== expectedApplicationId ||
      packageName !== expectedPackage ||
      !['NORMAL', 'SANDBOX'].includes(environment)
    ) {
      throw new BadRequestException('华为 IAP 通知应用身份不匹配')
    }
    if (
      purchaseToken.length < 16 ||
      purchaseToken.length > 512 ||
      purchaseOrderId.length < 8 ||
      purchaseOrderId.length > 256
    ) {
      throw new BadRequestException('华为 IAP 通知缺少有效交易标识')
    }

    const claimed = await this.claimNotification(
      requestId,
      notificationType,
      String(notification.notificationSubtype || '').trim(),
      environment,
      purchaseToken,
      purchaseOrderId,
      notification,
    )
    if (!claimed) return { result: 0 }

    try {
      if (providerType === 2) {
        const response = await this.iapServer.querySubscriptionStatus(
          purchaseToken,
          purchaseOrderId,
        )
        let verified: VerifiedHuaweiSubscriptionStatus
        try {
          verified = this.jws.verifySubscriptionStatus(response.jwsSubGroupStatus)
        } catch {
          throw new BadGatewayException('华为 IAP 权威订阅状态验签失败')
        }
        this.assertNotificationTransaction(purchaseToken, purchaseOrderId, verified)
        const order = await this.findNotificationOrder(verified)
        if (!order) {
          throw new ServiceUnavailableException('华为 IAP 交易尚未与本地订单关联')
        }
        this.assertPurchaseMatches(order, verified)
        const purchaseData = JSON.stringify({
          notification,
          jwsSubGroupStatus: response.jwsSubGroupStatus,
        })
        if (verified.active) {
          if (order.status === 'prepared' || order.status === 'verified') {
            await this.activate(order.id, verified, purchaseData)
          }
          await this.syncAuthoritativeSubscription(order, verified, purchaseData)
        } else {
          await this.expireAuthoritativeSubscription(order, verified, purchaseData)
        }
        await this.completeNotification(requestId, order.id)
        return { result: 0 }
      }

      if (providerType === 0 || providerType === 1) {
        const response = await this.iapServer.queryOrderStatus(purchaseToken, purchaseOrderId)
        let verified: VerifiedHuaweiOrderStatus
        try {
          verified = this.jws.verifyOrderStatus(response.jwsPurchaseOrder)
        } catch {
          throw new BadGatewayException('华为 IAP 权威订单状态验签失败')
        }
        this.assertNotificationTransaction(purchaseToken, purchaseOrderId, verified)
        const order = await this.findNotificationOrder(verified)
        if (!order) {
          throw new ServiceUnavailableException('华为 IAP 交易尚未与本地订单关联')
        }
        this.assertPurchaseMatches(order, verified)
        const purchaseData = JSON.stringify({
          notification,
          jwsPurchaseOrder: response.jwsPurchaseOrder,
        })
        if (verified.paid) {
          if (order.status === 'prepared' || order.status === 'verified') {
            await this.activate(order.id, verified, purchaseData)
          }
        } else if (verified.refunded) {
          await this.refundAuthoritativeOrder(order, verified.providerOrderId, purchaseData)
        } else {
          throw new ServiceUnavailableException(`华为 IAP 订单尚未完成: ${verified.status}`)
        }
        await this.completeNotification(requestId, order.id)
        return { result: 0 }
      }

      throw new BadRequestException(`暂不支持的华为 IAP 商品类型: ${providerType}`)
    } catch (error) {
      await this.releaseNotification(requestId)
      throw error
    }
  }

  private async handleLegacySignedNotification(object: JsonObject) {
    const signedPayload = String(
      object.signedPayload || object.jwsNotification || object.notification || object.purchaseData || '',
    )
    if (!signedPayload) throw new BizException(BizCode.INVALID_PARAMS, '缺少通知签名载荷')
    const payload = this.jws.verifyCompactJws(signedPayload)
    const token = this.findString(payload, 'purchaseToken')
    const providerOrderId = this.findString(payload, 'purchaseOrderId') || this.findString(payload, 'orderId')
    if (!token && !providerOrderId) {
      throw new BizException(BizCode.INVALID_PARAMS, '通知缺少交易标识')
    }
    const order = await this.prisma.harmonyIapOrder.findFirst({
      where: token ? { purchaseToken: token } : { providerOrderId },
    })
    if (!order) return { result: 0 }

    const event = String(
      this.findString(payload, 'notificationType') || this.findString(payload, 'status') || '',
    ).toUpperCase()
    const rawPurchaseData = payload as Prisma.InputJsonValue
    if (/REFUND|REVOK/.test(event)) {
      await this.prisma.$transaction([
        this.prisma.harmonyIapOrder.update({
          where: { id: order.id },
          data: {
            status: 'refunded',
            refundedAt: new Date(),
            purchaseData: rawPurchaseData,
          },
        }),
        this.prisma.paymentRecord.updateMany({
          where: { no: order.orderNo },
          data: { status: 'refunded' },
        }),
        this.prisma.merchantMembership.updateMany({
          where: { merchantId: order.merchantId, planId: order.planId },
          data: { status: 'expired', autoRenew: false },
        }),
      ])
    } else if (event.includes('EXPIRE')) {
      // 到期并不等于支付失败：保留原 paid 账单，只收回当前权益。
      await this.prisma.$transaction([
        this.prisma.harmonyIapOrder.update({
          where: { id: order.id },
          data: { status: 'expired', purchaseData: rawPurchaseData },
        }),
        this.prisma.merchantMembership.updateMany({
          where: { merchantId: order.merchantId, planId: order.planId },
          data: { status: 'expired', autoRenew: false },
        }),
      ])
    } else if (/CANCEL|STOP_AUTO_RENEW/.test(event)) {
      // 取消自动续费后，用户仍可使用已经付费的剩余有效期。
      await this.prisma.$transaction([
        this.prisma.harmonyIapOrder.update({
          where: { id: order.id },
          data: { status: 'cancelled', purchaseData: rawPurchaseData },
        }),
        this.prisma.merchantMembership.updateMany({
          where: { merchantId: order.merchantId, planId: order.planId },
          data: { autoRenew: false },
        }),
      ])
    } else if (/RENEW|ACTIVE|SUBSCRIB/.test(event)) {
      const expirationTime = this.findNumber(payload, 'expirationTime')
      if (expirationTime > Date.now()) {
        await this.prisma.$transaction([
          this.prisma.harmonyIapOrder.update({
            where: { id: order.id },
            data: { status: 'activated', purchaseData: rawPurchaseData },
          }),
          this.prisma.merchantMembership.updateMany({
            where: { merchantId: order.merchantId, planId: order.planId },
            data: { status: 'active', autoRenew: true, endAt: new Date(expirationTime) },
          }),
        ])
      }
    }
    return { result: 0 }
  }

  private assertNotificationTransaction(
    purchaseToken: string,
    purchaseOrderId: string,
    verified: VerifiedHuaweiPurchase,
  ) {
    if (
      verified.purchaseToken !== purchaseToken ||
      verified.providerOrderId !== purchaseOrderId
    ) {
      throw new BadGatewayException('华为 IAP 查询结果与通知交易不一致')
    }
  }

  private async findNotificationOrder(verified: VerifiedHuaweiPurchase) {
    const orderNo = this.purchaseOrderNo(verified)
    return this.prisma.harmonyIapOrder.findFirst({
      where: {
        OR: [
          { purchaseToken: verified.purchaseToken },
          { providerOrderId: verified.providerOrderId },
          ...(orderNo ? [{ orderNo }] : []),
        ],
      },
    })
  }

  private purchaseOrderNo(verified: VerifiedHuaweiPurchase): string {
    if (verified.applicationUserName) return verified.applicationUserName
    if (!verified.developerPayload) return ''
    try {
      const payload = JSON.parse(verified.developerPayload) as { orderNo?: unknown }
      return typeof payload.orderNo === 'string' ? payload.orderNo : ''
    } catch {
      return ''
    }
  }

  private async syncAuthoritativeSubscription(
    order: {
      id: string
      orderNo: string
      merchantId: string
      planId: string
      amount: Prisma.Decimal | number
      providerOrderId: string | null
    },
    verified: VerifiedHuaweiSubscriptionStatus,
    purchaseData: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const plan = await tx.memberPlan.findUnique({ where: { id: order.planId } })
      if (!plan || plan.huaweiProductId !== verified.productId) {
        throw new BizException(BizCode.PAY_FAILED, '华为订阅商品与会员套餐不一致')
      }
      const membership = await tx.merchantMembership.findFirst({
        where: { merchantId: order.merchantId, planId: order.planId },
        orderBy: { endAt: 'desc' },
      })
      if (membership) {
        await tx.merchantMembership.update({
          where: { id: membership.id },
          data: {
            status: 'active',
            autoRenew: verified.autoRenew,
            provider: 'huawei_iap',
            providerSubscriptionId: verified.purchaseToken,
            ...(verified.expirationTime && verified.expirationTime > Date.now()
              ? { endAt: new Date(verified.expirationTime) }
              : {}),
          },
        })
      }
      await tx.harmonyIapOrder.update({
        where: { id: order.id },
        data: {
          status: 'activated',
          purchaseToken: verified.purchaseToken,
          purchaseData: this.toJsonValue(purchaseData),
        },
      })

      if (order.providerOrderId && order.providerOrderId !== verified.providerOrderId) {
        const renewal = await tx.paymentRecord.findUnique({
          where: { providerOrderId: verified.providerOrderId },
        })
        if (!renewal) {
          await tx.paymentRecord.create({
            data: {
              no: `HMR${createHash('sha256').update(verified.providerOrderId).digest('hex').slice(0, 24)}`,
              merchantId: order.merchantId,
              planId: plan.id,
              planName: plan.name,
              planType: plan.type,
              amount: order.amount,
              paymentMethod: 'huawei_iap',
              status: 'paid',
              paidAt: new Date(),
              providerOrderId: verified.providerOrderId,
            },
          })
        }
      }
    })
  }

  private async expireAuthoritativeSubscription(
    order: { id: string; orderNo: string; merchantId: string; planId: string },
    verified: VerifiedHuaweiSubscriptionStatus,
    purchaseData: string,
  ) {
    const status = verified.refunded ? 'refunded' : 'expired'
    await this.prisma.$transaction([
      this.prisma.harmonyIapOrder.update({
        where: { id: order.id },
        data: {
          status,
          purchaseData: this.toJsonValue(purchaseData),
          ...(verified.refunded ? { refundedAt: new Date() } : {}),
        },
      }),
      ...(verified.refunded
        ? [
            this.prisma.paymentRecord.updateMany({
              where: {
                OR: [
                  { no: order.orderNo },
                  { providerOrderId: verified.providerOrderId },
                ],
              },
              data: { status: 'refunded' },
            }),
          ]
        : []),
      this.prisma.merchantMembership.updateMany({
        where: { merchantId: order.merchantId, planId: order.planId },
        data: { status: 'expired', autoRenew: false },
      }),
    ])
  }

  private async refundAuthoritativeOrder(
    order: { id: string; orderNo: string; merchantId: string; planId: string },
    providerOrderId: string,
    purchaseData: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.harmonyIapOrder.update({
        where: { id: order.id },
        data: {
          status: 'refunded',
          refundedAt: new Date(),
          purchaseData: this.toJsonValue(purchaseData),
        },
      }),
      this.prisma.paymentRecord.updateMany({
        where: { OR: [{ no: order.orderNo }, { providerOrderId }] },
        data: { status: 'refunded' },
      }),
    ])
  }

  private async claimNotification(
    requestId: string,
    notificationType: string,
    notificationSubtype: string,
    environment: string,
    purchaseToken: string,
    providerOrderId: string,
    payload: JsonObject,
  ): Promise<boolean> {
    try {
      await this.prisma.harmonyIapNotification.create({
        data: {
          requestId,
          notificationType,
          notificationSubtype: notificationSubtype || null,
          environment,
          purchaseToken,
          providerOrderId,
          status: 'processing',
          payload: payload as Prisma.InputJsonValue,
        },
      })
      return true
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error
      }
      const existing = await this.prisma.harmonyIapNotification.findUnique({
        where: { requestId },
      })
      if (existing?.status === 'processed') return false
      const staleBefore = new Date(Date.now() - 10 * 60_000)
      const reclaimed = await this.prisma.harmonyIapNotification.updateMany({
        where: { requestId, status: 'processing', updatedAt: { lt: staleBefore } },
        data: {
          notificationType,
          notificationSubtype: notificationSubtype || null,
          environment,
          purchaseToken,
          providerOrderId,
          payload: payload as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      })
      if (reclaimed.count > 0) return true
      throw new ServiceUnavailableException('同一华为 IAP 通知正在处理中')
    }
  }

  private async completeNotification(requestId: string, orderId: string) {
    await this.prisma.harmonyIapNotification.update({
      where: { requestId },
      data: { status: 'processed', orderId, processedAt: new Date() },
    })
  }

  private async releaseNotification(requestId: string) {
    try {
      await this.prisma.harmonyIapNotification.deleteMany({
        where: { requestId, status: 'processing' },
      })
    } catch {
      // The provider will retry a non-2xx response. A stale processing claim is
      // also reclaimable after ten minutes, so cleanup failure cannot turn a
      // transient outage into a permanently acknowledged notification.
    }
  }

  private asObject(value: unknown): JsonObject | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as JsonObject)
      : null
  }

  private findString(source: unknown, key: string): string {
    if (!source || typeof source !== 'object') return ''
    if (Array.isArray(source)) {
      for (const item of source) {
        const value = this.findString(item, key)
        if (value) return value
      }
      return ''
    }
    const record = source as JsonObject
    if (typeof record[key] === 'string') return String(record[key])
    for (const value of Object.values(record)) {
      const found = this.findString(value, key)
      if (found) return found
    }
    return ''
  }

  private findNumber(source: unknown, key: string): number {
    if (!source || typeof source !== 'object') return 0
    if (Array.isArray(source)) {
      for (const item of source) {
        const value = this.findNumber(item, key)
        if (value > 0) return value
      }
      return 0
    }
    const record = source as JsonObject
    const direct = Number(record[key] || 0)
    if (Number.isFinite(direct) && direct > 0) return direct
    for (const value of Object.values(record)) {
      const found = this.findNumber(value, key)
      if (found > 0) return found
    }
    return 0
  }

  private toJsonValue(raw: string): Prisma.InputJsonValue {
    try {
      return JSON.parse(raw) as Prisma.InputJsonValue
    } catch {
      return { compactJws: raw }
    }
  }
}
