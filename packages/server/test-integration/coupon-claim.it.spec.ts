// ----------------------------------------------------------------------------
// claimCoupon 并发集成测试（真库真事务 —— Serializable 修复的核心证明）
//
// 单测只能用 mock 验证调用顺序，无法证明并发下不超领。本套件直连一次性本地
// Postgres（DATABASE_URL 由 global-setup 安全闸校验），用真实 PrismaClient 跑
// UserMpService.claimCoupon 的 Serializable 交互式事务：
//   1. 同一用户双并发 → 恰好一成一败（重复 5 轮防偶发），DB 持券 1 行 / received=1
//   2. 两个不同用户并发 → 双双成功（落败方靠 P2034 重试自愈），received=2
//   3. 同一用户串行二次领取 → 按 perUserLimit 拒绝（非竞态路径）
//   4. myCoupons 回读：unused → 核销后 used
// ----------------------------------------------------------------------------
// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；user-mp.service → id.util
// 在模块加载时导入 customAlphabet 会抛 "Cannot use import statement outside a module"。
// 用与单测同款的"忠实"轻量替身（保留字符集 + 长度契约，仅替换熵源）。
// 本套件不触达 orderNo/refundNo 生成路径，替身只为让模块图可加载。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return out
  },
}))

import { makeClient, resetDb, createUser, createMerchant, createCoupon } from './helpers/db'
import { UserMpService } from '../src/modules/user-mp/user-mp.service'
import { BizException } from '../src/common/exceptions/biz.exception'

// 5 轮竞态 × 每轮 resetDb（~23 表 TRUNCATE），放宽整体超时
jest.setTimeout(120_000)

describe('claimCoupon 并发安全（Serializable 真库集成）', () => {
  let prisma: any
  let svc: UserMpService

  beforeAll(() => {
    prisma = makeClient()
    // 只测优惠券路径：wxpay / chat 用最小桩即可（claimCoupon/myCoupons 不触达）
    svc = new UserMpService(
      prisma as any,
      { isReady: () => false } as any,
      {
        emitOrderNew() {},
        emitOrderUpdate() {},
        emitRefundNew() {},
        emitChatMessage() {},
        broadcastUserUpdate() {},
      } as any,
    )
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  /**
   * 每轮标准夹具：清库后建 买家 u1（可选 u2）+ 商家 owner + 商家 +
   * 活动券（perUserLimit=1 / stock=10 / 有效期横跨 now）
   */
  async function setupFixtures(opts: { secondUser?: boolean } = {}) {
    await resetDb(prisma)
    const u1 = await createUser(prisma)
    const u2 = opts.secondUser ? await createUser(prisma) : null
    const owner = await createUser(prisma, { role: 'merchant' })
    const merchant = await createMerchant(prisma, owner.id)
    const coupon = await createCoupon(prisma, merchant.id, {
      stock: 10,
      perUserLimit: 1,
    })
    return { u1, u2, coupon }
  }

  it('同一用户双并发领同一张券：恰好一成一败，DB 持券 1 行且 received=1（重复 5 轮）', async () => {
    for (let round = 1; round <= 5; round++) {
      const { u1, coupon } = await setupFixtures()

      const results = await Promise.allSettled([
        svc.claimCoupon(u1.id, coupon.id),
        svc.claimCoupon(u1.id, coupon.id),
      ])

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      // 把 round 编进断言对象，失败时能直接看出是第几轮炸的
      expect({
        round,
        fulfilled: fulfilled.length,
        rejected: rejected.length,
      }).toEqual({ round, fulfilled: 1, rejected: 1 })

      // 落败方必须是业务异常：正常是事务内重读 count 触发"已达上限"；
      // 极端情况下两次 Serializable 冲突耗尽重试则是"领取太频繁"
      const err: any = rejected[0].reason
      expect(err).toBeInstanceOf(BizException)
      expect(String(err.message)).toMatch(/已达上限|领取太频繁/)

      // DB ground truth：持券一行、received 恰好 1（旧实现这里会是 2 → 超领）
      const ucCount = await prisma.userCoupon.count({
        where: { userId: u1.id, couponId: coupon.id },
      })
      expect({ round, ucCount }).toEqual({ round, ucCount: 1 })
      const fresh = await prisma.coupon.findUnique({ where: { id: coupon.id } })
      expect({ round, received: fresh.received }).toEqual({ round, received: 1 })
    }
  })

  it('两个不同用户并发领同一张券：双双成功，received=2', async () => {
    const { u1, u2, coupon } = await setupFixtures({ secondUser: true })

    const results = await Promise.allSettled([
      svc.claimCoupon(u1.id, coupon.id),
      svc.claimCoupon(u2!.id, coupon.id),
    ])

    // 不同用户互不占额度：即使在同一行 Coupon.received 上撞出 P2034，
    // claimCoupon 内置重试也应让落败方自愈成功
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled'])

    const fresh = await prisma.coupon.findUnique({ where: { id: coupon.id } })
    expect(fresh.received).toBe(2)
    expect(await prisma.userCoupon.count({ where: { userId: u1.id, couponId: coupon.id } })).toBe(1)
    expect(await prisma.userCoupon.count({ where: { userId: u2!.id, couponId: coupon.id } })).toBe(
      1,
    )
  })

  it('同一用户串行第二次领取：按 perUserLimit 拒绝（非竞态路径）', async () => {
    const { u1, coupon } = await setupFixtures()

    const first = await svc.claimCoupon(u1.id, coupon.id)
    expect(first.ok).toBe(true)

    let caught: any
    try {
      await svc.claimCoupon(u1.id, coupon.id)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(BizException)
    // 串行路径没有写冲突，必须命中明确的"已达上限"，而非重试耗尽兜底
    expect(String(caught.message)).toMatch(/已达上限/)

    expect(await prisma.userCoupon.count({ where: { userId: u1.id, couponId: coupon.id } })).toBe(1)
    const fresh = await prisma.coupon.findUnique({ where: { id: coupon.id } })
    expect(fresh.received).toBe(1)
  })

  it('myCoupons 回读：领取后 1 行 unused 且带券名，核销后变 used', async () => {
    const { u1, coupon } = await setupFixtures()

    const claimed = await svc.claimCoupon(u1.id, coupon.id)
    expect(claimed.ok).toBe(true)

    const before = await svc.myCoupons(u1.id)
    expect(before).toHaveLength(1)
    expect(before[0].no).toBe(claimed.no)
    expect(before[0].status).toBe('unused')
    expect(before[0].name).toBe(coupon.name)
    expect(before[0].usedAt).toBeNull()

    // 模拟核销：直接改 UserCoupon 行（status=used + usedAt）
    await prisma.userCoupon.update({
      where: { no: claimed.no },
      data: { status: 'used', usedAt: new Date() },
    })

    const after = await svc.myCoupons(u1.id)
    expect(after).toHaveLength(1)
    expect(after[0].no).toBe(claimed.no)
    expect(after[0].status).toBe('used')
    expect(after[0].usedAt).toBeTruthy()
  })
})
