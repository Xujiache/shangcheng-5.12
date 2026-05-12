import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BizCode, BizException } from '../exceptions/biz.exception'
import { ROLES_KEY } from '../decorators/roles.decorator'

const SUPER = 'super-admin'

/** 角色别名（factory/store → merchant；admin → platform） */
function expandRole(role: string): string[] {
  const out = [role]
  if (role === 'factory' || role === 'store') out.push('merchant')
  if (role === 'admin') out.push('platform')
  if (role === SUPER) out.push('merchant', 'platform', 'admin', 'factory', 'store')
  return out
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const req = context.switchToHttp().getRequest()
    const user = req.user
    if (!user) throw new BizException(BizCode.UNAUTHORIZED, '未登录')

    const owned = expandRole(user.role)
    const ok = required.some((r) => owned.includes(r))
    if (!ok) throw new BizException(BizCode.FORBIDDEN, '权限不足')
    return true
  }
}
