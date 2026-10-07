import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MATERIALS } from '../miniprogram/subpackages/metal/data/materials'
import {
  lookupSpec,
  normalizeModel,
  SPEC_TABLE,
} from '../miniprogram/subpackages/metal/data/specTable'
import { calculateMetal, fmt, MetalInputError } from '../miniprogram/subpackages/metal/utils/calc'
import { metalCsv } from '../miniprogram/subpackages/metal/utils/quote'
import { calculateMetalQuoteItem } from '../../server/src/modules/ledger/metal.calc'
import { normalizeMetalConfig } from '../../server/src/modules/ledger/metal.config'

assert.equal(MATERIALS.length, 65)
assert.equal(new Set(MATERIALS.map((item) => item.id)).size, 65)
const serverMaterials = JSON.parse(
  readFileSync(
    new URL('../../server/src/modules/ledger/metal-materials.json', import.meta.url),
    'utf8',
  ),
)
assert.deepEqual(serverMaterials, MATERIALS, '前后端材质种子必须一致')
const serverSpecTable = JSON.parse(
  readFileSync(
    new URL('../../server/src/modules/ledger/metal-spec-table.json', import.meta.url),
    'utf8',
  ),
)
assert.deepEqual(serverSpecTable, SPEC_TABLE, '前后端型材规格表必须一致')
assert.equal(lookupSpec('angle', '50*5')?.kgPerM, 3.77)
assert.equal(lookupSpec('aluminum', '4040')?.kgPerM, 1.28)
assert.equal(lookupSpec('hbeam', 'HW200×200')?.kgPerM, 49.9)
assert.equal(lookupSpec('cpurlin', 'C100×50×20×2.5')?.kgPerM, 4.325)
assert.equal(lookupSpec('angle', '200*24')?.kgPerM, 71.2)
for (const model of ['50x5', '50×5', 'L50*5', '∠50*5', 'Ｌ５０＊５']) {
  assert.equal(normalizeModel(model), '50*5')
  assert.equal(lookupSpec('angle', model)?.kgPerM, 3.77)
}

const cases = [
  ['plate.carbon.hot', { lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 }, 78.5],
  ['flat.iron.hot', { widthMm: 40, thicknessMm: 5, lengthM: 1 }, 1.57],
  ['rbar.carbon.q235b', { diameterMm: 20, lengthM: 1 }, 2.466],
  ['rtube.carbon.q235b', { diameterMm: 32, thicknessMm: 1.5, lengthM: 1 }, 1.128],
  [
    'square.carbon.q235b',
    { outerLengthMm: 80, outerWidthMm: 40, thicknessMm: 2, lengthM: 1 },
    3.642,
  ],
  ['section.carbon.angle', { model: '50*5', thicknessMm: 5, lengthM: 1 }, 3.77],
] as const
for (const [materialId, dimensions, expected] of cases) {
  const result = calculateMetal({ materialId, dimensions })
  assert.ok(
    Math.abs(result.unitWeightKg - expected) < 0.005,
    `${materialId}: ${result.unitWeightKg}`,
  )
}
const corrected = calculateMetal({
  materialId: 'section.carbon.angle',
  dimensions: { model: '50*5', thicknessMm: 4.5, lengthM: 10 },
})
assert.equal(corrected.thicknessCorrected, true)
assert.ok(Math.abs(corrected.unitWeightKg - 3.393) < 0.001)
assert.equal(
  calculateMetal({ materialId: 'section.carbon.angle', dimensions: { model: '99*9', lengthM: 1 } })
    .method,
  'unlisted',
)
assert.equal(calculateMetal({ materialId: 'plate.carbon.hot', dimensions: {} }).totalWeightKg, 0)
assert.equal(
  calculateMetal({ materialId: 'plate.carbon.hot', dimensions: { lengthMm: 'abc' } }).unitWeightKg,
  0,
)
assert.throws(
  () => calculateMetal({ materialId: 'plate.carbon.hot', dimensions: { lengthMm: -1 } }),
  MetalInputError,
)
assert.throws(
  () => calculateMetal({ materialId: 'plate.carbon.hot', dimensions: { lengthMm: 1_000_001 } }),
  MetalInputError,
)
assert.throws(
  () => calculateMetal({ materialId: 'plate.carbon.hot', dimensions: {}, quoteFactor: 0 }),
  MetalInputError,
)
assert.equal(
  calculateMetal({
    materialId: 'plate.carbon.hot',
    dimensions: { lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 2 },
    tonPriceYuan: 4000,
    quoteFactor: 1.2,
    processingFeeYuan: 20,
  }).amountYuan,
  773.6,
)
assert.equal(
  calculateMetal({
    materialId: 'flat.iron.hot',
    dimensions: { widthMm: 40, thicknessMm: 5, lengthM: 1 },
    tonPriceYuan: 1000,
    quoteFactor: 1.234,
  }).amountYuan,
  1.57 * 1.23,
)
assert.throws(
  () => calculateMetal({ materialId: 'roundTube' as any, dimensions: {} }),
  MetalInputError,
)
assert.equal(fmt(1234567.5, 2), '1,234,567.50')
assert.equal(fmt(Number.NaN, 3), '0.000')
assert.equal(
  metalCsv([['材料', '=1+1', '+SUM(1)', '-3', '@cmd', '正常,规格']]),
  '\uFEFF"材料","\'=1+1","\'+SUM(1)","\'-3","\'@cmd","正常,规格"\r\n',
)
const config = normalizeMetalConfig(null)
for (const material of MATERIALS) {
  let dimensions: Record<string, number | string>
  if (material.category === 'section') {
    const suffix = material.id.split('.').pop()
    const shape = material.id.includes('.al.')
      ? 'aluminum'
      : material.id.includes('.ss.')
        ? 'angle'
        : suffix
    const row = SPEC_TABLE.find((item) => item.shape === shape)!
    dimensions = { model: row.model, thicknessMm: row.thicknessMm || 0, lengthM: 2 }
  } else {
    dimensions = {
      lengthMm: 1000,
      widthMm: 100,
      thicknessMm: 2,
      quantity: 2,
      lengthM: 2,
      outerLengthMm: 80,
      outerWidthMm: 40,
      diameterMm: 20,
    }
  }
  const input = {
    materialId: material.id,
    dimensions,
    density: material.density,
    quoteFactor: 1.2,
    processingFeeYuan: 12.34,
  }
  const client = calculateMetal(input)
  const server = calculateMetalQuoteItem(
    {
      materialId: material.id,
      category: material.category,
      spec: dimensions,
      density: material.density,
      quoteFactor: 1.2,
      processingFeeFen: 1234,
    },
    config,
  )
  assert.ok(Math.abs(client.totalWeightKg - server.weightKg) < 0.000001, material.id)
  assert.equal(Math.round(client.amountYuan * 100), server.amountFen, material.id)
}
console.log(
  `metal verified: ${MATERIALS.length} materials and server/client calculations, ${SPEC_TABLE.length} spec rows, ${cases.length} known weights, aliases, boundaries and CSV safety`,
)
