import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { BizCode, BizException } from '../exceptions/biz.exception'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const req = context.switchToHttp().getRequest<Request>()
    const auth = req.headers.authorization || ''
    // 兼容 'Bearer xxx' 与 admin-pc 直接 'xxx'
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
    if (!token) throw new BizException(BizCode.UNAUTHORIZED, '未登录')

    try {
      // 不再传 secret，让 JwtService 使用注册时通过 resolveJwtSecret 解析出来的密钥
      // 这样生产环境一定使用真实 JWT_SECRET，不会回退到占位字符串
      const payload = await this.jwt.verifyAsync(token)
      ;(req as any).user = payload
      return true
    } catch (e: any) {
      if (e?.name === 'TokenExpiredError') {
        throw new BizException(BizCode.TOKEN_EXPIRED, 'Token 已过期')
      }
      throw new BizException(BizCode.UNAUTHORIZED, '无效 Token')
    }
  }
}
