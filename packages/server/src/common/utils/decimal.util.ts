import { Prisma } from '@prisma/client'

/** 把任何对象里 Prisma Decimal 字段转 number（接口返回友好） */
export function decimalToNumber<T>(input: T): T {
  if (input === null || input === undefined) return input
  if (input instanceof Date) return input
  if (Array.isArray(input)) return input.map(decimalToNumber) as any
  if (typeof input !== 'object') return input
  if ((input as any) instanceof Prisma.Decimal) return Number(input) as any
  // Prisma 5 没导出 Decimal class 兼容判断
  if (
    typeof (input as any).toFixed === 'function' &&
    (input as any).constructor?.name === 'Decimal'
  ) {
    return Number(input as any) as any
  }
  const out: any = {}
  for (const k of Object.keys(input as any)) {
    out[k] = decimalToNumber((input as any)[k])
  }
  return out
}
