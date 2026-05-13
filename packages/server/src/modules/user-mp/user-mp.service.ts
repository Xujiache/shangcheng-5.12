import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { orderNo } from '../../common/utils/id.util'
import { WxPayService } from '../payment/wxpay.service'
import { ChatGateway } from '../chat/chat.gateway'

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
    if (typeof dto.nickname === 'string' && dto.nickname.trim()) data.nickname = dto.nickname.trim().slice(0, 32)
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
    if (!/^1[3-9]\d{9}$/.test(phone)) throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
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
      throw new BizException(BizCode.BUSINESS_ERROR, '该手机号已被其他账号绑定，请直接使用手机号登录')
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

    // 复用环境变量与降级策略
    const appid = process.env.WX_MINIAPP_APPID
    const secret = process.env.WX_MINIAPP_SECRET
    let openid: string | null = null
    let unionid: string | null = null
    if (appid && secret) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(dto.code)}&grant_type=authorization_code`
        const r = await fetch(url, { method: 'GET' })
        const data: any = await r.json()
        if (data?.errcode && data.errcode !== 0) {
          throw new BizException(BizCode.INVALID_PARAMS, `微信授权失败：${data.errmsg || data.errcode}`)
        }
        if (data?.openid) {
          openid = data.openid
          unionid = data.unionid || null
        }
      } catch (e: any) {
        if (e instanceof BizException) throw e
        // fall through
      }
    }
    if (!openid) {
      // 与 wechatLogin 一致的开发期兜底
      openid = `wx_${String(dto.code).slice(0, 16)}`
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
    const cats = await this.prisma.category.findMany({ where: { type: 'platform' }, orderBy: { sort: 'asc' } })
    return cats
  }

  // ========== 订单 ==========
  async listOrders(userId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { userId }
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { items: true } }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  async orderDetail(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId }, include: { items: true, payments: true } })
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
    // 兼容：couponId 字符串（指向 Coupon.id）；dto.coupon 旧字段是优惠金额（数字），不当 couponId
    const couponId = typeof dto.couponId === 'string' ? dto.couponId : null

    if (!dto.addressId) throw new BizException(BizCode.INVALID_PARAMS, '缺少收货地址')
    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } })
    if (!address) throw new BizException(BizCode.NOT_FOUND, '地址不存在')

    const skuIds = normItems.map((i) => i.skuId)
    const skus = await this.prisma.sku.findMany({ where: { id: { in: skuIds } }, include: { product: true } })
    if (skus.length !== normItems.length) throw new BizException(BizCode.NOT_FOUND, '部分 SKU 不存在')

    let totalAmount = 0
    let merchantId = ''
    const orderItemsData = normItems.map((it) => {
      const sku = skus.find((s) => s.id === it.skuId)!
      if (sku.stock < it.quantity) throw new BizException(BizCode.STOCK_INSUFFICIENT, `${sku.product.name} 库存不足`)
      merchantId = sku.product.merchantId
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
    const couponDiscount = Number(dto.couponDiscount ?? dto.coupon ?? 0)
    const payAmount = Math.max(0, totalAmount + shippingFee - couponDiscount)

    const order = await this.prisma.order.create({
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

    // 扣减库存
    for (const it of normItems) {
      await this.prisma.sku.update({ where: { id: it.skuId }, data: { stock: { decrement: it.quantity } } })
    }

    return { orderId: order.id, orderNo: order.no, payAmount: Number(order.payAmount) }
  }

  /**
   * 用户发起支付：
   *   - method='wechat'（默认/唯一）：调微信支付 JSAPI 拿 prepay 参数，前端用 uni.requestPayment 调起
   *   - 商户号未配齐时，返回 mock prepay + 立即把订单标记为已付（保持预览体验）
   *
   * 真正"付款成功"的标记由微信回调 /api/v1/payments/wechat/notify 触发；
   * 这个接口只负责"准备付款参数"。
   */
  async payOrder(userId: string, id: string, _method: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'pending_payment') {
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单状态不允许支付')
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const openid = user?.openid || ''

    // 调 WxPay 生成小程序调起支付参数
    const pay = await this.wxpay.createMiniPay({
      outTradeNo: o.no,
      description: `订单 ${o.no}`,
      totalFen: Math.round(Number(o.payAmount) * 100),
      openid,
      attach: o.id,
    })

    // 商户号未配齐 → mock 模式：直接把订单设为已付，保留预览体验
    if (!this.wxpay.isReady()) {
      await this.prisma.payment.create({
        data: { orderId: o.id, method: 'wechat', amount: o.payAmount, status: 'success', paidAt: new Date() },
      })
      await this.prisma.order.update({
        where: { id: o.id },
        data: { status: 'pending_shipment', paymentMethod: 'wechat', paidAt: new Date() },
      })
      return { ok: true, mockPaid: true, miniPay: pay }
    }

    return { ok: true, mockPaid: false, miniPay: pay }
  }

  async confirmOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'shipped') throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单尚未发货')
    await this.prisma.order.update({ where: { id: o.id }, data: { status: 'completed', completedAt: new Date() } })
    return { ok: true }
  }

  async cancelOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (!['pending_payment', 'pending_shipment'].includes(o.status)) {
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '当前状态不允许取消')
    }
    await this.prisma.order.update({ where: { id: o.id }, data: { status: 'cancelled', cancelledAt: new Date() } })
    return { ok: true }
  }

  async urgeOrder(userId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    return { ok: true }
  }

  // ========== Banner ==========
  async banners() {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'banners' } })
    return v?.value || []
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
      throw new BizException(BizCode.INVALID_PARAMS, '请填写完整的收货地址（姓名/手机号/地区/详细地址）')
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
    }
    return { name, phone, region, detail, isDefault }
  }

  async listAddresses(userId: string) {
    await this.assertUserExists(userId)
    return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })
  }
  async defaultAddress(userId: string) {
    await this.assertUserExists(userId)
    const a = await this.prisma.address.findFirst({ where: { userId, isDefault: true } })
    return a || (await this.prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }))
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
    const exist = await this.prisma.address.findFirst({ where: { id, userId }, select: { id: true } })
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
    const favs = await this.prisma.favorite.findMany({ where: { userId }, include: { product: true } })
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
      .filter((c) => c.createdAt.getMonth() === now.getMonth() && c.createdAt.getFullYear() === now.getFullYear())
      .reduce((s, c) => s + Number(c.amount), 0)
    const pending = cms.filter((c) => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0)
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
  async nearbyStores() {
    const stores = await this.prisma.store.findMany({ where: { status: 'active' }, take: 20 })
    return stores.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      distance: Math.random() * 5,
      phone: s.phone,
      lat: s.latitude || 31.23,
      lng: s.longitude || 121.47,
    }))
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
    if (!merchantId) {
      const m = await this.prisma.merchant.findFirst({ where: { status: 'active' } })
      if (!m) throw new BizException(BizCode.NOT_FOUND, '当前无可用商户')
      merchantId = m.id
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
}
