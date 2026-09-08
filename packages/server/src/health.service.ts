import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'
import { PrismaService } from './prisma/prisma.service'

@Injectable()
export class HealthService implements OnModuleDestroy {
  private redis: Redis | undefined
  private pending: Promise<boolean> | undefined

  constructor(private readonly prisma: PrismaService) {}

  /** Coalesce probes so a stalled dependency cannot exhaust the connection pool. */
  async ready(): Promise<boolean> {
    if (!this.pending) {
      const probe = this.probe().catch(() => false)
      this.pending = probe
      void probe.finally(() => {
        if (this.pending === probe) this.pending = undefined
      })
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        this.pending,
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(false), 2500)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  private async probe(): Promise<boolean> {
    await this.prisma.$queryRaw`SELECT 1`
    if (!process.env.REDIS_URL) return process.env.NODE_ENV !== 'production'
    if (!this.redis) {
      this.redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 2000,
        commandTimeout: 2000,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      })
      // The endpoint returns only availability, never connection details.
      this.redis.on('error', () => undefined)
    }
    if (this.redis.status !== 'ready') await this.redis.connect()
    return (await this.redis.ping()) === 'PONG'
  }

  onModuleDestroy(): void {
    this.redis?.disconnect()
  }
}
