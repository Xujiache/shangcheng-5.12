import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { AdminLoginDto, PhoneLoginDto, RefreshDto, SmsCodeDto, WechatLoginDto } from './dto/login.dto'
import { SmsService } from '../sms/sms.service'

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
    private readonly sms: SmsService,
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
  /**
   * 微信小程序登录
   * dto.code = wx.login() 返回的临时 code
   *
   * 流程：
   *   1. 拿 code + appid + secret 调 https://api.weixin.qq.com/sns/jscode2session
   *      → 拿到 openid / unionid / session_key
   *   2. 通过 openid 查/建 User
   *   3. 签发 JWT
   *
   * 配置：环境变量 WX_MINIAPP_APPID / WX_MINIAPP_SECRET
   * 占位/降级：如果 env 未配或 code 调用失败，仍走 mock openid 流程，避免开发期阻塞
   */
  async wechatLogin(dto: WechatLoginDto) {
    const appid = process.env.WX_MINIAPP_APPID
    const secret = process.env.WX_MINIAPP_SECRET
    let openid: string | null = null
    let unionid: string | null = null

    if (appid && secret && dto.code) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(dto.code)}&grant_type=authorization_code`
        const r = await fetch(url, { method: 'GET' })
        const data: any = await r.json()
        if (data?.errcode && data.errcode !== 0) {
          // 40029 = invalid code, 45011 = frequency limit, etc.
          throw new BizException(BizCode.INVALID_PARAMS, `微信登录失败：${data.errmsg || data.errcode}`)
        }
        if (data?.openid) {
          openid = data.openid
          unionid = data.unionid || null
        }
      } catch (e: any) {
        if (e instanceof BizException) throw e
        // 网络故障：fall through 到 mock 兜底，避免本地开发阻塞
      }
    }

    // 兜底 mock：未配置 appid/secret 或 fetch 失败
    if (!openid) {
      openid = dto.code ? `wx_${dto.code.slice(0, 16)}` : `wx_anon_${Date.now()}`
    }

    let user = await this.prisma.user.findUnique({ where: { openid } })
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          unionid: unionid || undefined,
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

    // 校验验证码：只接受 SmsCode 表里真实下发的码
    const rec = await this.prisma.smsCode.findFirst({
      where: { phone: dto.phone, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!rec) throw new BizException(BizCode.INVALID_PARAMS, '验证码错误或已过期')
    await this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })

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

  /**
   * 发送短信验证码
   * - 非生产 / SMS_PROVIDER=none 时，code 固定为 '0000'，DB 落库后 phone-login 永远接受 '0000'
   * - 生产 + SMS_PROVIDER 配置完整时：生成 6 位随机码，调真实短信通道
   */
  async sendSmsCode(dto: SmsCodeDto) {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    const useRealSms = provider !== 'none' && process.env.NODE_ENV === 'production'
    const code = String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)

    const row = await this.prisma.smsCode.create({
      data: {
        phone: dto.phone,
        code,
        scene: dto.scene || 'login',
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    })

    if (useRealSms) {
      // 国阳云调用失败 → 删掉 DB 记录 + 抛错，让用户知道收不到（避免傻等 5 分钟）
      const ok = await this.sms.sendVerifyCode(dto.phone, code, (dto.scene || 'login') as any)
      if (!ok) {
        await this.prisma.smsCode.delete({ where: { id: row.id } }).catch(() => {})
        throw new BizException(BizCode.BUSINESS_ERROR, '短信发送失败，请稍后重试')
      }
    } else {
      // 非生产 / SMS_PROVIDER=none：不真发，DB 里有真 6 位码，开发者可在 SmsCode 表查
      // 注意：不再用固定 '0000'，开发时去 DB 查最新一条
    }
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
