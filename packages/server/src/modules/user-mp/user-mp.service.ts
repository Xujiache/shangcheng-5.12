import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { orderNo } from '../../common/utils/id.util'
import { WxPayService } from '../payment/wxpay.service'
import { ChatGateway } from '../chat/chat.gateway'

/** Haversine 公式：两点经纬度直线距离（km，保留两位小数） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

@Injectable()
export class UserMpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wxpay: WxPayService,
    private readonly chat: ChatGateway,
  ) {}

  // ========== 用户资料（读写 + WS 实时多端同步） ==========
  async profile(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    return this.serializeUser(u)
  }

  async updateProfile(userId: string, dto: any) {
    const data: any = {}
    if (typeof dto.nickname === 'string' && dto.nickname.trim())
      data.nickname = dto.nickname.trim().slice(0, 32)
    if (typeof dto.avatar === 'string') data.avatar = dto.avatar
    if (typeof dto.gender === 'number' && [0, 1, 2].includes(dto.gender)) data.gender = dto.gender
    if (typeof dto.email === 'string' && dto.email.trim()) {
      const email = dto.email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BizException(BizCode.INVALID_PARAMS, '邮箱格式不正确')
      }
      data.email = email
    }
    if (Object.keys(data).length === 0) {
      return this.profile(userId)
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data })
    const payload = this.serializeUser(updated)
    // 广播到该用户的所有在线设备（@WebSocketGateway 同 socket.io 房间）
    this.chat.broadcastUserUpdate(userId, payload)
    return payload
  }

  private serializeUser(u: any) {
    return {
      id: u.id,
      openid: u.openid,
      phone: u.phone,
      email: u.email,
      nickname: u.nickname,
      avatar: u.avatar,
      gender: u.gender,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }
  }

  // ========== 账号绑定（手机号 / 微信） ==========

  /**
   * 把手机号绑到当前登录用户上。
   *
   * 流程：
   *   1. 验证 SMS 验证码
   *   2. 检查该手机号是否被其他账号占用 → 占用则拒绝（前端可提示用户用手机号登录）
   *   3. 若当前账号已有手机号且不同 → 不允许覆盖（先解绑）
   *   4. 写入 phone，广播 WS user:update
   *
   * 主要场景：微信登录用户首次添加手机号
   */
  async bindPhone(userId: string, dto: { phone: string; code: string }) {
    const phone = String(dto.phone || '').trim()
    const code = String(dto.code || '').trim()
    if (!/^1[3-9]\d{9}$/.test(phone))
      throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
    if (!/^\d{4,6}$/.test(code)) throw new BizException(BizCode.INVALID_PARAMS, '验证码格式不正确')

    // 验证码核验（与 phoneLogin 一致）
    const rec = await this.prisma.smsCode.findFirst({
      where: { phone, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!rec) throw new BizException(BizCode.INVALID_PARAMS, '验证码错误或已过期')

    // 占用检查
    const occupied = await this.prisma.user.findUnique({ where: { phone } })
    if (occupied && occupied.id !== userId) {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '该手机号已被其他账号绑定，请直接使用手机号登录',
      )
    }

    const me = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!me) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    if (me.phone && me.phone !== phone) {
      throw new BizException(BizCode.BUSINESS_ERROR, '当前账号已绑定其他手机号，请先解绑')
    }

    await this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { phone },
    })
    const payload = this.serializeUser(updated)
    this.chat.broadcastUserUpdate(userId, payload)
    return payload
  }

  /**
   * 把微信 OpenID 绑到当前登录用户上。
   *
   * 流程：
   *   1. 用 wxCode 调微信 jscode2session 换 openid（与 wechatLogin 一致）
   *   2. 检查该 openid 是否被其他账号占用 → 占用则拒绝
   *   3. 若当前账号已有 openid 且不同 → 不允许覆盖
   *   4. 写入 openid + unionid，广播 WS
   *
   * 主要场景：手机号登录用户首次绑定微信
   */
  async bindWechat(userId: string, dto: { code: string }) {
    if (!dto?.code) throw new BizException(BizCode.INVALID_PARAMS, '微信 code 不能为空')

    // 安全规则与 wechatLogin 一致：
    //   - 生产环境必须真实换 openid；env 缺失或网络失败一律拒绝
    //   - 非生产环境保留开发期兜底，但使用 dev_ 前缀确定性派生
    const appid = process.env.WX_MINIAPP_APPID
    const secret = process.env.WX_MINIAPP_SECRET
    const isProd = process.env.NODE_ENV === 'production'
    let openid: string | null = null
    let unionid: string | null = null
    if (appid && secret) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(dto.code)}&grant_type=authorization_code`
        const r = await fetch(url, { method: 'GET' })
        const data: any = await r.json()
        if (data?.errcode && data.errcode !== 0) {
          throw new BizException(
            BizCode.INVALID_PARAMS,
            `微信授权失败：${data.errmsg || data.errcode}`,
          )
        }
        if (data?.openid) {
          openid = data.openid
          unionid = data.unionid || null
        }
      } catch (e: any) {
        if (e instanceof BizException) throw e
        if (isProd) {
          throw new BizException(BizCode.BUSINESS_ERROR, '微信授权服务暂不可用，请稍后重试')
        }
        // 非生产：继续走兜底
      }
    } else if (isProd) {
      throw new BizException(BizCode.BUSINESS_ERROR, '服务端未配置微信小程序凭证，无法绑定微信')
    }
    if (!openid) {
      if (isProd) {
        throw new BizException(BizCode.INVALID_PARAMS, '微信授权失败，未获取到 openid')
      }
      openid = `dev_wx_${String(dto.code).slice(0, 16)}`
    }

    const occupied = await this.prisma.user.findUnique({ where: { openid } })
    if (occupied && occupied.id !== userId) {
      throw new BizException(BizCode.BUSINESS_ERROR, '该微信号已被其他账号绑定，请直接使用微信登录')
    }

    const me = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!me) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    if (me.openid && me.openid !== openid) {
      throw new BizException(BizCode.BUSINESS_ERROR, '当前账号已绑定其他微信，请先解绑')
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { openid, unionid: unionid || undefined },
    })
    const payload = this.serializeUser(updated)
    this.chat.broadcastUserUpdate(userId, payload)
    return payload
  }

  // ========== 商品 ==========
  /**
   * 商品列表查询。
   *
   * categoryId：
   *   - 传 L1 分类 ID：返回该 L1 下的所有商品（包含挂在 L1 的 + 挂在该 L1 任意 L2 子分类的）
   *   - 传 L2 分类 ID：只返回该 L2 下的商品
   *   - 不传：返回所有
   *
   * 实现：每次查询先把分类树展开一层，把当前节点 + 其直接子节点 ID 一起作为 `IN` 列表传 prisma。
   */
  async listProducts(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { status: 'active' }
    if (q.keyword) {
      const kw = String(q.keyword).trim()
      if (kw) where.name = { contains: kw, mode: 'insensitive' }
    }
    if (q.categoryId) {
      const children = await this.prisma.category.findMany({
        where: { parentId: q.categoryId },
        select: { id: true },
      })
      const ids = [q.categoryId, ...children.map((c) => c.id)]
      where.categoryId = { in: ids }
    }
    if (q.merchantId) where.merchantId = q.merchantId
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy: { sales: 'desc' } }),
      this.prisma.product.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  /** 店铺搜索（按关键词模糊匹配店名） */
  async searchShops(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { status: 'active' }
    const kw = String(q.keyword || '').trim()
    if (kw) where.name = { contains: kw, mode: 'insensitive' }
    if (q.type === 'factory' || q.type === 'store') where.type = q.type
    const [list, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip,
        take,
        orderBy: { totalGmv: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          region: true,
          categories: true,
          totalGmv: true,
          status: true,
        },
      }),
      this.prisma.merchant.count({ where }),
    ])
    return buildPage(
      list.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        region: m.region,
        categories: m.categories,
        gmv: Number(m.totalGmv || 0),
      })),
      total,
      page,
      pageSize,
    )
  }

  async productDetail(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: { skus: true } })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    return decimalToNumber(p)
  }

  // ========== 分类 ==========
  async listCategories() {
    const cats = await this.prisma.category.findMany({
      where: { type: 'platform' },
      orderBy: { sort: 'asc' },
    })
    return cats
  }

  // ========== 订单 ==========
  async listOrders(userId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { userId }
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  async orderDetail(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true, payments: true },
    })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    return decimalToNumber(o)
  }

  async createOrder(userId: string, dto: any) {
    // 兼容前端字段名：items|lines / quantity|qty / shippingMethod|shipping / couponId|coupon
    const rawItems = dto.items || dto.lines || []
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BizException(BizCode.INVALID_PARAMS, '缺少订单项')
    }
    const normItems = rawItems.map((it: any) => ({
      skuId: it.skuId,
      productId: it.productId,
      quantity: Number(it.quantity ?? it.qty ?? 1),
    }))
    const shippingMethod = dto.shippingMethod || dto.shipping || 'factory'
    // 仅接受 couponId 字符串（指向 Coupon.id）；旧字段 dto.couponDiscount/dto.coupon 一律忽略——
    // 前端可篡改的金额绝不能进入服务端计费链路
    const couponId = typeof dto.couponId === 'string' && dto.couponId ? dto.couponId : null

    if (!dto.addressId) throw new BizException(BizCode.INVALID_PARAMS, '缺少收货地址')
    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } })
    if (!address) throw new BizException(BizCode.NOT_FOUND, '地址不存在')

    const skuIds = normItems.map((i) => i.skuId)
    const skus = await this.prisma.sku.findMany({
      where: { id: { in: skuIds } },
      include: { product: true },
    })
    if (skus.length !== normItems.length)
      throw new BizException(BizCode.NOT_FOUND, '部分 SKU 不存在')

    // 多商户聚合校验：所有 SKU 必须属同一 merchantId，否则强制让用户拆单。
    // 否则订单会出现"挂在 A 商家、却含 B 商家商品"的脏数据，直接污染发货 / 对账 / 佣金。
    const merchantSet = new Set<string>()
    for (const sku of skus) merchantSet.add(sku.product.merchantId)
    if (merchantSet.size === 0) {
      throw new BizException(BizCode.NOT_FOUND, '部分 SKU 不存在')
    }
    if (merchantSet.size > 1) {
      throw new BizException(BizCode.BUSINESS_ERROR, '不支持跨商户合并下单，请分别下单')
    }
    const merchantId = Array.from(merchantSet)[0]

    let totalAmount = 0
    const orderItemsData = normItems.map((it) => {
      const sku = skus.find((s) => s.id === it.skuId)!
      if (sku.stock < it.quantity)
        throw new BizException(BizCode.STOCK_INSUFFICIENT, `${sku.product.name} 库存不足`)
      const price = Number(sku.priceRetail)
      totalAmount += price * it.quantity
      return {
        productId: sku.productId,
        skuId: sku.id,
        productName: sku.product.name,
        productImage: sku.product.images[0] || '',
        specsLabel: sku.specsLabel,
        unitPrice: sku.priceRetail,
        quantity: it.quantity,
      }
    })

    // 运费策略：
    //  1. dto.shippingFee 显式传值 → 用之（商家/管理后台可后续接入）
    //  2. 否则默认免运费（与前端 confirm.vue 永远显示"免运费"保持一致）
    //  3. shippingMethod 仍记下来供商家筛选 / 业务参考，但不再用于计费
    const shippingFee = Number.isFinite(Number(dto.shippingFee))
      ? Math.max(0, Number(dto.shippingFee))
      : 0

    // 优惠券服务端重算：
    //   - 只信 couponId，金额一律服务端按 Coupon 配置 + totalAmount 推导
    //   - 校验：存在 / status=active / 在有效期内 / 商户匹配 / 门槛满足
    //   - 校验：perUserLimit（每人限用次数）
    //   - 校验：scope + scopeIds（券是否适用于这些 SKU）
    //   - type=fullReduce|fixed 按 amount 抵扣；type=discount 按 discountPercent 折扣率推
    //   - 抵扣金额不能超过订单金额本身
    let couponDiscount = 0
    if (couponId) {
      const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } })
      if (!coupon) {
        throw new BizException(BizCode.NOT_FOUND, '优惠券不存在')
      }
      if (coupon.status !== 'active') {
        throw new BizException(BizCode.BUSINESS_ERROR, '优惠券未启用或已下架')
      }
      const now = new Date()
      if (coupon.validFrom > now || coupon.validTo < now) {
        throw new BizException(BizCode.BUSINESS_ERROR, '优惠券不在有效期内')
      }
      if (coupon.merchantId !== merchantId) {
        throw new BizException(BizCode.BUSINESS_ERROR, '该优惠券不适用于本商品')
      }
      const threshold = coupon.threshold ? Number(coupon.threshold) : 0
      if (threshold > 0 && totalAmount < threshold) {
        throw new BizException(
          BizCode.BUSINESS_ERROR,
          `订单金额需满 ${threshold} 元才可使用该优惠券`,
        )
      }

      // perUserLimit 校验：统计该用户已经"非取消"的同券订单数；达到上限则拒绝
      // 注意：这里不算并发安全（同一用户同时下两单可绕过 1 次），生产可考虑唯一索引兜底
      if (coupon.perUserLimit && coupon.perUserLimit > 0) {
        const userUsedCount = await this.prisma.order.count({
          where: { userId, couponId: coupon.id, status: { not: 'cancelled' } },
        })
        if (userUsedCount >= coupon.perUserLimit) {
          throw new BizException(BizCode.BUSINESS_ERROR, '该券已超出每人使用次数')
        }
      }

      // scope 校验：scope='product' → scopeIds 是商品 id 数组（只要订单含任一命中商品即通过）
      //            scope='merchant' → scopeIds 是商户 id 数组
      //            scope='category' → scopeIds 是分类 id 数组（这里需要再查 product.categoryId）
      //            scope='all' 或缺省 → 不做范围限制
      if (
        coupon.scope &&
        coupon.scope !== 'all' &&
        Array.isArray(coupon.scopeIds) &&
        coupon.scopeIds.length > 0
      ) {
        const productIds = Array.from(new Set(skus.map((s) => s.productId)))
        let matched = false
        if (coupon.scope === 'product') {
          matched = productIds.some((pid) => coupon.scopeIds.includes(pid))
        } else if (coupon.scope === 'merchant') {
          matched = coupon.scopeIds.includes(merchantId)
        } else if (coupon.scope === 'category') {
          // 走一次查询补全分类信息（订单 SKU 数量通常很小）
          const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { categoryId: true },
          })
          matched = products.some((p) => p.categoryId && coupon.scopeIds.includes(p.categoryId))
        } else {
          // 未知 scope 取保守策略：不允许使用
          matched = false
        }
        if (!matched) {
          throw new BizException(BizCode.BUSINESS_ERROR, '该券不适用于当前订单')
        }
      }

      if (coupon.type === 'fullReduce' || coupon.type === 'fixed') {
        couponDiscount = coupon.amount ? Number(coupon.amount) : 0
      } else if (coupon.type === 'discount' && typeof coupon.discountPercent === 'number') {
        // discountPercent 语义：85 表示打 85 折，抵扣 15%
        const offRate = Math.max(0, Math.min(100, 100 - coupon.discountPercent)) / 100
        couponDiscount = Math.round(totalAmount * offRate * 100) / 100
      }
      if (couponDiscount > totalAmount) couponDiscount = totalAmount
    }

    const payAmount = Math.max(0, totalAmount + shippingFee - couponDiscount)

    // 订单创建 + 扣库存 + 扣优惠券 used 计数放进一个事务，
    // 避免"订单已建但库存没扣 / used 没递增"的脏数据
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          no: orderNo(),
          userId,
          merchantId,
          totalAmount,
          shippingFee,
          payAmount,
          shippingMethod,
          address: address as any,
          remark: dto.remark || null,
          couponId,
          couponDiscount: couponDiscount > 0 ? couponDiscount : null,
          expiresAt: new Date(Date.now() + 30 * 60_000),
          items: { create: orderItemsData },
        },
      })
      for (const it of normItems) {
        await tx.sku.update({
          where: { id: it.skuId },
          data: { stock: { decrement: it.quantity } },
        })
      }
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { used: { increment: 1 } },
        })
      }
      return created
    })

    // fire-and-forget WS 推送：商家端 useMerchantNotifyStream 订阅 'order:new'
    // 推送失败绝不能影响订单创建主流程，所以裹一层 try/catch
    try {
      this.chat.emitOrderNew(merchantId, {
        id: order.id,
        no: order.no,
        merchantId,
        totalAmount: Number(order.totalAmount),
        payAmount: Number(order.payAmount),
        itemsCount: orderItemsData.reduce((s, it) => s + it.quantity, 0),
        status: order.status,
        createdAt: order.createdAt,
      })
    } catch {
      // already wrapped in gateway; 这里防御性兜底
    }

    return { orderId: order.id, orderNo: order.no, payAmount: Number(order.payAmount) }
  }

  /**
   * 用户发起支付：
   *   - method='wechat'（默认/唯一）：调微信支付 JSAPI 拿 prepay 参数，前端用 uni.requestPayment 调起
   *   - 非生产 + 商户号未配齐时：返回 mock prepay + 立即标订单已付（仅供本地预览）
   *
   * 真正"付款成功"的标记由微信回调 /api/v1/payments/wechat/notify 触发；
   * 这个接口只负责"准备付款参数"。
   *
   * 生产环境（NODE_ENV=production）严禁 mockPaid，必须等真实回调；否则商户号未配齐
   * 时直接抛错给前端，绝不静默把订单标已付。
   */
  async payOrder(userId: string, id: string, _method: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'pending_payment') {
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单状态不允许支付')
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const openid = user?.openid || ''
    const isProd = process.env.NODE_ENV === 'production'

    // 生产环境且商户号未配齐：立刻拒绝，不进 mock 通路
    if (isProd && !this.wxpay.isReady()) {
      throw new BizException(BizCode.BUSINESS_ERROR, '微信支付未配置，暂时无法下单，请联系商家')
    }

    // 生产环境必须有真实 openid，否则无法走微信小程序原生支付
    if (isProd && !openid) {
      throw new BizException(BizCode.INVALID_PARAMS, '当前账号未绑定微信，请先绑定微信后再支付')
    }

    // createMiniPay 内部也会在生产环境二次拦截，避免任何旁路
    const pay = await this.wxpay.createMiniPay({
      outTradeNo: o.no,
      description: `订单 ${o.no}`,
      totalFen: Math.round(Number(o.payAmount) * 100),
      openid,
      attach: o.id,
    })

    // 非生产 + 商户号未配齐 → mock 模式：保留预览体验，立即标已付
    if (!isProd && !this.wxpay.isReady()) {
      const paidAt = new Date()
      await this.prisma.payment.create({
        data: { orderId: o.id, method: 'wechat', amount: o.payAmount, status: 'success', paidAt },
      })
      await this.prisma.order.update({
        where: { id: o.id },
        data: { status: 'pending_shipment', paymentMethod: 'wechat', paidAt },
      })
      // 与生产回调路径保持一致：通知商家"已付款待发货"
      try {
        this.chat.emitOrderUpdate(o.merchantId, {
          orderId: o.id,
          no: o.no,
          status: 'pending_shipment',
          updatedAt: paidAt,
          mockPaid: true,
        })
      } catch {}
      return { ok: true, mockPaid: true, miniPay: pay }
    }

    return { ok: true, mockPaid: false, miniPay: pay }
  }

  async confirmOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'shipped') throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单尚未发货')
    const completedAt = new Date()
    await this.prisma.order.update({
      where: { id: o.id },
      data: { status: 'completed', completedAt },
    })
    try {
      this.chat.emitOrderUpdate(o.merchantId, {
        orderId: o.id,
        no: o.no,
        status: 'completed',
        updatedAt: completedAt,
      })
    } catch {}
    return { ok: true }
  }

  async cancelOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (!['pending_payment', 'pending_shipment'].includes(o.status)) {
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '当前状态不允许取消')
    }

    // 取消时必须回滚 SKU 库存，否则会出现"用户疯狂下单 → 取消"刷库存的耗竭攻击。
    // 状态改写 + 每条 item 的库存 increment 放进同一个事务，确保原子。
    const cancelledAt = new Date()
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: o.id },
        data: { status: 'cancelled', cancelledAt },
      })
      for (const it of o.items) {
        await tx.sku.update({
          where: { id: it.skuId },
          data: { stock: { increment: it.quantity } },
        })
      }
    })
    try {
      this.chat.emitOrderUpdate(o.merchantId, {
        orderId: o.id,
        no: o.no,
        status: 'cancelled',
        updatedAt: cancelledAt,
      })
    } catch {}
    return { ok: true }
  }

  /**
   * 催发货
   *
   * 真实实现：
   *   1. 校验订单存在且状态在【待发货】，避免无意义催单
   *   2. 同一订单 30 分钟内只允许催 1 次（写在 SystemConfig 简单去重）
   *   3. 通过商家会话给商家发一条文本提醒（直接落 ChatMessage，前端商家端可见）
   *
   * 全部走真实持久化，无 mock。
   */
  async urgeOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'pending_shipment') {
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单当前状态无需催发货')
    }

    // 30 分钟去重
    const dedupKey = `urge:order:${id}`
    const prior = await this.prisma.systemConfig.findUnique({ where: { key: dedupKey } })
    const lastAt = (prior?.value as any)?.lastAt ? new Date((prior?.value as any).lastAt) : null
    if (lastAt && Date.now() - lastAt.getTime() < 30 * 60_000) {
      return { ok: true, urged: true, dedup: true }
    }
    await this.prisma.systemConfig.upsert({
      where: { key: dedupKey },
      update: { value: { lastAt: new Date().toISOString(), userId } as any },
      create: { key: dedupKey, value: { lastAt: new Date().toISOString(), userId } as any },
    })

    // 给商家发一条催发货消息（若没有会话则建一个）
    const session = await this.ensureChatSession(userId, o.merchantId)
    await this.chatSend(userId, session.id, 'text', `用户催发货：订单 ${o.no}`)

    return { ok: true, urged: true, dedup: false }
  }

  // ========== Banner ==========
  async banners() {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'banners' } })
    return v?.value || []
  }

  // ========== 热搜词 ==========
  /**
   * 用户端搜索页 hot-keywords 接口
   *
   * 优先从 SystemConfig key='hot_keywords' 读管理员配置（value 接受字符串数组
   * 或 { list: string[] } 两种 shape，兼容前后端约定差异），否则返回内置兜底词。
   *
   * 返回纯 string[]，前端 take(N) 自行截断。
   */
  async hotKeywords(): Promise<string[]> {
    const DEFAULTS = ['咖啡', '奶茶', '螺蛳粉', '面包', '烧烤', '水果', '蔬菜', '早餐']
    try {
      const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'hot_keywords' } })
      const raw = cfg?.value as any
      let list: string[] = []
      if (Array.isArray(raw)) list = raw
      else if (raw && Array.isArray(raw.list)) list = raw.list
      list = list.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
      if (list.length > 0) return list
    } catch {
      // SystemConfig 读取失败一律回退默认词，保证前端始终有词可显
    }
    return DEFAULTS
  }

  // ========== 地址 ==========
  /**
   * 校验 token 中的 userId 在 DB 仍存在（数据库 reseed 后旧 token 会指向已删除的用户）。
   * 不存在时抛 TOKEN_EXPIRED（code=2002），前端会清 token 跳登录页。
   */
  private async assertUserExists(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!u) throw new BizException(BizCode.TOKEN_EXPIRED, '登录状态已失效，请重新登录')
    return u
  }

  /** 地址字段白名单（防止前端误传 id/userId/createdAt 等保留字段触发 Prisma 错误） */
  private sanitizeAddressDto(dto: any) {
    const name = String(dto?.name ?? '').trim()
    const phone = String(dto?.phone ?? '').trim()
    const region = String(dto?.region ?? '').trim()
    const detail = String(dto?.detail ?? '').trim()
    const isDefault = Boolean(dto?.isDefault)
    if (!name || !phone || !region || !detail) {
      throw new BizException(
        BizCode.INVALID_PARAMS,
        '请填写完整的收货地址（姓名/手机号/地区/详细地址）',
      )
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
    }
    return { name, phone, region, detail, isDefault }
  }

  async listAddresses(userId: string) {
    await this.assertUserExists(userId)
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
  }
  async defaultAddress(userId: string) {
    await this.assertUserExists(userId)
    const a = await this.prisma.address.findFirst({ where: { userId, isDefault: true } })
    return (
      a ||
      (await this.prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }))
    )
  }
  async createAddress(userId: string, dto: any) {
    await this.assertUserExists(userId)
    const data = this.sanitizeAddressDto(dto)
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
    }
    return this.prisma.address.create({ data: { ...data, userId } })
  }
  async updateAddress(userId: string, id: string, dto: any) {
    await this.assertUserExists(userId)
    // 确保只能改自己的地址
    const exist = await this.prisma.address.findFirst({
      where: { id, userId },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '地址不存在或无权限')
    const data = this.sanitizeAddressDto(dto)
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
    }
    return this.prisma.address.update({ where: { id }, data })
  }
  async removeAddress(userId: string, id: string) {
    await this.assertUserExists(userId)
    await this.prisma.address.deleteMany({ where: { id, userId } })
    return { ok: true }
  }

  // ========== 收藏 ==========
  async listFavorites(userId: string) {
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      include: { product: true },
    })
    return favs.map((f) => ({
      id: f.id,
      productId: f.productId,
      name: f.product.name,
      image: f.product.images[0] || '',
      price: Number(f.product.priceRetailMin),
    }))
  }
  async addFavorite(userId: string, productId: string) {
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    })
    return { ok: true }
  }
  async removeFavorite(userId: string, id: string) {
    await this.prisma.favorite.deleteMany({ where: { id, userId } })
    return { ok: true }
  }

  // ========== 优惠券（用户端可领取/可用列表） ==========
  /**
   * 列出所有用户可领取/可使用的优惠券
   * - status='active'（商户已上线）
   * - 当前北京时间在 [validFrom, validTo] 之内
   * - 库存未发放完（received < stock，或 stock = 0 视为无限量）
   * - 返回 { list, total } 结构与前端期望一致
   */
  async listAvailableCoupons() {
    const now = new Date()
    const all = await this.prisma.coupon.findMany({
      where: {
        status: 'active',
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const usable = all.filter((c) => c.stock === 0 || c.received < c.stock)
    return {
      list: usable.map((c) => decimalToNumber(c)),
      total: usable.length,
    }
  }

  /**
   * 用户领取优惠券
   *
   * 由于当前 Prisma schema 没有独立 UserCoupon 中间表(详见 README 数据模型设计),
   * 这里用 SystemConfig 作为最小可用方案兜底:
   *   - key 形如 `user_coupon:<userId>:<couponId>` → value: { count, ids: [], claimedAt }
   *     ids 记录每张券的唯一编号(便于后续核销),count 用于查"已领几张"做 perUserLimit 检查
   *
   * 业务校验:
   *   1. 券存在 + 状态 active + 在有效期内
   *   2. 总库存(stock=0 即不限)还剩余
   *   3. 用户已领数量 < perUserLimit(同样 0 视为不限,但保底视为至少 1)
   *   4. Coupon.received 原子 +1(用 update 的 increment,避免并发超领)
   *
   * 后续升级路径:把 SystemConfig 兼容层迁到正式 UserCoupon 表(userId + couponId + status + usedAt)
   * 即可获得完整核销追踪能力,且本接口对外形状不变。
   */
  async claimCoupon(userId: string, couponId: string) {
    if (!userId) throw new BizException(BizCode.UNAUTHORIZED, '未登录')
    const now = new Date()
    const c = await this.prisma.coupon.findUnique({ where: { id: couponId } })
    if (!c) throw new BizException(BizCode.NOT_FOUND, '优惠券不存在')
    if (c.status !== 'active') {
      throw new BizException(BizCode.BUSINESS_ERROR, '优惠券未上架或已下架')
    }
    if (c.validFrom > now || c.validTo < now) {
      throw new BizException(BizCode.BUSINESS_ERROR, '优惠券不在有效期内')
    }
    if (c.stock > 0 && c.received >= c.stock) {
      throw new BizException(BizCode.BUSINESS_ERROR, '优惠券已被领完')
    }
    const cfgKey = `user_coupon:${userId}:${couponId}`
    const exist = await this.prisma.systemConfig.findUnique({ where: { key: cfgKey } })
    const claimed = (exist?.value as any)?.count || 0
    const limit = c.perUserLimit > 0 ? c.perUserLimit : 1
    if (claimed >= limit) {
      throw new BizException(BizCode.BUSINESS_ERROR, `每人最多领 ${limit} 张,已达上限`)
    }
    // 生成本张券的唯一编号(后续核销时用),格式 'UC' + base36 时间戳 + 随机 6 位
    const ucNo = `UC${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const nextIds = [...((exist?.value as any)?.ids || []), ucNo]
    // 原子更新 Coupon.received 防超领
    await this.prisma.$transaction([
      this.prisma.coupon.update({ where: { id: couponId }, data: { received: { increment: 1 } } }),
      this.prisma.systemConfig.upsert({
        where: { key: cfgKey },
        update: {
          value: {
            count: claimed + 1,
            ids: nextIds,
            claimedAt: now.toISOString(),
          } as any,
        },
        create: {
          key: cfgKey,
          value: { count: 1, ids: [ucNo], claimedAt: now.toISOString() } as any,
        },
      }),
    ])
    return { ok: true, no: ucNo, count: claimed + 1 }
  }

  /**
   * 我的优惠券列表（汇总用户已领的所有券 + 关联券基础信息）
   *
   * 实现策略：
   *   - 拿 SystemConfig 里 key 形如 `user_coupon:<userId>:%` 的所有条目
   *   - 解析出 couponId,批量取 Coupon 关联信息
   *   - 当前 Prisma 不支持 LIKE，用 startsWith 等价（PostgreSQL 实际生成 ILIKE）
   *
   * 后续若迁到 UserCoupon 表，此查询会变成简单的 join + filter，无需多层处理。
   */
  async myCoupons(userId: string) {
    if (!userId) return { list: [], total: 0 }
    const prefix = `user_coupon:${userId}:`
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: prefix } },
      take: 200,
    })
    if (!rows.length) return { list: [], total: 0 }
    const couponIds = rows.map((r) => r.key.slice(prefix.length))
    const coupons = await this.prisma.coupon.findMany({
      where: { id: { in: couponIds } },
      include: { merchant: { select: { id: true, name: true } } },
    })
    const cmap = new Map(coupons.map((c) => [c.id, c]))
    const now = new Date()
    const list = rows
      .map((r) => {
        const cid = r.key.slice(prefix.length)
        const c = cmap.get(cid)
        if (!c) return null
        const claimed = (r.value as any) || {}
        const expired = c.validTo < now
        return {
          couponId: c.id,
          name: c.name,
          type: c.type,
          amount: c.amount != null ? Number(c.amount) : null,
          discountPercent: c.discountPercent,
          threshold: c.threshold != null ? Number(c.threshold) : null,
          merchantId: c.merchantId,
          merchantName: c.merchant?.name || '',
          validFrom: c.validFrom,
          validTo: c.validTo,
          count: claimed.count || 0,
          ids: claimed.ids || [],
          claimedAt: claimed.claimedAt || null,
          status: expired ? 'expired' : c.status,
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
    return { list, total: list.length }
  }

  // ========== 预约量尺 ==========
  async submitBooking(userId: string | null, dto: any) {
    const b = await this.prisma.booking.create({
      data: {
        userId: userId || null,
        contactName: dto.name || dto.contactName,
        contactPhone: dto.phone || dto.contactPhone,
        address: dto.address,
        scheduledAt: new Date(dto.appointAt || dto.scheduledAt),
        spaceTypes: dto.space ? [dto.space] : dto.spaceTypes || [],
        remark: dto.remark,
      },
    })
    return { ok: true, ticketId: b.id }
  }

  // ========== 推广 ==========
  async promoteSummary(userId: string) {
    const cms = await this.prisma.commission.findMany({ where: { userId } })
    const total = cms.reduce((s, c) => s + Number(c.amount), 0)
    const now = new Date()
    const thisMonth = cms
      .filter(
        (c) =>
          c.createdAt.getMonth() === now.getMonth() &&
          c.createdAt.getFullYear() === now.getFullYear(),
      )
      .reduce((s, c) => s + Number(c.amount), 0)
    const pending = cms
      .filter((c) => c.status === 'pending')
      .reduce((s, c) => s + Number(c.amount), 0)
    return { total, thisMonth, pending, people: 0, orderCount: cms.length, conversion: 0 }
  }

  async promoteOrders(userId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const [list, total] = await Promise.all([
      this.prisma.commission.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { order: true },
      }),
      this.prisma.commission.count({ where: { userId } }),
    ])
    return buildPage(
      list.map((c) => ({
        id: c.id,
        orderNo: c.order.no,
        amount: Number(c.amount),
        createdAt: c.createdAt,
      })),
      total,
      page,
      pageSize,
    )
  }

  // ========== 附近门店 ==========
  /**
   * 附近门店列表
   *
   * - 仅返回 status='active' + 含真实经纬度（latitude/longitude 非 null）的门店
   * - 若客户端传 lat/lng（小程序 uni.getLocation 的真实坐标），按 Haversine 公式
   *   计算真实直线距离（km），并按距离升序排序、截取前 20 条
   * - 若客户端未传坐标，distance 字段返回 null，由前端自行展示「未授权定位」
   *   绝不再用 Math.random() / 任何写死坐标兜底
   */
  async nearbyStores(q: { lat?: number | string; lng?: number | string } = {}) {
    const userLat = q.lat !== undefined && q.lat !== '' ? Number(q.lat) : NaN
    const userLng = q.lng !== undefined && q.lng !== '' ? Number(q.lng) : NaN
    const hasUserLoc = Number.isFinite(userLat) && Number.isFinite(userLng)

    const stores = await this.prisma.store.findMany({
      where: {
        status: 'active',
        latitude: { not: null },
        longitude: { not: null },
      },
      take: 200,
    })

    const list = stores.map((s) => {
      const lat = s.latitude as number
      const lng = s.longitude as number
      let distance: number | null = null
      if (hasUserLoc) {
        distance = haversineKm(userLat, userLng, lat, lng)
      }
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        distance,
        phone: s.phone,
        lat,
        lng,
      }
    })

    if (hasUserLoc) {
      list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    }
    return list.slice(0, 20)
  }

  // ========== 入驻申请 ==========
  async merchantApply(userId: string | null, dto: any) {
    if (!userId) throw new BizException(BizCode.UNAUTHORIZED, '请先登录')
    const exists = await this.prisma.merchant.findUnique({ where: { userId } })
    if (exists) throw new BizException(BizCode.CONFLICT, '已提交入驻申请')
    const m = await this.prisma.merchant.create({
      data: {
        userId,
        type: dto.type || 'store',
        name: dto.name || dto.legalName,
        legalName: dto.legalName || dto.name,
        creditCode: dto.creditCode || '',
        legalRep: dto.legalRep || '',
        contact: dto.contact || dto.legalRep || '',
        contactPhone: dto.contactPhone || dto.phone || '',
        region: dto.region || '',
        address: dto.address || '',
        businessLicense: dto.businessLicense || '',
        qualifications: dto.qualifications || [],
        categories: dto.categories || [],
        status: 'pending',
      },
    })
    return { ok: true, applyId: m.id }
  }

  // ========== 店铺价格规则 (user-mp 端读取) ==========
  async shopPriceRule(merchantId: string) {
    const cfg = await this.prisma.systemConfig.findUnique({
      where: { key: `shop:${merchantId}:priceRule` },
    })
    const DEFAULT = {
      guestAllow: false,
      customerPrice: 'retail',
      agencyPrice: 'wholesale',
      memberPrice: 'member',
    }
    return { ...DEFAULT, ...((cfg?.value as any) || {}) }
  }

  /**
   * 当前用户在某店铺的价格分级身份。
   *
   * priceTier 是按 (merchantId, userId) 维度配置的(商家在「客户管理」里给客户标 member/agency),
   * 存在 SystemConfig key=cust_tier_<merchantId>_<userId> 里。useShopPriceRule 之前用
   * `user.role==='member' || user.isMember===true` 判断 —— User 表根本没有这俩字段,
   * 商家设的等级永远到不了用户端;这里把这条链路接通。
   *
   *  - factory/store/merchant 角色 → 直接 agency(代理人天然能看批发价)
   *  - SystemConfig.priceTier=='member'|'vip' → member
   *  - SystemConfig.priceTier=='agency'|'wholesale' → agency
   *  - 其它 → customer
   */
  async myTierInShop(userId: string, merchantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { myTier: 'guest' as const, priceAuthorized: false }
    if (['factory', 'store', 'merchant'].includes(user.role)) {
      return { myTier: 'agency' as const, priceAuthorized: true }
    }
    const [tierCfg, authCfg] = await Promise.all([
      this.prisma.systemConfig.findUnique({
        where: { key: `cust_tier_${merchantId}_${userId}` },
      }),
      this.prisma.systemConfig.findUnique({
        where: { key: `cust_auth_${merchantId}_${userId}` },
      }),
    ])
    const priceTier = String((tierCfg?.value as any)?.priceTier ?? 'retail').toLowerCase()
    const priceAuthorized = !!(authCfg?.value as any)?.authorized
    let myTier: 'customer' | 'member' | 'agency' = 'customer'
    if (priceTier === 'member' || priceTier === 'vip') myTier = 'member'
    else if (priceTier === 'agency' || priceTier === 'wholesale') myTier = 'agency'
    return { myTier, priceAuthorized }
  }

  // ========== 在线客服（用户端） ==========

  async chatSessions(userId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: { merchant: { select: { id: true, name: true } } },
    })
    const out: any[] = []
    for (const s of sessions) {
      const last = await this.prisma.chatMessage.findFirst({
        where: { sessionId: s.id },
        orderBy: { createdAt: 'desc' },
      })
      out.push({
        id: s.id,
        merchantId: s.merchantId,
        merchantName: s.merchant?.name || '商户',
        lastContent: last?.content || '',
        lastSender: last?.sender || '',
        lastAt: last?.createdAt || s.lastMessageAt,
        unreadCount: s.unreadCount,
        status: s.status,
      })
    }
    return out
  }

  async ensureChatSession(userId: string, merchantId: string) {
    // 必须由调用方明确指定 merchantId（前端要么从店铺详情进入，要么从订单详情发起）。
    // 之前 fallback "随便挑一个 active 商户" 会让用户莫名其妙开到一家陌生店的客服会话，
    // 既污染商家的客服面板（陌生用户消息），又给了攻击者枚举 merchantId 的入口。
    if (!merchantId) {
      throw new BizException(BizCode.INVALID_PARAMS, '请从店铺进入客服')
    }
    const existing = await this.prisma.chatSession.findUnique({
      where: { userId_merchantId: { userId, merchantId } },
    })
    if (existing) return { id: existing.id, merchantId: existing.merchantId }
    const created = await this.prisma.chatSession.create({
      data: { userId, merchantId, status: 'open' },
    })
    return { id: created.id, merchantId: created.merchantId }
  }

  async chatMessages(userId: string, sessionId: string) {
    const s = await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '会话不存在')
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
  }

  async chatSend(userId: string, sessionId: string, type: string, content: string) {
    const s = await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '会话不存在')
    const m = await this.prisma.chatMessage.create({
      data: { sessionId, sender: 'user', type, content, read: false },
    })
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    })
    // 同步推送给房间内的所有 WS（包括商家端）；HTTP 链路之前只写 DB，对方要等下次轮询才看得到 → P1 体验断点
    // fire-and-forget：失败不影响 HTTP 主流程
    try {
      this.chat.emitChatMessage(sessionId, m)
    } catch {}
    return m
  }

  async chatMarkRead(userId: string, sessionId: string) {
    const s = await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '会话不存在')
    await this.prisma.chatMessage.updateMany({
      where: { sessionId, sender: 'merchant', read: false },
      data: { read: true },
    })
    return { ok: true }
  }

  // ========== 购物车 ==========
  /**
   * 列出当前用户购物车
   *
   * 包含商品 / SKU 摘要（图片、名称、规格、价格、库存），方便前端直接渲染。
   * 同时把过期下架商品/SKU 自动剔除展示（不删 DB，避免误删），保持视图整洁。
   */
  async listCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            status: true,
            priceRetailMin: true,
            merchantId: true,
          },
        },
        sku: {
          select: {
            id: true,
            specsLabel: true,
            priceRetail: true,
            stock: true,
            active: true,
          },
        },
      },
    })
    return items.map((it) => ({
      id: it.id,
      productId: it.productId,
      skuId: it.skuId,
      quantity: it.quantity,
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
            image: it.product.images?.[0] || '',
            status: it.product.status,
            merchantId: it.product.merchantId,
          }
        : null,
      sku: it.sku
        ? {
            id: it.sku.id,
            specsLabel: it.sku.specsLabel,
            price: Number(it.sku.priceRetail),
            stock: it.sku.stock,
            active: it.sku.active,
          }
        : null,
      // 整条是否仍可下单（前端给灰禁用 + 提示用）
      available:
        !!it.product &&
        it.product.status === 'active' &&
        !!it.sku &&
        it.sku.active &&
        it.sku.stock > 0,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }))
  }

  /**
   * 添加到购物车
   *
   * - 必须传 productId；skuId 可选，未传时取该商品任一启用 SKU 兜底（避免数据库 NOT NULL 报错）
   * - 已存在同 (userId, skuId) → 在原数量上 +quantity（受 SKU.stock 上限保护）
   * - 不存在则 create
   *
   * 校验：商品 + SKU 必须真实存在，并属于同一商品；quantity ≥ 1
   */
  async addCart(userId: string, dto: { productId: string; skuId?: string; quantity?: number }) {
    const productId = String(dto?.productId || '').trim()
    if (!productId) throw new BizException(BizCode.INVALID_PARAMS, '缺少商品 ID')
    const qty = Math.max(1, Math.floor(Number(dto?.quantity ?? 1)))
    if (!Number.isFinite(qty)) throw new BizException(BizCode.INVALID_PARAMS, '数量必须为正整数')

    const product = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    if (product.status !== 'active') {
      throw new BizException(BizCode.PRODUCT_OFFLINE, '商品已下架')
    }

    // skuId 兜底：取该商品任一 active SKU
    let sku: { id: string; productId: string; stock: number; active: boolean } | null = null
    if (dto?.skuId) {
      const found = await this.prisma.sku.findUnique({ where: { id: dto.skuId } })
      if (!found || found.productId !== productId) {
        throw new BizException(BizCode.NOT_FOUND, 'SKU 不存在或不属于该商品')
      }
      sku = { id: found.id, productId: found.productId, stock: found.stock, active: found.active }
    } else {
      const fallback = await this.prisma.sku.findFirst({
        where: { productId, active: true },
        orderBy: { createdAt: 'asc' },
      })
      if (!fallback) {
        throw new BizException(BizCode.NOT_FOUND, '该商品暂无可购买规格')
      }
      sku = {
        id: fallback.id,
        productId: fallback.productId,
        stock: fallback.stock,
        active: fallback.active,
      }
    }
    if (!sku.active) {
      throw new BizException(BizCode.PRODUCT_OFFLINE, '该规格已下架')
    }

    // upsert by (userId, skuId)；已存在则数量累加，且不超过库存
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_skuId: { userId, skuId: sku.id } },
    })
    const targetQty = (existing?.quantity || 0) + qty
    if (sku.stock > 0 && targetQty > sku.stock) {
      throw new BizException(BizCode.STOCK_INSUFFICIENT, `库存不足，最多可加 ${sku.stock} 件`)
    }
    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: targetQty },
      })
    }
    return this.prisma.cartItem.create({
      data: { userId, productId, skuId: sku.id, quantity: qty },
    })
  }

  /**
   * 修改购物车某条数量
   *
   * - 必须属于当前用户（防越权改别人购物车）
   * - quantity ≥ 1（如要清零请走 removeCart）
   * - 超过 SKU 库存上限会拒绝（防"无限堆数量"绕过下单校验）
   */
  async updateCart(userId: string, id: string, dto: { quantity: number }) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id, userId },
      include: { sku: { select: { stock: true, active: true } } },
    })
    if (!item) throw new BizException(BizCode.NOT_FOUND, '购物车条目不存在或无权限')

    const qty = Math.floor(Number(dto?.quantity ?? 0))
    if (!Number.isFinite(qty) || qty < 1) {
      throw new BizException(BizCode.INVALID_PARAMS, '数量必须为正整数')
    }
    if (item.sku && item.sku.stock > 0 && qty > item.sku.stock) {
      throw new BizException(BizCode.STOCK_INSUFFICIENT, `库存不足，最多可设 ${item.sku.stock} 件`)
    }
    return this.prisma.cartItem.update({ where: { id }, data: { quantity: qty } })
  }

  /**
   * 删除购物车条目（必须属于当前用户）
   *
   * 使用 deleteMany 双条件，避免按 id 单删时 A 用户能干掉 B 用户的条目
   */
  async removeCart(userId: string, id: string) {
    const r = await this.prisma.cartItem.deleteMany({ where: { id, userId } })
    if (r.count === 0) {
      throw new BizException(BizCode.NOT_FOUND, '购物车条目不存在或无权限')
    }
    return { ok: true }
  }
}
