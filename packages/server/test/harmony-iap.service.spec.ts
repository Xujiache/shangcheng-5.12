import { describe, expect, it, jest } from '@jest/globals'
import { Prisma } from '@prisma/client'

jest.mock('nanoid', () => ({
  nanoid: () => 'IAPFIXED01',
  customAlphabet: () => () => 'IAPFIXED01',
}))

import { BizCode, BizException } from '../src/common/exceptions/biz.exception'
import { HarmonyIapService } from '../src/modules/harmony-merchant/harmony-iap.service'

const activePlan = {
  id: 'plan-1',
  code: 'member-monthly',
  name: '月度会员',
  type: 'basic',
  price: 99,
  period: 'monthly',
  periodCount: 1,
  status: 'active',
  huaweiProductId: 'member.monthly',
  huaweiProductType: 'subscription',
  constraints: {},
}

const preparedOrder = {
  id: 'iap-1',
  orderNo: 'HMI-1',
  merchantId: 'merchant-1',
  userId: 'user-1',
  planId: 'plan-1',
  productId: 'member.monthly',
  productType: 'subscription',
  amount: 99,
  status: 'prepared',
  purchaseToken: null,
  providerOrderId: null,
}

const verifiedPurchase = {
  productId: 'member.monthly',
  purchaseToken: 'purchase-token-1',
  providerOrderId: 'provider-order-1',
  applicationUserName: 'HMI-1',
  developerPayload: JSON.stringify({ orderNo: 'HMI-1' }),
  expirationTime: Date.now() + 30 * 86400000,
}

const notificationInbox = () => ({
  create: jest.fn(async () => ({})),
  update: jest.fn(async () => ({})),
  deleteMany: jest.fn(async () => ({ count: 0 })),
  findUnique: jest.fn(),
  updateMany: jest.fn(async () => ({ count: 0 })),
})

describe('HarmonyIapService', () => {
  it('does not prepare an order without server credentials even when a product is mapped', async () => {
    const prisma = { memberPlan: { findUnique: jest.fn(async () => activePlan) }, harmonyIapOrder: { create: jest.fn() } } as any
    const service = new HarmonyIapService(prisma, {} as any, { isConfigured: () => false } as any)
    await expect(service.prepare('merchant-1', 'user-1', 'plan-1')).rejects.toThrow('尚未完成商户及服务端配置')
    expect(prisma.harmonyIapOrder.create).not.toHaveBeenCalled()
  })
  it('creates only a server-scoped prepared order for a configured active merchant and plan', async () => {
    const prisma = {
      memberPlan: { findUnique: jest.fn(async () => activePlan) },
      merchant: { findUnique: jest.fn(async () => ({ id: 'merchant-1', status: 'active' })) },
      harmonyIapOrder: { create: jest.fn(async () => ({ id: 'iap-1' })) },
    } as any
    const service = new HarmonyIapService(prisma, {} as any, { isConfigured: () => true } as any)

    await expect(service.prepare('merchant-1', 'user-1', 'plan-1')).resolves.toMatchObject({
      productId: 'member.monthly',
      productType: 'subscription',
    })
    expect(prisma.harmonyIapOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        merchantId: 'merchant-1',
        userId: 'user-1',
        planId: 'plan-1',
        productId: 'member.monthly',
      }),
    })
    const payload = JSON.parse(
      (await service.prepare('merchant-1', 'user-1', 'plan-1')).developerPayload,
    )
    expect(payload.orderNo).toMatch(/^HMI/)
  })

  it('refuses to create an order when the AppGallery product mapping is absent', async () => {
    const prisma = {
      memberPlan: {
        findUnique: jest.fn(async () => ({ ...activePlan, huaweiProductId: null })),
      },
      merchant: { findUnique: jest.fn() },
      harmonyIapOrder: { create: jest.fn() },
    } as any
    const service = new HarmonyIapService(prisma, {} as any, {} as any)

    await expect(service.prepare('merchant-1', 'user-1', 'plan-1')).rejects.toMatchObject({
      response: { code: BizCode.BUSINESS_ERROR },
    })
    expect(prisma.merchant.findUnique).not.toHaveBeenCalled()
    expect(prisma.harmonyIapOrder.create).not.toHaveBeenCalled()
  })

  it('verifies, records and activates a subscription once in a single transaction', async () => {
    const tx = {
      harmonyIapOrder: {
        findUnique: jest.fn(async () => preparedOrder),
        update: jest.fn(async (_input: unknown) => ({})),
      },
      memberPlan: { findUnique: jest.fn(async () => activePlan) },
      paymentRecord: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({ id: 'payment-1' })),
      },
      merchantMembership: {
        findFirst: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 0 })),
        create: jest.fn(async () => ({ id: 'membership-1', status: 'active' })),
      },
    }
    const prisma = {
      harmonyIapOrder: { findFirst: jest.fn(async () => preparedOrder) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as any
    const jws = { verifyPurchaseData: jest.fn(() => verifiedPurchase) }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await expect(service.verify('merchant-1', 'user-1', 'HMI-1', 'signed-purchase')).resolves.toMatchObject({
      ok: true,
      alreadyActivated: false,
      purchaseToken: 'purchase-token-1',
      purchaseOrderId: 'provider-order-1',
    })
    expect(tx.paymentRecord.create).toHaveBeenCalledTimes(1)
    expect(tx.merchantMembership.create).toHaveBeenCalledTimes(1)
    expect(tx.harmonyIapOrder.update).toHaveBeenLastCalledWith({
      where: { id: 'iap-1' },
      data: expect.objectContaining({ status: 'activated' }),
    })
  })

  it('returns an already activated order without verifying or granting a second entitlement', async () => {
    const prisma = {
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({
          ...preparedOrder,
          status: 'activated',
          purchaseToken: 'token-1',
          providerOrderId: 'provider-1',
        })),
      },
      merchantMembership: { findFirst: jest.fn(async () => ({ id: 'membership-1' })) },
      $transaction: jest.fn(),
    } as any
    const jws = { verifyPurchaseData: jest.fn() }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await expect(service.verify('merchant-1', 'user-1', 'HMI-1', 'replayed')).resolves.toMatchObject({
      ok: true,
      alreadyActivated: true,
      purchaseToken: 'token-1',
    })
    expect(jws.verifyPurchaseData).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects a signed purchase for a different product before opening a transaction', async () => {
    const prisma = {
      harmonyIapOrder: { findFirst: jest.fn(async () => preparedOrder) },
      $transaction: jest.fn(),
    } as any
    const jws = {
      verifyPurchaseData: jest.fn(() => ({
        ...verifiedPurchase,
        productId: 'member.yearly',
      })),
    }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await expect(service.verify('merchant-1', 'user-1', 'HMI-1', 'signed')).rejects.toBeInstanceOf(
      BizException,
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('does not revoke paid time when the user only cancels automatic renewal', async () => {
    const expiration = Date.now() + 15 * 86400000
    const updateOrder = jest.fn(async (_input: unknown) => ({}))
    const updateMembership = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const updatePayment = jest.fn()
    const prisma = {
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({ ...preparedOrder, status: 'activated' })),
        update: updateOrder,
      },
      merchantMembership: { updateMany: updateMembership },
      paymentRecord: { updateMany: updatePayment },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any
    const jws = {
      verifyCompactJws: jest.fn(() => ({
        notificationType: 'CANCEL_SUBSCRIPTION',
        purchaseToken: 'purchase-token-1',
        purchaseOrderId: 'provider-order-1',
        expirationTime: expiration,
      })),
    }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await expect(service.handleNotification({ signedPayload: 'signed' })).resolves.toEqual({ result: 0 })
    expect(updateMembership).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1', planId: 'plan-1' },
      data: { autoRenew: false },
    })
    expect(updatePayment).not.toHaveBeenCalled()
  })

  it('revokes entitlement and marks the ledger refunded for a verified refund notification', async () => {
    const updateOrder = jest.fn(async (_input: unknown) => ({}))
    const updateMembership = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const updatePayment = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const prisma = {
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({ ...preparedOrder, status: 'activated' })),
        update: updateOrder,
      },
      merchantMembership: { updateMany: updateMembership },
      paymentRecord: { updateMany: updatePayment },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any
    const jws = {
      verifyCompactJws: jest.fn(() => ({
        notificationType: 'REFUND',
        purchaseToken: 'purchase-token-1',
      })),
    }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await service.handleNotification({ signedPayload: 'signed' })
    expect(updatePayment).toHaveBeenCalledWith({
      where: { no: 'HMI-1' },
      data: { status: 'refunded' },
    })
    expect(updateMembership).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1', planId: 'plan-1' },
      data: { status: 'expired', autoRenew: false },
    })
  })

  it('extends and reactivates the entitlement for a verified renewal notification', async () => {
    const expiration = Date.now() + 31 * 86400000
    const updateOrder = jest.fn(async (_input: unknown) => ({}))
    const updateMembership = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const prisma = {
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({ ...preparedOrder, status: 'cancelled' })),
        update: updateOrder,
      },
      merchantMembership: { updateMany: updateMembership },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any
    const jws = {
      verifyCompactJws: jest.fn(() => ({
        data: {
          notificationType: 'SUBSCRIPTION_RENEWED',
          purchaseToken: 'purchase-token-1',
          expirationTime: expiration,
        },
      })),
    }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await expect(service.handleNotification({ signedPayload: 'signed' })).resolves.toEqual({ result: 0 })
    expect(updateOrder).toHaveBeenCalledWith({
      where: { id: 'iap-1' },
      data: { status: 'activated', purchaseData: expect.any(Object) },
    })
    expect(updateMembership).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1', planId: 'plan-1' },
      data: { status: 'active', autoRenew: true, endAt: new Date(expiration) },
    })
  })

  it('expires entitlement without rewriting a successful payment as failed or refunded', async () => {
    const updateOrder = jest.fn(async (_input: unknown) => ({}))
    const updateMembership = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const updatePayment = jest.fn()
    const prisma = {
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({ ...preparedOrder, status: 'activated' })),
        update: updateOrder,
      },
      merchantMembership: { updateMany: updateMembership },
      paymentRecord: { updateMany: updatePayment },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any
    const jws = {
      verifyCompactJws: jest.fn(() => ({
        notification: {
          status: 'SUBSCRIPTION_EXPIRED',
          purchaseOrderId: 'provider-order-1',
        },
      })),
    }
    const service = new HarmonyIapService(prisma, jws as any, {} as any)

    await expect(service.handleNotification({ signedPayload: 'signed' })).resolves.toEqual({ result: 0 })
    expect(updateOrder).toHaveBeenCalledWith({
      where: { id: 'iap-1' },
      data: { status: 'expired', purchaseData: expect.any(Object) },
    })
    expect(updateMembership).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1', planId: 'plan-1' },
      data: { status: 'expired', autoRenew: false },
    })
    expect(updatePayment).not.toHaveBeenCalled()
  })

  it('handles a v3 callback only after querying and verifying Huawei authoritative status', async () => {
    process.env.HUAWEI_IAP_APPLICATION_ID = 'app-1'
    const updateOrder = jest.fn(async (_input: unknown) => ({}))
    const updateMembership = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const updatePayment = jest.fn(async (_input: unknown) => ({ count: 1 }))
    const prisma = {
      harmonyIapNotification: notificationInbox(),
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({
          ...preparedOrder,
          status: 'activated',
          purchaseToken: 'purchase-token-1',
          providerOrderId: 'provider-order-1',
        })),
        update: updateOrder,
      },
      merchantMembership: { updateMany: updateMembership },
      paymentRecord: { updateMany: updatePayment },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any
    const jws = {
      verifySubscriptionStatus: jest.fn((_input: string) => ({
        ...verifiedPurchase,
        active: false,
        autoRenew: false,
        refunded: true,
        status: '2',
      })),
    }
    const iapServer = {
      isConfigured: jest.fn(() => true),
      querySubscriptionStatus: jest.fn(async (_token: string, _orderId: string) => ({
        jwsSubGroupStatus: 'signed-status',
      })),
    }
    const service = new HarmonyIapService(prisma, jws as any, iapServer as any)

    try {
      await expect(
        service.handleNotification({
          notificationType: 'DID_REVOKE_ENTITLEMENT',
          notificationRequestId: 'notification-request-1',
          notificationVersion: 'v3',
          signedTime: Date.now(),
          notificationMetaData: {
            environment: 'NORMAL',
            applicationId: 'app-1',
            packageName: 'top.ewsn.jingwei.merchant',
            type: 2,
            purchaseToken: 'purchase-token-1',
            purchaseOrderId: 'provider-order-1',
          },
        }),
      ).resolves.toEqual({ result: 0 })
      expect(iapServer.querySubscriptionStatus).toHaveBeenCalledWith(
        'purchase-token-1',
        'provider-order-1',
      )
      expect(jws.verifySubscriptionStatus).toHaveBeenCalledWith('signed-status')
      expect(updatePayment).toHaveBeenCalledWith({
        where: { OR: [{ no: 'HMI-1' }, { providerOrderId: 'provider-order-1' }] },
        data: { status: 'refunded' },
      })
      expect(updateMembership).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1', planId: 'plan-1' },
        data: { status: 'expired', autoRenew: false },
      })
    } finally {
      delete process.env.HUAWEI_IAP_APPLICATION_ID
    }
  })

  it('does not trust a forged v3 refund event when signed Huawei status remains active', async () => {
    process.env.HUAWEI_IAP_APPLICATION_ID = 'app-1'
    const membershipUpdate = jest.fn(async (_input: unknown) => ({}))
    const paymentRefund = jest.fn()
    const tx = {
      memberPlan: { findUnique: jest.fn(async () => activePlan) },
      merchantMembership: {
        findFirst: jest.fn(async () => ({ id: 'membership-1', endAt: new Date() })),
        update: membershipUpdate,
      },
      harmonyIapOrder: { update: jest.fn(async () => ({})) },
      paymentRecord: { findUnique: jest.fn(), create: jest.fn() },
    }
    const prisma = {
      harmonyIapNotification: notificationInbox(),
      harmonyIapOrder: {
        findFirst: jest.fn(async () => ({
          ...preparedOrder,
          status: 'activated',
          purchaseToken: 'purchase-token-1',
          providerOrderId: 'provider-order-1',
        })),
      },
      paymentRecord: { updateMany: paymentRefund },
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as any
    const jws = {
      verifySubscriptionStatus: jest.fn(() => ({
        ...verifiedPurchase,
        active: true,
        autoRenew: true,
        refunded: false,
        status: '1',
      })),
    }
    const iapServer = {
      isConfigured: jest.fn(() => true),
      querySubscriptionStatus: jest.fn(async () => ({ jwsSubGroupStatus: 'signed-active' })),
    }
    const service = new HarmonyIapService(prisma, jws as any, iapServer as any)

    try {
      await service.handleNotification({
        notificationType: 'REFUND',
        notificationRequestId: 'notification-request-2',
        notificationVersion: 'v3',
        signedTime: Date.now(),
        notificationMetaData: {
          environment: 'NORMAL',
          applicationId: 'app-1',
          packageName: 'top.ewsn.jingwei.merchant',
          type: 2,
          purchaseToken: 'purchase-token-1',
          purchaseOrderId: 'provider-order-1',
        },
      })
      expect(membershipUpdate).toHaveBeenCalledWith({
        where: { id: 'membership-1' },
        data: expect.objectContaining({ status: 'active', autoRenew: true }),
      })
      expect(paymentRefund).not.toHaveBeenCalled()
    } finally {
      delete process.env.HUAWEI_IAP_APPLICATION_ID
    }
  })

  it('acknowledges an already processed v3 request without querying or granting again', async () => {
    process.env.HUAWEI_IAP_APPLICATION_ID = 'app-1'
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate request', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['requestId'] },
    })
    const inbox = notificationInbox()
    inbox.create.mockRejectedValueOnce(duplicate as never)
    inbox.findUnique.mockResolvedValueOnce({ status: 'processed' } as never)
    const prisma = {
      harmonyIapNotification: inbox,
      harmonyIapOrder: { findFirst: jest.fn() },
    } as any
    const iapServer = {
      isConfigured: jest.fn(() => true),
      querySubscriptionStatus: jest.fn(),
    }
    const service = new HarmonyIapService(prisma, {} as any, iapServer as any)

    try {
      await expect(
        service.handleNotification({
          notificationType: 'DID_RENEW',
          notificationRequestId: 'processed-request',
          notificationVersion: 'v3',
          signedTime: Date.now(),
          notificationMetaData: {
            environment: 'NORMAL',
            applicationId: 'app-1',
            packageName: 'top.ewsn.jingwei.merchant',
            type: 2,
            purchaseToken: 'purchase-token-replayed',
            purchaseOrderId: 'provider-order-replayed',
          },
        }),
      ).resolves.toEqual({ result: 0 })
      expect(iapServer.querySubscriptionStatus).not.toHaveBeenCalled()
      expect(prisma.harmonyIapOrder.findFirst).not.toHaveBeenCalled()
    } finally {
      delete process.env.HUAWEI_IAP_APPLICATION_ID
    }
  })

  it('accepts Huawei TEST reachability notifications without touching orders or entitlements', async () => {
    const prisma = { harmonyIapOrder: { findFirst: jest.fn() } } as any
    const iapServer = { isConfigured: jest.fn(), querySubscriptionStatus: jest.fn() }
    const service = new HarmonyIapService(prisma, {} as any, iapServer as any)

    await expect(
      service.handleNotification({
        notificationType: 'TEST',
        notificationRequestId: 'test-notification',
        notificationVersion: 'v3',
        signedTime: Date.now(),
        notificationMetaData: {
          environment: 'NORMAL',
          applicationId: 'test-app',
          packageName: 'testPackageName',
          type: 0,
          purchaseToken: 'testPurchaseToken',
          purchaseOrderId: 'testPurchaseOrderId',
        },
      }),
    ).resolves.toEqual({ result: 0 })
    expect(prisma.harmonyIapOrder.findFirst).not.toHaveBeenCalled()
    expect(iapServer.querySubscriptionStatus).not.toHaveBeenCalled()
  })
})
