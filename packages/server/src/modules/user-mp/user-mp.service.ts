import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { orderNo, refundNo } from '../../common/utils/id.util'
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
   *
   * sort 排序字段（修复 P0-15 之前永远按 sales desc）：
   *   - 'price-asc'  → 价格升序（priceRetailMin asc）
   *   - 'price-desc' → 价格降序（priceRetailMin desc）
   *   - 'sales'      → 销量降序（默认行为，前端"综合"按钮）
   *   - 'newest'     → 上架时间倒序（createdAt desc）
   *   - 其他/未传    → 与 'sales' 一致（向后兼容）
   */
  async listProducts(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    // 自动通过(auto_approved) = 已上架可售，与 active 等价对用户可见
    const where: any = { status: { in: ['active', 'auto_approved'] } }
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

    const sort = String(q?.sort || '').trim()
    let orderBy: any
    switch (sort) {
      case 'price-asc':
        orderBy = { priceRetailMin: 'asc' }
        break
      case 'price-desc':
        orderBy = { priceRetailMin: 'desc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'sales':
      default:
        orderBy = { sales: 'desc' }
    }

    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy }),
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
    // expiresIn (秒) 计算 —— user-mp 待付款倒计时直接消费该字段
    // 只在 pending_payment 状态下有意义，其他状态返回 null 避免误导
    let expiresIn: number | null = null
    if (o.status === 'pending_payment' && o.expiresAt) {
      const diff = Math.floor((o.expiresAt.getTime() - Date.now()) / 1000)
      expiresIn = diff > 0 ? diff : 0
    }
    return decimalToNumber({ ...o, expiresIn })
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
      bySize: it.bySize as { length?: number; width?: number; area?: number } | undefined,
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

    // ===== 价格分级解析（资金安全 P0）=====
    // 之前固定按 sku.priceRetail 计价，会让会员/代理客户被收原价；同时未校验店铺规则
    // (是否允许游客购买 / 是否禁卖 / 是否拉黑该客户)。
    //
    // 修复后链路：
    //   1. 买家在该店铺被商家拉黑 → 直接 FORBIDDEN
    //   2. 取 buyer 在该店的 tier（myTierInShop：customer/member/agency/guest）
    //   3. 取店铺级 priceRule（guestAllow/customerPrice/agencyPrice/memberPrice）
    //   4. guest=guestAllow=false → 拒绝
    //   5. 任意 tier 的价格策略 == 'hidden' → 拒绝（隐藏价格意味着不可下单）
    //   6. 按 tier→strategy 映射出 'retail' | 'wholesale' | 'member'，
    //      最终选 sku.priceRetail / priceWholesale / priceMember 作为成交价
    //
    // 由此商家在「客户管理」给某买家标 agency，并把店铺规则设置成 agencyPrice=wholesale
    // 后，该客户下单实际入账金额会按 priceWholesale 计算，不再是 priceRetail。
    const blacklistCfg = await this.prisma.systemConfig.findUnique({
      where: { key: `merchant:${merchantId}:blacklist:${userId}` },
    })
    if (!!(blacklistCfg?.value as any)?.blocked) {
      throw new BizException(BizCode.FORBIDDEN, '抱歉，您已被该店铺加入黑名单，无法下单')
    }
    const { myTier } = await this.myTierInShop(userId, merchantId)
    const shopRule = await this.shopPriceRule(merchantId)
    if (myTier === 'guest' && shopRule.guestAllow === false) {
      throw new BizException(BizCode.FORBIDDEN, '该店铺不对游客开放，请先登录')
    }
    // 按 tier 查"价格策略" key；映射 guest 走 customerPrice（同未授权用户）
    const tierStrategy: 'retail' | 'wholesale' | 'member' | 'hidden' =
      myTier === 'member'
        ? (shopRule.memberPrice as any) || 'member'
        : myTier === 'agency'
          ? (shopRule.agencyPrice as any) || 'wholesale'
          : (shopRule.customerPrice as any) || 'retail'
    if (tierStrategy === 'hidden') {
      throw new BizException(BizCode.FORBIDDEN, '该店铺禁止当前身份直接下单，请联系商家')
    }
    const pickUnitPrice = (sku: { priceRetail: any; priceWholesale: any; priceMember: any }) => {
      if (tierStrategy === 'wholesale') return Number(sku.priceWholesale)
      if (tierStrategy === 'member') return Number(sku.priceMember)
      return Number(sku.priceRetail)
    }

    let totalAmount = 0
    const orderItemsData = normItems.map((it) => {
      const sku = skus.find((s) => s.id === it.skuId)!
      if (sku.stock < it.quantity)
        throw new BizException(BizCode.STOCK_INSUFFICIENT, `${sku.product.name} 库存不足`)

      let unitPrice: number
      let specsLabel = sku.specsLabel
      if (sku.product.pricingMode === 'by-size') {
        // 按尺寸定价：成交价一律服务端按"面积 × 单价 + 基础费"重算，绝不信前端金额；
        // 同时把用户定制尺寸写进 specsLabel 持久化，避免下单后查不到要做多大。
        const length = Number(it.bySize?.length)
        const width = Number(it.bySize?.width)
        if (!(length > 0) || !(width > 0)) {
          throw new BizException(BizCode.INVALID_PARAMS, `${sku.product.name} 请填写定制尺寸`)
        }
        const p = sku.product
        if (
          (p.minLength != null && length < Number(p.minLength)) ||
          (p.maxLength != null && length > Number(p.maxLength)) ||
          (p.minWidth != null && width < Number(p.minWidth)) ||
          (p.maxWidth != null && width > Number(p.maxWidth))
        ) {
          throw new BizException(
            BizCode.INVALID_PARAMS,
            `${sku.product.name} 定制尺寸超出可制作范围`,
          )
        }
        const toM = p.sizeUnit === 'cm' ? 0.01 : 1 // 统一换算到米后算平方米
        const areaSqm = length * toM * (width * toM)
        unitPrice =
          Math.round((areaSqm * Number(p.pricePerSqm || 0) + Number(p.baseFee || 0)) * 100) / 100
        specsLabel = `定制 ${length}×${width}${p.sizeUnit || ''}（${areaSqm.toFixed(2)}㎡）`
        if (!(unitPrice > 0)) {
          throw new BizException(
            BizCode.BUSINESS_ERROR,
            `${sku.product.name} 定制价格计算异常，请联系商家`,
          )
        }
      } else {
        unitPrice = pickUnitPrice(sku)
        if (!(unitPrice > 0)) {
          // 价格异常（如商家未填该 tier 的价格、价格为 0/NaN）一律拒单，绝不按 0 元成交
          throw new BizException(
            BizCode.BUSINESS_ERROR,
            `${sku.product.name} 当前身份暂无可用价格，请联系商家`,
          )
        }
      }
      totalAmount += unitPrice * it.quantity
      return {
        productId: sku.productId,
        skuId: sku.id,
        productName: sku.product.name,
        productImage: sku.product.images[0] || '',
        specsLabel,
        unitPrice,
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
        // discountPercent 语义统一：0~1 小数,表示"折后比例"
        //   - 0.85 → 打 85 折(消费者付 85%,抵扣 15%)
        //   - 0.5  → 打 5 折(消费者付 50%,抵扣 50%)
        //   - 1    → 不打折
        //   - 0    → 全免单
        // 历史数据兼容：若误存成 0~100 范围(如 85),按 /100 自动归一化
        const raw = Number(coupon.discountPercent)
        const ratio = raw > 1 ? raw / 100 : raw
        const clamped = Math.max(0, Math.min(1, ratio))
        const offRate = 1 - clamped
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
        // 原子条件扣减：UPDATE ... SET stock = stock - N WHERE id=? AND stock >= N。
        // 并发下单的失败方拿到 count===0 → 抛错回滚整个事务（含已建订单），
        // 杜绝两单都过事务外预检(第 439 行)后把库存扣成负数的超卖。
        // 事务外的预检只是快路径错误提示，真正的库存守门在这条原子写。
        const dec = await tx.sku.updateMany({
          where: { id: it.skuId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        })
        if (dec.count === 0) {
          const cur = skus.find((s) => s.id === it.skuId)
          throw new BizException(
            BizCode.STOCK_INSUFFICIENT,
            `${cur?.product?.name ?? '商品'} 库存不足`,
          )
        }
      }
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { used: { increment: 1 } },
        })
      }
      return created
    })

    // 标记该券为"已使用"（best-effort，失败不影响下单）：取该用户这张券最早领取的
    // 一条未使用 UserCoupon 行，按主键 no 核销（status='used' + usedAt/orderId/orderNo），
    // 使「我的优惠券 · 已使用」tab 正确显示
    // （之前只递增 Coupon.used，从不写 per-user 核销，导致已使用列表永远为空）。
    if (couponId) {
      try {
        const free = await this.prisma.userCoupon.findFirst({
          where: { userId, couponId, status: 'unused' },
          orderBy: { claimedAt: 'asc' },
        })
        if (free) {
          await this.prisma.userCoupon.update({
            where: { no: free.no },
            data: { status: 'used', usedAt: new Date(), orderId: order.id, orderNo: order.no },
          })
        }
      } catch {
        // best-effort：核销流水写失败不影响下单主流程
      }
    }

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
   *
   * 真正"付款成功"的标记由微信回调 /api/v1/payments/wechat/notify 触发；
   * 这个接口只负责"准备付款参数"。
   *
   * 严格安全策略（资金 P0）：
   *   - 不分环境：微信支付未配置(`wxpay.isReady()=false`) → 一律 BizException 拒绝。
   *   - 严禁任何 mockPaid 路径把订单标已付。开发期商家想本地联调请配真实沙箱凭证。
   *   - openid 缺失 → 拒绝，避免在 wxpay 这一层才抛底层错。
   */
  async payOrder(userId: string, id: string, _method: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'pending_payment') {
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单状态不允许支付')
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const openid = user?.openid || ''

    // 商户号未配齐 → 立刻拒绝，运维需配齐 WX_PAY_* 环境变量
    if (!this.wxpay.isReady()) {
      throw new BizException(BizCode.BUSINESS_ERROR, '未配置支付通道，请联系运维配置微信支付')
    }

    if (!openid) {
      throw new BizException(BizCode.INVALID_PARAMS, '当前账号未绑定微信，请先绑定微信后再支付')
    }

    let pay
    try {
      pay = await this.wxpay.createMiniPay({
        outTradeNo: o.no,
        description: `订单 ${o.no}`,
        totalFen: Math.round(Number(o.payAmount) * 100),
        openid,
        attach: o.id,
      })
    } catch (e: any) {
      throw new BizException(BizCode.PAY_FAILED, `微信支付下单失败：${e?.message || e}`)
    }

    return { ok: true, miniPay: pay }
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

  /**
   * 用户发起售后/退款（功能残缺 P0-13）
   *
   * 之前用户端的售后弹窗仅前端 toast 假装成功，订单状态从来没改成 after_sale，
   * 商家也收不到售后单 —— 整条售后链路是断的。
   *
   * 现在实现：
   *   1. 校验订单存在 + 归属 + 状态可发起售后（已付/已发/已完成都允许）
   *   2. 校验申请金额合法（必须 > 0 且 ≤ 实付金额）
   *   3. 在一个事务里：
   *      - 创建 Refund 记录 status=pending
   *      - 把 Order.status 设为 'after_sale'（先存一个原状态用于商家拒单后回滚）
   *   4. fire-and-forget 推商家"新售后单"通知
   *
   * 注：Refund 需要 orderItemId，schema 是 1:1 关联 OrderItem。
   * 单订单含多 SKU 时，用户实际想退指定行；前端 dto.orderItemId 显式传时按显式来，
   * 否则取订单第一条 item 兜底（更精细的"逐行退款"可后续扩展为多条 Refund）。
   */
  async refundOrder(
    userId: string,
    id: string,
    dto: {
      reason: string
      amount?: number
      orderItemId?: string
      description?: string
      evidence?: string[]
      type?: 'refund_only' | 'refund_with_return'
    },
  ) {
    const reason = String(dto?.reason || '').trim()
    if (!reason) throw new BizException(BizCode.INVALID_PARAMS, '请填写售后原因')
    const o = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')

    const allowedStatus = ['pending_shipment', 'shipped', 'completed']
    if (!allowedStatus.includes(o.status)) {
      throw new BizException(
        BizCode.ORDER_STATUS_INVALID,
        '当前订单状态不允许发起售后（仅已付款/已发货/已完成订单可申请）',
      )
    }

    if (!o.items || o.items.length === 0) {
      throw new BizException(BizCode.BUSINESS_ERROR, '订单缺少商品项，无法发起售后')
    }

    let target = o.items[0]
    if (dto?.orderItemId) {
      const found = o.items.find((it) => it.id === dto.orderItemId)
      if (!found) throw new BizException(BizCode.NOT_FOUND, '指定订单项不存在')
      target = found
    }

    const payAmount = Number(o.payAmount)
    const applyAmount =
      typeof dto?.amount === 'number' && !Number.isNaN(dto.amount) ? Number(dto.amount) : payAmount
    if (!(applyAmount > 0)) {
      throw new BizException(BizCode.INVALID_PARAMS, '退款金额必须大于 0')
    }
    if (applyAmount > payAmount) {
      throw new BizException(BizCode.INVALID_PARAMS, '退款金额不能超过订单实付金额')
    }

    // 防重复发起：同订单已存在 pending/agreed/in_progress 的 Refund → 拒绝
    const dup = await this.prisma.refund.findFirst({
      where: { orderId: o.id, status: { in: ['pending', 'agreed', 'in_progress'] } },
      select: { id: true, status: true },
    })
    if (dup) {
      throw new BizException(BizCode.CONFLICT, '该订单已有进行中的售后单，请勿重复提交')
    }

    const refundType = dto?.type === 'refund_only' ? 'refund_only' : 'refund_with_return'

    // 事务：原子性写入 Refund + 切 Order.status='after_sale'
    const result = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          no: refundNo(),
          orderId: o.id,
          orderItemId: target.id,
          userId: o.userId,
          merchantId: o.merchantId,
          type: refundType,
          reason,
          description: dto?.description ? String(dto.description).slice(0, 500) : null,
          evidence: Array.isArray(dto?.evidence)
            ? dto.evidence.filter((x: any) => typeof x === 'string').slice(0, 9)
            : [],
          applyAmount,
          status: 'pending',
        },
      })
      await tx.order.update({
        where: { id: o.id },
        data: { status: 'after_sale' },
      })
      return refund
    })

    // 商家端 WS 实时推
    try {
      this.chat.emitRefundNew(o.merchantId, {
        refundId: result.id,
        no: result.no,
        orderId: o.id,
        orderNo: o.no,
        status: 'pending',
        applyAmount,
        reason,
        createdAt: result.createdAt,
      })
    } catch {}

    return { ok: true, refundId: result.id, refundNo: result.no, status: 'pending' }
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
   * 持券落正式 UserCoupon 表（一券一行，主键 no）。历史上曾用 SystemConfig
   * key=`user_coupon:<userId>:<couponId>` 的 JSON { count, ids[], claimedAt } 兜底，
   * 已通过 deploy/user-coupon-init.sql 迁移到本表，对外返回形状不变。
   *
   * 业务校验:
   *   1. 券存在 + 状态 active + 在有效期内
   *   2. 总库存(stock=0 即不限)还剩余
   *   3. 用户已领数量(tx 内 count UserCoupon) < perUserLimit(0 视为不限,但保底视为至少 1)
   *   4. Coupon.received 原子 +1(用 update 的 increment,避免并发超领)
   */
  async claimCoupon(userId: string, couponId: string) {
    if (!userId) throw new BizException(BizCode.UNAUTHORIZED, '未登录')
    const now = new Date()

    // 不会竞态的廉价前置校验（券存在 / active / 有效期内 / 全局库存）留在事务外，
    // 这些字段并不依赖"本用户已领数量"，提前拦截可避免无谓开事务。
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

    const limit = c.perUserLimit > 0 ? c.perUserLimit : 1

    // 并发安全核心：把「读本用户已领数量 → 校验 perUserLimit → 写 received+1 / 落持券行」
    // 全部放进同一个 Serializable 交互式事务。两次并发领取会被串行化，
    // 第二次能观察到第一次的写入，从而正确触发"已达上限"。
    // 旧实现把 count 读在事务外，两个请求都读到 count=0 → 双双通过 → 超领。
    const claimOnce = () =>
      this.prisma.$transaction(
        async (tx) => {
          // 生成本张券的唯一编号(后续核销时用),格式 'UC' + base36 时间戳 + 随机 6 位
          const ucNo = `UC${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
          const claimed = await tx.userCoupon.count({ where: { userId, couponId } })
          if (claimed >= limit) {
            throw new BizException(BizCode.BUSINESS_ERROR, `每人最多领 ${limit} 张,已达上限`)
          }
          // 原子更新 Coupon.received 防超领
          await tx.coupon.update({
            where: { id: couponId },
            data: { received: { increment: 1 } },
          })
          await tx.userCoupon.create({ data: { no: ucNo, userId, couponId } })
          return { ok: true as const, no: ucNo, count: claimed + 1 }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )

    // P2034 = Serializable 写冲突（并发事务相互依赖被回滚）。重试一次即可让
    // 落败方重新串行执行，重读最新 count 并正确判定上限；仍冲突则提示稍后再试。
    // 真实业务异常（BizException，如已达上限）直接上抛，绝不重试。
    const isWriteConflict = (e: any) =>
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034'
    try {
      return await claimOnce()
    } catch (e) {
      if (e instanceof BizException) throw e
      if (isWriteConflict(e)) {
        try {
          return await claimOnce()
        } catch (e2) {
          if (e2 instanceof BizException) throw e2
          if (isWriteConflict(e2)) {
            throw new BizException(BizCode.BUSINESS_ERROR, '领取太频繁，请稍后再试')
          }
          throw e2
        }
      }
      throw e
    }
  }

  /**
   * 我的优惠券列表（汇总用户已领的所有券 + 关联券基础信息）
   *
   * 前端 user-mp couponService.my() 类型契约：直接返回 `MyCoupon[]`（不是 PageObject），
   * 每条带 `no`（用户券唯一编号）+ `status: 'unused' | 'used' | 'expired'` +
   * `usedAt?` + `claimedAt`。前端 pages/coupon/my.vue 按 tab 三态过滤显示。
   *
   * 实现策略：
   *   - 查 UserCoupon 单表（一券一行，claimedAt desc），再按去重 couponId 批量补券基础信息
   *   - 状态判定优先级与 SystemConfig 旧实现完全一致："已使用 > 已过期 > 未使用"：
   *     行已核销（status='used' 或 usedAt 非空）→ used；否则 validTo < now → expired；否则 unused
   *   - 支持 query.status 过滤：'unused' | 'used' | 'expired'
   *
   * 历史 SystemConfig 兜底已由 deploy/user-coupon-init.sql 迁入本表。旧实现里
   * "ids 缺失按 count 生成 LEGACY_ 占位 no" 的兜底分支随之删除——表里每行都有真实 no。
   */
  async myCoupons(
    userId: string,
    query: { status?: 'unused' | 'used' | 'expired' } = {},
  ): Promise<
    Array<{
      no: string
      couponId: string
      name: string
      type: string
      amount: number | null
      discountPercent: number | null
      threshold: number | null
      merchantId: string
      merchantName: string
      validFrom: Date
      validTo: Date
      status: 'unused' | 'used' | 'expired'
      usedAt: string | null
      claimedAt: string | null
    }>
  > {
    if (!userId) return []
    // claimedAt desc（最近领到的排前面）由数据库排序保证
    const rows = await this.prisma.userCoupon.findMany({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
      take: 500,
    })
    if (!rows.length) return []

    const couponIds = Array.from(new Set(rows.map((r) => r.couponId)))
    const coupons = await this.prisma.coupon.findMany({
      where: { id: { in: couponIds } },
      include: { merchant: { select: { id: true, name: true } } },
    })
    const cmap = new Map(coupons.map((c) => [c.id, c]))

    const now = new Date()
    const list: Array<{
      no: string
      couponId: string
      name: string
      type: string
      amount: number | null
      discountPercent: number | null
      threshold: number | null
      merchantId: string
      merchantName: string
      validFrom: Date
      validTo: Date
      status: 'unused' | 'used' | 'expired'
      usedAt: string | null
      claimedAt: string | null
    }> = []
    for (const r of rows) {
      const c = cmap.get(r.couponId)
      if (!c) continue
      // "已使用 > 已过期 > 未使用" 优先级，与旧 SystemConfig 实现一致
      const used = r.status === 'used' || r.usedAt != null
      const expired = c.validTo < now
      let status: 'unused' | 'used' | 'expired'
      if (used) status = 'used'
      else if (expired) status = 'expired'
      else status = 'unused'
      list.push({
        no: r.no,
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
        status,
        usedAt: r.usedAt ? r.usedAt.toISOString() : null,
        claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
      })
    }

    // status 过滤
    const want = query?.status
    return want ? list.filter((x) => x.status === want) : list
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
  /**
   * 推广人维度概览
   *
   * 真实统计（之前 people=0 / conversion=0 都是占位）：
   *   - total / thisMonth / pending：commission amount 聚合
   *   - people：commission 关联订单的"去重买家数"（衡量该推广人带来过多少不同顾客）
   *   - orderCount：commission 关联的去重订单数
   *   - conversion：转化率 = 订单数 / 曝光数
   *     当前 schema 没有 promote 曝光埋点表，conversion 暂返回 null 让前端展示"暂无数据"，
   *     避免对外发布"0%"误导推广人。后续若加 promote_click / promote_impression 表，
   *     这里再补真分母。
   */
  async promoteSummary(userId: string) {
    const cms = await this.prisma.commission.findMany({
      where: { userId },
      include: { order: { select: { userId: true } } },
    })
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
    const orderIds = new Set<string>()
    const buyerIds = new Set<string>()
    for (const c of cms) {
      orderIds.add(c.orderId)
      if (c.order?.userId) buyerIds.add(c.order.userId)
    }
    return {
      total: Math.round(total * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      pending: Math.round(pending * 100) / 100,
      people: buyerIds.size,
      orderCount: orderIds.size,
      // 没有曝光埋点表，先返回 null 让前端显示"暂无数据"
      conversion: null,
    }
  }

  /**
   * 推广分享链接
   *
   * 真实链接（之前没有实现）：
   *   - 前端约定 `PROMOTE_LANDING_URL` 环境变量为推广落地页（如商城首页 / 注册页）
   *   - 后端追加 `?ref=<userId>` 给 inviterId 绑定逻辑识别
   *   - 用户首次通过 ?ref=xxx 落地并登录/注册 → User.inviterId 写入
   *
   * 返回结构与前端期望保持兼容：{ url, ref }
   */
  async promoteShareLink(userId: string) {
    if (!userId) throw new BizException(BizCode.UNAUTHORIZED, '请先登录')
    // 校验用户存在 + 没被禁用，否则不给签发推广链接
    const u = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    if (u.status === 'disabled') {
      throw new BizException(BizCode.FORBIDDEN, '当前账号已被禁用，无法生成推广链接')
    }
    const base = (process.env.PROMOTE_LANDING_URL || '').trim()
    if (!base) {
      // 没配置落地页直接抛错，绝不返回 about:blank 这类占位
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '推广落地页未配置，请联系运维设置 PROMOTE_LANDING_URL',
      )
    }
    const sep = base.includes('?') ? '&' : '?'
    return { url: `${base}${sep}ref=${encodeURIComponent(userId)}`, ref: userId }
  }

  /**
   * 推广关系绑定（首次落地 → 登录后调用）
   *
   * 客户端流程：用户通过 ?ref=xxx 进入小程序，前端把 ref 缓存；
   * 登录成功后调用本接口完成 inviterId 绑定（仅首次有效，避免反复改邀请人）。
   */
  async bindInviter(userId: string, inviterId: string) {
    if (!userId) throw new BizException(BizCode.UNAUTHORIZED, '请先登录')
    if (!inviterId) throw new BizException(BizCode.INVALID_PARAMS, '缺少邀请人 ID')
    if (inviterId === userId) {
      throw new BizException(BizCode.INVALID_PARAMS, '不能将自己设为邀请人')
    }
    const me = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!me) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    if (me.inviterId) {
      // 已绑定过 → 幂等返回，不允许覆盖
      return { ok: true, inviterId: me.inviterId, alreadyBound: true }
    }
    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } })
    if (!inviter) throw new BizException(BizCode.NOT_FOUND, '邀请人不存在')
    if (inviter.status === 'disabled') {
      throw new BizException(BizCode.FORBIDDEN, '邀请人账号已被禁用')
    }
    await this.prisma.user.update({ where: { id: userId }, data: { inviterId } })
    return { ok: true, inviterId, alreadyBound: false }
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

  /**
   * 推广分佣规则正文（前端 user-mp 推广页"规则"弹窗使用）
   *
   * 数据源：SystemConfig key='promote.rules' value={ body: string, updatedAt?: string }
   * 前端 PromoteRules 契约：{ body: string, updatedAt?: string } | null
   * 未配置返回 null；前端会显示"详情请咨询平台客服"兜底文案。
   *
   * 严格零硬编码：绝不在后端写死 "一级 8% / 二级 3%" 等百分比文案 —— 业务可能随时调整。
   * 平台管理员通过 `POST /p/system/settings` 写入 promote.rules 配置。
   */
  async promoteRules(): Promise<{ body: string; updatedAt?: string } | null> {
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'promote.rules' } })
    if (!cfg) return null
    const raw = cfg.value as any
    // 兼容两种存储形态：纯字符串 / { body, updatedAt? } 对象
    let body = ''
    let updatedAt: string | undefined
    if (typeof raw === 'string') {
      body = raw.trim()
    } else if (raw && typeof raw === 'object') {
      body = typeof raw.body === 'string' ? raw.body.trim() : ''
      updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
    }
    if (!body) return null
    return updatedAt ? { body, updatedAt } : { body, updatedAt: cfg.updatedAt.toISOString() }
  }

  /**
   * 公开系统设置（user-mp 端可访问；脱敏后的平台公开配置）
   *
   * 数据源：SystemConfig key='system_settings' value.service 子对象 + 备用独立 key 兜底
   * 前端 SystemSettings 契约：
   *   { customerServiceWechat?: string | null,
   *     customerServicePhone?: string | null,
   *     customerServiceHours?: string | null,
   *     customerServiceEmail?: string | null,
   *     icp?: string | null,
   *     [k]: unknown }
   * 未配置字段返 null；前端按 null=未提供降级展示，绝不硬编码客服联系方式。
   *
   * 安全：绝不暴露 SystemConfig 全量（避免泄露 IP 白名单 / 密码策略 / business 内部配置）。
   * 只白名单"对用户公开"的字段。
   */
  async systemSettings() {
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })
    const raw = (cfg?.value as any) || {}
    const service = (raw.service as any) || {}
    const site = (raw.site as any) || {}
    // 多 key 兜底：旧数据可能把客服信息直接挂在顶层，新数据规范挂在 service.* 下
    const wechat =
      service.customerServiceWechat ?? service.wechat ?? raw.customerServiceWechat ?? null
    const phone = service.customerServicePhone ?? service.phone ?? raw.customerServicePhone ?? null
    const hours =
      service.customerServiceHours ?? service.workTime ?? raw.customerServiceHours ?? null
    const email = service.customerServiceEmail ?? service.email ?? raw.customerServiceEmail ?? null
    const icp = site.icp ?? raw.icp ?? null
    return {
      customerServiceWechat: wechat || null,
      customerServicePhone: phone || null,
      customerServiceHours: hours || null,
      customerServiceEmail: email || null,
      icp: icp || null,
      siteName: site.name || null,
    }
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
   *
   * 字段契约 P0：SKU 响应统一返回 `{ priceRetail, priceWholesale, priceMember }` 三个字段，
   * 不再返回含糊的 `price` 字段。前端按 myTier + shopPriceRule 自己选展示哪个价。
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
            priceWholesale: true,
            priceMember: true,
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
            priceRetail: Number(it.sku.priceRetail),
            priceWholesale: Number(it.sku.priceWholesale),
            priceMember: Number(it.sku.priceMember),
            stock: it.sku.stock,
            active: it.sku.active,
          }
        : null,
      // 整条是否仍可下单（前端给灰禁用 + 提示用）
      available:
        !!it.product &&
        ['active', 'auto_approved'].includes(it.product.status) &&
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
    // auto_approved（自动免审上架）与 active 同属"在售可购"，与列表/详情可见性、立即购买保持一致，
    // 否则会出现"能立即购买却不能加购物车"的自相矛盾。
    if (!['active', 'auto_approved'].includes(product.status)) {
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
