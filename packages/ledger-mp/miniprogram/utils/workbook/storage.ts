import {
  applyOperation,
  check,
  clone,
  emptyBook,
  Operation,
  validateBook,
  Workbook,
} from './domain'

export interface StorageIO {
  get(key: string): any
  set(key: string, value: any): void
  remove(key: string): void
  keys?(): string[]
}
export interface LocalState {
  schema: 1
  book: Workbook
  pending: Operation[]
  history: Operation[]
  applied: string[]
  cloudEnabled: boolean
  cursor: number
  cloudBook: Workbook
  files: Record<string, string>
  imported: string[]
}
export function emptyLocal(): LocalState {
  return {
    schema: 1,
    book: emptyBook(),
    pending: [],
    history: [],
    applied: [],
    cloudEnabled: false,
    cursor: 0,
    cloudBook: emptyBook(),
    files: {},
    imported: [],
  }
}
export function checksum(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
export function uid(prefix = 'r'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 8)}`
}
interface Manifest {
  chunks: Array<{ key: string; hash: string }>
  hash: string
}
/** Immutable chunks + one committed head: an interrupted write cannot replace the last good ledger. */
export class WorkbookStorage {
  private prefix: string
  recovered = false
  constructor(
    private io: StorageIO,
    readonly scope: string,
  ) {
    check(/^[a-zA-Z0-9_-]{1,120}$/.test(scope), '账号标识无效')
    this.prefix = `wb1:${scope}:`
  }
  private readManifest(m: Manifest): LocalState {
    check(m && Array.isArray(m.chunks), '本地台账索引损坏')
    const raw = m.chunks
      .map((c) => {
        const s = this.io.get(c.key)
        check(typeof s === 'string' && checksum(s) === c.hash, '本地台账分块损坏')
        return s
      })
      .join('')
    check(checksum(raw) === m.hash, '本地台账校验失败')
    const s = JSON.parse(raw) as LocalState
    check(
      s.schema === 1 &&
        Array.isArray(s.pending) &&
        Array.isArray(s.history) &&
        Array.isArray(s.applied) &&
        Array.isArray(s.imported) &&
        s.files &&
        s.cloudBook,
      '本地台账版本不支持',
    )
    validateBook(s.book)
    validateBook(s.cloudBook)
    return s
  }
  read(): LocalState {
    const head = this.io.get(this.prefix + 'head')
    if (!head) return emptyLocal()
    try {
      return this.readManifest(head.current)
    } catch (e) {
      if (head.previous) {
        const s = this.readManifest(head.previous)
        this.recovered = true
        return s
      }
      throw e
    }
  }
  write(state: LocalState): void {
    validateBook(state.book)
    const raw = JSON.stringify(state)
    const old = this.io.get(this.prefix + 'head')
    // Clean only this ledger's abandoned pre-commit chunks after a killed process.
    if (this.io.keys) {
      const keep = new Set(
        [...(old?.current?.chunks || []), ...(old?.previous?.chunks || [])].map((c: any) => c.key),
      )
      for (const key of this.io.keys())
        if (key.startsWith(this.prefix + 'chunk_') && !keep.has(key)) {
          try {
            this.io.remove(key)
          } catch {}
        }
    }
    // Do not silently evict financial records or count a cache failure as successful save.
    const created: string[] = []
    const m: Manifest = { chunks: [], hash: checksum(raw) }
    try {
      for (let i = 0; i < raw.length; i += 64000) {
        const chunk = raw.slice(i, i + 64000)
        const previous = old?.current?.chunks[i / 64000]
        if (previous && this.io.get(previous.key) === chunk) {
          m.chunks.push(previous)
          continue
        }
        const key = this.prefix + uid('chunk')
        this.io.set(key, chunk)
        created.push(key)
        check(this.io.get(key) === chunk, '本地写入校验失败')
        m.chunks.push({ key, hash: checksum(chunk) })
      }
      this.io.set(this.prefix + 'head', { current: m, previous: old?.current || null })
    } catch (e) {
      created.forEach((k) => {
        try {
          this.io.remove(k)
        } catch {}
      })
      throw new Error('本机保存失败，原台账未覆盖。请释放存储空间后重试。')
    }
    const keep = new Set([...m.chunks, ...(old?.current?.chunks || [])].map((c) => c.key))
    for (const c of old?.previous?.chunks || [])
      if (!keep.has(c.key)) {
        try {
          this.io.remove(c.key)
        } catch {}
      }
  }
  commit(op: Operation): LocalState {
    const state = this.read()
    if (state.applied.includes(op.id)) return state
    state.book = applyOperation(state.book, clone(op))
    state.pending.push(op)
    state.history.push(op)
    state.applied.push(op.id)
    this.write(state)
    return state
  }
}
