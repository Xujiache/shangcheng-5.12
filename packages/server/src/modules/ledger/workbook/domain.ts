/** Platform-independent workbook contract. Mirrored to server by scripts/workbook-contract.mjs. */
export const COLLECTIONS = [
  'workers',
  'projects',
  'entries',
  'adjustments',
  'advances',
  'settlements',
  'payments',
  'templates',
  'attachments',
] as const
export type Collection = (typeof COLLECTIONS)[number]
export type PayMode = 'day' | 'hour' | 'piece' | 'fixed'
export interface Entity {
  id: string
  version: number
  deleted: boolean
  updatedAt: string
  [key: string]: any
}
export interface Worker extends Entity {
  name: string
  jobType: string
  phone: string
  mode: PayMode
  rateFen: number
  status: string
}
export interface Project extends Entity {
  name: string
  address: string
  contact: string
  startDate: string
  status: string
}
export interface Entry extends Entity {
  workerId: string
  projectId: string
  workDate: string
  mode: PayMode
  quantity100: number
  rateFen: number
  attendance: string
  overtimeQuantity100: number
  overtimeRateFen: number
  bonusFen: number
  subsidyFen: number
  deductionFen: number
  amountFen: number
  note: string
  tags: string
  attachmentIds: string[]
  legacyAmountFen?: number
}
export interface Adjustment extends Entity {
  workerId: string
  projectId: string
  workDate: string
  amountFen: number
  note: string
}
export interface Settlement extends Entity {
  workerId: string
  projectId: string
  from: string
  to: string
  entryIds: string[]
  adjustmentIds: string[]
  allocations: Array<{ advanceId: string; amountFen: number }>
  amountFen: number
  state: 'confirmed' | 'void'
  voidReason: string
}
export interface Transfer extends Entity {
  workerId: string
  settlementId?: string
  amountFen: number
  date: string
  method: string
  note: string
  state: 'confirmed' | 'void'
  voidReason: string
}
export type Workbook = Record<Collection, Record<string, Entity>>
export interface Change {
  collection: Collection
  id: string
  baseVersion: number
  value: Record<string, any>
}
export interface Operation {
  id: string
  at: string
  label: string
  changes: Change[]
}
const MAX_MONEY = 1_000_000_000_000
const ID = /^(?!__proto__$|constructor$|prototype$)[a-zA-Z0-9_-]{1,100}$/
export function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message)
}
export function emptyBook(): Workbook {
  const b: any = {}
  COLLECTIONS.forEach((k) => (b[k] = {}))
  return b
}
export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}
export function rows<T extends Entity = Entity>(
  book: Workbook,
  name: Collection,
  deleted = false,
): T[] {
  return Object.keys(book[name])
    .map((id) => book[name][id] as T)
    .filter((r) => r.deleted === deleted)
}
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function validDate(s: unknown): boolean {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    y >= 1900 &&
    y <= 2199 &&
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}
export function decimal100(value: unknown, signed = false): number {
  const s = String(value == null || value === '' ? '0' : value).trim()
  check(
    (signed ? /^-?\d{1,10}(\.\d{1,2})?$/ : /^\d{1,10}(\.\d{1,2})?$/).test(s),
    '请输入最多两位小数的有效数字',
  )
  const negative = s[0] === '-'
  const [whole, part = ''] = s.replace('-', '').split('.')
  const n = Number(whole) * 100 + Number(part.padEnd(2, '0'))
  check(Number.isSafeInteger(n) && n <= MAX_MONEY, '金额或数量超出范围')
  return negative ? -n : n
}
export function money(n: number): string {
  return `¥${(n / 100).toFixed(2)}`
}
export function quantity(n: number): string {
  return (n / 100)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}
export const MODE_LABEL: Record<string, string> = {
  day: '工天',
  hour: '工时',
  piece: '件',
  fixed: '包工',
}
function integer(v: any, label: string, max = MAX_MONEY, min = 0): number {
  check(Number.isSafeInteger(v) && v >= min && v <= max, `${label}超出范围`)
  return v
}
function text(v: any, max: number, required = false): string {
  check(typeof v === 'string' && v.length <= max && (!required || !!v.trim()), '文本为空或过长')
  return v.trim()
}
function ids(v: any, max = 10000): string[] {
  check(
    Array.isArray(v) &&
      v.length <= max &&
      v.every((x) => typeof x === 'string' && ID.test(x)) &&
      new Set(v).size === v.length,
    '关联编号无效或重复',
  )
  return v
}
function ref(book: Workbook, c: Collection, id: string): Entity {
  const r = book[c][id]
  check(r && !r.deleted, '关联记录不存在或已删除')
  return r
}
export function product(q: number, p: number): number {
  integer(q, '数量', 10_000_000)
  integer(p, '单价', MAX_MONEY)
  const n = Math.floor(q / 100) * p + Math.floor(((q % 100) * p + 50) / 100)
  return integer(n, '工资')
}
export function entryAmount(e: Entity): number {
  const base =
    e.attendance === 'work'
      ? e.mode === 'fixed'
        ? e.rateFen
        : product(e.quantity100, e.rateFen)
      : 0
  const overtime = e.attendance === 'work' ? product(e.overtimeQuantity100, e.overtimeRateFen) : 0
  return integer(
    base + overtime + e.bonusFen + e.subsidyFen - e.deductionFen,
    '应计工资',
    MAX_MONEY,
    -MAX_MONEY,
  )
}
const FIELDS: Record<Collection, string[]> = {
  workers: ['name', 'jobType', 'phone', 'mode', 'rateFen', 'status'],
  projects: ['name', 'address', 'contact', 'startDate', 'status'],
  entries: [
    'workerId',
    'projectId',
    'workDate',
    'mode',
    'quantity100',
    'rateFen',
    'attendance',
    'overtimeQuantity100',
    'overtimeRateFen',
    'bonusFen',
    'subsidyFen',
    'deductionFen',
    'note',
    'tags',
    'attachmentIds',
    'legacyAmountFen',
  ],
  adjustments: ['workerId', 'projectId', 'workDate', 'amountFen', 'note'],
  advances: ['workerId', 'amountFen', 'date', 'method', 'note', 'state', 'voidReason'],
  settlements: [
    'workerId',
    'projectId',
    'from',
    'to',
    'entryIds',
    'adjustmentIds',
    'allocations',
    'state',
    'voidReason',
  ],
  payments: [
    'workerId',
    'settlementId',
    'amountFen',
    'date',
    'method',
    'note',
    'state',
    'voidReason',
  ],
  templates: ['name', 'workerIds', 'projectId', 'input'],
  attachments: ['name', 'mime', 'size'],
}
function normalize(
  collection: Collection,
  input: any,
  old: Entity | undefined,
  id: string,
  at: string,
): Entity {
  check(input && typeof input === 'object' && !Array.isArray(input), '记录格式错误')
  const out: any = {
    id,
    version: (old?.version || 0) + 1,
    deleted: input.deleted === true,
    updatedAt: at,
  }
  for (const f of FIELDS[collection]) if (input[f] !== undefined) out[f] = clone(input[f])
  // Voided imported statements are historical evidence only, never payable balances.
  if (collection === 'settlements' && input.state === 'void')
    out.amountFen = integer(input.amountFen, '原结算金额')
  // Legacy amount is immutable, and may only originate from trusted migration.
  if (collection === 'entries') {
    if (old?.legacyAmountFen !== undefined) out.legacyAmountFen = old.legacyAmountFen
    else delete out.legacyAmountFen
  }
  return out
}
export function validateBook(b: Workbook) {
  check(b && typeof b === 'object', '台账格式错误')
  for (const c of COLLECTIONS) {
    check(b[c] && typeof b[c] === 'object' && !Array.isArray(b[c]), '台账结构不完整')
    for (const id of Object.keys(b[c])) {
      const r = b[c][id]
      check(
        ID.test(id) &&
          r &&
          r.id === id &&
          Number.isSafeInteger(r.version) &&
          r.version > 0 &&
          typeof r.deleted === 'boolean',
        '记录编号或版本错误',
      )
    }
  }
  for (const w of rows(b, 'workers')) {
    text(w.name, 40, true)
    text(w.jobType, 40)
    text(w.phone, 40)
    check(['day', 'hour', 'piece', 'fixed'].includes(w.mode), '计薪方式错误')
    integer(w.rateFen, '默认单价', MAX_MONEY)
    check(['active', 'archived'].includes(w.status), '人员状态错误')
  }
  for (const p of rows(b, 'projects')) {
    text(p.name, 60, true)
    text(p.address, 200)
    text(p.contact, 100)
    check(!p.startDate || validDate(p.startDate), '开工日期错误')
    check(['active', 'archived'].includes(p.status), '工地状态错误')
  }
  for (const a of rows(b, 'attachments')) {
    text(a.name, 100, true)
    check(['image/jpeg', 'image/png', 'image/webp'].includes(a.mime), '只支持图片凭证')
    integer(a.size, '图片大小', 5 * 1024 * 1024, 1)
  }
  for (const e of [...rows(b, 'entries'), ...rows(b, 'adjustments')]) {
    ref(b, 'workers', e.workerId)
    if (e.projectId) ref(b, 'projects', e.projectId)
    check(validDate(e.workDate), '记工日期错误')
    text(e.note, 500)
    if ('mode' in e) {
      check(['day', 'hour', 'piece', 'fixed'].includes(e.mode), '计薪方式错误')
      check(['work', 'rest', 'leave', 'absent'].includes(e.attendance), '出勤状态错误')
      integer(
        e.quantity100,
        '数量',
        10_000_000,
        e.attendance === 'work' && e.mode !== 'fixed' ? 1 : 0,
      )
      integer(e.rateFen, '单价', MAX_MONEY)
      integer(e.overtimeQuantity100, '加班工时', 10_000_000)
      integer(e.overtimeRateFen, '加班时薪', MAX_MONEY)
      for (const k of ['bonusFen', 'subsidyFen', 'deductionFen']) integer(e[k], k)
      text(e.tags, 100)
      ids(e.attachmentIds, 9).forEach((id) => ref(b, 'attachments', id))
      e.amountFen =
        e.legacyAmountFen === undefined
          ? entryAmount(e)
          : integer(e.legacyAmountFen, '历史金额', MAX_MONEY, -MAX_MONEY)
    } else {
      integer(e.amountFen, '补差金额', MAX_MONEY, -MAX_MONEY)
      text(e.note, 500, true)
    }
  }
  for (const t of rows(b, 'templates')) {
    text(t.name, 60, true)
    ids(t.workerIds, 100).forEach((id) => ref(b, 'workers', id))
    if (t.projectId) ref(b, 'projects', t.projectId)
    check(
      t.input && typeof t.input === 'object' && JSON.stringify(t.input).length <= 4000,
      '模板格式错误',
    )
  }
  for (const a of [...rows(b, 'advances'), ...rows(b, 'payments')]) {
    ref(b, 'workers', a.workerId)
    integer(a.amountFen, '付款金额', MAX_MONEY, 1)
    check(validDate(a.date), '付款日期错误')
    text(a.method, 30, true)
    text(a.note, 500)
    check(['confirmed', 'void'].includes(a.state), '付款状态错误')
    text(a.voidReason, 200, a.state === 'void')
  }
  const locked = new Set<string>()
  const used: Record<string, number> = {}
  for (const s of rows(b, 'settlements')) {
    ref(b, 'workers', s.workerId)
    if (s.projectId) ref(b, 'projects', s.projectId)
    check(validDate(s.from) && validDate(s.to) && s.from <= s.to, '结算日期范围错误')
    check(['confirmed', 'void'].includes(s.state), '结算状态错误')
    text(s.voidReason, 200, s.state === 'void')
    ids(s.entryIds)
    ids(s.adjustmentIds)
    check(s.entryIds.length + s.adjustmentIds.length > 0, '请选择待结算记录')
    check(Array.isArray(s.allocations) && s.allocations.length <= 1000, '借支抵扣格式错误')
    let total = 0
    for (const c of ['entries', 'adjustments'] as Collection[])
      for (const id of c === 'entries' ? s.entryIds : s.adjustmentIds) {
        const e = b[c][id]
        check(e && e.workerId === s.workerId, '结算人员不一致')
        if (s.state === 'confirmed') {
          check(
            !e.deleted &&
              e.workDate >= s.from &&
              e.workDate <= s.to &&
              (!s.projectId || e.projectId === s.projectId),
            '结算记录不在筛选范围',
          )
          check(!locked.has(c + id), '同一记录不能重复结算')
          locked.add(c + id)
        }
        total += e.amountFen
      }
    if (s.state === 'confirmed') s.amountFen = integer(total, '结算工资', MAX_MONEY, 0)
    else if (!Number.isSafeInteger(s.amountFen)) s.amountFen = total
    let offset = 0
    const seen = new Set<string>()
    for (const allocation of s.allocations) {
      const a = b.advances[allocation.advanceId]
      check(a && a.workerId === s.workerId, '借支人员不一致')
      check(!seen.has(a.id), '重复借支抵扣')
      seen.add(a.id)
      integer(allocation.amountFen, '抵扣金额', MAX_MONEY, 1)
      if (s.state === 'confirmed') {
        check(!a.deleted && a.state === 'confirmed', '借支已作废')
        used[a.id] = (used[a.id] || 0) + allocation.amountFen
        check(used[a.id] <= a.amountFen, '借支不能超额抵扣')
        offset += allocation.amountFen
      }
    }
    if (s.state === 'confirmed') check(offset <= s.amountFen, '抵扣不能超过结算金额')
  }
  const paid: Record<string, number> = {}
  for (const p of rows(b, 'payments')) {
    const s = ref(b, 'settlements', p.settlementId)
    check(s.workerId === p.workerId, '发薪人员不一致')
    if (p.state === 'confirmed') {
      check(s.state === 'confirmed', '请先作废该结算的有效付款')
      paid[s.id] = (paid[s.id] || 0) + p.amountFen
      check(
        paid[s.id] + s.allocations.reduce((n: number, a: any) => n + a.amountFen, 0) <= s.amountFen,
        '付款不能超过待付余额，多付请记为借支',
      )
    }
  }
}
export function applyOperation(source: Workbook, op: Operation): Workbook {
  check(
    op && ID.test(op.id) && typeof op.at === 'string' && Number.isFinite(Date.parse(op.at)),
    '操作编号或时间错误',
  )
  text(op.label, 100, true)
  check(
    Array.isArray(op.changes) && op.changes.length > 0 && op.changes.length <= 20000,
    '单次最多修改 20000 条',
  )
  const b = clone(source)
  const seen = new Set<string>()
  for (const c of op.changes) {
    check(COLLECTIONS.includes(c.collection) && ID.test(c.id), '记录类型或编号错误')
    check(!seen.has(c.collection + c.id), '同一次操作重复修改记录')
    seen.add(c.collection + c.id)
    const old = b[c.collection][c.id]
    check((old?.version || 0) === c.baseVersion, `版本冲突：${c.collection}/${c.id}`)
    if (old && ['payments', 'advances', 'settlements'].includes(c.collection)) {
      check(
        !c.value.deleted && old.state === 'confirmed' && c.value.state === 'void',
        '财务记录不可覆盖或删除，请作废后重新记账',
      )
      const before: any = clone(old)
      const after: any = { ...before, state: 'void', voidReason: c.value.voidReason }
      for (const f of FIELDS[c.collection])
        if (f !== 'state' && f !== 'voidReason')
          check(JSON.stringify(c.value[f]) === JSON.stringify(old[f]), '作废不能修改原财务数据')
      c.value = after
    }
    if (old && ['entries', 'adjustments'].includes(c.collection)) {
      const locked = rows(b, 'settlements').some(
        (s) =>
          s.state === 'confirmed' &&
          (c.collection === 'entries' ? s.entryIds : s.adjustmentIds).includes(c.id),
      )
      check(!locked, '该记录已结算，请记补差或先撤销结算')
      // Editing a migrated record switches to the new calculation only after explicit edit.
    }
    if (c.value.deleted && ['workers', 'projects'].includes(c.collection))
      check(false, '人员和工地请使用归档，不允许删除')
    const next = normalize(c.collection, c.value, old, c.id, op.at)
    if (c.collection === 'settlements' && old) next.amountFen = old.amountFen
    if (
      c.collection === 'entries' &&
      old?.legacyAmountFen !== undefined &&
      !c.value.deleted &&
      JSON.stringify(
        FIELDS.entries.filter((k) => k !== 'legacyAmountFen').map((k) => c.value[k]),
      ) !== JSON.stringify(FIELDS.entries.filter((k) => k !== 'legacyAmountFen').map((k) => old[k]))
    )
      delete next.legacyAmountFen
    b[c.collection][c.id] = next
  }
  validateBook(b)
  return b
}
export function lockedIds(b: Workbook): Set<string> {
  const out = new Set<string>()
  rows(b, 'settlements')
    .filter((s) => s.state === 'confirmed')
    .forEach((s) => [...s.entryIds, ...s.adjustmentIds].forEach((id) => out.add(id)))
  return out
}
export function advanceRemaining(b: Workbook, id: string): number {
  const a = b.advances[id]
  if (!a || a.deleted || a.state === 'void') return 0
  return (
    a.amountFen -
    rows(b, 'settlements')
      .filter((s) => s.state === 'confirmed')
      .reduce(
        (n, s) =>
          n +
          s.allocations
            .filter((x: any) => x.advanceId === id)
            .reduce((v: number, x: any) => v + x.amountFen, 0),
        0,
      )
  )
}
export function settlementRemaining(b: Workbook, id: string): number {
  const s = b.settlements[id]
  if (!s || s.deleted || s.state === 'void') return 0
  return (
    s.amountFen -
    s.allocations.reduce((n: number, a: any) => n + a.amountFen, 0) -
    rows(b, 'payments')
      .filter((p) => p.state === 'confirmed' && p.settlementId === id)
      .reduce((n, p) => n + p.amountFen, 0)
  )
}
export interface Filter {
  from?: string
  to?: string
  workerId?: string
  projectId?: string
  jobType?: string
  status?: string
  search?: string
}
export function filteredEntries(b: Workbook, f: Filter = {}): Entity[] {
  const locked = lockedIds(b)
  return rows(b, 'entries')
    .filter(
      (e) =>
        (!f.from || e.workDate >= f.from) &&
        (!f.to || e.workDate <= f.to) &&
        (!f.workerId || e.workerId === f.workerId) &&
        (!f.projectId || e.projectId === f.projectId) &&
        (!f.jobType || b.workers[e.workerId]?.jobType === f.jobType) &&
        (!f.status || (f.status === 'settled' ? locked.has(e.id) : !locked.has(e.id))) &&
        (!f.search ||
          [b.workers[e.workerId]?.name, b.projects[e.projectId]?.name, e.note, e.tags]
            .join(' ')
            .includes(f.search)),
    )
    .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.updatedAt.localeCompare(a.updatedAt))
}
export function summary(b: Workbook, f: Filter = {}) {
  const es = filteredEntries(b, f)
  const match = (r: Entity) => !f.workerId || r.workerId === f.workerId
  const date = (d: string) => (!f.from || d >= f.from) && (!f.to || d <= f.to)
  const adjustments = rows(b, 'adjustments').filter(
    (r) => match(r) && date(r.workDate) && (!f.projectId || r.projectId === f.projectId),
  )
  const settlements = rows(b, 'settlements').filter(
    (s) => match(s) && s.state === 'confirmed' && (!f.projectId || s.projectId === f.projectId),
  )
  return {
    count: es.length,
    earned:
      es.reduce((n, e) => n + e.amountFen, 0) + adjustments.reduce((n, e) => n + e.amountFen, 0),
    days: es
      .filter((e) => e.mode === 'day' && e.attendance === 'work')
      .reduce((n, e) => n + e.quantity100, 0),
    hours: es.reduce(
      (n, e) =>
        n +
        (e.mode === 'hour' && e.attendance === 'work' ? e.quantity100 : 0) +
        (e.attendance === 'work' ? e.overtimeQuantity100 : 0),
      0,
    ),
    pieces: es
      .filter((e) => e.mode === 'piece' && e.attendance === 'work')
      .reduce((n, e) => n + e.quantity100, 0),
    settled: settlements.reduce((n, s) => n + s.amountFen, 0),
    due: settlements.reduce((n, s) => n + settlementRemaining(b, s.id), 0),
    paid: rows(b, 'payments')
      .filter(
        (p) =>
          match(p) &&
          p.state === 'confirmed' &&
          date(p.date) &&
          (!f.projectId || b.settlements[p.settlementId]?.projectId === f.projectId),
      )
      .reduce((n, p) => n + p.amountFen, 0),
    advance: rows(b, 'advances')
      .filter(match)
      .reduce((n, a) => n + advanceRemaining(b, a.id), 0),
  }
}
