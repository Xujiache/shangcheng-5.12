import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  applyOperation,
  advanceRemaining,
  clone,
  decimal100,
  emptyBook,
  entryAmount,
  localDate,
  lockedIds,
  money,
  Operation,
  product,
  settlementRemaining,
  summary,
  validateBook,
  Workbook,
} from '../miniprogram/utils/workbook/domain'
import { emptyLocal, WorkbookStorage } from '../miniprogram/utils/workbook/storage'
let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log('PASS', name)
}
const worker = {
  name: '张工',
  jobType: '安装',
  phone: '',
  mode: 'day',
  rateFen: 30025,
  status: 'active',
}
const entry = {
  workerId: 'w1',
  projectId: '',
  workDate: '2026-09-09',
  mode: 'day',
  quantity100: 50,
  rateFen: 30025,
  attendance: 'work',
  overtimeQuantity100: 0,
  overtimeRateFen: 0,
  bonusFen: 0,
  subsidyFen: 0,
  deductionFen: 0,
  note: '',
  tags: '',
  attachmentIds: [],
}
let seq = 0
const operation = (b: Workbook, c: string, id: string, value: any): Operation => ({
  id: 'op_' + ++seq,
  at: '2026-09-09T12:00:00.000Z',
  label: 'test',
  changes: [{ collection: c as any, id, baseVersion: b[c as 'workers'][id]?.version || 0, value }],
})
function base() {
  return applyOperation(emptyBook(), {
    id: 'seed',
    at: new Date().toISOString(),
    label: '建档',
    changes: [
      { collection: 'workers', id: 'w1', baseVersion: 0, value: worker },
      { collection: 'entries', id: 'e1', baseVersion: 0, value: entry },
    ],
  })
}
const transfer = {
  workerId: 'w1',
  amountFen: 10000,
  date: '2026-09-09',
  method: '现金',
  note: '',
  state: 'confirmed',
  voidReason: '',
}
const settlement = {
  workerId: 'w1',
  projectId: '',
  from: '2026-09-01',
  to: '2026-09-30',
  entryIds: ['e1'],
  adjustmentIds: [],
  allocations: [],
  state: 'confirmed',
  voidReason: '',
}
test('decimal parsing and integer rounding', () => {
  assert.equal(decimal100('0.01'), 1)
  assert.equal(decimal100('-0.01', true), -1)
  assert.throws(() => decimal100('1.001'))
  assert.throws(() => decimal100('Infinity'))
  assert.equal(product(50, 30025), 15013)
  assert.equal(product(10000000, 1000000), 100000000000)
  assert.equal(money(15013), '¥150.13')
})
test('day/hour/piece/fixed and attendance earnings', () => {
  assert.equal(entryAmount(entry as any), 15013)
  for (const mode of ['hour', 'piece']) assert.equal(entryAmount({ ...entry, mode } as any), 15013)
  assert.equal(entryAmount({ ...entry, mode: 'fixed' } as any), 30025)
  assert.equal(
    entryAmount({
      ...entry,
      attendance: 'rest',
      overtimeQuantity100: 200,
      overtimeRateFen: 1000,
      bonusFen: 500,
    } as any),
    500,
  )
  assert.equal(
    entryAmount({
      ...entry,
      overtimeQuantity100: 125,
      overtimeRateFen: 2000,
      subsidyFen: 100,
      deductionFen: 13,
    } as any),
    17600,
  )
})
test('historical rates do not follow worker changes', () => {
  let b = base()
  b = applyOperation(b, operation(b, 'workers', 'w1', { ...worker, rateFen: 90000 }))
  assert.equal(b.entries.e1.amountFen, 15013)
})
test('strict references, dates, text and prototype-safe IDs', () => {
  const b = base()
  assert.throws(() =>
    applyOperation(b, operation(b, 'entries', 'e2', { ...entry, workerId: 'other' })),
  )
  assert.throws(() =>
    applyOperation(b, operation(b, 'entries', 'e2', { ...entry, workDate: '2026-02-30' })),
  )
  assert.throws(() => applyOperation(b, operation(b, 'workers', '__proto__', worker)))
  assert.throws(() => applyOperation(b, operation(b, 'workers', 'w1', { ...worker, name: ' ' })))
})
test('one entry cannot be settled twice or changed after settlement', () => {
  let b = base()
  b = applyOperation(b, operation(b, 'settlements', 's1', settlement))
  assert.equal(b.settlements.s1.amountFen, 15013)
  assert(lockedIds(b).has('e1'))
  assert.throws(() => applyOperation(b, operation(b, 'settlements', 's2', settlement)))
  assert.throws(() =>
    applyOperation(b, operation(b, 'entries', 'e1', { ...b.entries.e1, quantity100: 100 })),
  )
})
test('advance allocation, partial payments, and overdraft rejection', () => {
  let b = base()
  b = applyOperation(b, operation(b, 'advances', 'a1', transfer))
  b = applyOperation(
    b,
    operation(b, 'settlements', 's1', {
      ...settlement,
      allocations: [{ advanceId: 'a1', amountFen: 6000 }],
    }),
  )
  assert.equal(advanceRemaining(b, 'a1'), 4000)
  assert.equal(settlementRemaining(b, 's1'), 9013)
  b = applyOperation(
    b,
    operation(b, 'payments', 'p1', { ...transfer, settlementId: 's1', amountFen: 5000 }),
  )
  assert.equal(settlementRemaining(b, 's1'), 4013)
  assert.throws(() =>
    applyOperation(
      b,
      operation(b, 'payments', 'p2', { ...transfer, settlementId: 's1', amountFen: 4014 }),
    ),
  )
  assert.throws(() =>
    applyOperation(
      b,
      operation(b, 'advances', 'a1', { ...b.advances.a1, state: 'void', voidReason: '测试' }),
    ),
  )
  assert.throws(() =>
    applyOperation(b, operation(b, 'payments', 'p1', { ...b.payments.p1, amountFen: 1 })),
  )
})
test('void audit preserves original amount and releases locks only after payments void', () => {
  let b = base()
  b = applyOperation(b, operation(b, 'settlements', 's1', settlement))
  b = applyOperation(b, operation(b, 'payments', 'p1', { ...transfer, settlementId: 's1' }))
  assert.throws(() =>
    applyOperation(
      b,
      operation(b, 'settlements', 's1', { ...b.settlements.s1, state: 'void', voidReason: '撤销' }),
    ),
  )
  b = applyOperation(
    b,
    operation(b, 'payments', 'p1', { ...b.payments.p1, state: 'void', voidReason: '错账' }),
  )
  b = applyOperation(
    b,
    operation(b, 'settlements', 's1', { ...b.settlements.s1, state: 'void', voidReason: '重算' }),
  )
  assert.equal(b.settlements.s1.amountFen, 15013)
  b = applyOperation(b, operation(b, 'entries', 'e1', { ...b.entries.e1, quantity100: 100 }))
  assert.equal(b.entries.e1.amountFen, 30025)
  assert.equal(b.settlements.s1.amountFen, 15013)
})
test('signed adjustments enter earnings without mixing units', () => {
  let b = base()
  b = applyOperation(
    b,
    operation(b, 'adjustments', 'x1', {
      workerId: 'w1',
      projectId: '',
      workDate: '2026-09-09',
      amountFen: -13,
      note: '补差',
    }),
  )
  const s = summary(b, { from: '2026-09-01', to: '2026-09-30' })
  assert.equal(s.earned, 15000)
  assert.equal(s.days, 50)
  assert.equal(s.hours, 0)
  assert.equal(s.pieces, 0)
})
test('stale versions reject rather than overwrite', () => {
  const b = base()
  const op = operation(b, 'entries', 'e1', { ...entry, quantity100: 200 })
  const newer = applyOperation(b, op)
  assert.throws(() => applyOperation(newer, op), /版本冲突/)
  assert.equal(b.entries.e1.quantity100, 50)
})
test('deleted rows restored and archive never cascades', () => {
  let b = base()
  b = applyOperation(b, operation(b, 'entries', 'e1', { ...b.entries.e1, deleted: true }))
  assert.equal(summary(b).count, 0)
  b = applyOperation(b, operation(b, 'entries', 'e1', { ...b.entries.e1, deleted: false }))
  b = applyOperation(b, operation(b, 'workers', 'w1', { ...worker, status: 'archived' }))
  assert.equal(summary(b).count, 1)
  assert.throws(() =>
    applyOperation(b, operation(b, 'workers', 'w1', { ...worker, deleted: true })),
  )
})
function storage() {
  const data = new Map<string, any>()
  let fail = ''
  const io = {
    get: (k: string) => clone(data.get(k) || null),
    set: (k: string, v: any) => {
      if (fail && k.includes(fail)) throw Error('disk full')
      data.set(k, clone(v))
    },
    remove: (k: string) => {
      data.delete(k)
    },
  }
  return { data, io, setFail: (s: string) => (fail = s) }
}
test('durable journal survives restart and deduplicates a double click', () => {
  const { io } = storage()
  const repo = new WorkbookStorage(io, 'guest')
  const op = operation(emptyBook(), 'workers', 'w1', worker)
  repo.commit(op)
  repo.commit(op)
  const read = new WorkbookStorage(io, 'guest').read()
  assert.equal(read.history.length, 1)
  assert.equal(read.pending.length, 1)
  assert.equal(read.book.workers.w1.name, '张工')
})
test('failed chunk/head writes preserve the last committed ledger', () => {
  for (const fail of ['chunk', 'head']) {
    const { io, setFail } = storage()
    const repo = new WorkbookStorage(io, 'guest')
    repo.commit(operation(emptyBook(), 'workers', 'w1', worker))
    setFail(fail)
    assert.throws(
      () => repo.commit(operation(repo.read().book, 'workers', 'w2', { ...worker, name: '李工' })),
      /保存失败/,
    )
    setFail('')
    assert.equal(Object.keys(repo.read().book.workers).length, 1)
  }
})
test('guest/account isolation and recoverable previous manifest', () => {
  const { io, data } = storage()
  const repo = new WorkbookStorage(io, 'guest')
  repo.commit(operation(emptyBook(), 'workers', 'w1', worker))
  repo.commit(operation(repo.read().book, 'workers', 'w2', { ...worker, name: '李工' }))
  assert.equal(Object.keys(new WorkbookStorage(io, 'accountA').read().book.workers).length, 0)
  const head = data.get('wb1:guest:head')
  data.set(head.current.chunks[0].key, 'broken')
  const recovered = new WorkbookStorage(io, 'guest')
  assert.equal(Object.keys(recovered.read().book.workers).length, 1)
  assert(recovered.recovered)
})
test('backup validation and mirrored domain stay consistent', () => {
  const b = base()
  validateBook(JSON.parse(JSON.stringify(b)))
  assert.throws(() => validateBook({ ...b, workers: {} }))
  const mp = readFileSync(
    new URL('../miniprogram/utils/workbook/domain.ts', import.meta.url),
    'utf8',
  )
  const server = readFileSync(
    new URL('../../server/src/modules/ledger/workbook/domain.ts', import.meta.url),
    'utf8',
  )
  assert.equal(mp, server)
})
test('local date does not convert to UTC date', () => {
  const d = new Date(2026, 8, 9, 0, 1, 0)
  assert.equal(localDate(d), '2026-09-09')
})
test('10000 offline records retain exact totals and distinct IDs', () => {
  const b = base()
  const op: Operation = {
    id: 'bulk',
    label: 'bulk',
    at: new Date().toISOString(),
    changes: Array.from({ length: 10000 }, (_, i) => ({
      collection: 'entries',
      id: 'bulk_' + i,
      baseVersion: 0,
      value: { ...entry, quantity100: 100, rateFen: 1 },
    })),
  }
  const start = Date.now()
  const result = applyOperation(b, op)
  assert.equal(summary(result).count, 10001)
  assert.equal(summary(result).earned, 25013)
  console.log('10000 records domain ms:', Date.now() - start)
})
console.log(`Workbook checks passed: ${passed}`)
