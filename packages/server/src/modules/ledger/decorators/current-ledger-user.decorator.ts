import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { MembershipStatus } from '../ledger.constants'

/** LedgerJwtGuard 注入到 req.ledgerUser 的当前记账账号。 */
export interface LedgerAuthUser {
  id: string
  phone: string
  nickname: string
  avatar: string | null
  membership: MembershipStatus
}

export const CurrentLedgerUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): LedgerAuthUser | undefined => {
    return ctx.switchToHttp().getRequest().ledgerUser
  },
)
