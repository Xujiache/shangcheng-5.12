import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  POLICY_VERSION, STORAGE_KEY, calculateRetirement,
  loadRetirementProfile, saveRetirementProfile, clearRetirementProfile,
} from './retirement-policy.mjs'

const TODAY = '2026-09-27'
const profile = (birthMonth, category = 'male', workType = 'standard') => ({ birthMonth, category, workType })
const tables = JSON.parse(readFileSync(new URL('./official-table-fixtures.json', import.meta.url), 'utf8'))

for (const [category, count] of [['male', 144], ['female55', 144], ['female50', 120]]) {
  test(`${category}: all ${count} official table birth/retirement month pairs`, () => {
    const rows = tables[category]
    assert.equal(rows.length, count)
    assert.equal(new Set(rows.map(([birth]) => birth)).size, count)
    for (const [birthMonth, retirementMonth] of rows) {
      const result = calculateRetirement(profile(birthMonth, category), TODAY)
      assert.equal(result.ok, true, birthMonth)
      assert.equal(result.status, 'calculated', birthMonth)
      assert.equal(result.retirementMonth, retirementMonth, birthMonth)
      assert.equal(result.countdownDate, `${retirementMonth}-01`, birthMonth)
    }
  })
}

test('first delay, step transitions, and final caps', () => {
  for (const [category, cases] of Object.entries({
    male: [['1964-12', 0, '2024-12'], ['1965-01', 1, '2025-02'], ['1965-04', 1, '2025-05'], ['1965-05', 2, '2025-07'], ['1976-08', 35, '2039-07'], ['1976-09', 36, '2039-09'], ['2000-01', 36, '2063-01']],
    female55: [['1969-12', 0, '2024-12'], ['1970-01', 1, '2025-02'], ['1970-04', 1, '2025-05'], ['1970-05', 2, '2025-07'], ['1981-09', 36, '2039-09'], ['2000-01', 36, '2058-01']],
    female50: [['1974-12', 0, '2024-12'], ['1975-01', 1, '2025-02'], ['1975-02', 1, '2025-03'], ['1975-03', 2, '2025-05'], ['1984-10', 59, '2039-09'], ['1984-11', 60, '2039-11'], ['2000-01', 60, '2055-01']],
  })) {
    for (const [birthMonth, delayMonths, retirementMonth] of cases) {
      const result = calculateRetirement(profile(birthMonth, category), TODAY)
      assert.equal(result.delayMonths, delayMonths, `${category} ${birthMonth}`)
      assert.equal(result.retirementMonth, retirementMonth, `${category} ${birthMonth}`)
      assert.equal(result.ageYears * 12 + result.ageMonths, result.baseAgeYears * 12 + delayMonths)
      assert.equal(result.policyVersion, POLICY_VERSION)
    }
  }
})

test('minimum contribution increases at retirement-year boundaries and caps', () => {
  for (const [birthMonth, retirementYear, months] of [
    ['1968-12', 2029, 180], ['1969-01', 2030, 186],
    ['1970-01', 2031, 192], ['1976-09', 2039, 240], ['1977-01', 2040, 240],
  ]) {
    const result = calculateRetirement(profile(birthMonth), TODAY)
    assert.equal(Number(result.retirementMonth.slice(0, 4)), retirementYear)
    assert.equal(result.minimumContributionMonths, months)
  }
})

test('unknown category and special work require review without an estimated date', () => {
  for (const [input, reasonCode] of [
    [profile('1980-01', 'unknown'), 'category-unknown'],
    [profile('1980-01', 'male', 'special'), 'special-work'],
    [profile('1980-01', 'unknown', 'special'), 'category-unknown'],
  ]) {
    const result = calculateRetirement(input, TODAY)
    assert.deepEqual(result, { ok: true, status: 'needs-review', profile: input, reasonCode, policyVersion: POLICY_VERSION })
    assert.equal('retirementMonth' in result, false)
    assert.equal('minimumContributionMonths' in result, false)
  }
})

test('invalid inputs report the field; future birth month is rejected', () => {
  for (const [input, today, field] of [
    [null, TODAY, 'profile'],
    [profile('1899-12'), TODAY, 'birthMonth'],
    [profile('2000-00'), TODAY, 'birthMonth'],
    [profile('2000-13'), TODAY, 'birthMonth'],
    [profile('2026-10'), TODAY, 'birthMonth'],
    [profile('2000-01', '__proto__'), TODAY, 'category'],
    [profile('2000-01', 'female'), TODAY, 'category'],
    [profile('2000-01', 'male', 'other'), TODAY, 'workType'],
    [profile('2000-01'), '2026-02-30', 'todayISO'],
    [profile('2000-01'), undefined, 'todayISO'],
  ]) {
    const result = calculateRetirement(input, today)
    assert.equal(result.ok, false)
    assert.equal(result.field, field)
    assert.equal(typeof result.error, 'string')
  }
})

function memoryStorage() {
  const entries = new Map([['another-key', 'keep']])
  return {
    entries,
    getItem(key) { return entries.has(key) ? entries.get(key) : null },
    setItem(key, value) { entries.set(key, value) },
    removeItem(key) { entries.delete(key) },
  }
}

test('save stores validated profile only; load revalidates across policy versions', () => {
  const storage = memoryStorage()
  const input = { ...profile('1975-03', 'female50'), extra: 'discard' }
  assert.deepEqual(loadRetirementProfile(storage, TODAY), { profile: null, issue: null })
  assert.deepEqual(saveRetirementProfile(storage, input, TODAY), { ok: true })
  const stored = JSON.parse(storage.getItem(STORAGE_KEY))
  assert.deepEqual(stored, { schemaVersion: 1, policyVersion: POLICY_VERSION, profile: profile('1975-03', 'female50') })
  assert.deepEqual(loadRetirementProfile(storage, TODAY), { profile: profile('1975-03', 'female50'), issue: null })
  stored.policyVersion = 'older-policy'
  stored.retirementMonth = 'wrong-frozen-value'
  storage.setItem(STORAGE_KEY, JSON.stringify(stored))
  assert.deepEqual(loadRetirementProfile(storage, TODAY), { profile: profile('1975-03', 'female50'), issue: null })
  assert.equal(calculateRetirement(loadRetirementProfile(storage, TODAY).profile, TODAY).retirementMonth, '2025-05')
  assert.deepEqual(clearRetirementProfile(storage), { ok: true })
  assert.equal(storage.getItem(STORAGE_KEY), null)
  assert.equal(storage.getItem('another-key'), 'keep')
})

test('corrupt or obsolete storage reports invalid without deleting another key', () => {
  const storage = memoryStorage()
  for (const raw of ['{', 'null', '{}', JSON.stringify({ schemaVersion: 2, profile: profile('1975-01') }), JSON.stringify({ schemaVersion: 1, profile: profile('2026-10') })]) {
    storage.setItem(STORAGE_KEY, raw)
    assert.deepEqual(loadRetirementProfile(storage, TODAY), { profile: null, issue: 'invalid' })
    assert.equal(storage.getItem('another-key'), 'keep')
  }
  assert.equal(saveRetirementProfile(storage, profile('2026-10'), TODAY).ok, false)
})

test('review-needed profiles can be saved and loaded without a calculated date', () => {
  const storage = memoryStorage()
  for (const input of [profile('1980-01', 'unknown'), profile('1980-01', 'female50', 'special')]) {
    assert.deepEqual(saveRetirementProfile(storage, input, TODAY), { ok: true })
    assert.deepEqual(loadRetirementProfile(storage, TODAY), { profile: input, issue: null })
    assert.equal(calculateRetirement(loadRetirementProfile(storage, TODAY).profile, TODAY).status, 'needs-review')
  }
})

test('storage access failures return unavailable or an error', () => {
  const blocked = {
    getItem() { throw new Error('security') },
    setItem() { throw new Error('quota') },
    removeItem() { throw new Error('security') },
  }
  assert.deepEqual(loadRetirementProfile(blocked, TODAY), { profile: null, issue: 'unavailable' })
  assert.equal(saveRetirementProfile(blocked, profile('1965-01'), TODAY).ok, false)
  assert.equal(clearRetirementProfile(blocked).ok, false)
  assert.deepEqual(loadRetirementProfile(null, TODAY), { profile: null, issue: 'unavailable' })
  assert.equal(saveRetirementProfile(null, profile('1965-01'), TODAY).ok, false)
  assert.equal(clearRetirementProfile(null).ok, false)
})
