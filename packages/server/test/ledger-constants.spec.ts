import { describe, it, expect, jest } from '@jest/globals'

// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require。这里用一份"忠实"的轻量实现替身：
// customAlphabet 仍按传入字符集 + 长度随机取字符，从而保留 genLedgerInviteCode 的
// 长度/字符集契约可被真实验证（仅替换熵源，不改变可观察行为）。
jest.mock('nanoid', () => ({
  customAlphabet: (alphabet: string, size: number) => () => {
    let out = ''
    for (let i = 0; i < size; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return out
  },
}))

import {
  deriveMembership,
  computeGrantExpiry,
  sanitizeExtras,
  extrasTotal,
  sanitizeCustomCosts,
  customCostsTotal,
  sanitizeOrderItems,
  itemBillingQty,
  itemSubtotal,
  orderItemsAmount,
  orderTotalFromItems,
  fixedCost,
  totalCost,
  profitOf,
  revenueOf,
  marginOf,
  normalizeLedgerConfig,
  normalizeLedgerPlans,
  genLedgerInviteCode,
  LEDGER_CONFIG_DEFAULTS,
  LEDGER_PLANS,
} from '../src/modules/ledger/ledger.constants'

// ----------------------------------------------------------------------------
// 门窗利账 · 领域常量纯函数
//   会员派生 / 增时叠加 / 订单清洗 / 计费量 / 利润口径 / 配置收口 / 邀请码
// 全部无 DI、无副作用，now 注入便于稳定断言（用相对天数，绝不写死本地时区日期串）。
// ----------------------------------------------------------------------------

const DAY_MS = 86_400_000
const NOW = new Date('2026-06-11T00:00:00.000Z')
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY_MS)

describe('deriveMembership 会员状态派生', () => {
  it('expiresAt 为 null → never=true，daysLeft=0，active/expired 均 false', () => {
    const s = deriveMembership(null, 'month', NOW)
    expect(s.never).toBe(true)
    expect(s.active).toBe(false)
    expect(s.expired).toBe(false)
    expect(s.daysLeft).toBe(0)
    expect(s.expiringSoon).toBe(false)
    expect(s.expiresAt).toBeNull()
    expect(s.lastPlanKey).toBe('month')
  })

  it('expiresAt 为 undefined 同样判定为 never，lastPlanKey 缺省回落 null', () => {
    const s = deriveMembership(undefined, undefined, NOW)
    expect(s.never).toBe(true)
    expect(s.lastPlanKey).toBeNull()
  })

  it('未来 +10 天 → active=true，daysLeft=10，expiringSoon=false（>7）', () => {
    const s = deriveMembership(daysFromNow(10), 'year', NOW)
    expect(s.active).toBe(true)
    expect(s.expired).toBe(false)
    expect(s.never).toBe(false)
    expect(s.daysLeft).toBe(10)
    expect(s.expiringSoon).toBe(false)
    expect(s.expiresAt).toBe(daysFromNow(10).toISOString())
  })

  it('未来 +3 天 → active=true 且 expiringSoon=true（≤7）', () => {
    const s = deriveMembership(daysFromNow(3), 'week', NOW)
    expect(s.active).toBe(true)
    expect(s.daysLeft).toBe(3)
    expect(s.expiringSoon).toBe(true)
  })

  it('已过期（-5 天）→ expired=true，active=false，daysLeft 为负，expiringSoon=false', () => {
    const s = deriveMembership(daysFromNow(-5), 'day', NOW)
    expect(s.expired).toBe(true)
    expect(s.active).toBe(false)
    expect(s.never).toBe(false)
    expect(s.daysLeft).toBeLessThan(0)
    expect(s.expiringSoon).toBe(false)
  })
})

describe('computeGrantExpiry 增加会员时长（叠加）', () => {
  it('当前到期在未来 → 从原到期日往后续 N 天（不浪费剩余天数）', () => {
    const current = daysFromNow(10)
    const out = computeGrantExpiry(current, 30, NOW)
    expect(out.getTime()).toBe(current.getTime() + 30 * DAY_MS)
  })

  it('已过期 → 从今天起算 N 天', () => {
    const out = computeGrantExpiry(daysFromNow(-5), 30, NOW)
    expect(out.getTime()).toBe(NOW.getTime() + 30 * DAY_MS)
  })

  it('从未开通（null）→ 从今天起算 N 天', () => {
    const out = computeGrantExpiry(null, 7, NOW)
    expect(out.getTime()).toBe(NOW.getTime() + 7 * DAY_MS)
  })

  it('负数天数（后台扣减）→ 只减少时长，从原到期日往前推', () => {
    const current = daysFromNow(100)
    const out = computeGrantExpiry(current, -10, NOW)
    expect(out.getTime()).toBe(current.getTime() - 10 * DAY_MS)
    expect(out.getTime()).toBeLessThan(current.getTime())
  })

  it('封顶 now+3650 天：传 99999 天被钳到上限', () => {
    const out = computeGrantExpiry(null, 99999, NOW)
    expect(out.getTime()).toBe(NOW.getTime() + 3650 * DAY_MS)
  })
})

describe('sanitizeExtras / extrasTotal 其他开销清洗', () => {
  it('非数组输入 → 返回空数组', () => {
    expect(sanitizeExtras(null)).toEqual([])
    expect(sanitizeExtras('x' as any)).toEqual([])
    expect(sanitizeExtras({} as any)).toEqual([])
  })

  it('截断超过 50 条', () => {
    const raw = Array.from({ length: 60 }, () => ({ type: '运费', amount: 5 }))
    expect(sanitizeExtras(raw)).toHaveLength(50)
  })

  it('type 做 trim + 截断到 20 字符；amount 四舍五入', () => {
    const out = sanitizeExtras([{ type: '  ' + 'A'.repeat(30) + '  ', amount: 12.6 }])
    expect(out[0].type).toBe('A'.repeat(20))
    expect(out[0].amount).toBe(13)
  })

  it('amount 为负 / 0 / NaN 的项被过滤；type 为空被过滤', () => {
    const out = sanitizeExtras([
      { type: '负', amount: -10 },
      { type: '零', amount: 0 },
      { type: '非数', amount: 'abc' },
      { type: '', amount: 100 },
      { type: '有效', amount: 50 },
    ])
    expect(out).toEqual([{ type: '有效', amount: 50 }])
  })

  it('extrasTotal 正确求和', () => {
    expect(
      extrasTotal([
        { type: 'a', amount: 10 },
        { type: 'b', amount: 20 },
      ]),
    ).toBe(30)
    expect(extrasTotal('bad')).toBe(0)
  })
})

describe('sanitizeCustomCosts / customCostsTotal 自定义成本项', () => {
  it('非数组 → []', () => {
    expect(sanitizeCustomCosts(undefined)).toEqual([])
  })

  it('截断超过 20 条', () => {
    const raw = Array.from({ length: 30 }, () => ({ name: '杂费', amount: 3 }))
    expect(sanitizeCustomCosts(raw)).toHaveLength(20)
  })

  it('name 截断到 20 字符；无名 / 0 金额项被丢弃', () => {
    const out = sanitizeCustomCosts([
      { name: 'N'.repeat(25), amount: 8 },
      { name: '', amount: 100 },
      { name: '免费', amount: 0 },
      { name: '有效', amount: 40 },
    ])
    expect(out).toEqual([
      { name: 'N'.repeat(20), amount: 8 },
      { name: '有效', amount: 40 },
    ])
  })

  it('customCostsTotal 正确求和', () => {
    expect(
      customCostsTotal([
        { name: 'a', amount: 5 },
        { name: 'b', amount: 15 },
      ]),
    ).toBe(20)
  })
})

describe('sanitizeOrderItems 门窗报价明细清洗', () => {
  it('非数组 → []，整体截断到 100 条', () => {
    expect(sanitizeOrderItems(null)).toEqual([])
    const raw = Array.from({ length: 120 }, () => ({ name: '推拉窗' }))
    expect(sanitizeOrderItems(raw)).toHaveLength(100)
  })

  it('纯空行被丢弃；name 做 trim + slice(0,40)', () => {
    const out = sanitizeOrderItems([
      { name: '  ' }, // 纯空（无名称/尺寸/数量/单价）→ 丢弃
      { name: '  断桥铝  ' },
      { name: 'X'.repeat(50) },
    ])
    expect(out).toHaveLength(2)
    expect(out[0].name).toBe('断桥铝')
    expect(out[1].name).toBe('X'.repeat(40))
  })

  it('名称非强制：无名称但有 尺寸/数量/单价 任一的项被保留', () => {
    const out = sanitizeOrderItems([
      { name: '', sizes: [{ w: 800, h: 1200, note: '' }] }, // 有尺寸 → 保留
      { name: '', qty: 3, unitPrice: 100 }, // 有数量+单价 → 保留
      { name: '', unitPrice: 50 }, // 仅单价 → 保留
      { name: '', baseArea: 0, qty: 0, unitPrice: 0, sizes: [] }, // 纯空 → 丢弃
    ])
    expect(out).toHaveLength(3)
    expect(out[0].sizes).toHaveLength(1)
    expect(out[1].qty).toBe(3)
    expect(out[2].unitPrice).toBe(50)
  })

  it('小计手动改写：保留 subtotal（含仅有小计的项），无 subtotal 落 null', () => {
    const out = sanitizeOrderItems([
      { name: '', baseArea: 0, qty: 0, unitPrice: 0, sizes: [], subtotal: 500 }, // 仅小计 → 保留
      { name: '窗', unitPrice: 100, qty: 2, subtotal: 0 }, // 改写 0 → 保留且 subtotal=0
      { name: '门', unitPrice: 50, qty: 1 }, // 无 subtotal → null
      { name: '', baseArea: 0, qty: 0, unitPrice: 0, sizes: [], subtotal: '' }, // 纯空 → 丢弃
    ])
    expect(out).toHaveLength(3)
    expect(out[0].subtotal).toBe(500)
    expect(out[1].subtotal).toBe(0)
    expect(out[2].subtotal).toBeNull()
  })

  it('sizes 截断到 100，w/h ≤ 0 的尺寸被过滤，每条备注截断到 30', () => {
    const sizes = [
      { w: 800, h: 1250, note: 'N'.repeat(40) },
      { w: 0, h: 1000, note: '无宽' },
      { w: 1000, h: 0, note: '无高' },
      { w: -5, h: -5, note: '负' },
    ]
    const out = sanitizeOrderItems([{ name: '窗', sizes }])
    expect(out[0].sizes).toHaveLength(1)
    // 旧单单条 note 兼容迁移为 notes 数组，逐条仍截断到 30
    expect(out[0].sizes[0]).toEqual({ w: 800, h: 1250, count: 1, notes: ['N'.repeat(30)] })
  })

  it('尺寸多条备注：notes 数组逐条 trim/≤30、丢空、≤50 条', () => {
    const out = sanitizeOrderItems([
      { name: '窗', sizes: [{ w: 800, h: 1200, notes: ['  灰色  ', '', '钢化', 'N'.repeat(40)] }] },
    ])
    expect(out[0].sizes[0].notes).toEqual(['灰色', '钢化', 'N'.repeat(30)])
    const many = Array.from({ length: 60 }, (_, i) => 'n' + i)
    const out2 = sanitizeOrderItems([{ name: '窗', sizes: [{ w: 100, h: 100, notes: many }] }])
    expect(out2[0].sizes[0].notes).toHaveLength(50)
  })

  it('baseArea/unitPrice/qty 清洗：负数归 0，unitPrice 四舍五入', () => {
    const out = sanitizeOrderItems([{ name: '门', baseArea: -2, unitPrice: 199.7, qty: -3 }])
    expect(out[0].baseArea).toBe(0)
    expect(out[0].unitPrice).toBe(200)
    expect(out[0].qty).toBe(0)
  })

  it('sizes 非数组 → 退化为空数组', () => {
    const out = sanitizeOrderItems([{ name: '门', sizes: 'oops' }])
    expect(out[0].sizes).toEqual([])
  })
})

describe('itemBillingQty 计费量', () => {
  it('有尺寸 = 各尺寸面积之和（800x1250mm=1㎡，不足起算按 baseArea 兜底）', () => {
    const it = {
      name: '窗',
      note: '',
      baseArea: 1.5,
      unitPrice: 0,
      qty: 0,
      sizes: [
        { w: 800, h: 1250, note: '' }, // 1.0㎡ → 兜底到 1.5
        { w: 2000, h: 2000, note: '' }, // 4.0㎡ → 保留 4.0
      ],
    }
    expect(itemBillingQty(it)).toBeCloseTo(5.5, 6)
  })

  it('无尺寸 = 手填数量 qty', () => {
    const it = { name: '门', note: '', baseArea: 0, unitPrice: 0, qty: 3.5, sizes: [] }
    expect(itemBillingQty(it)).toBe(3.5)
  })

  it('尺寸件数：宽×高×件数（1000×2000×3 = 6㎡，单价100 → 小计600）', () => {
    const it = {
      name: '窗',
      baseArea: 0,
      unitPrice: 100,
      qty: 0,
      sizes: [{ w: 1000, h: 2000, count: 3 }],
    }
    expect(itemBillingQty(it as any)).toBeCloseTo(6, 6)
    expect(itemSubtotal(it as any)).toBe(600)
  })

  it('件数缺省/非法 → 按 1 计', () => {
    const a = { name: '窗', baseArea: 0, unitPrice: 0, qty: 0, sizes: [{ w: 1000, h: 1000 }] }
    const b = {
      name: '窗',
      baseArea: 0,
      unitPrice: 0,
      qty: 0,
      sizes: [{ w: 1000, h: 1000, count: 0 }],
    }
    expect(itemBillingQty(a as any)).toBeCloseTo(1, 6)
    expect(itemBillingQty(b as any)).toBeCloseTo(1, 6)
  })
})

describe('itemSubtotal / orderItemsAmount / orderTotalFromItems 金额口径', () => {
  it('itemSubtotal = round(计费量 × 单价)', () => {
    const it = { name: '门', note: '', baseArea: 0, unitPrice: 199, qty: 2, sizes: [] }
    expect(itemSubtotal(it)).toBe(398)
  })

  it('itemSubtotal 手动改写优先：subtotal 非空即覆盖 计费量×单价（含 0）', () => {
    // 改写 250 覆盖 2×100=200
    expect(itemSubtotal({ unitPrice: 100, qty: 2, sizes: [], subtotal: 250 } as any)).toBe(250)
    // 改写 0（免单）覆盖 5×80=400
    expect(itemSubtotal({ unitPrice: 80, qty: 5, sizes: [], subtotal: 0 } as any)).toBe(0)
    // subtotal=null → 回落自动算
    expect(itemSubtotal({ unitPrice: 100, qty: 2, sizes: [], subtotal: null } as any)).toBe(200)
  })

  it('orderTotalFromItems 尊重手动小计：以改写值入金额', () => {
    const items = [
      { unitPrice: 100, qty: 2, sizes: [], subtotal: 1500 }, // 改写 1500（非 200）
      { unitPrice: 50, qty: 3, sizes: [] }, // 自动 150
    ]
    expect(orderTotalFromItems(items, 0)).toBe(1650)
  })

  it('orderItemsAmount = Σ各项小计', () => {
    const items = [
      { name: 'a', unitPrice: 100, qty: 2, sizes: [] },
      { name: 'b', unitPrice: 50, qty: 3, sizes: [] },
    ]
    expect(orderItemsAmount(items)).toBe(350)
  })

  it('总价 = max(0, 金额 − 优惠)', () => {
    const items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }] // 1000
    expect(orderTotalFromItems(items, 200)).toBe(800)
  })

  it('总价 = max(0, 金额 − 优惠 − 回收)', () => {
    const items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }] // 1000
    expect(orderTotalFromItems(items, 200, 100)).toBe(700)
    expect(orderTotalFromItems(items, 0, 1200)).toBe(0) // 回收超额也归 0
    expect(orderTotalFromItems(items, 0)).toBe(1000) // 回收缺省=0，向后兼容
  })

  it('优惠为负 → 视为 0（不增加总价）', () => {
    const items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }] // 1000
    expect(orderTotalFromItems(items, -300)).toBe(1000)
  })

  it('优惠超过金额 → 总价钳到 0（不为负）', () => {
    const items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }] // 1000
    expect(orderTotalFromItems(items, 5000)).toBe(0)
  })
})

describe('成本 / 利润 / 营收 / 毛利率 全链路', () => {
  const base = {
    total: 1000,
    costProfile: 100,
    costGlass: 50,
    costHardware: 30,
    costLabor: 20,
    costScreen: 10,
    extras: [{ type: '运费', amount: 40 }],
    customCosts: [{ name: '回扣', amount: 60 }],
  }

  it('fixedCost = 固定 5 类之和', () => {
    expect(fixedCost(base)).toBe(210)
  })

  it('totalCost = 固定成本 + extras + customCosts', () => {
    expect(totalCost(base)).toBe(210 + 40 + 60)
  })

  it('revenueOf = 总价（额外收入已废弃）', () => {
    expect(revenueOf(base)).toBe(1000)
  })

  it('profitOf = 总价 − 总成本', () => {
    // 1000 - 310 = 690
    expect(profitOf(base)).toBe(690)
  })

  it('marginOf = 利润 / 营收', () => {
    expect(marginOf(base)).toBeCloseTo(690 / 1000, 6)
  })

  it('营收为 0 → marginOf 返回 0（避免除零）', () => {
    const zero = {
      total: 0,
      costProfile: 0,
      costGlass: 0,
      costHardware: 0,
      costLabor: 0,
      costScreen: 0,
      extras: [],
    }
    expect(revenueOf(zero)).toBe(0)
    expect(marginOf(zero)).toBe(0)
  })
})

describe('normalizeLedgerConfig 配置收口', () => {
  it('null / 非对象输入 → 全量默认值', () => {
    expect(normalizeLedgerConfig(null)).toEqual(LEDGER_CONFIG_DEFAULTS)
    expect(normalizeLedgerConfig('garbage')).toEqual(LEDGER_CONFIG_DEFAULTS)
    expect(normalizeLedgerConfig(undefined)).toEqual(LEDGER_CONFIG_DEFAULTS)
  })

  it('数值越上限被钳到 3650，越下限被钳到 0，并四舍五入', () => {
    const out = normalizeLedgerConfig({
      inviteRewardDays: 99999,
      cutTrialDays: -10,
      inviteMaxRewarded: 12.6,
    })
    expect(out.inviteRewardDays).toBe(3650)
    expect(out.cutTrialDays).toBe(0)
    expect(out.inviteMaxRewarded).toBe(13)
  })

  it('数值非法（NaN）→ 回落该字段默认值', () => {
    const out = normalizeLedgerConfig({ inviteRewardDays: 'abc' })
    expect(out.inviteRewardDays).toBe(LEDGER_CONFIG_DEFAULTS.inviteRewardDays)
  })

  it('布尔字段非布尔 → 回落默认值；合法布尔被采用', () => {
    const out = normalizeLedgerConfig({ allowSelfRegister: 'yes', cutRequireMembership: false })
    expect(out.allowSelfRegister).toBe(LEDGER_CONFIG_DEFAULTS.allowSelfRegister)
    expect(out.cutRequireMembership).toBe(false)
  })

  it('plans 缺省 / 非数组 → 回落默认套餐', () => {
    expect(normalizeLedgerConfig({}).plans).toEqual(LEDGER_PLANS)
    expect(normalizeLedgerConfig({ plans: 'x' }).plans).toEqual(LEDGER_PLANS)
  })
})

describe('normalizeLedgerPlans 套餐收口', () => {
  it('合法套餐被采用，天数取整、价格 trim', () => {
    const out = normalizeLedgerPlans([
      { key: 'month', label: '月卡', days: 30.4, price: ' ¥29 ' },
      { key: 'year', label: '年卡', days: 365, price: '¥268' },
    ])
    expect(out).toEqual([
      { key: 'month', label: '月卡', days: 30, price: '¥29' },
      { key: 'year', label: '年卡', days: 365, price: '¥268' },
    ])
  })

  it('天数越界钳到 [1,3650]；缺名称/缺标识的行被丢弃', () => {
    const out = normalizeLedgerPlans([
      { key: 'big', label: '超大', days: 99999, price: '' }, // 钳到 3650
      { key: 'zero', label: '零天', days: 0, price: '' }, // 钳到 1
      { key: '', label: '无标识', days: 10, price: '' }, // 缺 key → 丢弃
      { key: 'noname', label: '', days: 10, price: '' }, // 缺 label → 丢弃
    ])
    expect(out).toEqual([
      { key: 'big', label: '超大', days: 3650, price: '' },
      { key: 'zero', label: '零天', days: 1, price: '' },
    ])
  })

  it('key 重复仅保留首条', () => {
    const out = normalizeLedgerPlans([
      { key: 'm', label: '月卡A', days: 30, price: '' },
      { key: 'm', label: '月卡B', days: 60, price: '' },
    ])
    expect(out).toEqual([{ key: 'm', label: '月卡A', days: 30, price: '' }])
  })

  it('全部非法 / 空数组 → 回落默认套餐', () => {
    expect(normalizeLedgerPlans([])).toEqual(LEDGER_PLANS)
    expect(normalizeLedgerPlans([{ key: '', label: '', days: 0, price: '' }])).toEqual(LEDGER_PLANS)
    expect(normalizeLedgerPlans(null)).toEqual(LEDGER_PLANS)
  })
})

describe('genLedgerInviteCode 邀请码', () => {
  it('长度为 8 且字符集排除 B/I/O/0/1', () => {
    for (let i = 0; i < 200; i++) {
      const code = genLedgerInviteCode()
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[ACDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
      expect(code).not.toMatch(/[BIO01]/)
    }
  })
})
