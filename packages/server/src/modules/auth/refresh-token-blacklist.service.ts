import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

/**
 * Refresh Token 黑名单（按 jti 标记吊销）。
 *
 * 用途：实现 refresh token rotation —— 每次成功 refresh 都把旧 jti 列入黑名单，
 * 旧 refresh token 即便落入攻击者手里也立刻失效。
 *
 * 存储策略（双层）：
 *   - L1：进程内 Map + TTL（永远写入）。单实例部署 / Redis 故障期间行为与纯内存版完全一致。
 *   - L2：当设置了 REDIS_URL 时，写穿到 Redis（SET rtbl:<jti> 1 EX <ttl>），
 *     读取时先查 L1（快路径），未命中再查 Redis（EXISTS rtbl:<jti>）。
 *     这保证了多实例水平扩展下"实例 A 吊销，实例 B 立即可见"的一致性。
 *
 * Redis 故障语义 —— fail-open（查询出错按"未吊销"处理）：
 *   这与今天纯内存实现"进程重启即丢失整张 Map"的安全姿态一致 —— 黑名单是
 *   尽力而为的重放防御层，不是唯一防线（refresh token 本身仍有签名 + 过期校验）。
 *   且 L1 仍然保护本实例：本实例吊销过的 jti 在 Redis 故障期间照样被拦截。
 *   错误日志每分钟最多 warn 一次，避免 Redis 故障时刷爆日志。
 *
 * 内置兜底（L1）：
 *   - 每分钟扫一次清掉过期条目（避免 Map 无限增长）
 *   - 大小硬上限 10w，超出时一次性清空（不应触达；防极端 DoS 场景的 OOM）
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
   * Redis 写失败只降级（L1 已生效，本实例语义不变），不向调用方抛错。
   */
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return
    const ttlSec = Math.max(1, Math.floor(ttlSeconds))

    // L1：永远写内存（Redis 故障期间单实例行为与纯内存版一致）
    if (this.store.size >= this.MAX_ENTRIES) {
      this.logger.warn(
        `[refresh-blacklist] 触达 MAX_ENTRIES=${this.MAX_ENTRIES}，全量清空以避免 OOM；这不应该发生`,
      )
      this.store.clear()
    }
    this.store.set(jti, Date.now() + ttlSec * 1000)

    // L2：写穿 Redis（仅当配置了 REDIS_URL）
    if (!this.redisUrl) return
    try {
      const client = await this.getRedis()
      await client.set(RefreshTokenBlacklistService.KEY_PREFIX + jti, '1', 'EX', ttlSec)
    } catch (e) {
      this.warnRedisError('revoke', e)
    }
  }

  /**
   * 是否已吊销。先查 L1（快路径 + Redis 故障兜底），未命中且配置了 Redis 再查 L2。
   * Redis 查询出错 → fail-open（按未吊销处理），理由见类注释。
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
    if (!this.redisUrl) return false
    try {
      const client = await this.getRedis()
      const exists = await client.exists(RefreshTokenBlacklistService.KEY_PREFIX + jti)
      return exists > 0
    } catch (e) {
      this.warnRedisError('isRevoked', e)
      return false // fail-open：与"进程重启丢 Map"同等安全姿态；L1 仍保护本实例
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

  /**
   * 懒创建并确保 Redis 连接就绪。
   * lazyConnect + enableOfflineQueue:false：未就绪时命令立即失败（由调用方降级），
   * 不堆积队列；maxRetriesPerRequest:1 让单条命令失败快速浮出。
   */
  private async getRedis(): Promise<Redis> {
    if (!this.redis) {
      this.redis = new Redis(this.redisUrl as string, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2_000, // 建连兜底超时，避免首次使用时长时间阻塞登录/刷新链路
      })
      // 必须挂 error 监听，否则 ioredis 的 'error' 事件会变成 unhandled 抛崩进程；
      // 真正的错误处理在每次调用的 try/catch 里完成。
      this.redis.on('error', () => undefined)
    }
    if (this.redis.status !== 'ready') {
      if (!this.connecting) {
        this.connecting = this.redis.connect().catch((e) => {
          this.connecting = null // 失败后允许下次调用重试建连
          throw e
        })
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
    const msg = e instanceof Error ? e.message : String(e)
    this.logger.warn(`[refresh-blacklist] Redis ${op} 失败，已降级为进程内黑名单：${msg}`)
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
