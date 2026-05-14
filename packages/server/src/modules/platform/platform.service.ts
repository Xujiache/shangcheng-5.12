import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import { MerchantService } from '../merchant/merchant.service'
import { UpdateAdminDto } from './dto/update-admin.dto'
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
  ) {}

  // ========== Dashboard ==========
  async dashboard() {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0)
    const yesterday0 = new Date(today0.getTime() - 86400_000)

    const [
      merchants, merchantsYday,
      orderAgg, todayOrderAgg, ydayOrderAgg,
      users, usersYday,
      pendingMerchants, pendingProducts,
      pendingAds, complaints, pendingWithdraws,
      factoryCount, storeCount,
      ymCount, yyCount, trialCount,
    ] = await Promise.all([
      this.prisma.merchant.count({ where: { status: 'active' } }),
      this.prisma.merchant.count({ where: { status: 'active', createdAt: { lt: today0 } } }),
      this.prisma.order.aggregate({ _sum: { payAmount: true }, _count: true }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: today0 } }, _sum: { payAmount: true }, _count: true }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: yesterday0, lt: today0 } }, _sum: { payAmount: true }, _count: true }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { lt: today0 } } }),
      this.prisma.merchant.count({ where: { status: 'pending' } }),
      this.prisma.product.count({ where: { status: 'auditing' } }),
      this.prisma.adCreative.count({ where: { status: 'pending' } }),
      this.prisma.refund.count({ where: { status: 'pending' } }),
      this.prisma.withdraw.count({ where: { status: 'pending' } }),
      this.prisma.merchant.count({ where: { type: 'factory', status: 'active' } }),
      this.prisma.merchant.count({ where: { type: 'store', status: 'active' } }),
      this.prisma.merchantMembership.count({ where: { status: { in: ['active'] }, plan: { period: 'yearly' } } }),
      this.prisma.merchantMembership.count({ where: { status: { in: ['active'] }, plan: { period: 'monthly' } } }),
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
    const categorySales = Array.from(catMap.entries()).map(([category, value]) => ({ category, value: Math.round(value) }))

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
    const period: 'today' | 'week' | 'month' | 'year' = ['today', 'week', 'month', 'year'].includes(q?.period)
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
      where: { createdAt: { gte: sinceDate }, status: { in: ['pending_shipment', 'shipped', 'completed'] } },
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
    if (q.keyword) where.OR = [{ name: { contains: q.keyword } }, { legalName: { contains: q.keyword } }]
    const [list, total] = await Promise.all([
      this.prisma.merchant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.merchant.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async auditMerchants(q: any) { return this.merchants({ ...q, status: 'pending' }) }
  async approveMerchant(id: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'active' } })
    await this.prisma.auditRecord.create({ data: { type: 'merchant', targetId: id, status: 'approved' } })
    return { ok: true }
  }
  async rejectMerchant(id: string, reason: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'rejected', rejectReason: reason } })
    await this.prisma.auditRecord.create({ data: { type: 'merchant', targetId: id, status: 'rejected', reason } })
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
      this.prisma.order.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true, user: true } }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  // ========== 商品审核 ==========
  async auditProducts(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const status = q.status || 'pending'
    const where: any = status === 'pending' ? { status: 'auditing' } : { status }
    if (q.keyword) where.name = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true } }),
      this.prisma.product.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async getAuditConfig() {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'audit_product_config' } })
    return v?.value || {
      autoApprove: false,
      conditions: [
        { key: 'vip', label: 'VIP 商家', enabled: true },
        { key: 'credit', label: '信用 A/B', enabled: true },
        { key: 'rejectRate', label: '驳回率 < 5%', enabled: true },
        { key: 'category', label: '常见品类', enabled: false },
      ],
      samplingRate: 10,
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
    await this.prisma.auditRecord.create({ data: { type: 'product', targetId: id, status: 'approved' } })
    return { ok: true }
  }
  async rejectProduct(id: string, reason: string) {
    await this.prisma.product.update({ where: { id }, data: { status: 'rejected', rejectReason: reason } })
    await this.prisma.auditRecord.create({ data: { type: 'product', targetId: id, status: 'rejected', reason } })
    return { ok: true }
  }

  // ========== 广告 ==========
  async adSlots() { return decimalToNumber(await this.prisma.adSlot.findMany({ orderBy: { sort: 'asc' } })) }
  async createAdSlot(dto: any) { return decimalToNumber(await this.prisma.adSlot.create({ data: dto })) }
  async updateAdSlot(id: string, dto: any) { return decimalToNumber(await this.prisma.adSlot.update({ where: { id }, data: dto })) }
  async deleteAdSlot(id: string) { await this.prisma.adSlot.delete({ where: { id } }); return { ok: true } }
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
  async createAdCreative(dto: any) { return decimalToNumber(await this.prisma.adCreative.create({ data: dto })) }
  async updateAdCreative(id: string, dto: any) { return decimalToNumber(await this.prisma.adCreative.update({ where: { id }, data: dto })) }
  async deleteAdCreative(id: string) { await this.prisma.adCreative.delete({ where: { id } }); return { ok: true } }

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
      this.prisma.product.findMany({ where: { status: 'active' }, skip, take, include: { merchant: true } }),
      this.prisma.product.count({ where: { status: 'active' } }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async plazaFactoriesAll() {
    return this.prisma.merchant.findMany({ where: { type: 'factory', status: 'active' }, take: 200 })
  }
  async plazaRecords(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const [list, total] = await Promise.all([
      this.prisma.agencyApplication.findMany({ skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true } }),
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
    return decimalToNumber(await this.prisma.memberPlan.create({ data: { ...dto, code: dto.code || `plan_${Date.now()}` } }))
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
      const totalDays = Math.max(
        1,
        Math.ceil((m.endAt.getTime() - m.startAt.getTime()) / 86400000),
      )
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
      this.prisma.paymentRecord.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true } }),
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
    await this.prisma.paymentRecord.update({ where: { id }, data: { status: 'refunded' } })
    return { ok: true }
  }
  async rejectRefund(id: string, reason: string) {
    await this.prisma.paymentRecord.update({ where: { id }, data: { status: 'paid', refundReason: reason } })
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
      { key: 'home.entry.store', label: '门店入口（仅厂家）', group: 'home_entry', defaultEnabled: false, audience: 'store', sort: 10 },
      // 用户明确要求：门店端默认不显示「上传到选品广场」按钮
      { key: 'role.button.uploadToPlaza', label: '上传到选品广场', group: 'role_button', defaultEnabled: false, audience: 'store', sort: 10 },
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
    return flags.map((f) => ({ key: f.key, label: f.label, grayPercent: f.grayPercent, grayWhitelist: f.grayWhitelist, audience: f.audience, scheduledAt: f.scheduledAt }))
  }
  async setFeatureFlagGray(dto: any) {
    await this.prisma.featureFlag.update({
      where: { key: dto.key },
      data: { grayPercent: dto.grayPercent ?? 100, grayWhitelist: dto.grayWhitelist || [], audience: dto.audience, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null },
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
  async createAdmin(dto: any) {
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
    const hash = await argon2.hash(rawPassword)
    const u = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        nickname: dto.nickname || dto.username,
        passwordHash: hash,
        role: dto.role || 'platform',
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
  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const allowed: Record<string, unknown> = {}
    for (const k of ADMIN_UPDATABLE_FIELDS) {
      if ((dto as Record<string, unknown>)[k] !== undefined) {
        allowed[k] = (dto as Record<string, unknown>)[k]
      }
    }
    if (Object.keys(allowed).length === 0) {
      return { ok: true, updated: false }
    }
    await this.prisma.user.update({ where: { id }, data: allowed })
    return { ok: true, updated: true }
  }
  async deleteAdmin(id: string) { await this.prisma.user.delete({ where: { id } }); return { ok: true } }
  async toggleAdmin(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    await this.prisma.user.update({ where: { id }, data: { status: u.status === 'active' ? 'disabled' : 'active' } })
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
    return this.prisma.adminRole.create({ data: { ...dto, code: dto.code || `role_${Date.now()}` } })
  }
  async updateRole(id: string, dto: any) {
    return this.prisma.adminRole.update({ where: { id }, data: dto })
  }
  async deleteRole(id: string) { await this.prisma.adminRole.delete({ where: { id } }); return { ok: true } }

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
    if (query?.type && ['merchant', 'product'].includes(query.type)) where.type = query.type
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
      payment: { wechat: { enabled: true }, alipay: { enabled: false }, balance: { enabled: true } },
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
}
