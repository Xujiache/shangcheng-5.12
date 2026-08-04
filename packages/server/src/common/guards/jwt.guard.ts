import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { BizCode, BizException } from '../exceptions/biz.exception'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * 进程内 LRU 缓存条目：
 *   data       —— DB 查到的最新 user 摘要 (id/status/role/merchantId)
 *   expireAt   —— 失效绝对时间戳（毫秒）
 *
 * 为什么用进程内缓存而不是 Redis：
 *   - 单体部署下足够（每个 nest worker 各持一份，TTL 60s 内最坏只多查一次）
 *   - 即便多实例：每个实例独立的 60s 窗口，"禁用用户即刻失效"最坏延迟 = TTL
 *   - 完全避免外部依赖；若未来真要严格秒级吊销，可平滑切到 Redis pub/sub
 *
 * TTL=60s 平衡：
 *   - 太短 → 每秒大量重复查 User 表
 *   - 太长 → 被禁用账号窗口过大；超过 1 分钟管理员体验差
 */
type UserCacheRow = {
  data: { id: string; status: string; role: string; merchantId: string | null }
  expireAt: number
}

const USER_CACHE_TTL_MS = 60 * 1000
const USER_CACHE_MAX = 5000
const userCache = new Map<string, UserCacheRow>()

function getCachedUser(sub: string): UserCacheRow['data'] | null {
  const row = userCache.get(sub)
  if (!row) return null
  if (row.expireAt < Date.now()) {
    userCache.delete(sub)
    return null
  }
  return row.data
}

function setCachedUser(sub: string, data: UserCacheRow['data']) {
  // 简易 LRU 上限：超过 MAX 时清掉一半最老的（Map 迭代顺序即插入顺序）
  if (userCache.size >= USER_CACHE_MAX) {
    const half = Math.floor(USER_CACHE_MAX / 2)
    let i = 0
    for (const k of userCache.keys()) {
      userCache.delete(k)
      if (++i >= half) break
    }
  }
  userCache.set(sub, { data, expireAt: Date.now() + USER_CACHE_TTL_MS })
}

/** 测试或紧急情况下可手动清理缓存 */
export function _clearJwtUserCache(sub?: string) {
  if (sub) userCache.delete(sub)
  else userCache.clear()
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
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

    let payload: any
    try {
      // 不再传 secret，让 JwtService 使用注册时通过 resolveJwtSecret 解析出来的密钥
      // 这样生产环境一定使用真实 JWT_SECRET，不会回退到占位字符串
      payload = await this.jwt.verifyAsync(token)
    } catch (e: any) {
      if (e?.name === 'TokenExpiredError') {
        throw new BizException(BizCode.TOKEN_EXPIRED, 'Token 已过期')
      }
      throw new BizException(BizCode.UNAUTHORIZED, '无效 Token')
    }

    const sub: string | undefined = payload?.sub
    if (!sub) throw new BizException(BizCode.UNAUTHORIZED, '无效 Token')
    // refresh token（签发时打了 _r 标记）只能用于 /auth/refresh 换取 access token，
    // 绝不允许直接当 access token 访问业务接口（否则可访问窗口被放大到 refresh 的 7 天 TTL）。
    if (payload?._r) throw new BizException(BizCode.UNAUTHORIZED, 'refresh token 不能用于业务接口')

    // 查最新 user 状态：禁用账号、角色变更必须在 access token 期内即时生效，
    // 否则攻击者持已签发 token 可继续访问 → P1 安全风险
    let fresh = getCachedUser(sub)
    if (!fresh) {
      const u = await this.prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, status: true, role: true, merchantId: true },
      })
      if (!u) {
        // 用户已被物理删除：与 disabled 同等待遇，立即吊销
        throw new BizException(BizCode.UNAUTHORIZED, '账号不存在或已注销')
      }
      fresh = { id: u.id, status: u.status, role: u.role, merchantId: u.merchantId }
      setCachedUser(sub, fresh)
    }

    if (fresh.status === 'disabled') {
      throw new BizException(BizCode.FORBIDDEN, '账号已被禁用')
    }

    // 把最新 role/merchantId 覆盖到 req.user，确保下游 @CurrentUser 拿到的是 DB 当前值，
    // 让被降级的用户立刻失去新权限，被晋升的用户也无需重新登录
    ;(req as any).user = {
      ...payload,
      sub: fresh.id,
      role: fresh.role,
      merchantId: fresh.merchantId || payload.merchantId,
    }
    return true
  }
}
