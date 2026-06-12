import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { randomInt } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { SmsService } from '../sms/sms.service'
import {
  computeGrantExpiry,
  deriveMembership,
  normalizeLedgerConfig,
  genLedgerInviteCode,
} from './ledger.constants'
import {
  LedgerLoginDto,
  LedgerRegisterDto,
  LedgerSmsCodeDto,
  LedgerSmsLoginDto,
  LedgerChangePasswordDto,
  WechatLoginDto,
  WechatBindDto,
  WechatUnbindDto,
} from './dto/auth.dto'

const genJti = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)
const maskPhone = (p: string) => (p.length === 11 ? p.slice(0, 3) + '****' + p.slice(7) : p)

/**
 * 门窗利账 App 鉴权服务。
 *
 * 账号由 admin-pc 后台创建（无 App 自助注册）；以手机号+密码为主、短信验证码为辅。
 * token 带 scope:'ledger'，sub=LedgerUser.id，与商城 token 严格区分（见 LedgerJwtGuard）。
 */
@Injectable()
export class LedgerAuthService {
  private readonly logger = new Logger(LedgerAuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
  ) {}

  private async signToken(userId: string): Promise<string> {
    const ttl = Number(process.env.JWT_LEDGER_TOKEN_TTL) || 30 * 24 * 3600 // 默认 30 天
    return this.jwt.signAsync({ sub: userId, scope: 'ledger', jti: genJti() }, { expiresIn: ttl })
  }

  private publicUser(u: {
    id: string
    phone: string
    nickname: string
    avatar: string | null
    mustReset: boolean
    membership?: { expiresAt: Date | null; lastPlanKey: string | null } | null
  }) {
    return {
      id: u.id,
      phone: u.phone,
      nickname: u.nickname,
      avatar: u.avatar,
      // 登录响应必须带上：前端 routeAfterLogin 据此强制首登改密（否则只有冷启动静默路径生效）
      mustReset: u.mustReset,
      membership: deriveMembership(u.membership?.expiresAt ?? null, u.membership?.lastPlanKey),
    }
  }

  /** 手机号 + 密码登录（主） */
  async login(dto: LedgerLoginDto) {
    const phone = String(dto.phone || '').trim()
    const user = await this.prisma.ledgerUser.findUnique({
      where: { phone },
      include: { membership: true },
    })
    if (!user || !user.passwordHash) {
      throw new BizException(BizCode.INVALID_PARAMS, '账号或密码错误')
    }
    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '账号或密码错误')
    if (user.status === 'disabled')
      throw new BizException(BizCode.FORBIDDEN, '账号已被禁用，请联系管理员')

    await this.prisma.ledgerUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    const token = await this.signToken(user.id)
    const pub = this.publicUser(user)
    return { token, user: pub, membership: pub.membership }
  }

  private async readConfig() {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })
    return normalizeLedgerConfig(row?.value)
  }

  /** 公开配置（登录页据此显隐「注册」入口）。与 register 的校验读同一份 LedgerConfig。 */
  async getPublicConfig() {
    const cfg = await this.readConfig()
    return { allowSelfRegister: cfg.allowSelfRegister }
  }

  /**
   * App 自助注册（#10）。开关由 LedgerConfig.allowSelfRegister 控制。
   * 带有效邀请码 → 邀请人获赠 inviteRewardDays 天会员（叠加 + 记录 + 通知）。
   * 注册即登录，返回 token。
   */
  async register(dto: LedgerRegisterDto) {
    const cfg = await this.readConfig()
    if (!cfg.allowSelfRegister) {
      throw new BizException(BizCode.FORBIDDEN, '当前未开放自助注册，请联系管理员开通')
    }
    const phone = String(dto.phone || '').trim()
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
    }
    if (String(dto.password || '').length < 6) {
      throw new BizException(BizCode.INVALID_PARAMS, '密码至少 6 位')
    }
    const dup = await this.prisma.ledgerUser.findUnique({ where: { phone }, select: { id: true } })
    if (dup) throw new BizException(BizCode.CONFLICT, '该手机号已注册，请直接登录')

    // 解析邀请人（邀请码无效不阻断注册，仅不发奖励）
    let inviterId: string | null = null
    const code = String(dto.inviteCode || '')
      .trim()
      .toUpperCase()
    if (code) {
      const inviter = await this.prisma.ledgerUser.findUnique({
        where: { inviteCode: code },
        select: { id: true, status: true },
      })
      // 禁用账号不计奖励，与 login/smsLogin 对 disabled 的处理一致
      if (inviter && inviter.status !== 'disabled') inviterId = inviter.id
    }

    const passwordHash = await argon2.hash(dto.password)
    let user: any = null
    for (let i = 0; i < 6; i++) {
      try {
        user = await this.prisma.ledgerUser.create({
          data: {
            phone,
            passwordHash,
            nickname: dto.nickname?.trim() || '门窗店主',
            inviteCode: genLedgerInviteCode(),
            invitedById: inviterId,
            membership: { create: {} },
          },
          include: { membership: true },
        })
        break
      } catch (e: any) {
        if (e?.code === 'P2002') {
          const target = String(e?.meta?.target || '')
          if (target.includes('phone')) {
            throw new BizException(BizCode.CONFLICT, '该手机号已注册，请直接登录')
          }
          if (i === 5) throw new BizException(BizCode.BUSINESS_ERROR, '注册失败，请重试')
          continue // 邀请码碰撞，重试
        }
        throw e
      }
    }

    // 邀请奖励（best-effort：失败/超限都不影响"注册即登录返 token"；含反刷量上限）
    if (inviterId && cfg.inviteRewardDays > 0) {
      try {
        const cap = cfg.inviteMaxRewarded
        // 已邀人数（含刚创建的新用户）；cap<=0 视为不限
        const rewarded = await this.prisma.ledgerUser.count({ where: { invitedById: inviterId } })
        if (cap <= 0 || rewarded <= cap) {
          await this.rewardInviter(inviterId, cfg.inviteRewardDays, phone)
        } else {
          this.logger.warn(`invite reward capped: inviter=${inviterId} rewarded=${rewarded}>${cap}`)
        }
      } catch (e: any) {
        this.logger.warn('invite reward failed: ' + (e?.message || e))
      }
    }

    await this.prisma.ledgerUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    const token = await this.signToken(user.id)
    const pub = this.publicUser(user)
    return { token, user: pub, membership: pub.membership }
  }

  /** 给邀请人叠加会员天数 + 写变更记录 + 应用内通知。 */
  private async rewardInviter(inviterId: string, days: number, newUserPhone: string) {
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
        note: `邀请新用户 ${maskPhone(newUserPhone)} 注册奖励`,
      },
    })
    await this.prisma.ledgerNotification
      .create({
        data: {
          userId: inviterId,
          type: 'member',
          title: '邀请奖励到账',
          body: `您邀请的好友 ${maskPhone(newUserPhone)} 已注册，赠送 ${days} 天会员，有效期至 ${after
            .toISOString()
            .slice(0, 10)}。`,
        },
      })
      .catch(() => {})
  }

  /** 发送短信验证码（辅登录方式）。账号须已由后台创建。 */
  async sendSmsCode(dto: LedgerSmsCodeDto) {
    const phone = String(dto.phone || '').trim()
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BizException(BizCode.INVALID_PARAMS, '手机号格式不正确')
    }
    const exist = await this.prisma.ledgerUser.findUnique({
      where: { phone },
      select: { id: true },
    })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '账号不存在，请联系管理员开通')

    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && provider === 'none') {
      throw new BizException(BizCode.BUSINESS_ERROR, '短信服务未配置，请联系运维')
    }

    // 60 秒频控
    const recent = await this.prisma.smsCode.findFirst({
      where: { phone, scene: 'ledger', createdAt: { gt: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) throw new BizException(BizCode.BUSINESS_ERROR, '请勿频繁请求，60 秒后再试')

    const code = String(randomInt(100000, 1000000))
    const row = await this.prisma.smsCode.create({
      data: { phone, code, scene: 'ledger', expiresAt: new Date(Date.now() + 5 * 60_000) },
    })

    if (provider !== 'none' && isProd) {
      this.sms
        .sendVerifyCode(phone, code, 'login' as any)
        .then((res) => {
          if (!res?.ok) this.prisma.smsCode.delete({ where: { id: row.id } }).catch(() => {})
        })
        .catch(() => this.prisma.smsCode.delete({ where: { id: row.id } }).catch(() => {}))
    }
    return { ok: true }
  }

  /** 手机号 + 验证码登录（辅）。不自动建号。 */
  async smsLogin(dto: LedgerSmsLoginDto) {
    const phone = String(dto.phone || '').trim()
    const code = String(dto.code || '').trim()
    const rec = await this.prisma.smsCode.findFirst({
      where: { phone, scene: 'ledger', code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!rec) throw new BizException(BizCode.INVALID_PARAMS, '验证码错误或已过期')

    const user = await this.prisma.ledgerUser.findUnique({
      where: { phone },
      include: { membership: true },
    })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在，请联系管理员开通')
    if (user.status === 'disabled')
      throw new BizException(BizCode.FORBIDDEN, '账号已被禁用，请联系管理员')

    await this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })
    await this.prisma.ledgerUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    const token = await this.signToken(user.id)
    const pub = this.publicUser(user)
    return { token, user: pub, membership: pub.membership }
  }

  /** 改密（已登录账号）。已设密码须验旧；mustReset 首登设密可省旧密。 */
  async changePassword(userId: string, dto: LedgerChangePasswordDto) {
    const newPwd = String(dto?.newPassword || '')
    if (newPwd.length < 6) throw new BizException(BizCode.INVALID_PARAMS, '新密码至少 6 位')

    const user = await this.prisma.ledgerUser.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')

    if (!user.mustReset) {
      const oldPwd = String(dto?.oldPassword || '')
      if (!oldPwd) throw new BizException(BizCode.INVALID_PARAMS, '请填写旧密码')
      const ok = await argon2.verify(user.passwordHash, oldPwd)
      if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '旧密码不正确')
      if (oldPwd === newPwd)
        throw new BizException(BizCode.INVALID_PARAMS, '新密码不能与旧密码相同')
    }

    const passwordHash = await argon2.hash(newPwd)
    await this.prisma.ledgerUser.update({
      where: { id: userId },
      data: { passwordHash, mustReset: false },
    })
    return { ok: true }
  }

  // ── 微信绑定 / 一键登录 ───────────────────────────────────
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
    } catch (e) {
      throw new BizException(BizCode.BUSINESS_ERROR, '微信服务暂不可用，请稍后再试')
    }
    if (!data || !data.openid) {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '微信授权失败：' + (data?.errmsg || '无效的 code'),
      )
    }
    return data.openid as string
  }

  /** 微信一键登录：openid 须已绑定账号，否则提示先用手机号登录绑定。 */
  async wechatLogin(dto: WechatLoginDto) {
    const openid = await this.jscode2session(dto.code)
    const user = await this.prisma.ledgerUser.findUnique({
      where: { wxOpenid: openid },
      include: { membership: true },
    })
    if (!user) {
      throw new BizException(
        BizCode.NOT_FOUND,
        '该微信未绑定账号，请先用手机号登录后在「账户安全」绑定微信',
      )
    }
    if (user.status === 'disabled') {
      throw new BizException(BizCode.FORBIDDEN, '账号已被禁用，请联系管理员')
    }
    await this.prisma.ledgerUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    const token = await this.signToken(user.id)
    const pub = this.publicUser(user)
    return { token, user: pub, membership: pub.membership }
  }

  /** 绑定微信：验证登录密码 + code 换 openid，写入账号（openid 不可重复绑定）。 */
  async bindWechat(userId: string, dto: WechatBindDto) {
    const user = await this.prisma.ledgerUser.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '登录密码不正确')
    const openid = await this.jscode2session(dto.code)
    const other = await this.prisma.ledgerUser.findUnique({
      where: { wxOpenid: openid },
      select: { id: true },
    })
    if (other && other.id !== userId) {
      throw new BizException(BizCode.CONFLICT, '该微信已绑定其他账号')
    }
    await this.prisma.ledgerUser.update({ where: { id: userId }, data: { wxOpenid: openid } })
    return { ok: true, bound: true }
  }

  /** 解绑微信：验证登录密码。 */
  async unbindWechat(userId: string, dto: WechatUnbindDto) {
    const user = await this.prisma.ledgerUser.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '登录密码不正确')
    await this.prisma.ledgerUser.update({ where: { id: userId }, data: { wxOpenid: null } })
    return { ok: true, bound: false }
  }
}
