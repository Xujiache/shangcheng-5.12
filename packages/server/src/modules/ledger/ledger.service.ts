import { Injectable, Optional } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  deriveMembership,
  computeGrantExpiry,
  sanitizeExtras,
  fixedCost,
  extrasTotal,
  totalCost,
  profitOf,
  revenueOf,
  sanitizeCustomCosts,
  customCostsTotal,
  sanitizeCostCategories,
  sanitizeOrderItems,
  orderItemsAmount,
  orderTotalFromItems,
  normalizeLedgerConfig,
  genLedgerInviteCode,
  LedgerConfigShape,
} from './ledger.constants'
import { CreateLedgerOrderDto, OrderQueryDto, UpdateLedgerOrderDto } from './dto/order.dto'
import { CreateLedgerCustomerDto, UpdateLedgerCustomerDto } from './dto/customer.dto'
import {
  CreateLedgerFeedbackDto,
  UpdateLedgerGoalDto,
  UpdateLedgerProfileDto,
  UpdateLedgerSettingDto,
} from './dto/misc.dto'
import { CreateCutPlanDto, UpdateCutPlanDto } from './dto/cut.dto'
import { CreateLedgerWorkLogDto, UpdateLedgerWorkLogDto, WorkLogQueryDto } from './dto/work-log.dto'
import { ContentSecurityService } from '../content-security/content-security.service'
import { FilesService } from '../files/files.service'
import { ledgerStatsQuery, LedgerStatsRange, LedgerStatsRow } from './ledger-stats.query'
import type { MembershipStatus } from './ledger.constants'

/** input/summary JSON 序列化后体积上限（字节），超出拒绝，防滥用。 */
const CUT_JSON_MAX = 20_000

type OrderRow = {
  id: string
  customerId: string | null
  customerName: string
  date: Date
  total: number
  revenueAmount?: bigint | null
  costAmount?: bigint | null
  profitAmount?: bigint | null
  received: number
  costProfile: number
  costGlass: number
  costHardware: number
  costLabor: number
  costScreen: number
  extras: unknown
  customCosts: unknown
  items: unknown
  discount: number
  recycle: number
  deposit: number
  note: string | null
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const workQuantity = (value: unknown) => Math.round(Number(value) * 100) / 100
const workAmount = (quantity: number, unitPrice: number) => Math.round(quantity * unitPrice)

function workDateOf(value: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new BizException(BizCode.INVALID_PARAMS, '日期格式不正确')
  return date
}

function monthRange(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to = new Date(Date.UTC(year, mon, 1))
  return { from, to }
}

// ── 通知偏好 ──────────────────────────────────────────────
/** 通知类型 → LedgerSetting 开关字段（未列出的类型不受偏好约束，始终投递）。 */
const NOTIFY_SETTING_KEY: Record<
  string,
  'notifyOrder' | 'notifyReport' | 'notifyGoal' | 'notifySystem'
> = {
  order: 'notifyOrder',
  report: 'notifyReport',
  goal: 'notifyGoal',
  member: 'notifySystem',
  system: 'notifySystem',
}

/** 无设置行时的默认值，须与 prisma schema LedgerSetting 各列 @default 一致。 */
const NOTIFY_SETTING_DEFAULTS = {
  notifyOrder: true,
  notifyReport: true,
  notifyGoal: true,
  notifySystem: false,
} as const

const LEDGER_ACCOUNT_SELECT = {
  id: true,
  nickname: true,
  avatar: true,
  membership: {
    select: {
      expiresAt: true,
      lastPlanKey: true,
      perpetual: true,
      trialClaimedAt: true,
    },
  },
} as const

/** 门窗利账 App 业务服务。所有读写强制按 userId 隔离（DTO 不接受 userId 入参）。 */
@Injectable()
export class LedgerService {
  private readonly fastReadChecks = new Map<string, Promise<boolean>>()
  private readonly fastReadReady = new Map<string, { value: boolean; expiresAt: number }>()

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly contentSecurity?: ContentSecurityService,
    @Optional() private readonly files?: FilesService,
  ) {}

  private async assertLedgerTextSafe(content: string, scene: number) {
    if (!content.trim()) return
    if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务未初始化，暂时无法提交内容')
    }
    await this.contentSecurity?.assertTextSafe(content, { scope: 'ledger', scene })
  }

  // ── 账户 / 会员 ───────────────────────────────────────────
  async me(userId: string) {
    const u = await this.prisma.ledgerUser.findUnique({
      where: { id: userId },
      select: LEDGER_ACCOUNT_SELECT,
    })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    return {
      id: u.id,
      accountCode: u.id.slice(-8).toUpperCase(),
      nickname: u.nickname,
      avatar: u.avatar,
      membership: deriveMembership(
        u.membership?.expiresAt ?? null,
        u.membership?.lastPlanKey,
        new Date(),
        {
          perpetual: u.membership?.perpetual,
          trialClaimedAt: u.membership?.trialClaimedAt,
        },
      ),
    }
  }

  async membership(userId: string, current?: MembershipStatus) {
    const [m, cfg] = await Promise.all([
      current
        ? Promise.resolve(null)
        : this.prisma.ledgerMembership.findUnique({ where: { userId } }),
      this.readConfig(),
    ])
    return {
      ...(current ??
        deriveMembership(m?.expiresAt ?? null, m?.lastPlanKey, new Date(), {
          perpetual: m?.perpetual,
          trialClaimedAt: m?.trialClaimedAt,
        })),
      plans: cfg.plans, // 套餐由后台配置驱动（默认 LEDGER_PLANS）
    }
  }

  async updateProfile(userId: string, dto: UpdateLedgerProfileDto) {
    const data: any = {}
    if (typeof dto.nickname === 'string' && dto.nickname.trim()) {
      const nickname = dto.nickname.trim()
      await this.assertLedgerTextSafe(nickname, 1)
      data.nickname = nickname
    }
    if (typeof dto.avatar === 'string') data.avatar = dto.avatar
    const u = await this.prisma.ledgerUser.update({ where: { id: userId }, data })
    return { id: u.id, nickname: u.nickname, avatar: u.avatar }
  }

  // ── 全局配置（单行 key='global'）───────────────────────────
  private async readConfig(): Promise<LedgerConfigShape> {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  private async fastReadsReady(userId: string): Promise<boolean> {
    if (process.env.LEDGER_FAST_READS !== '1') return false
    const cached = this.fastReadReady.get(userId)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const pending = this.fastReadChecks.get(userId)
    if (pending) return pending
    // 部分索引只覆盖空派生值；count 不再扫描已经回填的订单。仅合并正在执行的请求。
    const check = this.prisma.ledgerOrder
      .count({
        where: {
          userId,
          OR: [{ revenueAmount: null }, { costAmount: null }, { profitAmount: null }],
        },
      })
      .then((missing) => {
        const value = missing === 0
        const configured = Number(process.env.LEDGER_FAST_READS_READINESS_TTL_MS)
        const ttl = Number.isFinite(configured) && configured >= 1_000 ? configured : 60_000
        this.fastReadReady.set(userId, { value, expiresAt: Date.now() + ttl })
        if (this.fastReadReady.size > 4096) {
          const oldest = this.fastReadReady.keys().next().value
          if (oldest) this.fastReadReady.delete(oldest)
        }
        return value
      })
    this.fastReadChecks.set(userId, check)
    try {
      return await check
    } finally {
      this.fastReadChecks.delete(userId)
    }
  }

  // ── 首页广告（#2）：App 取启用中的轮播 ─────────────────────
  async listAds() {
    const rows = await this.prisma.ledgerAd.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      take: 20,
      select: { id: true, image: true, link: true, title: true },
    })
    return rows.map((a) => ({ id: a.id, image: a.image, link: a.link || '', title: a.title || '' }))
  }

  // ── 优化下料（#9）：会员闸门 ──────────────────────────────
  /**
   * 返回优化下料可用状态。所有业务能力均以会员有效状态为准，
   * 此接口只用于客户端在进入工具页前展示开通引导，绝不写试用状态或放行未开通账号。
   */
  async cutAccess(userId: string, current?: MembershipStatus) {
    let mem = current
    if (!mem) {
      const u = await this.prisma.ledgerUser.findUnique({
        where: { id: userId },
        select: LEDGER_ACCOUNT_SELECT,
      })
      if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
      mem = deriveMembership(
        u.membership?.expiresAt ?? null,
        u.membership?.lastPlanKey,
        new Date(),
        {
          perpetual: u.membership?.perpetual,
          trialClaimedAt: u.membership?.trialClaimedAt,
        },
      )
    }
    if (mem.active) {
      return {
        allowed: true,
        mode: 'member' as const,
        membership: mem,
      }
    }
    return {
      allowed: false,
      mode: 'locked' as const,
      membership: mem,
      reason: '优化下料为会员功能，开通会员后即可使用',
    }
  }

  // ── 邀请（#10）：好友首次微信登录时建立邀请关系 ────────────
  /** 取（必要时生成）当前账号的邀请码。 */
  async ensureInviteCode(userId: string): Promise<string> {
    const u = await this.prisma.ledgerUser.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    if (u.inviteCode) return u.inviteCode
    for (let i = 0; i < 6; i++) {
      const code = genLedgerInviteCode()
      try {
        await this.prisma.ledgerUser.update({ where: { id: userId }, data: { inviteCode: code } })
        return code
      } catch {
        /* 唯一冲突，重试 */
      }
    }
    throw new BizException(BizCode.BUSINESS_ERROR, '邀请码生成失败，请重试')
  }

  async getInvite(userId: string) {
    const code = await this.ensureInviteCode(userId)
    const cfg = await this.readConfig()
    const invitedCount = await this.prisma.ledgerUser.count({ where: { invitedById: userId } })
    return {
      inviteCode: code,
      invitedCount,
      rewardDays: cfg.inviteRewardDays,
    }
  }

  // ── 订单 ──────────────────────────────────────────────────
  private mapOrder(o: OrderRow, useDerivedAmounts = false) {
    const extras = sanitizeExtras(o.extras)
    const customCosts = sanitizeCustomCosts(o.customCosts)
    const base = {
      total: o.total,
      costProfile: o.costProfile,
      costGlass: o.costGlass,
      costHardware: o.costHardware,
      costLabor: o.costLabor,
      costScreen: o.costScreen,
      extras,
      customCosts,
    }
    const items = sanitizeOrderItems(o.items)
    const revenue = useDerivedAmounts && o.revenueAmount != null ? Number(o.revenueAmount) : revenueOf(base)
    const cost = useDerivedAmounts && o.costAmount != null ? Number(o.costAmount) : totalCost(base)
    const profit = useDerivedAmounts && o.profitAmount != null ? Number(o.profitAmount) : profitOf(base)
    return {
      id: o.id,
      customerId: o.customerId,
      customer: o.customerName,
      date: ymd(o.date),
      total: o.total,
      received: o.received || 0,
      revenue,
      costs: {
        profile: o.costProfile,
        glass: o.costGlass,
        hardware: o.costHardware,
        labor: o.costLabor,
        screen: o.costScreen,
      },
      extras,
      customCosts,
      // 门窗报价明细
      items,
      discount: o.discount || 0,
      recycle: o.recycle || 0,
      deposit: o.deposit || 0,
      amount: orderItemsAmount(items), // 金额 = Σ小计
      unpaid: Math.max(0, (o.total || 0) - (o.deposit || 0) - (o.received || 0)), // 未收 = 总价 − 定金 − 收款
      note: o.note ?? '',
      fixedCost: fixedCost(base),
      extrasTotal: extrasTotal(extras),
      customCostsTotal: customCostsTotal(customCosts),
      cost,
      profit,
      margin: revenue ? profit / revenue : 0,
    }
  }

  async listOrders(userId: string, q: OrderQueryDto) {
    const where: any = { userId }
    if (q.customer) where.customerName = { contains: q.customer }
    if (q.dateFrom || q.dateTo) {
      const range: any = {}
      const from = q.dateFrom ? new Date(q.dateFrom) : null
      const to = q.dateTo ? new Date(`${q.dateTo}T23:59:59.999Z`) : null
      if (from && !isNaN(from.getTime())) range.gte = from
      if (to && !isNaN(to.getTime())) range.lte = to
      if (Object.keys(range).length) where.date = range
    }
    const pmin = q.profitMin != null && q.profitMin !== '' ? Number(q.profitMin) : null
    const pmax = q.profitMax != null && q.profitMax !== '' ? Number(q.profitMax) : null
    // 增量字段回填并逐单核验后才切读路径；存在空值时自动沿用旧实现，不漏历史单。
    if (
      (pmin === null || Number.isFinite(pmin)) &&
      (pmax === null || Number.isFinite(pmax)) &&
      Number.isInteger(Number(q.page || 1)) &&
      Number.isInteger(Number(q.pageSize || 50)) &&
      (await this.fastReadsReady(userId))
    ) {
      return this.listOrdersFast(where, q, pmin, pmax)
    }
    const rows = await this.prisma.ledgerOrder.findMany({ where, orderBy: { date: 'desc' } })
    let list = rows.map((r) => this.mapOrder(r as OrderRow))

    // 利润区间筛选（派生字段，内存过滤）
    if (pmin != null) list = list.filter((o) => o.profit >= pmin)
    if (pmax != null) list = list.filter((o) => o.profit <= pmax)

    if (q.sort === 'profit') list.sort((a, b) => b.profit - a.profit)

    const total = list.length
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50))
    const items = list.slice((page - 1) * pageSize, page * pageSize)
    const sums = list.reduce(
      (s, o) => ({
        revenue: s.revenue + o.total,
        profit: s.profit + o.profit,
        cost: s.cost + o.cost,
      }),
      { revenue: 0, profit: 0, cost: 0 },
    )
    return {
      list: items,
      total,
      page,
      pageSize,
      summary: { count: total, ...sums, avgProfit: total ? Math.round(sums.profit / total) : 0 },
    }
  }

  private async listOrdersFast(
    where: any,
    q: OrderQueryDto,
    pmin: number | null,
    pmax: number | null,
  ) {
    if (pmin !== null || pmax !== null) {
      where.profitAmount = {
        ...(pmin !== null ? { gte: Math.ceil(pmin) } : {}),
        ...(pmax !== null ? { lte: Math.floor(pmax) } : {}),
      }
    }
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50))
    const rowsQuery = this.prisma.ledgerOrder.findMany({
      where,
      orderBy:
        q.sort === 'profit' ? [{ profitAmount: 'desc' }, { date: 'desc' }] : { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    const aggregateQuery = this.prisma.ledgerOrder.aggregate({
      where,
      _count: { _all: true },
      _sum: { total: true, costAmount: true, profitAmount: true },
    })
    const [rows, aggregate] =
      typeof (this.prisma as any).$transaction === 'function'
        ? await this.prisma.$transaction([rowsQuery, aggregateQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([rowsQuery, aggregateQuery])
    const total = aggregate._count._all
    const sums = {
      revenue: aggregate._sum.total || 0, // 兼容旧列表：汇总 revenue 为订单总价，不含 extras。
      cost: Number(aggregate._sum.costAmount || 0),
      profit: Number(aggregate._sum.profitAmount || 0),
    }
    return {
      list: rows.map((r) => this.mapOrder(r as OrderRow, true)),
      total,
      page,
      pageSize,
      summary: { count: total, ...sums, avgProfit: total ? Math.round(sums.profit / total) : 0 },
    }
  }

  async getOrder(userId: string, id: string) {
    const o = await this.prisma.ledgerOrder.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    return this.mapOrder(o as OrderRow)
  }

  private async resolveCustomer(userId: string, customerId?: string, fallbackName?: string) {
    if (!customerId)
      return { customerId: null as string | null, customerName: (fallbackName || '').trim() }
    const c = await this.prisma.ledgerCustomer.findFirst({
      where: { id: customerId, userId },
      select: { id: true, name: true },
    })
    if (!c) {
      // 客户不属于本账号或已删 → 忽略 id，保留名字（快速录入兜底）
      return { customerId: null as string | null, customerName: (fallbackName || '').trim() }
    }
    return { customerId: c.id, customerName: (fallbackName || c.name).trim() }
  }

  async createOrder(userId: string, dto: CreateLedgerOrderDto) {
    const { customerId, customerName } = await this.resolveCustomer(
      userId,
      dto.customerId,
      dto.customerName,
    )
    if (!customerName) throw new BizException(BizCode.INVALID_PARAMS, '请填写客户')
    // 有明细时 总价 = 金额 − 优惠（以明细为准）；无明细时取传入 total
    const items = sanitizeOrderItems(dto.items)
    const discount = Math.max(0, Math.round(dto.discount || 0))
    const recycle = Math.max(0, Math.round(dto.recycle || 0))
    const deposit = Math.max(0, Math.round(dto.deposit || 0))
    const total = items.length
      ? orderTotalFromItems(items, discount, recycle)
      : Math.round(dto.total || 0)
    if (!(total > 0)) throw new BizException(BizCode.INVALID_PARAMS, '订单总价需大于 0')
    const date = new Date(dto.date)
    if (isNaN(date.getTime())) throw new BizException(BizCode.INVALID_PARAMS, '日期格式不正确')
    const data: any = {
      userId,
      customerId,
      customerName,
      date,
      total,
      received: Math.max(0, Math.round(dto.received || 0)),
      costProfile: Math.max(0, Math.round(dto.costProfile || 0)),
      costGlass: Math.max(0, Math.round(dto.costGlass || 0)),
      costHardware: Math.max(0, Math.round(dto.costHardware || 0)),
      costLabor: Math.max(0, Math.round(dto.costLabor || 0)),
      costScreen: Math.max(0, Math.round(dto.costScreen || 0)),
      extras: sanitizeExtras(dto.extras) as any,
      customCosts: sanitizeCustomCosts(dto.customCosts) as any,
      items: items as any,
      discount,
      recycle,
      deposit,
      note: dto.note?.trim() || null,
    }
    data.revenueAmount = BigInt(revenueOf(data))
    data.costAmount = BigInt(totalCost(data))
    data.profitAmount = data.revenueAmount - data.costAmount
    const o = await this.prisma.ledgerOrder.create({ data })
    const mapped = this.mapOrder(o as OrderRow)
    // 录单成功 → 写入一条真实的应用内通知（消息中心由业务事件驱动，无假数据）
    await this.pushNotification(
      userId,
      'order',
      '订单已保存',
      `客户「${mapped.customer}」的订单已录入，利润 ${this.money(mapped.profit)}。`,
    )
    return mapped
  }

  async updateOrder(userId: string, id: string, dto: UpdateLedgerOrderDto) {
    const exist = await this.prisma.ledgerOrder.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    const data: any = {}
    if (dto.customerId !== undefined || dto.customerName !== undefined) {
      const r = await this.resolveCustomer(
        userId,
        dto.customerId !== undefined ? dto.customerId : (exist.customerId ?? undefined),
        dto.customerName !== undefined ? dto.customerName : exist.customerName,
      )
      data.customerId = r.customerId
      if (r.customerName) data.customerName = r.customerName
    }
    if (dto.date !== undefined) {
      const d = new Date(dto.date)
      if (isNaN(d.getTime())) throw new BizException(BizCode.INVALID_PARAMS, '日期格式不正确')
      data.date = d
    }
    if (dto.total !== undefined) data.total = Math.max(0, Math.round(dto.total))
    if (dto.received !== undefined) data.received = Math.max(0, Math.round(dto.received))
    if (dto.costProfile !== undefined) data.costProfile = Math.max(0, Math.round(dto.costProfile))
    if (dto.costGlass !== undefined) data.costGlass = Math.max(0, Math.round(dto.costGlass))
    if (dto.costHardware !== undefined)
      data.costHardware = Math.max(0, Math.round(dto.costHardware))
    if (dto.costLabor !== undefined) data.costLabor = Math.max(0, Math.round(dto.costLabor))
    if (dto.costScreen !== undefined) data.costScreen = Math.max(0, Math.round(dto.costScreen))
    if (dto.extras !== undefined) data.extras = sanitizeExtras(dto.extras) as any
    if (dto.customCosts !== undefined)
      data.customCosts = sanitizeCustomCosts(dto.customCosts) as any
    if (dto.items !== undefined) data.items = sanitizeOrderItems(dto.items) as any
    if (dto.discount !== undefined) data.discount = Math.max(0, Math.round(dto.discount))
    if (dto.recycle !== undefined) data.recycle = Math.max(0, Math.round(dto.recycle))
    if (dto.deposit !== undefined) data.deposit = Math.max(0, Math.round(dto.deposit))
    if (dto.note !== undefined) data.note = dto.note?.trim() || null
    // 有明细时，总价以「金额 − 优惠」为准（覆盖传入 total）
    const finalItems = data.items !== undefined ? data.items : sanitizeOrderItems(exist.items)
    if (finalItems.length) {
      const disc = data.discount !== undefined ? data.discount : exist.discount
      const rec = data.recycle !== undefined ? data.recycle : exist.recycle
      data.total = orderTotalFromItems(finalItems, disc, rec)
    }
    const financial = { ...exist, ...data }
    data.revenueAmount = BigInt(revenueOf(financial))
    data.costAmount = BigInt(totalCost(financial))
    data.profitAmount = data.revenueAmount - data.costAmount
    const o = await this.prisma.ledgerOrder.update({ where: { id, userId }, data })
    return this.mapOrder(o as OrderRow)
  }

  async deleteOrder(userId: string, id: string) {
    const exist = await this.prisma.ledgerOrder.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    await this.prisma.ledgerOrder.delete({ where: { id, userId } })
    return { ok: true }
  }

  // ── 客户 ──────────────────────────────────────────────────
  async listCustomers(userId: string) {
    if (await this.fastReadsReady(userId)) {
      return this.listCustomersFast(userId)
    }
    const [customers, orders] = await Promise.all([
      this.prisma.ledgerCustomer.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, address: true, note: true },
      }),
      this.prisma.ledgerOrder.findMany({
        where: { userId },
        select: {
          customerName: true,
          date: true,
          total: true,
          costProfile: true,
          costGlass: true,
          costHardware: true,
          costLabor: true,
          costScreen: true,
          extras: true,
          customCosts: true,
        },
      }),
    ])
    const map = new Map<string, any>()
    customers.forEach((c) =>
      map.set(c.name, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        note: c.note,
        count: 0,
        revenue: 0,
        profit: 0,
        cost: 0,
        lastDate: '',
      }),
    )
    orders.forEach((o) => {
      const key = o.customerName
      if (!map.has(key)) {
        map.set(key, {
          id: null,
          name: key,
          phone: null,
          address: null,
          note: null,
          count: 0,
          revenue: 0,
          profit: 0,
          cost: 0,
          lastDate: '',
        })
      }
      const c = map.get(key)
      const p = profitOf(o as any)
      c.count++
      c.revenue += o.total
      c.profit += p
      c.cost += totalCost(o as any)
      const d = ymd(o.date)
      if (d > c.lastDate) c.lastDate = d
    })
    return Array.from(map.values())
      .map((c) => ({ ...c, margin: c.revenue ? c.profit / c.revenue : 0 }))
      .sort((a, b) => b.profit - a.profit)
  }

  private async listCustomersFast(userId: string) {
    const customersQuery = this.prisma.ledgerCustomer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, phone: true, address: true, note: true },
    })
    const groupsQuery = this.prisma.ledgerOrder.groupBy({
      by: ['customerName'],
      where: { userId },
      orderBy: { customerName: 'asc' },
      _count: { _all: true },
      _sum: { total: true, profitAmount: true, costAmount: true },
      _max: { date: true },
    })
    const [customers, groups] =
      typeof (this.prisma as any).$transaction === 'function'
        ? await this.prisma.$transaction([customersQuery, groupsQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([customersQuery, groupsQuery])
    const map = new Map<string, any>()
    customers.forEach((c) =>
      map.set(c.name, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        note: c.note,
        count: 0,
        revenue: 0,
        profit: 0,
        cost: 0,
        lastDate: '',
      }),
    )
    ;(groups as any[]).forEach((g) => {
      const c = map.get(g.customerName) || {
        id: null,
        name: g.customerName,
        phone: null,
        address: null,
        note: null,
        count: 0,
        revenue: 0,
        profit: 0,
        cost: 0,
        lastDate: '',
      }
      c.count = g._count._all
      c.revenue = g._sum.total || 0
      c.profit = Number(g._sum.profitAmount || 0)
      c.cost = Number(g._sum.costAmount || 0)
      c.lastDate = g._max.date ? ymd(g._max.date) : ''
      map.set(g.customerName, c)
    })
    return Array.from(map.values())
      .map((c) => ({ ...c, margin: c.revenue ? c.profit / c.revenue : 0 }))
      .sort((a, b) => b.profit - a.profit)
  }

  async getCustomer(userId: string, id: string) {
    const c = await this.prisma.ledgerCustomer.findFirst({
      where: { id, userId },
      select: { id: true, name: true, phone: true, address: true, note: true, createdAt: true },
    })
    if (!c) throw new BizException(BizCode.NOT_FOUND, '客户不存在')
    const orders = await this.prisma.ledgerOrder.findMany({
      // customerId 精确匹配；同名仅兜底无 customerId 的历史/快录订单，避免同名客户串档
      where: { userId, OR: [{ customerId: id }, { customerName: c.name, customerId: null }] },
      orderBy: { date: 'desc' },
    })
    const mapped = orders.map((o) => this.mapOrder(o as OrderRow))
    const revenue = mapped.reduce((s, o) => s + o.total, 0)
    const profit = mapped.reduce((s, o) => s + o.profit, 0)
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      note: c.note,
      since: ymd(c.createdAt),
      count: mapped.length,
      revenue,
      profit,
      margin: revenue ? profit / revenue : 0,
      orders: mapped,
    }
  }

  async createCustomer(userId: string, dto: CreateLedgerCustomerDto) {
    const name = String(dto.name || '').trim()
    if (!name) throw new BizException(BizCode.INVALID_PARAMS, '请填写客户姓名')
    const c = await this.prisma.ledgerCustomer.create({
      data: {
        userId,
        name,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        note: dto.note?.trim() || null,
      },
    })
    return c
  }

  /**
   * 按姓名确保客户档案存在（幂等）：同名已建档则复用，否则新建；
   * 并把同名、未关联档案的历史订单关联到该档案（与客户列表「按名归并」一致）。
   * 供客户列表点击「订单自动生成的无档客户」时自动建档并进入详情。
   */
  async ensureCustomerByName(userId: string, rawName: string) {
    const name = String(rawName || '').trim()
    if (!name) throw new BizException(BizCode.INVALID_PARAMS, '请填写客户姓名')
    let c = await this.prisma.ledgerCustomer.findFirst({ where: { userId, name } })
    if (!c) {
      c = await this.prisma.ledgerCustomer.create({ data: { userId, name } })
    }
    // 把同名、未关联档案的历史订单挂到该档案，使统计/再下单与档案一致
    await this.prisma.ledgerOrder.updateMany({
      where: { userId, customerName: name, customerId: null },
      data: { customerId: c.id },
    })
    return c
  }

  async updateCustomer(userId: string, id: string, dto: UpdateLedgerCustomerDto) {
    const exist = await this.prisma.ledgerCustomer.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '客户不存在')
    const data: any = {}
    if (dto.name !== undefined && dto.name.trim()) data.name = dto.name.trim()
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null
    if (dto.address !== undefined) data.address = dto.address?.trim() || null
    if (dto.note !== undefined) data.note = dto.note?.trim() || null
    const c = await this.prisma.ledgerCustomer.update({ where: { id, userId }, data })
    // 改名时同步历史订单的冗余客户名，保持一致
    if (data.name && data.name !== exist.name) {
      await this.prisma.ledgerOrder.updateMany({
        where: { userId, customerId: id },
        data: { customerName: data.name },
      })
    }
    return c
  }

  async deleteCustomer(userId: string, id: string) {
    const exist = await this.prisma.ledgerCustomer.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '客户不存在')
    // 先解绑历史订单（保留 customerName 快照），再删档，避免外键约束失败
    await this.prisma.ledgerOrder.updateMany({
      where: { userId, customerId: id },
      data: { customerId: null },
    })
    await this.prisma.ledgerCustomer.delete({ where: { id, userId } })
    return { ok: true }
  }

  // ── 记工（日工台账，按 userId 隔离，不计入订单成本）────────────────────
  private mapWorkLog(row: any) {
    return {
      id: row.id,
      workDate: ymd(row.workDate),
      workerName: row.workerName,
      jobType: row.jobType,
      unit: row.unit,
      quantity: Number(row.quantity),
      unitPrice: row.unitPrice,
      amount: row.amount,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async listWorkLogs(userId: string, query: WorkLogQueryDto) {
    const { from, to } = monthRange(query.month)
    const rows = await this.prisma.ledgerWorkLog.findMany({
      where: { userId, workDate: { gte: from, lt: to } },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        workDate: true,
        workerName: true,
        jobType: true,
        unit: true,
        quantity: true,
        unitPrice: true,
        amount: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    const list = rows.map((row) => this.mapWorkLog(row))
    const summary = list.reduce(
      (acc, row) => {
        acc.totalAmount += row.amount
        if (row.unit === 'day') acc.dayQuantity += row.quantity
        else acc.hourQuantity += row.quantity
        return acc
      },
      { totalAmount: 0, dayQuantity: 0, hourQuantity: 0, count: list.length },
    )
    return { month: query.month, list, summary }
  }

  async createWorkLog(userId: string, dto: CreateLedgerWorkLogDto) {
    const workerName = dto.workerName.trim()
    if (!workerName) throw new BizException(BizCode.INVALID_PARAMS, '请填写工人姓名')
    const quantity = workQuantity(dto.quantity)
    const unitPrice = Math.round(dto.unitPrice)
    const row = await this.prisma.ledgerWorkLog.create({
      data: {
        userId,
        workDate: workDateOf(dto.workDate),
        workerName,
        jobType: dto.jobType?.trim() || null,
        unit: dto.unit,
        quantity,
        unitPrice,
        amount: workAmount(quantity, unitPrice),
        note: dto.note?.trim() || null,
      },
    })
    return this.mapWorkLog(row)
  }

  async updateWorkLog(userId: string, id: string, dto: UpdateLedgerWorkLogDto) {
    // 先按 userId 命中，跨账号 ID 一律按不存在处理，杜绝 IDOR。
    const current = await this.prisma.ledgerWorkLog.findFirst({ where: { id, userId } })
    if (!current) throw new BizException(BizCode.NOT_FOUND, '记工记录不存在')

    const workerName = dto.workerName === undefined ? current.workerName : dto.workerName.trim()
    if (!workerName) throw new BizException(BizCode.INVALID_PARAMS, '请填写工人姓名')
    const quantity =
      dto.quantity === undefined ? Number(current.quantity) : workQuantity(dto.quantity)
    const unitPrice = dto.unitPrice === undefined ? current.unitPrice : Math.round(dto.unitPrice)
    const row = await this.prisma.ledgerWorkLog.update({
      where: { id },
      data: {
        ...(dto.workDate === undefined ? {} : { workDate: workDateOf(dto.workDate) }),
        workerName,
        ...(dto.jobType === undefined ? {} : { jobType: dto.jobType.trim() || null }),
        ...(dto.unit === undefined ? {} : { unit: dto.unit }),
        quantity,
        unitPrice,
        amount: workAmount(quantity, unitPrice),
        ...(dto.note === undefined ? {} : { note: dto.note.trim() || null }),
      },
    })
    return this.mapWorkLog(row)
  }

  async deleteWorkLog(userId: string, id: string) {
    const deleted = await this.prisma.ledgerWorkLog.deleteMany({ where: { id, userId } })
    if (!deleted.count) throw new BizException(BizCode.NOT_FOUND, '记工记录不存在')
    return { ok: true }
  }

  // ── 优化下料·云端历史（按 userId 隔离）────────────────────
  /** JSON 体积上限校验（input/summary 防滥用）。超限 → 1001。 */
  private assertCutJsonSize(obj: unknown, field: string) {
    let size = 0
    try {
      size = JSON.stringify(obj ?? null).length
    } catch {
      throw new BizException(BizCode.INVALID_PARAMS, `${field} 数据无法序列化`)
    }
    if (size > CUT_JSON_MAX) throw new BizException(BizCode.INVALID_PARAMS, `${field} 数据过大`)
  }

  /** 列表行映射（仅暴露契约字段，按需精简）。 */
  private mapCutPlan(p: {
    id: string
    title: string
    material: string
    input: unknown
    summary: unknown
    updatedAt: Date
  }) {
    return {
      id: p.id,
      title: p.title,
      material: p.material,
      input: p.input,
      summary: p.summary,
      updatedAt: p.updatedAt.toISOString(),
    }
  }

  /** 方案列表，最新在前，最多 100 条，强制按 userId 隔离。 */
  async listCutPlans(userId: string) {
    const rows = await this.prisma.ledgerCutPlan.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: { id: true, title: true, material: true, input: true, summary: true, updatedAt: true },
    })
    return rows.map((r) => this.mapCutPlan(r))
  }

  async createCutPlan(userId: string, dto: CreateCutPlanDto) {
    const title = String(dto.title || '').trim()
    if (!title) throw new BizException(BizCode.INVALID_PARAMS, '请填写方案名称')
    this.assertCutJsonSize(dto.input, 'input')
    this.assertCutJsonSize(dto.summary, 'summary')
    const p = await this.prisma.ledgerCutPlan.create({
      data: {
        userId,
        title: title.slice(0, 40),
        material: dto.material,
        input: dto.input as any,
        summary: dto.summary as any,
      },
    })
    return this.mapCutPlan(p)
  }

  async updateCutPlan(userId: string, id: string, dto: UpdateCutPlanDto) {
    // 永不信任客户端的归属：先按 userId 命中，命不中即 404（含他人方案）
    const exist = await this.prisma.ledgerCutPlan.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '方案不存在')
    const data: any = {}
    if (dto.title !== undefined) {
      const t = String(dto.title).trim()
      if (!t) throw new BizException(BizCode.INVALID_PARAMS, '请填写方案名称')
      data.title = t.slice(0, 40)
    }
    if (dto.material !== undefined) data.material = dto.material
    if (dto.input !== undefined) {
      this.assertCutJsonSize(dto.input, 'input')
      data.input = dto.input as any
    }
    if (dto.summary !== undefined) {
      this.assertCutJsonSize(dto.summary, 'summary')
      data.summary = dto.summary as any
    }
    const p = await this.prisma.ledgerCutPlan.update({ where: { id, userId }, data })
    return this.mapCutPlan(p)
  }

  async deleteCutPlan(userId: string, id: string) {
    const exist = await this.prisma.ledgerCutPlan.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '方案不存在')
    await this.prisma.ledgerCutPlan.delete({ where: { id, userId } })
    return { ok: true }
  }

  // ── 统计 ──────────────────────────────────────────────────
  async overview(userId: string, period = 'month') {
    const now = new Date()
    const Y = now.getFullYear()
    const M = now.getMonth()
    const fast = await this.fastReadsReady(userId)
    const ranges = Array.from({ length: 12 }, (_, month) => ({
      from: new Date(Y, month, 1),
      until: new Date(Y, month + 1, 1),
    }))
    const startMonth = period === 'year' ? 0 : period === 'quarter' ? Math.floor(M / 3) * 3 : M
    const endMonth = period === 'year' ? 12 : period === 'quarter' ? startMonth + 3 : M + 1
    const orderQuery = this.prisma.ledgerOrder.findMany({
      where: {
        userId,
        date: fast
          ? { gte: ranges[startMonth].from, lt: ranges[endMonth - 1].until }
          : { gte: ranges[0].from, lt: ranges[11].until },
      },
      select: {
        id: true,
        customerName: true,
        date: true,
        total: true,
        costProfile: true,
        costGlass: true,
        costHardware: true,
        costLabor: true,
        costScreen: true,
        extras: true,
        customCosts: true,
      },
    })
    const settingQuery = this.prisma.ledgerSetting.findUnique({
      where: { userId },
      select: { costCategories: true },
    })
    const goalQuery = this.prisma.ledgerGoal.findUnique({
      where: { userId },
      select: { monthly: true, yearly: true },
    })
    // 同一只读快照中读取当前周期明细与年度汇总，避免录单并发时排行/总数互相矛盾。
    const reads = fast
      ? typeof (this.prisma as any).$transaction === 'function'
        ? await this.prisma.$transaction(
            [
              orderQuery,
              settingQuery,
              goalQuery,
              this.prisma.$queryRaw<LedgerStatsRow[]>(ledgerStatsQuery(userId, ranges)),
            ],
            { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
          )
        : await Promise.all([
            orderQuery,
            settingQuery,
            goalQuery,
            this.prisma.$queryRaw<LedgerStatsRow[]>(ledgerStatsQuery(userId, ranges)),
          ])
      : await Promise.all([orderQuery, settingQuery, goalQuery, Promise.resolve(null)])
    const [all, setting, goalRow, grouped] = reads as [any[], any, any, LedgerStatsRow[] | null]
    const totals = ranges.map(() => ({ count: 0, revenue: 0, cost: 0, profit: 0 }))
    if (grouped) {
      grouped.forEach((row) => {
        totals[row.index] = {
          count: Number(row.count),
          revenue: Number(row.revenue),
          cost: Number(row.cost),
          profit: Number(row.profit),
        }
      })
    } else {
      all.forEach((row) => {
        if (row.date.getFullYear() !== Y) return
        const bucket = totals[row.date.getMonth()]
        const cost = totalCost(row)
        bucket.count++
        bucket.revenue += row.total
        bucket.cost += cost
        bucket.profit += revenueOf(row) - cost
      })
    }
    const cur = totals.slice(startMonth, endMonth).reduce(
      (sum, bucket) => ({
        count: sum.count + bucket.count,
        revenue: sum.revenue + bucket.revenue,
        cost: sum.cost + bucket.cost,
        profit: sum.profit + bucket.profit,
      }),
      { count: 0, revenue: 0, cost: 0, profit: 0 },
    )
    const categoryMeta = new Map(
      sanitizeCostCategories(setting?.costCategories).map((item) => [item.id, item]),
    )
    const costSliceMap = new Map<
      string,
      { key: string; name: string; color: string; value: number }
    >()
    const topOrders: Array<{
      id: string
      customer: string
      date: string
      total: number
      profit: number
      margin: number
    }> = []
    all.forEach((order) => {
      const month = order.date.getMonth()
      if (order.date.getFullYear() !== Y || month < startMonth || month >= endMonth) return
      orderCostBreakdown(order, categoryMeta).forEach((item) => {
        const current = costSliceMap.get(item.key)
        if (current) {
          current.value += item.value
          if (item.custom) {
            current.name = item.name
            current.color = item.color
          }
        } else {
          costSliceMap.set(item.key, {
            key: item.key,
            name: item.name,
            color: item.color,
            value: item.value,
          })
        }
      })
      // 仅保留前五名；相同利润保持原查询顺序，不对整个周期复制并排序。
      const profit = profitOf(order)
      const rank = topOrders.findIndex((item) => item.profit < profit)
      const index = rank < 0 ? topOrders.length : rank
      if (index < 5) {
        const revenue = revenueOf(order)
        topOrders.splice(index, 0, {
          id: order.id,
          customer: order.customerName,
          date: ymd(order.date),
          total: order.total,
          profit,
          margin: revenue ? profit / revenue : 0,
        })
        if (topOrders.length > 5) topOrders.pop()
      }
    })
    const trend = totals.map((bucket, index) => ({
      month: index + 1,
      label: `${index + 1}月`,
      count: bucket.count,
      revenue: bucket.revenue,
      profit: bucket.profit,
    }))
    const yearProfit = totals.reduce((sum, bucket) => sum + bucket.profit, 0)
    const monthProfit = totals[M].profit
    const goal = { monthly: goalRow?.monthly ?? 0, yearly: goalRow?.yearly ?? 0 }
    return {
      period,
      ...cur,
      avgProfit: cur.count ? Math.round(cur.profit / cur.count) : 0,
      yearProfit,
      monthProfit,
      costSlices: [...costSliceMap.values()].filter((item) => item.value > 0),
      topOrders,
      trend,
      goal,
      goalProgress: {
        monthly: goal.monthly ? monthProfit / goal.monthly : 0,
        yearly: goal.yearly ? yearProfit / goal.yearly : 0,
      },
    }
  }

  async monthlySeries(userId: string, year?: number) {
    const Y = year || new Date().getFullYear()
    const all = await this.prisma.ledgerOrder.findMany({
      where: { userId, date: { gte: new Date(Y, 0, 1), lt: new Date(Y + 1, 0, 1) } },
      select: {
        date: true,
        total: true,
        costProfile: true,
        costGlass: true,
        costHardware: true,
        costLabor: true,
        costScreen: true,
        extras: true,
        customCosts: true,
      },
    })
    const series = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      label: `${index + 1}月`,
      count: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      labor: 0,
      categoryCosts: {} as Record<string, number>,
      otherCost: 0,
    }))
    let yearProfit = 0
    let yearLabor = 0
    let count = 0
    all.forEach((order) => {
      if (order.date.getFullYear() !== Y) return
      const bucket = series[order.date.getMonth()]
      const cost = totalCost(order)
      const profit = revenueOf(order) - cost
      bucket.count++
      bucket.revenue += order.total
      bucket.cost += cost
      bucket.profit += profit
      count++
      yearProfit += profit
      orderCostBreakdown(order).forEach((item) => {
        bucket.categoryCosts[item.key] = (bucket.categoryCosts[item.key] || 0) + item.value
        if (item.key === 'labor') yearLabor += item.value
      })
    })
    series.forEach((bucket) => {
      bucket.labor = bucket.categoryCosts.labor || 0
      bucket.otherCost = Math.max(0, bucket.cost - bucket.labor)
    })
    return { year: Y, series, yearProfit, yearLabor, count }
  }

  /** 首页日/月/年序列：数据库快路径只返回 5～31 个桶，旧数据按原公式单次分桶。 */
  async series(userId: string, granularity = 'month') {
    const now = new Date()
    const Y = now.getFullYear()
    const M = now.getMonth()
    const ranges: LedgerStatsRange[] = []
    const labels: string[] = []
    const unit = granularity === 'day' ? '日' : granularity === 'year' ? '年' : '月'
    const size =
      granularity === 'day' ? new Date(Y, M + 1, 0).getDate() : granularity === 'year' ? 5 : 12
    for (let i = 0; i < size; i++) {
      if (granularity === 'day') {
        ranges.push({ from: new Date(Y, M, i + 1), until: new Date(Y, M, i + 2) })
        labels.push(String(i + 1))
      } else if (granularity === 'year') {
        ranges.push({ from: new Date(Y - 4 + i, 0, 1), until: new Date(Y - 3 + i, 0, 1) })
        labels.push(String(Y - 4 + i))
      } else {
        ranges.push({ from: new Date(Y, i, 1), until: new Date(Y, i + 1, 1) })
        labels.push(`${i + 1}月`)
      }
    }
    const buckets = labels.map((label) => ({ label, count: 0, revenue: 0, cost: 0, profit: 0 }))
    if (await this.fastReadsReady(userId)) {
      const rows = await this.prisma.$queryRaw<LedgerStatsRow[]>(ledgerStatsQuery(userId, ranges))
      rows.forEach((row) => {
        Object.assign(buckets[row.index], {
          count: Number(row.count),
          revenue: Number(row.revenue),
          cost: Number(row.cost),
          profit: Number(row.profit),
        })
      })
    } else {
      const rows = await this.prisma.ledgerOrder.findMany({
        where: { userId, date: { gte: ranges[0].from, lt: ranges[size - 1].until } },
        select: {
          date: true,
          total: true,
          costProfile: true,
          costGlass: true,
          costHardware: true,
          costLabor: true,
          costScreen: true,
          extras: true,
          customCosts: true,
        },
      })
      rows.forEach((row) => {
        const date = row.date
        const index =
          granularity === 'day'
            ? date.getFullYear() === Y && date.getMonth() === M
              ? date.getDate() - 1
              : -1
            : granularity === 'year'
              ? date.getFullYear() - (Y - 4)
              : date.getFullYear() === Y
                ? date.getMonth()
                : -1
        const bucket = buckets[index]
        if (!bucket) return
        const cost = totalCost(row)
        bucket.count++
        bucket.revenue += row.total
        bucket.cost += cost
        bucket.profit += revenueOf(row) - cost
      })
    }
    const summary = buckets.reduce(
      (sum, bucket) => ({
        count: sum.count + bucket.count,
        revenue: sum.revenue + bucket.revenue,
        cost: sum.cost + bucket.cost,
        profit: sum.profit + bucket.profit,
      }),
      { count: 0, revenue: 0, cost: 0, profit: 0 },
    )
    return {
      granularity,
      unit,
      buckets,
      summary: {
        ...summary,
        avgProfit: summary.count ? Math.round(summary.profit / summary.count) : 0,
      },
    }
  }

  // ── 经营目标 ─────────────────────────────────────────────
  async getGoal(userId: string) {
    const g = await this.prisma.ledgerGoal.findUnique({
      where: { userId },
      select: { monthly: true, yearly: true },
    })
    return { monthly: g?.monthly ?? 0, yearly: g?.yearly ?? 0 }
  }

  async setGoal(userId: string, dto: UpdateLedgerGoalDto) {
    const g = await this.prisma.ledgerGoal.upsert({
      where: { userId },
      update: {
        ...(dto.monthly !== undefined ? { monthly: Math.max(0, Math.round(dto.monthly)) } : {}),
        ...(dto.yearly !== undefined ? { yearly: Math.max(0, Math.round(dto.yearly)) } : {}),
      },
      create: {
        userId,
        monthly: Math.max(0, Math.round(dto.monthly || 0)),
        yearly: Math.max(0, Math.round(dto.yearly || 0)),
      },
    })
    return { monthly: g.monthly, yearly: g.yearly }
  }

  // ── 消息中心 ──────────────────────────────────────────────
  /** 金额格式化（¥ + 千分位），用于自动生成的通知文案。 */
  private money(n: number): string {
    return (
      '¥' +
      Math.round(n || 0)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    )
  }

  /**
   * 写入一条应用内通知（best-effort，失败不影响主流程）。
   * 先查目标用户的通知偏好，对应类型关闭则不投递；无设置行按默认值。
   *
   * 免打扰（dndEnabled/dndStart/dndEnd）按设计只约束「推送渠道」（打扰类，
   * 如微信订阅消息），不拦应用内收件箱——收件箱是拉取式，用户主动打开才看，
   * 不构成打扰；DND 期间仍写入收件箱，避免静默丢消息。
   * 当前尚无推送渠道接入，故 dnd* 字段为预留、暂无运行期消费方；
   * 接入推送渠道时应在该渠道发送边界调用 dnd 时间窗判断（注意跨午夜）。
   */
  async pushNotification(userId: string, type: string, title: string, body: string) {
    try {
      const key = NOTIFY_SETTING_KEY[type]
      if (key) {
        const s = await this.prisma.ledgerSetting.findUnique({
          where: { userId },
          select: { notifyOrder: true, notifyReport: true, notifyGoal: true, notifySystem: true },
        })
        const enabled = s ? s[key] : NOTIFY_SETTING_DEFAULTS[key]
        if (!enabled) return
      }
      await this.prisma.ledgerNotification.create({ data: { userId, type, title, body } })
    } catch {
      /* 通知非关键路径，忽略写入失败 */
    }
  }

  async listNotifications(userId: string) {
    const rows = await this.prisma.ledgerNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, type: true, title: true, body: true, read: true, createdAt: true },
    })
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      unread: !n.read,
      createdAt: n.createdAt.toISOString(),
    }))
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.ledgerNotification.count({ where: { userId, read: false } })
    return { count }
  }

  async markNotificationRead(userId: string, id: string) {
    await this.prisma.ledgerNotification.updateMany({
      where: { id, userId },
      data: { read: true },
    })
    return this.unreadCount(userId)
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.ledgerNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
    return { count: 0 }
  }

  // ── 偏好设置 ──────────────────────────────────────────────
  private mapSetting(s: {
    notifyOrder: boolean
    notifyReport: boolean
    notifyGoal: boolean
    notifySystem: boolean
    dndEnabled: boolean
    dndStart: string
    dndEnd: string
    hideAmount: boolean
    bioLock: boolean
    encBackup: boolean
    costCategories?: unknown
  }) {
    return {
      notifyOrder: s.notifyOrder,
      notifyReport: s.notifyReport,
      notifyGoal: s.notifyGoal,
      notifySystem: s.notifySystem,
      dndEnabled: s.dndEnabled,
      dndStart: s.dndStart,
      dndEnd: s.dndEnd,
      hideAmount: s.hideAmount,
      bioLock: s.bioLock,
      encBackup: s.encBackup,
      costCategories: sanitizeCostCategories(s.costCategories),
    }
  }

  /** 读取偏好（首次访问自动建默认行）。 */
  async getSettings(userId: string) {
    const s = await this.prisma.ledgerSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    })
    return this.mapSetting(s as any)
  }

  async updateSettings(userId: string, dto: UpdateLedgerSettingDto) {
    const data: any = {}
    const boolKeys = [
      'notifyOrder',
      'notifyReport',
      'notifyGoal',
      'notifySystem',
      'dndEnabled',
      'hideAmount',
      'bioLock',
      'encBackup',
    ] as const
    boolKeys.forEach((k) => {
      if (dto[k] !== undefined) data[k] = dto[k]
    })
    if (dto.dndStart !== undefined) data.dndStart = dto.dndStart
    if (dto.dndEnd !== undefined) data.dndEnd = dto.dndEnd
    if (dto.costCategories !== undefined)
      data.costCategories = sanitizeCostCategories(dto.costCategories) as any
    const s = await this.prisma.ledgerSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
    return this.mapSetting(s as any)
  }

  // ── 意见反馈 ──────────────────────────────────────────────
  async createFeedback(userId: string, dto: CreateLedgerFeedbackDto) {
    const content = String(dto.content || '').trim()
    if (!content) throw new BizException(BizCode.INVALID_PARAMS, '请填写反馈内容')
    await this.assertLedgerTextSafe(content, 2)
    const submitted = Array.isArray(dto.images)
      ? dto.images.filter((u) => typeof u === 'string').slice(0, 9)
      : []
    if (process.env.NODE_ENV === 'production' && !this.files)
      throw new BizException(BizCode.BUSINESS_ERROR, '反馈图片权限服务未初始化')
    const images = this.files
      ? await this.files.normalizeFeedbackImages(userId, submitted)
      : submitted.filter((u) => /^https?:\/\//.test(u))
    const fb = await this.prisma.ledgerFeedback.create({
      data: {
        userId,
        type: dto.type || 'general',
        content: content.slice(0, 1000),
        contact: dto.contact?.trim()?.slice(0, 40) || null,
        images: images.length ? (images as any) : undefined,
      },
    })
    return { id: fb.id, ok: true }
  }
}

const LEGACY_COST_META = [
  { key: 'profile', field: 'costProfile', name: '型材', color: 'c1' },
  { key: 'glass', field: 'costGlass', name: '玻璃', color: 'c2' },
  { key: 'hardware', field: 'costHardware', name: '配件', color: 'c3' },
  { key: 'labor', field: 'costLabor', name: '人工', color: 'c4' },
  { key: 'screen', field: 'costScreen', name: '纱窗', color: 'c5' },
] as const

function orderCostBreakdown(
  order: any,
  categoryMeta?: Map<string, { name: string; color: string }>,
): Array<{
  key: string
  name: string
  color: string
  value: number
  custom: boolean
}> {
  const map = new Map<
    string,
    { key: string; name: string; color: string; value: number; custom: boolean }
  >()
  LEGACY_COST_META.forEach((meta) => {
    const value = Math.max(0, Math.round(Number(order?.[meta.field]) || 0))
    const configured = categoryMeta?.get(meta.key)
    if (value > 0)
      map.set(meta.key, {
        ...meta,
        name: configured?.name || meta.name,
        color: configured?.color || meta.color,
        value,
        custom: false,
      })
  })
  sanitizeCustomCosts(order?.customCosts).forEach((item, index) => {
    const key = item.id || `custom-name-${encodeURIComponent(item.name)}`
    const current = map.get(key)
    const configured = categoryMeta?.get(key)
    const name = configured?.name || item.name
    const color = configured?.color || item.color || `c${(index % 6) + 1}`
    if (current) {
      current.value += item.amount
      current.name = name
      current.color = color
      current.custom = true
    } else {
      map.set(key, {
        key,
        name,
        color,
        value: item.amount,
        custom: true,
      })
    }
  })
  return [...map.values()]
}
