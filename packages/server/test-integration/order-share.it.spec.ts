// ----------------------------------------------------------------------------
// OrderShare 集成测试（真实 Postgres）
//
// Part A：OrderShareService 服务往返（真实 PrismaClient，不打桩）
//   1. createShare 落库；同订单二次创建撤销旧分享（旧 revoked=true，新生效）
//   2. getPublicByCode 字段门控（仅 basics 时不泄露 customer/pricing/items/extra）
//      + viewCount 异步自增真实落库
//   3. revoked / 过期 → 2003（FORBIDDEN）；未知 shareCode → 1002（NOT_FOUND）
//   4. listByMerchant 真分页（skip/take + count）与 revoked 过滤
//
// Part B：deploy/order-share-init.sql 回填脚本真执行
//   - 按旧 SystemConfig（key=`order_share:<shareCode>`）格式造两行数据
//   - 逐条执行脚本语句（剥离注释；跳过 BEGIN/COMMIT 与末尾校验 SELECT）
//   - 断言字段映射正确（visibleFields 顺序 / viewCount / revoked / expiresAt）
//   - 重复执行幂等（IF NOT EXISTS + ON CONFLICT DO NOTHING，不报错不重复）
//
// 运行方式（见 test-integration/README.md，需指向一次性本地测试库）：
//   $env:DATABASE_URL = "postgresql://test:test@localhost:5440/qa?schema=public"
//   pnpm --filter @jiujiu/server db:push:test && pnpm --filter @jiujiu/server test:integration
// ----------------------------------------------------------------------------
import * as fs from 'fs'
import * as path from 'path'

// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；与单测 test/order-share.service.spec.ts
// 一致，用等价随机生成器替换 customAlphabet，避免 "Cannot use import statement outside a module"。
// 仅替换 shareCode 生成器，DB 读写仍走真实 Prisma。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let s = ''
    for (let i = 0; i < size; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return s
  },
}))

import { OrderShareService } from '../src/modules/merchant/order-share.service'
import { BizCode, BizException } from '../src/common/exceptions/biz.exception'
import { makeClient, resetDb, createUser, createMerchant } from './helpers/db'

jest.setTimeout(30_000)

const SQL_PATH = path.resolve(__dirname, '..', '..', '..', 'deploy', 'order-share-init.sql')

let orderSeq = 0
/** 创建测试订单（填齐全部必填列：no 唯一 / 金额 Decimal / address Json） */
async function createOrder(prisma: any, userId: string, merchantId: string): Promise<any> {
  orderSeq += 1
  return prisma.order.create({
    data: {
      no: `IT${Date.now()}${orderSeq}`,
      userId,
      merchantId,
      status: 'paid',
      totalAmount: 1999.5,
      payAmount: 1899.5,
      address: {
        name: '王五',
        phone: '13800000000',
        region: '北京市/北京市/朝阳区',
        detail: '幸福路 8 号',
      },
    },
  })
}

/** 断言异步调用抛出指定业务码的 BizException */
async function expectBizCode(fn: () => Promise<unknown>, code: number): Promise<void> {
  let caught: any = null
  try {
    await fn()
  } catch (e) {
    caught = e
  }
  expect(caught).toBeInstanceOf(BizException)
  expect((caught.getResponse() as any).code).toBe(code)
}

/**
 * 轮询等待 viewCount 达到期望值（getPublicByCode 的自增是 fire-and-forget，
 * 不阻塞响应，需短暂重试后再读库断言；上限约 1.5s）
 */
async function waitForViewCount(prisma: any, shareCode: string, expected: number): Promise<any> {
  const deadline = Date.now() + 1500
  for (;;) {
    const row = await prisma.orderShare.findUnique({ where: { shareCode } })
    if ((row?.viewCount ?? 0) >= expected || Date.now() > deadline) return row
    await new Promise((r) => setTimeout(r, 50))
  }
}

/**
 * 读取回填脚本并切分为可逐条执行的语句：
 *   - 剥离整行注释（^--）
 *   - 按分号切分（脚本无 DO $$ 块，分号即语句边界）
 *   - 跳过 BEGIN/COMMIT（prisma.$executeRawUnsafe 单语句执行，无需事务包裹）
 *   - 跳过末尾的校验 SELECT（查询语句不能走 executeRaw）
 */
function loadBackfillStatements(): string[] {
  const raw = fs.readFileSync(SQL_PATH, 'utf8')
  return raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^(BEGIN|COMMIT)$/i.test(s))
    .filter((s) => !/^SELECT/i.test(s))
}

describe('OrderShare 集成测试（真实 Postgres）', () => {
  let prisma: any
  let service: OrderShareService

  beforeAll(() => {
    prisma = makeClient()
    service = new OrderShareService(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // ──────────────────────────────────────────────────────────
  // Part A · OrderShareService 服务往返
  // ──────────────────────────────────────────────────────────
  describe('Part A · OrderShareService 服务往返', () => {
    let user: any
    let merchant: any

    beforeEach(async () => {
      await resetDb(prisma)
      user = await createUser(prisma)
      merchant = await createMerchant(prisma, user.id)
    })

    it('createShare 落库；同订单二次创建撤销旧分享', async () => {
      const order = await createOrder(prisma, user.id, merchant.id)

      const first = await service.createShare({
        orderId: order.id,
        merchantId: merchant.id,
        callerSub: user.id,
        visibleFields: ['basics', 'items'],
      })
      expect(first.shareCode).toHaveLength(12)
      expect(first.orderNo).toBe(order.no)

      // 落库校验
      const row1 = await prisma.orderShare.findUnique({ where: { shareCode: first.shareCode } })
      expect(row1).toBeTruthy()
      expect(row1.orderId).toBe(order.id)
      expect(row1.merchantId).toBe(merchant.id)
      expect(row1.visibleFields).toEqual(['basics', 'items'])
      expect(row1.expiresAt).toBeNull() // 未传 expiresInDays = 永久
      expect(row1.revoked).toBe(false)
      expect(row1.createdBy).toBe(user.id)

      // 同订单二次创建：旧的被撤销，新的生效
      const second = await service.createShare({
        orderId: order.id,
        merchantId: merchant.id,
        callerSub: user.id,
        visibleFields: ['basics'],
      })
      expect(second.shareCode).not.toBe(first.shareCode)

      const oldRow = await prisma.orderShare.findUnique({ where: { shareCode: first.shareCode } })
      const newRow = await prisma.orderShare.findUnique({ where: { shareCode: second.shareCode } })
      expect(oldRow.revoked).toBe(true)
      expect(newRow.revoked).toBe(false)
      expect(newRow.visibleFields).toEqual(['basics'])
    })

    it('getPublicByCode 字段门控（仅 basics）+ viewCount 真实自增', async () => {
      const order = await createOrder(prisma, user.id, merchant.id)
      const created = await service.createShare({
        orderId: order.id,
        merchantId: merchant.id,
        callerSub: user.id,
        visibleFields: ['basics'],
        intro: '门窗报价单',
      })

      const pub = await service.getPublicByCode(created.shareCode)

      // 应有：shareCode + merchant + basics
      expect(pub.shareCode).toBe(created.shareCode)
      expect(pub.merchant).toMatchObject({ id: merchant.id, name: merchant.name })
      expect(pub.basics).toBeDefined()
      expect(pub.basics.no).toBe(order.no)
      expect(pub.basics.status).toBe('paid')
      expect(Number(pub.basics.totalAmount)).toBeCloseTo(1999.5)
      expect(Number(pub.basics.payAmount)).toBeCloseTo(1899.5)

      // 不应有：未授权字段不出现在返回 JSON 中（防 devtools 反向取敏感信息）
      expect(pub).not.toHaveProperty('customer')
      expect(pub).not.toHaveProperty('pricing')
      expect(pub).not.toHaveProperty('items')
      expect(pub).not.toHaveProperty('extra')

      // viewCount 自增是 fire-and-forget，轮询等待落库
      const row = await waitForViewCount(prisma, created.shareCode, 1)
      expect(row.viewCount).toBe(1)
    })

    it('revoked → 2003；过期 → 2003；未知 code → 1002', async () => {
      // 已撤销
      const o1 = await createOrder(prisma, user.id, merchant.id)
      const s1 = await service.createShare({
        orderId: o1.id,
        merchantId: merchant.id,
        callerSub: user.id,
        visibleFields: ['basics'],
      })
      const rv = await service.revokeByOrder(o1.id, merchant.id)
      expect(rv).toMatchObject({ ok: true, revoked: true, shareCode: s1.shareCode })
      await expectBizCode(() => service.getPublicByCode(s1.shareCode), BizCode.FORBIDDEN) // 2003

      // 已过期：先建 1 天有效期的分享，再手动把 expiresAt 改到过去
      const o2 = await createOrder(prisma, user.id, merchant.id)
      const s2 = await service.createShare({
        orderId: o2.id,
        merchantId: merchant.id,
        callerSub: user.id,
        visibleFields: ['basics'],
        expiresInDays: 1,
      })
      expect(s2.expiresAt).toBeTruthy()
      await prisma.orderShare.update({
        where: { shareCode: s2.shareCode },
        data: { expiresAt: new Date(Date.now() - 3600_000) },
      })
      await expectBizCode(() => service.getPublicByCode(s2.shareCode), BizCode.FORBIDDEN) // 2003

      // 不存在的 shareCode
      await expectBizCode(() => service.getPublicByCode('zzzzzzzzzzzz'), BizCode.NOT_FOUND) // 1002
    })

    it('listByMerchant 真分页 + revoked 过滤', async () => {
      // createShare 会撤销同订单旧分享，要保留 3 份生效分享须用 3 个不同订单
      const orders = [
        await createOrder(prisma, user.id, merchant.id),
        await createOrder(prisma, user.id, merchant.id),
        await createOrder(prisma, user.id, merchant.id),
      ]
      const shares: any[] = []
      for (const o of orders) {
        shares.push(
          await service.createShare({
            orderId: o.id,
            merchantId: merchant.id,
            callerSub: user.id,
            visibleFields: ['basics'],
          }),
        )
      }

      // 分页：page=1 pageSize=2 → 2 行 + total 3；page=2 → 剩 1 行
      const p1 = await service.listByMerchant(merchant.id, { page: 1, pageSize: 2 })
      expect(p1.total).toBe(3)
      expect(p1.list).toHaveLength(2)
      expect(p1.page).toBe(1)
      expect(p1.pageSize).toBe(2)
      expect(p1.hasMore).toBe(true)
      expect(p1.list[0].orderNo).toBeTruthy() // 拼了订单号摘要

      const p2 = await service.listByMerchant(merchant.id, { page: 2, pageSize: 2 })
      expect(p2.list).toHaveLength(1)
      expect(p2.hasMore).toBe(false)

      // 两页 shareCode 并集 = 全部 3 份，无重复
      const allCodes = [...p1.list, ...p2.list].map((r: any) => r.shareCode).sort()
      expect(allCodes).toEqual(shares.map((s) => s.shareCode).sort())

      // revoked 过滤：对订单 0 二次创建 → 旧分享被撤销（共 4 行：3 生效 + 1 撤销）
      const reshared = await service.createShare({
        orderId: orders[0].id,
        merchantId: merchant.id,
        callerSub: user.id,
        visibleFields: ['basics'],
      })

      const revokedPage = await service.listByMerchant(merchant.id, { revoked: 'true' })
      expect(revokedPage.total).toBe(1)
      expect(revokedPage.list[0].shareCode).toBe(shares[0].shareCode)
      expect(revokedPage.list[0].revoked).toBe(true)

      const activePage = await service.listByMerchant(merchant.id, { revoked: false })
      expect(activePage.total).toBe(3)
      const activeCodes = activePage.list.map((r: any) => r.shareCode)
      expect(activeCodes).toContain(reshared.shareCode)
      expect(activeCodes).not.toContain(shares[0].shareCode)

      // 不传 revoked 不过滤 → 4 行全部
      const allPage = await service.listByMerchant(merchant.id, {})
      expect(allPage.total).toBe(4)
    })
  })

  // ──────────────────────────────────────────────────────────
  // Part B · deploy/order-share-init.sql 回填脚本真执行
  // ──────────────────────────────────────────────────────────
  describe('Part B · deploy/order-share-init.sql 回填脚本', () => {
    const LEGACY_EXPIRES = '2099-01-02T03:04:05.000Z'
    const LEGACY_CREATED_1 = '2026-05-01T08:00:00.000Z'
    const LEGACY_CREATED_2 = '2026-05-02T09:30:00.000Z'

    it('SystemConfig 旧格式两行 → 回填 OrderShare，重复执行幂等', async () => {
      // 1. 清场：OrderShare 清空 + 删除旧 order_share 配置行
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "OrderShare" CASCADE')
      await prisma.systemConfig.deleteMany({ where: { key: { startsWith: 'order_share:' } } })

      // 2. 按旧版 SystemConfig KV 格式造两行（key = order_share:<12位shareCode>）
      //    行一：永久（expiresAt null）+ 未撤销；行二：有过期时间 + 已撤销
      await prisma.systemConfig.create({
        data: {
          key: 'order_share:ABC123def456',
          value: {
            orderId: 'order-legacy-1',
            merchantId: 'merchant-legacy-1',
            visibleFields: ['basics', 'items'],
            expiresAt: null,
            intro: '旧分享一',
            viewCount: 7,
            revoked: false,
            createdAt: LEGACY_CREATED_1,
            createdBy: 'user-legacy-1',
          },
        },
      })
      await prisma.systemConfig.create({
        data: {
          key: 'order_share:XYZ789ghi012',
          value: {
            orderId: 'order-legacy-2',
            merchantId: 'merchant-legacy-2',
            visibleFields: ['items', 'basics'], // 顺序故意与行一不同，验证数组顺序保真
            expiresAt: LEGACY_EXPIRES,
            intro: '旧分享二',
            viewCount: 7,
            revoked: true,
            createdAt: LEGACY_CREATED_2,
            createdBy: 'user-legacy-2',
          },
        },
      })

      // 3. 逐条执行脚本语句（建表 + 3 索引 + INSERT 回填 = 5 条）
      const statements = loadBackfillStatements()
      expect(statements).toHaveLength(5)
      expect(statements[0]).toMatch(/^CREATE TABLE IF NOT EXISTS "OrderShare"/)
      expect(statements[4]).toMatch(/^INSERT INTO "OrderShare"/)
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt)
      }

      // 4. 字段映射断言
      const rows = await prisma.orderShare.findMany({ orderBy: { shareCode: 'asc' } })
      expect(rows).toHaveLength(2)

      const abc = rows.find((r: any) => r.shareCode === 'ABC123def456')
      expect(abc).toBeTruthy()
      expect(abc.orderId).toBe('order-legacy-1')
      expect(abc.merchantId).toBe('merchant-legacy-1')
      expect(abc.visibleFields).toEqual(['basics', 'items'])
      expect(abc.expiresAt).toBeNull()
      expect(abc.intro).toBe('旧分享一')
      expect(abc.viewCount).toBe(7)
      expect(abc.revoked).toBe(false)
      expect(abc.createdBy).toBe('user-legacy-1')
      expect(abc.createdAt.toISOString()).toBe(LEGACY_CREATED_1)

      const xyz = rows.find((r: any) => r.shareCode === 'XYZ789ghi012')
      expect(xyz).toBeTruthy()
      expect(xyz.orderId).toBe('order-legacy-2')
      expect(xyz.merchantId).toBe('merchant-legacy-2')
      expect(xyz.visibleFields).toEqual(['items', 'basics'])
      expect(xyz.expiresAt).not.toBeNull()
      expect(xyz.expiresAt.toISOString()).toBe(LEGACY_EXPIRES)
      expect(xyz.viewCount).toBe(7)
      expect(xyz.revoked).toBe(true)
      expect(xyz.createdAt.toISOString()).toBe(LEGACY_CREATED_2)

      // 5. 幂等：重复执行全部语句不报错（IF NOT EXISTS / ON CONFLICT DO NOTHING），
      //    仍是 2 行且字段未被覆盖
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt)
      }
      const rowsAgain = await prisma.orderShare.findMany()
      expect(rowsAgain).toHaveLength(2)
      const abcAgain = rowsAgain.find((r: any) => r.shareCode === 'ABC123def456')
      expect(abcAgain.viewCount).toBe(7)
      expect(abcAgain.revoked).toBe(false)
    })
  })
})
