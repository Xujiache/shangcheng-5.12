import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { withdrawNo, refundNo } from '../../common/utils/id.util'

const QUOTA_KEYS = ['pushSlots', 'banner', 'impression'] as const
type QuotaKey = (typeof QUOTA_KEYS)[number]

@Injectable()
export class MerchantService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取商家 merchantId（user 必须为 factory/store/super-admin） */
  async ensureMerchantId(user: { sub: string; role: string; merchantId?: string }): Promise<string> {
    if (user.merchantId) return user.merchantId
    const m = await this.prisma.merchant.findUnique({ where: { userId: user.sub } })
    if (m) return m.id
    // super-admin 跨工作台支持：用 seed merchant@demo 的商家作为演示绑定
    if (user.role === 'super-admin') {
      const demo = await this.prisma.user.findUnique({
        where: { username: 'merchant@demo' },
        include: { /* nothing */ },
      })
      if (demo) {
        const mer = await this.prisma.merchant.findUnique({ where: { userId: demo.id } })
        if (mer) return mer.id
      }
      const first = await this.prisma.merchant.findFirst({ orderBy: { createdAt: 'asc' } })
      if (first) return first.id
    }
    throw new BizException(BizCode.FORBIDDEN, '当前账号未关联商家')
  }

  // ========== Dashboard / Stats ==========
  async dashboard(merchantId: string) {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0)
    const yesterday0 = new Date(today0.getTime() - 86400_000)

    const [todayOrders, yesterdayOrders, weekOrders, newCustomers, yNewCustomers, topProds] = await Promise.all([
      this.prisma.order.findMany({ where: { merchantId, createdAt: { gte: today0 } } }),
      this.prisma.order.findMany({ where: { merchantId, createdAt: { gte: yesterday0, lt: today0 } } }),
      this.prisma.order.findMany({ where: { merchantId, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
      this.prisma.order.findMany({ where: { merchantId, createdAt: { gte: today0 } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.order.findMany({ where: { merchantId, createdAt: { gte: yesterday0, lt: today0 } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.product.findMany({ where: { merchantId }, orderBy: { sales: 'desc' }, take: 3 }),
    ])

    const pendingShipment = await this.prisma.order.count({ where: { merchantId, status: 'pending_shipment' } })
    const pendingRefund = await this.prisma.refund.count({ where: { merchantId, status: 'pending' } })
    const pendingStoreAuth = await this.prisma.store.count({ where: { merchantId, status: 'pending' } })

    const todaySales = todayOrders.reduce((s, o) => s + Number(o.payAmount), 0)
    const yesterdaySales = yesterdayOrders.reduce((s, o) => s + Number(o.payAmount), 0)

    return {
      today: {
        orders: todayOrders.length,
        ordersDelta: todayOrders.length - yesterdayOrders.length,
        newCustomers: newCustomers.length,
        newCustomersDelta: newCustomers.length - yNewCustomers.length,
        sales: todaySales,
        salesDelta: Math.round(todaySales - yesterdaySales),
      },
      weekSales: Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400_000)
        d.setHours(0, 0, 0, 0)
        const sum = weekOrders
          .filter((o) => o.createdAt >= d && o.createdAt < new Date(d.getTime() + 86400_000))
          .reduce((s, o) => s + Number(o.payAmount), 0)
        return Math.round(sum)
      }),
      todos: {
        pendingShipment,
        pendingRefund,
        pendingStoreAuth,
        pendingStaff: 0,
      },
      plazaHighlights: topProds.map((p) => ({
        productId: p.id,
        productImage: p.images[0] || '',
        price: Number(p.priceRetailMin),
      })),
    }
  }
  async stats(merchantId: string, q: any) {
    const period = q.period || 'today'
    const days = period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1
    const since = new Date(Date.now() - days * 86400_000)
    const orders = await this.prisma.order.findMany({
      where: { merchantId, createdAt: { gte: since } },
      include: { items: { include: { product: { include: { category: true } } } } },
    })

    // 销售趋势：按日聚合
    const bucketSize = days <= 1 ? 1 : days <= 7 ? 1 : days <= 30 ? 1 : 30
    const buckets: { date: string; value: number }[] = []
    const segments = period === 'year' ? 12 : period === 'month' ? 30 : period === 'week' ? 7 : 24
    for (let i = segments - 1; i >= 0; i--) {
      const span = period === 'today' ? 3600_000 : 86400_000
      const segStart = new Date(Date.now() - i * span)
      if (period !== 'today') segStart.setHours(0, 0, 0, 0)
      const segEnd = new Date(segStart.getTime() + span)
      const sum = orders
        .filter((o) => o.createdAt >= segStart && o.createdAt < segEnd)
        .reduce((s, o) => s + Number(o.payAmount), 0)
      const label = period === 'today'
        ? `${String(segStart.getHours()).padStart(2, '0')}:00`
        : period === 'year'
        ? `${segStart.getMonth() + 1}月`
        : `${segStart.getMonth() + 1}/${segStart.getDate()}`
      buckets.push({ date: label, value: Math.round(sum) })
    }

    // 热销 TOP
    const prodSalesMap = new Map<string, { name: string; sales: number }>()
    for (const o of orders) {
      for (const it of o.items) {
        const cur = prodSalesMap.get(it.productId) || { name: it.productName, sales: 0 }
        cur.sales += it.quantity
        prodSalesMap.set(it.productId, cur)
      }
    }
    const topProducts = Array.from(prodSalesMap.entries())
      .map(([productId, v]) => ({ productId, name: v.name, sales: v.sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)

    // 客户新/老分析
    const customerCount = new Map<string, number>()
    for (const o of orders) {
      customerCount.set(o.userId, (customerCount.get(o.userId) || 0) + 1)
    }
    const newCust = Array.from(customerCount.values()).filter((c) => c === 1).length
    const oldCust = Array.from(customerCount.values()).filter((c) => c > 1).length
    const totalCust = newCust + oldCust || 1

    // 分类柱图
    const catMap = new Map<string, number>()
    for (const o of orders) {
      for (const it of o.items) {
        const cName = it.product?.category?.name || '未分类'
        catMap.set(cName, (catMap.get(cName) || 0) + it.quantity)
      }
    }
    const categoryBars = Array.from(catMap.entries()).map(([category, sales]) => ({ category, sales }))

    return {
      period,
      salesTrend: buckets,
      topProducts,
      customerAnalysis: {
        newRatio: newCust / totalCust,
        oldRatio: oldCust / totalCust,
      },
      categoryBars,
    }
  }

  // ========== 商品 ==========
  async listProducts(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.status && q.status !== 'all') where.status = q.status
    if (q.keyword) where.name = { contains: q.keyword, mode: 'insensitive' }
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async productDetail(merchantId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, merchantId }, include: { skus: true } })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    return decimalToNumber(p)
  }
  async createProduct(merchantId: string, dto: any) {
    const { skus = [], ...productData } = dto
    const created = await this.prisma.product.create({
      data: {
        ...productData,
        merchantId,
        priceRetailMin: dto.priceRetailMin ?? 0,
        priceRetailMax: dto.priceRetailMax ?? 0,
        status: dto.status || 'auditing',
        skus: { create: skus },
      },
      include: { skus: true },
    })
    return decimalToNumber(created)
  }
  async updateProduct(merchantId: string, id: string, dto: any) {
    const p = await this.prisma.product.findFirst({ where: { id, merchantId } })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    const { skus, id: _ignore, ...data } = dto
    const upd = await this.prisma.product.update({ where: { id }, data })
    return decimalToNumber(upd)
  }
  async batchStatus(merchantId: string, ids: string[], status: string) {
    await this.prisma.product.updateMany({ where: { id: { in: ids }, merchantId }, data: { status } })
    return { ok: true, affected: ids.length }
  }
  async batchDelete(merchantId: string, ids: string[]) {
    await this.prisma.product.deleteMany({ where: { id: { in: ids }, merchantId } })
    return { ok: true, affected: ids.length }
  }

  // ========== 分类 ==========
  async listCategories(merchantId: string, type: 'platform' | 'merchant' = 'merchant') {
    if (type === 'platform') {
      return this.prisma.category.findMany({ where: { type: 'platform' }, orderBy: { sort: 'asc' } })
    }
    return this.prisma.category.findMany({ where: { type: 'merchant', merchantId }, orderBy: { sort: 'asc' } })
  }
  async createCategory(merchantId: string, dto: any) {
    return this.prisma.category.create({ data: { ...dto, type: 'merchant', merchantId } })
  }
  async updateCategory(merchantId: string, id: string, dto: any) {
    return this.prisma.category.update({ where: { id }, data: dto })
  }
  async deleteCategory(merchantId: string, id: string) {
    await this.prisma.category.delete({ where: { id } })
    return { ok: true }
  }
  async sortCategories(merchantId: string, ids: string[]) {
    for (let i = 0; i < ids.length; i++) {
      await this.prisma.category.update({ where: { id: ids[i] }, data: { sort: i } })
    }
    return { ok: true }
  }

  // ========== 订单 ==========
  async listOrders(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.status && q.status !== 'all') where.status = q.status
    if (q.keyword) where.no = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { items: true, user: true } }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async orderDetail(merchantId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, merchantId }, include: { items: true, payments: true } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    return decimalToNumber(o)
  }
  async ship(merchantId: string, id: string, company: string, trackingNumber: string) {
    const o = await this.prisma.order.findFirst({ where: { id, merchantId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'pending_shipment') throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单状态不允许发货')
    await this.prisma.order.update({ where: { id }, data: { status: 'shipped', trackingCompany: company, trackingNumber, shippedAt: new Date() } })
    return { ok: true }
  }
  async batchShip(merchantId: string, items: { id: string; company: string; trackingNumber: string }[]) {
    for (const it of items) await this.ship(merchantId, it.id, it.company, it.trackingNumber)
    return { ok: true, count: items.length }
  }
  parseAddress(text: string) {
    // 简单解析：找电话、省市、剩余作为详细地址
    const phone = text.match(/1[3-9]\d{9}/)?.[0]
    const phoneless = phone ? text.replace(phone, '') : text
    return {
      name: (phoneless.match(/^([一-龥]{2,4})/) || [])[1] || '',
      phone: phone || '',
      region: '',
      detail: phoneless.trim(),
    }
  }

  // ========== 售后 ==========
  async listRefunds(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.refund.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { order: true, orderItem: true } }),
      this.prisma.refund.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async agreeRefund(merchantId: string, id: string, refundAmount?: number) {
    const r = await this.prisma.refund.findFirst({ where: { id, merchantId } })
    if (!r) throw new BizException(BizCode.NOT_FOUND, '售后单不存在')
    await this.prisma.refund.update({
      where: { id },
      data: { status: 'agreed', refundAmount: refundAmount ?? r.applyAmount },
    })
    return { ok: true }
  }
  async rejectRefund(merchantId: string, id: string, reason: string) {
    await this.prisma.refund.updateMany({ where: { id, merchantId }, data: { status: 'rejected', merchantReply: reason } })
    return { ok: true }
  }

  // ========== 客户 ==========
  async listCustomers(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    // 通过订单关联推导客户
    const orderUsers = await this.prisma.order.findMany({
      where: { merchantId },
      distinct: ['userId'],
      select: { userId: true },
    })
    const userIds = orderUsers.map((o) => o.userId)
    const where: any = { id: { in: userIds } }
    if (q.keyword) where.OR = [{ nickname: { contains: q.keyword } }, { phone: { contains: q.keyword } }]
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ])
    return buildPage(users.map((u) => ({
      id: u.id,
      avatar: u.avatar,
      nickname: u.nickname,
      phone: u.phone,
      kind: u.role === 'promoter' ? 'promoter' : 'normal',
      priceTier: 'retail',
      priceAuthorized: false,
    })), total, page, pageSize)
  }
  async setCustomerPriceTier(merchantId: string, userId: string, priceTier: string) {
    // 真实建议存到独立 CustomerPriceTier 表；当前用 SystemConfig 简化
    const key = `cust_tier_${merchantId}_${userId}`
    await this.prisma.systemConfig.upsert({ where: { key }, update: { value: { priceTier } as any }, create: { key, value: { priceTier } as any } })
    return { ok: true }
  }
  async authorizeCustomer(merchantId: string, userId: string, on: boolean) {
    const key = `cust_auth_${merchantId}_${userId}`
    await this.prisma.systemConfig.upsert({ where: { key }, update: { value: { authorized: on } as any }, create: { key, value: { authorized: on } as any } })
    return { ok: true }
  }

  // ========== 佣金 ==========
  async commissionRules(merchantId: string) {
    const rules = await this.prisma.commissionRule.findMany({ where: { merchantId } })
    const defaultRule = rules.find((r) => !r.productId) || null
    const productRules = rules.filter((r) => r.productId)
    return {
      default: defaultRule ? {
        level1Percent: defaultRule.level1Percent,
        level2Percent: defaultRule.level2Percent,
        visibleToPromoter: defaultRule.visibleToPromoter,
        allowOffline: defaultRule.allowOffline,
        enabled: defaultRule.enabled,
      } : { level1Percent: 5, level2Percent: 2, visibleToPromoter: true, allowOffline: false, enabled: true },
      productRules: productRules.map((r) => ({
        productId: r.productId,
        level1Percent: r.level1Percent,
        level2Percent: r.level2Percent,
      })),
    }
  }
  async saveCommissionRules(merchantId: string, dto: any) {
    if (dto.default) {
      await this.prisma.commissionRule.upsert({
        where: { merchantId_productId: { merchantId, productId: '' } },
        update: dto.default,
        create: { merchantId, productId: null, ...dto.default },
      }).catch(async () => {
        // unique 约束在 (merchantId, productId)，productId 为 null 时单独处理
        const exist = await this.prisma.commissionRule.findFirst({ where: { merchantId, productId: null } })
        if (exist) {
          await this.prisma.commissionRule.update({ where: { id: exist.id }, data: dto.default })
        } else {
          await this.prisma.commissionRule.create({ data: { merchantId, ...dto.default } })
        }
      })
    }
    if (dto.productRules?.length) {
      for (const r of dto.productRules) {
        const exist = await this.prisma.commissionRule.findFirst({ where: { merchantId, productId: r.productId } })
        if (exist) {
          await this.prisma.commissionRule.update({ where: { id: exist.id }, data: r })
        } else {
          await this.prisma.commissionRule.create({ data: { merchantId, ...r } })
        }
      }
    }
    return { ok: true }
  }

  // ========== 提现 ==========
  async listWithdraws(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.withdraw.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: true } }),
      this.prisma.withdraw.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async createWithdraw(userId: string, merchantId: string | null, dto: any) {
    const w = await this.prisma.withdraw.create({
      data: {
        no: withdrawNo(),
        userId,
        merchantId,
        applyAmount: dto.amount,
        method: dto.method || 'wechat',
        account: dto.account,
        status: 'pending',
      },
    })
    return decimalToNumber(w)
  }
  async reviewWithdraw(merchantId: string, id: string, actualAmount: number, remark?: string, remarkTags?: string[]) {
    await this.prisma.withdraw.updateMany({
      where: { id, merchantId },
      data: { status: 'approved', actualAmount, remark, remarkTags: remarkTags || [], reviewedAt: new Date() },
    })
    return { ok: true }
  }
  async rejectWithdraw(merchantId: string, id: string, reason: string) {
    await this.prisma.withdraw.updateMany({ where: { id, merchantId }, data: { status: 'rejected', remark: reason } })
    return { ok: true }
  }
  async balance(merchantId: string) {
    const completed = await this.prisma.order.aggregate({
      where: { merchantId, status: 'completed' },
      _sum: { payAmount: true },
    })
    const withdrawn = await this.prisma.withdraw.aggregate({
      where: { merchantId, status: 'paid' },
      _sum: { actualAmount: true },
    })
    const total = Number(completed._sum.payAmount || 0)
    const out = Number(withdrawn._sum.actualAmount || 0)
    return { total, available: total - out, frozen: 0, withdrawn: out }
  }

  // ========== 门店 ==========
  async listStores(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.keyword) where.name = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.store.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.store.count({ where }),
    ])
    return buildPage(list, total, page, pageSize)
  }
  async createStore(merchantId: string, dto: any) {
    return this.prisma.store.create({ data: { ...dto, merchantId } })
  }
  async removeStore(merchantId: string, id: string) {
    await this.prisma.store.deleteMany({ where: { id, merchantId } })
    return { ok: true }
  }
  async getStoreAuth(merchantId: string, id: string) {
    const s = await this.prisma.store.findFirst({ where: { id, merchantId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '门店不存在')
    return {
      storeId: s.id,
      level: s.level,
      visiblePriceTiers: ['retail', 'wholesale'],
      productPolicies: [],
      authValidFrom: s.authValidFrom,
      authValidTo: s.authValidTo,
      ...(s.authConfig as any || {}),
    }
  }
  async saveStoreAuth(merchantId: string, id: string, dto: any) {
    await this.prisma.store.updateMany({
      where: { id, merchantId },
      data: {
        level: dto.level,
        authValidFrom: dto.authValidFrom ? new Date(dto.authValidFrom) : null,
        authValidTo: dto.authValidTo ? new Date(dto.authValidTo) : null,
        authConfig: dto,
      },
    })
    return { ok: true }
  }

  // ========== 员工 ==========
  async listStaffs(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.keyword) where.name = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.staff.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.staff.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async createStaff(merchantId: string, dto: any) { return this.prisma.staff.create({ data: { ...dto, merchantId } }) }
  async updateStaff(merchantId: string, id: string, dto: any) { return this.prisma.staff.update({ where: { id }, data: dto }) }
  async removeStaff(merchantId: string, id: string) { await this.prisma.staff.deleteMany({ where: { id, merchantId } }); return { ok: true } }

  // ========== 装修 ==========
  async getDecorate(merchantId: string) {
    let d = await this.prisma.shopDecorate.findUnique({ where: { merchantId } })
    if (!d) d = await this.prisma.shopDecorate.create({ data: { merchantId } })
    return d
  }
  async saveDecorate(merchantId: string, dto: any) {
    return this.prisma.shopDecorate.upsert({
      where: { merchantId },
      update: dto,
      create: { ...dto, merchantId },
    })
  }

  // ========== 营销 ==========
  async marketingOverview(merchantId: string) {
    const coupons = await this.prisma.coupon.findMany({ where: { merchantId } })
    return {
      coupons: {
        total: coupons.length,
        active: coupons.filter((c) => c.status === 'active').length,
        received: coupons.reduce((s, c) => s + c.received, 0),
      },
      flashSales: await this.prisma.flashSale.count({ where: { merchantId } }),
      groupBuys: await this.prisma.groupBuy.count({ where: { merchantId } }),
    }
  }
  async marketingCoupons(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.coupon.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  // ========== 聊天 ==========
  async chatSessions(merchantId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { merchantId },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: { user: true },
    })
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.nickname,
      userAvatar: s.user.avatar,
      lastMessageAt: s.lastMessageAt,
      unreadCount: s.unreadCount,
      status: s.status,
    }))
  }
  async chatMessages(merchantId: string, sessionId: string) {
    const s = await this.prisma.chatSession.findFirst({ where: { id: sessionId, merchantId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '会话不存在')
    const msgs = await this.prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, take: 200 })
    return msgs
  }
  async chatSend(merchantId: string, sessionId: string, type: string, content: string) {
    const s = await this.prisma.chatSession.findFirst({ where: { id: sessionId, merchantId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '会话不存在')
    const m = await this.prisma.chatMessage.create({
      data: { sessionId, sender: 'merchant', type, content, read: false },
    })
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { lastMessageAt: new Date() } })
    return m
  }
  async quickReplies(merchantId: string) {
    return this.prisma.quickReply.findMany({ where: { merchantId }, orderBy: { sort: 'asc' } })
  }

  // ========== 选品广场 ==========
  async plazaProducts(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { status: 'active' }
    // 选品广场看其他厂家的商品
    if (q.factoryId) {
      // 厂家详情页只看指定厂家的商品
      where.merchantId = q.factoryId
    } else if (merchantId) {
      where.merchantId = { not: merchantId }
    }
    if (q.keyword) where.name = { contains: q.keyword, mode: 'insensitive' }
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, include: { merchant: true }, orderBy: { sales: 'desc' } }),
      this.prisma.product.count({ where }),
    ])
    return buildPage(list.map((p) => ({
      productId: p.id,
      productName: p.name,
      productImage: p.images[0] || '',
      factoryName: p.merchant.name,
      factoryId: p.merchantId,
      startPrice: Number(p.priceWholesaleMin || p.priceRetailMin),
      agencyCount: 0,
      tags: p.tags,
      isPlatformPushed: false,
      suggestMarkupMin: 20,
      suggestMarkupMax: 40,
      suggestCommission: 5,
    })), total, page, pageSize)
  }
  async plazaFactories(merchantId: string) {
    const factories = await this.prisma.merchant.findMany({
      where: { type: 'factory', status: 'active', id: { not: merchantId } },
      take: 50,
    })
    return factories.map((f) => ({
      id: f.id,
      name: f.name,
      logo: '',
      region: f.region,
      categories: f.categories,
      gmv: Number(f.totalGmv || 0),
      tags: [],
    }))
  }
  async plazaFactory(merchantId: string, id: string) {
    const f = await this.prisma.merchant.findUnique({ where: { id } })
    if (!f) throw new BizException(BizCode.NOT_FOUND, '工厂不存在')
    return {
      id: f.id,
      name: f.name,
      logo: '',
      banner: '',
      region: f.region,
      address: f.address,
      contact: {
        contactName: f.contact,
        phone: f.contactPhone,
        wechat: '',
        email: '',
        address: f.address,
        workTime: '9:00-18:00',
      },
      desc: '',
      categories: f.categories,
      qualifications: f.qualifications.map((q, i) => ({ id: String(i), name: '资质', image: q })),
      tags: [],
      gmv: Number(f.totalGmv || 0),
    }
  }
  async followFactory(merchantId: string, id: string, on: boolean) {
    return { ok: true, followed: on }
  }
  async applyAgency(merchantId: string, dto: any) {
    const app = await this.prisma.agencyApplication.create({
      data: {
        merchantId,
        factoryMerchantId: dto.factoryId,
        productIds: dto.productIds || [],
        markupPercent: dto.markupPercent ?? 30,
        autoSyncPrice: dto.autoSyncPrice ?? true,
        message: dto.message,
        status: 'pending',
      },
    })
    return { ok: true, status: app.status, id: app.id }
  }

  /** 我的代理申请列表（按 status 过滤可选） */
  async myAgencyApplications(merchantId: string, q: { status?: string } = {}) {
    const where: any = { merchantId }
    if (q.status && q.status !== 'all') where.status = q.status
    const apps = await this.prisma.agencyApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    // 展开成「每个商品一条」结构，方便前端按商品维度展示
    const result: any[] = []
    for (const a of apps) {
      const factory = await this.prisma.merchant.findUnique({ where: { id: a.factoryMerchantId } })
      const products = a.productIds.length
        ? await this.prisma.product.findMany({
            where: { id: { in: a.productIds } },
            select: {
              id: true, name: true, images: true,
              priceWholesaleMin: true, priceRetailMin: true,
            },
          })
        : []
      for (const p of products) {
        const factoryPrice = Number(p.priceWholesaleMin ?? p.priceRetailMin ?? 0)
        const myRetailPrice = Math.round(factoryPrice * (1 + a.markupPercent / 100))
        result.push({
          id: `${a.id}:${p.id}`,
          applicationId: a.id,
          productId: p.id,
          productName: p.name,
          productImage: p.images?.[0] ?? '',
          factoryId: a.factoryMerchantId,
          factoryName: factory?.name ?? '',
          factoryPrice,
          myRetailPrice,
          markupRatio: a.markupPercent,
          syncStatus: a.autoSyncPrice ? 'synced' : 'pending',
          status: a.status,
          appliedAt: a.createdAt.toISOString(),
        })
      }
      // 兼容空 productIds：仍然返回一条占位
      if (!products.length) {
        result.push({
          id: a.id,
          applicationId: a.id,
          productId: '',
          productName: '(代理申请整体)',
          productImage: '',
          factoryId: a.factoryMerchantId,
          factoryName: factory?.name ?? '',
          factoryPrice: 0,
          myRetailPrice: 0,
          markupRatio: a.markupPercent,
          syncStatus: a.autoSyncPrice ? 'synced' : 'pending',
          status: a.status,
          appliedAt: a.createdAt.toISOString(),
        })
      }
    }
    return result
  }

  async updateAgencyApplication(
    merchantId: string,
    id: string,
    dto: { myRetailPrice?: number; markupRatio?: number; status?: string },
  ) {
    // 支持复合 id "applicationId:productId"
    const appId = id.includes(':') ? id.split(':')[0] : id
    const app = await this.prisma.agencyApplication.findFirst({ where: { id: appId, merchantId } })
    if (!app) throw new BizException(BizCode.NOT_FOUND, '代理申请不存在')
    const data: any = {}
    if (typeof dto.markupRatio === 'number') data.markupPercent = dto.markupRatio
    if (dto.status && ['pending', 'approved', 'rejected', 'offline'].includes(dto.status)) {
      data.status = dto.status
    }
    if (Object.keys(data).length) {
      await this.prisma.agencyApplication.update({ where: { id: appId }, data })
    }
    return { ok: true }
  }

  async cancelAgencyApplication(merchantId: string, id: string) {
    const appId = id.includes(':') ? id.split(':')[0] : id
    const app = await this.prisma.agencyApplication.findFirst({ where: { id: appId, merchantId } })
    if (!app) throw new BizException(BizCode.NOT_FOUND, '代理申请不存在')
    await this.prisma.agencyApplication.delete({ where: { id: appId } })
    return { ok: true }
  }

  // ========== 商户资料 ==========
  async getProfile(merchantId: string) {
    const m = await this.prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!m) throw new BizException(BizCode.NOT_FOUND, '商户不存在')
    return {
      shopName: m.name,
      merchantNo: m.id.slice(-6).toUpperCase(),
      contactName: m.contact,
      contactPhone: m.contactPhone,
      address: m.address,
      categories: m.categories,
      legalName: m.legalName,
      creditCode: m.creditCode,
      region: m.region,
      level: m.level,
      credit: m.credit,
      status: m.status,
      type: m.type,
      // email / description 来自 SystemConfig 扩展（schema 中无字段）
      email: ((await this.getProfileExtras(merchantId)).email) || '',
      description: ((await this.getProfileExtras(merchantId)).description) || '',
    }
  }

  private async getProfileExtras(merchantId: string): Promise<{ email?: string; description?: string }> {
    const cfg = await this.prisma.systemConfig.findUnique({
      where: { key: `shop:${merchantId}:profile-extras` },
    })
    return (cfg?.value as any) || {}
  }

  async updateProfile(merchantId: string, dto: any) {
    const data: any = {}
    if (typeof dto.shopName === 'string') data.name = dto.shopName
    if (typeof dto.contactName === 'string') data.contact = dto.contactName
    if (typeof dto.contactPhone === 'string') data.contactPhone = dto.contactPhone
    if (typeof dto.address === 'string') data.address = dto.address
    if (Array.isArray(dto.categories)) data.categories = dto.categories
    if (Object.keys(data).length) {
      await this.prisma.merchant.update({ where: { id: merchantId }, data })
    }
    // email / description 没字段，存 SystemConfig
    const extras: any = {}
    if (typeof dto.email === 'string') extras.email = dto.email
    if (typeof dto.description === 'string') extras.description = dto.description
    if (Object.keys(extras).length) {
      const key = `shop:${merchantId}:profile-extras`
      const prior = await this.prisma.systemConfig.findUnique({ where: { key } })
      const merged = { ...(prior?.value as any || {}), ...extras }
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value: merged },
        create: { key, value: merged },
      })
    }
    return this.getProfile(merchantId)
  }

  // ========== 店铺级价格显示规则 ==========
  async getShopPriceRule(merchantId: string) {
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

  async setShopPriceRule(
    merchantId: string,
    dto: {
      guestAllow?: boolean
      customerPrice?: 'retail' | 'hidden'
      agencyPrice?: 'wholesale' | 'retail'
      memberPrice?: 'member' | 'retail'
    },
  ) {
    const key = `shop:${merchantId}:priceRule`
    const prior = await this.prisma.systemConfig.findUnique({ where: { key } })
    const merged = { ...((prior?.value as any) || {}), ...dto }
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged },
    })
    return merged
  }

  // ========== 功能开关 ==========
  async resolveFeatureFlags(merchantId: string) {
    const flags = await this.prisma.featureFlag.findMany()
    const overrides = await this.prisma.merchantFeatureOverride.findMany({ where: { merchantId } })
    const overrideMap = new Map(overrides.map((o) => [o.flagKey, o.enabled]))

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } })
    const result: any = { homeEntry: {}, roleButton: {}, sideMenu: {} }

    for (const f of flags) {
      let enabled = f.defaultEnabled
      if (overrideMap.has(f.key)) {
        enabled = overrideMap.get(f.key)!
      } else {
        // 受众过滤
        if (f.audience === 'factory' && merchant?.type !== 'factory') enabled = false
        if (f.audience === 'store' && merchant?.type !== 'store') enabled = false
        if (f.audience === 'specific' && !f.specificMerchantIds.includes(merchantId)) enabled = false
        // 灰度比例
        if (enabled && f.grayPercent < 100) {
          if (!f.grayWhitelist.includes(merchantId)) {
            const hash = merchantId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100
            if (hash >= f.grayPercent) enabled = false
          }
        }
      }
      const groupKey = f.group === 'home_entry' ? 'homeEntry' : f.group === 'role_button' ? 'roleButton' : 'sideMenu'
      const shortKey = f.key.split('.').slice(-1)[0]
      result[groupKey][shortKey] = enabled
    }
    return result
  }

  // ========== 会员 ==========
  async memberPlans() {
    return decimalToNumber(await this.prisma.memberPlan.findMany({ where: { status: 'active' }, orderBy: { sort: 'asc' } }))
  }
  async myMembership(merchantId: string) {
    const m = await this.prisma.merchantMembership.findFirst({
      where: { merchantId, status: { in: ['trial', 'active'] } },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    })
    return m ? decimalToNumber(m) : null
  }
  async quota(merchantId: string) {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    let q = await this.prisma.usageQuota.findFirst({
      where: { merchantId, periodStart: { lte: now }, periodEnd: { gte: now } },
    })
    if (!q) {
      // 根据当前订阅生成
      const m = await this.myMembership(merchantId)
      const limits = (m as any)?.plan?.constraints || { pushSlots: 10, bannerLimit: 3, impressionLimit: 10000 }
      q = await this.prisma.usageQuota.create({
        data: {
          merchantId,
          periodStart,
          periodEnd,
          pushSlotsLimit: limits.pushSlots ?? 0,
          bannerLimit: limits.bannerLimit ?? 0,
          impressionLimit: limits.impressionLimit ?? 0,
          data: limits,
        },
      })
    }
    return q
  }
  async myPayments(merchantId: string) {
    return decimalToNumber(await this.prisma.paymentRecord.findMany({ where: { merchantId }, orderBy: { createdAt: 'desc' }, take: 100 }))
  }
  async membershipNotices(merchantId: string) {
    const q = await this.quota(merchantId)
    const notices: any[] = []
    if (q.pushSlotsLimit > 0 && q.pushSlotsUsed >= q.pushSlotsLimit * 0.8) {
      notices.push({ type: 'warn', text: `广场推荐次数已用 ${q.pushSlotsUsed}/${q.pushSlotsLimit}`, link: '/merchant/member' })
    }
    if (q.bannerLimit > 0 && q.bannerUsed >= q.bannerLimit) {
      notices.push({ type: 'error', text: 'Banner 配额已用尽', link: '/merchant/member' })
    }
    return notices
  }
  async subscribe(merchantId: string, dto: { planId: string; payMethod?: string }) {
    const plan = await this.prisma.memberPlan.findUnique({ where: { id: dto.planId } })
    if (!plan) throw new BizException(BizCode.NOT_FOUND, '套餐不存在')
    const startAt = new Date()
    const endAt = new Date(startAt)
    if (plan.period === 'monthly') endAt.setMonth(endAt.getMonth() + plan.periodCount)
    else if (plan.period === 'yearly') endAt.setFullYear(endAt.getFullYear() + plan.periodCount)
    else if (plan.period === 'weekly') endAt.setDate(endAt.getDate() + 7 * plan.periodCount)
    else if (plan.period === 'daily') endAt.setDate(endAt.getDate() + plan.periodCount)
    else endAt.setFullYear(endAt.getFullYear() + 100)

    const sub = await this.prisma.merchantMembership.create({
      data: { merchantId, planId: plan.id, planCode: plan.code, startAt, endAt, status: 'active' },
    })
    await this.prisma.paymentRecord.create({
      data: {
        no: `MP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        merchantId,
        planId: plan.id,
        planName: plan.name,
        planType: plan.type,
        amount: plan.price,
        paymentMethod: dto.payMethod || 'wechat',
        status: 'paid',
        paidAt: new Date(),
      },
    })
    return { ok: true, subscription: decimalToNumber(sub) }
  }
  async cancelSub(merchantId: string) {
    await this.prisma.merchantMembership.updateMany({
      where: { merchantId, status: { in: ['trial', 'active'] } },
      data: { status: 'expired' },
    })
    return { ok: true }
  }
  async setAutoRenew(merchantId: string, autoRenew: boolean) {
    await this.prisma.merchantMembership.updateMany({
      where: { merchantId, status: { in: ['trial', 'active'] } },
      data: { autoRenew },
    })
    return { ok: true }
  }
  async useQuota(merchantId: string, key: string, count = 1) {
    const q = await this.quota(merchantId)
    const map: Record<string, { used: string; limit: string }> = {
      pushSlots: { used: 'pushSlotsUsed', limit: 'pushSlotsLimit' },
      banner: { used: 'bannerUsed', limit: 'bannerLimit' },
      bannerLimit: { used: 'bannerUsed', limit: 'bannerLimit' },
      impression: { used: 'impressionUsed', limit: 'impressionLimit' },
      impressionLimit: { used: 'impressionUsed', limit: 'impressionLimit' },
    }
    const m = map[key]
    if (!m) throw new BizException(BizCode.INVALID_PARAMS, `未知配额 key: ${key}`)
    const used = (q as any)[m.used] as number
    const limit = (q as any)[m.limit] as number
    if (limit > 0 && used + count > limit) {
      return { ok: false, reason: '配额不足', quota: q }
    }
    await this.prisma.usageQuota.update({ where: { id: q.id }, data: { [m.used]: { increment: count } } as any })
    const refreshed = await this.quota(merchantId)
    return { ok: true, quota: refreshed }
  }
  async releaseQuota(merchantId: string, key: string, count = 1) {
    const q = await this.quota(merchantId)
    const map: Record<string, string> = {
      pushSlots: 'pushSlotsUsed', banner: 'bannerUsed', bannerLimit: 'bannerUsed', impression: 'impressionUsed', impressionLimit: 'impressionUsed',
    }
    const field = map[key]
    if (!field) throw new BizException(BizCode.INVALID_PARAMS, `未知配额 key: ${key}`)
    await this.prisma.usageQuota.update({ where: { id: q.id }, data: { [field]: { decrement: count } } as any })
    return { ok: true, quota: await this.quota(merchantId) }
  }
}
