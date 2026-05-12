import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { orderNo } from '../../common/utils/id.util'
import { WxPayService } from '../payment/wxpay.service'

@Injectable()
export class UserMpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wxpay: WxPayService,
  ) {}

  // ========== 商品 ==========
  async listProducts(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { status: 'active' }
    if (q.keyword) where.name = { contains: q.keyword, mode: 'insensitive' }
    if (q.categoryId) where.categoryId = q.categoryId
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy: { sales: 'desc' } }),
      this.prisma.product.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
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

    const shippingFee = shippingMethod === 'pickup' ? 0 : 10
    // dto.coupon 旧字段（数字 = 优惠金额）；dto.couponDiscount 新字段
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
