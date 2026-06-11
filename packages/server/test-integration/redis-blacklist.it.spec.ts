// ----------------------------------------------------------------------------
// Refresh Token 黑名单 Redis 集成测试
//
// 验证 RefreshTokenBlacklistService 在配置 REDIS_URL 时的真实 Redis 行为：
//   1. revoke → isRevoked=true（写穿 Redis）
//   2. TTL 1s → ~1.2s 后 isRevoked=false（真实 Redis EX 过期，非内存懒过期兜底）
//   3. 多实例一致性：实例 A revoke，实例 B（全新对象 = 模拟另一台机器）能看到
//      —— 这正是从进程内 Map 迁到 Redis 要换取的核心保证
//
// 运行前置：设置 REDIS_URL 指向一次性本地 Redis，例如 redis://localhost:6390。
// 未设置 REDIS_URL 时整个套件跳过（不影响纯数据库类集成测试的执行）。
// ----------------------------------------------------------------------------
import { RefreshTokenBlacklistService } from '../src/modules/auth/refresh-token-blacklist.service'

const maybe = process.env.REDIS_URL ? describe : describe.skip

maybe('RefreshTokenBlacklistService × Redis 集成', () => {
  let serviceA: RefreshTokenBlacklistService
  let serviceB: RefreshTokenBlacklistService

  beforeEach(() => {
    // 两个独立实例：各自持有独立的内存 L1 和 Redis 连接，等价于两台后端机器
    serviceA = new RefreshTokenBlacklistService()
    serviceB = new RefreshTokenBlacklistService()
  })

  afterEach(async () => {
    await serviceA.onModuleDestroy()
    await serviceB.onModuleDestroy()
  })

  it('revoke 后 isRevoked 返回 true（写穿 Redis）', async () => {
    const jti = `it-rtbl-basic-${Date.now()}`
    await serviceA.revoke(jti, 60)
    expect(await serviceA.isRevoked(jti)).toBe(true)
  })

  it('未吊销的 jti → isRevoked 返回 false', async () => {
    expect(await serviceA.isRevoked(`it-rtbl-never-${Date.now()}`)).toBe(false)
  })

  it('TTL 1s：真实 Redis 过期后 isRevoked 返回 false', async () => {
    const jti = `it-rtbl-ttl-${Date.now()}`
    await serviceA.revoke(jti, 1)
    expect(await serviceA.isRevoked(jti)).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 1200))

    // 本实例视角：内存 L1 懒过期 + Redis EX 过期都已生效
    expect(await serviceA.isRevoked(jti)).toBe(false)
    // 跨实例视角：B 没有 L1 条目，纯走 Redis → 同样已过期
    expect(await serviceB.isRevoked(jti)).toBe(false)
  })

  it('多实例一致性：实例 A revoke，实例 B 立即可见（核心保证）', async () => {
    const jti = `it-rtbl-multi-${Date.now()}`

    // B 此前从未见过该 jti（L1 必然未命中，只能靠 Redis 命中）
    expect(await serviceB.isRevoked(jti)).toBe(false)

    await serviceA.revoke(jti, 60)

    expect(await serviceB.isRevoked(jti)).toBe(true)
  })
})
