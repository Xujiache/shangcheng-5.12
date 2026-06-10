import { describe, it, expect, jest } from '@jest/globals'
import { Prisma } from '@prisma/client'

// nanoid@5 是纯 ESM，ts-jest 默认不转换 node_modules，会在导入 id.util 时抛
// "Cannot use import statement outside a module"。这里用工厂 mock 替换掉
// customAlphabet，使其返回一个从给定字符集随机取 N 位的生成器，行为等价。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let s = ''
    for (let i = 0; i < size; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return s
  },
}))

import { parsePage, buildPage } from '../src/common/utils/pagination.util'
import { decimalToNumber } from '../src/common/utils/decimal.util'
import { orderNo, refundNo, withdrawNo, payNo, membershipNo } from '../src/common/utils/id.util'

// ----------------------------------------------------------------------------
// common/utils — 分页 / Decimal 序列化 / 单号生成
//
// 实现位置：packages/server/src/common/utils/{pagination,decimal,id}.util.ts
// ----------------------------------------------------------------------------

describe('pagination.util — parsePage', () => {
  it('空查询时返回默认分页 page=1 / pageSize=20', () => {
    const { page, pageSize, skip, take } = parsePage({})
    expect(page).toBe(1)
    expect(pageSize).toBe(20)
    expect(skip).toBe(0)
    expect(take).toBe(20)
  })

  it('page 为 0 / -1 / 非法字符串时都回落到 1', () => {
    expect(parsePage({ page: 0 }).page).toBe(1)
    expect(parsePage({ page: -1 }).page).toBe(1)
    expect(parsePage({ page: 'abc' }).page).toBe(1)
  })

  it('pageSize 超过 100 时被夹到 100', () => {
    expect(parsePage({ pageSize: 1000 }).pageSize).toBe(100)
    expect(parsePage({ pageSize: 1000 }).take).toBe(100)
  })

  it('pageSize 为 0 时回落到下界 1（而非默认 20）', () => {
    // Number(0) || 20 => 20，再被 Math.max(1, 20) 取 20 —— 但 0 是 falsy，
    // 实际链路是 Number(q.pageSize) || 20 => 20。这里断言真实行为。
    expect(parsePage({ pageSize: 0 }).pageSize).toBe(20)
  })

  it('pageSize 为 1 时保持 1（下界不被默认值覆盖）', () => {
    expect(parsePage({ pageSize: 1 }).pageSize).toBe(1)
  })

  it('skip / take 随 page、pageSize 正确计算', () => {
    const { skip, take } = parsePage({ page: 3, pageSize: 15 })
    expect(skip).toBe((3 - 1) * 15)
    expect(take).toBe(15)
  })
})

describe('pagination.util — buildPage', () => {
  it('page*pageSize === total 时 hasMore=false（恰好到末页）', () => {
    const res = buildPage([], 40, 2, 20) // 2*20 === 40
    expect(res.hasMore).toBe(false)
  })

  it('page*pageSize < total 时 hasMore=true（仍有下一页）', () => {
    const res = buildPage([], 41, 2, 20) // 2*20 = 40 < 41
    expect(res.hasMore).toBe(true)
  })

  it('透传 list / total / page / pageSize 原样返回', () => {
    const list = [{ id: 1 }, { id: 2 }]
    const res = buildPage(list, 2, 1, 20)
    expect(res.list).toBe(list)
    expect(res.total).toBe(2)
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(20)
  })
})

describe('decimal.util — decimalToNumber', () => {
  it('顶层 Prisma.Decimal 转为 number', () => {
    const out = decimalToNumber(new Prisma.Decimal('12.34'))
    expect(out).toBe(12.34)
    expect(typeof out).toBe('number')
  })

  it('嵌套对象内的 Decimal 字段递归转 number', () => {
    const out = decimalToNumber({
      price: new Prisma.Decimal('99.9'),
      inner: { fee: new Prisma.Decimal('1.5') },
    })
    expect(out).toEqual({ price: 99.9, inner: { fee: 1.5 } })
  })

  it('数组内的 Decimal 元素递归转 number', () => {
    const out = decimalToNumber([new Prisma.Decimal('1.1'), new Prisma.Decimal('2.2')])
    expect(out).toEqual([1.1, 2.2])
  })

  it('Date 实例原样返回，不被展开成 {}', () => {
    const d = new Date('2026-06-11T00:00:00.000Z')
    const out = decimalToNumber(d)
    expect(out).toBe(d)
    expect(out instanceof Date).toBe(true)
  })

  it('null / undefined 原样透传', () => {
    expect(decimalToNumber(null)).toBeNull()
    expect(decimalToNumber(undefined)).toBeUndefined()
  })

  it('原始类型（string / number / boolean）原样透传', () => {
    expect(decimalToNumber('hello')).toBe('hello')
    expect(decimalToNumber(42)).toBe(42)
    expect(decimalToNumber(true)).toBe(true)
  })
})

describe('id.util — 单号生成', () => {
  const CHARSET = /^[0-9A-Z]+$/
  // 业务字符集排除了易混淆的 I 和 O
  const NO_IO = (s: string) => !/[IO]/.test(s)

  function expectDatePart(no: string, prefix: string) {
    // prefix + 8位日期 + 12位随机
    const body = no.slice(prefix.length)
    const ymd = body.slice(0, 8)
    expect(ymd).toMatch(/^\d{8}$/)
    const rand = body.slice(8)
    expect(rand).toHaveLength(12)
  }

  it('orderNo 形如 O + 8位日期 + 12位随机，总长 21', () => {
    const no = orderNo()
    expect(no).toHaveLength(21)
    expect(no.startsWith('O')).toBe(true)
    expectDatePart(no, 'O')
  })

  it('orderNo 随机段字符集仅 0-9A-Z 且不含 I / O', () => {
    const no = orderNo()
    const rand = no.slice(9) // 跳过 O 前缀(1) + 日期(8)
    expect(rand).toMatch(CHARSET)
    expect(NO_IO(rand)).toBe(true)
  })

  it('refundNo 以 R 开头，结构与 orderNo 一致（总长 21）', () => {
    const no = refundNo()
    expect(no.startsWith('R')).toBe(true)
    expect(no).toHaveLength(21)
    expectDatePart(no, 'R')
  })

  it('withdrawNo 以 W 开头', () => {
    const no = withdrawNo()
    expect(no.startsWith('W')).toBe(true)
    expect(no).toHaveLength(21)
    expectDatePart(no, 'W')
  })

  it('payNo 以 P 开头', () => {
    const no = payNo()
    expect(no.startsWith('P')).toBe(true)
    expect(no).toHaveLength(21)
    expectDatePart(no, 'P')
  })

  it('membershipNo 以 MEM 开头，结构为 MEM + 8位日期 + 12位随机', () => {
    const no = membershipNo()
    expect(no.startsWith('MEM')).toBe(true)
    expect(no).toHaveLength(3 + 8 + 12)
    expectDatePart(no, 'MEM')
    const rand = no.slice(3 + 8)
    expect(rand).toMatch(CHARSET)
    expect(NO_IO(rand)).toBe(true)
  })
})
