import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；id.util(orderNo) 通过它生成单号。
// 用等价随机生成器替换，避免 "Cannot use import statement outside a module"。
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
// UserMpService — 购物车越权 + createOrder 计价链（资金安全核心）
//
// 实现位置：packages/server/src/modules/user-mp/user-mp.service.ts
//
// 重点契约：
//   - 购物车：updateCart / removeCart 必须按 (id, userId) 双条件越权防护
//   - createOrder 计价链（绝不信前端金额）：
//       黑名单 → tier 身份 → 店铺价格规则 → 隐藏价拒绝 → 跨商户拒绝 →
//       分级取价(retail/wholesale/member) → 库存校验 → by-size 面积重算 →
//       优惠券服务端重算(门槛/有效期/商户/每人限用/适用范围/折扣clamp) →
//       payAmount = total + 运费 - 券，事务内扣库存 + 扣券 + 推送
//   - payOrder：状态校验 / 支付通道就绪 / openid 校验
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

/** 捕获抛出异常的 message */
async function catchMessage(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
    throw new Error('should have thrown')
  } catch (e: any) {
    return e.getResponse().message
  }
}

// ---- chat / wxpay mock 工厂 ----
function makeChat() {
  return {
    broadcastUserUpdate: jest.fn(),
    emitOrderNew: jest.fn(),
    emitOrderUpdate: jest.fn(),
    emitRefundNew: jest.fn(),
    emitChatMessage: jest.fn(),
  }
}

function makeWxpay() {
  return {
    isReady: jest.fn(() => true),
    createMiniPay: jest.fn(async () => ({ appId: 'a' })),
  }
}

// ---- fixtures ----
const ADDRESS = { id: 'a1', userId: 'u1' }

/**
 * SKU 工厂。product.pricingMode 默认 'standard'；by-size 用例覆写。
 * by-size 尺寸范围字段挂在 product 上（min/maxLength、min/maxWidth、pricePerSqm、baseFee、sizeUnit）。
 */
function makeSku(
  id: string,
  productId: string,
  stock: number,
  priceRetail: number,
  priceWholesale: number,
  priceMember: number,
  specsLabel: string,
  product: any,
) {
  return {
    id,
    productId,
    stock,
    priceRetail,
    priceWholesale,
    priceMember,
    specsLabel,
    product: {
      id: productId,
      name: 'P',
      merchantId: 'm1',
      images: [],
      pricingMode: 'standard',
      ...product,
    },
  }
}

/**
 * 构造 prisma mock。
 * - systemConfig.findUnique 按 key 派发（map 可逐用例覆写）
 * - $transaction 回调形态：tx.order.create 回显 totalAmount/payAmount
 */
function makePrisma(
  opts: {
    address?: any
    skus?: any[]
    user?: any
    configMap?: Record<string, any>
    coupon?: any
    orderCount?: number
    categoryProducts?: any[]
  } = {},
) {
  const configMap = opts.configMap || {}
  const order = {
    id: 'o1',
    no: 'O1',
    status: 'pending_payment',
    totalAmount: 0,
    payAmount: 0,
  }

  const tx = {
    order: {
      create: jest.fn(async (arg: any) => ({
        id: 'o1',
        no: arg.data.no,
        status: 'pending_payment',
        totalAmount: arg.data.totalAmount,
        payAmount: arg.data.payAmount,
        createdAt: new Date(),
      })),
    },
    sku: { update: jest.fn(async () => ({})) },
    coupon: { update: jest.fn(async () => ({})) },
  }

  const prisma: any = {
    address: {
      findFirst: jest.fn(async () => (opts.address === undefined ? ADDRESS : opts.address)),
    },
    sku: {
      findMany: jest.fn(async () => opts.skus ?? []),
    },
    user: {
      findUnique: jest.fn(async () =>
        opts.user === undefined ? { id: 'u1', role: 'customer', openid: 'ox' } : opts.user,
      ),
    },
    coupon: {
      findUnique: jest.fn(async () => opts.coupon ?? null),
      update: jest.fn(async () => ({})),
    },
    product: {
      findMany: jest.fn(async () => opts.categoryProducts ?? []),
    },
    order: {
      count: jest.fn(async () => opts.orderCount ?? 0),
    },
    systemConfig: {
      // service 读取 cfg?.value，所以 mock 必须把配置值包在 { value } 里
      findUnique: jest.fn(async (arg: any) =>
        arg.where.key in configMap ? { key: arg.where.key, value: configMap[arg.where.key] } : null,
      ),
    },
    // createOrder 下单后 best-effort 核销：findFirst 取最早一条未使用持券行 → update 标记已用
    userCoupon: {
      findFirst: jest.fn(async (_arg: any) => null),
      update: jest.fn(async (_arg: any) => ({})),
    },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
    __tx: tx,
    __order: order,
  }
  return prisma
}

function makeService(prisma: any) {
  const chat = makeChat()
  const wxpay = makeWxpay()
  const svc = new UserMpService(prisma as any, wxpay as any, chat as any)
  return { svc, chat, wxpay, prisma }
}

// 标准下单 dto（单 SKU、standard 定价）
function orderDto(extra: any = {}) {
  return { addressId: 'a1', items: [{ skuId: 's1', quantity: 2 }], ...extra }
}

describe('UserMpService 购物车越权防护', () => {
  it('updateCart：改别人条目（findFirst 返回 null）→ NOT_FOUND(1002)', async () => {
    const prisma = makePrisma()
    prisma.cartItem = { findFirst: jest.fn(async () => null), update: jest.fn() }
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.updateCart('u1', 'cartOfOther', { quantity: 3 }), 1002)
    // 既然条目不属于本人，绝不能落到 update
    expect(prisma.cartItem.update).not.toHaveBeenCalled()
  })

  it('removeCart：deleteMany count=0（无匹配）→ NOT_FOUND(1002)', async () => {
    const prisma = makePrisma()
    prisma.cartItem = { deleteMany: jest.fn(async () => ({ count: 0 })) }
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.removeCart('u1', 'cartOfOther'), 1002)
  })
})

describe('UserMpService addCart', () => {
  it('商品下架（status=offline）→ PRODUCT_OFFLINE(3001)', async () => {
    const prisma = makePrisma()
    prisma.product = {
      findUnique: jest.fn(async () => ({ id: 'p1', status: 'offline' })),
    }
    const { svc } = makeService(prisma)
    await expectBizCode(
      () => svc.addCart('u1', { productId: 'p1', skuId: 's1', quantity: 1 }),
      3001,
    )
  })

  it('已有条目累加后超库存 → STOCK_INSUFFICIENT(3002)', async () => {
    const prisma = makePrisma()
    prisma.product = { findUnique: jest.fn(async () => ({ id: 'p1', status: 'active' })) }
    prisma.sku = {
      findUnique: jest.fn(async () => ({ id: 's1', productId: 'p1', stock: 5, active: true })),
    }
    prisma.cartItem = {
      findUnique: jest.fn(async () => ({ id: 'c1', quantity: 4 })),
      update: jest.fn(),
      create: jest.fn(),
    }
    const { svc } = makeService(prisma)
    // 已有 4 + 新增 3 = 7 > 库存 5
    await expectBizCode(
      () => svc.addCart('u1', { productId: 'p1', skuId: 's1', quantity: 3 }),
      3002,
    )
  })

  it('正常累加 → update 的 quantity = 旧 + 新', async () => {
    const prisma = makePrisma()
    prisma.product = { findUnique: jest.fn(async () => ({ id: 'p1', status: 'active' })) }
    prisma.sku = {
      findUnique: jest.fn(async () => ({ id: 's1', productId: 'p1', stock: 50, active: true })),
    }
    prisma.cartItem = {
      findUnique: jest.fn(async () => ({ id: 'c1', quantity: 4 })),
      update: jest.fn(async (arg: any) => arg),
      create: jest.fn(),
    }
    const { svc } = makeService(prisma)
    await svc.addCart('u1', { productId: 'p1', skuId: 's1', quantity: 3 })
    expect(prisma.cartItem.update).toHaveBeenCalledTimes(1)
    const arg = prisma.cartItem.update.mock.calls[0][0] as any
    expect(arg.where.id).toBe('c1')
    expect(arg.data.quantity).toBe(7)
    expect(prisma.cartItem.create).not.toHaveBeenCalled()
  })
})

describe('UserMpService createOrder 准入校验', () => {
  it('跨商户两个 SKU → BUSINESS_ERROR(1000) 且文案提示跨商户', async () => {
    const skus = [
      makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', { merchantId: 'm1' }),
      makeSku('s2', 'p2', 10, 100, 80, 60, '规格B', { merchantId: 'm2' }),
    ]
    const prisma = makePrisma({ skus })
    const { svc } = makeService(prisma)
    const dto = {
      addressId: 'a1',
      items: [
        { skuId: 's1', quantity: 1 },
        { skuId: 's2', quantity: 1 },
      ],
    }
    await expectBizCode(() => svc.createOrder('u1', dto), 1000)
    const msg = await catchMessage(() => svc.createOrder('u1', dto))
    expect(msg).toContain('跨商户')
  })

  it('买家被店铺拉黑（blocked=true）→ FORBIDDEN(2003)', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const prisma = makePrisma({
      skus,
      configMap: { 'merchant:m1:blacklist:u1': { blocked: true } },
    })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto()), 2003)
  })

  it('店铺规则 customerPrice=hidden，普通客户 → FORBIDDEN(2003)', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const prisma = makePrisma({
      skus,
      configMap: { 'shop:m1:priceRule': { guestAllow: true, customerPrice: 'hidden' } },
    })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto()), 2003)
  })

  it('库存不足 → STOCK_INSUFFICIENT(3002)', async () => {
    const skus = [makeSku('s1', 'p1', 1, 100, 80, 60, '规格A', {})]
    const prisma = makePrisma({ skus })
    const { svc } = makeService(prisma)
    // 下单 2 件 > 库存 1
    await expectBizCode(() => svc.createOrder('u1', orderDto()), 3002)
  })
})

describe('UserMpService createOrder 分级取价', () => {
  it('cust_tier=member + memberPrice=member → 入账按会员价(priceMember*qty)', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const prisma = makePrisma({
      skus,
      configMap: {
        cust_tier_m1_u1: { priceTier: 'member' },
        'shop:m1:priceRule': { guestAllow: true, memberPrice: 'member' },
      },
    })
    const { svc } = makeService(prisma)
    await svc.createOrder('u1', orderDto())
    const data = prisma.__tx.order.create.mock.calls[0][0].data
    // priceMember 60 * 2 = 120，绝不能是零售价 100*2=200
    expect(data.totalAmount).toBe(120)
  })

  it('cust_tier=agency 默认 agencyPrice=wholesale → 入账按批发价', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const prisma = makePrisma({
      skus,
      configMap: {
        cust_tier_m1_u1: { priceTier: 'agency' },
        // 不显式给 shop priceRule → 走 DEFAULT.agencyPrice='wholesale'
      },
    })
    const { svc } = makeService(prisma)
    await svc.createOrder('u1', orderDto())
    const data = prisma.__tx.order.create.mock.calls[0][0].data
    // priceWholesale 80 * 2 = 160
    expect(data.totalAmount).toBe(160)
  })
})

describe('UserMpService createOrder by-size 面积重算', () => {
  function bySizeProduct(over: any = {}) {
    return {
      pricingMode: 'by-size',
      pricePerSqm: 100,
      baseFee: 50,
      sizeUnit: 'cm',
      minLength: 50,
      maxLength: 600,
      minWidth: 50,
      maxWidth: 400,
      ...over,
    }
  }

  it('缺 bySize → INVALID_PARAMS(1001)', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', bySizeProduct())]
    const prisma = makePrisma({ skus })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto()), 1001)
  })

  it('length 700 超出范围(max 600) → INVALID_PARAMS(1001)', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', bySizeProduct())]
    const prisma = makePrisma({ skus })
    const { svc } = makeService(prisma)
    const dto = {
      addressId: 'a1',
      items: [{ skuId: 's1', quantity: 1, bySize: { length: 700, width: 100 } }],
    }
    await expectBizCode(() => svc.createOrder('u1', dto), 1001)
  })

  it('200x100cm → unitPrice = round((2*1)*100+50)=250 入账 totalAmount', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', bySizeProduct())]
    const prisma = makePrisma({ skus })
    const { svc } = makeService(prisma)
    // 200cm=2m, 100cm=1m → 面积 2㎡ → 2*100 + 50 = 250；qty=1
    const dto = {
      addressId: 'a1',
      items: [{ skuId: 's1', quantity: 1, bySize: { length: 200, width: 100 } }],
    }
    await svc.createOrder('u1', dto)
    const data = prisma.__tx.order.create.mock.calls[0][0].data
    expect(data.totalAmount).toBe(250)
  })
})

describe('UserMpService createOrder 优惠券服务端重算', () => {
  // 公共：单 SKU、零售价 100、下单 2 件 → totalAmount = 200
  function baseSkus() {
    return [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
  }
  const now = Date.now()
  function validCoupon(over: any = {}) {
    return {
      id: 'c1',
      status: 'active',
      validFrom: new Date(now - 86400_000),
      validTo: new Date(now + 86400_000),
      merchantId: 'm1',
      threshold: null,
      perUserLimit: null,
      scope: 'all',
      scopeIds: [],
      type: 'fullReduce',
      amount: 50,
      discountPercent: null,
      ...over,
    }
  }

  it('couponId 指向不存在的券 → NOT_FOUND(1002)', async () => {
    const prisma = makePrisma({ skus: baseSkus(), coupon: null })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'cX' })), 1002)
  })

  it('券 status=pending（未启用）→ BUSINESS_ERROR(1000)', async () => {
    const prisma = makePrisma({ skus: baseSkus(), coupon: validCoupon({ status: 'pending' }) })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'c1' })), 1000)
  })

  it('券不在有效期内（已过期）→ BUSINESS_ERROR(1000)', async () => {
    const prisma = makePrisma({
      skus: baseSkus(),
      coupon: validCoupon({
        validFrom: new Date(now - 10 * 86400_000),
        validTo: new Date(now - 86400_000),
      }),
    })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'c1' })), 1000)
  })

  it('券 merchantId 不同 → BUSINESS_ERROR(1000)', async () => {
    const prisma = makePrisma({ skus: baseSkus(), coupon: validCoupon({ merchantId: 'mOther' }) })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'c1' })), 1000)
  })

  it('门槛未满（threshold 500 > total 200）→ BUSINESS_ERROR(1000)', async () => {
    const prisma = makePrisma({ skus: baseSkus(), coupon: validCoupon({ threshold: 500 }) })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'c1' })), 1000)
  })

  it('perUserLimit=1 且已用 1 单 → BUSINESS_ERROR(1000) 每人限用', async () => {
    const prisma = makePrisma({
      skus: baseSkus(),
      coupon: validCoupon({ perUserLimit: 1 }),
      orderCount: 1,
    })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'c1' })), 1000)
  })

  it('scope=product 不含订单商品 → BUSINESS_ERROR(1000)', async () => {
    const prisma = makePrisma({
      skus: baseSkus(),
      coupon: validCoupon({ scope: 'product', scopeIds: ['pOther'] }),
    })
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.createOrder('u1', orderDto({ couponId: 'c1' })), 1000)
  })

  it('type=discount discountPercent=0.85 → couponDiscount = round(total*0.15*100)/100', async () => {
    const prisma = makePrisma({
      skus: baseSkus(),
      coupon: validCoupon({ type: 'discount', amount: null, discountPercent: 0.85 }),
    })
    const { svc } = makeService(prisma)
    await svc.createOrder('u1', orderDto({ couponId: 'c1' }))
    const data = prisma.__tx.order.create.mock.calls[0][0].data
    // total=200，付 85% 抵 15% → 200*0.15 = 30
    expect(data.couponDiscount).toBe(30)
  })

  it('type=fullReduce amount=50 → couponDiscount=50', async () => {
    const prisma = makePrisma({
      skus: baseSkus(),
      coupon: validCoupon({ type: 'fullReduce', amount: 50 }),
    })
    const { svc } = makeService(prisma)
    await svc.createOrder('u1', orderDto({ couponId: 'c1' }))
    const data = prisma.__tx.order.create.mock.calls[0][0].data
    expect(data.couponDiscount).toBe(50)
  })

  it('券面额超过订单金额 → couponDiscount 被钳到 total，payAmount=0', async () => {
    const prisma = makePrisma({
      skus: baseSkus(),
      coupon: validCoupon({ type: 'fullReduce', amount: 9999 }),
    })
    const { svc } = makeService(prisma)
    const res = await svc.createOrder('u1', orderDto({ couponId: 'c1' }))
    const data = prisma.__tx.order.create.mock.calls[0][0].data
    expect(data.couponDiscount).toBe(200) // 钳到 total
    expect(data.payAmount).toBe(0)
    expect(res.payAmount).toBe(0)
  })
})

describe('UserMpService createOrder happy path', () => {
  it('成功下单：每个 item 扣库存 + 用券则递增 used + 推送 emitOrderNew + 返回三元组', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const now = Date.now()
    const coupon = {
      id: 'c1',
      status: 'active',
      validFrom: new Date(now - 86400_000),
      validTo: new Date(now + 86400_000),
      merchantId: 'm1',
      threshold: null,
      perUserLimit: null,
      scope: 'all',
      scopeIds: [],
      type: 'fullReduce',
      amount: 50,
      discountPercent: null,
    }
    const prisma = makePrisma({ skus, coupon })
    const { svc, chat } = makeService(prisma)
    const res = await svc.createOrder('u1', orderDto({ couponId: 'c1' }))

    // 每个订单项扣一次库存（decrement）
    expect(prisma.__tx.sku.update).toHaveBeenCalledTimes(1)
    const skuArg = prisma.__tx.sku.update.mock.calls[0][0] as any
    expect(skuArg.where.id).toBe('s1')
    expect(skuArg.data.stock.decrement).toBe(2)

    // 用券 → 事务内递增 used
    expect(prisma.__tx.coupon.update).toHaveBeenCalledTimes(1)
    const couponArg = prisma.__tx.coupon.update.mock.calls[0][0] as any
    expect(couponArg.data.used.increment).toBe(1)

    // 事务外 best-effort 核销：取最早一条未使用 UserCoupon（本例 mock 无持券行 → 不 update）
    expect(prisma.userCoupon.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', couponId: 'c1', status: 'unused' },
      orderBy: { claimedAt: 'asc' },
    })
    expect(prisma.userCoupon.update).not.toHaveBeenCalled()

    // 商家端推送
    expect(chat.emitOrderNew).toHaveBeenCalledTimes(1)

    // 返回结构
    expect(res.orderId).toBe('o1')
    expect(res.orderNo).toBeTruthy()
    // total 200 - 券 50 = 150
    expect(res.payAmount).toBe(150)
  })

  it('无券下单：不调用 tx.coupon.update，也不触发 UserCoupon 核销', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const prisma = makePrisma({ skus })
    const { svc } = makeService(prisma)
    await svc.createOrder('u1', orderDto())
    expect(prisma.__tx.coupon.update).not.toHaveBeenCalled()
    expect(prisma.userCoupon.findFirst).not.toHaveBeenCalled()
    expect(prisma.userCoupon.update).not.toHaveBeenCalled()
  })

  it('用券下单且有未使用持券行：按主键 no 核销（status=used + usedAt/orderId/orderNo）', async () => {
    const skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})]
    const now = Date.now()
    const coupon = {
      id: 'c1',
      status: 'active',
      validFrom: new Date(now - 86400_000),
      validTo: new Date(now + 86400_000),
      merchantId: 'm1',
      threshold: null,
      perUserLimit: null,
      scope: 'all',
      scopeIds: [],
      type: 'fullReduce',
      amount: 50,
      discountPercent: null,
    }
    const prisma = makePrisma({ skus, coupon })
    prisma.userCoupon.findFirst = jest.fn(async (_arg: any) => ({
      no: 'UC1',
      userId: 'u1',
      couponId: 'c1',
      status: 'unused',
    }))
    const { svc } = makeService(prisma)
    await svc.createOrder('u1', orderDto({ couponId: 'c1' }))

    expect(prisma.userCoupon.update).toHaveBeenCalledTimes(1)
    const arg = prisma.userCoupon.update.mock.calls[0][0] as any
    expect(arg.where).toEqual({ no: 'UC1' })
    expect(arg.data.status).toBe('used')
    expect(arg.data.usedAt).toBeInstanceOf(Date)
    expect(arg.data.orderId).toBe('o1')
    expect(arg.data.orderNo).toBeTruthy()
  })
})

describe('UserMpService payOrder', () => {
  function makeOrder(status: string) {
    return { id: 'o1', no: 'O1', userId: 'u1', status, payAmount: 150 }
  }

  it('订单状态非 pending_payment → ORDER_STATUS_INVALID(4001)', async () => {
    const prisma = makePrisma()
    prisma.order = { findFirst: jest.fn(async () => makeOrder('completed')) }
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.payOrder('u1', 'o1', 'wechat'), 4001)
  })

  it('支付通道未就绪（isReady=false）→ BUSINESS_ERROR(1000)', async () => {
    const prisma = makePrisma()
    prisma.order = { findFirst: jest.fn(async () => makeOrder('pending_payment')) }
    const { svc, wxpay } = makeService(prisma)
    wxpay.isReady.mockReturnValue(false)
    await expectBizCode(() => svc.payOrder('u1', 'o1', 'wechat'), 1000)
  })

  it('用户无 openid → INVALID_PARAMS(1001)', async () => {
    const prisma = makePrisma({ user: { id: 'u1', role: 'customer', openid: '' } })
    prisma.order = { findFirst: jest.fn(async () => makeOrder('pending_payment')) }
    const { svc } = makeService(prisma)
    await expectBizCode(() => svc.payOrder('u1', 'o1', 'wechat'), 1001)
  })

  it('就绪 → 返回 { ok:true, miniPay }', async () => {
    const prisma = makePrisma()
    prisma.order = { findFirst: jest.fn(async () => makeOrder('pending_payment')) }
    const { svc } = makeService(prisma)
    const res: any = await svc.payOrder('u1', 'o1', 'wechat')
    expect(res.ok).toBe(true)
    expect(res.miniPay).toEqual({ appId: 'a' })
  })
})
