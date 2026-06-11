// ----------------------------------------------------------------------------
// 集成测试数据库工具
//
//   - makeClient : 基于 process.env.DATABASE_URL 创建 PrismaClient
//   - resetDb    : 按外键安全顺序 TRUNCATE 集成测试涉及的表（逐表 try/catch，
//                  尚未建出来的表自动跳过，便于与并行开发的新模型解耦）
//   - 夹具构造器 : createUser / createMerchant / createCoupon
// ----------------------------------------------------------------------------
import { PrismaClient } from '@prisma/client'

/** 创建指向当前 DATABASE_URL 的 PrismaClient（宽松类型，便于访问新增模型） */
export function makeClient(): any {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  })
}

/**
 * 清空集成测试涉及的表（FK 安全顺序：子表在前，父表在后）。
 * 使用 TRUNCATE ... CASCADE + 逐表 try/catch：
 *   - CASCADE 兜底处理漏列的关联表
 *   - 表不存在（如模型尚未 db push）时静默跳过
 */
export async function resetDb(prisma: any): Promise<void> {
  const tables = [
    'OrderShare',
    'UserCoupon',
    'SystemConfig',
    'Payment',
    'Refund',
    'Commission',
    'OrderItem',
    'Order',
    'CartItem',
    'Favorite',
    'Sku',
    'Product',
    'Coupon',
    'ChatMessage',
    'ChatSession',
    'Staff',
    'Store',
    'MerchantMembership',
    'PaymentRecord',
    'UsageQuota',
    'Merchant',
    'Address',
    'SmsCode',
    'User',
  ]
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
    } catch {
      // 表不存在等情况直接跳过，保证 resetDb 对 schema 演进鲁棒
    }
  }
}

let seq = 0
/** 生成进程内唯一后缀，避免 unique 字段（phone/openid 等）冲突 */
function uniqueSuffix(): string {
  seq += 1
  return `${Date.now()}${seq}`
}

/** 创建测试用户（默认 customer 角色，phone 唯一） */
export async function createUser(prisma: any, overrides: Record<string, any> = {}): Promise<any> {
  const suffix = uniqueSuffix()
  return prisma.user.create({
    data: {
      nickname: `测试用户${suffix}`,
      phone: `139${suffix.slice(-8).padStart(8, '0')}`,
      role: 'customer',
      status: 'active',
      ...overrides,
    },
  })
}

/** 创建测试商家（填齐全部必填列，默认 active 工厂商家） */
export async function createMerchant(
  prisma: any,
  userId: string,
  overrides: Record<string, any> = {},
): Promise<any> {
  const suffix = uniqueSuffix()
  return prisma.merchant.create({
    data: {
      userId,
      type: 'factory',
      name: `测试商家${suffix}`,
      legalName: `测试商家有限公司${suffix}`,
      creditCode: `91110000${suffix.slice(-10).padStart(10, '0')}`,
      legalRep: '张三',
      contact: '李四',
      contactPhone: `138${suffix.slice(-8).padStart(8, '0')}`,
      region: '北京市/北京市/朝阳区',
      address: '测试路 1 号',
      status: 'active',
      ...overrides,
    },
  })
}

/** 创建测试优惠券（有效期 now-1d ~ now+1d，状态 active） */
export async function createCoupon(
  prisma: any,
  merchantId: string,
  overrides: Record<string, any> = {},
): Promise<any> {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  return prisma.coupon.create({
    data: {
      merchantId,
      name: `测试满减券${uniqueSuffix()}`,
      type: 'fullReduce',
      amount: 10,
      threshold: 100,
      stock: 100,
      perUserLimit: 1,
      validFrom: new Date(now - oneDay),
      validTo: new Date(now + oneDay),
      status: 'active',
      ...overrides,
    },
  })
}
