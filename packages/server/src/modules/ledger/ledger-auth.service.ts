import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { randomInt } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { SmsService } from '../sms/sms.service'
import { deriveMembership } from './ledger.constants'
import {
  LedgerLoginDto,
  LedgerSmsCodeDto,
  LedgerSmsLoginDto,
  LedgerChangePasswordDto,
} from './dto/auth.dto'

const genJti = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)

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
    membership?: { expiresAt: Date | null; lastPlanKey: string | null } | null
  }) {
    return {
      id: u.id,
      phone: u.phone,
      nickname: u.nickname,
      avatar: u.avatar,
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
}
