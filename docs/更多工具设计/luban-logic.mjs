// Traditional ruler labels are cultural conventions, not engineering tolerances.
export const RULERS = {
  yang: {
    id: 'yang', name: '文公尺（阳尺）', cycleMm: 429,
    groups: [
      ['财', true, '财德 宝库 六合 迎福'],
      ['病', false, '退财 公事 牢执 孤寡'],
      ['离', false, '长库 劫财 官鬼 失脱'],
      ['义', true, '添丁 益利 贵子 大吉'],
      ['官', true, '顺科 横财 进益 富贵'],
      ['劫', false, '死别 退口 离乡 财失'],
      ['害', false, '灾至 死绝 病临 口舌'],
      ['本', true, '财至 登科 进宝 兴旺'],
    ].map(([name, auspicious, items]) => ({ name, auspicious, items: items.split(' ') })),
  },
  yin: {
    id: 'yin', name: '丁兰尺（阴尺）', cycleMm: 388,
    groups: [
      ['丁', true, '福星 及第 财旺 登科'],
      ['害', false, '口舌 病临 死绝 灾至'],
      ['旺', true, '天德 喜事 进宝 纳福'],
      ['苦', false, '失脱 官鬼 劫财 无嗣'],
      ['义', true, '大吉 财旺 益利 天库'],
      ['官', true, '富贵 进宝 横财 顺科'],
      ['死', false, '离乡 死别 退丁 失财'],
      ['兴', true, '登科 贵子 添丁 兴旺'],
      ['失', false, '孤寡 牢执 公事 退财'],
      ['财', true, '迎福 六合 进宝 财德'],
    ].map(([name, auspicious, items]) => ({ name, auspicious, items: items.split(' ') })),
  },
}

const TICKS = 1000 // one tick = 0.001 mm; exact integer input arithmetic
const UNIT_TICKS = { mm: 1000n, cm: 10000n, m: 1000000n }
const MAX_MM = 100000

function ticks(input, unit = 'mm') {
  if (!Object.hasOwn(UNIT_TICKS, unit)) return null
  const factor = UNIT_TICKS[unit]
  const value = typeof input === 'number' && Number.isFinite(input) ? String(input) : input
  if (typeof value !== 'string' || value.length > 32 || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const scale = 10n ** BigInt(fraction.length)
  const numerator = (BigInt(whole) * scale + BigInt(fraction || '0')) * factor
  if (numerator % scale !== 0n) return null
  const result = numerator / scale
  if (result <= 0n || result > BigInt(MAX_MM * TICKS)) return null
  return Number(result)
}

function setup(ruleId, customCycleMm) {
  if (!Object.hasOwn(RULERS, ruleId)) return null
  const rule = RULERS[ruleId]
  const cycleTicks = customCycleMm == null ? rule.cycleMm * TICKS : ticks(customCycleMm)
  if (!cycleTicks || cycleTicks < rule.groups.length * 4 * 2 * TICKS) return null
  return { rule, cycleTicks, cells: rule.groups.length * 4 }
}

function cellAt(set, cellIndex, cycleIndex) {
  const groupIndex = Math.floor(cellIndex / 4)
  const itemIndex = cellIndex % 4
  const group = set.rule.groups[groupIndex]
  const base = cycleIndex * set.cycleTicks / TICKS
  const startMm = base + set.cycleTicks * cellIndex / set.cells / TICKS
  const endMm = base + set.cycleTicks * (cellIndex + 1) / set.cells / TICKS
  const groupStartMm = base + set.cycleTicks * groupIndex / set.rule.groups.length / TICKS
  const groupEndMm = base + set.cycleTicks * (groupIndex + 1) / set.rule.groups.length / TICKS
  return {
    cycleIndex,
    group: { name: group.name, auspicious: group.auspicious, index: groupIndex, rangeMm: { start: groupStartMm, end: groupEndMm } },
    item: { name: group.items[itemIndex], index: itemIndex },
    rangeMm: { start: startMm, end: endMm },
  }
}

export function lookupLength(input, unit = 'mm', ruleId = 'yang', customCycleMm) {
  const lengthTicks = ticks(input, unit)
  if (!lengthTicks) return { ok: false, error: '请输入大于 0 且不超过 100 米的有效尺寸，精度至 0.001 毫米' }
  const set = setup(ruleId, customCycleMm)
  if (!set) return { ok: false, error: '请选择有效尺制；自定义周期须足够容纳每小格 2 毫米' }
  const cycleIndex = Math.floor(lengthTicks / set.cycleTicks)
  const offsetTicks = lengthTicks - cycleIndex * set.cycleTicks
  const cellIndex = Math.floor(offsetTicks * set.cells / set.cycleTicks)
  return {
    ok: true, lengthMm: lengthTicks / TICKS, cycleMm: set.cycleTicks / TICKS,
    cycleIndex, withinCycleMm: offsetTicks / TICKS,
    ...cellAt(set, cellIndex, cycleIndex),
  }
}

export function nearestAuspicious(lengthMm, ruleId = 'yang', options = {}) {
  const current = lookupLength(lengthMm, 'mm', ruleId, options.customCycleMm)
  if (!current.ok) return current
  const set = setup(ruleId, options.customCycleMm)
  const toleranceMm = options.toleranceMm == null ? Infinity : Number(options.toleranceMm)
  if (Number.isNaN(toleranceMm) || toleranceMm < 0) return { ok: false, error: '允许调整量必须为非负数' }
  const preferred = options.preferredGroups
  if (preferred != null && (!Array.isArray(preferred) || preferred.some(name => !set.rule.groups.some(group => group.name === name)))) {
    return { ok: false, error: '目标大格无效' }
  }
  let lower = null
  let upper = null
  for (let cycle = Math.max(0, current.cycleIndex - 1); cycle <= current.cycleIndex + 1; cycle++) {
    for (let cell = 0; cell < set.cells; cell++) {
      const entry = cellAt(set, cell, cycle)
      if (!entry.group.auspicious || (preferred && !preferred.includes(entry.group.name))) continue
      const { start, end } = entry.rangeMm
      const inset = Math.min(1, (end - start) / 4)
      const safeStart = Math.ceil((start + inset) * TICKS - 1e-7) / TICKS
      const safeEnd = Math.floor((end - inset) * TICKS + 1e-7) / TICKS
      if (safeStart > safeEnd) continue
      const lowTarget = Math.min(current.lengthMm, safeEnd)
      const highTarget = Math.max(current.lengthMm, safeStart)
      if (lowTarget >= safeStart && lowTarget > 0 && current.lengthMm - lowTarget <= toleranceMm && (!lower || lowTarget > lower.targetMm)) {
        lower = { ...entry, targetMm: lowTarget, deltaMm: lowTarget - current.lengthMm }
      }
      if (highTarget <= safeEnd && highTarget <= MAX_MM && highTarget - current.lengthMm <= toleranceMm && (!upper || highTarget < upper.targetMm)) {
        upper = { ...entry, targetMm: highTarget, deltaMm: highTarget - current.lengthMm }
      }
    }
  }
  return { ok: true, current, lower, upper }
}
