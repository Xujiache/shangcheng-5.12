// ----------------------------------------------------------------------------
// 集成测试基础设施冒烟用例（环境金丝雀）
//
// 只验证三件事：能连上 DATABASE_URL 指向的库、能执行 SELECT 1、能正常断开。
// 此用例失败说明环境/配置有问题，而非业务代码问题。
// ----------------------------------------------------------------------------
import { makeClient } from './helpers/db'

describe('集成测试环境冒烟', () => {
  it('能连接数据库并执行 SELECT 1', async () => {
    const prisma = makeClient()
    try {
      const rows = await prisma.$queryRaw`SELECT 1 AS ok`
      expect(Array.isArray(rows)).toBe(true)
      expect(Number((rows as Array<{ ok: unknown }>)[0].ok)).toBe(1)
    } finally {
      await prisma.$disconnect()
    }
  })
})
