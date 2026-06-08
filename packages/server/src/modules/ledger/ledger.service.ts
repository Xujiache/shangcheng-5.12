import { Injectable } from '@nestjs/common'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  LEDGER_PLANS,
  deriveMembership,
  sanitizeExtras,
  fixedCost,
  extrasTotal,
  totalCost,
  profitOf,
  marginOf,
  revenueOf,
  sanitizeCustomCosts,
  customCostsTotal,
  normalizeLedgerConfig,
  LedgerConfigShape,
} from './ledger.constants'

// 邀请码：去易混字符，8 位大写+数字
const genInviteCode = customAlphabet('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 8)
const DAY_MS = 86_400_000
import { CreateLedgerOrderDto, OrderQueryDto, UpdateLedgerOrderDto } from './dto/order.dto'
import { CreateLedgerCustomerDto, UpdateLedgerCustomerDto } from './dto/customer.dto'
import {
  CreateLedgerFeedbackDto,
  UpdateLedgerGoalDto,
  UpdateLedgerProfileDto,
  UpdateLedgerSettingDto,
} from './dto/misc.dto'

type OrderRow = {
  id: string
  customerId: string | null
  customerName: string
  date: Date
  total: number
  extraIncome: number
  costProfile: number
  costGlass: number
  costHardware: number
  costLabor: number
  costScreen: number
  extras: unknown
  customCosts: unknown
  note: string | null
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** 门窗利账 App 业务服务。所有读写强制按 userId 隔离（DTO 不接受 userId 入参）。 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 账户 / 会员 ───────────────────────────────────────────
  async me(userId: string) {
    const u = await this.prisma.ledgerUser.findUnique({
      where: { id: userId },
      include: { membership: true },
    })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    return {
      id: u.id,
      phone: u.phone,
      nickname: u.nickname,
      avatar: u.avatar,
      mustReset: u.mustReset,
      wxBound: !!u.wxOpenid,
      membership: deriveMembership(u.membership?.expiresAt ?? null, u.membership?.lastPlanKey),
    }
  }

  async membership(userId: string) {
    const m = await this.prisma.ledgerMembership.findUnique({ where: { userId } })
    return {
      ...deriveMembership(m?.expiresAt ?? null, m?.lastPlanKey),
      plans: LEDGER_PLANS,
    }
  }

  async updateProfile(userId: string, dto: UpdateLedgerProfileDto) {
    const data: any = {}
    if (typeof dto.nickname === 'string' && dto.nickname.trim()) data.nickname = dto.nickname.trim()
    if (typeof dto.avatar === 'string') data.avatar = dto.avatar
    const u = await this.prisma.ledgerUser.update({ where: { id: userId }, data })
    return { id: u.id, nickname: u.nickname, avatar: u.avatar }
  }

  // ── 全局配置（单行 key='global'）───────────────────────────
  private async readConfig(): Promise<LedgerConfigShape> {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  // ── 首页广告（#2）：App 取启用中的轮播 ─────────────────────
  async listAds() {
    const rows = await this.prisma.ledgerAd.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    })
    return rows.map((a) => ({ id: a.id, image: a.image, link: a.link || '', title: a.title || '' }))
  }

  // ── 优化下料（#9）：试用 / 会员闸门 ────────────────────────
  /**
   * 返回是否可用优化下料。规则：
   * - 配置不要求会员 → 永久可用
   * - 会员有效 → 可用
   * - 否则进入试用：首次使用时间起 cutTrialDays 天内可用，过期需开通会员
   * 首次调用会惰性写入 cutFirstUsedAt 作为试用计时起点。
   */
  async cutAccess(userId: string) {
    const cfg = await this.readConfig()
    if (!cfg.cutRequireMembership) {
      return { allowed: true, mode: 'free' as const, trialDays: cfg.cutTrialDays }
    }
    const u = await this.prisma.ledgerUser.findUnique({
      where: { id: userId },
      include: { membership: true },
    })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    const mem = deriveMembership(u.membership?.expiresAt ?? null, u.membership?.lastPlanKey)
    if (mem.active) {
      return {
        allowed: true,
        mode: 'member' as const,
        membership: mem,
        trialDays: cfg.cutTrialDays,
      }
    }
    let firstUsed = u.cutFirstUsedAt
    if (!firstUsed) {
      firstUsed = new Date()
      await this.prisma.ledgerUser.update({
        where: { id: userId },
        data: { cutFirstUsedAt: firstUsed },
      })
    }
    const trialEnds = new Date(firstUsed.getTime() + cfg.cutTrialDays * DAY_MS)
    const now = new Date()
    if (now.getTime() < trialEnds.getTime()) {
      return {
        allowed: true,
        mode: 'trial' as const,
        trialDays: cfg.cutTrialDays,
        trialDaysLeft: Math.ceil((trialEnds.getTime() - now.getTime()) / DAY_MS),
        trialEndsAt: trialEnds.toISOString(),
      }
    }
    return {
      allowed: false,
      mode: 'expired' as const,
      trialDays: cfg.cutTrialDays,
      trialEndsAt: trialEnds.toISOString(),
      reason: '优化下料试用已结束，开通会员后继续使用',
    }
  }

  // ── 邀请（#10）：自助注册分享 ──────────────────────────────
  /** 取（必要时生成）当前账号的邀请码。 */
  async ensureInviteCode(userId: string): Promise<string> {
    const u = await this.prisma.ledgerUser.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    if (u.inviteCode) return u.inviteCode
    for (let i = 0; i < 6; i++) {
      const code = genInviteCode()
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
      allowSelfRegister: cfg.allowSelfRegister,
    }
  }

  // ── 订单 ──────────────────────────────────────────────────
  private mapOrder(o: OrderRow) {
    const extras = sanitizeExtras(o.extras)
    const customCosts = sanitizeCustomCosts(o.customCosts)
    const base = {
      total: o.total,
      extraIncome: o.extraIncome,
      costProfile: o.costProfile,
      costGlass: o.costGlass,
      costHardware: o.costHardware,
      costLabor: o.costLabor,
      costScreen: o.costScreen,
      extras,
      customCosts,
    }
    return {
      id: o.id,
      customerId: o.customerId,
      customer: o.customerName,
      date: ymd(o.date),
      total: o.total,
      extraIncome: o.extraIncome,
      revenue: revenueOf(base),
      costs: {
        profile: o.costProfile,
        glass: o.costGlass,
        hardware: o.costHardware,
        labor: o.costLabor,
        screen: o.costScreen,
      },
      extras,
      customCosts,
      note: o.note ?? '',
      fixedCost: fixedCost(base),
      extrasTotal: extrasTotal(extras),
      customCostsTotal: customCostsTotal(customCosts),
      cost: totalCost(base),
      profit: profitOf(base),
      margin: marginOf(base),
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
    const rows = await this.prisma.ledgerOrder.findMany({ where, orderBy: { date: 'desc' } })
    let list = rows.map((r) => this.mapOrder(r as OrderRow))

    // 利润区间筛选（派生字段，内存过滤）
    const pmin = q.profitMin != null && q.profitMin !== '' ? Number(q.profitMin) : null
    const pmax = q.profitMax != null && q.profitMax !== '' ? Number(q.profitMax) : null
    if (pmin != null) list = list.filter((o) => o.profit >= pmin)
    if (pmax != null) list = list.filter((o) => o.profit <= pmax)

    if (q.sort === 'profit') list.sort((a, b) => b.profit - a.profit)

    const total = list.length
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50))
    const items = list.slice((page - 1) * pageSize, page * pageSize)
    const sums = list.reduce(
      (s, o) => ({
        revenue: s.revenue + o.total + (o.extraIncome || 0),
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

  async getOrder(userId: string, id: string) {
    const o = await this.prisma.ledgerOrder.findFirst({ where: { id, userId } })
    if (!o) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    return this.mapOrder(o as OrderRow)
  }

  private async resolveCustomer(userId: string, customerId?: string, fallbackName?: string) {
    if (!customerId)
      return { customerId: null as string | null, customerName: (fallbackName || '').trim() }
    const c = await this.prisma.ledgerCustomer.findFirst({ where: { id: customerId, userId } })
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
    if (!(dto.total > 0)) throw new BizException(BizCode.INVALID_PARAMS, '订单总价需大于 0')
    const date = new Date(dto.date)
    if (isNaN(date.getTime())) throw new BizException(BizCode.INVALID_PARAMS, '日期格式不正确')
    const o = await this.prisma.ledgerOrder.create({
      data: {
        userId,
        customerId,
        customerName,
        date,
        total: Math.round(dto.total),
        extraIncome: Math.max(0, Math.round(dto.extraIncome || 0)),
        costProfile: Math.max(0, Math.round(dto.costProfile || 0)),
        costGlass: Math.max(0, Math.round(dto.costGlass || 0)),
        costHardware: Math.max(0, Math.round(dto.costHardware || 0)),
        costLabor: Math.max(0, Math.round(dto.costLabor || 0)),
        costScreen: Math.max(0, Math.round(dto.costScreen || 0)),
        extras: sanitizeExtras(dto.extras) as any,
        customCosts: sanitizeCustomCosts(dto.customCosts) as any,
        note: dto.note?.trim() || null,
      },
    })
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
    if (dto.extraIncome !== undefined) data.extraIncome = Math.max(0, Math.round(dto.extraIncome))
    if (dto.costProfile !== undefined) data.costProfile = Math.max(0, Math.round(dto.costProfile))
    if (dto.costGlass !== undefined) data.costGlass = Math.max(0, Math.round(dto.costGlass))
    if (dto.costHardware !== undefined)
      data.costHardware = Math.max(0, Math.round(dto.costHardware))
    if (dto.costLabor !== undefined) data.costLabor = Math.max(0, Math.round(dto.costLabor))
    if (dto.costScreen !== undefined) data.costScreen = Math.max(0, Math.round(dto.costScreen))
    if (dto.extras !== undefined) data.extras = sanitizeExtras(dto.extras) as any
    if (dto.customCosts !== undefined)
      data.customCosts = sanitizeCustomCosts(dto.customCosts) as any
    if (dto.note !== undefined) data.note = dto.note?.trim() || null
    const o = await this.prisma.ledgerOrder.update({ where: { id }, data })
    return this.mapOrder(o as OrderRow)
  }

  async deleteOrder(userId: string, id: string) {
    const exist = await this.prisma.ledgerOrder.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '订单不存在')
    await this.prisma.ledgerOrder.delete({ where: { id } })
    return { ok: true }
  }

  // ── 客户 ──────────────────────────────────────────────────
  async listCustomers(userId: string) {
    const [customers, orders] = await Promise.all([
      this.prisma.ledgerCustomer.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.ledgerOrder.findMany({ where: { userId } }),
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
      c.revenue += o.total + o.extraIncome
      c.profit += p
      c.cost += totalCost(o as any)
      const d = ymd(o.date)
      if (d > c.lastDate) c.lastDate = d
    })
    return Array.from(map.values())
      .map((c) => ({ ...c, margin: c.revenue ? c.profit / c.revenue : 0 }))
      .sort((a, b) => b.profit - a.profit)
  }

  async getCustomer(userId: string, id: string) {
    const c = await this.prisma.ledgerCustomer.findFirst({ where: { id, userId } })
    if (!c) throw new BizException(BizCode.NOT_FOUND, '客户不存在')
    const orders = await this.prisma.ledgerOrder.findMany({
      // customerId 精确匹配；同名仅兜底无 customerId 的历史/快录订单，避免同名客户串档
      where: { userId, OR: [{ customerId: id }, { customerName: c.name, customerId: null }] },
      orderBy: { date: 'desc' },
    })
    const mapped = orders.map((o) => this.mapOrder(o as OrderRow))
    const revenue = mapped.reduce((s, o) => s + o.total + (o.extraIncome || 0), 0)
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

  async updateCustomer(userId: string, id: string, dto: UpdateLedgerCustomerDto) {
    const exist = await this.prisma.ledgerCustomer.findFirst({ where: { id, userId } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '客户不存在')
    const data: any = {}
    if (dto.name !== undefined && dto.name.trim()) data.name = dto.name.trim()
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null
    if (dto.address !== undefined) data.address = dto.address?.trim() || null
    if (dto.note !== undefined) data.note = dto.note?.trim() || null
    const c = await this.prisma.ledgerCustomer.update({ where: { id }, data })
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
    await this.prisma.ledgerCustomer.delete({ where: { id } })
    return { ok: true }
  }

  // ── 统计 ──────────────────────────────────────────────────
  private quarter(m: number) {
    return Math.ceil(m / 3)
  }

  async overview(userId: string, period = 'month') {
    const now = new Date()
    const Y = now.getFullYear()
    const M = now.getMonth() + 1
    const all = await this.prisma.ledgerOrder.findMany({ where: { userId } })
    const yearOrders = all.filter((o) => o.date.getFullYear() === Y)

    const inPeriod = (o: { date: Date }) => {
      const y = o.date.getFullYear()
      const m = o.date.getMonth() + 1
      if (period === 'year') return y === Y
      if (period === 'quarter') return y === Y && this.quarter(m) === this.quarter(M)
      return y === Y && m === M // month
    }
    const list = all.filter(inPeriod)

    const agg = (rows: typeof all) => ({
      count: rows.length,
      revenue: rows.reduce((s, o) => s + o.total + o.extraIncome, 0),
      cost: rows.reduce((s, o) => s + totalCost(o as any), 0),
      profit: rows.reduce((s, o) => s + profitOf(o as any), 0),
    })
    const cur = agg(list)
    const yearProfit = yearOrders.reduce((s, o) => s + profitOf(o as any), 0)

    // 成本占比（6 类）
    const slice = (key: keyof typeof CAT_FIELD) =>
      list.reduce((s, o) => s + (o as any)[CAT_FIELD[key]], 0)
    const costSlices = [
      { key: 'profile', name: '型材', value: slice('profile') },
      { key: 'glass', name: '玻璃', value: slice('glass') },
      { key: 'hardware', name: '配件', value: slice('hardware') },
      { key: 'labor', name: '人工', value: slice('labor') },
      { key: 'screen', name: '纱窗', value: slice('screen') },
      {
        key: 'extras',
        name: '其他',
        value: list.reduce(
          (s, o) => s + extrasTotal(o.extras) + customCostsTotal(o.customCosts),
          0,
        ),
      },
    ].filter((s) => s.value > 0)

    // 高利润订单排行 top5
    const topOrders = list
      .map((o) => ({
        id: o.id,
        customer: o.customerName,
        date: ymd(o.date),
        total: o.total,
        profit: profitOf(o as any),
        margin: marginOf(o as any),
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)

    // 年度利润趋势（1..12）
    const trend: any[] = []
    for (let m = 1; m <= 12; m++) {
      const ml = yearOrders.filter((o) => o.date.getMonth() + 1 === m)
      trend.push({
        month: m,
        label: `${m}月`,
        count: ml.length,
        revenue: ml.reduce((s, o) => s + o.total, 0),
        profit: ml.reduce((s, o) => s + profitOf(o as any), 0),
      })
    }

    const goalRow = await this.prisma.ledgerGoal.findUnique({ where: { userId } })
    const goal = { monthly: goalRow?.monthly ?? 0, yearly: goalRow?.yearly ?? 0 }
    const monthProfit =
      period === 'month'
        ? cur.profit
        : agg(all.filter((o) => o.date.getFullYear() === Y && o.date.getMonth() + 1 === M)).profit

    return {
      period,
      ...cur,
      avgProfit: cur.count ? Math.round(cur.profit / cur.count) : 0,
      yearProfit,
      monthProfit,
      costSlices,
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
    const all = await this.prisma.ledgerOrder.findMany({ where: { userId } })
    const yl = all.filter((o) => o.date.getFullYear() === Y)
    const series: any[] = []
    for (let m = 1; m <= 12; m++) {
      const ml = yl.filter((o) => o.date.getMonth() + 1 === m)
      const labor = ml.reduce((s, o) => s + o.costLabor, 0)
      series.push({
        month: m,
        label: `${m}月`,
        count: ml.length,
        revenue: ml.reduce((s, o) => s + o.total + o.extraIncome, 0),
        cost: ml.reduce((s, o) => s + totalCost(o as any), 0),
        profit: ml.reduce((s, o) => s + profitOf(o as any), 0),
        labor,
        otherCost: ml.reduce((s, o) => s + (totalCost(o as any) - o.costLabor), 0),
      })
    }
    return {
      year: Y,
      series,
      yearProfit: yl.reduce((s, o) => s + profitOf(o as any), 0),
      yearLabor: yl.reduce((s, o) => s + o.costLabor, 0),
      count: yl.length,
    }
  }

  /**
   * 首页 日/月/年 单量+利润 序列（#1）。
   * - day:   当月每天（1..月末）
   * - month: 今年 12 个月
   * - year:  近 5 年逐年
   */
  async series(userId: string, granularity = 'month') {
    const all = await this.prisma.ledgerOrder.findMany({ where: { userId } })
    const now = new Date()
    const Y = now.getFullYear()
    const bucket = (rows: typeof all, label: string) => ({
      label,
      count: rows.length,
      revenue: rows.reduce((s, o) => s + o.total + o.extraIncome, 0),
      cost: rows.reduce((s, o) => s + totalCost(o as any), 0),
      profit: rows.reduce((s, o) => s + profitOf(o as any), 0),
    })
    const buckets: ReturnType<typeof bucket>[] = []
    let unit = '月'
    if (granularity === 'day') {
      unit = '日'
      const M = now.getMonth()
      const days = new Date(Y, M + 1, 0).getDate()
      const mo = all.filter((o) => o.date.getFullYear() === Y && o.date.getMonth() === M)
      for (let d = 1; d <= days; d++) {
        buckets.push(
          bucket(
            mo.filter((o) => o.date.getDate() === d),
            String(d),
          ),
        )
      }
    } else if (granularity === 'year') {
      unit = '年'
      for (let y = Y - 4; y <= Y; y++) {
        buckets.push(
          bucket(
            all.filter((o) => o.date.getFullYear() === y),
            String(y),
          ),
        )
      }
    } else {
      for (let m = 1; m <= 12; m++) {
        buckets.push(
          bucket(
            all.filter((o) => o.date.getFullYear() === Y && o.date.getMonth() + 1 === m),
            `${m}月`,
          ),
        )
      }
    }
    const summary = buckets.reduce(
      (s, b) => ({
        count: s.count + b.count,
        revenue: s.revenue + b.revenue,
        cost: s.cost + b.cost,
        profit: s.profit + b.profit,
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
    const g = await this.prisma.ledgerGoal.findUnique({ where: { userId } })
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

  /** 写入一条应用内通知（best-effort，失败不影响主流程）。 */
  async pushNotification(userId: string, type: string, title: string, body: string) {
    try {
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
    }
  }

  /** 读取偏好（首次访问自动建默认行）。 */
  async getSettings(userId: string) {
    const s = await this.prisma.ledgerSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    })
    return this.mapSetting(s)
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
    const s = await this.prisma.ledgerSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
    return this.mapSetting(s)
  }

  // ── 意见反馈 ──────────────────────────────────────────────
  async createFeedback(userId: string, dto: CreateLedgerFeedbackDto) {
    const content = String(dto.content || '').trim()
    if (!content) throw new BizException(BizCode.INVALID_PARAMS, '请填写反馈内容')
    const fb = await this.prisma.ledgerFeedback.create({
      data: {
        userId,
        type: dto.type || 'general',
        content: content.slice(0, 1000),
        contact: dto.contact?.trim()?.slice(0, 40) || null,
      },
    })
    return { id: fb.id, ok: true }
  }
}

const CAT_FIELD = {
  profile: 'costProfile',
  glass: 'costGlass',
  hardware: 'costHardware',
  labor: 'costLabor',
  screen: 'costScreen',
} as const
