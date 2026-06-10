import { describe, it, expect, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 默认不转换 node_modules。导入 PaymentController 会经
// merchant.service → id.util 拉入 nanoid 的 customAlphabet，抛 "Cannot use import statement
// outside a module"。这里用工厂 mock 替换为等价随机生成器（本测试不依赖其产物）。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let s = ''
    for (let i = 0; i < size; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return s
  },
}))

import { PaymentController } from '../src/modules/payment/payment.controller'

// ----------------------------------------------------------------------------
// PaymentController.wechatNotify — 微信支付回调入口
//
// 实现位置：packages/server/src/modules/payment/payment.controller.ts
//
// 这里测的是"微信重试契约"：handler 返回顶层 {code:'SUCCESS'|'FAIL'}。
//   - SUCCESS  → 微信停止重试（已正确处理 / 幂等命中 / 非成功事件直接 ACK）
//   - FAIL     → 微信按梯度重试（验签失败 / 解密失败 / 找不到业务记录 / 抛异常）
// 关键保护：验签 → 解密 → 会员/订单分流 → 幂等 → 事务入账 → 推送（绝不阻塞 ACK）。
// ----------------------------------------------------------------------------

/** 构造一个带默认 happy-path mock 的 controller + 句柄，便于各用例覆写 */
function setup() {
  const wxpay = {
    verifyNotify: jest.fn(async (..._args: any[]) => true),
    decryptResource: jest.fn((..._args: any[]) => ({
      out_trade_no: 'ORD-1',
      trade_state: 'SUCCESS',
      transaction_id: 'TX-1',
      attach: '',
    })),
  }
  const merchantService = {
    activateMembership: jest.fn(async (..._args: any[]) => undefined),
  }
  const chat = {
    emitOrderUpdate: jest.fn((..._args: any[]) => undefined),
  }
  const txMock = {
    order: { updateMany: jest.fn(async (..._args: any[]) => ({ count: 1 })) },
    payment: { create: jest.fn(async (..._args: any[]) => ({ id: 'pay-1' })) },
  }
  const prisma = {
    paymentRecord: { findUnique: jest.fn(async (..._args: any[]) => null) },
    payment: {
      findFirst: jest.fn(async (..._args: any[]) => null),
      create: jest.fn(async (..._args: any[]) => ({ id: 'pay-1' })),
    },
    order: { findFirst: jest.fn(async (..._args: any[]) => null) },
    $transaction: jest.fn(async (cb: any) => cb(txMock)),
  }

  const controller = new PaymentController(
    wxpay as any,
    prisma as any,
    merchantService as any,
    chat as any,
  )

  return { controller, wxpay, prisma, merchantService, chat, txMock }
}

/** 标准回调入参：headers + 加密 body + 带 rawBody 的 req */
function makeArgs(body: any = { resource: { ciphertext: 'x', nonce: 'n' } }) {
  const headers = { 'wechatpay-signature': 'sig' } as Record<string, string>
  const req = { rawBody: Buffer.from(JSON.stringify(body)) } as any
  return { headers, body, req }
}

describe('PaymentController.wechatNotify — 微信回调 ACK / 幂等契约', () => {
  describe('用例 1：验签失败', () => {
    it('verifyNotify 返回 false → {code:"FAIL"} 且完全不碰 prisma', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.verifyNotify.mockResolvedValueOnce(false as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('FAIL')
      expect(wxpay.decryptResource).not.toHaveBeenCalled()
      expect(prisma.paymentRecord.findUnique).not.toHaveBeenCalled()
      expect(prisma.payment.findFirst).not.toHaveBeenCalled()
      expect(prisma.order.findFirst).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('用例 2：非成功交易事件', () => {
    it('trade_state 为 REFUND（非 SUCCESS）→ {code:"SUCCESS"} ACK 且不落库', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.decryptResource.mockReturnValueOnce({
        out_trade_no: 'ORD-1',
        trade_state: 'REFUND',
        transaction_id: 'TX-1',
        attach: '',
      } as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('SUCCESS')
      expect(prisma.paymentRecord.findUnique).not.toHaveBeenCalled()
      expect(prisma.payment.findFirst).not.toHaveBeenCalled()
      expect(prisma.order.findFirst).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('用例 3：解密失败', () => {
    it('decryptResource 抛错 → {code:"FAIL"} 让微信重试', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.decryptResource.mockImplementationOnce(() => {
        throw new Error('bad ciphertext')
      })
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('FAIL')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('用例 4：会员订阅缴费回调', () => {
    function memDecrypt(attach = 'membership:rid-1') {
      return {
        out_trade_no: 'MEM123',
        trade_state: 'SUCCESS',
        transaction_id: 'TX-MEM',
        attach,
      }
    }

    it('PaymentRecord 为 pending → 调 activateMembership(record.id) 并 SUCCESS', async () => {
      const { controller, wxpay, prisma, merchantService } = setup()
      wxpay.decryptResource.mockReturnValueOnce(memDecrypt() as any)
      prisma.paymentRecord.findUnique.mockResolvedValueOnce({
        id: 'rid-1',
        no: 'MEM123',
        status: 'pending',
      } as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('SUCCESS')
      expect(merchantService.activateMembership).toHaveBeenCalledTimes(1)
      expect(merchantService.activateMembership).toHaveBeenCalledWith('rid-1')
    })

    it('PaymentRecord 已 paid → SUCCESS 且不再激活（幂等）', async () => {
      const { controller, wxpay, prisma, merchantService } = setup()
      wxpay.decryptResource.mockReturnValueOnce(memDecrypt() as any)
      prisma.paymentRecord.findUnique.mockResolvedValueOnce({
        id: 'rid-1',
        no: 'MEM123',
        status: 'paid',
      } as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('SUCCESS')
      expect(merchantService.activateMembership).not.toHaveBeenCalled()
    })

    it('attach 与 no 都查不到 PaymentRecord → {code:"FAIL"} 让微信重试', async () => {
      const { controller, wxpay, prisma, merchantService } = setup()
      wxpay.decryptResource.mockReturnValueOnce(memDecrypt() as any)
      // 两次 findUnique（按 attach id / 按 no）都返回 null
      prisma.paymentRecord.findUnique.mockResolvedValue(null as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('FAIL')
      expect(merchantService.activateMembership).not.toHaveBeenCalled()
    })
  })

  describe('用例 5：普通订单的幂等保护', () => {
    function orderDecrypt() {
      return {
        out_trade_no: 'ORD-1',
        trade_state: 'SUCCESS',
        transaction_id: 'TX-1',
        attach: '',
      }
    }

    it('按 wxTransactionId 命中 success → SUCCESS 且不开事务（幂等其一）', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.decryptResource.mockReturnValueOnce(orderDecrypt() as any)
      prisma.payment.findFirst.mockResolvedValueOnce({
        id: 'pay-old',
        status: 'success',
      } as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('SUCCESS')
      expect(prisma.$transaction).not.toHaveBeenCalled()
      // 命中后无需再查订单
      expect(prisma.order.findFirst).not.toHaveBeenCalled()
    })

    it('订单不存在 → {code:"FAIL"} 让微信重试', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.decryptResource.mockReturnValueOnce(orderDecrypt() as any)
      prisma.payment.findFirst.mockResolvedValueOnce(null as any) // 无 tx 重复
      prisma.order.findFirst.mockResolvedValueOnce(null as any) // 订单缺失
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('FAIL')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('按 orderId 命中 success → SUCCESS 且不入账（幂等其二）', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.decryptResource.mockReturnValueOnce(orderDecrypt() as any)
      // 第一次（按 wxTransactionId）未命中，第二次（按 orderId）命中
      prisma.payment.findFirst
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce({ id: 'pay-old', status: 'success' } as any)
      prisma.order.findFirst.mockResolvedValueOnce({
        id: 'order-1',
        no: 'ORD-1',
        payAmount: 100,
        merchantId: 'm-1',
      } as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('SUCCESS')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('用例 6：正常入账 happy path', () => {
    it('开一次事务 + 改订单状态 + 写 Payment + 推商家 → SUCCESS', async () => {
      const { controller, wxpay, prisma, chat, txMock } = setup()
      wxpay.decryptResource.mockReturnValueOnce({
        out_trade_no: 'ORD-1',
        trade_state: 'SUCCESS',
        transaction_id: 'TX-1',
        attach: '',
      } as any)
      prisma.payment.findFirst.mockResolvedValue(null as any) // 两次幂等查询都不命中
      prisma.order.findFirst.mockResolvedValueOnce({
        id: 'order-1',
        no: 'ORD-1',
        payAmount: 100,
        merchantId: 'm-1',
      } as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('SUCCESS')
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)

      // 订单状态机：仅当订单仍 pending_payment 才迁移到 pending_shipment
      const updateArg = txMock.order.updateMany.mock.calls[0][0] as any
      expect(updateArg.where).toMatchObject({ id: 'order-1', status: 'pending_payment' })
      expect(updateArg.data.status).toBe('pending_shipment')

      // 对账：金额取自订单 payAmount，记录微信交易号
      const createArg = txMock.payment.create.mock.calls[0][0] as any
      expect(createArg.data.amount).toBe(100)
      expect(createArg.data.wxTransactionId).toBe('TX-1')

      // 推送商家（fire-and-forget）
      expect(chat.emitOrderUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('用例 7：推送失败不阻塞 ACK', () => {
    it('emitOrderUpdate 抛错 → 仍返回 {code:"SUCCESS"}', async () => {
      const { controller, wxpay, prisma, chat } = setup()
      wxpay.decryptResource.mockReturnValueOnce({
        out_trade_no: 'ORD-1',
        trade_state: 'SUCCESS',
        transaction_id: 'TX-1',
        attach: '',
      } as any)
      prisma.payment.findFirst.mockResolvedValue(null as any)
      prisma.order.findFirst.mockResolvedValueOnce({
        id: 'order-1',
        no: 'ORD-1',
        payAmount: 100,
        merchantId: 'm-1',
      } as any)
      chat.emitOrderUpdate.mockImplementationOnce(() => {
        throw new Error('socket down')
      })
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      // 入账已成功，推送失败绝不能翻成 FAIL（否则微信重推污染对账）
      expect(res.code).toBe('SUCCESS')
    })
  })

  describe('用例 8：事务失败', () => {
    it('$transaction 抛错 → {code:"FAIL"} 且透传错误 message', async () => {
      const { controller, wxpay, prisma } = setup()
      wxpay.decryptResource.mockReturnValueOnce({
        out_trade_no: 'ORD-1',
        trade_state: 'SUCCESS',
        transaction_id: 'TX-1',
        attach: '',
      } as any)
      prisma.payment.findFirst.mockResolvedValue(null as any)
      prisma.order.findFirst.mockResolvedValueOnce({
        id: 'order-1',
        no: 'ORD-1',
        payAmount: 100,
        merchantId: 'm-1',
      } as any)
      prisma.$transaction.mockRejectedValueOnce(new Error('db write conflict') as any)
      const { headers, body, req } = makeArgs()

      const res = await controller.wechatNotify(headers, body, req)

      expect(res.code).toBe('FAIL')
      expect(res.message).toBe('db write conflict')
    })
  })
})
