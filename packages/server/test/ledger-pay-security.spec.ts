import { createHash } from 'crypto'
import { describe, it, expect, afterEach, jest } from '@jest/globals'

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TEST' }))

import { LedgerPayController } from '../src/modules/ledger/ledger-pay.controller'
import { LedgerXpayService } from '../src/modules/ledger/ledger-xpay.service'

describe('ledger payment callback security', () => {
  const env0 = { ...process.env }
  const fetch0 = global.fetch
  afterEach(() => {
    process.env = { ...env0 }
    global.fetch = fetch0
  })

  it('微信支付缺原始报文时不验签、不发放', async () => {
    const pay = { handleNotify: jest.fn() }
    const wxpay = { verifyNotify: jest.fn() }
    const controller = new LedgerPayController(pay as any, {} as any, wxpay as any)
    const result = await controller.notify({}, { out_trade_no: 'forged' }, {
      rawBody: undefined,
    } as any)
    expect(result.code).toBe('FAIL')
    expect(wxpay.verifyNotify).not.toHaveBeenCalled()
    expect(pay.handleNotify).not.toHaveBeenCalled()
  })

  it('虚拟支付缺原始报文时不处理发货', async () => {
    const xpay = { verifyPushSignature: jest.fn(), handleDeliverNotify: jest.fn() }
    const controller = new LedgerPayController({} as any, xpay as any, {} as any)
    const result = await controller.xpayDeliver({}, { Event: 'xpay_goods_deliver_notify' }, {
      rawBody: undefined,
    } as any)
    expect(result).toMatchObject({ ErrCode: 1 })
    expect(xpay.verifyPushSignature).not.toHaveBeenCalled()
    expect(xpay.handleDeliverNotify).not.toHaveBeenCalled()
  })

  it('虚拟支付只在确认付款后返回微信要求的成功 ACK', async () => {
    const xpay = {
      verifyPushSignature: jest.fn(() => true),
      handleDeliverNotify: jest.fn(async () => false),
    }
    const controller = new LedgerPayController({} as any, xpay as any, {} as any)
    const query = { signature: 's', timestamp: 't', nonce: 'n' }
    const body = { Event: 'xpay_goods_deliver_notify', OutTradeNo: 'LXP123' }
    const request: any = { rawBody: Buffer.from(JSON.stringify(body)) }
    expect(await controller.xpayDeliver(query, body, request)).toMatchObject({ ErrCode: 1 })
    xpay.handleDeliverNotify.mockResolvedValueOnce(true)
    expect(await controller.xpayDeliver(query, body, request)).toEqual({
      ErrCode: 0,
      ErrMsg: 'success',
    })
  })

  it('虚拟支付推送签名拒绝旧时间戳和伪签名', () => {
    process.env.LEDGER_WX_PUSH_TOKEN = 'test-only-token'
    const xpay = new LedgerXpayService({} as any, {} as any, {} as any)
    const nonce = 'nonce'
    const sign = (timestamp: string) =>
      createHash('sha1').update(['test-only-token', timestamp, nonce].sort().join('')).digest('hex')
    const current = String(Math.floor(Date.now() / 1000))
    const old = String(Math.floor(Date.now() / 1000) - 3600)
    expect(xpay.verifyPushSignature(sign(current), current, nonce)).toBe(true)
    expect(xpay.verifyPushSignature(sign(old), old, nonce)).toBe(false)
    expect(xpay.verifyPushSignature('00'.repeat(20), current, nonce)).toBe(false)
  })

  it('虚拟支付必须由微信查单确认订单、金额和状态，不能信回调自报金额', async () => {
    process.env.LEDGER_XPAY_APP_KEY = 'test-app-key'
    process.env.LEDGER_XPAY_ENV = '0'
    const order = { outTradeNo: 'LXP123', userId: 'u1', status: 'pending', amountFen: 2900 }
    const prisma: any = {
      ledgerPaymentOrder: { findUnique: jest.fn(async () => order) },
      ledgerUser: { findUnique: jest.fn(async () => ({ wxOpenid: 'openid-u1' })) },
    }
    const pay: any = { handleNotify: jest.fn(async () => true) }
    const contentSecurity: any = { ledgerAccessToken: jest.fn(async () => 'test-access-token') }
    const xpay = new LedgerXpayService(prisma, {} as any, pay, contentSecurity)
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        errcode: 0,
        order: { order_id: 'LXP123', status: 1, order_fee: 2900, paid_fee: 2900, env_type: 1 },
      }),
    })) as any
    expect(
      await xpay.handleDeliverNotify({ OutTradeNo: 'LXP123', GoodsInfo: { ActualPrice: 2900 } }),
    ).toBe(false)
    expect(pay.handleNotify).not.toHaveBeenCalled()

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        errcode: 0,
        order: {
          order_id: 'LXP123',
          status: 2,
          order_fee: 2900,
          paid_fee: 2900,
          env_type: 1,
          wxpay_order_id: 'wx-transaction',
        },
      }),
    })) as any
    expect(
      await xpay.handleDeliverNotify({ OutTradeNo: 'LXP123', GoodsInfo: { ActualPrice: 1 } }),
    ).toBe(true)
    expect(pay.handleNotify).toHaveBeenCalledWith('LXP123', 'wx-transaction', 2900)
  })

  it('虚拟支付重复通知已入账时幂等 ACK，不再查单和二次发放', async () => {
    const prisma: any = {
      ledgerPaymentOrder: { findUnique: jest.fn(async () => ({ status: 'paid' })) },
    }
    const pay: any = { handleNotify: jest.fn() }
    const xpay = new LedgerXpayService(prisma, {} as any, pay)
    global.fetch = jest.fn() as any
    expect(await xpay.handleDeliverNotify({ OutTradeNo: 'LXP123' })).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(pay.handleNotify).not.toHaveBeenCalled()
  })
})
