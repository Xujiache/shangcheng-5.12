import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface AuthUser {
  sub: string
  role: string
  merchantId?: string
  permissions?: string[]
}

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)
