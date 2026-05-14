import { Injectable, Logger } from '@nestjs/common'

/**
 * Refresh Token 黑名单（按 jti 标记吊销）。
 *
 * 用途：实现 refresh token rotation —— 每次成功 refresh 都把旧 jti 列入黑名单，
 * 旧 refresh token 即便落入攻击者手里也立刻失效。
 *
 * 当前实现：进程内 Map + TTL，零外部依赖。
 *   - 适合单实例部署或同实例 sticky 路由场景
 *   - 多实例水平扩展会出现"实例 A 已吊销，实例 B 仍能 refresh"的窗口
 *
 * 生产建议：迁到 Redis（SET <jti> revoked EX <ttl>），即可在任意实例数下保证一致性。
 *
 * 内置兜底：
 *   - 每分钟扫一次清掉过期条目（避免 Map 无限增长）
 *   - 大小硬上限 10w，超出时一次性清空（不应触达；防极端 DoS 场景的 OOM）
 */
@Injectable()
export class RefreshTokenBlacklistService {
  private readonly logger = new Logger(RefreshTokenBlacklistService.name)
  private readonly store = new Map<string, number>() // jti -> expireAt(ms)
  private readonly MAX_ENTRIES = 100_000
  private sweepTimer: NodeJS.Timeout | null = null

  constructor() {
    // 启动后台清理；用 unref 避免阻塞进程退出
    this.sweepTimer = setInterval(() => this.sweep(), 60_000)
    if (this.sweepTimer && typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref()
    }
  }

  /**
   * 吊销指定 jti。ttlSeconds 应等于"该 refresh token 距离过期还有多少秒"，
   * 这样黑名单条目过期时该 token 也已天然失效，可以安全清掉。
   */
  revoke(jti: string, ttlSeconds: number): void {
    if (!jti) return
    const ttlMs = Math.max(1, Math.floor(ttlSeconds)) * 1000
    if (this.store.size >= this.MAX_ENTRIES) {
      this.logger.warn(
        `[refresh-blacklist] 触达 MAX_ENTRIES=${this.MAX_ENTRIES}，全量清空以避免 OOM；这不应该发生`,
      )
      this.store.clear()
    }
    this.store.set(jti, Date.now() + ttlMs)
  }

  isRevoked(jti: string): boolean {
    if (!jti) return false
    const expireAt = this.store.get(jti)
    if (!expireAt) return false
    if (expireAt < Date.now()) {
      this.store.delete(jti)
      return false
    }
    return true
  }

  /** 测试 / 紧急运维入口；生产不建议直接调 */
  _clear(): void {
    this.store.clear()
  }

  private sweep(): void {
    const now = Date.now()
    let removed = 0
    for (const [jti, expireAt] of this.store.entries()) {
      if (expireAt < now) {
        this.store.delete(jti)
        removed++
      }
    }
    if (removed > 0) {
      this.logger.debug(
        `[refresh-blacklist] swept ${removed} expired entries, remain=${this.store.size}`,
      )
    }
  }
}
