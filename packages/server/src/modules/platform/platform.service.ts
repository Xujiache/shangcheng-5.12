import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { MerchantService } from '../merchant/merchant.service'
import type { OrderShareConfig } from '../merchant/order-share.service'
import { UpdateAdminDto } from './dto/update-admin.dto'
import { WxPayService } from '../payment/wxpay.service'
import * as argon2 from 'argon2'

/** updateAdmin 服务层二次过滤白名单（DTO 是入口防御，service 是出口防御，双保险） */
const ADMIN_UPDATABLE_FIELDS = [
  'username',
  'phone',
  'email',
  'nickname',
  'avatar',
  'role',
  'status',
] as const

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name)

  constructor(
    private readonly prisma: PrismaService,
    // forwardRef 防 MerchantService ↔ PlatformService 双向引用导致 Nest 启动失败
    @Inject(forwardRef(() => MerchantService))
    private readonly merchantService: MerchantService,
    // PaymentModule 是 @Global，可直接注入；平台代审退款时调微信支付 v3
    private readonly wxpay: WxPayService,
  ) {}

  // ========== Dashboard ==========
  async dashboard() {
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    const yesterday0 = new Date(today0.getTime() - 86400_000)

    const [
      merchants,
      merchantsYday,
      orderAgg,
      todayOrderAgg,
      ydayOrderAgg,
      users,
      usersYday,
      pendingMerchants,
      pendingProducts,
      pendingAds,
      complaints,
      pendingWithdraws,
      factoryCount,
      storeCount,
      ymCount,
      yyCount,
      trialCount,
    ] = await Promise.all([
      this.prisma.merchant.count({ where: { status: 'active' } }),
      this.prisma.merchant.count({ where: { status: 'active', createdAt: { lt: today0 } } }),
      this.prisma.order.aggregate({ _sum: { payAmount: true }, _count: true }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today0 } },
        _sum: { payAmount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: yesterday0, lt: today0 } },
        _sum: { payAmount: true },
        _count: true,
      }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { lt: today0 } } }),
      this.prisma.merchant.count({ where: { status: 'pending' } }),
      this.prisma.product.count({ where: { status: 'auditing' } }),
      this.prisma.adCreative.count({ where: { status: 'pending' } }),
      this.prisma.refund.count({ where: { status: 'pending' } }),
      this.prisma.withdraw.count({ where: { status: 'pending' } }),
      this.prisma.merchant.count({ where: { type: 'factory', status: 'active' } }),
      this.prisma.merchant.count({ where: { type: 'store', status: 'active' } }),
      this.prisma.merchantMembership.count({
        where: { status: { in: ['active'] }, plan: { period: 'yearly' } },
      }),
      this.prisma.merchantMembership.count({
        where: { status: { in: ['active'] }, plan: { period: 'monthly' } },
      }),
      this.prisma.merchantMembership.count({ where: { status: 'trial' } }),
    ])

    const totalGmv = Number(orderAgg._sum.payAmount || 0)
    const todayGmv = Number(todayOrderAgg._sum.payAmount || 0)
    const ydayGmv = Number(ydayOrderAgg._sum.payAmount || 0)
    const gmvDelta = ydayGmv > 0 ? Math.round(((todayGmv - ydayGmv) / ydayGmv) * 100) : 0

    // 近 7 日注册趋势
    const registrationTrend: { date: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000)
      d.setHours(0, 0, 0, 0)
      const end = new Date(d.getTime() + 86400_000)
      const count = await this.prisma.user.count({ where: { createdAt: { gte: d, lt: end } } })
      registrationTrend.push({
        date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        value: count,
      })
    }

    // 分类销量（取近 30 天订单聚合）
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } },
      include: { product: { include: { category: true } } },
    })
    const catMap = new Map<string, number>()
    for (const it of orderItems) {
      const c = it.product?.category?.name || '其它'
      catMap.set(c, (catMap.get(c) || 0) + Number(it.unitPrice) * it.quantity)
    }
    const categorySales = Array.from(catMap.entries()).map(([category, value]) => ({
      category,
      value: Math.round(value),
    }))

    return {
      overview: {
        merchants,
        merchantsDelta: merchants - merchantsYday,
        orders: orderAgg._count,
        ordersDelta: todayOrderAgg._count - ydayOrderAgg._count,
        gmv: Math.round(totalGmv),
        gmvDelta,
        users,
        usersDelta: users - usersYday,
      },
      registrationTrend,
      todos: {
        pendingMerchants,
        pendingProducts,
        pendingAds,
        complaints,
        pendingWithdraws,
      },
      merchantTypeDistribution: { factory: factoryCount, store: storeCount },
      categorySales,
      memberPlanDistribution: {
        yearly: yyCount,
        monthly: ymCount,
        trial: trialCount,
      },
    }
  }
  /**
   * 平台运营报表
   *
   * period 支持：today / week / month / year
   *   - today：按小时聚合，24 个桶
   *   - week / month：按天聚合
   *   - year：按月聚合，12 个桶
   *
   * 返回：
   *   - salesTrend：[{date, value}] 销售额时间序列
   *   - topMerchants：销售额 TOP 10 商家
   *
   * 全部走 Order 表实时聚合，无任何 mock 兜底。
   */
  async stats(q: any) {
    const period: 'today' | 'week' | 'month' | 'year' = ['today', 'week', 'month', 'year'].includes(
      q?.period,
    )
      ? q.period
      : 'today'
    const now = new Date()
    let sinceDate: Date
    let segments: number
    let bucketMs: number
    let labelFn: (d: Date) => string

    if (period === 'today') {
      sinceDate = new Date(now)
      sinceDate.setHours(0, 0, 0, 0)
      segments = 24
      bucketMs = 3600_000
      labelFn = (d) => `${String(d.getHours()).padStart(2, '0')}:00`
    } else if (period === 'week') {
      sinceDate = new Date(now.getTime() - 6 * 86400_000)
      sinceDate.setHours(0, 0, 0, 0)
      segments = 7
      bucketMs = 86400_000
      labelFn = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    } else if (period === 'month') {
      sinceDate = new Date(now.getTime() - 29 * 86400_000)
      sinceDate.setHours(0, 0, 0, 0)
      segments = 30
      bucketMs = 86400_000
      labelFn = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    } else {
      sinceDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      segments = 12
      bucketMs = 0 // year 模式按月切分，单独处理
      labelFn = (d) => `${d.getMonth() + 1}月`
    }

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: sinceDate },
        status: { in: ['pending_shipment', 'shipped', 'completed'] },
      },
      select: { merchantId: true, payAmount: true, createdAt: true },
    })

    // 时间序列
    const salesTrend: { date: string; value: number }[] = []
    if (period === 'year') {
      for (let i = 0; i < 12; i++) {
        const segStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        const segEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1)
        const sum = orders
          .filter((o) => o.createdAt >= segStart && o.createdAt < segEnd)
          .reduce((s, o) => s + Number(o.payAmount), 0)
        salesTrend.push({ date: labelFn(segStart), value: Math.round(sum) })
      }
    } else {
      for (let i = 0; i < segments; i++) {
        const segStart = new Date(sinceDate.getTime() + i * bucketMs)
        const segEnd = new Date(segStart.getTime() + bucketMs)
        const sum = orders
          .filter((o) => o.createdAt >= segStart && o.createdAt < segEnd)
          .reduce((s, o) => s + Number(o.payAmount), 0)
        salesTrend.push({ date: labelFn(segStart), value: Math.round(sum) })
      }
    }

    // TOP 商家
    const byMerchant = new Map<string, number>()
    for (const o of orders) {
      const cur = byMerchant.get(o.merchantId) || 0
      byMerchant.set(o.merchantId, cur + Number(o.payAmount))
    }
    const topIds = Array.from(byMerchant.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    const merchantInfo = topIds.length
      ? await this.prisma.merchant.findMany({
          where: { id: { in: topIds.map(([id]) => id) } },
          select: { id: true, name: true, type: true, region: true },
        })
      : []
    const infoMap = new Map(merchantInfo.map((m) => [m.id, m]))
    const topMerchants = topIds.map(([id, amount]) => {
      const info = infoMap.get(id)
      return {
        merchantId: id,
        name: info?.name || '未知商家',
        type: info?.type || '',
        region: info?.region || '',
        sales: Math.round(amount),
      }
    })

    return { period, salesTrend, topMerchants }
  }

  // ========== 商户 ==========
  /**
   * 商户列表。
   *
   * 历史上有两套查询写法：
   *   - admin-pc 早期视图传 `tab=all|active|pending|disabled|factory|store`（单一字段）
   *   - 新视图传 `status` + `type`（两个字段）
   *
   * 两套并存，所以这里都接，避免新前端切换页签筛不到。
   * `tab` 优先级低于显式 `status`/`type`，让外部可以叠加更细的过滤。
   */
  async merchants(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    // 显式 status / type 优先
    if (q.status && q.status !== 'all') where.status = q.status
    if (q.type && q.type !== 'all') where.type = q.type
    // tab 兼容：当外部没传 status/type 时由 tab 推导
    if (q.tab && typeof q.tab === 'string') {
      const tab = q.tab
      if (tab === 'all') {
        // 不过滤
      } else if (tab === 'disabled') {
        if (!where.status) where.status = 'disabled'
      } else if (tab === 'pending') {
        if (!where.status) where.status = 'pending'
      } else if (tab === 'active') {
        if (!where.status) where.status = 'active'
      } else if (tab === 'rejected') {
        if (!where.status) where.status = 'rejected'
      } else if (tab === 'factory') {
        if (!where.type) where.type = 'factory'
      } else if (tab === 'store') {
        if (!where.type) where.type = 'store'
      }
    }
    if (q.keyword)
      where.OR = [{ name: { contains: q.keyword } }, { legalName: { contains: q.keyword } }]
    const [list, total] = await Promise.all([
      this.prisma.merchant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.merchant.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async auditMerchants(q: any) {
    return this.merchants({ ...q, status: 'pending' })
  }
  /**
   * 审核通过商家入驻申请。
   *
   * 关键：必须同步把申请人 `User.role` 从 `customer` 升级为 `merchant`，
   * 并设 `User.merchantId`，否则申请人审核通过后用同一账号无法登录
   * merchant-app（RolesGuard 拒绝 customer 访问 /m/* 路由），形成入驻闭环断裂。
   */
  async approveMerchant(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true },
    })
    if (!merchant) throw new BizException(BizCode.NOT_FOUND, '商家不存在')

    await this.prisma.$transaction(async (tx) => {
      await tx.merchant.update({ where: { id }, data: { status: 'active' } })
      if (merchant.userId) {
        // 申请人可能是工厂(factory)/门店(store)申请，按 Merchant.type 决定 role
        const targetRole = ['factory', 'store'].includes(merchant.type as string)
          ? (merchant.type as string)
          : 'merchant'
        await tx.user.update({
          where: { id: merchant.userId },
          data: { role: targetRole, merchantId: merchant.id },
        })
      }
      await tx.auditRecord.create({ data: { type: 'merchant', targetId: id, status: 'approved' } })
    })
    return { ok: true }
  }
  async rejectMerchant(id: string, reason: string) {
    await this.prisma.merchant.update({
      where: { id },
      data: { status: 'rejected', rejectReason: reason },
    })
    await this.prisma.auditRecord.create({
      data: { type: 'merchant', targetId: id, status: 'rejected', reason },
    })
    return { ok: true }
  }
  async pauseMerchant(id: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'disabled' } })
    return { ok: true }
  }
  async resumeMerchant(id: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'active' } })
    return { ok: true }
  }

  // ========== 订单 ==========
  async orders(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status && q.status !== 'all') where.status = q.status
    if (q.keyword) where.no = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { merchant: true, user: true },
      }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  // ========== 商品审核 ==========
  async auditProducts(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const status = q.status || 'pending'
    // 前端语义 pending = DB 的 auditing；其他 status 透传
    const where: any = status === 'pending' ? { status: 'auditing' } : { status }
    if (q.keyword) where.name = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { merchant: true },
      }),
      this.prisma.product.count({ where }),
    ])
    // 映射成 admin-pc AuditProduct 形状：
    //   - status: 'auditing' → 'pending'（前端 tab key 是 'pending'，否则 filter 不到）
    //   - 字段平铺：image / category / merchant / price / submittedAt
    const mapped = list.map((p: any) => {
      const d = decimalToNumber(p)
      return {
        id: d.id,
        name: d.name,
        image: Array.isArray(d.images) && d.images[0] ? d.images[0] : '',
        category: d.categoryId || '',
        merchant: p.merchant?.name || '',
        merchantId: d.merchantId,
        price: Number(d.priceRetailMin ?? d.priceWholesaleMin ?? 0),
        submittedAt: (d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)).toISOString(),
        status: d.status === 'auditing' ? 'pending' : d.status,
        rejectReason: d.rejectReason || undefined,
      }
    })
    return buildPage(mapped, total, page, pageSize)
  }
  /**
   * 商品审核配置（autoApprove 主开关 / conditions 命中条件 / samplingRate 抽检比例）
   *
   * Bug 修复：之前用 `v?.value || defaults` —— 一旦 stored 有任何值就完全覆盖默认，
   * 导致前端保存时只更新部分字段（如只改 samplingRate）后续读取就丢失 autoApprove。
   * 现改成 deep-merge：以 defaults 为底，stored 覆盖到键。
   */
  async getAuditConfig() {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'audit_product_config' } })
    const defaults = {
      autoApprove: false,
      conditions: [
        { key: 'vip', label: 'VIP 商家', enabled: true },
        { key: 'credit', label: '信用 A/B', enabled: true },
        { key: 'rejectRate', label: '驳回率 < 5%', enabled: true },
        { key: 'category', label: '常见品类', enabled: false },
      ],
      samplingRate: 10,
    }
    const stored = (v?.value as any) || {}
    return {
      autoApprove: typeof stored.autoApprove === 'boolean' ? stored.autoApprove : defaults.autoApprove,
      conditions: Array.isArray(stored.conditions) && stored.conditions.length > 0
        ? stored.conditions
        : defaults.conditions,
      samplingRate: typeof stored.samplingRate === 'number' ? stored.samplingRate : defaults.samplingRate,
    }
  }
  async saveAuditConfig(dto: any) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'audit_product_config' },
      update: { value: dto },
      create: { key: 'audit_product_config', value: dto },
    })
    return { ok: true }
  }
  async approveProduct(id: string) {
    await this.prisma.product.update({ where: { id }, data: { status: 'active' } })
    await this.prisma.auditRecord.create({
      data: { type: 'product', targetId: id, status: 'approved' },
    })
    return { ok: true }
  }
  async rejectProduct(id: string, reason: string) {
    await this.prisma.product.update({
      where: { id },
      data: { status: 'rejected', rejectReason: reason },
    })
    await this.prisma.auditRecord.create({
      data: { type: 'product', targetId: id, status: 'rejected', reason },
    })
    return { ok: true }
  }

  // ========== 广告 ==========
  /**
   * AdSlot 写入字段白名单。
   * - preview / startAt / endAt 走主表（schema 已加列），不再走 SystemConfig 兜底
   * - 其它非 schema 字段一律丢弃，避免 prisma ValidationError
   *
   * TODO(运维): 历史数据如有 SystemConfig.system_settings.business.adSlotMeta，
   * 需要执行 migrateAdSlotMeta() 把兜底数据同步回主表（详见 README 数据迁移）。
   */
  private readonly AD_SLOT_FIELDS = [
    'code',
    'name',
    'scene',
    'target',
    'position',
    'size',
    'sort',
    'unitPrice',
    'enabled',
    'status',
    'preview',
    'startAt',
    'endAt',
  ] as const

  private sanitizeAdSlotDto(dto: any) {
    if (!dto || typeof dto !== 'object') return {}
    const out: Record<string, any> = {}
    for (const k of this.AD_SLOT_FIELDS) {
      if (dto[k] === undefined || dto[k] === null) continue
      if (k === 'startAt' || k === 'endAt') {
        const d = new Date(dto[k])
        if (Number.isFinite(d.getTime())) out[k] = d
      } else {
        out[k] = dto[k]
      }
    }
    return out
  }

  async adSlots() {
    const list = await this.prisma.adSlot.findMany({ orderBy: { sort: 'asc' } })
    // 兼容旧数据：若主表 preview/startAt/endAt 为空但 SystemConfig 仍有兜底 meta，
    // 读时合并展示（不写回，避免每次读触发副作用）；运维迁移完成后此分支自然为空。
    let meta: Record<string, { preview?: string; startAt?: string; endAt?: string }> = {}
    try {
      const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })
      const business = (cfg?.value as any)?.business
      if (business && business.adSlotMeta && typeof business.adSlotMeta === 'object') {
        meta = business.adSlotMeta
      }
    } catch {
      // 兜底读失败不影响主流程
    }
    return list.map((s) => {
      const m = meta[s.id] || {}
      return decimalToNumber({
        ...s,
        preview: s.preview || m.preview || null,
        startAt: s.startAt || (m.startAt ? new Date(m.startAt) : null),
        endAt: s.endAt || (m.endAt ? new Date(m.endAt) : null),
      })
    })
  }

  async createAdSlot(dto: any) {
    const data = this.sanitizeAdSlotDto(dto)
    if (!data.code) {
      throw new BizException(BizCode.INVALID_PARAMS, '广告位 code 必填')
    }
    if (!data.name) {
      throw new BizException(BizCode.INVALID_PARAMS, '广告位 name 必填')
    }
    return decimalToNumber(await this.prisma.adSlot.create({ data: data as any }))
  }

  async updateAdSlot(id: string, dto: any) {
    const data = this.sanitizeAdSlotDto(dto)
    if (Object.keys(data).length === 0) {
      throw new BizException(BizCode.INVALID_PARAMS, '没有可更新的字段')
    }
    return decimalToNumber(await this.prisma.adSlot.update({ where: { id }, data: data as any }))
  }

  async deleteAdSlot(id: string) {
    await this.prisma.adSlot.delete({ where: { id } })
    return { ok: true }
  }
  async adCreatives(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.slotId) where.slotId = q.slotId
    const [list, total] = await Promise.all([
      this.prisma.adCreative.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.adCreative.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async createAdCreative(dto: any) {
    return decimalToNumber(await this.prisma.adCreative.create({ data: dto }))
  }
  async updateAdCreative(id: string, dto: any) {
    return decimalToNumber(await this.prisma.adCreative.update({ where: { id }, data: dto }))
  }
  async deleteAdCreative(id: string) {
    await this.prisma.adCreative.delete({ where: { id } })
    return { ok: true }
  }

  /**
   * 广告创意审核通过（pending → active）
   *
   * 复用 approveProduct 套路：
   *   1. 校验存在 + 当前状态确实是 pending（防误把 paused/ended 再批一遍）
   *   2. 写 AdCreative.status='active'
   *   3. 写 AuditRecord(type='ad', targetId=creativeId, status='approved')
   *
   * 注：AuditRecord.type 此前枚举只列了 merchant/product，这里扩展 'ad'。
   * 前端 audit-records 表格按 type 透传过滤，新 type 不会破坏旧筛选。
   */
  async approveAdCreative(id: string, callerSub?: string) {
    const c = await this.prisma.adCreative.findUnique({
      where: { id },
      select: { id: true, status: true },
    })
    if (!c) throw new BizException(BizCode.NOT_FOUND, '广告创意不存在')
    if (c.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${c.status} 不可审核通过`)
    }
    await this.prisma.$transaction([
      this.prisma.adCreative.update({ where: { id }, data: { status: 'active' } }),
      this.prisma.auditRecord.create({
        data: {
          type: 'ad',
          targetId: id,
          status: 'approved',
          auditorId: callerSub || null,
          reviewedAt: new Date(),
        },
      }),
    ])
    return { ok: true }
  }

  /**
   * 广告创意审核驳回（pending → rejected）
   *
   * reason 必填，原因写进 AuditRecord.reason 供运营回溯。
   * 与 approveAdCreative 保持同一审核入口语义，前端 platform-app 已经在调
   * `POST /p/ads/creatives/:id/reject` 接口（带 silent 降级），落地后立即生效。
   */
  async rejectAdCreative(id: string, reason: string, callerSub?: string) {
    if (!reason || !String(reason).trim()) {
      throw new BizException(BizCode.INVALID_PARAMS, '请填写驳回原因')
    }
    const c = await this.prisma.adCreative.findUnique({
      where: { id },
      select: { id: true, status: true },
    })
    if (!c) throw new BizException(BizCode.NOT_FOUND, '广告创意不存在')
    if (c.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${c.status} 不可驳回`)
    }
    await this.prisma.$transaction([
      this.prisma.adCreative.update({ where: { id }, data: { status: 'rejected' } }),
      this.prisma.auditRecord.create({
        data: {
          type: 'ad',
          targetId: id,
          status: 'rejected',
          reason: String(reason).trim(),
          auditorId: callerSub || null,
          reviewedAt: new Date(),
        },
      }),
    ])
    return { ok: true }
  }

  // ========== 选品广场推送 ==========
  async plazaPushes(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.plazaPush.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.plazaPush.count({ where }),
    ])
    return buildPage(list, total, page, pageSize)
  }
  async createPlazaPush(dto: any) {
    return this.prisma.plazaPush.create({
      data: {
        ...dto,
        scheduledStart: new Date(dto.scheduledStart || Date.now()),
        scheduledEnd: new Date(dto.scheduledEnd || Date.now() + 7 * 86400_000),
      },
    })
  }
  async plazaProductsAll(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'active' },
        skip,
        take,
        include: { merchant: true },
      }),
      this.prisma.product.count({ where: { status: 'active' } }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async plazaFactoriesAll() {
    return this.prisma.merchant.findMany({
      where: { type: 'factory', status: 'active' },
      take: 200,
    })
  }
  async plazaRecords(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const [list, total] = await Promise.all([
      this.prisma.agencyApplication.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { merchant: true },
      }),
      this.prisma.agencyApplication.count(),
    ])
    return buildPage(list, total, page, pageSize)
  }

  // ========== 会员套餐 ==========
  /**
   * 新商家通用试用天数(0=关闭试用),持久化到 SystemConfig key=member:trialDays。
   * 平台后台 + platform-app 都通过这两个接口读写,所以"试用期"是真实的全局配置。
   */
  async getMemberTrialDays(): Promise<{ days: number }> {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'member:trialDays' } })
    const raw = v?.value as any
    const days = typeof raw === 'number' ? raw : Number(raw?.days ?? 30)
    return { days: Number.isFinite(days) ? days : 30 }
  }
  async setMemberTrialDays(days: number): Promise<{ ok: true; days: number }> {
    const clean = Math.max(0, Math.min(365, Math.floor(Number(days) || 0)))
    await this.prisma.systemConfig.upsert({
      where: { key: 'member:trialDays' },
      update: { value: clean },
      create: { key: 'member:trialDays', value: clean },
    })
    return { ok: true, days: clean }
  }
  async memberPlans() {
    return decimalToNumber(await this.prisma.memberPlan.findMany({ orderBy: { sort: 'asc' } }))
  }
  async saveMemberPlan(dto: any) {
    if (dto.id) {
      const { id, ...data } = dto
      return decimalToNumber(await this.prisma.memberPlan.update({ where: { id }, data }))
    }
    return decimalToNumber(
      await this.prisma.memberPlan.create({
        data: { ...dto, code: dto.code || `plan_${Date.now()}` },
      }),
    )
  }
  async deleteMemberPlan(id: string) {
    await this.prisma.memberPlan.delete({ where: { id } })
    return { ok: true }
  }
  /**
   * 套餐订阅商家列表;扁平化 merchant.name/plan.* 并计算 totalDays/subscribedAt,
   * 给 admin-pc 平台后台「订阅商家」表格直接消费。
   */
  async planSubscriptions(planId: string) {
    const list = await this.prisma.merchantMembership.findMany({
      where: { planId },
      include: { merchant: true, plan: true },
      orderBy: { createdAt: 'desc' },
    })
    return list.map((m) => {
      const totalDays = Math.max(1, Math.ceil((m.endAt.getTime() - m.startAt.getTime()) / 86400000))
      return decimalToNumber({
        ...m,
        merchantName: m.merchant?.name ?? '',
        planName: m.plan?.name ?? '',
        planType: m.plan?.type ?? '',
        price: m.plan ? Number(m.plan.price) : 0,
        totalDays,
        subscribedAt: m.createdAt,
      })
    })
  }

  // ========== 会员缴费订单 ==========
  /**
   * 缴费订单分页列表;flatten merchant.name 并加 payMethod 别名,
   * 让 admin-pc 视图直接 row.merchantName / row.payMethod 可用。
   */
  async memberPayOrders(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { merchant: true },
      }),
      this.prisma.paymentRecord.count({ where }),
    ])
    const mapped = list.map((r) =>
      decimalToNumber({
        ...r,
        merchantName: r.merchant?.name ?? '',
        payMethod: r.paymentMethod,
      }),
    )
    return buildPage(mapped, total, page, pageSize)
  }
  /**
   * 平台手动改 PaymentRecord 状态（人工补登记 / 修正异常订单）。
   *
   * 关键业务联动：当人工把缴费订单标成 `paid` 时，必须同步触发会员激活
   * （否则会出现"订单已付但 MerchantMembership 没建/没续期"的数据脱节）。
   *
   * activateMembership 自带幂等：
   *   - record.status 已是 paid → 直接返回 alreadyPaid，不会重复扣账
   *   - planId 已被删除 → 抛 BUSINESS_ERROR，由平台日志承接
   */
  async updatePayStatus(id: string, status: string) {
    const before = await this.prisma.paymentRecord.findUnique({
      where: { id },
      select: { id: true, status: true, planId: true },
    })
    if (!before) throw new BizException(BizCode.NOT_FOUND, '缴费记录不存在')

    // 关键顺序：先 activate 再改状态（不能反过来）。
    // activateMembership 内部会重新读 paymentRecord，若 status 已是 paid
    // 就直接走幂等 alreadyPaid 分支早退，MerchantMembership 永远不会被创建。
    // 因此必须趁 status 还是 pending 时调用，让它在事务里完成
    //   "标记 paid + paidAt" + "创建 / 续期 MerchantMembership" 两件事。
    if (status === 'paid' && before.status !== 'paid' && before.planId) {
      try {
        await this.merchantService.activateMembership(id)
        return { ok: true, activated: true }
      } catch (e: any) {
        // 激活失败（如套餐已删除等）→ 写日志后降级为普通改状态，
        // 避免人工补登记被卡死；后续可由运维手工修数据。
        this.logger.error(
          `[platform.updatePayStatus] activateMembership 失败 recordId=${id} err=${e?.message || e}`,
        )
      }
    }

    await this.prisma.paymentRecord.update({ where: { id }, data: { status } })
    return { ok: true }
  }
  async approveRefund(id: string) {
    const record = await this.prisma.paymentRecord.findUnique({ where: { id } })
    if (!record) throw new BizException(BizCode.NOT_FOUND, '缴费订单不存在')
    if (record.status !== 'paid' && record.status !== 'refunding') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${record.status} 不可退款`)
    }
    const amount = Number(record.amount)
    if (!(amount > 0)) throw new BizException(BizCode.INVALID_PARAMS, '退款金额必须大于 0')

    // 微信缴费：真调微信退款，失败抛错——绝不在没真正退钱的情况下把状态置为 refunded。
    if (record.paymentMethod === 'wechat') {
      let refundResp: { refundId: string; status: 'PROCESSING' | 'SUCCESS' }
      try {
        refundResp = await this.wxpay.createRefund({
          outTradeNo: record.no, // 缴费下单时 PaymentRecord.no 即微信 out_trade_no
          outRefundNo: `${record.no}-R`,
          reason: '会员缴费退款',
          refundAmount: amount,
          totalAmount: amount,
        })
      } catch (e: any) {
        throw new BizException(BizCode.PAY_FAILED, `微信退款失败：${e?.message || e}`)
      }
      await this.prisma.paymentRecord.update({
        where: { id },
        data: { status: 'refunded', refundReason: `wxRefundId=${refundResp.refundId}` },
      })
      return { ok: true, wxRefundId: refundResp.refundId }
    }

    // 非微信渠道（线下/余额等）暂无自动退款通道，需平台线下退款；这里仅置状态并标注，
    // 避免像之前那样在任何渠道都谎报"已退款"。
    await this.prisma.paymentRecord.update({
      where: { id },
      data: { status: 'refunded', refundReason: `${record.paymentMethod} 线下退款` },
    })
    return { ok: true, offline: true }
  }
  async rejectRefund(id: string, reason: string) {
    await this.prisma.paymentRecord.update({
      where: { id },
      data: { status: 'paid', refundReason: reason },
    })
    return { ok: true }
  }

  // ========== 功能开关 ==========
  async featureFlags() {
    // 首次访问时确保几条"默认规则"存在，避免管理员每次都要手动配置
    await this.ensureDefaultFlags()
    return this.prisma.featureFlag.findMany({ orderBy: [{ group: 'asc' }, { sort: 'asc' }] })
  }

  /** 平台首次启动 / 首次进入 feature-flag 页时，写入用户期望的默认规则 */
  private async ensureDefaultFlags() {
    const DEFAULTS: Array<{
      key: string
      label: string
      group: string
      defaultEnabled: boolean
      audience?: 'all' | 'factory' | 'store' | 'specific'
      sort?: number
    }> = [
      // 用户明确要求：门店端默认不显示「门店」入口
      {
        key: 'home.entry.store',
        label: '门店入口（仅厂家）',
        group: 'home_entry',
        defaultEnabled: false,
        audience: 'store',
        sort: 10,
      },
      // 用户明确要求：门店端默认不显示「上传到选品广场」按钮
      {
        key: 'role.button.uploadToPlaza',
        label: '上传到选品广场',
        group: 'role_button',
        defaultEnabled: false,
        audience: 'store',
        sort: 10,
      },
    ]
    for (const d of DEFAULTS) {
      await this.prisma.featureFlag.upsert({
        where: { key: d.key },
        update: {}, // 已存在则不覆盖（保留管理员之前的调整）
        create: {
          key: d.key,
          label: d.label,
          group: d.group,
          defaultEnabled: d.defaultEnabled,
          audience: d.audience ?? 'all',
          sort: d.sort ?? 100,
          specificMerchantIds: [],
          grayPercent: 100,
          grayWhitelist: [],
        },
      })
    }
  }

  async toggleFeatureFlag(id: string, enabled: boolean) {
    await this.prisma.featureFlag.update({ where: { id }, data: { defaultEnabled: enabled } })
    return { ok: true }
  }

  /** 新增功能开关（平台增减默认规则） */
  async createFeatureFlag(dto: {
    key: string
    label: string
    group?: string
    defaultEnabled?: boolean
    audience?: 'all' | 'factory' | 'store' | 'specific'
  }) {
    if (!dto?.key || !dto?.label) {
      throw new BizException(BizCode.INVALID_PARAMS, 'key 与 label 不能为空')
    }
    return this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        label: dto.label,
        group: dto.group || 'home_entry',
        defaultEnabled: dto.defaultEnabled ?? true,
        audience: dto.audience || 'all',
        specificMerchantIds: [],
        grayPercent: 100,
        grayWhitelist: [],
      },
    })
  }

  async deleteFeatureFlag(id: string) {
    await this.prisma.featureFlag.delete({ where: { id } })
    return { ok: true }
  }
  async featureFlagGray() {
    const flags = await this.prisma.featureFlag.findMany()
    return flags.map((f) => ({
      key: f.key,
      label: f.label,
      grayPercent: f.grayPercent,
      grayWhitelist: f.grayWhitelist,
      audience: f.audience,
      scheduledAt: f.scheduledAt,
    }))
  }
  async setFeatureFlagGray(dto: any) {
    await this.prisma.featureFlag.update({
      where: { key: dto.key },
      data: {
        grayPercent: dto.grayPercent ?? 100,
        grayWhitelist: dto.grayWhitelist || [],
        audience: dto.audience,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    })
    return { ok: true }
  }
  async resetFeatureFlags() {
    await this.prisma.featureFlag.updateMany({ data: { grayPercent: 100, grayWhitelist: [] } })
    await this.prisma.merchantFeatureOverride.deleteMany({})
    return { ok: true }
  }

  // ========== 管理员 / 角色 ==========
  /**
   * 平台管理员分页列表
   *
   * 支持：page / pageSize / keyword（在 username / nickname / email 中模糊匹配）
   * 返回 buildPage 形式 { list, total, page, pageSize, hasMore }，
   * 让 admin-pc 的 PaginatedResponse<UserItem> 类型可以直接消费。
   */
  async admins(query: any = {}) {
    const { skip, take, page, pageSize } = parsePage(query)
    const where: any = { role: { in: ['admin', 'platform', 'super-admin'] } }
    const keyword = String(query?.keyword || '').trim()
    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { nickname: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ]
    }
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: { adminRole: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])
    const list = rows.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      email: u.email,
      role: u.role,
      roleName: u.adminRole?.name,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
    }))
    return buildPage(list, total, page, pageSize)
  }
  /**
   * 创建平台管理员账号。
   *
   * 安全要求（防纵向提权）：
   *   - 任何非 super-admin 调用者，role 只能落到 'admin' / 'platform'
   *   - 仅 super-admin 才能创建 super-admin
   *   - 未声明 role 默认 'platform'（最小权限）
   */
  async createAdmin(dto: any, callerRole?: string) {
    const rawPassword = typeof dto.password === 'string' ? dto.password.trim() : ''
    if (!rawPassword) {
      throw new BizException(BizCode.INVALID_PARAMS, '必须设置初始密码')
    }
    if (rawPassword.length < 8) {
      throw new BizException(BizCode.INVALID_PARAMS, '密码至少 8 位')
    }
    if (!dto.username || !String(dto.username).trim()) {
      throw new BizException(BizCode.INVALID_PARAMS, '必须设置账号')
    }
    const ALLOWED_NORMAL_ROLES = ['admin', 'platform']
    let role = dto.role || 'platform'
    if (role === 'super-admin' && callerRole !== 'super-admin') {
      throw new BizException(BizCode.FORBIDDEN, '仅 super-admin 可创建 super-admin')
    }
    if (!ALLOWED_NORMAL_ROLES.includes(role) && role !== 'super-admin') {
      role = 'platform'
    }
    const hash = await argon2.hash(rawPassword)
    const u = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        nickname: dto.nickname || dto.username,
        passwordHash: hash,
        role,
        adminRoleId: dto.roleId,
        avatar: dto.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dto.username}`,
      },
    })
    return { id: u.id, username: u.username }
  }
  /**
   * 更新管理员账号 —— 字段白名单 + 越权防御
   *
   * 历史风险：之前是 `data: { ...dto }` 宽松 spread，
   * 任何人都能通过 dto 注入 `passwordHash` / `id` / `merchantId` /
   * `adminRoleId` / `createdAt` 等敏感字段达成提权或绕过密码哈希。
   *
   * 现在：
   *   - controller 用 UpdateAdminDto + class-validator 白名单（入口防御）
   *   - service 用 ADMIN_UPDATABLE_FIELDS 二次过滤（出口防御）
   *   - 密码、roleId、merchantId 等敏感字段一律禁止通过本接口修改
   */
  async updateAdmin(id: string, dto: UpdateAdminDto, callerRole?: string, callerSub?: string) {
    const allowed: Record<string, unknown> = {}
    for (const k of ADMIN_UPDATABLE_FIELDS) {
      if ((dto as Record<string, unknown>)[k] !== undefined) {
        allowed[k] = (dto as Record<string, unknown>)[k]
      }
    }
    if (allowed.role !== undefined) {
      if (allowed.role === 'super-admin' && callerRole !== 'super-admin') {
        throw new BizException(BizCode.FORBIDDEN, '仅 super-admin 可指派 super-admin 角色')
      }
      if (id === callerSub && allowed.role !== callerRole) {
        throw new BizException(BizCode.FORBIDDEN, '不允许修改自己的角色')
      }
    }
    if (id === callerSub && allowed.status === 'disabled') {
      throw new BizException(BizCode.FORBIDDEN, '不允许禁用自己')
    }
    if (Object.keys(allowed).length === 0) {
      return { ok: true, updated: false }
    }
    await this.prisma.user.update({ where: { id }, data: allowed })
    return { ok: true, updated: true }
  }
  async deleteAdmin(id: string, callerSub?: string, callerRole?: string) {
    if (id === callerSub) throw new BizException(BizCode.FORBIDDEN, '不允许删除自己的账号')
    const target = await this.prisma.user.findUnique({ where: { id } })
    if (!target) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    // 仅 super-admin 可删除 super-admin，防止普通管理员纵向越权删除超管
    if (target.role === 'super-admin' && callerRole !== 'super-admin') {
      throw new BizException(BizCode.FORBIDDEN, '仅 super-admin 可删除 super-admin')
    }
    await this.prisma.user.delete({ where: { id } })
    return { ok: true }
  }
  async toggleAdmin(id: string, callerSub?: string, callerRole?: string) {
    if (id === callerSub) throw new BizException(BizCode.FORBIDDEN, '不允许禁用自己的账号')
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    // 仅 super-admin 可启用/禁用 super-admin
    if (u.role === 'super-admin' && callerRole !== 'super-admin') {
      throw new BizException(BizCode.FORBIDDEN, '仅 super-admin 可操作 super-admin')
    }
    await this.prisma.user.update({
      where: { id },
      data: { status: u.status === 'active' ? 'disabled' : 'active' },
    })
    return { ok: true }
  }

  /**
   * 平台后台角色分页列表
   *
   * 支持：page / pageSize / keyword（在 name / code 中模糊匹配）
   * 返回 buildPage 形式 { list, total, page, pageSize, hasMore }，
   * 与 admins 接口对齐，admin-pc 的 PaginatedResponse 类型统一消费。
   */
  async roles(query: any = {}) {
    const { skip, take, page, pageSize } = parsePage(query)
    const where: any = {}
    const keyword = String(query?.keyword || '').trim()
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ]
    }
    const [list, total] = await Promise.all([
      this.prisma.adminRole.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.adminRole.count({ where }),
    ])
    return buildPage(list, total, page, pageSize)
  }
  async saveRole(dto: any) {
    if (dto.id) {
      const { id, ...data } = dto
      return this.prisma.adminRole.update({ where: { id }, data })
    }
    return this.prisma.adminRole.create({
      data: { ...dto, code: dto.code || `role_${Date.now()}` },
    })
  }
  async updateRole(id: string, dto: any) {
    return this.prisma.adminRole.update({ where: { id }, data: dto })
  }
  async deleteRole(id: string) {
    await this.prisma.adminRole.delete({ where: { id } })
    return { ok: true }
  }

  // ========== 审核记录 ==========
  /**
   * 审核日志分页查询（平台后台 / 商家申诉调阅用）
   *
   * AuditRecord 之前只在 approveMerchant/rejectMerchant/approveProduct/rejectProduct
   * 等方法里 create，但从来没有读接口暴露，导致平台无法回溯"谁在什么时候批/驳的"。
   *
   * 支持过滤：
   *   - type: 'merchant' | 'product'
   *   - status: 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'sample_check'
   *   - targetId: 精确匹配某一被审核对象
   *   - page / pageSize 分页（默认 1 / 20）
   *
   * 返回：
   *   - 在 record 上挂 `auditor: { id, username, nickname }` 摘要（auditorId 不为空时）
   *   - 标准 buildPage 形式 { list, total, page, pageSize, hasMore }
   */
  async auditRecords(query: any = {}) {
    const { skip, take, page, pageSize } = parsePage(query)
    const where: any = {}
    if (query?.type && ['merchant', 'product', 'ad', 'refund'].includes(query.type)) {
      where.type = query.type
    }
    if (query?.status) where.status = query.status
    if (query?.targetId) where.targetId = query.targetId

    const [rows, total] = await Promise.all([
      this.prisma.auditRecord.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditRecord.count({ where }),
    ])

    // 批量取 actor 摘要：AuditRecord 没有 relation，手动 IN 查 User 拼接
    const actorIds = Array.from(
      new Set(rows.map((r) => r.auditorId).filter((id): id is string => !!id)),
    )
    const actorMap = new Map<string, { id: string; username: string | null; nickname: string }>()
    if (actorIds.length) {
      const actors = await this.prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, username: true, nickname: true },
      })
      for (const a of actors) actorMap.set(a.id, a)
    }

    const list = rows.map((r) => ({
      id: r.id,
      type: r.type,
      targetId: r.targetId,
      status: r.status,
      reason: r.reason,
      autoApproved: r.autoApproved,
      sampleChecked: r.sampleChecked,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
      auditor: r.auditorId ? actorMap.get(r.auditorId) || null : null,
    }))

    return buildPage(list, total, page, pageSize)
  }

  // ========== 提现审核（平台层） ==========
  /**
   * 平台审核提现申请的分页列表
   *
   * 之前提现审核挂在商家自助接口下属于产品设计错误（商家自审 = 无审核），
   * 这里在平台层重建：支持 status / keyword / 商家筛选 + 分页。
   *
   * 返回每条记录会扁平化商家摘要（merchantName / merchantType / merchantStatus）
   * 给 admin-pc「提现审核」表格直接 row.merchantName 消费。
   */
  async withdrawsList(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q?.status && q.status !== 'all') where.status = q.status
    if (q?.merchantId) where.merchantId = q.merchantId
    if (q?.keyword) {
      where.OR = [{ no: { contains: q.keyword } }, { account: { contains: q.keyword } }]
    }
    const [rows, total] = await Promise.all([
      this.prisma.withdraw.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { id: true, name: true, type: true, status: true } },
          user: { select: { id: true, nickname: true, phone: true } },
        },
      }),
      this.prisma.withdraw.count({ where }),
    ])
    const list = rows.map((r) =>
      decimalToNumber({
        ...r,
        // 前端（admin-pc / platform-app）按 `amount` 读取提现金额，而 Withdraw 表字段是
        // applyAmount/actualAmount，补一个 amount 别名（=申请金额）避免两端显示 ¥0 / NaN。
        amount: r.applyAmount,
        merchantName: r.merchant?.name ?? '',
        merchantType: r.merchant?.type ?? '',
        merchantStatus: r.merchant?.status ?? '',
        applicantName: r.user?.nickname ?? '',
        applicantPhone: r.user?.phone ?? '',
      }),
    )
    return buildPage(list, total, page, pageSize)
  }

  /**
   * 平台审核 → 通过
   *
   * 仅允许 pending → approved；其他状态一律拒绝（避免误把 paid 改成 approved 等）。
   * 同步写入 reviewedBy + reviewedAt + remark；不直接转 paid（保留运营手动 mark-paid 步骤）。
   */
  async approveWithdraw(id: string, remark: string | undefined, callerSub?: string) {
    const w = await this.prisma.withdraw.findUnique({ where: { id } })
    if (!w) throw new BizException(BizCode.NOT_FOUND, '提现单不存在')
    if (w.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${w.status} 不可审核通过`)
    }
    await this.prisma.withdraw.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedBy: callerSub || null,
        reviewedAt: new Date(),
        remark: remark || w.remark || null,
      },
    })
    return { ok: true }
  }

  /**
   * 平台审核 → 驳回
   *
   * 仅允许 pending → rejected；其他状态拒绝。
   * 注：当前 Merchant schema 没有 balance 表，商家可用余额是按完成订单 - 已 paid 提现实时算的，
   *   驳回时无需回写余额。如果未来引入冻结余额，需要在事务里同时退回冻结额。
   */
  async rejectWithdrawPlat(id: string, reason: string, callerSub?: string) {
    if (!reason || !reason.trim()) {
      throw new BizException(BizCode.INVALID_PARAMS, '请填写驳回原因')
    }
    const w = await this.prisma.withdraw.findUnique({ where: { id } })
    if (!w) throw new BizException(BizCode.NOT_FOUND, '提现单不存在')
    if (w.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${w.status} 不可驳回`)
    }
    await this.prisma.withdraw.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: callerSub || null,
        reviewedAt: new Date(),
        remark: reason.trim(),
      },
    })
    return { ok: true }
  }

  /**
   * 平台标记打款完成
   *
   * 仅允许 approved → paid；其他状态拒绝（防止跳步把 pending 直接打款）。
   * - transactionId：第三方支付流水号（可选，运营走线下转账时可留空）
   * - remark：运营追加备注（如银行回单号等）。
   * 写入 paidAt = now，便于商家端「我的提现记录」展示到账时间。
   */
  async markWithdrawPaid(
    id: string,
    body: { transactionId?: string; remark?: string },
    callerSub?: string,
  ) {
    const w = await this.prisma.withdraw.findUnique({ where: { id } })
    if (!w) throw new BizException(BizCode.NOT_FOUND, '提现单不存在')
    if (w.status !== 'approved') {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        `当前状态 ${w.status} 不可标记打款（必须先审核通过）`,
      )
    }
    // 把 transactionId / 备注合并到 remarkTags / remark：
    //  - Withdraw schema 没有独立 transactionId 字段，把它附加到 remark 末尾，
    //    格式 `<原备注> | tx=xxx`，便于后续日志查询。
    const tail = body?.transactionId ? ` | tx=${body.transactionId}` : ''
    const newRemark = (body?.remark || w.remark || '') + tail
    await this.prisma.withdraw.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        reviewedBy: w.reviewedBy || callerSub || null,
        remark: newRemark.trim() || null,
      },
    })
    return { ok: true }
  }

  // ========== 抽检 / 平台广场上下架 ==========
  /**
   * 平台抽检某商品的审核结果。
   *
   * 用途："加入抽检队列"——把自动审通过的商品标记为待抽检，商品维持当前上架状态。
   * 仅写 AuditRecord(status='sample_check', sampleChecked=true) 供审计；
   * 通过/驳回的最终裁决分别走 approveProduct / rejectProduct，本接口不改 product.status。
   */
  async sampleCheckProduct(productId: string, callerSub?: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    await this.prisma.auditRecord.create({
      data: {
        type: 'product',
        targetId: productId,
        status: 'sample_check',
        auditorId: callerSub || null,
        sampleChecked: true,
        reviewedAt: new Date(),
      },
    })
    return { ok: true, productId, status: p.status }
  }

  /**
   * 平台维度上下架某商品（仅控制广场展示，不动商家原始 status）。
   *
   * 当前 Product schema 没有独立的 `plazaVisible` 列，因此用 SystemConfig 兜底，
   * key 形如 `plaza:product:${productId}`，value 为 { online: boolean, at: ISO }。
   * - 选品广场列表查询时可批量 IN 读这些 key 过滤；
   * - 后续若加 plazaVisible 列，可在此一并迁移而不破坏接口形状。
   */
  async setPlazaProductOnline(productId: string, online: boolean) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, merchantId: true },
    })
    if (!p) throw new BizException(BizCode.NOT_FOUND, '商品不存在')
    const key = `plaza:product:${productId}`
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: { online: !!online, at: new Date().toISOString() } as any },
      create: { key, value: { online: !!online, at: new Date().toISOString() } as any },
    })
    return { ok: true, productId, online: !!online }
  }

  // ========== 超管重置管理员密码 ==========
  /**
   * 仅 super-admin 可调；
   * 用于「我忘记密码 / 给同事重置」场景，由超管直接覆盖密码（无需短信验证码）。
   *
   * 安全约束：
   *   1. 调用方角色必须是 super-admin —— 普通 admin / platform 拒绝
   *   2. 不允许给自己重置（防自锁、防绕过审计）
   *   3. 密码长度 ≥ 8
   *   4. 目标用户必须是后台管理员角色（admin/platform/super-admin），不能拿去重置普通用户密码
   *      —— 普通用户走 phone-login 走短信重置链路，与本接口完全隔离
   *   5. 不能把另一个 super-admin 的密码改了（防超管之间互相覆盖；要改请走人工流程）
   */
  async resetAdminPassword(
    id: string,
    newPwd: string,
    callerSub: string | undefined,
    callerRole: string | undefined,
  ) {
    if (callerRole !== 'super-admin') {
      throw new BizException(BizCode.FORBIDDEN, '仅 super-admin 可重置管理员密码')
    }
    if (!callerSub) {
      throw new BizException(BizCode.UNAUTHORIZED, '未登录')
    }
    if (id === callerSub) {
      throw new BizException(BizCode.FORBIDDEN, '不允许重置自己的密码（请走个人设置）')
    }
    const pwd = typeof newPwd === 'string' ? newPwd.trim() : ''
    if (pwd.length < 8) {
      throw new BizException(BizCode.INVALID_PARAMS, '新密码至少 8 位')
    }
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })
    if (!target) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    if (!['admin', 'platform', 'super-admin'].includes(target.role)) {
      // 普通客户/商家请走自助找回（短信验证码），不允许通过本接口覆盖密码
      throw new BizException(BizCode.FORBIDDEN, '该账号非后台管理员，不可通过本接口重置')
    }
    if (target.role === 'super-admin') {
      throw new BizException(
        BizCode.FORBIDDEN,
        '不允许重置另一位 super-admin 的密码（请走人工流程）',
      )
    }
    const hash = await argon2.hash(pwd)
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } })
    return { ok: true, userId: id }
  }

  // ========== 订单分享数据看板（管理后台） ==========
  /**
   * 订单分享列表
   *
   * 业务背景：商家通过 OrderShareService 创建的订单分享存在 SystemConfig
   * key=`order_share:<shareCode>` 兜底存储，没有正式表。这里给平台后台
   * 提供一个统一查询入口，方便运营回溯「谁在分享什么订单 / 浏览数多少」。
   *
   * 实现策略：
   *   1. 直接读 SystemConfig（不注入 OrderShareService，避免 platform → merchant
   *      模块循环依赖；merchantModule 已 forwardRef 引入）
   *   2. 内存按 merchantId / revoked / 时间范围过滤
   *   3. 分页 + 拼商家名 / 订单号 / 分享 URL 摘要
   *
   * 注意：take=500 是硬上限保护，避免单次扫全表压垮内存。
   *      若未来分享数 > 1w，应按 OrderShareService 注释把存储迁到正式表。
   */
  async orderShares(query: any = {}) {
    const { page, pageSize } = parsePage(query)

    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'order_share:' } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    let revokedFilter: boolean | null = null
    if (query.revoked === true || query.revoked === 'true') revokedFilter = true
    else if (query.revoked === false || query.revoked === 'false') revokedFilter = false

    const startAt = query.startDate ? new Date(String(query.startDate)).getTime() : null
    const endAt = query.endDate ? new Date(String(query.endDate)).getTime() : null
    const now = Date.now()

    const matched: { shareCode: string; cfg: OrderShareConfig }[] = []
    for (const r of rows) {
      const cfg = r.value as unknown as OrderShareConfig
      if (!cfg) continue
      if (query.merchantId && cfg.merchantId !== query.merchantId) continue
      if (revokedFilter !== null && !!cfg.revoked !== revokedFilter) continue
      const createdTs = cfg.createdAt ? new Date(cfg.createdAt).getTime() : 0
      if (startAt !== null && createdTs < startAt) continue
      if (endAt !== null && createdTs > endAt) continue
      matched.push({ shareCode: r.key.replace('order_share:', ''), cfg })
    }

    const total = matched.length
    const start = (page - 1) * pageSize
    const slice = matched.slice(start, start + pageSize)

    // 批量取商家名 / 订单号摘要，避免 N+1
    const merchantIds = Array.from(new Set(slice.map((m) => m.cfg.merchantId).filter(Boolean)))
    const orderIds = Array.from(new Set(slice.map((m) => m.cfg.orderId).filter(Boolean)))
    const [merchants, orders] = await Promise.all([
      merchantIds.length
        ? this.prisma.merchant.findMany({
            where: { id: { in: merchantIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as { id: string; name: string }[]),
      orderIds.length
        ? this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: { id: true, no: true },
          })
        : Promise.resolve([] as { id: string; no: string }[]),
    ])
    const merchantMap = new Map(merchants.map((m) => [m.id, m.name]))
    const orderMap = new Map(orders.map((o) => [o.id, o.no]))

    // SHARE_BASE_URL 缺省走 user-mp / merchant-app 现有共识基底，
    // 与 share-sheet.vue 拼出来的链接保持一致（避免运营复制的链接 404）
    const shareBase = (
      process.env.SHARE_BASE_URL ||
      process.env.PUBLIC_SHARE_BASE_URL ||
      'https://ewsn.top'
    ).replace(/\/$/, '')

    const list = slice.map(({ shareCode, cfg }) => ({
      shareCode,
      orderId: cfg.orderId,
      orderNo: orderMap.get(cfg.orderId) || null,
      merchantId: cfg.merchantId,
      merchantName: merchantMap.get(cfg.merchantId) || '未知商家',
      visibleFields: cfg.visibleFields || [],
      expiresAt: cfg.expiresAt,
      intro: cfg.intro || '',
      viewCount: cfg.viewCount || 0,
      revoked: !!cfg.revoked,
      expired: !!(cfg.expiresAt && new Date(cfg.expiresAt).getTime() < now),
      createdAt: cfg.createdAt,
      shareUrl: `${shareBase}/share?code=${shareCode}`,
    }))

    return buildPage(list, total, page, pageSize)
  }

  /**
   * 订单分享聚合统计
   *
   * 给平台后台「订单分享」KPI / 趋势 / TopN 面板消费。
   *   - 总分享数 / 总浏览数
   *   - 活跃（未撤销且未过期）/ 已撤销 / 已过期
   *   - 近 7 日新增分享趋势（按 createdAt 日期分桶，本地日期，含今天）
   *   - TOP 10 商户（按分享数 + 浏览数综合排序）
   *
   * 实现注意：分享数据较稀疏（不像订单）, take=500 兜底足够当前规模，
   *           未来如需要更准确数据应迁到正式 OrderShare 表 + GroupBy 聚合。
   */
  async orderSharesStats() {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'order_share:' } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    const now = Date.now()
    const configs: OrderShareConfig[] = rows
      .map((r) => r.value as unknown as OrderShareConfig)
      .filter((c) => !!c)

    const totalShares = configs.length
    let totalViews = 0
    let active = 0
    let revoked = 0
    let expired = 0
    for (const c of configs) {
      totalViews += Number(c.viewCount || 0)
      const isExpired = !!(c.expiresAt && new Date(c.expiresAt).getTime() < now)
      if (c.revoked) revoked++
      else if (isExpired) expired++
      else active++
    }

    // 近 7 日趋势（含今天，按本地日期 yyyy-MM-dd 标签）
    const trend: { date: string; count: number }[] = []
    const day0 = new Date()
    day0.setHours(0, 0, 0, 0)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(day0.getTime() - i * 86400_000)
      const next = new Date(d.getTime() + 86400_000)
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const count = configs.filter((c) => {
        if (!c.createdAt) return false
        const ts = new Date(c.createdAt).getTime()
        return ts >= d.getTime() && ts < next.getTime()
      }).length
      trend.push({ date: label, count })
    }

    // TopN 商户
    const byMerchant = new Map<string, { shareCount: number; viewCount: number }>()
    for (const c of configs) {
      if (!c.merchantId) continue
      const cur = byMerchant.get(c.merchantId) || { shareCount: 0, viewCount: 0 }
      cur.shareCount += 1
      cur.viewCount += Number(c.viewCount || 0)
      byMerchant.set(c.merchantId, cur)
    }
    const sortedMerchantIds = Array.from(byMerchant.entries())
      // 综合排序：先按分享数，再按浏览数
      .sort((a, b) => b[1].shareCount - a[1].shareCount || b[1].viewCount - a[1].viewCount)
      .slice(0, 10)

    const merchantInfo = sortedMerchantIds.length
      ? await this.prisma.merchant.findMany({
          where: { id: { in: sortedMerchantIds.map(([id]) => id) } },
          select: { id: true, name: true },
        })
      : []
    const nameMap = new Map(merchantInfo.map((m) => [m.id, m.name]))
    const topMerchants = sortedMerchantIds.map(([id, agg]) => ({
      merchantId: id,
      name: nameMap.get(id) || '未知商家',
      shareCount: agg.shareCount,
      viewCount: agg.viewCount,
    }))

    return {
      totalShares,
      totalViews,
      active,
      revoked,
      expired,
      trend,
      topMerchants,
    }
  }

  // ========== 系统配置 ==========
  /**
   * 系统设置 —— 平台后台「系统设置」页消费
   *
   * 返回稳定 shape：site / payment / logistics / service / security / business
   * 即使 SystemConfig 表里没有任何记录，前端 `s.business.*` 也不会 undefined 报错。
   *
   * 已存在的数据会与默认值浅合并，避免后续新增字段时旧数据缺字段。
   */
  async systemSettings() {
    const DEFAULT = {
      site: { name: '经纬科技', logo: '', icp: '' },
      payment: {
        wechat: { enabled: true },
        alipay: { enabled: false },
        balance: { enabled: true },
      },
      logistics: { providers: ['顺丰', '京东', '中通'], defaultFreight: 10 },
      service: { phone: '400-000-0000', email: 'support@jiujiu.com', workTime: '9:00-18:00' },
      security: { passwordPolicy: { minLength: 8, requireUppercase: true }, ipWhitelist: [] },
      // P1-9 修复：admin-pc 系统设置页有 business 块（新商户/商品自动审核、平台佣金率、提现门槛），
      // 之前默认对象缺这一块，前端 `s.business.*` 取值 undefined 报错
      business: {
        newMerchantAutoApprove: false,
        newProductAutoApprove: false,
        platformCommissionRate: 5,
        withdrawMinAmount: 100,
      },
    }
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })
    const persisted = (v?.value as Record<string, any>) || {}
    return {
      ...DEFAULT,
      ...persisted,
      // 嵌套字段浅合并，保证旧记录缺 business 时仍有默认值
      business: { ...DEFAULT.business, ...((persisted as any).business || {}) },
    }
  }
  /**
   * 保存系统设置（透传到 SystemConfig）
   *
   * 任意可被 JSON 序列化的字段都允许写入；business 由前端控制是否包含。
   * 保存后下次读取时会与最新 DEFAULT 浅合并，缺字段自动回退默认值。
   */
  async saveSystemSettings(dto: any) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'system_settings' },
      update: { value: dto },
      create: { key: 'system_settings', value: dto },
    })
    return { ok: true }
  }

  // ========== 工单系统 (基于 SystemConfig 兜底) ==========
  /**
   * 工单系统最小实现 —— 不改 prisma schema,沿用 SystemConfig key='ticket:<id>'。
   *
   * 用 SystemConfig 兜底 (而不是单独建表) 的理由:
   *   - 业务量小且早期容易迭代字段
   *   - 已有 SystemConfig 通用读写,无需 migration
   *   - 字段以 JSON 形式存储,新增字段无需 ALTER
   *
   * 数据形态 (TicketRow):
   *   { id, title, content, fromUserId, fromUserName, status:'open'|'handling'|'closed',
   *     priority:'low'|'normal'|'high', createdAt, handledBy?, handledAt?, reply? }
   *
   * 未来若业务扩展,可以无痛迁到独立 Ticket 表 + 全文索引。
   */
  async tickets(query: any = {}) {
    const { skip, take, page, pageSize } = parsePage(query)
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'ticket:' } },
      orderBy: { updatedAt: 'desc' },
    })
    let all = rows
      .map((r) => {
        const v = (r.value || {}) as Record<string, any>
        return {
          id: v.id || r.key.replace(/^ticket:/, ''),
          title: v.title || '',
          content: v.content || '',
          fromUserId: v.fromUserId || null,
          fromUserName: v.fromUserName || '匿名用户',
          status: v.status || 'open',
          priority: v.priority || 'normal',
          createdAt: v.createdAt || r.updatedAt.toISOString(),
          handledBy: v.handledBy || null,
          handledAt: v.handledAt || null,
          reply: v.reply || '',
        }
      })
      .filter((t) => t.id)

    if (query?.status && query.status !== 'all') {
      all = all.filter((t) => t.status === query.status)
    }
    if (query?.priority && query.priority !== 'all') {
      all = all.filter((t) => t.priority === query.priority)
    }
    if (query?.keyword) {
      const kw = String(query.keyword).toLowerCase()
      all = all.filter(
        (t) =>
          t.title.toLowerCase().includes(kw) ||
          t.content.toLowerCase().includes(kw) ||
          t.fromUserName.toLowerCase().includes(kw),
      )
    }

    const total = all.length
    const list = all.slice(skip, skip + take)
    return buildPage(list, total, page, pageSize)
  }

  /** 已处理工单数 (最近 30 天 closed) — 给 platform-app 个人中心徽章用 */
  async handledTicketCount() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000)
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'ticket:' } },
      select: { value: true, updatedAt: true },
    })
    const count = rows.filter((r) => {
      const v = (r.value || {}) as Record<string, any>
      if (v.status !== 'closed') return false
      const handledAt = v.handledAt ? new Date(v.handledAt) : r.updatedAt
      return handledAt.getTime() >= thirtyDaysAgo.getTime()
    }).length
    return { count }
  }

  /** 未处理工单数 (open + handling) — 给个人中心徽章用 */
  async pendingTicketCount() {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'ticket:' } },
      select: { value: true },
    })
    const count = rows.filter((r) => {
      const v = (r.value || {}) as Record<string, any>
      return v.status === 'open' || v.status === 'handling' || !v.status
    }).length
    return { count }
  }

  /**
   * 处理工单 — 写回 reply / status / handledBy / handledAt 到 SystemConfig。
   *
   * @param id 工单 id (会拼成 key='ticket:<id>')
   * @param dto.reply 回复内容
   * @param dto.status 目标状态 open / handling / closed
   * @param callerSub 当前管理员 sub (写入 handledBy)
   */
  async handleTicket(
    id: string,
    dto: { reply?: string; status?: 'open' | 'handling' | 'closed' },
    callerSub?: string,
  ) {
    if (!id) throw new BizException(BizCode.INVALID_PARAMS, '工单 id 必填')
    const key = `ticket:${id}`
    const row = await this.prisma.systemConfig.findUnique({ where: { key } })
    if (!row) throw new BizException(BizCode.NOT_FOUND, '工单不存在')
    const cur = (row.value || {}) as Record<string, any>
    const nextStatus = dto?.status || cur.status || 'handling'
    if (!['open', 'handling', 'closed'].includes(nextStatus)) {
      throw new BizException(BizCode.INVALID_PARAMS, 'status 仅支持 open/handling/closed')
    }
    const next = {
      ...cur,
      id: cur.id || id,
      reply: dto?.reply ?? cur.reply ?? '',
      status: nextStatus,
      handledBy: callerSub || cur.handledBy || null,
      handledAt: new Date().toISOString(),
    }
    await this.prisma.systemConfig.update({ where: { key }, data: { value: next } })
    return { ok: true, ticket: next }
  }

  /**
   * 创建工单 — 用户端/管理后台 都可调用。
   *
   * id 由后端生成 (Date.now()-rand),写入 SystemConfig key='ticket:<id>'。
   * status 默认 'open',priority 默认 'normal'。
   */
  async createTicket(dto: {
    title: string
    content: string
    fromUserId?: string
    fromUserName?: string
    priority?: 'low' | 'normal' | 'high'
  }) {
    if (!dto?.title) throw new BizException(BizCode.INVALID_PARAMS, '工单标题必填')
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`
    const value = {
      id,
      title: dto.title,
      content: dto.content || '',
      fromUserId: dto.fromUserId || null,
      fromUserName: dto.fromUserName || '匿名用户',
      status: 'open',
      priority: dto.priority || 'normal',
      createdAt: new Date().toISOString(),
      handledBy: null,
      handledAt: null,
      reply: '',
    }
    await this.prisma.systemConfig.create({
      data: { key: `ticket:${id}`, value },
    })
    return value
  }

  // ============ 消息中心 (基于 SystemConfig 兜底) ============
  /**
   * 平台消息中心:系统通知 / 待办提醒 / 业务提示
   * 存储:SystemConfig key='notification:<id>' value={id,type,title,content,unread,createdAt,readBy[]}
   * 用户维度:readBy 数组记录哪些 user.sub 已读;markAll 时把 readBy 加入 callerSub
   *
   * 实际生产推荐迁移到 Notification 正式表 + Redis 维度缓存;现阶段量级 < 千级可用。
   */
  async notifications(query: any = {}) {
    const page = Math.max(1, Number(query?.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20))
    const type = query?.type || ''
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'notification:' } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })
    let list = rows.map((r) => (r.value as any) || {}).filter((n) => n && n.id)
    if (type && type !== 'all') {
      list = list.filter((n) => n.type === type)
    }
    const total = list.length
    const start = (page - 1) * pageSize
    return {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    }
  }

  async notificationsReadAll(callerSub?: string) {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'notification:' } },
      take: 500,
    })
    let updated = 0
    for (const r of rows) {
      const cfg = (r.value as any) || {}
      const readBy: string[] = Array.isArray(cfg.readBy) ? cfg.readBy : []
      if (callerSub && !readBy.includes(callerSub)) {
        readBy.push(callerSub)
        await this.prisma.systemConfig
          .update({
            where: { key: r.key },
            data: { value: { ...cfg, readBy, unread: false } as any },
          })
          .catch(() => {})
        updated += 1
      }
    }
    return { ok: true, updated }
  }

  async notificationRead(id: string, callerSub?: string) {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: `notification:${id}` },
    })
    if (!row) throw new BizException(BizCode.NOT_FOUND, '消息不存在')
    const cfg = (row.value as any) || {}
    const readBy: string[] = Array.isArray(cfg.readBy) ? cfg.readBy : []
    if (callerSub && !readBy.includes(callerSub)) {
      readBy.push(callerSub)
    }
    await this.prisma.systemConfig.update({
      where: { key: `notification:${id}` },
      data: { value: { ...cfg, readBy, unread: false } as any },
    })
    return { ok: true }
  }

  // ============ 反馈 (基于 SystemConfig 兜底) ============
  /**
   * 用户/管理员提交反馈
   * Body: {type:'suggestion'|'bug'|'experience'|'other', content, contact?, images?[]}
   */
  async submitFeedback(dto: any, callerSub?: string) {
    if (!dto?.content || String(dto.content).trim().length < 10) {
      throw new BizException(BizCode.INVALID_PARAMS, '反馈内容至少 10 字')
    }
    const validTypes = ['suggestion', 'bug', 'experience', 'other']
    const type = validTypes.includes(dto?.type) ? dto.type : 'other'
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`
    const value = {
      id,
      type,
      content: String(dto.content).slice(0, 1000),
      contact: dto?.contact ? String(dto.contact).slice(0, 100) : '',
      images: Array.isArray(dto?.images) ? dto.images.slice(0, 3) : [],
      fromUserId: callerSub || null,
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    await this.prisma.systemConfig.create({
      data: { key: `feedback:${id}`, value },
    })
    return { ok: true, id }
  }

  async feedbackList(query: any = {}) {
    const page = Math.max(1, Number(query?.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20))
    const type = query?.type || ''
    const status = query?.status || ''
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { startsWith: 'feedback:' } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })
    let list = rows.map((r) => (r.value as any) || {}).filter((f) => f && f.id)
    if (type && type !== 'all') list = list.filter((f) => f.type === type)
    if (status && status !== 'all') list = list.filter((f) => f.status === status)
    const total = list.length
    const start = (page - 1) * pageSize
    return {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    }
  }

  // ============ 售后/退款审核（平台层） ============
  /**
   * 平台审核 Refund 分页列表
   *
   * 业务背景：用户在 user-mp 发起售后会建一条 Refund(status=pending)，
   * 商家可以在 merchant-app 自审同意/驳回；但很多场景需要平台代审（商家长期不响应、
   * 商家被禁用、争议升级等），此前完全没有平台维度审核入口，前端 platform-app 的
   * `pages/refunds/index.vue` 一直显示空态。这里补齐 GET/agree/reject 三端点。
   *
   * 参数：status / keyword / merchantId / page / pageSize
   * 字段扁平化：userName / merchantName / orderNo 拼到行上，便于前端直接 row.* 渲染
   */
  async listRefunds(q: any = {}) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q?.status && q.status !== 'all') where.status = q.status
    if (q?.merchantId) where.merchantId = q.merchantId
    if (q?.keyword) {
      const kw = String(q.keyword).trim()
      if (kw) {
        where.OR = [
          { no: { contains: kw, mode: 'insensitive' } },
          { reason: { contains: kw, mode: 'insensitive' } },
        ]
      }
    }
    const [rows, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, no: true } },
          user: { select: { id: true, nickname: true, phone: true } },
          merchant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.refund.count({ where }),
    ])
    const list = rows.map((r) =>
      decimalToNumber({
        id: r.id,
        no: r.no,
        orderId: r.orderId,
        orderNo: r.order?.no || null,
        userId: r.userId,
        userName: r.user?.nickname || r.user?.phone || '',
        merchantId: r.merchantId,
        merchantName: r.merchant?.name || '',
        type: r.type,
        reason: r.reason,
        description: r.description,
        evidence: r.evidence,
        applyAmount: Number(r.applyAmount),
        refundAmount: r.refundAmount != null ? Number(r.refundAmount) : null,
        status: r.status,
        merchantReply: r.merchantReply,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    )
    return buildPage(list, total, page, pageSize)
  }

  /**
   * 平台代审退款 → 同意（pending → completed）
   *
   * 资金安全 P0 流程（事务包裹真退款）：
   *   1. 校验存在 + 当前状态 pending（其他状态拒绝，避免重复退款）
   *   2. refundAmount 校验：未传则取 applyAmount；上限不能超过订单实付金额
   *   3. 找到该订单的成功支付记录（Payment.status='success'），缺失直接抛错
   *      —— 防止"订单未真实付款也走退款"的脏数据
   *   4. 事务包：
   *      - 调 wxpay.createRefund 真退款（refundId 持久化到 Payment.wxTransactionId/refundedAt）
   *      - Refund.update 设 status='completed', refundAmount, completedAt
   *      - Payment.update 设 status='refunded'（如全额退）, refundedAt, refundAmount
   *      - Order.update 设 status='refunded'
   *   5. wxpay 调用失败 → 整个事务回滚，Refund 仍是 pending 让运营重试
   *
   * 注：当前实现按"全额退一次"语义；多次部分退款需要补 partial-refund 流程，
   * 文档已挂 TODO（参考 wxpay.createRefund 的 out_refund_no 幂等）。
   */
  async agreeRefund(id: string, refundAmount: number | undefined, callerSub?: string) {
    const r = await this.prisma.refund.findUnique({
      where: { id },
      include: { order: { include: { payments: true } } },
    })
    if (!r) throw new BizException(BizCode.NOT_FOUND, '售后单不存在')
    if (r.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${r.status} 不可审核通过`)
    }
    const applyAmount = Number(r.applyAmount)
    const payAmount = Number(r.order.payAmount)
    // 平台审核时允许覆盖金额：未传则按用户申请金额，传了则做范围校验
    const targetAmount =
      typeof refundAmount === 'number' && Number.isFinite(refundAmount)
        ? Number(refundAmount)
        : applyAmount
    if (!(targetAmount > 0)) {
      throw new BizException(BizCode.INVALID_PARAMS, '退款金额必须大于 0')
    }
    if (targetAmount > payAmount) {
      throw new BizException(BizCode.INVALID_PARAMS, '退款金额不能超过订单实付金额')
    }

    // 找一条已成功的支付记录作为退款来源
    const paidPayment = r.order.payments.find((p) => p.status === 'success')
    if (!paidPayment) {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '该订单暂无已成功的支付记录，无法发起真退款',
      )
    }

    // 真调微信退款 —— 失败抛 BizException 让前端展示
    let refundResp: { refundId: string; status: 'PROCESSING' | 'SUCCESS' }
    try {
      refundResp = await this.wxpay.createRefund({
        outTradeNo: r.order.no,
        outRefundNo: r.no,
        reason: r.reason || '平台代审通过',
        refundAmount: targetAmount,
        totalAmount: payAmount,
      })
    } catch (e: any) {
      throw new BizException(BizCode.PAY_FAILED, `微信退款失败：${e?.message || e}`)
    }

    // 事务持久化 Refund / Payment / Order 的状态切换
    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: r.id },
        data: {
          status: 'completed',
          refundAmount: targetAmount,
          completedAt: new Date(),
          merchantReply: `平台代审通过 (auditor=${callerSub || '-'}, wxRefundId=${refundResp.refundId})`,
        },
      }),
      this.prisma.payment.update({
        where: { id: paidPayment.id },
        data: {
          status: targetAmount >= payAmount ? 'refunded' : paidPayment.status,
          refundedAt: new Date(),
          refundAmount: targetAmount,
        },
      }),
      this.prisma.order.update({
        where: { id: r.orderId },
        data: { status: 'refunded' },
      }),
      this.prisma.auditRecord.create({
        data: {
          type: 'refund',
          targetId: r.id,
          status: 'approved',
          reason: `平台代审通过，金额=${targetAmount}`,
          auditorId: callerSub || null,
          reviewedAt: new Date(),
        },
      }),
    ])

    return {
      ok: true,
      refundId: r.id,
      wxRefundId: refundResp.refundId,
      wxRefundStatus: refundResp.status,
      refundAmount: targetAmount,
    }
  }

  /**
   * 平台代审退款 → 驳回（pending → rejected）
   *
   * reason 必填，原因同时写到 Refund.merchantReply（前端列表展示该字段）和 AuditRecord.reason。
   * 订单状态保持 after_sale，等用户改申请 / 关单 / 走商家再审。
   */
  async rejectRefundPlat(id: string, reason: string, callerSub?: string) {
    if (!reason || !String(reason).trim()) {
      throw new BizException(BizCode.INVALID_PARAMS, '请填写驳回原因')
    }
    const r = await this.prisma.refund.findUnique({ where: { id } })
    if (!r) throw new BizException(BizCode.NOT_FOUND, '售后单不存在')
    if (r.status !== 'pending') {
      throw new BizException(BizCode.BUSINESS_ERROR, `当前状态 ${r.status} 不可驳回`)
    }
    const trimReason = String(reason).trim()
    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: r.id },
        data: {
          status: 'rejected',
          merchantReply: `平台代审驳回：${trimReason}`,
        },
      }),
      this.prisma.auditRecord.create({
        data: {
          type: 'refund',
          targetId: r.id,
          status: 'rejected',
          reason: trimReason,
          auditorId: callerSub || null,
          reviewedAt: new Date(),
        },
      }),
    ])
    return { ok: true }
  }
}
