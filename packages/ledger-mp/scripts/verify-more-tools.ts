import assert from 'node:assert/strict'
import { searchTools, TOOL_CATALOG } from '../miniprogram/utils/more-tools/catalog'
import { toRmbUppercase } from '../miniprogram/utils/more-tools/amount-date'
import { calculateRetirement } from '../miniprogram/utils/more-tools/retirement'
import { loadAccountRetirementProfile, saveAccountRetirementProfile } from '../miniprogram/utils/more-tools/retirement-storage'
import { anglesFromAcceleration, calibratedReading } from '../miniprogram/utils/more-tools/level'
import { lookupLength, nearbyAuspicious } from '../miniprogram/utils/more-tools/luban'

assert.equal(searchTools('玻璃').map(tool => tool.id).join(','), 'glass,glass-weight')
assert.equal(searchTools('').length, TOOL_CATALOG.length)
const others = searchTools('').filter(tool => tool.group === 'other')
const glassIndex = others.findIndex(tool => tool.id === 'glass')
assert.equal(others[glassIndex + 1].id, 'glass-weight')
assert.equal(Math.floor(glassIndex / 5), Math.floor((glassIndex + 1) / 5), 'Both glass entries must be adjacent in the five-column grid')
assert.equal(searchTools('潮汐').map(tool => tool.id).join(','), 'tide')
assert.deepEqual(toRmbUppercase('0'), { ok: true, normalized: '0', uppercase: '零元整' })
assert.equal(toRmbUppercase('100010001.01').ok && toRmbUppercase('100010001.01').uppercase, '壹亿零壹万零壹元零壹分')
assert.equal(toRmbUppercase('999999999999.99').ok, true)
assert.equal(toRmbUppercase('1.234').ok, false)
assert.equal(toRmbUppercase('-1').ok, false)

const today = '2026-09-28'
for (const [category, birthMonth] of [['male', '1965-01'], ['female55', '1970-01'], ['female50', '1975-01']] as const) {
  const result = calculateRetirement({ category, birthMonth, workType: 'standard' }, today)
  assert.equal(result.ok && result.status === 'calculated' && result.retirementMonth, '2025-02')
}
assert.equal(calculateRetirement({ category: 'male', birthMonth: '1975-01', workType: 'standard' }, today).status, 'calculated')
assert.equal(calculateRetirement({ category: 'unknown', birthMonth: '1975-01', workType: 'standard' }, today).status, 'needs-review')
assert.equal(calculateRetirement({ category: 'male', birthMonth: '1975-01', workType: 'special' }, today).status, 'needs-review')

const saved = new Map<string, unknown>()
const storage = { get: (key: string) => saved.get(key), set: (key: string, value: unknown) => { saved.set(key, value) }, remove: (key: string) => { saved.delete(key) } }
assert.equal(saveAccountRetirementProfile(storage, 'alice', { category: 'female50', birthMonth: '1975-01', workType: 'standard' }, today).ok, true)
assert.equal(loadAccountRetirementProfile(storage, 'alice', today).profile?.birthMonth, '1975-01')
assert.equal(loadAccountRetirementProfile(storage, 'bob', today).profile, null)

assert.equal(anglesFromAcceleration({ x: 0, y: 0, z: 1 })?.flatDeg, 0)
assert.equal(calibratedReading({ x: 0.2, y: 0.1, z: 0.97 }, { x: 0.2, y: 0.1, z: 0.97 })?.flatDeg, 0)
const ruler = lookupLength(1975, 'mm', 'yang')
assert.equal(ruler.ok && ruler.group.name, '官')
assert.equal(ruler.ok && ruler.item.name, '富贵')
assert.equal(lookupLength(0).ok, false)
const nearby = nearbyAuspicious(1975, 'yang', { toleranceMm: 30, requireBoth: true })
assert.equal(nearby.ok && nearby.items?.every(item => item.yang.group.auspicious && item.yin.group.auspicious), true)
console.log('more tools logic verified')
