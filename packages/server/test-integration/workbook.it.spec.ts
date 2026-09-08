jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TESTCODE' }))
import { PrismaClient } from '@prisma/client'
import { WorkbookService } from '../src/modules/ledger/workbook/workbook.service'
import { WorkbookController } from '../src/modules/ledger/workbook/workbook.controller'
import { LedgerMembershipGuard } from '../src/modules/ledger/guards/ledger-membership.guard'
import { randomUUID } from 'crypto'
const db = new PrismaClient()
const svc = new WorkbookService(db as any)
const users: string[] = []
const worker = {
  name: '测试工人',
  jobType: '安装',
  phone: '',
  mode: 'day',
  rateFen: 30025,
  status: 'active',
}
const e = {
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
function op(changes: any[], id = randomUUID()) {
  return { id, at: '2026-09-09T12:00:00.000Z', label: 'integration', changes }
}
async function user() {
  const r = await db.ledgerUser.create({ data: { nickname: 'workbook-test-' + randomUUID() } })
  users.push(r.id)
  return r.id
}
afterAll(async () => {
  await db.ledgerUser.deleteMany({ where: { id: { in: users } } })
  await db.$disconnect()
})
test('serializable persistence, operation receipts and conflict rollback', async () => {
  const id = await user()
  const seed = op([
    { collection: 'workers', id: 'w1', baseVersion: 0, value: worker },
    { collection: 'entries', id: 'e1', baseVersion: 0, value: e },
  ])
  const first = await svc.sync(id, seed)
  expect(first.revision).toBe(1)
  expect((await svc.sync(id, seed)).replayed).toBe(true)
  const snap = await svc.snapshot(id)
  expect((snap.book as any).entries.e1.amountFen).toBe(15013)
  expect(snap.applied).toContain(seed.id)
  await expect(svc.sync(id, { ...seed, label: 'different' })).rejects.toThrow('同一操作编号')
  const update = op([
    { collection: 'entries', id: 'e1', baseVersion: 1, value: { ...e, quantity100: 100 } },
  ])
  await svc.sync(id, update)
  await expect(svc.sync(id, op(update.changes))).rejects.toThrow('版本冲突')
  expect((await svc.snapshot(id)).revision).toBe(2)
  const delta = await svc.changes(id, 1)
  expect(delta.changes).toHaveLength(1)
})
test('two simultaneous settlements cannot settle the same record', async () => {
  const id = await user()
  await svc.sync(
    id,
    op([
      { collection: 'workers', id: 'w1', baseVersion: 0, value: worker },
      { collection: 'entries', id: 'e1', baseVersion: 0, value: e },
    ]),
  )
  const s = {
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
  const results = await Promise.allSettled(
    ['s1', 's2'].map((sid) =>
      svc.sync(id, op([{ collection: 'settlements', id: sid, baseVersion: 0, value: s }])),
    ),
  )
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect(Object.keys((await svc.snapshot(id)).book as object)).toContain('settlements')
})
test('account ownership applies to state and private proof downloads', async () => {
  const a = await user(),
    b = await user()
  await svc.sync(a, op([{ collection: 'workers', id: 'w1', baseVersion: 0, value: worker }]))
  await expect(
    svc.sync(b, op([{ collection: 'entries', id: 'e1', baseVersion: 0, value: e }])),
  ).rejects.toThrow('关联记录')
  const buffer = Buffer.from('89504e470d0a1a0a00000000', 'hex')
  await svc.upload(a, 'proof_1', { buffer, size: buffer.length })
  await expect(svc.attachment(b, 'proof_1')).rejects.toThrow('凭证不存在')
  expect((await svc.attachment(a, 'proof_1')).size).toBe(buffer.length)
  await expect(
    svc.upload(a, 'proof_1', {
      buffer: Buffer.concat([buffer, Buffer.from('x')]),
      size: buffer.length + 1,
    }),
  ).rejects.toThrow('不可覆盖')
})
test('legacy backfill preserves original IDs and integer-yuan rounded amount', async () => {
  const id = await user()
  const row = await db.ledgerWorkLog.create({
    data: {
      userId: id,
      workDate: new Date('2026-09-09'),
      workerName: '旧工人',
      unit: 'day',
      quantity: 0.5,
      unitPrice: 301,
      amount: 151,
      note: '历史四舍五入',
    },
  })
  const snap = await svc.snapshot(id)
  expect((snap.book as any).entries[row.id].legacyAmountFen).toBe(15100)
  const again = await svc.snapshot(id)
  expect(Object.keys((again.book as any).entries)).toHaveLength(1)
  const list = await svc.legacyList(id, '2026-09')
  expect(list.list[0].amount).toBe(151)
  expect(list.list[0].id).toBe(row.id)
  await svc.legacyWrite(id, row.id, { quantity: 1 })
  expect((await svc.legacyList(id, '2026-09')).list[0].amount).toBe(301)
})
test('membership is method-scoped: snapshot remains readable after expiry', () => {
  const read = Reflect.getMetadata('__guards__', WorkbookController.prototype.snapshot) || []
  const write = Reflect.getMetadata('__guards__', WorkbookController.prototype.sync) || []
  expect(read).not.toContain(LedgerMembershipGuard)
  expect(write).toContain(LedgerMembershipGuard)
  const guard = new LedgerMembershipGuard()
  expect(() =>
    guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/v1/l/workbook/sync',
          ledgerUser: { membership: { active: false, expired: true } },
        }),
      }),
    } as any),
  ).toThrow()
})
