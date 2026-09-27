import assert from 'node:assert/strict'
import test from 'node:test'
import { RULERS, lookupLength, nearestAuspicious, nearbyAuspicious } from './luban-logic.mjs'

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

test('nearby integer suggestions reproduce the 1975 mm two-ruler sample', () => {
  const result = nearbyAuspicious(1975)
  assert.equal(result.ok, true)
  assert.equal(result.current.group.name, '官')
  assert.deepEqual(result.items.slice(0, 5).map(entry => entry.targetMm), [1975, 1974, 1976, 1973, 1977])
  for (const entry of result.items.slice(0, 5)) {
    assert.equal(entry.yang.group.name, '官')
    assert.equal(entry.yang.item.name, '富贵')
    assert.equal(entry.yin.group.name, '丁')
    assert.equal(entry.yin.item.name, '登科')
    assert.equal(entry.group.name, entry.yang.group.name)
    assert.equal(entry.item.name, entry.yang.item.name)
  }
  assert.equal(new Set(result.items.map(entry => entry.targetMm)).size, result.items.length)
  assert.deepEqual(result.items.map(entry => Math.abs(entry.deltaMm)), [...result.items.map(entry => Math.abs(entry.deltaMm))].sort((a, b) => a - b))
})

test('nearby suggestions respect bounds, filters and both-ruler safe insets', () => {
  assert.deepEqual(nearbyAuspicious(1975, 'yang', { toleranceMm: 0 }).items.map(entry => entry.targetMm), [1975])
  assert.deepEqual(nearbyAuspicious(1975, 'yang', { toleranceMm: 2, limit: 3 }).items.map(entry => entry.targetMm), [1975, 1974, 1976])
  assert.deepEqual(nearbyAuspicious(1975, 'yang', { toleranceMm: 30, preferredGroups: ['本'] }).items, [])
  const single = nearbyAuspicious(1975)
  const both = nearbyAuspicious(1975, 'yang', { requireBoth: true })
  assert.ok(single.items.some(entry => entry.targetMm === 1979 && !entry.yin.group.auspicious))
  assert.ok(!both.items.some(entry => entry.targetMm === 1979))
  for (const [ruleId, options] of [['yang', {}], ['yin', { requireBoth: true }],
    ['yang', { customCycleMm: 429.6, otherCycleMm: 388.4, requireBoth: true }]]) {
    const result = nearbyAuspicious(1975, ruleId, { toleranceMm: 300, limit: 2001, ...options })
    assert.equal(result.ok, true)
    for (const entry of result.items) {
      assert.ok(Number.isInteger(entry.targetMm) && entry.targetMm > 0 && entry.targetMm <= 100000)
      assert.ok(Math.abs(entry.deltaMm) <= 300)
      assert.equal(entry[ruleId].group.auspicious, true)
      for (const resultId of options.requireBoth ? ['yang', 'yin'] : [ruleId]) {
        const rulerResult = entry[resultId]
        assert.equal(rulerResult.group.auspicious, true)
        const inset = Math.min(1, (rulerResult.rangeMm.end - rulerResult.rangeMm.start) / 4)
        assert.ok(entry.targetMm + 1e-8 >= rulerResult.rangeMm.start + inset)
        assert.ok(entry.targetMm - 1e-8 <= rulerResult.rangeMm.end - inset)
      }
    }
    if (options.customCycleMm) {
      assert.equal(result.items[0].yang.cycleMm, options.customCycleMm)
      assert.equal(result.items[0].yin.cycleMm, options.otherCycleMm)
    }
  }
  assert.equal(nearbyAuspicious(1, 'yang', { toleranceMm: 1000, limit: 2001 }).items.every(entry => entry.targetMm > 0), true)
  assert.equal(nearbyAuspicious(100000, 'yang', { toleranceMm: 1000, limit: 2001 }).items.every(entry => entry.targetMm <= 100000), true)
})

test('nearby suggestions reject invalid options', () => {
  for (const options of [null, [], { toleranceMm: -1 }, { toleranceMm: 1001 }, { toleranceMm: Infinity },
    { toleranceMm: '30' }, { limit: 0 }, { limit: 1.5 }, { limit: 2002 }, { requireBoth: 1 },
    { preferredGroups: '官' }, { preferredGroups: ['unknown'] }, { preferredGroups: ['官', '官'] },
    { customCycleMm: 1 }, { otherCycleMm: 1 }, { unknown: true }]) {
    assert.equal(nearbyAuspicious(1975, 'yang', options).ok, false, JSON.stringify(options))
  }
  assert.equal(nearbyAuspicious(100001).ok, false)
  assert.equal(nearbyAuspicious(1975, 'invalid').ok, false)
})
