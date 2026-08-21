import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Request } from 'express'
import { BizCode, BizException } from '../../../common/exceptions/biz.exception'

/**
 * 会员闸门守卫（仅业务接口用，me/membership/profile 不挂）。
 *
 * 依赖 LedgerJwtGuard 已注入 req.ledgerUser；未开通/过期 → 写操作抛 MEMBER_EXPIRED(6001)，
 * HTTP 200（biz.exception 映射），App 据此 code 进入「开通会员」闸门页，而非按 401 跳登录。
 *
 * 到期后的数据为只读：历史订单和经营统计必须仍可查询，否则报表页会把会员到期
 * 误展示为“加载失败”。
 */
@Injectable()
export class LedgerMembershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    const m = (req as any).ledgerUser?.membership

    // 会员到期后保留历史订单、经营统计的只读能力；新增、修改、删除仍继续走会员闸门。
    const path = String(req.originalUrl || '')
      .split('?')[0]
      .replace(/^\/api\/v1/, '')
    const isReadonlyOrder = /^\/l\/orders(?:\/[^/]+)?\/?$/.test(path)
    const isReadonlyStats = /^\/l\/stats\/(?:overview|monthly|series)\/?$/.test(path)
    if (req.method === 'GET' && (isReadonlyOrder || isReadonlyStats)) {
      return true
    }

    if (!m?.active) {
      throw new BizException(
        BizCode.MEMBER_EXPIRED,
        m?.expired ? '会员已过期，请联系管理员续费' : '尚未开通会员，请联系管理员开通',
      )
    }
    return true
  }
}
