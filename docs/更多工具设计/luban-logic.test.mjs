import assert from 'node:assert/strict'
import test from 'node:test'
import { RULERS, lookupLength, nearestAuspicious } from './luban-logic.mjs'

test('ruler catalog has 8 × 4 and 10 × 4 labelled cells', () => {
  assert.equal(RULERS.yang.groups.length, 8)
  assert.equal(RULERS.yin.groups.length, 10)
  for (const ruler of Object.values(RULERS)) {
    assert.ok(ruler.groups.every(group => group.items.length === 4))
  }
})

test('units and full-cycle boundaries are exact', () => {
  for (const [value, unit] of [['429', 'mm'], ['42.9', 'cm'], ['0.429', 'm']]) {
    const result = lookupLength(value, unit)
    assert.equal(result.ok, true)
    assert.equal(result.cycleIndex, 1)
    assert.equal(result.withinCycleMm, 0)
    assert.equal(result.group.name, '财')
    assert.equal(result.item.name, '财德')
  }
  assert.equal(lookupLength('428.999').group.name, '本')
  assert.equal(lookupLength('388', 'mm', 'yin').group.name, '丁')
  assert.equal(lookupLength('42.96', 'cm', 'yang', 429.6).cycleIndex, 1)
})

test('subcell boundaries are left-closed and right-open', () => {
  const before = lookupLength('13.406')
  const after = lookupLength('13.407')
  assert.equal(before.item.name, '财德')
  assert.equal(after.item.name, '宝库')
  assert.equal(lookupLength('53.625').group.name, '病')
  assert.equal(lookupLength('38.8', 'cm', 'yin').cycleIndex, 1)
})

test('invalid inputs and invalid ruler configurations fail closed', () => {
  for (const value of ['', '0', '-1', 'abc', '100001', '1.0001']) {
    assert.equal(lookupLength(value).ok, false, value)
  }
  assert.equal(lookupLength('1', 'inch').ok, false)
  assert.equal(lookupLength('1', 'mm', 'unknown').ok, false)
  for (const key of ['__proto__', 'constructor', 'toString']) {
    assert.equal(lookupLength('1', key).ok, false, `unit ${key}`)
    assert.equal(lookupLength('1', 'mm', key).ok, false, `ruler ${key}`)
  }
  assert.equal(lookupLength(`1.${'0'.repeat(10000)}`).ok, false)
  assert.equal(lookupLength('1', 'mm', 'yang', 1).ok, false)
  assert.equal(nearestAuspicious(55, 'yang', { toleranceMm: -1 }).ok, false)
  assert.equal(nearestAuspicious(55, 'yang', { preferredGroups: ['missing'] }).ok, false)
})

test('nearest suggestions stay inside auspicious cells', () => {
  const result = nearestAuspicious(60)
  assert.equal(result.ok, true)
  assert.equal(result.current.group.name, '病')
  assert.equal(result.lower.group.name, '财')
  assert.equal(result.upper.group.name, '义')
  for (const suggestion of [result.lower, result.upper]) {
    assert.ok(suggestion.targetMm >= suggestion.rangeMm.start + 0.999)
    assert.ok(suggestion.targetMm <= suggestion.rangeMm.end - 0.999)
    const actual = lookupLength(suggestion.targetMm)
    assert.equal(actual.group.name, suggestion.group.name)
    assert.equal(actual.item.name, suggestion.item.name)
  }
  assert.equal(nearestAuspicious(60, 'yang', { toleranceMm: 1 }).upper, null)
  assert.equal(nearestAuspicious(60, 'yang', { preferredGroups: ['本'] }).upper.group.name, '本')
})
