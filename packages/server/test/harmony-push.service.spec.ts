import { HarmonyPushService } from '../src/modules/harmony-merchant/harmony-push.service'

describe('HarmonyPushService', () => {
  it('upserts the current device inside the authenticated merchant scope', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'device-1',
      locale: 'zh-CN',
      enabled: true,
      lastSeenAt: new Date(),
    })
    const prisma = { harmonyPushDevice: { upsert } } as any
    const service = new HarmonyPushService(prisma)
    await service.register('user-1', 'merchant-1', {
      token: 'a-valid-push-token-value',
      deviceId: 'phone-1',
      locale: 'zh-CN',
    })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'a-valid-push-token-value' },
        create: expect.objectContaining({ userId: 'user-1', merchantId: 'merchant-1' }),
      }),
    )
  })

  it('merges partial preferences without resetting other switches', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ merchantId: 'merchant-1', orders: true, refunds: false, chat: true })
    const upsert = jest
      .fn()
      .mockResolvedValue({ merchantId: 'merchant-1', orders: false, refunds: false, chat: true })
    const prisma = { harmonyPushPreference: { findUnique, upsert } } as any
    const service = new HarmonyPushService(prisma)
    await expect(service.setPreferences('merchant-1', { orders: false })).resolves.toEqual({
      orders: false,
      refunds: false,
      chat: true,
    })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { orders: false, refunds: false, chat: true },
      }),
    )
  })

  it('does not query devices when the merchant disabled the matching topic', async () => {
    const findMany = jest.fn()
    const prisma = {
      harmonyPushPreference: {
        findUnique: jest.fn().mockResolvedValue({ orders: false, refunds: true, chat: true }),
      },
      harmonyPushDevice: { findMany },
    } as any
    const service = new HarmonyPushService(prisma)

    await expect(
      service.sendToMerchant('merchant-1', {
        topic: 'orders',
        title: '新订单',
        body: '订单已付款',
      }),
    ).resolves.toEqual({ sent: 0, skipped: true, reason: 'preference-disabled' })
    expect(findMany).not.toHaveBeenCalled()
  })

  it('deduplicates device tokens and uses the Push Kit test batch limit', async () => {
    const oldTestMessage = process.env.HUAWEI_PUSH_TEST_MESSAGE
    process.env.HUAWEI_PUSH_TEST_MESSAGE = '1'
    const tokens = Array.from({ length: 13 }, (_, index) => ({ token: `token-${index}` }))
    tokens.push({ token: 'token-0' })
    const prisma = {
      harmonyPushPreference: { findUnique: jest.fn().mockResolvedValue(null) },
      harmonyPushDevice: { findMany: jest.fn().mockResolvedValue(tokens) },
    } as any
    const service = new HarmonyPushService(prisma)
    jest.spyOn(service as any, 'getCredentials').mockReturnValue({
      projectId: 'project',
      keyId: 'key',
      subAccount: 'account',
      privateKey: 'private-key',
    })
    const sendBatch = jest.spyOn(service as any, 'sendBatch').mockResolvedValue(true)

    try {
      await expect(
        service.sendToMerchant('merchant-1', {
          topic: 'chat',
          title: '客户消息',
          body: '客户咨询了尺寸',
        }),
      ).resolves.toEqual({ sent: 13, skipped: false })
      expect(sendBatch).toHaveBeenCalledTimes(2)
      expect(sendBatch.mock.calls[0][1]).toHaveLength(10)
      expect(sendBatch.mock.calls[1][1]).toHaveLength(3)
    } finally {
      if (oldTestMessage === undefined) delete process.env.HUAWEI_PUSH_TEST_MESSAGE
      else process.env.HUAWEI_PUSH_TEST_MESSAGE = oldTestMessage
    }
  })

  it('fails open when cloud credentials are absent', async () => {
    const prisma = {
      harmonyPushPreference: { findUnique: jest.fn().mockResolvedValue(null) },
      harmonyPushDevice: { findMany: jest.fn().mockResolvedValue([{ token: 'token-1' }]) },
    } as any
    const service = new HarmonyPushService(prisma)
    jest.spyOn(service as any, 'getCredentials').mockReturnValue(null)

    await expect(
      service.sendToMerchant('merchant-1', {
        topic: 'refunds',
        title: '售后申请',
        body: '有一笔售后待处理',
      }),
    ).resolves.toEqual({ sent: 0, skipped: true, reason: 'not-configured' })
  })

  it('uses the provider message id as the client click-event dedupe id', () => {
    const service = new HarmonyPushService({} as any)
    const notification = (service as any).buildNotification({
      topic: 'orders',
      title: '新订单',
      body: '订单 ORD-1 已付款',
      data: { route: 'order-detail', id: 'order-1', status: 'paid' },
      appMessageId: 'order-paid-order-1',
    })

    expect(notification.appMessageId).toBe('order-paid-order-1')
    expect(notification.clickAction.data).toEqual({
      route: 'order-detail',
      id: 'order-1',
      status: 'paid',
      eventId: 'order-paid-order-1',
    })
  })
})
