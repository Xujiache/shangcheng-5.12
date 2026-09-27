export const POLICY_VERSION = '2025-gradual-retirement-v1'
export const STORAGE_KEY = 'ledger_retirement_profile_v1'

const CATEGORIES = {
  male: { baseAgeYears: 60, firstBirthMonth: 1965 * 12, monthsPerDelay: 4, maxDelay: 36 },
  female55: { baseAgeYears: 55, firstBirthMonth: 1970 * 12, monthsPerDelay: 4, maxDelay: 36 },
  female50: { baseAgeYears: 50, firstBirthMonth: 1975 * 12, monthsPerDelay: 2, maxDelay: 60 },
}

function parseToday(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
    ? { year, month }
    : null
}

function monthString(index) {
  const year = Math.floor(index / 12)
  const month = index % 12 + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

function validate(profile, todayISO) {
  const today = parseToday(todayISO)
  if (!today) return { ok: false, error: '请输入有效的今日日期 YYYY-MM-DD', field: 'todayISO' }
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { ok: false, error: '请输入人员资料', field: 'profile' }
  }
  const { birthMonth, category, workType } = profile
  if (typeof birthMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(birthMonth)) {
    return { ok: false, error: '请输入有效的出生年月 YYYY-MM', field: 'birthMonth' }
  }
  const [year, month] = birthMonth.split('-').map(Number)
  if (year < 1900 || year * 12 + month > today.year * 12 + today.month) {
    return { ok: false, error: '出生年月不能早于 1900 年或晚于本月', field: 'birthMonth' }
  }
  if (!Object.hasOwn(CATEGORIES, category) && category !== 'unknown') {
    return { ok: false, error: '请选择有效的人员类别', field: 'category' }
  }
  if (workType !== 'standard' && workType !== 'special') {
    return { ok: false, error: '请选择有效的工作类型', field: 'workType' }
  }
  return { ok: true, profile: { birthMonth, category, workType }, birthIndex: year * 12 + month - 1 }
}

export function calculateRetirement(profile, todayISO) {
  const valid = validate(profile, todayISO)
  if (!valid.ok) return valid
  const normalized = valid.profile
  if (normalized.category === 'unknown' || normalized.workType === 'special') {
    return {
      ok: true,
      status: 'needs-review',
      profile: normalized,
      reasonCode: normalized.category === 'unknown' ? 'category-unknown' : 'special-work',
      policyVersion: POLICY_VERSION,
    }
  }
  const rule = CATEGORIES[normalized.category]
  const delayMonths = Math.min(rule.maxDelay, Math.max(0,
    Math.ceil((valid.birthIndex - rule.firstBirthMonth + 1) / rule.monthsPerDelay)))
  const retirementIndex = valid.birthIndex + rule.baseAgeYears * 12 + delayMonths
  const retirementMonth = monthString(retirementIndex)
  const retirementYear = Math.floor(retirementIndex / 12)
  return {
    ok: true,
    status: 'calculated',
    profile: normalized,
    retirementMonth,
    countdownDate: `${retirementMonth}-01`,
    baseAgeYears: rule.baseAgeYears,
    delayMonths,
    ageYears: rule.baseAgeYears + Math.floor(delayMonths / 12),
    ageMonths: delayMonths % 12,
    minimumContributionMonths: Math.min(240, 180 + Math.max(0, retirementYear - 2029) * 6),
    policyVersion: POLICY_VERSION,
  }
}

export function loadRetirementProfile(storage, todayISO) {
  try {
    if (typeof storage?.getItem !== 'function') return { profile: null, issue: 'unavailable' }
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { profile: null, issue: null }
    let stored
    try { stored = JSON.parse(raw) } catch { return { profile: null, issue: 'invalid' } }
    if (!stored || stored.schemaVersion !== 1 || !stored.profile || typeof stored.profile !== 'object') {
      return { profile: null, issue: 'invalid' }
    }
    const result = calculateRetirement(stored.profile, todayISO)
    return result.ok ? { profile: result.profile, issue: null } : { profile: null, issue: 'invalid' }
  } catch {
    return { profile: null, issue: 'unavailable' }
  }
}

export function saveRetirementProfile(storage, profile, todayISO) {
  const result = calculateRetirement(profile, todayISO)
  if (!result.ok) return { ok: false, error: result.error }
  try {
    if (typeof storage?.setItem !== 'function') throw new Error('storage unavailable')
    storage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      policyVersion: POLICY_VERSION,
      profile: result.profile,
    }))
    return { ok: true }
  } catch {
    return { ok: false, error: '本地保存不可用' }
  }
}

export function clearRetirementProfile(storage) {
  try {
    if (typeof storage?.removeItem !== 'function') throw new Error('storage unavailable')
    storage.removeItem(STORAGE_KEY)
    return { ok: true }
  } catch {
    return { ok: false, error: '本地删除不可用' }
  }
}
