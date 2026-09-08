import { API_BASE } from '../../config'
import { getToken, getUser } from '../store'
import { http } from '../request'
import {
  applyOperation,
  Change,
  check,
  clone,
  COLLECTIONS,
  emptyBook,
  Entity,
  Operation,
  validateBook,
  Workbook,
} from './domain'
import { checksum, emptyLocal, LocalState, uid, WorkbookStorage } from './storage'
// Financial chunks use durable files, not the much smaller ordinary key/value cache.
const dataDir = () => wx.env.USER_DATA_PATH + '/workbook-data'
const fileKey = (key: string) => dataDir() + '/' + key.replace(/:/g, '~')
const io = {
  get: (k: string) => {
    if (k.endsWith(':head')) return wx.getStorageSync(k)
    try {
      return wx.getFileSystemManager().readFileSync(fileKey(k), 'utf8')
    } catch {
      return null
    }
  },
  set: (k: string, v: any) => {
    if (k.endsWith(':head')) {
      wx.setStorageSync(k, v)
      return
    }
    const fs = wx.getFileSystemManager()
    try {
      fs.accessSync(dataDir())
    } catch {
      fs.mkdirSync(dataDir(), true)
    }
    fs.writeFileSync(fileKey(k), v, 'utf8')
  },
  remove: (k: string) => {
    if (k.endsWith(':head')) wx.removeStorageSync(k)
    else wx.getFileSystemManager().unlinkSync(fileKey(k))
  },
  keys: () => {
    try {
      return wx
        .getFileSystemManager()
        .readdirSync(dataDir())
        .map((k) => k.replace(/~/g, ':'))
    } catch {
      return [] as string[]
    }
  },
}
export function scope(): string {
  if (!getToken()) return 'guest'
  const user = getUser()
  if (user?.id) return user.id
  try {
    const part = getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = new Uint8Array(
      wx.base64ToArrayBuffer(part.padEnd(Math.ceil(part.length / 4) * 4, '=')),
    )
    let s = ''
    bytes.forEach((b) => (s += String.fromCharCode(b)))
    const p = JSON.parse(s)
    check(p.scope === 'ledger' && p.sub, '登录信息错误')
    return p.sub
  } catch {
    throw new Error('无法识别本机账号，请重新登录；原台账仍保留')
  }
}
export function repository(): WorkbookStorage {
  return new WorkbookStorage(io, scope())
}
export function makeChange(
  collection: Change['collection'],
  value: Partial<Entity>,
  book: Workbook,
): Change {
  const id = value.id || uid(collection.slice(0, 2))
  return {
    collection,
    id,
    baseVersion: book[collection][id]?.version || 0,
    value: { ...value, id, deleted: value.deleted === true },
  }
}
export function saveChanges(label: string, changes: Change[], operationId = uid('op')): LocalState {
  return repository().commit({ id: operationId, at: new Date().toISOString(), label, changes })
}
export function errorText(e: any): string {
  return e?.message || e?.errMsg || '操作未完成，请重试'
}
export function reportError(e: any) {
  wx.showModal({ title: '操作未完成', content: errorText(e), showCancel: false })
}
export function confirm(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) =>
    wx.showModal({
      title,
      content,
      success: (r) => resolve(r.confirm),
      fail: () => resolve(false),
    }),
  )
}
export function ask(title: string, placeholder = ''): Promise<string | null> {
  return new Promise((resolve) =>
    wx.showModal({
      title,
      editable: true,
      placeholderText: placeholder,
      success: (r) => resolve(r.confirm ? r.content || '' : null),
      fail: () => resolve(null),
    }),
  )
}
export async function maybeImportGuest(): Promise<void> {
  if (scope() === 'guest') return
  const guest = new WorkbookStorage(io, 'guest').read()
  if (!Object.keys(guest.book.workers).length) return
  const repo = repository()
  const s = repo.read()
  const fingerprint = checksum(JSON.stringify(guest.book))
  if (s.imported.includes('guest:' + fingerprint)) return
  if (
    !(await confirm(
      '发现本机游客台账',
      '是否将游客台账复制到当前账号？不会删除游客原数据，也不会自动上传云端。',
    ))
  )
    return
  await mergeBackup({ format: 'LWB1', state: guest }, 'guest:' + fingerprint)
}
export interface Backup {
  format: 'LWB1'
  state: LocalState
  blobs?: Record<string, string>
  checksum?: string
}
export function backupPreview(raw: any): { backup: Backup; counts: string; duplicates: number } {
  check(raw?.format === 'LWB1' && raw.state?.schema === 1, '不是受支持的记工备份')
  check(
    raw.checksum === checksum(JSON.stringify({ state: raw.state, blobs: raw.blobs || {} })),
    '备份完整性校验失败，请重新导出',
  )
  validateBook(raw.state.book)
  const current = repository().read()
  let duplicate = 0
  const parts: string[] = []
  for (const c of COLLECTIONS) {
    const list = Object.keys(raw.state.book[c])
    list.forEach((id) => {
      if (current.book[c][id]) duplicate++
    })
    parts.push(`${c}: ${list.length}`)
  }
  return { backup: raw, counts: parts.join('\n'), duplicates: duplicate }
}
export async function mergeBackup(backup: Backup, importId = uid('import')) {
  validateBook(backup.state.book)
  const repo = repository()
  const current = repo.read()
  if (current.imported.includes(importId)) return
  const next = clone(current)
  const additions: Change[] = []
  for (const c of COLLECTIONS)
    for (const id of Object.keys(backup.state.book[c])) {
      const incoming = backup.state.book[c][id]
      const existing = next.book[c][id]
      if (existing) {
        check(
          JSON.stringify({ ...existing, version: 0, updatedAt: '' }) ===
            JSON.stringify({ ...incoming, version: 0, updatedAt: '' }),
          `记录 ${id} 已存在且内容不同，请先导出当前台账，在独立空台账恢复，不能覆盖账目`,
        )
        continue
      }
      next.book[c][id] = { ...clone(incoming), version: 1 }
      additions.push({ collection: c, id, baseVersion: 0, value: next.book[c][id] })
    }
  validateBook(next.book)
  // The whole imported financial graph is one atomic sync operation (up to 20000 changes).
  if (additions.length)
    next.pending.push({
      id: uid('import'),
      at: new Date().toISOString(),
      label: '导入完整备份',
      changes: additions,
    })
  for (const id of Object.keys(backup.blobs || {})) {
    check(!!next.book.attachments[id] && /^[a-zA-Z0-9_-]+$/.test(id), '凭证编号错误')
    // Stage under a new name: a failed import must never overwrite an existing proof.
    const path = `${wx.env.USER_DATA_PATH}/wb-proof-${uid('restore')}`
    const bytes = wx.base64ToArrayBuffer(backup.blobs![id])
    check(bytes.byteLength === next.book.attachments[id].size, '凭证大小校验失败')
    wx.getFileSystemManager().writeFileSync(path, bytes)
    next.files[id] = path
  }
  for (const id of Object.keys(backup.state.files || {}))
    if (!next.files[id] && scope() !== 'guest' && importId.startsWith('guest:'))
      next.files[id] = backup.state.files[id]
  const known = new Set(next.history.map((o) => o.id))
  for (const op of backup.state.history || [])
    if (op && typeof op.id === 'string' && !known.has(op.id) && Array.isArray(op.changes)) {
      next.history.push(op)
      known.add(op.id)
    }
  next.imported.push(importId)
  repo.write(next)
}
let syncing = false
async function pullCloud(
  local: LocalState,
): Promise<{ book: Workbook; revision: number; applied: string[] }> {
  if (!local.cursor) return (await http.get('/l/workbook/snapshot')) as any
  try {
    let book = clone(local.cloudBook)
    let cursor = local.cursor
    const applied: string[] = []
    for (let pages = 0; pages < 1000; pages++) {
      const batch: any = await http.get('/l/workbook/changes', { cursor })
      for (const change of batch.changes) {
        book = applyOperation(book, clone(change.operation))
        applied.push(change.operation.id)
      }
      cursor = batch.cursor
      if (!batch.hasMore) return { book, revision: cursor, applied }
    }
    throw new Error('增量记录过多，改为完整快照')
  } catch {
    return (await http.get('/l/workbook/snapshot')) as any
  }
}
export async function syncWorkbook(manualPull = false): Promise<{ pending: number }> {
  check(scope() !== 'guest', '登录后可使用会员云同步')
  check(!syncing, '正在同步，请稍候')
  syncing = true
  const repo = repository()
  const account = repo.scope
  const still = () => check(scope() === account, '账号已切换，本次同步停止')
  try {
    let local = repo.read()
    check(manualPull || local.cloudEnabled, '请先开启云同步')
    const access: any = await http.get('/l/workbook/access')
    still()
    const snapshot = await pullCloud(local)
    still()
    validateBook(snapshot.book)
    local = repo.read()
    local.pending = local.pending.filter((op) => !(snapshot.applied || []).includes(op.id))
    repo.write(local)
    let working: Workbook = clone(snapshot.book)
    // Rebase only when base versions still agree. Do not silently win conflicts by time.
    const conflicts: string[] = []
    for (const op of local.pending) {
      try {
        working = applyOperation(working, clone(op))
      } catch (e) {
        conflicts.push(`${op.label}：${errorText(e)}`)
      }
    }
    if (conflicts.length) {
      throw new Error(
        `同步冲突，本机与云端均已保留。请在数据管理中导出本机备份后选择云端恢复，或先在原设备处理。\n${conflicts.slice(0, 3).join('\n')}`,
      )
    }
    // Finish uploads before announcing that attachments are safely in the cloud.
    if (access.canWrite && local.cloudEnabled) {
      for (const a of Object.values(working.attachments).filter((x) => !x.deleted))
        if (local.files[a.id]) await uploadProof(a.id, local.files[a.id], still)
      for (const op of local.pending) {
        check(op.changes.length <= 20000, '单次同步最多 20000 条记录')
        const result: any = await http.post('/l/workbook/sync', { operation: op })
        still()
        local = repo.read()
        local.pending = local.pending.filter((x) => x.id !== op.id)
        // Acknowledgements persist independently from subsequent network requests.
        repo.write(local)
      }
    }
    const final = await pullCloud(local)
    still()
    validateBook(final.book)
    local = repo.read()
    working = clone(final.book)
    for (const op of local.pending) working = applyOperation(working, clone(op))
    local.cloudBook = final.book
    local.cursor = final.revision
    local.book = working
    repo.write(local)
    return { pending: local.pending.length }
  } finally {
    syncing = false
  }
}
async function uploadProof(id: string, path: string, still: () => void): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    wx.uploadFile({
      url: `${API_BASE}/api/v1/l/workbook/attachments/${id}`,
      filePath: path,
      name: 'file',
      header: { Authorization: `Bearer ${getToken()}` },
      success: (r) => {
        try {
          still()
          const b = JSON.parse(r.data)
          check(r.statusCode === 200 && b.code === 0, b.message || '凭证上传失败')
          resolve()
        } catch (e) {
          reject(e)
        }
      },
      fail: reject,
    }),
  )
}
export async function proofPath(id: string): Promise<string> {
  const repo = repository()
  const s = repo.read()
  const cached = s.files[id]
  if (cached) {
    try {
      wx.getFileSystemManager().accessSync(cached)
      return cached
    } catch {}
  }
  check(scope() !== 'guest', '本机凭证文件缺失，请从完整备份恢复')
  const p = await new Promise<string>((resolve, reject) =>
    wx.downloadFile({
      url: `${API_BASE}/api/v1/l/workbook/attachments/${id}`,
      header: { Authorization: `Bearer ${getToken()}` },
      success: (r) =>
        r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('凭证下载失败')),
      fail: reject,
    }),
  )
  check(scope() === repo.scope, '账号已切换')
  const path = `${wx.env.USER_DATA_PATH}/wb-proof-${id}`
  wx.getFileSystemManager().copyFileSync(p, path)
  const latest = repo.read()
  latest.files[id] = path
  repo.write(latest)
  return path
}
