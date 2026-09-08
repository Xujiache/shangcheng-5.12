import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface AuthUser {
  sub: string
  role: string
  merchantId?: string
  permissions?: string[]
  /** 当前登录的认证方式；旧 token 不含此字段，需继续兼容。 */
  amr?: 'sms' | 'password'
  /** 完成短信认证的 Unix 秒时间戳，不随 refresh token 换发而刷新。 */
  amrAt?: number
  iat?: number
}

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)
