import { getCurrentLedgerAccountId } from '../../../utils/store'
import { MetalInput } from './calc'

export interface MetalRecord {
  id: string
  savedAt: string
  label: string
  input: MetalInput
}
export type RecordKind = 'history' | 'favorites'

function key(kind: RecordKind): string {
  const account = getCurrentLedgerAccountId()
  return account ? `ledger_metal_${kind}_v1:${account}` : ''
}

export function readMetalRecords(kind: RecordKind): MetalRecord[] {
  const storageKey = key(kind)
  if (!storageKey) return []
  try {
    const stored = wx.getStorageSync(storageKey)
    return Array.isArray(stored) ? stored.slice(0, 200) : []
  } catch {
    return []
  }
}

export function saveMetalRecord(kind: RecordKind, record: MetalRecord): boolean {
  const storageKey = key(kind)
  if (!storageKey) return false
  try {
    const rows = [record, ...readMetalRecords(kind).filter((item) => item.id !== record.id)].slice(
      0,
      200,
    )
    wx.setStorageSync(storageKey, rows)
    return true
  } catch {
    return false
  }
}

export function deleteMetalRecord(kind: RecordKind, id: string): boolean {
  const storageKey = key(kind)
  if (!storageKey) return false
  try {
    wx.setStorageSync(
      storageKey,
      readMetalRecords(kind).filter((item) => item.id !== id),
    )
    return true
  } catch {
    return false
  }
}
