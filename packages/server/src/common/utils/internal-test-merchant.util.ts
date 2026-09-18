/**
 * 生产内部测试商户隔离名单。
 *
 * 名单存放在 SystemConfig.internal_test_merchants，既接受字符串数组，也兼容
 * `{ merchantIds: string[] }`。这里故意不做进程内缓存：配置命令写入后，所有
 * API 请求应立即使用最新名单，避免测试数据短暂进入顾客端或选品广场。
 */
export const INTERNAL_TEST_MERCHANTS_KEY = 'internal_test_merchants'

export function parseInternalTestMerchantIds(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as any).merchantIds)
      ? (value as any).merchantIds
      : []

  return Array.from(
    new Set(
      raw
        .filter((id: unknown): id is string => typeof id === 'string')
        .map((id: string) => id.trim())
        .filter(Boolean),
    ),
  )
}

export async function getInternalTestMerchantIds(prisma: {
  systemConfig?: { findUnique(args: any): Promise<{ value: unknown } | null> }
}): Promise<string[]> {
  // 仅用于兼容服务单元测试里的最小 Prisma stub；真实 PrismaService 始终有该 delegate。
  if (!prisma.systemConfig?.findUnique) return []
  const config = await prisma.systemConfig.findUnique({
    where: { key: INTERNAL_TEST_MERCHANTS_KEY },
  })
  return parseInternalTestMerchantIds(config?.value)
}

export async function isInternalTestMerchant(
  prisma: {
    systemConfig?: { findUnique(args: any): Promise<{ value: unknown } | null> }
  },
  merchantId: string | null | undefined,
): Promise<boolean> {
  if (!merchantId) return false
  return (await getInternalTestMerchantIds(prisma)).includes(merchantId)
}
