import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  LEDGER_PLAN_DAYS,
  computeGrantExpiry,
  deriveMembership,
  normalizeLedgerConfig,
} from './ledger.constants'
import {
  CreateLedgerAdDto,
  GrantMembershipDto,
  PushNotificationDto,
  UpdateLedgerAdDto,
  UpdateLedgerConfigDto,
  UpdateLedgerFeedbackDto,
  UpdateLedgerUserDto,
} from './dto/admin.dto'

/**
 * 门窗利账 · 后台管理服务（admin-pc 平台工作台调用）。
 * 微信账号由小程序首次登录自动创建；后台负责禁用、资料维护和会员时长审计。
 */
@Injectable()
export class LedgerAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(u: any) {
    return {
      id: u.id,
      accountCode: u.id.slice(-8).toUpperCase(),
      wechatLinked: !!u.wxOpenid,
      nickname: u.nickname,
      avatar: u.avatar,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
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

  async listUsers(q: any) {
    const kw = String(q?.keyword || '').trim()
    const where: any = {}
    if (kw) {
      where.OR = [
        { id: { contains: kw.toLowerCase() } },
        { nickname: { contains: kw, mode: 'insensitive' } },
      ]
    }
    if (q?.status === 'active' || q?.status === 'disabled') where.status = q.status

    const page = Math.max(1, Number(q?.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q?.pageSize) || 50))
    const [rows, total] = await Promise.all([
      this.prisma.ledgerUser.findMany({
        where,
        include: { membership: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ledgerUser.count({ where }),
    ])
    return { list: rows.map((u) => this.mapUser(u)), total, page, pageSize }
  }

  async updateUser(id: string, dto: UpdateLedgerUserDto) {
    const exist = await this.prisma.ledgerUser.findUnique({ where: { id } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    const data: any = {}
    if (dto.nickname !== undefined && dto.nickname.trim()) data.nickname = dto.nickname.trim()
    if (dto.status === 'active' || dto.status === 'disabled') data.status = dto.status
    const u = await this.prisma.ledgerUser.update({
      where: { id },
      data,
      include: { membership: true },
    })
    return this.mapUser(u)
  }

  /** 增加会员时长（叠加）。planKey 与 days 二选一，days 优先。 */
  async grantMembership(id: string, dto: GrantMembershipDto, operatorId?: string) {
    const user = await this.prisma.ledgerUser.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')

    let days = dto.days
    let isPerpetual = false
    // 自定义 days 优先；否则以后台动态套餐为准（旧 key 回落 LEDGER_PLAN_DAYS）。
    if (dto.planKey && (days === undefined || days === null)) {
      const cfg = await this.getConfig()
      const plan = cfg.plans.find((p) => p.key === dto.planKey)
      if (plan?.perpetual) isPerpetual = true
      days = plan ? plan.days : LEDGER_PLAN_DAYS[dto.planKey]
    }
    if (!isPerpetual && (days === undefined || days === null || days === 0)) {
      throw new BizException(BizCode.INVALID_PARAMS, '请选择套餐或填写有效天数')
    }
    days = days ?? 0

    const auditNote = dto.note?.trim() || ''
    const deltaDays = isPerpetual ? 0 : days
    const grantOnce = () =>
      this.prisma.$transaction(
        async (tx) => {
          // 必须在事务内重读到期时间，避免并发授予基于事务外旧快照累加。
          let membership = await tx.ledgerMembership.findUnique({ where: { userId: id } })
          if (!membership) {
            membership = await tx.ledgerMembership.create({ data: { userId: id } })
          }
          const before = membership.expiresAt
          // 永久会员是独立语义，不用「10 年到期」假装；审计也不记为 +3650 天。
          const nextExpiry = isPerpetual ? null : computeGrantExpiry(before, days)
          const next = await tx.ledgerMembership.update({
            where: { id: membership.id },
            data: {
              expiresAt: nextExpiry,
              lastPlanKey: dto.planKey || 'custom',
              updatedById: operatorId || null,
              ...(isPerpetual ? { perpetual: true } : {}),
            },
          })
          await tx.ledgerMembershipLog.create({
            data: {
              membershipId: membership.id,
              deltaDays,
              planKey: dto.planKey || 'custom',
              beforeAt: before,
              afterAt: nextExpiry,
              operatorId: operatorId || null,
              note: isPerpetual
                ? ['开通永久会员', auditNote].filter(Boolean).join('；')
                : auditNote || null,
            },
          })
          return { updated: next, after: nextExpiry }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )

    let grantResult: Awaited<ReturnType<typeof grantOnce>>
    try {
      grantResult = await grantOnce()
    } catch (e) {
      const conflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034'
      if (!conflict) throw e
      try {
        grantResult = await grantOnce()
      } catch (retryError) {
        const retryConflict =
          retryError instanceof Prisma.PrismaClientKnownRequestError && retryError.code === 'P2034'
        if (retryConflict) {
          throw new BizException(BizCode.BUSINESS_ERROR, '会员状态正在更新，请重试')
        }
        throw retryError
      }
    }
    const { updated, after } = grantResult
    const status = deriveMembership(updated.expiresAt, updated.lastPlanKey, new Date(), {
      perpetual: isPerpetual || updated.perpetual,
      trialClaimedAt: updated.trialClaimedAt,
    })
    // 给记账用户写一条真实的会员通知（消息中心可见）
    if (isPerpetual) {
      await this.notify(id, 'member', '永久会员已开通', '已为您开通永久会员，长期有效。')
    } else {
      await this.notify(
        id,
        'member',
        days >= 0 ? '会员已开通 / 续费' : '会员时长已调整',
        days >= 0
          ? `已为您增加 ${days} 天会员时长，有效期至 ${this.ymd(after as Date)}。`
          : `会员时长调整 ${days} 天，当前有效期至 ${this.ymd(after as Date)}。`,
      )
    }
    return { membership: status, deltaDays }
  }

  /** 写入一条记账用户的应用内通知（best-effort）。 */
  private async notify(userId: string, type: string, title: string, body: string) {
    try {
      await this.prisma.ledgerNotification.create({ data: { userId, type, title, body } })
    } catch {
      /* 非关键路径 */
    }
  }

  private ymd(d: Date): string {
    return d.toISOString().slice(0, 10)
  }

  async membershipLogs(id: string) {
    const m = await this.prisma.ledgerMembership.findUnique({
      where: { userId: id },
      select: { id: true },
    })
    if (!m) return []
    return this.prisma.ledgerMembershipLog.findMany({
      where: { membershipId: m.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  // ── 意见反馈管理 ──────────────────────────────────────────
  async listFeedback(q: any) {
    const where: any = {}
    if (q?.status === 'open' || q?.status === 'resolved') where.status = q.status
    if (q?.type) where.type = q.type
    const kw = String(q?.keyword || '').trim()
    if (kw) where.content = { contains: kw }

    const page = Math.max(1, Number(q?.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q?.pageSize) || 50))
    const [rows, total] = await Promise.all([
      this.prisma.ledgerFeedback.findMany({
        where,
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ledgerFeedback.count({ where }),
    ])
    const list = rows.map((f) => ({
      id: f.id,
      userId: f.userId,
      accountCode: f.user?.id.slice(-8).toUpperCase() || '',
      nickname: f.user?.nickname || '',
      type: f.type,
      content: f.content,
      contact: f.contact,
      status: f.status,
      reply: f.reply,
      images: (f.images as any) || [],
      createdAt: f.createdAt,
    }))
    return { list, total, page, pageSize }
  }

  async updateFeedback(id: string, dto: UpdateLedgerFeedbackDto) {
    const exist = await this.prisma.ledgerFeedback.findUnique({ where: { id } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '反馈不存在')
    const data: any = {}
    if (dto.status === 'open' || dto.status === 'resolved') data.status = dto.status
    if (dto.reply !== undefined) data.reply = dto.reply.trim() || null
    const f = await this.prisma.ledgerFeedback.update({ where: { id }, data })
    return { id: f.id, status: f.status, reply: f.reply }
  }

  // ── 推送通知 ──────────────────────────────────────────────
  async pushNotification(id: string, dto: PushNotificationDto) {
    const user = await this.prisma.ledgerUser.findUnique({ where: { id }, select: { id: true } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    const n = await this.prisma.ledgerNotification.create({
      data: {
        userId: id,
        type: dto.type?.trim() || 'system',
        title: dto.title.trim(),
        body: dto.body.trim(),
      },
    })
    return { id: n.id, ok: true }
  }

  // ── 首页广告管理（#2）────────────────────────────────────
  async listAds() {
    return this.prisma.ledgerAd.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }] })
  }

  async createAd(dto: CreateLedgerAdDto) {
    return this.prisma.ledgerAd.create({
      data: {
        image: dto.image.trim(),
        title: dto.title?.trim() || null,
        link: dto.link?.trim() || null,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? true,
      },
    })
  }

  async updateAd(id: string, dto: UpdateLedgerAdDto) {
    const exist = await this.prisma.ledgerAd.findUnique({ where: { id } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '广告不存在')
    const data: any = {}
    if (dto.image !== undefined) data.image = dto.image.trim()
    if (dto.title !== undefined) data.title = dto.title.trim() || null
    if (dto.link !== undefined) data.link = dto.link.trim() || null
    if (dto.sort !== undefined) data.sort = dto.sort
    if (dto.enabled !== undefined) data.enabled = dto.enabled
    return this.prisma.ledgerAd.update({ where: { id }, data })
  }

  async deleteAd(id: string) {
    const exist = await this.prisma.ledgerAd.findUnique({ where: { id }, select: { id: true } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '广告不存在')
    await this.prisma.ledgerAd.delete({ where: { id } })
    return { ok: true }
  }

  // ── 全局功能配置（#9 优化下料 / #10 邀请）────────────────
  async getConfig() {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  async updateConfig(dto: UpdateLedgerConfigDto) {
    const current = await this.getConfig()
    const merged = normalizeLedgerConfig({ ...current, ...dto })
    await this.prisma.ledgerConfig.upsert({
      where: { key: 'global' },
      create: { key: 'global', value: merged as any },
      update: { value: merged as any },
    })
    return merged
  }

  // ── 邀请统计（#10）────────────────────────────────────────
  async inviteStats() {
    const [totalUsers, invitedUsers] = await Promise.all([
      this.prisma.ledgerUser.count(),
      this.prisma.ledgerUser.count({ where: { invitedById: { not: null } } }),
    ])
    const grouped = await this.prisma.ledgerUser.groupBy({
      by: ['invitedById'],
      where: { invitedById: { not: null } },
      _count: { _all: true },
    })
    const sorted = grouped
      .map((g) => ({ inviterId: g.invitedById as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100)
    const inviters = await this.prisma.ledgerUser.findMany({
      where: { id: { in: sorted.map((s) => s.inviterId) } },
      select: { id: true, nickname: true, inviteCode: true },
    })
    const map = new Map(inviters.map((u) => [u.id, u]))
    const list = sorted.map((s) => {
      const u = map.get(s.inviterId)
      return {
        inviterId: s.inviterId,
        accountCode: u?.id.slice(-8).toUpperCase() || '',
        nickname: u?.nickname || '',
        inviteCode: u?.inviteCode || '',
        invitedCount: s.count,
      }
    })
    return { totalUsers, invitedUsers, list }
  }
}
