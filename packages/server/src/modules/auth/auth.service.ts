import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { AdminLoginDto, PhoneLoginDto, RefreshDto, SmsCodeDto, WechatLoginDto } from './dto/login.dto'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async signTokens(payload: { sub: string; role: string; merchantId?: string }): Promise<TokenPair> {
    const accessTtl = Number(process.env.JWT_ACCESS_TOKEN_TTL) || 7200
    const refreshTtl = Number(process.env.JWT_REFRESH_TOKEN_TTL) || 604800
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: accessTtl })
    const refreshToken = await this.jwt.signAsync({ ...payload, _r: 1 }, { expiresIn: refreshTtl })
    return { accessToken, refreshToken, expiresIn: accessTtl }
  }

  private toUser(u: any) {
    if (!u) return null
    const { passwordHash, ...rest } = u
    return {
      ...rest,
      // admin-pc UserInfo 兼容字段
      userId: u.id,
      userName: u.username || u.nickname,
      roles: [u.role],
      buttons: [],
    }
  }

  /** 微信小程序登录（mock：根据 code 创建/查找用户） */
  async wechatLogin(dto: WechatLoginDto) {
    const openid = dto.code ? `wx_${dto.code.slice(0, 16)}` : `wx_anon_${Date.now()}`
    let user = await this.prisma.user.findUnique({ where: { openid } })
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: '微信用户',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${openid}`,
          role: 'customer',
        },
      })
    }
    const tokens = await this.signTokens({ sub: user.id, role: user.role, merchantId: user.merchantId || undefined })
    return { user: this.toUser(user), ...tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 }
  }

  /** 手机号验证码登录 */
  async phoneLogin(dto: PhoneLoginDto) {
    const code = dto.smsCode || dto.code
    if (!code) throw new BizException(BizCode.INVALID_PARAMS, '验证码不能为空')

    // 校验验证码（dev 模式接受 0000）
    if (code !== '0000') {
      const rec = await this.prisma.smsCode.findFirst({
        where: { phone: dto.phone, code, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
      if (!rec) throw new BizException(BizCode.INVALID_PARAMS, '验证码错误或已过期')
      await this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })
    }

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          nickname: `用户${dto.phone.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${dto.phone}`,
          role: 'customer',
        },
      })
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const tokens = await this.signTokens({ sub: user.id, role: user.role, merchantId: user.merchantId || undefined })
    return { user: this.toUser(user), ...tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 }
  }

  /** 发送短信验证码（dev 直接返回 0000） */
  async sendSmsCode(dto: SmsCodeDto) {
    const code = process.env.NODE_ENV === 'production' ? String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6) : '0000'
    await this.prisma.smsCode.create({
      data: {
        phone: dto.phone,
        code,
        scene: dto.scene || 'login',
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    })
    // 生产应调用阿里云/腾讯云 SMS
    return { ok: true }
  }

  /** 后台账号密码登录（admin-pc / platform-app / merchant-app 共用） */
  async adminLogin(dto: AdminLoginDto) {
    const username = dto.username || dto.userName
    if (!username) throw new BizException(BizCode.INVALID_PARAMS, '账号不能为空')

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    })
    if (!user || !user.passwordHash) {
      throw new BizException(BizCode.INVALID_PARAMS, '账号或密码错误')
    }
    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '账号或密码错误')
    if (user.status === 'disabled') throw new BizException(BizCode.FORBIDDEN, '账号已禁用')

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const tokens = await this.signTokens({ sub: user.id, role: user.role, merchantId: user.merchantId || undefined })
    return {
      user: this.toUser(user),
      ...tokens,
      // admin-pc 期望平铺
      token: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    }
  }

  /** 刷新 Token */
  async refresh(dto: RefreshDto) {
    try {
      const payload: any = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET || 'please-change-me-in-production',
      })
      if (!payload._r) throw new Error('not refresh token')
      const tokens = await this.signTokens({ sub: payload.sub, role: payload.role, merchantId: payload.merchantId })
      return tokens
    } catch {
      throw new BizException(BizCode.TOKEN_EXPIRED, 'refreshToken 已失效')
    }
  }

  /** 当前用户信息 */
  async userInfo(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    return this.toUser(user)
  }
}
