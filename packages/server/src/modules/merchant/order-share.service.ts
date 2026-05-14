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
 *   不新建 Prisma 表,用 SystemConfig key=`order_share:<shareCode>` 兜底。
 *   shareCode 用 nanoid 12 位(避免暴力枚举),value 含 orderId + visibleFields +
 *   expiresAt + intro + viewCount + createdAt。
 *   公开访问通过 shareCode 直接 findUnique,O(1) 查询无索引压力。
 *
 *   后续若上量(>10w 分享/月),建议迁移到正式表 OrderShare:
 *     model OrderShare {
 *       shareCode  String @id
 *       orderId    String
 *       merchantId String
 *       visibleFields Json
 *       expiresAt  DateTime?
 *       intro      String?
 *       viewCount  Int @default(0)
 *       revoked    Boolean @default(false)
 *       createdAt  DateTime @default(now())
 *       @@index([orderId])
 *       @@index([merchantId])
 *     }
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
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86400_000).toISOString() : null

    // 5. 撤销该订单已有的分享(同一订单同时只有一份生效)
    await this.revokePreviousByOrder(params.orderId)

    // 6. 生成新分享
    const shareCode = genShareCode()
    const config: OrderShareConfig = {
      orderId: params.orderId,
      merchantId: params.merchantId,
      visibleFields,
      expiresAt,
      intro: intro || undefined,
      viewCount: 0,
      revoked: false,
      createdAt: new Date().toISOString(),
      createdBy: params.callerSub,
    }
    await this.prisma.systemConfig.create({
      data: { key: `order_share:${shareCode}`, value: config as any },
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
    // 反查只能 startsWith 扫,但同一商家分享数有限,可接受
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'order_share:' } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })
    for (const r of rows) {
      const cfg = r.value as unknown as OrderShareConfig
      if (cfg?.orderId === orderId && cfg?.merchantId === merchantId && !cfg.revoked) {
        return { shareCode: r.key.replace('order_share:', ''), config: cfg }
      }
    }
    return null
  }

  /**
   * 商家撤销订单的当前分享(链接立即失效)
   */
  async revokeByOrder(orderId: string, merchantId: string) {
    const current = await this.getCurrentByOrder(orderId, merchantId)
    if (!current) return { ok: true, revoked: false }
    const updated: OrderShareConfig = { ...current.config, revoked: true }
    await this.prisma.systemConfig.update({
      where: { key: `order_share:${current.shareCode}` },
      data: { value: updated as any },
    })
    return { ok: true, revoked: true, shareCode: current.shareCode }
  }

  /**
   * 内部:创建新分享前把同一订单已有分享标 revoked
   * 避免一个订单有多个并存的 shareCode 互相干扰
   */
  private async revokePreviousByOrder(orderId: string) {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'order_share:' } },
      take: 200,
    })
    for (const r of rows) {
      const cfg = r.value as unknown as OrderShareConfig
      if (cfg?.orderId === orderId && !cfg.revoked) {
        const updated: OrderShareConfig = { ...cfg, revoked: true }
        await this.prisma.systemConfig
          .update({ where: { key: r.key }, data: { value: updated as any } })
          .catch(() => {})
      }
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
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: `order_share:${shareCode}` },
    })
    if (!row) throw new BizException(BizCode.NOT_FOUND, '分享不存在或已撤销')
    const cfg = row.value as unknown as OrderShareConfig
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
    this.incViewCount(shareCode, cfg).catch(() => {})

    return result
  }

  private async incViewCount(shareCode: string, cfg: OrderShareConfig) {
    const updated: OrderShareConfig = { ...cfg, viewCount: (cfg.viewCount || 0) + 1 }
    await this.prisma.systemConfig.update({
      where: { key: `order_share:${shareCode}` },
      data: { value: updated as any },
    })
  }

  /**
   * 商家维度分享历史（merchant-app「我的分享」/ admin-pc 兜底用）
   *
   * 查询策略与 platform 维度一致：SystemConfig key 前缀扫描 → 内存按 merchantId 过滤 →
   * 内存排序 + 分页。同一商家分享数有限（通常 < 千级），扫 500 行可接受；如果未来
   * 出现单商家 > 500 分享的极端场景，应按 schema 注释迁移到 OrderShare 正式表。
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
    const { page, pageSize } = parsePage(query)
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'order_share:' } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    // 解析 revoked 过滤值：query string 'true'/'false' 也兼容
    let revokedFilter: boolean | null = null
    if (query.revoked === true || query.revoked === 'true') revokedFilter = true
    else if (query.revoked === false || query.revoked === 'false') revokedFilter = false

    const matched: { shareCode: string; cfg: OrderShareConfig }[] = []
    for (const r of rows) {
      const cfg = r.value as unknown as OrderShareConfig
      if (!cfg || cfg.merchantId !== merchantId) continue
      if (revokedFilter !== null && !!cfg.revoked !== revokedFilter) continue
      if (query.orderId && cfg.orderId !== query.orderId) continue
      matched.push({ shareCode: r.key.replace('order_share:', ''), cfg })
    }

    const total = matched.length
    const start = (page - 1) * pageSize
    const slice = matched.slice(start, start + pageSize)

    // 批量取订单号摘要
    const orderIds = Array.from(new Set(slice.map((m) => m.cfg.orderId)))
    const orderMap = new Map<string, string>()
    if (orderIds.length) {
      const orders = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, no: true },
      })
      for (const o of orders) orderMap.set(o.id, o.no)
    }

    const now = Date.now()
    const list = slice.map(({ shareCode, cfg }) => ({
      shareCode,
      orderId: cfg.orderId,
      orderNo: orderMap.get(cfg.orderId) || null,
      merchantId: cfg.merchantId,
      visibleFields: cfg.visibleFields || [],
      expiresAt: cfg.expiresAt,
      intro: cfg.intro || '',
      viewCount: cfg.viewCount || 0,
      revoked: !!cfg.revoked,
      expired: !!(cfg.expiresAt && new Date(cfg.expiresAt).getTime() < now),
      createdAt: cfg.createdAt,
    }))

    return buildPage(list, total, page, pageSize)
  }
}
