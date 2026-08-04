import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// nanoid@5 纯 ESM，ts-jest(CJS) 无法直接 require —— 与其它 ledger 测试一致的轻量替身。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
    return out
  },
}))

import { LedgerPayService } from '../src/modules/ledger/ledger-pay.service'

const DAY_MS = 86_400_000
function approxMs(actual: number, expected: number, toleranceMs = 5000) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceMs)
}

function buildPrisma() {
  const prisma: any = {
    ledgerConfig: { findUnique: jest.fn(async () => null as any) },
    ledgerUser: { findUnique: jest.fn(async () => null as any) },
    ledgerPaymentOrder: {
      create: jest.fn(async (args: any) => ({ id: 'o1', ...args.data })),
      findUnique: jest.fn(async () => null as any),
      update: jest.fn(async () => ({}) as any),
      updateMany: jest.fn(async () => ({ count: 1 }) as any),
    },
    ledgerMembership: {
      findUnique: jest.fn(async () => null as any),
      create: jest.fn(async () => ({ id: 'm1', expiresAt: null }) as any),
      update: jest.fn(async () => ({}) as any),
    },
    ledgerMembershipLog: { create: jest.fn(async () => ({}) as any) },
    ledgerNotification: { create: jest.fn(async () => ({}) as any) },
  }
  // $transaction：把同一份 mock 当 tx 传入回调
  prisma.$transaction = jest.fn(async (cb: any) => cb(prisma))
  return prisma
}

function buildWxpay(ready = true) {
  return {
    isReady: jest.fn(() => ready),
    createMiniPay: jest.fn(async () => ({
      appId: 'wxLEDGER',
      timeStamp: '1',
      nonceStr: 'n',
      package: 'prepay_id=x',
      signType: 'RSA',
      paySign: 'sig',
    })),
  }
}

describe('LedgerPayService.createMembershipOrder', () => {
  let prisma: any
  let wxpay: any
  let auth: any
  let service: LedgerPayService
  const ENV0 = { ...process.env }

  beforeEach(() => {
    process.env.LEDGER_WX_APPID = 'wxLEDGER'
    process.env.LEDGER_PAY_NOTIFY_URL = 'https://ewsn.top/api/v1/l/pay/notify'
    prisma = buildPrisma()
    wxpay = buildWxpay(true)
    auth = { codeToOpenid: jest.fn(async () => 'openid-from-code') }
    service = new LedgerPayService(prisma, wxpay as any, auth as any)
  })
  afterEach(() => {
    process.env = { ...ENV0 }
  })

  it('用例1：微信支付未就绪 → 抛错，绝不下单', async () => {
    wxpay.isReady.mockReturnValue(false)
    await expect(service.createMembershipOrder('u1', 'month')).rejects.toBeTruthy()
    expect(prisma.ledgerPaymentOrder.create).not.toHaveBeenCalled()
    expect(wxpay.createMiniPay).not.toHaveBeenCalled()
  })

  it('用例2：金额服务端权威锁定 —— 月卡"¥29"→2900 分，days=30 写库', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1', wxOpenid: 'op-bound' } as any)
    const r = await service.createMembershipOrder('u1', 'month')

    const orderArg = prisma.ledgerPaymentOrder.create.mock.calls[0][0] as any
    expect(orderArg.data.amountFen).toBe(2900)
    expect(orderArg.data.days).toBe(30)
    expect(orderArg.data.planKey).toBe('month')

    // 下单金额/appid/回调地址传给微信
    const payArg = wxpay.createMiniPay.mock.calls[0][0] as any
    expect(payArg.totalFen).toBe(2900)
    expect(payArg.appid).toBe('wxLEDGER')
    expect(payArg.notifyUrl).toBe('https://ewsn.top/api/v1/l/pay/notify')
    expect(payArg.openid).toBe('op-bound') // 已绑定优先用 wxOpenid
    expect(payArg.attach).toMatch(/^lmember:/)
    expect(r.signType).toBe('RSA')
  })

  it('用例3：未绑定微信且无 code → 1001；带 code → 用 codeToOpenid 兑换', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValue({ id: 'u1', wxOpenid: null } as any)

    await service.createMembershipOrder('u1', 'month', undefined).then(
      () => {
        throw new Error('should throw')
      },
      (e: any) => expect(e.getResponse().code).toBe(1001),
    )

    await service.createMembershipOrder('u1', 'month', 'js-code')
    expect(auth.codeToOpenid).toHaveBeenCalledWith('js-code')
    const payArg = wxpay.createMiniPay.mock.calls[0][0] as any
    expect(payArg.openid).toBe('openid-from-code')
  })

  it('用例4：套餐不存在 → 抛错，不下单', async () => {
    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1', wxOpenid: 'op' } as any)
    await expect(service.createMembershipOrder('u1', 'no-such-plan')).rejects.toBeTruthy()
    expect(prisma.ledgerPaymentOrder.create).not.toHaveBeenCalled()
  })
})

describe('LedgerPayService.handleNotify', () => {
  let prisma: any
  let service: LedgerPayService

  beforeEach(() => {
    prisma = buildPrisma()
    service = new LedgerPayService(prisma, buildWxpay() as any, { codeToOpenid: jest.fn() } as any)
  })

  const pendingOrder = (over: any = {}) => ({
    id: 'o1',
    outTradeNo: 'LMEM-X',
    userId: 'u1',
    planKey: 'month',
    days: 30,
    amountFen: 2900,
    status: 'pending',
    grantedAt: null,
    ...over,
  })

  it('用例5：订单不存在 → 返回 false（让微信重试）', async () => {
    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(null)
    const ok = await service.handleNotify('LMEM-X', 'tx', 2900)
    expect(ok).toBe(false)
    expect(prisma.ledgerMembership.update).not.toHaveBeenCalled()
  })

  it('用例6：已 paid → 幂等返回 true，不重复发放', async () => {
    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder({ status: 'paid' }))
    const ok = await service.handleNotify('LMEM-X', 'tx', 2900)
    expect(ok).toBe(true)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.ledgerMembership.update).not.toHaveBeenCalled()
  })

  it('用例7：金额不一致 → 标记 failed、不发放、ACK', async () => {
    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder())
    const ok = await service.handleNotify('LMEM-X', 'tx', 100) // 付了 1 元想换 29 元的卡
    expect(ok).toBe(true)
    const updArg = prisma.ledgerPaymentOrder.update.mock.calls[0][0] as any
    expect(updArg.data.status).toBe('failed')
    expect(prisma.ledgerMembership.update).not.toHaveBeenCalled()
  })

  it('用例8：成功 → 开通会员（≈now+30d）+ 写日志 + 标记 grantedAt', async () => {
    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder())
    prisma.ledgerMembership.findUnique.mockResolvedValueOnce(null) // 无会员行 → 自动建
    prisma.ledgerMembership.create.mockResolvedValueOnce({ id: 'm-new', expiresAt: null })

    const now = Date.now()
    const ok = await service.handleNotify('LMEM-X', 'tx-success', 2900)
    expect(ok).toBe(true)

    // 行级幂等领取
    const claim = prisma.ledgerPaymentOrder.updateMany.mock.calls[0][0] as any
    expect(claim.where.status).toBe('pending')
    expect(claim.data.status).toBe('paid')

    // 开通到期 ≈ now+30d
    const memUpd = prisma.ledgerMembership.update.mock.calls[0][0] as any
    approxMs(new Date(memUpd.data.expiresAt).getTime(), now + 30 * DAY_MS)
    expect(memUpd.data.lastPlanKey).toBe('month')

    // 日志 deltaDays=30 + 在线支付来源（operatorId=null）
    const logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0] as any
    expect(logArg.data.deltaDays).toBe(30)
    expect(logArg.data.operatorId).toBeNull()

    // grantedAt 幂等标记
    const grantUpd = prisma.ledgerPaymentOrder.update.mock.calls.find(
      (c: any) => c[0]?.data?.grantedAt,
    ) as any
    expect(grantUpd).toBeTruthy()
  })

  it('用例9：并发重复回调 —— updateMany 领取失败(count=0) → 不发放', async () => {
    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder())
    prisma.ledgerPaymentOrder.updateMany.mockResolvedValueOnce({ count: 0 })
    const ok = await service.handleNotify('LMEM-X', 'tx', 2900)
    expect(ok).toBe(true)
    expect(prisma.ledgerMembership.update).not.toHaveBeenCalled()
  })
})
