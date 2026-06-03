import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { randomInt } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  AdminLoginDto,
  PhoneLoginDto,
  RefreshDto,
  SmsCodeDto,
  WechatLoginDto,
} from './dto/login.dto'
import { SmsService } from '../sms/sms.service'
import { RefreshTokenBlacklistService } from './refresh-token-blacklist.service'
import { _clearJwtUserCache } from '../../common/guards/jwt.guard'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** 12 字符 jti（足以承载几十亿条记录且明显短于 UUID） */
const genJti = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    private readonly refreshBlacklist: RefreshTokenBlacklistService,
  ) {}

  /**
   * 签发 access + refresh token 对。
   *
   * jti（JWT ID）安全说明：
   *   - access / refresh 各持独立的 jti（access 的 jti 仅作审计；refresh 的 jti 是 rotation 关键）
   *   - refresh() 拿到旧 refresh token 时会先 isRevoked(jti) 检查；
   *     一次性 refresh 成功后旧 jti 立即加入黑名单，攻击者拿到旧 token 也用不了。
   */
  private async signTokens(payload: {
    sub: string
    role: string
    merchantId?: string
  }): Promise<TokenPair> {
    const accessTtl = Number(process.env.JWT_ACCESS_TOKEN_TTL) || 7200
    const refreshTtl = Number(process.env.JWT_REFRESH_TOKEN_TTL) || 604800
    const accessToken = await this.jwt.signAsync(
      { ...payload, jti: genJti() },
      { expiresIn: accessTtl },
    )
    const refreshToken = await this.jwt.signAsync(
      { ...payload, _r: 1, jti: genJti() },
      { expiresIn: refreshTtl },
    )
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
      // 关联 AdminRole.name 平铺，便于前端直接展示角色显示名（admin-pc 用户中心 / 平台账号列表）
      // u.adminRole 在调用方使用 include: { adminRole: true } 时存在；缺失时为 null
      roleName: u.adminRole?.name ?? null,
      // 首次登录判断：用户是否已设过密码。
      // 商家端登录页拿到 false → 强制跳"设置密码"，避免后续 admin-pc 因无密码登不上。
      // 注意：不能直接把 passwordHash 给前端（即便是 boolean 化，也只在登录响应里返回，
      // /u/profile 等接口不应包含此字段）。
      hasPassword: !!passwordHash,
    }
  }

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
   *
   * 安全规则：
   *   - 生产环境（NODE_ENV=production）：必须真实换到 openid，否则拒绝登录，
   *     杜绝伪造 code 直接获取账号的风险。
   *   - 非生产环境：env 缺失或调用失败时使用与 code 强相关的派生 openid，
   *     便于本地联调；但该 openid 是确定性的，绝不可与任何真实 openid 冲突。
   */
  async wechatLogin(dto: WechatLoginDto) {
    const appid = process.env.WX_MINIAPP_APPID
    const secret = process.env.WX_MINIAPP_SECRET
    const isProd = process.env.NODE_ENV === 'production'
    let openid: string | null = null
    let unionid: string | null = null

    if (appid && secret && dto.code) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(dto.code)}&grant_type=authorization_code`
        const r = await fetch(url, { method: 'GET' })
        const data: any = await r.json()
        if (data?.errcode && data.errcode !== 0) {
          // 40029 = invalid code, 45011 = frequency limit, etc.
          throw new BizException(
            BizCode.INVALID_PARAMS,
            `微信登录失败：${data.errmsg || data.errcode}`,
          )
        }
        if (data?.openid) {
          openid = data.openid
          unionid = data.unionid || null
        }
      } catch (e: any) {
        if (e instanceof BizException) throw e
        if (isProd) {
          // 生产环境：网络故障也要明确告知前端，避免静默走假数据
          throw new BizException(BizCode.BUSINESS_ERROR, '微信登录服务暂不可用，请稍后重试')
        }
        // 非生产：fall through 到开发期兜底
      }
    } else if (isProd) {
      // 生产环境必须配齐 WeChat 凭证
      throw new BizException(BizCode.BUSINESS_ERROR, '服务端未配置微信小程序凭证，无法完成登录')
    }

    if (!openid) {
      if (isProd) {
        throw new BizException(BizCode.INVALID_PARAMS, '微信授权失败，未获取到 openid')
      }
      // 仅本地/测试：根据 code 派生确定性 openid，便于联调（带前缀避免与真实 openid 冲突）
      openid = dto.code ? `dev_wx_${dto.code.slice(0, 16)}` : `dev_wx_anon_${Date.now()}`
    }

    let user = await this.prisma.user.findUnique({
      where: { openid },
      include: { adminRole: true },
    })
    if (!user) {
      const created = await this.prisma.user.create({
        data: {
          openid,
          unionid: unionid || undefined,
          nickname: '微信用户',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${openid}`,
          role: 'customer',
        },
      })
      user = await this.prisma.user.findUnique({
        where: { id: created.id },
        include: { adminRole: true },
      })
    }
    const tokens = await this.signTokens({
      sub: user!.id,
      role: user!.role,
      merchantId: user!.merchantId || undefined,
    })
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

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { adminRole: true },
    })
    if (!user) {
      const created = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          nickname: `用户${dto.phone.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${dto.phone}`,
          role: 'customer',
        },
      })
      user = await this.prisma.user.findUnique({
        where: { id: created.id },
        include: { adminRole: true },
      })
    }
    await this.prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } })
    const tokens = await this.signTokens({
      sub: user!.id,
      role: user!.role,
      merchantId: user!.merchantId || undefined,
    })
    return { user: this.toUser(user), ...tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 }
  }

  /**
   * 发送短信验证码（异步火并忘，把客户端等待降到 ~50ms）
   *
   * 客户端流程：
   *   1. 校验手机号格式 & 60s 节流
   *   2. 写 SmsCode 表（必须同步，phone-login 校验依赖它）
   *   3. **立即** 返回 { ok: true }
   *   4. 异步去调短信 provider，发完后台日志记录（成功/失败都不影响客户端）
   *
   * 失败原因会写到日志便于后台排查；如果上游调用失败，
   * 下次用户重发会重新建一条 SmsCode 记录。
   *
   * 安全 P0（生产）：SMS_PROVIDER === 'none' 在生产环境一律抛错，
   * 因为这意味着没有真实下发短信通道，用户根本收不到验证码 → 留接口风险。
   * 非生产 / 开发期：保留 SMS_PROVIDER=none 兜底，DB 里有真 6 位码，
   * 开发者可在 SmsCode 表里查码做联调（同样需控制好 SmsCode 表的访问权限）。
   */
  async sendSmsCode(dto: SmsCodeDto) {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && provider === 'none') {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        '短信服务未配置，请联系运维配置 SMS_PROVIDER',
      )
    }
    const useRealSms = provider !== 'none' && isProd
    // 用 crypto.randomInt 替代 Math.random，避免可预测的伪随机序列被穷举
    const code = String(randomInt(100000, 1000000))

    // 60 秒频控：同一手机号 60 秒内只允许发一次
    const recent = await this.prisma.smsCode.findFirst({
      where: { phone: dto.phone, createdAt: { gt: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      throw new BizException(BizCode.BUSINESS_ERROR, '请勿频繁请求，60 秒后再试')
    }

    const row = await this.prisma.smsCode.create({
      data: {
        phone: dto.phone,
        code,
        scene: dto.scene || 'login',
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    })

    if (useRealSms) {
      // 火并忘：立刻返回，国阳云调用走后台
      // 这样客户端等待时间从 ~700ms 降到 ~30ms（只剩 DB 写 + 网络往返）
      this.sms
        .sendVerifyCode(dto.phone, code, (dto.scene || 'login') as any)
        .then((res) => {
          if (!res.ok) {
            // 失败：删掉这条 SmsCode（避免用户拿到没真正发出去的验证码后困惑）
            // 同时这意味着 phoneLogin 校验会拒绝该 code，让用户重发
            this.prisma.smsCode.delete({ where: { id: row.id } }).catch(() => {})
          }
        })
        .catch(() => {
          this.prisma.smsCode.delete({ where: { id: row.id } }).catch(() => {})
        })
    }
    return { ok: true }
  }

  /** 后台账号密码登录（admin-pc / platform-app / merchant-app 共用） */
  async adminLogin(dto: AdminLoginDto) {
    const username = dto.username || dto.userName
    if (!username) throw new BizException(BizCode.INVALID_PARAMS, '账号不能为空')

    // 支持 3 种"账号"输入：username / email / phone（手机号）
    // 商家入驻流程的用户最初只有手机号 + 首次设的密码 → 必须允许 phone 作为登录账号
    const u = String(username).trim()
    const looksLikePhone = /^1[3-9]\d{9}$/.test(u)
    const user = await this.prisma.user.findFirst({
      where: looksLikePhone
        ? { OR: [{ username: u }, { email: u }, { phone: u }] }
        : { OR: [{ username: u }, { email: u }] },
      include: { adminRole: true },
    })
    if (!user || !user.passwordHash) {
      throw new BizException(BizCode.INVALID_PARAMS, '账号或密码错误')
    }
    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '账号或密码错误')
    if (user.status === 'disabled') throw new BizException(BizCode.FORBIDDEN, '账号已禁用')

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const tokens = await this.signTokens({
      sub: user.id,
      role: user.role,
      merchantId: user.merchantId || undefined,
    })
    return {
      user: this.toUser(user),
      ...tokens,
      // admin-pc 期望平铺
      token: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    }
  }

  /**
   * 刷新 Token —— 带 rotation 防重放
   *
   * 错误语义精确化（P3-38）：
   *   - 真正过期（jsonwebtoken 抛 TokenExpiredError）→ TOKEN_EXPIRED 2002
   *     前端拦截器据此清 token 并跳转登录页
   *   - 签名无效 / 结构错误 / payload 缺 `_r:1`（access token 传错位置 / 伪造 token）
   *     → UNAUTHORIZED 2001 + 'invalid refresh token'
   *     与"过期"区分，避免误导排查（之前所有错误都映射 TOKEN_EXPIRED）
   *   - 已被 rotation 吊销 → UNAUTHORIZED + 'refresh token revoked'
   *   - 其他未知异常一律按 UNAUTHORIZED 处理，绝不把内部错误明文回前端
   *
   * Rotation 流程：
   *   1. verifyAsync 通过 + payload._r === 1 → 拿到旧 jti
   *   2. isRevoked(jti) → 若已吊销，拒绝（防泄露后重放）
   *   3. 重新 signTokens 得到全新 access + refresh（新 jti）
   *   4. 把旧 jti 加入黑名单，TTL = 旧 refresh token 剩余有效期
   *      —— 攻击者拿到旧 refresh token 后续刷新会被 step 2 拦截
   */
  async refresh(dto: RefreshDto) {
    let payload: any
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken)
    } catch (e: any) {
      if (e?.name === 'TokenExpiredError') {
        throw new BizException(BizCode.TOKEN_EXPIRED, 'refreshToken 已过期')
      }
      throw new BizException(BizCode.UNAUTHORIZED, 'invalid refresh token')
    }
    if (!payload?._r) {
      throw new BizException(BizCode.UNAUTHORIZED, 'invalid refresh token')
    }

    const oldJti: string | undefined = payload.jti
    if (oldJti && this.refreshBlacklist.isRevoked(oldJti)) {
      // 已被 rotation 吊销过的 refresh token 再次出现 = 强烈的重放/泄露信号
      throw new BizException(BizCode.UNAUTHORIZED, 'refresh token revoked')
    }

    const tokens = await this.signTokens({
      sub: payload.sub,
      role: payload.role,
      merchantId: payload.merchantId,
    })

    // 吊销旧 jti：TTL = 旧 refresh token 剩余有效期（payload.exp 是 unix 秒）
    // 兼容旧客户端：老 refresh token 不带 jti，跳过吊销但仍返回新 token（平滑升级）
    if (oldJti && typeof payload.exp === 'number') {
      const remainSec = Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
      this.refreshBlacklist.revoke(oldJti, remainSec)
    }

    return tokens
  }

  /** 当前用户信息 */
  async userInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { adminRole: true },
    })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    return this.toUser(user)
  }

  /**
   * 注销登录 —— 真吊销
   *
   * 安全设计要点：
   *   - 如果带 refreshToken：verify 拿 jti，加入 refresh-token-blacklist；
   *     即便攻击者拿到这个 refresh token 也无法换新 access token。
   *   - 即使 verify 失败（已过期 / 篡改）也吞掉异常，按"已失效"返回 ok=true，
   *     不向客户端泄露"token 是什么状态"的副信息，并避免给攻击者扫探的接口。
   *   - 同步清除 JwtGuard 的 user 缓存：让管理员"禁用 + 用户主动 logout"双重保险时，
   *     该账号即使持仍未过期的 access token 也会下次请求即重查 DB，被禁用立即失效。
   *
   * 局限性：access token 本身（JWT 无状态）无法在过期前强制作废，因此客户端必须
   * 在收到 ok=true 后立刻删除本地存的 access/refresh token；前端拦截器也已做这步。
   * 若严格要求"access token 也能即时吊销"，需要切到 token-introspection / Redis 黑名单。
   */
  async logout(refreshToken?: string, callerSub?: string): Promise<{ ok: true }> {
    if (refreshToken) {
      try {
        const payload: any = await this.jwt.verifyAsync(refreshToken)
        const jti: string | undefined = payload?.jti
        if (jti && typeof payload?.exp === 'number') {
          const remainSec = Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
          this.refreshBlacklist.revoke(jti, remainSec)
        }
        if (!callerSub && payload?.sub) callerSub = payload.sub
      } catch (e: any) {
        // 过期 / 篡改 / 结构错 → 一律按已失效处理。不抛错保证幂等。
        this.logger.debug(
          `[auth.logout] refresh token verify failed (treated as already invalid): ${e?.message || e}`,
        )
      }
    }
    if (callerSub) {
      try {
        _clearJwtUserCache(callerSub)
      } catch {
        // 缓存清理失败不影响登出语义；最坏只是 60s 内仍有缓存命中
      }
    }
    return { ok: true }
  }

  /**
   * 修改密码（任意已登录账号都可调）
   *
   * 规则：
   *   - 必须验旧密码（argon2 verify），防止 token 被劫持后无感改密
   *   - 新密码长度 ≥ 6（与 admin-login 校验一致）
   *   - 改完立刻清 JwtGuard 用户缓存，让该用户在所有设备上下次请求重查 DB
   *   - 不签发新 token；客户端如想"踢掉其它设备"应自行重新登录
   */
  async changePassword(userId: string, dto: { oldPassword: string; newPassword: string }) {
    const oldPwd = String(dto?.oldPassword || '')
    const newPwd = String(dto?.newPassword || '')
    if (!newPwd) {
      throw new BizException(BizCode.INVALID_PARAMS, '请填写新密码')
    }
    if (newPwd.length < 6) {
      throw new BizException(BizCode.INVALID_PARAMS, '新密码至少 6 位')
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '用户不存在')
    // 首次设密码场景允许 oldPassword 为空；非首次必须填且与新密码不一致
    if (user.passwordHash) {
      if (!oldPwd) {
        throw new BizException(BizCode.INVALID_PARAMS, '请填写旧密码')
      }
      if (oldPwd === newPwd) {
        throw new BizException(BizCode.INVALID_PARAMS, '新密码不能与旧密码相同')
      }
    }

    // 未设置过密码（如纯微信登录的客户）→ 允许直接设置首次密码；otherwise 必须验旧
    const isFirstSet = !user.passwordHash
    if (user.passwordHash) {
      const ok = await argon2.verify(user.passwordHash, oldPwd)
      if (!ok) throw new BizException(BizCode.INVALID_PARAMS, '旧密码不正确')
    }

    const newHash = await argon2.hash(newPwd)
    // 首次设密码 + 无 username 的账号（手机号注册的商家）→ 同步把 username 设为手机号，
    // 这样他们之后能用「手机号 + 密码」登录管理后台 admin-pc（admin-login 三段 OR 查询）。
    // 已有 username 的不动；用户名冲突时不强行覆盖（罕见，用户不抱怨即可）。
    const patch: any = { passwordHash: newHash }
    if (isFirstSet && !user.username && user.phone) {
      const dup = await this.prisma.user.findFirst({
        where: { username: user.phone, id: { not: userId } },
        select: { id: true },
      })
      if (!dup) patch.username = user.phone
    }
    await this.prisma.user.update({ where: { id: userId }, data: patch })
    try { _clearJwtUserCache(userId) } catch { /* ignore */ }
    return { ok: true }
  }

  /**
   * 修改手机号（先验旧手机号 SMS 码 + 验新手机号 SMS 码 二次确认）
   *
   * 安全考量：
   *   - 只有当前账号已绑定手机号时，需要"旧手机号 + 新手机号"双码（防丢号被改）
   *   - 当前账号没有手机号（如纯微信登录的客户首次绑定），仅需新手机号 SMS 码
   *   - 新手机号不能被其他账号占用（同 user-mp bindPhone 的唯一性检查）
   *   - 改完清 JwtGuard 缓存
   */
  async changePhone(
    userId: string,
    dto: { oldSmsCode?: string; newPhone: string; newSmsCode: string },
  ) {
    const newPhone = String(dto?.newPhone || '').trim()
    const newCode = String(dto?.newSmsCode || '').trim()
    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      throw new BizException(BizCode.INVALID_PARAMS, '新手机号格式不正确')
    }
    if (!/^\d{4,6}$/.test(newCode)) {
      throw new BizException(BizCode.INVALID_PARAMS, '新手机号验证码格式不正确')
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BizException(BizCode.NOT_FOUND, '用户不存在')

    // 新手机号唯一性
    const occupied = await this.prisma.user.findUnique({ where: { phone: newPhone } })
    if (occupied && occupied.id !== userId) {
      throw new BizException(BizCode.BUSINESS_ERROR, '该手机号已被其他账号绑定')
    }
    if (user.phone === newPhone) {
      throw new BizException(BizCode.INVALID_PARAMS, '新手机号与当前相同')
    }

    // 旧手机号验证码：仅当账号已绑定旧手机号时要求
    if (user.phone) {
      const oldCode = String(dto?.oldSmsCode || '').trim()
      if (!/^\d{4,6}$/.test(oldCode)) {
        throw new BizException(BizCode.INVALID_PARAMS, '请输入原手机号收到的验证码')
      }
      const oldRec = await this.prisma.smsCode.findFirst({
        where: { phone: user.phone, code: oldCode, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
      if (!oldRec) throw new BizException(BizCode.INVALID_PARAMS, '原手机号验证码错误或已过期')
      await this.prisma.smsCode.update({ where: { id: oldRec.id }, data: { used: true } })
    }

    // 新手机号验证码
    const newRec = await this.prisma.smsCode.findFirst({
      where: { phone: newPhone, code: newCode, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!newRec) throw new BizException(BizCode.INVALID_PARAMS, '新手机号验证码错误或已过期')
    await this.prisma.smsCode.update({ where: { id: newRec.id }, data: { used: true } })

    await this.prisma.user.update({ where: { id: userId }, data: { phone: newPhone } })
    try { _clearJwtUserCache(userId) } catch { /* ignore */ }
    return { ok: true, phone: newPhone }
  }
}
