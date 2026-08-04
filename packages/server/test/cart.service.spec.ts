import { describe, it, expect, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 默认不转换 node_modules；user-mp.service.ts → id.util.ts
// 导入 customAlphabet 会抛 "Cannot use import statement outside a module"。
// 这里用工厂 mock 替换为等价的随机生成器（与 auth.service.spec 同策略）。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let s = ''
    for (let i = 0; i < size; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return s
  },
}))

import { UserMpService } from '../src/modules/user-mp/user-mp.service'

// ----------------------------------------------------------------------------
// UserMpService — 用户端保护性业务（createOrder 之外的防御契约，真实测试）
//
// 实现位置：
//   packages/server/src/modules/user-mp/user-mp.service.ts
//
// 构造：constructor(prisma, wxpay, chat)
//
// 覆盖范围（均为"防御 / 资金 / 状态机 / 库存回滚"关键路径）：
//   - listCart   ：available 标志聚合（下架 / 规格停用 / 0 库存 → 不可下单）+ 价格扁平化为 number
//   - addFavorite：upsert 幂等（复合主键 userId_productId）
//   - refundOrder：状态机 + 金额校验 + 防重复 + 事务原子（Refund + Order.after_sale）
//   - cancelOrder：状态机 + 库存回滚契约（每条 item 归还库存）
//   - confirmOrder：状态机（仅已发货可确认收货）+ WS 推送
//   - bindPhone  ：验证码 / 手机号占用 / 当前账号已绑别号
//   - claimCoupon：领取校验链 + 交互式 Serializable $transaction（per-user 限领并发安全）
//   - myCoupons  ：UserCoupon 单表读取 + used>expired>unused 三态映射 + status 过滤
// ----------------------------------------------------------------------------

/** 断言抛出的 BizException 业务码 */
async function expectBizCode(fn: () => Promise<unknown>, code: number) {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    expect(e.getResponse().code).toBe(code)
  }
}

/** chat 网关：全部 jest.fn，调用即记录，永不抛 */
function makeChatMock() {
  return {
    broadcastUserUpdate: jest.fn((..._args: any[]) => undefined),
    emitOrderNew: jest.fn((..._args: any[]) => undefined),
    emitOrderUpdate: jest.fn((..._args: any[]) => undefined),
    emitRefundNew: jest.fn((..._args: any[]) => undefined),
  }
}

/** wxpay 网关：本套用例不触达支付，最小桩即可 */
function makeWxpayMock() {
  return {
    isReady: jest.fn(() => true),
    createMiniPay: jest.fn(),
  }
}

// ============================================================================
// listCart — available 聚合 + 价格扁平化
// ============================================================================
describe('UserMpService.listCart available 聚合', () => {
  /** 构造一条 cartItem，product/sku 字段可覆写以制造不同不可用场景 */
  function makeRow(over: { product?: any; sku?: any } = {}) {
    return {
      id: 'c1',
      productId: 'p1',
      skuId: 's1',
      quantity: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: 'p1',
        name: '门窗A',
        images: ['img.jpg'],
        status: 'active',
        merchantId: 'm1',
        priceRetailMin: 100,
        ...over.product,
      },
      sku: {
        id: 's1',
        specsLabel: '规格1',
        priceRetail: 100,
        priceWholesale: 80,
        priceMember: 70,
        stock: 5,
        active: true,
        ...over.sku,
      },
    }
  }

  function svcWithRows(rows: any[]) {
    const prisma = { cartItem: { findMany: jest.fn(async () => rows) } }
    return new UserMpService(prisma as any, makeWxpayMock() as any, makeChatMock() as any)
  }

  it('正常商品/规格/有库存 → available=true', async () => {
    const svc = svcWithRows([makeRow()])
    const list = await svc.listCart('u1')
    expect(list[0].available).toBe(true)
  })

  it('商品已下架 → available=false', async () => {
    const svc = svcWithRows([makeRow({ product: { status: 'offline' } })])
    const list = await svc.listCart('u1')
    expect(list[0].available).toBe(false)
  })

  it('SKU 停用(active=false) → available=false', async () => {
    const svc = svcWithRows([makeRow({ sku: { active: false } })])
    const list = await svc.listCart('u1')
    expect(list[0].available).toBe(false)
  })

  it('库存为 0 → available=false', async () => {
    const svc = svcWithRows([makeRow({ sku: { stock: 0 } })])
    const list = await svc.listCart('u1')
    expect(list[0].available).toBe(false)
  })

  it('价格字段扁平化为 number：priceRetail/priceWholesale/priceMember', async () => {
    // 模拟 Prisma Decimal —— 这里用带 valueOf 的对象，Number() 后应得到数值
    const decimalLike = (n: number) => ({ valueOf: () => n })
    const svc = svcWithRows([
      makeRow({
        sku: {
          priceRetail: decimalLike(100),
          priceWholesale: decimalLike(80),
          priceMember: decimalLike(70),
        },
      }),
    ])
    const list = await svc.listCart('u1')
    expect(typeof list[0].sku!.priceRetail).toBe('number')
    expect(typeof list[0].sku!.priceWholesale).toBe('number')
    expect(typeof list[0].sku!.priceMember).toBe('number')
    expect(list[0].sku!.priceRetail).toBe(100)
    expect(list[0].sku!.priceWholesale).toBe(80)
    expect(list[0].sku!.priceMember).toBe(70)
  })
})

// ============================================================================
// addFavorite — upsert 幂等（复合主键）
// ============================================================================
describe('UserMpService.addFavorite 幂等收藏', () => {
  it('调用 favorite.upsert，where 为复合主键 userId_productId', async () => {
    const upsert = jest.fn(async (..._args: any[]) => ({ id: 'f1' }))
    const prisma = { favorite: { upsert } }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, makeChatMock() as any)

    const r = await svc.addFavorite('u1', 'p1')
    expect(r).toEqual({ ok: true })
    expect(upsert).toHaveBeenCalledTimes(1)
    const arg: any = upsert.mock.calls[0][0]
    expect(arg.where).toEqual({ userId_productId: { userId: 'u1', productId: 'p1' } })
    // 幂等：update 为空对象，已存在时不改动
    expect(arg.update).toEqual({})
    expect(arg.create).toEqual({ userId: 'u1', productId: 'p1' })
  })
})

// ============================================================================
// refundOrder — 状态机 + 金额校验 + 防重复 + 事务原子
// ============================================================================
describe('UserMpService.refundOrder 售后防御', () => {
  function baseOrder(over: any = {}) {
    return {
      id: 'o1',
      no: 'NO1',
      userId: 'u1',
      merchantId: 'm1',
      status: 'shipped',
      payAmount: 100,
      items: [{ id: 'oi1', skuId: 's1', quantity: 1 }],
      ...over,
    }
  }

  function makeSvc(opts: { order: any; dupRefund?: any; chat?: any }) {
    const chat = opts.chat || makeChatMock()
    const prisma = {
      order: {
        findFirst: jest.fn(async () => opts.order),
        update: jest.fn(async (..._args: any[]) => ({})),
      },
      refund: {
        findFirst: jest.fn(async () => opts.dupRefund ?? null),
        create: jest.fn(async (..._args: any[]) => ({
          id: 'r1',
          no: 'RF1',
          createdAt: new Date(),
        })),
      },
      $transaction: jest.fn(async (cb: any) => {
        const tx = {
          refund: { create: prisma.refund.create },
          order: { update: prisma.order.update },
        }
        return cb(tx)
      }),
    }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, chat as any)
    return { svc, prisma, chat }
  }

  it('状态为 pending_payment（未付款）→ ORDER_STATUS_INVALID(4001)', async () => {
    const { svc } = makeSvc({ order: baseOrder({ status: 'pending_payment' }) })
    await expectBizCode(() => svc.refundOrder('u1', 'o1', { reason: '不想要了' }), 4001)
  })

  it('退款金额超过实付金额 → INVALID_PARAMS(1001)', async () => {
    const { svc } = makeSvc({ order: baseOrder({ payAmount: 100 }) })
    await expectBizCode(
      () => svc.refundOrder('u1', 'o1', { reason: '质量问题', amount: 200 }),
      1001,
    )
  })

  it('已有进行中的售后单 → CONFLICT(1003)', async () => {
    const { svc } = makeSvc({
      order: baseOrder(),
      dupRefund: { id: 'rOld', status: 'pending' },
    })
    await expectBizCode(() => svc.refundOrder('u1', 'o1', { reason: '重复提交' }), 1003)
  })

  it('正常路径：事务内 refund.create + order.update(after_sale)，推 emitRefundNew，返回 refundNo', async () => {
    const { svc, prisma, chat } = makeSvc({ order: baseOrder() })
    const r: any = await svc.refundOrder('u1', 'o1', { reason: '尺寸不对', amount: 50 })

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.refund.create).toHaveBeenCalledTimes(1)
    expect(prisma.order.update).toHaveBeenCalledTimes(1)
    // Order 被切到 after_sale
    const updArg: any = prisma.order.update.mock.calls[0][0]
    expect(updArg.data.status).toBe('after_sale')
    // 商家端实时推送
    expect(chat.emitRefundNew).toHaveBeenCalledTimes(1)
    expect(r.refundNo).toBe('RF1')
    expect(r.ok).toBe(true)
  })
})

// ============================================================================
// cancelOrder — 状态机 + 库存回滚契约
// ============================================================================
describe('UserMpService.cancelOrder 取消与库存回滚', () => {
  function makeSvc(order: any) {
    const chat = makeChatMock()
    const prisma = {
      order: {
        findFirst: jest.fn(async () => order),
        update: jest.fn(async (..._args: any[]) => ({})),
      },
      sku: { update: jest.fn(async (..._args: any[]) => ({})) },
      $transaction: jest.fn(async (cb: any) => {
        const tx = {
          order: { update: prisma.order.update },
          sku: { update: prisma.sku.update },
        }
        return cb(tx)
      }),
    }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, chat as any)
    return { svc, prisma, chat }
  }

  it('已发货订单不允许取消 → ORDER_STATUS_INVALID(4001)', async () => {
    const { svc } = makeSvc({ id: 'o1', status: 'shipped', items: [] })
    await expectBizCode(() => svc.cancelOrder('u1', 'o1'), 4001)
  })

  it('待付款订单可取消：事务内 order.update(cancelled) + 每条 item 归还库存', async () => {
    const order = {
      id: 'o1',
      no: 'NO1',
      merchantId: 'm1',
      status: 'pending_payment',
      items: [
        { id: 'oi1', skuId: 's1', quantity: 2 },
        { id: 'oi2', skuId: 's2', quantity: 3 },
      ],
    }
    const { svc, prisma } = makeSvc(order)
    const r = await svc.cancelOrder('u1', 'o1')
    expect(r).toEqual({ ok: true })

    const updArg: any = prisma.order.update.mock.calls[0][0]
    expect(updArg.data.status).toBe('cancelled')
    // 两条 item 各归还一次库存（stock increment）
    expect(prisma.sku.update).toHaveBeenCalledTimes(2)
    const calls = prisma.sku.update.mock.calls.map((c: any) => c[0])
    const s1 = calls.find((a: any) => a.where.id === 's1')
    const s2 = calls.find((a: any) => a.where.id === 's2')
    expect(s1.data.stock).toEqual({ increment: 2 })
    expect(s2.data.stock).toEqual({ increment: 3 })
  })
})

// ============================================================================
// confirmOrder — 状态机（仅已发货可确认收货）
// ============================================================================
describe('UserMpService.confirmOrder 确认收货', () => {
  function makeSvc(order: any) {
    const chat = makeChatMock()
    const prisma = {
      order: {
        findFirst: jest.fn(async () => order),
        update: jest.fn(async (..._args: any[]) => ({})),
      },
    }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, chat as any)
    return { svc, prisma, chat }
  }

  it('未发货订单 → ORDER_STATUS_INVALID(4001)', async () => {
    const { svc } = makeSvc({ id: 'o1', status: 'pending_shipment' })
    await expectBizCode(() => svc.confirmOrder('u1', 'o1'), 4001)
  })

  it('已发货 → 切 completed 并推 emitOrderUpdate', async () => {
    const { svc, prisma, chat } = makeSvc({
      id: 'o1',
      no: 'NO1',
      merchantId: 'm1',
      status: 'shipped',
    })
    const r = await svc.confirmOrder('u1', 'o1')
    expect(r).toEqual({ ok: true })
    const updArg: any = prisma.order.update.mock.calls[0][0]
    expect(updArg.data.status).toBe('completed')
    expect(chat.emitOrderUpdate).toHaveBeenCalledTimes(1)
    const payload: any = chat.emitOrderUpdate.mock.calls[0][1]
    expect(payload.status).toBe('completed')
  })
})

// ============================================================================
// bindPhone — 验证码 / 占用 / 当前账号已绑别号
// ============================================================================
describe('UserMpService.bindPhone 手机号绑定防御', () => {
  /**
   * @param smsRec   smsCode.findFirst 返回（null 表示验证码错误/过期）
   * @param occupied user.findUnique(by phone) 返回（占用检查）
   * @param me       user.findUnique(by id) 返回（当前账号）
   */
  function makeSvc(opts: { smsRec: any; occupied: any; me: any }) {
    const chat = makeChatMock()
    const prisma = {
      smsCode: {
        findFirst: jest.fn(async () => opts.smsRec),
        update: jest.fn(async () => ({})),
      },
      user: {
        // 第一次 findUnique 用 phone 查占用，第二次用 id 查 me
        findUnique: jest.fn(async (args: any) => {
          if (args?.where?.phone) return opts.occupied
          return opts.me
        }),
        update: jest.fn(async () => opts.me),
      },
    }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, chat as any)
    return { svc, prisma, chat }
  }

  it('验证码错误/过期(smsCode.findFirst null) → INVALID_PARAMS(1001)', async () => {
    const { svc } = makeSvc({ smsRec: null, occupied: null, me: { id: 'u1' } })
    await expectBizCode(() => svc.bindPhone('u1', { phone: '13800000000', code: '123456' }), 1001)
  })

  it('手机号被其他账号占用 → BUSINESS_ERROR(1000)', async () => {
    const { svc } = makeSvc({
      smsRec: { id: 'sc1' },
      occupied: { id: 'uOther', phone: '13800000000' },
      me: { id: 'u1' },
    })
    await expectBizCode(() => svc.bindPhone('u1', { phone: '13800000000', code: '123456' }), 1000)
  })

  it('当前账号已绑定其他手机号 → BUSINESS_ERROR(1000)', async () => {
    const { svc } = makeSvc({
      smsRec: { id: 'sc1' },
      occupied: null,
      me: { id: 'u1', phone: '13900000000' },
    })
    await expectBizCode(() => svc.bindPhone('u1', { phone: '13800000000', code: '123456' }), 1000)
  })
})

// ============================================================================
// claimCoupon — 领取校验链 + 交互式 Serializable $transaction（per-user 限领并发安全）
// ============================================================================
describe('UserMpService.claimCoupon 领券校验链', () => {
  const now = Date.now()
  function activeCoupon(over: any = {}) {
    return {
      id: 'cp1',
      status: 'active',
      validFrom: new Date(now - 86400_000),
      validTo: new Date(now + 86400_000),
      stock: 100,
      received: 0,
      perUserLimit: 1,
      ...over,
    }
  }

  /**
   * @param coupon       coupon.findUnique 返回（null 表示券不存在）
   * @param userClaimed  已领数量（tx.userCoupon.count 返回值）
   *
   * 新实现用「交互式 Serializable 事务」+ 正式 UserCoupon 表：claimCoupon 调
   * prisma.$transaction(async (cb) => cb(tx), { isolationLevel })。
   * 每人限领数量（count）必须在 **tx 客户端** 上读 —— 这是并发安全的关键，
   * 因此 txMock 暴露 userCoupon.{count,create} 与 coupon.update。
   * 基座 prisma.userCoupon.count 仅作哨兵：断言它不会被用于读 count。
   */
  function makeSvc(opts: { coupon: any; userClaimed?: number }) {
    const chat = makeChatMock()
    const couponUpdate = jest.fn(async () => ({}))
    const ucCreate = jest.fn(async (_arg: any) => ({}))
    const txUcCount = jest.fn(async (_arg: any) => opts.userClaimed ?? 0)
    // tx 客户端：事务回调内的全部读写都打在它身上
    const txMock = {
      coupon: { update: couponUpdate },
      userCoupon: { count: txUcCount, create: ucCreate },
    }
    // 基座 userCoupon.count —— 哨兵，断言 count 不从这里读
    const baseUcCount = jest.fn(async () => {
      throw new Error('base prisma.userCoupon.count 不应被用于读 per-user count')
    })
    const prisma = {
      coupon: { findUnique: jest.fn(async () => opts.coupon), update: couponUpdate },
      userCoupon: { count: baseUcCount, create: ucCreate },
      // 回调形式：claimCoupon 传入 (cb, opts)，把 txMock 喂给回调
      $transaction: jest.fn(async (cb: any, _opts?: any) => cb(txMock)),
    }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, chat as any)
    return { svc, prisma, txMock, couponUpdate, ucCreate, txUcCount, baseUcCount }
  }

  it('券不存在 → NOT_FOUND(1002)', async () => {
    const { svc } = makeSvc({ coupon: null })
    await expectBizCode(() => svc.claimCoupon('u1', 'cp1'), 1002)
  })

  it('券未上架/已下架 → BUSINESS_ERROR(1000)', async () => {
    const { svc } = makeSvc({ coupon: activeCoupon({ status: 'paused' }) })
    await expectBizCode(() => svc.claimCoupon('u1', 'cp1'), 1000)
  })

  it('券不在有效期内（已过期）→ BUSINESS_ERROR(1000)', async () => {
    const { svc } = makeSvc({
      coupon: activeCoupon({ validTo: new Date(now - 1000) }),
    })
    await expectBizCode(() => svc.claimCoupon('u1', 'cp1'), 1000)
  })

  it('券已被领完(received>=stock) → BUSINESS_ERROR(1000)', async () => {
    const { svc } = makeSvc({ coupon: activeCoupon({ stock: 10, received: 10 }) })
    await expectBizCode(() => svc.claimCoupon('u1', 'cp1'), 1000)
  })

  it('超出每人限领(perUserLimit) → BUSINESS_ERROR(1000)，且 count 读在 tx 客户端上', async () => {
    const { svc, txUcCount, baseUcCount, couponUpdate, ucCreate } = makeSvc({
      coupon: activeCoupon({ perUserLimit: 1 }),
      userClaimed: 1,
    })
    await expectBizCode(() => svc.claimCoupon('u1', 'cp1'), 1000)
    // per-user count 必须在事务客户端读（并发安全核心），不能读基座 prisma
    expect(txUcCount).toHaveBeenCalledTimes(1)
    expect(txUcCount).toHaveBeenCalledWith({ where: { userId: 'u1', couponId: 'cp1' } })
    expect(baseUcCount).not.toHaveBeenCalled()
    // 超限路径绝不写库存（事务回滚），received 不应被 +1，持券行也不应落表
    expect(couponUpdate).not.toHaveBeenCalled()
    expect(ucCreate).not.toHaveBeenCalled()
  })

  it('正常领取：回调形式 $transaction(Serializable) 被调用，tx 内读 count + 写，返回 {ok:true, no, count}', async () => {
    const { svc, prisma, txMock, couponUpdate, ucCreate, txUcCount, baseUcCount } = makeSvc({
      coupon: activeCoupon(),
    })
    const r: any = await svc.claimCoupon('u1', 'cp1')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    // 回调形式：第一个参数是函数，第二个参数带 Serializable 隔离级别
    expect(typeof prisma.$transaction.mock.calls[0][0]).toBe('function')
    const txOpts: any = prisma.$transaction.mock.calls[0][1]
    expect(txOpts?.isolationLevel).toBe('Serializable')
    // per-user count 读在 tx 客户端（tx.userCoupon.count），而非基座 prisma
    expect(txUcCount).toHaveBeenCalledTimes(1)
    expect(txUcCount).toHaveBeenCalledWith({ where: { userId: 'u1', couponId: 'cp1' } })
    expect(baseUcCount).not.toHaveBeenCalled()
    // received +1 + 持券行 create 均在 tx 客户端求值
    expect(txMock.coupon.update).toBe(couponUpdate)
    expect(couponUpdate).toHaveBeenCalledTimes(1)
    expect(ucCreate).toHaveBeenCalledTimes(1)
    const createArg: any = ucCreate.mock.calls[0][0]
    expect(createArg.data.userId).toBe('u1')
    expect(createArg.data.couponId).toBe('cp1')
    expect(createArg.data.no).toBe(r.no)
    expect(r.ok).toBe(true)
    expect(typeof r.no).toBe('string')
    expect(r.no.length).toBeGreaterThan(0)
    expect(r.count).toBe(1)
  })
})

// ============================================================================
// myCoupons — UserCoupon 单表读取 + 三态映射（used > expired > unused）+ status 过滤
// ============================================================================
describe('UserMpService.myCoupons 我的优惠券', () => {
  const now = Date.now()

  /** 券基础信息（coupon.findMany 返回，含 merchant 名称） */
  function coupon(id: string, over: any = {}) {
    return {
      id,
      name: `券${id}`,
      type: 'fullReduce',
      amount: 50,
      discountPercent: null,
      threshold: 100,
      merchantId: 'm1',
      merchant: { id: 'm1', name: '商家一号' },
      validFrom: new Date(now - 86400_000),
      validTo: new Date(now + 86400_000),
      ...over,
    }
  }

  /** UserCoupon 持券行（userCoupon.findMany 返回） */
  function ucRow(no: string, couponId: string, over: any = {}) {
    return {
      no,
      userId: 'u1',
      couponId,
      status: 'unused',
      usedAt: null,
      orderId: null,
      orderNo: null,
      claimedAt: new Date(now - 3600_000),
      ...over,
    }
  }

  function makeSvc(rows: any[], coupons: any[]) {
    const ucFindMany = jest.fn(async (_arg: any) => rows)
    const cpFindMany = jest.fn(async (_arg: any) => coupons)
    const prisma = {
      userCoupon: { findMany: ucFindMany },
      coupon: { findMany: cpFindMany },
    }
    const svc = new UserMpService(prisma as any, makeWxpayMock() as any, makeChatMock() as any)
    return { svc, ucFindMany, cpFindMany }
  }

  it('三态映射：已核销→used（即便券已过期，used 优先于 expired），过期未用→expired，其余→unused', async () => {
    const usedAt = new Date(now - 1800_000)
    const rows = [
      // 已核销 + 券已过期 → 仍 used（与旧 SystemConfig 实现的优先级一致）
      ucRow('UC_used_expired', 'cpExpired', { status: 'used', usedAt }),
      // 未核销 + 券已过期 → expired
      ucRow('UC_expired', 'cpExpired'),
      // 未核销 + 在有效期 → unused
      ucRow('UC_unused', 'cpActive'),
    ]
    const coupons = [coupon('cpExpired', { validTo: new Date(now - 1000) }), coupon('cpActive')]
    const { svc, ucFindMany } = makeSvc(rows, coupons)
    const list: any[] = await svc.myCoupons('u1')

    // 单表查询：where userId + claimedAt desc + take 500
    const arg: any = ucFindMany.mock.calls[0][0]
    expect(arg.where).toEqual({ userId: 'u1' })
    expect(arg.orderBy).toEqual({ claimedAt: 'desc' })
    expect(arg.take).toBe(500)

    expect(list).toHaveLength(3)
    const byNo = new Map(list.map((x) => [x.no, x]))
    expect(byNo.get('UC_used_expired').status).toBe('used')
    expect(byNo.get('UC_used_expired').usedAt).toBe(usedAt.toISOString())
    expect(byNo.get('UC_expired').status).toBe('expired')
    expect(byNo.get('UC_expired').usedAt).toBeNull()
    expect(byNo.get('UC_unused').status).toBe('unused')
    // 行形状契约（前端 MyCoupon）：claimedAt 为 ISO 字符串，金额扁平为 number，带商家名
    const u = byNo.get('UC_unused')
    expect(u.claimedAt).toBe(rows[2].claimedAt.toISOString())
    expect(u.amount).toBe(50)
    expect(u.threshold).toBe(100)
    expect(u.merchantName).toBe('商家一号')
    expect(u.couponId).toBe('cpActive')
  })

  it('query.status 过滤：只返回指定状态（used），未知 couponId 的持券行被跳过', async () => {
    const rows = [
      ucRow('UC_used', 'cpActive', { status: 'used', usedAt: new Date(now - 60_000) }),
      ucRow('UC_unused', 'cpActive'),
      // 券已被删/查不到 → 行直接跳过，不进结果
      ucRow('UC_orphan', 'cpGone', { status: 'used', usedAt: new Date(now - 60_000) }),
    ]
    const { svc } = makeSvc(rows, [coupon('cpActive')])
    const list: any[] = await svc.myCoupons('u1', { status: 'used' })
    expect(list).toHaveLength(1)
    expect(list[0].no).toBe('UC_used')
    expect(list[0].status).toBe('used')
  })
})
