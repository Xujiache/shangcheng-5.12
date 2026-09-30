import { TOKEN_KEY } from '../config'
import { request } from './request'

export type ToolKey = 'triangle' | 'arc' | 'cut' | 'work-log' | 'format' | 'rmb' | 'retire' | 'level' | 'glass' | 'glass-weight' | 'luban' | 'tide'
export type ToolStatus = 'open' | 'success' | 'failure'
type Event = { id: string; tool: ToolKey; status: ToolStatus; occurredAt: string }

const PREFIX = 'ledger_tool_events_v1:'
let flushing = false

function accountId(): string {
  try {
    const token = getApp<IAppOption>()?.globalData?.token || wx.getStorageSync(TOKEN_KEY)
    if (!token) return ''
    const part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = new Uint8Array(wx.base64ToArrayBuffer(part.padEnd(Math.ceil(part.length / 4) * 4, '=')))
    let payload = ''
    bytes.forEach((byte) => { payload += String.fromCharCode(byte) })
    const decoded = JSON.parse(payload)
    return decoded.scope === 'ledger' && typeof decoded.sub === 'string' ? decoded.sub : ''
  } catch { return '' }
}

function key(account: string): string { return PREFIX + account }

function read(account: string): Event[] {
  try {
    const value = wx.getStorageSync(key(account))
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const random = Math.floor(Math.random() * 16)
    return (part === 'x' ? random : (random & 3) | 8).toString(16)
  })
}

/** Only event metadata is persisted. Guest actions never enter the queue. */
export function reportToolEvent(tool: ToolKey, status: ToolStatus): void {
  const account = accountId()
  if (!account) return
  if (['format', 'glass', 'glass-weight'].includes(tool) && status !== 'open') return
  try {
    wx.setStorageSync(key(account), [...read(account), { id: uuid(), tool, status, occurredAt: new Date().toISOString() }])
  } catch { return }
  void flushToolEvents()
}

/** Replay only the currently authenticated account's queue. */
export async function flushToolEvents(): Promise<void> {
  const account = accountId()
  if (!account || flushing) return
  flushing = true
  try {
    while (accountId() === account) {
      const batch = read(account).slice(0, 100)
      if (!batch.length) return
      const result = await request<{ accepted: number }>({
        url: '/l/tools/events', method: 'POST', data: { events: batch }, silent: true,
      })
      if (accountId() !== account || result.accepted !== batch.length) return
      const sent = new Set(batch.map((event) => event.id))
      wx.setStorageSync(key(account), read(account).filter((event) => !sent.has(event.id)))
    }
  } catch {
    // Keep the durable queue for the next foreground or network recovery.
  } finally {
    flushing = false
    const next = accountId()
    if (next && next !== account && read(next).length) void flushToolEvents()
  }
}
