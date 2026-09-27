import assert from 'node:assert/strict'
import test from 'node:test'
import { dateCountdown, toRmbUppercase } from './prototype-logic.mjs'

test('RMB uppercase: zero, fractions, and normalized input', () => {
  assert.deepEqual(toRmbUppercase('0'), { ok: true, normalized: '0', uppercase: '零元整' })
  assert.deepEqual(toRmbUppercase('0.05'), { ok: true, normalized: '0.05', uppercase: '零元零伍分' })
  assert.deepEqual(toRmbUppercase('1.01'), { ok: true, normalized: '1.01', uppercase: '壹元零壹分' })
  assert.deepEqual(toRmbUppercase('001,001.50'), { ok: true, normalized: '1001.5', uppercase: '壹仟零壹元伍角' })
})

test('RMB uppercase: internal zeros and large groups', () => {
  assert.equal(toRmbUppercase('100000001').uppercase, '壹亿零壹元整')
  assert.equal(toRmbUppercase('100100010').uppercase, '壹亿零壹拾万零壹拾元整')
  assert.equal(toRmbUppercase('999999999999.99').uppercase, '玖仟玖佰玖拾玖亿玖仟玖佰玖拾玖万玖仟玖佰玖拾玖元玖角玖分')
})

test('RMB uppercase: invalid syntax and range', () => {
  for (const value of ['-1', '1.001', '1,00', '1000000000000', '1e3', '', ' 1', '1.']) {
    assert.equal(toRmbUppercase(value).ok, false, value)
  }
})

test('countdown: leap day and month boundary', () => {
  assert.deepEqual(dateCountdown('2024-03-01', '2024-02-28'), {
    ok: true, years: 0, months: 0, days: 2, totalDays: 2, reached: false,
  })
  assert.deepEqual(dateCountdown('2025-02-28', '2024-02-29'), {
    ok: true, years: 1, months: 0, days: 0, totalDays: 365, reached: false,
  })
  assert.deepEqual(dateCountdown('2025-02-28', '2025-01-31'), {
    ok: true, years: 0, months: 1, days: 0, totalDays: 28, reached: false,
  })
})

test('countdown: same or passed date and invalid dates', () => {
  for (const target of ['2026-09-27', '2026-09-26']) {
    assert.deepEqual(dateCountdown(target, '2026-09-27'), {
      ok: true, years: 0, months: 0, days: 0, totalDays: 0, reached: true,
    })
  }
  for (const [target, today] of [
    ['2025-02-29', '2025-01-01'],
    ['2025-04-31', '2025-01-01'],
    ['2025-01-01', '2025-13-01'],
    ['2025-1-01', '2025-01-01'],
  ]) {
    assert.equal(dateCountdown(target, today).ok, false)
  }
})
