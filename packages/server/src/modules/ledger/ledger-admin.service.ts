import { Injectable } from '@nestjs/common'
import * as argon2 from 'argon2'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { LEDGER_PLAN_DAYS, computeGrantExpiry, deriveMembership } from './ledger.constants'
import { CreateLedgerUserDto, GrantMembershipDto, UpdateLedgerUserDto } from './dto/admin.dto'

// 初始/重置密码：去掉易混字符（0/O/1/l/I），8 位
const genPassword = customAlphabet('23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', 8)

/**
 * 门窗利账 · 后台管理服务（admin-pc 平台工作台调用）。
 * 管理记账账号的创建/禁用/改密，以及会员时长的叠加与审计。
 */
@Injectable()
export class LedgerAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(u: any) {
    return {
      id: u.id,
      phone: u.phone,
      nickname: u.nickname,
      avatar: u.avatar,
      status: u.status,
      mustReset: u.mustReset,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      membership: deriveMembership(u.membership?.expiresAt ?? null, u.membership?.lastPlanKey),
    }
  }

  async listUsers(q: any) {
    const kw = String(q?.keyword || '').trim()
    const where: any = {}
    if (kw) where.OR = [{ phone: { contains: kw } }, { nickname: { contains: kw } }]
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

  async createUser(dto: CreateLedgerUserDto, operatorId?: string) {
    const phone = String(dto.phone || '').trim()
    if (!/^1[3-9]\d{9}$/.test(phone))
      throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
    const dup = await this.prisma.ledgerUser.findUnique({ where: { phone }, select: { id: true } })
    if (dup) throw new BizException(BizCode.CONFLICT, '该手机号已存在')

    const generated = !dto.password
    const plain = dto.password || genPassword()
    const passwordHash = await argon2.hash(plain)
    const u = await this.prisma.ledgerUser.create({
      data: {
        phone,
        passwordHash,
        nickname: dto.nickname?.trim() || '门窗店主',
        createdById: operatorId || null,
        mustReset: generated, // 系统生成的初始密码要求首登改密
        membership: { create: {} }, // 1:1 空会员（expiresAt=null=未开通）
      },
      include: { membership: true },
    })
    return { ...this.mapUser(u), generatedPassword: generated ? plain : undefined }
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

  async resetPassword(id: string) {
    const exist = await this.prisma.ledgerUser.findUnique({ where: { id }, select: { id: true } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    const plain = genPassword()
    await this.prisma.ledgerUser.update({
      where: { id },
      data: { passwordHash: await argon2.hash(plain), mustReset: true },
    })
    return { password: plain }
  }

  /** 增加会员时长（叠加）。planKey 与 days 二选一，days 优先。 */
  async grantMembership(id: string, dto: GrantMembershipDto, operatorId?: string) {
    const user = await this.prisma.ledgerUser.findUnique({
      where: { id },
      include: { membership: true },
    })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')

    let days = dto.days
    if ((days === undefined || days === null) && dto.planKey) days = LEDGER_PLAN_DAYS[dto.planKey]
    if (days === undefined || days === null || days === 0) {
      throw new BizException(BizCode.INVALID_PARAMS, '请选择套餐或填写有效天数')
    }

    let membership = user.membership
    if (!membership) {
      membership = await this.prisma.ledgerMembership.create({ data: { userId: id } })
    }
    const before = membership.expiresAt
    const after = computeGrantExpiry(before, days)
    const updated = await this.prisma.ledgerMembership.update({
      where: { id: membership.id },
      data: {
        expiresAt: after,
        lastPlanKey: dto.planKey || 'custom',
        updatedById: operatorId || null,
      },
    })
    await this.prisma.ledgerMembershipLog.create({
      data: {
        membershipId: membership.id,
        deltaDays: days,
        planKey: dto.planKey || 'custom',
        beforeAt: before,
        afterAt: after,
        operatorId: operatorId || null,
        note: dto.note?.trim() || null,
      },
    })
    return {
      membership: deriveMembership(updated.expiresAt, updated.lastPlanKey),
      deltaDays: days,
    }
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
}
