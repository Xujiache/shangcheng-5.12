/**
 * 订单分享服务（商家端 → 客户）
 *
 * 业务定位：
 *   家装 / 定制 / 工程类业务场景下,商家需要把订单详情(报价 / 设计 / 量房 / 合同)
 *   分享给客户在小程序或 H5 查看。客户不需要登录,凭 shareCode 直接看脱敏后的订单。
 *
 * 字段可见性控制：
 *   - basics  订单号 / 状态 / 日期 / 总金额
 *   - customer 客户信息(姓名 / 电话 / 地址)
 *   - pricing  价格明细(单价 / 优惠 / 运费 / 应付)
 *   - items    商品 / 服务清单
 *   - extra    附加信息(备注 / 物流 / 量房 / 合同等定制字段)
 *
 * 存储策略：
 *   正式表 OrderShare,shareCode 用 nanoid 12 位作主键(避免暴力枚举),
 *   公开访问通过 shareCode 直接 findUnique,O(1) 查询。
 *   列表 / 撤销按 orderId / merchantId 走索引,不再有截断问题。
 *
 *   注意表存储 expiresAt / createdAt 为 DateTime,对外契约统一转 ISO string,
 *   visibleFields 存为 String[],对外按 ShareField[] 使用。
 */
import { Injectable } from '@nestjs/common'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'

export type ShareField = 'basics' | 'customer' | 'pricing' | 'items' | 'extra'

const VALID_FIELDS: ShareField[] = ['basics', 'customer', 'pricing', 'items', 'extra']

const genShareCode = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  12,
)

export interface OrderShareConfig {
  orderId: string
  merchantId: string
  /** 可见字段白名单;空数组表示全部隐藏(仅看订单号,等同被撤销) */
  visibleFields: ShareField[]
  /** 过期时间;null 表示永久 */
  expiresAt: string | null
  /** 微信分享时的自定义简介(可空) */
  intro?: string
  viewCount: number
  revoked: boolean
  createdAt: string
  /** 创建者商家用户 id,审计用 */
  createdBy?: string
}

@Injectable()
export class OrderShareService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建/更新分享(同一订单总是只有一份当前生效的分享,后建覆盖前面)
   */
  async createShare(params: {
    orderId: string
    merchantId: string
    callerSub: string
    visibleFields: ShareField[]
    /** 有效期天数;0 / 未传 = 永久(expiresAt=null) */
    expiresInDays?: number
    intro?: string
  }) {
    // 1. 校验订单归属
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, merchantId: true, no: true },
    })
    if (!order) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    if (order.merchantId !== params.merchantId) {
      throw new BizException(BizCode.FORBIDDEN, '无权分享他人订单')
    }

    // 2. 字段白名单过滤
    const visibleFields = (params.visibleFields || []).filter((f): f is ShareField =>
      VALID_FIELDS.includes(f as ShareField),
    )
    if (visibleFields.length === 0) {
      throw new BizException(BizCode.INVALID_PARAMS, '至少选择一项可见内容')
    }

    // 3. intro 长度限制(微信分享卡片标题约 40 字以内)
    const intro = (params.intro || '').trim().slice(0, 80)

    // 4. 过期时间
    const days = Math.max(0, Math.min(365, Number(params.expiresInDays) || 0))
    const expiresAtDate = days > 0 ? new Date(Date.now() + days * 86400_000) : null
    const expiresAt = expiresAtDate ? expiresAtDate.toISOString() : null

    // 5. 撤销该订单已有的分享(同一订单同时只有一份生效)
    await this.revokePreviousByOrder(params.orderId)

    // 6. 生成新分享
    const shareCode = genShareCode()
    await this.prisma.orderShare.create({
      data: {
        shareCode,
        orderId: params.orderId,
        merchantId: params.merchantId,
        visibleFields,
        expiresAt: expiresAtDate,
        intro: intro || null,
        createdBy: params.callerSub,
      },
    })

    return {
      shareCode,
      orderNo: order.no,
      expiresAt,
      visibleFields,
      intro,
    }
  }

  /**
   * 商家查询该订单当前生效的分享(用于回显编辑表单)
   */
  async getCurrentByOrder(
    orderId: string,
    merchantId: string,
  ): Promise<{
    shareCode: string
    config: OrderShareConfig
  } | null> {
    const row = await this.prisma.orderShare.findFirst({
      where: { orderId, merchantId, revoked: false },
      orderBy: { updatedAt: 'desc' },
    })
    if (!row) return null
    return { shareCode: row.shareCode, config: this.toConfig(row) }
  }

  /**
   * 商家撤销订单的当前分享(链接立即失效)
   */
  async revokeByOrder(orderId: string, merchantId: string) {
    const current = await this.getCurrentByOrder(orderId, merchantId)
    if (!current) return { ok: true, revoked: false }
    await this.prisma.orderShare.update({
      where: { shareCode: current.shareCode },
      data: { revoked: true },
    })
    return { ok: true, revoked: true, shareCode: current.shareCode }
  }

  /**
   * 内部:创建新分享前把同一订单已有分享标 revoked
   * 避免一个订单有多个并存的 shareCode 互相干扰
   */
  private async revokePreviousByOrder(orderId: string) {
    await this.prisma.orderShare.updateMany({
      where: { orderId, revoked: false },
      data: { revoked: true },
    })
  }

  /**
   * 把 OrderShare 行映射成对外的 OrderShareConfig 契约形状
   * （DateTime → ISO string，String[] → ShareField[]）
   */
  private toConfig(row: {
    orderId: string
    merchantId: string
    visibleFields: string[]
    expiresAt: Date | null
    intro: string | null
    viewCount: number
    revoked: boolean
    createdAt: Date
    createdBy: string | null
  }): OrderShareConfig {
    return {
      orderId: row.orderId,
      merchantId: row.merchantId,
      visibleFields: (row.visibleFields || []) as ShareField[],
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      intro: row.intro || undefined,
      viewCount: row.viewCount || 0,
      revoked: !!row.revoked,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy || undefined,
    }
  }

  /**
   * 公开访问:按 shareCode 拉脱敏后的订单
   *
   * 返回结构按 visibleFields 严格过滤,被隐藏的字段不在返回 JSON 中,
   * 避免客户端通过浏览器 devtools 反向取到敏感信息。
   *
   * 同时:
   *   - revoked → 抛 410 Gone
   *   - expiresAt 过期 → 抛 410 Gone
   *   - viewCount +1(异步,不阻塞响应)
   */
  async getPublicByCode(shareCode: string) {
    if (!shareCode || shareCode.length < 6) {
      throw new BizException(BizCode.NOT_FOUND, '分享不存在')
    }
    const row = await this.prisma.orderShare.findUnique({
      where: { shareCode },
    })
    if (!row) throw new BizException(BizCode.NOT_FOUND, '分享不存在或已撤销')
    const cfg = this.toConfig(row)
    if (cfg.revoked) throw new BizException(BizCode.FORBIDDEN, '该分享已被商家撤销')
    if (cfg.expiresAt && new Date(cfg.expiresAt).getTime() < Date.now()) {
      throw new BizException(BizCode.FORBIDDEN, '该分享链接已过期')
    }

    // 商户在 Merchant 表，order.merchantId 是字符串外键；用 select 拿出来。
    // Merchant 表没有 logo 字段（avatar 走 SystemConfig profile-extras）
    const orderRow = (await this.prisma.order.findUnique({
      where: { id: cfg.orderId },
      include: {
        items: true,
      },
    })) as any
    if (!orderRow) throw new BizException(BizCode.NOT_FOUND, '订单已不存在')

    const merchantRow = orderRow.merchantId
      ? await this.prisma.merchant.findUnique({
          where: { id: orderRow.merchantId },
          select: { id: true, name: true, contactPhone: true },
        })
      : null

    const order: any = orderRow

    const visible = new Set(cfg.visibleFields)
    const result: any = {
      shareCode,
      intro: cfg.intro,
      expiresAt: cfg.expiresAt,
      merchant: merchantRow,
    }

    if (visible.has('basics')) {
      result.basics = {
        no: order.no,
        status: order.status,
        totalAmount: order.totalAmount,
        payAmount: order.payAmount,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        completedAt: order.completedAt,
      }
    }
    if (visible.has('customer')) {
      const addr = (order.address as any) || {}
      result.customer = {
        name: addr.name || null,
        phone: addr.phone || null,
        region: addr.region || null,
        detail: addr.detail || null,
      }
    }
    if (visible.has('pricing')) {
      result.pricing = {
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        couponDiscount: order.couponDiscount,
        payAmount: order.payAmount,
        paymentMethod: order.paymentMethod,
      }
    }
    if (visible.has('items')) {
      result.items = order.items.map((it: any) => ({
        id: it.id,
        productName: it.productName,
        productImage: it.productImage,
        specsLabel: it.specsLabel,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      }))
    }
    if (visible.has('extra')) {
      result.extra = {
        remark: order.remark,
        shippingMethod: order.shippingMethod,
        trackingCompany: order.trackingCompany,
        trackingNumber: order.trackingNumber,
      }
    }

    // 异步累加浏览数,不阻塞响应
    this.prisma.orderShare
      .update({ where: { shareCode }, data: { viewCount: { increment: 1 } } })
      .catch(() => {})

    return result
  }

  /**
   * 商家维度分享历史（merchant-app「我的分享」/ admin-pc 兜底用）
   *
   * 直接走 OrderShare 表索引（merchantId / revoked），真分页（skip / take）+ count，
   * 不再扫描内存切片。
   *
   * 过滤维度：
   *   - revoked: true/false（不传不过滤）
   *   - orderId: 精确匹配（按订单回查分享）
   *
   * 每条记录会拼接 orderNo 摘要，便于前端列表直接 row.orderNo 展示，
   * 避免 N 次详情查询。
   */
  async listByMerchant(
    merchantId: string,
    query: {
      page?: number | string
      pageSize?: number | string
      revoked?: boolean | string
      orderId?: string
    } = {},
  ) {
    const { skip, take, page, pageSize } = parsePage(query)

    // 解析 revoked 过滤值：query string 'true'/'false' 也兼容
    const where: any = { merchantId }
    if (query.revoked === true || query.revoked === 'true') where.revoked = true
    else if (query.revoked === false || query.revoked === 'false') where.revoked = false
    if (query.orderId) where.orderId = query.orderId

    const [rows, total] = await Promise.all([
      this.prisma.orderShare.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.orderShare.count({ where }),
    ])

    // 批量取订单号摘要
    const orderIds = Array.from(new Set(rows.map((r) => r.orderId)))
    const orderMap = new Map<string, string>()
    if (orderIds.length) {
      const orders = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, no: true },
      })
      for (const o of orders) orderMap.set(o.id, o.no)
    }

    const now = Date.now()
    const list = rows.map((r) => ({
      shareCode: r.shareCode,
      orderId: r.orderId,
      orderNo: orderMap.get(r.orderId) || null,
      merchantId: r.merchantId,
      visibleFields: r.visibleFields || [],
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      intro: r.intro || '',
      viewCount: r.viewCount || 0,
      revoked: !!r.revoked,
      expired: !!(r.expiresAt && r.expiresAt.getTime() < now),
      createdAt: r.createdAt.toISOString(),
    }))

    return buildPage(list, total, page, pageSize)
  }
}
