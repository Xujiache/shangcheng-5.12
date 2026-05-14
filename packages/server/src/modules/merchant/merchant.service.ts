import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { withdrawNo, refundNo, membershipNo } from '../../common/utils/id.util'
import { WxPayService } from '../payment/wxpay.service'
import { ChatGateway } from '../chat/chat.gateway'

const QUOTA_KEYS = ['pushSlots', 'banner', 'impression'] as const
type QuotaKey = (typeof QUOTA_KEYS)[number]

/**
 * Product 表第一类字段白名单 —— 防止前端误传 schema 不认的字段（如 freeShipping）
 * 触发 PrismaClientValidationError。所有 by-size 字段都是首类列，已纳入白名单，
 * 不需要 extraConfig 兜底。
 */
const PRODUCT_WRITABLE_FIELDS = [
  'name',
  'description',
  'images',
  'detailImages',
  'detailHtml',
  'tags',
  'categoryId',
  'merchantCategoryId',
  'priceRetailMin',
  'priceRetailMax',
  'priceWholesaleMin',
  'priceWholesaleMax',
  'priceMemberMin',
  'priceMemberMax',
  'pricingMode',
  'pricePerSqm',
  'baseFee',
  'sizeUnit',
  'minLength',
  'minWidth',
  'maxLength',
  'maxWidth',
  'totalStock',
  'shipping',
  'priceDisplayRules',
  'status',
  'rejectReason',
] as const

function pickProductFields(dto: any): Record<string, any> {
  if (!dto || typeof dto !== 'object') return {}
  const out: Record<string, any> = {}
  for (const k of PRODUCT_WRITABLE_FIELDS) {
    if (k in dto && dto[k] !== undefined) out[k] = dto[k]
  }
  return out
}

@Injectable()
export class MerchantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wxpay: WxPayService,
    private readonly chat: ChatGateway,
  ) {}

  /**
   * 获取商家 merchantId（user 必须为 factory/store/super-admin）
   *
   * super-admin 跨工作台访问：
   *   - 非生产环境：可以回退到 seed 的 merchant@demo 演示商户，便于本地联调
   *   - 生产环境：禁止任何"演示商户"兜底；super-admin 想操作商户功能必须显式绑定，
   *     否则一律抛 FORBIDDEN，避免误把平台管理员的操作写到第一个真实商户上。
   */
  async ensureMerchantId(user: {
    sub: string
    role: string
    merchantId?: string
  }): Promise<string> {
    if (user.merchantId) return user.merchantId
    const m = await this.prisma.merchant.findUnique({ where: { userId: user.sub } })
    if (m) return m.id
    if (user.role === 'super-admin' && process.env.NODE_ENV !== 'production') {
      const demo = await this.prisma.user.findUnique({
        where: { username: 'merchant@demo' },
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
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    const yesterday0 = new Date(today0.getTime() - 86400_000)

    const [todayOrders, yesterdayOrders, weekOrders, newCustomers, yNewCustomers, topProds] =
      await Promise.all([
        this.prisma.order.findMany({ where: { merchantId, createdAt: { gte: today0 } } }),
        this.prisma.order.findMany({
          where: { merchantId, createdAt: { gte: yesterday0, lt: today0 } },
        }),
        this.prisma.order.findMany({
          where: { merchantId, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
        }),
        this.prisma.order.findMany({
          where: { merchantId, createdAt: { gte: today0 } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.order.findMany({
          where: { merchantId, createdAt: { gte: yesterday0, lt: today0 } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.product.findMany({
          where: { merchantId },
          orderBy: { sales: 'desc' },
          take: 3,
        }),
      ])

    const pendingShipment = await this.prisma.order.count({
      where: { merchantId, status: 'pending_shipment' },
    })
    const pendingRefund = await this.prisma.refund.count({
      where: { merchantId, status: 'pending' },
    })
    const pendingStoreAuth = await this.prisma.store.count({
      where: { merchantId, status: 'pending' },
    })

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
    // 锚点日期：若前端传 q.date（如 '2026-05-14'）则以该日为窗口右端，否则以"现在"为锚点。
    // 这样商家可以回看任意历史日期的报表，而不是永远只能看到滚动到"今天"的窗口。
    const anchor = q.date ? new Date(String(q.date)) : new Date()
    if (Number.isNaN(anchor.getTime())) {
      throw new BizException(BizCode.INVALID_PARAMS, 'date 格式错误')
    }
    const since = new Date(anchor.getTime() - days * 86400_000)
    const until = new Date(anchor.getTime())
    const orders = await this.prisma.order.findMany({
      where: { merchantId, createdAt: { gte: since, lte: until } },
      include: { items: { include: { product: { include: { category: true } } } } },
    })

    // 销售趋势：按日聚合（锚点决定每个 bucket 的时间基准，确保历史查询也能正确分桶）
    const bucketSize = days <= 1 ? 1 : days <= 7 ? 1 : days <= 30 ? 1 : 30
    const buckets: { date: string; value: number }[] = []
    const segments = period === 'year' ? 12 : period === 'month' ? 30 : period === 'week' ? 7 : 24
    for (let i = segments - 1; i >= 0; i--) {
      const span = period === 'today' ? 3600_000 : 86400_000
      const segStart = new Date(anchor.getTime() - i * span)
      if (period !== 'today') segStart.setHours(0, 0, 0, 0)
      const segEnd = new Date(segStart.getTime() + span)
      const sum = orders
        .filter((o) => o.createdAt >= segStart && o.createdAt < segEnd)
        .reduce((s, o) => s + Number(o.payAmount), 0)
      const label =
        period === 'today'
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
    const categoryBars = Array.from(catMap.entries()).map(([category, sales]) => ({
      category,
      sales,
    }))

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
    const p = await this.prisma.product.findFirst({
      where: { id, merchantId },
      include: { skus: true },
    })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    return decimalToNumber(p)
  }
  /**
   * 商家添加商品
   *
   * 字段白名单：admin-pc 表单透传 freeShipping 等 schema 不认的字段，直接展开会
   * 触发 PrismaClientValidationError → 整条商品落不下来。这里只挑 Product 模型
   * 真实声明的列（含 pricingMode/pricePerSqm/baseFee/sizeUnit/minLength 等 by-size
   * 第一类列），其余忽略。
   *
   * skus 单独从 dto 抽出，走嵌套 create；规格行字段（specs/specsLabel/priceRetail/
   * priceWholesale/priceMember/stock/active）由 Prisma Sku 模型自行校验，无需在此白名单。
   */
  async createProduct(merchantId: string, dto: any) {
    const skus = Array.isArray(dto?.skus) ? dto.skus : []
    const data = pickProductFields(dto)
    // data 用 any 断言绕过 Prisma "必填字段缺失" 的类型推断 —— 因为白名单返回的是
    // Record<string, any>，TS 看不到 name/categoryId；运行时由 Prisma 自身校验。
    // 与原 `...productData` 行为一致，只是多了一层字段过滤。
    const created = await this.prisma.product.create({
      data: {
        ...(data as any),
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

  /**
   * 商家更新商品
   *
   * 同样走 pickProductFields 白名单，避免 dto.id / dto.merchantId / dto.skus / 任何
   * 表单内部字段（如 freeShipping）污染 Prisma update payload。
   * skus 更新需要走专门的 SKU 接口（增/删/改 SKU 行；当前 dto 简单覆盖会丢历史 SKU 关系，
   * 故这里只更新 Product 本体字段）。
   */
  async updateProduct(merchantId: string, id: string, dto: any) {
    const p = await this.prisma.product.findFirst({ where: { id, merchantId } })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    const data = pickProductFields(dto)
    const upd = await this.prisma.product.update({ where: { id }, data })
    return decimalToNumber(upd)
  }
  async batchStatus(merchantId: string, ids: string[], status: string) {
    await this.prisma.product.updateMany({
      where: { id: { in: ids }, merchantId },
      data: { status },
    })
    return { ok: true, affected: ids.length }
  }
  async batchDelete(merchantId: string, ids: string[]) {
    await this.prisma.product.deleteMany({ where: { id: { in: ids }, merchantId } })
    return { ok: true, affected: ids.length }
  }

  // ========== 分类 ==========
  async listCategories(merchantId: string, type: 'platform' | 'merchant' = 'merchant') {
    if (type === 'platform') {
      return this.prisma.category.findMany({
        where: { type: 'platform' },
        orderBy: { sort: 'asc' },
      })
    }
    return this.prisma.category.findMany({
      where: { type: 'merchant', merchantId },
      orderBy: { sort: 'asc' },
    })
  }
  async createCategory(merchantId: string, dto: any) {
    return this.prisma.category.create({ data: { ...dto, type: 'merchant', merchantId } })
  }
  async updateCategory(merchantId: string, id: string, dto: any) {
    // 越权防护：必须先校验该分类属于当前 merchantId，否则 A 商家可改 B 商家分类
    const exist = await this.prisma.category.findFirst({
      where: { id, merchantId, type: 'merchant' },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '分类不存在或无权限')
    // 显式剔除 merchantId / type / id，防止 dto 携带这些字段改归属
    const { id: _ignoreId, merchantId: _ignoreMid, type: _ignoreType, ...data } = dto || {}
    return this.prisma.category.update({ where: { id }, data })
  }
  async deleteCategory(merchantId: string, id: string) {
    // 同 updateCategory：先校验归属
    const exist = await this.prisma.category.findFirst({
      where: { id, merchantId, type: 'merchant' },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '分类不存在或无权限')
    await this.prisma.category.delete({ where: { id } })
    return { ok: true }
  }
  async sortCategories(merchantId: string, ids: string[]) {
    // 排序时同样要确保 ids 全部属于当前 merchant，否则可以悄悄改其它商家分类的 sort
    const owned = await this.prisma.category.findMany({
      where: { id: { in: ids }, merchantId, type: 'merchant' },
      select: { id: true },
    })
    const ownedSet = new Set(owned.map((c) => c.id))
    for (let i = 0; i < ids.length; i++) {
      if (!ownedSet.has(ids[i])) continue
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
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { items: true, user: true },
      }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async orderDetail(merchantId: string, id: string) {
    const o = await this.prisma.order.findFirst({
      where: { id, merchantId },
      include: { items: true, payments: true },
    })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    return decimalToNumber(o)
  }
  async ship(merchantId: string, id: string, company: string, trackingNumber: string) {
    const o = await this.prisma.order.findFirst({ where: { id, merchantId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (o.status !== 'pending_shipment')
      throw new BizException(BizCode.ORDER_STATUS_INVALID, '订单状态不允许发货')
    const shippedAt = new Date()
    await this.prisma.order.update({
      where: { id },
      data: { status: 'shipped', trackingCompany: company, trackingNumber, shippedAt },
    })
    // 发货事件推给商家自己的 merchant 房间（列表/统计实时刷）；用户端将来若加 user 房间，可类似 broadcastUserUpdate 推 'order:update' 到 user:<userId>
    try {
      this.chat.emitOrderUpdate(merchantId, {
        orderId: o.id,
        no: o.no,
        status: 'shipped',
        trackingCompany: company,
        trackingNumber,
        updatedAt: shippedAt,
      })
    } catch {}
    return { ok: true }
  }
  async batchShip(
    merchantId: string,
    items: { id: string; company: string; trackingNumber: string }[],
  ) {
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
      this.prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { order: true, orderItem: true },
      }),
      this.prisma.refund.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  /**
   * 商家同意退款
   *
   * 流程：
   *   1. 查 Refund 校验归属 + 状态（必须是 pending，已 agreed/rejected/completed 拒绝重复操作）
   *   2. 计算实际退款金额（前端可传低于 applyAmount，但不能超过）
   *   3. 调微信支付退款 API（生产环境必走，非生产走 mock）
   *      - 失败时不修改 Refund 状态，把错误透传给商家端，避免"DB 改成 agreed 但钱没退"的脱节
   *   4. 成功后写 status='agreed' + refundAmount；wxpay 真退款是 PROCESSING 也算同意,
   *      具体到账走 wxpay 异步回调进 status='completed'
   *   5. 广播 refund:new 事件
   *
   * 注：当前 Refund 模型没有 wxRefundId 字段（不能在不动 schema 的前提下保存），
   *   这里把 wxRefundId 拼到 merchantReply 末尾以保留可追溯线索，后续若加列再迁移。
   */
  async agreeRefund(merchantId: string, id: string, refundAmount?: number) {
    const r = await this.prisma.refund.findFirst({
      where: { id, merchantId },
      include: { order: { select: { id: true, no: true, payAmount: true, paymentMethod: true } } },
    })
    if (!r) throw new BizException(BizCode.NOT_FOUND, '售后单不存在')
    if (r.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前售后状态 ${r.status} 不可同意`)
    }
    const apply = Number(r.applyAmount)
    const finalAmount = Number(refundAmount ?? apply)
    if (!(finalAmount > 0)) {
      throw new BizException(BizCode.INVALID_PARAMS, '退款金额必须大于 0')
    }
    if (finalAmount > apply) {
      throw new BizException(BizCode.INVALID_PARAMS, '退款金额不能超过申请金额')
    }
    const orderPay = Number(r.order?.payAmount || 0)
    if (orderPay <= 0) {
      throw new BizException(BizCode.BUSINESS_ERROR, '关联订单金额异常,无法退款')
    }

    // 1) 调微信退款；失败则抛错不更新 DB
    let wxRefundId: string | null = null
    try {
      // 仅微信支付订单走 wxpay 退款；balance / alipay / 离线订单暂不走（直接走线下）。
      if ((r.order?.paymentMethod || '').toLowerCase() === 'wechat') {
        const wx = await this.wxpay.createRefund({
          outTradeNo: r.order!.no,
          outRefundNo: r.no,
          reason: r.reason || '商家同意退款',
          refundAmount: finalAmount,
          totalAmount: orderPay,
        })
        wxRefundId = wx.refundId
      }
    } catch (e: any) {
      throw new BizException(BizCode.BUSINESS_ERROR, `微信退款发起失败：${e?.message || e}`)
    }

    // 2) 真退款发起成功后再改状态，事务内一次性提交
    const tailReply = wxRefundId ? ` [wxRefundId=${wxRefundId}]` : ''
    const updatedAt = new Date()
    await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'agreed',
        refundAmount: finalAmount,
        merchantReply: ((r.merchantReply || '') + tailReply).trim() || null,
      },
    })
    // 售后单状态变更复用 refund:new 事件流（商家端可在 useMerchantNotifyStream 里
    // 一并处理"售后有新动态"通知，避免再开新事件名增加协议成本）
    try {
      this.chat.emitRefundNew(merchantId, {
        refundId: r.id,
        no: r.no,
        orderId: r.orderId,
        status: 'agreed',
        refundAmount: finalAmount,
        wxRefundId,
        updatedAt,
      })
    } catch {}
    return { ok: true, wxRefundId }
  }
  async rejectRefund(merchantId: string, id: string, reason: string) {
    const r = await this.prisma.refund.findFirst({ where: { id, merchantId } })
    if (!r) throw new BizException(BizCode.NOT_FOUND, '售后单不存在')
    const updatedAt = new Date()
    await this.prisma.refund.updateMany({
      where: { id, merchantId },
      data: { status: 'rejected', merchantReply: reason },
    })
    try {
      this.chat.emitRefundNew(merchantId, {
        refundId: r.id,
        no: r.no,
        orderId: r.orderId,
        status: 'rejected',
        reason,
        updatedAt,
      })
    } catch {}
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
    if (q.keyword)
      where.OR = [{ nickname: { contains: q.keyword } }, { phone: { contains: q.keyword } }]
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ])
    // 批量读 priceTier / authorized / blacklist 配置;之前是硬编码 retail,商家看不到自己设的值
    // blacklist 也并入这次批量读,避免每个客户单独再查一次 SystemConfig
    const cfgKeys = users.flatMap((u) => [
      `cust_tier_${merchantId}_${u.id}`,
      `cust_auth_${merchantId}_${u.id}`,
      `merchant:${merchantId}:blacklist:${u.id}`,
    ])
    const cfgs = cfgKeys.length
      ? await this.prisma.systemConfig.findMany({ where: { key: { in: cfgKeys } } })
      : []
    const tierMap = new Map<string, string>()
    const authMap = new Map<string, boolean>()
    const blockedMap = new Map<string, boolean>()
    const tierPrefix = `cust_tier_${merchantId}_`
    const authPrefix = `cust_auth_${merchantId}_`
    const blockedPrefix = `merchant:${merchantId}:blacklist:`
    for (const c of cfgs) {
      if (c.key.startsWith(tierPrefix)) {
        tierMap.set(c.key.slice(tierPrefix.length), (c.value as any)?.priceTier ?? 'retail')
      } else if (c.key.startsWith(authPrefix)) {
        authMap.set(c.key.slice(authPrefix.length), !!(c.value as any)?.authorized)
      } else if (c.key.startsWith(blockedPrefix)) {
        blockedMap.set(c.key.slice(blockedPrefix.length), !!(c.value as any)?.blocked)
      }
    }
    return buildPage(
      users.map((u) => ({
        id: u.id,
        avatar: u.avatar,
        nickname: u.nickname,
        phone: u.phone,
        kind: u.role === 'promoter' ? 'promoter' : 'normal',
        priceTier: tierMap.get(u.id) ?? 'retail',
        priceAuthorized: authMap.get(u.id) ?? false,
        blocked: blockedMap.get(u.id) ?? false,
      })),
      total,
      page,
      pageSize,
    )
  }
  async setCustomerPriceTier(merchantId: string, userId: string, priceTier: string) {
    // 真实建议存到独立 CustomerPriceTier 表；当前用 SystemConfig 简化
    const key = `cust_tier_${merchantId}_${userId}`
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: { priceTier } as any },
      create: { key, value: { priceTier } as any },
    })
    return { ok: true }
  }
  async authorizeCustomer(merchantId: string, userId: string, on: boolean) {
    const key = `cust_auth_${merchantId}_${userId}`
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: { authorized: on } as any },
      create: { key, value: { authorized: on } as any },
    })
    return { ok: true }
  }
  /**
   * 设置/取消客户黑名单（仅在当前商家维度生效）
   *
   * 不直接改 User.status 的设计理由：
   *   - User.status='disabled' 是全局禁用，会让该用户在其他所有商家也无法下单 / 登录
   *   - 同一个 user 在 A 商家被拉黑、在 B 商家完全正常是常见场景
   *   - 因此采用 SystemConfig key=`merchant:<mid>:blacklist:<userId>` 的局部状态
   *   - value 形如 { blocked: true/false, at: ISO }，方便审计何时拉/解黑
   *
   * 后续若需求要"商家拉黑后该客户在本店无法下单"，可在 createOrder 处 IN 查这些 key 拦截；
   * 当前接口先把状态接通让前端能持久化操作，业务拦截看后续需求再加。
   */
  async setCustomerBlacklist(merchantId: string, userId: string, on: boolean) {
    if (!userId) throw new BizException(BizCode.INVALID_PARAMS, '客户 ID 不能为空')
    const key = `merchant:${merchantId}:blacklist:${userId}`
    const value = { blocked: !!on, at: new Date().toISOString() }
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    })
    return { ok: true, blocked: !!on }
  }

  // ========== 佣金 ==========
  async commissionRules(merchantId: string) {
    const rules = await this.prisma.commissionRule.findMany({ where: { merchantId } })
    const defaultRule = rules.find((r) => !r.productId) || null
    const productRules = rules.filter((r) => r.productId)
    return {
      default: defaultRule
        ? {
            level1Percent: defaultRule.level1Percent,
            level2Percent: defaultRule.level2Percent,
            visibleToPromoter: defaultRule.visibleToPromoter,
            allowOffline: defaultRule.allowOffline,
            enabled: defaultRule.enabled,
          }
        : {
            level1Percent: 5,
            level2Percent: 2,
            visibleToPromoter: true,
            allowOffline: false,
            enabled: true,
          },
      productRules: productRules.map((r) => ({
        productId: r.productId,
        level1Percent: r.level1Percent,
        level2Percent: r.level2Percent,
      })),
    }
  }
  async saveCommissionRules(merchantId: string, dto: any) {
    if (dto.default) {
      await this.prisma.commissionRule
        .upsert({
          where: { merchantId_productId: { merchantId, productId: '' } },
          update: dto.default,
          create: { merchantId, productId: null, ...dto.default },
        })
        .catch(async () => {
          // unique 约束在 (merchantId, productId)，productId 为 null 时单独处理
          const exist = await this.prisma.commissionRule.findFirst({
            where: { merchantId, productId: null },
          })
          if (exist) {
            await this.prisma.commissionRule.update({ where: { id: exist.id }, data: dto.default })
          } else {
            await this.prisma.commissionRule.create({ data: { merchantId, ...dto.default } })
          }
        })
    }
    if (dto.productRules?.length) {
      for (const r of dto.productRules) {
        const exist = await this.prisma.commissionRule.findFirst({
          where: { merchantId, productId: r.productId },
        })
        if (exist) {
          await this.prisma.commissionRule.update({ where: { id: exist.id }, data: r })
        } else {
          await this.prisma.commissionRule.create({ data: { merchantId, ...r } })
        }
      }
    }
    return { ok: true }
  }

  /**
   * 商家维度推广概览（merchant-app 首页 / 推广中心 用）
   *
   * Commission 表无 merchantId 字段，按所属订单的 merchantId 关联过滤。
   *
   * - totalCommission：商家所有商品被推广产生的累积佣金（已结算 + 待结算，排除已取消）
   * - monthCommission：本月已结算 / 待结算佣金
   * - promotedOrders：去重订单数（佣金维度）
   * - promotedUsers：去重推广人（user）数量
   *
   * 全部走 Commission 表实时聚合，零 mock。
   */
  async promoteSummary(merchantId: string) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const all = await this.prisma.commission.findMany({
      where: {
        status: { not: 'cancelled' },
        order: { merchantId },
      },
      select: { amount: true, orderId: true, userId: true, createdAt: true },
    })
    const totalCommission = all.reduce((s, c) => s + Number(c.amount || 0), 0)
    const monthCommission = all
      .filter((c) => c.createdAt >= monthStart)
      .reduce((s, c) => s + Number(c.amount || 0), 0)
    const promotedOrders = new Set(all.map((c) => c.orderId)).size
    const promotedUsers = new Set(all.map((c) => c.userId)).size
    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      monthCommission: Math.round(monthCommission * 100) / 100,
      promotedOrders,
      promotedUsers,
    }
  }

  /**
   * 商家维度 · 佣金明细分页
   *
   * 列出所有"成交订单 → 给推广人结算"的 Commission 记录，关联订单元信息。
   * 用于 merchant-app 推广中心「我家店铺给推广人发了多少佣金」明细查询。
   *
   * Commission 表本身没有 merchantId 字段，按所属 Order.merchantId 关联过滤。
   */
  async commissionHistory(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { order: { merchantId } }
    if (q.status && q.status !== 'all') where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, no: true, payAmount: true, status: true, createdAt: true } },
          user: { select: { id: true, nickname: true, avatar: true, phone: true } },
        },
      }),
      this.prisma.commission.count({ where }),
    ])
    return buildPage(
      list.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderNo: c.order?.no || '',
        orderAmount: Number(c.order?.payAmount || 0),
        orderStatus: c.order?.status || '',
        promoterId: c.userId,
        promoterName: c.user?.nickname || '',
        promoterAvatar: c.user?.avatar || '',
        promoterPhone: c.user?.phone || '',
        level: c.level,
        amount: Number(c.amount),
        status: c.status,
        settledAt: c.settledAt,
        createdAt: c.createdAt,
      })),
      total,
      page,
      pageSize,
    )
  }

  /**
   * 商家维度 · 营销活动统一列表
   *
   * 合并 Coupon + FlashSale + GroupBuy 三种营销活动到一个分页结构，
   * 给 merchant-app「营销中心」一站式展示用。
   *
   * - kind 字段：coupon / flashSale / groupBuy 区分类型
   * - status 透传；其他维度字段按各自模型映射到统一 shape
   * - 排序按 createdAt 倒序；分页在合并后再 slice，避免三次跨表 join 复杂度
   *
   * 由于三类活动数据量都不大（单商户量级 < 1k），合并→切片是足够稳妥的做法；
   * 若后续单类型超过 10k 条，再下沉到 SQL UNION。
   */
  async marketingActivities(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const kindFilter = typeof q?.kind === 'string' ? q.kind : null
    const statusFilter = q?.status && q.status !== 'all' ? q.status : null

    const [coupons, flashSales, groupBuys] = await Promise.all([
      kindFilter && kindFilter !== 'coupon'
        ? Promise.resolve([])
        : this.prisma.coupon.findMany({
            where: { merchantId, ...(statusFilter ? { status: statusFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
      kindFilter && kindFilter !== 'flashSale'
        ? Promise.resolve([])
        : this.prisma.flashSale.findMany({
            where: { merchantId, ...(statusFilter ? { status: statusFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
      kindFilter && kindFilter !== 'groupBuy'
        ? Promise.resolve([])
        : this.prisma.groupBuy.findMany({
            where: { merchantId, ...(statusFilter ? { status: statusFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
    ])

    // FlashSale / GroupBuy 模型在 Prisma 中只有 productId 字段（没有 product 关系），
    // 一次性把所有用到的 product 查回来做内存 join，避免 N+1
    const productIds = Array.from(
      new Set(
        ([] as string[])
          .concat(flashSales.map((f) => f.productId).filter(Boolean) as string[])
          .concat(groupBuys.map((g) => g.productId).filter(Boolean) as string[]),
      ),
    )
    const productMap = new Map<string, { id: string; name: string; images: string[] }>()
    if (productIds.length) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, images: true },
      })
      for (const p of products) productMap.set(p.id, p)
    }

    const unified: Array<any> = []
    for (const c of coupons) {
      unified.push({
        id: c.id,
        kind: 'coupon' as const,
        name: c.name,
        status: c.status,
        amount: c.amount ? Number(c.amount) : null,
        discountPercent: c.discountPercent,
        threshold: c.threshold ? Number(c.threshold) : null,
        stock: c.stock,
        received: c.received,
        used: c.used,
        validFrom: c.validFrom,
        validTo: c.validTo,
        scope: c.scope,
        createdAt: c.createdAt,
      })
    }
    for (const f of flashSales) {
      const prod = productMap.get(f.productId)
      unified.push({
        id: f.id,
        kind: 'flashSale' as const,
        name: `限时秒杀：${prod?.name || ''}`,
        status: f.status,
        productId: f.productId,
        productImage: prod?.images?.[0] || '',
        price: Number(f.price),
        stock: f.stock,
        sold: f.sold,
        validFrom: f.startAt,
        validTo: f.endAt,
        createdAt: f.createdAt,
      })
    }
    for (const g of groupBuys) {
      const prod = productMap.get(g.productId)
      unified.push({
        id: g.id,
        kind: 'groupBuy' as const,
        name: `拼团：${prod?.name || ''}`,
        status: g.status,
        productId: g.productId,
        productImage: prod?.images?.[0] || '',
        price: Number(g.price),
        groupSize: g.groupSize,
        validHours: g.validHours,
        createdAt: g.createdAt,
      })
    }

    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const total = unified.length
    const sliced = unified.slice(skip, skip + take)
    return buildPage(sliced, total, page, pageSize)
  }

  // ========== 提现 ==========
  async listWithdraws(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { merchantId }
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.withdraw.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
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
  /**
   * @deprecated 商家自审产品语义错误,正确入口是平台审核 /p/withdraws/:id/approve|reject|mark-paid。
   *   保留本接口仅为兼容老 admin-pc / merchant-app 调用,后续版本会下线。
   *
   * P1-3 修复:之前 updateMany 无 affected rows 检查,id 不存在或越权时静默返回 ok=true,
   *   现在校验 r.count===0 即抛 NOT_FOUND,让前端能看到失败原因。
   */
  async reviewWithdraw(
    merchantId: string,
    id: string,
    actualAmount: number,
    remark?: string,
    remarkTags?: string[],
  ) {
    const r = await this.prisma.withdraw.updateMany({
      where: { id, merchantId },
      data: {
        status: 'approved',
        actualAmount,
        remark,
        remarkTags: remarkTags || [],
        reviewedAt: new Date(),
      },
    })
    if (r.count === 0) {
      throw new BizException(BizCode.NOT_FOUND, '提现单不存在或无权限')
    }
    return { ok: true }
  }
  /**
   * @deprecated 商家自审 - 同上,等价语义已由 /p/withdraws/:id/reject 接管
   */
  async rejectWithdraw(merchantId: string, id: string, reason: string) {
    const r = await this.prisma.withdraw.updateMany({
      where: { id, merchantId },
      data: { status: 'rejected', remark: reason },
    })
    if (r.count === 0) {
      throw new BizException(BizCode.NOT_FOUND, '提现单不存在或无权限')
    }
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
  /**
   * 更新门店信息（admin-pc / merchant-app 编辑场景）
   *
   * 越权防护：必须先校验门店属于当前商家，否则 A 商家可改 B 商家门店。
   * 字段白名单：显式剔除 id / merchantId / createdAt / updatedAt，
   * 避免 dto 携带这些字段改门店归属或绕过审计字段。
   */
  async updateStore(merchantId: string, id: string, dto: any) {
    const exist = await this.prisma.store.findFirst({
      where: { id, merchantId },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '门店不存在或无权限')
    const {
      id: _ignoreId,
      merchantId: _ignoreMid,
      createdAt: _ignoreCreatedAt,
      updatedAt: _ignoreUpdatedAt,
      ...data
    } = dto || {}
    return this.prisma.store.update({ where: { id }, data })
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
      ...((s.authConfig as any) || {}),
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
  async createStaff(merchantId: string, dto: any) {
    return this.prisma.staff.create({ data: { ...dto, merchantId } })
  }
  async updateStaff(merchantId: string, id: string, dto: any) {
    // 越权防护：必须先校验 staff 归属，否则 A 商家可改 B 商家员工
    const exist = await this.prisma.staff.findFirst({
      where: { id, merchantId },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '员工不存在或无权限')
    // 防止 dto 携带 merchantId/id 改归属
    const { id: _ignoreId, merchantId: _ignoreMid, ...data } = dto || {}
    return this.prisma.staff.update({ where: { id }, data })
  }
  async removeStaff(merchantId: string, id: string) {
    await this.prisma.staff.deleteMany({ where: { id, merchantId } })
    return { ok: true }
  }

  // ========== 装修 ==========
  async getDecorate(merchantId: string) {
    let d = await this.prisma.shopDecorate.findUnique({ where: { merchantId } })
    if (!d) d = await this.prisma.shopDecorate.create({ data: { merchantId } })
    return d
  }
  async saveDecorate(merchantId: string, dto: any) {
    // 显式剔除 id/merchantId，避免 dto 携带这些字段被 upsert 接受导致换归属
    const { id: _ignoreId, merchantId: _ignoreMid, ...data } = dto || {}
    return this.prisma.shopDecorate.upsert({
      where: { merchantId },
      update: data,
      create: { ...data, merchantId },
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

  /**
   * 创建优惠券
   *
   * 设计要点：
   *   - schema 用的是 status enum: pending / active / paused / ended（没有独立 active 布尔字段）
   *     这里 dto 入参约定如下："是否上架"由 status 字段决定，默认 'pending'，
   *     由商家通过 toggleCoupon 切到 'active' / 'paused'
   *   - 必填校验：name / type / validFrom / validTo / threshold（满减/折扣的门槛）
   *   - 金额、折扣按 type 分支校验：
   *       · type='fullReduce' → amount 必填且 >0；discountPercent 可空
   *       · type='discount'   → discountPercent 必填且 ∈ (0, 100)；amount 可空
   *       · type='fixed'      → amount 必填（无门槛 / 满任意减额）
   *   - validFrom < validTo 强校验，避免下发"永远不可用"的券
   *   - stock=0 视为不限量；perUserLimit 默认 1（与 schema 一致）
   *   - merchantId 由 ensureMerchantId 注入，永远不接 dto.merchantId（防越权改归属）
   */
  async createCoupon(merchantId: string, dto: any) {
    if (!dto || typeof dto !== 'object') {
      throw new BizException(BizCode.INVALID_PARAMS, '参数不合法')
    }
    const name = String(dto.name || '').trim()
    const type = String(dto.type || '').trim()
    if (!name) throw new BizException(BizCode.INVALID_PARAMS, '请填写优惠券名称')
    if (!['fullReduce', 'discount', 'fixed'].includes(type)) {
      throw new BizException(BizCode.INVALID_PARAMS, 'type 必须是 fullReduce / discount / fixed')
    }
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null
    const validTo = dto.validTo ? new Date(dto.validTo) : null
    if (
      !validFrom ||
      !validTo ||
      Number.isNaN(validFrom.getTime()) ||
      Number.isNaN(validTo.getTime())
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '请填写有效期 validFrom / validTo')
    }
    if (validFrom >= validTo) {
      throw new BizException(BizCode.INVALID_PARAMS, '有效期开始时间必须早于结束时间')
    }
    const amount = dto.amount != null ? Number(dto.amount) : null
    const discountPercent = dto.discountPercent != null ? Number(dto.discountPercent) : null
    if (type === 'fullReduce' && !(amount! > 0)) {
      throw new BizException(BizCode.INVALID_PARAMS, '满减券必须填写减免金额')
    }
    if (type === 'discount' && !(discountPercent! > 0 && discountPercent! < 100)) {
      throw new BizException(BizCode.INVALID_PARAMS, '折扣券折扣百分比必须在 (0, 100) 区间')
    }
    if (type === 'fixed' && !(amount! > 0)) {
      throw new BizException(BizCode.INVALID_PARAMS, '固定金额券必须填写金额')
    }
    const status = ['pending', 'active', 'paused', 'ended'].includes(dto.status)
      ? dto.status
      : 'pending'
    const created = await this.prisma.coupon.create({
      data: {
        merchantId,
        name,
        type,
        amount: amount != null ? amount : undefined,
        discountPercent: discountPercent != null ? discountPercent : undefined,
        threshold: dto.threshold != null ? Number(dto.threshold) : undefined,
        stock: Math.max(0, Math.floor(Number(dto.stock || 0))),
        validFrom,
        validTo,
        perUserLimit: Math.max(0, Math.floor(Number(dto.perUserLimit || 1))),
        scope: ['all', 'category', 'product'].includes(dto.scope) ? dto.scope : 'all',
        scopeIds: Array.isArray(dto.scopeIds)
          ? dto.scopeIds.filter((x: any) => typeof x === 'string')
          : [],
        status,
      },
    })
    return decimalToNumber(created)
  }

  /**
   * 更新优惠券
   *
   * 重要约束：
   *   - 越权校验：必须先查到 (id, merchantId) 才能改，否则 NOT_FOUND
   *   - 不允许通过本接口改 `used` / `received` / `merchantId` / `id`（这些是运行期统计或归属字段）
   *   - status 改成 'ended' 视作下架（与 toggleCoupon 解耦：后者是 active/paused 切换）
   *   - 修改后端默认时刻校验 validFrom < validTo
   */
  async updateCoupon(merchantId: string, id: string, dto: any) {
    if (!dto || typeof dto !== 'object') {
      throw new BizException(BizCode.INVALID_PARAMS, '参数不合法')
    }
    const exist = await this.prisma.coupon.findFirst({
      where: { id, merchantId },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '优惠券不存在或无权限')
    const data: Record<string, any> = {}
    if (typeof dto.name === 'string' && dto.name.trim()) data.name = dto.name.trim()
    if (['fullReduce', 'discount', 'fixed'].includes(dto.type)) data.type = dto.type
    if (dto.amount != null) data.amount = Number(dto.amount)
    if (dto.discountPercent != null) data.discountPercent = Number(dto.discountPercent)
    if (dto.threshold != null) data.threshold = Number(dto.threshold)
    if (dto.stock != null) data.stock = Math.max(0, Math.floor(Number(dto.stock)))
    if (dto.validFrom) data.validFrom = new Date(dto.validFrom)
    if (dto.validTo) data.validTo = new Date(dto.validTo)
    if (dto.perUserLimit != null)
      data.perUserLimit = Math.max(0, Math.floor(Number(dto.perUserLimit)))
    if (['all', 'category', 'product'].includes(dto.scope)) data.scope = dto.scope
    if (Array.isArray(dto.scopeIds)) {
      data.scopeIds = dto.scopeIds.filter((x: any) => typeof x === 'string')
    }
    if (['pending', 'active', 'paused', 'ended'].includes(dto.status)) data.status = dto.status
    if (data.validFrom && data.validTo && data.validFrom >= data.validTo) {
      throw new BizException(BizCode.INVALID_PARAMS, '有效期开始时间必须早于结束时间')
    }
    if (Object.keys(data).length === 0) return { ok: true, updated: false }
    const upd = await this.prisma.coupon.update({ where: { id }, data })
    return decimalToNumber(upd)
  }

  /**
   * 删除优惠券（软删 - 当前 schema 无 deletedAt/active 布尔，用 status='ended' 当软删）
   *
   * 选 status='ended' 而非物理删除的原因：
   *   - 历史订单的 couponId 仍指向本券，物理删会破坏外键完整性
   *   - 商家「营销 - 已结束」分页仍要能查到已结束券统计
   * 越权校验同 update。
   */
  async deleteCoupon(merchantId: string, id: string) {
    const exist = await this.prisma.coupon.findFirst({
      where: { id, merchantId },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '优惠券不存在或无权限')
    await this.prisma.coupon.update({ where: { id }, data: { status: 'ended' } })
    return { ok: true }
  }

  /**
   * 上下架开关（active <-> paused）
   *
   * - active=true → status='active'（用户端可见可领）
   * - active=false → status='paused'（暂停；不影响已领券用户使用）
   * 与 deleteCoupon 区分：删除是 ended（不可恢复），暂停是 paused（可再启）
   */
  async toggleCoupon(merchantId: string, id: string, active: boolean) {
    const exist = await this.prisma.coupon.findFirst({
      where: { id, merchantId },
      select: { id: true, status: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '优惠券不存在或无权限')
    if (exist.status === 'ended') {
      throw new BizException(BizCode.BUSINESS_ERROR, '已结束的优惠券不可再上下架')
    }
    await this.prisma.coupon.update({
      where: { id },
      data: { status: active ? 'active' : 'paused' },
    })
    return { ok: true, status: active ? 'active' : 'paused' }
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
    const msgs = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    return msgs
  }
  async chatSend(merchantId: string, sessionId: string, type: string, content: string) {
    const s = await this.prisma.chatSession.findFirst({ where: { id: sessionId, merchantId } })
    if (!s) throw new BizException(BizCode.NOT_FOUND, '会话不存在')
    const m = await this.prisma.chatMessage.create({
      data: { sessionId, sender: 'merchant', type, content, read: false },
    })
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastMessageAt: new Date() },
    })
    // 同步推送给房间(用户端 + 商家其他在线设备);HTTP 链路之前只写 DB,用户要等下次轮询才看得到 → P1 体验断点
    try {
      this.chat.emitChatMessage(sessionId, m)
    } catch {}
    return m
  }
  async quickReplies(merchantId: string) {
    return this.prisma.quickReply.findMany({ where: { merchantId }, orderBy: { sort: 'asc' } })
  }

  // ========== 选品广场 ==========
  /**
   * 选品广场商品列表
   *
   * 真实指标修复（之前 agencyCount=0 / isPlatformPushed=false 都是占位）：
   *   - agencyCount：approved 状态的 AgencyApplication 中 productIds 包含当前商品的去重商家数
   *     —— 用 IN + JSON 谓词不优雅且数据库可移植性差，这里取最稳的"内存批量计算"
   *     （选品广场单页 ≤ 20 行，O(N×M) 完全可接受；后续若广场推送规模上来再下沉到 SQL）
   *   - isPlatformPushed：PlazaPush 中 status='active' 且 productIds 包含该商品
   *   - 平台广场上下架（P1-5 引入的 SystemConfig `plaza:product:<id>` 覆盖）也在这里生效：
   *     online=false 的商品视为下架，从结果中过滤掉
   */
  async plazaProducts(merchantId: string, q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = { status: 'active' }
    if (q.factoryId) {
      where.merchantId = q.factoryId
    } else if (merchantId) {
      where.merchantId = { not: merchantId }
    }
    if (q.keyword) where.name = { contains: q.keyword, mode: 'insensitive' }
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: { merchant: true },
        orderBy: { sales: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ])
    if (list.length === 0) {
      return buildPage([], total, page, pageSize)
    }
    const productIds = list.map((p) => p.id)

    // 1. agencyCount：approved 申请按 productId 聚合
    //    用 AgencyApplication.productIds(JSON 数组)做 hasSome 查询，再在内存里按商品分桶。
    const apps = await this.prisma.agencyApplication.findMany({
      where: { status: 'approved', productIds: { hasSome: productIds } },
      select: { merchantId: true, productIds: true },
    })
    const agencySetByProduct = new Map<string, Set<string>>()
    for (const a of apps) {
      for (const pid of a.productIds) {
        if (!productIds.includes(pid)) continue
        let s = agencySetByProduct.get(pid)
        if (!s) {
          s = new Set<string>()
          agencySetByProduct.set(pid, s)
        }
        s.add(a.merchantId)
      }
    }

    // 2. isPlatformPushed：当前在 active 推送中的 PlazaPush
    const pushes = await this.prisma.plazaPush.findMany({
      where: { status: 'active', productIds: { hasSome: productIds } },
      select: { productIds: true },
    })
    const pushedSet = new Set<string>()
    for (const pp of pushes) {
      for (const pid of pp.productIds) {
        if (productIds.includes(pid)) pushedSet.add(pid)
      }
    }

    // 3. 平台广场上下架（P1-5 引入的 SystemConfig 覆盖；online=false 直接过滤掉）
    const onlineCfgs = await this.prisma.systemConfig.findMany({
      where: { key: { in: productIds.map((id) => `plaza:product:${id}`) } },
    })
    const offlineSet = new Set<string>()
    for (const c of onlineCfgs) {
      const online = !!(c.value as any)?.online
      if (!online) offlineSet.add(c.key.replace('plaza:product:', ''))
    }

    const mapped = list
      .filter((p) => !offlineSet.has(p.id))
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        productImage: p.images[0] || '',
        factoryName: p.merchant.name,
        factoryId: p.merchantId,
        startPrice: Number(p.priceWholesaleMin || p.priceRetailMin),
        agencyCount: agencySetByProduct.get(p.id)?.size || 0,
        tags: p.tags,
        isPlatformPushed: pushedSet.has(p.id),
        suggestMarkupMin: 20,
        suggestMarkupMax: 40,
        suggestCommission: 5,
      }))
    // total 不变（offlineSet 仅小幅过滤当前页；保持原 total 对前端体验更稳）；
    // 若严格要求 total 一致，可在外层再补一道 count 排除 offline 商品，但 SQL 复杂度上升明显。
    return buildPage(mapped, total, page, pageSize)
  }
  /**
   * 选品广场 · 厂家列表（支持地区 / 品类 / 最低评分筛选）
   *
   * region 例：'辽宁' / '辽宁省' → 模糊匹配 region 字段
   * category 例：'家具' → 命中 categories 数组任意元素
   * minRating: 0~5
   */
  async plazaFactories(
    merchantId: string,
    q: { region?: string; category?: string; minRating?: number; keyword?: string } = {},
  ) {
    const where: any = { type: 'factory', status: 'active', id: { not: merchantId } }
    if (q.region) where.region = { contains: q.region, mode: 'insensitive' }
    if (q.category) where.categories = { has: q.category }
    if (q.keyword) where.name = { contains: q.keyword, mode: 'insensitive' }
    const factories = await this.prisma.merchant.findMany({ where, take: 100 })

    // 评分 / 头像 从 profile-extras 批量读
    const extrasMap = new Map<
      string,
      { avatar?: string; rating?: number; ratingCount?: number; description?: string }
    >()
    if (factories.length) {
      const keys = factories.map((f) => `shop:${f.id}:profile-extras`)
      const cfgs = await this.prisma.systemConfig.findMany({ where: { key: { in: keys } } })
      for (const c of cfgs) {
        const mid = c.key.replace(/^shop:|:profile-extras$/g, '')
        extrasMap.set(mid, (c.value as any) || {})
      }
    }

    const minRating = typeof q.minRating === 'number' ? q.minRating : 0
    const result = factories
      .map((f) => {
        const ex = extrasMap.get(f.id) || {}
        return {
          id: f.id,
          name: f.name,
          logo: ex.avatar || '',
          region: f.region,
          categories: f.categories,
          gmv: Number(f.totalGmv || 0),
          rating: typeof ex.rating === 'number' ? ex.rating : 5,
          ratingCount: typeof ex.ratingCount === 'number' ? ex.ratingCount : 0,
          tags: [],
        }
      })
      .filter((x) => x.rating >= minRating)
    return result
  }

  async plazaFactory(merchantId: string, id: string) {
    const f = await this.prisma.merchant.findUnique({ where: { id } })
    if (!f) throw new BizException(BizCode.NOT_FOUND, '工厂不存在')
    const ex = await this.getProfileExtras(id)
    return {
      id: f.id,
      name: f.name,
      logo: ex.avatar || '',
      banner: ex.avatar || '',
      region: f.region,
      address: f.address,
      contact: {
        contactName: f.contact,
        phone: f.contactPhone,
        wechat: '',
        email: ex.email || '',
        address: f.address,
        workTime: '9:00-18:00',
      },
      desc: ex.description || '',
      categories: f.categories,
      qualifications: f.qualifications.map((q, i) => ({ id: String(i), name: '资质', image: q })),
      tags: [],
      gmv: Number(f.totalGmv || 0),
      rating: typeof ex.rating === 'number' ? ex.rating : 5,
      ratingCount: typeof ex.ratingCount === 'number' ? ex.ratingCount : 0,
    }
  }

  /** 厂家产品在选品广场的可见性：'stores' 仅门店可看 / 'public' 所有人可看 */
  async getPlazaVisibility(merchantId: string): Promise<{ scope: 'stores' | 'public' }> {
    const ex = await this.getProfileExtras(merchantId)
    const scope = (ex as any).plazaVisibility === 'public' ? 'public' : 'stores'
    return { scope }
  }

  async setPlazaVisibility(merchantId: string, scope: 'stores' | 'public') {
    if (scope !== 'stores' && scope !== 'public') {
      throw new BizException(BizCode.INVALID_PARAMS, 'scope 只接受 stores | public')
    }
    const key = `shop:${merchantId}:profile-extras`
    const prior = await this.prisma.systemConfig.findUnique({ where: { key } })
    const merged = { ...((prior?.value as any) || {}), plazaVisibility: scope }
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged },
    })
    return { ok: true, scope }
  }

  /** 用户评价厂家（1-5 分）。简化版：取累积平均，不存逐条评分明细。 */
  async rateMerchant(targetMerchantId: string, _raterMerchantId: string, score: number) {
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw new BizException(BizCode.INVALID_PARAMS, '评分必须在 1-5 之间')
    }
    const key = `shop:${targetMerchantId}:profile-extras`
    const prior = await this.prisma.systemConfig.findUnique({ where: { key } })
    const cur = (prior?.value as any) || {}
    const curRating = typeof cur.rating === 'number' ? cur.rating : 5
    const curCount = typeof cur.ratingCount === 'number' ? cur.ratingCount : 0
    const nextCount = curCount + 1
    const nextRating = (curRating * curCount + score) / nextCount
    const merged = { ...cur, rating: Math.round(nextRating * 10) / 10, ratingCount: nextCount }
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged },
    })
    return { ok: true, rating: merged.rating, ratingCount: merged.ratingCount }
  }
  /**
   * 商家关注/取消关注厂家
   *
   * 真实持久化到 SystemConfig（key=shop:<merchantId>:follow），存放厂家 ID 数组。
   * 与现有 profile-extras / priceRule 等 shop:<id>:* 模式保持一致，避免单独建表。
   *
   * - on=true：加入 followed 列表（去重）
   * - on=false：从 followed 列表移除
   * - 自动忽略对自身的关注请求，防止 GMV 自循环
   */
  async followFactory(merchantId: string, id: string, on: boolean) {
    if (!merchantId) throw new BizException(BizCode.FORBIDDEN, '当前账号未关联商家')
    if (!id) throw new BizException(BizCode.INVALID_PARAMS, '缺少厂家 ID')
    if (id === merchantId) {
      throw new BizException(BizCode.INVALID_PARAMS, '不能关注自己')
    }

    const key = `shop:${merchantId}:follow`
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key } })
    const cur = (cfg?.value as any) || {}
    const list: string[] = Array.isArray(cur.followed)
      ? cur.followed.filter((x: any) => typeof x === 'string')
      : []
    const set = new Set(list)
    if (on) set.add(id)
    else set.delete(id)

    const merged = { ...cur, followed: Array.from(set) }
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged },
    })
    return { ok: true, followed: on, total: merged.followed.length }
  }

  /** 当前商家关注的厂家 ID 列表（merchant-app 关注页用） */
  async listFollowedFactories(merchantId: string) {
    if (!merchantId) return { list: [], total: 0 }
    const key = `shop:${merchantId}:follow`
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key } })
    const followed: string[] = Array.isArray((cfg?.value as any)?.followed)
      ? ((cfg?.value as any).followed as any[]).filter((x) => typeof x === 'string')
      : []
    if (followed.length === 0) return { list: [], total: 0 }
    const factories = await this.prisma.merchant.findMany({
      where: { id: { in: followed }, status: 'active' },
    })
    return {
      list: factories.map((f) => ({
        id: f.id,
        name: f.name,
        region: f.region,
        categories: f.categories,
        gmv: Number(f.totalGmv || 0),
      })),
      total: factories.length,
    }
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
              id: true,
              name: true,
              images: true,
              priceWholesaleMin: true,
              priceRetailMin: true,
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
    const extras = await this.getProfileExtras(merchantId)
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
      // 来自 SystemConfig 扩展（schema 中无字段）
      email: extras.email || '',
      description: extras.description || '',
      avatar: extras.avatar || '',
      rating: typeof extras.rating === 'number' ? extras.rating : 5,
      ratingCount: typeof extras.ratingCount === 'number' ? extras.ratingCount : 0,
    }
  }

  private async getProfileExtras(merchantId: string): Promise<{
    email?: string
    description?: string
    avatar?: string
    rating?: number
    ratingCount?: number
  }> {
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
    // SystemConfig 扩展字段
    const extras: any = {}
    if (typeof dto.email === 'string') extras.email = dto.email
    if (typeof dto.description === 'string') extras.description = dto.description
    if (typeof dto.avatar === 'string') extras.avatar = dto.avatar
    if (Object.keys(extras).length) {
      const key = `shop:${merchantId}:profile-extras`
      const prior = await this.prisma.systemConfig.findUnique({ where: { key } })
      const merged = { ...((prior?.value as any) || {}), ...extras }
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
        if (f.audience === 'specific' && !f.specificMerchantIds.includes(merchantId))
          enabled = false
        // 灰度比例
        if (enabled && f.grayPercent < 100) {
          if (!f.grayWhitelist.includes(merchantId)) {
            const hash = merchantId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100
            if (hash >= f.grayPercent) enabled = false
          }
        }
      }
      const groupKey =
        f.group === 'home_entry'
          ? 'homeEntry'
          : f.group === 'role_button'
            ? 'roleButton'
            : 'sideMenu'
      const shortKey = f.key.split('.').slice(-1)[0]
      result[groupKey][shortKey] = enabled
    }
    return result
  }

  // ========== 会员 ==========
  async memberPlans() {
    return decimalToNumber(
      await this.prisma.memberPlan.findMany({
        where: { status: 'active' },
        orderBy: { sort: 'asc' },
      }),
    )
  }
  /**
   * 当前订阅;同时给出嵌套和扁平字段,兼容多端:
   *   - merchant-app 用 m.plan.* (嵌套)
   *   - admin-pc/PC 视图用 planName/planType/price/merchantName/totalDays/subscribedAt (扁平)
   */
  async myMembership(merchantId: string) {
    const m = await this.prisma.merchantMembership.findFirst({
      where: { merchantId, status: { in: ['trial', 'active'] } },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, merchant: true },
    })
    if (!m) return null
    const totalDays = Math.max(1, Math.ceil((m.endAt.getTime() - m.startAt.getTime()) / 86400000))
    return decimalToNumber({
      ...m,
      planName: m.plan?.name ?? '',
      planType: m.plan?.type ?? '',
      price: m.plan ? Number(m.plan.price) : 0,
      merchantName: m.merchant?.name ?? '',
      totalDays,
      subscribedAt: m.createdAt,
    })
  }
  /**
   * 月度配额:同时返回扁平 (pushSlotsLimit/Used 等) 和嵌套 (limits/used) 两种 shape,
   * 让 merchant-app 和 admin-pc 都能直接用,无须额外适配。
   */
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
      const limits = (m as any)?.plan?.constraints || {
        pushSlots: 10,
        bannerLimit: 3,
        impressionLimit: 10000,
      }
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
    const dataObj = (q.data as Record<string, number>) || {}
    return {
      ...q,
      monthStart: q.periodStart,
      limits: {
        pushSlots: q.pushSlotsLimit,
        bannerLimit: q.bannerLimit,
        impressionLimit: q.impressionLimit,
        weightLimit: Number(dataObj.weightLimit ?? 0),
      },
      used: {
        pushSlots: q.pushSlotsUsed,
        bannerLimit: q.bannerUsed,
        impressionLimit: q.impressionUsed,
      },
    }
  }
  /** 缴费记录;加 payMethod 别名兼容 admin-pc 视图 */
  async myPayments(merchantId: string) {
    const list = await this.prisma.paymentRecord.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return list.map((r) =>
      decimalToNumber({
        ...r,
        payMethod: r.paymentMethod,
      }),
    )
  }
  async membershipNotices(merchantId: string) {
    const q = await this.quota(merchantId)
    const notices: any[] = []
    if (q.pushSlotsLimit > 0 && q.pushSlotsUsed >= q.pushSlotsLimit * 0.8) {
      notices.push({
        type: 'warn',
        text: `广场推荐次数已用 ${q.pushSlotsUsed}/${q.pushSlotsLimit}`,
        link: '/merchant/member',
      })
    }
    if (q.bannerLimit > 0 && q.bannerUsed >= q.bannerLimit) {
      notices.push({ type: 'error', text: 'Banner 配额已用尽', link: '/merchant/member' })
    }
    return notices
  }
  /**
   * 商户开通 / 续费 / 升级会员套餐 —— 真实下单接入微信支付。
   *
   * 流程：
   *   1. 校验套餐存在 + 商户合法
   *   2. 创建 PaymentRecord status=pending（**绝不直接 active**）
   *   3. 生产环境 / 已配 wxpay：调 wxpay JSAPI 拿 miniPay 参数返回给前端调起支付
   *      → 用户在微信里真实付款 → 微信回调 /payments/wechat/notify
   *      → 回调里调用 `activateMembership(recordId)` 真正激活
   *   4. 非生产 + wxpay 未配齐：保留预览模式，直接 activate 让本地联调可走通
   *
   * 返回字段：
   *   { ok, mockPaid, paymentNo, recordId, miniPay? }
   *   - mockPaid=true 表示已激活；前端直接刷新订阅页
   *   - mockPaid=false + miniPay 表示需要前端 uni.requestPayment 调起支付，
   *     并在支付成功后调 /membership/payments/:no/status 轮询激活
   */
  async subscribe(merchantId: string, userId: string, dto: { planId: string; payMethod?: string }) {
    const plan = await this.prisma.memberPlan.findUnique({ where: { id: dto.planId } })
    if (!plan) throw new BizException(BizCode.NOT_FOUND, '套餐不存在')
    if (plan.status !== 'active') {
      throw new BizException(BizCode.BUSINESS_ERROR, '套餐已下架')
    }

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) throw new BizException(BizCode.NOT_FOUND, '商户不存在')
    if (merchant.status !== 'active') {
      throw new BizException(BizCode.FORBIDDEN, '当前商户状态不允许开通会员')
    }

    const paymentNo = membershipNo()
    const record = await this.prisma.paymentRecord.create({
      data: {
        no: paymentNo,
        merchantId,
        planId: plan.id,
        planName: plan.name,
        planType: plan.type,
        amount: plan.price,
        paymentMethod: dto.payMethod || 'wechat',
        status: 'pending',
      },
    })

    const isProd = process.env.NODE_ENV === 'production'

    // 非生产 + wxpay 未配齐 → 立即激活，便于本地预览
    if (!isProd && !this.wxpay.isReady()) {
      await this.activateMembership(record.id)
      return {
        ok: true,
        mockPaid: true,
        paymentNo,
        recordId: record.id,
      }
    }

    // 真实下单需要 openid 调微信小程序原生支付
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const openid = user?.openid || ''
    if (!openid) {
      // 清理待支付记录，避免堆积无效订单
      await this.prisma.paymentRecord.delete({ where: { id: record.id } })
      throw new BizException(
        BizCode.INVALID_PARAMS,
        '当前账号未绑定微信，请先在「我的-账号绑定」中绑定微信后再开通会员',
      )
    }

    const miniPay = await this.wxpay.createMiniPay({
      outTradeNo: paymentNo,
      description: `开通${plan.name}`,
      totalFen: Math.round(Number(plan.price) * 100),
      openid,
      attach: `membership:${record.id}`,
    })

    return {
      ok: true,
      mockPaid: false,
      paymentNo,
      recordId: record.id,
      miniPay,
    }
  }

  /**
   * 真正"激活会员"的入口；只能被以下两个地方调用：
   *   - 微信支付回调（payment.controller.ts wechatNotify）成功后
   *   - 非生产兜底（subscribe 内部）
   *
   * 幂等：重复调用同一 recordId 不会重复扣账或重复创建订阅。
   *
   * 续费规则：如果当前已有同套餐 active 订阅 → 在 endAt 基础上叠加；
   *           不同套餐 → 把旧的标 expired，新建一条 active。
   */
  async activateMembership(recordId: string) {
    const record = await this.prisma.paymentRecord.findUnique({
      where: { id: recordId },
      include: { plan: true },
    })
    if (!record) throw new BizException(BizCode.NOT_FOUND, '支付记录不存在')
    if (record.status === 'paid') {
      // 幂等：已经激活过了，直接返回最新 membership
      const latest = await this.prisma.merchantMembership.findFirst({
        where: { merchantId: record.merchantId, planId: record.planId || undefined },
        orderBy: { createdAt: 'desc' },
      })
      return { ok: true, subscription: latest ? decimalToNumber(latest) : null, alreadyPaid: true }
    }
    if (!record.plan) {
      throw new BizException(BizCode.BUSINESS_ERROR, '套餐已被删除，无法激活')
    }

    const plan = record.plan
    const merchantId = record.merchantId

    const sub = await this.prisma.$transaction(async (tx) => {
      // 1. 标支付记录为已付
      await tx.paymentRecord.update({
        where: { id: recordId },
        data: { status: 'paid', paidAt: new Date() },
      })

      // 2. 查同套餐已存在的 active 订阅 → 续费叠加
      const existing = await tx.merchantMembership.findFirst({
        where: {
          merchantId,
          planId: plan.id,
          status: { in: ['trial', 'active'] },
        },
        orderBy: { endAt: 'desc' },
      })

      const startAt = existing && existing.endAt > new Date() ? existing.endAt : new Date()
      const endAt = new Date(startAt)
      if (plan.period === 'monthly') endAt.setMonth(endAt.getMonth() + plan.periodCount)
      else if (plan.period === 'yearly') endAt.setFullYear(endAt.getFullYear() + plan.periodCount)
      else if (plan.period === 'weekly') endAt.setDate(endAt.getDate() + 7 * plan.periodCount)
      else if (plan.period === 'daily') endAt.setDate(endAt.getDate() + plan.periodCount)
      else endAt.setFullYear(endAt.getFullYear() + 100)

      if (existing) {
        return tx.merchantMembership.update({
          where: { id: existing.id },
          data: { endAt, status: 'active' },
        })
      }

      // 3. 不同套餐 / 没有订阅 → 先把其他 active 订阅置 expired，再新建
      await tx.merchantMembership.updateMany({
        where: {
          merchantId,
          status: { in: ['trial', 'active'] },
          NOT: { planId: plan.id },
        },
        data: { status: 'expired' },
      })

      return tx.merchantMembership.create({
        data: {
          merchantId,
          planId: plan.id,
          planCode: plan.code,
          startAt,
          endAt,
          status: 'active',
        },
      })
    })

    return { ok: true, subscription: decimalToNumber(sub) }
  }

  /**
   * 前端轮询支付状态：merchant-app 拉起 wxpay 成功后，调这个接口确认
   * PaymentRecord 是否已被回调激活。
   */
  async getMembershipPaymentStatus(merchantId: string, no: string) {
    const record = await this.prisma.paymentRecord.findFirst({
      where: { no, merchantId },
      select: {
        id: true,
        no: true,
        planName: true,
        amount: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    })
    if (!record) throw new BizException(BizCode.NOT_FOUND, '支付记录不存在')
    return decimalToNumber(record)
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
    await this.prisma.usageQuota.update({
      where: { id: q.id },
      data: { [m.used]: { increment: count } } as any,
    })
    const refreshed = await this.quota(merchantId)
    return { ok: true, quota: refreshed }
  }
  async releaseQuota(merchantId: string, key: string, count = 1) {
    const q = await this.quota(merchantId)
    const map: Record<string, string> = {
      pushSlots: 'pushSlotsUsed',
      banner: 'bannerUsed',
      bannerLimit: 'bannerUsed',
      impression: 'impressionUsed',
      impressionLimit: 'impressionUsed',
    }
    const field = map[key]
    if (!field) throw new BizException(BizCode.INVALID_PARAMS, `未知配额 key: ${key}`)
    await this.prisma.usageQuota.update({
      where: { id: q.id },
      data: { [field]: { decrement: count } } as any,
    })
    return { ok: true, quota: await this.quota(merchantId) }
  }
}
