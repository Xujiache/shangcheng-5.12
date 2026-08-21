import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  computeGrantExpiry,
  deriveMembership,
  genLedgerInviteCode,
  normalizeLedgerConfig,
} from './ledger.constants'
import { WechatLoginDto } from './dto/auth.dto'

const genJti = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)

/** 门窗利账鉴权：只接受微信 wx.login，openid 是唯一登录身份。 */
@Injectable()
export class LedgerAuthService {
  private readonly logger = new Logger(LedgerAuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private accountCode(id: string): string {
    return id.slice(-8).toUpperCase()
  }

  private async signToken(userId: string): Promise<string> {
    const ttl = Number(process.env.JWT_LEDGER_TOKEN_TTL) || 30 * 24 * 3600
    return this.jwt.signAsync({ sub: userId, scope: 'ledger', jti: genJti() }, { expiresIn: ttl })
  }

  private publicUser(u: {
    id: string
    nickname: string
    avatar: string | null
    membership?: {
      expiresAt: Date | null
      lastPlanKey: string | null
      perpetual?: boolean
      trialClaimedAt?: Date | null
    } | null
  }) {
    return {
      id: u.id,
      accountCode: this.accountCode(u.id),
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

  private async readConfig() {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  /** 登录页仅下发品牌配置，不暴露任何额外鉴权开关。 */
  async getPublicConfig() {
    let logoUrl = ''
    try {
      const row = await this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })
      logoUrl = ((row?.value as any)?.site?.logo as string) || ''
    } catch {
      // 品牌配置缺失不影响微信登录。
    }
    return { logoUrl }
  }

  /** 用 wx.login 的 code 换 openid（需配 LEDGER_WX_APPID / LEDGER_WX_SECRET）。 */
  private async jscode2session(code: string): Promise<string> {
    const appid = process.env.LEDGER_WX_APPID || ''
    const secret = process.env.LEDGER_WX_SECRET || ''
    if (!appid || !secret) {
      throw new BizException(BizCode.BUSINESS_ERROR, '微信登录未配置（缺少 AppID / AppSecret）')
    }
    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    let data: any
    try {
      const res = await (globalThis as any).fetch(url)
      data = await res.json()
    } catch {
      throw new BizException(BizCode.BUSINESS_ERROR, '微信服务暂不可用，请稍后再试')
    }
    if (!data?.openid) {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '微信授权失败：' + (data?.errmsg || '无效的 code'),
      )
    }
    return data.openid as string
  }

  /** 支付下单复用，与登录使用同一个 ledger 小程序 AppID。 */
  async codeToOpenid(code: string): Promise<string> {
    return this.jscode2session(code)
  }

  /** 虚拟支付需要 session_key 生成用户态签名。 */
  async codeToSession(code: string): Promise<{ openid: string; sessionKey: string }> {
    const appid = process.env.LEDGER_WX_APPID || ''
    const secret = process.env.LEDGER_WX_SECRET || ''
    if (!appid || !secret) {
      throw new BizException(BizCode.BUSINESS_ERROR, '微信登录未配置（缺少 AppID / AppSecret）')
    }
    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    let data: any
    try {
      const res = await (globalThis as any).fetch(url)
      data = await res.json()
    } catch {
      throw new BizException(BizCode.BUSINESS_ERROR, '微信服务暂不可用，请稍后再试')
    }
    if (!data?.openid || !data?.session_key) {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '微信授权失败：' + (data?.errmsg || '无效的 code'),
      )
    }
    return { openid: data.openid as string, sessionKey: data.session_key as string }
  }

  private async resolveInviter(inviteCode?: string): Promise<string | null> {
    const code = String(inviteCode || '')
      .trim()
      .toUpperCase()
    if (!code) return null
    const inviter = await this.prisma.ledgerUser.findUnique({
      where: { inviteCode: code },
      select: { id: true, status: true },
    })
    return inviter && inviter.status !== 'disabled' ? inviter.id : null
  }

  private async createWechatUser(openid: string, inviteCode?: string) {
    const inviterId = await this.resolveInviter(inviteCode)
    for (let i = 0; i < 6; i++) {
      try {
        const user = await this.prisma.ledgerUser.create({
          data: {
            wxOpenid: openid,
            nickname: '微信用户',
            inviteCode: genLedgerInviteCode(),
            invitedById: inviterId,
            membership: { create: {} },
          },
          include: { membership: true },
        })
        return { user, created: true, inviterId }
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e
        // 同一微信并发点击登录时，唯一索引只允许创建一次；其余请求复用已创建账号。
        const existing = await this.prisma.ledgerUser.findUnique({
          where: { wxOpenid: openid },
          include: { membership: true },
        })
        if (existing) return { user: existing, created: false, inviterId: null }
        if (i === 5) {
          throw new BizException(BizCode.BUSINESS_ERROR, '微信账号创建失败，请重试')
        }
        // 其余唯一冲突仅可能是随机邀请码碰撞，重新生成后再试。
      }
    }
    throw new BizException(BizCode.BUSINESS_ERROR, '微信账号创建失败，请重试')
  }

  /**
   * 微信账号与会员档案是一对一关系：首次登录创建空档案，历史微信账号登录时也补齐。
   * 空档案不代表会员有效，expiresAt=null 会被 deriveMembership 判为“尚未开通”。
   */
  private async ensureMembership<T extends { id: string; membership?: any | null }>(
    user: T,
  ): Promise<T> {
    if (user.membership) return user
    const membership = await this.prisma.ledgerMembership.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })
    return { ...user, membership }
  }

  /** 唯一登录入口：已有 openid 直接登录，不存在则自动建立微信账号。 */
  async wechatLogin(dto: WechatLoginDto) {
    const code = String(dto.code || '').trim()
    if (!code) throw new BizException(BizCode.INVALID_PARAMS, '缺少微信登录 code')
    const openid = await this.jscode2session(code)

    let user = await this.prisma.ledgerUser.findUnique({
      where: { wxOpenid: openid },
      include: { membership: true },
    })
    let created = false
    let inviterId: string | null = null
    if (!user) {
      const result = await this.createWechatUser(openid, dto.inviteCode)
      user = result.user
      created = result.created
      inviterId = result.inviterId
    }

    // 对早期已绑定微信、但遗漏 LedgerMembership 行的账号做幂等补齐。
    // 这样“微信账号 → 会员档案”的关系不会因历史数据而断裂。
    user = await this.ensureMembership(user)

    if (user.status === 'disabled') {
      throw new BizException(BizCode.FORBIDDEN, '账号已被禁用，请联系管理员')
    }
    await this.prisma.ledgerUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    if (created && inviterId) {
      try {
        const cfg = await this.readConfig()
        if (cfg.inviteRewardDays > 0) {
          const rewarded = await this.prisma.ledgerUser.count({ where: { invitedById: inviterId } })
          if (cfg.inviteMaxRewarded <= 0 || rewarded <= cfg.inviteMaxRewarded) {
            await this.rewardInviter(inviterId, cfg.inviteRewardDays, this.accountCode(user.id))
          } else {
            this.logger.warn(
              `invite reward capped: inviter=${inviterId} rewarded=${rewarded}>${cfg.inviteMaxRewarded}`,
            )
          }
        }
      } catch (e: any) {
        // 奖励失败不能阻断新用户首次登录。
        this.logger.warn('invite reward failed: ' + (e?.message || e))
      }
    }

    const token = await this.signToken(user.id)
    const pub = this.publicUser(user)
    return { token, user: pub, membership: pub.membership, created }
  }

  private async rewardInviter(inviterId: string, days: number, newUserCode: string) {
    const inviter = await this.prisma.ledgerUser.findUnique({
      where: { id: inviterId },
      include: { membership: true },
    })
    if (!inviter) return
    let membership = inviter.membership
    if (!membership) {
      membership = await this.prisma.ledgerMembership.create({ data: { userId: inviterId } })
    }
    const before = membership.expiresAt
    const after = computeGrantExpiry(before, days)
    await this.prisma.ledgerMembership.update({
      where: { id: membership.id },
      data: { expiresAt: after, lastPlanKey: membership.lastPlanKey || 'invite' },
    })
    await this.prisma.ledgerMembershipLog.create({
      data: {
        membershipId: membership.id,
        deltaDays: days,
        planKey: 'invite',
        beforeAt: before,
        afterAt: after,
        operatorId: null,
        note: `邀请微信用户 ${newUserCode} 登录奖励`,
      },
    })
    await this.prisma.ledgerNotification
      .create({
        data: {
          userId: inviterId,
          type: 'member',
          title: '邀请奖励到账',
          body: `您邀请的好友 ${newUserCode} 已首次登录，赠送 ${days} 天会员，有效期至 ${after
            .toISOString()
            .slice(0, 10)}。`,
        },
      })
      .catch(() => {})
  }
}
