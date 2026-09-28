import { calculateRetirement, POLICY_VERSION, RetirementProfile } from './retirement'
export type { RetirementProfile } from './retirement'

export interface ProfileStorage {
  get(key: string): unknown
  set(key: string, value: unknown): void
  remove(key: string): void
}

const PREFIX = 'ledger_retirement_profile_v2:'

function keyFor(accountId: string): string {
  if (typeof accountId !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(accountId)) {
    throw new Error('账号标识无效')
  }
  return PREFIX + accountId
}

export function wxRetirementStorage(): ProfileStorage {
  return {
    get: key => wx.getStorageSync(key),
    set: (key, value) => wx.setStorageSync(key, value),
    remove: key => wx.removeStorageSync(key),
  }
}

export function loadAccountRetirementProfile(storage: ProfileStorage, accountId: string, todayISO: string):
  { profile: RetirementProfile | null; issue: null | 'invalid' | 'unavailable' } {
  let raw: unknown
  try { raw = storage.get(keyFor(accountId)) } catch { return { profile: null, issue: 'unavailable' } }
  if (raw === undefined || raw === null || raw === '') return { profile: null, issue: null }
  try {
    const record = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!record || record.schemaVersion !== 1) return { profile: null, issue: 'invalid' }
    const result = calculateRetirement(record.profile, todayISO)
    return result.ok ? { profile: result.profile as RetirementProfile, issue: null } : { profile: null, issue: 'invalid' }
  } catch { return { profile: null, issue: 'invalid' } }
}

export function saveAccountRetirementProfile(storage: ProfileStorage, accountId: string,
  profile: RetirementProfile, todayISO: string): { ok: boolean; error?: string } {
  const result = calculateRetirement(profile, todayISO)
  if (!result.ok) return { ok: false, error: 'error' in result ? result.error : '人员资料无效' }
  try {
    storage.set(keyFor(accountId), { schemaVersion: 1, policyVersion: POLICY_VERSION, profile: result.profile })
    return { ok: true }
  } catch { return { ok: false, error: '本地保存不可用' } }
}

export function clearAccountRetirementProfile(storage: ProfileStorage, accountId: string): { ok: boolean; error?: string } {
  try { storage.remove(keyFor(accountId)); return { ok: true } }
  catch { return { ok: false, error: '本地删除不可用' } }
}
