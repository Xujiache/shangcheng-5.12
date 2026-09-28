// Traditional ruler labels are cultural conventions, not engineering tolerances.
type RulerGroup = { name: string; auspicious: boolean; items: string[] }
type Ruler = { id: string; name: string; cycleMm: number; groups: RulerGroup[] }
const group = (name: string, auspicious: boolean, items: string): RulerGroup => ({ name, auspicious, items: items.split(' ') })
export const RULERS = {
  yang: {
    id: 'yang', name: '文公尺（阳尺）', cycleMm: 429,
    groups: [
      group('财', true, '财德 宝库 六合 迎福'),
      group('病', false, '退财 公事 牢执 孤寡'),
      group('离', false, '长库 劫财 官鬼 失脱'),
      group('义', true, '添丁 益利 贵子 大吉'),
      group('官', true, '顺科 横财 进益 富贵'),
      group('劫', false, '死别 退口 离乡 财失'),
      group('害', false, '灾至 死绝 病临 口舌'),
      group('本', true, '财至 登科 进宝 兴旺'),
    ],
  },
  yin: {
    id: 'yin', name: '丁兰尺（阴尺）', cycleMm: 388,
    groups: [
      group('丁', true, '福星 及第 财旺 登科'),
      group('害', false, '口舌 病临 死绝 灾至'),
      group('旺', true, '天德 喜事 进宝 纳福'),
      group('苦', false, '失脱 官鬼 劫财 无嗣'),
      group('义', true, '大吉 财旺 益利 天库'),
      group('官', true, '富贵 进宝 横财 顺科'),
      group('死', false, '离乡 死别 退丁 失财'),
      group('兴', true, '登科 贵子 添丁 兴旺'),
      group('失', false, '孤寡 牢执 公事 退财'),
      group('财', true, '迎福 六合 进宝 财德'),
    ],
  },
}

const TICKS = 1000 // one tick = 0.001 mm; exact integer input arithmetic
const UNIT_TICKS = { mm: 1000, cm: 10000, m: 1000000 }
const UNIT_DECIMALS = { mm: 3, cm: 4, m: 6 }
const MAX_MM = 100000
type RulerId = keyof typeof RULERS
type Setup = { rule: Ruler; cycleTicks: number; cells: number }
type Cell = { cycleIndex: number; group: { name: string; auspicious: boolean; index: number; rangeMm: { start: number; end: number } }; item: { name: string; index: number }; rangeMm: { start: number; end: number } }
export type LengthResult = ({ ok: true; lengthMm: number; cycleMm: number; withinCycleMm: number } & Cell) | { ok: false; error: string }
export interface SuggestionOptions { toleranceMm?: number; preferredGroups?: string[]; customCycleMm?: number | string }
export interface NearbyOptions extends SuggestionOptions { limit?: number; requireBoth?: boolean; otherCycleMm?: number | string }

function ticks(input: unknown, unit = 'mm'): number | null {
  if (!Object.prototype.hasOwnProperty.call(UNIT_TICKS, unit)) return null
  const factor = UNIT_TICKS[unit as keyof typeof UNIT_TICKS]
  const digits = UNIT_DECIMALS[unit as keyof typeof UNIT_DECIMALS]
  const value = typeof input === 'number' && Number.isFinite(input) ? String(input) : input
  if (typeof value !== 'string' || value.length > 32 || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const mmWhole = Number(whole) * factor
  if (!Number.isSafeInteger(mmWhole) || mmWhole > MAX_MM * TICKS) return null
  const decimals = fraction.replace(/0+$/, '')
  if (decimals.length > digits) return null
  const scaled = decimals ? Number(decimals.padEnd(digits, '0')) : 0
  const result = mmWhole + scaled
  if (!Number.isSafeInteger(result) || result <= 0 || result > MAX_MM * TICKS) return null
  return result
}

function setup(ruleId: string, customCycleMm?: number | string): Setup | null {
  if (!Object.prototype.hasOwnProperty.call(RULERS, ruleId)) return null
  const rule = RULERS[ruleId as RulerId]
  const cycleTicks = customCycleMm == null ? rule.cycleMm * TICKS : ticks(customCycleMm)
  if (!cycleTicks || cycleTicks < rule.groups.length * 4 * 2 * TICKS) return null
  return { rule, cycleTicks, cells: rule.groups.length * 4 }
}

function cellAt(set: Setup, cellIndex: number, cycleIndex: number): Cell {
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

export function lookupLength(input: unknown, unit = 'mm', ruleId = 'yang', customCycleMm?: number | string): LengthResult {
  const lengthTicks = ticks(input, unit)
  if (!lengthTicks) return { ok: false, error: '请输入大于 0 且不超过 100 米的有效尺寸，精度至 0.001 毫米' }
  const set = setup(ruleId, customCycleMm)
  if (!set) return { ok: false, error: '请选择有效尺制；自定义周期须足够容纳每小格 2 毫米' }
  const cycleIndex = Math.floor(lengthTicks / set.cycleTicks)
  const offsetTicks = lengthTicks - cycleIndex * set.cycleTicks
  const cellIndex = Math.floor(offsetTicks * set.cells / set.cycleTicks)
  return {
    ok: true, lengthMm: lengthTicks / TICKS, cycleMm: set.cycleTicks / TICKS,
    withinCycleMm: offsetTicks / TICKS,
    ...cellAt(set, cellIndex, cycleIndex),
  }
}

export function nearestAuspicious(lengthMm: number, ruleId = 'yang', options: SuggestionOptions = {}) {
  const current = lookupLength(lengthMm, 'mm', ruleId, options.customCycleMm)
  if (!current.ok) return current
  const set = setup(ruleId, options.customCycleMm)!
  const toleranceMm = options.toleranceMm == null ? Infinity : Number(options.toleranceMm)
  if (Number.isNaN(toleranceMm) || toleranceMm < 0) return { ok: false, error: '允许调整量必须为非负数' }
  const preferred = options.preferredGroups
  if (preferred != null && (!Array.isArray(preferred) || preferred.some(name => !set.rule.groups.some(group => group.name === name)))) {
    return { ok: false, error: '目标大格无效' }
  }
  let lower: (Cell & { targetMm: number; deltaMm: number }) | null = null
  let upper: (Cell & { targetMm: number; deltaMm: number }) | null = null
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

function safelyInsideCell(lengthMm: number, result: Extract<LengthResult, { ok: true }>, set: Setup): boolean {
  if (!result.group.auspicious) return false
  const offsetTicks = lengthMm * TICKS - result.cycleIndex * set.cycleTicks
  const cellIndex = result.group.index * 4 + result.item.index
  const fromStart = offsetTicks * set.cells - cellIndex * set.cycleTicks
  const fromEnd = (cellIndex + 1) * set.cycleTicks - offsetTicks * set.cells
  const minimum = Math.min(4000 * set.cells, set.cycleTicks)
  return fromStart * 4 >= minimum && fromEnd * 4 >= minimum
}

export function nearbyAuspicious(lengthMm: number, ruleId = 'yang', options: NearbyOptions | null = {}) {
  const current = lookupLength(lengthMm, 'mm', ruleId, options?.customCycleMm)
  if (!current.ok) return current
  if (!options || typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).some(key => !['toleranceMm', 'limit', 'preferredGroups', 'customCycleMm', 'requireBoth', 'otherCycleMm'].includes(key))) {
    return { ok: false, error: '建议选项无效' }
  }
  const toleranceMm = options.toleranceMm === undefined ? 30 : options.toleranceMm
  const limit = options.limit === undefined ? 8 : options.limit
  if (typeof toleranceMm !== 'number' || !Number.isFinite(toleranceMm) || toleranceMm < 0 || toleranceMm > 1000 ||
      !Number.isInteger(limit) || limit < 1 || limit > 2001 ||
      (options.requireBoth !== undefined && typeof options.requireBoth !== 'boolean')) {
    return { ok: false, error: '允许调整量须在 0 至 1000 毫米内；建议数量须为 1 至 2001 的整数' }
  }
  const selected = setup(ruleId, options.customCycleMm)!
  const otherId = ruleId === 'yang' ? 'yin' : 'yang'
  const other = setup(otherId, options.otherCycleMm)
  if (!other) return { ok: false, error: '另一尺制的自定义周期无效' }
  const preferred = options.preferredGroups
  if (preferred !== undefined && (!Array.isArray(preferred) ||
      preferred.some(name => typeof name !== 'string' || !selected.rule.groups.some(group => group.name === name)) ||
      new Set(preferred).size !== preferred.length)) {
    return { ok: false, error: '目标大格无效' }
  }
  const items: Array<{ targetMm: number; deltaMm: number; yang: Extract<LengthResult, { ok: true }>; yin: Extract<LengthResult, { ok: true }>; group: Cell['group']; item: Cell['item']; rangeMm: Cell['rangeMm'] }> = []
  const lower = Math.max(1, Math.ceil(current.lengthMm - toleranceMm))
  const upper = Math.min(MAX_MM, Math.floor(current.lengthMm + toleranceMm))
  for (let targetMm = lower; targetMm <= upper; targetMm++) {
    const primary = lookupLength(targetMm, 'mm', ruleId, options.customCycleMm)
    if (!primary.ok) continue
    if (!safelyInsideCell(targetMm, primary, selected) ||
        (preferred && !preferred.includes(primary.group.name))) continue
    const secondary = lookupLength(targetMm, 'mm', otherId, options.otherCycleMm)
    if (!secondary.ok) continue
    if (options.requireBoth && !safelyInsideCell(targetMm, secondary, other)) continue
    const yang = ruleId === 'yang' ? primary : secondary
    const yin = ruleId === 'yin' ? primary : secondary
    items.push({ targetMm, deltaMm: targetMm - current.lengthMm,
      yang, yin, group: primary.group, item: primary.item, rangeMm: primary.rangeMm })
  }
  items.sort((a, b) => Math.abs(a.deltaMm) - Math.abs(b.deltaMm) || a.targetMm - b.targetMm)
  return { ok: true, current, items: items.slice(0, limit) }
}
