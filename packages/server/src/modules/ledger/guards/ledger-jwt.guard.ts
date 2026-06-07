import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { BizCode, BizException } from '../../../common/exceptions/biz.exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { deriveMembership } from '../ledger.constants'

/**
 * 记账小程序 App 鉴权守卫。
 *
 * 与商城全局 JwtAuthGuard 隔离：
 *   - ledger App 控制器整体 @Public() 跳过全局守卫，再挂本守卫。
 *   - 只接受 scope==='ledger' 的 token（sub = LedgerUser.id）；
 *     商城 token（无 scope / scope!=ledger）一律拒绝，杜绝跨域越权。
 *   - 反向保险：商城全局守卫用 sub 查 User 表，ledger 的 sub 不在 User 表 → 自然被拒。
 *   - 每次请求查最新 LedgerUser 状态 + 会员，禁用/过期即时生效。
 */
@Injectable()
export class LedgerJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
    if (!token) throw new BizException(BizCode.UNAUTHORIZED, '未登录')

    let payload: any
    try {
      payload = await this.jwt.verifyAsync(token)
    } catch (e: any) {
      if (e?.name === 'TokenExpiredError') {
        throw new BizException(BizCode.TOKEN_EXPIRED, '登录已过期，请重新登录')
      }
      throw new BizException(BizCode.UNAUTHORIZED, '无效 Token')
    }

    if (payload?._r) throw new BizException(BizCode.UNAUTHORIZED, 'refresh token 不能用于业务接口')
    if (payload?.scope !== 'ledger' || !payload?.sub) {
      throw new BizException(BizCode.UNAUTHORIZED, '无效 Token')
    }

    const user = await this.prisma.ledgerUser.findUnique({
      where: { id: payload.sub },
      include: { membership: true },
    })
    if (!user) throw new BizException(BizCode.UNAUTHORIZED, '账号不存在或已注销')
    if (user.status === 'disabled') throw new BizException(BizCode.FORBIDDEN, '账号已被禁用')
    ;(req as any).ledgerUser = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      membership: deriveMembership(
        user.membership?.expiresAt ?? null,
        user.membership?.lastPlanKey,
      ),
    }
    return true
  }
}
