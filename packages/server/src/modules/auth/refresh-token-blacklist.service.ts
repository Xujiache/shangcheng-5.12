import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common'
import Redis from 'ioredis'

/** Shared refresh receipts. Production requires Redis; failures reject writes and lookups.
 * Development/test may use bounded process-local receipts. Live receipts are never cleared on overflow.
 */
@Injectable()
export class RefreshTokenBlacklistService implements OnModuleDestroy {
  private readonly logger = new Logger(RefreshTokenBlacklistService.name)
  private readonly store = new Map<string, number>() // jti -> expireAt(ms)
  private readonly MAX_ENTRIES = 100_000
  private sweepTimer: NodeJS.Timeout | null = null

  /** Redis key 前缀：rtbl = refresh-token-blacklist */
  private static readonly KEY_PREFIX = 'rtbl:'
  /** 构造时快照 REDIS_URL；未设置 → 纯内存模式（与旧版行为完全一致） */
  private readonly redisUrl: string | undefined = process.env.REDIS_URL
  /** 懒创建的 ioredis 客户端（首次使用时才建连） */
  private redis: Redis | null = null
  /** 进行中的 connect()，避免并发重复建连（ioredis 重复 connect 会抛错） */
  private connecting: Promise<unknown> | null = null
  /** Redis 错误日志限流：每分钟最多 warn 一次 */
  private lastRedisWarnAt = 0

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
   *
   * 两种模式都先写 L1（内存 Map），配置了 Redis 时再写穿到 Redis；
   * Redis 写失败必须向调用方返回暂不可用，不能报告吊销成功。
   */
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return
    const ttlSec = Math.max(1, Math.floor(ttlSeconds))

    if (!this.redisUrl) {
      this.requireLocalFallback()
      this.remember(jti, ttlSec)
      return
    }
    try {
      const client = await this.getRedis()
      await client.set(RefreshTokenBlacklistService.KEY_PREFIX + jti, '1', 'EX', ttlSec)
      this.remember(jti, ttlSec)
    } catch (e) {
      this.warnRedisError('revoke', e)
      throw new ServiceUnavailableException('登录状态暂不可用，请稍后重试')
    }
  }

  /**
   * 是否已吊销。先查 L1（快路径 + Redis 故障兜底），未命中且配置了 Redis 再查 L2。
   * Redis 查询出错会拒绝请求，不把未知状态当作未吊销。
   */
  async isRevoked(jti: string): Promise<boolean> {
    if (!jti) return false

    // L1 快路径（含懒过期清理）
    const expireAt = this.store.get(jti)
    if (expireAt !== undefined) {
      if (expireAt >= Date.now()) return true
      this.store.delete(jti)
    }

    // L2：跨实例可见性
    if (!this.redisUrl) {
      this.requireLocalFallback()
      return false
    }
    try {
      const client = await this.getRedis()
      const exists = await client.exists(RefreshTokenBlacklistService.KEY_PREFIX + jti)
      return exists > 0
    } catch (e) {
      this.warnRedisError('isRevoked', e)
      throw new ServiceUnavailableException('登录状态暂不可用，请稍后重试')
    }
  }

  /** 模块销毁时关闭 Redis 连接（避免测试 / 优雅退出时悬挂句柄） */
  async onModuleDestroy(): Promise<void> {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = null
    }
    const client = this.redis
    this.redis = null
    this.connecting = null
    if (!client) return
    try {
      // 从未建连（wait）或已断开（end）时 quit 会失败/触发建连，直接断开即可
      if (client.status === 'wait' || client.status === 'end') {
        client.disconnect()
      } else {
        await client.quit()
      }
    } catch {
      client.disconnect()
    }
  }

  /** 测试 / 紧急运维入口；只清 L1，生产不建议直接调 */
  _clear(): void {
    this.store.clear()
  }

  /** Atomic check-and-consume; never issue two refresh results for one receipt. */
  async consume(jti: string, ttlSeconds: number): Promise<boolean> {
    if (!jti || !Number.isFinite(ttlSeconds))
      throw new ServiceUnavailableException('登录状态校验失败')
    const ttl = Math.max(1, Math.floor(ttlSeconds))
    if ((this.store.get(jti) ?? 0) > Date.now()) return false
    if (!this.redisUrl) {
      this.requireLocalFallback()
      // Deliberately no await between the local check and mutation.
      this.remember(jti, ttl)
      return true
    }
    try {
      const client = await this.getRedis()
      const result = await client.set(
        RefreshTokenBlacklistService.KEY_PREFIX + jti,
        '1',
        'EX',
        ttl,
        'NX',
      )
      if (result !== 'OK') return false
      this.remember(jti, ttl)
      return true
    } catch (error) {
      this.warnRedisError('consume', error)
      throw new ServiceUnavailableException('登录状态暂不可用，请稍后重试')
    }
  }

  private requireLocalFallback(): void {
    if (process.env.NODE_ENV === 'production')
      throw new ServiceUnavailableException('登录状态暂不可用，请稍后重试')
  }

  private remember(jti: string, ttl: number): void {
    if (!this.store.has(jti) && this.store.size >= this.MAX_ENTRIES) {
      this.sweep()
      if (this.store.size >= this.MAX_ENTRIES) {
        if (!this.redisUrl) throw new ServiceUnavailableException('登录状态暂不可用，请稍后重试')
        // Shared Redis still holds the receipt; evict only one local cache entry.
        this.store.delete(this.store.keys().next().value as string)
      }
    }
    this.store.set(jti, Date.now() + ttl * 1000)
  }

  /**
   * 懒创建并确保 Redis 连接就绪。
   * lazyConnect + enableOfflineQueue:false：未就绪时命令立即失败（由调用方降级），
   * 不堆积队列；命令超时限制为 2 秒，不进行无限重试。
   */
  private async getRedis(): Promise<Redis> {
    if (!this.redis) {
      this.redis = new Redis(this.redisUrl as string, {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        commandTimeout: 2000,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        connectTimeout: 2_000, // 建连兜底超时，避免首次使用时长时间阻塞登录/刷新链路
      })
      // 必须挂 error 监听，否则 ioredis 的 'error' 事件会变成 unhandled 抛崩进程；
      // 真正的错误处理在每次调用的 try/catch 里完成。
      this.redis.on('error', () => undefined)
    }
    if (this.redis.status !== 'ready') {
      if (!this.connecting) {
        const flight = this.redis.connect()
        this.connecting = flight
        const clear = () => {
          if (this.connecting === flight) this.connecting = null
        }
        void flight.then(clear, clear)
      }
      await this.connecting
    }
    return this.redis
  }

  /** Redis 错误日志限流：每分钟最多一条 warn（故障期间每次调用都会出错） */
  private warnRedisError(op: string, e: unknown): void {
    const now = Date.now()
    if (now - this.lastRedisWarnAt < 60_000) return
    this.lastRedisWarnAt = now
    this.logger.warn(`[refresh-blacklist] Redis ${op} unavailable; request rejected`)
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
